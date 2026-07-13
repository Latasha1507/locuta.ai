'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthLink } from '@/components/auth/AuthShell'
import { Field, PrimaryButton, ErrorBanner } from '@/components/auth/ui'
import { lc } from '@/components/landing/tokens'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })

    // Deliberately do NOT reveal whether the address exists — that would let
    // anyone enumerate which emails have Locuta accounts. Same message either way.
    if (resetError && !resetError.message.toLowerCase().includes('not found')) {
      setError('We could not send the email right now. Please try again in a minute.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <AuthShell
        mood="cheer"
        bubble="Sent! Go check your inbox."
        eyebrow="EMAIL SENT"
        title="Check your email."
        subtitle={`If an account exists for ${email}, a reset link is on its way. The link works once and expires in an hour.`}
        footer={
          <>
            Remembered it? <AuthLink href="/auth/login">Log in</AuthLink>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 13.5, color: lc.muted, fontWeight: 700, lineHeight: 1.5 }}>
          Nothing after a minute? Check your spam folder, then try again.
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      mood={error ? 'oops' : 'happy'}
      bubble={error ? "Hmm, that didn't work." : 'Happens to everyone.'}
      eyebrow="PASSWORD RESET"
      title={<>Forgot your password?</>}
      subtitle="Enter your email and we'll send you a link to set a new one."
      footer={
        <>
          Remembered it? <AuthLink href="/auth/login">Log in</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <ErrorBanner message={error} />}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={loading}
        />
        <PrimaryButton loading={loading}>SEND RESET LINK</PrimaryButton>
      </form>
    </AuthShell>
  )
}
