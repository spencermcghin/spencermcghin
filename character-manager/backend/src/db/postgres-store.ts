import { Pool } from 'pg';
import type { Character, Ruleset } from '../../../shared/rules-schema';
import type { RulesetSummary, Store } from './store';

/**
 * Postgres-backed store. Documents live in JSONB; only the columns we filter
 * or sort by are promoted out of the document.
 *
 * Works against any Postgres reachable by DATABASE_URL -- Render, Neon,
 * Supabase, or a local instance.
 */
export class PostgresStore implements Store {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      // Hosted Postgres almost always terminates TLS with a certificate the
      // container has no root for. Disable verification only for non-local
      // hosts, so a local dev database is not silently downgraded.
      ssl: /localhost|127\.0\.0\.1/.test(connectionString)
        ? undefined
        : { rejectUnauthorized: false },
    });
  }

  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS rulesets (
        id          TEXT PRIMARY KEY,
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
        name        TEXT NOT NULL,
        data        JSONB NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS characters_ruleset_id_idx ON characters (ruleset_id);`
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async listRulesets(): Promise<RulesetSummary[]> {
    const { rows } = await this.pool.query(`
      SELECT r.id,
             r.name,
             r.version,
             r.data ->> 'description' AS description,
             r.updated_at,
             COUNT(c.id)::int AS character_count
        FROM rulesets r
        LEFT JOIN characters c ON c.ruleset_id = r.id
       GROUP BY r.id
       ORDER BY r.updated_at DESC;
    `);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      version: row.version,
      description: row.description ?? undefined,
      characterCount: row.character_count,
      updatedAt: new Date(row.updated_at).toISOString(),
    }));
  }

  async getRuleset(id: string): Promise<Ruleset | null> {
    const { rows } = await this.pool.query(`SELECT data FROM rulesets WHERE id = $1;`, [id]);
    return rows[0]?.data ?? null;
  }

  async putRuleset(ruleset: Ruleset): Promise<Ruleset> {
    await this.pool.query(
      `INSERT INTO rulesets (id, name, version, data)
            VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
               SET name = EXCLUDED.name,
                   version = EXCLUDED.version,
                   data = EXCLUDED.data,
                   updated_at = now();`,
      [ruleset.id, ruleset.name, ruleset.version, JSON.stringify(ruleset)]
    );
    return ruleset;
  }

  async deleteRuleset(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(`DELETE FROM rulesets WHERE id = $1;`, [id]);
    return (rowCount ?? 0) > 0;
  }

  async listCharacters(rulesetId: string): Promise<Character[]> {
    const { rows } = await this.pool.query(
      `SELECT data FROM characters WHERE ruleset_id = $1 ORDER BY name;`,
      [rulesetId]
    );
    return rows.map((r) => r.data);
  }

  async getCharacter(id: string): Promise<Character | null> {
    const { rows } = await this.pool.query(`SELECT data FROM characters WHERE id = $1;`, [id]);
    return rows[0]?.data ?? null;
  }

  async putCharacter(character: Character): Promise<Character> {
    await this.pool.query(
      `INSERT INTO characters (id, ruleset_id, name, data)
            VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
               SET name = EXCLUDED.name,
                   data = EXCLUDED.data,
                   updated_at = now();`,
      [character.id, character.rulesetId, character.name, JSON.stringify(character)]
    );
    return character;
  }

  async deleteCharacter(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(`DELETE FROM characters WHERE id = $1;`, [id]);
    return (rowCount ?? 0) > 0;
  }
}
