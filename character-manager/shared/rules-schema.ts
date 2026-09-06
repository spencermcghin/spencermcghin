/**
 * Abstract LARP ruleset schema.
 *
 * A "Project" in the app is one Ruleset. Nothing here is specific to any
 * single game -- Eldritch is encoded in ./rulesets/eldritch.ts to prove the
 * model holds against a real published system.
 *
 * The generality rests on two choices:
 *
 *   1. `Condition` is a boolean expression tree rather than a flat list of
 *      prerequisites. Compound prereqs, archetype gates, rank gates and
 *      per-tag caps are all expressible without adding fields.
 *
 *   2. `Grant` includes a `choice` variant. Published rulesets are full of
 *      "you get A or B"; flattening that away loses the player's decision.
 */

export type Id = string;

/* ------------------------------------------------------------------ *
 * Currencies
 * ------------------------------------------------------------------ */

export interface Currency {
  id: Id;
  name: string;
  /** Short form for tight UI, e.g. "CP". */
  abbreviation?: string;
  /**
   * progression - spent to permanently advance a character (CP, Influence)
   * economy     - circulates in play (coin)
   */
  kind: 'progression' | 'economy';
  startingAmount?: number;
}

export interface Cost {
  currencyId: Id;
  amount: number;
}

/* ------------------------------------------------------------------ *
 * Conditions
 *
 * Evaluated against a character. Composable.
 * ------------------------------------------------------------------ */

export type Condition =
  | { kind: 'always' }
  | { kind: 'never' }
  /** Character has `traitId` at `minLevel` or higher. */
  | { kind: 'trait'; traitId: Id; minLevel: number }
  /** Character holds a specific package. */
  | { kind: 'package'; packageId: Id }
  /** Character holds any package of a given tier. */
  | { kind: 'packageTier'; tier: string }
  /** Character holds any one of these packages. The archetype-gate case. */
  | { kind: 'anyPackage'; packageIds: Id[] }
  /** Position on a progression track, e.g. Rank >= 2. */
  | { kind: 'track'; trackId: Id; minStep: number }
  /** Character holds a named quality: an item, an origin, a plot boon. */
  | { kind: 'quality'; qualityId: Id }
  /**
   * A requirement no engine can decide: staff judgement, something that
   * happened in play, a test run at the event. It never blocks a purchase --
   * it is carried onto the sheet so a human can check it.
   *
   * Without this, an author meeting such a rule has two bad options: leave it
   * out of the rules entirely, or write `never` and make the skill
   * unbuyable. Saying "this one is decided by a person" is the honest third.
   */
  | { kind: 'manual'; text: string }
  | { kind: 'all'; of: Condition[] }
  | { kind: 'any'; of: Condition[] }
  | { kind: 'not'; of: Condition };

/* ------------------------------------------------------------------ *
 * Qualities
 *
 * Facts about a character that are not skills, archetypes or track
 * positions, but that rules gate on anyway: a piece of equipment, an origin,
 * a plot boon, membership of a faction. The Eldritch guide has both kinds --
 * Lockpicking needs "a lockpicking kit", Wayfinding needs "the Dusklander
 * background" -- and with no way to express them, a prerequisite like that
 * could only be written in prose and would go unenforced.
 *
 * Deliberately not modelled as items and backgrounds specifically. What one
 * game calls a background another calls a bloodline, a clearance or a patron;
 * naming only the general shape keeps the schema system-agnostic, and
 * `category` hands each game its own vocabulary back in the UI.
 * ------------------------------------------------------------------ */

export interface Quality {
  id: Id;
  name: string;
  /** This game's word for the sort of thing it is: "Background", "Gear". */
  category?: string;
  description?: string;
  /**
   * player - the player records it themselves; they know they own a kit.
   * staff  - only project staff may give or take it, because it represents
   *          something the game awarded rather than something a player has.
   */
  grantedBy: 'player' | 'staff';
}

/* ------------------------------------------------------------------ *
 * Grants
 * ------------------------------------------------------------------ */

export type Grant =
  | { kind: 'currency'; currencyId: Id; amount: number }
  | { kind: 'trait'; traitId: Id; level: number }
  /** Player picks `pick` of `from`. Models "Hunting 1 or Farming 1". */
  | { kind: 'choice'; pick: number; from: Grant[] }
  /** Open-ended pick, e.g. "any level 1 general skill". */
  | { kind: 'traitChoice'; count: number; level: number; matching: Condition }
  | { kind: 'modifier'; modifier: Modifier }
  /** Text the engine cannot evaluate; surfaced to staff and on the sheet. */
  | { kind: 'note'; text: string };

/* ------------------------------------------------------------------ *
 * Modifiers
 *
 * Cost transforms. Stacking and rounding are explicit because real rulesets
 * disagree about both and the difference changes outcomes.
 * ------------------------------------------------------------------ */

export interface Modifier {
  id: Id;
  label: string;
  target:
    | { kind: 'trackStepCost'; trackId: Id }
    | { kind: 'traitCost'; tag?: string; traitId?: Id }
    | { kind: 'packageCost'; packageId?: Id };
  operation: 'percentReduction' | 'percentIncrease' | 'flatReduction';
  value: number;
  /**
   * successive - applied one after another to the running total
   * additive   - percentages summed, then applied once
   * exclusive  - only the single largest applies
   */
  stacking: 'successive' | 'additive' | 'exclusive';
  rounding: 'halfUp' | 'down' | 'up';
  /** Only active while this holds. */
  activeWhen?: Condition;
}

