import { useEffect, useState } from 'react';
import { adminApi, type AdminUser, type AppRole } from '../services/api';
import { useAuth } from '../auth/useAuth';

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .listUsers()
      .then(setUsers)
      .catch(() => setError('You do not have access to this page.'));
  }, []);

  if (error) return <div className="error">{error}</div>;

  return (
    <div className="admin-users">
      <div className="header">
        <div>
          <h1>Accounts</h1>
          <p className="muted">
            App administrators can open and manage every project.
          </p>
        </div>
      </div>

      <div className="info-card full-width">
        <h2>{users.length} account{users.length === 1 ? '' : 's'}</h2>
        <ul className="member-list">
          {users.map((u) => (
            <li key={u.id}>
              <span className="member-name">
                {u.displayName}
                {u.id === user?.id && <span className="you-tag">you</span>}
                <span className="muted"> · {u.email}</span>
              </span>
              <span className="member-actions">
                <select
                  value={u.appRole}
                  aria-label={`App role for ${u.displayName}`}
                  onChange={async (e) => {
                    try {
                      setUsers(await adminApi.setRole(u.id, e.target.value as AppRole));
                      setError(null);
                    } catch {
                      setError('The last app administrator cannot be demoted.');
                    }
                  }}
                >
                  <option value="admin">app admin</option>
                  <option value="user">user</option>
                </select>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
