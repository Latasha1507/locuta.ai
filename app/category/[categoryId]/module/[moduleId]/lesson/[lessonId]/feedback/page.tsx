import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import FeedbackPageClient from '@/components/FeedbackPageClient'

export default async function FeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string; moduleId: string; lessonId: string }>
  searchParams: Promise<{ session?: string }>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const { categoryId, moduleId, lessonId } = resolvedParams
  const sessionId = resolvedSearchParams.session

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  if (!sessionId) {
    notFound()
  }

  // Get session data
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) {
    notFound()
  }

  const feedback = session.feedback
  const score = feedback.overall_score || 0

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#edf2f7] to-[#f7f9fb]">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/category/${categoryId}/modules?tone=${session.tone}`}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center">
                <img src="/Icon.png" alt="Locuta.ai" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Your Feedback</h1>
                <p className="text-sm text-gray-600">Lesson {lessonId} • {session.tone} Tone</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <FeedbackPageClient
        categoryId={categoryId}
        moduleId={moduleId}
        lessonId={lessonId}
        sessionId={sessionId || ''}
        session={session}
        feedback={feedback}
        score={score}
      />
    </div>
  )
}