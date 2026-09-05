/**
 * A ruled divider with a fleuron at its centre.
 *
 * Purely decorative, so it is hidden from assistive technology -- a screen
 * reader announcing "floral heart" between sections is noise.
 */
export default function Ornament({ glyph = '❦' }: { glyph?: string }) {
  return (
    <div className="ornament" aria-hidden="true">
      <span className="ornament-glyph">{glyph}</span>
    </div>
  );
}
