import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { characterApi } from '../services/api';
import { Character } from '../types/Character';

export default function CharacterList() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    try {
      setLoading(true);
      const data = await characterApi.getAll();
      setCharacters(data);
      setError(null);
    } catch (err) {
      setError('Failed to load characters');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this character?')) {
      return;
    }

    try {
      await characterApi.delete(id);
      await loadCharacters();
    } catch (err) {
      alert('Failed to delete character');
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="character-list">
      <div className="header">
        <h1>My Characters</h1>
        <Link to="/characters/new" className="button button-primary">Create New</Link>
      </div>

      {characters.length === 0 ? (
        <div className="empty-state">
          <p>No characters yet. Create your first character to get started!</p>
          <Link to="/characters/new" className="button button-primary">Create Character</Link>
        </div>
      ) : (
        <div className="character-grid">
          {characters.map((character) => (
            <div key={character.id} className="character-card">
              <h2>{character.name}</h2>
              <p className="character-info">
                Level {character.level} {character.race} {character.class}
              </p>
              <p className="character-background">{character.background}</p>
              <div className="card-actions">
                <Link to={`/characters/${character.id}`} className="button button-small">View</Link>
                <Link to={`/characters/${character.id}/edit`} className="button button-small">Edit</Link>
                <button
                  onClick={() => handleDelete(character.id)}
                  className="button button-small button-danger"
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
