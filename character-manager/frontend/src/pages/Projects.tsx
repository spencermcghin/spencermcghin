import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { rulesetApi, type RulesetSummary } from '../services/api';

export default function Projects() {
  const [projects, setProjects] = useState<RulesetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      setProjects(await rulesetApi.list());
      setError(null);
    } catch {
      setError('Could not reach the API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await rulesetApi.create(name.trim());
      setName('');
      await load();
    } catch {
      setError('Could not create the project.');
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string, label: string) => {
    if (!confirm(`Delete "${label}" and every character in it?`)) return;
    await rulesetApi.remove(id);
    await load();
  };

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <div className="projects">
      <div className="header">
        <div>
          <h1>Projects</h1>
          <p className="muted">Each project is one LARP ruleset.</p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <form className="inline-form" onSubmit={create}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New ruleset name…"
          aria-label="New ruleset name"
        />
        <button className="button button-primary" disabled={creating || !name.trim()}>
          {creating ? 'Creating…' : 'New Project'}
        </button>
      </form>

      {projects.length === 0 ? (
        <div className="empty-state">
          <p>No projects yet.</p>
        </div>
      ) : (
        <div className="character-grid">
          {projects.map((p) => (
            <div key={p.id} className="character-card">
              <h2>{p.name}</h2>
              <p className="character-info">
                v{p.version} · {p.characterCount}{' '}
                {p.characterCount === 1 ? 'character' : 'characters'}
              </p>
              {p.description && <p className="character-background">{p.description}</p>}
              <div className="card-actions">
                <Link to={`/projects/${p.id}`} className="button button-small">
                  Open
                </Link>
                <button
                  className="button button-small button-danger"
                  onClick={() => remove(p.id, p.name)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
