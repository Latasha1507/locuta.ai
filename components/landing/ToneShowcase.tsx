'use client'

import { useState } from 'react'
import { lc, fontDisplay } from './tokens'
import { Icon } from './icons'

// The 6 coaching tones — names, taglines and descriptions match the real
// tone list in app/category/[categoryId]/tone/page.tsx. Keep in sync.
const TONES = [
  { name: 'Normal', tag: 'everyday', icon: 'ic-chat', desc: 'Clear, simple, everyday conversational style.', color: lc.purple },
  { name: 'Supportive', tag: 'gentle', icon: 'ic-heart', desc: 'Soft, kind and reassuring, like a supportive friend.', color: lc.blue },
  { name: 'Inspiring', tag: 'high energy', icon: 'ic-bolt', desc: 'Energizing and passionate, like a motivational coach.', color: lc.pink },
  { name: 'Funny', tag: 'playful', icon: 'ic-smile', desc: 'Entertaining, playful and casual with light humor.', color: lc.orange },
  { name: 'Diplomatic', tag: 'balanced', icon: 'ic-crown', desc: 'Calm, professional and trustworthy. A balanced approach.', color: lc.teal },
  { name: 'Bossy', tag: 'no-nonsense', icon: 'ic-shield', desc: 'Commanding, no-nonsense, authoritative leadership.', color: lc.coral },
]

export function ToneShowcase() {
  const [active, setActive] = useState(0)

  return (
    <div className="mx-auto grid max-w-[1000px] grid-cols-1 gap-[14px] lg:grid-cols-2">
      {TONES.map((t, i) => {
        const isActive = active === i
        return (
          <button
            key={t.name}
            type="button"
            onClick={() => setActive(i)}
            aria-pressed={isActive}
            style={{
              display: 'flex',
              gap: 14,
              alignItems: 'center',
              textAlign: 'left',
              background: isActive ? '#f2fbf4' : '#fbfdf9',
              border: `2px solid ${isActive ? lc.green : lc.cardBorder}`,
              borderRadius: 18,
              padding: '15px 18px',
              cursor: 'pointer',
              boxShadow: `0 4px 0 ${isActive ? lc.greenDark : lc.cardBorder}`,
              transition: 'all .15s ease',
              fontFamily: 'inherit',
            }}
          >
            <span
              style={{
                width: 46,
                height: 46,
                borderRadius: 13,
                background: isActive ? lc.green : '#eef4e8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
                transition: 'background .15s ease',
              }}
            >
              <Icon id={t.icon} size={26} color={isActive ? '#fff' : lc.green} />
            </span>
            <span style={{ flex: 1 }}>
              <span
                style={{
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 16,
                  color: lc.ink,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {t.name}
                <span
                  style={{
                    fontFamily: fontDisplay,
                    fontWeight: 800,
                    fontSize: 9.5,
                    color: isActive ? '#fff' : '#8a9a80',
                    background: isActive ? lc.green : '#eef2e8',
                    padding: '3px 8px',
                    borderRadius: 999,
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                  }}
                >
                  {t.tag}
                </span>
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: 12.5,
                  color: lc.muted,
                  lineHeight: 1.45,
                  marginTop: 2,
                  fontWeight: 600,
                }}
              >
                {t.desc}
              </span>
            </span>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: isActive ? lc.green : '#f0f4ec',
                color: isActive ? '#fff' : '#b0bca8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                flex: 'none',
              }}
              aria-hidden="true"
            >
              ✓
            </span>
          </button>
        )
      })}
    </div>
  )
}
