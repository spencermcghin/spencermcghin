import type { ElementType, ReactNode } from 'react';
import './SectionCard.css';

/**
 * The app's one card: a bordered surface with corner marks and an optional
 * eyebrow heading. Before this the same surface was drawn several ways
 * (.info-card, .story-panel, the options-page frame).
 */
export default function SectionCard({
  title,
  as: Tag = 'section',
  sticky = false,
  fullWidth = false,
  className,
  children,
}: {
  /** Rendered as the card's eyebrow heading. */
  title?: ReactNode;
  as?: ElementType;
  /** Keep the card in view while the column beside it scrolls. */
  sticky?: boolean;
  /** Span every column of the parent grid. */
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const cls = [
    'section-card',
    sticky ? 'is-sticky' : '',
    fullWidth ? 'full-width' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <Tag className={cls}>
      {title != null && <h2>{title}</h2>}
      {children}
    </Tag>
  );
}
