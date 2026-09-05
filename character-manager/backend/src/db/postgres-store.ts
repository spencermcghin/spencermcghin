import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import type { Character, Ruleset } from '../../../shared/rules-schema';
import type { Owned, RulesetSummary, Store, User, UserWithSecret } from './store';

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
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
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

    // Added after the tables first shipped without ownership, so bring
    // existing deployments forward rather than requiring a manual migration.
    await this.pool.query(
      `ALTER TABLE rulesets ADD COLUMN IF NOT EXISTS owner_id TEXT REFERENCES users(id) ON DELETE CASCADE;`
    );
    await this.pool.query(
      `ALTER TABLE characters ADD COLUMN IF NOT EXISTS owner_id TEXT REFERENCES users(id) ON DELETE CASCADE;`
    );

    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS characters_ruleset_id_idx ON characters (ruleset_id);`
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS rulesets_owner_id_idx ON rulesets (owner_id);`
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS characters_owner_id_idx ON characters (owner_id);`
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  /* ---------------- accounts ---------------- */

  async createUser(input: {
    email: string;
    displayName: string;
    passwordHash: string;
  }): Promise<User> {
    const id = randomUUID();
    const { rows } = await this.pool.query(
      `INSERT INTO users (id, email, display_name, password_hash)
            VALUES ($1, $2, $3, $4)
         RETURNING id, email, display_name, created_at;`,
      [id, input.email, input.displayName, input.passwordHash]
    );
    return toUser(rows[0]);
  }

  async findUserByEmail(email: string): Promise<UserWithSecret | null> {
    const { rows } = await this.pool.query(
      `SELECT id, email, display_name, password_hash, created_at
         FROM users WHERE lower(email) = lower($1);`,
      [email]
    );
    if (!rows[0]) return null;
    return { ...toUser(rows[0]), passwordHash: rows[0].password_hash };
  }

  async findUserById(id: string): Promise<User | null> {
    const { rows } = await this.pool.query(
      `SELECT id, email, display_name, created_at FROM users WHERE id = $1;`,
      [id]
    );
    return rows[0] ? toUser(rows[0]) : null;
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
      `SELECT u.id, u.email, u.display_name, u.created_at
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

  async listRulesets(ownerId: string): Promise<RulesetSummary[]> {
    const { rows } = await this.pool.query(
      `SELECT r.id,
              r.name,
              r.version,
              r.data ->> 'description' AS description,
              r.updated_at,
              COUNT(c.id)::int AS character_count
         FROM rulesets r
         LEFT JOIN characters c ON c.ruleset_id = r.id
        WHERE r.owner_id = $1
        GROUP BY r.id
        ORDER BY r.updated_at DESC;`,
      [ownerId]
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      version: row.version,
      description: row.description ?? undefined,
      characterCount: row.character_count,
      updatedAt: new Date(row.updated_at).toISOString(),
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

  /* ---------------- characters ---------------- */

  async listCharacters(rulesetId: string, ownerId: string): Promise<Character[]> {
    const { rows } = await this.pool.query(
      `SELECT data FROM characters
        WHERE ruleset_id = $1 AND owner_id = $2
        ORDER BY name;`,
      [rulesetId, ownerId]
    );
    return rows.map((r) => r.data);
  }

  async getCharacter(id: string): Promise<Owned<Character> | null> {
    const { rows } = await this.pool.query(
      `SELECT data, owner_id FROM characters WHERE id = $1;`,
      [id]
    );
    return rows[0] ? { value: rows[0].data, ownerId: rows[0].owner_id } : null;
  }

  async putCharacter(character: Character, ownerId: string): Promise<Character> {
    await this.pool.query(
      `INSERT INTO characters (id, ruleset_id, owner_id, name, data)
            VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
               SET name = EXCLUDED.name,
                   data = EXCLUDED.data,
                   updated_at = now();`,
      [
        character.id,
        character.rulesetId,
        ownerId,
        character.name,
        JSON.stringify(character),
      ]
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
  created_at: Date | string;
}): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: new Date(row.created_at).toISOString(),
  };
}
