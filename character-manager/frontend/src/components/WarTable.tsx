import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react';
import type { MapIndex } from '../../../shared/narrative';
import { campaignBoard, naturally } from '../../../shared/narrative';
import type {
  CampaignShape,
  EntityKind,
  EntityStatus,
  NarrativeEntity,
  NarrativeMap,
} from '../../../shared/narrative-schema';
import Hint from './Hint';
import KindGlyph from './KindGlyph';
import './WarTable.css';

/**
 * The War Table: the next event laid out as a tabletop.
 *
 * Tracks are rows, day slots are columns, and every piece of content is a
 * card with a wax seal -- broken while the piece is a draft, pressed whole
 * once it is canon. Past events are a ledger you can flip back through.
 * The high-level view; clicking any piece zooms into its entry.
 *
 * Nothing here invents data. A piece sits in a column because its
 * `occursAt` says so ("Event 10 · Friday"), in a row because it links to a
 * track, and pressing a seal writes the same status field the editor
 * writes. Which kinds play the parts is nominated on the map (see
 * CampaignShape), so a tabletop chronicle gets the same table from Session
 * and Arc.
 */
export default function WarTable({
  map,
  idx,
  canEdit,
  selectedId,
  onSelect,
  onShape,
  onStatus,
  onPlace,
  dimmed,
}: {
  map: NarrativeMap;
  idx: MapIndex;
  canEdit: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onShape: (shape: CampaignShape) => void;
  onStatus: (id: string, status: EntityStatus) => void;
  /** A piece was dropped: into a lane (or none), on a day (or unmoved). */
  onPlace: (
    pieceId: string,
    laneId: string | null,
    day: string | null,
    eventId: string
  ) => void;
  /** When set, pieces whose id is not in the set are dimmed as non-matches. */
  dimmed: Set<string> | null;
}) {
  const board = useMemo(() => campaignBoard(idx), [idx]);

  /** Pieces at one spine entry, with everything the table needs to place them. */
  const layout = useMemo(() => {
    if (!board) return null;
    const laneIds = new Set(board.lanes.map((l) => l.id));
    const spineIds = new Set(board.spine.map((s) => s.id));
    const isContent = (e: NarrativeEntity) =>
      !map.campaign?.contentKindIds?.length ||
      map.campaign.contentKindIds.includes(e.kindId);

    const touches = (entity: NarrativeEntity, of: Set<string>): string[] => [
      ...new Set(
        (idx.byEntity.get(entity.id) ?? [])
          .map((r) => (r.fromId === entity.id ? r.toId : r.fromId))
          .filter((id) => of.has(id))
      ),
    ];

    const at = new Map<string, TablePiece[]>();
    const cast = new Map<string, NarrativeEntity[]>();
    for (const entity of idx.map.entities) {
      if (spineIds.has(entity.id) || laneIds.has(entity.id)) continue;
      if (entity.status === 'retired') continue;
      const onSpine = touches(entity, spineIds);
      if (onSpine.length === 0) continue;
      for (const spineId of onSpine) {
        if (!isContent(entity)) {
          // Not work, but present: the cast standing at the table's rim.
          const list = cast.get(spineId) ?? [];
          list.push(entity);
          cast.set(spineId, list);
          continue;
        }
        const event = idx.entities.get(spineId)!;
        const piece: TablePiece = {
          entity,
          kind: idx.entityKinds.get(entity.kindId)?.label ?? entity.kindId,
          shape: idx.entityKinds.get(entity.kindId)?.shape,
          laneIds: touches(entity, laneIds),
          slot: slotOf(entity, event),
        };
        const list = at.get(spineId) ?? [];
        list.push(piece);
        at.set(spineId, list);
      }
    }
    return { at, cast };
  }, [board, idx, map.campaign]);

  /* The table opens on the first event that still has unfinished pieces --
     the one being prepared -- and says so, so landing there reads as a
     decision rather than an accident. */
  const nextId = useMemo(() => {
    if (!board || !layout) return null;
    for (const s of board.spine) {
      if ((layout.at.get(s.id) ?? []).some((p) => p.entity.status === 'draft')) {
        return s.id;
      }
    }
    return board.spine.length ? board.spine[board.spine.length - 1].id : null;
  }, [board, layout]);

  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    // Follow the data until the reader flips a tab themselves.
    setOpenId((current) => current ?? nextId);
  }, [nextId]);

  if (!board) {
    return (
      <div className="board-setup">
        <p>
          Most games run as a sequence — events, sessions, chapters — with
          several strands of content running across it. Name those two kinds
          and this becomes a table: the sequence as ledger tabs, the strands
          as rows, and your content laid out as pieces.
        </p>
        {canEdit ? (
          <div className="board-setup-row">
            <label>
              <span>Runs as a sequence of</span>
              <select
                defaultValue=""
                onChange={(e) => onShape({ spineKindId: e.target.value || undefined })}
              >
                <option value="">choose a kind…</option>
                {map.entityKinds.map((k) => (
                  <option key={k.id} value={k.id}>{k.plural}</option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <p className="muted">Project staff can set this up.</p>
        )}
      </div>
    );
  }

  const open = openId ? idx.entities.get(openId) : undefined;
  const pieces = openId ? (layout?.at.get(openId) ?? []) : [];
  const casting = openId ? (layout?.cast.get(openId) ?? []) : [];
  const unfinished = pieces.filter((p) => p.entity.status === 'draft').length;
  const openIndex = board.spine.findIndex((s) => s.id === openId);

  /* Columns from the slots actually in use; Unordered last when needed. */
  const days = [...new Set(pieces.map((p) => p.slot.day).filter(Boolean))].sort(
    naturally
  ) as string[];
  const hasUnordered = pieces.some((p) => !p.slot.day && p.laneIds.length > 0);
  const columns = hasUnordered ? [...days, ''] : days;

  const inLane = (laneId: string, day: string) =>
    pieces.filter(
      (p) => p.laneIds.length === 1 && p.laneIds[0] === laneId && p.slot.day === day
    );
  const several = pieces.filter((p) => p.laneIds.length > 1);
  const trayless = pieces.filter((p) => p.laneIds.length === 0);
  const laneName = (id: string) => idx.entities.get(id)?.name ?? id;

  return (
    <div className="wt">
      <div className="wt-tabs" role="tablist" aria-label="Events">
        {board.spine.map((s, i) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={s.id === openId}
            className={`wt-tab ${
              s.id === openId ? 'is-now' : i < openIndex ? 'is-past' : 'is-future'
            }`}
            onClick={() => setOpenId(s.id)}
          >
            {s.name}
            {s.id === nextId && <span className="wt-dot" aria-hidden="true" />}
          </button>
        ))}
      </div>

      {open && (
        <>
          <header className="wt-head">
            <div>
              <h2>
                <button className="wt-title" onClick={() => onSelect(open.id)}>
                  {open.name}
                </button>
              </h2>
              {open.summary && <p className="wt-sub">{open.summary}</p>}
              {open.id === nextId && unfinished > 0 && (
                <p className="wt-why">
                  Opened here because {unfinished}{' '}
                  {unfinished === 1 ? 'piece is' : 'pieces are'} unfinished.
                </p>
              )}
            </div>
            <div className="wt-ward">
              <WardSigil
                done={pieces.length - unfinished}
                total={pieces.length}
              />
              <div className="wt-count">
                {pieces.length === 0
                  ? 'Nothing placed yet'
                  : unfinished === 0
                    ? 'The table is set.'
                    : `${unfinished} ${unfinished === 1 ? 'piece' : 'pieces'} unfinished`}
              </div>
            </div>
          </header>

          {board.lanes.length > 0 && columns.length > 0 && (
            <div className="wt-surface">
              <div
                className="wt-grid"
                style={{
                  gridTemplateColumns: `130px repeat(${columns.length}, minmax(170px, 1fr))`,
                }}
              >
                <div className="wt-hd" />
                {columns.map((c) => (
                  <div key={c || 'unordered'} className="wt-hd">
                    {c || 'Unordered'}
                  </div>
                ))}
                {board.lanes.map((lane) => (
                  <div key={lane.id} className="wt-row">
                    <button className="wt-lane" onClick={() => onSelect(lane.id)}>
                      {lane.name}
                    </button>
                    {columns.map((c) => {
                      const cell = inLane(lane.id, c);
                      return (
                        <DropCell
                          key={c || 'unordered'}
                          className={`wt-cell ${cell.length === 0 ? 'is-empty' : ''}`}
                          canEdit={canEdit}
                          onDropPiece={(pieceId) =>
                            onPlace(pieceId, lane.id, c, open.id)
                          }
                        >
                          {cell.map((p) => (
                            <Piece
                              key={p.entity.id}
                              piece={p}
                              canEdit={canEdit}
                              selected={selectedId === p.entity.id}
                              dim={!!dimmed && !dimmed.has(p.entity.id)}
                              onSelect={onSelect}
                              onStatus={onStatus}
                            />
                          ))}
                        </DropCell>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(trayless.length > 0 || several.length > 0 || canEdit) && (
            <div className="wt-trays">
              {(trayless.length > 0 || canEdit) && (
                <DropCell
                  className="wt-tray"
                  canEdit={canEdit}
                  onDropPiece={(pieceId) => onPlace(pieceId, null, null, open.id)}
                >
                  <h4>At this event · in no track</h4>
                  <div className="wt-tray-row">
                    {trayless.map((p) => (
                      <Piece
                        key={p.entity.id}
                        piece={p}
                        canEdit={canEdit}
                        selected={selectedId === p.entity.id}
                              dim={!!dimmed && !dimmed.has(p.entity.id)}
                        onSelect={onSelect}
                        onStatus={onStatus}
                      />
                    ))}
                  </div>
                </DropCell>
              )}
              {several.length > 0 && (
                <div className="wt-tray">
                  <h4>On several tracks</h4>
                  <div className="wt-tray-row">
                    {several.map((p) => (
                      <Piece
                        key={p.entity.id}
                        piece={p}
                        canEdit={canEdit}
                        selected={selectedId === p.entity.id}
                              dim={!!dimmed && !dimmed.has(p.entity.id)}
                        onSelect={onSelect}
                        onStatus={onStatus}
                        under={
                          p.laneIds.map(laneName).join(' and ') +
                          (p.slot.day ? ` · ${p.slot.day}` : '')
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {casting.length > 0 && (
            <div className="wt-rim">
              {casting.slice(0, 6).map((e) => (
                <button
                  key={e.id}
                  className="wt-tok"
                  title={e.name}
                  onClick={() => onSelect(e.id)}
                >
                  {initialOf(e.name)}
                </button>
              ))}
              <span className="wt-rim-names">
                {casting.map((e) => e.name).join(' · ')}
              </span>
            </div>
          )}
        </>
      )}

      {/* The table's shape, tucked below the surface: which kinds play
          which parts. Rarely touched once set. */}
      {canEdit && (
        <details className="wt-shape">
          <summary>Table setup</summary>
          <div className="wt-shape-row">
            <label>
              <span>Sequence</span>
              <select
                value={map.campaign?.spineKindId ?? ''}
                onChange={(e) =>
                  onShape({ ...map.campaign, spineKindId: e.target.value || undefined })
                }
              >
                <option value="">none</option>
                {map.entityKinds.map((k) => (
                  <option key={k.id} value={k.id}>{k.plural}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Tracks</span>
              <select
                value={map.campaign?.laneKindId ?? ''}
                onChange={(e) =>
                  onShape({ ...map.campaign, laneKindId: e.target.value || undefined })
                }
              >
                <option value="">none</option>
                {map.entityKinds.map((k) => (
                  <option key={k.id} value={k.id}>{k.plural}</option>
                ))}
              </select>
            </label>
            <span className="wt-shape-kinds">
              <span>Pieces</span>
              {map.entityKinds
                .filter(
                  (k) =>
                    k.id !== map.campaign?.spineKindId &&
                    k.id !== map.campaign?.laneKindId
                )
                .map((k) => {
                  const chosen = map.campaign?.contentKindIds ?? [];
                  const on = chosen.length === 0 || chosen.includes(k.id);
                  return (
                    <button
                      key={k.id}
                      className={`wt-kind ${on ? 'is-on' : ''}`}
                      onClick={() => {
                        const base =
                          chosen.length > 0
                            ? chosen
                            : map.entityKinds
                                .filter(
                                  (x) =>
                                    x.id !== map.campaign?.spineKindId &&
                                    x.id !== map.campaign?.laneKindId
                                )
                                .map((x) => x.id);
                        onShape({
                          ...map.campaign,
                          contentKindIds: base.includes(k.id)
                            ? base.filter((x) => x !== k.id)
                            : [...base, k.id],
                        });
                      }}
                    >
                      {k.plural}
                    </button>
                  );
                })}
            </span>
            <Hint align="right">
              A piece lands on the table when it links to an entry of the
              sequence kind; its row comes from a link to a track, and its
              column from the day in its "when". Everything else connected to
              the event stands at the rim.
            </Hint>
          </div>
        </details>
      )}
    </div>
  );
}

interface TablePiece {
  entity: NarrativeEntity;
  kind: string;
  shape?: EntityKind['shape'];
  laneIds: string[];
  slot: { day: string; full: string };
}

/**
 * Where a piece sits within its event: "Event 10 · Saturday morning"
 * becomes column "Saturday" with the full slot kept for the under-note.
 * The honest wrinkle stays visible instead of being silently corrected.
 */
function slotOf(
  piece: NarrativeEntity,
  event: NarrativeEntity
): { day: string; full: string } {
  let s = (piece.occursAt ?? '').trim();
  const eventAt = (event.occursAt ?? event.name).trim();
  if (eventAt && s.startsWith(eventAt)) s = s.slice(eventAt.length);
  s = s.replace(/^\s*[·:—–-]\s*/, '').trim();
  if (!s) return { day: '', full: '' };
  return { day: s.split(/\s+/)[0], full: s };
}

function initialOf(name: string): string {
  // "King Liandra" answers L: skip honorific-ish leading words when a
  // longer word follows, else just take the first letter.
  const words = name.split(/\s+/);
  const main = words.find((w) => !/^(the|king|queen|lord|lady|sir)$/i.test(w));
  return (main ?? words[0]).charAt(0).toUpperCase();
}

/** A droppable region of the table: a cell or a tray. */
function DropCell({
  className,
  canEdit,
  onDropPiece,
  children,
}: {
  className: string;
  canEdit: boolean;
  onDropPiece: (pieceId: string) => void;
  children: ReactNode;
}) {
  const [over, setOver] = useState(0);
  const handlers = canEdit
    ? {
        onDragOver: (e: DragEvent) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        },
        onDragEnter: () => setOver((n) => n + 1),
        onDragLeave: () => setOver((n) => Math.max(0, n - 1)),
        onDrop: (e: DragEvent) => {
          e.preventDefault();
          setOver(0);
          const id = e.dataTransfer.getData('text/plain');
          if (id) onDropPiece(id);
        },
      }
    : {};
  return (
    <div className={`${className} ${over > 0 ? 'is-drop' : ''}`} {...handlers}>
      {children}
    </div>
  );
}

function Piece({
  piece,
  canEdit,
  selected,
  dim = false,
  onSelect,
  onStatus,
  under,
}: {
  piece: TablePiece;
  canEdit: boolean;
  selected: boolean;
  dim?: boolean;
  onSelect: (id: string) => void;
  onStatus: (id: string, status: EntityStatus) => void;
  under?: string;
}) {
  const { entity } = piece;
  const draft = entity.status === 'draft';
  const note = under ?? (piece.slot.full !== piece.slot.day ? piece.slot.full : '');
  return (
    <div
      className={`wt-piece ${draft ? '' : 'is-canon'} ${selected ? 'is-selected' : ''} ${
        dim ? 'is-dim' : ''
      }`}
      draggable={canEdit}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', entity.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      {canEdit ? (
        <button
          className={`wt-seal ${draft ? 'is-broken' : 'is-pressed'}`}
          title={draft ? 'Draft — press the seal to make it canon' : 'Canon — break the seal to draft'}
          aria-label={draft ? `Make "${entity.name}" canon` : `Return "${entity.name}" to draft`}
          onClick={() => onStatus(entity.id, draft ? 'canon' : 'draft')}
        />
      ) : (
        <span
          className={`wt-seal ${draft ? 'is-broken' : 'is-pressed'}`}
          title={draft ? 'Draft' : 'Canon'}
        />
      )}
      <button className="wt-piece-body" onClick={() => onSelect(entity.id)}>
        <span className="wt-piece-kind">
          <KindGlyph shape={piece.shape} size={9} /> {piece.kind}
        </span>
        <span className="wt-piece-name">{entity.name}</span>
        {note && <span className="wt-piece-under">{note}</span>}
      </button>
    </div>
  );
}

/**
 * The ward completes as drafts seal: the outer circle draws with the
 * fraction finished, the inner wards appear as it passes each third.
 */
function WardSigil({ done, total }: { done: number; total: number }) {
  const f = total === 0 ? 0 : done / total;
  const r = 29;
  const c = 2 * Math.PI * r;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" className="wt-sigil">
      <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="1.25" opacity="0.18" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - f)}
        transform="rotate(-90 32 32)"
        style={{ transition: 'stroke-dashoffset 0.8s var(--ease)' }}
      />
      <rect
        x="13" y="13" width="38" height="38" fill="none" stroke="currentColor"
        strokeWidth="1" strokeDasharray="3 5" opacity={f >= 1 / 3 ? 0.35 : 0.08}
      />
      <rect
        x="13" y="13" width="38" height="38" transform="rotate(45 32 32)"
        fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 5"
        opacity={f >= 2 / 3 ? 0.35 : 0.08}
      />
      <circle cx="32" cy="32" r="3" fill="none" stroke="currentColor" opacity={f >= 1 ? 0.8 : 0.15} />
    </svg>
  );
}
