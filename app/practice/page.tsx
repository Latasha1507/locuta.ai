import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import { loadCategoryMap, CATEGORY_MAP, slugForCategory } from '@/lib/category-map'
import { preferredTone } from '@/lib/preferences'

export const dynamic = 'force-dynamic'

// "Practice" isn't a page — it's a smart-resume. Work out the single lesson the
// user should do next and drop them straight into it, using the tone they last
// practised with. No screen, no extra click.
//
// (When Settings ships with a stored default tone, swap the "last-used tone"
// lookup below for the saved preference.)
export default async function PracticeResumePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = await isAdmin().catch(() => false)

  // Tone priority: the coach chosen in Settings, else last-used, else Normal.
  const [{ data: lastSession }, { data: profile }] = await Promise.all([
    supabase
      .from('sessions')
      .select('tone, category')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('profiles').select('preferences').eq('id', user.id).maybeSingle(),
  ])

  const tone = preferredTone(profile?.preferences, lastSession?.tone as string | undefined)
  const toneQ = `?tone=${encodeURIComponent(tone)}`

  // Prefer resuming the category they last practised; otherwise scan all of them
  // in the canonical order and resume the first with an open lesson.
  const orderedCategories: string[] = []
  if (lastSession?.category && CATEGORY_MAP[slugForCategory(lastSession.category as string)]) {
    orderedCategories.push(lastSession.category as string)
  }
  for (const name of Object.values(CATEGORY_MAP)) {
    if (!orderedCategories.includes(name)) orderedCategories.push(name)
  }

  for (const categoryName of orderedCategories) {
    const map = await loadCategoryMap(supabase, user.id, categoryName, admin)
    if (map.current) {
      const slug = slugForCategory(categoryName)
      redirect(
        `/category/${slug}/module/${map.current.moduleNumber}/lesson/${map.current.levelNumber}/practice${toneQ}`,
      )
    }
  }

  // Everything done (or no lessons seeded). Send them to browse the map.
  redirect('/paths')
}
