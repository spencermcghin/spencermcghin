import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { createSessionToken, hashSessionToken } from '../auth/credentials';
import { stripAccessRole } from '../../../shared/ruleset-editor';
import { canManageMembers, canViewProject, type ProjectRole } from '../auth/permissions';
import { viewerFor } from '../auth/viewer';
import { getStore } from '../db';

const INVITE_TTL_DAYS = 30;

/**
 * Loads a project the caller may act on at the given level.
 *
 * A project the caller cannot see reports 404 rather than 403, so an id
 * cannot be confirmed by probing. An insufficient role inside a project the
 * caller *can* see reports 403, which is honest and actionable.
 */
async function authorize(
  req: Request,
  res: Response,
  level: 'view' | 'manage'
): Promise<boolean> {
  const rulesetId = req.params.id;
  const store = getStore();

  if (!(await store.getRuleset(rulesetId))) {
    res.status(404).json({ message: 'Project not found' });
    return false;
  }

  const viewer = await viewerFor(req, rulesetId);
  if (!canViewProject(viewer)) {
    res.status(404).json({ message: 'Project not found' });
    return false;
  }
  if (level === 'manage' && !canManageMembers(viewer)) {
    res.status(403).json({ message: 'Only project admins can do that.' });
    return false;
  }
  return true;
}

export async function listMembers(req: Request, res: Response) {
  if (!(await authorize(req, res, 'view'))) return;
  res.json(await getStore().listMembers(req.params.id));
}

export async function updateMemberRole(req: Request, res: Response) {
  if (!(await authorize(req, res, 'manage'))) return;

  const role = req.body?.role as ProjectRole;
  if (role !== 'admin' && role !== 'member') {
    return res.status(400).json({ message: 'Role must be "admin" or "member".' });
  }

  const store = getStore();
  const { id: rulesetId, userId } = req.params;

  // Demoting the last admin would leave the project unmanageable, with no
  // route back short of a database edit.
  if (role === 'member') {
    const current = await store.getMembership(rulesetId, userId);
    if (current === 'admin' && (await store.countAdmins(rulesetId)) <= 1) {
      return res
        .status(409)
        .json({ message: 'A project must keep at least one admin.' });
    }
  }

  if (!(await store.setMemberRole(rulesetId, userId, role))) {
    return res.status(404).json({ message: 'Member not found' });
  }
  res.json(await store.listMembers(rulesetId));
}

export async function setMemberAccessRoles(req: Request, res: Response) {
  if (!(await authorize(req, res, 'manage'))) return;

  const { id: rulesetId, userId } = req.params;
  const incoming = req.body?.accessRoles;
  if (
    !Array.isArray(incoming) ||
    incoming.some((r) => typeof r !== 'string')
  ) {
    return res
      .status(400)
      .json({ message: 'accessRoles must be an array of role ids.' });
  }

  const store = getStore();

  // Every id must name a role this project actually defines: assigning a
  // phantom role would grant nothing and quietly mislead the admin who set it.
  const defined = new Set((await store.listAccessRoles(rulesetId)).map((a) => a.id));
  const requested = [...new Set(incoming as string[])];
  const unknown = requested.filter((r) => !defined.has(r));
  if (unknown.length > 0) {
    return res
      .status(400)
      .json({ message: `Unknown access role(s): ${unknown.join(', ')}` });
  }

  if (!(await store.setMemberAccessRoles(rulesetId, userId, requested))) {
    return res.status(404).json({ message: 'Member not found' });
  }
  res.json(await store.listMembers(rulesetId));
}

/* ------------------------------------------------------------------ *
 * Access role definitions
 *
 * Governance, not game content: they live beside the membership, and
 * changing them never touches the ruleset document -- except deletion,
 * which scrubs the deleted id out of every skill's gate so no gate keeps
 * naming a role that no longer exists.
 * ------------------------------------------------------------------ */

function slugifyRole(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'role'
  );
}

export async function listAccessRoles(req: Request, res: Response) {
  if (!(await authorize(req, res, 'view'))) return;
  res.json(await getStore().listAccessRoles(req.params.id));
}

export async function createAccessRole(req: Request, res: Response) {
  if (!(await authorize(req, res, 'manage'))) return;

  const name = String(req.body?.name ?? '').trim();
  if (!name) return res.status(400).json({ message: 'A name is required.' });

  const store = getStore();
  const existing = await store.listAccessRoles(req.params.id);

  // The id is derived from the name once, at creation, and then never
  // changes: skills' gates and members' assignments point at it.
  const base = slugifyRole(name);
  let id = base;
  for (let n = 2; existing.some((r) => r.id === id); n++) id = `${base}-${n}`;

  const description = String(req.body?.description ?? '').trim() || undefined;
  const role = await store.putAccessRole(req.params.id, { id, name, description });
  res.status(201).json(role);
}

