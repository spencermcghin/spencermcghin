/**
 * The narrative map: what a game's story is made of, and how it connects.
 *
 * A LARP's canon lives in hundreds of documents -- encounters, lore props,
 * NPC sheets, prologues -- written by different people over years. Nothing
 * holds the connections between them except the memory of whoever wrote
 * them. This is the model for writing those connections down: which
 * encounter follows which, who appears in both, what a lore prop reveals,
 * and which thread a plot belongs to.
 *
 * Two decisions carry the generality, mirroring the rules schema:
 *
 *   1. The vocabulary is declared per project, not fixed here. Eldritch has
 *      Encounters, NPCs, Houses and Lore Props; another game has Cells,
 *      Contacts and Dead Drops. Hard-coding a set of node types would make
 *      this Eldritch's tool rather than a tool.
 *
 *   2. An entity may carry a `requires` Condition from the rules schema.
 *      Narrative and rules are the same project: a lore prop that only opens
 *      to Metaphysics 2 is a story object pointing at a skill, and once that
 *      is written down the app can answer questions no document can -- which
 *      content is gated behind a skill nobody has bought, and what a given
 *      character is actually able to reach.
 */

import type { Condition, Id } from './rules-schema';

/* ------------------------------------------------------------------ *
 * Vocabulary
 *
 * Declared by the project, the way traitAttributes and qualities are.
 * ------------------------------------------------------------------ */

export interface EntityKind {
  id: Id;
  /** Singular, as a heading: "Encounter". */
  label: string;
  /** Plural, for counts and tabs: "Encounters". */
  plural: string;
  description?: string;
  /**
   * A hint for the UI, not a rule. Kinds that behave alike group alike:
   * `place` gets a map pin, `event` sits on a timeline, `person` gets a
   * portrait slot. An unrecognised value falls back to a plain node.
   */
  shape?: 'person' | 'place' | 'event' | 'thing' | 'group' | 'idea';
}

/**
 * A kind of connection.
 *
 * Directed, with a name for each direction, because "Aldous *betrayed*
 * Corvin" and "Corvin *was betrayed by* Aldous" are the same fact read from
 * either end, and a map that can only say one of them forces the author to
 * pick a side.
 */
export interface RelationKind {
  id: Id;
  /** Reading from source to target: "appears in". */
  label: string;
  /** Reading from target to source: "features". */
  inverseLabel: string;
  description?: string;
  /**
   * When true the two directions mean the same thing ("is allied with"), so
   * the map draws one line rather than implying an asymmetry that is not
   * there.
   */
  symmetric?: boolean;
}

/* ------------------------------------------------------------------ *
 * Provenance
 * ------------------------------------------------------------------ */

/**
 * Where a claim came from.
 *
 * Every entity and every relation carries these, because the first question
 * anyone asks of a canon claim is "says who". A map that cannot answer that
 * is a rumour mill, and staff will not trust it enough to use it.
 */
export interface SourceRef {
  /** How a person would name it: "Event 7 · The Unraveling". */
  label: string;
  /** Where it lives, if it lives anywhere reachable. */
  url?: string;
  /** Which part: a heading, a page, a table row. */
  locator?: string;
}

/* ------------------------------------------------------------------ *
 * Entities and relations
 * ------------------------------------------------------------------ */

export type EntityStatus = 'draft' | 'canon' | 'retired';

export interface NarrativeEntity {
  id: Id;
  kindId: Id;
  name: string;
  /**
   * Other names the documents use. Canon drifts: the same character is "the
   * Grey Warden", "Warden Aldous" and "Aldous" across three events, and an
   * import that cannot reconcile those produces three people.
   */
  aliases: string[];
  /** One or two sentences. What a reader needs to place it. */
  summary?: string;
  /** The long form, if there is one. Newlines preserved. */
  body?: string;
  tags: string[];
  status: EntityStatus;
  sources: SourceRef[];
  /**
   * What a character needs before this content is open to them -- the same
   * Condition the rules engine evaluates. A lore prop marked "Metaphysics 2"
   * carries `{ kind: 'trait', traitId: 'metaphysics', minLevel: 2 }`.
   *
   * Optional, and absent on most entities: a person or a place is not gated,
   * only the things a character reads or is told.
   */
  requires?: Condition;
  /** When it happened or was introduced, for ordering a timeline. */
  occursAt?: string;
}

export interface Relation {
  id: Id;
  kindId: Id;
  fromId: Id;
  toId: Id;
  /** Why, in a clause. "Left him for dead at the ford." */
  note?: string;
  sources: SourceRef[];
}

/* ------------------------------------------------------------------ *
 * The map
 * ------------------------------------------------------------------ */

export interface NarrativeMap {
  /** The ruleset this belongs to. One project, one map. */
  rulesetId: Id;
  entityKinds: EntityKind[];
  relationKinds: RelationKind[];
  entities: NarrativeEntity[];
  relations: Relation[];
  updatedAt: string;
}

/** A map with nothing in it, and no vocabulary assumed. */
export function emptyNarrativeMap(rulesetId: Id): NarrativeMap {
  return {
    rulesetId,
    entityKinds: [],
    relationKinds: [],
    entities: [],
    relations: [],
    updatedAt: new Date().toISOString(),
  };
}
