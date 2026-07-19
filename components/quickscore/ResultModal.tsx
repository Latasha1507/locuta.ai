'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScoreCard, type ScoreCardProps } from '@/components/landing/ScoreCard'

// The owner's reveal: their result floating over their own dashboard, which
// stays visible (blurred) behind it. Landing straight on a bare result page
// after signup felt like being dumped somewhere else; this way the first thing
// a new user sees is the product, with their score celebrated on top of it.

type Props = Omit<ScoreCardProps, 'variant' | 'onClose'>

export function ResultModal(props: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(true)

  const close = () => {
    setOpen(false)
    // Drop ?score= so a refresh doesn't replay the reveal, without adding a
    // history entry the back button would trip over.
    router.replace('/dashboard', { scroll: false })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    // The page behind must not scroll while the reveal is up.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Your speaking score"
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        background: 'rgba(28,44,24,.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px 16px 48px',
        overflowY: 'auto',
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ margin: 'auto', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <ScoreCard {...props} variant="modal" onClose={close} />
      </div>
    </div>
  )
}
