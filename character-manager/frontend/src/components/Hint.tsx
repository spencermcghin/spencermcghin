import { useId, type ReactNode } from 'react';
import './Hint.css';

/**
 * A short explanation attached to a control.
 *
 * Native `title` tooltips would be less code, but they take a second to
 * appear, cannot be reached from the keyboard, and are unstyled -- which
 * makes them useless for the one job here, which is explaining a concept to
 * someone who has never seen it.
 *
 * The bubble stays in the DOM and is hidden visually rather than removed, so
 * `aria-describedby` resolves and a screen reader announces the explanation
 * along with the control it belongs to.
 */
export default function Hint({
  children,
  align = 'left',
}: {
  children: ReactNode;
  /** Which edge the bubble hangs from; use 'right' near the right margin. */
  align?: 'left' | 'right';
}) {
  const id = useId();
  return (
    <span className="hint">
      <button
        type="button"
        className="hint-mark"
        aria-label="What is this?"
        aria-describedby={id}
        // A hint is not a form control and must never submit or navigate.
        onClick={(e) => e.preventDefault()}
      >
        ?
      </button>
      <span id={id} role="tooltip" className={`hint-bubble is-${align}`}>
        {children}
      </span>
    </span>
  );
}
