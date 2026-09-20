import type { EntityKind } from '../../../shared/narrative-schema';

/**
 * One small mark per kind shape, used wherever a kind is named: the list,
 * the panel eyebrow, the filter, the table pieces. The graph colour-codes
 * the same shapes. Six marks and a fallback, all drawn on the same 12px
 * grid in currentColor, so they inherit whatever text they sit in.
 */
export default function KindGlyph({
  shape,
  size = 11,
}: {
  shape?: EntityKind['shape'];
  size?: number;
}) {
  return (
    <svg
      className="kind-glyph"
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
      style={{ verticalAlign: '-0.09em' }}
    >
      {shape === 'person' ? (
        <>
          <circle cx="6" cy="3.8" r="2" />
          <path d="M2.3 10.5a3.7 3.7 0 0 1 7.4 0" />
        </>
      ) : shape === 'place' ? (
        <>
          <path d="M6 1.3a3.2 3.2 0 0 1 3.2 3.2C9.2 6.8 6 10.7 6 10.7S2.8 6.8 2.8 4.5A3.2 3.2 0 0 1 6 1.3Z" />
          <circle cx="6" cy="4.5" r="1" />
        </>
      ) : shape === 'event' ? (
        <path d="M6 1.5 10.5 6 6 10.5 1.5 6Z" />
      ) : shape === 'thing' ? (
        <path d="M3.5 2h5l2 3.2L6 10.5 1.5 5.2Z" />
      ) : shape === 'group' ? (
        <>
          <circle cx="3.8" cy="4.4" r="1.7" />
          <circle cx="8.2" cy="4.4" r="1.7" />
          <circle cx="6" cy="8.2" r="1.7" />
        </>
      ) : shape === 'idea' ? (
        <path d="M6 1.2 7.2 4.8 10.8 6 7.2 7.2 6 10.8 4.8 7.2 1.2 6 4.8 4.8Z" />
      ) : (
        <circle cx="6" cy="6" r="2.2" />
      )}
    </svg>
  );
}
