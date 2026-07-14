'use client'

import { useState } from 'react'
import FounderCallModal from '@/components/FounderCallModal'
import { lc, fontDisplay } from '@/components/landing/tokens'

export interface FounderPromo {
  /** Slots left, straight from founder_call_settings. */
  slotsRemaining: number
  /** Whether this user has already booked their call. */
  hasBooked: boolean
  /** Days since the account was created. */
  daysUsed: number
}

/** Feedback is only useful from users who have actually used the product. */
export const MIN_DAYS_FOR_FEEDBACK_CALL = 15

export function SidebarPromo({ promo }: { promo: FounderPromo }) {
  const [open, setOpen] = useState(false)

  // Nothing to offer: no slots left, or they've already had their call.
  if (promo.hasBooked || promo.slotsRemaining <= 0) return null

  const daysToGo = MIN_DAYS_FOR_FEEDBACK_CALL - promo.daysUsed
  const eligible = daysToGo <= 0
  const pct = Math.min(100, Math.round((promo.daysUsed / MIN_DAYS_FOR_FEEDBACK_CALL) * 100))

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
          🎁
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
          Get 1 year FREE
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: eligible ? 'rgba(255,255,255,.85)' : lc.faint,
            fontWeight: 700,
            marginTop: 3,
          }}
        >
          {eligible
            ? `Only ${promo.slotsRemaining} early ${promo.slotsRemaining === 1 ? 'spot' : 'spots'} left`
            : `Unlocks in ${daysToGo} ${daysToGo === 1 ? 'day' : 'days'}`}
        </div>

        {eligible ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{
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
            Claim offer
          </button>
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
              Keep practising — we want your feedback once you know Locuta well.
            </div>
          </>
        )}
      </div>

      {open && (
        <FounderCallModal
          slotsRemaining={promo.slotsRemaining}
          onClose={() => setOpen(false)}
          onBooked={() => setOpen(false)}
        />
      )}
    </>
  )
}
