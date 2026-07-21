import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import { loadFounderPromo } from '@/lib/founder-promo'
import { slugForCategory, CATEGORY_MAP } from '@/lib/category-map'
import { resolveTone } from '@/lib/tones'
import { HistoryView, type HistoryItem, type PersonalBest } from '@/components/history/HistoryView'

export const dynamic = 'force-dynamic'

const PER_PAGE = 20

const META: Record<string, { icon: string; color: string }> = {
  'public-speaking': { icon: 'mic', color: '#3fce6f' },
  storytelling: { icon: 'book', color: '#ffc531' },
  'creator-speaking': { icon: 'camera', color: '#ff6f61' },
  'casual-conversation': { icon: 'chat', color: '#1cb0f6' },
  'workplace-communication': { icon: 'briefcase', color: '#a56cf5' },
  'pitch-anything': { icon: 'target', color: '#3fce6f' },
}

interface FeedbackShape {
  overall_score?: number
  content_score?: number
  linguistic_score?: number
  passed?: boolean
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = await isAdmin().catch(() => false)
  const activeCategoryId = sp.category && META[sp.category] ? sp.category : null
  const page = Math.max(1, parseInt(sp.page || '1'))
  const offset = (page - 1) * PER_PAGE

  // Only completed sessions (they have feedback). A session mid-flight has none.
  let pageQuery = supabase
    .from('sessions')
    .select('id, category, module_number, level_number, tone, feedback, created_at', { count: 'exact' })
    .eq('user_id', user.id)
    .not('feedback', 'is', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + PER_PAGE - 1)

  if (activeCategoryId) {
    // Map slug -> stored category name for the filter.
    const name = CATEGORY_MAP[activeCategoryId]
    if (name) pageQuery = pageQuery.eq('category', name)
  }

  const [pageRes, allRes, promo] = await Promise.all([
    pageQuery,
    // Lightweight pull for stats/trend/bests across ALL sessions (scores only).
    supabase
      .from('sessions')
      .select('category, level_number, module_number, feedback, created_at')
      .eq('user_id', user.id)
      .not('feedback', 'is', null)
      .order('created_at', { ascending: true }),
    loadFounderPromo(supabase, user.id),
  ])

  const rows = pageRes.data ?? []
  const count = pageRes.count ?? 0
  const all = allRes.data ?? []

  const scoreOf = (fb: unknown) => Number((fb as FeedbackShape)?.overall_score ?? 0)

  // Lesson titles for the visible page.
  const lessonKeys = rows.map((r) => ({
    category: r.category as string,
    module_number: r.module_number as number,
    level_number: r.level_number as number,
  }))
  const titleMap = new Map<string, string>()
  if (lessonKeys.length > 0) {
    const cats = [...new Set(lessonKeys.map((k) => k.category))]
    const { data: lessons } = await supabase
      .from('lessons')
      .select('category, module_number, level_number, level_title')
      .in('category', cats)
    for (const l of lessons ?? []) {
      titleMap.set(`${l.category}-${l.module_number}-${l.level_number}`, l.level_title as string)
    }
  }

  const items: HistoryItem[] = rows.map((r) => {
    const fb = (r.feedback ?? {}) as FeedbackShape
    const categoryName = r.category as string
    return {
      sessionId: String(r.id),
      categoryId: slugForCategory(categoryName),
      categoryName,
      moduleNumber: Number(r.module_number),
      levelNumber: Number(r.level_number),
      lessonTitle:
        titleMap.get(`${categoryName}-${r.module_number}-${r.level_number}`) || `Lesson ${r.level_number}`,
      tone: resolveTone(r.tone as string | undefined),
      score: Number(fb.overall_score ?? 0),
      contentScore: Number(fb.content_score ?? 0),
      linguisticScore: Number(fb.linguistic_score ?? 0),
      passed: Boolean(fb.passed ?? Number(fb.overall_score ?? 0) >= 70),
      createdAt: r.created_at as string,
    }
  })

  // Stats across everything.
  const allScores = all.map((s) => scoreOf(s.feedback))
  const totalCount = all.length
  const avgScore = totalCount > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / totalCount) : 0
  const bestScore = totalCount > 0 ? Math.max(...allScores) : 0
  const passCount = all.filter((s) => {
    const fb = s.feedback as FeedbackShape
    return Boolean(fb?.passed ?? scoreOf(s.feedback) >= 70)
  }).length
  const passRate = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0

  // Trend = last 12 scores, oldest→newest.
  const trend = allScores.slice(-12)

  // Personal best per category.
  const bestByCat = new Map<string, number>()
  for (const s of all) {
    const cat = s.category as string
    bestByCat.set(cat, Math.max(bestByCat.get(cat) ?? 0, scoreOf(s.feedback)))
  }
  const personalBests: PersonalBest[] = [...bestByCat.entries()]
    .map(([name, best]) => {
      const id = slugForCategory(name)
      return { categoryName: name, icon: META[id]?.icon ?? 'mic', color: META[id]?.color ?? '#3fce6f', best }
    })
    .sort((a, b) => b.best - a.best)

  // Distinct categories actually practised (for filter chips).
  const practisedCats = [...new Set(all.map((s) => s.category as string))]
  const categories = practisedCats.map((name) => ({ id: slugForCategory(name), name }))

  return (
    <HistoryView
      isAdmin={admin}
      promo={promo}
      items={items}
      totalCount={totalCount}
      avgScore={avgScore}
      bestScore={bestScore}
      passRate={passRate}
      trend={trend}
      personalBests={personalBests}
      categories={categories}
      activeCategoryId={activeCategoryId}
      page={page}
      totalPages={Math.max(1, Math.ceil(count / PER_PAGE))}
      profileName={(user.user_metadata?.full_name as string) || undefined}
      profileEmail={user.email || undefined}
    />
  )
}
