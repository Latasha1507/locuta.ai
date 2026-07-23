'use client'

import type { CSSProperties } from 'react'

/**
 * THE LOCUTA ICON SYSTEM — single source of truth.
 *
 * Every icon in the product comes from here. No emoji anywhere: system emoji
 * render differently on Windows, macOS, Android and iOS, so they can never be
 * on-brand, and they carry a flat 2010s look that fights everything else.
 *
 * WHY THIS STYLE ("soft duotone")
 * The mascot is a soft filled blob with crisp white features and rounded
 * everything. The display face (Baloo 2) is chunky and rounded. The old icon
 * set was thin hollow outlines on a 64 grid — the exact opposite of both, which
 * is why it read as a generic icon pack bolted on.
 *
 * So each icon here is built the same way the mascot is:
 *   • a SOFT FILLED BODY   — the silhouette, in the icon colour at low alpha
 *   • CRISP ROUNDED DETAIL — strokes on top at full colour, weight 2, round caps
 *
 * That gives depth and warmth at a glance while staying legible at 14px. The
 * two tones come from ONE colour, so an icon always matches whatever it sits
 * next to — pass the semantic token and the tint follows automatically.
 *
 * GRID: 24×24, content inside a 20px box, 2px stroke, everything round-joined.
 */

export type IconName =
  // core product
  | 'mic' | 'chat' | 'book' | 'briefcase' | 'camera' | 'bulb'
  // progress & reward  (these replace 🔥 🏆 ⭐ 🎁 👑 🥇)
  | 'flame' | 'trophy' | 'star' | 'gift' | 'crown' | 'medal'
  // feedback & state   (these replace ✨ 🎯 💪 🌱 ⚠️ 🔒 ✅)
  | 'sparkle' | 'target' | 'sprout' | 'alert' | 'lock' | 'check'
  // people & tone      (these replace 👋 🙌)
  | 'wave' | 'smile' | 'heart' | 'shield'
  // navigation & utility
  | 'bolt' | 'grid' | 'clock' | 'arrow' | 'cog' | 'out' | 'share' | 'play' | 'replay'

/** Hex (#rgb or #rrggbb) → rgba with the given alpha. Falls back to the raw
    value for named colours or existing rgb()/currentColor strings. */
