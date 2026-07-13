'use client'

import Link from 'next/link'
import { lc, fontDisplay, fontBody } from '@/components/landing/tokens'
import { LandingIconSprite, Icon, LocutaLogo } from '@/components/landing/icons'
import { Mascot, type MascotMood } from '@/components/landing/Mascot'

// Shared shell for every auth screen (signup, login, forgot, reset).
//
// Left: a coach panel — the mascot reacts to what you're doing in the form
// (covers its eyes while you type a password, cheers on success). This is the
// signature moment of the auth flow and the reason it feels like Locuta and
// not a generic form.
// Right: the form itself on a white card.
// Below 900px the panel collapses to a compact mascot header above the form.

const SIDE_POINTS = [
  { icon: 'ic-mic', text: '60-second reps. That is the whole commitment.', color: lc.green },
  { icon: 'ic-chat', text: 'Six coaches. Pick the energy you want in your ear.', color: lc.blue },
  { icon: 'ic-shield', text: 'Private by default. Nobody hears your practice.', color: lc.coral },
]

export function AuthShell({
  mood,
  bubble,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  mood: MascotMood
  bubble: string
  eyebrow: string
  title: React.ReactNode
  subtitle: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <main
      style={{ fontFamily: fontBody, background: lc.pageBg, color: lc.ink, minHeight: '100vh' }}
      className="flex flex-col lg:grid lg:grid-cols-[1fr_1.05fr]"
    >
      <LandingIconSprite />

      {/* Coach panel */}
      <section
        className="flex flex-col justify-center px-6 py-8 lg:px-14 lg:py-12"
        style={{ background: '#f4f9ef', borderRight: `2px solid ${lc.sidebarBorder}` }}
      >
        <Link href="/" aria-label="Back to Locuta home" style={{ textDecoration: 'none', alignSelf: 'flex-start' }}>
          <LocutaLogo />
        </Link>

        <div className="mt-8 flex flex-col items-center lg:mt-14 lg:items-start">
          <div
            className="max-w-[280px] text-center lg:text-left"
            style={{
              position: 'relative',
              background: '#fff',
              border: `2px solid ${lc.sidebarBorder}`,
              borderRadius: 16,
              padding: '12px 16px',
              fontFamily: fontDisplay,
              fontWeight: 700,
              fontSize: 14.5,
              color: lc.ink,
              boxShadow: `0 4px 0 ${lc.sidebarBorder}`,
              marginBottom: 16,
              animation: 'lp-float 4s ease-in-out infinite',
            }}
            aria-live="polite"
          >
            {bubble}
            <span
              style={{
                position: 'absolute',
                bottom: -9,
                left: '50%',
                transform: 'translateX(-50%) rotate(45deg)',
                width: 14,
                height: 14,
                background: '#fff',
                borderRight: `2px solid ${lc.sidebarBorder}`,
                borderBottom: `2px solid ${lc.sidebarBorder}`,
              }}
              aria-hidden="true"
            />
          </div>

          <Mascot mood={mood} />
        </div>

        {/* Proof points — desktop only, they'd push the form below the fold on mobile */}
        <ul className="mt-12 hidden list-none flex-col gap-4 p-0 lg:flex">
          {SIDE_POINTS.map((p) => (
            <li key={p.text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  background: p.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 'none',
                  boxShadow: '0 3px 0 rgba(0,0,0,.12)',
                }}
              >
                <Icon id={p.icon} size={18} color="#fff" />
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: lc.muted, lineHeight: 1.4 }}>{p.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Form panel */}
      <section className="flex flex-1 items-center justify-center px-4 py-8 lg:px-10 lg:py-12">
        <div className="w-full max-w-[430px]">
          <div
            className="p-6 lg:p-8"
            style={{
              background: '#fff',
              border: `2px solid ${lc.cardBorder}`,
              borderRadius: 24,
              boxShadow: `0 6px 0 ${lc.cardBorder}`,
            }}
          >
            <div
              style={{
                display: 'inline-block',
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 11.5,
                letterSpacing: '0.14em',
                color: lc.green,
                background: '#eafaef',
                border: '2px solid #c7edd2',
                padding: '4px 12px',
                borderRadius: 999,
                marginBottom: 14,
              }}
            >
              {eyebrow}
            </div>
            <h1
              className="text-[28px] lg:text-[32px]"
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                letterSpacing: '-0.8px',
                lineHeight: 1.05,
                color: lc.ink,
                margin: '0 0 8px',
              }}
            >
              {title}
            </h1>
            <p style={{ fontSize: 14.5, color: lc.muted, fontWeight: 600, lineHeight: 1.5, margin: '0 0 24px' }}>
              {subtitle}
            </p>

            {children}
          </div>

          {footer && (
            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: lc.muted, fontWeight: 700 }}>
              {footer}
            </p>
          )}
        </div>
      </section>
    </main>
  )
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{ color: lc.greenText, fontWeight: 800, textDecoration: 'none' }}>
      {children}
    </Link>
  )
}
