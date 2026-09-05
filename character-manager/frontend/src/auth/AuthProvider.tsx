import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, type AuthUser } from '../services/api';
import { AuthContext, type AuthContextValue } from './context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // The session lives in an httpOnly cookie the client cannot read, so the
  // only way to know whether one is active is to ask.
  useEffect(() => {
    let cancelled = false;
    authApi
      .me()
      .then((u) => !cancelled && setUser(u))
      .catch(() => !cancelled && setUser(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setUser(await authApi.login(email, password));
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      setUser(await authApi.register(email, password, displayName));
    },
    []
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
