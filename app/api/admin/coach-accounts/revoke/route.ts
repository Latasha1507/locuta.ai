// app/api/admin/coach-accounts/revoke/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The breach kill-switch. Immediately and permanently cuts off a
 * coach_complimentary account's practice access, independent of days/sessions
 * remaining — a coach caught sharing one account with their students loses
 * access on the spot, even on day 1 with 99 sessions left.
 *
 * Deliberately does NOT touch plan_type or convert to 'trial' the way a
 * natural expiry does (see check-session-limit-server.ts). Leaving
 * plan_type='coach_complimentary' with coach_revoked_at set lets you tell
 * "expired naturally" and "revoked for breach" apart later in Supabase,
 * which matters for a real partner relationship.
 *
 * There is no automated breach *detection* here — that's a human judgment
 * call (e.g. session volume/pattern suggesting more than one person is
 * using the account). This route is only the instant kill-switch once you've
 * made that call.
 *
 * SECURITY: gated by requireAdmin() — see grant/route.ts for why this matters.
 *
 * Body: { userId: string, reason: string }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const userId = body?.userId as string | undefined
  const reason = (body?.reason as string | undefined)?.trim()

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }
  if (!reason) {
    // Force a real reason — a hard cutoff on a real partner relationship is
    // worth a one-sentence paper trail, not a silent flag flip.
    return NextResponse.json({ error: 'reason is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('profiles')
    .update({
      coach_revoked_at: new Date().toISOString(),
      coach_revoked_reason: reason,
    })
    .eq('id', userId)
    .eq('plan_type', 'coach_complimentary')
    .select('id, email, plan_type, coach_revoked_at, coach_revoked_reason')

  if (error) {
    console.error('coach-accounts/revoke update error:', error.message)
    return NextResponse.json(
      { error: 'Could not revoke coach access.', detail: error.message },
      { status: 500 },
    )
  }
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: 'No coach_complimentary profile found for that userId.' },
      { status: 404 },
    )
  }

  return NextResponse.json({ status: 'revoked', profile: data[0] })
}
