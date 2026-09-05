import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import type { Character, Ruleset } from '../../../shared/rules-schema';
import {
  availableTraits,
  balances,
  indexRuleset,
  validate,
  type Phase,
} from '../../../shared/engine';
import { getStore } from '../db';

/**
 * Resources the caller does not own report 404 rather than 403 -- a 403 would
 * confirm the id exists.
 */
async function loadOwnedRuleset(req: Request, res: Response): Promise<Ruleset | null> {
  const owned = await getStore().getRuleset(req.params.rulesetId);
  if (!owned || owned.ownerId !== req.user!.id) {
    res.status(404).json({ message: 'Ruleset not found' });
    return null;
  }
  return owned.value;
}

async function loadOwnedCharacter(req: Request, res: Response): Promise<Character | null> {
  const owned = await getStore().getCharacter(req.params.id);
  if (!owned || owned.ownerId !== req.user!.id) {
    res.status(404).json({ message: 'Character not found' });
    return null;
  }
  return owned.value;
}

export async function listCharacters(req: Request, res: Response) {
  if (!(await loadOwnedRuleset(req, res))) return;
  res.json(await getStore().listCharacters(req.params.rulesetId, req.user!.id));
}

export async function createCharacter(req: Request, res: Response) {
  const ruleset = await loadOwnedRuleset(req, res);
  if (!ruleset) return;

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

  await getStore().putCharacter(character, req.user!.id);
  res.status(201).json(character);
}

export async function getCharacter(req: Request, res: Response) {
  const character = await loadOwnedCharacter(req, res);
  if (character) res.json(character);
}

export async function updateCharacter(req: Request, res: Response) {
  const existing = await loadOwnedCharacter(req, res);
  if (!existing) return;

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

  await getStore().putCharacter(updated, req.user!.id);
  res.json(updated);
}

export async function deleteCharacter(req: Request, res: Response) {
  if (!(await loadOwnedCharacter(req, res))) return;
  await getStore().deleteCharacter(req.params.id);
  res.status(204).send();
}

/**
 * The character plus everything the engine derives from it: balances, rule
 * violations, and the gated menu of what can be bought next. Computed
 * server-side so a client cannot disagree with the rules.
 */
export async function getCharacterSheet(req: Request, res: Response) {
  const character = await loadOwnedCharacter(req, res);
  if (!character) return;

  const owned = await getStore().getRuleset(character.rulesetId);
  if (!owned) {
    return res.status(409).json({
      message: 'The ruleset this character belongs to no longer exists',
    });
  }

  const phase: Phase = req.query.phase === 'creation' ? 'creation' : 'advancement';
  const idx = indexRuleset(owned.value);

  res.json({
    character,
    ruleset: owned.value,
    balances: balances(character, idx),
    violations: validate(character, idx, phase),
    available: availableTraits(character, idx, phase),
  });
}
