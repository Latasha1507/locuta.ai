// lib/coach-invite.ts
//
// The end-to-end coach onboarding operation, extracted so the HTTP route
// (app/api/admin/coach-accounts/invite) and any script/test run the SAME code:
// create-or-reuse the auth user, provision coach access, email the sign-in link.
//
// Caller contract: pass a SERVICE-ROLE client and have already verified admin.

import type { SupabaseClient } from '@supabase/supabase-js'
import { grantCoachAccount } from './coach-provision'
import { COACH_TRIAL_DAYS } from './coach-account'
import { coachInviteEmail, sendEmail } from './notifications'

export interface InviteCoachSuccess {
  status: 'invited'
  /** true if a brand-new account was created; false if an existing one was reused. */
  created: boolean
  emailSent: boolean
  email: string
  userId: string
  /** Passwordless sign-in link. A secret — return only to an admin, never log. */
  actionLink: string
}

export type InviteCoachOutcome =
  | { ok: true; value: InviteCoachSuccess }
  | { ok: false; httpStatus: number; error: string; detail?: string; userId?: string; actionLink?: string }

export async function inviteCoach(
  admin: SupabaseClient,
  opts: { email: string; name?: string; sessionCap?: number; redirectTo: string },
): Promise<InviteCoachOutcome> {
  const { email, name, sessionCap, redirectTo } = opts

  // 1 + 2: create a new user (invite) or, if the email already exists, issue a
  // magic sign-in link for it. Neither sends Supabase's own email — we send our
  // branded one below.
  let userId: string | undefined
  let actionLink: string | undefined
  let created = false

  const invite = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo, data: name ? { full_name: name } : undefined },
  })

  if (invite.error) {
    const msg = (invite.error.message || '').toLowerCase()
    const alreadyExists = msg.includes('already') || msg.includes('registered') || msg.includes('exist')
    if (!alreadyExists) {
      return { ok: false, httpStatus: 500, error: 'Could not create the invite link.', detail: invite.error.message }
    }
    const magic = await admin.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo } })
    if (magic.error) {
      return { ok: false, httpStatus: 500, error: 'Could not create a sign-in link for the existing account.', detail: magic.error.message }
    }
    userId = magic.data.user?.id
    actionLink = magic.data.properties?.action_link
  } else {
    created = true
    userId = invite.data.user?.id
    actionLink = invite.data.properties?.action_link
  }

  if (!userId || !actionLink) {
    return { ok: false, httpStatus: 500, error: 'Auth returned no user or sign-in link.' }
  }

  // 3: provision (shared writer; refuses to clobber a paid plan).
  let capForEmail = 0
  try {
    const granted = await grantCoachAccount(admin, userId, sessionCap)
    if (!granted.ok) {
      if (granted.reason === 'paid_plan') {
        return { ok: false, httpStatus: 409, error: `That email is on a paid plan (${granted.currentPlan}); not overwriting it.`, userId }
      }
      return { ok: false, httpStatus: 500, error: 'Account created but its profile was not found to provision. Retry the grant route shortly.', userId, actionLink }
    }
    capForEmail = granted.profile.coach_session_cap
  } catch (e) {
    return {
      ok: false,
      httpStatus: 500,
      error: 'Could not provision coach access.',
      detail: e instanceof Error ? e.message : 'unknown error',
      userId,
      actionLink,
    }
  }

  // 4: branded invite. Non-fatal — the account is already provisioned.
  const { subject, html } = coachInviteEmail({ name, actionLink, cap: capForEmail, days: COACH_TRIAL_DAYS })
  const emailSent = await sendEmail(email, subject, html)

  return { ok: true, value: { status: 'invited', created, emailSent, email, userId, actionLink } }
}
