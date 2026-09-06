import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { memberApi, rulesetApi } from '../services/api';
import type { Condition, Ruleset, Trait } from '../../../shared/rules-schema';
import { validateRuleset } from '../../../shared/ruleset-validation';
import * as edit from '../../../shared/ruleset-editor';
import { useAuth } from '../auth/useAuth';
import TagInput from '../components/TagInput';
import './RulesetEditor.css';

/**
 * The ruleset editor.
 *
 * Skill → level, the shape published rulesets are already written in, with
 * grouping read off the rules rather than maintained beside them. Every edit
 * goes through the shared editor operations, so what happens here is exactly
 * what the reconstruction test proves can rebuild Eldritch.
 */
export default function RulesetEditor() {
  const { id = '' } = useParams();
  const { user } = useAuth();

  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [groupBy, setGroupBy] = useState('group');
  const [open, setOpen] = useState<string[]>([]);
  /** Previous values, newest last. Operations are pure, so undo is a pop. */
  const history = useRef<Ruleset[]>([]);

  useEffect(() => {
    Promise.all([rulesetApi.get(id), memberApi.list(id).catch(() => [])])
      .then(([r, members]) => {
        setRuleset(r);
        const role = members.find((m) => m.userId === user?.id)?.role;
        setCanEdit(role === 'admin' || user?.appRole === 'admin');
      })
      .catch(() => setError('Could not load this project.'));
  }, [id, user]);

  const apply = useCallback((next: (r: Ruleset) => Ruleset) => {
    // An updater must be pure -- React may call it more than once, and
    // setting other state from inside one is not supported. History and the
    // dirty flag are handled outside it.
    setDirty(true);
    setRuleset((current) => {
      if (!current) return current;
      history.current.push(current);
      return next(current);
    });
  }, []);

  const undo = useCallback(() => {
    const previous = history.current.pop();
    if (previous) {
      setRuleset(previous);
      setDirty(true);
    }
  }, []);

  const issues = useMemo(() => (ruleset ? validateRuleset(ruleset) : []), [ruleset]);
  const errors = issues.filter((i) => i.severity === 'error');
  const dimensions = useMemo(
    () => (ruleset ? edit.groupingDimensions(ruleset) : []),
    [ruleset]
  );

  const buckets = useMemo(() => {
    if (!ruleset) return [];
    if (groupBy.startsWith('track:')) {
      const trackId = groupBy.slice(6);
      const track = ruleset.tracks.find((t) => t.id === trackId);
      const out = (track?.steps ?? []).map((step) => ({
        key: `s${step.index}`,
        label: `${track?.name} ${step.index}`,
        traits: ruleset.traits.filter(
          (t) => edit.trackPositionOf(t, trackId) === step.index
        ),
      }));
      const ungated = ruleset.traits.filter(
        (t) => edit.trackPositionOf(t, trackId) === null
      );
      if (ungated.length > 0) {
        out.push({ key: 'none', label: 'No gate', traits: ungated });
      }
      return out;
    }
    if (groupBy === 'tag') {
      const tags = [...new Set(ruleset.traits.flatMap((t) => t.tags))].sort();
      const out = tags.map((tag) => ({
        key: tag,
        label: tag,
        traits: ruleset.traits.filter((t) => t.tags.includes(tag)),
      }));
      const untagged = ruleset.traits.filter((t) => t.tags.length === 0);
      if (untagged.length > 0) {
        out.push({ key: 'untagged', label: 'Untagged', traits: untagged });
      }
      return out;
    }
    return ruleset.traitGroups.map((g) => ({
      key: g.id,
      label: g.name,
      traits: ruleset.traits.filter((t) => t.groupId === g.id),
    }));
  }, [ruleset, groupBy]);

  const save = async () => {
    if (!ruleset) return;
    setSaving(true);
    try {
      await rulesetApi.save(ruleset);
      history.current = [];
      setDirty(false);
      setError(null);
    } catch {
      setError('Could not save. You may not have permission to edit this ruleset.');
    } finally {
      setSaving(false);
    }
  };

  if (error && !ruleset) return <div className="error">{error}</div>;
  if (!ruleset) return <p className="muted">Loading…</p>;

  const addSkill = (groupId: string) => {
    const base = 'new-skill';
    let n = 1;
    while (ruleset.traits.some((t) => t.id === `${base}-${n}`)) n++;
    const newId = `${base}-${n}`;
    const currency = ruleset.currencies.find((c) => c.kind === 'progression');
    apply((r) => {
      let next = edit.addTrait(r, {
        id: newId,
        name: 'New skill',
        groupId,
        tags: [],
        tiers: [],
      });
      if (currency) {
        next = edit.addTier(next, newId, {
          level: 1,
          description: '',
          cost: { currencyId: currency.id, amount: 1 },
          requires: { kind: 'always' },
          grants: [],
        });
      }
      return next;
    });
    setOpen((o) => [...o, newId]);
  };

  return (
    <div className="ed">
      <header className="ed-head">
        <div>
          <h1>{ruleset.name}</h1>
          <p className="muted">
            {ruleset.traits.length} skills ·{' '}
            {ruleset.traits.reduce((n, t) => n + t.tiers.length, 0)} levels
            {!canEdit && ' · read only'}
          </p>
        </div>
        <div className="ed-actions">
          <Link to={`/projects/${id}`} className="button button-small">Back</Link>
          {canEdit && (
            <>
              <button
                className="button button-small"
                onClick={undo}
                disabled={history.current.length === 0}
              >
                Undo
              </button>
              <button
                className="button button-small button-primary"
                onClick={save}
                disabled={saving || !dirty || errors.length > 0}
                title={errors.length > 0 ? 'Fix the errors first' : undefined}
              >
                {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
              </button>
            </>
          )}
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="ed-bar">
        <span className="ed-bar-label">Group by</span>
        <div className="ed-seg">
          {dimensions.map((d) => (
            <button
              key={d.id}
              className={groupBy === d.id ? 'is-on' : ''}
              onClick={() => setGroupBy(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <span className="ed-hint">
          Read from each skill's own conditions — nothing to maintain
        </span>
      </div>

      {issues.length > 0 && (
        <div className="ed-issues">
          <span className="ed-issues-head">
            {errors.length > 0
              ? `${errors.length} problem${errors.length > 1 ? 's' : ''}`
              : `${issues.length} note${issues.length > 1 ? 's' : ''}`}
          </span>
          <ul>
            {issues.slice(0, 6).map((issue, i) => (
              <li key={i} className={issue.severity === 'warning' ? 'is-warning' : ''}>
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {buckets.map((b) => (
        <section key={b.key} className="ed-group">
          <div className="ed-group-head">
            <span className="ed-group-name">{b.label}</span>
            <span className="ed-group-count">{b.traits.length}</span>
            {canEdit && groupBy === 'group' && (
              <button className="ed-add" onClick={() => addSkill(b.key)}>
                + Skill
              </button>
            )}
          </div>

          {b.traits.length === 0 ? (
            <p className="ed-empty">Nothing here.</p>
          ) : (
            b.traits.map((trait) => (
              <SkillRow
                key={trait.id + b.key}
                trait={trait}
                ruleset={ruleset}
                canEdit={canEdit}
                open={open.includes(trait.id)}
                onToggle={() =>
                  setOpen((o) =>
                    o.includes(trait.id)
                      ? o.filter((x) => x !== trait.id)
                      : [...o, trait.id]
                  )
                }
                apply={apply}
              />
            ))
          )}
        </section>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SkillRow({
  trait,
  ruleset,
  canEdit,
  open,
  onToggle,
  apply,
}: {
  trait: Trait;
  ruleset: Ruleset;
  canEdit: boolean;
  open: boolean;
  onToggle: () => void;
  apply: (next: (r: Ruleset) => Ruleset) => void;
}) {
  const currency = ruleset.currencies.find((c) => c.kind === 'progression');
  const rankLabels = ruleset.tracks
    .map((t) => {
      const at = edit.trackPositionOf(trait, t.id);
      return at === null ? null : `${t.name} ${at}`;
    })
    .filter(Boolean) as string[];

  const addLevel = () => {
    const next = Math.max(0, ...trait.tiers.map((t) => t.level)) + 1;
    apply((r) =>
      edit.addTier(r, trait.id, {
        level: next,
        description: '',
        cost: { currencyId: currency?.id ?? '', amount: 1 },
        // A new level normally continues the ladder.
        requires:
          next > 1
            ? { kind: 'trait', traitId: trait.id, minLevel: next - 1 }
            : { kind: 'always' },
        grants: [],
      })
    );
  };

  return (
    <div className="ed-skill">
      <div className="ed-skill-head">
        <button className="ed-caret" onClick={onToggle} aria-expanded={open}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="3"
               style={{ transform: open ? 'rotate(90deg)' : undefined }}>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
        {canEdit ? (
          <input
            className="ed-skill-name"
            value={trait.name}
            onChange={(e) => apply((r) => edit.updateTrait(r, trait.id, { name: e.target.value }))}
          />
        ) : (
          <span className="ed-skill-name is-static">{trait.name}</span>
        )}
        {trait.tags.map((t) => (
          <span key={t} className="chip is-tag">{t}</span>
        ))}
        {rankLabels.map((l) => (
          <span key={l} className="chip">{l}</span>
        ))}
        <span className="ed-skill-meta">
          {trait.tiers.length} level{trait.tiers.length === 1 ? '' : 's'}
        </span>
        {canEdit && (
          <button
            className="ed-del"
            title="Delete skill"
            onClick={() => {
              if (confirm(`Delete "${trait.name}"? Skills that require it will report the break.`)) {
                apply((r) => edit.removeTrait(r, trait.id));
              }
            }}
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <div className="ed-skill-body">
          <label className="ed-field">
            <span>Description</span>
            <textarea
              rows={2}
              value={trait.summary ?? ''}
              readOnly={!canEdit}
              placeholder="What this skill is in the fiction."
              onChange={(e) =>
                apply((r) => edit.updateTrait(r, trait.id, { summary: e.target.value }))
              }
            />
          </label>

          <div className="ed-field">
            <span>Tags</span>
            <TagInput
              tags={trait.tags}
              suggestions={[...new Set(ruleset.traits.flatMap((t) => t.tags))].sort()}
              readOnly={!canEdit}
              onChange={(tags) => apply((r) => edit.updateTrait(r, trait.id, { tags }))}
            />
          </div>

          {trait.tiers
            .slice()
            .sort((a, b) => a.level - b.level)
            .map((tier) => (
              <div key={tier.level} className="ed-tier">
                <div className="ed-tier-head">
                  <span className="ed-tier-lv">Level {tier.level}</span>
                  <label className="ed-cost">
                    <input
                      type="number"
                      value={tier.cost.amount}
                      readOnly={!canEdit}
                      onChange={(e) =>
                        apply((r) =>
                          edit.updateTier(r, trait.id, tier.level, {
                            cost: { ...tier.cost, amount: Number(e.target.value) },
                          })
                        )
                      }
                    />
                    <span>
                      {ruleset.currencies.find((c) => c.id === tier.cost.currencyId)
                        ?.abbreviation ?? tier.cost.currencyId}
                    </span>
                  </label>
                  {canEdit && (
                    <button
                      className="ed-del"
                      title="Remove level"
                      onClick={() =>
                        apply((r) => edit.removeTier(r, trait.id, tier.level))
                      }
                    >
                      ×
                    </button>
                  )}
                </div>

                <textarea
                  className="ed-tier-desc"
                  rows={2}
                  value={tier.description}
                  readOnly={!canEdit}
                  placeholder="What this level does."
                  onChange={(e) =>
                    apply((r) =>
                      edit.updateTier(r, trait.id, tier.level, {
                        description: e.target.value,
                      })
                    )
                  }
                />

                <ClauseEditor
                  ruleset={ruleset}
                  condition={tier.requires}
                  canEdit={canEdit}
                  onChange={(c) =>
                    apply((r) => edit.setTierCondition(r, trait.id, tier.level, c))
                  }
                />
              </div>
            ))}

          {canEdit && (
            <button className="ed-add" onClick={addLevel}>
              + Level
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Prerequisites as a flat clause list.
 *
 * Every gate kind is edited the same way, because in the schema they are the
 * same kind of thing -- a Rank gate sits beside a skill requirement rather
 * than living somewhere separate.
 */
function ClauseEditor({
  ruleset,
  condition,
  canEdit,
  onChange,
}: {
  ruleset: Ruleset;
  condition: Condition;
  canEdit: boolean;
  onChange: (c: Condition) => void;
}) {
  const clauses = edit.clausesOf(condition);
  const operator = edit.operatorOf(condition);

  const write = (next: Condition[]) => onChange(edit.conditionFrom(operator, next));
  const replace = (i: number, clause: Condition) =>
    write(clauses.map((c, n) => (n === i ? clause : c)));

  const describe = (clause: Condition): string => {
    switch (clause.kind) {
      case 'trait':
        return ruleset.traits.find((t) => t.id === clause.traitId)?.name ?? clause.traitId;
      case 'track':
        return ruleset.tracks.find((t) => t.id === clause.trackId)?.name ?? clause.trackId;
      case 'package':
        return ruleset.packages.find((p) => p.id === clause.packageId)?.name ?? clause.packageId;
      case 'packageTier':
        return ruleset.packageTiers.find((t) => t.id === clause.tier)?.name ?? clause.tier;
      default:
        return 'Nested condition';
    }
  };

  return (
    <div className="cl">
      <div className="cl-head">
        <span className="cl-label">Requires</span>
        {clauses.length > 1 && (
          <div className="cl-seg">
            {(['all', 'any'] as const).map((op) => (
              <button
                key={op}
                className={operator === op ? 'is-on' : ''}
                disabled={!canEdit}
                onClick={() => onChange(edit.conditionFrom(op, clauses))}
              >
                {op}
              </button>
            ))}
          </div>
        )}
      </div>

      {clauses.length === 0 && <p className="cl-none">No requirement.</p>}

      {clauses.map((clause, i) => (
        <div key={i} className={`cl-row ${edit.isOpaqueClause(clause) ? 'is-opaque' : ''}`}>
          <span className="cl-kind">
            {clause.kind === 'trait' ? 'Skill'
              : clause.kind === 'track' ? 'Track'
              : clause.kind === 'package' ? 'Archetype'
              : clause.kind === 'packageTier' ? 'Any of tier'
              : 'Nested'}
          </span>

          {clause.kind === 'trait' && (
            <>
              <select
                value={clause.traitId}
                disabled={!canEdit}
                onChange={(e) => replace(i, { ...clause, traitId: e.target.value })}
              >
                {ruleset.traits.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={clause.minLevel}
                disabled={!canEdit}
                onChange={(e) => replace(i, { ...clause, minLevel: Number(e.target.value) })}
              />
            </>
          )}

          {clause.kind === 'track' && (
            <>
              <select
                value={clause.trackId}
                disabled={!canEdit}
                onChange={(e) => replace(i, { ...clause, trackId: e.target.value })}
              >
                {ruleset.tracks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                value={clause.minStep}
                disabled={!canEdit}
                onChange={(e) => replace(i, { ...clause, minStep: Number(e.target.value) })}
              />
            </>
          )}

          {clause.kind === 'package' && (
            <select
              value={clause.packageId}
              disabled={!canEdit}
              onChange={(e) => replace(i, { ...clause, packageId: e.target.value })}
            >
              {ruleset.packages.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          {edit.isOpaqueClause(clause) && (
            // Shown, never rewritten: flattening "A and (B or C)" would change
            // what the rule means.
            <span className="cl-opaque">{describe(clause)} — edit as raw rules</span>
          )}

          {canEdit && (
            <button
              className="ed-del"
              title="Remove requirement"
              onClick={() => write(clauses.filter((_, n) => n !== i))}
            >
              ×
            </button>
          )}
        </div>
      ))}

      {canEdit && (
        <div className="cl-add">
          <button
            onClick={() =>
              write([...clauses, {
                kind: 'trait',
                traitId: ruleset.traits[0]?.id ?? '',
                minLevel: 1,
              }])
            }
          >
            + Skill
          </button>
          {ruleset.tracks.length > 0 && (
            <button
              onClick={() =>
                write([...clauses, {
                  kind: 'track',
                  trackId: ruleset.tracks[0].id,
                  minStep: 1,
                }])
              }
            >
              + {ruleset.tracks[0].name}
            </button>
          )}
          {ruleset.packages.length > 0 && (
            <button
              onClick={() =>
                write([...clauses, {
                  kind: 'package',
                  packageId: ruleset.packages[0].id,
                }])
              }
            >
              + Archetype
            </button>
          )}
        </div>
      )}
    </div>
  );
}
