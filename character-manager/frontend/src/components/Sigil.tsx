import './Sigil.css';

/**
 * A circular line-art sigil -- the arcane-geometry marks from the design
 * reference, drawn as plain SVG so they are arithmetic rather than assets.
 *
 * Colour comes from currentColor and weight from --ornament-stroke, so a
 * sigil recolours with any theme and hushes with --ornament-opacity, the
 * same way grain and falloff are theme knobs.
 *
 * Decorative by default and hidden from assistive technology. When one
 * carries meaning (a loading indicator), pass `title` and it becomes a
 * labelled image instead -- the StoryGraph convention.
 */

const MARKS = {
  /* Two interlocked triangles in a ring -- the classic warding seal. */
  hexagram: (
    <>
      <circle cx="32" cy="32" r="23" />
      <path d="M32 11 L50.2 42.5 H13.8 Z" />
      <path d="M32 53 L13.8 21.5 H50.2 Z" strokeOpacity="0.65" />
      <circle cx="32" cy="32" r="3.2" fill="currentColor" stroke="none" />
    </>
  ),
  /* A compass-star: the wayfinding mark. */
  compass: (
    <>
      <circle cx="32" cy="32" r="23" />
      <path d="M32 9 L36.5 27.5 L55 32 L36.5 36.5 L32 55 L27.5 36.5 L9 32 L27.5 27.5 Z" />
      <circle cx="32" cy="32" r="6.5" strokeOpacity="0.65" />
    </>
  ),
  /* A rotated square lattice -- the binding mark. */
  ward: (
    <>
      <circle cx="32" cy="32" r="23" />
      <rect x="17" y="17" width="30" height="30" />
      <rect
        x="17"
        y="17"
        width="30"
        height="30"
        transform="rotate(45 32 32)"
        strokeOpacity="0.65"
      />
    </>
  ),
} as const;

export type SigilName = keyof typeof MARKS;

export default function Sigil({
  name = 'hexagram',
  size = 56,
  title,
  spin = false,
}: {
  name?: SigilName;
  size?: number;
  /** Label the sigil when it conveys state (e.g. "Loading"); omit for pure ornament. */
  title?: string;
  /** Slow rotation for use as a loading indicator. */
  spin?: boolean;
}) {
  return (
    <svg
      className={`sigil${spin ? ' sigil-spin' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      <circle cx="32" cy="32" r="30" strokeOpacity="0.45" />
      {MARKS[name]}
    </svg>
  );
}
