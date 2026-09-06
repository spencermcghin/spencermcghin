/**
 * The editing operations the story map UI calls.
 *
 * Pure and immutable, like ruleset-editor: every operation takes a map and
 * returns a new one, so the page can hold one in state, apply an edit and
 * re-validate without mutating anything mid-render, and undo is a stack of
 * past values.
 *
 * As there, these do not enforce referential integrity. Someone writing up an
 * encounter names a character who does not have an entry yet; refusing the
 * edit would make them stop and go elsewhere. validateMap reports the gap
 * instead, continuously.
 */

import type {
  EntityKind,
  NarrativeEntity,
  NarrativeMap,
  Relation,
  RelationKind,
  SourceRef,
} from './narrative-schema';
import type { Id } from './rules-schema';

/* ------------------------------------------------------------------ *
 * Ids
 * ------------------------------------------------------------------ */

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

/**
 * A readable id derived from the name, kept unique against what exists.
 *
 * Readable rather than a uuid because these ids show up in exported files
 * and in the "points at something missing" messages, where `obeah` tells the
 * reader something and `e7f3c1a2` does not.
 */
export function freshId(name: string, taken: Iterable<Id>, fallback = 'entry'): Id {
  const base = slug(name) || fallback;
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/* ------------------------------------------------------------------ *
 * Vocabulary
 * ------------------------------------------------------------------ */

/**
 * A starting vocabulary, offered to a project that has none.
 *
 * Not baked into the schema: these are a suggestion a user can rename or
 * delete entirely. But a map with no kinds cannot hold anything, and asking
 * someone to invent a taxonomy before they can write down their first NPC is
 * a bad first five minutes.
 */
export function starterVocabulary(): {
  entityKinds: EntityKind[];
  relationKinds: RelationKind[];
} {
  return {
    entityKinds: [
      { id: 'event', label: 'Event', plural: 'Events', shape: 'event',
        description: 'A game session or a moment in the timeline.' },
      { id: 'character', label: 'Character', plural: 'Characters', shape: 'person',
        description: 'Named NPCs, and the roles that recur.' },
      { id: 'place', label: 'Place', plural: 'Places', shape: 'place' },
      { id: 'faction', label: 'Faction', plural: 'Factions', shape: 'group' },
      { id: 'artifact', label: 'Artifact', plural: 'Artifacts', shape: 'thing' },
      { id: 'thread', label: 'Plot thread', plural: 'Plot threads', shape: 'idea',
        description: 'A story that is open and wants resolving.' },
    ],
    relationKinds: [
      { id: 'appears-in', label: 'appears in', inverseLabel: 'features' },
      { id: 'leads-to', label: 'leads to', inverseLabel: 'follows from' },
      { id: 'within', label: 'is within', inverseLabel: 'contains' },
      { id: 'member-of', label: 'belongs to', inverseLabel: 'includes' },
      { id: 'concerns', label: 'concerns', inverseLabel: 'is the subject of' },
      { id: 'opposes', label: 'opposes', inverseLabel: 'is opposed by', symmetric: true },
    ],
  };
}

export function addEntityKind(map: NarrativeMap, kind: EntityKind): NarrativeMap {
  return { ...map, entityKinds: [...map.entityKinds, kind] };
}

export function updateEntityKind(
  map: NarrativeMap,
  id: Id,
  patch: Partial<EntityKind>
): NarrativeMap {
  return {
    ...map,
    entityKinds: map.entityKinds.map((k) => (k.id === id ? { ...k, ...patch } : k)),
  };
}

/**
 * Removes a kind. Entries filed under it are kept, and validateMap reports
 * them -- deleting a container must never delete what someone wrote inside
 * it.
 */
export function removeEntityKind(map: NarrativeMap, id: Id): NarrativeMap {
  return { ...map, entityKinds: map.entityKinds.filter((k) => k.id !== id) };
}

export function addRelationKind(map: NarrativeMap, kind: RelationKind): NarrativeMap {
  return { ...map, relationKinds: [...map.relationKinds, kind] };
}

export function updateRelationKind(
  map: NarrativeMap,
  id: Id,
  patch: Partial<RelationKind>
): NarrativeMap {
  return {
    ...map,
    relationKinds: map.relationKinds.map((k) => (k.id === id ? { ...k, ...patch } : k)),
  };
}

export function removeRelationKind(map: NarrativeMap, id: Id): NarrativeMap {
  return { ...map, relationKinds: map.relationKinds.filter((k) => k.id !== id) };
}

/* ------------------------------------------------------------------ *
 * Entities
 * ------------------------------------------------------------------ */

export function addEntity(
  map: NarrativeMap,
  input: { name: string; kindId: Id; summary?: string; sources?: SourceRef[] }
): { map: NarrativeMap; id: Id } {
  const id = freshId(input.name, map.entities.map((e) => e.id));
  const entity: NarrativeEntity = {
    id,
    kindId: input.kindId,
    name: input.name,
    aliases: [],
    tags: [],
    status: 'draft',
    sources: input.sources ?? [],
    ...(input.summary ? { summary: input.summary } : {}),
  };
  return { map: { ...map, entities: [...map.entities, entity] }, id };
}

export function updateEntity(
  map: NarrativeMap,
  id: Id,
  patch: Partial<NarrativeEntity>
): NarrativeMap {
  return {
    ...map,
    entities: map.entities.map((e) => (e.id === id ? { ...e, ...patch } : e)),
  };
}

/**
 * Removes an entity and every connection that touched it.
 *
 * Unlike a kind, a dangling relation helps nobody: it names an entry that is
 * gone from both ends and cannot be repaired by hand, only deleted. Removing
 * them keeps the map honest without losing anything an author wrote as prose.
 */
export function removeEntity(map: NarrativeMap, id: Id): NarrativeMap {
  return {
    ...map,
    entities: map.entities.filter((e) => e.id !== id),
    relations: map.relations.filter((r) => r.fromId !== id && r.toId !== id),
  };
}

/* ------------------------------------------------------------------ *
 * Relations
 * ------------------------------------------------------------------ */

/**
 * Connects two entries.
 *
 * The same pair may be connected more than once -- two people can be both
 * siblings and rivals -- but not twice by the same kind in the same
 * direction, which is a double-click rather than a fact.
 */
export function connect(
  map: NarrativeMap,
  input: { fromId: Id; toId: Id; kindId: Id; note?: string; sources?: SourceRef[] }
): NarrativeMap {
  const kind = map.relationKinds.find((k) => k.id === input.kindId);
  const duplicate = map.relations.some(
    (r) =>
      r.kindId === input.kindId &&
      ((r.fromId === input.fromId && r.toId === input.toId) ||
        // A symmetric kind says the same thing either way round.
        (kind?.symmetric && r.fromId === input.toId && r.toId === input.fromId))
  );
  if (duplicate) return map;

  const relation: Relation = {
    id: freshId(
      `${input.fromId}-${input.kindId}-${input.toId}`,
      map.relations.map((r) => r.id),
      'link'
    ),
    kindId: input.kindId,
    fromId: input.fromId,
    toId: input.toId,
    sources: input.sources ?? [],
    ...(input.note ? { note: input.note } : {}),
  };
  return { ...map, relations: [...map.relations, relation] };
}

export function updateRelation(
  map: NarrativeMap,
  id: Id,
  patch: Partial<Relation>
): NarrativeMap {
  return {
    ...map,
    relations: map.relations.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  };
}

export function disconnect(map: NarrativeMap, relationId: Id): NarrativeMap {
  return { ...map, relations: map.relations.filter((r) => r.id !== relationId) };
}

/* ------------------------------------------------------------------ *
 * Import
 * ------------------------------------------------------------------ */

export interface ImportReport {
  map: NarrativeMap;
  addedEntities: number;
  addedRelations: number;
  addedKinds: number;
  /** Entries whose name or id already existed and were left alone. */
  skipped: string[];
}

/**
 * Merges another map into this one.
 *
 * Additive, and never overwrites: an entry already here keeps what it says.
 * Someone importing a second event's extraction into a map they have been
 * editing must not lose their edits to the shared characters, which is
 * exactly the case where a naive replace would do the most damage.
 *
 * Matching is by id first, then by name, case-insensitively -- an extraction
 * run twice produces the same ids, but one written by hand may not.
 */
export function mergeMap(into: NarrativeMap, incoming: Partial<NarrativeMap>): ImportReport {
  let map = into;
  const skipped: string[] = [];
  let addedKinds = 0;

  for (const kind of incoming.entityKinds ?? []) {
    if (map.entityKinds.some((k) => k.id === kind.id)) continue;
    map = addEntityKind(map, kind);
    addedKinds++;
  }
  for (const kind of incoming.relationKinds ?? []) {
    if (map.relationKinds.some((k) => k.id === kind.id)) continue;
    map = addRelationKind(map, kind);
    addedKinds++;
  }

  const byName = new Map(map.entities.map((e) => [e.name.toLowerCase(), e.id]));
  const byId = new Set(map.entities.map((e) => e.id));
  /** incoming id -> the id it landed under here. */
  const resolved = new Map<Id, Id>();
  let addedEntities = 0;

  for (const entity of incoming.entities ?? []) {
    const existing = byId.has(entity.id)
      ? entity.id
      : byName.get(entity.name.toLowerCase());
    if (existing) {
      resolved.set(entity.id, existing);
      skipped.push(entity.name);
      continue;
    }
    map = { ...map, entities: [...map.entities, entity] };
    byId.add(entity.id);
    byName.set(entity.name.toLowerCase(), entity.id);
    resolved.set(entity.id, entity.id);
    addedEntities++;
  }

  let addedRelations = 0;
  for (const relation of incoming.relations ?? []) {
    const fromId = resolved.get(relation.fromId) ?? relation.fromId;
    const toId = resolved.get(relation.toId) ?? relation.toId;
    const before = map.relations.length;
    map = connect(map, {
      fromId,
      toId,
      kindId: relation.kindId,
      note: relation.note,
      sources: relation.sources,
    });
    if (map.relations.length > before) addedRelations++;
  }

  return { map, addedEntities, addedRelations, addedKinds, skipped };
}
