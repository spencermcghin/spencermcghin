/**
 * Role logic, kept pure and in one place.
 *
 * Every authorization decision in the API routes through a function here, so
 * the rules can be read in one sitting and tested without a database.
 */

export type AppRole = 'admin' | 'user';
export type ProjectRole = 'admin' | 'member';

export interface Viewer {
  userId: string;
  appRole: AppRole;
  /** The viewer's role in the project under consideration, if any. */
  projectRole: ProjectRole | null;
}

/** App admins act with project-admin authority everywhere. */
function isAdmin(v: Viewer): boolean {
  return v.appRole === 'admin' || v.projectRole === 'admin';
}

export function canViewProject(v: Viewer): boolean {
  return v.appRole === 'admin' || v.projectRole !== null;
}

export function canEditRuleset(v: Viewer): boolean {
  return isAdmin(v);
}

export function canDeleteProject(v: Viewer): boolean {
  return isAdmin(v);
}

export function canManageMembers(v: Viewer): boolean {
  return isAdmin(v);
}

export function canCreateCharacter(v: Viewer): boolean {
  return canViewProject(v);
}

/**
 * Full sheets are visible to their owner and to project staff. Everyone else
 * in the project sees only the roster.
 */
export function canViewCharacter(v: Viewer, characterOwnerId: string): boolean {
  return v.userId === characterOwnerId || isAdmin(v);
}

/**
 * Project admins can edit any character in their project -- staff routinely
 * need to award points or correct a build, and refusing that would push the
 * work back into a database console.
 */
export function canEditCharacter(v: Viewer, characterOwnerId: string): boolean {
  return v.userId === characterOwnerId || isAdmin(v);
}

/**
 * A quality marked `grantedBy: 'staff'` represents something the game gave
 * the character, so a player editing their own sheet must not be able to
 * award it to themselves. Everything else about that sheet they can edit.
 */
export function canGrantStaffQualities(v: Viewer): boolean {
  return isAdmin(v);
}

/**
 * Handing out points changes what every character in the game can afford, so
 * it is staff work. A player can spend their own points; only staff decide
 * how many they have.
 */
export function canAwardCurrency(v: Viewer): boolean {
  return isAdmin(v);
}

/** Only app admins manage accounts. */
export function canAdministerApp(v: Viewer): boolean {
  return v.appRole === 'admin';
}

/**
 * A member's view of someone else's character: enough to know who is in the
 * game and roughly what they play, without exposing the build.
 */
export interface RosterEntry {
  id: string;
  name: string;
  packageIds: string[];
  ownerId: string;
  ownerName: string;
  isMine: boolean;
}
