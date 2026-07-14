import { redirect } from 'next/navigation'

// Coach selection and lesson selection are now a single two-step screen
// (/category/[id]/modules). This route is kept so existing links and
// bookmarks to /tone keep working.
export default async function ToneRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string }>
  searchParams: Promise<{ tone?: string }>
}) {
  const { categoryId } = await params
  const { tone } = await searchParams
  const q = tone ? `?tone=${encodeURIComponent(tone)}` : ''
  redirect(`/category/${categoryId}/modules${q}`)
}
