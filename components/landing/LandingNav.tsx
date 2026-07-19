'use client'

import { useState } from 'react'
import Link from 'next/link'
import { lc, fontDisplay } from './tokens'
import { LocutaLogo } from '@/components/ui/LocutaLogo'

const NAV_LINKS = [
  { label: 'How it works', href: '#loop' },
  { label: 'Paths', href: '#categories' },
  { label: 'Coaches', href: '#tones' },
  { label: 'Pricing', href: '#pricing' },
]

export function LandingNav() {
  const [open, setOpen] = useState(false)

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(251,253,250,.92)',
        backdropFilter: 'blur(10px)',
        borderBottom: `2px solid ${lc.sidebarBorder}`,
      }}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-[1200px] items-center justify-between gap-5 px-[18px] py-3 lg:px-10 lg:py-[14px]"
      >
        <Link href="/" aria-label="Locuta home" style={{ textDecoration: 'none' }}>
          <LocutaLogo />
        </Link>

        <div className="hidden items-center gap-[30px] lg:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{ textDecoration: 'none', color: '#7a8a72', fontWeight: 800, fontSize: 14 }}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/auth/login"
            style={{
              textDecoration: 'none',
              color: '#7a8a72',
              fontFamily: fontDisplay,
              fontWeight: 800,
              fontSize: 13.5,
              padding: '11px 10px',
            }}
          >
            LOG IN
          </Link>
          <Link
            href="/auth/signup"
            style={{
              background: lc.green,
              color: '#fff',
              padding: '11px 22px',
              borderRadius: 14,
              fontFamily: fontDisplay,
              fontWeight: 800,
              fontSize: 13.5,
              letterSpacing: '0.02em',
              textDecoration: 'none',
              boxShadow: `0 4px 0 ${lc.greenDark}`,
              display: 'inline-flex',
            }}
          >
            START PRACTICING
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="flex flex-col gap-1 lg:hidden"
          style={{ background: 'none', border: 0, cursor: 'pointer', padding: 8 }}
        >
          <span style={{ width: 22, height: 3, background: lc.ink, borderRadius: 2, display: 'block' }} />
          <span style={{ width: 22, height: 3, background: lc.ink, borderRadius: 2, display: 'block' }} />
          <span style={{ width: 22, height: 3, background: lc.ink, borderRadius: 2, display: 'block' }} />
        </button>
      </nav>

      {open && (
        <div className="flex flex-col px-[18px] pb-[18px] lg:hidden">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{
                textDecoration: 'none',
                color: lc.ink,
                fontWeight: 800,
                fontSize: 15,
                padding: '12px 0',
                borderBottom: '2px solid #eef2e8',
              }}
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/auth/login"
            style={{
              textDecoration: 'none',
              color: lc.ink,
              fontWeight: 800,
              fontSize: 15,
              padding: '12px 0',
              borderBottom: '2px solid #eef2e8',
            }}
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            style={{
              background: lc.green,
              color: '#fff',
              padding: 14,
              borderRadius: 14,
              fontFamily: fontDisplay,
              fontWeight: 800,
              fontSize: 14,
              textAlign: 'center',
              textDecoration: 'none',
              marginTop: 14,
              boxShadow: `0 4px 0 ${lc.greenDark}`,
            }}
          >
            GET STARTED
          </Link>
        </div>
      )}
    </header>
  )
}
