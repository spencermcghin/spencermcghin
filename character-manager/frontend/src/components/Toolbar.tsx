import type { ReactNode } from 'react';
import './Toolbar.css';

/**
 * A horizontal control strip. The single layout behind the editor's pinned
 * controls, the story bar and the bulk-award bar; before this the app drew
 * the same strip three ways (.ed-bar/.ed-toolbar, .story-bar, .award-bar).
 *
 * Give the element that should soak up leftover width (usually a search
 * input) the `toolbar-grow` class.
 */
export default function Toolbar({
  sticky = false,
  boxed = false,
  spread = false,
  className,
  label,
  children,
}: {
  /** Pin below the navbar while the page scrolls under it. */
  sticky?: boolean;
  /** Draw the strip as a bordered panel rather than a bare row. */
  boxed?: boolean;
  /** Push the ends of the strip apart. */
  spread?: boolean;
  className?: string;
  /** Announced name of the strip. */
  label?: string;
  children: ReactNode;
}) {
  const cls = [
    'toolbar',
    sticky ? 'is-sticky' : '',
    boxed ? 'is-boxed' : '',
    spread ? 'is-spread' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} aria-label={label}>
      {children}
    </div>
  );
}
