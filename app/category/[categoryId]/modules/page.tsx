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

// Make page dynamic to avoid caching issues
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CategoryModulesPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string }>
  searchParams: Promise<{ tone?: string; module?: string }>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const { categoryId } = resolvedParams
  const tone = resolvedSearchParams.tone || 'Normal'
  const currentModuleParam = resolvedSearchParams.module || '1'
  const currentModuleNumber = parseInt(currentModuleParam)

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
    progressMap[`${p.module_number}-${p.lesson_number}`] = p
  })

  const totalLessons = lessons?.length || 0
  const completedLessons = progress?.filter(p => p.completed).length || 0
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  const gradientColor = categoryColors[categoryId] || 'from-purple-500 to-indigo-600'

  // Check if module is unlocked
  const isModuleUnlocked = (moduleNum: number): boolean => {
    if (moduleNum === 1) return true
    
    const previousModule = modules[moduleNum - 1]
    if (!previousModule) return true
    
    const allPreviousCompleted = previousModule.every(
      (lesson) => progressMap[`${moduleNum - 1}-${lesson.level_number}`]?.completed
    )
    
    return allPreviousCompleted
  }

  const moduleNumbers = Object.keys(modules).map(Number).sort((a, b) => a - b)
  const currentModule = moduleNumbers.includes(currentModuleNumber) 
    ? currentModuleNumber 
    : moduleNumbers[0]
  
  const currentModuleIndex = moduleNumbers.indexOf(currentModule)
  const hasNextModule = currentModuleIndex < moduleNumbers.length - 1
  const hasPrevModule = currentModuleIndex > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/category/${categoryId}/tone`}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{categoryName}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {moduleNumbers.length} modules • {totalLessons} lessons • {tone} Tone
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
        {moduleNumbers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No lessons yet</h2>
            <p className="text-gray-600 mb-6">Lessons for this category are coming soon!</p>
            <Link href="/dashboard" className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition shadow-lg">
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <>


            {/* Current Module Display */}
            {moduleNumbers.map((moduleNumber) => {
              if (moduleNumber !== currentModule) return null

              const moduleLessons = modules[moduleNumber]
              const moduleTitle = moduleLessons[0]?.module_title || `Module ${moduleNumber}`
              const completedCount = moduleLessons.filter(
                (lesson) => progressMap[`${moduleNumber}-${lesson.level_number}`]?.completed
              ).length
              const moduleProgress = Math.round((completedCount / moduleLessons.length) * 100)
              const isUnlocked = isModuleUnlocked(moduleNumber)

              return (
                <div key={moduleNumber} className="relative flex items-start gap-4">
                  {/* Previous Button - Outside Left */}
                  <div className="flex-shrink-0 pt-8">
                    <Link
                      href={hasPrevModule ? `?tone=${tone}&module=${moduleNumbers[currentModuleIndex - 1]}` : '#'}
                      className={`flex items-center justify-center w-12 h-12 rounded-full transition-all shadow-lg ${
                        hasPrevModule
                          ? 'bg-white hover:bg-purple-50 text-purple-600 hover:scale-110 border-2 border-purple-200'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </Link>
                  </div>

                  {/* Module Card */}
                  <div className="flex-1 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
                    <div className={`bg-gradient-to-r ${gradientColor} px-6 py-6 text-white relative`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-3xl font-bold mb-1">{moduleTitle}</h2>
                        <p className="text-white/80 text-sm">Module {moduleNumber}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-bold">{moduleProgress}%</div>
                        <p className="text-sm text-white/90">Complete</p>
                      </div>
                    </div>
                    <div className="bg-white/20 h-3 rounded-full overflow-hidden backdrop-blur-sm">
                      <div 
                        className="h-full bg-white rounded-full transition-all duration-500 shadow-lg" 
                        style={{ width: `${moduleProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-white/90 mt-2">{completedCount} of {moduleLessons.length} lessons completed</p>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                      {moduleLessons.map((lesson) => {
                        const lessonProgress = progressMap[`${moduleNumber}-${lesson.level_number}`]
                        const isCompleted = lessonProgress?.completed || false
                        const bestScore = lessonProgress?.best_score || null

                        const LessonCard = (
                          <div
                            key={lesson.id}
                            className={`group relative bg-gradient-to-br from-white to-gray-50 border-2 rounded-2xl p-6 transition-all duration-300 ${
                              isUnlocked 
                                ? 'border-gray-200 hover:border-purple-400 hover:shadow-2xl hover:-translate-y-1 cursor-pointer' 
                                : 'border-gray-300 cursor-not-allowed opacity-60'
                            }`}
                          >
                            {/* Lock indicator for locked lessons */}
                            {!isUnlocked && (
                              <div className="absolute top-4 right-4">
                                <div className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                  <span>🔒</span>
                                </div>
                              </div>
                            )}

                            {isCompleted && isUnlocked && (
                              <div className="absolute top-4 right-4 flex items-center gap-2">
                                <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 animate-pulse">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  <span>Completed</span>
                                </div>
                              </div>
                            )}

                            <div className="flex items-start gap-4">
                              <div className={`relative w-16 h-16 rounded-xl flex items-center justify-center font-bold text-2xl flex-shrink-0 transition-all duration-300 shadow-lg ${
                                isCompleted && isUnlocked
                                  ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white' 
                                  : isUnlocked
                                  ? 'bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-700 group-hover:from-purple-200 group-hover:to-indigo-200'
                                  : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-500'
                              }`}>
                                {isCompleted && isUnlocked ? (
                                  <span className="text-3xl">✓</span>
                                ) : (
                                  lesson.level_number
                                )}
                                {isCompleted && isUnlocked && (
                                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                                    <span className="text-lg">🌟</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <h3 className={`font-bold text-lg mb-2 transition-colors leading-tight ${
                                  isUnlocked ? 'text-gray-900 group-hover:text-purple-600' : 'text-gray-600'
                                }`}>
                                  {lesson.level_title}
                                </h3>
                                <p className={`text-sm line-clamp-2 leading-relaxed mb-4 ${
                                  isUnlocked ? 'text-gray-600' : 'text-gray-500'
                                }`}>
                                  {lesson.lesson_explanation}
                                </p>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                      isCompleted && isUnlocked
                                        ? 'bg-green-100 text-green-700' 
                                        : isUnlocked
                                        ? 'bg-gray-100 text-gray-600'
                                        : 'bg-gray-100 text-gray-500'
                                    }`}>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span className="font-bold">{lesson.expected_duration_sec}s</span>
                                    </div>

                                    {bestScore && isUnlocked && (
                                      <div className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold">
                                        <span>🏆</span>
                                        <span>{bestScore}/100</span>
                                      </div>
                                    )}
                                  </div>

                                  {isUnlocked && (
                                    <svg className="w-6 h-6 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )

                        return isUnlocked ? (
                          <Link
                            key={lesson.id}
                            href={`/category/${categoryId}/module/${moduleNumber}/lesson/${lesson.level_number}/practice?tone=${tone}`}
                          >
                            {LessonCard}
                          </Link>
                        ) : (
                          LessonCard
                        )
                      })}
                    </div>
                  </div>
                  </div>

                  {/* Next Button - Outside Right */}
                  <div className="flex-shrink-0 pt-8">
                    <Link
                      href={hasNextModule ? `?tone=${tone}&module=${moduleNumbers[currentModuleIndex + 1]}` : '#'}
                      className={`flex items-center justify-center w-12 h-12 rounded-full transition-all shadow-lg ${
                        hasNextModule
                          ? 'bg-white hover:bg-purple-50 text-purple-600 hover:scale-110 border-2 border-purple-200'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </main>
    </div>
  )
}