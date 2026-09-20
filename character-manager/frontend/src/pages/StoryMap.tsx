import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { storyApi } from '../services/api';
import type {
  NarrativeEntity,
  NarrativeMap,
} from '../../../shared/narrative-schema';
import { connectionsOf, indexMap, orphans, validateMap } from '../../../shared/narrative';
import * as edit from '../../../shared/narrative-editor';
import { useConfirm } from '../components/ConfirmDialog';
import EntityPeek from '../components/EntityPeek';
import Hint from '../components/Hint';
import ObjectHeader from '../components/ObjectHeader';
import ProjectNav from '../components/ProjectNav';
import SaveBar from '../components/SaveBar';
import SectionCard from '../components/SectionCard';
import SegmentedControl from '../components/SegmentedControl';
import Sigil from '../components/Sigil';
import TagInput from '../components/TagInput';
import Toolbar from '../components/Toolbar';
import StoryGraph from '../components/StoryGraph';
import WarTable from '../components/WarTable';
import './StoryMap.css';

/**
 * The story map.
 *
 * A LARP's canon lives across hundreds of documents, and nobody holds the
 * connections between them except the people who wrote them. This is where
 * those get recorded: pick an entry, say what it touches, and see what has
 * been written and then forgotten.
 *
 * Three views over the same data, because the questions differ. The list
 * answers "what is there"; the graph answers "what does this connect to"; the
 * board answers "what is running where, and what is still a draft".
 */
