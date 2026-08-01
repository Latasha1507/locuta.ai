import { lc, fontDisplay } from '@/components/landing/tokens'
import { Icon } from '@/components/landing/icons'
import { Button } from '@/components/ui/Button'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { SubscribeButton } from '@/components/billing/SubscribeButton'
import { PRICING, FREE_TRIAL_CARD } from '@/lib/pricing'

export const metadata = { title: 'Pricing · Locuta' }

// Prices mirror the landing page and lib/check-session-limit.ts (14-day trial,
// 10 sessions/day). Payments aren't live yet — the paid CTAs route to signup so
// nobody hits a dead checkout; wire Razorpay here when billing is ready.
const TIERS = [
  {
    name: FREE_TRIAL_CARD.name,
    price: FREE_TRIAL_CARD.price,
    period: FREE_TRIAL_CARD.period,
    note: FREE_TRIAL_CARD.note,
    cta: FREE_TRIAL_CARD.cta,
    href: FREE_TRIAL_CARD.href,
    highlight: false,
    badge: FREE_TRIAL_CARD.badge,
    features: FREE_TRIAL_CARD.features,
  },
  {
    name: PRICING.annual.name,
    planKey: 'annual' as const,
    price: PRICING.annual.price,
    wasPrice: PRICING.annual.wasPrice,
    period: PRICING.annual.period,
    note: PRICING.annual.note,
    cta: 'GET STARTED',
    href: '/auth/signup',
    highlight: true,
    badge: PRICING.annual.badge,
    features: PRICING.annual.features,
  },
  {
    name: PRICING.monthly.name,
    planKey: 'monthly' as const,
    price: PRICING.monthly.price,
    wasPrice: PRICING.monthly.wasPrice,
    period: PRICING.monthly.period,
    note: PRICING.monthly.note,
    cta: 'GET STARTED',
    href: '/auth/signup',
    highlight: false,
    badge: PRICING.monthly.badge,
    features: PRICING.monthly.features,
  },
]

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  // ?plan=annual|monthly (set when a signed-out user is sent to signup and
  // returns here) auto-opens Razorpay for that plan — so a new paying user
  // doesn't have to click "Get Started" a second time.
  const sp = await searchParams
  const autoPlan = sp?.plan === 'annual' || sp?.plan === 'monthly' ? sp.plan : null
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
              {'wasPrice' in t && t.wasPrice && (
                <span style={{ fontSize: 17, color: lc.faint, fontWeight: 700, textDecoration: 'line-through', marginLeft: 4 }}>
                  {t.wasPrice}
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: lc.faint, fontWeight: 600, margin: '0 0 20px' }}>{t.note}</p>
            {'planKey' in t && t.planKey ? (
              <SubscribeButton
                planKey={t.planKey}
                label={t.cta}
                variant={t.highlight ? 'primary' : 'secondary'}
                autoStart={autoPlan === t.planKey}
              />
            ) : (
              <Button
                href={t.href}
                variant={t.highlight ? 'primary' : 'secondary'}
                block
                style={{ marginBottom: 20 }}
              >
                {t.cta}
              </Button>
            )}
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
