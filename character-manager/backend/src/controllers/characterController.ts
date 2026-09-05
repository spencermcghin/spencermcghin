import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import type { Character } from '../../../shared/rules-schema';
import {
  availableTraits,
  balances,
  indexRuleset,
  validate,
  type Phase,
} from '../../../shared/engine';
import { getStore } from '../db';

export async function listCharacters(req: Request, res: Response) {
  const store = getStore();
  if (!(await store.getRuleset(req.params.rulesetId))) {
    return res.status(404).json({ message: 'Ruleset not found' });
  }
  res.json(await store.listCharacters(req.params.rulesetId));
}

export async function createCharacter(req: Request, res: Response) {
  const store = getStore();
  const ruleset = await store.getRuleset(req.params.rulesetId);
  if (!ruleset) return res.status(404).json({ message: 'Ruleset not found' });

  const name = String(req.body?.name ?? '').trim();
  if (!name) return res.status(400).json({ message: 'A name is required' });

  const now = new Date().toISOString();
  const awarded: Record<string, number> = {};
  for (const budget of ruleset.startingBudget) {
    awarded[budget.currencyId] = budget.amount;
  }

  const character: Character = {
    id: randomUUID(),
    rulesetId: ruleset.id,
    name,
    packageIds: [],
    traitLevels: {},
    trackPositions: {},
    awarded,
    fieldValues: { name },
    createdAt: now,
    updatedAt: now,
  };

  await store.putCharacter(character);
  res.status(201).json(character);
}

export async function getCharacter(req: Request, res: Response) {
  const character = await getStore().getCharacter(req.params.id);
  if (!character) return res.status(404).json({ message: 'Character not found' });
  res.json(character);
}

export async function updateCharacter(req: Request, res: Response) {
  const store = getStore();
  const existing = await store.getCharacter(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Character not found' });

  // id and rulesetId are immutable; moving a character between rulesets would
  // leave its traits referencing definitions that no longer exist.
  const updated: Character = {
    ...existing,
    ...req.body,
    id: existing.id,
    rulesetId: existing.rulesetId,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await store.putCharacter(updated);
  res.json(updated);
}

export async function deleteCharacter(req: Request, res: Response) {
  const removed = await getStore().deleteCharacter(req.params.id);
  if (!removed) return res.status(404).json({ message: 'Character not found' });
  res.status(204).send();
}

/**
 * The character plus everything the engine derives from it: balances, rule
 * violations, and the gated menu of what can be bought next. Computed
 * server-side so a client cannot disagree with the rules.
 */
export async function getCharacterSheet(req: Request, res: Response) {
  const store = getStore();
  const character = await store.getCharacter(req.params.id);
  if (!character) return res.status(404).json({ message: 'Character not found' });

  const ruleset = await store.getRuleset(character.rulesetId);
  if (!ruleset) {
    return res.status(409).json({
      message: 'The ruleset this character belongs to no longer exists',
    });
  }

  const phase: Phase = req.query.phase === 'creation' ? 'creation' : 'advancement';
  const idx = indexRuleset(ruleset);

  res.json({
    character,
    ruleset,
    balances: balances(character, idx),
    violations: validate(character, idx, phase),
    available: availableTraits(character, idx, phase),
  });
}
