import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import type { Character, Ruleset } from '../../../shared/rules-schema';
import {
  availableTraits,
  balances,
  indexRuleset,
  pendingChecks,
  validate,
  type Phase,
} from '../../../shared/engine';
import {
  canCreateCharacter,
  canEditCharacter,
  canGrantStaffQualities,
  canViewCharacter,
  canViewProject,
  type RosterEntry,
  type Viewer,
} from '../auth/permissions';
import { viewerFor } from '../auth/viewer';
import { getStore, type CharacterRow } from '../db';

/** Projects the caller cannot see report 404, so ids cannot be probed. */
async function loadProject(
  req: Request,
  res: Response
): Promise<{ ruleset: Ruleset; viewer: Viewer } | null> {
  const id = req.params.rulesetId;
  const owned = await getStore().getRuleset(id);
  if (!owned) {
    res.status(404).json({ message: 'Ruleset not found' });
    return null;
  }
  const viewer = await viewerFor(req, id);
  if (!canViewProject(viewer)) {
    res.status(404).json({ message: 'Ruleset not found' });
    return null;
  }
  return { ruleset: owned.value, viewer };
}

async function loadCharacter(
  req: Request,
  res: Response,
  level: 'view' | 'edit'
): Promise<{ row: CharacterRow; viewer: Viewer } | null> {
  const row = await getStore().getCharacter(req.params.id);
  if (!row) {
    res.status(404).json({ message: 'Character not found' });
    return null;
  }

  const viewer = await viewerFor(req, row.character.rulesetId);
  const allowed =
    level === 'view'
      ? canViewCharacter(viewer, row.ownerId)
      : canEditCharacter(viewer, row.ownerId);

  if (!allowed) {
    // Someone in the project knows this character exists -- it is on the
    // roster -- so 403 is the honest answer rather than pretending otherwise.
    if (canViewProject(viewer)) {
      res.status(403).json({ message: "You can only open your own characters." });
    } else {
      res.status(404).json({ message: 'Character not found' });
    }
    return null;
  }
  return { row, viewer };
}

function toRoster(row: CharacterRow, viewerId: string): RosterEntry {
  return {
    id: row.character.id,
    name: row.character.name,
    packageIds: row.character.packageIds,
    ownerId: row.ownerId,
    ownerName: row.ownerName,
    isMine: row.ownerId === viewerId,
  };
}

/**
 * Members see a roster -- who is in the game and roughly what they play --
 * while project staff and a character's own player see the full record. The
 * reduction happens here rather than in the client, so a build is never sent
 * to someone who should not have it.
 */
export async function listCharacters(req: Request, res: Response) {
  const project = await loadProject(req, res);
  if (!project) return;

  const rows = await getStore().listCharacters(req.params.rulesetId);
  const { viewer } = project;

  res.json(
    rows.map((row) =>
      canViewCharacter(viewer, row.ownerId)
        ? { ...toRoster(row, viewer.userId), character: row.character }
        : toRoster(row, viewer.userId)
    )
  );
}

export async function createCharacter(req: Request, res: Response) {
  const project = await loadProject(req, res);
  if (!project) return;
  if (!canCreateCharacter(project.viewer)) {
    return res.status(403).json({ message: 'You cannot add characters to this project.' });
  }

  const name = String(req.body?.name ?? '').trim();
  if (!name) return res.status(400).json({ message: 'A name is required' });

  const now = new Date().toISOString();
  const awarded: Record<string, number> = {};
  for (const budget of project.ruleset.startingBudget) {
    awarded[budget.currencyId] = budget.amount;
  }

  const character: Character = {
    id: randomUUID(),
    rulesetId: project.ruleset.id,
    name,
    packageIds: [],
    traitLevels: {},
    trackPositions: {},
    qualityIds: [],
    awarded,
    fieldValues: { name },
    createdAt: now,
    updatedAt: now,
  };

  await getStore().putCharacter(character, req.user!.id);
  res.status(201).json(character);
}

export async function getCharacter(req: Request, res: Response) {
  const loaded = await loadCharacter(req, res, 'view');
  if (loaded) res.json(loaded.row.character);
}

/**
 * Keeps staff-granted qualities as they were when the editor is not staff.
 *
 * A player may hold one -- it is on their sheet -- but only staff may add or
 * remove it. Enforced here rather than by hiding the control, because a
 * hidden control is not a permission.
 */
async function reconcileQualities(
  submitted: string[],
  existing: string[],
  rulesetId: string,
  viewer: Viewer
): Promise<string[]> {
  if (canGrantStaffQualities(viewer)) return submitted;

  const owned = await getStore().getRuleset(rulesetId);
  const staffOnly = new Set(
    (owned?.value.qualities ?? [])
      .filter((q) => q.grantedBy === 'staff')
      .map((q) => q.id)
  );

  // Take the player's list for everything else, and the stored list for the
  // staff-granted ones, so neither can be smuggled in or dropped.
  return [
    ...submitted.filter((id) => !staffOnly.has(id)),
    ...existing.filter((id) => staffOnly.has(id)),
  ];
}

export async function updateCharacter(req: Request, res: Response) {
  const loaded = await loadCharacter(req, res, 'edit');
  if (!loaded) return;

  const existing = loaded.row.character;
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

  updated.qualityIds = await reconcileQualities(
    Array.isArray(updated.qualityIds) ? updated.qualityIds : [],
    existing.qualityIds ?? [],
    existing.rulesetId,
    loaded.viewer
  );

  // The original owner is preserved: staff editing a player's sheet must not
  // take the character away from them.
  await getStore().putCharacter(updated, loaded.row.ownerId);
  res.json(updated);
}

export async function deleteCharacter(req: Request, res: Response) {
  const loaded = await loadCharacter(req, res, 'edit');
  if (!loaded) return;
  await getStore().deleteCharacter(req.params.id);
  res.status(204).send();
}

/**
 * The character plus everything the engine derives from it: balances, rule
 * violations, and the gated menu of what can be bought next. Computed
 * server-side so a client cannot disagree with the rules.
 */
export async function getCharacterSheet(req: Request, res: Response) {
  const loaded = await loadCharacter(req, res, 'view');
  if (!loaded) return;

  const character = loaded.row.character;
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
    checks: pendingChecks(character, idx),
    canEdit: canEditCharacter(loaded.viewer, loaded.row.ownerId),
    canGrantStaffQualities: canGrantStaffQualities(loaded.viewer),
    ownerName: loaded.row.ownerName,
  });
}
