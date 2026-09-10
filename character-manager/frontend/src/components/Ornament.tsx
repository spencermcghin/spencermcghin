/**
 * A ruled divider with a fleuron at its centre -- or, as the `diamond`
 * variant, a drawn rule tapering to points around a central diamond, the
 * banner-line from the dark-fantasy reference set.
 *
 * Purely decorative, so it is hidden from assistive technology -- a screen
 * reader announcing "floral heart" between sections is noise.
 */
export default function Ornament({
  glyph = '❦',
  variant = 'glyph',
}: {
  glyph?: string;
  variant?: 'glyph' | 'diamond';
}) {
  if (variant === 'diamond') {
    return (
      <svg
        className="ornament-rule"
        viewBox="0 0 240 14"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Rules taper by fading, the same trick the glyph divider plays
            with its gradient hairlines. */}
        <line x1="6" y1="7" x2="104" y2="7" strokeOpacity="0.85" />
        <line x1="6" y1="7" x2="30" y2="7" strokeOpacity="0.3" />
        <path d="M120 1.5 L127 7 L120 12.5 L113 7 Z" fill="currentColor" stroke="none" />
        <line x1="136" y1="7" x2="234" y2="7" strokeOpacity="0.85" />
        <line x1="210" y1="7" x2="234" y2="7" strokeOpacity="0.3" />
      </svg>
    );
  }
  return (
    <div className="ornament" aria-hidden="true">
      <span className="ornament-glyph">{glyph}</span>
    </div>
  );
}
