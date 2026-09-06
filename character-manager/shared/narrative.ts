/**
 * Reading the narrative map.
 *
 * Pure functions over (NarrativeMap, Ruleset). The questions here are the
 * ones a document cannot answer about itself: what is this connected to,
 * what points at something that no longer exists, what has been written and
 * then orphaned, and which content is gated behind a skill nobody has.
 */

import type { Character, Condition, Id, Ruleset } from './rules-schema';
import { evaluate, describeCondition, type RulesetIndex } from './engine';
import type {
  EntityKind,
  NarrativeEntity,
  NarrativeMap,
  Relation,
  RelationKind,
} from './narrative-schema';

/* ------------------------------------------------------------------ *
 * Indexing
 * ------------------------------------------------------------------ */

export interface MapIndex {
  map: NarrativeMap;
  entities: Map<Id, NarrativeEntity>;
  entityKinds: Map<Id, EntityKind>;
  relationKinds: Map<Id, RelationKind>;
  /** Relations touching an entity, from either end. */
  byEntity: Map<Id, Relation[]>;
}

export function indexMap(map: NarrativeMap): MapIndex {
  const byEntity = new Map<Id, Relation[]>();
  const add = (id: Id, relation: Relation) => {
    const list = byEntity.get(id);
    if (list) list.push(relation);
    else byEntity.set(id, [relation]);
  };
  for (const relation of map.relations) {
    add(relation.fromId, relation);
    // A relation from an entity to itself is one edge, not two.
    if (relation.toId !== relation.fromId) add(relation.toId, relation);
  }
  return {
    map,
    entities: new Map(map.entities.map((e) => [e.id, e])),
    entityKinds: new Map(map.entityKinds.map((k) => [k.id, k])),
    relationKinds: new Map(map.relationKinds.map((k) => [k.id, k])),
    byEntity,
  };
}

/* ------------------------------------------------------------------ *
 * Connections
 * ------------------------------------------------------------------ */

export interface Connection {
  relation: Relation;
  /** The entity at the other end. Absent when the relation is broken. */
  other?: NarrativeEntity;
  otherId: Id;
  /** Worded from the subject's point of view: "appears in", "features". */
  label: string;
  /** False when the subject is the target, i.e. the relation was read back. */
  outgoing: boolean;
}

/**
 * Everything connected to one entity, worded from its side.
 *
 * A relation is stored once and read from both ends, so "Aldous appears in
 * The Rending" and "The Rending features Aldous" are the same row. Wording
 * it per side is what lets an entity page read as prose rather than as a
 * table of arrows the reader has to invert in their head.
 */
export function connectionsOf(entityId: Id, idx: MapIndex): Connection[] {
  const out: Connection[] = [];
  for (const relation of idx.byEntity.get(entityId) ?? []) {
    const kind = idx.relationKinds.get(relation.kindId);
    const outgoing = relation.fromId === entityId;
    const otherId = outgoing ? relation.toId : relation.fromId;
    out.push({
      relation,
      otherId,
      other: idx.entities.get(otherId),
      outgoing,
      label: !kind
        ? relation.kindId
        : kind.symmetric
          ? kind.label
          : outgoing
            ? kind.label
            : kind.inverseLabel,
    });
  }
  return out;
}

/** How many connections each entity has, most connected first. */
export function hubs(idx: MapIndex): { entity: NarrativeEntity; degree: number }[] {
  return idx.map.entities
    .map((entity) => ({ entity, degree: (idx.byEntity.get(entity.id) ?? []).length }))
    .sort((a, b) => b.degree - a.degree);
}

/**
 * Entities nothing connects to.
 *
 * The governance question this exists for: a LARP accumulates content that
 * was written, half-used, and then forgotten. An orphan is not necessarily
 * wrong -- it may be waiting for a future event -- but nobody can decide
 * that until they can see the list.
 */
export function orphans(idx: MapIndex): NarrativeEntity[] {
  return idx.map.entities.filter((e) => (idx.byEntity.get(e.id) ?? []).length === 0);
}

/* ------------------------------------------------------------------ *
 * Coherence
 * ------------------------------------------------------------------ */

export interface MapIssue {
  severity: 'error' | 'warning';
  code:
    | 'duplicate-id'
    | 'unknown-kind'
    | 'broken-relation'
    | 'self-relation'
    | 'unknown-rule-reference'
    | 'nameless';
  message: string;
  subject?: { kind: 'entity' | 'relation'; id: Id };
}

