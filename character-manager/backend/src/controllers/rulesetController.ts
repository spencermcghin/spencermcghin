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
      .slice(0, 48) || 'ruleset'
  );
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
      {
        id: 'points',
        name: 'Build Points',
        abbreviation: 'BP',
        kind: 'progression',
      },
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
        fields: [
          { id: 'name', label: 'Character Name', type: 'shortText', required: true },
        ],
      },
    ],
  };
}

export async function listRulesets(_req: Request, res: Response) {
  res.json(await getStore().listRulesets());
}

export async function getRuleset(req: Request, res: Response) {
  const ruleset = await getStore().getRuleset(req.params.id);
  if (!ruleset) return res.status(404).json({ message: 'Ruleset not found' });
  res.json(ruleset);
}

export async function createRuleset(req: Request, res: Response) {
  const store = getStore();
  const name = String(req.body?.name ?? '').trim();
  if (!name) return res.status(400).json({ message: 'A name is required' });

  // Slug collisions are possible across projects, so fall back to a suffix.
  let id = slugify(name);
  if (await store.getRuleset(id)) id = `${id}-${randomUUID().slice(0, 6)}`;

  const ruleset = blankRuleset(id, name);
  if (typeof req.body?.description === 'string') {
    ruleset.description = req.body.description;
  }

  await store.putRuleset(ruleset);
  res.status(201).json(ruleset);
}

export async function replaceRuleset(req: Request, res: Response) {
  const store = getStore();
  if (!(await store.getRuleset(req.params.id))) {
    return res.status(404).json({ message: 'Ruleset not found' });
  }

  const incoming = req.body as Ruleset;
  const problems = validateRulesetShape(incoming);
  if (problems.length > 0) {
    return res.status(400).json({ message: 'Invalid ruleset', problems });
  }

  // The path is authoritative; a mismatched body id would orphan characters.
  const saved = await store.putRuleset({ ...incoming, id: req.params.id });
  res.json(saved);
}

export async function deleteRuleset(req: Request, res: Response) {
  const removed = await getStore().deleteRuleset(req.params.id);
  if (!removed) return res.status(404).json({ message: 'Ruleset not found' });
  res.status(204).send();
}

export async function importRuleset(req: Request, res: Response) {
  const store = getStore();
  const incoming = req.body as Ruleset;
  const problems = validateRulesetShape(incoming);
  if (problems.length > 0) {
    return res.status(400).json({ message: 'Invalid ruleset', problems });
  }

  let id = slugify(incoming.name);
  if (await store.getRuleset(id)) id = `${id}-${randomUUID().slice(0, 6)}`;

  const saved = await store.putRuleset({ ...incoming, id });
  res.status(201).json(saved);
}

/**
 * Structural check only -- enough to reject a body that would break the
 * engine or the designer. Rule-level coherence is the designer's job.
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
