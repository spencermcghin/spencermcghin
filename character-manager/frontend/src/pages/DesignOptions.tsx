import { useState } from 'react';
import { Link } from 'react-router-dom';
import './DesignOptions.css';

/**
 * Design options for the ruleset builder, rendered inside the real app so
 * they can be judged in the actual theme rather than in a mockup tool.
 *
 * These are static compositions, not wired to the API. The numbers quoted in
 * the Evidence tab are measured from the Eldritch Player's Guide (378 skill
 * rows), not estimated.
 */

type Tab = 'evidence' | 'outline' | 'graph' | 'condition';

const TABS: { id: Tab; label: string; note: string }[] = [
  { id: 'evidence', label: 'Evidence', note: 'What the ruleset actually looks like' },
  { id: 'outline', label: 'The editor', note: 'One list, grouped how you like' },
  { id: 'graph', label: 'Graph', note: 'A read-only lens on 74 dependencies' },
  { id: 'condition', label: 'Condition editor', note: 'Where Rank is just a clause' },
];

export default function DesignOptions() {
  const [tab, setTab] = useState<Tab>('evidence');

  return (
    <div className="opts">
      <div className="opts-head">
        <div>
          <p className="opts-eyebrow">Ruleset builder</p>
          <h1>Three ways to author rules</h1>
          <p className="muted opts-lede">
            Measured against the real Eldritch guide, not a sample. The graph
            draws 13% of the rules; these are the alternatives.
          </p>
        </div>
        <Link to="/projects" className="button button-small">Back</Link>
      </div>

      <nav className="opts-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`opts-tab ${tab === t.id ? 'is-on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="opts-tab-label">{t.label}</span>
            <span className="opts-tab-note">{t.note}</span>
          </button>
        ))}
      </nav>

      {tab === 'evidence' && <Evidence />}
      {tab === 'outline' && <Workbench />}
      {tab === 'graph' && <GraphView />}
      {tab === 'condition' && <ConditionEditor />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Evidence() {
  const rows = [
    { what: 'A Rank on a progression track', n: 292, draw: false, why: 'A gate on a separate track, not an edge between skills' },
    { what: 'The level below itself (a ladder)', n: 184, draw: false, why: 'A self-loop; every node would point at itself' },
    { what: 'A genuinely different skill', n: 68, draw: true, why: 'The only kind a dependency graph can show' },
  ];
  const total = 292 + 184 + 68;

  return (
    <div className="opts-body">
      <section className="opts-card">
        <h2>Every prerequisite in the guide, by kind</h2>
        <p className="muted opts-p">
          378 skill rows across 192 skills. Each row's prerequisite was
          classified by what it points at.
        </p>
        <ul className="ev-list">
          {rows.map((r) => (
            <li key={r.what}>
              <div className="ev-row">
                <span className="ev-what">{r.what}</span>
                <span className={`ev-n ${r.draw ? 'is-draw' : ''}`}>{r.n}</span>
              </div>
              <div className="ev-bar">
                <span
                  className={r.draw ? 'is-draw' : ''}
                  style={{ width: `${(r.n / total) * 100}%` }}
                />
              </div>
              <p className="ev-why">{r.why}</p>
            </li>
          ))}
        </ul>
        <p className="opts-callout">
          A dependency graph can draw <strong>68 of {total}</strong> clauses.
          The other 87% — the two relationships that actually organise the
          ruleset — are invisible on it.
        </p>
      </section>

      <section className="opts-card">
        <h2>What that means for the UI</h2>
        <dl className="ev-points">
          <dt>Rank is the spine, not skills</dt>
          <dd>
            292 clauses gate a skill on Rank 0–3. Whatever the primary view is,
            Rank has to be visible in it — not buried in a condition.
          </dd>
          <dt>Levels are the unit of editing</dt>
          <dd>
            378 rows, 192 skills: costs and prerequisites live on the level, not
            the skill. A node per skill flattens exactly the thing being edited.
          </dd>
          <dt>Most skills are islands</dt>
          <dd>
            74 skill-to-skill edges across 192 skills. On a canvas, the majority
            are unconnected boxes someone still has to arrange by hand.
          </dd>
          <dt>The source is already tabular</dt>
          <dd>
            The guide presents skills as Name / Description / Prerequisite /
            Cost. Staff transcribe from tables and keep them in spreadsheets.
          </dd>
        </dl>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * One flat list of skills. Tree, rank and tags are all properties of the
 * skill, so every grouping below is a read of the same data -- nothing here
 * is maintained per view.
 *
 * `rank` is written as null where a skill has no rank gate, exactly as
 * trackPositionOf returns for one.
 */
const SKILLS = [
  { name: 'Academics', tree: 'General Skills', rank: null as number | null, tags: [] as string[],
    tiers: [{ lv: 1, cost: 1, pre: '—' }, { lv: 2, cost: 2, pre: 'Academics 1' }, { lv: 3, cost: 2, pre: 'Academics 2' }] },
  { name: 'Artificer', tree: 'General Skills', rank: null, tags: ['crafting'],
    tiers: [{ lv: 1, cost: 3, pre: '—' }, { lv: 2, cost: 3, pre: 'Artificer 1' }, { lv: 3, cost: 3, pre: 'Artificer 2' }] },
  { name: 'Bowyer', tree: 'General Skills', rank: null, tags: ['crafting'],
    tiers: [{ lv: 1, cost: 1, pre: 'Artificer 1' }, { lv: 2, cost: 1, pre: 'Artificer 2 · Bowyer 1' }, { lv: 3, cost: 1, pre: 'Artificer 3 · Bowyer 2' }] },
  { name: 'Shield Wall', tree: 'Knight Skills', rank: 0, tags: [],
    tiers: [{ lv: 1, cost: 2, pre: '—' }] },
  { name: 'Armor Mastery', tree: 'Knight Skills', rank: 1, tags: [],
    tiers: [{ lv: 1, cost: 2, pre: 'Armor Proficiency 1 · Rank 1' }] },
  { name: 'Banner of Mercy', tree: 'Knight Skills', rank: 2, tags: ['signature'],
    tiers: [{ lv: 1, cost: 2, pre: 'Rank 2' }] },
  { name: 'Martial Expertise', tree: 'Martial Skills', rank: 3, tags: [],
    tiers: [{ lv: 1, cost: 2, pre: '1-Hand Weapon 1 · Rank 3' }] },
];

type GroupBy = 'tree' | 'rank' | 'tag';

const GROUPINGS: { id: GroupBy; label: string }[] = [
  { id: 'tree', label: 'Tree' },
  { id: 'rank', label: 'Rank' },
  { id: 'tag', label: 'Tag' },
];

function Workbench() {
  const [by, setBy] = useState<GroupBy>('tree');
  const [open, setOpen] = useState<string[]>(['Bowyer']);
  const toggle = (n: string) =>
    setOpen((o) => (o.includes(n) ? o.filter((x) => x !== n) : [...o, n]));

  // Rank grouping reads as a progression, so it gets columns; the others are
  // sections. Same list either way.
  const asBoard = by === 'rank';

  const buckets: { key: string; label: string; sub?: string; skills: typeof SKILLS }[] =
    by === 'tree'
      ? [...new Set(SKILLS.map((s) => s.tree))].map((t) => ({
          key: t, label: t, skills: SKILLS.filter((s) => s.tree === t),
        }))
      : by === 'rank'
        ? [0, 1, 2, 3].map((r) => ({
            key: `r${r}`,
            label: `Rank ${r}`,
            sub: r === 0 ? 'archetype cost' : `${[0, 12, 16, 20][r]} Influence`,
            skills: SKILLS.filter((s) => s.rank === r),
          }))
        : [...new Set(SKILLS.flatMap((s) => (s.tags.length ? s.tags : ['untagged'])))].map(
            (t) => ({
              key: t, label: t,
              skills: SKILLS.filter((s) =>
                t === 'untagged' ? s.tags.length === 0 : s.tags.includes(t)
              ),
            })
          );

  return (
    <div className="opts-body">
      <section className="opts-card is-wide">
        <h2>The editor</h2>
        <p className="muted opts-p">
          Skill → level, the shape the guide is already written in. Tree, Rank
          and tags are all properties of a skill, so grouping by any of them is
          a view of the same list. Nothing needs arranging, and nothing is kept
          in two places.
        </p>

        <div className="wb-bar">
          <span className="wb-bar-label">Group by</span>
          <div className="wb-seg">
            {GROUPINGS.map((g) => (
              <button
                key={g.id}
                className={by === g.id ? 'is-on' : ''}
                onClick={() => setBy(g.id)}
              >
                {g.label}
              </button>
            ))}
          </div>
          <span className="wb-hint">
            {asBoard
              ? 'Drag a skill between columns to change the Rank it needs'
              : 'Grouping is derived from each skill’s own conditions'}
          </span>
        </div>

        {asBoard ? (
          <div className="board">
            {buckets.map((b) => (
              <div key={b.key} className="board-col">
                <div className="board-col-head">
                  <span className="board-rank">{b.label}</span>
                  <span className="board-cost">{b.sub}</span>
                </div>
                <div className="board-col-body">
                  {b.skills.map((s) => (
                    <div key={s.name} className="board-card">
                      <span className="board-card-name">{s.name}</span>
                      <span className="board-card-meta">
                        {s.tree} · {s.tiers[0].cost} CP
                      </span>
                    </div>
                  ))}
                  <div className="board-drop">Drop here to gate on {b.label}</div>
                </div>
              </div>
            ))}
            <p className="wb-note">
              {SKILLS.filter((s) => s.rank === null).length} skills have no Rank
              gate and sit outside the board — which is why Rank is a grouping,
              not the only way in.
            </p>
          </div>
        ) : (
          <div className="ol">
            {buckets.map((b) => (
              <div key={b.key} className="ol-group">
                <div className="ol-group-head">
                  <span className="ol-group-name">{b.label}</span>
                  <span className="ol-count">{b.skills.length}</span>
                </div>
                {b.skills.map((s) => {
                  const isOpen = open.includes(s.name);
                  return (
                    <div key={s.name + b.key} className="ol-skill">
                      <button className="ol-skill-head" onClick={() => toggle(s.name)}>
                        <span className={`ol-caret ${isOpen ? 'is-open' : ''}`}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                               stroke="currentColor" strokeWidth="3">
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </span>
                        <span className="ol-skill-name">{s.name}</span>
                        {s.tags.map((t) => (
                          <span key={t} className="chip is-tag">{t}</span>
                        ))}
                        {s.rank !== null && <span className="chip">Rank {s.rank}</span>}
                        <span className="ol-skill-meta">
                          {s.tiers.length} level{s.tiers.length > 1 ? 's' : ''}
                        </span>
                      </button>
                      {isOpen && (
                        <table className="ol-tiers">
                          <thead>
                            <tr><th>Level</th><th>Cost</th><th>Requires</th><th /></tr>
                          </thead>
                          <tbody>
                            {s.tiers.map((t) => (
                              <tr key={t.lv}>
                                <td className="ol-lv">{t.lv}</td>
                                <td className="ol-cost">{t.cost} CP</td>
                                <td className="ol-pre">{t.pre}</td>
                                <td className="ol-edit">Edit</td>
                              </tr>
                            ))}
                            <tr className="ol-add"><td colSpan={4}>+ Add level</td></tr>
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <Tradeoff
          good={[
            'One editor: a skill is edited in the same place however it is grouped',
            'Groupings are read from the conditions, so none are maintained by hand',
            'Rank gets columns because it reads as a progression — presentation follows the dimension',
            'Nothing to lay out; 192 skills is a scroll',
          ]}
          bad={[
            'Skills with no Rank gate sit outside the board and need the other groupings',
            'Chains like Artificer → Bowyer are still easier to see on the graph',
          ]}
        />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function GraphView() {
  return (
    <div className="opts-body">
      <section className="opts-card is-wide">
        <h2>Option C — Graph, as a second opinion</h2>
        <p className="muted opts-p">
          The 74 skill-to-skill dependencies, laid out automatically. Not an
          editor: a lens for checking structure — spotting a chain that runs
          too deep, an orphan, or a loop. Nothing here needs arranging by hand.
        </p>

        <div className="gr">
          <svg className="gr-edges" viewBox="0 0 720 260" preserveAspectRatio="none">
            <defs>
              <marker id="gh" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7 z" fill="rgba(198,168,109,0.55)" />
              </marker>
            </defs>
            {[
              'M 150 40 C 190 40, 200 40, 236 40',
              'M 150 110 C 190 110, 200 110, 236 110',
              'M 150 180 C 190 180, 200 180, 236 180',
              'M 386 110 C 424 110, 434 110, 470 78',
              'M 386 110 C 424 110, 434 110, 470 142',
            ].map((d) => (
              <path key={d} d={d} stroke="rgba(198,168,109,0.5)" strokeWidth="1.5"
                    fill="none" markerEnd="url(#gh)" />
            ))}
          </svg>

          {[
            { n: 'Artificer', x: 10, y: 22 },
            { n: 'Academics', x: 10, y: 92 },
            { n: 'Armor Proficiency', x: 10, y: 162 },
            { n: 'Bowyer', x: 240, y: 22 },
            { n: 'Well Read', x: 240, y: 92 },
            { n: 'Combat Agility', x: 240, y: 162 },
            { n: 'Gunsmith', x: 474, y: 60 },
            { n: 'Master Alchemist', x: 474, y: 124 },
          ].map((p) => (
            <div key={p.n} className="gr-node" style={{ left: p.x, top: p.y }}>
              {p.n}
            </div>
          ))}
          <span className="gr-more">…66 more edges</span>
        </div>

        <Tradeoff
          good={[
            'Shows the one thing a table cannot: shape and depth',
            'Cycles and orphans are obvious rather than reported',
            'Auto-laid-out, so it costs nothing to maintain',
          ]}
          bad={[
            'Covers 13% of the rules — cannot be the only view',
            'As an editor it would hide ladders and rank gates entirely',
          ]}
        />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ConditionEditor() {
  return (
    <div className="opts-body">
      <section className="opts-card">
        <h2>The condition editor</h2>
        <p className="muted opts-p">
          Whichever layout wins, this is the part that carries the complexity:
          prerequisites are boolean expressions, not a single value. Shown here
          on Bowyer level 2 — <em>Artificer 2 and Bowyer 1</em>.
        </p>

        <div className="cond">
          <div className="cond-head">
            <span className="cond-title">Bowyer · Level 2</span>
            <span className="cond-cost">1 CP</span>
          </div>

          <div className="cond-op">
            <span className="cond-op-label">Must satisfy</span>
            <div className="cond-seg">
              <span className="is-on">all</span>
              <span>any</span>
            </div>
          </div>

          <div className="cond-clauses">
            <div className="cond-clause">
              <span className="cond-kind">Skill</span>
              <span className="cond-value">Artificer</span>
              <span className="cond-lv">at least 2</span>
              <span className="cond-x">×</span>
            </div>
            <div className="cond-clause">
              <span className="cond-kind">Skill</span>
              <span className="cond-value">Bowyer</span>
              <span className="cond-lv">at least 1</span>
              <span className="cond-x">×</span>
            </div>
            <div className="cond-add">
              + Skill &nbsp;·&nbsp; + Rank &nbsp;·&nbsp; + Archetype &nbsp;·&nbsp; + Group
            </div>
          </div>

          <p className="cond-plain">
            Reads as: <strong>Artificer 2 and Bowyer 1</strong>
          </p>
        </div>

        <Tradeoff
          good={[
            'Covers every gate kind, including the 292 Rank ones',
            'Nested all/any stays legible without drawing a tree',
            'Plain-English readback catches mistakes before saving',
          ]}
          bad={['Deeply nested conditions still need an escape hatch to raw form']}
        />
      </section>
    </div>
  );
}

function Tradeoff({ good, bad }: { good: string[]; bad: string[] }) {
  return (
    <div className="tradeoff">
      <div>
        <span className="tradeoff-h">Works because</span>
        <ul>{good.map((g) => <li key={g}>{g}</li>)}</ul>
      </div>
      <div>
        <span className="tradeoff-h is-bad">Costs you</span>
        <ul>{bad.map((b) => <li key={b}>{b}</li>)}</ul>
      </div>
    </div>
  );
}
