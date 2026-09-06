import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { storyApi } from '../services/api';
import type {
  NarrativeEntity,
  NarrativeMap,
} from '../../../shared/narrative-schema';
import { connectionsOf, indexMap, orphans, validateMap } from '../../../shared/narrative';
import * as edit from '../../../shared/narrative-editor';
import Hint from '../components/Hint';
import TagInput from '../components/TagInput';
import StoryGraph from '../components/StoryGraph';
import './StoryMap.css';

/**
 * The story map.
 *
 * A LARP's canon lives across hundreds of documents and nobody holds the
 * connections but the people who wrote them. This is where they get written
 * down: pick a thing, say what it touches, and see what has been written and
 * then forgotten.
 *
 * Deliberately not a canvas. The questions staff actually have are "what does
 * this connect to" and "what is still unresolved", and both are lists; a
 * graph of two hundred nodes answers neither.
 */
export default function StoryMap() {
  const { id = '' } = useParams();

  const [map, setMap] = useState<NarrativeMap | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [kind, setKind] = useState('all');
  const [query, setQuery] = useState('');
  const [showKinds, setShowKinds] = useState(false);
  const [view, setView] = useState<'list' | 'graph'>('list');
  /**
   * Where you have walked, so you can get back. Exploring a graph without a
   * way back is a maze: every click is a commitment and the way you came is
   * gone.
   */
  const [trail, setTrail] = useState<string[]>([]);
  const history = useRef<NarrativeMap[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    storyApi
      .get(id)
      .then((r) => {
        setMap(r.map);
        setCanEdit(r.canEdit);
      })
      .catch(() => setError('Could not load this project.'));
  }, [id]);

  const apply = useCallback((next: (m: NarrativeMap) => NarrativeMap) => {
    // Updaters must be pure; the dirty flag is set outside.
    setDirty(true);
    setMap((current) => {
      if (!current) return current;
      history.current.push(current);
      return next(current);
    });
  }, []);

  const undo = useCallback(() => {
    const previous = history.current.pop();
    if (previous) {
      setMap(previous);
      setDirty(true);
    }
  }, []);

  const save = async () => {
    if (!map) return;
    setSaving(true);
    try {
      await storyApi.save(id, map);
      history.current = [];
      setDirty(false);
      setError(null);
    } catch {
      setError('Could not save. You may not have permission to edit this project.');
    } finally {
      setSaving(false);
    }
  };

  const idx = useMemo(() => (map ? indexMap(map) : null), [map]);
  const issues = useMemo(() => (map ? validateMap(map) : []), [map]);
  const loose = useMemo(() => (idx ? orphans(idx).map((e) => e.id) : []), [idx]);

  const shown = useMemo(() => {
    if (!map) return [];
    const q = query.trim().toLowerCase();
    return map.entities
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
  }, [map, kind, query]);

  const open = useCallback((entityId: string) => {
    setSelected((current) => {
      if (current && current !== entityId) {
        // Revisiting somewhere already on the trail winds back to it rather
        // than looping, so the trail stays a path and not a history log.
        setTrail((t) =>
          t.includes(entityId) ? t.slice(0, t.indexOf(entityId)) : [...t, current]
        );
      }
      return entityId;
    });
  }, []);

  const back = useCallback(() => {
    setTrail((t) => {
      if (t.length === 0) return t;
      setSelected(t[t.length - 1]);
      return t.slice(0, -1);
    });
  }, []);

  /* ---------------- import and export ---------------- */

  const exportJson = () => {
    if (!map) return;
    const blob = new Blob([JSON.stringify(map, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${id}-story.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    if (!map) return;
    try {
      const incoming = JSON.parse(await file.text()) as Partial<NarrativeMap>;
      // Merged out here rather than inside the updater: React may run an
      // updater more than once, so anything it computes for the caller to
      // read afterwards can be computed twice or discarded.
      const r = edit.mergeMap(map, incoming);
      apply(() => r.map);
      // After apply, which does not touch the note.
      setNote(
        `Added ${r.addedEntities} ${r.addedEntities === 1 ? 'entry' : 'entries'} and ` +
          `${r.addedRelations} ${r.addedRelations === 1 ? 'connection' : 'connections'}` +
          (r.skipped.length > 0
            ? `. ${r.skipped.length} already here, left as ${
                r.skipped.length === 1 ? 'it was' : 'they were'
              }.`
            : '.')
      );
    } catch {
      setError('That file is not a story map.');
    }
  };

  if (error && !map) return <div className="error">{error}</div>;
  if (!map || !idx) return <p className="muted">Loading…</p>;

  const entity = selected ? idx.entities.get(selected) : undefined;
  const started = map.entityKinds.length > 0;

  return (
    <div className="story">
      <header className="story-head">
        <div>
          <h1>Story</h1>
          <p className="muted">
            {map.entities.length} {map.entities.length === 1 ? 'entry' : 'entries'} ·{' '}
            {map.relations.length}{' '}
            {map.relations.length === 1 ? 'connection' : 'connections'}
            {!canEdit && ' · read only'}
          </p>
        </div>
        <div className="ed-actions">
          <Link to={`/projects/${id}`} className="button button-small">Back</Link>
          <button className="button button-small" onClick={exportJson}>Export</button>
          {canEdit && (
            <>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void importJson(file);
                  e.target.value = '';
                }}
              />
              <button className="button button-small" onClick={() => fileInput.current?.click()}>
                Import
              </button>
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
                disabled={saving || !dirty}
              >
                {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
              </button>
            </>
          )}
        </div>
      </header>

      {error && <div className="error">{error}</div>}
      {note && <p className="award-note">{note}</p>}

      {!started ? (
        <div className="empty-state">
          <p>
            A story map records what your game is made of — events, characters,
            places, artifacts, and the threads still open — and how they
            connect. It answers what a pile of documents cannot: what does this
            NPC touch, what is unresolved, and what got written and forgotten.
          </p>
          <p className="muted">
            Every project names its own kinds of thing. Start from a common set
            and rename what does not fit, or build your own from nothing.
          </p>
          {canEdit && (
            <div className="chip-row">
              <button
                className="button button-primary"
                onClick={() =>
                  apply((m) => {
                    const v = edit.starterVocabulary();
                    return { ...m, entityKinds: v.entityKinds, relationKinds: v.relationKinds };
                  })
                }
              >
                Start with a common set
              </button>
              <button className="button" onClick={() => setShowKinds(true)}>
                Define my own
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
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
            <div className="ed-seg">
              {(['list', 'graph'] as const).map((v) => (
                <button
                  key={v}
                  className={view === v ? 'is-on' : ''}
                  onClick={() => setView(v)}
                >
                  {v === 'list' ? 'List' : 'Graph'}
                </button>
              ))}
            </div>
            {canEdit && (
              <>
                <button
                  className="ed-add"
                  onClick={() => {
                    // Same reason as the import: the new id is worked out
                    // here, not inside the updater.
                    const kindId = kind === 'all' ? map.entityKinds[0].id : kind;
                    const r = edit.addEntity(map, { name: 'New entry', kindId });
                    apply(() => r.map);
                    setSelected(r.id);
                  }}
                >
                  + Entry
                </button>
                <button className="ed-add" onClick={() => setShowKinds(!showKinds)}>
                  {showKinds ? 'Hide kinds' : 'Kinds'}
                </button>
              </>
            )}
          </div>

          {showKinds && <KindsPanel map={map} canEdit={canEdit} apply={apply} />}

          <div className={`story-body ${view === 'graph' ? 'is-graph' : ''}`}>
            {view === 'graph' ? (
              selected ? (
                <div className="graph-frame">
                  {trail.length > 0 && (
                    <nav className="graph-trail" aria-label="Where you have been">
                      <button className="ed-add" onClick={back}>← Back</button>
                      {trail.slice(-4).map((tid) => (
                        <button key={tid} className="graph-crumb" onClick={() => open(tid)}>
                          {idx.entities.get(tid)?.name ?? tid}
                        </button>
                      ))}
                      <span className="graph-crumb is-here">
                        {idx.entities.get(selected)?.name}
                      </span>
                    </nav>
                  )}
                  <StoryGraph centreId={selected} idx={idx} onSelect={open} />
                </div>
              ) : (
                <div className="graph-hint">
                  <p className="muted">
                    Pick something to stand in the middle. Its connections fan
                    out around it, and clicking any of them moves you there.
                  </p>
                  <div className="chip-row">
                    {map.entities
                      .map((e) => ({ e, d: (idx.byEntity.get(e.id) ?? []).length }))
                      .sort((a, b) => b.d - a.d)
                      .slice(0, 6)
                      .map(({ e }) => (
                        <button key={e.id} className="button button-small" onClick={() => open(e.id)}>
                          {e.name}
                        </button>
                      ))}
                  </div>
                </div>
              )
            ) : (
            <div className="story-list">
              {shown.length === 0 && <p className="ed-empty">Nothing here yet.</p>}
              {shown.map((e) => {
                const degree = (idx.byEntity.get(e.id) ?? []).length;
                return (
                  <button
                    key={e.id}
                    className={`story-row ${selected === e.id ? 'is-selected' : ''}`}
                    onClick={() => open(e.id)}
                  >
                    <span className="story-row-name">{e.name}</span>
                    <span className="story-row-kind">
                      {idx.entityKinds.get(e.kindId)?.label ?? e.kindId}
                    </span>
                    {e.status !== 'canon' && (
                      <span className={`story-status is-${e.status}`}>{e.status}</span>
                    )}
                    <span className="story-row-degree">
                      {degree === 0 ? 'unconnected' : degree}
                    </span>
                  </button>
                );
              })}
            </div>
            )}

            <aside className="story-panel">
              {!entity ? (
                <Overview idx={idx} loose={loose} onOpen={open} />
              ) : (
                <EntityPanel
                  entity={entity}
                  map={map}
                  idx={idx}
                  canEdit={canEdit}
                  apply={apply}
                  onOpen={open}
                  onClose={() => setSelected(null)}
                />
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Overview({
  idx,
  loose,
  onOpen,
}: {
  idx: ReturnType<typeof indexMap>;
  loose: string[];
  onOpen: (id: string) => void;
}) {
  const ranked = idx.map.entities
    .map((entity) => ({ entity, degree: (idx.byEntity.get(entity.id) ?? []).length }))
    .filter((h) => h.degree > 0)
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 8);

  return (
    <>
      <section>
        <h2>
          Most connected
          <Hint align="right">
            What the story actually turns on. A thread everything touches is
            load-bearing: changing it changes more than its own document says.
          </Hint>
        </h2>
        {ranked.length === 0 ? (
          <p className="muted">Nothing is connected yet.</p>
        ) : (
          <ul className="story-hubs">
            {ranked.map((h) => (
              <li key={h.entity.id}>
                <button onClick={() => onOpen(h.entity.id)}>{h.entity.name}</button>
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
            Written, and then left. Not necessarily wrong — it may be waiting
            for a future event — but nobody can decide that until they can see
            the list.
          </Hint>
        </h2>
        {loose.length === 0 ? (
          <p className="ok">Everything is connected to something.</p>
        ) : (
          <ul className="story-hubs">
            {loose.map((oid) => (
              <li key={oid}>
                <button onClick={() => onOpen(oid)}>
                  {idx.entities.get(oid)?.name ?? oid}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */

function EntityPanel({
  entity,
  map,
  idx,
  canEdit,
  apply,
  onOpen,
  onClose,
}: {
  entity: NarrativeEntity;
  map: NarrativeMap;
  idx: ReturnType<typeof indexMap>;
  canEdit: boolean;
  apply: (next: (m: NarrativeMap) => NarrativeMap) => void;
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const [linkKind, setLinkKind] = useState(map.relationKinds[0]?.id ?? '');
  const [linkTo, setLinkTo] = useState('');
  const links = connectionsOf(entity.id, idx);
  const set = (patch: Partial<NarrativeEntity>) =>
    apply((m) => edit.updateEntity(m, entity.id, patch));

  return (
    <>
      <section>
        <div className="story-detail-head">
          {canEdit ? (
            <input
              className="story-name-input"
              value={entity.name}
              aria-label="Name"
              onChange={(e) => set({ name: e.target.value })}
            />
          ) : (
            <h2>{entity.name}</h2>
          )}
          <button className="ed-del" aria-label="Close" onClick={onClose}>×</button>
        </div>

        {canEdit ? (
          <div className="story-meta-row">
            <select
              value={entity.kindId}
              aria-label="Kind"
              onChange={(e) => set({ kindId: e.target.value })}
            >
              {map.entityKinds.map((k) => (
                <option key={k.id} value={k.id}>{k.label}</option>
              ))}
            </select>
            <select
              value={entity.status}
              aria-label="Status"
              onChange={(e) => set({ status: e.target.value as NarrativeEntity['status'] })}
            >
              <option value="draft">draft</option>
              <option value="canon">canon</option>
              <option value="retired">retired</option>
            </select>
            <input
              className="story-when"
              value={entity.occursAt ?? ''}
              placeholder="When"
              aria-label="When"
              onChange={(e) => set({ occursAt: e.target.value })}
            />
            <button
              className="ed-del"
              title="Delete entry"
              onClick={() => {
                if (
                  confirm(
                    `Delete "${entity.name}"? Its connections go with it. Nothing else is touched.`
                  )
                ) {
                  onClose();
                  apply((m) => edit.removeEntity(m, entity.id));
                }
              }}
            >
              ×
            </button>
          </div>
        ) : (
          <p className="story-detail-kind">
            {idx.entityKinds.get(entity.kindId)?.label ?? entity.kindId}
            {entity.status !== 'canon' && ` · ${entity.status}`}
            {entity.occursAt && ` · ${entity.occursAt}`}
          </p>
        )}

        {canEdit ? (
          <>
            <label className="ed-field">
              <span>Summary</span>
              <textarea
                rows={2}
                value={entity.summary ?? ''}
                placeholder="One or two sentences. What a reader needs to place it."
                onChange={(e) => set({ summary: e.target.value })}
              />
            </label>
            <label className="ed-field">
              <span>Detail</span>
              <textarea
                rows={4}
                value={entity.body ?? ''}
                placeholder="The long form, if there is one."
                onChange={(e) => set({ body: e.target.value })}
              />
            </label>
            <div className="ed-field">
              <span>
                Also called
                <Hint align="right">
                  Canon drifts. The same character is "the Grey Warden",
                  "Warden Aldous" and "Aldous" across three events; recording
                  the aliases is what stops an import making three people.
                </Hint>
              </span>
              <TagInput
                tags={entity.aliases}
                suggestions={[]}
                onChange={(aliases) => set({ aliases })}
              />
            </div>
            <div className="ed-field">
              <span>Tags</span>
              <TagInput
                tags={entity.tags}
                suggestions={[...new Set(map.entities.flatMap((e) => e.tags))].sort()}
                onChange={(tags) => set({ tags })}
              />
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </section>

      {entity.requires && (
        <section>
          <h2>
            Gated on the rules
            <Hint align="right">
              This content points at a skill in the same project's rules, so
              the app can tell you whether anyone could actually open it.
            </Hint>
          </h2>
          <p className="story-gate">{describeRequirement(entity.requires)}</p>
        </section>
      )}

      <section>
        <h2>
          Connections
          <Hint align="right">
            How connected something is, and to what kinds of thing, is the
            quickest read on how load-bearing it is. Something with one
            connection can be changed freely; something with fifteen cannot.
          </Hint>
        </h2>
        {links.length > 0 && (
          <p className="story-degree">
            {links.length} in total
            {(() => {
              const byKind = new Map<string, number>();
              for (const c of links) byKind.set(c.label, (byKind.get(c.label) ?? 0) + 1);
              const top = [...byKind.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
              return top.length > 0 ? ` · ${top.map(([l, n]) => `${l} ${n}`).join(' · ')}` : '';
            })()}
          </p>
        )}
        {links.length === 0 ? (
          <p className="muted">Nothing connects to this yet.</p>
        ) : (
          <ul className="story-links">
            {links.map((c) => (
              <li key={c.relation.id}>
                <span className="story-link-label">{c.label}</span>
                {c.other ? (
                  <button onClick={() => onOpen(c.other!.id)}>{c.other.name}</button>
                ) : (
                  <span className="story-broken">{c.otherId} (missing)</span>
                )}
                {canEdit && (
                  <button
                    className="ed-del"
                    title="Remove connection"
                    onClick={() => apply((m) => edit.disconnect(m, c.relation.id))}
                  >
                    ×
                  </button>
                )}
                {c.relation.note && (
                  <span className="story-link-note">{c.relation.note}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {canEdit && map.relationKinds.length > 0 && (
          <div className="story-connect">
            <select
              value={linkKind}
              aria-label="Connection kind"
              onChange={(e) => setLinkKind(e.target.value)}
            >
              {map.relationKinds.map((k) => (
                <option key={k.id} value={k.id}>{k.label}</option>
              ))}
            </select>
            <select
              value={linkTo}
              aria-label="Connect to"
              onChange={(e) => setLinkTo(e.target.value)}
            >
              <option value="">choose an entry…</option>
              {map.entities
                .filter((e) => e.id !== entity.id)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
            </select>
            <button
              className="ed-add"
              disabled={!linkTo || !linkKind}
              onClick={() => {
                apply((m) =>
                  edit.connect(m, { fromId: entity.id, toId: linkTo, kindId: linkKind })
                );
                setLinkTo('');
              }}
            >
              Connect
            </button>
          </div>
        )}
      </section>

      {entity.sources.length > 0 && (
        <section>
          <h2>
            Says who
            <Hint align="right">
              Every entry names where it came from. A canon claim nobody can
              trace is a rumour, and staff will not trust the map enough to
              use it.
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
  );
}

/* ------------------------------------------------------------------ */

/** The project's own vocabulary: what kinds of thing, and what kinds of link. */
function KindsPanel({
  map,
  canEdit,
  apply,
}: {
  map: NarrativeMap;
  canEdit: boolean;
  apply: (next: (m: NarrativeMap) => NarrativeMap) => void;
}) {
  return (
    <section className="story-kinds">
      <div className="ed-group-head">
        <span className="ed-group-name">Kinds of entry</span>
        <span className="ed-group-count">{map.entityKinds.length}</span>
        {canEdit && (
          <button
            className="ed-add"
            onClick={() =>
              apply((m) =>
                edit.addEntityKind(m, {
                  id: edit.freshId('kind', m.entityKinds.map((k) => k.id), 'kind'),
                  label: 'New kind',
                  plural: 'New kinds',
                })
              )
            }
          >
            + Kind
          </button>
        )}
      </div>
      {map.entityKinds.map((k) => (
        <div key={k.id} className="story-kind-row">
          <input
            value={k.label}
            aria-label="Singular"
            readOnly={!canEdit}
            onChange={(e) => apply((m) => edit.updateEntityKind(m, k.id, { label: e.target.value }))}
          />
          <input
            value={k.plural}
            aria-label="Plural"
            readOnly={!canEdit}
            onChange={(e) => apply((m) => edit.updateEntityKind(m, k.id, { plural: e.target.value }))}
          />
          <span className="ed-group-count">
            {map.entities.filter((e) => e.kindId === k.id).length}
          </span>
          {canEdit && (
            <button
              className="ed-del"
              title="Delete kind"
              onClick={() => apply((m) => edit.removeEntityKind(m, k.id))}
            >
              ×
            </button>
          )}
        </div>
      ))}

      <div className="ed-group-head" style={{ marginTop: '1.25rem' }}>
        <span className="ed-group-name">Kinds of connection</span>
        <span className="ed-group-count">{map.relationKinds.length}</span>
        {canEdit && (
          <button
            className="ed-add"
            onClick={() =>
              apply((m) =>
                edit.addRelationKind(m, {
                  id: edit.freshId('link', m.relationKinds.map((k) => k.id), 'link'),
                  label: 'relates to',
                  inverseLabel: 'is related to by',
                })
              )
            }
          >
            + Connection
          </button>
        )}
      </div>
      <p className="ed-hint" style={{ marginBottom: '0.5rem' }}>
        Each connection reads two ways. Name both, so an entry can be read from
        either end.
      </p>
      {map.relationKinds.map((k) => (
        <div key={k.id} className="story-kind-row">
          <input
            value={k.label}
            aria-label="Forwards"
            readOnly={!canEdit}
            onChange={(e) =>
              apply((m) => edit.updateRelationKind(m, k.id, { label: e.target.value }))
            }
          />
          <input
            value={k.inverseLabel}
            aria-label="Backwards"
            readOnly={!canEdit}
            onChange={(e) =>
              apply((m) => edit.updateRelationKind(m, k.id, { inverseLabel: e.target.value }))
            }
          />
          <span className="ed-group-count">
            {map.relations.filter((r) => r.kindId === k.id).length}
          </span>
          {canEdit && (
            <button
              className="ed-del"
              title="Delete connection kind"
              onClick={() => apply((m) => edit.removeRelationKind(m, k.id))}
            >
              ×
            </button>
          )}
        </div>
      ))}
    </section>
  );
}

/**
 * A requirement in words, without pulling the rules engine in.
 *
 * The character sheet uses describeCondition, which needs an indexed ruleset
 * to turn ids into names. The ruleset is not loaded here, so this says the
 * shape and leaves the naming to the rules editor.
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
