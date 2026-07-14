'use client'

import { useEffect, useRef, useState } from 'react'
import { lc, fontDisplay } from '@/components/landing/tokens'
import { Mascot, type MascotMood } from '@/components/landing/Mascot'

// The mascot is the personality of the product. On the auth screens it reacts
// to the form; here it reacts to the user's actual state and to being poked.
//
// - Already practised today  -> cheering, proud lines
// - Streak alive, not done   -> happy, nudging lines
// - Brand new               -> happy, welcoming lines
// Clicking it cycles a new line and makes it cheer.

const LINES = {
  done: [
    "Today's rep? Nailed it.",
    'Sticker earned. Proud of you.',
    'Come back tomorrow!',
    'That flame is safe with me.',
  ],
  nudge: [
    'One rep and the streak lives.',
    '60 seconds. That’s all.',
    'Your flame is waiting…',
    'Let’s keep the run going!',
  ],
  new: [
    'Ready for your first rep?',
    'No one is listening but me.',
    'Let’s make a start together.',
    'One minute. That’s the deal.',
  ],
}

export function HeroMascot({ practicedToday, isNewUser }: { practicedToday: boolean; isNewUser: boolean }) {
  const key = practicedToday ? 'done' : isNewUser ? 'new' : 'nudge'
  const lines = LINES[key]

  const [idx, setIdx] = useState(0)
  const [poked, setPoked] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const poke = () => {
    setIdx((i) => (i + 1) % lines.length)
    setPoked(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setPoked(false), 1400)
  }

  const mood: MascotMood = poked || practicedToday ? 'cheer' : 'happy'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          position: 'relative',
          background: '#fff',
          border: '2px solid #cdeacf',
          borderRadius: 15,
          padding: '10px 14px',
          fontFamily: fontDisplay,
          fontWeight: 700,
          fontSize: 13,
          color: lc.ink,
          boxShadow: '0 4px 0 #d4ead2',
          maxWidth: 200,
          textAlign: 'center',
          animation: 'lp-float 4s ease-in-out infinite',
        }}
        aria-live="polite"
      >
        {lines[idx]}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: -9,
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: 13,
            height: 13,
            background: '#fff',
            borderRight: '2px solid #cdeacf',
            borderBottom: '2px solid #cdeacf',
          }}
        />
      </div>

      <button
        type="button"
        onClick={poke}
        aria-label="Poke the Locuta mascot"
        style={{
          background: 'none',
          border: 0,
          padding: 0,
          cursor: 'pointer',
          transition: 'transform .18s cubic-bezier(.34,1.56,.64,1)',
          transform: poked ? 'scale(1.06)' : 'scale(1)',
        }}
      >
        <Mascot mood={mood} />
      </button>
    </div>
  )
}
