import type { SupabaseClient } from '@supabase/supabase-js'

// Single source of truth for "what can this user open in this category, and
// where are they up to". Paths, the lesson picker, and Practice smart-resume
// all call this so they can never disagree about locks or the current lesson.
//
// The access rules gate revenue and are carried over verbatim from the original
// modules page: Module 1 is always free; every module after it needs an active
// plan AND the previous module fully completed.

export const CATEGORY_MAP: Record<string, string> = {
  'public-speaking': 'Public Speaking',
  storytelling: 'Storytelling',
  'creator-speaking': 'Creator Speaking',
  'casual-conversation': 'Casual Conversation',
  'workplace-communication': 'Workplace Communication',
  'pitch-anything': 'Pitch Anything',
}

export function slugForCategory(name: string): string {
  const found = Object.entries(CATEGORY_MAP).find(([, v]) => v === name)
  return found ? found[0] : name.toLowerCase().replace(/\s+/g, '-')
}

export interface LessonRow {
  module_number: number
  module_title: string | null
  level_number: number
  level_title: string | null
  lesson_explanation: string | null
  expected_duration_sec: number | null
}

export interface LevelNode {
  levelNumber: number
  title: string
  durationSec: number
  done: boolean
  locked: boolean
  bestScore: number | null
}

export interface ModuleNode {
  number: number
  title: string
  locked: boolean
  lockedReason: 'plan' | 'sequence' | null
  levels: LevelNode[]
  completedCount: number
  totalCount: number
}

export interface CategoryMap {
  categoryName: string
  modules: ModuleNode[]
  completedInCategory: number
  totalInCategory: number
  /** module+level of the first unfinished, unlocked lesson — the resume point. */
  current: { moduleNumber: number; levelNumber: number } | null
  hasFullAccess: boolean
}

export function difficultyFor(moduleNumber: number): 'Beginner' | 'Intermediate' | 'Advanced' {
  if (moduleNumber <= 2) return 'Beginner'
  if (moduleNumber <= 4) return 'Intermediate'
  return 'Advanced'
}

function computeFullAccess(profile: Record<string, unknown> | null, isAdmin: boolean): boolean {
  const norm = (v: unknown) => (typeof v === 'string' ? v.toLowerCase() : '')
  const planType = norm(profile?.plan_type ?? profile?.plan ?? profile?.tier)
  const subStatus = norm(profile?.subscription_status ?? profile?.plan_status ?? profile?.membership_status)
  const trialEndsAt = (profile?.trial_ends_at ?? profile?.trial_end ?? null) as string | null
  const isTrialActive = trialEndsAt ? new Date(trialEndsAt).getTime() > Date.now() : false
  const hasLifetime = Boolean(
    profile?.lifetime_access || profile?.founder_access || profile?.beta_access || profile?.pro_access,
  )
  const hasSubFlag = Boolean(
    profile?.has_active_subscription || profile?.active_subscription || profile?.is_subscription_active,
  )
  return (
    isAdmin ||
    hasLifetime ||
    hasSubFlag ||
    isTrialActive ||
    ['pro', 'paid', 'premium', 'founder', 'lifetime'].includes(planType) ||
    ['active', 'trialing'].includes(subStatus)
  )
}

/**
 * Load a category's full learning map for a user, with locks and progress
 * resolved. Does its own queries so callers stay thin.
 */
export async function loadCategoryMap(
  supabase: SupabaseClient,
  userId: string,
  categoryName: string,
  isAdmin: boolean,
): Promise<CategoryMap> {
  const [lessonsRes, progressRes, profileRes] = await Promise.all([
    supabase
      .from('lessons')
      .select('module_number, module_title, level_number, level_title, lesson_explanation, expected_duration_sec')
      .eq('category', categoryName)
      .order('module_number')
      .order('level_number'),
    supabase
      .from('user_progress')
      .select('module_number, level_number, completed, best_score')
      .eq('user_id', userId)
      .eq('category', categoryName),
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
  ])

  const lessons = (lessonsRes.data ?? []) as LessonRow[]
  const progress = progressRes.data ?? []
  const profile = profileRes.data as Record<string, unknown> | null

  const progressMap = new Map<string, { completed: boolean; best_score: number | null }>()
  for (const p of progress) {
    progressMap.set(`${p.module_number}-${p.level_number}`, {
      completed: !!p.completed,
      best_score: (p.best_score as number) ?? null,
    })
  }

  const byModule = new Map<number, LessonRow[]>()
  for (const l of lessons) {
    const arr = byModule.get(l.module_number) ?? []
    arr.push(l)
    byModule.set(l.module_number, arr)
  }
  const moduleNumbers = [...byModule.keys()].sort((a, b) => a - b)

  const hasFullAccess = computeFullAccess(profile, isAdmin)

  const moduleComplete = (m: number): boolean => {
    const rows = byModule.get(m)
    if (!rows) return true
    return rows.every((l) => progressMap.get(`${m}-${l.level_number}`)?.completed)
  }

  const modules: ModuleNode[] = moduleNumbers.map((m) => {
    let locked = false
    let lockedReason: 'plan' | 'sequence' | null = null
    if (!isAdmin) {
      if (!hasFullAccess) {
        // No active trial and no subscription: EVERYTHING is locked, Module 1
        // included. Previously only m > 1 was gated, which left every Module 1
        // lesson clickable for expired users — they'd open a lesson, trigger
        // the audio-generation API (real OpenAI spend), and get nothing back.
        // Access control with a free hole in it isn't access control.
        locked = true
        lockedReason = 'plan'
      } else if (m > 1 && !moduleComplete(m - 1)) {
        locked = true
        lockedReason = 'sequence'
      }
    }

    const rows = byModule.get(m) ?? []
    const levels: LevelNode[] = rows.map((l) => {
      const p = progressMap.get(`${m}-${l.level_number}`)
      return {
        levelNumber: l.level_number,
        title: l.level_title || `Lesson ${l.level_number}`,
        durationSec: l.expected_duration_sec ?? 60,
        done: !!p?.completed,
        locked,
        bestScore: p?.best_score ?? null,
      }
    })

    return {
      number: m,
      title: rows[0]?.module_title || `Module ${m}`,
      locked,
      lockedReason,
      levels,
      completedCount: levels.filter((l) => l.done).length,
      totalCount: levels.length,
    }
  })

  // Resume point: first unfinished, unlocked lesson in module/level order.
  let current: { moduleNumber: number; levelNumber: number } | null = null
  for (const mod of modules) {
    if (mod.locked) continue
    const next = mod.levels.find((l) => !l.done)
    if (next) {
      current = { moduleNumber: mod.number, levelNumber: next.levelNumber }
      break
    }
  }

  return {
    categoryName,
    modules,
    completedInCategory: progress.filter((p) => p.completed).length,
    totalInCategory: lessons.length,
    current,
    hasFullAccess,
  }
}
