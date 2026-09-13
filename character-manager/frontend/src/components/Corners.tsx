import './Corners.css';

/**
 * Four L-shaped corner brackets with a small spark flourish, wrapping
 * whatever position:relative container they are dropped into.
 *
 * The generalisation of the single hairline corner .section-card carries: fixed
 * pixel size so the brackets stay crisp on any container, one drawing rotated
 * four ways so the corners cannot drift apart in style. Colour from
 * currentColor (set to a token in CSS), loudness from --ornament-opacity.
 *
 * Pure ornament, always aria-hidden; pointer-events none so it never eats a
 * click meant for the card under it.
 */
export default function Corners({ size = 22 }: { size?: number }) {
  const corner = (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke="currentColor">
      <path d="M1.5 8.5 V1.5 H8.5" />
      <path d="M4.5 4.5 l3.2 3.2" strokeOpacity="0.55" />
    </svg>
  );
  return (
    <span className="corners" aria-hidden="true">
      {corner}
      {corner}
      {corner}
      {corner}
    </span>
  );
}
