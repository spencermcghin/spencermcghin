/**
 * Abstract LARP ruleset schema.
 *
 * A "Project" in the app is one Ruleset. Nothing here is specific to any
 * single game -- Eldritch is encoded as a fixture in ./rulesets/eldritch.ts
 * to prove the model holds against a real, published system.
 *
 * Two decisions carry most of the generality:
 *
 *   1. `Condition` is a boolean expression tree rather than a flat list of
 *      prerequisites. Every gate in a real ruleset -- compound prereqs, rank
 *      gates, "not before session 5", per-tag level caps -- is expressible
 *      without adding new fields.
 *
 *   2. `Grant` includes a `choice` variant. Published rulesets are full of
 *      "you get A or B", and flattening that away loses the player's decision.
 */

export type Id = string;

/* ------------------------------------------------------------------ *
 * Currencies
 * ------------------------------------------------------------------ */

export interface Currency {
  id: Id;
  name: string;
  /** Short form shown in tight UI, e.g. "CP". */
  abbreviation?: string;
  /**
   * progression - spent to advance the character permanently (CP, Influence)
   * economy     - circulates in play (coin, crafting resources)
   */
  kind: 'progression' | 'economy';
  startingAmount?: number;
}

export interface Cost {
  currencyId: Id;
  amount: number;
}

/* ------------------------------------------------------------------ *
 * Timeline
 *
 * The ordered sequence of sessions. Progression and many rule gates are
 * anchored to position in this sequence.
 * ------------------------------------------------------------------ */

export interface Timeline {
  /** What one entry is called in this game: "Event", "Game", "Chapter". */
  unitLabel: string;
  entries: TimelineEntry[];
}

export interface TimelineEntry {
  /** 1-based position. Conditions compare against this. */
  index: number;
  label: string;
  /** Awarded to every character after this entry, attended or not. */
  grants: Grant[];
}

/* ------------------------------------------------------------------ *
 * Conditions
 *
 * Evaluated against a character plus campaign state. Composable.
 * ------------------------------------------------------------------ */

export type Condition =
  | { kind: 'always' }
  | { kind: 'never' }
  /** Character has `traitId` at `minLevel` or higher. */
  | { kind: 'trait'; traitId: Id; minLevel: number }
  /** Character holds a given package (archetype). */
  | { kind: 'package'; packageId: Id }
  /** Character holds any package in a tier, e.g. any advanced archetype. */
  | { kind: 'packageTier'; tier: string }
  /** Position on a progression track, e.g. Rank >= 2. */
  | { kind: 'track'; trackId: Id; minStep: number }
  /** Campaign has reached timeline index N. */
  | { kind: 'timelineAtOrAfter'; index: number }
  /** Campaign has not yet reached timeline index N. */
  | { kind: 'timelineBefore'; index: number }
  /** Cap on how high traits carrying `tag` may be taken. */
  | { kind: 'tagLevelCap'; tag: string; maxLevel: number }
  /** Trait is granted by one of the character's own packages. */
  | { kind: 'grantedByOwnPackage'; traitId: Id }
  | { kind: 'all'; of: Condition[] }
  | { kind: 'any'; of: Condition[] }
  | { kind: 'not'; of: Condition };

/* ------------------------------------------------------------------ *
 * Grants
 *
 * What a package, trait tier, track step, or timeline entry hands out.
 * ------------------------------------------------------------------ */

export type Grant =
  | { kind: 'currency'; currencyId: Id; amount: number }
  | { kind: 'item'; itemId: Id; quantity: number }
  | { kind: 'trait'; traitId: Id; level: number }
  /** Player picks `pick` of `from`. Models "Hunting 1 or Farming 1". */
  | { kind: 'choice'; pick: number; from: Grant[] }
  /** Open-ended pick constrained by a condition, e.g. "any level 1 lore skill". */
  | { kind: 'traitChoice'; count: number; level: number; matching: Condition }
  /** Capacity for a relationship type, e.g. a retainer slot. */
  | { kind: 'slot'; relationshipId: Id; count: number }
  | { kind: 'effectAccess'; effectId: Id }
  | { kind: 'modifier'; modifier: Modifier }
  /** Free-text grant the engine cannot evaluate; shown to staff at check-in. */
  | { kind: 'note'; text: string };

/* ------------------------------------------------------------------ *
 * Modifiers
 *
 * Cost and value transforms. Stacking and rounding are explicit because
 * real rulesets disagree about both, and getting it wrong changes outcomes.
 * ------------------------------------------------------------------ */

export interface Modifier {
  id: Id;
  label: string;
  target:
    | { kind: 'trackStepCost'; trackId: Id }
    | { kind: 'traitCost'; tag?: string; traitId?: Id }
    | { kind: 'packageCost'; packageId?: Id }
    | { kind: 'roleplayDuration'; activityTag: string };
  operation: 'percentReduction' | 'percentIncrease' | 'flatReduction';
  value: number;
  /**
   * successive - apply one after another to the running total (Eldritch default)
   * additive   - sum the percentages, then apply once
   * exclusive  - only the single largest applies
   */
  stacking: 'successive' | 'additive' | 'exclusive';
  rounding: 'halfUp' | 'down' | 'up';
  /** Only active while this holds, e.g. "while retained by a Noble". */
  activeWhen?: Condition;
}

/* ------------------------------------------------------------------ *
 * Traits (skills)
 * ------------------------------------------------------------------ */

export interface TraitGroup {
  id: Id;
  name: string;
  description?: string;
  /** Gate on the whole group, e.g. advanced trees need the archetype. */
  requires?: Condition;
  /** Groups may nest: an archetype's primary / general / signature trees. */
  parentId?: Id;
}

