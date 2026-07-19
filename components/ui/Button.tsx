'use client'

import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { fontDisplay, lc } from '@/components/landing/tokens'

/**
 * THE LOCUTA BUTTON.
 *
 * WHY IT CHANGED
 * Every button used a chunky offset shadow (`box-shadow: 0 5px 0 <dark>`). At
 * one or two per screen that reads as playful; at six it reads as clutter, and
 * it made the whole page look like it was hovering. It also gave buttons a
 * permanently "pressed-able" look with nothing actually happening on press.
 *
 * WHAT REPLACED IT
 *   • WEIGHT comes from a 2px border in a darker shade of the fill, plus a
 *     thicker 3px bottom border. Same visual heft, one flat plane.
 *   • HOVER lifts the button 1px and deepens the fill — it now responds.
 *   • ACTIVE presses it down: the button drops 2px and the bottom border
 *     collapses to 1px, so the travel is real rather than decorative.
 *   • FOCUS shows a proper ring, which the old buttons never had.
 *
 * All of it is CSS, so there is no per-button React state and no re-render on
 * hover. Transitions are 120ms — fast enough to feel mechanical, not floaty.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'onDark'
export type ButtonSize = 'sm' | 'md' | 'lg'

const SIZES: Record<ButtonSize, { pad: string; font: number; radius: number; gap: number }> = {
  sm: { pad: '9px 15px', font: 13, radius: 12, gap: 7 },
  md: { pad: '13px 22px', font: 14.5, radius: 14, gap: 9 },
  lg: { pad: '16px 30px', font: 15.5, radius: 16, gap: 10 },
}

interface Skin {
  bg: string
  fg: string
  border: string
  /** Fill on hover. Wired through --lc-bg-hover; this is the cue people see. */
  hoverBg: string
  /** Soft shadow colour under the button on hover. */
  glow: string
  ring: string
}

const SKINS: Record<ButtonVariant, Skin> = {
  primary: { bg: lc.green, fg: '#fff', border: lc.greenDark, hoverBg: lc.greenDark, glow: 'rgba(47,165,82,.38)', ring: 'rgba(63,206,111,.45)' },
  secondary: { bg: '#fff', fg: lc.ink, border: '#c3d8b8', hoverBg: '#f0f8ec', glow: 'rgba(63,206,111,.22)', ring: 'rgba(63,206,111,.35)' },
  ghost: { bg: 'transparent', fg: lc.greenDark, border: 'transparent', hoverBg: 'rgba(63,206,111,.14)', glow: 'rgba(63,206,111,.18)', ring: 'rgba(63,206,111,.35)' },
  // White button sitting on the green band — the border is a translucent dark
  // so it keeps its weight without introducing a second colour.
  onDark: { bg: '#fff', fg: lc.greenText, border: 'rgba(0,0,0,.14)', hoverBg: '#eaf9ef', glow: 'rgba(0,0,0,.22)', ring: 'rgba(255,255,255,.65)' },
}

/** Injected once. Real :hover/:active/:focus-visible beats React state here. */
export function ButtonStyles() {
  return (
    <style>{`
      .lc-btn{
        --lc-lift:0px;
        position:relative;
        display:inline-flex;align-items:center;justify-content:center;
        font-family:${fontDisplay};font-weight:800;letter-spacing:.01em;
        text-decoration:none;cursor:pointer;
        border-style:solid;border-width:2px;
        background:var(--lc-bg);
        transform:translateY(var(--lc-lift));
        transition:transform .13s ease,background-color .13s ease,box-shadow .13s ease,border-bottom-width .13s ease;
        -webkit-tap-highlight-color:transparent;
      }
      /* HOVER — three cues at once so it is impossible to miss:
         the fill deepens, the button rises 2px, and a soft shadow appears
         underneath it. A 1px nudge on its own reads as nothing. */
      .lc-btn:hover:not(:disabled):not([aria-disabled="true"]){
        background:var(--lc-bg-hover);
        --lc-lift:-2px;
        box-shadow:0 6px 14px var(--lc-glow);
      }
      /* PRESS — the button drops past its resting position, the shadow
         collapses and the bottom edge thins, so it reads as physically
         pushed into the page. */
      .lc-btn:active:not(:disabled):not([aria-disabled="true"]){
        --lc-lift:2px;
        box-shadow:none;
        border-bottom-width:2px!important;
      }
      .lc-btn:focus-visible{outline:none;box-shadow:0 0 0 4px var(--lc-ring);}
      .lc-btn:disabled,.lc-btn[aria-disabled="true"]{opacity:.5;cursor:not-allowed;--lc-lift:0px;box-shadow:none;}
      /* Motion-sensitive users still get the colour change, just no movement. */
      @media (prefers-reduced-motion:reduce){
        .lc-btn{transition:background-color .13s ease;}
        .lc-btn:hover:not(:disabled),.lc-btn:active:not(:disabled){--lc-lift:0px;box-shadow:none;}
      }
    `}</style>
  )
}

export interface ButtonProps {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  href?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  /** Stretch to the container width. */
  block?: boolean
  className?: string
  style?: CSSProperties
  'aria-label'?: string
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  href,
  onClick,
  type = 'button',
  disabled,
  block,
  className,
  style,
  ...rest
}: ButtonProps) {
  const s = SIZES[size]
  const skin = SKINS[variant]

  // CSS custom property needs a widened type; CSSProperties alone rejects it.
  const css = {
    padding: s.pad,
    fontSize: s.font,
    borderRadius: s.radius,
    gap: s.gap,
    color: skin.fg,
    borderColor: skin.border,
    // The thicker bottom edge is what replaces the old offset shadow: it reads
    // as a physical edge the button can press into, on a single flat plane.
    borderBottomWidth: 3,
    width: block ? '100%' : undefined,
    ['--lc-bg']: skin.bg,
    ['--lc-bg-hover']: skin.hoverBg,
    ['--lc-glow']: skin.glow,
    ['--lc-ring']: skin.ring,
    ...style,
  } as CSSProperties

  const cls = `lc-btn${className ? ` ${className}` : ''}`

  if (href && !disabled) {
    // next/link is for in-app navigation only. mailto:, tel: and absolute URLs
    // must be plain anchors, or the router tries to route them and the link
    // silently does nothing.
    const isExternal = /^(mailto:|tel:|https?:\/\/)/i.test(href)
    if (isExternal) {
      return (
        <a
          href={href}
          className={cls}
          style={css}
          {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          {...rest}
        >
          {children}
        </a>
      )
    }
    return (
      <Link href={href} className={cls} style={css} {...rest}>
        {children}
      </Link>
    )
  }

  // A disabled link still needs to render as something inert but readable.
  if (href && disabled) {
    return (
      <span className={cls} style={css} aria-disabled="true" {...rest}>
        {children}
      </span>
    )
  }

  return (
    <button type={type} className={cls} style={css} onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  )
}
