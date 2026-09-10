import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { rulesetApi, storyApi } from '../services/api';
import ProjectNav from '../components/ProjectNav';
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
import { describeCondition, indexRuleset } from '../../../shared/engine';
import {
  findCases,
  wordingOf,
  type StoryCases,
} from '../../../shared/narrative-cases';
import './StoryOptions.css';

/**
 * Four ways the pieces could hang together, each shown with the project's own
 * content in it.
 *
 * The open question is how content gets ordered, what it gets filed under,
 * and what a reader sees on a row, so none of that is mocked: every list here
 * calls the real functions in shared/narrative-view.ts over the real map. An
 * ordering that looks wrong on this page is wrong in the app.
 *
 * The page itself is a decision aid, to be deleted once a decision is made.
 * The module it exercises stays.
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
  const cases = useMemo(() => (idx ? findCases(idx) : null), [idx]);

  if (error) return <div className="error">{error}</div>;
  if (!map || !idx || !ruleset || !cases) return <p className="muted">Loading…</p>;

  return (
    <div className="opts">
      <ProjectNav id={id} showOptions />
      <header className="story-head">
        <div>
          <h1>Ways this could work</h1>
          <p className="muted">
            Four arrangements of the same pieces, drawn with {map.entities.length}{' '}
            real entries, {map.relations.length} real connections and{' '}
            {ruleset.traits.length} real skills. The sorting runs the same code
            the app would. Pick one and this page goes away.
          </p>
        </div>
      </header>

      <Grammar map={map} idx={idx} cases={cases} />

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

      {option === 'views' && <ViewsOption map={map} idx={idx} cases={cases} projectId={id} />}
      {option === 'campaign' && <CampaignFirst idx={idx} cases={cases} />}
      {option === 'workbench' && (
        <Workbench map={map} idx={idx} ruleset={ruleset} cases={cases} />
      )}
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

/**
 * A rule shown against the entry that motivated it.
 *
 * Every case here is found in the map rather than named in code, so the
 * examples belong to whoever is reading.
 */
function Worked({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="opts-worked">
      <h4>{title}</h4>
      <div>{children}</div>
    </div>
  );
}

