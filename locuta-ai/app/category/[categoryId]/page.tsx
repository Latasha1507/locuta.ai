import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { notFound } from 'next/navigation'

// Map URL slugs to database category names
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

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const resolvedParams = await params
  const categoryId = resolvedParams.categoryId
  const categoryName = categoryMap[categoryId]

  if (!categoryName) {
    notFound()
  }

  // Get lessons for this category grouped by module
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

  // Get user's progress for this category
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
              href="/dashboard"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center">
              <img src="/Icon.png" alt="Locuta.ai" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{categoryName}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {Object.keys(modules).length} modules • {totalLessons} lessons
              </p>
            </div>
            {/* Overall Progress Circle */}
            <div className="relative w-20 h-20">
              <svg className="transform -rotate-90 w-20 h-20">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-200"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - overallProgress / 100)}`}
                  className="text-purple-600 transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-900">{overallProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {Object.keys(modules).length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No lessons yet
            </h2>
            <p className="text-gray-600 mb-6">
              Lessons for this category are coming soon!
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition shadow-lg"
            >
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(modules)
              .map(Number)
              .sort((a, b) => a - b)
              .map((moduleNumber) => {
                const moduleLessons = modules[moduleNumber]
                const moduleTitle = moduleLessons[0]?.module_title || `Module ${moduleNumber}`
                const completedCount = moduleLessons.filter(
                  (lesson) => progressMap[`${moduleNumber}-${lesson.level_number}`]?.completed
                ).length
                const moduleProgress = Math.round((completedCount / moduleLessons.length) * 100)

                return (
                  <div
                    key={moduleNumber}
                    className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300"
                  >
                    {/* Module Header */}
                    <div className={`bg-gradient-to-r ${gradientColor} px-6 py-6 text-white`}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-2xl font-bold">
                            Module {moduleNumber}
                          </h2>
                          <p className="text-white/90 mt-1">{moduleTitle}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-4xl font-bold">{moduleProgress}%</div>
                          <p className="text-sm text-white/90">Complete</p>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="bg-white/20 h-3 rounded-full overflow-hidden backdrop-blur-sm">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-500 shadow-lg"
                          style={{ width: `${moduleProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-white/90 mt-2">
                        {completedCount} of {moduleLessons.length} lessons completed
                      </p>
                    </div>

                    {/* Lessons Grid */}
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {moduleLessons.map((lesson) => {
                          const lessonProgress =
                            progressMap[`${moduleNumber}-${lesson.level_number}`]
                          const isCompleted = lessonProgress?.completed || false
                          const bestScore = lessonProgress?.best_score || null

                          return (
                            <Link
                              key={lesson.id}
                              href={`/category/${categoryId}/module/${moduleNumber}/lesson/${lesson.level_number}`}
                              className="group relative bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 hover:border-purple-300 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                            >
                              {/* Lesson Number Badge */}
                              <div className="flex items-start gap-4">
                                <div
                                  className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg flex-shrink-0 transition-all duration-300 ${
                                    isCompleted
                                      ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg'
                                      : 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700 group-hover:from-purple-100 group-hover:to-indigo-100 group-hover:text-purple-600'
                                  }`}
                                >
                                  {isCompleted ? '✓' : lesson.level_number}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                                    {lesson.level_title}
                                  </h3>
                                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                                    {lesson.lesson_explanation}
                                  </p>
                                  
                                  {/* Score or Status */}
                                  <div className="mt-3 flex items-center gap-2">
                                    {bestScore ? (
                                      <div className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold">
                                        <span>🏆</span>
                                        <span>{bestScore}/100</span>
                                      </div>
                                    ) : (
                                      <div className="inline-flex items-center gap-1 text-gray-500 text-xs font-medium">
                                        <span>•</span>
                                        <span>{lesson.expected_duration_sec}s practice</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Arrow Icon */}
                                <svg
                                  className="w-5 h-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              </div>

                              {/* Completion Badge */}
                              {isCompleted && (
                                <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                                  ✓ Done
                                </div>
                              )}
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
