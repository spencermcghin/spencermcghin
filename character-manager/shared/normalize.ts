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

import type { NarrativeMap } from './narrative-schema';
import type { Character, Ruleset } from './rules-schema';

/** Fields that are arrays on Ruleset, and must exist even when empty. */
const ARRAY_FIELDS = [
  'startingBudget',
  'currencies',
  'packageTiers',
  'packageAttributes',
  'traitAttributes',
  'qualities',
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

/**
 * The same job for a stored character.
 *
 * Characters are documents too, and one saved before qualities existed has
 * no qualityIds. The engine could defend itself at each use, but that is the
 * arrangement this file exists to replace: repair once, on read.
 */
export function normalizeCharacter(raw: unknown): Character {
  const c = { ...(raw as Record<string, unknown>) };

  if (!Array.isArray(c.packageIds)) c.packageIds = [];
  if (!Array.isArray(c.qualityIds)) c.qualityIds = [];
  if (typeof c.traitLevels !== 'object' || c.traitLevels === null) c.traitLevels = {};
  if (typeof c.trackPositions !== 'object' || c.trackPositions === null) {
    c.trackPositions = {};
  }
  if (typeof c.awarded !== 'object' || c.awarded === null) c.awarded = {};
  if (typeof c.fieldValues !== 'object' || c.fieldValues === null) c.fieldValues = {};

  return c as unknown as Character;
}

/**
 * The same job for a stored narrative map.
 *
 * A map saved before a field existed simply does not have it, and a project
 * that has never had one at all should read as empty rather than as broken.
 * The rulesetId is taken from the row's key rather than trusted from the
 * document, so a copied map cannot claim to belong to another project.
 */
export function normalizeNarrative(raw: unknown, rulesetId: string): NarrativeMap {
  const m = { ...(raw as Record<string, unknown>) };

  for (const field of ['entityKinds', 'relationKinds', 'entities', 'relations']) {
    if (!Array.isArray(m[field])) m[field] = [];
  }

  m.entities = (m.entities as NarrativeMap['entities']).map((e) => ({
    ...e,
    aliases: Array.isArray(e?.aliases) ? e.aliases : [],
    tags: Array.isArray(e?.tags) ? e.tags : [],
    sources: Array.isArray(e?.sources) ? e.sources : [],
    status: e?.status ?? 'draft',
  }));

  m.relations = (m.relations as NarrativeMap['relations']).map((r) => ({
    ...r,
    sources: Array.isArray(r?.sources) ? r.sources : [],
  }));

  m.rulesetId = rulesetId;
  if (typeof m.updatedAt !== 'string') m.updatedAt = new Date(0).toISOString();

  return m as unknown as NarrativeMap;
}