export default function StoryMap() {
  const { id = '', entryId } = useParams();
  const navigate = useNavigate();

  const [map, setMap] = useState<NarrativeMap | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  /* The selected entry lives in the URL, so every entry has an address that
     can be linked to, bookmarked, and shared. Selecting pushes history, so
     the browser's back button also walks your reading path. */
  const selected = entryId ?? null;
  const setSelected = useCallback(
    (entityId: string | null) => {
      navigate(
        entityId
          ? `/projects/${id}/story/${encodeURIComponent(entityId)}`
          : `/projects/${id}/story`
      );
    },
    [navigate, id]
  );
  const [kind, setKind] = useState('all');
  const [query, setQuery] = useState('');
  const [showKinds, setShowKinds] = useState(false);
  const [view, setView] = useState<'list' | 'graph' | 'campaign'>('list');
  /** Where you have been, so you can walk back out of the graph. */
  const [trail, setTrail] = useState<string[]>([]);
  const history = useRef<NarrativeMap[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const findInput = useRef<HTMLInputElement>(null);
  /** Which row the arrow keys are standing on; -1 is none. */
  const [activeIdx, setActiveIdx] = useState(-1);

  /* Slash focuses the search from anywhere that is not already a place to
     type, the way it does on GitHub -- reachable without looking down. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.isContentEditable)
      )
        return;
      e.preventDefault();
      findInput.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    storyApi
      .get(id)
      .then((r) => {
        setMap(r.map);
        setCanEdit(r.canEdit);
        // The Story section opens on the table when the project has one:
        // the next event is what most readers came to look at.
        if (r.map.campaign?.spineKindId) setView('campaign');
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

  /* The arrow highlight stands on positions, not entries; when the list
     under it changes, it steps off rather than pointing at the wrong row. */
  useEffect(() => setActiveIdx(-1), [query, kind, view]);
  useEffect(() => {
    document
      .querySelector('.story-row.is-active')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  const open = useCallback(
    (entityId: string) => {
      if (selected && selected !== entityId) {
        // Revisiting somewhere already on the trail winds back to it rather
        // than looping, so the trail stays a path and not a history log.
        setTrail((t) =>
          t.includes(entityId) ? t.slice(0, t.indexOf(entityId)) : [...t, selected]
        );
      }
      setSelected(entityId);
    },
    [selected, setSelected]
  );

  const back = useCallback(() => {
    setTrail((t) => {
      if (t.length === 0) return t;
      setSelected(t[t.length - 1]);
      return t.slice(0, -1);
    });
  }, [setSelected]);

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
      <ProjectNav id={id} />
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
          <Sigil name="ward" />
          <p>
            A story map records what your game is made of: events, characters,
            places, artifacts, the threads still open, and how they all
            connect. It answers what a pile of documents cannot: what does this
            NPC touch, what is unresolved, and what got written and forgotten.
          </p>
          <p className="muted">
            Every project defines its own kinds. Start from a common set and
            rename what does not fit, or build your own from nothing.
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

          <Toolbar label="Story controls">
            <input
              ref={findInput}
              className="ed-find"
              type="search"
              value={query}
              placeholder="Find anything… ( / )"
              aria-label="Find in the story map"
              title="Press / to search, arrows to move, Enter to open"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActiveIdx((i) => Math.min(i + 1, shown.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveIdx((i) => Math.max(i - 1, -1));
                } else if (e.key === 'Enter') {
                  // Enter opens where the arrows stand, or the only match.
                  const target =
                    activeIdx >= 0 ? shown[activeIdx] : shown.length === 1 ? shown[0] : null;
                  if (target) {
                    e.preventDefault();
                    open(target.id);
                  }
                } else if (e.key === 'Escape') {
                  setQuery('');
                  e.currentTarget.blur();
                }
              }}
            />
            <SegmentedControl
              label="Filter by kind"
              options={[
                { id: 'all', label: 'All' },
                ...map.entityKinds.map((k) => ({ id: k.id, label: k.plural })),
              ]}
              value={kind}
              onChange={setKind}
            />
            <SegmentedControl
              label="View"
              options={[
                { id: 'campaign', label: 'War Table' },
                { id: 'list', label: 'List' },
                { id: 'graph', label: 'Graph' },
              ] as const}
              value={view}
              onChange={setView}
            />
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
          </Toolbar>

          {showKinds && <KindsPanel map={map} canEdit={canEdit} apply={apply} />}

          {/* The trail rides above every view, not only the graph: where
              you have been matters as much on the table as in the web. */}
          {trail.length > 0 && selected && (
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

          <div className={`story-body ${view !== 'list' ? 'is-graph' : ''}`}>
            {view === 'campaign' ? (
              <WarTable
                map={map}
                idx={idx}
                canEdit={canEdit}
                selectedId={selected}
                onSelect={open}
                onShape={(campaign) => apply((m) => ({ ...m, campaign }))}
                onStatus={(entityId, status) =>
                  apply((m) => edit.updateEntity(m, entityId, { status }))
                }
              />
            ) : view === 'graph' ? (
              selected ? (
                <div className="graph-frame">
                  <StoryGraph centreId={selected} idx={idx} onSelect={open} />
                </div>
              ) : (
                <div className="graph-hint">
                  <p className="muted">
                    Pick something to stand in the middle. Its connections fan
                    out around it, and clicking one moves you to it.
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
              {shown.map((e, i) => {
                const degree = (idx.byEntity.get(e.id) ?? []).length;
                return (
                  <button
                    key={e.id}
                    className={`story-row ${selected === e.id ? 'is-selected' : ''} ${
                      activeIdx === i ? 'is-active' : ''
                    }`}
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

            <SectionCard as="aside" sticky className="story-panel">
              {!entity ? (
                <>
                  {entryId && (
                    <p className="muted story-missing">
                      There is no story entry at this address. It may have
                      been deleted.
                    </p>
                  )}
                  <Overview idx={idx} loose={loose} onOpen={open} />
                </>
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
            </SectionCard>
          </div>
        </>
      )}

      <SaveBar
        dirty={dirty && canEdit}
        saving={saving}
        onSave={save}
        onUndo={undo}
        canUndo={history.current.length > 0}
      />
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
            The entries most of the canon hangs off. Changing one of these
            changes more than its own document records.
          </Hint>
        </h2>
        {ranked.length === 0 ? (
          <p className="muted">Nothing is connected yet.</p>
        ) : (
          <ul className="story-hubs">
            {ranked.map((h) => (
              <li key={h.entity.id}>
                <EntityPeek entity={h.entity} idx={idx}>
                  <button onClick={() => onOpen(h.entity.id)}>{h.entity.name}</button>
                </EntityPeek>
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
            Written and then left. Some of this is waiting for a future event
            and some was abandoned; the list is here so someone can tell which.
          </Hint>
        </h2>
        {loose.length === 0 ? (
          <p className="ok">Everything is connected to something.</p>
        ) : (
          <ul className="story-hubs">
            {loose.map((oid) => {
              const e = idx.entities.get(oid);
              const button = (
                <button onClick={() => onOpen(oid)}>{e?.name ?? oid}</button>
              );
              return (
                <li key={oid}>
                  {e ? (
                    <EntityPeek entity={e} idx={idx}>
                      {button}
                    </EntityPeek>
                  ) : (
                    button
                  )}
                </li>
              );
            })}
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
  const [copied, setCopied] = useState(false);
  const [confirm, confirmDialog] = useConfirm();
  const links = connectionsOf(entity.id, idx);
  const set = (patch: Partial<NarrativeEntity>) =>
    apply((m) => edit.updateEntity(m, entity.id, patch));

  /* Every entry has an address now; this puts it on the clipboard so plot
     docs and chat messages can point straight at it. */
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard access can be denied; the URL bar still has the address. */
    }
  };

  return (
    <>
      {confirmDialog}
      <section>
        <ObjectHeader
          className="story-detail-head"
          kind={idx.entityKinds.get(entity.kindId)?.label ?? entity.kindId}
          meta={
            `${entity.status} · ${links.length} connection${links.length === 1 ? '' : 's'}` +
            (entity.occursAt ? ` · ${entity.occursAt}` : '')
          }
          name={
            canEdit ? (
              <input
                className="story-name-input"
                value={entity.name}
                aria-label="Name"
                onChange={(e) => set({ name: e.target.value })}
              />
            ) : (
              entity.name
            )
          }
          subtitle={
            entity.aliases.length > 0
              ? `Also called ${entity.aliases.map((a) => `"${a}"`).join(', ')}.`
              : undefined
          }
          actions={
            <>
              <button
                className="ed-add story-copy"
                onClick={() => void copyLink()}
                title="Copy a link to this entry"
              >
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <button className="ed-del" aria-label="Close" onClick={onClose}>×</button>
            </>
          }
        />

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
            {/* Draft, Canon, Retired read left to right as a lifecycle,
                which a dropdown hides. */}
            <SegmentedControl
              label="Status"
              options={[
                { id: 'draft', label: 'Draft' },
                { id: 'canon', label: 'Canon' },
                { id: 'retired', label: 'Retired' },
              ]}
              value={entity.status}
              onChange={(s) => set({ status: s as NarrativeEntity['status'] })}
            />
            <input
              className="story-when"
              value={entity.occursAt ?? ''}
              placeholder="When"
              aria-label="When"
              list="story-when-values"
              onChange={(e) => set({ occursAt: e.target.value })}
            />
            {/* "When" values repeat across entries (the same event names),
                so offer the ones already in use. */}
            <datalist id="story-when-values">
              {[...new Set(map.entities.map((e) => e.occursAt).filter(Boolean))]
                .sort()
                .map((w) => (
                  <option key={w} value={w as string} />
                ))}
            </datalist>
            <button
              className="ed-del"
              title="Delete entry"
              onClick={async () => {
                if (
                  await confirm({
                    title: `Delete "${entity.name}"?`,
                    body: 'Its connections go with it. Nothing else is touched.',
                  })
                ) {
                  onClose();
                  apply((m) => edit.removeEntity(m, entity.id));
                }
              }}
            >
              ×
            </button>
          </div>
        ) : null}

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
                  Canon drifts: the same character appears as "the Grey
                  Warden", "Warden Aldous" and "Aldous" across three events.
                  Recording the aliases keeps an import from creating three
                  people.
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
              the app can report whether anyone on the roster could open it.
            </Hint>
          </h2>
          <p className="story-gate">{describeRequirement(entity.requires)}</p>
        </section>
      )}

      <section>
        <h2>
          Connections
          <Hint align="right">
            How much else depends on this entry. One connection can be changed
            freely; fifteen cannot.
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
          /* Connections written as prose, the way a reference book would
             put them: the label opens the sentence, the name is the link,
             and the note reads as the clause it always was. */
          <div className="story-prose">
            {links.map((c) => (
              <p key={c.relation.id}>
                <b>{sentenceCase(c.label)}</b>{' '}
                {c.other ? (
                  <EntityPeek entity={c.other} idx={idx}>
                    <button
                      className="story-prose-link"
                      onClick={() => onOpen(c.other!.id)}
                    >
                      {c.other.name}
                    </button>
                  </EntityPeek>
                ) : (
                  <span className="story-broken">{c.otherId} (missing)</span>
                )}
                .
                {c.relation.note && <i> {asSentence(c.relation.note)}</i>}
                {canEdit && (
                  <button
                    className="ed-del story-prose-del"
                    title="Remove connection"
                    onClick={() => apply((m) => edit.disconnect(m, c.relation.id))}
                  >
                    ×
                  </button>
                )}
              </p>
            ))}
          </div>
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
              Every entry records where it came from, so a claim can be
              checked against the document it was taken from.
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

/** "is the subject of" -> "Is the subject of", for opening a sentence. */
function sentenceCase(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** A note becomes the sentence it was always trying to be. */
function asSentence(note: string): string {
  const trimmed = note.trim();
  const upped = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?…]$/.test(upped) ? upped : `${upped}.`;
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
