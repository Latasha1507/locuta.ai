'use client'

import { PRICING } from '@/lib/pricing'
import { lc, fontDisplay } from '@/components/landing/tokens'
import { Icon } from '@/components/ui/icons'
import { pressable } from '@/components/ui/buttonSkins'

interface UpgradeModalProps {
  reason: 'trial_expired' | 'daily_limit'
  daysRemaining?: number
  onClose: () => void
}

// Rebuilt in the chunky-3D green system (was old purple/indigo gradients + emoji).
// This is a revenue-critical screen, so it must read as the same product as the
// rest of the app. The overlay scrolls and the card is margin-auto centred, so
// on a short mobile viewport the CTA is always reachable.
export default function UpgradeModal({ reason, daysRemaining, onClose }: UpgradeModalProps) {
  const trialEnded = reason === 'trial_expired'
  const annual = PRICING.annual
  const monthly = PRICING.monthly

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={trialEnded ? 'Upgrade to keep practising' : "You've used today's sessions"}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(30,40,28,.5)',
        overflowY: 'auto',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          margin: 'auto',
          width: '100%',
          maxWidth: 460,
          background: '#fff',
          border: `2px solid ${lc.cardBorder}`,
          borderRadius: 24,
          boxShadow: '0 8px 0 #e3ebdd',
          padding: 22,
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: 0,
            background: '#f4f7f0',
            color: lc.muted,
            cursor: 'pointer',
            fontSize: 18,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          ✕
        </button>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
          <span
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#eafaef',
              border: '2px solid #c7edd2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={trialEnded ? 'crown' : 'clock'} size={28} color={lc.greenDark} />
          </span>
        </div>
        <h2
          style={{
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 23,
            letterSpacing: '-0.4px',
            textAlign: 'center',
            color: lc.ink,
            margin: '14px 0 6px',
            lineHeight: 1.1,
          }}
        >
          {trialEnded ? 'Your free trial has ended' : "That's all 10 sessions today"}
        </h2>
        <p style={{ fontSize: 14, fontWeight: 600, color: lc.muted, textAlign: 'center', margin: '0 0 18px', lineHeight: 1.5 }}>
          {trialEnded
            ? 'Upgrade to keep practising and get unlimited feedback.'
            : `Your mic unlocks again tomorrow${
                typeof daysRemaining === 'number' ? ` · ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left in trial` : ''
              } — or upgrade now for unlimited.`}
        </p>

        {trialEnded && (
          <>
            {/* ANNUAL — highlighted best value */}
            <div
              style={{
                border: `2px solid ${lc.green}`,
                borderRadius: 18,
                background: '#f4fbf0',
                boxShadow: `0 4px 0 #cfe9c6`,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 16, color: lc.ink }}>{annual.name}</span>
                {annual.badge && (
                  <span
                    style={{
                      fontFamily: fontDisplay,
                      fontWeight: 800,
                      fontSize: 12,
                      color: '#fff',
                      background: lc.green,
                      padding: '3px 10px',
                      borderRadius: 999,
                    }}
                  >
                    {annual.badge}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 30, color: lc.greenDark, lineHeight: 1 }}>
                  {annual.price}
                </span>
                {annual.wasPrice && (
                  <span style={{ fontSize: 14, fontWeight: 700, color: lc.faint, textDecoration: 'line-through' }}>
                    {annual.wasPrice}
                  </span>
                )}
                <span style={{ fontSize: 13, fontWeight: 700, color: lc.muted }}>{annual.period}</span>
              </div>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: lc.muted, margin: '6px 0 10px' }}>{annual.note}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {annual.features.slice(0, 4).map((f) => (
                  <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: '#4b5a45' }}>
                    <Icon name="check" size={13} color={lc.green} />
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* MONTHLY — compact alternative */}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 8,
                border: `2px solid ${lc.cardBorder}`,
                borderRadius: 16,
                padding: '12px 16px',
                marginBottom: 18,
              }}
            >
              <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 15, color: lc.ink }}>{monthly.name}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: lc.muted }}>
                <strong style={{ fontFamily: fontDisplay, fontSize: 16, color: lc.ink }}>{monthly.price}</strong> {monthly.period}
              </span>
            </div>
          </>
        )}

        {/* CTAs */}
        <button
          type="button"
          onClick={() => (window.location.href = '/pricing')}
          className={pressable('primary').className}
          style={{
            ...pressable('primary').style,
            width: '100%',
            color: '#fff',
            padding: 15,
            borderRadius: 15,
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 15,
          }}
        >
          {trialEnded ? 'See plans & upgrade' : 'Upgrade for unlimited'}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: 10,
            background: 'none',
            border: 0,
            cursor: 'pointer',
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 13.5,
            color: lc.muted,
            padding: 8,
          }}
        >
          {trialEnded ? 'Maybe later' : 'Got it, see you tomorrow'}
        </button>
      </div>
    </div>
  )
}
