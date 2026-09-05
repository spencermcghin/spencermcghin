import type { Character, Ruleset } from '../../../shared/rules-schema';

export interface RulesetSummary {
  id: string;
  name: string;
  version: string;
  description?: string;
  characterCount: number;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

/** Only ever loaded during authentication; never returned to a client. */
export interface UserWithSecret extends User {
  passwordHash: string;
}

/**
 * Ownership is a storage concern, not part of the rules domain -- the engine
 * has no notion of who owns a ruleset. It is carried alongside the document
 * rather than inside it.
 */
export interface Owned<T> {
  value: T;
  ownerId: string;
}

export interface Store {
  init(): Promise<void>;
  close(): Promise<void>;

  /* --- accounts --- */
  createUser(input: {
    email: string;
    displayName: string;
    passwordHash: string;
  }): Promise<User>;
  findUserByEmail(email: string): Promise<UserWithSecret | null>;
  findUserById(id: string): Promise<User | null>;

  /* --- sessions --- */
  createSession(tokenHash: string, userId: string, expiresAt: Date): Promise<void>;
  findSessionUser(tokenHash: string): Promise<User | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteExpiredSessions(): Promise<number>;

  /* --- rulesets, scoped to an owner --- */
  listRulesets(ownerId: string): Promise<RulesetSummary[]>;
  getRuleset(id: string): Promise<Owned<Ruleset> | null>;
  putRuleset(ruleset: Ruleset, ownerId: string): Promise<Ruleset>;
  deleteRuleset(id: string): Promise<boolean>;

  /* --- characters --- */
  listCharacters(rulesetId: string, ownerId: string): Promise<Character[]>;
  getCharacter(id: string): Promise<Owned<Character> | null>;
  putCharacter(character: Character, ownerId: string): Promise<Character>;
  deleteCharacter(id: string): Promise<boolean>;
}
