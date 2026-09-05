import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import type { Character, Ruleset } from '../../../shared/rules-schema';
import type { AppRole, ProjectRole } from '../auth/permissions';
import type {
  CharacterRow,
  Invite,
  Member,
  Owned,
  RulesetSummary,
  Store,
  User,
  UserWithSecret,
} from './store';

/**
 * Postgres-backed store. Documents live in JSONB; only the columns we filter,
 * sort or authorize by are promoted out of the document.
 *
 * Works against any Postgres reachable by DATABASE_URL -- Railway, Render,
 * Neon, Supabase, or a local instance.
 */
export class PostgresStore implements Store {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      // Hosted Postgres almost always terminates TLS with a certificate the
      // container has no root for. Relax verification only for non-local
      // hosts, so a local dev database is not silently downgraded.
      ssl: /localhost|127\.0\.0\.1/.test(connectionString)
        ? undefined
        : { rejectUnauthorized: false },
    });
  }

  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        email         TEXT NOT NULL,
        display_name  TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        app_role      TEXT NOT NULL DEFAULT 'user',
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await this.pool.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS app_role TEXT NOT NULL DEFAULT 'user';`
    );
    // Case-insensitive uniqueness: addresses are stored already lowercased,
    // but the index makes a duplicate impossible rather than merely unlikely.
    await this.pool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));`
    );

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);`
    );

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS rulesets (
        id          TEXT PRIMARY KEY,
        owner_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        version     TEXT NOT NULL,
        data        JSONB NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id          TEXT PRIMARY KEY,
        ruleset_id  TEXT NOT NULL REFERENCES rulesets(id) ON DELETE CASCADE,
        owner_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        data        JSONB NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        ruleset_id TEXT NOT NULL REFERENCES rulesets(id) ON DELETE CASCADE,
        user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role       TEXT NOT NULL,
        joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (ruleset_id, user_id)
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS project_invites (
        id         TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        ruleset_id TEXT NOT NULL REFERENCES rulesets(id) ON DELETE CASCADE,
        created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        uses       INTEGER NOT NULL DEFAULT 0
      );
    `);

    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS characters_ruleset_id_idx ON characters (ruleset_id);`
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS project_members_user_idx ON project_members (user_id);`
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS project_invites_ruleset_idx ON project_invites (ruleset_id);`
    );

    // Projects created before memberships existed have an owner but no
    // membership row, which would lock their creator out. Backfill them as
    // admins.
    await this.pool.query(`
      INSERT INTO project_members (ruleset_id, user_id, role)
      SELECT r.id, r.owner_id, 'admin'
        FROM rulesets r
       WHERE r.owner_id IS NOT NULL
      ON CONFLICT (ruleset_id, user_id) DO NOTHING;
    `);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  /* ---------------- accounts ---------------- */

  async createUser(input: {
    email: string;
    displayName: string;
    passwordHash: string;
    appRole?: AppRole;
  }): Promise<User> {
    const { rows } = await this.pool.query(
      `INSERT INTO users (id, email, display_name, password_hash, app_role)
            VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, display_name, app_role, created_at;`,
      [randomUUID(), input.email, input.displayName, input.passwordHash, input.appRole ?? 'user']
    );
    return toUser(rows[0]);
  }

  async findUserByEmail(email: string): Promise<UserWithSecret | null> {
    const { rows } = await this.pool.query(
      `SELECT id, email, display_name, app_role, password_hash, created_at
         FROM users WHERE lower(email) = lower($1);`,
      [email]
    );
    if (!rows[0]) return null;
    return { ...toUser(rows[0]), passwordHash: rows[0].password_hash };
  }

  async findUserById(id: string): Promise<User | null> {
    const { rows } = await this.pool.query(
      `SELECT id, email, display_name, app_role, created_at FROM users WHERE id = $1;`,
      [id]
    );
    return rows[0] ? toUser(rows[0]) : null;
  }

  async countUsers(): Promise<number> {
    const { rows } = await this.pool.query(`SELECT COUNT(*)::int AS n FROM users;`);
    return rows[0].n;
  }

  async listUsers(): Promise<User[]> {
    const { rows } = await this.pool.query(
      `SELECT id, email, display_name, app_role, created_at
         FROM users ORDER BY created_at;`
    );
    return rows.map(toUser);
  }

  async setAppRole(userId: string, role: AppRole): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE users SET app_role = $2 WHERE id = $1;`,
      [userId, role]
    );
    return (rowCount ?? 0) > 0;
  }

  /* ---------------- sessions ---------------- */

  async createSession(tokenHash: string, userId: string, expiresAt: Date): Promise<void> {
    await this.pool.query(
      `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3);`,
      [tokenHash, userId, expiresAt]
    );
  }

  async findSessionUser(tokenHash: string): Promise<User | null> {
    const { rows } = await this.pool.query(
      `SELECT u.id, u.email, u.display_name, u.app_role, u.created_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = $1 AND s.expires_at > now();`,
      [tokenHash]
    );
    return rows[0] ? toUser(rows[0]) : null;
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.pool.query(`DELETE FROM sessions WHERE token_hash = $1;`, [tokenHash]);
  }

  async deleteExpiredSessions(): Promise<number> {
    const { rowCount } = await this.pool.query(
      `DELETE FROM sessions WHERE expires_at <= now();`
    );
    return rowCount ?? 0;
  }

  /* ---------------- rulesets ---------------- */

  async listRulesetsForUser(userId: string): Promise<RulesetSummary[]> {
    const { rows } = await this.pool.query(
      `SELECT r.id,
              r.name,
              r.version,
              r.data ->> 'description' AS description,
              r.updated_at,
              m.role,
              (SELECT COUNT(*)::int FROM characters c WHERE c.ruleset_id = r.id)
                AS character_count
         FROM rulesets r
         JOIN project_members m ON m.ruleset_id = r.id AND m.user_id = $1
        ORDER BY r.updated_at DESC;`,
      [userId]
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      version: row.version,
      description: row.description ?? undefined,
      characterCount: row.character_count,
      updatedAt: new Date(row.updated_at).toISOString(),
      role: row.role as ProjectRole,
    }));
  }

  async getRuleset(id: string): Promise<Owned<Ruleset> | null> {
    const { rows } = await this.pool.query(
      `SELECT data, owner_id FROM rulesets WHERE id = $1;`,
      [id]
    );
    return rows[0] ? { value: rows[0].data, ownerId: rows[0].owner_id } : null;
  }

  async putRuleset(ruleset: Ruleset, ownerId: string): Promise<Ruleset> {
    await this.pool.query(
      `INSERT INTO rulesets (id, owner_id, name, version, data)
            VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
               SET name = EXCLUDED.name,
                   version = EXCLUDED.version,
                   data = EXCLUDED.data,
                   updated_at = now();`,
      [ruleset.id, ownerId, ruleset.name, ruleset.version, JSON.stringify(ruleset)]
    );
    return ruleset;
  }

  async deleteRuleset(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(`DELETE FROM rulesets WHERE id = $1;`, [id]);
    return (rowCount ?? 0) > 0;
  }

  /* ---------------- membership ---------------- */

  async getMembership(rulesetId: string, userId: string): Promise<ProjectRole | null> {
    const { rows } = await this.pool.query(
      `SELECT role FROM project_members WHERE ruleset_id = $1 AND user_id = $2;`,
      [rulesetId, userId]
    );
    return rows[0] ? (rows[0].role as ProjectRole) : null;
  }

  async listMembers(rulesetId: string): Promise<Member[]> {
    const { rows } = await this.pool.query(
      `SELECT m.user_id, m.role, m.joined_at, u.display_name, u.email
         FROM project_members m
         JOIN users u ON u.id = m.user_id
        WHERE m.ruleset_id = $1
        ORDER BY m.role, u.display_name;`,
      [rulesetId]
    );
    return rows.map((r) => ({
      userId: r.user_id,
      displayName: r.display_name,
      email: r.email,
      role: r.role as ProjectRole,
      joinedAt: new Date(r.joined_at).toISOString(),
    }));
  }

  async addMember(rulesetId: string, userId: string, role: ProjectRole): Promise<void> {
    await this.pool.query(
      `INSERT INTO project_members (ruleset_id, user_id, role)
            VALUES ($1, $2, $3)
       ON CONFLICT (ruleset_id, user_id) DO NOTHING;`,
      [rulesetId, userId, role]
    );
  }

  async setMemberRole(
    rulesetId: string,
    userId: string,
    role: ProjectRole
  ): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE project_members SET role = $3 WHERE ruleset_id = $1 AND user_id = $2;`,
      [rulesetId, userId, role]
    );
    return (rowCount ?? 0) > 0;
  }

  async removeMember(rulesetId: string, userId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `DELETE FROM project_members WHERE ruleset_id = $1 AND user_id = $2;`,
      [rulesetId, userId]
    );
    return (rowCount ?? 0) > 0;
  }

  async countAdmins(rulesetId: string): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS n FROM project_members
        WHERE ruleset_id = $1 AND role = 'admin';`,
      [rulesetId]
    );
    return rows[0].n;
  }

  /* ---------------- invites ---------------- */

  async createInvite(input: {
    id: string;
    tokenHash: string;
    rulesetId: string;
    createdBy: string;
    expiresAt: Date | null;
  }): Promise<Invite> {
    const { rows } = await this.pool.query(
      `INSERT INTO project_invites (id, token_hash, ruleset_id, created_by, expires_at)
            VALUES ($1, $2, $3, $4, $5)
         RETURNING id, ruleset_id, created_by, created_at, expires_at, revoked_at, uses;`,
      [input.id, input.tokenHash, input.rulesetId, input.createdBy, input.expiresAt]
    );
    return toInvite(rows[0]);
  }

  async findInviteByToken(tokenHash: string): Promise<Invite | null> {
    const { rows } = await this.pool.query(
      `SELECT id, ruleset_id, created_by, created_at, expires_at, revoked_at, uses
         FROM project_invites WHERE token_hash = $1;`,
      [tokenHash]
    );
    return rows[0] ? toInvite(rows[0]) : null;
  }

  async listInvites(rulesetId: string): Promise<Invite[]> {
    const { rows } = await this.pool.query(
      `SELECT id, ruleset_id, created_by, created_at, expires_at, revoked_at, uses
         FROM project_invites WHERE ruleset_id = $1 ORDER BY created_at DESC;`,
      [rulesetId]
    );
    return rows.map(toInvite);
  }

  async revokeInvite(id: string, rulesetId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE project_invites SET revoked_at = now()
        WHERE id = $1 AND ruleset_id = $2 AND revoked_at IS NULL;`,
      [id, rulesetId]
    );
    return (rowCount ?? 0) > 0;
  }

  async recordInviteUse(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE project_invites SET uses = uses + 1 WHERE id = $1;`,
      [id]
    );
  }

  /* ---------------- characters ---------------- */

  async listCharacters(rulesetId: string): Promise<CharacterRow[]> {
    const { rows } = await this.pool.query(
      `SELECT c.data, c.owner_id, u.display_name AS owner_name
         FROM characters c
         LEFT JOIN users u ON u.id = c.owner_id
        WHERE c.ruleset_id = $1
        ORDER BY c.name;`,
      [rulesetId]
    );
    return rows.map(toCharacterRow);
  }

  async getCharacter(id: string): Promise<CharacterRow | null> {
    const { rows } = await this.pool.query(
      `SELECT c.data, c.owner_id, u.display_name AS owner_name
         FROM characters c
         LEFT JOIN users u ON u.id = c.owner_id
        WHERE c.id = $1;`,
      [id]
    );
    return rows[0] ? toCharacterRow(rows[0]) : null;
  }

  async putCharacter(character: Character, ownerId: string): Promise<Character> {
    await this.pool.query(
      `INSERT INTO characters (id, ruleset_id, owner_id, name, data)
            VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
               SET name = EXCLUDED.name,
                   data = EXCLUDED.data,
                   updated_at = now();`,
      [character.id, character.rulesetId, ownerId, character.name, JSON.stringify(character)]
    );
    return character;
  }

  async deleteCharacter(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(`DELETE FROM characters WHERE id = $1;`, [id]);
    return (rowCount ?? 0) > 0;
  }
}

function toUser(row: {
  id: string;
  email: string;
  display_name: string;
  app_role: string;
  created_at: Date | string;
}): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    appRole: row.app_role as AppRole,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function toInvite(row: {
  id: string;
  ruleset_id: string;
  created_by: string;
  created_at: Date | string;
  expires_at: Date | string | null;
  revoked_at: Date | string | null;
  uses: number;
}): Invite {
  return {
    id: row.id,
    rulesetId: row.ruleset_id,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at).toISOString(),
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
    uses: row.uses,
  };
}

function toCharacterRow(row: {
  data: Character;
  owner_id: string;
  owner_name: string | null;
}): CharacterRow {
  return {
    character: row.data,
    ownerId: row.owner_id,
    ownerName: row.owner_name ?? 'Unknown',
  };
}
