import { connectionsOf, type MapIndex } from './narrative';
import type { Id } from './rules-schema';
import type { NarrativeEntity } from './narrative-schema';
import { naturally, rowFacts, slotOf } from './narrative-view';

/**
 * The awkward cases in a project's own content.
 *
 * Every rule about ordering and filing was written for a case that actually
 * occurs, and a rule is easier to judge next to the entry that motivated it.
 * These are all found in the map rather than named in code, so a project with
 * different content gets its own examples and a project with none gets fewer
 * claims rather than wrong ones.
 */

export interface StoryCases {
  /** Entries linked to more than one point in the sequence. */
  multiSpine: { entity: NarrativeEntity; on: NarrativeEntity[] }[];
  /** Entries in more than one track. */
  multiLane: { entity: NarrativeEntity; on: NarrativeEntity[] }[];
  /** No date of their own, placed by what they link to. */
  inferred: NarrativeEntity[];
  /** No date and linked to no point in the sequence. */
  unplaced: NarrativeEntity[];
  /** Entries the documents call by more than one name, most aliases first. */
  aliased: NarrativeEntity[];
  /** Entries carrying a rules requirement. */
  gated: NarrativeEntity[];
  /** One connection that reads the same from both ends. */
  symmetric?: { a: NarrativeEntity; b: NarrativeEntity; label: string };
  /** One connection that reads differently from each end. */
  directed?: { from: NarrativeEntity; to: NarrativeEntity; forward: string; back: string };
  /** Distinct slot names in use, in the order the app currently sorts them. */
  slots: string[];
  /** Spine entries, sorted properly and sorted naively, for comparison. */
  spineNatural: string[];
  spineNaive: string[];
}

function linkedOfKind(
  entity: NarrativeEntity,
  kindId: Id | undefined,
  idx: MapIndex
): NarrativeEntity[] {
  if (!kindId) return [];
  const seen = new Set<Id>();
  const out: NarrativeEntity[] = [];
  for (const relation of idx.byEntity.get(entity.id) ?? []) {
    const otherId = relation.fromId === entity.id ? relation.toId : relation.fromId;
    const other = idx.entities.get(otherId);
    if (other?.kindId === kindId && !seen.has(otherId)) {
      seen.add(otherId);
      out.push(other);
    }
  }
  return out;
}

export function findCases(idx: MapIndex): StoryCases {
  const map = idx.map;
  const spineKindId = map.campaign?.spineKindId;
  const laneKindId = map.campaign?.laneKindId;

  const multiSpine: StoryCases['multiSpine'] = [];
  const multiLane: StoryCases['multiLane'] = [];
  const inferred: NarrativeEntity[] = [];
  const unplaced: NarrativeEntity[] = [];

  for (const entity of map.entities) {
    if (entity.kindId !== spineKindId) {
      const on = linkedOfKind(entity, spineKindId, idx);
      if (on.length > 1) multiSpine.push({ entity, on });
      if (!entity.occursAt) {
        if (on.length > 0) inferred.push(entity);
        else unplaced.push(entity);
      }
    }
    if (entity.kindId !== laneKindId) {
      const on = linkedOfKind(entity, laneKindId, idx);
      if (on.length > 1) multiLane.push({ entity, on });
    }
  }

  const degree = (e: NarrativeEntity) => (idx.byEntity.get(e.id) ?? []).length;
  inferred.sort((a, b) => degree(b) - degree(a));

  const aliased = map.entities
    .filter((e) => e.aliases.length > 0)
    .sort((a, b) => b.aliases.length - a.aliases.length || naturally(a.name, b.name));

  // One example of each wording, taken from the largest relation kinds so the
  // example is representative rather than a curiosity.
  let symmetric: StoryCases['symmetric'];
  let directed: StoryCases['directed'];
  for (const relation of map.relations) {
    const kind = idx.relationKinds.get(relation.kindId);
    const from = idx.entities.get(relation.fromId);
    const to = idx.entities.get(relation.toId);
    if (!kind || !from || !to || from === to) continue;
    if (kind.symmetric && !symmetric) symmetric = { a: from, b: to, label: kind.label };
    if (!kind.symmetric && !directed && kind.label !== kind.inverseLabel) {
      directed = { from, to, forward: kind.label, back: kind.inverseLabel };
    }
  }

  const slots = [...new Set(map.entities.map(slotOf).filter((s): s is string => Boolean(s)))].sort();

  const spine = map.entities.filter((e) => e.kindId === spineKindId);
  const key = (e: NarrativeEntity) => e.occursAt ?? e.name;
  const spineNatural = [...spine].sort((a, b) => naturally(key(a), key(b))).map((e) => e.name);
  // Plain string comparison, to show what the numeric pass prevents.
  const spineNaive = [...spine]
    .sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0))
    .map((e) => e.name);

  return {
    multiSpine,
    multiLane,
    inferred,
    unplaced,
    aliased,
    gated: map.entities.filter((e) => e.requires),
    symmetric,
    directed,
    slots,
    spineNatural,
    spineNaive,
  };
}

/** Where a row says an entry sits, for quoting in prose. */
export function whereOf(entity: NarrativeEntity, idx: MapIndex): string {
  return rowFacts(entity, idx).where ?? '—';
}

/** How an entry's connections read from its own side, for quoting in prose. */
export function wordingOf(entityId: Id, idx: MapIndex): string[] {
  return [...new Set(connectionsOf(entityId, idx).map((c) => c.label))];
}
