// app/api/admin/coach-accounts/grant/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { grantCoachAccount } from '@/lib/coach-provision'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Provisions (or re-provisions) a complimentary coach evaluation account for an
 * EXISTING user: 30 days from NOW, a fresh session counter, all lessons
 * unlocked. Onboarding a brand-new coach (create the account + send the invite
 * email) is /api/admin/coach-accounts/invite — this route only flags a user who
 * already exists (or re-provisions one whose 30 days/cap you want to reset).
 *
 * The actual write lives in lib/coach-provision.ts, shared with the invite
 * route so the two can never drift.
 *
 * SECURITY: gated by requireAdmin() (app_metadata.is_admin, service-role only —
 * not user-writable). This route class (privileged write via the service-role
 * client) is exactly where two P1s were previously found in this repo from a
 * missing role check — don't repeat that here.
 *
 * Body: { userId: string, sessionCap?: number }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const userId = body?.userId as string | undefined
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    const result = await grantCoachAccount(admin, userId, body?.sessionCap)
    if (!result.ok) {
      if (result.reason === 'not_found') {
        return NextResponse.json({ error: 'No profile found for that userId.' }, { status: 404 })
      }
      // paid_plan — refuse rather than silently downgrade a paying customer.
      return NextResponse.json(
        { error: `That account is on a paid plan (${result.currentPlan}); not overwriting it.` },
        { status: 409 },
      )
    }
    return NextResponse.json({ status: 'granted', profile: result.profile })
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'unknown error'
    console.error('coach-accounts/grant error:', detail)
    return NextResponse.json({ error: 'Could not grant coach access.', detail }, { status: 500 })
  }
}
