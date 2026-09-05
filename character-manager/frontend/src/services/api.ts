import axios from 'axios';
import type { Character, Ruleset } from '../../../shared/rules-schema';
import type { TraitOption, Violation } from '../../../shared/engine';

/**
 * Same-origin by default, which is what a single-service deploy needs and
 * what the Vite dev proxy forwards. VITE_API_URL overrides it for split
 * deploys where the frontend is hosted separately from the API.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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

export interface RulesetSummary {
  id: string;
  name: string;
  version: string;
  description?: string;
  characterCount: number;
  updatedAt: string;
}

/** Everything the engine derives for a character, computed server-side. */
export interface CharacterSheet {
  character: Character;
  ruleset: Ruleset;
  balances: Record<string, number>;
  violations: Violation[];
  available: TraitOption[];
}

export const rulesetApi = {
  list: async (): Promise<RulesetSummary[]> => (await api.get('/rulesets')).data,

  get: async (id: string): Promise<Ruleset> => (await api.get(`/rulesets/${id}`)).data,

  create: async (name: string, description?: string): Promise<Ruleset> =>
    (await api.post('/rulesets', { name, description })).data,

  save: async (ruleset: Ruleset): Promise<Ruleset> =>
    (await api.put(`/rulesets/${ruleset.id}`, ruleset)).data,

  remove: async (id: string): Promise<void> => {
    await api.delete(`/rulesets/${id}`);
  },

  import: async (ruleset: Ruleset): Promise<Ruleset> =>
    (await api.post('/rulesets/import', ruleset)).data,
};

export const characterApi = {
  listForRuleset: async (rulesetId: string): Promise<Character[]> =>
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
};

export default api;
