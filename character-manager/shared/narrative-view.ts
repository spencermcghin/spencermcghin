/**
 * How a story map is ordered and grouped for reading.
 *
 * Separate from narrative.ts, which answers questions about the map. This
 * answers a different one: given several hundred entries written by different
 * people over years, what order do they go in and what do you put them under?
 *
 * Two rules run through everything here, and both exist because real projects
 * are untidy:
 *
 *   1. Ordering falls back rather than failing. An entry with no `occursAt`
 *      still has to sit somewhere sensible, so each ordering names a ladder --
 *      the field, then a derived stand-in, then the name -- and the last rung
 *      always works.
 *
 *   2. Grouping never drops anything. Every grouping ends with a catch-all
 *      for the entries that lack the field, and that group is shown, not
 *      hidden. A view that quietly omits the unfiled entries teaches a project
 *      that it is tidier than it is, which is the opposite of useful.
 */

import { naturally, type MapIndex } from './narrative';
import type { Id } from './rules-schema';
import type { NarrativeEntity } from './narrative-schema';

export { naturally };

/* ------------------------------------------------------------------ *
 * Ordering
 * ------------------------------------------------------------------ */

export type OrderBy = 'name' | 'sequence' | 'connections' | 'status';

export const ORDERINGS: { id: OrderBy; label: string; ladder: string }[] = [
  {
    id: 'sequence',
    label: 'When it happens',
    ladder:
      'By the "occurs at" field, read with numbers as numbers so Event 9 comes ' +
      'before Event 10. Entries without one fall to the end, in name order.',
  },
  {
    id: 'name',
    label: 'Name',
    ladder:
      'Alphabetical, ignoring case and accents, with numbers read as numbers. ' +
      'The ordering that never surprises anyone.',
  },
  {
    id: 'connections',
    label: 'Most connected',
    ladder:
      'By how many other entries touch it, from either end. Ties break on ' +
      'name. This surfaces the load-bearing parts of the canon first.',
  },
  {
    id: 'status',
    label: 'Unfinished first',
    ladder:
      'Draft, then canon, then retired — work before reference. Ties break on ' +
      'the sequence, so the drafts for the nearest event come first.',
  },
];

const STATUS_RANK: Record<string, number> = { draft: 0, canon: 1, retired: 2 };

export function orderEntities(
  entities: NarrativeEntity[],
  by: OrderBy,
  idx: MapIndex
): NarrativeEntity[] {
  const degree = (e: NarrativeEntity) => (idx.byEntity.get(e.id) ?? []).length;
  const byName = (a: NarrativeEntity, b: NarrativeEntity) => naturally(a.name, b.name);

  // Entries with no `occursAt` sort after every entry that has one, rather
  // than sorting as an empty string and colonising the top of the list.
  const bySequence = (a: NarrativeEntity, b: NarrativeEntity) => {
    if (a.occursAt && b.occursAt) return naturally(a.occursAt, b.occursAt) || byName(a, b);
    if (a.occursAt) return -1;
    if (b.occursAt) return 1;
    return byName(a, b);
  };

  const copy = [...entities];
  switch (by) {
    case 'name':
      return copy.sort(byName);
    case 'sequence':
      return copy.sort(bySequence);
    case 'connections':
      return copy.sort((a, b) => degree(b) - degree(a) || byName(a, b));
    case 'status':
      return copy.sort(
        (a, b) =>
          (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) || bySequence(a, b)
      );
  }
}

/* ------------------------------------------------------------------ *
 * Slots within one point in the sequence
 * ------------------------------------------------------------------ */

/**
 * The part of `occursAt` after the separator: "Event 10 · Saturday" -> "Saturday".
 *
 * A convention rather than a schema field, on purpose. Games slice an event
 * differently -- days, shifts, acts, mod blocks -- and asking every project to
 * declare that before they can write anything down is a tax on the ninety per
 * cent who never needed it. Anything before the separator is the point in the
 * sequence; anything after it is where inside.
 */
export function slotOf(entity: NarrativeEntity): string | undefined {
  const at = entity.occursAt;
  if (!at) return undefined;
  const cut = at.indexOf('·');
  if (cut === -1) return undefined;
  return at.slice(cut + 1).trim() || undefined;
}

/* ------------------------------------------------------------------ *
 * Grouping
 * ------------------------------------------------------------------ */

export type GroupBy = 'none' | 'kind' | 'sequence' | 'lane' | 'status' | 'tag';

