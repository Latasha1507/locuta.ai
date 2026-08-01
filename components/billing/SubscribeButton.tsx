'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

interface RazorpayOptions {
  key: string
  subscription_id: string
  name: string
  description?: string
  theme?: { color?: string }
  handler?: (response: unknown) => void
  modal?: { ondismiss?: () => void }
  prefill?: { email?: string; name?: string }
}
interface RazorpayInstance {
  open: () => void
  on: (event: string, cb: (e: unknown) => void) => void
}
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
  }
}

function loadCheckoutScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    if (window.Razorpay) return resolve(true)
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(true))
      existing.addEventListener('error', () => resolve(false))
      return
    }
    const s = document.createElement('script')
    s.src = CHECKOUT_SRC
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

/**
 * A pricing CTA that actually starts a subscription. Renders the same design-
 * system Button as the rest of the site (via `variant`), but on click it:
 *   1. sends signed-out users to signup (returning to /pricing?plan=… so we can
 *      resume checkout afterwards),
 *   2. calls /api/subscribe and opens Razorpay Checkout for signed-in users.
 * Access is granted by the webhook, never here.
 */
export function SubscribeButton({
  planKey,
  label,
  variant = 'primary',
  autoStart = false,
}: {
  planKey: 'monthly' | 'annual'
  label: string
  variant?: 'primary' | 'secondary'
  /** When true (set via ?plan= on return from signup), open checkout on mount
      for an already-signed-in user — the seamless new-user → pay path. */
  autoStart?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const start = useCallback(async (auto = false) => {
    setError('')

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      // Auto-trigger on a non-signed-in visitor: do NOTHING (never redirect on
      // mount — that would risk a signup↔pricing loop). They can click manually.
      if (auto) return
      const next = encodeURIComponent(`/pricing?plan=${planKey}`)
      router.push(`/auth/signup?next=${next}`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Could not start checkout.')
        setLoading(false)
        return
      }

      const ok = await loadCheckoutScript()
      if (!ok || !window.Razorpay) {
        setError('Could not load the payment window. Please try again.')
        setLoading(false)
        return
      }

      const rzp = new window.Razorpay({
        key: data.razorpayKeyId,
        subscription_id: data.subscriptionId,
        name: 'Locuta',
        description: planKey === 'annual' ? 'Annual plan' : 'Monthly plan',
        theme: { color: '#3fce6f' },
        prefill: { email: user.email ?? undefined },
        handler: () => {
          router.push('/dashboard?welcome=1')
        },
        modal: { ondismiss: () => setLoading(false) },
      })
      rzp.on('payment.failed', () => {
        setError('Payment failed. You have not been charged. Please try again.')
        setLoading(false)
      })
      rzp.open()
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }, [planKey, router])

  // Auto-open checkout once on mount when arriving with ?plan=<this plan> and
  // already signed in (the seamless return-from-signup path).
  useEffect(() => {
    if (autoStart) {
      void start(true)
    }
    // Run once on mount for this button only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart])

  return (
    <div style={{ marginBottom: 20 }}>
      <Button variant={variant} block onClick={() => start(false)} disabled={loading}>
        {loading ? 'Opening…' : label}
      </Button>
      {error && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#e0503f', fontWeight: 700, textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  )
}
