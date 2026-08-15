'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { lc, fontDisplay } from '@/components/landing/tokens'
import { LocutaLogo } from '@/components/ui/LocutaLogo'
import { Icon } from '@/components/ui/icons'
import { SidebarPromo, type FounderPromo } from './SidebarPromo'

// The full nav (desktop left rail). `soon: true` = the route does not exist yet
// and renders as a visible-but-inert SOON row rather than a link that 404s.
const NAV: { label: string; href: string; icon: string; soon?: boolean }[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'grid' },
  { label: 'Paths', href: '/paths', icon: 'book' },
  { label: 'Practice', href: '/practice', icon: 'mic' },
  { label: 'Streak', href: '/streak', icon: 'flame' },
  { label: 'History', href: '/history', icon: 'clock' },
  { label: 'Settings', href: '/settings', icon: 'cog' },
]

// Curated primary destinations for the MOBILE bottom bar. 90% of usage is
// mobile, so the daily loop gets thumb-native slots: Home, Paths, and the
// raised Practice action in the centre, with Streak alongside. History /
// Settings / Admin / Sign-out live in the Profile sheet so the bar stays at
// five comfortable targets instead of six cramped ones.
const MOBILE_TABS: { label: string; href: string; icon: string }[] = [
  { label: 'Home', href: '/dashboard', icon: 'grid' },
  { label: 'Paths', href: '/paths', icon: 'book' },
  { label: 'Streak', href: '/streak', icon: 'flame' },
]

