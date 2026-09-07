import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { rulesetApi, storyApi } from '../services/api';
import type { NarrativeEntity, NarrativeMap } from '../../../shared/narrative-schema';
import type { Ruleset } from '../../../shared/rules-schema';
import {
  campaignBoard,
  cellKey,
  connectionsOf,
  indexMap,
  orphans,
  type MapIndex,
} from '../../../shared/narrative';
import {
  GROUPINGS,
  ORDERINGS,
  groupEntities,
  groupedConnections,
  orderEntities,
  rowFacts,
  slotOf,
  type GroupBy,
  type OrderBy,
  type RowFacts,
} from '../../../shared/narrative-view';
import './StoryOptions.css';

/**
 * Four ways the pieces could hang together, each shown with the project's own
 * content in it.
 *
 * The question is not how any one screen looks -- it is how content gets
 * ordered, what it gets filed under, and what a reader sees on a row. So the
 * sorting and grouping here is not mocked: every list on this page runs the
 * real functions in shared/narrative-view.ts, over the real map. If an
 * ordering looks wrong here it is wrong in the app.
 *
 * This page is a decision aid and is meant to be deleted once a decision is
 * made. The module it exercises is not.
 */

type Option = 'views' | 'campaign' | 'workbench' | 'attention';

const OPTIONS: { id: Option; label: string; line: string }[] = [
  { id: 'views', label: 'Views of one map', line: 'One list, sliced many ways' },
  { id: 'campaign', label: 'Campaign first', line: 'The event is the page' },
  { id: 'workbench', label: 'Workbench', line: 'One shell, everything in it' },
  { id: 'attention', label: 'What needs attention', line: 'Open on the work, not the content' },
];

export default function StoryOptions() {
  const { id = '' } = useParams();
  const [map, setMap] = useState<NarrativeMap | null>(null);
  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [option, setOption] = useState<Option>('views');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([storyApi.get(id), rulesetApi.get(id)])
      .then(([s, r]) => {
        setMap(s.map);
        setRuleset(r);
      })
      .catch(() => setError('Could not load this project.'));
  }, [id]);

  const idx = useMemo(() => (map ? indexMap(map) : null), [map]);

  if (error) return <div className="error">{error}</div>;
  if (!map || !idx || !ruleset) return <p className="muted">Loading…</p>;

  return (
    <div className="opts">
      <header className="story-head">
        <div>
          <h1>Ways this could work</h1>
          <p className="muted">
            Four arrangements of the same pieces, drawn with {map.entities.length}{' '}
            real entries, {map.relations.length} real connections and{' '}
            {ruleset.traits.length} real skills. The sorting is live, not
            drawn. Pick one and this page goes away.
          </p>
        </div>
        <Link to={`/projects/${id}`} className="button button-small">Back</Link>
      </header>

      <Grammar map={map} idx={idx} />

      <nav className="opts-tabs">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            className={option === o.id ? 'is-on' : ''}
            onClick={() => setOption(o.id)}
          >
            <strong>{o.label}</strong>
            <span>{o.line}</span>
          </button>
        ))}
      </nav>

      {option === 'views' && <ViewsOption map={map} idx={idx} projectId={id} />}
      {option === 'campaign' && <CampaignFirst idx={idx} />}
      {option === 'workbench' && <Workbench map={map} idx={idx} ruleset={ruleset} />}
      {option === 'attention' && <Attention map={map} idx={idx} ruleset={ruleset} />}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Shared furniture
 * ------------------------------------------------------------------ */

function Note({ children }: { children: React.ReactNode }) {
  return <p className="opts-note">{children}</p>;
}

function Verdict({ good, bad }: { good: string; bad: string }) {
  return (
    <dl className="opts-verdict">
      <div>
        <dt>Works when</dt>
        <dd>{good}</dd>
      </div>
      <div>
        <dt>Breaks when</dt>
        <dd>{bad}</dd>
      </div>
    </dl>
  );
}

