import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import { verifyScore } from '@/lib/quick-score-token'
import { promptById } from '@/lib/quick-score'
import { ResultModal } from '@/components/quickscore/ResultModal'
import { computeStreak, weekStickers, stickersThisWeek, practicedToday } from '@/lib/streaks'
import { DashboardClient, type CategoryStat } from '@/components/dashboard/DashboardClient'
import { OnboardingGate } from '@/components/dashboard/OnboardingGate'
import { type FounderPromo } from '@/components/dashboard/SidebarPromo'
import { lc } from '@/components/landing/tokens'

// Server component: all data is fetched on the server in parallel and the page
// arrives fully rendered. The old version was a client component that did
// auth -> profile -> 3 queries as a waterfall from the browser, showing a
// spinner for the whole trip.
export const dynamic = 'force-dynamic'

const TRIAL_DAYS = 14

const CATEGORY_META: Record<string, { name: string; desc: string; icon: string; color: string }> = {
  'public-speaking': {
    name: 'Public Speaking',
    desc: 'Presentations, speeches and big rooms.',
    icon: 'mic',
    color: lc.green,
  },
  storytelling: {
    name: 'Storytelling',
    desc: 'Narratives people remember and repeat.',
    icon: 'book',
    color: lc.yellow,
  },
  'creator-speaking': {
    name: 'Creator Speaking',
    desc: 'Sound natural and hold attention on camera.',
    icon: 'camera',
    color: lc.coral,
  },
  'casual-conversation': {
    name: 'Casual Conversation',
    desc: 'Everyday confidence for small talk.',
    icon: 'chat',
    color: lc.blue,
  },
  'workplace-communication': {
    name: 'Workplace Communication',
    desc: 'Meetings, reviews and tough talks.',
    icon: 'briefcase',
    color: lc.purple,
  },
  'pitch-anything': {
    name: 'Pitch Anything',
    desc: 'Win over investors, customers and teams.',
    icon: 'target',
    color: lc.green,
  },
}

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-')

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ score?: string }>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, onboarding_completed, trial_started_at, trial_sessions_used, plan_type')
    .eq('id', user.id)
    .single()

  // Onboarding gate — nothing else matters until this is done.
  if (profile && !profile.onboarding_completed) {
    return <OnboardingGate userId={user.id} />
  }

  // Everything below is fetched in parallel, on the server, in one round trip.
  const [progressRes, lessonsRes, sessionsRes, adminFlag, promoSettingsRes, bookingRes] = await Promise.all([
    supabase
      .from('user_progress')
      .select('category, completed, best_score')
      .eq('user_id', user.id),
    supabase.from('lessons').select('category'),
    // created_at only: this feeds the streak. Bounded to ~1 year so the query
    // stays small no matter how long someone has been practising.
    supabase
      .from('sessions')
      .select('created_at, category')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 400 * 864e5).toISOString())
      .order('created_at', { ascending: false }),
    isAdmin().catch(() => false),
    // Founder feedback call: real slot count + whether this user already booked.
    supabase.from('founder_call_settings').select('total_slots, slots_used').eq('id', 1).maybeSingle(),
    supabase.from('founder_call_bookings').select('id').eq('user_id', user.id).maybeSingle(),
  ])

  const progress = progressRes.data ?? []
  const lessons = lessonsRes.data ?? []
  const sessions = sessionsRes.data ?? []
  const timestamps = sessions.map((s) => s.created_at as string)

  const categories: CategoryStat[] = Object.entries(CATEGORY_META).map(([id, meta]) => {
    const total = lessons.filter((l) => slug(l.category as string) === id).length
    const rows = progress.filter((p) => slug(p.category as string) === id)
    const completed = rows.filter((p) => p.completed).length
    const bestScore = rows.length ? Math.max(...rows.map((p) => (p.best_score as number) || 0)) : 0
    return {
      id,
      ...meta,
      total,
      completed,
      pct: total > 0 ? Math.round((completed / total) * 100) : 0,
      bestScore,
    }
  })

  const lessonsCompleted = progress.filter((p) => p.completed).length
  const bestScore = progress.length ? Math.max(...progress.map((p) => (p.best_score as number) || 0)) : 0

  // Send them back to whatever they practised last; otherwise the first path.
  const lastCategory = sessions[0]?.category as string | undefined
  const nextHref = lastCategory
    ? `/category/${slug(lastCategory)}/modules`
    : '/category/public-speaking/modules'

  // Trial state, straight from the profile (same 14-day rule as
  // lib/check-session-limit.ts).
  let trial: { active: boolean; daysLeft: number } | null = null
  if (profile?.plan_type === 'trial' && profile?.trial_started_at) {
    const started = new Date(profile.trial_started_at as string).getTime()
    const trialDaysUsed = Math.floor((Date.now() - started) / 864e5)
    const daysLeft = Math.max(0, TRIAL_DAYS - trialDaysUsed)
    trial = { active: daysLeft > 0, daysLeft }
  }

  // Welcome modal only in the first few minutes of a brand-new trial.
  const showWelcome =
    !!profile?.trial_started_at &&
    profile?.trial_sessions_used === 0 &&
    Date.now() - new Date(profile.trial_started_at as string).getTime() < 300_000

  // Founder feedback call. Gated on MIN_DAYS_FOR_FEEDBACK_CALL (see SidebarPromo)
  // age — feedback from someone who has used Locuta for two days isn't worth a
  // free year, and the call slots are scarce.
  const settings = promoSettingsRes.data
  const daysUsed = Math.floor((Date.now() - new Date(user.created_at).getTime()) / 864e5)
  const promo: FounderPromo | null = settings
    ? {
        slotsRemaining: Math.max(0, (settings.total_slots as number) - (settings.slots_used as number)),
        hasBooked: !!bookingRes.data,
        daysUsed,
      }
    : null

  const fullName = (profile?.full_name as string) || (user.user_metadata?.full_name as string) || ''
  const firstName = fullName.trim().split(/\s+/)[0] || 'there'
  const initial = (firstName[0] || user.email?.[0] || 'A').toUpperCase()

  // A brand-new user arriving from the landing 30-second test carries their
  // signed result in ?score=. Verified server-side so a tampered token simply
  // shows nothing rather than rendering an invented number.
  const sp = await searchParams
  const quick = sp.score ? verifyScore(sp.score) : null
  const quickTopic = quick ? (promptById(quick.promptId)?.topic ?? 'your speaking') : ''

  return (
    <>
    {quick && (
      <ResultModal
        overall={quick.overall}
        topic={quickTopic}
        pace={quick.pace}
        fluency={quick.fluency}
        flow={quick.flow}
        content={quick.content}
        wpm={quick.wpm}
        filler={quick.filler}
        restarts={quick.restarts}
        longPauses={quick.longPauses}
        percentile={quick.percentile}
        strengths={quick.strengths}
        improvements={quick.improvements}
        isOwner
        shareText={`I scored ${quick.overall} on ${quickTopic} in Locuta's 30-second speaking test. Beat me.`}
        shareUrl={`/s/${sp.score}`}
      />
    )}
    <DashboardClient
      userId={user.id}
      firstName={firstName}
      initial={initial}
      isAdmin={adminFlag}
      streak={computeStreak(timestamps)}
      practicedToday={practicedToday(timestamps)}
      stickers={weekStickers(timestamps)}
      stickersThisWeek={stickersThisWeek(timestamps)}
      lessonsCompleted={lessonsCompleted}
      lessonsTotal={lessons.length}
      bestScore={bestScore}
      categories={categories}
      nextHref={nextHref}
      showWelcome={showWelcome}
      trial={trial}
      promo={promo}
    />
    </>
  )
}