export function Sidebar({ isAdmin, promo }: { isAdmin: boolean; promo: FounderPromo | null }) {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  // Escape closes the profile sheet (dialog a11y).
  useEffect(() => {
    if (!sheetOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  const practiceActive = pathname === '/practice'
  const profileActive = ['/history', '/settings', '/admin'].some((p) => pathname === p)

  return (
    <>
      {/* ─────────────── DESKTOP: left rail ─────────────── */}
      <aside
        className="sticky top-0 z-20 hidden shrink-0 flex-col gap-3 lg:flex lg:h-screen lg:w-[248px] lg:border-r-2 lg:px-4 lg:py-6"
        style={{ background: '#fff', borderColor: lc.sidebarBorder }}
      >
        <Link href="/" className="px-1.5" style={{ textDecoration: 'none' }}>
          <LocutaLogo />
        </Link>

        <nav aria-label="Main" className="mt-5 flex flex-col items-stretch gap-1.5">
          {NAV.map((n) => {
            const active = pathname === n.href
            const rowStyle: React.CSSProperties = {
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: '11px 13px',
              borderRadius: 13,
              whiteSpace: 'nowrap',
              textDecoration: 'none',
              background: active ? lc.green : 'transparent',
              boxShadow: active ? `0 3px 0 ${lc.greenDark}` : 'none',
              transition: 'background .15s ease',
            }

            if (n.soon) {
              return (
                <div
                  key={n.href}
                  aria-disabled="true"
                  title="Coming soon"
                  style={{ ...rowStyle, opacity: 0.55, cursor: 'default' }}
                >
                  <Icon name={n.icon} size={20} color="#8d9a85" />
                  <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 14.5, color: '#8d9a85' }}>
                    {n.label}
                  </span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontFamily: fontDisplay,
                      fontWeight: 800,
                      fontSize: 8.5,
                      letterSpacing: '0.06em',
                      color: '#9aa891',
                      background: '#f0f4ec',
                      border: '1.5px solid #e2ead9',
                      padding: '2px 6px',
                      borderRadius: 999,
                    }}
                  >
                    SOON
                  </span>
                </div>
              )
            }

            return (
              <Link key={n.href} href={n.href} style={rowStyle} className="hover:bg-[#f2f7ee]">
                <Icon name={n.icon} size={20} color={active ? '#fff' : '#6f7d67'} />
                <span
                  style={{
                    fontFamily: fontDisplay,
                    fontWeight: 800,
                    fontSize: 14.5,
                    color: active ? '#fff' : lc.ink,
                  }}
                >
                  {n.label}
                </span>
              </Link>
            )
          })}

          {isAdmin && (
            <Link
              href="/admin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '11px 13px',
                borderRadius: 13,
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                background: '#f3ecfd',
                border: '2px solid #e3d5f7',
              }}
            >
              <Icon name="shield" size={20} color={lc.purpleDark} />
              <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 14.5, color: lc.purpleDark }}>
                Admin
              </span>
            </Link>
          )}
        </nav>

        {promo && <SidebarPromo promo={promo} />}
      </aside>

      {/* ─────────────── MOBILE: bottom tab bar ─────────────── */}
      <nav
        aria-label="Main"
        className="lg:hidden"
        style={{
          position: 'fixed',
          insetInline: 0,
          bottom: 0,
          zIndex: 40,
          background: '#fff',
          borderTop: `2px solid ${lc.sidebarBorder}`,
          boxShadow: '0 -3px 16px rgba(43,60,40,.07)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-stretch justify-around" style={{ height: 60 }}>
          {MOBILE_TABS.slice(0, 2).map((t) => (
            <BottomTab key={t.href} href={t.href} icon={t.icon} label={t.label} active={pathname === t.href} />
          ))}

          {/* Centre: the raised Practice action — the daily loop. */}
          <div className="flex flex-1 justify-center">
            <Link
              href="/practice"
              aria-label="Practice"
              aria-current={practiceActive ? 'page' : undefined}
              className="lc-fab flex flex-col items-center"
              style={{ textDecoration: 'none', marginTop: -16 }}
            >
              <span
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: lc.green,
                  boxShadow: `0 4px 0 ${lc.greenDark}`,
                  border: '3px solid #fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="mic" size={25} color="#fff" />
              </span>
              <span
                style={{
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 11,
                  color: practiceActive ? lc.greenDark : '#6f7d67',
                  marginTop: 2,
                }}
              >
                Practice
              </span>
            </Link>
          </div>

          <BottomTab
            href={MOBILE_TABS[2].href}
            icon={MOBILE_TABS[2].icon}
            label={MOBILE_TABS[2].label}
            active={pathname === MOBILE_TABS[2].href}
          />

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            aria-label="Profile and more"
            className="flex flex-1 flex-col items-center justify-center gap-1"
            style={{ background: 'transparent', border: 0, cursor: 'pointer' }}
          >
            <Icon name="smile" size={23} color={profileActive || sheetOpen ? lc.green : '#8d9a85'} />
            <span
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 11,
                color: profileActive || sheetOpen ? lc.greenDark : '#8d9a85',
              }}
            >
              Profile
            </span>
          </button>
        </div>
      </nav>

      {/* MOBILE: profile sheet — the secondary destinations + sign-out. */}
      {sheetOpen && (
        <div
          className="lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Profile menu"
          style={{ position: 'fixed', inset: 0, zIndex: 50 }}
        >
          <button
            aria-label="Close menu"
            onClick={() => setSheetOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(30,40,28,.42)',
              border: 0,
              cursor: 'pointer',
              animation: 'lp-fade .15s ease',
            }}
          />
          <div
            style={{
              position: 'absolute',
              insetInline: 0,
              bottom: 0,
              background: '#fff',
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              borderTop: `2px solid ${lc.sidebarBorder}`,
              padding: '10px 14px calc(16px + env(safe-area-inset-bottom))',
              boxShadow: '0 -10px 34px rgba(0,0,0,.16)',
              animation: 'lp-sheet-up .22s cubic-bezier(.2,.8,.3,1)',
            }}
          >
            <div style={{ width: 40, height: 5, borderRadius: 999, background: '#e2ead9', margin: '2px auto 14px' }} />
            <SheetLink href="/history" icon="clock" label="History" onNav={() => setSheetOpen(false)} />
            <SheetLink href="/settings" icon="cog" label="Settings" onNav={() => setSheetOpen(false)} />
            {isAdmin && <SheetLink href="/admin" icon="shield" label="Admin" onNav={() => setSheetOpen(false)} />}
            {/* Sign-out lives in Settings only. */}
          </div>
          {/* Slide-up. Reduced-motion users are covered by the global rule in
              globals.css that flattens animation-duration. */}
          <style>{`@keyframes lp-sheet-up{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        </div>
      )}
    </>
  )
}

function BottomTab({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="flex flex-1 flex-col items-center justify-center gap-1"
      style={{ textDecoration: 'none' }}
    >
      <Icon name={icon} size={23} color={active ? lc.green : '#8d9a85'} />
      <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 11, color: active ? lc.greenDark : '#8d9a85' }}>
        {label}
      </span>
    </Link>
  )
}

function SheetLink({ href, icon, label, onNav }: { href: string; icon: string; label: string; onNav: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNav}
      className="hover:bg-[#f4f8f1]"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 14px',
        borderRadius: 14,
        textDecoration: 'none',
        color: lc.ink,
      }}
    >
      <Icon name={icon} size={20} color="#6f7d67" />
      <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 14.5, color: lc.ink }}>{label}</span>
    </Link>
  )
}
