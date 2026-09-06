/**
 * Brings a stored ruleset up to the current schema.
 *
 * Rulesets are persisted as documents, so one written before a field existed
 * simply does not have it. Reading such a document must not crash, and every
 * consumer defending itself individually is how a field gets forgotten
 * somewhere and fails in production instead of here.
 *
 * So there is one place that fills in what a document is missing, applied on
 * read. Adding a field to Ruleset means adding a default here; nothing else
 * has to change.
 *
 * Only absence is repaired. Values that are present are left exactly as they
 * are, including ones this version does not recognise -- discarding them
 * would silently destroy data written by a newer version.
 */

import type { Ruleset } from './rules-schema';

/** Fields that are arrays on Ruleset, and must exist even when empty. */
const ARRAY_FIELDS = [
  'startingBudget',
  'currencies',
  'packageTiers',
  'packageAttributes',
  'traitAttributes',
  'packages',
  'traitGroups',
  'traits',
  'tracks',
  'purchaseRules',
  'sheet',
] as const;

export function normalizeRuleset(raw: unknown): Ruleset {
  const r = { ...(raw as Record<string, unknown>) };

  for (const field of ARRAY_FIELDS) {
    if (!Array.isArray(r[field])) r[field] = [];
  }

  // Nested arrays that a partially-written document may also be missing.
  r.traits = (r.traits as Ruleset['traits']).map((trait) => ({
    ...trait,
    tags: Array.isArray(trait?.tags) ? trait.tags : [],
    tiers: Array.isArray(trait?.tiers)
      ? trait.tiers.map((tier) => ({
          ...tier,
          grants: Array.isArray(tier?.grants) ? tier.grants : [],
        }))
      : [],
  }));

  r.packages = (r.packages as Ruleset['packages']).map((pkg) => ({
    ...pkg,
    grants: Array.isArray(pkg?.grants) ? pkg.grants : [],
    attributes: pkg?.attributes ?? {},
  }));

  r.tracks = (r.tracks as Ruleset['tracks']).map((track) => ({
    ...track,
    steps: Array.isArray(track?.steps) ? track.steps : [],
  }));

  r.sheet = (r.sheet as Ruleset['sheet']).map((section) => ({
    ...section,
    fields: Array.isArray(section?.fields) ? section.fields : [],
  }));

  return r as unknown as Ruleset;
}
