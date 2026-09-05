import type { Character, Ruleset } from '../../../shared/rules-schema';
import type { AppRole, ProjectRole } from '../auth/permissions';

export interface RulesetSummary {
  id: string;
  name: string;
  version: string;
  description?: string;
  characterCount: number;
  updatedAt: string;
  /** The requesting user's role in this project. */
  role: ProjectRole;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  appRole: AppRole;
  createdAt: string;
}

/** Only ever loaded during authentication; never returned to a client. */
export interface UserWithSecret extends User {
  passwordHash: string;
}

export interface Member {
  userId: string;
  displayName: string;
  email: string;
  role: ProjectRole;
  joinedAt: string;
}

export interface Invite {
  id: string;
  rulesetId: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  uses: number;
}

/**
 * Ownership and membership are storage concerns, not part of the rules domain
 * -- the engine has no notion of who owns a ruleset. They are carried
 * alongside the document rather than inside it.
 */
export interface Owned<T> {
  value: T;
  ownerId: string;
}

export interface CharacterRow {
  character: Character;
  ownerId: string;
  ownerName: string;
}

export interface Store {
  init(): Promise<void>;
  close(): Promise<void>;

  /* --- accounts --- */
  createUser(input: {
    email: string;
    displayName: string;
    passwordHash: string;
    appRole?: AppRole;
  }): Promise<User>;
  findUserByEmail(email: string): Promise<UserWithSecret | null>;
  findUserById(id: string): Promise<User | null>;
  countUsers(): Promise<number>;
  listUsers(): Promise<User[]>;
  setAppRole(userId: string, role: AppRole): Promise<boolean>;

  /* --- sessions --- */
  createSession(tokenHash: string, userId: string, expiresAt: Date): Promise<void>;
  findSessionUser(tokenHash: string): Promise<User | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteExpiredSessions(): Promise<number>;

  /* --- rulesets --- */
  listRulesetsForUser(userId: string): Promise<RulesetSummary[]>;
  getRuleset(id: string): Promise<Owned<Ruleset> | null>;
  putRuleset(ruleset: Ruleset, ownerId: string): Promise<Ruleset>;
  deleteRuleset(id: string): Promise<boolean>;

  /* --- membership --- */
  getMembership(rulesetId: string, userId: string): Promise<ProjectRole | null>;
  listMembers(rulesetId: string): Promise<Member[]>;
  addMember(rulesetId: string, userId: string, role: ProjectRole): Promise<void>;
  setMemberRole(rulesetId: string, userId: string, role: ProjectRole): Promise<boolean>;
  removeMember(rulesetId: string, userId: string): Promise<boolean>;
  countAdmins(rulesetId: string): Promise<number>;

  /* --- invites --- */
  createInvite(input: {
    id: string;
    tokenHash: string;
    rulesetId: string;
    createdBy: string;
    expiresAt: Date | null;
  }): Promise<Invite>;
  findInviteByToken(tokenHash: string): Promise<Invite | null>;
  listInvites(rulesetId: string): Promise<Invite[]>;
  revokeInvite(id: string, rulesetId: string): Promise<boolean>;
  recordInviteUse(id: string): Promise<void>;

  /* --- characters --- */
  listCharacters(rulesetId: string): Promise<CharacterRow[]>;
  getCharacter(id: string): Promise<CharacterRow | null>;
  putCharacter(character: Character, ownerId: string): Promise<Character>;
  deleteCharacter(id: string): Promise<boolean>;
}
