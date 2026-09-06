import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { memberApi, rulesetApi } from '../services/api';
import type { Condition, Ruleset, Trait } from '../../../shared/rules-schema';
import { validateRuleset } from '../../../shared/ruleset-validation';
import * as edit from '../../../shared/ruleset-editor';
import { useAuth } from '../auth/useAuth';
import Hint from '../components/Hint';
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
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  /** Previous values, newest last. Operations are pure, so undo is a pop. */
  const history = useRef<Ruleset[]>([]);
  /** The open/closed default is chosen once, not re-imposed on every edit. */
  const openInitialised = useRef(false);

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

  const buckets = useMemo(
    () => (ruleset ? edit.bucketsFor(ruleset, groupBy) : []),
    [ruleset, groupBy]
  );

  /**
   * Searching matches a skill's name, its tags, and the prose on it. Tags and
   * descriptions are included because "which skills mention a lockpick" is a
   * question an author has, and a name-only search cannot answer it.
   */
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return buckets;
    return edit.filterBuckets(buckets, (t) =>
      [t.name, t.summary ?? '', ...t.tags, ...t.tiers.map((x) => x.description)]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [buckets, query]);

  const searching = query.trim().length > 0;
  const allGroupKeys = useMemo(() => edit.bucketKeys(buckets), [buckets]);
  const matchCount = useMemo(
    () => (searching ? shown.reduce((n, b) => n + b.total, 0) : 0),
    [shown, searching]
  );

  /**
   * Trees start closed on a ruleset big enough for that to matter, and open
   * on one small enough to take in at a glance. A real ruleset is 200 skills
   * across 40 trees; opening all of it is a wall. A demo is a dozen, and
   * making someone click into every tree to see it would be worse.
   */
  useEffect(() => {
    if (!ruleset || openInitialised.current) return;
    openInitialised.current = true;
    const all = edit.bucketKeys(edit.bucketsFor(ruleset, 'group'));
    setOpenGroups(ruleset.traits.length <= 30 ? all : []);
  }, [ruleset]);

  const toggleGroup = useCallback(
    (key: string) =>
      setOpenGroups((g) => (g.includes(key) ? g.filter((x) => x !== key) : [...g, key])),
    []
  );

  const toggleSkill = useCallback(
    (traitId: string) =>
      setOpen((o) =>
        o.includes(traitId) ? o.filter((x) => x !== traitId) : [...o, traitId]
      ),
    []
  );

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
        <Hint>
          These are ways of looking at the same skills, not places to put
          them. Each grouping is worked out from what the skills already
          require, so grouping by a track sorts them by the rank they are
          gated on, and a skill gated on nothing falls into "No gate". Only
          the tree a skill belongs to is stored on the skill itself.
        </Hint>
      </div>

      <div className="ed-bar ed-findbar">
        <input
          className="ed-find"
          type="search"
          value={query}
          placeholder="Find a skill…"
          aria-label="Find a skill"
          onChange={(e) => setQuery(e.target.value)}
        />
        {searching ? (
          <span className="ed-hint">
            {matchCount} {matchCount === 1 ? 'match' : 'matches'}
          </span>
        ) : (
          <>
            <button className="ed-add" onClick={() => setOpenGroups(allGroupKeys)}>
              Expand all
            </button>
            <button className="ed-add" onClick={() => setOpenGroups([])}>
              Collapse all
            </button>
          </>
        )}
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

      <QualityPanel ruleset={ruleset} canEdit={canEdit} apply={apply} />

      {shown.length === 0 ? (
        <p className="ed-empty">
          Nothing matches “{query.trim()}”.
        </p>
      ) : (
        shown.map((bucket) => (
          <BucketSection
            key={bucket.key}
            bucket={bucket}
            depth={0}
            ruleset={ruleset}
            canEdit={canEdit}
            canAdd={canEdit && groupBy === 'group'}
            // A search shows what it found, rather than making you open the
            // tree it was found in.
            forceOpen={searching}
            openGroups={openGroups}
            toggleGroup={toggleGroup}
            openSkills={open}
            toggleSkill={toggleSkill}
            addSkill={addSkill}
            apply={apply}
          />
        ))
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * One tree and everything under it.
 *
 * Recursive, because the trees are: an archetype holds its subtrees, which
 * hold the skills. A closed tree renders none of its contents, which is what
 * keeps a 200-skill ruleset from arriving all at once.
 */
function BucketSection({
  bucket,
  depth,
  ruleset,
  canEdit,
  canAdd,
  forceOpen,
  openGroups,
  toggleGroup,
  openSkills,
  toggleSkill,
  addSkill,
  apply,
}: {
  bucket: edit.TraitBucket;
  depth: number;
  ruleset: Ruleset;
  canEdit: boolean;
  canAdd: boolean;
  forceOpen: boolean;
  openGroups: string[];
  toggleGroup: (key: string) => void;
  openSkills: string[];
  toggleSkill: (id: string) => void;
  addSkill: (groupId: string) => void;
  apply: (next: (r: Ruleset) => Ruleset) => void;
}) {
  const isOpen = forceOpen || openGroups.includes(bucket.key);
  const hasChildren = bucket.children.length > 0;

  return (
    <section className={`ed-group ed-depth-${Math.min(depth, 2)}`}>
      <div className="ed-group-head">
        <button
          className="ed-caret"
          onClick={() => toggleGroup(bucket.key)}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${bucket.label}`}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="3"
               style={{ transform: isOpen ? 'rotate(90deg)' : undefined }}>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
        <button className="ed-group-name is-button" onClick={() => toggleGroup(bucket.key)}>
          {bucket.label}
        </button>
        <span className="ed-group-count">{bucket.total}</span>
        {hasChildren && (
          <span className="ed-group-sub">
            {bucket.children.length} {bucket.children.length === 1 ? 'tree' : 'trees'}
          </span>
        )}
        {canAdd && bucket.groupId && (
          <button className="ed-add" onClick={() => addSkill(bucket.groupId!)}>
            + Skill
          </button>
        )}
      </div>

      {isOpen && (
        <div className="ed-group-body">
          {bucket.description && <p className="ed-group-desc">{bucket.description}</p>}

          {bucket.traits.length === 0 && !hasChildren && (
            <p className="ed-empty">Nothing here.</p>
          )}

          {bucket.traits.map((trait) => (
            <SkillRow
              key={trait.id + bucket.key}
              trait={trait}
              ruleset={ruleset}
              canEdit={canEdit}
              open={openSkills.includes(trait.id)}
              onToggle={() => toggleSkill(trait.id)}
              apply={apply}
            />
          ))}

          {bucket.children.map((child) => (
            <BucketSection
              key={child.key}
              bucket={child}
              depth={depth + 1}
              ruleset={ruleset}
              canEdit={canEdit}
              canAdd={canAdd}
              forceOpen={forceOpen}
              openGroups={openGroups}
              toggleGroup={toggleGroup}
              openSkills={openSkills}
              toggleSkill={toggleSkill}
              addSkill={addSkill}
              apply={apply}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */

/**
 * The things a rule can require that are not skills.
 *
 * Above the skill list rather than tucked away, because a quality has to
 * exist before a prerequisite can name it -- the clause editor's "+ Quality"
 * button has nothing to offer until something is defined here.
 */
function QualityPanel({
  ruleset,
  canEdit,
  apply,
}: {
  ruleset: Ruleset;
  canEdit: boolean;
  apply: (next: (r: Ruleset) => Ruleset) => void;
}) {
  const [open, setOpen] = useState(false);

  const addQuality = () => {
    let n = 1;
    while (ruleset.qualities.some((q) => q.id === `quality-${n}`)) n++;
    apply((r) =>
      edit.addQuality(r, {
        id: `quality-${n}`,
        name: 'New quality',
        grantedBy: 'player',
      })
    );
    setOpen(true);
  };

  // Nothing defined and nothing to define it with: an empty panel would just
  // be noise on a ruleset that has no use for one.
  if (ruleset.qualities.length === 0 && !canEdit) return null;

  return (
    <section className="ed-group ed-qualities">
      <div className="ed-group-head">
        <button className="ed-caret" onClick={() => setOpen(!open)} aria-expanded={open}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="3"
               style={{ transform: open ? 'rotate(90deg)' : undefined }}>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
        <span className="ed-group-name">Qualities</span>
        <span className="ed-group-count">{ruleset.qualities.length}</span>
        <span className="ed-hint">
          Gear, backgrounds, boons — anything a rule needs that isn't a skill
        </span>
        <Hint>
          A quality is something a character has rather than something they
          have learned: a piece of equipment, an origin, a favour owed. Define
          one here and any skill can then require it. Mark it{' '}
          <strong>Staff</strong> when it represents something the game awarded,
          and players will see it on their sheet without being able to give it
          to themselves.
        </Hint>
        {canEdit && (
          <button className="ed-add" onClick={addQuality}>
            + Quality
          </button>
        )}
      </div>

      {open && ruleset.qualities.length === 0 && (
        <p className="ed-empty">
          None yet. Add one and any skill can then require it.
        </p>
      )}

      {open &&
        ruleset.qualities.map((q) => (
          <div key={q.id} className="ed-quality">
            <div className="ed-quality-head">
              <input
                className="ed-skill-name"
                value={q.name}
                readOnly={!canEdit}
                onChange={(e) =>
                  apply((r) => edit.updateQuality(r, q.id, { name: e.target.value }))
                }
              />
              <input
                className="ed-quality-cat"
                value={q.category ?? ''}
                readOnly={!canEdit}
                placeholder="Category"
                onChange={(e) =>
                  apply((r) => edit.updateQuality(r, q.id, { category: e.target.value }))
                }
              />
              <div className="cl-seg" title="Who may put this on a character">
                {(['player', 'staff'] as const).map((who) => (
                  <button
                    key={who}
                    className={q.grantedBy === who ? 'is-on' : ''}
                    disabled={!canEdit}
                    onClick={() =>
                      apply((r) => edit.updateQuality(r, q.id, { grantedBy: who }))
                    }
                  >
                    {who === 'player' ? 'Player' : 'Staff'}
                  </button>
                ))}
              </div>
              {canEdit && (
                <button
                  className="ed-del"
                  title="Delete quality"
                  onClick={() => {
                    if (
                      confirm(
                        `Delete "${q.name}"? Rules that require it will report the break.`
                      )
                    ) {
                      apply((r) => edit.removeQuality(r, q.id));
                    }
                  }}
                >
                  ×
                </button>
              )}
            </div>
            <textarea
              className="ed-tier-desc"
              rows={2}
              value={q.description ?? ''}
              readOnly={!canEdit}
              placeholder="What it is, and how a character comes to have it."
              onChange={(e) =>
                apply((r) => edit.updateQuality(r, q.id, { description: e.target.value }))
              }
            />
          </div>
        ))}
    </section>
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
            <span>
              Description
              <Hint>
                The skill as a whole: what it is, and why someone would take
                it. What each level actually does belongs on the level below,
                so that a player comparing level 2 to level 3 can see the
                difference without reading this twice.
              </Hint>
            </span>
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
            <span>
              Tags
              <Hint>
                Tags are how a rule reaches a set of skills without naming each
                one. A cap that applies to the tag "crafting" covers every
                skill you have tagged that way, including ones you add later,
                and a cost reduction can target a tag the same way. Spelling
                matters: "crafting" and "Crafting" are two different tags.
              </Hint>
            </span>
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
                  {tier.level === 1 && (
                    <Hint>
                      Levels run from 1 upward with no gaps. Each one carries
                      its own cost and its own requirement, so a skill can get
                      steeper as it goes, and a later level can demand
                      something the first did not. A cost may be negative,
                      which hands points back.
                    </Hint>
                  )}
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
  const allTags = [...new Set(ruleset.traits.flatMap((t) => t.tags))].sort();

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
      case 'quality':
        return ruleset.qualities.find((q) => q.id === clause.qualityId)?.name ?? clause.qualityId;
      default:
        return 'Nested condition';
    }
  };

  return (
    <div className="cl">
      <div className="cl-head">
        <span className="cl-label">Requires</span>
        <Hint>
          What a character needs before they can buy this level. Every kind of
          gate is a clause here, whether it names a skill, a rank, an
          archetype, or something they own — so a requirement with several
          parts is several clauses. With more than one, <strong>all</strong>{' '}
          demands every clause and <strong>any</strong> demands one of them.
          Leave it empty and anyone can buy this.
        </Hint>
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
              : clause.kind === 'quality' ? 'Has'
              : clause.kind === 'manual' ? 'A person checks'
              : clause.kind === 'anyTrait' ? 'Any skill'
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

          {clause.kind === 'quality' && (
            <select
              value={clause.qualityId}
              disabled={!canEdit}
              onChange={(e) => replace(i, { ...clause, qualityId: e.target.value })}
            >
              {ruleset.qualities.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.category ? `${q.name} · ${q.category}` : q.name}
                </option>
              ))}
            </select>
          )}

          {clause.kind === 'anyTrait' && (
            <>
              {/* Tag and tree in one control: they are alternative ways of
                  saying which skills count, and offering two selects invites
                  setting both by accident. */}
              <select
                value={
                  clause.matching.groupId
                    ? `group:${clause.matching.groupId}`
                    : `tag:${clause.matching.tag ?? ''}`
                }
                disabled={!canEdit}
                onChange={(e) => {
                  const [kind, value] = [
                    e.target.value.slice(0, e.target.value.indexOf(':')),
                    e.target.value.slice(e.target.value.indexOf(':') + 1),
                  ];
                  replace(i, {
                    ...clause,
                    matching: kind === 'group' ? { groupId: value } : { tag: value },
                  });
                }}
              >
                {allTags.map((t) => (
                  <option key={`tag:${t}`} value={`tag:${t}`}>
                    tagged {t}
                  </option>
                ))}
                {ruleset.traitGroups.map((g) => (
                  <option key={`group:${g.id}`} value={`group:${g.id}`}>
                    in {g.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={clause.minLevel}
                aria-label="Minimum level"
                disabled={!canEdit}
                onChange={(e) =>
                  replace(i, { ...clause, minLevel: Number(e.target.value) })
                }
              />
            </>
          )}

          {clause.kind === 'manual' && (
            <input
              className="cl-text"
              value={clause.text}
              disabled={!canEdit}
              placeholder="What a person has to confirm"
              onChange={(e) => replace(i, { ...clause, text: e.target.value })}
            />
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
            title="Requires another skill at a given level"
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
              title={`Requires a position on the ${ruleset.tracks[0].name} track`}
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
              title="Requires holding a particular archetype"
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
          {ruleset.qualities.length > 0 && (
            <button
              title="Requires something the character has rather than has learned"
              onClick={() =>
                write([...clauses, {
                  kind: 'quality',
                  qualityId: ruleset.qualities[0].id,
                }])
              }
            >
              + Quality
            </button>
          )}
          {(allTags.length > 0 || ruleset.traitGroups.length > 0) && (
            <button
              title="Requires any skill of a kind, rather than one skill by name"
              onClick={() =>
                write([...clauses, {
                  kind: 'anyTrait',
                  matching: allTags.length > 0
                    ? { tag: allTags[0] }
                    : { groupId: ruleset.traitGroups[0].id },
                  minLevel: 1,
                }])
              }
            >
              + Any skill
            </button>
          )}
          <button
            title="For a requirement nothing here can settle. It never blocks the purchase; it appears on the sheet for a person to confirm."
            onClick={() => write([...clauses, { kind: 'manual', text: '' }])}
          >
            + Staff check
          </button>
        </div>
      )}
    </div>
  );
}
