import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const resolvedSearchParams = await searchParams
  const selectedCategory = resolvedSearchParams.category
  const currentPage = parseInt(resolvedSearchParams.page || '1')
  const itemsPerPage = 20
  const offset = (currentPage - 1) * itemsPerPage

  // Build query
  let query = supabase
    .from('sessions')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + itemsPerPage - 1)

  if (selectedCategory) {
    query = query.eq('category', selectedCategory)
  }

  const { data: sessions, count } = await query

  // Get unique categories for filter
  const { data: allSessions } = await supabase
    .from('sessions')
    .select('category')
    .eq('user_id', user.id)

  const categories = [...new Set(allSessions?.map(s => s.category) || [])]

  const totalPages = count ? Math.ceil(count / itemsPerPage) : 1

  // Calculate stats
  const avgScore = sessions && sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + (s.overall_score || 0), 0) / sessions.length)
    : 0

  const totalSessions = count || 0

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50'
    if (score >= 70) return 'text-blue-600 bg-blue-50'
    if (score >= 50) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '🌟'
    if (score >= 80) return '🎉'
    if (score >= 70) return '👍'
    if (score >= 60) return '😊'
    return '💪'
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#edf2f7] to-[#f7f9fb]">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 transition-colors">
              ← Back
            </Link>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center">
              <img src="/Icon.png" alt="Locuta.ai" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Practice History
            </h1>
          </div>
          <form action="/auth/signout" method="post">
            <button 
              type="submit"
              className="px-4 py-2 text-slate-700 font-semibold hover:text-indigo-600 transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-xl shadow-lg p-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-200 animate-pulse" />
            <div>
              <div className="text-sm text-slate-500">Total Sessions</div>
              <div className="text-2xl font-bold text-slate-900">{totalSessions}</div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-xl shadow-lg p-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-100 to-pink-200 animate-pulse" />
            <div>
              <div className="text-sm text-slate-500">Average Score</div>
              <div className="text-2xl font-bold text-slate-900">{avgScore}</div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-xl shadow-lg p-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 animate-pulse" />
            <div>
              <div className="text-sm text-slate-500">Best Score</div>
              <div className="text-2xl font-bold text-slate-900">{sessions && sessions.length > 0 ? Math.max(...sessions.map(s => s.overall_score || 0)) : 0}</div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-700 font-medium">Filter by:</span>
            <Link
              href="/history"
              className={`px-4 py-2 rounded-lg transition-colors ${
                !selectedCategory 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Categories
            </Link>
            {categories.map(category => (
              <Link
                key={category}
                href={`/history?category=${encodeURIComponent(category)}`}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === category
                    ? 'bg-purple-600 text-white' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {category}
              </Link>
            ))}
          </div>
        </div>

        {/* Sessions List */}
        {sessions && sessions.length > 0 ? (
          <div className="space-y-4">
            {sessions.map((session) => {
              const feedback = session.feedback as {
                strengths?: string[]
                improvements?: string[]
                detailed_feedback?: string
                focus_area_scores?: Record<string, number>
              }
              const focusScores = feedback?.focus_area_scores || {}
              
              return (
                <div 
                  key={session.id}
                  className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-slate-900">
                            {session.category}
                          </h3>
                          <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                            {session.tone}
                          </span>
                        </div>
                        <div className="text-slate-600">
                          Module {session.module_number}, Lesson {session.lesson_number}
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          {new Date(session.created_at).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      
                      {/* Score Badge */}
                      <div className="flex items-center gap-4">
                        <div className={`${getScoreColor(session.overall_score)} px-6 py-3 rounded-xl`}>
                          <div className="text-3xl font-bold text-center">
                            {session.overall_score}
                          </div>
                          <div className="text-xs text-center opacity-75">Overall Score</div>
                        </div>
                        <div className="text-4xl">
                          {getScoreEmoji(session.overall_score)}
                        </div>
                      </div>
                    </div>

                    {/* Focus Area Scores */}
                    {Object.keys(focusScores).length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                        {Object.entries(focusScores).map(([area, score]: [string, number]) => (
                          <div key={area} className="bg-slate-50 rounded-lg p-3">
                            <div className="text-sm text-slate-600 mb-1">{area}</div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full"
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                              <span className="text-sm font-bold text-slate-900">{score}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Strengths & Improvements */}
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      {feedback?.strengths && feedback.strengths.length > 0 && (
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                            <span>✓</span> Strengths
                          </div>
                          <ul className="space-y-1">
                            {feedback.strengths.map((strength: string, idx: number) => (
                              <li key={idx} className="text-sm text-green-800">• {strength}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {feedback?.improvements && feedback.improvements.length > 0 && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                            <span>→</span> Areas to Improve
                          </div>
                          <ul className="space-y-1">
                            {feedback.improvements.map((improvement: string, idx: number) => (
                              <li key={idx} className="text-sm text-blue-800">• {improvement}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Detailed Feedback */}
                    {feedback?.detailed_feedback && (
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="font-semibold text-slate-900 mb-2">Detailed Feedback</div>
                        <p className="text-slate-700 text-sm leading-relaxed">
                          {feedback.detailed_feedback}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 animate-pulse mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              No Sessions Yet
            </h3>
            <p className="text-slate-600 mb-6">
              {selectedCategory 
                ? `You haven't practiced any ${selectedCategory} lessons yet.`
                : "Start practicing to see your history here!"}
            </p>
            <Link
              href="/dashboard"
              className="inline-block bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow"
            >
              Start Practicing
            </Link>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {currentPage > 1 && (
              <Link
                href={`/history?page=${currentPage - 1}${selectedCategory ? `&category=${selectedCategory}` : ''}`}
                className="px-4 py-2 bg-white rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              >
                ← Previous
              </Link>
            )}
            
            <div className="flex gap-2">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = i + 1
                return (
                  <Link
                    key={page}
                    href={`/history?page=${page}${selectedCategory ? `&category=${selectedCategory}` : ''}`}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {page}
                  </Link>
                )
              })}
            </div>

            {currentPage < totalPages && (
              <Link
                href={`/history?page=${currentPage + 1}${selectedCategory ? `&category=${selectedCategory}` : ''}`}
                className="px-4 py-2 bg-white rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}