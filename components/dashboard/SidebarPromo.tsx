'use client'

import { lc, fontDisplay } from '@/components/landing/tokens'
import { Icon } from '@/components/ui/icons'

/** Where the 1:1 is booked. Cal.com already collects name and email, which is
    why there is no longer an in-app form in front of it. */
export const FOUNDER_CALL_URL = 'https://cal.com/latasha-ukey/founder-feedback'

export interface FounderPromo {
  /** Slots left, straight from founder_call_settings. */
  slotsRemaining: number
  /** Whether this user has already booked their call. */
  hasBooked: boolean
  /** Scored practice sessions this user has completed. */
  sessionsCompleted: number
}

/**
 * One criterion, deliberately. The point of the call is to hear from someone
 * who has genuinely lived in the product and formed opinions about it — not to
 * reward loyalty or push conversion. 50 scored sessions is enough reps of the
 * core loop (record → score → feedback) to have real views on all of it.
 *
 * Previously this gated on days since signup, which measured nothing: a user
 * could register, never return, and qualify on day 15. The exact person we
 * wanted to filter out was the easiest one to pass.
 *
 * At the trial's 10 sessions/day cap this is reachable in five days, so an
 * engaged user hits it DURING their 14-day trial and sees the offer while
 * they're still deciding whether to pay — a far better moment than after.
 */
export const REQUIRED_SESSIONS = 50

export function SidebarPromo({ promo }: { promo: FounderPromo }) {
  // Nothing to offer: no slots left, or they've already had their call.
  if (promo.hasBooked || promo.slotsRemaining <= 0) return null

  const done = Math.min(promo.sessionsCompleted, REQUIRED_SESSIONS)
  const toGo = Math.max(0, REQUIRED_SESSIONS - promo.sessionsCompleted)
  const eligible = toGo === 0
  const pct = Math.round((done / REQUIRED_SESSIONS) * 100)

  return (
    <>
      <div
        className="hidden lg:block"
        style={{
          marginTop: 'auto',
          background: eligible
            ? `linear-gradient(150deg, ${lc.green}, ${lc.greenDark})`
            : 'linear-gradient(150deg, #f2f7ee, #e9f1e3)',
          border: eligible ? 0 : `2px solid ${lc.cardBorder}`,
          borderRadius: 18,
          padding: 18,
          textAlign: 'center',
          boxShadow: eligible ? '0 5px 0 rgba(47,165,82,.4)' : 'none',
        }}
      >
        <div style={{ fontSize: 22, lineHeight: 1 }} aria-hidden="true">
          <Icon name="gift" size={22} color="#fff" />
        </div>
        <div
          style={{
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 15,
            color: eligible ? '#fff' : lc.ink,
            marginTop: 8,
            lineHeight: 1.15,
          }}
        >
          Become a founding user
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: eligible ? 'rgba(255,255,255,.85)' : lc.faint,
            fontWeight: 700,
            marginTop: 3,
          }}
        >
          {/* The offer alone read as a discount ad. What actually makes someone
              claim an early spot is being told their input shapes the product —
              the free year is the thank-you, not the pitch. */}
          {eligible
            ? `Shape what we build · 1 year free · ${promo.slotsRemaining} ${promo.slotsRemaining === 1 ? 'spot' : 'spots'} left`
            : `${done} of ${REQUIRED_SESSIONS} sessions · ${toGo} to unlock`}
        </div>

        {eligible ? (
          <a
            href={FOUNDER_CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              textDecoration: 'none',
              marginTop: 12,
              width: '100%',
              background: '#fff',
              color: lc.greenDark,
              border: 0,
              padding: 9,
              borderRadius: 11,
              fontFamily: fontDisplay,
              fontWeight: 800,
              fontSize: 12.5,
              cursor: 'pointer',
              boxShadow: '0 3px 0 rgba(0,0,0,.14)',
            }}
          >
            Book my 1:1
          </a>
        ) : (
          <>
            <div
              style={{
                height: 6,
                background: '#e2ead9',
                borderRadius: 4,
                marginTop: 12,
                overflow: 'hidden',
              }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div style={{ height: '100%', width: `${pct}%`, background: lc.green, borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 10.5, color: lc.faint, fontWeight: 700, marginTop: 7, lineHeight: 1.35 }}>
              Complete {REQUIRED_SESSIONS} sessions to unlock a 1:1 with the founder.
            </div>
          </>
        )}
      </div>

    </>
  )
}
