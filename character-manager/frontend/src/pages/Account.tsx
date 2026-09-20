import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/useAuth';
import { authApi } from '../services/api';
import SectionCard from '../components/SectionCard';

/**
 * The signed-in user's own account: who the app thinks they are, a download
 * of everything they own, and the way out. Project management lives with the
 * projects; this page is only about the person.
 */
export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const remove = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authApi.deleteAccount(password);
      // The server already ended the session; this clears the client's copy.
      await logout();
      navigate('/');
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message
        : undefined;
      setError(message ?? 'Something went wrong. Try again.');
      setBusy(false);
    }
  };

  return (
    <div className="account-page">
      <div className="header">
        <div>
          <h1>Account</h1>
          <p className="muted">Your details, your data, and the way out.</p>
        </div>
      </div>

      <SectionCard title="Profile">
        <dl className="account-facts">
          <div>
            <dt>Display name</dt>
            <dd>{user.displayName}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Your data">
        <p>
          Download everything this account owns as one JSON file: your account
          details, the projects you created (rules and story included), your
          role in projects you belong to, and every character you own.
        </p>
        <a className="button" href={authApi.exportUrl}>
          Download your data
        </a>
      </SectionCard>

      <SectionCard title="Delete account">
        <p>
          Deleting your account removes it permanently, along with every
          project you created (for all of its members), every character you
          own, and your memberships in other people's projects. There is no
          undo and no recovery.
        </p>
        {!confirming ? (
          <button className="button button-danger" onClick={() => setConfirming(true)}>
            Delete my account…
          </button>
        ) : (
          <form onSubmit={remove} className="account-delete-form">
            {error && <div className="error">{error}</div>}
            <div className="form-group">
              <label htmlFor="delete-password">Confirm with your password</label>
              <input
                id="delete-password"
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="account-delete-actions">
              <button className="button button-danger" disabled={busy}>
                {busy ? 'Deleting…' : 'Delete my account forever'}
              </button>
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => {
                  setConfirming(false);
                  setPassword('');
                  setError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </SectionCard>
    </div>
  );
}
