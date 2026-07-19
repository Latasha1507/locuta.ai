'use client'

import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { fontDisplay } from '@/components/landing/tokens'
import { SIZES, SKINS, type ButtonVariant, type ButtonSize } from './buttonSkins'

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





/** Injected once. Real :hover/:active beats React state here. */
export function ButtonStyles() {
  return (
    <style>{`
      .lc-btn{
        --lc-drop:0px;      /* how far the top surface has sunk */
        --lc-edge-h:5px;    /* remaining height of the 3D edge underneath */
        position:relative;
        display:inline-flex;align-items:center;justify-content:center;
        font-family:${fontDisplay};font-weight:800;letter-spacing:.01em;
        text-decoration:none;cursor:pointer;
        border:2px solid var(--lc-border);
        background:var(--lc-bg);
        /* The "thick line" under the button. Solid, zero blur, same hue as the
           fill — it reads as the SIDE of a physical key, not as a drop shadow.
           box-shadow does not affect layout, so animating it never reflows. */
        box-shadow:0 var(--lc-edge-h) 0 var(--lc-edge);
        transform:translateY(var(--lc-drop));
        transition:transform .1s ease-out,box-shadow .1s ease-out,background-color .1s ease-out;
        -webkit-tap-highlight-color:transparent;
      }
      /* HOVER — the key is already going down. The surface drops 3px and the
         edge beneath it shrinks by the same 3px, so the bottom stays put and
         the button genuinely looks half-pressed. */
      .lc-btn:hover:not(:disabled):not([aria-disabled="true"]){
        --lc-drop:3px;
        --lc-edge-h:2px;
        background:var(--lc-bg-hover);
      }
      /* ACTIVE — bottomed out. Surface has travelled the full 5px, the edge is
         gone, the key is flat against the page. */
      .lc-btn:active:not(:disabled):not([aria-disabled="true"]){
        --lc-drop:5px;
        --lc-edge-h:0px;
        background:var(--lc-bg-hover);
      }
      .lc-btn:focus-visible{outline:none;box-shadow:0 var(--lc-edge-h) 0 var(--lc-edge),0 0 0 4px var(--lc-ring);}
      .lc-btn:disabled,.lc-btn[aria-disabled="true"]{
        opacity:.5;cursor:not-allowed;--lc-drop:0px;--lc-edge-h:5px;
      }
      /* Motion-sensitive users keep the colour change but skip the travel. */
      @media (prefers-reduced-motion:reduce){
        .lc-btn{transition:background-color .1s ease;}
        .lc-btn:hover:not(:disabled),.lc-btn:active:not(:disabled){--lc-drop:0px;--lc-edge-h:5px;}
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
    width: block ? '100%' : undefined,
    ['--lc-bg']: skin.bg,
    ['--lc-bg-hover']: skin.hoverBg,
    ['--lc-edge']: skin.edge,
    ['--lc-border']: skin.border,
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

/**
 * Adopt the press behaviour on an element that isn't a <Button> yet.
 *
 * Plenty of CTAs across the app are hand-rolled <Link>/<button> elements with
 * inline styles. Rewriting each into <Button> means restructuring its JSX;
 * this lets one adopt the exact same press mechanic by spreading two props,
 * so conversion is a one-line change per button and can't alter layout.
 *
 *   <Link {...pressable('primary')} style={{ ...myStyles, ...pressable('primary').style }}>
 *
 * Requires <ButtonStyles /> mounted once on the page.
 */
