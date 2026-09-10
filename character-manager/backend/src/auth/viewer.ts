import type { Request } from 'express';
import { getStore } from '../db';
import type { Viewer } from './permissions';

/**
 * Builds the viewer for a permission check against one project.
 *
 * Requires an authenticated request -- routes are guarded by requireAuth, so
 * req.user is present by the time any handler runs.
 */
export async function viewerFor(req: Request, rulesetId: string): Promise<Viewer> {
  const user = req.user!;
  const store = getStore();
  const [projectRole, accessRoles] = await Promise.all([
    store.getMembership(rulesetId, user.id),
    store.getMemberAccessRoles(rulesetId, user.id),
  ]);
  return {
    userId: user.id,
    appRole: user.appRole,
    projectRole,
    accessRoles,
  };
}

/** For checks that do not concern a specific project. */
export function appViewer(req: Request): Viewer {
  const user = req.user!;
  return { userId: user.id, appRole: user.appRole, projectRole: null, accessRoles: [] };
}
