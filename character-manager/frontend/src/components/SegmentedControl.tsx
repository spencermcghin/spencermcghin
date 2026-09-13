import type { ReactNode } from 'react';
import './SegmentedControl.css';

export interface SegmentOption<T extends string> {
  id: T;
  label: ReactNode;
  disabled?: boolean;
}

/**
 * One pill group, one active segment. The single implementation behind the
 * grouping pickers, view switches and either/or fields; before this the app
 * drew the same control three ways (.ed-seg, .cl-seg, .phase-toggle).
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  disabled = false,
  label,
  title,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (id: T) => void;
  /** `sm` fits the dense either/or fields inside editor rows. */
  size?: 'md' | 'sm';
  disabled?: boolean;
  /** Announced name of the group. */
  label?: string;
  title?: string;
}) {
  return (
    <div
      className={size === 'sm' ? 'seg seg-sm' : 'seg'}
      role="group"
      aria-label={label}
      title={title}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={o.id === value ? 'is-on' : ''}
          aria-pressed={o.id === value}
          disabled={disabled || o.disabled}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
