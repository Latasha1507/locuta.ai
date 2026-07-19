'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { AuthShell, AuthLink } from '@/components/auth/AuthShell'
import { Field, PrimaryButton, GoogleButton, ErrorBanner, Divider } from '@/components/auth/ui'
import { lc, fontDisplay } from '@/components/landing/tokens'
import { Icon } from '@/components/ui/icons'
import type { MascotMood } from '@/components/landing/Mascot'

// Read a same-origin ?next= from the current URL (event-handler time, so
// window is available and we avoid a Suspense boundary for useSearchParams).
// Used to carry a landing score card (?next=/s/<token>) through signup so the
// callback lands the new user straight on their reveal.
function callbackUrl(): string {
  const base = `${window.location.origin}/auth/callback`
  const n = new URLSearchParams(window.location.search).get('next')
  const safe = n && n.startsWith('/') && !n.startsWith('//') && !n.includes('\\') ? n : null
  return safe ? `${base}?next=${encodeURIComponent(safe)}` : base
}

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [typingPassword, setTypingPassword] = useState(false)

  const supabase = createClient()

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: callbackUrl(),
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      if (data.user) {
        setSuccess(true)
      } else {
        setError("We couldn't create your account. Please try again.")
      }
      setLoading(false)
    } catch {
      setError('Something went wrong on our side. Please try again.')
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    setError('')

    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl(),
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })

      if (oauthError || !data?.url) {
        setError(oauthError?.message || "We couldn't reach Google. Please try again.")
        setLoading(false)
        return
      }

      // Full-page redirect to Google; loading intentionally stays true.
      window.location.href = data.url
    } catch {
      setError('Something went wrong on our side. Please try again.')
      setLoading(false)
    }
  }

  // Success: check your email.
  if (success) {
    return (
      <AuthShell
        mood="cheer"
        bubble="That's the hard part done!"
        eyebrow="ONE LAST STEP"
        title="Check your email."
        subtitle={`We sent a confirmation link to ${email}. Open it and your 14-day trial starts immediately.`}
        footer={
          <>
            Wrong address? <AuthLink href="/auth/signup">Start over</AuthLink>
          </>
        }
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#f6faf2',
            border: `2px solid ${lc.cardBorder}`,
            borderRadius: 16,
            padding: '14px 16px',
            marginBottom: 20,
          }}
        >
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: lc.yellow,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
              boxShadow: `0 3px 0 ${lc.yellowDark}`,
              transform: 'rotate(-6deg)',
            }}
          >
            <Icon name="star" size={20} color="#fff" />
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: lc.muted, lineHeight: 1.45 }}>
            Your first sticker is waiting on the other side. No link in a minute? Check spam.
          </span>
        </div>
        <Link
          href="/auth/login"
          style={{
            display: 'block',
            width: '100%',
            boxSizing: 'border-box',
            textAlign: 'center',
            background: '#fff',
            color: lc.ink,
            border: '2px solid #e2ead9',
            padding: 14,
            borderRadius: 15,
            fontFamily: fontDisplay,
            fontWeight: 800,
            fontSize: 14,
            textDecoration: 'none',
            boxShadow: '0 4px 0 #e2ead9',
          }}
        >
          GO TO LOG IN
        </Link>
      </AuthShell>
    )
  }

  // Mascot reacts to the form: shy while typing a password, oops on error.
  const mood: MascotMood = typingPassword ? 'shy' : error ? 'oops' : 'happy'
  const bubble = typingPassword
    ? "Not looking, promise."
    : error
      ? "Hmm, that didn't work."
      : "New here? Let's warm you up."

  return (
    <AuthShell
      mood={mood}
      bubble={bubble}
      eyebrow="14 DAYS FREE"
      title={<>Create your account.</>}
      subtitle="No card needed. Your first 60-second rep is about two minutes away."
      footer={
        <>
          Already practicing? <AuthLink href="/auth/login">Log in</AuthLink>
        </>
      }
    >
      <form onSubmit={handleEmailSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <ErrorBanner message={error} />}

        <Field
          label="Your name"
          type="text"
          value={fullName}
          onChange={setFullName}
          placeholder="Alex Sharma"
          autoComplete="name"
          disabled={loading}
        />
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={loading}
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          minLength={8}
          hint="8 characters or more. Mix in a number if you can."
          onFocus={() => setTypingPassword(true)}
          onBlur={() => setTypingPassword(false)}
          disabled={loading}
        />

        <PrimaryButton loading={loading}>START MY FREE TRIAL</PrimaryButton>
      </form>

      <div style={{ margin: '20px 0' }}>
        <Divider>or</Divider>
      </div>

      <GoogleButton onClick={handleGoogleSignup} disabled={loading} label="Continue with Google" />

      <p style={{ marginTop: 18, marginBottom: 0, fontSize: 12, color: lc.faint, fontWeight: 600, lineHeight: 1.5, textAlign: 'center' }}>
        By creating an account you agree to our{' '}
        <Link href="/terms" style={{ color: lc.greenText, fontWeight: 800 }}>Terms</Link> and{' '}
        <Link href="/privacy" style={{ color: lc.greenText, fontWeight: 800 }}>Privacy Policy</Link>.
      </p>
    </AuthShell>
  )
}
