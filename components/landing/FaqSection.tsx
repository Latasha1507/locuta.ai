'use client'

import { useState } from 'react'
import { lc, fontDisplay } from './tokens'

const FAQS = [
  {
    q: 'How does the AI coaching work?',
    a: 'Locuta analyzes your voice across pace, clarity, confidence, filler words and delivery, then gives feedback that gets more tailored the more you practice.',
  },
  {
    q: 'Do I need special equipment?',
    a: 'Nope. Just a device with a microphone. Any phone, tablet or computer works.',
  },
  {
    q: 'How fast will I improve?',
    a: 'Most people feel a confidence boost within 1-2 weeks of regular practice, with clearer changes after 3-4 weeks.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel whenever you like, and your access continues until the end of your billing period.',
  },
  {
    q: 'Is my voice data private?',
    a: 'Always. Recordings are never shared and only used to give you feedback. Delete them anytime.',
  },
]

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-3">
      {FAQS.map((f, i) => {
        const isOpen = open === i
        return (
          <div
            key={f.q}
            style={{
              border: `2px solid ${isOpen ? lc.green : lc.cardBorder}`,
              borderRadius: 18,
              background: '#fff',
              overflow: 'hidden',
              boxShadow: `0 4px 0 ${isOpen ? lc.greenDark : lc.cardBorder}`,
              transition: 'all .15s',
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              style={{
                width: '100%',
                background: 'none',
                border: 0,
                padding: '18px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                gap: 12,
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 16, color: lc.ink }}>{f.q}</span>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: isOpen ? lc.green : '#f0f4ec',
                  color: isOpen ? '#fff' : '#a3b099',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 18,
                  flex: 'none',
                }}
                aria-hidden="true"
              >
                {isOpen ? '–' : '+'}
              </span>
            </button>
            {isOpen && (
              <div
                style={{
                  padding: '0 22px 20px',
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: lc.muted,
                  fontWeight: 600,
                }}
              >
                {f.a}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