/* ------------------------------------------------------------------ *
 * Traits (skills)
 * ------------------------------------------------------------------ */

export interface TraitGroup {
  id: Id;
  name: string;
  description?: string;
  /**
   * Gate on the whole group. This is how a tree is bound to an archetype:
   * { kind: 'package', packageId: 'knight' }.
   */
  requires?: Condition;
  /** Groups may nest, e.g. an archetype's primary / signature trees. */
  parentId?: Id;
}

export interface Trait {
  id: Id;
  name: string;
  groupId: Id;
  /**
   * Prose describing the skill as a whole -- what it is in the fiction, as
   * opposed to what each level mechanically does. Shown above the levels.
   * Newlines are preserved; keep it as long as it deserves to be.
   */
  summary?: string;
  /** Classifiers that conditions and purchase rules target: "crafting". */
  tags: string[];
  /**
   * Ruleset-defined fields with no engine semantics, keyed by
   * Ruleset.traitAttributes. This is where a game puts the things its own
   * players need on the page -- Eldritch's community planner carries a
   * "Calls" column for the verbals a skill grants, which is the first thing
   * anyone looks up at an event.
   */
  attributes?: Record<string, string>;
  /**
   * Gate on the trait as a whole, on top of its group's gate. Use for a
   * single skill restricted to certain archetypes without its own tree.
   */
  requires?: Condition;
  tiers: TraitTier[];
}

export interface TraitTier {
  /** 1-based. Tier N normally requires tier N-1, stated in `requires`. */
  level: number;
  /** What this level does, mechanically. Newlines are preserved. */
  description: string;
  /**
   * May be negative: a refund. Eldritch's Chemist Refund costs -1 CP,
   * handing a point back for taking it.
   */
  cost: Cost;
  requires: Condition;
  grants: Grant[];
  /** Per-level metadata, keyed by Ruleset.traitAttributes. */
  attributes?: Record<string, string>;
}

/* ------------------------------------------------------------------ *
 * Packages (archetypes)
 * ------------------------------------------------------------------ */

export interface PackageTier {
  id: string;
  name: string;
  /** How many packages of this tier a character may hold. */
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
   * Ruleset-defined display fields with no engine semantics. Keys are
   * declared on Ruleset.packageAttributes.
   */
  attributes: Record<string, string>;
  notes?: string;
}

/* ------------------------------------------------------------------ *
 * Progression tracks
 *
 * A ladder advanced with a currency, separate from trait purchase.
 * ------------------------------------------------------------------ */

export interface ProgressionTrack {
  id: Id;
  name: string;
  currencyId: Id;
  requires?: Condition;
  steps: TrackStep[];
}

export interface TrackStep {
  index: number;
  label?: string;
  /** null when entry is paid for elsewhere, e.g. by the package's own cost. */
  cost: Cost | null;
  unlocks: Grant[];
}

/* ------------------------------------------------------------------ *
 * Purchase rules
 *
 * Caps applied across the board rather than per trait.
 * ------------------------------------------------------------------ */

export interface PurchaseRule {
  id: Id;
  label: string;
  message: string;
  phase: 'creation' | 'advancement' | 'both';
  /** Which traits this constrains. Omit all selectors to mean every trait. */
  appliesTo: { tag?: string; groupId?: string };
  maxLevel: number;
  /** Only constrain traits the character's packages did not grant. */
  onlyIfNotGranted?: boolean;
}

/* ------------------------------------------------------------------ *
 * Character sheet layout
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
  /** Progression currency a new character starts with. */
  startingBudget: Cost[];
  currencies: Currency[];
  packageTiers: PackageTier[];
  packageAttributes: { key: string; label: string }[];
  /**
   * Declares the metadata fields skills may carry. `scope` decides whether a
   * value belongs to the skill as a whole or varies per level: a skill's
   * source book is the same at every level, the verbals it grants are not.
   */
  traitAttributes: { key: string; label: string; scope: 'trait' | 'tier' }[];
  /** Non-skill facts a rule may require. See the Qualities section above. */
  qualities: Quality[];
  packages: CharacterPackage[];
  traitGroups: TraitGroup[];
  traits: Trait[];
  tracks: ProgressionTrack[];
  purchaseRules: PurchaseRule[];
  sheet: SheetSection[];
}

/* ------------------------------------------------------------------ *
 * Character instance
 * ------------------------------------------------------------------ */

export interface Character {
  id: Id;
  rulesetId: Id;
  name: string;
  packageIds: Id[];
  /** traitId -> highest level held. */
  traitLevels: Record<Id, number>;
  /** trackId -> current step index. */
  trackPositions: Record<Id, number>;
  /** Qualities the character holds. Unordered; a set in all but name. */
  qualityIds: Id[];
  /**
   * currencyId -> total ever awarded. Remaining balance is derived by the
   * engine as awarded minus computed spend, so a stored balance can never
   * drift out of sync with what the character actually holds.
   */
  awarded: Record<Id, number>;
  fieldValues: Record<Id, string | number>;
  createdAt: string;
  updatedAt: string;
}
