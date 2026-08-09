import { createClient } from '@/lib/supabase/server'
import { NextResponse, after } from 'next/server'
import { trackServer, setPeopleServer } from '@/lib/analytics/server'
import { EVENTS } from '@/lib/analytics/events'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Where to send the user after a successful exchange. Used by the password
  // reset flow (?next=/auth/reset-password).
  //
  // SECURITY: `next` comes from the URL, so it is attacker-controllable. Only
  // accept same-origin relative paths — anything starting with "//" or a scheme
  // would let someone craft a Locuta link that redirects to their own site with
  // the user freshly authenticated (open redirect / phishing). Reject and fall
  // back to /dashboard.
  const nextParam = requestUrl.searchParams.get('next')
  const isSafeNext =
    !!nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') && !nextParam.includes('\\')
  const destination = isSafeNext ? nextParam : '/dashboard'

  // Trial init below must run for EVERY genuine new signup — including ones that
  // carry a ?next= (e.g. the landing micro-tool sends new users to their score
  // card via ?next=/s/...). The ONLY case that should skip trial init is a
  // password-recovery hop, which is specifically ?next=/auth/reset-password.
  // (Previously this keyed off "has a next param", which silently denied a
  // trial to anyone signing up through the score gate.)
  const isRecovery = nextParam === '/auth/reset-password'

  // Handle OAuth errors
  if (error) {
    console.error('❌ OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    )
  }

  // Handle missing code
  if (!code) {
    console.error('❌ No code parameter in callback')
    return NextResponse.redirect(
      new URL('/auth/login?error=Authentication failed. Please try again.', request.url)
    )
  }

  try {
    const supabase = await createClient()
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('❌ Error exchanging code for session:', exchangeError)
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(exchangeError.message)}`, request.url)
      )
    }

    if (!data.session) {
      console.error('❌ No session after code exchange')
      return NextResponse.redirect(
        new URL('/auth/login?error=Authentication failed. Please try again.', request.url)
      )
    }

    console.log('✅ OAuth callback successful')

    // ⭐ Initialize trial for new users.
    // Skipped only for a password-recovery hop — the user already has a
    // profile, and we don't want a reset to touch trial state.
    if (!isRecovery) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Trial is OPT-IN (Option B). A fresh sign-up lands in EXPLORE: they can
        // browse paths/titles/details but lessons are locked until they either
        // click "Start free trial" (→ /api/start-trial) or subscribe. We do NOT
        // start the trial clock at signup — the user may plan to start it later.
        const { data: profile } = await supabase
          .from('profiles')
          .select('trial_started_at, plan_type')
          .eq('id', user.id)
          .maybeSingle()

        const isPaid = ['monthly', 'yearly', 'pro', 'paid', 'premium', 'founder', 'lifetime'].includes(
          String(profile?.plan_type ?? '').toLowerCase(),
        )

        if (!profile) {
          // No profile row yet (e.g. the auto-create trigger didn't run for this
          // account). CREATE it as explore — otherwise the user has no profile
          // and trial/gating/dashboard all break with "0 rows updated". This is
          // the self-heal for a missing profiles row.
          await supabase
            .from('profiles')
            .upsert(
              {
                id: user.id,
                email: user.email ?? null,
                plan_type: 'explore',
                trial_started_at: null,
                trial_sessions_used: 0,
              },
              { onConflict: 'id' },
            )
          console.log('✅ Created missing profile as explore')
        } else if (!profile.trial_started_at && !isPaid) {
          // Existing row, brand-new state → normalise to explore. Never overwrite
          // an active trial or a paid user.
          await supabase
            .from('profiles')
            .update({
              plan_type: 'explore',
              trial_started_at: null,
              trial_sessions_used: 0,
            })
            .eq('id', user.id)
          console.log('✅ New user set to explore (trial opt-in)')
        }

        // Analytics: confirm auth completion SERVER-SIDE. This is the accurate
        // place for OAuth completion — the browser only captured intent (Login
        // Started / Signup Started) before redirecting to the provider. Runs
        // AFTER the response is sent (`after`) so a Mixpanel call never holds up
        // the user's login redirect. Every helper is best-effort / never-throws.
        {
          const provider = String(user.app_metadata?.provider ?? '')
          const createdMs = user.created_at ? new Date(user.created_at).getTime() : 0
          const lastSignInMs = user.last_sign_in_at
            ? new Date(user.last_sign_in_at).getTime()
            : createdMs
          // A first-ever sign-in has created_at ≈ last_sign_in_at; a returning
          // user's created_at is far older. 30s window is unambiguous.
          const isNewUser = createdMs > 0 && Math.abs(lastSignInMs - createdMs) < 30_000
          const isPaying = /[?&]plan=(monthly|annual)/.test(nextParam ?? '')
          const meta = (user.user_metadata ?? {}) as Record<string, unknown>
          const name = (meta.full_name || meta.name || meta.display_name) as string | undefined
          const userId = user.id
          const email = user.email
          const createdAt = user.created_at
          const isOAuth = !!provider && provider !== 'email'

          after(async () => {
            await Promise.allSettled([
              setPeopleServer(userId, {
                ...(email ? { $email: email } : {}),
                ...(name ? { $name: name } : {}),
                ...(createdAt ? { $created: createdAt } : {}),
                ...(isNewUser ? { 'Signup Method': provider || 'email' } : {}),
              }),
              isOAuth
                ? trackServer({
                    event: isNewUser ? EVENTS.SIGNUP_COMPLETED : EVENTS.LOGIN_COMPLETED,
                    distinctId: userId,
                    // Idempotent per sign-in: a re-hit won't double-count.
                    insertId: `auth-${userId}-${lastSignInMs}`,
                    properties: { method: provider, is_paying: isPaying, is_new_user: isNewUser },
                  })
                : // Email-confirmation hop: the client already fired Signup
                  // Completed at sign-up, so we record the verification step here
                  // rather than double-counting the signup.
                  trackServer({
                    event: EVENTS.EMAIL_CONFIRMED,
                    distinctId: userId,
                    insertId: `emailconfirm-${userId}-${lastSignInMs}`,
                    properties: { method: 'email' },
                  }),
            ])
          })
        }
      }
    }

    return NextResponse.redirect(new URL(destination, request.url))
  } catch (err) {
    console.error('❌ Unexpected error in callback:', err)
    return NextResponse.redirect(
      new URL('/auth/login?error=An unexpected error occurred. Please try again.', request.url)
    )
  }
}