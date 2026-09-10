import { useEffect } from 'react';
import './SaveBar.css';

/**
 * A floating save reminder for long editing pages.
 *
 * The save button in the page header scrolls away on a 200-skill ruleset,
 * which means walking back to the top to save and forgetting to. This bar
 * appears the moment there are unsaved changes and stays in view until they
 * are saved or undone away.
 *
 * While dirty it also asks before the tab is closed or reloaded. Navigation
 * inside the app is not blocked; the bar itself is the reminder.
 */
export default function SaveBar({
  dirty,
  saving,
  onSave,
  onUndo,
  canUndo = false,
  blockers = 0,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  /** Validation errors that make saving impossible right now. */
  blockers?: number;
}) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (!dirty) return null;

  return (
    <div className="savebar" role="status">
      <span className="savebar-label">Unsaved changes</span>
      {blockers > 0 && (
        <span className="savebar-problem">
          {blockers} problem{blockers > 1 ? 's' : ''} to fix
        </span>
      )}
      {onUndo && (
        <button className="button button-small" onClick={onUndo} disabled={!canUndo}>
          Undo
        </button>
      )}
      <button
        className="button button-small button-primary"
        onClick={onSave}
        disabled={saving || blockers > 0}
        title={blockers > 0 ? 'Fix the errors first' : undefined}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}
