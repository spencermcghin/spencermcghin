import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { characterApi } from '../services/api';
import { Character } from '../types/Character';

export default function CharacterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadCharacter(id);
    }
  }, [id]);

  const loadCharacter = async (characterId: string) => {
    try {
      setLoading(true);
      const data = await characterApi.getById(characterId);
      setCharacter(data);
      setError(null);
    } catch (err) {
      setError('Failed to load character');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this character?')) {
      return;
    }

    try {
      await characterApi.delete(id);
      navigate('/characters');
    } catch (err) {
      alert('Failed to delete character');
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!character) return <div>Character not found</div>;

  return (
    <div className="character-detail">
      <div className="header">
        <h1>{character.name}</h1>
        <div className="actions">
          <Link to={`/characters/${id}/edit`} className="button">Edit</Link>
          <button onClick={handleDelete} className="button button-danger">Delete</button>
        </div>
      </div>

      <div className="character-info-grid">
        <div className="info-card">
          <h2>Basic Information</h2>
          <dl>
            <dt>Race</dt>
            <dd>{character.race}</dd>
            <dt>Class</dt>
            <dd>{character.class}</dd>
            <dt>Level</dt>
            <dd>{character.level}</dd>
            <dt>Background</dt>
            <dd>{character.background}</dd>
          </dl>
        </div>

        <div className="info-card">
          <h2>Attributes</h2>
          <dl className="attributes">
            {Object.entries(character.attributes).map(([attr, value]) => (
              <div key={attr} className="attribute-item">
                <dt>{attr.charAt(0).toUpperCase() + attr.slice(1)}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {character.skills.length > 0 && (
          <div className="info-card">
            <h2>Skills</h2>
            <ul>
              {character.skills.map((skill, index) => (
                <li key={index}>{skill}</li>
              ))}
            </ul>
          </div>
        )}

        {character.inventory.length > 0 && (
          <div className="info-card">
            <h2>Inventory</h2>
            <ul>
              {character.inventory.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {character.notes && (
          <div className="info-card full-width">
            <h2>Notes</h2>
            <p>{character.notes}</p>
          </div>
        )}
      </div>

      <div className="back-link">
        <Link to="/characters">Back to Characters</Link>
      </div>
    </div>
  );
}
