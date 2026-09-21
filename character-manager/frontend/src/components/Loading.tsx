import Sigil from './Sigil';
import './Loading.css';

/**
 * The one loading body. A page keeps its chrome (navbar, project tabs,
 * header) and drops this into the content area while a fetch is in flight,
 * so a slow load reads as "working" rather than "broken" or "empty".
 */
export default function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading-body" role="status" aria-live="polite">
      <Sigil name="compass" spin />
      <p className="muted">{label}</p>
    </div>
  );
}
