import type { CSSProperties } from 'react'
import { lc } from '@/components/landing/tokens'

// NEUTRAL MODULE — deliberately NOT marked 'use client'.
//
// These values are imported by BOTH server components (LandingPage) and client
// components (Button). Anything non-component exported from a 'use client'
// module arrives in a server component as a client-reference proxy and throws
// the moment it's called:
//
//   "Attempted to call pressable() from the server but pressable is on the
//    client. It's not possible to invoke a client function from the server."
//
// The build compiles fine and it only blows up at runtime, so shared constants
// and helpers live here instead. Same trap that produced `TONES.some is not a
// function` in production.

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'onDark'
export type ButtonSize = 'sm' | 'md' | 'lg'

export const SIZES: Record<ButtonSize, { pad: string; font: number; radius: number; gap: number }> = {
  sm: { pad: '9px 15px', font: 13, radius: 12, gap: 7 },
  md: { pad: '13px 22px', font: 14.5, radius: 14, gap: 9 },
  lg: { pad: '16px 30px', font: 15.5, radius: 16, gap: 10 },
}

export interface Skin {
  bg: string
  fg: string
  border: string
  /** Fill on hover. */
  hoverBg: string
  /** Colour of the solid 3D edge under the button — the "key side". */
  edge: string
  ring: string
}

export const SKINS: Record<ButtonVariant, Skin> = {
  primary: {
    bg: lc.green, fg: '#fff', border: lc.greenDark,
    hoverBg: lc.greenDark, edge: '#2b9a4c', ring: 'rgba(63,206,111,.45)',
  },
  secondary: {
    bg: '#fff', fg: lc.ink, border: '#c3d8b8',
    hoverBg: '#f0f8ec', edge: '#c3d8b8', ring: 'rgba(63,206,111,.35)',
  },
  ghost: {
    bg: 'transparent', fg: lc.greenDark, border: 'transparent',
    hoverBg: 'rgba(63,206,111,.14)', edge: 'transparent', ring: 'rgba(63,206,111,.35)',
  },
  // White button on the green band.
  onDark: {
    bg: '#fff', fg: lc.greenText, border: 'rgba(0,0,0,.14)',
    hoverBg: '#eaf9ef', edge: '#cfe6d6', ring: 'rgba(255,255,255,.65)',
  },
}

/**
 * Adopt the press behaviour on an element that isn't a <Button> yet.
 *
 * Many CTAs across the app are hand-rolled <Link>/<button> elements with inline
 * styles. Rewriting each into <Button> means restructuring its JSX; this lets
 * one adopt the identical press mechanic by spreading two props, so converting
 * a button is a one-line change that cannot alter its layout.
 *
 *   <Link
 *     className={pressable().className}
 *     style={{ ...myStyles, ...pressable().style }}
 *   >
 *
 * Requires <ButtonStyles /> mounted once on the page.
 */
export function pressable(variant: ButtonVariant = 'primary'): {
  className: string
  style: CSSProperties
} {
  const skin = SKINS[variant]
  return {
    className: 'lc-btn',
    style: {
      ['--lc-bg']: skin.bg,
      ['--lc-bg-hover']: skin.hoverBg,
      ['--lc-edge']: skin.edge,
      ['--lc-border']: skin.border,
      ['--lc-ring']: skin.ring,
      background: skin.bg,
      // The edge is drawn by .lc-btn's box-shadow; any inline boxShadow on the
      // host element must be cleared or it fights the press animation.
      boxShadow: undefined,
    } as CSSProperties,
  }
}
