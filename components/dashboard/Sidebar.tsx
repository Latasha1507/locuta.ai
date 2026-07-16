'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { lc, fontDisplay } from '@/components/landing/tokens'
import { Icon, LocutaLogo } from '@/components/landing/icons'
import { SidebarPromo, type FounderPromo } from './SidebarPromo'

// The full nav from the design. `soon: true` = the route does not exist yet.
// Those render as visible-but-inert with a SOON pill rather than as links,
// because a nav link that 404s is worse than one that says "not yet".
// When each page ships, delete its `soon` flag and add the real href.
const NAV: { label: string; href: string; icon: string; soon?: boolean }[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'ic-grid' },
  { label: 'Practice', href: '/practice', icon: 'ic-mic' },
  { label: 'Paths', href: '/paths', icon: 'ic-book' },
  { label: 'Streak', href: '/streak', icon: 'ic-flame' },
  { label: 'History', href: '/history', icon: 'ic-clock' },
  { label: 'Settings', href: '/settings', icon: 'ic-cog' },
]

export function Sidebar({ isAdmin, promo }: { isAdmin: boolean; promo: FounderPromo | null }) {
  const pathname = usePathname()

  return (
    <aside
      className="sticky top-0 z-20 flex shrink-0 flex-col gap-3 border-b-2 px-4 py-3 lg:h-screen lg:w-[248px] lg:border-b-0 lg:border-r-2 lg:px-4 lg:py-6"
      style={{ background: '#fff', borderColor: lc.sidebarBorder }}
    >
      <Link href="/" className="hidden px-1.5 lg:block" style={{ textDecoration: 'none' }}>
        <LocutaLogo />
      </Link>

      <nav
        aria-label="Main"
        className="flex flex-row items-center gap-2 overflow-x-auto lg:mt-5 lg:flex-col lg:items-stretch lg:gap-1.5 lg:overflow-visible"
      >
        <Link href="/" className="mr-1 flex shrink-0 items-center lg:hidden" style={{ textDecoration: 'none' }} aria-label="Locuta home">
          <LocutaLogo size={30} />
        </Link>

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
                <Icon id={n.icon} size={20} color="#8d9a85" />
                <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 14.5, color: '#8d9a85' }}>
                  {n.label}
                </span>
                <span
                  className="hidden lg:inline"
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
              <Icon id={n.icon} size={20} color={active ? '#fff' : '#6f7d67'} />
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
            <Icon id="ic-shield" size={20} color={lc.purpleDark} />
            <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 14.5, color: lc.purpleDark }}>
              Admin
            </span>
          </Link>
        )}
      </nav>

      {promo && <SidebarPromo promo={promo} />}

      <form action="/auth/signout" method="post" className="hidden lg:block" style={{ marginTop: promo ? 12 : 'auto' }}>
        <button
          type="submit"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
            padding: '12px 13px',
            borderRadius: 13,
            cursor: 'pointer',
            background: '#fff5f3',
            border: '2px solid #ffdcd6',
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 14,
            color: '#c04333',
          }}
        >
          <Icon id="ic-out" size={18} color="#b0392f" />
          Sign out
        </button>
      </form>
    </aside>
  )
}
