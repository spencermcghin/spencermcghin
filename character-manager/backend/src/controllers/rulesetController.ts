import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import type { Ruleset } from '../../../shared/rules-schema';
import { getStore } from '../db';

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'ruleset'
  );
}

/**
 * Ruleset ids are globally unique, so a suffix is always appended rather than
 * only on collision. Probing for a free slug would otherwise reveal that some
 * other account holds one.
 */
function newRulesetId(name: string): string {
  return `${slugify(name)}-${randomUUID().slice(0, 8)}`;
}

/** An empty but valid ruleset, so a new project opens on something coherent. */
function blankRuleset(id: string, name: string): Ruleset {
  return {
    id,
    name,
    version: '0.1',
    description: '',
    startingBudget: [{ currencyId: 'points', amount: 10 }],
    currencies: [
      { id: 'points', name: 'Build Points', abbreviation: 'BP', kind: 'progression' },
    ],
    packageTiers: [{ id: 'base', name: 'Archetype', maxHeld: 1 }],
    packageAttributes: [],
    packages: [],
    traitGroups: [{ id: 'general', name: 'General Skills' }],
    traits: [],
    tracks: [],
    purchaseRules: [],
    sheet: [
      {
        id: 'identity',
        title: 'Identity',
        fields: [{ id: 'name', label: 'Character Name', type: 'shortText', required: true }],
      },
    ],
  };
}

/**
 * Loads a ruleset the caller owns.
 *
 * A ruleset owned by someone else reports 404 rather than 403 -- distinguishing
 * them would confirm that an id exists.
 */
async function loadOwned(req: Request, res: Response): Promise<Ruleset | null> {
  const owned = await getStore().getRuleset(req.params.id ?? req.params.rulesetId);
  if (!owned || owned.ownerId !== req.user!.id) {
    res.status(404).json({ message: 'Ruleset not found' });
    return null;
  }
  return owned.value;
}

export async function listRulesets(req: Request, res: Response) {
  res.json(await getStore().listRulesets(req.user!.id));
}

export async function getRuleset(req: Request, res: Response) {
  const ruleset = await loadOwned(req, res);
  if (ruleset) res.json(ruleset);
}

export async function createRuleset(req: Request, res: Response) {
  const name = String(req.body?.name ?? '').trim();
  if (!name) return res.status(400).json({ message: 'A name is required' });

  const ruleset = blankRuleset(newRulesetId(name), name);
  if (typeof req.body?.description === 'string') {
    ruleset.description = req.body.description;
  }

  await getStore().putRuleset(ruleset, req.user!.id);
  res.status(201).json(ruleset);
}

export async function replaceRuleset(req: Request, res: Response) {
  if (!(await loadOwned(req, res))) return;

  const incoming = req.body as Ruleset;
  const problems = validateRulesetShape(incoming);
  if (problems.length > 0) {
    return res.status(400).json({ message: 'Invalid ruleset', problems });
  }

  // The path is authoritative; a mismatched body id would orphan characters.
  const saved = await getStore().putRuleset(
    { ...incoming, id: req.params.id },
    req.user!.id
  );
  res.json(saved);
}

export async function deleteRuleset(req: Request, res: Response) {
  if (!(await loadOwned(req, res))) return;
  await getStore().deleteRuleset(req.params.id);
  res.status(204).send();
}

export async function importRuleset(req: Request, res: Response) {
  const incoming = req.body as Ruleset;
  const problems = validateRulesetShape(incoming);
  if (problems.length > 0) {
    return res.status(400).json({ message: 'Invalid ruleset', problems });
  }

  const saved = await getStore().putRuleset(
    { ...incoming, id: newRulesetId(incoming.name) },
    req.user!.id
  );
  res.status(201).json(saved);
}

/**
 * Structural check only -- enough to reject a body that would break the engine
 * or the designer. Rule-level coherence is the designer's job.
 */
function validateRulesetShape(r: unknown): string[] {
  const problems: string[] = [];
  if (!r || typeof r !== 'object') return ['Body must be an object'];

  const x = r as Partial<Ruleset>;
  if (typeof x.name !== 'string' || !x.name.trim()) problems.push('name is required');
  if (typeof x.version !== 'string') problems.push('version is required');

  for (const key of [
    'currencies',
    'packages',
    'packageTiers',
    'traitGroups',
    'traits',
    'tracks',
    'purchaseRules',
    'sheet',
    'startingBudget',
  ] as const) {
    if (!Array.isArray(x[key])) problems.push(`${key} must be an array`);
  }

  if (Array.isArray(x.traits) && Array.isArray(x.traitGroups)) {
    const groupIds = new Set(x.traitGroups.map((g) => g.id));
    for (const trait of x.traits) {
      if (!groupIds.has(trait.groupId)) {
        problems.push(`Trait "${trait.id}" references unknown group "${trait.groupId}"`);
      }
    }
  }

  return problems;
}
