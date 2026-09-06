import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/useAuth';
import { apiBaseUrl, apiIsCrossOrigin } from '../services/api';

type Mode = 'signin' | 'register';

export default function SignIn() {
  const { user, loading, login, register } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <p className="muted">Loading…</p>;
  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/projects';
    return <Navigate to={from} replace />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signin') await login(email, password);
      else await register(email, password, displayName);
    } catch (err) {
      // The API's message is the useful one -- it distinguishes a weak
      // password from a taken address from bad credentials.
      const message = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message
        : undefined;

      // No response at all, against a cross-origin API, is almost always the
      // browser refusing the response rather than the server being down.
      // Saying so beats a generic failure the reader cannot act on.
      const blocked =
        !message && axios.isAxiosError(err) && !err.response && apiIsCrossOrigin;

      setError(
        message ??
          (blocked
            ? `The browser blocked the request to ${apiBaseUrl}, which is on a ` +
              'different origin than this page. On a single-service deploy, ' +
              'unset VITE_API_URL and redeploy; on a split deploy, set ' +
              "CORS_ORIGIN on the API to this page's URL."
            : 'Something went wrong. Try again.')
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{mode === 'signin' ? 'Sign in' : 'Create an account'}</h1>
        <p className="muted">
          {mode === 'signin'
            ? 'Your rulesets and characters live in your own space.'
            : 'New accounts start with a copy of Eldritch to explore.'}
        </p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="displayName">Display name</label>
              <input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="nickname"
                placeholder="Optional"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
            {mode === 'register' && (
              <p className="field-hint">At least 10 characters.</p>
            )}
          </div>

          <button className="button button-primary auth-submit" disabled={busy}>
            {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode(mode === 'signin' ? 'register' : 'signin');
            setError(null);
          }}
        >
          {mode === 'signin'
            ? 'No account? Create one'
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
