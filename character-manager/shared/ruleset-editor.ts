/**
 * The editing operations a ruleset designer performs.
 *
 * Pure and immutable: every operation takes a Ruleset and returns a new one,
 * so the UI can hold a ruleset in state, apply an edit, and re-run validation
 * without mutating anything mid-render. Undo is a stack of past values.
 *
 * These deliberately do not enforce referential integrity. An editor must
 * tolerate a half-finished state -- you add a prerequisite before creating the
 * skill it points at, or delete a skill and fix its dependents afterwards.
 * Coherence is reported by validateRuleset, continuously, rather than by
 * refusing the edit.
 *
 * The operation set is proved sufficient by ruleset-editor.test.ts, which
 * rebuilds Eldritch from an empty ruleset using nothing else.
 */

import type {
  CharacterPackage,
  Condition,
  Cost,
  Currency,
  Grant,
  Id,
  PackageTier,
  ProgressionTrack,
  PurchaseRule,
  Ruleset,
  SheetField,
  SheetSection,
  TrackStep,
  Trait,
  TraitGroup,
  TraitTier,
} from './rules-schema';

/* ------------------------------------------------------------------ *
 * Creation
 * ------------------------------------------------------------------ */

/**
 * A ruleset with nothing in it. Not valid to play -- it has no currency and
 * no skills -- but a coherent starting point that validateRuleset can report
 * on as the author fills it in.
 */
export function emptyRuleset(id: Id, name: string): Ruleset {
  return {
    id,
    name,
    version: '0.1',
    description: '',
    startingBudget: [],
    currencies: [],
    packageTiers: [],
    packageAttributes: [],
    traitAttributes: [],
    packages: [],
    traitGroups: [],
    traits: [],
    tracks: [],
    purchaseRules: [],
    sheet: [],
  };
}

export function setMeta(
  r: Ruleset,
  meta: Partial<Pick<Ruleset, 'name' | 'version' | 'description'>>
): Ruleset {
  return { ...r, ...meta };
}

export function setStartingBudget(r: Ruleset, budget: Cost[]): Ruleset {
  return { ...r, startingBudget: budget };
}

/* ------------------------------------------------------------------ *
 * Currencies
 * ------------------------------------------------------------------ */

export function addCurrency(r: Ruleset, currency: Currency): Ruleset {
  return { ...r, currencies: [...r.currencies, currency] };
}

export function updateCurrency(
  r: Ruleset,
  id: Id,
  patch: Partial<Currency>
): Ruleset {
  return {
    ...r,
    currencies: r.currencies.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  };
}

export function removeCurrency(r: Ruleset, id: Id): Ruleset {
  return { ...r, currencies: r.currencies.filter((c) => c.id !== id) };
}

/* ------------------------------------------------------------------ *
 * Package tiers and attributes
 * ------------------------------------------------------------------ */

export function addPackageTier(r: Ruleset, tier: PackageTier): Ruleset {
  return { ...r, packageTiers: [...r.packageTiers, tier] };
}

export function removePackageTier(r: Ruleset, id: string): Ruleset {
  return { ...r, packageTiers: r.packageTiers.filter((t) => t.id !== id) };
}

/** Declares a metadata field every skill (or skill level) may fill in. */
export function addTraitAttribute(
  r: Ruleset,
  attribute: { key: string; label: string; scope: 'trait' | 'tier' }
): Ruleset {
  return { ...r, traitAttributes: [...r.traitAttributes, attribute] };
}

export function setTraitAttribute(
  r: Ruleset,
  traitId: Id,
  key: string,
  value: string
): Ruleset {
  const trait = r.traits.find((t) => t.id === traitId);
  if (!trait) return r;
  return updateTrait(r, traitId, {
    attributes: { ...(trait.attributes ?? {}), [key]: value },
  });
}

export function setTierAttribute(
  r: Ruleset,
  traitId: Id,
  level: number,
  key: string,
  value: string
): Ruleset {
  const tier = r.traits.find((t) => t.id === traitId)?.tiers.find((x) => x.level === level);
  if (!tier) return r;
  return updateTier(r, traitId, level, {
    attributes: { ...(tier.attributes ?? {}), [key]: value },
  });
}

/** Declares a display-only field every package may fill in. */
export function addPackageAttribute(
  r: Ruleset,
  attribute: { key: string; label: string }
): Ruleset {
  return { ...r, packageAttributes: [...r.packageAttributes, attribute] };
}

/* ------------------------------------------------------------------ *
 * Packages
 * ------------------------------------------------------------------ */

export function addPackage(r: Ruleset, pkg: CharacterPackage): Ruleset {
  return { ...r, packages: [...r.packages, pkg] };
}

export function updatePackage(
  r: Ruleset,
  id: Id,
  patch: Partial<CharacterPackage>
): Ruleset {
  return {
    ...r,
    packages: r.packages.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  };
}

export function removePackage(r: Ruleset, id: Id): Ruleset {
  return { ...r, packages: r.packages.filter((p) => p.id !== id) };
}

