'use client'

import { useEffect, useState } from 'react'
import { lc, fontDisplay } from '@/components/landing/tokens'
import { Icon } from '@/components/landing/icons'

/** Counts 0 -> target once on mount. Respects prefers-reduced-motion. */
function useCountUp(target: number, ms = 700) {
  const [n, setN] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(target)
      return
    }
    if (target <= 0) {
      setN(0)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms)
      // easeOutCubic
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])

  return n
}

export interface StatTile {
  label: string
  /** Numeric part that animates. Null renders `placeholder` instead. */
  value: number | null
  suffix?: string
  placeholder?: string
  hint: string
  icon: string
  color: string
  warm?: boolean
  delay?: number
}

export function StatCard({ label, value, suffix, placeholder, hint, icon, color, warm, delay = 0 }: StatTile) {
  const [hover, setHover] = useState(false)
  const shown = useCountUp(value ?? 0)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex items-center gap-3.5 p-4 lg:p-[18px]"
      style={{
        background: '#fff',
        border: `2px solid ${hover ? color : lc.cardBorder}`,
        borderRadius: 20,
        boxShadow: `0 ${hover ? 6 : 4}px 0 ${hover ? color : lc.cardBorder}`,
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
        animation: `lp-rise .4s ease ${delay}s both`,
      }}
    >
      <span
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
          boxShadow: '0 3px 0 rgba(0,0,0,.12)',
          transform: hover ? 'rotate(-8deg) scale(1.06)' : 'none',
          transition: 'transform .2s cubic-bezier(.34,1.56,.64,1)',
        }}
      >
        <Icon id={icon} size={24} color="#fff" />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12.5, color: lc.faint, fontWeight: 800, marginBottom: 3 }}>
          {label}
        </span>
        <span
          style={{
            display: 'block',
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 24,
            color: lc.ink,
            lineHeight: 1,
          }}
        >
          {value === null ? placeholder : `${shown}${suffix ?? ''}`}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: 11.5,
            color: warm ? '#d08a1a' : lc.faint,
            fontWeight: 700,
            marginTop: 4,
          }}
        >
          {hint}
        </span>
      </span>
    </div>
  )
}