/** An entry named inline, with what a list would show beside it. */
function Cite({ of }: { of: NarrativeEntity }) {
  return <em className="opts-cite">{of.name}</em>;
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
 * The row, and the rules behind it. Stated once at the top: all four options
 * use the same row, and only the arrangement around it differs.
 */
function Grammar({ map, idx, cases }: { map: NarrativeMap; idx: MapIndex; cases: StoryCases }) {
  const [open, setOpen] = useState(true);

  /** One entry per awkward case, each labelled with the case it stands for. */
  const sample = useMemo(() => {
    const pick: { entity?: NarrativeEntity; shows: string }[] = [
      {
        entity: map.entities.find((e) => e.occursAt?.includes('·')),
        shows: 'a date and a slot, both written down',
      },
      { entity: cases.inferred[0], shows: 'no date; placed by what it links to' },
      { entity: cases.aliased[0], shows: 'known by several names in the documents' },
      { entity: cases.gated[0], shows: 'gated behind a skill' },
      { entity: cases.unplaced.find((e) => (idx.byEntity.get(e.id) ?? []).length === 0),
        shows: 'nothing links to it at all' },
      { entity: cases.multiSpine[0]?.entity, shows: 'linked to two events, so it is listed twice' },
    ];
    return pick.filter((p): p is { entity: NarrativeEntity; shows: string } => Boolean(p.entity));
  }, [map, idx, cases]);

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
            Every list below uses this row and these ordering rules. These{' '}
            {sample.length} entries are from your map, picked because each one
            breaks a rule that a tidier project would never test:
          </p>

          <div className="opts-frame">
            <RowHead />
            <ul className="opts-list">
              {sample.map(({ entity, shows }) => (
                <li key={entity.id} className="opts-cased">
                  <Row facts={rowFacts(entity, idx)} />
                  <p className="opts-shows">{shows}</p>
                </li>
              ))}
            </ul>
          </div>

          {cases.aliased.length > 0 && (
            <Worked title={`${cases.aliased.length} entries go by more than one name`}>
              <p>
                {cases.aliased.slice(0, 4).map((e, i) => (
                  <span key={e.id}>
                    {i > 0 && '; '}
                    <Cite of={e} /> is also {e.aliases.map((a) => `“${a}”`).join(' and ')}
                  </span>
                ))}
                . Searching any of those names finds the one entry. Without the
                aliases recorded, an import that met{' '}
                “{cases.aliased[0].aliases[0]}” in one document and{' '}
                “{cases.aliased[0].name}” in another would create two.
              </p>
            </Worked>
          )}

          <div className="opts-grammar-notes">
            <Mechanics
              rows={[
                [
                  'Name',
                  'Shown in full. Where canon uses several names for the same thing, the others are stored on the entry as aliases and search matches them too.',
                ],
                [
                  'Kind',
                  'Defined by the project. This one declares ten. Another game defines its own set, and the app has no built-in idea of an “event”.',
                ],
                [
                  'When',
                  <>
                    The <code>occurs at</code> field where someone filled it in.
                    For the {undated} of {map.entities.length} entries without
                    one, the app substitutes the point in the sequence the entry
                    links to, shown dimmed. A dash means it links to nothing.
                  </>,
                ],
                [
                  'Status',
                  'Draft, canon or retired. Only draft is coloured.',
                ],
                [
                  'Links',
                  'The number of entries linked to this one, counted in both directions. Zero is highlighted, since nothing in the canon refers to it.',
                ],
                [
                  'Flags',
                  'Shown only for a missing source or a skill requirement. Most rows have none.',
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
  );
}

/* ------------------------------------------------------------------ *
 * A. One list, sliced many ways
 * ------------------------------------------------------------------ */

function ViewsOption({
  map,
  idx,
  cases,
  projectId,
}: {
  map: NarrativeMap;
  idx: MapIndex;
  cases: StoryCases;
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
  // Rows can exceed entries, since one entry may sit in several groups.
  const distinct = new Set(groups.flatMap((g) => g.entities.map((e) => e.id))).size;

  return (
    <section className="opts-body">
      <Note>
        One list of everything, with the filing exposed: choose the grouping,
        the sort order, and which kinds to include. The controls are live, and
        the {map.entities.length} entries below re-file as you change them.
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
                  <li key={`${g.key}:${e.id}`}>
                    <Row facts={rowFacts(e, idx)} />
                  </li>
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
            'An entry that belongs to two groups is listed under both, so the group counts add up to more than the total.',
          ],
        ]}
      />

      <div className="opts-workedset">
        {cases.spineNaive.join('|') !== cases.spineNatural.join('|') && (
          <Worked title="Why digits are compared as numbers">
            <div className="opts-compare">
              <div>
                <span>Plain alphabetical</span>
                <ol>
                  {cases.spineNaive.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ol>
              </div>
              <div>
                <span>What the app does</span>
                <ol>
                  {cases.spineNatural.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ol>
              </div>
            </div>
            <p>
              Your campaign is the case that shows it: alphabetically, “Event
              10” precedes “Event 9”, which puts the finale in the middle.
            </p>
          </Worked>
        )}

        {cases.multiSpine.length > 0 && (
          <Worked title="An entry that belongs in two places">
            <p>
              <Cite of={cases.multiSpine[0].entity} /> is linked to{' '}
              {cases.multiSpine[0].on.map((e) => e.name).join(' and ')}, so
              filing by the campaign lists it under both. That is why the list
              above shows {shown} rows for {distinct} entries. Picking one of the
              two and hiding the other would be a guess presented as a fact.
            </p>
          </Worked>
        )}

        {cases.inferred.length > 0 && (
          <Worked title={`${cases.inferred.length} entries are placed by their links, not by a date`}>
            <p>
              {cases.inferred.slice(0, 3).map((e, i) => (
                <span key={e.id}>
                  {i > 0 && ', '}
                  <Cite of={e} /> under {rowFacts(e, idx).where}
                </span>
              ))}
              . None of them carries a date. Filing on the date field alone
              would drop all {cases.inferred.length} into the leftovers, which
              is the state most projects are actually in.
            </p>
          </Worked>
        )}
      </div>

      <Verdict
        good="You know what you are after and want it filed the way you happen to be thinking about it."
        bad="You do not know what you are after. Six ways to slice a list does not tell you what to do next, and a newcomer opens the page onto a control panel."
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

function CampaignFirst({ idx, cases }: { idx: MapIndex; cases: StoryCases }) {
  const board = useMemo(() => campaignBoard(idx), [idx]);
  const [eventId, setEventId] = useState<string | null>(null);

  if (!board || board.spine.length === 0) {
    return <p className="muted">This project has no sequence declared.</p>;
  }

  const current = board.spine.find((e) => e.id === eventId) ?? board.spine[board.spine.length - 1];

  // Content in two tracks occupies two cells on the board, but it is one
  // thing that happens once, so a running order lists it once.
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
        The campaign is the spine of the project, and each entry on it gets a
        page: what runs inside it and in what order, which track each piece
        belongs to, who appears, and what is unresolved. The map becomes
        reference material behind the plan.
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
                    ? 'In the event, with no slot recorded.'
                    : 'Nothing here carries a slot, so there is no order to show. Events that have already run usually look like this.'}
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
            'The kind nominated as the sequence: Events here, Sessions or Chapters in another game. A project with no sequence does not get this view.',
          ],
          [
            'What appears on one',
            'Anything linked to it, in either direction, restricted to the kinds the project marked as content. A monster that appears at the event is linked to it, but it is not something anyone has to write.',
          ],
          [
            'The running order',
            'Taken from the part of “occurs at” after the separator, so “Event 10 · Saturday” files under Saturday. Slots currently sort alphabetically, which puts “Saturday morning” after “Saturday”. Sorting them correctly needs a project to define its own day structure, which is not built.',
          ],
          [
            'The unscheduled tail',
            'Entries in the event carrying no slot are listed at the end. On Event 10 that is the largest group.',
          ],
        ]}
      />

      <div className="opts-workedset">
        {cases.slots.length > 1 && (
          <Worked title="Where the slot ordering is wrong">
            <p>
              Your map uses {cases.slots.length} slot names, and the app sorts
              them alphabetically: {cases.slots.map((x) => `“${x}”`).join(', ')}.
              That is right by accident for Friday before Saturday and wrong for{' '}
              {(() => {
                const odd = cases.slots.find((x) => x.includes(' '));
                return odd ? `“${odd}”, which sorts after the slot it is part of` : 'compound names';
              })()}
              . The app cannot know the shape of your day until you tell it,
              and there is nowhere to tell it yet.
            </p>
          </Worked>
        )}

        {cases.multiLane.length > 0 && (
          <Worked title="One thing that happens once, in two tracks">
            <p>
              <Cite of={cases.multiLane[0].entity} /> belongs to{' '}
              {cases.multiLane[0].on.map((e) => e.name).join(' and ')}. On the
              board it occupies a cell in each, which is correct: both tracks
              own a share of it. In this running order it appears once, because
              it is one thing that happens at one time. The same entry, two
              questions, two right answers.
            </p>
          </Worked>
        )}

        <Worked title="What the sequence itself carries">
          <p>
            {current.name} links to {(idx.byEntity.get(current.id) ?? []).length}{' '}
            entries, worded as{' '}
            {wordingOf(current.id, idx).map((w) => `“${w}”`).join(', ')}. The page
            above is built entirely from those, sorted and grouped — nothing on
            it was entered twice, and nothing about “events” is written into the
            app.
          </p>
        </Worked>
      </div>

      <Verdict
        good="You are running a campaign and the next event is what you think about. Everything for it is on one page, in the order it happens."
        bad="You need something that spans events — a character across nine of them — and have to assemble it from nine separate pages."
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
  cases,
}: {
  map: NarrativeMap;
  idx: MapIndex;
  ruleset: Ruleset;
  cases: StoryCases;
}) {
  const [kindId, setKindId] = useState<string>('encounter');
  const [order, setOrder] = useState<OrderBy>('sequence');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rules = useMemo(() => indexRuleset(ruleset), [ruleset]);

  const listed = useMemo(
    () => orderEntities(map.entities.filter((e) => e.kindId === kindId), order, idx),
    [map, kindId, order, idx]
  );

  const selected =
    (selectedId && idx.entities.get(selectedId)) || listed[0] || map.entities[0];

  /** Following a link moves the sidebar too, so it always shows where you are. */
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
        One shell for the whole project: a sidebar listing everything it
        contains — story kinds, rules, roster — a table in the middle that sorts
        on its columns, and an inspector showing the current selection. Nothing
        lives on a separate page.
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
            'The project’s own vocabulary with live counts, so the shape of the corpus is visible before you open anything.',
          ],
          [
            'The table',
            'Sorts on whichever column you click, using the same four orderings as the rest of the app.',
          ],
          [
            'The inspector',
            <>
              Connections are grouped by their wording. {selected?.name} has{' '}
              {(idx.byEntity.get(selected?.id ?? '') ?? []).length}; grouped,
              that reads as{' '}
              {groups.slice(0, 3).map((g) => `${g.label} ${g.others.length}`).join(', ')}.
              Largest group first.
            </>,
          ],
          [
            'Following a link',
            'Selecting a name in the inspector moves the table and the sidebar to its kind.',
          ],
        ]}
      />

      <div className="opts-workedset">
        {cases.directed && (
          <Worked title="One connection, worded from each end">
            <p>
              The link between <Cite of={cases.directed.from} /> and{' '}
              <Cite of={cases.directed.to} /> is stored once. On the first it
              reads “{cases.directed.forward} {cases.directed.to.name}”; open the
              second and the same link reads “{cases.directed.back}{' '}
              {cases.directed.from.name}”. Neither page makes you invert an
              arrow in your head.
              {cases.symmetric && (
                <>
                  {' '}Where both directions mean the same thing —{' '}
                  <Cite of={cases.symmetric.a} /> {cases.symmetric.label}{' '}
                  <Cite of={cases.symmetric.b} /> — it is worded identically from
                  either side rather than inventing an asymmetry.
                </>
              )}
            </p>
          </Worked>
        )}

        {cases.gated.length > 0 && (
          <Worked title="Where the story points at the rules">
            <p>
              {cases.gated.map((e, i) => (
                <span key={e.id}>
                  {i > 0 && ' '}
                  <Cite of={e} /> is gated on{' '}
                  {describeCondition(e.requires!, rules)}.
                </span>
              ))}{' '}
              Both are ordinary rules conditions, so the app can answer a
              question neither document can: whether anyone on the roster can
              open them, and whether the skill they name still exists.
            </p>
          </Worked>
        )}
      </div>

      <Verdict
        good="You move across the whole project in one sitting — writing, then rules, then a character sheet — and want it all in reach."
        bad="You only do one job. A writer who touches encounters gets a sidebar mostly full of other people’s work, and three panes where one would do."
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
  /** Ranked above count, so one broken entry outranks forty unfinished ones. */
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
  // carry a day and plot threads never do, so the check reads the project's
  // own convention off the content rather than requiring a time on everything.
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
  // The spine and lane kinds are structural. A campaign with two tracks has
  // not mis-sorted anything, and merging them would dismantle its board.
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
      why: 'The rules were edited and the story was not, so nothing can open this.',
      fix: 'Point the requirement at a skill that exists, or remove it.',
      sample: brokenGate,
    },
    {
      label: `Not scheduled inside ${next?.name.replace(/ —.*$/, '') ?? 'the next event'}`,
      count: noSlot.length,
      weight: 60,
      why: 'Everything else of the same kind carries a day, so these look like omissions.',
      fix: 'Give each one a slot, or record it as a floater.',
      sample: noSlot,
    },
    {
      label: `Still draft going into ${next?.name.replace(/ —.*$/, '') ?? 'the next event'}`,
      count: drafts.length,
      weight: 50,
      why: 'Written but not signed off. This is the list that decides whether the event is ready.',
      fix: 'Settle them, or move them to a later event.',
      sample: drafts,
    },
    {
      label: 'In the sequence but in no track',
      count: noTrack.length,
      weight: 30,
      why: 'Linked to an event but to no strand of content, so it belongs to nobody in particular.',
      fix: 'Assign a track, or add the track it belongs to.',
      sample: noTrack,
    },
    {
      label: 'Nothing connects to these',
      count: loose.length,
      weight: 25,
      why: 'Written and then left. Some is scheduled for later and some was abandoned.',
      fix: 'Link it to something, retire it, or leave it as it is.',
      sample: loose,
    },
    {
      label: 'No source recorded',
      count: unsourced.length,
      weight: 20,
      why: 'A canon claim with no document behind it cannot be checked by anyone else.',
      fix: 'Record the document and the heading it came from.',
      sample: unsourced,
    },
    {
      label: 'Kinds with almost nothing in them',
      count: thinKinds.length,
      weight: 10,
      why: `A kind holding one or two entries is often a category that should be merged: ${thinKinds
        .map((x) => `${x.k.plural} (${x.n})`)
        .join(', ')}.`,
      fix: 'Merge it into a neighbouring kind, or keep it if it is deliberately small.',
      sample: [],
    },
  ];

  // Ranked by weight, then by count: a broken requirement is a defect, while
  // a pile of drafts is the normal state of a project mid-cycle.
  const ranked = [...findings].sort((a, b) => b.weight - a.weight || b.count - a.count);
  const live = ranked.filter((f) => f.count > 0);
  const clear = ranked.filter((f) => f.count === 0);

  return (
    <section className="opts-body">
      <Note>
        The project opens on the work rather than the content: what is broken,
        unscheduled, unfinished, unlinked or untraceable. Each row gives the
        count, the reason it matters, and what to do about it.
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
            'Seven questions about the map, re-run in full every time the page opens.',
          ],
          [
            'The order',
            'By severity first, then count, so a requirement pointing at a deleted skill sits above forty ordinary drafts.',
          ],
          [
            'Empty checks',
            'Collected into a single “clear” row, so a check that passed is distinguishable from one nobody wrote.',
          ],
          [
            'Wording',
            'Each row states a reason and a remedy. These are observations, not errors: a project is entitled to orphans and drafts.',
          ],
        ]}
      />

      <Verdict
        good="A team with a deadline and a corpus nobody has read end to end."
        bad="A project young enough that everything is a draft and nothing is linked, where all seven rows say the same thing."
      />
    </section>
  );
}