/**
 * Checks the map holds together, and -- when given the ruleset -- that the
 * rules it points at still exist.
 *
 * The cross-check is the point. A lore prop gated on a skill that was
 * renamed in the ruleset is content nobody can ever open, and neither
 * document knows it on its own.
 */
export function validateMap(map: NarrativeMap, ruleset?: Ruleset): MapIssue[] {
  const issues: MapIssue[] = [];
  const entityIds = new Set<Id>();
  const kindIds = new Set(map.entityKinds.map((k) => k.id));
  const relationKindIds = new Set(map.relationKinds.map((k) => k.id));

  for (const entity of map.entities) {
    if (entityIds.has(entity.id)) {
      issues.push({
        severity: 'error',
        code: 'duplicate-id',
        message: `More than one entry uses the id "${entity.id}".`,
        subject: { kind: 'entity', id: entity.id },
      });
    }
    entityIds.add(entity.id);

    if (!entity.name.trim()) {
      issues.push({
        severity: 'error',
        code: 'nameless',
        message: `An entry of kind "${entity.kindId}" has no name.`,
        subject: { kind: 'entity', id: entity.id },
      });
    }

    if (!kindIds.has(entity.kindId)) {
      issues.push({
        severity: 'error',
        code: 'unknown-kind',
        message: `"${entity.name}" is of kind "${entity.kindId}", which this project does not declare.`,
        subject: { kind: 'entity', id: entity.id },
      });
    }

    if (entity.requires && ruleset) {
      for (const missing of missingRuleReferences(entity.requires, ruleset)) {
        issues.push({
          severity: 'error',
          code: 'unknown-rule-reference',
          message:
            `"${entity.name}" is gated on ${missing}, which is not in this ` +
            `project's rules, so nothing can ever open it.`,
          subject: { kind: 'entity', id: entity.id },
        });
      }
    }
  }

  for (const relation of map.relations) {
    if (!relationKindIds.has(relation.kindId)) {
      issues.push({
        severity: 'error',
        code: 'unknown-kind',
        message: `A connection is of kind "${relation.kindId}", which this project does not declare.`,
        subject: { kind: 'relation', id: relation.id },
      });
    }
    for (const [end, id] of [
      ['from', relation.fromId],
      ['to', relation.toId],
    ] as const) {
      if (!entityIds.has(id)) {
        issues.push({
          severity: 'error',
          code: 'broken-relation',
          message: `A connection points ${end} "${id}", which no longer exists.`,
          subject: { kind: 'relation', id: relation.id },
        });
      }
    }
    if (relation.fromId === relation.toId) {
      issues.push({
        severity: 'warning',
        code: 'self-relation',
        message: `"${
          map.entities.find((e) => e.id === relation.fromId)?.name ?? relation.fromId
        }" is connected to itself.`,
        subject: { kind: 'relation', id: relation.id },
      });
    }
  }

  return issues;
}

/** Names in a condition that the ruleset no longer defines. */
function missingRuleReferences(condition: Condition, ruleset: Ruleset): string[] {
  const traitIds = new Set(ruleset.traits.map((t) => t.id));
  const qualityIds = new Set((ruleset.qualities ?? []).map((q) => q.id));
  const trackIds = new Set(ruleset.tracks.map((t) => t.id));
  const packageIds = new Set(ruleset.packages.map((p) => p.id));
  const out: string[] = [];

  const walk = (c: Condition) => {
    switch (c.kind) {
      case 'trait':
        if (!traitIds.has(c.traitId)) out.push(`the skill "${c.traitId}"`);
        break;
      case 'quality':
        if (!qualityIds.has(c.qualityId)) out.push(`the quality "${c.qualityId}"`);
        break;
      case 'track':
        if (!trackIds.has(c.trackId)) out.push(`the track "${c.trackId}"`);
        break;
      case 'package':
        if (!packageIds.has(c.packageId)) out.push(`the archetype "${c.packageId}"`);
        break;
      case 'anyPackage':
        for (const id of c.packageIds) {
          if (!packageIds.has(id)) out.push(`the archetype "${id}"`);
        }
        break;
      case 'all':
      case 'any':
        c.of.forEach(walk);
        break;
      case 'not':
        walk(c.of);
        break;
      default:
        break;
    }
  };
  walk(condition);
  return out;
}

/* ------------------------------------------------------------------ *
 * Gated content
 * ------------------------------------------------------------------ */

export interface GateReport {
  entity: NarrativeEntity;
  /** The requirement, worded for a person. */
  requirement: string;
  /** Characters in the project that currently meet it. */
  reachedBy: string[];
}

