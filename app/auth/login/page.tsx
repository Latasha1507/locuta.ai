'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthShell, AuthLink } from '@/components/auth/AuthShell'
import { Field, PrimaryButton, GoogleButton, ErrorBanner, Divider } from '@/components/auth/ui'
import { lc } from '@/components/landing/tokens'
import type { MascotMood } from '@/components/landing/Mascot'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [typingPassword, setTypingPassword] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Same-origin ?next= (e.g. /s/<token> from the landing score gate) so an
  // existing user who logs in from the gate lands on their reveal, not /dashboard.
  const safeNext = (): string | null => {
    const n = searchParams.get('next')
    return n && n.startsWith('/') && !n.startsWith('//') && !n.includes('\\') ? n : null
  }

  // Surface errors handed back by /auth/callback, then clean the URL.
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
      router.replace('/auth/login')
      return
    }
    if (searchParams.get('reset') === '1') {
      setNotice('Password updated. Log in with your new one.')
      router.replace('/auth/login')
    }
  }, [searchParams, router])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      if (signInError.message.includes('Email not confirmed')) {
        setError('Please confirm your email first. Check your inbox for the link.')
      } else if (signInError.message.includes('Invalid login credentials')) {
        setError("That email and password don't match. Try again, or reset your password.")
      } else {
        setError(signInError.message)
      }
      setLoading(false)
      return
    }

    // refresh() makes the server components pick up the new session cookie.
    router.push(safeNext() ?? '/dashboard')
    router.refresh()
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const next = safeNext()
      const redirectTo = `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })

      if (oauthError || !data?.url) {
        setError(oauthError?.message || "We couldn't reach Google. Please try again.")
        setLoading(false)
        return
      }

      window.location.href = data.url
    } catch {
      setError('Something went wrong on our side. Please try again.')
      setLoading(false)
    }
  }

  const mood: MascotMood = typingPassword ? 'shy' : error ? 'oops' : 'happy'
  const bubble = typingPassword
    ? 'Not looking, promise.'
    : error
      ? "Hmm, that didn't work."
      : 'Good to see you again!'

  return (
    <AuthShell
      mood={mood}
      bubble={bubble}
      eyebrow="WELCOME BACK"
      title={<>Pick up your streak.</>}
      subtitle="Log in and get today's rep done. It takes 60 seconds."
      footer={
        <>
          New to Locuta? <AuthLink href="/auth/signup">Start free</AuthLink>
        </>
      }
    >
      <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <ErrorBanner message={error} />}
        {notice && (
          <div
            role="status"
            style={{
              background: '#eafaef',
              border: '2px solid #c7edd2',
              color: lc.greenDark,
              borderRadius: 14,
              padding: '12px 14px',
              fontSize: 13.5,
              fontWeight: 700,
              boxShadow: '0 4px 0 #c7edd2',
            }}
          >
            {notice}
          </div>
        )}

        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={loading}
        />
        <div>
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Your password"
            autoComplete="current-password"
            onFocus={() => setTypingPassword(true)}
            onBlur={() => setTypingPassword(false)}
            disabled={loading}
          />
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <Link
              href="/auth/forgot-password"
              style={{ fontSize: 12.5, fontWeight: 800, color: lc.greenText, textDecoration: 'none' }}
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <PrimaryButton loading={loading}>LOG IN</PrimaryButton>
      </form>

      <div style={{ margin: '20px 0' }}>
        <Divider>or</Divider>
      </div>

      <GoogleButton onClick={handleGoogleLogin} disabled={loading} label="Continue with Google" />
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            background: lc.pageBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: `4px solid ${lc.cardBorder}`,
              borderTopColor: lc.green,
              animation: 'lp-spin .8s linear infinite',
            }}
          />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
