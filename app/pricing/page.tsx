import Link from 'next/link'
import { lc, fontDisplay } from '@/components/landing/tokens'
import { Icon } from '@/components/landing/icons'
import { MarketingShell } from '@/components/marketing/MarketingShell'

export const metadata = { title: 'Pricing · Locuta' }

// Prices mirror the landing page and lib/check-session-limit.ts (14-day trial,
// 10 sessions/day). Payments aren't live yet — the paid CTAs route to signup so
// nobody hits a dead checkout; wire Stripe/Razorpay here when billing is ready.
const TIERS = [
  {
    name: 'Free Trial',
    price: '$0',
    period: '',
    note: '14 days, then pick a plan',
    cta: 'START FREE',
    href: '/auth/signup',
    highlight: false,
    badge: '',
    features: ['Up to 10 sessions a day', 'Communication analysis', 'AI feedback summary', 'Daily streak & stickers'],
  },
  {
    name: 'Monthly',
    price: '$16.99',
    period: '/mo',
    note: 'Billed monthly',
    cta: 'GET STARTED',
    href: '/auth/signup',
    highlight: true,
    badge: 'MOST POPULAR',
    features: ['Unlimited sessions', 'Full analytics dashboard', 'Personalized AI coaching', 'All 6 paths & coaches'],
  },
  {
    name: 'Yearly',
    price: '$12.99',
    period: '/mo',
    note: 'Billed annually. Save 24%.',
    cta: 'GET STARTED',
    href: '/auth/signup',
    highlight: false,
    badge: '',
    features: ['Everything in Monthly', 'Priority support', 'Early access to new modules'],
  },
]

export default function PricingPage() {
  return (
    <MarketingShell eyebrow="JOIN THE CLUB" title="Start free. Keep improving." subtitle="One 60-second rep a day. Pick a plan when you're ready — the trial needs no card.">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:items-stretch">
        {TIERS.map((t) => (
          <div
            key={t.name}
            style={{
              position: 'relative',
              background: '#fff',
              border: `2px solid ${t.highlight ? lc.green : lc.cardBorder}`,
              borderRadius: 24,
              boxShadow: `0 6px 0 ${t.highlight ? lc.greenDark : lc.cardBorder}`,
              padding: 26,
              display: 'flex',
              flexDirection: 'column',
              marginTop: t.highlight ? 0 : 8,
            }}
          >
            {t.badge && (
              <span
                style={{
                  position: 'absolute',
                  top: -13,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: lc.yellow,
                  color: '#7a5600',
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 10.5,
                  letterSpacing: '0.05em',
                  padding: '5px 14px',
                  borderRadius: 999,
                  boxShadow: `0 3px 0 ${lc.yellowDark}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {t.badge}
              </span>
            )}
            <h2 style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 20, margin: '0 0 12px' }}>{t.name}</h2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
              <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 40, color: lc.ink, letterSpacing: '-1px' }}>{t.price}</span>
              {t.period && <span style={{ fontSize: 15, color: lc.faint, fontWeight: 700 }}>{t.period}</span>}
            </div>
            <p style={{ fontSize: 13, color: lc.faint, fontWeight: 600, margin: '0 0 20px' }}>{t.note}</p>
            <Link
              href={t.href}
              style={{
                display: 'block',
                textAlign: 'center',
                background: t.highlight ? lc.green : '#fff',
                color: t.highlight ? '#fff' : lc.ink,
                border: `2px solid ${t.highlight ? lc.green : lc.cardBorder}`,
                padding: 14,
                borderRadius: 14,
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 14,
                textDecoration: 'none',
                boxShadow: `0 4px 0 ${t.highlight ? lc.greenDark : lc.cardBorder}`,
                marginBottom: 20,
              }}
            >
              {t.cta}
            </Link>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
              {t.features.map((f) => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#4a5645', fontWeight: 600 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#e7f8ec', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <Icon id="ic-check" size={12} color={lc.greenDark} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: 13, color: lc.faint, fontWeight: 600, marginTop: 28 }}>
        Payments are being set up — start your free trial today and you&apos;ll be first to know when plans go live.
      </p>
    </MarketingShell>
  )
}
