import axios from 'axios';
import type { Character, Ruleset } from '../../../shared/rules-schema';
import type { PendingCheck, TraitOption, Violation } from '../../../shared/engine';
import type { NarrativeMap } from '../../../shared/narrative-schema';
import type { MapIssue } from '../../../shared/narrative';
import type { AccessRole } from '../../../shared/visibility';

export type { AccessRole };

/**
 * Same-origin by default, which is what a single-service deploy needs and
 * what the Vite dev proxy forwards. VITE_API_URL overrides it for split
 * deploys where the frontend is hosted separately from the API.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * True when the API lives on a different origin than the page.
 *
 * Only a split deploy should be cross-origin. If this is true on a
 * single-service deploy, VITE_API_URL was set at build time and baked a
 * foreign origin into the bundle -- which produces CORS failures that look
 * like the API being down.
 */
export const apiIsCrossOrigin = (() => {
  if (!API_BASE_URL.startsWith('http')) return false;
  try {
    return new URL(API_BASE_URL).origin !== window.location.origin;
  } catch {
    return false;
  }
})();

export const apiBaseUrl = API_BASE_URL;

if (apiIsCrossOrigin) {
  console.warn(
    `[api] Calling ${API_BASE_URL} from ${window.location.origin}. ` +
      'These are different origins, so the API must set CORS_ORIGIN to this ' +
      'page\'s URL. On a single-service deploy, unset VITE_API_URL instead.'
  );
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // The session is an httpOnly cookie, so every request must carry credentials.
  withCredentials: true,
});

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  appRole: 'admin' | 'user';
  createdAt: string;
}

export const authApi = {
  /** Resolves to null when no session is active, rather than throwing. */
  me: async (): Promise<AuthUser | null> => {
    try {
      return (await api.get('/auth/me')).data.user;
    } catch {
      return null;
    }
  },

  login: async (email: string, password: string): Promise<AuthUser> =>
    (await api.post('/auth/login', { email, password })).data.user,

  register: async (
    email: string,
    password: string,
    displayName: string
  ): Promise<AuthUser> =>
    (await api.post('/auth/register', { email, password, displayName })).data.user,

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  /**
   * The export is served with a Content-Disposition header, so a plain link
   * to this URL downloads the file; the session cookie rides along on the
   * navigation.
   */
  exportUrl: `${API_BASE_URL}/auth/export`,

  deleteAccount: async (password: string): Promise<void> => {
    await api.delete('/auth/account', { data: { password } });
  },
};

export type ProjectRole = 'admin' | 'member';
export type AppRole = 'admin' | 'user';

export interface RulesetSummary {
  id: string;
  name: string;
  version: string;
  description?: string;
  characterCount: number;
  updatedAt: string;
  role: ProjectRole;
}

export interface Member {
  userId: string;
  displayName: string;
  /** Present only when the caller can manage members; personal data. */
  email?: string;
  role: ProjectRole;
  /** Visibility access roles assigned to this member (ids into the ruleset). */
  accessRoles: string[];
  joinedAt: string;
}

export interface Invite {
  id: string;
  rulesetId: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  uses: number;
}

/**
 * A character as the viewer is allowed to see it. `character` is present only
 * for a sheet the viewer may open in full -- their own, or any sheet if they
 * are project staff. Everyone else gets the roster fields alone.
 */
export interface RosterEntry {
  id: string;
  name: string;
  packageIds: string[];
  ownerId: string;
  ownerName: string;
  isMine: boolean;
  character?: Character;
}

/** Everything the engine derives for a character, computed server-side. */
export interface CharacterSheet {
  character: Character;
  ruleset: Ruleset;
  balances: Record<string, number>;
  violations: Violation[];
  available: TraitOption[];
  /** Requirements on this build that only a person can settle. */
  checks: PendingCheck[];
  /** False when the viewer may read the sheet but not change it. */
  canEdit: boolean;
  /** True for project staff, who alone may award staff-granted qualities. */
  canGrantStaffQualities: boolean;
  ownerName: string;
}

