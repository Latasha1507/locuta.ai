// Locuta design system tokens — source of truth for the 2026 redesign.
// Lifted from the design handoff (design_handoff_locuta_app/README.md).
// Reuse these on every redesigned screen; do not hardcode hexes in components.

export const lc = {
  green: '#3fce6f',
  greenDark: '#2fa552',
  greenText: '#3fb950',
  blue: '#1cb0f6',
  blueDark: '#1391d6',
  yellow: '#ffc531',
  yellowDark: '#e0a400',
  coral: '#ff6f61',
  coralDark: '#e0503f',
  orange: '#f5a623',
  purple: '#c774f0',
  purpleDark: '#a94fd6',
  teal: '#1ec8c8',
  pink: '#e46fc9',
  ink: '#4b4b4b',
  muted: '#7d8a75',
  faint: '#98a690',
  pageBg: '#f4faf0',
  cardBorder: '#e8ece2',
  sidebarBorder: '#e6eede',
} as const

// Font stacks — the CSS variables are defined by next/font in app/page.tsx.
export const fontDisplay = "var(--font-baloo), 'Baloo 2', system-ui, sans-serif"
export const fontBody = "var(--font-nunito), 'Nunito', system-ui, sans-serif"

// Signature "chunky 3D" flat bottom-shadow.
export const shadow3d = (px: number, color: string) => `0 ${px}px 0 ${color}`
