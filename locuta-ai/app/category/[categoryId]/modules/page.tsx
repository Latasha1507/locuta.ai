import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const categoryMap: { [key: string]: string } = {
  'public-speaking': 'Public Speaking',
  'storytelling': 'Storytelling',
  'creator-speaking': 'Creator Speaking',
  'casual-conversation': 'Casual Conversation',
  'workplace-communication': 'Workplace Communication',
  'pitch-anything': 'Pitch Anything',
}

const categoryColors: { [key: string]: string } = {
  'public-speaking': 'from-purple-500 to-indigo-600',
  'storytelling': 'from-blue-500 to-cyan-600',
  'creator-speaking': 'from-pink-500 to-rose-600',
  'casual-conversation': 'from-green-500 to-emerald-600',
  'workplace-communication': 'from-indigo-500 to-purple-600',
  'pitch-anything': 'from-teal-500 to-cyan-600',
}

export default async function CategoryModulesPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string }>
  searchParams: Promise<{ tone?: string }>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const { categoryId } = resolvedParams
  const tone = resolvedSearchParams.tone || 'Normal'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const categoryName = categoryMap[categoryId]

  if (!categoryName) {
    notFound()
  }

  // Get lessons for this category
  const { data: lessons } = await supabase
    .from('lessons')
    .select('*')
    .eq('category', categoryName)
    .order('module_number')
    .order('level_number')

  // Group lessons by module
  const modules: { [key: number]: any[] } = {}
  lessons?.forEach((lesson) => {
    if (!modules[lesson.module_number]) {
      modules[lesson.module_number] = []
    }
    modules[lesson.module_number].push(lesson)
  })

  // Get user's progress
  const { data: progress } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('category', categoryName)

  const progressMap: { [key: string]: any } = {}
  progress?.forEach((p) => {
    progressMap[`${p.module_number}-${p.level_number}`] = p
  })

  const totalLessons = lessons?.length || 0
  const completedLessons = progress?.filter(p => p.completed).length || 0
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  const gradientColor = categoryColors[categoryId] || 'from-purple-500 to-indigo-600'

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#edf2f7] to-[#f7f9fb]">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/category/${categoryId}/tone`}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center">
              <img src="/Icon.png" alt="Locuta.ai" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{categoryName}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {Object.keys(modules).length} modules • {totalLessons} lessons • {tone} Tone
              </p>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg">
              <div className="text-sm font-medium opacity-90">Overall Progress</div>
              <div className="text-3xl font-bold">{overallProgress}%</div>
              <div className="text-xs opacity-75">{completedLessons}/{totalLessons} lessons</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {Object.keys(modules).length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No lessons yet</h2>
            <p className="text-gray-600 mb-6">Lessons for this category are coming soon!</p>
            <Link href="/dashboard" className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition shadow-lg">
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(modules).map(Number).sort((a, b) => a - b).map((moduleNumber) => {
              const moduleLessons = modules[moduleNumber]
              const moduleTitle = moduleLessons[0]?.module_title || `Module ${moduleNumber}`
              const completedCount = moduleLessons.filter(
                (lesson) => progressMap[`${moduleNumber}-${lesson.level_number}`]?.completed
              ).length
              const moduleProgress = Math.round((completedCount / moduleLessons.length) * 100)

              return (
                <div key={moduleNumber} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
                  <div className={`bg-gradient-to-r ${gradientColor} px-6 py-6 text-white`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">Module {moduleNumber}</h2>
                        <p className="text-white/90 mt-1">{moduleTitle}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-bold">{moduleProgress}%</div>
                        <p className="text-sm text-white/90">Complete</p>
                      </div>
                    </div>
                    <div className="bg-white/20 h-3 rounded-full overflow-hidden backdrop-blur-sm">
                      <div className="h-full bg-white rounded-full transition-all duration-500 shadow-lg" style={{ width: `${moduleProgress}%` }}></div>
                    </div>
                    <p className="text-sm text-white/90 mt-2">{completedCount} of {moduleLessons.length} lessons completed</p>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                      {moduleLessons.map((lesson) => {
                        const lessonProgress = progressMap[`${moduleNumber}-${lesson.level_number}`]
                        const isCompleted = lessonProgress?.completed || false
                        const bestScore = lessonProgress?.best_score || null

                        return (
                          <Link
                            key={lesson.id}
                            href={`/category/${categoryId}/module/${moduleNumber}/lesson/${lesson.level_number}/practice?tone=${tone}`}
                            className="group relative bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 hover:border-purple-400 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
                          >
                            {isCompleted && (
                              <div className="absolute top-4 right-4 flex items-center gap-2">
                                <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  <span>Completed</span>
                                </div>
                              </div>
                            )}

                            <div className="flex items-start gap-4">
                              <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-bold text-2xl flex-shrink-0 transition-all duration-300 shadow-lg ${
                                isCompleted ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white' : 'bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-700 group-hover:from-purple-200 group-hover:to-indigo-200'
                              }`}>
                                {isCompleted ? '✓' : lesson.level_number}
                              </div>

                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-purple-600 transition-colors leading-tight">
                                  {lesson.level_title}
                                </h3>
                                <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-4">
                                  {lesson.lesson_explanation}
                                </p>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                      isCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span className="font-bold">{lesson.expected_duration_sec}s</span>
                                    </div>

                                    {bestScore && (
                                      <div className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold">
                                        <span>🏆</span>
                                        <span>{bestScore}/100</span>
                                      </div>
                                    )}
                                  </div>

                                  <svg className="w-6 h-6 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