export const rulesetApi = {
  list: async (): Promise<RulesetSummary[]> => (await api.get('/rulesets')).data,

  /**
   * `viewAs` (staff only) returns the ruleset exactly as that member
   * receives it -- gated skills they cannot see are absent.
   */
  get: async (id: string, viewAs?: string): Promise<Ruleset> =>
    (await api.get(`/rulesets/${id}`, { params: viewAs ? { viewAs } : undefined })).data,

  /** `template: 'demo'` starts from a copy of the worked example. */
  create: async (
    name: string,
    options: { description?: string; template?: 'blank' | 'demo' } = {}
  ): Promise<Ruleset> => (await api.post('/rulesets', { name, ...options })).data,

  save: async (ruleset: Ruleset): Promise<Ruleset> =>
    (await api.put(`/rulesets/${ruleset.id}`, ruleset)).data,

  remove: async (id: string): Promise<void> => {
    await api.delete(`/rulesets/${id}`);
  },

  import: async (ruleset: Ruleset): Promise<Ruleset> =>
    (await api.post('/rulesets/import', ruleset)).data,
};

export const characterApi = {
  listForRuleset: async (rulesetId: string): Promise<RosterEntry[]> =>
    (await api.get(`/rulesets/${rulesetId}/characters`)).data,

  create: async (rulesetId: string, name: string): Promise<Character> =>
    (await api.post(`/rulesets/${rulesetId}/characters`, { name })).data,

  get: async (id: string): Promise<Character> => (await api.get(`/characters/${id}`)).data,

  sheet: async (
    id: string,
    phase: 'creation' | 'advancement' = 'advancement'
  ): Promise<CharacterSheet> =>
    (await api.get(`/characters/${id}/sheet`, { params: { phase } })).data,

  update: async (id: string, patch: Partial<Character>): Promise<Character> =>
    (await api.put(`/characters/${id}`, patch)).data,

  remove: async (id: string): Promise<void> => {
    await api.delete(`/characters/${id}`);
  },

  /** Staff only. A negative amount takes points back. */
  award: async (
    rulesetId: string,
    input: { characterIds: string[]; currencyId: string; amount: number }
  ): Promise<AwardResult> =>
    (await api.post(`/rulesets/${rulesetId}/characters/award`, input)).data,
};

export interface AwardResult {
  updated: number;
  currencyId: string;
  amount: number;
  /** Server-worded confirmation, so the client does not restate the rules. */
  message: string;
}

export interface StoryMapResponse {
  map: NarrativeMap;
  issues: MapIssue[];
  /** Ids of entities nothing connects to. */
  orphans: string[];
  hubs: { id: string; name: string; degree: number }[];
  canEdit: boolean;
}

export const storyApi = {
  get: async (rulesetId: string): Promise<StoryMapResponse> =>
    (await api.get(`/rulesets/${rulesetId}/narrative`)).data,

  save: async (rulesetId: string, map: NarrativeMap): Promise<NarrativeMap> =>
    (await api.put(`/rulesets/${rulesetId}/narrative`, map)).data,
};

export default api;


export const memberApi = {
  list: async (rulesetId: string): Promise<Member[]> =>
    (await api.get(`/rulesets/${rulesetId}/members`)).data,

  setRole: async (
    rulesetId: string,
    userId: string,
    role: ProjectRole
  ): Promise<Member[]> =>
    (await api.patch(`/rulesets/${rulesetId}/members/${userId}`, { role })).data,

  /** Replaces a member's visibility access roles. Returns the fresh roster. */
  setAccessRoles: async (
    rulesetId: string,
    userId: string,
    accessRoles: string[]
  ): Promise<Member[]> =>
    (
      await api.put(`/rulesets/${rulesetId}/members/${userId}/access-roles`, {
        accessRoles,
      })
    ).data,

  remove: async (rulesetId: string, userId: string): Promise<void> => {
    await api.delete(`/rulesets/${rulesetId}/members/${userId}`);
  },

  listInvites: async (rulesetId: string): Promise<Invite[]> =>
    (await api.get(`/rulesets/${rulesetId}/invites`)).data,

  /** The raw token is returned once, at creation, and is not recoverable. */
  createInvite: async (
    rulesetId: string
  ): Promise<{ invite: Invite; token: string }> =>
    (await api.post(`/rulesets/${rulesetId}/invites`)).data,

  revokeInvite: async (rulesetId: string, inviteId: string): Promise<void> => {
    await api.delete(`/rulesets/${rulesetId}/invites/${inviteId}`);
  },
};

