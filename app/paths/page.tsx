import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import { loadCategoryMap, CATEGORY_MAP } from '@/lib/category-map'
import { loadFounderPromo } from '@/lib/founder-promo'
import { resolveTone } from '@/lib/tones'
import { preferredTone } from '@/lib/preferences'
import { PathsView, type PathCategory } from '@/components/paths/PathsView'

export const dynamic = 'force-dynamic'

const META: Record<string, { icon: string; color: string }> = {
  'public-speaking': { icon: 'mic', color: '#3fce6f' },
  storytelling: { icon: 'book', color: '#ffc531' },
  'creator-speaking': { icon: 'camera', color: '#ff6f61' },
  'casual-conversation': { icon: 'chat', color: '#1cb0f6' },
  'workplace-communication': { icon: 'briefcase', color: '#a56cf5' },
  'pitch-anything': { icon: 'target', color: '#3fce6f' },
}

export default async function PathsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tone?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = await isAdmin().catch(() => false)

  const activeCategoryId = sp.category && META[sp.category] ? sp.category : 'public-speaking'
  const activeCategoryName = CATEGORY_MAP[activeCategoryId]

  // Tone: explicit param, else last-used, else Normal.
  // Tone: explicit param wins, else saved default (Settings) → last-used → Normal.
  let tone = resolveTone(sp.tone)
  if (!sp.tone) {
    const [{ data: last }, { data: prof }] = await Promise.all([
      supabase
        .from('sessions')
        .select('tone')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('profiles').select('preferences').eq('id', user.id).maybeSingle(),
    ])
    tone = preferredTone(prof?.preferences, last?.tone as string | undefined)
  }

  const [activeMap, promo, ...otherMaps] = await Promise.all([
    loadCategoryMap(supabase, user.id, activeCategoryName, admin),
    loadFounderPromo(supabase, user.id),
    // Progress counts for the tabs of the OTHER categories.
    ...Object.values(CATEGORY_MAP)
      .filter((n) => n !== activeCategoryName)
      .map((n) => loadCategoryMap(supabase, user.id, n, admin)),
  ])

  // Assemble tab data in canonical order.
  const mapByName = new Map<string, { completedInCategory: number; totalInCategory: number }>()
  mapByName.set(activeCategoryName, activeMap)
  for (const m of otherMaps) mapByName.set(m.categoryName, m)

  const categories: PathCategory[] = Object.entries(CATEGORY_MAP).map(([id, name]) => {
    const m = mapByName.get(name)
    return {
      id,
      name,
      icon: META[id].icon,
      color: META[id].color,
      completed: m?.completedInCategory ?? 0,
      total: m?.totalInCategory ?? 0,
    }
  })

  return (
    <PathsView
      isAdmin={admin}
      promo={promo}
      categories={categories}
      activeCategoryId={activeCategoryId}
      activeCategoryName={activeCategoryName}
      tone={tone}
      modules={activeMap.modules}
      current={activeMap.current}
      profileName={(user.user_metadata?.full_name as string) || undefined}
      profileEmail={user.email || undefined}
    />
  )
}
