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