export interface EntityGroup {
  key: string;
  label: string;
  /** Why these are together, when it is not obvious from the label. */
  note?: string;
  /** True for the trailing group of entries that lack the field. */
  leftover?: boolean;
  entities: NarrativeEntity[];
}

export const GROUPINGS: { id: GroupBy; label: string; rule: string; leftover: string }[] = [
  {
    id: 'kind',
    label: 'Kind',
    rule: 'One group per kind the project declared, in the order the project listed them.',
    leftover: 'An entry of a kind the project has since deleted lands in "Kind no longer declared".',
  },
  {
    id: 'sequence',
    label: 'Where in the campaign',
    rule:
      'One group per entry on the spine, in sequence order. Membership comes from ' +
      'connections, not from a field, so an encounter written before anyone filled ' +
      'in a date still lands under its event.',
    leftover: 'Everything connected to no point in the sequence gathers in "Not placed yet".',
  },
  {
    id: 'lane',
    label: 'Track',
    rule: 'One group per track, again from connections rather than a field.',
    leftover: 'Content in no track gathers in "No track", which is where forgotten work hides.',
  },
  {
    id: 'status',
    label: 'Status',
    rule: 'Draft, canon, retired — in that order, because the drafts are the work.',
    leftover: 'None: every entry has a status.',
  },
  {
    id: 'tag',
    label: 'Tag',
    rule:
      'One group per tag. An entry with three tags appears in three groups, ' +
      'because it genuinely is in all three and showing it once would make two ' +
      'of the groups lie.',
    leftover: 'Untagged entries gather in "No tags".',
  },
  {
    id: 'none',
    label: 'Nothing',
    rule: 'One flat list.',
    leftover: 'Not applicable.',
  },
];

/** Ids of entries of `kindId` that this entity is connected to, either way round. */
function connectedOfKind(entity: NarrativeEntity, kindId: Id | undefined, idx: MapIndex): Id[] {
  if (!kindId) return [];
  return (idx.byEntity.get(entity.id) ?? [])
    .map((r) => (r.fromId === entity.id ? r.toId : r.fromId))
    .filter((id) => idx.entities.get(id)?.kindId === kindId);
}

/**
 * Groups a set of entries, always ending with the leftovers.
 *
 * `axisKindId` is the kind whose entries form the groups for the connection-
 * based groupings — the spine kind for 'sequence', the lane kind for 'lane'.
 * Those come from the project's own CampaignShape, so nothing here decides
 * that an "event" is special.
 */
