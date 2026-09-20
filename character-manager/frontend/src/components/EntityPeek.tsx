import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { indexMap } from '../../../shared/narrative';
import type { NarrativeEntity } from '../../../shared/narrative-schema';
import './EntityPeek.css';

/**
 * A hover preview for an entity name: what it is, its state, and the first
 * lines of its summary, so a reader can tell whether a link is worth
 * following without losing their place. Appears on hover and on keyboard
 * focus alike, after a short delay so scanning a list does not flicker.
 *
 * Rendered through a portal at a fixed position: the lists these names sit
 * in scroll inside the story panel, and a card positioned inside would be
 * clipped at the panel edge.
 */
export default function EntityPeek({
  entity,
  idx,
  children,
}: {
  entity: NarrativeEntity;
  idx: ReturnType<typeof indexMap>;
  children: ReactNode;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [at, setAt] = useState<{ x: number; y: number; above: boolean } | null>(null);

  /* Native listeners rather than React's onMouseEnter/onFocus: the card
     should appear for keyboard focus too, and React's delegated focus
     events proved unreliable for focus moved programmatically. mouseenter
     and focusin fire regardless of how the pointer or focus arrived. */
  useEffect(() => {
    const el = anchor.current;
    if (!el) return;

    const show = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const rect = el.getBoundingClientRect();
        const above = rect.bottom > window.innerHeight * 0.65;
        setAt({
          x: Math.min(rect.left, window.innerWidth - 360),
          y: above ? rect.top - 8 : rect.bottom + 8,
          above,
        });
      }, 350);
    };

    const hide = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      setAt(null);
    };

    el.addEventListener('mouseenter', show);
    el.addEventListener('mouseleave', hide);
    el.addEventListener('focusin', show);
    el.addEventListener('focusout', hide);
    return () => {
      hide();
      el.removeEventListener('mouseenter', show);
      el.removeEventListener('mouseleave', hide);
      el.removeEventListener('focusin', show);
      el.removeEventListener('focusout', hide);
    };
  }, []);

  const degree = (idx.byEntity.get(entity.id) ?? []).length;
  const kind = idx.entityKinds.get(entity.kindId)?.label ?? entity.kindId;

  return (
    <span ref={anchor} className="entity-peek-anchor">
      {children}
      {at &&
        createPortal(
          <div
            className={`entity-peek ${at.above ? 'is-above' : ''}`}
            style={{ left: at.x, top: at.y }}
            role="tooltip"
          >
            <p className="entity-peek-meta">
              {kind} · {entity.status} ·{' '}
              {degree === 0 ? 'unconnected' : `${degree} connection${degree === 1 ? '' : 's'}`}
              {entity.occursAt ? ` · ${entity.occursAt}` : ''}
            </p>
            <p className="entity-peek-name">{entity.name}</p>
            {(entity.summary || entity.body) && (
              <p className="entity-peek-summary">{entity.summary || entity.body}</p>
            )}
          </div>,
          document.body
        )}
    </span>
  );
}
