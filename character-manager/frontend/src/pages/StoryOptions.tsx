import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { rulesetApi, storyApi } from '../services/api';
import type { NarrativeMap } from '../../../shared/narrative-schema';
import type { Ruleset } from '../../../shared/rules-schema';
import {
  campaignBoard,
  cellKey,
  connectionsOf,
  indexMap,
  orphans,
} from '../../../shared/narrative';
import './StoryOptions.css';

/**
 * Four ways the pieces could hang together.
 *
 * There are now a lot of pieces -- a story map with three views, a campaign
 * board, a rules editor, a roster, a character sheet, a health check that
 * does not exist yet -- and the open question is not how any one of them
 * looks but how someone moves between them. That is an information
 * architecture question, and the cheapest way to answer it is to see the
 * options side by side with real content in them.
 *
 * Everything here renders the project's own map and rules, so the counts and
 * the names are real. This page is a decision aid and is meant to be deleted
 * once a decision is made.
 */

type Option = 'views' | 'campaign' | 'workbench' | 'attention';

const OPTIONS: { id: Option; label: string; line: string }[] = [
  { id: 'views', label: 'Views of one map', line: 'What is built today' },
  { id: 'campaign', label: 'Campaign first', line: 'The board is the project' },
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
            real entries and {ruleset.traits.length} real skills. Pick one and
            this page goes away.
          </p>
        </div>
        <Link to={`/projects/${id}`} className="button button-small">Back</Link>
      </header>

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
      {option === 'workbench' && <Workbench map={map} ruleset={ruleset} />}
      {option === 'attention' && <Attention map={map} idx={idx} ruleset={ruleset} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ *
 * A. What exists today
 * ------------------------------------------------------------------ */

function ViewsOption({
  map,
  idx,
  projectId,
}: {
  map: NarrativeMap;
  idx: ReturnType<typeof indexMap>;
  projectId: string;
}) {
  const board = campaignBoard(idx);
  return (
    <section className="opts-body">
      <Note>
        One Story page with three toggles, sitting beside a separate Rules page
        and a separate roster. Each view answers a different question and they
        share a selection, so following a connection in the list moves the
        graph and the board with it.
      </Note>

      <div className="opts-frame">
        <div className="opts-chrome">
          <span className="opts-crumb">Project</span>
          <span className="opts-crumb">Story</span>
          <div className="ed-seg opts-seg">
            <button className="is-on">List</button>
            <button>Graph</button>
            <button>Campaign</button>
          </div>
        </div>
        <div className="opts-split">
          <ul className="opts-rows">
            {map.entities.slice(0, 7).map((e) => (
              <li key={e.id}>
                <span>{e.name}</span>
                <span className="muted">{idx.entityKinds.get(e.kindId)?.label}</span>
              </li>
            ))}
          </ul>
          <div className="opts-pane">
            <h4>The Rite of Aeons</h4>
            <p className="muted">Rite · 14 connections</p>
            <p>The ritual that held back Oblivion, and must be performed again.</p>
          </div>
        </div>
      </div>

      <Verdict
        good="You know what you came for and which view answers it."
        bad={`Everything else in the project lives somewhere else. ${
          board ? board.spine.length : 0
        } events, ${map.entities.length} entries and the rules are three separate pages, and nothing tells you which to open first.`}
      />
      <Link to={`/projects/${projectId}/story`} className="button button-small">
        This one is real — open it
      </Link>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * B. Campaign first
 * ------------------------------------------------------------------ */

function CampaignFirst({ idx }: { idx: ReturnType<typeof indexMap> }) {
  const board = campaignBoard(idx);
  const next = board?.spine[board.spine.length - 1];
  const lanes = board?.lanes ?? [];

  const forNext = next
    ? [
        ...lanes.flatMap((l) => board!.cells.get(cellKey(l.id, next.id)) ?? []),
        ...(board!.untracked.get(next.id) ?? []),
      ]
    : [];

  return (
    <section className="opts-body">
      <Note>
        The project opens on the campaign, and an event is a page in its own
        right: what runs in it, in which track, who is in it, what it needs
        built, and what is still a draft. The map becomes the reference behind
        the plan rather than the front door.
      </Note>

      <div className="opts-frame">
        <div className="opts-chrome">
          <span className="opts-crumb">Eldritch</span>
          <span className="opts-crumb is-on">{next?.name ?? 'Event'}</span>
          <span className="opts-chrome-right">
            {forNext.filter((e) => e.status === 'draft').length} drafts
          </span>
        </div>

        <div className="opts-event">
          <div className="opts-event-main">
            {lanes.map((lane) => {
              const cards = next ? board!.cells.get(cellKey(lane.id, next.id)) ?? [] : [];
              if (cards.length === 0) return null;
              return (
                <div key={lane.id} className="opts-lane">
                  <h4>{lane.name}</h4>
                  <ul>
                    {cards.map((c) => (
                      <li key={c.id}>
                        <span>{c.name}</span>
                        <span className={`opts-pill is-${c.status}`}>{c.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <aside className="opts-event-side">
            <h4>Who is in it</h4>
            <ul className="opts-tags">
              {(next ? connectionsOf(next.id, idx) : [])
                .map((c) => c.other)
                .filter(Boolean)
                .filter((e) => idx.entityKinds.get(e!.kindId)?.shape === 'person')
                .slice(0, 6)
                .map((e) => (
                  <li key={e!.id}>{e!.name}</li>
                ))}
            </ul>
            <h4>Still open</h4>
            <ul className="opts-tags">
              {forNext
                .filter((e) => e.kindId === 'thread')
                .slice(0, 5)
                .map((e) => (
                  <li key={e.id}>{e.name}</li>
                ))}
            </ul>
          </aside>
        </div>
      </div>

      <Verdict
        good="You are running a campaign and the next event is the thing you think about. Everything you need for it is on one page."
        bad="You want the whole of something that crosses events — a character across nine of them — and now you are hopping between event pages to assemble it."
      />
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * C. Workbench
 * ------------------------------------------------------------------ */

function Workbench({ map, ruleset }: { map: NarrativeMap; ruleset: Ruleset }) {
  return (
    <section className="opts-body">
      <Note>
        One shell for the whole project. A permanent sidebar of everything the
        project contains — story kinds, rules, roster — a main pane that
        switches, and an inspector that always shows whatever is selected.
        Nothing is a separate page, so nothing needs finding twice.
      </Note>

      <div className="opts-frame">
        <div className="opts-bench">
          <nav className="opts-side">
            <span className="opts-side-head">Story</span>
            {map.entityKinds.map((k) => (
              <button key={k.id} className={k.id === 'encounter' ? 'is-on' : ''}>
                {k.plural}
                <span>{map.entities.filter((e) => e.kindId === k.id).length}</span>
              </button>
            ))}
            <span className="opts-side-head">Rules</span>
            <button>
              Skills<span>{ruleset.traits.length}</span>
            </button>
            <button>
              Archetypes<span>{ruleset.packages.length}</span>
            </button>
            <span className="opts-side-head">People</span>
            <button>
              Characters<span>—</span>
            </button>
          </nav>

          <div className="opts-bench-main">
            <ul className="opts-rows">
              {map.entities
                .filter((e) => e.kindId === 'encounter')
                .slice(0, 8)
                .map((e) => (
                  <li key={e.id}>
                    <span>{e.name}</span>
                    <span className="muted">{e.occursAt ?? ''}</span>
                  </li>
                ))}
            </ul>
          </div>

          <aside className="opts-pane">
            <h4>The Rite Itself</h4>
            <p className="muted">Encounter · Event 10 · Saturday</p>
            <p>
              Performed at dusk, alongside a field battle, with the players
              holding the ritual space until the casting completes.
            </p>
            <h5>Connections</h5>
            <ul className="opts-tags">
              <li>concerns The Rite of Aeons</li>
              <li>belongs to Rite Track</li>
              <li>appears in Event 10</li>
            </ul>
          </aside>
        </div>
      </div>

      <Verdict
        good="You work across the whole project in a sitting and want one place with everything in reach."
        bad="You only ever do one job — a writer who touches encounters and nothing else — and the sidebar is mostly other people's work."
      />
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * D. What needs attention
 * ------------------------------------------------------------------ */

function Attention({
  map,
  idx,
  ruleset,
}: {
  map: NarrativeMap;
  idx: ReturnType<typeof indexMap>;
  ruleset: Ruleset;
}) {
  const board = campaignBoard(idx);
  const next = board?.spine[board.spine.length - 1];
  const traitIds = new Set(ruleset.traits.map((t) => t.id));

  const drafts = next
    ? [
        ...(board!.lanes.flatMap((l) => board!.cells.get(cellKey(l.id, next.id)) ?? [])),
        ...(board!.untracked.get(next.id) ?? []),
      ].filter((e) => e.status === 'draft')
    : [];

  const unsourced = map.entities.filter((e) => e.sources.length === 0);
  const loose = orphans(idx);
  const gated = map.entities.filter(
    (e) => e.requires?.kind === 'trait' && traitIds.has(e.requires.traitId)
  );

  const rows: { label: string; count: number; why: string; sample: string[] }[] = [
    {
      label: `Drafts going into ${next?.name ?? 'the next event'}`,
      count: drafts.length,
      why: 'Written but not settled. The list that decides whether the event is ready.',
      sample: drafts.slice(0, 4).map((e) => e.name),
    },
    {
      label: 'Nothing connects to these',
      count: loose.length,
      why: 'Written, then left. Not wrong, but nobody can decide that without seeing them.',
      sample: loose.slice(0, 4).map((e) => e.name),
    },
    {
      label: 'No source recorded',
      count: unsourced.length,
      why: 'A canon claim nobody can trace back is a rumour.',
      sample: unsourced.slice(0, 4).map((e) => e.name),
    },
    {
      label: 'Gated behind a skill',
      count: gated.length,
      why: 'Content that only opens to a character with the right skill. Worth knowing whether anyone has it.',
      sample: gated.slice(0, 4).map((e) => e.name),
    },
  ];

  return (
    <section className="opts-body">
      <Note>
        The project opens on the work rather than the content: what is unfinished,
        what is unmoored, what cannot be traced, and what is locked behind a skill
        nobody may have bought. Each row is a way in — you arrive knowing what to do,
        not what exists.
      </Note>

      <div className="opts-frame">
        <div className="opts-chrome">
          <span className="opts-crumb is-on">Eldritch</span>
          <span className="opts-chrome-right">
            {drafts.length + loose.length + unsourced.length} things to look at
          </span>
        </div>
        <ul className="opts-attention">
          {rows.map((r) => (
            <li key={r.label} className={r.count === 0 ? 'is-clear' : ''}>
              <div className="opts-attention-head">
                <strong>{r.label}</strong>
                <span className="opts-count">{r.count}</span>
              </div>
              <p className="muted">{r.why}</p>
              {r.sample.length > 0 && (
                <ul className="opts-tags">
                  {r.sample.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      <Verdict
        good="A team with a deadline and a messy corpus. It tells you where the holes are instead of waiting to be asked."
        bad="A project early enough that everything is a draft and everything is unconnected, where the list is just a restatement of 'you have not finished'."
      />
    </section>
  );
}
