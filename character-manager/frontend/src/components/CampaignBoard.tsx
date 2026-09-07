import { useMemo } from 'react';
import type { MapIndex } from '../../../shared/narrative';
import { campaignBoard, cellKey } from '../../../shared/narrative';
import type {
  CampaignShape,
  NarrativeEntity,
  NarrativeMap,
} from '../../../shared/narrative-schema';
import Hint from './Hint';
import './CampaignBoard.css';

/**
 * The campaign as a board: the sequence along the top, the strands of content
 * down the side, and the work in the cells.
 *
 * Which kinds play those parts is nominated on the map, so nothing here asks
 * whether something is an "event". A tabletop chronicle nominates Session and
 * Arc and gets the same board; a game with no sequence never sees the view.
 *
 * This is the planning view rather than the reference one. It answers what is
 * running where, and what is still a draft going into the next one.
 */
export default function CampaignBoard({
  map,
  idx,
  canEdit,
  selectedId,
  onSelect,
  onShape,
}: {
  map: NarrativeMap;
  idx: MapIndex;
  canEdit: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onShape: (shape: CampaignShape) => void;
}) {
  const board = useMemo(() => campaignBoard(idx), [idx]);

  if (!board) {
    return (
      <div className="board-setup">
        <p>
          Most games run as a sequence — events, sessions, chapters — with
          several strands of content running across it. Name those two kinds and
          this becomes a board: the sequence along the top, the strands down the
          side, and your content in the cells.
        </p>
        <p className="muted">
          Both come from the kinds you have defined. A campaign that does not
          run as a sequence can leave this alone.
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

  const { spine, lanes, cells, untracked, unscheduled } = board;
  const kindLabel = (id?: string) =>
    map.entityKinds.find((k) => k.id === id)?.plural ?? '—';

  /** The count a planning view is read for. */
  const draftsAt = (spineId: string) => {
    const all = [
      ...lanes.flatMap((l) => cells.get(cellKey(l.id, spineId)) ?? []),
      ...(untracked.get(spineId) ?? []),
    ];
    return all.filter((e) => e.status === 'draft').length;
  };

  return (
    <div className="board">
      <div className="board-bar">
        <div className="board-shape">
          <label>
            <span>Sequence</span>
            <select
              value={map.campaign?.spineKindId ?? ''}
              disabled={!canEdit}
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
              disabled={!canEdit}
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
          <Hint>
            The board is built from the kinds nominated here. Content appears
            in a cell when it links to both a{' '}
            {kindLabel(map.campaign?.spineKindId)} entry and a{' '}
            {kindLabel(map.campaign?.laneKindId)} entry, in either direction and
            however the link was worded.
          </Hint>
        </div>

        <div className="board-content-kinds">
          <span>Show</span>
          {map.entityKinds
            .filter(
              (k) =>
                k.id !== map.campaign?.spineKindId && k.id !== map.campaign?.laneKindId
            )
            .map((k) => {
              const chosen = map.campaign?.contentKindIds ?? [];
              const on = chosen.length === 0 || chosen.includes(k.id);
              return (
                <button
                  key={k.id}
                  className={`board-kind ${on ? 'is-on' : ''}`}
                  disabled={!canEdit}
                  onClick={() => {
                    // An empty list means everything, so the first click has
                    // to start from "everything" rather than from nothing.
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
          <Hint align="right">
            Which kinds count as the work being planned. Everything else stays
            in the map but off the board: a monster that appears at an event is
            linked to it, but it is not something anyone has to write.
          </Hint>
        </div>
      </div>

      {spine.length === 0 ? (
        <p className="ed-empty">
          Nothing of that kind yet. Add one and it becomes the first column.
        </p>
      ) : (
        <div className="board-scroll">
          <table className="board-grid">
            <thead>
              <tr>
                <th className="board-corner" />
                {spine.map((s) => {
                  const drafts = draftsAt(s.id);
                  return (
                    <th key={s.id} className={selectedId === s.id ? 'is-selected' : ''}>
                      <button className="board-col-head" onClick={() => onSelect(s.id)}>
                        <strong>{s.name}</strong>
                        {s.occursAt && <span className="board-when">{s.occursAt}</span>}
                        <span className="board-drafts">
                          {drafts === 0 ? 'all settled' : `${drafts} draft`}
                          {drafts > 1 ? 's' : ''}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {lanes.map((lane) => (
                <tr key={lane.id}>
                  <th className="board-lane">
                    <button onClick={() => onSelect(lane.id)}>
                      {lane.name}
                      {(unscheduled.get(lane.id)?.length ?? 0) > 0 && (
                        <span className="board-unplaced">
                          {unscheduled.get(lane.id)!.length} unplaced
                        </span>
                      )}
                    </button>
                  </th>
                  {spine.map((s) => (
                    <Cell
                      key={s.id}
                      entities={cells.get(cellKey(lane.id, s.id)) ?? []}
                      selectedId={selectedId}
                      onSelect={onSelect}
                    />
                  ))}
                </tr>
              ))}

              {/* Content at a point in the sequence but in no track. Shown
                  rather than dropped, so the board accounts for everything. */}
              <tr className="board-rest">
                <th className="board-lane">
                  <span>
                    No track
                    <Hint>
                      Linked to a point in the sequence but to no track.
                      Plenty of content legitimately belongs to an event and
                      nothing else.
                    </Hint>
                  </span>
                </th>
                {spine.map((s) => (
                  <Cell
                    key={s.id}
                    entities={untracked.get(s.id) ?? []}
                    selectedId={selectedId}
                    onSelect={onSelect}
                  />
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {lanes.some((l) => (unscheduled.get(l.id)?.length ?? 0) > 0) && (
        <section className="board-unscheduled">
          <h3>
            In a track, not yet placed
            <Hint>
              Assigned to a strand but not yet placed anywhere in the
              sequence.
            </Hint>
          </h3>
          {lanes.map((lane) => {
            const waiting = unscheduled.get(lane.id) ?? [];
            if (waiting.length === 0) return null;
            return (
              <div key={lane.id} className="board-waiting">
                <span className="board-waiting-lane">{lane.name}</span>
                <div className="board-cards">
                  {waiting.map((e) => (
                    <Card key={e.id} entity={e} selected={selectedId === e.id} onSelect={onSelect} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function Cell({
  entities,
  selectedId,
  onSelect,
}: {
  entities: NarrativeEntity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <td className={entities.length === 0 ? 'is-empty' : ''}>
      <div className="board-cards">
        {entities.map((e) => (
          <Card key={e.id} entity={e} selected={selectedId === e.id} onSelect={onSelect} />
        ))}
      </div>
    </td>
  );
}

function Card({
  entity,
  selected,
  onSelect,
}: {
  entity: NarrativeEntity;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      className={`board-card is-${entity.status} ${selected ? 'is-selected' : ''}`}
      onClick={() => onSelect(entity.id)}
      title={entity.summary}
    >
      <span className="board-card-name">{entity.name}</span>
    </button>
  );
}
