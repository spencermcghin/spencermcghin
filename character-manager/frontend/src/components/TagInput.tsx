import { useId, useState } from 'react';
import './TagInput.css';

/**
 * Tags as discrete values rather than a comma-separated string.
 *
 * A text field holding `tags.join(', ')` cannot work: parsing on every
 * keystroke drops the separator the moment it is typed, so the caret can
 * never get past the first comma. Tags are a set, so they are edited as one.
 *
 * `suggestions` are the tags already used elsewhere in the ruleset. Tags are
 * a shared vocabulary that purchase rules and conditions match on, so
 * "crafting" and "Crafting" being different is a real bug in a ruleset --
 * offering what already exists is how that gets avoided.
 */
export default function TagInput({
  tags,
  suggestions,
  readOnly,
  onChange,
}: {
  tags: string[];
  suggestions: string[];
  readOnly?: boolean;
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  // A fresh random id on every render would repoint the input at a new
  // datalist each keystroke. useId is stable for the life of the component.
  const listId = useId();

  const commit = (raw: string) => {
    const value = raw.trim();
    // Silently ignoring a duplicate beats a warning for something harmless.
    if (!value || tags.includes(value)) {
      setDraft('');
      return;
    }
    onChange([...tags, value]);
    setDraft('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      // A comma is how people naturally separate tags, so accept it as a
      // commit rather than letting it into the value.
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const unused = suggestions.filter((s) => !tags.includes(s));

  return (
    <div className={`tags ${readOnly ? 'is-readonly' : ''}`}>
      {tags.map((tag) => (
        <span key={tag} className="tags-chip">
          {tag}
          {!readOnly && (
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => onChange(tags.filter((t) => t !== tag))}
            >
              ×
            </button>
          )}
        </span>
      ))}

      {!readOnly && (
        <>
          <input
            className="tags-input"
            value={draft}
            list={listId}
            placeholder={tags.length === 0 ? 'Add a tag…' : ''}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            // Committing on blur means a typed tag is not silently lost by
            // clicking away instead of pressing Enter.
            onBlur={() => commit(draft)}
          />
          <datalist id={listId}>
            {unused.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </>
      )}
    </div>
  );
}
