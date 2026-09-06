import axios from 'axios';
import type { Character, Ruleset } from '../../../shared/rules-schema';
import type { PendingCheck, TraitOption, Violation } from '../../../shared/engine';

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
  email: string;
  role: ProjectRole;
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

  get: async (id: string): Promise<Ruleset> => (await api.get(`/rulesets/${id}`)).data,

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