export function addPackageGrant(r: Ruleset, id: Id, grant: Grant): Ruleset {
  return updatePackage(r, id, {
    grants: [...(r.packages.find((p) => p.id === id)?.grants ?? []), grant],
  });
}

/* ------------------------------------------------------------------ *
 * Trait groups
 * ------------------------------------------------------------------ */

export function addGroup(r: Ruleset, group: TraitGroup): Ruleset {
  return { ...r, traitGroups: [...r.traitGroups, group] };
}

export function updateGroup(r: Ruleset, id: Id, patch: Partial<TraitGroup>): Ruleset {
  return {
    ...r,
    traitGroups: r.traitGroups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
  };
}

/**
 * Removes a group. Traits left in it are not deleted -- losing a player's
 * skill definitions because a container was removed would be far worse than
 * the dangling reference validateRuleset reports instead.
 */
export function removeGroup(r: Ruleset, id: Id): Ruleset {
  return { ...r, traitGroups: r.traitGroups.filter((g) => g.id !== id) };
}

/* ------------------------------------------------------------------ *
 * Traits and tiers
 * ------------------------------------------------------------------ */

export function addTrait(r: Ruleset, trait: Trait): Ruleset {
  return { ...r, traits: [...r.traits, trait] };
}

export function updateTrait(r: Ruleset, id: Id, patch: Partial<Trait>): Ruleset {
  return {
    ...r,
    traits: r.traits.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  };
}

export function removeTrait(r: Ruleset, id: Id): Ruleset {
  return { ...r, traits: r.traits.filter((t) => t.id !== id) };
}

export function addTier(r: Ruleset, traitId: Id, tier: TraitTier): Ruleset {
  return {
    ...r,
    traits: r.traits.map((t) =>
      t.id === traitId ? { ...t, tiers: [...t.tiers, tier] } : t
    ),
  };
}

export function updateTier(
  r: Ruleset,
  traitId: Id,
  level: number,
  patch: Partial<TraitTier>
): Ruleset {
  return {
    ...r,
    traits: r.traits.map((t) =>
      t.id === traitId
        ? {
            ...t,
            tiers: t.tiers.map((tier) =>
              tier.level === level ? { ...tier, ...patch } : tier
            ),
          }
        : t
    ),
  };
}

export function removeTier(r: Ruleset, traitId: Id, level: number): Ruleset {
  return {
    ...r,
    traits: r.traits.map((t) =>
      t.id === traitId
        ? { ...t, tiers: t.tiers.filter((tier) => tier.level !== level) }
        : t
    ),
  };
}

/* ------------------------------------------------------------------ *
 * Tracks
 * ------------------------------------------------------------------ */

export function addTrack(r: Ruleset, track: ProgressionTrack): Ruleset {
  return { ...r, tracks: [...r.tracks, track] };
}