export interface Trait {
  id: Id;
  name: string;
  groupId: Id;
  /** Free-form classifiers conditions can target: "crafting", "signature". */
  tags: string[];
  tiers: TraitTier[];
}

export interface TraitTier {
  /** 1-based. Tier N normally requires tier N-1, stated explicitly in `requires`. */
  level: number;
  description: string;
  cost: Cost;
  requires: Condition;
  grants: Grant[];
}

/* ------------------------------------------------------------------ *
 * Packages (archetypes)
 * ------------------------------------------------------------------ */

export interface PackageTier {
  id: string;
  name: string;
  /** How many of this tier a character may hold. */
  maxHeld: number;
}

export interface CharacterPackage {
  id: Id;
  name: string;
  tier: string;
  cost: Cost;
  requires: Condition;
  grants: Grant[];
  /**
   * Ruleset-defined fields that carry no engine semantics but must be
   * displayed -- Eldritch's "Retainer Benefit" and "Salary" live here.
   * Keys are declared on Ruleset.packageAttributes.
   */
  attributes: Record<string, string>;
  notes?: string;
}

/* ------------------------------------------------------------------ *
 * Progression tracks
 *
 * A ladder advanced with a currency, separate from trait purchase.
 * Eldritch's Rank is one; a game could define several.
 * ------------------------------------------------------------------ */

export interface ProgressionTrack {
  id: Id;
  name: string;
  currencyId: Id;
  requires?: Condition;
  steps: TrackStep[];
  /** e.g. { per: 'timelineEntry', count: 1 } -- "advance once per event". */
  advanceLimit?: { per: 'timelineEntry'; count: number };
}

export interface TrackStep {
  index: number;
  label?: string;
  /** null when entry cost is defined elsewhere, e.g. the archetype's own cost. */
  cost: Cost | null;
  unlocks: Grant[];
}

/* ------------------------------------------------------------------ *
 * Effects
 * ------------------------------------------------------------------ */

export interface Effect {
  id: Id;
  name: string;
  description: string;
  delivery: 'targeted' | 'mass' | 'carded' | 'self';
  category: string;
  /** Omit for effects with no fixed duration. */
  durationSeconds?: number;
  /** Effect ids this one may coexist with. Empty means it stacks with nothing. */
  stacksWith: Id[];
  /** Traits or effects that can cancel this. */
  negatedBy: Id[];
}

/* ------------------------------------------------------------------ *
 * Relationships
 *
 * Typed character-to-character links with eligibility rules and a payload.
 * Eldritch's Retainer system is the worked case.
 * ------------------------------------------------------------------ */

export interface RelationshipType {
  id: Id;
  name: string;
  holderLabel: string;
  memberLabel: string;
  /** The holder needs slots, normally granted by a trait. */
  holderRequires: Condition;
  /** Evaluated against the prospective member. */
  memberEligibility: Condition;
  /**
   * Package attribute keys read off the member when the link is active --
   * Eldritch reads "retainerBenefit" and "salary" off the member's card.
   */
  payloadAttributes: string[];
}

/* ------------------------------------------------------------------ *
 * Items
 * ------------------------------------------------------------------ */

export interface ItemDef {
  id: Id;
  name: string;
  category: string;
  tags: string[];
  description?: string;
  /** Present when the item is produced by crafting. */
  recipe?: {
    /** Trait gating production, e.g. Blacksmith at the schematic's level. */
    requires: Condition;
    inputs: { itemId: Id; quantity: number }[];
    level: number;
  };
}

/* ------------------------------------------------------------------ *
 * Character sheet layout
 *
 * Narrative fields vary per game, so they are declared rather than fixed.
 * ------------------------------------------------------------------ */

export interface SheetField {
  id: Id;
  label: string;
  type: 'shortText' | 'longText' | 'number' | 'select';
  options?: string[];
  required: boolean;
  helpText?: string;
}

export interface SheetSection {
  id: Id;
  title: string;
  fields: SheetField[];
}

/* ------------------------------------------------------------------ *
 * Ruleset
 * ------------------------------------------------------------------ */

export interface Ruleset {
  id: Id;
  name: string;
  version: string;
  description?: string;
  currencies: Currency[];
  timeline: Timeline;
  packageTiers: PackageTier[];
  /** Declares the ruleset-defined keys allowed in CharacterPackage.attributes. */
  packageAttributes: { key: string; label: string }[];
  packages: CharacterPackage[];
  traitGroups: TraitGroup[];
  traits: Trait[];
  tracks: ProgressionTrack[];
  effects: Effect[];
  relationships: RelationshipType[];
  items: ItemDef[];
  sheet: SheetSection[];
  /** Caps and gates applied to every purchase, e.g. creation-time level caps. */
  globalRules: GlobalRule[];
}

export interface GlobalRule {
  id: Id;
  label: string;
  /** When this holds... */
  when: Condition;
  /** ...the purchase must also satisfy this. */
  require: Condition;
  /** Shown when a character violates the rule. */
  message: string;
  phase: 'creation' | 'advancement' | 'both';
}

/* ------------------------------------------------------------------ *
 * Character instance
 * ------------------------------------------------------------------ */

export interface Character {
  id: Id;
  rulesetId: Id;
  name: string;
  packageIds: Id[];
  traitLevels: Record<Id, number>;
  trackPositions: Record<Id, number>;
  currencyBalances: Record<Id, number>;
  fieldValues: Record<Id, string | number>;
  inventory: { itemId: Id; quantity: number }[];
  /** Timeline index the character entered play at. */
  joinedAtIndex: number;
  createdAt: string;
  updatedAt: string;
}
