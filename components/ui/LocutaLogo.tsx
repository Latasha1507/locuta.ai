import { fontDisplay, lc } from '@/components/landing/tokens'

/**
 * THE LOCUTA LOGO.
 *
 * WHY IT CHANGED
 * The old mark was a solid green rounded rectangle carrying a `0 3px 0` offset
 * shadow — which is exactly the treatment every BUTTON in this product uses.
 * Two affordance cues stacked (rounded-rect fill + press shadow) meant it read
 * as something you click, not as an identity. People were seeing a button.
 *
 * WHAT IT IS NOW
 * A speech bubble with a voice waveform inside it:
 *   • a bubble is a shape nobody mistakes for a control, and it says "talking"
 *     without a single word — the one thing the product is about
 *   • the tail gives it an asymmetric silhouette, so it's recognisable at 20px
 *     and in a favicon, where a rounded square is indistinguishable from an
 *     app tile
 *   • it echoes the mascot's soft, round geometry instead of fighting it
 *   • NO offset shadow — the mark sits in the page rather than hovering above it
 *
 * The three bars are deliberately uneven: speech has rhythm, and a symmetric
 * set of bars reads as a wifi/signal icon instead.
 */
export function LocutaLogo({
  size = 36,
  color = lc.green,
  wordmark = true,
  wordmarkColor,
}: {
  size?: number
  color?: string
  /** Mark only — for favicons, avatars and tight nav bars. */
  wordmark?: boolean
  wordmarkColor?: string
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.26 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
        style={{ display: 'block', flex: 'none' }}
      >
        {/* Bubble body + tail as one silhouette, so it reads as a single shape */}
        <path
          d="M11 3.5h18c4.1 0 7.5 3.4 7.5 7.5v11c0 4.1-3.4 7.5-7.5 7.5H18.6l-6.1 5.2c-.9.8-2.3.1-2.3-1.1v-4.2C6.4 28.6 3.5 25.4 3.5 21.5v-10.5C3.5 6.9 6.9 3.5 11 3.5z"
          fill={color}
        />
        {/* Waveform — uneven on purpose, so it reads as a voice, not a signal bar */}
        <rect x="13.1" y="14.6" width="3.3" height="7.8" rx="1.65" fill="#fff" />
        <rect x="18.35" y="10.9" width="3.3" height="15.2" rx="1.65" fill="#fff" />
        <rect x="23.6" y="13.2" width="3.3" height="10.6" rx="1.65" fill="#fff" />
      </svg>

      {wordmark && (
        <span
          style={{
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: size * 0.75,
            letterSpacing: '-0.02em',
            color: wordmarkColor ?? lc.ink,
            lineHeight: 1,
          }}
        >
          locuta
        </span>
      )}
    </span>
  )
}
