import { randomUUID } from 'crypto';
import type { Character, Ruleset } from '../../../shared/rules-schema';
import type { Owned, RulesetSummary, Store, User, UserWithSecret } from './store';

/**
 * In-memory fallback used when DATABASE_URL is unset, so `npm run dev` works
 * with no database to install. Data is lost on restart -- the server logs a
 * warning at startup so this is never mistaken for real persistence.
 */
export class MemoryStore implements Store {
  private users = new Map<string, UserWithSecret>();
  private sessions = new Map<string, { userId: string; expiresAt: Date }>();
  private rulesets = new Map<string, Owned<Ruleset>>();
  private characters = new Map<string, Owned<Character>>();
  private touched = new Map<string, string>();

  async init(): Promise<void> {}
  async close(): Promise<void> {}

  /* ---------------- accounts ---------------- */

  async createUser(input: {
    email: string;
    displayName: string;
    passwordHash: string;
  }): Promise<User> {
    const user: UserWithSecret = {
      id: randomUUID(),
      email: input.email,
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    return strip(user);
  }

  async findUserByEmail(email: string): Promise<UserWithSecret | null> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) return user;
    }
    return null;
  }

  async findUserById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user ? strip(user) : null;
  }

  /* ---------------- sessions ---------------- */

  async createSession(tokenHash: string, userId: string, expiresAt: Date): Promise<void> {
    this.sessions.set(tokenHash, { userId, expiresAt });
  }

  async findSessionUser(tokenHash: string): Promise<User | null> {
    const session = this.sessions.get(tokenHash);
    if (!session) return null;
    if (session.expiresAt <= new Date()) {
      this.sessions.delete(tokenHash);
      return null;
    }
    return this.findUserById(session.userId);
  }

  async deleteSession(tokenHash: string): Promise<void> {
    this.sessions.delete(tokenHash);
  }

  async deleteExpiredSessions(): Promise<number> {
    const now = new Date();
    let removed = 0;
    for (const [hash, session] of this.sessions) {
      if (session.expiresAt <= now) {
        this.sessions.delete(hash);
        removed++;
      }
    }
    return removed;
  }

  /* ---------------- rulesets ---------------- */

  async listRulesets(ownerId: string): Promise<RulesetSummary[]> {
    return [...this.rulesets.values()]
      .filter((r) => r.ownerId === ownerId)
      .map(({ value: r }) => ({
        id: r.id,
        name: r.name,
        version: r.version,
        description: r.description,
        characterCount: [...this.characters.values()].filter(
          (c) => c.value.rulesetId === r.id
        ).length,
        updatedAt: this.touched.get(r.id) ?? new Date(0).toISOString(),
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getRuleset(id: string): Promise<Owned<Ruleset> | null> {
    return this.rulesets.get(id) ?? null;
  }

  async putRuleset(ruleset: Ruleset, ownerId: string): Promise<Ruleset> {
    this.rulesets.set(ruleset.id, { value: ruleset, ownerId });
    this.touched.set(ruleset.id, new Date().toISOString());
    return ruleset;
  }

  async deleteRuleset(id: string): Promise<boolean> {
    for (const [cid, c] of this.characters) {
      if (c.value.rulesetId === id) this.characters.delete(cid);
    }
    this.touched.delete(id);
    return this.rulesets.delete(id);
  }

  /* ---------------- characters ---------------- */

  async listCharacters(rulesetId: string, ownerId: string): Promise<Character[]> {
    return [...this.characters.values()]
      .filter((c) => c.value.rulesetId === rulesetId && c.ownerId === ownerId)
      .map((c) => c.value)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getCharacter(id: string): Promise<Owned<Character> | null> {
    return this.characters.get(id) ?? null;
  }

  async putCharacter(character: Character, ownerId: string): Promise<Character> {
    this.characters.set(character.id, { value: character, ownerId });
    return character;
  }

  async deleteCharacter(id: string): Promise<boolean> {
    return this.characters.delete(id);
  }
}

function strip(user: UserWithSecret): User {
  const { passwordHash: _omit, ...rest } = user;
  return rest;
}
