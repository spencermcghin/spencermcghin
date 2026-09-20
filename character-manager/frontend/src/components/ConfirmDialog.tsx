import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Corners from './Corners';
import './ConfirmDialog.css';

/**
 * The app's one destructive-action confirmation, replacing the browser's
 * confirm(). A browser dialog is unstyled, unthemed, and blocks the whole
 * tab; this one speaks the app's language and keeps the consequence line
 * readable instead of cramming it into a single sentence.
 */
export interface ConfirmAsk {
  /** The question, e.g. `Delete "Rites of Autumn"?` */
  title: string;
  /** What happens if they say yes. Consequences, not restated questions. */
  body?: string;
  /** Label on the destructive button. Defaults to "Delete". */
  action?: string;
}

/**
 * Returns [confirm, element]. Call confirm(ask) where window.confirm was
 * called -- it resolves true or false -- and render the element once at the
 * page root. Naming the local `confirm` deliberately shadows the global, so
 * a call site cannot fall back to the browser dialog by accident.
 */
export function useConfirm(): [(ask: ConfirmAsk) => Promise<boolean>, ReactNode] {
  const [ask, setAsk] = useState<ConfirmAsk | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmAsk) => {
    setAsk(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setAsk(null);
  }, []);

  const element = ask ? <ConfirmDialog ask={ask} onSettle={settle} /> : null;
  return [confirm, element];
}

function ConfirmDialog({
  ask,
  onSettle,
}: {
  ask: ConfirmAsk;
  onSettle: (ok: boolean) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  // A native <dialog> brings the focus trap, the backdrop, and Escape for
  // free; all this component adds is the app's dress.
  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onSettle(false);
      }}
      onClick={(e) => {
        // Only the backdrop is the dialog element itself.
        if (e.target === ref.current) onSettle(false);
      }}
    >
      <Corners />
      <h2>{ask.title}</h2>
      {ask.body && <p>{ask.body}</p>}
      <div className="confirm-actions">
        {/* Cancel takes focus first: Enter on a reflex declines. */}
        <button className="button" autoFocus onClick={() => onSettle(false)}>
          Cancel
        </button>
        <button className="button button-danger" onClick={() => onSettle(true)}>
          {ask.action ?? 'Delete'}
        </button>
      </div>
    </dialog>
  );
}