export async function updateAccessRole(req: Request, res: Response) {
  if (!(await authorize(req, res, 'manage'))) return;

  const store = getStore();
  const existing = (await store.listAccessRoles(req.params.id)).find(
    (r) => r.id === req.params.roleId
  );
  if (!existing) return res.status(404).json({ message: 'Role not found' });

  const name =
    req.body?.name !== undefined ? String(req.body.name).trim() : existing.name;
  if (!name) return res.status(400).json({ message: 'A name is required.' });
  const description =
    req.body?.description !== undefined
      ? String(req.body.description).trim() || undefined
      : existing.description;

  res.json(await store.putAccessRole(req.params.id, { id: existing.id, name, description }));
}

export async function deleteAccessRole(req: Request, res: Response) {
  if (!(await authorize(req, res, 'manage'))) return;

  const store = getStore();
  const { id: rulesetId, roleId } = req.params;

  if (!(await store.deleteAccessRole(rulesetId, roleId))) {
    return res.status(404).json({ message: 'Role not found' });
  }

  // Scrub the id from every gate, so no skill is left pointing at nothing.
  // Read-time filtering would tolerate the dangling id, but a document that
  // matches what its author sees is worth the write.
  const owned = await store.getRuleset(rulesetId);
  if (owned) {
    const stripped = stripAccessRole(owned.value, roleId);
    if (stripped !== owned.value) await store.putRuleset(stripped, owned.ownerId);
  }

  res.status(204).send();
}

export async function removeMember(req: Request, res: Response) {
  if (!(await authorize(req, res, 'manage'))) return;

  const store = getStore();
  const { id: rulesetId, userId } = req.params;

  const current = await store.getMembership(rulesetId, userId);
  if (current === 'admin' && (await store.countAdmins(rulesetId)) <= 1) {
    return res.status(409).json({ message: 'A project must keep at least one admin.' });
  }

  if (!(await store.removeMember(rulesetId, userId))) {
    return res.status(404).json({ message: 'Member not found' });
  }
  // Their characters stay with the project; removing the person should not
  // silently delete game history.
  res.status(204).send();
}

/* ------------------------------------------------------------------ *
 * Invites
 * ------------------------------------------------------------------ */

export async function listInvites(req: Request, res: Response) {
  if (!(await authorize(req, res, 'manage'))) return;
  res.json(await getStore().listInvites(req.params.id));
}

export async function createInvite(req: Request, res: Response) {
  if (!(await authorize(req, res, 'manage'))) return;

  // Same shape as a session token: the link carries the raw value, the
  // database stores only its hash.
  const { token, tokenHash } = createSessionToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invite = await getStore().createInvite({
    id: randomUUID(),
    tokenHash,
    rulesetId: req.params.id,
    createdBy: req.user!.id,
    expiresAt,
  });

  // The raw token is returned exactly once, at creation. It is not
  // recoverable afterwards -- a lost link is replaced, not looked up.
  res.status(201).json({ invite, token });
}

export async function revokeInvite(req: Request, res: Response) {
  if (!(await authorize(req, res, 'manage'))) return;
  const ok = await getStore().revokeInvite(req.params.inviteId, req.params.id);
  if (!ok) return res.status(404).json({ message: 'Invite not found or already revoked' });
  res.status(204).send();
}

async function resolveInvite(token: string) {
  const store = getStore();
  const invite = await store.findInviteByToken(hashSessionToken(token));
  if (!invite) return { error: 'This invite link is not valid.' as const };
  if (invite.revokedAt) return { error: 'This invite link has been revoked.' as const };
  if (invite.expiresAt && new Date(invite.expiresAt) <= new Date()) {
    return { error: 'This invite link has expired.' as const };
  }
  const owned = await store.getRuleset(invite.rulesetId);
  if (!owned) return { error: 'That project no longer exists.' as const };
  return { invite, ruleset: owned.value };
}

/** Lets the UI show what is being joined before the user commits. */
export async function previewInvite(req: Request, res: Response) {
  const result = await resolveInvite(req.params.token);
  if ('error' in result) return res.status(404).json({ message: result.error });

  res.json({
    projectId: result.ruleset.id,
    projectName: result.ruleset.name,
    alreadyMember:
      (await getStore().getMembership(result.ruleset.id, req.user!.id)) !== null,
  });
}

export async function acceptInvite(req: Request, res: Response) {
  const result = await resolveInvite(req.params.token);
  if ('error' in result) return res.status(404).json({ message: result.error });

  const store = getStore();
  const { invite, ruleset } = result;

  const existing = await store.getMembership(ruleset.id, req.user!.id);
  if (existing) {
    // Re-using a link you have already redeemed is a no-op, not an error.
    return res.json({ projectId: ruleset.id, role: existing, joined: false });
  }

  await store.addMember(ruleset.id, req.user!.id, 'member');
  await store.recordInviteUse(invite.id);
  res.status(201).json({ projectId: ruleset.id, role: 'member', joined: true });
}
