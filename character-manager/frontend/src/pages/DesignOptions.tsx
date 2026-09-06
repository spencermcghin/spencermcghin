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

type Tab = 'evidence' | 'outline' | 'matrix' | 'graph' | 'condition';

const TABS: { id: Tab; label: string; note: string }[] = [
  { id: 'evidence', label: 'Evidence', note: 'What the ruleset actually looks like' },
  { id: 'outline', label: 'A · Outline', note: 'Tree → skill → level' },
  { id: 'matrix', label: 'B · Rank board', note: 'Organised by the dominant gate' },
  { id: 'graph', label: 'C · Graph', note: 'The 74 real dependencies' },
  { id: 'condition', label: 'Condition editor', note: 'Needed by all three' },
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
      {tab === 'outline' && <Outline />}
      {tab === 'matrix' && <Matrix />}
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

const OUTLINE = [
  {
    group: 'General Skills',
    gate: null as string | null,
    skills: [
      { name: 'Academics', tags: [], tiers: [
        { lv: 1, cost: 1, pre: '—' },
        { lv: 2, cost: 2, pre: 'Academics 1' },
        { lv: 3, cost: 2, pre: 'Academics 2' },
      ] },
      { name: 'Artificer', tags: ['crafting'], tiers: [
        { lv: 1, cost: 3, pre: '—' },
        { lv: 2, cost: 3, pre: 'Artificer 1' },
        { lv: 3, cost: 3, pre: 'Artificer 2' },
      ] },
      { name: 'Bowyer', tags: ['crafting'], tiers: [
        { lv: 1, cost: 1, pre: 'Artificer 1' },
        { lv: 2, cost: 1, pre: 'Artificer 2 · Bowyer 1' },
        { lv: 3, cost: 1, pre: 'Artificer 3 · Bowyer 2' },
      ] },
    ],
  },
  {
    group: 'Knight Skills',
    gate: 'Requires Knight',
    skills: [
      { name: 'Shield Wall', tags: [], tiers: [{ lv: 1, cost: 2, pre: '—' }] },
      { name: 'Banner of Mercy', tags: ['signature'], tiers: [
        { lv: 1, cost: 2, pre: 'Rank 2' },
      ] },
    ],
  },
];

function Outline() {
  const [open, setOpen] = useState<string[]>(['Bowyer']);
  const toggle = (n: string) =>
    setOpen((o) => (o.includes(n) ? o.filter((x) => x !== n) : [...o, n]));

  return (
    <div className="opts-body">
      <section className="opts-card is-wide">
        <h2>Option A — Outline</h2>
        <p className="muted opts-p">
          Tree → skill → level, the shape the guide is already written in.
          Everything is a row, so nothing needs arranging. Scales to 192 skills
          by scrolling rather than panning.
        </p>

        <div className="ol">
          {OUTLINE.map((g) => (
            <div key={g.group} className="ol-group">
              <div className="ol-group-head">
                <span className="ol-group-name">{g.group}</span>
                {g.gate && <span className="chip">{g.gate}</span>}
                <span className="ol-count">{g.skills.length}</span>
              </div>

              {g.skills.map((s) => {
                const isOpen = open.includes(s.name);
                return (
                  <div key={s.name} className={`ol-skill ${isOpen ? 'is-open' : ''}`}>
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

        <Tradeoff
          good={[
            'Nothing to lay out — 192 skills is a scroll, not a canvas',
            'Edits land where the data lives: on the level',
            'Mirrors the guide, so transcribing is line-for-line',
            'Searchable, keyboard-navigable, diffs cleanly',
          ]}
          bad={['Chains like Artificer → Bowyer → … are not visible at a glance']}
        />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const RANKS = [0, 1, 2, 3];
const BOARD: Record<number, { name: string; tree: string; cost: number }[]> = {
  0: [
    { name: 'Second Wind', tree: 'Veteran', cost: 1 },
    { name: 'Sure Footed', tree: 'Veteran', cost: 1 },
    { name: 'Shield Wall', tree: 'Knight', cost: 2 },
  ],
  1: [
    { name: 'Armor Mastery', tree: 'Knight', cost: 2 },
    { name: 'Rallying Cry', tree: 'Knight', cost: 2 },
  ],
  2: [
    { name: 'Banner of Mercy', tree: 'Knight', cost: 2 },
    { name: 'Combat Agility', tree: 'Veteran', cost: 2 },
    { name: 'Stun Mastery', tree: 'Veteran', cost: 3 },
  ],
  3: [{ name: 'Martial Expertise', tree: 'Veteran', cost: 2 }],
};

function Matrix() {
  return (
    <div className="opts-body">
      <section className="opts-card is-wide">
        <h2>Option B — Rank board</h2>
        <p className="muted opts-p">
          Rank gates 292 clauses, more than any other relationship. This makes
          it the layout: columns are ranks, so a skill's position <em>is</em> its
          gate, and no condition has to be read to see when it unlocks.
        </p>

        <div className="board">
          {RANKS.map((r) => (
            <div key={r} className="board-col">
              <div className="board-col-head">
                <span className="board-rank">Rank {r}</span>
                <span className="board-cost">
                  {r === 0 ? 'archetype cost' : `${[0, 12, 16, 20][r]} Influence`}
                </span>
              </div>
              <div className="board-col-body">
                {(BOARD[r] ?? []).map((s) => (
                  <div key={s.name} className="board-card">
                    <span className="board-card-name">{s.name}</span>
                    <span className="board-card-meta">{s.tree} · {s.cost} CP</span>
                  </div>
                ))}
                <div className="board-drop">Drop a skill here to gate it on Rank {r}</div>
              </div>
            </div>
          ))}
        </div>

        <Tradeoff
          good={[
            'The most common gate becomes position, not buried text',
            'Dragging between columns re-gates a skill — one obvious gesture',
            'Reads as a progression, which is what players experience',
          ]}
          bad={[
            'Only works for rulesets that have a rank-like track',
            'Skills with no rank gate need somewhere to live',
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
