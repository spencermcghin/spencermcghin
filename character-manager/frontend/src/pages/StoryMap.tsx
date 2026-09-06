import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { storyApi, type StoryMapResponse } from '../services/api';
import type { NarrativeEntity } from '../../../shared/narrative-schema';
import { connectionsOf, indexMap } from '../../../shared/narrative';
import Hint from '../components/Hint';
import './StoryMap.css';

/**
 * The story map.
 *
 * A LARP's canon lives across hundreds of documents and nobody holds the
 * connections but the people who wrote them. This is the browsable form of
 * those connections: pick a thing, see what it touches, and see what has
 * been written and then forgotten.
 *
 * Deliberately not a canvas. A graph of two hundred nodes tells you nothing
 * you did not already know; the questions staff actually have are "what does
 * this connect to" and "what is still unresolved", and both are lists.
 */
export default function StoryMap() {
  const { id = '' } = useParams();
  const [data, setData] = useState<StoryMapResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [kind, setKind] = useState<string>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    storyApi
      .get(id)
      .then(setData)
      .catch(() => setError('Could not load this project.'));
  }, [id]);

  const idx = useMemo(() => (data ? indexMap(data.map) : null), [data]);

  const shown = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.map.entities
      .filter((e) => kind === 'all' || e.kindId === kind)
      .filter((e) =>
        !q
          ? true
          : [e.name, e.summary ?? '', e.body ?? '', ...e.aliases, ...e.tags]
              .join(' ')
              .toLowerCase()
              .includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, kind, query]);

  const open = useCallback((entityId: string) => {
    setSelected(entityId);
    setQuery('');
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!data || !idx) return <p className="muted">Loading…</p>;

  const { map, issues, orphans, hubs } = data;
  const entity = selected ? idx.entities.get(selected) : undefined;
  const kindOf = (e: NarrativeEntity) => idx.entityKinds.get(e.kindId);

  if (map.entities.length === 0) {
    return (
      <div className="story">
        <header className="story-head">
          <div>
            <h1>Story</h1>
            <p className="muted">Nothing mapped yet.</p>
          </div>
          <Link to={`/projects/${id}`} className="button button-small">Back</Link>
        </header>
        <div className="empty-state">
          <p>
            A story map records what your game is made of — events, characters,
            places, artifacts, and the plot threads still open — and how they
            connect. It answers the questions a pile of documents cannot: what
            does this NPC touch, what is still unresolved, and what was written
            and then forgotten.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="story">
      <header className="story-head">
        <div>
          <h1>Story</h1>
          <p className="muted">
            {map.entities.length} entries · {map.relations.length} connections
            {!data.canEdit && ' · read only'}
          </p>
        </div>
        <Link to={`/projects/${id}`} className="button button-small">Back</Link>
      </header>

      {issues.length > 0 && (
        <div className="ed-issues">
          <span className="ed-issues-head">
            {issues.length} {issues.length === 1 ? 'problem' : 'problems'}
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

      <div className="story-bar">
        <input
          className="ed-find"
          type="search"
          value={query}
          placeholder="Find anything…"
          aria-label="Find in the story map"
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="ed-seg">
          <button className={kind === 'all' ? 'is-on' : ''} onClick={() => setKind('all')}>
            All
          </button>
          {map.entityKinds.map((k) => (
            <button
              key={k.id}
              className={kind === k.id ? 'is-on' : ''}
              onClick={() => setKind(k.id)}
            >
              {k.plural}
            </button>
          ))}
        </div>
      </div>

      <div className="story-body">
        <div className="story-list">
          {shown.length === 0 && <p className="ed-empty">Nothing matches.</p>}
          {shown.map((e) => {
            const degree = (idx.byEntity.get(e.id) ?? []).length;
            return (
              <button
                key={e.id}
                className={`story-row ${selected === e.id ? 'is-selected' : ''}`}
                onClick={() => open(e.id)}
              >
                <span className="story-row-name">{e.name}</span>
                <span className="story-row-kind">{kindOf(e)?.label ?? e.kindId}</span>
                {e.status !== 'canon' && (
                  <span className={`story-status is-${e.status}`}>{e.status}</span>
                )}
                <span className="story-row-degree">
                  {degree === 0 ? 'unconnected' : `${degree}`}
                </span>
              </button>
            );
          })}
        </div>

        <aside className="story-panel">
          {!entity ? (
            <>
              <section>
                <h2>
                  Most connected
                  <Hint align="right">
                    What the story actually turns on. A thread everything
                    touches is load-bearing; changing it changes more than its
                    own document says.
                  </Hint>
                </h2>
                {hubs.length === 0 ? (
                  <p className="muted">Nothing is connected yet.</p>
                ) : (
                  <ul className="story-hubs">
                    {hubs.map((h) => (
                      <li key={h.id}>
                        <button onClick={() => open(h.id)}>{h.name}</button>
                        <span className="muted">{h.degree}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h2>
                  Nothing connects to these
                  <Hint align="right">
                    Written, and then left. Not necessarily wrong — it may be
                    waiting for a future event — but nobody can decide that
                    until they can see the list.
                  </Hint>
                </h2>
                {orphans.length === 0 ? (
                  <p className="ok">Everything is connected to something.</p>
                ) : (
                  <ul className="story-hubs">
                    {orphans.map((oid) => (
                      <li key={oid}>
                        <button onClick={() => open(oid)}>
                          {idx.entities.get(oid)?.name ?? oid}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : (
            <>
              <section>
                <div className="story-detail-head">
                  <h2>{entity.name}</h2>
                  <button className="ed-del" aria-label="Close" onClick={() => setSelected(null)}>
                    ×
                  </button>
                </div>
                <p className="story-detail-kind">
                  {kindOf(entity)?.label ?? entity.kindId}
                  {entity.status !== 'canon' && ` · ${entity.status}`}
                  {entity.occursAt && ` · ${entity.occursAt}`}
                </p>
                {entity.aliases.length > 0 && (
                  <p className="muted">Also called {entity.aliases.join(', ')}</p>
                )}
                {entity.summary && <p className="story-summary">{entity.summary}</p>}
                {entity.body && <p className="story-body-text">{entity.body}</p>}
                {entity.tags.length > 0 && (
                  <div className="chip-row">
                    {entity.tags.map((t) => (
                      <span key={t} className="chip is-tag">{t}</span>
                    ))}
                  </div>
                )}
              </section>

              {entity.requires && (
                <section>
                  <h2>
                    Gated on the rules
                    <Hint align="right">
                      This content points at a skill in the same project's
                      rules, so the app can tell you whether anyone on the
                      roster could actually open it.
                    </Hint>
                  </h2>
                  <p className="story-gate">
                    {describeRequirement(entity.requires)}
                  </p>
                </section>
              )}

              <section>
                <h2>Connections</h2>
                {(() => {
                  const links = connectionsOf(entity.id, idx);
                  if (links.length === 0) {
                    return <p className="muted">Nothing connects to this yet.</p>;
                  }
                  return (
                    <ul className="story-links">
                      {links.map((c) => (
                        <li key={c.relation.id}>
                          <span className="story-link-label">{c.label}</span>
                          {c.other ? (
                            <button onClick={() => open(c.other!.id)}>{c.other.name}</button>
                          ) : (
                            <span className="story-broken">{c.otherId} (missing)</span>
                          )}
                          {c.relation.note && (
                            <span className="story-link-note">{c.relation.note}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </section>

              {entity.sources.length > 0 && (
                <section>
                  <h2>
                    Says who
                    <Hint align="right">
                      Every entry names where it came from. A canon claim
                      nobody can trace is a rumour, and staff will not trust
                      the map enough to use it.
                    </Hint>
                  </h2>
                  <ul className="story-sources">
                    {entity.sources.map((s, i) => (
                      <li key={i}>
                        {s.url ? (
                          <a href={s.url} target="_blank" rel="noreferrer">{s.label}</a>
                        ) : (
                          s.label
                        )}
                        {s.locator && <span className="muted"> · {s.locator}</span>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

/**
 * A requirement in words, without pulling the whole rules engine in.
 *
 * The sheet uses describeCondition, which needs an indexed ruleset to turn
 * ids into names. Here the ruleset is not loaded, so this says the shape of
 * the requirement and leaves the naming to the rules editor.
 */
function describeRequirement(condition: NarrativeEntity['requires']): string {
  if (!condition) return '';
  switch (condition.kind) {
    case 'trait':
      return `${condition.traitId} at level ${condition.minLevel} or higher`;
    case 'anyTrait':
      return `any ${condition.matching.tag ?? 'skill'} at level ${condition.minLevel} or higher`;
    case 'quality':
      return `the ${condition.qualityId} quality`;
    case 'track':
      return `${condition.trackId} ${condition.minStep} or higher`;
    case 'all':
      return condition.of.map(describeRequirement).join(', and ');
    case 'any':
      return condition.of.map(describeRequirement).join(', or ');
    case 'manual':
      return condition.text;
    default:
      return 'a requirement set in the rules';
  }
}
