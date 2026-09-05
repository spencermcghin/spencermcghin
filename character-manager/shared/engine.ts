/**
 * Rules engine.
 *
 * Pure functions over (Ruleset, Character). No I/O, no framework -- the
 * designer, the character builder and the API all call the same code, so a
 * rule authored in the UI behaves identically wherever it is enforced.
 */

import type {
  CharacterPackage,
  Character,
  Condition,
  Cost,
  Grant,
  Id,
  Modifier,
  ProgressionTrack,
  Ruleset,
  Trait,
  TraitGroup,
} from './rules-schema';

export type Phase = 'creation' | 'advancement';

/* ------------------------------------------------------------------ *
 * Indexing
 * ------------------------------------------------------------------ */

export interface RulesetIndex {
  ruleset: Ruleset;
  traits: Map<Id, Trait>;
  groups: Map<Id, TraitGroup>;
  packages: Map<Id, CharacterPackage>;
  tracks: Map<Id, ProgressionTrack>;
}

export function indexRuleset(ruleset: Ruleset): RulesetIndex {
  return {
    ruleset,
    traits: new Map(ruleset.traits.map((t) => [t.id, t])),
    groups: new Map(ruleset.traitGroups.map((g) => [g.id, g])),
    packages: new Map(ruleset.packages.map((p) => [p.id, p])),
    tracks: new Map(ruleset.tracks.map((t) => [t.id, t])),
  };
}

/* ------------------------------------------------------------------ *
 * Condition evaluation
 * ------------------------------------------------------------------ */

export function evaluate(
  condition: Condition,
  character: Character,
  idx: RulesetIndex
): boolean {
  switch (condition.kind) {
    case 'always':
      return true;
    case 'never':
      return false;
    case 'trait':
      return (character.traitLevels[condition.traitId] ?? 0) >= condition.minLevel;
    case 'package':
      return character.packageIds.includes(condition.packageId);
    case 'packageTier':
      return character.packageIds.some(
        (id) => idx.packages.get(id)?.tier === condition.tier
      );
    case 'anyPackage':
      return condition.packageIds.some((id) => character.packageIds.includes(id));
    case 'track':
      return (character.trackPositions[condition.trackId] ?? -1) >= condition.minStep;
    case 'all':
      return condition.of.every((c) => evaluate(c, character, idx));
    case 'any':
      return condition.of.some((c) => evaluate(c, character, idx));
    case 'not':
      return !evaluate(condition.of, character, idx);
  }
}

/**
 * Human-readable rendering of a condition, for "why is this locked?" copy
 * and for labelling edges in the designer.
 */
export function describeCondition(condition: Condition, idx: RulesetIndex): string {
  switch (condition.kind) {
    case 'always':
      return 'No requirement';
    case 'never':
      return 'Unavailable';
    case 'trait': {
      const name = idx.traits.get(condition.traitId)?.name ?? condition.traitId;
      return `${name} ${condition.minLevel}`;
    }
    case 'package':
      return idx.packages.get(condition.packageId)?.name ?? condition.packageId;
    case 'packageTier': {
      const tier = idx.ruleset.packageTiers.find((t) => t.id === condition.tier);
      return `Any ${tier?.name ?? condition.tier}`;
    }
    case 'anyPackage':
      return condition.packageIds
        .map((id) => idx.packages.get(id)?.name ?? id)
        .join(' or ');
    case 'track': {
      const track = idx.tracks.get(condition.trackId);
      return `${track?.name ?? condition.trackId} ${condition.minStep}+`;
    }
    case 'all':
      return condition.of.map((c) => describeCondition(c, idx)).join(' and ');
    case 'any':
      return condition.of.map((c) => describeCondition(c, idx)).join(' or ');
    case 'not':
      return `not (${describeCondition(condition.of, idx)})`;
  }
}

/* ------------------------------------------------------------------ *
 * Grants
 * ------------------------------------------------------------------ */

/**
 * Traits handed to the character by packages they hold. Purchase rules can
 * treat these differently from traits bought with points.
 */
