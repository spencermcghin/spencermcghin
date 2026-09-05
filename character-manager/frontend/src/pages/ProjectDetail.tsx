import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { characterApi, rulesetApi } from '../services/api';
import type { Character, Ruleset } from '../../../shared/rules-schema';

export default function ProjectDetail() {
  const { id = '' } = useParams();
  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [r, cs] = await Promise.all([
        rulesetApi.get(id),
        characterApi.listForRuleset(id),
      ]);
      setRuleset(r);
      setCharacters(cs);
      setError(null);
    } catch {
      setError('Could not load this project.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await characterApi.create(id, name.trim());
    setName('');
    await load();
  };

  const exportJson = () => {
    if (!ruleset) return;
    // Downloads are inert inside the artifact sandbox but work in a browser.
    const blob = new Blob([JSON.stringify(ruleset, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ruleset.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <div className="error">{error}</div>;
  if (!ruleset) return <p className="muted">Not found.</p>;

  const stat = (label: string, value: number) => (
    <div key={label} className="attribute-item">
      <dd>{value}</dd>
      <dt>{label}</dt>
    </div>
  );

  return (
    <div className="project-detail">
      <div className="header">
        <div>
          <h1>{ruleset.name}</h1>
          <p className="muted">
            Version {ruleset.version}
            {ruleset.description ? ` · ${ruleset.description}` : ''}
          </p>
        </div>
        <div className="actions">
          <button className="button" onClick={exportJson}>
            Export
          </button>
        </div>
      </div>

      <div className="character-info-grid">
        <div className="info-card">
          <h2>Ruleset</h2>
          <dl className="attributes">
            {stat('Currencies', ruleset.currencies.length)}
            {stat('Archetypes', ruleset.packages.length)}
            {stat('Trees', ruleset.traitGroups.length)}
            {stat('Skills', ruleset.traits.length)}
            {stat('Tracks', ruleset.tracks.length)}
            {stat('Caps', ruleset.purchaseRules.length)}
          </dl>
        </div>

        <div className="info-card">
          <h2>Starting Budget</h2>
          <dl>
            {ruleset.startingBudget.map((b) => {
              const c = ruleset.currencies.find((x) => x.id === b.currencyId);
              return [
                <dt key={`${b.currencyId}-t`}>{c?.name ?? b.currencyId}</dt>,
                <dd key={`${b.currencyId}-d`}>{b.amount}</dd>,
              ];
            })}
          </dl>
        </div>
      </div>

      <div className="header" style={{ marginTop: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>Characters</h1>
      </div>

      <form className="inline-form" onSubmit={create}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New character name…"
          aria-label="New character name"
        />
        <button className="button button-primary" disabled={!name.trim()}>
          Add Character
        </button>
      </form>

      {characters.length === 0 ? (
        <div className="empty-state">
          <p>No characters in this ruleset yet.</p>
        </div>
      ) : (
        <div className="character-grid">
          {characters.map((c) => (
            <div key={c.id} className="character-card">
              <h2>{c.name}</h2>
              <p className="character-info">
                {c.packageIds.length > 0
                  ? c.packageIds
                      .map((pid) => ruleset.packages.find((p) => p.id === pid)?.name ?? pid)
                      .join(' · ')
                  : 'No archetype'}
              </p>
              <p className="character-background">
                {Object.keys(c.traitLevels).length} skill
                {Object.keys(c.traitLevels).length === 1 ? '' : 's'}
              </p>
              <div className="card-actions">
                <Link to={`/characters/${c.id}`} className="button button-small">
                  Open Sheet
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="back-link">
        <Link to="/projects">Back to Projects</Link>
      </div>
    </div>
  );
}
