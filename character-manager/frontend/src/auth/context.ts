import { createContext } from 'react';
import type { AuthUser } from '../services/api';

export interface AuthContextValue {
  user: AuthUser | null;
  /** True until the initial session check resolves. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
