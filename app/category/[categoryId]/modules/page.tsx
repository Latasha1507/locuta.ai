import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import { CoachLessonView, TONES, type LessonItem, type CoachLessonData } from '@/components/practice/CoachLessonView'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const categoryMap: Record<string, string> = {
  'public-speaking': 'Public Speaking',
  storytelling: 'Storytelling',
  'creator-speaking': 'Creator Speaking',
  'casual-conversation': 'Casual Conversation',
  'workplace-communication': 'Workplace Communication',
  'pitch-anything': 'Pitch Anything',
}

interface LessonRow {
  module_number: number
  module_title: string | null
  level_number: number
  level_title: string | null
  lesson_explanation: string | null
  expected_duration_sec: number | null
}

/**
 * Difficulty is derived from module position, not stored. The curriculum is
 * built as a ramp (module 1 -> module N), so module number IS the difficulty
 * signal. Labelling it explicitly beats inventing a column.
 */
function difficultyFor(moduleNumber: number): LessonItem['difficulty'] {
  if (moduleNumber <= 2) return 'Beginner'
  if (moduleNumber <= 4) return 'Intermediate'
  return 'Advanced'
}

/** First sentence of the explanation, trimmed — the full text lives in the lesson. */
function shortDesc(text: string | null): string {
  if (!text) return 'Practise this out loud and get instant feedback.'
  const first = text.split(/(?<=\.)\s/)[0] ?? text
  return first.length > 110 ? `${first.slice(0, 107).trimEnd()}…` : first
}

export default async function CategoryModulesPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string }>
  searchParams: Promise<{ tone?: string; module?: string }>
}) {
  const { categoryId } = await params
  const sp = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const categoryName = categoryMap[categoryId]
  if (!categoryName) notFound()

  // Only accept a tone we actually support — the value is used downstream to
  // prompt the model, so it must not be attacker-controlled free text.
  const requested = sp.tone ?? ''
  const initialTone = TONES.some((t) => t.name === requested) ? requested : 'Normal'

  const [lessonsRes, progressRes, profileRes, isUserAdmin] = await Promise.all([
    supabase
      .from('lessons')
      .select('module_number, module_title, level_number, level_title, lesson_explanation, expected_duration_sec')
      .eq('category', categoryName)
      .order('module_number')
      .order('level_number'),
    supabase
      .from('user_progress')
      .select('module_number, level_number, completed, best_score')
      .eq('user_id', user.id)
      .eq('category', categoryName),
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    isAdmin().catch(() => false),
  ])

  const lessons = (lessonsRes.data ?? []) as LessonRow[]
  const progress = progressRes.data ?? []
  const profile = profileRes.data as Record<string, unknown> | null

  if (lessons.length === 0) notFound()

  // Group by module.
  const byModule = new Map<number, LessonRow[]>()
  for (const l of lessons) {
    const arr = byModule.get(l.module_number) ?? []
    arr.push(l)
    byModule.set(l.module_number, arr)
  }
  const moduleNumbers = [...byModule.keys()].sort((a, b) => a - b)

  const requestedModule = Number(sp.module ?? moduleNumbers[0])
  const moduleNumber = moduleNumbers.includes(requestedModule) ? requestedModule : moduleNumbers[0]
  const moduleLessons = byModule.get(moduleNumber) ?? []

  const progressMap = new Map<string, { completed: boolean; best_score: number | null }>()
  for (const p of progress) {
    progressMap.set(`${p.module_number}-${p.level_number}`, {
      completed: !!p.completed,
      best_score: (p.best_score as number) ?? null,
    })
  }

  // ---------------------------------------------------------------------
  // Access rules — carried over from the previous implementation unchanged.
  // These gate revenue; this redesign deliberately does not alter who can
  // open what. Module 1 is always free; beyond that needs an active plan AND
  // the previous module completed.
  // ---------------------------------------------------------------------
  const norm = (v: unknown) => (typeof v === 'string' ? v.toLowerCase() : '')
  const planType = norm(profile?.plan_type ?? profile?.plan ?? profile?.tier)
  const subStatus = norm(profile?.subscription_status ?? profile?.plan_status ?? profile?.membership_status)
  const trialEndsAt = (profile?.trial_ends_at ?? profile?.trial_end ?? null) as string | null
  const isTrialActive = trialEndsAt ? new Date(trialEndsAt).getTime() > Date.now() : false
  const hasLifetime = Boolean(profile?.lifetime_access || profile?.founder_access || profile?.beta_access || profile?.pro_access)
  const hasSubFlag = Boolean(profile?.has_active_subscription || profile?.active_subscription || profile?.is_subscription_active)

  const hasFullAccess =
    isUserAdmin ||
    hasLifetime ||
    hasSubFlag ||
    isTrialActive ||
    ['pro', 'paid', 'premium', 'founder', 'lifetime'].includes(planType) ||
    ['active', 'trialing'].includes(subStatus)

  const prevModuleComplete = (() => {
    const prev = byModule.get(moduleNumber - 1)
    if (!prev) return true
    return prev.every((l) => progressMap.get(`${moduleNumber - 1}-${l.level_number}`)?.completed)
  })()

  let moduleLocked = false
  let lockedReason: CoachLessonData['lockedReason'] = null
  if (!isUserAdmin && moduleNumber > 1) {
    if (!hasFullAccess) {
      moduleLocked = true
      lockedReason = 'plan'
    } else if (!prevModuleComplete) {
      moduleLocked = true
      lockedReason = 'sequence'
    }
  }

  const items: LessonItem[] = moduleLessons.map((l) => {
    const p = progressMap.get(`${moduleNumber}-${l.level_number}`)
    return {
      levelNumber: l.level_number,
      title: l.level_title || `Lesson ${l.level_number}`,
      desc: shortDesc(l.lesson_explanation),
      durationSec: l.expected_duration_sec ?? 60,
      difficulty: difficultyFor(moduleNumber),
      done: !!p?.completed,
      locked: moduleLocked,
      bestScore: p?.best_score ?? null,
    }
  })

  // Suggest the first unfinished, unlocked lesson.
  const nextLevel = items.find((i) => !i.done && !i.locked)?.levelNumber ?? null

  const completedInCategory = progress.filter((p) => p.completed).length

  return (
    <CoachLessonView
      categoryId={categoryId}
      categoryName={categoryName}
      moduleNumber={moduleNumber}
      moduleTitle={moduleLessons[0]?.module_title ?? ''}
      moduleNumbers={moduleNumbers}
      lessons={items}
      nextLevel={nextLevel}
      completedInCategory={completedInCategory}
      totalInCategory={lessons.length}
      initialTone={initialTone}
      lockedReason={lockedReason}
    />
  )
}