export function updateTrack(
  r: Ruleset,
  id: Id,
  patch: Partial<ProgressionTrack>
): Ruleset {
  return { ...r, tracks: r.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
}

export function removeTrack(r: Ruleset, id: Id): Ruleset {
  return { ...r, tracks: r.tracks.filter((t) => t.id !== id) };
}

export function addTrackStep(r: Ruleset, trackId: Id, step: TrackStep): Ruleset {
  return {
    ...r,
    tracks: r.tracks.map((t) =>
      t.id === trackId ? { ...t, steps: [...t.steps, step] } : t
    ),
  };
}

/* ------------------------------------------------------------------ *
 * Purchase rules
 * ------------------------------------------------------------------ */

export function addPurchaseRule(r: Ruleset, rule: PurchaseRule): Ruleset {
  return { ...r, purchaseRules: [...r.purchaseRules, rule] };
}

export function removePurchaseRule(r: Ruleset, id: Id): Ruleset {
  return { ...r, purchaseRules: r.purchaseRules.filter((p) => p.id !== id) };
}

/* ------------------------------------------------------------------ *
 * Character sheet
 * ------------------------------------------------------------------ */

export function addSheetSection(r: Ruleset, section: SheetSection): Ruleset {
  return { ...r, sheet: [...r.sheet, section] };
}

export function addSheetField(r: Ruleset, sectionId: Id, field: SheetField): Ruleset {
  return {
    ...r,
    sheet: r.sheet.map((s) =>
      s.id === sectionId ? { ...s, fields: [...s.fields, field] } : s
    ),
  };
}

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */

export function setNodePosition(
  r: Ruleset,
  nodeId: Id,
  position: { x: number; y: number }
): Ruleset {
  return { ...r, layout: { ...(r.layout ?? {}), [nodeId]: position } };
}

/* ------------------------------------------------------------------ *
 * Prerequisites
 *
 * On the canvas a prerequisite is an edge, but in the schema it is a clause
 * inside a boolean expression that may already hold several others. These
 * translate between the two: drawing an edge conjoins a clause, deleting one
 * removes it, and the surrounding structure is preserved either way.
 * ------------------------------------------------------------------ */

/** The trait clauses directly conjoined at the top level of a condition. */
export function prerequisiteEdges(
  condition: Condition
): { traitId: Id; minLevel: number }[] {
  if (condition.kind === 'trait') {
    return [{ traitId: condition.traitId, minLevel: condition.minLevel }];
  }
  if (condition.kind === 'all') {
    return condition.of.flatMap(prerequisiteEdges);
  }
  // Clauses under `any` or `not` are not simple edges -- an edge implies a
  // hard requirement, and these do not. They stay editable as raw conditions.
  return [];
}

function conjoin(condition: Condition, clause: Condition): Condition {
  if (condition.kind === 'always') return clause;
  if (condition.kind === 'all') return { kind: 'all', of: [...condition.of, clause] };
  return { kind: 'all', of: [condition, clause] };
}

/** Drops every top-level trait clause naming `traitId`, keeping structure. */
function withoutTrait(condition: Condition, traitId: Id): Condition {
  if (condition.kind === 'trait') {
    return condition.traitId === traitId ? { kind: 'always' } : condition;
  }
  if (condition.kind === 'all') {
    const kept = condition.of
      .map((c) => withoutTrait(c, traitId))
      .filter((c) => c.kind !== 'always');
    if (kept.length === 0) return { kind: 'always' };
    if (kept.length === 1) return kept[0];
    return { kind: 'all', of: kept };
  }
  return condition;
}

/**
 * Adds "requires `requiredTraitId` at `minLevel`" to one tier.
 *
 * Re-adding an existing prerequisite updates its level rather than stacking a
 * second clause for the same skill, so dragging an edge twice cannot produce
 * a condition that contradicts itself.
 */
export function addPrerequisite(
  r: Ruleset,
  traitId: Id,
  level: number,
  requiredTraitId: Id,
  minLevel = 1
): Ruleset {
  const tier = r.traits.find((t) => t.id === traitId)?.tiers.find((x) => x.level === level);
  if (!tier) return r;

  const clause: Condition = { kind: 'trait', traitId: requiredTraitId, minLevel };
  const existing = prerequisiteEdges(tier.requires).some(
    (e) => e.traitId === requiredTraitId
  );

  const requires = existing
    ? conjoin(withoutTrait(tier.requires, requiredTraitId), clause)
    : conjoin(tier.requires, clause);

  return updateTier(r, traitId, level, { requires });
}

export function removePrerequisite(
  r: Ruleset,
  traitId: Id,
  level: number,
  requiredTraitId: Id
): Ruleset {
  const tier = r.traits.find((t) => t.id === traitId)?.tiers.find((x) => x.level === level);
  if (!tier) return r;
  return updateTier(r, traitId, level, {
    requires: withoutTrait(tier.requires, requiredTraitId),
  });
}

/**
 * The track positions a condition demands, at the top level.
 *
 * The counterpart to prerequisiteEdges: a Rank gate is structurally the same
 * kind of clause as a skill prerequisite, so it can be read back the same way.
 * That is what lets a view group skills by Rank without anyone maintaining a
 * separate field -- the grouping is derived from the rule, not duplicated
 * beside it.
 */
export function trackGates(
  condition: Condition
): { trackId: Id; minStep: number }[] {
  if (condition.kind === 'track') {
    return [{ trackId: condition.trackId, minStep: condition.minStep }];
  }
  if (condition.kind === 'all') return condition.of.flatMap(trackGates);
  // As with prerequisites, a clause under `any` or `not` is not a hard gate
  // and must not be presented as one.
  return [];
}

/**
 * A skill's position on a track, taken as the highest step any of its levels
 * demands. Null when the skill is not gated on that track at all.
 */
export function trackPositionOf(
  trait: Trait,
  trackId: Id
): number | null {
  let highest: number | null = null;
  const consider = (c: Condition) => {
    for (const g of trackGates(c)) {
      if (g.trackId === trackId) {
        highest = highest === null ? g.minStep : Math.max(highest, g.minStep);
      }
    }
  };
  if (trait.requires) consider(trait.requires);
  for (const tier of trait.tiers) consider(tier.requires);
  return highest;
}

/**
 * The dimensions a ruleset can meaningfully be grouped by in a list view.
 *
 * All are derived from what the ruleset already says, so a new grouping costs
 * an author nothing. A game with no tracks simply offers fewer.
 */
export function groupingDimensions(
  r: Ruleset
): { id: string; label: string; buckets: number }[] {
  const dims = [
    { id: 'group', label: 'Tree', buckets: r.traitGroups.length },
  ];
  for (const track of r.tracks) {
    dims.push({ id: `track:${track.id}`, label: track.name, buckets: track.steps.length });
  }
  const tags = new Set(r.traits.flatMap((t) => t.tags));
  if (tags.size > 0) dims.push({ id: 'tag', label: 'Tag', buckets: tags.size });
  return dims;
}