/**
 * Role definitions are project governance, managed beside the members and
 * saved instantly per action -- no ruleset save involved.
 */
export const accessRoleApi = {
  list: async (rulesetId: string): Promise<AccessRole[]> =>
    (await api.get(`/rulesets/${rulesetId}/access-roles`)).data,

  create: async (rulesetId: string, name: string): Promise<AccessRole> =>
    (await api.post(`/rulesets/${rulesetId}/access-roles`, { name })).data,

  update: async (
    rulesetId: string,
    roleId: string,
    patch: { name?: string; description?: string }
  ): Promise<AccessRole> =>
    (await api.patch(`/rulesets/${rulesetId}/access-roles/${roleId}`, patch)).data,

  remove: async (rulesetId: string, roleId: string): Promise<void> => {
    await api.delete(`/rulesets/${rulesetId}/access-roles/${roleId}`);
  },
};

export const inviteApi = {
  preview: async (
    token: string
  ): Promise<{ projectId: string; projectName: string; alreadyMember: boolean }> =>
    (await api.get(`/invites/${token}`)).data,

  accept: async (
    token: string
  ): Promise<{ projectId: string; role: ProjectRole; joined: boolean }> =>
    (await api.post(`/invites/${token}/accept`)).data,
};

/* ---------------- the source ledger ---------------- */

export interface SourceFolder {
  id: string;
  rulesetId: string;
  externalId: string;
  name: string;
  url: string;
  linkedBy: string;
  createdAt: string;
  lastSyncAt: string | null;
}

export type SourceStatus = 'current' | 'stale' | 'uncited' | 'missing';

export interface LedgerDocument {
  id: string;
  folderId: string;
  externalId: string;
  name: string;
  url: string;
  mimeType?: string;
  modifiedAt: string;
  reviewedAt: string | null;
  missingAt: string | null;
  status: SourceStatus;
  citedBy: { id: string; name: string }[];
}

export interface SourcesResponse {
  configured: boolean;
  folders: SourceFolder[];
  documents: LedgerDocument[];
}

export const sourceApi = {
  googleStatus: async (): Promise<{
    configured: boolean;
    connected: boolean;
    email: string | null;
  }> => (await api.get('/google/status')).data,

  /** Starts the OAuth round trip; a navigation, not an XHR. */
  googleConnectUrl: (back: string): string =>
    `${API_BASE_URL}/google/connect?back=${encodeURIComponent(back)}`,

  googleDisconnect: async (): Promise<void> => {
    await api.delete('/google');
  },

  list: async (rulesetId: string): Promise<SourcesResponse> =>
    (await api.get(`/rulesets/${rulesetId}/sources`)).data,

  addFolder: async (rulesetId: string, url: string): Promise<SourceFolder> =>
    (await api.post(`/rulesets/${rulesetId}/source-folders`, { url })).data,

  removeFolder: async (rulesetId: string, folderId: string): Promise<void> => {
    await api.delete(`/rulesets/${rulesetId}/source-folders/${folderId}`);
  },

  sync: async (rulesetId: string): Promise<void> => {
    await api.post(`/rulesets/${rulesetId}/sources/sync`);
  },

  review: async (rulesetId: string, docId: string): Promise<void> => {
    await api.post(`/rulesets/${rulesetId}/sources/${docId}/review`);
  },
};

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  appRole: AppRole;
  createdAt: string;
}

export const adminApi = {
  listUsers: async (): Promise<AdminUser[]> => (await api.get('/admin/users')).data,
  setRole: async (userId: string, role: AppRole): Promise<AdminUser[]> =>
    (await api.patch(`/admin/users/${userId}`, { role })).data,
};