/**
 * Which gated content the roster can actually open.
 *
 * Written for the question staff ask before an event: we have put three lore
 * props behind Metaphysics 2 -- does anyone have it? Content nobody can
 * reach is not a bug in itself, but discovering it at the event is.
 */
export function gatedContent(
  map: NarrativeMap,
  characters: { name: string; character: Character }[],
  idx: RulesetIndex
): GateReport[] {
  return map.entities
    .filter((e) => e.requires)
    .map((entity) => ({
      entity,
      requirement: describeCondition(entity.requires!, idx),
      reachedBy: characters
        .filter((c) => evaluate(entity.requires!, c.character, idx))
        .map((c) => c.name),
    }));
}

/* ------------------------------------------------------------------ *
 * The campaign board
 *
 * A map becomes a plan when you can see the sequence and what runs across
 * it. Which kinds do that is the project's choice, declared on the map --
 * see CampaignShape -- so this code never asks whether something is an
 * "event".
 * ------------------------------------------------------------------ */

export interface CampaignBoard {
  /** Entries of the spine kind, in order. */
  spine: NarrativeEntity[];
  /** Entries of the lane kind. */
  lanes: NarrativeEntity[];
  /** `${laneId}|${spineId}` -> what sits in that cell. */
  cells: Map<string, NarrativeEntity[]>;
  /** In a lane, but not attached to anything on the spine yet. */
  unscheduled: Map<Id, NarrativeEntity[]>;
  /** On the spine, but in no lane. The row that catches everything else. */
  untracked: Map<Id, NarrativeEntity[]>;
}

export const cellKey = (laneId: Id, spineId: Id) => `${laneId}|${spineId}`;

/**
 * Orders the spine.
 *
 * By `occursAt` where a project fills it in, else by name -- and comparing
 * numbers inside the string as numbers, because "Event 10" sorts before
 * "Event 9" otherwise and a campaign board that puts the finale in the middle
 * is worse than no board.
 */
function naturally(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export function campaignBoard(idx: MapIndex): CampaignBoard | null {
  const shape = idx.map.campaign;
  if (!shape?.spineKindId) return null;

  const spine = idx.map.entities
    .filter((e) => e.kindId === shape.spineKindId)
    .sort((a, b) => naturally(a.occursAt ?? a.name, b.occursAt ?? b.name));

  const lanes = shape.laneKindId
    ? idx.map.entities
        .filter((e) => e.kindId === shape.laneKindId)
        .sort((a, b) => naturally(a.name, b.name))
    : [];

  const spineIds = new Set(spine.map((e) => e.id));
  const laneIds = new Set(lanes.map((e) => e.id));

  /** What an entry is attached to, whichever way the relation was written. */
  const touches = (entity: NarrativeEntity, of: Set<Id>): Id[] =>
    (idx.byEntity.get(entity.id) ?? [])
      .map((r) => (r.fromId === entity.id ? r.toId : r.fromId))
      .filter((id) => of.has(id));

  const cells = new Map<string, NarrativeEntity[]>();
  const unscheduled = new Map<Id, NarrativeEntity[]>();
  const untracked = new Map<Id, NarrativeEntity[]>();

  const push = (map: Map<string, NarrativeEntity[]>, key: string, e: NarrativeEntity) => {
    const list = map.get(key);
    if (list) list.push(e);
    else map.set(key, [e]);
  };

  const isContent = (e: NarrativeEntity) =>
    !shape.contentKindIds?.length || shape.contentKindIds.includes(e.kindId);

  for (const entity of idx.map.entities) {
    // The spine and the lanes are the axes, not content sitting on them.
    if (spineIds.has(entity.id) || laneIds.has(entity.id)) continue;
    if (!isContent(entity)) continue;

    const onSpine = touches(entity, spineIds);
    const inLanes = touches(entity, laneIds);
    if (onSpine.length === 0 && inLanes.length === 0) continue;

    if (onSpine.length === 0) {
      // In a lane, not yet placed in the sequence.
      for (const laneId of inLanes) push(unscheduled, laneId, entity);
      continue;
    }

    for (const spineId of onSpine) {
      if (inLanes.length === 0) {
        push(untracked, spineId, entity);
        continue;
      }
      // Content belonging to two lanes appears in both, because it does.
      for (const laneId of inLanes) push(cells, cellKey(laneId, spineId), entity);
    }
  }

  return { spine, lanes, cells, unscheduled, untracked };
}
