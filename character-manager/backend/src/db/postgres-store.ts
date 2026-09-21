import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import {
  normalizeCharacter,
  normalizeNarrative,
  normalizeRuleset,
} from '../../../shared/normalize';
import type { NarrativeMap } from '../../../shared/narrative-schema';
import type { Character, Ruleset } from '../../../shared/rules-schema';
import type { SourceDocument, SourceFolder } from '../../../shared/sources';
import type { AccessRole } from '../../../shared/visibility';
import type { AppRole, ProjectRole } from '../auth/permissions';
import type {
  CharacterRow,
  GoogleAccount,
  Invite,
  Member,
  Owned,
  RulesetSummary,
  SeenSourceFile,
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

    // One map per project, stored whole like a ruleset. It is read and
    // written in one piece and edited by a handful of staff, so rows per
    // entity would buy contention handling nobody needs and cost every read
    // a join.
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS narratives (
        ruleset_id  TEXT PRIMARY KEY REFERENCES rulesets(id) ON DELETE CASCADE,
        data        JSONB NOT NULL,
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

    // Visibility access roles a member holds, added after the table shipped, so
    // an existing deployment gains the column without losing its memberships.
    await this.pool.query(
      `ALTER TABLE project_members
         ADD COLUMN IF NOT EXISTS access_roles TEXT[] NOT NULL DEFAULT '{}';`
    );

    // Role definitions live beside the membership, not inside the ruleset
    // document: they are the project's governance, and exporting the rules
    // must not export the org chart.
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS project_roles (
        ruleset_id  TEXT NOT NULL REFERENCES rulesets(id) ON DELETE CASCADE,
        id          TEXT NOT NULL,
        name        TEXT NOT NULL,
        description TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (ruleset_id, id)
      );
    `);

    // Definitions written while roles still lived inside the document are
    // lifted out once; the stray field is then dropped from the JSON so the
    // document stops carrying governance.
    await this.pool.query(`
      INSERT INTO project_roles (ruleset_id, id, name, description)
      SELECT r.id, a->>'id', coalesce(a->>'name', ''), a->>'description'
        FROM rulesets r, jsonb_array_elements(r.data->'accessRoles') a
       WHERE jsonb_typeof(r.data->'accessRoles') = 'array'
      ON CONFLICT (ruleset_id, id) DO NOTHING;
    `);
    await this.pool.query(
      `UPDATE rulesets SET data = data - 'accessRoles' WHERE data ? 'accessRoles';`
    );

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

    // The source ledger: which Google account a user connected, which
    // folders a project watches, and what those folders hold.
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS google_accounts (
        user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        email         TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        connected_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS source_folders (
        id           TEXT PRIMARY KEY,
        ruleset_id   TEXT NOT NULL REFERENCES rulesets(id) ON DELETE CASCADE,
        external_id  TEXT NOT NULL,
        name         TEXT NOT NULL,
        url          TEXT NOT NULL,
        linked_by    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_sync_at TIMESTAMPTZ,
        UNIQUE (ruleset_id, external_id)
      );
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS source_documents (
        id            TEXT PRIMARY KEY,
        folder_id     TEXT NOT NULL REFERENCES source_folders(id) ON DELETE CASCADE,
        ruleset_id    TEXT NOT NULL REFERENCES rulesets(id) ON DELETE CASCADE,
        external_id   TEXT NOT NULL,
        name          TEXT NOT NULL,
        url           TEXT NOT NULL,
        mime_type     TEXT,
        modified_at   TIMESTAMPTZ NOT NULL,
        first_seen_at TIMESTAMPTZ NOT NULL,
        last_seen_at  TIMESTAMPTZ NOT NULL,
        reviewed_at   TIMESTAMPTZ,
        missing_at    TIMESTAMPTZ,
        UNIQUE (folder_id, external_id)
      );
    `);
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS source_documents_ruleset_idx
         ON source_documents (ruleset_id);`
    );

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

  async deleteUser(userId: string): Promise<boolean> {
    // Every dependent table references users(id) with ON DELETE CASCADE, so
    // one statement removes sessions, memberships, owned rulesets (and with
    // them their narratives, characters, invites and role definitions), and
    // characters owned in other people's projects.
    const { rowCount } = await this.pool.query(`DELETE FROM users WHERE id = $1;`, [
      userId,
    ]);
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
                AS character_count,
              mine.id   AS mine_id,
              mine.name AS mine_name
         FROM rulesets r
         JOIN project_members m ON m.ruleset_id = r.id AND m.user_id = $1
         LEFT JOIN LATERAL (
           SELECT c.id, c.name FROM characters c
            WHERE c.ruleset_id = r.id AND c.owner_id = $1
            ORDER BY c.created_at LIMIT 1
         ) mine ON true
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
      myCharacter: row.mine_id ? { id: row.mine_id, name: row.mine_name } : undefined,
    }));
  }

  async getRuleset(id: string): Promise<Owned<Ruleset> | null> {
    const { rows } = await this.pool.query(
      `SELECT data, owner_id FROM rulesets WHERE id = $1;`,
      [id]
    );
    return rows[0]
      ? { value: normalizeRuleset(rows[0].data), ownerId: rows[0].owner_id }
      : null;
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
      `SELECT m.user_id, m.role, m.access_roles, m.joined_at, u.display_name, u.email
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
      accessRoles: (r.access_roles as string[]) ?? [],
      joinedAt: new Date(r.joined_at).toISOString(),
    }));
  }

  async getMemberAccessRoles(rulesetId: string, userId: string): Promise<string[]> {
    const { rows } = await this.pool.query(
      `SELECT access_roles FROM project_members WHERE ruleset_id = $1 AND user_id = $2;`,
      [rulesetId, userId]
    );
    return rows[0] ? ((rows[0].access_roles as string[]) ?? []) : [];
  }

  async setMemberAccessRoles(
    rulesetId: string,
    userId: string,
    accessRoles: string[]
  ): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE project_members SET access_roles = $3
        WHERE ruleset_id = $1 AND user_id = $2;`,
      [rulesetId, userId, accessRoles]
    );
    return (rowCount ?? 0) > 0;
  }

  /* ---------------- access roles ---------------- */

  async listAccessRoles(rulesetId: string): Promise<AccessRole[]> {
    const { rows } = await this.pool.query(
      `SELECT id, name, description FROM project_roles
        WHERE ruleset_id = $1 ORDER BY created_at, id;`,
      [rulesetId]
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
    }));
  }

  async putAccessRole(rulesetId: string, role: AccessRole): Promise<AccessRole> {
    await this.pool.query(
      `INSERT INTO project_roles (ruleset_id, id, name, description)
            VALUES ($1, $2, $3, $4)
       ON CONFLICT (ruleset_id, id) DO UPDATE
               SET name = EXCLUDED.name,
                   description = EXCLUDED.description;`,
      [rulesetId, role.id, role.name, role.description ?? null]
    );
    return role;
  }

  async deleteAccessRole(rulesetId: string, roleId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `DELETE FROM project_roles WHERE ruleset_id = $1 AND id = $2;`,
      [rulesetId, roleId]
    );
    if ((rowCount ?? 0) === 0) return false;
    // The role stops granting anything the moment it stops existing.
    await this.pool.query(
      `UPDATE project_members SET access_roles = array_remove(access_roles, $2)
        WHERE ruleset_id = $1 AND $2 = ANY(access_roles);`,
      [rulesetId, roleId]
    );
    return true;
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

  /* ---------------- narrative ---------------- */

  async getNarrative(rulesetId: string): Promise<NarrativeMap | null> {
    const { rows } = await this.pool.query(
      `SELECT data FROM narratives WHERE ruleset_id = $1;`,
      [rulesetId]
    );
    return rows[0] ? normalizeNarrative(rows[0].data, rulesetId) : null;
  }

  async putNarrative(map: NarrativeMap): Promise<NarrativeMap> {
    await this.pool.query(
      `INSERT INTO narratives (ruleset_id, data)
            VALUES ($1, $2)
       ON CONFLICT (ruleset_id) DO UPDATE
               SET data = EXCLUDED.data,
                   updated_at = now();`,
      [map.rulesetId, JSON.stringify(map)]
    );
    return map;
  }

  /* ---------------- google and the source ledger ---------------- */

  async getGoogleAccount(userId: string): Promise<GoogleAccount | null> {
    const { rows } = await this.pool.query(
      `SELECT user_id, email, refresh_token, connected_at
         FROM google_accounts WHERE user_id = $1;`,
      [userId]
    );
    if (!rows[0]) return null;
    return {
      userId: rows[0].user_id,
      email: rows[0].email,
      refreshToken: rows[0].refresh_token,
      connectedAt: new Date(rows[0].connected_at).toISOString(),
    };
  }

  async putGoogleAccount(
    userId: string,
    email: string,
    refreshToken: string
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO google_accounts (user_id, email, refresh_token)
            VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE
               SET email = EXCLUDED.email,
                   refresh_token = EXCLUDED.refresh_token,
                   connected_at = now();`,
      [userId, email, refreshToken]
    );
  }

  async deleteGoogleAccount(userId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `DELETE FROM google_accounts WHERE user_id = $1;`,
      [userId]
    );
    return (rowCount ?? 0) > 0;
  }

  async listSourceFolders(rulesetId: string): Promise<SourceFolder[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM source_folders WHERE ruleset_id = $1 ORDER BY created_at;`,
      [rulesetId]
    );
    return rows.map(toSourceFolder);
  }

  async addSourceFolder(input: {
    id: string;
    rulesetId: string;
    externalId: string;
    name: string;
    url: string;
    linkedBy: string;
  }): Promise<SourceFolder> {
    const { rows } = await this.pool.query(
      `INSERT INTO source_folders (id, ruleset_id, external_id, name, url, linked_by)
            VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (ruleset_id, external_id) DO UPDATE
               SET name = EXCLUDED.name, url = EXCLUDED.url
         RETURNING *;`,
      [input.id, input.rulesetId, input.externalId, input.name, input.url, input.linkedBy]
    );
    return toSourceFolder(rows[0]);
  }

  async removeSourceFolder(id: string, rulesetId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `DELETE FROM source_folders WHERE id = $1 AND ruleset_id = $2;`,
      [id, rulesetId]
    );
    return (rowCount ?? 0) > 0;
  }

  async listSourceDocuments(rulesetId: string): Promise<SourceDocument[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM source_documents WHERE ruleset_id = $1 ORDER BY name;`,
      [rulesetId]
    );
    return rows.map(toSourceDocument);
  }

  async reconcileSourceDocuments(
    folderId: string,
    rulesetId: string,
    seen: SeenSourceFile[],
    at: string
  ): Promise<void> {
    for (const f of seen) {
      await this.pool.query(
        `INSERT INTO source_documents
               (id, folder_id, ruleset_id, external_id, name, url, mime_type,
                modified_at, first_seen_at, last_seen_at, reviewed_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $9)
        ON CONFLICT (folder_id, external_id) DO UPDATE
                SET name = EXCLUDED.name,
                    url = EXCLUDED.url,
                    mime_type = EXCLUDED.mime_type,
                    modified_at = EXCLUDED.modified_at,
                    last_seen_at = EXCLUDED.last_seen_at,
                    missing_at = NULL;`,
        [
          randomUUID(),
          folderId,
          rulesetId,
          f.externalId,
          f.name,
          f.url,
          f.mimeType ?? null,
          f.modifiedAt,
          at,
        ]
      );
    }
    await this.pool.query(
      `UPDATE source_documents SET missing_at = $3
        WHERE folder_id = $1 AND last_seen_at < $2 AND missing_at IS NULL;`,
      [folderId, at, at]
    );
    await this.pool.query(
      `UPDATE source_folders SET last_sync_at = $2 WHERE id = $1;`,
      [folderId, at]
    );
  }

  async reviewSourceDocument(
    id: string,
    rulesetId: string,
    at: string
  ): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE source_documents SET reviewed_at = $3
        WHERE id = $1 AND ruleset_id = $2;`,
      [id, rulesetId, at]
    );
    return (rowCount ?? 0) > 0;
  }

  async listRulesetsWithSources(): Promise<string[]> {
    const { rows } = await this.pool.query(
      `SELECT DISTINCT ruleset_id FROM source_folders;`
    );
    return rows.map((r) => r.ruleset_id);
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

  async listCharactersOwnedBy(userId: string): Promise<Character[]> {
    const { rows } = await this.pool.query(
      `SELECT data FROM characters WHERE owner_id = $1 ORDER BY name;`,
      [userId]
    );
    return rows.map((r) => normalizeCharacter(r.data));
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

  async awardCurrency({
    rulesetId,
    characterIds,
    currencyId,
    amount,
    at,
  }: {
    rulesetId: string;
    characterIds: string[];
    currencyId: string;
    amount: number;
    at: string;
  }): Promise<number> {
    if (characterIds.length === 0) return 0;

    // One statement, so the read and the write cannot be separated by
    // another organiser's award. `awarded` is rebuilt by merging rather than
    // with jsonb_set, because jsonb_set cannot create a missing parent and a
    // character saved without the key would otherwise be skipped silently.
    const { rowCount } = await this.pool.query(
      `UPDATE characters
          SET data = data
                || jsonb_build_object(
                     'awarded',
                     COALESCE(data->'awarded', '{}'::jsonb)
                       || jsonb_build_object(
                            $3::text,
                            COALESCE((data->'awarded'->>$3::text)::numeric, 0) + $4::numeric))
                || jsonb_build_object('updatedAt', $5::text),
              updated_at = now()
        WHERE ruleset_id = $1
          AND id = ANY($2::text[]);`,
      [rulesetId, characterIds, currencyId, amount, at]
    );
    return rowCount ?? 0;
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

function toSourceFolder(row: {
  id: string;
  ruleset_id: string;
  external_id: string;
  name: string;
  url: string;
  linked_by: string;
  created_at: Date | string;
  last_sync_at: Date | string | null;
}): SourceFolder {
  return {
    id: row.id,
    rulesetId: row.ruleset_id,
    externalId: row.external_id,
    name: row.name,
    url: row.url,
    linkedBy: row.linked_by,
    createdAt: new Date(row.created_at).toISOString(),
    lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at).toISOString() : null,
  };
}

function toSourceDocument(row: {
  id: string;
  folder_id: string;
  ruleset_id: string;
  external_id: string;
  name: string;
  url: string;
  mime_type: string | null;
  modified_at: Date | string;
  first_seen_at: Date | string;
  last_seen_at: Date | string;
  reviewed_at: Date | string | null;
  missing_at: Date | string | null;
}): SourceDocument {
  return {
    id: row.id,
    folderId: row.folder_id,
    rulesetId: row.ruleset_id,
    externalId: row.external_id,
    name: row.name,
    url: row.url,
    mimeType: row.mime_type ?? undefined,
    modifiedAt: new Date(row.modified_at).toISOString(),
    firstSeenAt: new Date(row.first_seen_at).toISOString(),
    lastSeenAt: new Date(row.last_seen_at).toISOString(),
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
    missingAt: row.missing_at ? new Date(row.missing_at).toISOString() : null,
  };
}

function toCharacterRow(row: {
  data: Character;
  owner_id: string;
  owner_name: string | null;
}): CharacterRow {
  return {
    character: normalizeCharacter(row.data),
    ownerId: row.owner_id,
    ownerName: row.owner_name ?? 'Unknown',
  };
}
