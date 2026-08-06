import Image from 'next/image'

/**
 * THE LOCUTA LOGO.
 *
 * Renders the brand lockup from /public/logo.png (the speech-bubble waveform
 * mark + the "locuta" wordmark, as one image). Every screen uses this one
 * component, so the logo is swapped in exactly one place.
 *
 * The `size` prop is the RENDERED HEIGHT in px (same meaning it had for the old
 * mark), and the width follows the image's natural aspect ratio, so existing
 * callers keep working without changes.
 */

// Natural pixel dimensions of public/logo.png — used to preserve aspect ratio.
const LOGO_W = 782
const LOGO_H = 319
const ASPECT = LOGO_W / LOGO_H

export function LocutaLogo({
  size = 36,
  // Accepted for backwards-compatibility with existing callers. The wordmark is
  // now baked into the image, so these no longer change what's drawn.
  wordmark = true,
  color: _color,
  wordmarkColor: _wordmarkColor,
}: {
  /** Rendered height in px. Width follows the logo's aspect ratio. */
  size?: number
  wordmark?: boolean
  color?: string
  wordmarkColor?: string
}) {
  void wordmark
  void _color
  void _wordmarkColor

  const height = size
  const width = Math.round(size * ASPECT)

  return (
    <Image
      src="/logo.png"
      alt="Locuta"
      width={width}
      height={height}
      priority
      style={{ height, width: 'auto', display: 'block', flex: 'none' }}
    />
  )
}
