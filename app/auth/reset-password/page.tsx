'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AuthShell, AuthLink } from '@/components/auth/AuthShell'
import { Field, PrimaryButton, ErrorBanner } from '@/components/auth/ui'
import { lc } from '@/components/landing/tokens'
import type { MascotMood } from '@/components/landing/Mascot'

// Reached from the emailed reset link, which lands on /auth/callback and is
// forwarded here with a recovery session already established. If someone opens
// this page cold (no session), they can't set a password — we say so instead of
// failing silently.
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [typingPassword, setTypingPassword] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setHasSession(!!data.session)
      setChecking(false)
    })
    return () => {
      active = false
    }
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Your new password needs at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError("The two passwords don't match.")
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    // Force a fresh login with the new password.
    await supabase.auth.signOut()
    router.push('/auth/login?reset=1')
  }

  if (checking) {
    return (
      <AuthShell
        mood="happy"
        bubble="One moment…"
        eyebrow="PASSWORD RESET"
        title={<>Checking your link.</>}
        subtitle="This will only take a second."
      >
        <div
          style={{
            width: 30,
            height: 30,
            margin: '0 auto',
            borderRadius: '50%',
            border: `4px solid ${lc.cardBorder}`,
            borderTopColor: lc.green,
            animation: 'lp-spin .8s linear infinite',
          }}
        />
      </AuthShell>
    )
  }

  if (!hasSession) {
    return (
      <AuthShell
        mood="oops"
        bubble="That link is no good."
        eyebrow="LINK EXPIRED"
        title={<>This link has expired.</>}
        subtitle="Reset links work once and last an hour. Request a fresh one and you'll be back in a minute."
        footer={
          <>
            Remembered it? <AuthLink href="/auth/login">Log in</AuthLink>
          </>
        }
      >
        <AuthLink href="/auth/forgot-password">Send me a new link →</AuthLink>
      </AuthShell>
    )
  }

  const mood: MascotMood = typingPassword ? 'shy' : error ? 'oops' : 'happy'

  return (
    <AuthShell
      mood={mood}
      bubble={typingPassword ? 'Not looking, promise.' : error ? "Hmm, that didn't work." : 'Fresh start!'}
      eyebrow="PASSWORD RESET"
      title={<>Set a new password.</>}
      subtitle="Pick something you'll remember. You'll log in with it right after."
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <ErrorBanner message={error} />}
        <Field
          label="New password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          minLength={8}
          onFocus={() => setTypingPassword(true)}
          onBlur={() => setTypingPassword(false)}
          disabled={loading}
        />
        <Field
          label="Confirm new password"
          type="password"
          value={confirm}
          onChange={setConfirm}
          placeholder="Type it once more"
          autoComplete="new-password"
          minLength={8}
          onFocus={() => setTypingPassword(true)}
          onBlur={() => setTypingPassword(false)}
          disabled={loading}
        />
        <PrimaryButton loading={loading}>SAVE NEW PASSWORD</PrimaryButton>
      </form>
    </AuthShell>
  )
}
