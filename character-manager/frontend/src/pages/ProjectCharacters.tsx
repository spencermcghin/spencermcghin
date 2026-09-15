import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  characterApi,
  memberApi,
  rulesetApi,
  type Invite,
  type Member,
  type ProjectRole,
  type RosterEntry,
} from '../services/api';
import type { Ruleset } from '../../../shared/rules-schema';
import { balances, indexRuleset } from '../../../shared/engine';
import { useAuth } from '../auth/useAuth';
import Hint from '../components/Hint';
import ProjectNav from '../components/ProjectNav';
import SectionCard from '../components/SectionCard';
import Sigil from '../components/Sigil';
import Toolbar from '../components/Toolbar';

/**
 * The project's roster: every character, the tools that act on many of them
 * at once, and the invites that bring new players in.
 *
 * This lived on the project overview until the floorplan audit: the overview
 * was carrying orientation, governance, and this whole worklist at once, and
 * a player's characters sat below staff furniture. Now the overview says
 * what the project is, and this page is where the people in it live.
 */
export default function ProjectCharacters() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Bulk award state.
  const [selected, setSelected] = useState<string[]>([]);
  const [awardAmount, setAwardAmount] = useState('1');
  const [awardCurrency, setAwardCurrency] = useState('');
  const [awarding, setAwarding] = useState(false);
  const [awardNote, setAwardNote] = useState<string | null>(null);

  const myRole: ProjectRole | null =
    members.find((m) => m.userId === user?.id)?.role ?? null;
  const isStaff = myRole === 'admin' || user?.appRole === 'admin';

  const load = useCallback(async () => {
    try {
      const [r, cs, ms] = await Promise.all([
        rulesetApi.get(id),
        characterApi.listForRuleset(id),
        memberApi.list(id),
      ]);
      setRuleset(r);
      setRoster(cs);
      setMembers(ms);
      setError(null);
    } catch {
      setError('Could not load this project.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Invites are staff-only, so this request would 403 for a member.
  useEffect(() => {
    if (!isStaff) return;
    memberApi.listInvites(id).then(setInvites).catch(() => setInvites([]));
  }, [id, isStaff]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await characterApi.create(id, name.trim());
    setName('');
    await load();
  };

  const makeInvite = async () => {
    const { token } = await memberApi.createInvite(id);
    setNewLink(`${window.location.origin}/join/${token}`);
    setInvites(await memberApi.listInvites(id));
  };

  const idx = useMemo(() => (ruleset ? indexRuleset(ruleset) : null), [ruleset]);

  // Default to the first progression currency: awards are almost always
  // advancement points rather than in-game money.
  useEffect(() => {
    if (!ruleset || awardCurrency) return;
    const first =
      ruleset.currencies.find((c) => c.kind === 'progression') ?? ruleset.currencies[0];
    if (first) setAwardCurrency(first.id);
  }, [ruleset, awardCurrency]);

  // A character removed from the roster must not stay silently selected.
  useEffect(() => {
    const present = new Set(roster.map((c) => c.id));
    setSelected((s) => (s.every((x) => present.has(x)) ? s : s.filter((x) => present.has(x))));
  }, [roster]);

  const toggleSelected = (characterId: string) =>
    setSelected((s) =>
      s.includes(characterId) ? s.filter((x) => x !== characterId) : [...s, characterId]
    );

  const award = async () => {
    const amount = Number(awardAmount);
    if (!Number.isInteger(amount) || amount === 0 || selected.length === 0) return;
    setAwarding(true);
    setAwardNote(null);
    try {
      const result = await characterApi.award(id, {
        characterIds: selected,
        currencyId: awardCurrency,
        amount,
      });
      await load();
      setSelected([]);
      setAwardNote(result.message);
      setError(null);
    } catch (e) {
      // The server explains why it refused; repeating that logic here would
      // give two answers that can disagree.
      const message =
        (e as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Could not award points.';
      setError(message);
    } finally {
      setAwarding(false);
    }
  };

  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <div className="error">{error}</div>;
  if (!ruleset) return <p className="muted">Not found.</p>;

  return (
    <div className="project-detail">
      <ProjectNav id={id} />
      <div className="header">
        <div>
          <h1>Characters</h1>
          <p className="muted">
            {roster.length} in {ruleset.name}
          </p>
        </div>
      </div>

      <form className="inline-form" onSubmit={create}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New character name…"
          aria-label="New character name"
        />
        <button className="button button-primary" disabled={!name.trim()}>
          Add Character
        </button>
      </form>

      {isStaff && roster.length > 0 && (
        <Toolbar boxed spread label="Bulk award">
          <div className="award-select">
            <label className="award-check">
              <input
                type="checkbox"
                checked={selected.length === roster.length}
                // Indeterminate is the honest state for a partial selection;
                // a bare unchecked box invites a click that clears the lot.
                ref={(el) => {
                  if (el) el.indeterminate = selected.length > 0 && selected.length < roster.length;
                }}
                onChange={(e) =>
                  setSelected(e.target.checked ? roster.map((c) => c.id) : [])
                }
              />
              <span>
                {selected.length === 0
                  ? 'Select all'
                  : `${selected.length} of ${roster.length} selected`}
              </span>
            </label>
          </div>

          <div className="award-controls">
            <label className="award-field">
              <span>Award</span>
              <input
                type="number"
                step={1}
                value={awardAmount}
                aria-label="Amount to award"
                onChange={(e) => setAwardAmount(e.target.value)}
              />
            </label>
            <select
              value={awardCurrency}
              aria-label="Currency to award"
              onChange={(e) => setAwardCurrency(e.target.value)}
            >
              {ruleset.currencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.abbreviation ?? c.name}
                </option>
              ))}
            </select>
            <button
              className="button button-small button-primary"
              disabled={awarding || selected.length === 0 || Number(awardAmount) === 0}
              onClick={award}
            >
              {awarding
                ? 'Awarding…'
                : selected.length === 0
                  ? 'Apply'
                  : `Apply to ${selected.length}`}
            </button>
            <Hint align="right">
              Adds the amount to every selected character's total for that
              currency. Use a negative number to take points back; correcting
              an award that went out wrong is the same operation in reverse.
              What a character has already spent is untouched, so a deduction
              that leaves them short shows up as overspent on their sheet
              rather than silently unpicking their build.
            </Hint>
          </div>
        </Toolbar>
      )}

      {awardNote && <p className="award-note">{awardNote}</p>}

      {roster.length === 0 ? (
        <div className="empty-state">
          <Sigil name="hexagram" />
          <p>No characters in this project yet.</p>
        </div>
      ) : (
        <div className="character-grid">
          {roster.map((c) => {
            const left =
              c.character && idx ? balances(c.character, idx) : null;
            return (
              <div
                key={c.id}
                className={`section-card character-card ${selected.includes(c.id) ? 'is-selected' : ''}`}
              >
                {isStaff && (
                  <label className="card-check">
                    <input
                      type="checkbox"
                      checked={selected.includes(c.id)}
                      aria-label={`Select ${c.name}`}
                      onChange={() => toggleSelected(c.id)}
                    />
                  </label>
                )}
                <h2>{c.name}</h2>
                <p className="character-info">
                  {c.packageIds.length > 0
                    ? c.packageIds
                        .map((pid) => ruleset.packages.find((p) => p.id === pid)?.name ?? pid)
                        .join(' · ')
                    : 'No archetype'}
                </p>
                <p className="character-background">
                  Played by {c.isMine ? 'you' : c.ownerName}
                </p>
                {left && (
                  <p className="card-balances">
                    {ruleset.currencies
                      .filter((cur) => cur.kind === 'progression')
                      .map((cur) => (
                        <span
                          key={cur.id}
                          className={(left[cur.id] ?? 0) < 0 ? 'is-negative' : ''}
                        >
                          {left[cur.id] ?? 0} {cur.abbreviation ?? cur.name}
                        </span>
                      ))}
                    <span className="muted">unspent</span>
                  </p>
                )}
                <div className="card-actions">
                  {c.character ? (
                    <Link to={`/characters/${c.id}`} className="button button-small">
                      Open Sheet
                    </Link>
                  ) : (
                    <span className="muted">Sheet is private</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isStaff && (
        <SectionCard fullWidth className="invite-card" title="Invite Players">
          <p className="muted">
            Anyone with the link joins as a member. Links expire after 30 days and
            can be revoked at any time.
          </p>
          <div className="chip-row chip-row-spaced">
            <button className="button button-primary button-small" onClick={makeInvite}>
              Create invite link
            </button>
          </div>

          {newLink && (
            <div className="invite-link">
              <code>{newLink}</code>
              <button
                className="button button-small"
                onClick={() => navigator.clipboard?.writeText(newLink)}
              >
                Copy
              </button>
            </div>
          )}

          {invites.filter((i) => !i.revokedAt).length > 0 && (
            <ul className="invite-list">
              {invites
                .filter((i) => !i.revokedAt)
                .map((i) => (
                  <li key={i.id}>
                    <span className="muted">
                      created {new Date(i.createdAt).toLocaleDateString()} · used{' '}
                      {i.uses} time{i.uses === 1 ? '' : 's'}
                    </span>
                    <button
                      className="button button-small button-danger"
                      onClick={async () => {
                        await memberApi.revokeInvite(id, i.id);
                        setInvites(await memberApi.listInvites(id));
                        setNewLink(null);
                      }}
                    >
                      Revoke
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </SectionCard>
      )}
    </div>
  );
}