export function grantedTraits(character: Character, idx: RulesetIndex): Map<Id, number> {
  const out = new Map<Id, number>();

  const walk = (grants: Grant[]) => {
    for (const g of grants) {
      if (g.kind === 'trait') {
        out.set(g.traitId, Math.max(out.get(g.traitId) ?? 0, g.level));
      } else if (g.kind === 'choice') {
        // A choice is only resolved once the player picks. Until the app
        // records that pick, treat every option as potentially granted so
        // caps do not fire spuriously against a legitimate selection.
        walk(g.from);
      }
    }
  };

  for (const id of character.packageIds) {
    const pkg = idx.packages.get(id);
    if (pkg) walk(pkg.grants);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Modifiers
 * ------------------------------------------------------------------ */

/** Every modifier the character currently has active, from any source. */
export function activeModifiers(character: Character, idx: RulesetIndex): Modifier[] {
  const found: Modifier[] = [];

  const collect = (grants: Grant[]) => {
    for (const g of grants) {
      if (g.kind === 'modifier') found.push(g.modifier);
      else if (g.kind === 'choice') collect(g.from);
    }
  };

  for (const id of character.packageIds) {
    const pkg = idx.packages.get(id);
    if (pkg) collect(pkg.grants);
  }

  for (const [traitId, level] of Object.entries(character.traitLevels)) {
    const trait = idx.traits.get(traitId);
    if (!trait) continue;
    for (const tier of trait.tiers) {
      if (tier.level <= level) collect(tier.grants);
    }
  }

  for (const [trackId, position] of Object.entries(character.trackPositions)) {
    const track = idx.tracks.get(trackId);
    if (!track) continue;
    for (const step of track.steps) {
      if (step.index <= position) collect(step.unlocks);
    }
  }

  return found.filter(
    (m) => !m.activeWhen || evaluate(m.activeWhen, character, idx)
  );
}

function round(value: number, mode: Modifier['rounding']): number {
  if (mode === 'down') return Math.floor(value);
  if (mode === 'up') return Math.ceil(value);
  // "true rounding": 1.4 down, 1.5 up.
  return Math.round(value);
}

function matchesTarget(
  modifier: Modifier,
  target: ModifierTarget,
  idx: RulesetIndex
): boolean {
  const t = modifier.target;
  if (t.kind === 'trackStepCost') {
    return target.kind === 'track' && t.trackId === target.trackId;
  }
  if (t.kind === 'packageCost') {
    return (
      target.kind === 'package' &&
      (t.packageId === undefined || t.packageId === target.packageId)
    );
  }
  // traitCost
  if (target.kind !== 'trait') return false;
  if (t.traitId !== undefined) return t.traitId === target.traitId;
  if (t.tag !== undefined) {
    return idx.traits.get(target.traitId)?.tags.includes(t.tag) ?? false;
  }
  return true;
}

export type ModifierTarget =
  | { kind: 'trait'; traitId: Id }
  | { kind: 'track'; trackId: Id }
  | { kind: 'package'; packageId: Id };

/**
 * Applies matching modifiers to a base amount.
 *
 * Percentages are applied without intermediate rounding and the result is
 * rounded once at the end -- matching the worked example in the Eldritch
 * guide, where a 50% and a 25% reduction on 20 give 7.5 rather than 8.
 */
export function applyModifiers(
  base: number,
  target: ModifierTarget,
  character: Character,
  idx: RulesetIndex
): number {
  const applicable = activeModifiers(character, idx).filter((m) =>
    matchesTarget(m, target, idx)
  );
  if (applicable.length === 0) return base;

  const rounding = applicable[0].rounding;
  const stacking = applicable[0].stacking;

  if (stacking === 'exclusive') {
    const strongest = applicable.reduce((a, b) => (b.value > a.value ? b : a));
    return round(applyOne(base, strongest), rounding);
  }

  if (stacking === 'additive') {
    const pct = applicable
      .filter((m) => m.operation !== 'flatReduction')
      .reduce(
        (sum, m) => sum + (m.operation === 'percentReduction' ? m.value : -m.value),
        0
      );
    const flat = applicable
      .filter((m) => m.operation === 'flatReduction')
      .reduce((sum, m) => sum + m.value, 0);
    return round(Math.max(0, base * (1 - pct / 100) - flat), rounding);
  }

  // successive
  let running = base;
  for (const m of applicable) running = applyOne(running, m);
  return round(Math.max(0, running), rounding);
}

function applyOne(value: number, m: Modifier): number {
  switch (m.operation) {
    case 'percentReduction':
      return value * (1 - m.value / 100);
    case 'percentIncrease':
      return value * (1 + m.value / 100);
    case 'flatReduction':
      return value - m.value;
  }
}

/* ------------------------------------------------------------------ *
 * Costs
 * ------------------------------------------------------------------ */

export function traitTierCost(
  traitId: Id,
  level: number,
  character: Character,
  idx: RulesetIndex
): Cost | null {
  const tier = idx.traits.get(traitId)?.tiers.find((t) => t.level === level);
  if (!tier) return null;
  return {
    currencyId: tier.cost.currencyId,
    amount: applyModifiers(tier.cost.amount, { kind: 'trait', traitId }, character, idx),
  };
}

export function trackStepCost(
  trackId: Id,
  stepIndex: number,
  character: Character,
  idx: RulesetIndex
): Cost | null {
  const step = idx.tracks.get(trackId)?.steps.find((s) => s.index === stepIndex);
  if (!step || !step.cost) return null;
  return {
    currencyId: step.cost.currencyId,
    amount: applyModifiers(step.cost.amount, { kind: 'track', trackId }, character, idx),
  };
}

export function packageCost(
  packageId: Id,
  character: Character,
  idx: RulesetIndex
): Cost | null {
  const pkg = idx.packages.get(packageId);
  if (!pkg) return null;
  return {
    currencyId: pkg.cost.currencyId,
    amount: applyModifiers(
      pkg.cost.amount,
      { kind: 'package', packageId },
      character,
      idx
    ),
  };
}

/** Total spent per currency, derived from what the character holds. */
export function totalSpent(
  character: Character,
  idx: RulesetIndex
): Record<Id, number> {
  const spend: Record<Id, number> = {};
  const add = (cost: Cost | null) => {
    if (!cost) return;
    spend[cost.currencyId] = (spend[cost.currencyId] ?? 0) + cost.amount;
  };

  for (const id of character.packageIds) add(packageCost(id, character, idx));

  const granted = grantedTraits(character, idx);
  for (const [traitId, level] of Object.entries(character.traitLevels)) {
    const free = granted.get(traitId) ?? 0;
    for (let l = free + 1; l <= level; l++) add(traitTierCost(traitId, l, character, idx));
  }

  for (const [trackId, position] of Object.entries(character.trackPositions)) {
    for (let s = 0; s <= position; s++) add(trackStepCost(trackId, s, character, idx));
  }

  return spend;
}

/** Awarded minus spent, per currency. */
export function balances(character: Character, idx: RulesetIndex): Record<Id, number> {
  const spent = totalSpent(character, idx);
  const out: Record<Id, number> = {};
  for (const currency of idx.ruleset.currencies) {
    out[currency.id] = (character.awarded[currency.id] ?? 0) - (spent[currency.id] ?? 0);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Availability
 *
 * The archetype-gated menu: what can this character buy next, and where a
 * trait is unavailable, why. Locked entries are returned rather than
 * filtered out so the UI can show them greyed with a reason.
 * ------------------------------------------------------------------ */

export interface TraitOption {
  traitId: Id;
  name: string;
  groupId: Id;
  currentLevel: number;
  nextLevel: number | null;
  cost: Cost | null;
  status: 'available' | 'locked' | 'unaffordable' | 'maxed';
  /** Present when status is not 'available'. */
  reason?: string;
}

/** Walks up the group chain; a trait is gated by every ancestor group. */
function groupChainAllows(
  groupId: Id,
  character: Character,
  idx: RulesetIndex
): { ok: true } | { ok: false; reason: string } {
  let current = idx.groups.get(groupId);
  while (current) {
    if (current.requires && !evaluate(current.requires, character, idx)) {
      return {
        ok: false,
        reason: `Requires ${describeCondition(current.requires, idx)}`,
      };
    }
    current = current.parentId ? idx.groups.get(current.parentId) : undefined;
  }
  return { ok: true };
}

function capFor(
  trait: Trait,
  character: Character,
  idx: RulesetIndex,
  phase: Phase
): { maxLevel: number; message: string } | null {
  const granted = grantedTraits(character, idx);
  let tightest: { maxLevel: number; message: string } | null = null;

  for (const rule of idx.ruleset.purchaseRules) {
    if (rule.phase !== 'both' && rule.phase !== phase) continue;
    if (rule.appliesTo.tag && !trait.tags.includes(rule.appliesTo.tag)) continue;
    if (rule.appliesTo.groupId && trait.groupId !== rule.appliesTo.groupId) continue;
    if (rule.onlyIfNotGranted && granted.has(trait.id)) continue;
    if (!tightest || rule.maxLevel < tightest.maxLevel) {
      tightest = { maxLevel: rule.maxLevel, message: rule.message };
    }
  }
  return tightest;
}

export function availableTraits(
  character: Character,
  idx: RulesetIndex,
  phase: Phase = 'advancement'
): TraitOption[] {
  const bal = balances(character, idx);

  return idx.ruleset.traits.map((trait): TraitOption => {
    const currentLevel = character.traitLevels[trait.id] ?? 0;
    const nextTier = trait.tiers.find((t) => t.level === currentLevel + 1);
    const base: Omit<TraitOption, 'status'> = {
      traitId: trait.id,
      name: trait.name,
      groupId: trait.groupId,
      currentLevel,
      nextLevel: nextTier?.level ?? null,
      cost: null,
    };

    if (!nextTier) return { ...base, status: 'maxed', reason: 'At maximum level' };

    const groupCheck = groupChainAllows(trait.groupId, character, idx);
    if (!groupCheck.ok) return { ...base, status: 'locked', reason: groupCheck.reason };

    if (trait.requires && !evaluate(trait.requires, character, idx)) {
      return {
        ...base,
        status: 'locked',
        reason: `Requires ${describeCondition(trait.requires, idx)}`,
      };
    }

    if (!evaluate(nextTier.requires, character, idx)) {
      return {
        ...base,
        status: 'locked',
        reason: `Requires ${describeCondition(nextTier.requires, idx)}`,
      };
    }

    const cap = capFor(trait, character, idx, phase);
    if (cap && nextTier.level > cap.maxLevel) {
      return { ...base, status: 'locked', reason: cap.message };
    }

    const cost = traitTierCost(trait.id, nextTier.level, character, idx);
    const affordable = cost ? (bal[cost.currencyId] ?? 0) >= cost.amount : true;

    return {
      ...base,
      cost,
      status: affordable ? 'available' : 'unaffordable',
      reason: affordable ? undefined : 'Insufficient points',
    };
  });
}

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

export interface Violation {
  code:
    | 'unknown-trait'
    | 'unmet-prerequisite'
    | 'cap-exceeded'
    | 'group-locked'
    | 'overspent'
    | 'package-tier-limit'
    | 'package-requirement';
  message: string;
  subject?: Id;
}

/**
 * Checks a whole character against the ruleset. Prerequisites are evaluated
 * against the character minus the trait under test, so a trait cannot
 * satisfy its own requirement.
 */
export function validate(
  character: Character,
  idx: RulesetIndex,
  phase: Phase = 'advancement'
): Violation[] {
  const violations: Violation[] = [];

  // Package tier limits.
  for (const tier of idx.ruleset.packageTiers) {
    const held = character.packageIds.filter(
      (id) => idx.packages.get(id)?.tier === tier.id
    );
    if (held.length > tier.maxHeld) {
      violations.push({
        code: 'package-tier-limit',
        message: `Holds ${held.length} ${tier.name} packages; the limit is ${tier.maxHeld}.`,
      });
    }
  }

  // Package prerequisites.
  for (const id of character.packageIds) {
    const pkg = idx.packages.get(id);
    if (pkg && !evaluate(pkg.requires, character, idx)) {
      violations.push({
        code: 'package-requirement',
        subject: id,
        message: `${pkg.name} requires ${describeCondition(pkg.requires, idx)}.`,
      });
    }
  }

  const granted = grantedTraits(character, idx);

  for (const [traitId, level] of Object.entries(character.traitLevels)) {
    const trait = idx.traits.get(traitId);
    if (!trait) {
      violations.push({
        code: 'unknown-trait',
        subject: traitId,
        message: `Character holds "${traitId}", which is not defined in this ruleset.`,
      });
      continue;
    }

    const groupCheck = groupChainAllows(trait.groupId, character, idx);
    if (!groupCheck.ok) {
      violations.push({
        code: 'group-locked',
        subject: traitId,
        message: `${trait.name}: ${groupCheck.reason}.`,
      });
    }

    const cap = capFor(trait, character, idx, phase);
    if (cap && level > cap.maxLevel) {
      violations.push({
        code: 'cap-exceeded',
        subject: traitId,
        message: `${trait.name} is at level ${level}. ${cap.message}`,
      });
    }

    // Evaluate each tier's prerequisite against the character as they would
    // have been before taking that tier.
    for (let l = 1; l <= level; l++) {
      const tier = trait.tiers.find((t) => t.level === l);
      if (!tier) {
        violations.push({
          code: 'unknown-trait',
          subject: traitId,
          message: `${trait.name} has no level ${l} defined.`,
        });
        continue;
      }
      if (granted.get(traitId) !== undefined && l <= (granted.get(traitId) ?? 0)) {
        continue; // granted by a package, prerequisites waived
      }
      const priorSelf: Character = {
        ...character,
        traitLevels: { ...character.traitLevels, [traitId]: l - 1 },
      };
      if (!evaluate(tier.requires, priorSelf, idx)) {
        violations.push({
          code: 'unmet-prerequisite',
          subject: traitId,
          message: `${trait.name} ${l} requires ${describeCondition(tier.requires, idx)}.`,
        });
      }
    }
  }

  // Budget.
  for (const [currencyId, balance] of Object.entries(balances(character, idx))) {
    if (balance < 0) {
      const currency = idx.ruleset.currencies.find((c) => c.id === currencyId);
      violations.push({
        code: 'overspent',
        subject: currencyId,
        message: `Overspent ${currency?.name ?? currencyId} by ${Math.abs(balance)}.`,
      });
    }
  }

  return violations;
}
