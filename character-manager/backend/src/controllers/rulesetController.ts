import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import type { Ruleset } from '../../../shared/rules-schema';
import {
  canDeleteProject,
  canEditRuleset,
  canViewProject,
  isProjectStaff,
  type Viewer,
} from '../auth/permissions';
import { viewerFor } from '../auth/viewer';
import { filterRulesetForViewer } from '../../../shared/visibility';
import { normalizeRuleset } from '../../../shared/normalize';
import { demoRuleset } from '../../../shared/rulesets/demo';
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
    traitAttributes: [],
    qualities: [],
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
 * Loads a ruleset the caller may act on at the given level.
 *
 * A project the caller cannot see reports 404 rather than 403, so an id
 * cannot be confirmed by probing. An insufficient role inside a project they
 * *can* see reports 403, which is honest and actionable.
 */
async function loadFor(
  req: Request,
  res: Response,
  level: 'view' | 'edit' | 'delete'
): Promise<{ ruleset: Ruleset; ownerId: string; viewer: Viewer } | null> {
  const id = req.params.id ?? req.params.rulesetId;
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

  const allowed =
    level === 'view'
      ? true
      : level === 'edit'
        ? canEditRuleset(viewer)
        : canDeleteProject(viewer);

  if (!allowed) {
    res.status(403).json({ message: 'Only project admins can do that.' });
    return null;
  }
  return { ruleset: owned.value, ownerId: owned.ownerId, viewer };
}

export async function listRulesets(req: Request, res: Response) {
  res.json(await getStore().listRulesetsForUser(req.user!.id));
}

export async function getRuleset(req: Request, res: Response) {
  const loaded = await loadFor(req, res, 'view');
  if (!loaded) return;

  // Staff may ask for the ruleset as a specific member receives it
  // (?viewAs=<userId>). The filter runs with that member's roles and without
  // staff privilege, so what comes back is byte-for-byte what that player's
  // own request would get -- the point of the feature is that there is no
  // second code path to drift out of sync. Read-only by nature: it changes
  // only this response, never who is acting.
  const viewAs = typeof req.query.viewAs === 'string' ? req.query.viewAs : null;
  if (viewAs) {
    if (!isProjectStaff(loaded.viewer)) {
      return res.status(403).json({ message: 'Only project staff can view as a member.' });
    }
    const store = getStore();
    const [membership, roleIds] = await Promise.all([
      store.getMembership(req.params.id, viewAs),
      store.getMemberAccessRoles(req.params.id, viewAs),
    ]);
    if (!membership) {
      return res.status(404).json({ message: 'That member is not in this project.' });
    }
    return res.json(
      filterRulesetForViewer(loaded.ruleset, {
        // A member who is themselves project admin sees everything; honour
        // that rather than pretend their view is gated.
        isStaff: membership === 'admin',
        roleIds,
      })
    );
  }

  // Gated skills are removed here, on the way out, rather than hidden in the
  // client: a member must never receive a skill their roles do not allow, or
  // the gate is cosmetic. Staff get the ruleset whole.
  res.json(
    filterRulesetForViewer(loaded.ruleset, {
      isStaff: isProjectStaff(loaded.viewer),
      roleIds: loaded.viewer.accessRoles,
    })
  );
}

export async function createRuleset(req: Request, res: Response) {
  const name = String(req.body?.name ?? '').trim();
  if (!name) return res.status(400).json({ message: 'A name is required' });

  const id = newRulesetId(name);

  // Starting from the demo is how someone gets a worked example back after
  // deleting theirs, or gets one at all if their account predates it. A copy,
  // so editing it affects nothing else.
  const ruleset: Ruleset =
    req.body?.template === 'demo'
      ? { ...structuredClone(demoRuleset), id, name }
      : blankRuleset(id, name);

  if (typeof req.body?.description === 'string') {
    ruleset.description = req.body.description;
  }

  const store = getStore();
  await store.putRuleset(ruleset, req.user!.id);
  // Whoever creates a project administers it.
  await store.addMember(ruleset.id, req.user!.id, 'admin');
  res.status(201).json(ruleset);
}

export async function replaceRuleset(req: Request, res: Response) {
  const loaded = await loadFor(req, res, 'edit');
  if (!loaded) return;

  const incoming = req.body as Ruleset;
  const problems = validateRulesetShape(incoming);
  if (problems.length > 0) {
    return res.status(400).json({ message: 'Invalid ruleset', problems });
  }

  // The path is authoritative; a mismatched body id would orphan characters.
  // The original owner is preserved -- an admin editing someone else's
  // project must not take ownership of it as a side effect.
  const saved = await getStore().putRuleset(
    { ...incoming, id: req.params.id },
    loaded.ownerId
  );
  res.json(saved);
}

export async function deleteRuleset(req: Request, res: Response) {
  if (!(await loadFor(req, res, 'delete'))) return;
  await getStore().deleteRuleset(req.params.id);
  res.status(204).send();
}

export async function importRuleset(req: Request, res: Response) {
  const incoming = req.body as Ruleset;
  const problems = validateRulesetShape(incoming);
  if (problems.length > 0) {
    return res.status(400).json({ message: 'Invalid ruleset', problems });
  }

  const store = getStore();
  const saved = await store.putRuleset(
    normalizeRuleset({ ...incoming, id: newRulesetId(incoming.name) }),
    req.user!.id
  );
  await store.addMember(saved.id, req.user!.id, 'admin');
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

  // Optional, so only checked when present: a malformed accessRoles or a
  // visibleTo naming a role that does not exist would silently mis-gate skills.
  if (x.accessRoles !== undefined) {
    if (!Array.isArray(x.accessRoles)) {
      problems.push('accessRoles must be an array');
    } else {
      const roleIds = new Set(x.accessRoles.map((a) => a.id));
      if (Array.isArray(x.traits)) {
        for (const trait of x.traits) {
          for (const rid of trait.visibleTo ?? []) {
            if (!roleIds.has(rid)) {
              problems.push(
                `Trait "${trait.id}" is visible to unknown access role "${rid}"`
              );
            }
          }
        }
      }
    }
  }

  return problems;
}
