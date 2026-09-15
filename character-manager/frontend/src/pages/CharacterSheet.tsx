import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { characterApi, type CharacterSheet as Sheet } from '../services/api';
import type { Phase } from '../../../shared/engine';
import ObjectHeader from '../components/ObjectHeader';
import SectionCard from '../components/SectionCard';
import SegmentedControl from '../components/SegmentedControl';

export default function CharacterSheet() {
  const { id = '' } = useParams();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [phase, setPhase] = useState<Phase>('advancement');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setSheet(await characterApi.sheet(id, phase));
      setError(null);
    } catch {
      setError('Could not load this character.');
    }
  }, [id, phase]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <div className="error">{error}</div>;
  if (!sheet) return <p className="muted">Loading…</p>;

  const {
    character,
    ruleset,
    balances,
    violations,
    available,
    checks,
    canEdit,
    canGrantStaffQualities,
    ownerName,
  } = sheet;

  const mutate = async (patch: Parameters<typeof characterApi.update>[1]) => {
    setBusy(true);
    try {
      await characterApi.update(id, patch);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const togglePackage = (packageId: string, tier: string) => {
    const others = character.packageIds.filter(
      (pid) => ruleset.packages.find((p) => p.id === pid)?.tier !== tier
    );
    const held = character.packageIds.includes(packageId);
    void mutate({ packageIds: held ? others : [...others, packageId] });
  };

  const buy = (traitId: string, level: number) =>
    void mutate({ traitLevels: { ...character.traitLevels, [traitId]: level } });

  const sell = (traitId: string, currentLevel: number) => {
    const next = { ...character.traitLevels };
    if (currentLevel <= 1) delete next[traitId];
    else next[traitId] = currentLevel - 1;
    void mutate({ traitLevels: next });
  };

  const toggleQuality = (qualityId: string) => {
    const held = character.qualityIds.includes(qualityId);
    void mutate({
      qualityIds: held
        ? character.qualityIds.filter((q) => q !== qualityId)
        : [...character.qualityIds, qualityId],
    });
  };

  const progression = ruleset.currencies.filter((c) => c.kind === 'progression');

  // Grouped by the game's own word for them, so a ruleset that separates
  // equipment from backgrounds reads that way here too.
  const qualityGroups = ruleset.qualities.reduce<Record<string, typeof ruleset.qualities>>(
    (acc, q) => {
      const key = q.category?.trim() || 'Qualities';
      (acc[key] ??= []).push(q);
      return acc;
    },
    {}
  );

  return (
    <div className="character-sheet">
      <ObjectHeader
        level={1}
        className="is-page"
        kind="Character"
        meta={ruleset.name}
        name={character.name}
        subtitle={`Played by ${ownerName}${!canEdit ? ' · read only' : ''}`}
        actions={
          <SegmentedControl
            label="Purchase phase"
            options={[
              { id: 'creation', label: 'Creation' },
              { id: 'advancement', label: 'Advancement' },
            ]}
            value={phase}
            onChange={setPhase}
          />
        }
      />

      {/* Two regions: the state of the character (sticky, always in view)
          and the shopping surface that scrolls. The one number you need
          while buying -- points left -- must never scroll away. */}
      <div className="sheet-layout">
        <aside className="sheet-state">
          <SectionCard title="Points">
            <dl className="attributes">
              {progression.map((c) => (
                <div key={c.id} className="attribute-item">
                  <dd className={(balances[c.id] ?? 0) < 0 ? 'negative' : undefined}>
                    {balances[c.id] ?? 0}
                  </dd>
                  <dt>{c.abbreviation ?? c.name}</dt>
                </div>
              ))}
            </dl>
          </SectionCard>

          <SectionCard title="Rules Check">
            {violations.length === 0 ? (
              <p className="ok">This character is legal.</p>
            ) : (
              <ul className="violations">
                {violations.map((v, i) => (
                  <li key={i}>{v.message}</li>
                ))}
              </ul>
            )}
          </SectionCard>

          {checks.length > 0 && (
            <SectionCard title="Needs a person">
              <p className="muted">
                The rules ask for these, and nothing here can decide them. They
                are settled at check-in, not by the app.
              </p>
              <ul className="check-list">
                {checks.map((c, i) => (
                  <li key={i}>
                    <strong>{c.subject}</strong>: {c.text}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </aside>

        <div className="sheet-shop">
      {ruleset.qualities.length > 0 && (
        <SectionCard title="Qualities">
          {Object.entries(qualityGroups).map(([category, qualities]) => (
            <div key={category} className="quality-group">
              <h3>{category}</h3>
              <div className="chip-row">
                {qualities.map((q) => {
                  const held = character.qualityIds.includes(q.id);
                  // A staff-granted quality is shown to everyone -- it is on
                  // the character -- but only staff can change it. The server
                  // enforces this too; disabling the button is a courtesy,
                  // not the rule.
                  const mine = q.grantedBy === 'player' || canGrantStaffQualities;
                  return (
                    <button
                      key={q.id}
                      disabled={busy || !canEdit || !mine}
                      className={`button button-small ${held ? 'button-primary' : ''}`}
                      onClick={() => toggleQuality(q.id)}
                      title={
                        mine
                          ? q.description
                          : `${q.description ? q.description + ' ' : ''}Awarded by staff.`
                      }
                    >
                      {q.name}
                      {q.grantedBy === 'staff' && ' · staff'}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </SectionCard>
      )}

      {ruleset.packageTiers.map((tier) => {
        const options = ruleset.packages.filter((p) => p.tier === tier.id);
        if (options.length === 0) return null;
        return (
          <SectionCard key={tier.id} title={tier.name}>
            <div className="chip-row">
              {options.map((p) => {
                const held = character.packageIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    disabled={busy || !canEdit}
                    className={`button button-small ${held ? 'button-primary' : ''}`}
                    onClick={() => togglePackage(p.id, tier.id)}
                    title={p.notes}
                  >
                    {p.name} · {p.cost.amount}
                  </button>
                );
              })}
            </div>
          </SectionCard>
        );
      })}

      {ruleset.traitGroups.map((group) => {
        const options = available.filter((o) => o.groupId === group.id);
        if (options.length === 0) return null;
        return (
          <SectionCard key={group.id} title={group.name}>
            <ul className="trait-list">
              {options.map((o) => (
                <li key={o.traitId} className={`trait trait-${o.status}`}>
                  <div className="trait-main">
                    <span className="trait-name">{o.name}</span>
                    {o.currentLevel > 0 && (
                      <span className="trait-level">Level {o.currentLevel}</span>
                    )}
                    {o.status !== 'available' && o.reason && (
                      <span className="trait-reason">{o.reason}</span>
                    )}
                    {o.checks?.map((c) => (
                      <span key={c} className="trait-check" title="Settled by a person">
                        {c}
                      </span>
                    ))}
                  </div>
                  <div className="trait-actions">
                    {o.currentLevel > 0 && (
                      <button
                        className="button button-small"
                        disabled={busy || !canEdit}
                        onClick={() => sell(o.traitId, o.currentLevel)}
                      >
                        −
                      </button>
                    )}
                    {o.status === 'available' && o.nextLevel !== null && (
                      <button
                        className="button button-small button-primary"
                        disabled={busy || !canEdit}
                        onClick={() => buy(o.traitId, o.nextLevel!)}
                      >
                        Buy {o.nextLevel} · {o.cost?.amount}
                      </button>
                    )}
                    {o.status === 'unaffordable' && (
                      <span className="trait-cost">{o.cost?.amount}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        );
      })}

        </div>
      </div>

      <div className="back-link">
        <Link to={`/projects/${character.rulesetId}`}>Back to {ruleset.name}</Link>
      </div>
    </div>
  );
}
