import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { createSessionToken, hashSessionToken } from '../auth/credentials';
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
