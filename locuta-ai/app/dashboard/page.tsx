import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

/**
 * Minimal inline animated radial chart for % progress (compatible with SSR – doesn't use browser-only APIs)
 */
function AnimatedRadialProgress({ percentage, size = 72, color = "#8b5cf6", bg = "#e9e9f3" }: { percentage: number, size?: number, color?: string, bg?: string }) {
  const radius = (size - 8) / 2
  const circ = 2 * Math.PI * radius
  const progress = Math.max(0, Math.min(1, percentage / 100))
  return (
    <svg width={size} height={size} className="overflow-visible">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={bg}
        strokeWidth={8}
        opacity={0.3}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - progress)}
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0.2, 0.2, 1)' }}
      />
      <text
        x="50%" y="54%"
        textAnchor="middle"
        alignmentBaseline="middle"
        fontSize={size * 0.34}
        fontWeight="bold"
        className="fill-slate-900"
        style={{
          fontFamily: 'inherit',
          transition: 'fill 0.2s'
        }}
      >
        {percentage}%
      </text>
    </svg>
  )
}

const sidebarLinks = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg width={21} height={21} fill="none" stroke="currentColor" className="w-6 h-6" strokeWidth="1.5" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
      </svg>
    )
  },
  {
    name: 'Practice History',
    href: '/history',
    icon: (
      <svg width={21} height={21} fill="none" stroke="currentColor" className="w-6 h-6" strokeWidth="1.5" viewBox="0 0 24 24">
        <path d="M12 8v5l3 3" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="12" r="9" />
      </svg>
    )
  },
]

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
      id: 'pitch-anything',
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

  // Avg Score calculation
  const avgScore = recentSessions && recentSessions.length > 0
    ? Math.round(
        recentSessions.reduce((sum, s) => sum + (s.overall_score || 0), 0) /
        recentSessions.length
      )
    : 0

  return (
    <div className="min-h-screen w-full bg-gradient-to-tr from-[#edf2f7] to-[#f7f9fb] flex">
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex flex-col justify-between h-screen w-[82px] lg:w-64 sticky top-0 left-0 bg-white/40 dark:bg-slate-900/50 backdrop-blur-xl border-r border-slate-200 z-20 transition-all shadow-lg pb-4">
        <div>
          <div className="px-0 py-7 flex flex-col items-center lg:flex-row lg:items-center lg:space-x-3">
            <div className="w-11 h-11 flex items-center justify-center rounded-xl shadow-lg">
              <img src="/Icon.png" alt="Locuta.ai" className="w-full h-full object-contain" />
            </div>
            <span className="ml-0 lg:ml-2 mt-2 lg:mt-0 text-xl font-bold text-slate-900 hidden lg:inline-block select-none">Locuta.ai</span>
          </div>
          <nav className="mt-2">
            <ul className="flex flex-col gap-1">
              {sidebarLinks.map(link => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    prefetch={false}
                    className="flex lg:px-6 px-0 py-2 mb-0 items-center group hover:bg-white/30 hover:backdrop-blur-md relative rounded-lg transition-all duration-200"
                  >
                    <span className="w-12 h-12 flex items-center justify-center">
                      <span className="text-slate-700 group-hover:text-indigo-600 transition-all">{link.icon}</span>
                    </span>
                    <span className="hidden lg:inline-block text-base text-slate-700 group-hover:text-indigo-700 font-semibold truncate">{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        {/* Sign out at bottom */}
        <div className="mb-2 flex flex-col items-center">
          <form action="/auth/signout" method="post" className="w-full flex justify-center">
            <button 
              type="submit"
              className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md hover:shadow-xl hover:scale-[1.03] transition-all"
            >
              <svg width="20" height="20" fill="none" className="inline mr-1" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M13 16l4-4m0 0l-4-4m4 4H7" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span className="hidden lg:inline">Sign Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content - glassmorphism container */}
      <div className="flex-1 min-h-screen flex flex-col">
        {/* Header bar for mobile/small screens */}
        <header className="md:hidden flex items-center justify-between bg-white/70 backdrop-blur-xl border-b border-slate-200 px-4 py-4 shadow-sm z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center">
              <img src="/Icon.png" alt="Locuta.ai" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Locuta.ai
            </h1>
          </div>
          <Link
            href="/history"
            className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors font-medium"
          >
            <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5"><circle cx="12" cy="12" r="9" strokeWidth="1.7" /><path d="M12 8v5l3 3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"/></svg>
            History
          </Link>
        </header>
        {/* Actual content */}
        <main className="w-full flex-1 md:px-0 px-1 py-8 bg-transparent flex flex-col items-center">
          {/* Glassmorphic card for everything */}
          <div className="w-full max-w-7xl mx-auto rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl shadow-2xl px-4 sm:px-8 py-10 mt-2 mb-8 border border-slate-100">
            {/* Welcome */}
            <div className="mb-8">
              <h2 className="text-4xl md:text-3xl font-bold text-slate-900/90 mb-2">Welcome back! <span className="">👋</span></h2>
              <p className="text-slate-600 text-lg">Ready to improve your speaking skills today?</p>
            </div>

            {/* Modern Stat Cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10">
              {/* Progress circle */}
              <div className="p-4 md:p-5 rounded-xl md:rounded-2xl glass-card bg-white/70 backdrop-blur-lg border border-white/40 shadow-xl flex items-center gap-4 hover:scale-[1.01] transition-transform duration-200">
                <AnimatedRadialProgress percentage={overallPercentage} size={88} color="#8b5cf6" />
                <div>
                  <div className="text-lg font-bold text-slate-800">Your Progress</div>
                  <div className="text-slate-500">{totalCompleted} / {totalAvailable} lessons complete</div>
                </div>
              </div>
              {/* Avg Score */}
              <div className="p-4 md:p-5 rounded-xl md:rounded-2xl glass-card bg-white/70 backdrop-blur-lg border border-white/40 shadow-xl flex items-center gap-4 hover:scale-[1.01] transition-transform duration-200">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-100 to-pink-200 animate-pulse" />
                <div>
                  <div className="text-lg font-bold text-slate-800">Recent Avg Score</div>
                  <div className="text-slate-500">{recentSessions && recentSessions.length > 0 ? avgScore : '-'}</div>
                </div>
              </div>
              {/* Next to do */}
              <div className="p-4 md:p-5 rounded-xl md:rounded-2xl glass-card bg-white/70 border border-white/40 shadow-xl flex items-center gap-4 hover:scale-[1.01] transition-transform duration-200">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-100 to-emerald-100 animate-pulse" />
                <div>
                  <div className="text-lg font-bold text-slate-800">Categories Started</div>
                  <div className="text-slate-500">{categoryStats.filter(c => c.hasStarted).length} / {categoryStats.length}</div>
                </div>
              </div>
            </section>

            {/* Recent Activity */}
            {recentSessions && recentSessions.length > 0 && (
              <section className="bg-white/90 dark:bg-slate-900/50 rounded-2xl shadow-xl px-6 py-6 mb-10 border border-slate-100/70 glass-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-1 items-center">
                    <svg className="w-6 h-6 text-indigo-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth="2" /><path d="M12 8v5l3 3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
                  </div>
                  <Link 
                    href="/history"
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                  >
                    View All →
                  </Link>
                </div>
                <div className="divide-y divide-slate-200/60">
                  {recentSessions.map((session) => (
                    <div 
                      key={session.id}
                      className="flex items-center justify-between py-3 px-0 hover:bg-indigo-50/50 rounded-xl group transition"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate">
                          {session.category} - Module {session.module_number}, Lesson {session.level_number}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(session.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {session.tone}
                        </span>
                        <div className="text-xl font-bold text-purple-600">
                          {session.overall_score}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Categories Grid */}
            <section>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                Choose Your Practice Category
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryStats.map((category) => (
                  <Link
                    key={category.id}
                    href={`/category/${category.id}/tone`}
                    className="group focus:outline-none"
                  >
                    {/* Glassmorphic Card */}
                    <div className="relative bg-white/70 dark:bg-slate-900/60 border border-white/30 shadow-xl rounded-xl md:rounded-2xl hover:shadow-2xl group-hover:scale-[1.02] active:scale-[1.01] transition-all duration-200 overflow-hidden glass-card backdrop-blur-xl"
                      style={{
                        boxShadow:
                          `0 4px 24px -3px ${category.gradient.includes('purple') ? 'rgba(139,92,246,0.13)' : 'rgba(0,0,0,0.07)'}`
                      }}
                    >
                      {/* HEADER */}
                      <div className={`bg-gradient-to-br ${category.gradient} p-5 md:p-6 text-white`}>
                        <div className="flex items-start justify-between mb-2 md:mb-4">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-white/20 animate-pulse" />
                          {category.completionPercentage > 0 && (
                            <div className="bg-white/20/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold">
                              {category.completionPercentage}%
                            </div>
                          )}
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 drop-shadow-md">{category.name}</h3>
                        <p className="text-white/90 text-xs md:text-sm">{category.description}</p>
                      </div>
                      {/* Body */}
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex flex-col items-center">
                            <span className="text-2xl font-bold text-slate-900">
                              {category.completedLessons}/{category.totalLessons}
                            </span>
                            <span className="text-xs text-slate-600">Lessons</span>
                          </div>
                          {category.bestScore > 0 && (
                            <div className="flex flex-col items-center">
                              <span className="text-2xl font-bold text-purple-600">
                                {category.bestScore}
                              </span>
                              <span className="text-xs text-slate-600">Best Score</span>
                            </div>
                          )}
                        </div>
                        {/* Progress Bar */}
                        <div className="flex items-center">
                          <div className="flex-1 h-2 bg-slate-200/70 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${category.gradient} transition-all duration-700 rounded-full`}
                              style={{ width: `${category.completionPercentage}%` }}
                            />
                          </div>
                        </div>
                        {/* Action Button */}
                        <div className="mt-6">
                          <div className={`w-full bg-gradient-to-r ${category.gradient} text-white px-6 py-3 rounded-lg font-semibold text-center group-hover:shadow-lg group-hover:-translate-y-0.5 transition-all`}>
                            {category.hasStarted ? 'Continue Learning →' : 'Start Learning →'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Empty State for New Users */}
            {totalCompleted === 0 && (
              <div className="mt-12 text-center bg-gradient-to-br from-purple-50/80 to-indigo-50/75 rounded-2xl p-12 glass-card shadow-lg border border-white/60 backdrop-blur">
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
        </main>
      </div>
      <style>
        {`
        .glass-card {
          /* fallback for Safari (no backdrop-blur on background-clip:padding-box) */
          background-clip: padding-box !important;
          box-shadow:0 4px 28px 0 rgba(51,57,83,0.09), 0 1.5px 5px 0 rgba(80,70,232,0.05);
        }
        `}
      </style>
    </div>
  )
}