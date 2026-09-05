import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

/**
 * Gates a route on an active session.
 *
 * This is convenience, not security -- the API rejects unauthenticated
 * requests regardless. It exists so a signed-out visitor sees a sign-in form
 * rather than a page of failed requests.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="muted">Loading…</p>;
  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
