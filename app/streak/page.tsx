import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import { loadFounderPromo } from '@/lib/founder-promo'
import { resolveTone } from '@/lib/tones'
import { slugForCategory } from '@/lib/category-map'
import {
  computeStreak,
  weekStickers,
  stickersThisWeek,
  practicedToday,
  longestStreak,
  totalPracticeDays,
  monthCalendar,
} from '@/lib/streaks'
import { StreakView } from '@/components/streak/StreakView'

export const dynamic = 'force-dynamic'

export default async function StreakPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = await isAdmin().catch(() => false)

  const [sessionsRes, promo] = await Promise.all([
    supabase
      .from('sessions')
      .select('created_at, category, tone')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    loadFounderPromo(supabase, user.id),
  ])

  const sessions = sessionsRes.data ?? []
  const timestamps = sessions.map((s) => s.created_at as string)

  // Every practised day is one earned sticker (same rule the dashboard uses).
  const totalStickers = totalPracticeDays(timestamps)

  // Resume link: last-used category + tone, else the first path.
  const last = sessions[0]
  const tone = resolveTone(last?.tone as string | undefined)
  const catSlug = last?.category ? slugForCategory(last.category as string) : 'public-speaking'
  const nextHref = `/category/${catSlug}/modules?tone=${encodeURIComponent(tone)}`

  const now = new Date()
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <StreakView
      isAdmin={admin}
      promo={promo}
      streak={computeStreak(timestamps)}
      longestStreak={longestStreak(timestamps)}
      totalDays={totalPracticeDays(timestamps)}
      practicedToday={practicedToday(timestamps)}
      week={weekStickers(timestamps)}
      monthLabel={monthLabel}
      calendar={monthCalendar(timestamps)}
      stickersThisWeek={stickersThisWeek(timestamps)}
      totalStickers={totalStickers}
      nextHref={nextHref}
    />
  )
}
