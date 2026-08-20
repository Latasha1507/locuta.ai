// app/api/admin/coach-accounts/invite/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { inviteCoach } from '@/lib/coach-invite'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://locuta.in'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * One-shot coach onboarding: create (or reuse) the user's account, provision
 * complimentary coach access, and email them a passwordless sign-in link. The
 * work lives in lib/coach-invite.ts (shared so a script/test runs identical
 * code). See that file for the step-by-step.
 *
 * SECURITY: gated by requireAdmin(). The returned action link is a sign-in
 * secret — only ever returned to the authenticated admin caller, never logged.
 *
 * Body: { email: string, name?: string, sessionCap?: number }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const email = (body?.email as string | undefined)?.trim().toLowerCase()
  const name = (body?.name as string | undefined)?.trim() || undefined

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const outcome = await inviteCoach(admin, {
    email,
    name,
    sessionCap: body?.sessionCap,
    redirectTo: `${APP_URL}/dashboard`,
  })

  if (!outcome.ok) {
    if (outcome.httpStatus >= 500) {
      console.error('coach invite failed:', outcome.error, outcome.detail ?? '')
    }
    return NextResponse.json(
      { error: outcome.error, detail: outcome.detail, userId: outcome.userId, actionLink: outcome.actionLink },
      { status: outcome.httpStatus },
    )
  }

  return NextResponse.json(outcome.value)
}
