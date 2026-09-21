import { useEffect, useState } from 'react';
import { adminApi, type AdminUser, type AppRole } from '../services/api';
import { useAuth } from '../auth/useAuth';
import Loading from '../components/Loading';
import SectionCard from '../components/SectionCard';

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .listUsers()
      .then(setUsers)
      .catch(() => setError('You do not have access to this page.'))
      .finally(() => setLoading(false));
  }, []);

  const header = (
    <div className="header">
      <div>
        <h1>Accounts</h1>
        <p className="muted">
          App administrators can open and manage every project.
        </p>
      </div>
    </div>
  );

  // The header stays put through loading and error, and the count is only
  // claimed once the fetch has actually resolved.
  if (loading) {
    return (
      <div className="admin-users">
        {header}
        <Loading label="Loading accounts…" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="admin-users">
        {header}
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="admin-users">
      {header}

      <SectionCard
        fullWidth
        title={`${users.length} account${users.length === 1 ? '' : 's'}`}
      >
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
      </SectionCard>
    </div>
  );
}
