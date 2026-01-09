import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { characterApi } from '../services/api';
import { CreateCharacterDTO } from '../types/Character';

export default function CharacterForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<CreateCharacterDTO>({
    name: '',
    race: '',
    class: '',
    level: 1,
    background: '',
    attributes: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    skills: [],
    inventory: [],
    notes: '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      loadCharacter(id);
    }
  }, [id, isEdit]);

  const loadCharacter = async (characterId: string) => {
    try {
      const character = await characterApi.getById(characterId);
      setFormData({
        name: character.name,
        race: character.race,
        class: character.class,
        level: character.level,
        background: character.background,
        attributes: character.attributes,
        skills: character.skills,
        inventory: character.inventory,
        notes: character.notes,
      });
    } catch (err) {
      console.error('Failed to load character:', err);
      alert('Failed to load character');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit && id) {
        await characterApi.update(id, formData);
      } else {
        await characterApi.create(formData);
      }
      navigate('/characters');
    } catch (err) {
      console.error('Failed to save character:', err);
      alert('Failed to save character');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAttributeChange = (attribute: string, value: number) => {
    setFormData((prev) => ({
      ...prev,
      attributes: { ...prev.attributes, [attribute]: value },
    }));
  };

  return (
    <div className="character-form">
      <h1>{isEdit ? 'Edit Character' : 'Create New Character'}</h1>

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h2>Basic Information</h2>

          <div className="form-group">
            <label htmlFor="name">Character Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="race">Race</label>
              <input
                type="text"
                id="race"
                name="race"
                value={formData.race}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="class">Class</label>
              <input
                type="text"
                id="class"
                name="class"
                value={formData.class}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="level">Level</label>
              <input
                type="number"
                id="level"
                name="level"
                min="1"
                value={formData.level}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="background">Background</label>
            <textarea
              id="background"
              name="background"
              value={formData.background}
              onChange={handleChange}
              rows={3}
              required
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Attributes</h2>
          <div className="attributes-grid">
            {Object.entries(formData.attributes).map(([attr, value]) => (
              <div key={attr} className="form-group">
                <label htmlFor={attr}>
                  {attr.charAt(0).toUpperCase() + attr.slice(1)}
                </label>
                <input
                  type="number"
                  id={attr}
                  min="1"
                  max="20"
                  value={value}
                  onChange={(e) =>
                    handleAttributeChange(attr, parseInt(e.target.value))
                  }
                  required
                />
              </div>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h2>Additional Details</h2>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={5}
              placeholder="Add any additional notes about your character..."
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/characters')}
            className="button"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="button button-primary"
          >
            {loading ? 'Saving...' : isEdit ? 'Update Character' : 'Create Character'}
          </button>
        </div>
      </form>
    </div>
  );
}