function withAlpha(color: string, alpha: number): string {
  const hex = color.trim()
  if (!hex.startsWith('#')) return hex
  let h = hex.slice(1)
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

interface Parts {
  /** The soft silhouette, filled at low alpha. */
  body?: string
  /** Crisp detail strokes at full colour. */
  line?: string
  /** Small solid dots/accents at full colour. */
  dot?: string
}

// Every path is drawn on a 24×24 grid with generous radii — no sharp corners,
// matching the mascot and the rounded display face.
const PATHS: Record<IconName, Parts> = {
  mic: {
    body: 'M12 2.5c1.9 0 3.2 1.4 3.2 3.2v5.6c0 1.8-1.3 3.2-3.2 3.2s-3.2-1.4-3.2-3.2V5.7c0-1.8 1.3-3.2 3.2-3.2z',
    line: 'M12 2.5c1.9 0 3.2 1.4 3.2 3.2v5.6c0 1.8-1.3 3.2-3.2 3.2s-3.2-1.4-3.2-3.2V5.7c0-1.8 1.3-3.2 3.2-3.2zM6.2 10.6c0 3.6 2.5 6.2 5.8 6.2s5.8-2.6 5.8-6.2M12 16.8v3.1M8.6 21.5h6.8',
  },
  chat: {
    body: 'M3 7.4C3 5.2 4.7 3.6 7 3.6h10c2.3 0 4 1.6 4 3.8v6c0 2.2-1.7 3.8-4 3.8h-6l-4 3.3v-3.3c-2.3 0-4-1.6-4-3.8z',
    line: 'M3 7.4C3 5.2 4.7 3.6 7 3.6h10c2.3 0 4 1.6 4 3.8v6c0 2.2-1.7 3.8-4 3.8h-6l-4 3.3v-3.3c-2.3 0-4-1.6-4-3.8z',
    dot: 'M8.4 10.4a1.15 1.15 0 100 .01zM12 10.4a1.15 1.15 0 100 .01zM15.6 10.4a1.15 1.15 0 100 .01z',
  },
  book: {
    body: 'M12 6c-1.9-1.6-4.9-2-8.2-1.6v13c3.3-.4 6.3 0 8.2 1.6 1.9-1.6 4.9-2 8.2-1.6v-13C16.9 4 13.9 4.4 12 6z',
    line: 'M12 6c-1.9-1.6-4.9-2-8.2-1.6v13c3.3-.4 6.3 0 8.2 1.6 1.9-1.6 4.9-2 8.2-1.6v-13C16.9 4 13.9 4.4 12 6zM12 6v13',
  },
  briefcase: {
    body: 'M3 9.4c0-1.5 1.2-2.6 2.7-2.6h12.6c1.5 0 2.7 1.1 2.7 2.6v8c0 1.5-1.2 2.6-2.7 2.6H5.7C4.2 20 3 18.9 3 17.4z',
    line: 'M3 9.4c0-1.5 1.2-2.6 2.7-2.6h12.6c1.5 0 2.7 1.1 2.7 2.6v8c0 1.5-1.2 2.6-2.7 2.6H5.7C4.2 20 3 18.9 3 17.4zM8.8 6.8V5.9c0-1 .8-1.9 1.9-1.9h2.6c1.1 0 1.9.9 1.9 1.9v.9M3 13h18',
  },
  camera: {
    body: 'M3 8.6C3 7.2 4.1 6 5.6 6h1.7l1-1.7c.3-.5.8-.8 1.4-.8h4.6c.6 0 1.1.3 1.4.8l1 1.7h1.7C19.9 6 21 7.2 21 8.6v8.2c0 1.4-1.1 2.6-2.6 2.6H5.6C4.1 19.4 3 18.2 3 16.8z',
    line: 'M3 8.6C3 7.2 4.1 6 5.6 6h1.7l1-1.7c.3-.5.8-.8 1.4-.8h4.6c.6 0 1.1.3 1.4.8l1 1.7h1.7C19.9 6 21 7.2 21 8.6v8.2c0 1.4-1.1 2.6-2.6 2.6H5.6C4.1 19.4 3 18.2 3 16.8zM12 15.8a3.4 3.4 0 100-6.8 3.4 3.4 0 000 6.8z',
  },
  bulb: {
    body: 'M12 2.6c3.9 0 6.7 2.8 6.7 6.4 0 2.7-1.6 4.3-2.8 5.8-.7.9-1.1 1.6-1.1 2.6H9.2c0-1-.4-1.7-1.1-2.6-1.2-1.5-2.8-3.1-2.8-5.8 0-3.6 2.8-6.4 6.7-6.4z',
    line: 'M12 2.6c3.9 0 6.7 2.8 6.7 6.4 0 2.7-1.6 4.3-2.8 5.8-.7.9-1.1 1.6-1.1 2.6H9.2c0-1-.4-1.7-1.1-2.6-1.2-1.5-2.8-3.1-2.8-5.8 0-3.6 2.8-6.4 6.7-6.4zM9.8 19.4h4.4M10.4 21.6h3.2',
  },
  flame: {
    body: 'M12 2.2c1.2 3.2-2.4 4.4-2.4 7.5 0 1.2.4 2 1.2 2.4-1.2-.4-2.4-1.6-2.4-3.5 0 0-3.6 3.2-3.6 8 0 4.3 3.2 7.2 7.2 7.2s7.2-2.9 7.2-7.2c0-3.6-2-6-3.2-8 .4 2-.8 3.2-2 3.2-1.6 0-2.4-1.2-2.4-2.8 0-2.4 2-3.6.4-6.8z',
    line: 'M12 2.2c1.2 3.2-2.4 4.4-2.4 7.5 0 1.2.4 2 1.2 2.4-1.2-.4-2.4-1.6-2.4-3.5 0 0-3.6 3.2-3.6 8 0 4.3 3.2 7.2 7.2 7.2s7.2-2.9 7.2-7.2c0-3.6-2-6-3.2-8 .4 2-.8 3.2-2 3.2-1.6 0-2.4-1.2-2.4-2.8 0-2.4 2-3.6.4-6.8z',
  },
  trophy: {
    body: 'M7.4 3.4h9.2v5.3c0 3-1.9 5.3-4.6 5.3s-4.6-2.3-4.6-5.3z',
    line: 'M7.4 3.4h9.2v5.3c0 3-1.9 5.3-4.6 5.3s-4.6-2.3-4.6-5.3zM7.4 4.9c-2.6-.4-3.8 1.1-3.8 3s1.5 3.4 4.2 3.4M16.6 4.9c2.6-.4 3.8 1.1 3.8 3s-1.5 3.4-4.2 3.4M12 14v3M9 20.6h6l-.8-3H9.8z',
  },
  star: {
    body: 'M12 2.6l2.7 6 6.4.7-4.8 4.4 1.4 6.3L12 16.7l-5.7 3.3 1.4-6.3L2.9 9.3l6.4-.7z',
    line: 'M12 2.6l2.7 6 6.4.7-4.8 4.4 1.4 6.3L12 16.7l-5.7 3.3 1.4-6.3L2.9 9.3l6.4-.7z',
  },
  gift: {
    body: 'M3.6 10.6h16.8v9.2c0 .9-.7 1.6-1.6 1.6H5.2c-.9 0-1.6-.7-1.6-1.6z',
    line: 'M3.6 10.6h16.8v9.2c0 .9-.7 1.6-1.6 1.6H5.2c-.9 0-1.6-.7-1.6-1.6zM2.8 7h18.4v3.6H2.8zM12 7v14.4M12 7C9.6 3 4 3.8 6.4 7M12 7c2.4-4 8-3.2 5.6 0',
  },
  crown: {
    body: 'M3.4 17.6L2.2 8.2l5.2 3.6L12 5l4.6 6.8 5.2-3.6-1.2 9.4z',
    line: 'M3.4 17.6L2.2 8.2l5.2 3.6L12 5l4.6 6.8 5.2-3.6-1.2 9.4zM3.4 17.6h17.2v2.8H3.4z',
  },
  medal: {
    body: 'M12 21a6.2 6.2 0 100-12.4A6.2 6.2 0 0012 21z',
    line: 'M12 21a6.2 6.2 0 100-12.4A6.2 6.2 0 0012 21zM8.4 8.9L5.6 3.2h12.8l-2.8 5.7',
    dot: 'M12 12.4l.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z',
  },
  sparkle: {
    body: 'M12 2.4l2 6.1 6.1 2-6.1 2-2 6.1-2-6.1-6.1-2 6.1-2z',
    line: 'M12 2.4l2 6.1 6.1 2-6.1 2-2 6.1-2-6.1-6.1-2 6.1-2zM18.8 16.4l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
  },
  target: {
    body: 'M12 21.4a9.4 9.4 0 100-18.8 9.4 9.4 0 000 18.8z',
    line: 'M12 21.4a9.4 9.4 0 100-18.8 9.4 9.4 0 000 18.8zM12 17.4a5.4 5.4 0 100-10.8 5.4 5.4 0 000 10.8z',
    dot: 'M12 13.6a1.6 1.6 0 100-3.2 1.6 1.6 0 000 3.2z',
  },
  sprout: {
    body: 'M12 21v-7.4c0-3.6-2.8-6.2-6.4-6.2H4v1.4c0 3.6 2.8 6.2 6.4 6.2M12 13.6c0-3 2.4-5.2 5.4-5.2H20v1.2c0 3-2.4 5.2-5.4 5.2',
    line: 'M12 21v-8M12 13.6C12 9.9 9.1 7.4 5.4 7.4H3.8v1.2c0 3.7 2.9 6.2 6.6 6.2h1.6M12 14.4c0-3.1 2.4-5.4 5.6-5.4h1.4v1c0 3.1-2.4 5.4-5.6 5.4H12',
  },
  alert: {
    body: 'M10.7 3.6c.6-1 2-1 2.6 0l8 13.7c.6 1-.1 2.3-1.3 2.3H4c-1.2 0-1.9-1.3-1.3-2.3z',
    line: 'M10.7 3.6c.6-1 2-1 2.6 0l8 13.7c.6 1-.1 2.3-1.3 2.3H4c-1.2 0-1.9-1.3-1.3-2.3zM12 9v4.2',
    dot: 'M12 17.2a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4z',
  },
  lock: {
    body: 'M4.4 12.4c0-1.2 1-2.2 2.2-2.2h10.8c1.2 0 2.2 1 2.2 2.2v6.8c0 1.2-1 2.2-2.2 2.2H6.6c-1.2 0-2.2-1-2.2-2.2z',
    line: 'M4.4 12.4c0-1.2 1-2.2 2.2-2.2h10.8c1.2 0 2.2 1 2.2 2.2v6.8c0 1.2-1 2.2-2.2 2.2H6.6c-1.2 0-2.2-1-2.2-2.2zM7.8 10.2V7.6a4.2 4.2 0 018.4 0v2.6',
    dot: 'M12 17.2a1.6 1.6 0 100-3.2 1.6 1.6 0 000 3.2z',
  },
  check: {
    line: 'M4.8 12.6l4.6 4.6 9.8-10.4',
  },
  wave: {
    body: 'M5.7 13.4a6.3 6.3 0 0112.6 0v1.4a6.3 6.3 0 01-12.6 0z',
    line: 'M5.7 13.4a6.3 6.3 0 0112.6 0v1.4a6.3 6.3 0 01-12.6 0zM8.7 9.2V5.6a1.5 1.5 0 013 0v3.1M11.7 8.5V4a1.5 1.5 0 013 0v4.6M14.7 9.3V6.4a1.5 1.5 0 013 0v3.2',
  },
  smile: {
    body: 'M12 21.4a9.4 9.4 0 100-18.8 9.4 9.4 0 000 18.8z',
    line: 'M12 21.4a9.4 9.4 0 100-18.8 9.4 9.4 0 000 18.8zM8.4 14.4c1.4 1.8 5.8 1.8 7.2 0',
    dot: 'M9.2 10.6a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4zM14.8 10.6a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4z',
  },
  heart: {
    body: 'M12 20.6S3.4 14.8 3.4 8.6c0-3.1 2.3-5 4.6-5 1.9 0 3.1 1.2 4 2.3.9-1.1 2.1-2.3 4-2.3 2.3 0 4.6 1.9 4.6 5 0 6.2-8.6 12-8.6 12z',
    line: 'M12 20.6S3.4 14.8 3.4 8.6c0-3.1 2.3-5 4.6-5 1.9 0 3.1 1.2 4 2.3.9-1.1 2.1-2.3 4-2.3 2.3 0 4.6 1.9 4.6 5 0 6.2-8.6 12-8.6 12z',
  },
  shield: {
    body: 'M12 2.4l7.8 2.7v5c0 5.4-3.5 9.3-7.8 10.9-4.3-1.6-7.8-5.5-7.8-10.9v-5z',
    line: 'M12 2.4l7.8 2.7v5c0 5.4-3.5 9.3-7.8 10.9-4.3-1.6-7.8-5.5-7.8-10.9v-5zM8.6 11.6l2.4 2.4 4.4-5',
  },
  bolt: {
    body: 'M13.6 2.2L5.6 14.2h5L9.4 21.8l9.2-12.6h-5.4z',
    line: 'M13.6 2.2L5.6 14.2h5L9.4 21.8l9.2-12.6h-5.4z',
  },
  grid: {
    body: 'M3.4 3.4h7.2v7.2H3.4zM13.4 3.4h7.2v7.2h-7.2zM3.4 13.4h7.2v7.2H3.4zM13.4 13.4h7.2v7.2h-7.2z',
    line: 'M5.4 3.4h3.2a2 2 0 012 2v3.2a2 2 0 01-2 2H5.4a2 2 0 01-2-2V5.4a2 2 0 012-2zM15.4 3.4h3.2a2 2 0 012 2v3.2a2 2 0 01-2 2h-3.2a2 2 0 01-2-2V5.4a2 2 0 012-2zM5.4 13.4h3.2a2 2 0 012 2v3.2a2 2 0 01-2 2H5.4a2 2 0 01-2-2v-3.2a2 2 0 012-2zM15.4 13.4h3.2a2 2 0 012 2v3.2a2 2 0 01-2 2h-3.2a2 2 0 01-2-2v-3.2a2 2 0 012-2z',
  },
  clock: {
    body: 'M12 21.4a9.4 9.4 0 100-18.8 9.4 9.4 0 000 18.8z',
    line: 'M12 21.4a9.4 9.4 0 100-18.8 9.4 9.4 0 000 18.8zM12 6.8V12l3.8 2.4',
  },
  arrow: {
    line: 'M4.4 12h14M13 6.6l5.4 5.4-5.4 5.4',
  },
  cog: {
    body: 'M12 15.8a3.8 3.8 0 100-7.6 3.8 3.8 0 000 7.6z',
    line: 'M12 15.8a3.8 3.8 0 100-7.6 3.8 3.8 0 000 7.6zM19.2 12a7.2 7.2 0 01-.1 1.2l2 1.5-1.9 3.3-2.4-1a7.3 7.3 0 01-2.1 1.2l-.4 2.5h-3.8l-.4-2.5a7.3 7.3 0 01-2.1-1.2l-2.4 1-1.9-3.3 2-1.5a7.4 7.4 0 010-2.4l-2-1.5 1.9-3.3 2.4 1a7.3 7.3 0 012.1-1.2l.4-2.5h3.8l.4 2.5a7.3 7.3 0 012.1 1.2l2.4-1 1.9 3.3-2 1.5c.1.4.1.8.1 1.2z',
  },
  out: {
    line: 'M9.6 4.4H5.8a2 2 0 00-2 2v11.2a2 2 0 002 2h3.8M14.4 7.6l4.4 4.4-4.4 4.4M8.8 12h10',
  },
  share: {
    body: 'M18 7.6a2.8 2.8 0 100-5.6 2.8 2.8 0 000 5.6zM6 14.8a2.8 2.8 0 100-5.6 2.8 2.8 0 000 5.6zM18 22a2.8 2.8 0 100-5.6A2.8 2.8 0 0018 22z',
    line: 'M18 7.6a2.8 2.8 0 100-5.6 2.8 2.8 0 000 5.6zM6 14.8a2.8 2.8 0 100-5.6 2.8 2.8 0 000 5.6zM18 22a2.8 2.8 0 100-5.6A2.8 2.8 0 0018 22zM8.5 10.6l7-3.2M8.5 13.4l7 3.2',
  },
  play: {
    body: 'M12 21.4a9.4 9.4 0 100-18.8 9.4 9.4 0 000 18.8z',
    line: 'M12 21.4a9.4 9.4 0 100-18.8 9.4 9.4 0 000 18.8zM10.2 8.8l5.4 3.2-5.4 3.2z',
  },
  // Restart-from-start: a near-full circular arrow with the arrowhead top-left.
  replay: {
    line: 'M3.6 12a8.4 8.4 0 1 0 2.5-6L3.4 8.6M3.4 3.8v4.8h4.8',
  },
}

export interface IconProps {
  /** Autocompletes to IconName. Plain strings are accepted so existing data
      arrays keep compiling, but an unknown name warns loudly in development
      rather than silently rendering nothing. */
  name: IconName | (string & {})
  /** Rendered box in px. Optically tuned for 14–48. */
  size?: number
  /** Any hex/rgb colour or a design token. The soft fill is derived from it. */
  color?: string
  /** Strength of the soft fill. Lower it on busy backgrounds. */
  fillOpacity?: number
  className?: string
  style?: CSSProperties
  /** Give the icon meaning for screen readers; omit for decorative icons. */
  title?: string
}

export function Icon({
  name,
  size = 24,
  color = 'currentColor',
  fillOpacity = 0.2,
  className,
  style,
  title,
}: IconProps) {
  // Migration safety net: the old sprite used ids like "ic-chat". If one is
  // still passed from a page that hasn't been migrated, resolve it instead of
  // silently rendering nothing — a blank space is far harder to spot than a
  // console warning, and this way no icon ever just vanishes from the UI.
  const resolved = (typeof name === 'string' && name.startsWith('ic-') ? name.slice(3) : name) as IconName
  const parts = PATHS[resolved]
  if (!parts) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Icon] unknown icon "${name}". Add it to components/ui/icons.tsx or fix the name.`)
    }
    return null
  }
  if (process.env.NODE_ENV !== 'production' && resolved !== name) {
    console.warn(`[Icon] "${name}" is a legacy sprite id — use name="${resolved}".`)
  }
  // Stroke stays optically even across sizes: thinner as the icon grows.
  const stroke = size >= 40 ? 1.7 : size >= 28 ? 1.9 : 2

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ display: 'block', flex: 'none', ...style }}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      {parts.body && <path d={parts.body} fill={withAlpha(color, fillOpacity)} />}
      {parts.line && (
        <path
          d={parts.line}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
      {parts.dot && <path d={parts.dot} fill={color} />}
    </svg>
  )
}

/** Every icon name, for previews and tests. */
export const ICON_NAMES = Object.keys(PATHS) as IconName[]

/**
 * Emoji → icon mapping. Emoji are banned in the UI; when replacing one, use
 * this so the same idea keeps the same icon everywhere.
 *   🎤 mic · 🔥 flame · 🏆 trophy · ⭐ star · 🎁 gift · 👑 crown · 🥇 medal
 *   ✨ sparkle · 🎯 target · 💪 bolt · 🌱 sprout · ⚠️ alert · 🔒 lock
 *   ✅ check · 👋 wave · 🙂 smile · ❤️ heart · 🛡️ shield · ⚡ bolt · ⏱️ clock
 */
export const EMOJI_REPLACEMENTS: Record<string, IconName> = {
  '🎤': 'mic', '🔥': 'flame', '🏆': 'trophy', '⭐': 'star', '🎁': 'gift',
  '👑': 'crown', '🥇': 'medal', '✨': 'sparkle', '🎯': 'target', '💪': 'bolt',
  '🌱': 'sprout', '⚠️': 'alert', '🔒': 'lock', '✅': 'check', '👋': 'wave',
  '🙂': 'smile', '❤️': 'heart', '🛡️': 'shield', '⚡': 'bolt', '⏱️': 'clock',
}
