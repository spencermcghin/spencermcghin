import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { rulesetApi, type RulesetSummary } from '../services/api';

export default function Projects() {
  const [projects, setProjects] = useState<RulesetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [template, setTemplate] = useState<'blank' | 'demo'>('blank');

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
      await rulesetApi.create(name.trim(), { template });
      setName('');
      await load();
    } catch {
      setError('Could not create the project.');
    } finally {
      setCreating(false);
    }
  };

  /** One click to get the worked example, without having to name it first. */
  const addDemo = async () => {
    setCreating(true);
    try {
      await rulesetApi.create('Demo Rules Set', { template: 'demo' });
      await load();
    } catch {
      setError('Could not add the demo project.');
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

  // The nudge is for accounts with no worked example: one seeded before the
  // demo existed, or one where it was deleted. Matching on the name is a
  // guess -- renaming your copy brings the nudge back -- but the alternative
  // is storing which template a project came from, and the offer reads
  // harmlessly either way.
  const hasDemo = projects.some((p) => p.name === 'Demo Rules Set');

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
        <select
          value={template}
          aria-label="What the new project starts from"
          onChange={(e) => setTemplate(e.target.value as 'blank' | 'demo')}
        >
          <option value="blank">Start empty</option>
          <option value="demo">Start from the demo</option>
        </select>
        <button className="button button-primary" disabled={creating || !name.trim()}>
          {creating ? 'Creating…' : 'New Project'}
        </button>
      </form>

      {!hasDemo && (
        <p className="projects-nudge">
          Not sure where to start?{' '}
          <button className="link-button" onClick={addDemo} disabled={creating}>
            Add the Demo Rules Set
          </button>{' '}
          — a small worked example that explains each part of the editor as you
          read it.
        </p>
      )}

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
                {p.characterCount === 1 ? 'character' : 'characters'} ·{' '}
                <span className="role-badge">{p.role}</span>
              </p>
              {p.description && <p className="character-background">{p.description}</p>}
              <div className="card-actions">
                <Link to={`/projects/${p.id}`} className="button button-small">
                  Open
                </Link>
                {p.role === 'admin' && (
                  <button
                    className="button button-small button-danger"
                    onClick={() => remove(p.id, p.name)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
