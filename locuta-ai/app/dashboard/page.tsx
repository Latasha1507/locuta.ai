import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch user's progress
  const { data: progress } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)

  // Fetch total lesson counts per category
  const { data: lessons } = await supabase
    .from('lessons')
    .select('category, module_number, level_number')

  // Fetch recent sessions (last 5)
  const { data: recentSessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Calculate progress per category
  const categories = [
    {
      id: 'public-speaking',
      name: 'Public Speaking',
      description: 'Master presentations, speeches, and public events',
      icon: '🎤',
      gradient: 'from-purple-500 to-indigo-600'
    },
    {
      id: 'storytelling',
      name: 'Storytelling',
      description: 'Craft compelling narratives that captivate audiences',
      icon: '📖',
      gradient: 'from-pink-500 to-rose-600'
    },
    {
      id: 'creator-speaking',
      name: 'Creator Speaking',
      description: 'Engage with your audience through video content',
      icon: '🎥',
      gradient: 'from-orange-500 to-red-600'
    },
    {
      id: 'casual-conversation',
      name: 'Casual Conversation',
      description: 'Build confidence in everyday social interactions',
      icon: '💬',
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      id: 'workplace-communication',
      name: 'Workplace Communication',
      description: 'Excel in meetings, presentations, and team discussions',
      icon: '💼',
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      id: 'investor-pitch',
      name: 'Pitch Anything',
      description: 'Master the art of persuasive pitching in any context',
      icon: '💰',
      gradient: 'from-yellow-500 to-amber-600'
    }
  ]

  // Calculate stats for each category
  const categoryStats = categories.map(category => {
    const categoryLessons = lessons?.filter(l => 
      l.category.toLowerCase().replace(/\s+/g, '-') === category.id
    ) || []
    
    const totalLessons = categoryLessons.length
    
    const categoryProgress = progress?.filter(p => 
      p.category.toLowerCase().replace(/\s+/g, '-') === category.id
    ) || []
    
    const completedLessons = categoryProgress.filter(p => p.completed).length
    const completionPercentage = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100) 
      : 0
    
    const bestScore = categoryProgress.length > 0
      ? Math.max(...categoryProgress.map(p => p.best_score || 0))
      : 0
    
    const hasStarted = completedLessons > 0

    return {
      ...category,
      totalLessons,
      completedLessons,
      completionPercentage,
      bestScore,
      hasStarted
    }
  })

  // Calculate overall stats
  const totalCompleted = progress?.filter(p => p.completed).length || 0
  const totalAvailable = lessons?.length || 0
  const overallPercentage = totalAvailable > 0 
    ? Math.round((totalCompleted / totalAvailable) * 100) 
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🎤</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Locuta.ai
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/history"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              History
            </Link>
            <form action="/auth/signout" method="post">
              <button 
                type="submit"
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back! 👋
          </h2>
          <p className="text-slate-600 text-lg">
            Ready to improve your speaking skills today?
          </p>
        </div>

        {/* Overall Progress Card */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">Your Progress</h3>
              <p className="text-purple-100 text-lg">
                {totalCompleted} of {totalAvailable} lessons completed
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold mb-1">{overallPercentage}%</div>
                <div className="text-purple-100">Complete</div>
              </div>
              {recentSessions && recentSessions.length > 0 && (
                <div className="text-center border-l border-purple-400 pl-6">
                  <div className="text-3xl font-bold mb-1">
                    {Math.round(
                      recentSessions.reduce((sum, s) => sum + (s.overall_score || 0), 0) / 
                      recentSessions.length
                    )}
                  </div>
                  <div className="text-purple-100">Avg Score</div>
                </div>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6 bg-white/20 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-white h-full rounded-full transition-all duration-500"
              style={{ width: `${overallPercentage}%` }}
            />
          </div>
        </div>

        {/* Recent Activity */}
        {recentSessions && recentSessions.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Recent Activity</h3>
              <Link 
                href="/history"
                className="text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                View All →
              </Link>
            </div>
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div 
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">
                      {session.category} - Module {session.module_number}, Lesson {session.lesson_number}
                    </div>
                    <div className="text-sm text-slate-600">
                      {new Date(session.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded">
                      {session.tone}
                    </span>
                    <div className="text-2xl font-bold text-purple-600">
                      {session.overall_score}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categories Grid */}
        <div>
          <h3 className="text-2xl font-bold text-slate-900 mb-6">
            Choose Your Practice Category
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryStats.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.id}/tone`}
                className="group"
              >
                <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden">
                  {/* Card Header with Gradient */}
                  <div className={`bg-gradient-to-br ${category.gradient} p-6 text-white`}>
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-5xl">{category.icon}</span>
                      {category.completionPercentage > 0 && (
                        <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold">
                          {category.completionPercentage}%
                        </div>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{category.name}</h3>
                    <p className="text-white/90 text-sm">{category.description}</p>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-2xl font-bold text-slate-900">
                          {category.completedLessons}/{category.totalLessons}
                        </div>
                        <div className="text-xs text-slate-600">Lessons</div>
                      </div>
                      {category.bestScore > 0 && (
                        <div>
                          <div className="text-2xl font-bold text-purple-600">
                            {category.bestScore}
                          </div>
                          <div className="text-xs text-slate-600">Best Score</div>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {category.completionPercentage > 0 && (
                      <div className="mb-4">
                        <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`bg-gradient-to-r ${category.gradient} h-full rounded-full transition-all duration-500`}
                            style={{ width: `${category.completionPercentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <div className={`bg-gradient-to-r ${category.gradient} text-white px-6 py-3 rounded-lg font-semibold text-center group-hover:shadow-lg transition-shadow`}>
                      {category.hasStarted ? 'Continue Learning →' : 'Start Learning →'}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Empty State for New Users */}
        {totalCompleted === 0 && (
          <div className="mt-12 text-center bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-12">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              Ready to Start Your Journey?
            </h3>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Choose any category above to begin practicing. Each lesson takes just 1-2 minutes, 
              and you'll get instant AI feedback to help you improve!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}