export function groupEntities(
  entities: NarrativeEntity[],
  by: GroupBy,
  idx: MapIndex,
  order: OrderBy = 'name'
): EntityGroup[] {
  const sorted = (list: NarrativeEntity[]) => orderEntities(list, order, idx);

  if (by === 'none') {
    return [{ key: 'all', label: 'Everything', entities: sorted(entities) }];
  }

  if (by === 'kind') {
    const groups: EntityGroup[] = [];
    for (const kind of idx.map.entityKinds) {
      const members = entities.filter((e) => e.kindId === kind.id);
      if (members.length > 0) {
        groups.push({ key: kind.id, label: kind.plural, entities: sorted(members) });
      }
    }
    const stray = entities.filter((e) => !idx.entityKinds.has(e.kindId));
    if (stray.length > 0) {
      groups.push({
        key: '_stray',
        label: 'Kind no longer declared',
        note: 'The project used to have this kind and does not any more.',
        leftover: true,
        entities: sorted(stray),
      });
    }
    return groups;
  }

  if (by === 'status') {
    const order: NarrativeEntity['status'][] = ['draft', 'canon', 'retired'];
    const label = { draft: 'Draft', canon: 'Canon', retired: 'Retired' };
    return order
      .map((s) => ({
        key: s,
        label: label[s],
        entities: sorted(entities.filter((e) => e.status === s)),
      }))
      .filter((g) => g.entities.length > 0);
  }

  if (by === 'tag') {
    const tags = [...new Set(entities.flatMap((e) => e.tags))].sort(naturally);
    const groups: EntityGroup[] = tags.map((t) => ({
      key: `tag:${t}`,
      label: t,
      entities: sorted(entities.filter((e) => e.tags.includes(t))),
    }));
    const untagged = entities.filter((e) => e.tags.length === 0);
    if (untagged.length > 0) {
      groups.push({
        key: '_untagged',
        label: 'No tags',
        leftover: true,
        entities: sorted(untagged),
      });
    }
    return groups;
  }

  // 'sequence' and 'lane': grouped by what they are connected to.
  const axisKindId =
    by === 'sequence' ? idx.map.campaign?.spineKindId : idx.map.campaign?.laneKindId;
  const axis = orderEntities(
    idx.map.entities.filter((e) => e.kindId === axisKindId),
    by === 'sequence' ? 'sequence' : 'name',
    idx
  );
  const axisIds = new Set(axis.map((a) => a.id));

  const groups: EntityGroup[] = axis.map((a) => ({
    key: a.id,
    label: a.name,
    entities: [] as NarrativeEntity[],
  }));
  const byKey = new Map(groups.map((g) => [g.key, g]));
  const leftover: NarrativeEntity[] = [];

  for (const entity of entities) {
    // The axis entries are the headings, not content filed under themselves.
    if (axisIds.has(entity.id)) continue;
    const on = connectedOfKind(entity, axisKindId, idx);
    if (on.length === 0) {
      leftover.push(entity);
      continue;
    }
    // Something spanning two events appears under both, because it does.
    for (const id of on) byKey.get(id)?.entities.push(entity);
  }

  const out = groups
    .filter((g) => g.entities.length > 0)
    .map((g) => ({ ...g, entities: sorted(g.entities) }));

  if (leftover.length > 0) {
    out.push({
      key: '_leftover',
      label: by === 'sequence' ? 'Not placed yet' : 'No track',
      note:
        by === 'sequence'
          ? 'Connected to nothing on the sequence. Some of this is next year’s work and some of it was forgotten.'
          : 'In no track. Not wrong, but this is where work goes missing.',
      leftover: true,
      entities: sorted(leftover),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * The row
 * ------------------------------------------------------------------ */

/**
 * What one entry shows in a list, wherever a list appears.
 *
 * Deliberately the same everywhere. A reader learns a row once -- name, what
 * it is, when, how settled, how connected, whether it can be traced -- and
 * then reads every list in the app without relearning. The two dimmed facts
 * at the end are absences worth seeing: an entry nothing links to, and a
 * claim with no source behind it.
 */
export interface RowFacts {
  entity: NarrativeEntity;
  kindLabel: string;
  /** The `occursAt` string, or the sequence entry it is connected to. */
  where?: string;
  /** True when `where` was derived from a connection rather than the field. */
  whereInferred: boolean;
  degree: number;
  sourced: boolean;
  gated: boolean;
}

export function rowFacts(entity: NarrativeEntity, idx: MapIndex): RowFacts {
  const spineKindId = idx.map.campaign?.spineKindId;
  let where = entity.occursAt;
  let whereInferred = false;
  if (!where && spineKindId) {
    const on = connectedOfKind(entity, spineKindId, idx)
      .map((id) => idx.entities.get(id)?.name)
      .filter((n): n is string => Boolean(n))
      .sort(naturally);
    if (on.length > 0) {
      where = on.length === 1 ? on[0] : `${on[0]} +${on.length - 1}`;
      whereInferred = true;
    }
  }
  return {
    entity,
    kindLabel: idx.entityKinds.get(entity.kindId)?.label ?? entity.kindId,
    where,
    whereInferred,
    degree: (idx.byEntity.get(entity.id) ?? []).length,
    sourced: entity.sources.length > 0,
    gated: Boolean(entity.requires),
  };
}

/* ------------------------------------------------------------------ *
 * Connections, grouped for reading
 * ------------------------------------------------------------------ */

/**
 * An entity's connections gathered under the wording, rather than listed flat.
 *
 * Event 10 has thirty-two connections. As a flat list that is a wall; under
 * headings it is "features 12, contains 5, is the subject of 8" and a reader
 * can go to the part they wanted. Groups are ordered largest first, since the
 * biggest group is usually what the entry is for.
 */
export interface ConnectionGroup {
  label: string;
  others: NarrativeEntity[];
  /** Ends that point at something no longer in the map. */
  broken: number;
}

export function groupedConnections(
  entityId: Id,
  idx: MapIndex,
  connectionsOf: (id: Id, idx: MapIndex) => { label: string; other?: NarrativeEntity }[]
): ConnectionGroup[] {
  const by = new Map<string, ConnectionGroup>();
  for (const c of connectionsOf(entityId, idx)) {
    let group = by.get(c.label);
    if (!group) {
      group = { label: c.label, others: [], broken: 0 };
      by.set(c.label, group);
    }
    if (c.other) group.others.push(c.other);
    else group.broken += 1;
  }
  return [...by.values()]
    .map((g) => ({ ...g, others: g.others.sort((a, b) => naturally(a.name, b.name)) }))
    .sort((a, b) => b.others.length + b.broken - (a.others.length + a.broken) || naturally(a.label, b.label));
}