/** How a given view sorts and files things, stated rather than inferred. */
function Mechanics({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="opts-mech">
      {rows.map(([term, def]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{def}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The row, and the ladder behind it.
 *
 * Stated once at the top because it is the same row in all four options --
 * the arrangements differ, the grammar of a line does not.
 */
function Grammar({ map, idx }: { map: NarrativeMap; idx: MapIndex }) {
  const [open, setOpen] = useState(true);
  const sample = useMemo(() => {
    const dated = map.entities.find((e) => e.occursAt?.includes('·'));
    const inferred = map.entities.find((e) => !e.occursAt && rowFacts(e, idx).where);
    const gated = map.entities.find((e) => e.requires);
    const loose = orphans(idx)[0];
    return [dated, inferred, gated, loose].filter(Boolean) as NarrativeEntity[];
  }, [map, idx]);

  const undated = map.entities.filter((e) => !e.occursAt).length;

  return (
    <section className="opts-grammar">
      <button className="opts-grammar-head" onClick={() => setOpen(!open)}>
        <h2>How a list is built</h2>
        <span>{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="opts-grammar-body">
          <p className="opts-note">
            Every list in every option below is the same row, ordered by the
            same ladder and filed by the same rule. Four examples from your map,
            chosen to show the awkward cases rather than the tidy ones:
          </p>

          <div className="opts-frame">
            <RowHead />
            <ul className="opts-list">
              {sample.map((e) => (
                <Row key={e.id} facts={rowFacts(e, idx)} />
              ))}
            </ul>
          </div>

          <div className="opts-grammar-notes">
            <Mechanics
              rows={[
                [
                  'Name',
                  'The name as written, not truncated. If canon calls the same person three things, the other two are aliases on the entry and search finds all three.',
                ],
                [
                  'Kind',
                  'Your kind, not ours. This project declares ten; a different game declares its own and nothing in the app knows what an “event” is.',
                ],
                [
                  'When',
                  <>
                    The <code>occurs at</code> field where someone filled it in.
                    Where nobody did — {undated} of {map.entities.length} entries
                    here — it falls back to the point in the sequence the entry
                    is connected to, shown dimmed to mark it as derived. A row
                    reading <em>—</em> is genuinely unplaced.
                  </>,
                ],
                [
                  'Status',
                  'Draft, canon or retired. Draft is the only one that is coloured, because draft is the only one that is work.',
                ],
                [
                  'Links',
                  'How many entries touch this one, counted from both ends. Zero is worth seeing: it means nothing in the canon refers to this.',
                ],
                [
                  'Flags',
                  'Only the absences and the constraints — no source recorded, gated behind a skill. A row with no flags is a row with nothing to answer for.',
                ],
              ]}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function RowHead() {
  return (
    <div className="opts-row opts-row-head">
      <span>Name</span>
      <span>Kind</span>
      <span>When</span>
      <span>Status</span>
      <span className="opts-num">Links</span>
      <span>Flags</span>
    </div>
  );
}

function Row({
  facts,
  selected,
  onSelect,
}: {
  facts: RowFacts;
  selected?: boolean;
  onSelect?: (id: string) => void;
}) {
  const { entity, kindLabel, where, whereInferred, degree, sourced, gated } = facts;
  return (
    <li>
      <button
        className={`opts-row ${selected ? 'is-selected' : ''}`}
        onClick={() => onSelect?.(entity.id)}
        title={entity.summary}
      >
        <span className="opts-row-name">{entity.name}</span>
        <span className="opts-row-kind">{kindLabel}</span>
        <span className={`opts-row-when ${whereInferred ? 'is-inferred' : ''}`}>
          {where ?? '—'}
        </span>
        <span className={`opts-pill is-${entity.status}`}>{entity.status}</span>
        <span className={`opts-num ${degree === 0 ? 'is-zero' : ''}`}>{degree}</span>
        <span className="opts-row-flags">
          {!sourced && <em className="opts-flag is-warn">no source</em>}
          {gated && <em className="opts-flag">gated</em>}
        </span>
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ *
 * A. One list, sliced many ways
 * ------------------------------------------------------------------ */

function ViewsOption({
  map,
  idx,
  projectId,
}: {
  map: NarrativeMap;
  idx: MapIndex;
  projectId: string;
}) {
  const [group, setGroup] = useState<GroupBy>('sequence');
  const [order, setOrder] = useState<OrderBy>('sequence');
  const [kinds, setKinds] = useState<string[]>([]);

  const filtered = useMemo(
    () => (kinds.length === 0 ? map.entities : map.entities.filter((e) => kinds.includes(e.kindId))),
    [map, kinds]
  );
  const groups = useMemo(
    () => groupEntities(filtered, group, idx, order),
    [filtered, group, order, idx]
  );

  const groupRule = GROUPINGS.find((g) => g.id === group)!;
  const orderRule = ORDERINGS.find((o) => o.id === order)!;
  const shown = groups.reduce((n, g) => n + g.entities.length, 0);

  return (
    <section className="opts-body">
      <Note>
        One list of everything, with the slicing exposed rather than fixed:
        choose what to file it under, what to sort it by, and which kinds to
        keep. The controls below are live — change them and the {map.entities.length}{' '}
        real entries below re-file themselves.
      </Note>

      <div className="opts-frame">
        <div className="opts-chrome">
          <span className="opts-crumb">Eldritch</span>
          <span className="opts-crumb is-on">Story</span>
          <span className="opts-chrome-right">
            {shown} shown in {groups.length} group{groups.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="opts-controls">
          <label>
            <span>Group by</span>
            <select value={group} onChange={(e) => setGroup(e.target.value as GroupBy)}>
              {GROUPINGS.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Sort by</span>
            <select value={order} onChange={(e) => setOrder(e.target.value as OrderBy)}>
              {ORDERINGS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </label>
          <div className="opts-facets">
            {map.entityKinds.map((k) => {
              const on = kinds.includes(k.id);
              const n = map.entities.filter((e) => e.kindId === k.id).length;
              return (
                <button
                  key={k.id}
                  className={`opts-facet ${on ? 'is-on' : ''}`}
                  onClick={() =>
                    setKinds(on ? kinds.filter((x) => x !== k.id) : [...kinds, k.id])
                  }
                >
                  {k.plural}
                  <span>{n}</span>
                </button>
              );
            })}
            {kinds.length > 0 && (
              <button className="opts-facet is-clearer" onClick={() => setKinds([])}>
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="opts-scroll">
          <RowHead />
          {groups.map((g) => (
            <div key={g.key} className={`opts-group ${g.leftover ? 'is-leftover' : ''}`}>
              <div className="opts-group-head">
                <strong>{g.label}</strong>
                <span className="opts-group-count">{g.entities.length}</span>
                {g.note && <p>{g.note}</p>}
              </div>
              <ul className="opts-list">
                {g.entities.map((e) => (
                  <Row key={`${g.key}:${e.id}`} facts={rowFacts(e, idx)} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <Mechanics
        rows={[
          [`Grouped by ${groupRule.label.toLowerCase()}`, groupRule.rule],
          ['Leftovers', groupRule.leftover],
          [`Sorted by ${orderRule.label.toLowerCase()}`, orderRule.ladder],
          [
            'Duplicates',
            'An entry belonging to two groups is listed in both. The counts therefore sum to more than the total, which is honest; collapsing it to one arbitrary group is not.',
          ],
        ]}
      />

      <Verdict
        good="You know what you are looking for and want it filed the way you happen to think about it today. Nothing is buried under one imposed hierarchy."
        bad="You do not yet know what you are looking for. Six ways to slice a list is not an answer to “what should I do next”, and a newcomer meets a control panel."
      />
      <Link to={`/projects/${projectId}/story`} className="button button-small">
        This one is closest to what exists — open it
      </Link>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * B. Campaign first
 * ------------------------------------------------------------------ */

function CampaignFirst({ idx }: { idx: MapIndex }) {
  const board = useMemo(() => campaignBoard(idx), [idx]);
  const [eventId, setEventId] = useState<string | null>(null);

  if (!board || board.spine.length === 0) {
    return <p className="muted">This project has no sequence declared.</p>;
  }

  const current = board.spine.find((e) => e.id === eventId) ?? board.spine[board.spine.length - 1];

  // Content in two tracks sits in two cells, which is right on a board and
  // wrong on a running order -- it is still one thing that happens once.
  const inEvent = [
    ...new Map(
      [
        ...board.lanes.flatMap((l) => board.cells.get(cellKey(l.id, current.id)) ?? []),
        ...(board.untracked.get(current.id) ?? []),
      ].map((e) => [e.id, e])
    ).values(),
  ];

  // Within an event, content is grouped by its slot -- the part of `occursAt`
  // after the separator -- and everything without one gathers at the end.
  const slots = new Map<string, NarrativeEntity[]>();
  const unslotted: NarrativeEntity[] = [];
  for (const e of orderEntities(inEvent, 'name', idx)) {
    const slot = slotOf(e);
    if (!slot) unslotted.push(e);
    else slots.set(slot, [...(slots.get(slot) ?? []), e]);
  }
  const slotNames = [...slots.keys()].sort();

  const laneOf = (e: NarrativeEntity) =>
    board.lanes.find((l) =>
      (idx.byEntity.get(e.id) ?? []).some((r) => r.fromId === l.id || r.toId === l.id)
    )?.name;

  const cast = connectionsOf(current.id, idx)
    .map((c) => c.other)
    .filter((e): e is NarrativeEntity => Boolean(e))
    .filter((e) => ['person', 'group', 'place'].includes(idx.entityKinds.get(e.kindId)?.shape ?? ''));

  const open = inEvent.filter((e) => e.kindId === 'thread' && e.status === 'draft');
  const drafts = inEvent.filter((e) => e.status === 'draft');

  return (
    <section className="opts-body">
      <Note>
        The campaign is the spine of the project, and one entry on it is a page:
        the running order inside it, what track each piece belongs to, who and
        what appears, and what is still open. The map becomes the reference
        behind the plan rather than the front door.
      </Note>

      <div className="opts-frame">
        <div className="opts-chrome">
          <span className="opts-crumb">Eldritch</span>
          {board.spine.map((s) => (
            <button
              key={s.id}
              className={`opts-step ${s.id === current.id ? 'is-on' : ''}`}
              onClick={() => setEventId(s.id)}
            >
              {s.name.replace(/ —.*$/, '')}
            </button>
          ))}
          <span className="opts-chrome-right">
            {drafts.length} of {inEvent.length} still draft
          </span>
        </div>

        <div className="opts-event">
          <div className="opts-event-main">
            <h3 className="opts-event-title">{current.name}</h3>
            {current.summary && <p className="opts-event-sub">{current.summary}</p>}

            {slotNames.map((slot) => (
              <div key={slot} className="opts-slot">
                <h4>{slot}</h4>
                <ul>
                  {slots.get(slot)!.map((e) => (
                    <li key={e.id}>
                      <span className="opts-row-name">{e.name}</span>
                      <span className="opts-row-kind">{laneOf(e) ?? 'no track'}</span>
                      <span className={`opts-pill is-${e.status}`}>{e.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {unslotted.length > 0 && (
              <div className={`opts-slot ${slotNames.length > 0 ? 'is-leftover' : ''}`}>
                <h4>
                  {slotNames.length > 0
                    ? 'Not scheduled within the event'
                    : 'No running order recorded'}
                </h4>
                <p className="opts-slot-note">
                  {slotNames.length > 0
                    ? 'In the event, but nobody has said when. This is the list a production meeting actually works from.'
                    : 'Nothing here carries a slot, so there is nothing to order it by. An event that has already run often looks like this, and that is fine — the running order mattered on the day.'}
                </p>
                <ul>
                  {unslotted.map((e) => (
                    <li key={e.id}>
                      <span className="opts-row-name">{e.name}</span>
                      <span className="opts-row-kind">{laneOf(e) ?? 'no track'}</span>
                      <span className={`opts-pill is-${e.status}`}>{e.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="opts-event-side">
            <h4>Who and where</h4>
            <ul className="opts-tags">
              {cast.slice(0, 10).map((e) => (
                <li key={e.id}>{e.name}</li>
              ))}
              {cast.length === 0 && <li className="muted">nothing connected yet</li>}
            </ul>

            <h4>Still open</h4>
            <ul className="opts-tags">
              {open.map((e) => (
                <li key={e.id}>{e.name}</li>
              ))}
              {open.length === 0 && <li className="muted">nothing outstanding</li>}
            </ul>

            <h4>Leads to</h4>
            <ul className="opts-tags">
              {connectionsOf(current.id, idx)
                .filter((c) => c.label === 'leads to')
                .map((c) => (
                  <li key={c.otherId}>{c.other?.name ?? c.otherId}</li>
                ))}
              {connectionsOf(current.id, idx).every((c) => c.label !== 'leads to') && (
                <li className="muted">the last one on the spine</li>
              )}
            </ul>
          </aside>
        </div>
      </div>

      <Mechanics
        rows={[
          [
            'Which entries are pages',
            'The kind the project nominated as its sequence — Events here, Sessions or Chapters elsewhere. A game with no sequence never sees this view.',
          ],
          [
            'What appears on one',
            'Anything connected to it, whichever way the connection was written, filtered to the kinds the project called content. A monster that appears at the event is true but is not work.',
          ],
          [
            'The running order',
            'Grouped by the part of “occurs at” after the separator — “Event 10 · Saturday” puts it under Saturday. Slots are ordered alphabetically for now, which is why “Saturday morning” lands after “Saturday”. Ordering slots properly means letting a project name its own day structure, and that is unbuilt.',
          ],
          [
            'The unscheduled tail',
            'Everything in the event with no slot is listed at the end rather than dropped or guessed at. It is usually the largest group and it is the one worth looking at.',
          ],
        ]}
      />

      <Verdict
        good="You are running a campaign and the next event is the thing you think about. Everything needed for it is on one page, in the order it will happen."
        bad="You want something that crosses events — a character across nine of them — and now you are assembling it by hopping between event pages."
      />
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * C. Workbench
 * ------------------------------------------------------------------ */

function Workbench({
  map,
  idx,
  ruleset,
}: {
  map: NarrativeMap;
  idx: MapIndex;
  ruleset: Ruleset;
}) {
  const [kindId, setKindId] = useState<string>('encounter');
  const [order, setOrder] = useState<OrderBy>('sequence');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listed = useMemo(
    () => orderEntities(map.entities.filter((e) => e.kindId === kindId), order, idx),
    [map, kindId, order, idx]
  );

  const selected =
    (selectedId && idx.entities.get(selectedId)) || listed[0] || map.entities[0];

  /** Following a link moves the sidebar too, so the shell never lies about
   *  where you are. */
  const follow = (id: string) => {
    setSelectedId(id);
    const kind = idx.entities.get(id)?.kindId;
    if (kind) setKindId(kind);
  };
  const groups = useMemo(
    () => (selected ? groupedConnections(selected.id, idx, connectionsOf as never) : []),
    [selected, idx]
  );

  const columns: [string, OrderBy][] = [
    ['Name', 'name'],
    ['When', 'sequence'],
    ['Links', 'connections'],
    ['Status', 'status'],
  ];

  return (
    <section className="opts-body">
      <Note>
        One shell for the whole project. A permanent sidebar of everything it
        contains — story kinds, rules, roster — a table in the middle that sorts
        on its columns, and an inspector that always shows whatever is selected.
        Nothing is a separate page, so nothing needs finding twice.
      </Note>

      <div className="opts-frame">
        <div className="opts-bench">
          <nav className="opts-side">
            <span className="opts-side-head">Story</span>
            {map.entityKinds.map((k) => (
              <button
                key={k.id}
                className={k.id === kindId ? 'is-on' : ''}
                onClick={() => {
                  setKindId(k.id);
                  setSelectedId(null);
                }}
              >
                {k.plural}
                <span>{map.entities.filter((e) => e.kindId === k.id).length}</span>
              </button>
            ))}
            <span className="opts-side-head">Rules</span>
            <button>Skills<span>{ruleset.traits.length}</span></button>
            <button>Archetypes<span>{ruleset.packages.length}</span></button>
            <button>Skill groups<span>{ruleset.traitGroups.length}</span></button>
            <span className="opts-side-head">People</span>
            <button>Player characters<span>—</span></button>
          </nav>

          <div className="opts-bench-main">
            <div className="opts-row opts-row-head is-sortable">
              {columns.map(([label, by]) => (
                <button
                  key={label}
                  className={order === by ? 'is-on' : ''}
                  onClick={() => setOrder(by)}
                >
                  {label}
                  {order === by && <i aria-hidden> ▾</i>}
                </button>
              ))}
            </div>
            <ul className="opts-list opts-bench-list">
              {listed.map((e) => (
                <BenchRow
                  key={e.id}
                  facts={rowFacts(e, idx)}
                  selected={selected?.id === e.id}
                  onSelect={setSelectedId}
                />
              ))}
              {listed.length === 0 && <li className="muted opts-empty">Nothing of that kind yet.</li>}
            </ul>
          </div>

          <aside className="opts-pane">
            {selected && (
              <>
                <h4>{selected.name}</h4>
                <p className="muted">
                  {idx.entityKinds.get(selected.kindId)?.label}
                  {rowFacts(selected, idx).where ? ` · ${rowFacts(selected, idx).where}` : ''}
                  {' · '}
                  {(idx.byEntity.get(selected.id) ?? []).length} connections
                </p>
                {selected.summary && <p>{selected.summary}</p>}

                {selected.aliases.length > 0 && (
                  <>
                    <h5>Also called</h5>
                    <ul className="opts-tags">
                      {selected.aliases.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </>
                )}

                <h5>Connections</h5>
                {groups.map((g) => (
                  <div key={g.label} className="opts-conn">
                    <span className="opts-conn-label">
                      {g.label}
                      <em>{g.others.length + g.broken}</em>
                    </span>
                    <ul className="opts-tags">
                      {g.others.slice(0, 8).map((o) => (
                        <li key={o.id}>
                          <button onClick={() => follow(o.id)}>{o.name}</button>
                        </li>
                      ))}
                      {g.others.length > 8 && (
                        <li className="muted">+{g.others.length - 8} more</li>
                      )}
                    </ul>
                  </div>
                ))}

                <h5>Source</h5>
                <ul className="opts-tags">
                  {selected.sources.map((s) => (
                    <li key={s.label}>{s.label}</li>
                  ))}
                  {selected.sources.length === 0 && (
                    <li className="opts-flag is-warn">no source recorded</li>
                  )}
                </ul>
              </>
            )}
          </aside>
        </div>
      </div>

      <Mechanics
        rows={[
          [
            'The sidebar',
            'The project’s own vocabulary with live counts, so the shape of the corpus is visible before you open anything. A kind with two members in it is a question; a kind with sixty is a place you will spend the afternoon.',
          ],
          [
            'The table',
            'Sorts on a column, not on a hidden preference. Same four orderings as everywhere else — click a heading here and it is the ladder described at the top of the page.',
          ],
          [
            'The inspector',
            <>
              Connections are gathered under their wording rather than listed
              flat. {selected?.name} has {(idx.byEntity.get(selected?.id ?? '') ?? []).length}{' '}
              of them, which as a flat list is a wall and under headings is{' '}
              {groups.slice(0, 3).map((g) => `${g.label} ${g.others.length}`).join(', ')}.
              Largest group first, because it is usually what the entry is for.
            </>,
          ],
          [
            'Following a link',
            'Clicking a name in the inspector selects it and the sidebar follows to its kind. Navigation is one motion; you never lose the shell.',
          ],
        ]}
      />

      <Verdict
        good="You work across the whole project in a sitting — writing, then rules, then checking a character — and want one place with everything in reach."
        bad="You only ever do one job. A writer who touches encounters and nothing else meets a sidebar that is mostly other people’s work, and three panes where one would do."
      />
    </section>
  );
}

function BenchRow({
  facts,
  selected,
  onSelect,
}: {
  facts: RowFacts;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const { entity, where, whereInferred, degree } = facts;
  return (
    <li>
      <button
        className={`opts-row is-bench ${selected ? 'is-selected' : ''}`}
        onClick={() => onSelect(entity.id)}
      >
        <span className="opts-row-name">{entity.name}</span>
        <span className={`opts-row-when ${whereInferred ? 'is-inferred' : ''}`}>
          {where ?? '—'}
        </span>
        <span className={`opts-num ${degree === 0 ? 'is-zero' : ''}`}>{degree}</span>
        <span className={`opts-pill is-${entity.status}`}>{entity.status}</span>
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ *
 * D. What needs attention
 * ------------------------------------------------------------------ */

interface Finding {
  label: string;
  count: number;
  /** Ranked above count, so one broken thing outranks forty unfinished ones. */
  weight: number;
  why: string;
  fix: string;
  sample: NarrativeEntity[];
}

function Attention({
  map,
  idx,
  ruleset,
}: {
  map: NarrativeMap;
  idx: MapIndex;
  ruleset: Ruleset;
}) {
  const board = campaignBoard(idx);
  const next = board?.spine[board.spine.length - 1];
  const traitIds = new Set(ruleset.traits.map((t) => t.id));

  const inNext = next
    ? [
        ...new Map(
          [
            ...board!.lanes.flatMap((l) => board!.cells.get(cellKey(l.id, next.id)) ?? []),
            ...(board!.untracked.get(next.id) ?? []),
          ].map((e) => [e.id, e])
        ).values(),
      ]
    : [];

  const drafts = inNext.filter((e) => e.status === 'draft');

  // Only kinds that are scheduled at all can be missing a slot. Encounters
  // carry a day and a plot thread never will, so the check reads the project's
  // own habit off the content instead of deciding that everything needs a time.
  const scheduledKinds = new Set(inNext.filter((e) => slotOf(e)).map((e) => e.kindId));
  const noSlot = inNext.filter((e) => scheduledKinds.has(e.kindId) && !slotOf(e));
  const loose = orphans(idx);
  const unsourced = map.entities.filter((e) => e.sources.length === 0);
  const gated = map.entities.filter((e) => e.requires);
  const brokenGate = gated.filter(
    (e) => e.requires?.kind === 'trait' && !traitIds.has(e.requires.traitId)
  );
  const noTrack = board
    ? [...(board.untracked.values() as Iterable<NarrativeEntity[]>)].flat()
    : [];
  // The spine and lane kinds are structure, not categories. A campaign with
  // two tracks is not a project that mis-sorted its content, and telling it to
  // merge them would dismantle the board.
  const structural = new Set([map.campaign?.spineKindId, map.campaign?.laneKindId]);
  const thinKinds = map.entityKinds
    .filter((k) => !structural.has(k.id))
    .map((k) => ({ k, n: map.entities.filter((e) => e.kindId === k.id).length }))
    .filter((x) => x.n > 0 && x.n < 3);

  const findings: Finding[] = [
    {
      label: 'Gated on a skill that no longer exists',
      count: brokenGate.length,
      weight: 100,
      why: 'The rules were edited and the story was not. Nothing can ever open this.',
      fix: 'Repoint the gate at a skill that exists, or take the gate off.',
      sample: brokenGate,
    },
    {
      label: `Not scheduled inside ${next?.name.replace(/ —.*$/, '') ?? 'the next event'}`,
      count: noSlot.length,
      weight: 60,
      why: 'Everything else of the same kind carries a day, so these are omissions rather than a project that does not schedule.',
      fix: 'Give each one a slot, or accept it as a floater and say so.',
      sample: noSlot,
    },
    {
      label: `Still draft going into ${next?.name.replace(/ —.*$/, '') ?? 'the next event'}`,
      count: drafts.length,
      weight: 50,
      why: 'Written but not settled. The list that decides whether the event is ready.',
      fix: 'Settle them, or move them to the event after.',
      sample: drafts,
    },
    {
      label: 'In the sequence but in no track',
      count: noTrack.length,
      weight: 30,
      why: 'Attached to an event and to no strand of content. Not wrong, but this is where work goes missing between meetings.',
      fix: 'Put each in a track, or add the track it belongs to.',
      sample: noTrack,
    },
    {
      label: 'Nothing connects to these',
      count: loose.length,
      weight: 25,
      why: 'Written, then left. Some of it is next year’s work and some was forgotten; nobody can tell which without seeing the list.',
      fix: 'Connect it to something, retire it, or leave it and stop wondering.',
      sample: loose,
    },
    {
      label: 'No source recorded',
      count: unsourced.length,
      weight: 20,
      why: 'A canon claim nobody can trace back is a rumour, and staff will not trust the map enough to use it.',
      fix: 'Add the document and the heading it came from.',
      sample: unsourced,
    },
    {
      label: 'Kinds with almost nothing in them',
      count: thinKinds.length,
      weight: 10,
      why: `A kind holding one or two entries is usually a category that wanted merging: ${thinKinds
        .map((x) => `${x.k.plural} (${x.n})`)
        .join(', ')}.`,
      fix: 'Merge it into a neighbouring kind, or accept that it is deliberately small.',
      sample: [],
    },
  ];

  // Ranked by weight, then by count. A single broken gate outranks forty
  // drafts because one is a defect and the other is a Tuesday.
  const ranked = [...findings].sort((a, b) => b.weight - a.weight || b.count - a.count);
  const live = ranked.filter((f) => f.count > 0);
  const clear = ranked.filter((f) => f.count === 0);

  return (
    <section className="opts-body">
      <Note>
        The project opens on the work rather than the content: what is broken,
        what is unscheduled, what is unfinished, what is unmoored, and what
        cannot be traced. Each row states what it found, why it matters and what
        to do about it, because a count with no reason attached is a nag.
      </Note>

      <div className="opts-frame">
        <div className="opts-chrome">
          <span className="opts-crumb is-on">Eldritch</span>
          <span className="opts-chrome-right">
            {live.length} of {ranked.length} checks have something to say
          </span>
        </div>

        <ul className="opts-attention">
          {live.map((f) => (
            <li key={f.label}>
              <div className="opts-attention-head">
                <strong>{f.label}</strong>
                <span className="opts-count">{f.count}</span>
              </div>
              <p className="muted">{f.why}</p>
              {f.sample.length > 0 && (
                <ul className="opts-tags">
                  {f.sample.slice(0, 5).map((e) => (
                    <li key={e.id}>{e.name}</li>
                  ))}
                  {f.sample.length > 5 && (
                    <li className="muted">+{f.sample.length - 5} more</li>
                  )}
                </ul>
              )}
              <p className="opts-fix">{f.fix}</p>
            </li>
          ))}

          {clear.length > 0 && (
            <li className="is-clear">
              <div className="opts-attention-head">
                <strong>Clear</strong>
                <span className="opts-count">{clear.length}</span>
              </div>
              <p className="muted">
                {clear.map((f) => f.label.toLowerCase()).join('; ')}. Shown so the
                list reads as a check that ran rather than a check that was
                skipped.
              </p>
            </li>
          )}
        </ul>
      </div>

      <Mechanics
        rows={[
          [
            'What is checked',
            'Seven questions a document cannot ask about itself, run over the whole map every time the page opens. Nothing is cached and nothing needs a person to remember to run it.',
          ],
          [
            'The order',
            'By severity first and count second, so one gate pointing at a deleted skill sits above forty ordinary drafts. A list ranked purely by count would bury the only real defect under the normal state of a working project.',
          ],
          [
            'Empty checks',
            'Rolled into one “clear” row rather than hidden, so you can tell the difference between a check that passed and a check nobody wrote.',
          ],
          [
            'Wording',
            'Every row carries a reason and a remedy. These are suggestions about shape, not errors — a project is allowed to have orphans and drafts, and the app’s job is to make that a decision rather than an accident.',
          ],
        ]}
      />

      <Verdict
        good="A team with a deadline and a corpus nobody has read end to end. It tells you where the holes are instead of waiting to be asked."
        bad="A project young enough that everything is a draft and nothing is connected, where every row reads “you have not finished yet” and the page is noise."
      />
    </section>
  );
}
