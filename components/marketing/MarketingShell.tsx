import Link from 'next/link'
import { lc, fontDisplay, fontBody } from '@/components/landing/tokens'
import { LandingIconSprite, LocutaLogo } from '@/components/landing/icons'
import { LandingNav } from '@/components/landing/LandingNav'

const FOOTER_LINKS = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Use cases', href: '/use-cases' },
  { label: 'Blog', href: '/blog' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
]

// Shared chrome for every marketing/footer page: the landing nav on top, a
// consistent hero header, and the footer. Keeps all six pages visually identical
// to the landing page instead of each reinventing its own layout.
export function MarketingShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ background: lc.pageBg, color: lc.ink, fontFamily: fontBody, minHeight: '100vh' }}>
      <LandingIconSprite />
      <LandingNav />

      <header className="mx-auto max-w-[900px] px-5 pb-6 pt-12 text-center lg:pb-10 lg:pt-16">
        <div
          style={{
            display: 'inline-block',
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: '0.12em',
            color: lc.greenDark,
            background: '#eafaef',
            border: '2px solid #c7edd2',
            padding: '6px 16px',
            borderRadius: 999,
            marginBottom: 18,
          }}
        >
          {eyebrow}
        </div>
        <h1
          className="text-[34px] lg:text-[52px]"
          style={{ fontFamily: fontDisplay, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.05, margin: 0, color: lc.ink }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto text-[15px] lg:text-[17px]" style={{ color: lc.muted, fontWeight: 600, lineHeight: 1.6, maxWidth: 560, margin: '14px auto 0' }}>
            {subtitle}
          </p>
        )}
      </header>

      <main className="mx-auto max-w-[1100px] px-5 pb-16 lg:px-10 lg:pb-24">{children}</main>

      {/* FOOTER */}
      <footer style={{ background: lc.pageBg }} className="px-[14px] pt-6 lg:px-10 lg:pt-8">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4 px-[18px] py-6 lg:px-10 lg:py-[30px]">
          <LocutaLogo size={28} />
          <nav aria-label="Footer" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 22px' }}>
            {FOOTER_LINKS.map((l) => (
              <Link key={l.href} href={l.href} style={{ textDecoration: 'none', color: '#7a8a72', fontWeight: 700, fontSize: 13 }}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div style={{ fontSize: 13, color: lc.faint, fontWeight: 700 }}>© 2026 Locuta.ai. Train your speaking brain.</div>
        </div>
      </footer>
    </div>
  )
}

// Reusable card used across marketing pages.
export function MarketingCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: '#fff',
        border: `2px solid ${lc.cardBorder}`,
        borderRadius: 22,
        boxShadow: `0 5px 0 ${lc.cardBorder}`,
        padding: 24,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
