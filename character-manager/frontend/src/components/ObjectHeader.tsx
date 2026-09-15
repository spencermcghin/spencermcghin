import type { ReactNode } from 'react';
import './ObjectHeader.css';

/**
 * The one header every kind of thing wears: what kind of thing this is, its
 * state, its name, and what else it is called. Used by the story entry
 * panel and the character sheet, so an object reads the same wherever it
 * appears.
 */
export default function ObjectHeader({
  kind,
  meta,
  name,
  subtitle,
  actions,
  level = 2,
  className,
}: {
  /** What kind of thing this is: "Rite", "Character". */
  kind: ReactNode;
  /** State and standing beside the kind: "canon · 14 connections". */
  meta?: ReactNode;
  /** The object's name, or an input that edits it. */
  name: ReactNode;
  /** The line under the name: aliases, byline. */
  subtitle?: ReactNode;
  /** Controls that belong to the object: copy link, close, a phase toggle. */
  actions?: ReactNode;
  /** Heading level: 1 on a full page, 2 inside a panel. */
  level?: 1 | 2;
  className?: string;
}) {
  const Name = level === 1 ? 'h1' : 'h2';
  return (
    <header className={className ? `object-header ${className}` : 'object-header'}>
      <div className="oh-main">
        <p className="oh-kick">
          {kind}
          {meta != null && <span className="oh-meta"> · {meta}</span>}
        </p>
        <Name className="oh-name">{name}</Name>
        {subtitle != null && <p className="oh-sub">{subtitle}</p>}
      </div>
      {actions != null && <div className="oh-actions">{actions}</div>}
    </header>
  );
}
