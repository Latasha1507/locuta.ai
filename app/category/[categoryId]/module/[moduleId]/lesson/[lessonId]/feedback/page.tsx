import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { checkSessionLimitServer } from '@/lib/check-session-limit-server'
import { computeStreak } from '@/lib/streaks'
import { resolveTone } from '@/lib/tones'
import { FeedbackView } from '@/components/feedback/FeedbackView'
import { lc } from '@/components/landing/tokens'

export const dynamic = 'force-dynamic'

const CATEGORY_MAP: Record<string, string> = {
  'public-speaking': 'Public Speaking',
  storytelling: 'Storytelling',
  'creator-speaking': 'Creator Speaking',
  'casual-conversation': 'Casual Conversation',
  'workplace-communication': 'Workplace Communication',
  'pitch-anything': 'Pitch Anything',
}

const STICKER_ICONS = ['ic-mic', 'ic-star', 'ic-chat', 'ic-flame', 'ic-bulb', 'ic-gift', 'ic-crown']
const STICKER_COLORS = [lc.green, lc.yellow, lc.blue, lc.coral, lc.purple, lc.teal, lc.pink]
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export default async function FeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string; moduleId: string; lessonId: string }>
  searchParams: Promise<{ session?: string }>
}) {
  const { categoryId, moduleId, lessonId } = await params
  const { session: sessionId } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  if (!sessionId) notFound()

  const categoryName = CATEGORY_MAP[categoryId]
  if (!categoryName) notFound()

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id) // ownership: never render someone else's session
    .single()

  if (!session) notFound()

  const [lessonRes, siblingsRes, historyRes, limit] = await Promise.all([
    supabase
      .from('lessons')
      .select('level_title')
      .eq('category', categoryName)
      .eq('module_number', parseInt(moduleId))
      .eq('level_number', parseInt(lessonId))
      .maybeSingle(),
    // Is there a next lesson in this module?
    supabase
      .from('lessons')
      .select('level_number')
      .eq('category', categoryName)
      .eq('module_number', parseInt(moduleId))
      .order('level_number'),
    // Every session for this user — feeds the streak, and tells us whether this
    // is the FIRST time they've passed this level (i.e. whether the sticker is new).
    supabase
      .from('sessions')
      .select('id, created_at, feedback, level_number, module_number, category')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 400 * 864e5).toISOString())
      .order('created_at', { ascending: true }),
    checkSessionLimitServer(user.id).catch(() => ({
      allowed: true,
      reason: 'ok' as const,
      sessionsRemainingToday: 9999,
    })),
  ])

  const feedback = (session.feedback ?? {}) as Record<string, unknown>
  const score = Number(feedback.overall_score ?? 0)
  const moduleNumber = Number(session.module_number ?? moduleId)
  const passThreshold = moduleNumber === 1 ? 70 : 75
  const passed = Boolean(feedback.passed ?? score >= passThreshold)

  const history = historyRes.data ?? []

  // NEW STICKER? Only when this session is the earliest PASSING attempt at this
  // exact level. Re-passing a level you already cleared is not a new reward, and
  // firing the celebration again would make it meaningless.
  const earlierPass = history.find((s) => {
    const f = (s.feedback ?? {}) as Record<string, unknown>
    const sc = Number(f.overall_score ?? 0)
    const p = Boolean(f.passed ?? sc >= passThreshold)
    return (
      p &&
      s.category === categoryName &&
      Number(s.module_number) === moduleNumber &&
      Number(s.level_number) === parseInt(lessonId) &&
      s.id !== session.id &&
      new Date(s.created_at).getTime() < new Date(session.created_at).getTime()
    )
  })
  const newlyCompleted = passed && !earlierPass

  const streak = computeStreak(history.map((s) => s.created_at as string))

  // Which sticker did they just earn? The one for today's slot on the dashboard
  // board, so the two screens agree.
  const dayIdx = (new Date().getDay() + 6) % 7

  const levels = (siblingsRes.data ?? []).map((l) => Number(l.level_number)).sort((a, b) => a - b)
  const idx = levels.indexOf(parseInt(lessonId))
  const nextLevel = idx >= 0 && idx < levels.length - 1 ? levels[idx + 1] : null

  const tone = resolveTone(session.tone as string)
  const toneQ = `?tone=${encodeURIComponent(tone)}`

  const nextHref = nextLevel
    ? `/category/${categoryId}/module/${moduleId}/lesson/${nextLevel}/practice${toneQ}`
    : `/category/${categoryId}/modules${toneQ}&module=${moduleId}`

  return (
    <FeedbackView
      sessionId={String(session.id)}
      categoryId={categoryId}
      categoryName={categoryName}
      moduleId={String(moduleId)}
      lessonId={String(lessonId)}
      lessonTitle={lessonRes.data?.level_title || 'Lesson'}
      tone={tone}
      score={score}
      passThreshold={passThreshold}
      passed={passed}
      contentScore={Number(feedback.content_score ?? 0)}
      linguisticScore={Number(feedback.linguistic_score ?? 0)}
      focusAreaScores={(feedback.focus_area_scores ?? {}) as Record<string, number>}
      strengths={(feedback.strengths ?? []) as string[]}
      improvements={(feedback.improvements ?? []) as string[]}
      detailedFeedback={String(feedback.detailed_feedback ?? '')}
      transcript={String(session.user_transcript ?? '')}
      exampleText={String(session.ai_example_text ?? '')}
      exampleAudioUrl={String(session.ai_example_audio_url ?? '')}
      newlyCompleted={newlyCompleted}
      streak={streak}
      dayLabel={DAYS[dayIdx]}
      stickerIcon={STICKER_ICONS[dayIdx]}
      stickerColor={STICKER_COLORS[dayIdx]}
      nextHref={nextHref}
      retryHref={`/category/${categoryId}/module/${moduleId}/lesson/${lessonId}/practice${toneQ}`}
      sessionsRemainingToday={limit.sessionsRemainingToday}
    />
  )
}
