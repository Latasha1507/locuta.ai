'use client';

import { createClient } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Mixpanel from '@/lib/mixpanel';
import { useEffect, useState } from 'react';
import CategoryCardTracking from '@/components/CategoryCardTracking';
import { isAdminClient } from '@/lib/admin-client';

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

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        window.location.href = '/auth/login';
        return;
      }

      setUser(user);
      
      // Check admin status
      const adminStatus = await isAdminClient();
      setIsUserAdmin(adminStatus);
      
      // Identify user in Mixpanel
      Mixpanel.identify(user.id);
      
      // Set user properties
      Mixpanel.people.set({
        $email: user.email,
        $name: user.user_metadata?.full_name || user.email,
        'Sign up date': user.created_at,
        'Last login': new Date().toISOString(),
      });

      // Track login event
      Mixpanel.track('User Logged In', {
        method: 'google',
      });

      // Fetch user's progress
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id);
      setProgress(progressData || []);

      // FIRST-TIME USER TRACKING
      const completedCount = progressData?.filter((p: any) => p.completed).length || 0;
      const isFirstTime = completedCount === 0;
    
      if (isFirstTime) {
        Mixpanel.people.setOnce({
          'First Time User': true,
          'First Login Date': new Date().toISOString()
        });
        
        const signupTime = new Date(user.created_at).getTime();
        const timeFromSignup = Date.now() - signupTime;
        
        Mixpanel.track('First Time Dashboard Visit', {
          time_from_signup_minutes: Math.round(timeFromSignup / 1000 / 60),
          time_from_signup_hours: Math.round(timeFromSignup / 1000 / 60 / 60)
        });
      } else {
        Mixpanel.people.set({
          'First Time User': false,
          'Total Lessons Completed': completedCount
        });
      }

      // Fetch total lesson counts per category
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('category, module_number, level_number');
      setLessons(lessonsData || []);

      // Fetch all sessions
      const { data: allSessionsData } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setAllSessions(allSessionsData || []);

      // Fetch recent sessions
      const { data: recentSessionsData } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentSessions(recentSessionsData || []);
      
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  // Calculate progress per category
  const categories = [
    {
      id: 'public-speaking',
      name: 'Public Speaking',
      description: 'Master presentations, speeches, and public events',
      icon: '🎤'
    },
    {
      id: 'storytelling',
      name: 'Storytelling',
      description: 'Craft compelling narratives that captivate audiences',
      icon: '📖'
    },
    {
      id: 'creator-speaking',
      name: 'Creator Speaking',
      description: 'Engage with your audience through video content',
      icon: '🎥'
    },
    {
      id: 'casual-conversation',
      name: 'Casual Conversation',
      description: 'Build confidence in everyday social interactions',
      icon: '💬'
    },
    {
      id: 'workplace-communication',
      name: 'Workplace Communication',
      description: 'Excel in meetings, presentations, and team discussions',
      icon: '💼'
    },
    {
      id: 'pitch-anything',
      name: 'Pitch Anything',
      description: 'Master the art of persuasive pitching in any context',
      icon: '💰'
    }
  ]

  // Calculate stats for each category
  const categoryStats = categories.map(category => {
    const categoryLessons = lessons?.filter((l: any) => 
      l.category.toLowerCase().replace(/\s+/g, '-') === category.id
    ) || []
    
    const totalLessons = categoryLessons.length
    
    const categoryProgress = progress?.filter((p: any) => 
      p.category.toLowerCase().replace(/\s+/g, '-') === category.id
    ) || []
    
    const completedLessons = categoryProgress.filter((p: any) => p.completed).length
    const completionPercentage = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100) 
      : 0
    
    const bestScore = categoryProgress.length > 0
      ? Math.max(...categoryProgress.map((p: any) => p.best_score || 0))
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
  const totalCompleted = progress?.filter((p: any) => p.completed).length || 0
  const totalAvailable = lessons?.length || 0
  const overallPercentage = totalAvailable > 0 
    ? Math.round((totalCompleted / totalAvailable) * 100) 
    : 0

  // Calculate Current Streak
  const calculateStreak = () => {
    if (!allSessions || allSessions.length === 0) return 0
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const sessionDates = new Set(
      allSessions.map((s: any) => {
        const date = new Date(s.created_at)
        date.setHours(0, 0, 0, 0)
        return date.getTime()
      })
    )
    
    let streak = 0
    let currentDate = new Date(today)
    
    while (sessionDates.has(currentDate.getTime())) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    }
    
    return streak
  }

  // Calculate This Week's Activity
  const calculateWeeklyActivity = () => {
    if (!allSessions) return { completed: 0, goal: 7, percentage: 0 }
    
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    
    const weeklySessions = allSessions.filter((s: any) => {
      const sessionDate = new Date(s.created_at)
      return sessionDate >= startOfWeek
    })
    
    const completed = weeklySessions.length
    const goal = 7
    const percentage = Math.min(100, Math.round((completed / goal) * 100))
    
    return { completed, goal, percentage }
  }

  // Calculate Score Trend
  const calculateScoreTrend = () => {
    if (!recentSessions || recentSessions.length < 2) return { trend: 0, avgRecent: 0, avgPrevious: 0 }
    
    const midPoint = Math.floor(recentSessions.length / 2)
    const recent = recentSessions.slice(0, midPoint)
    const previous = recentSessions.slice(midPoint)
    
    const avgRecent = recent.reduce((sum: number, s: any) => sum + (s.overall_score || 0), 0) / recent.length
    const avgPrevious = previous.reduce((sum: number, s: any) => sum + (s.overall_score || 0), 0) / previous.length
    
    return {
      trend: avgRecent > avgPrevious ? 1 : avgRecent < avgPrevious ? -1 : 0,
      avgRecent: Math.round(avgRecent),
      avgPrevious: Math.round(avgPrevious)
    }
  }

  // Calculate Study Time
  const calculateStudyTime = () => {
    if (!allSessions) return { weekly: 0, monthly: 0 }
    
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    
    const avgMinutesPerSession = 2.5
    
    const weeklySessions = allSessions.filter((s: any) => {
      const sessionDate = new Date(s.created_at)
      return sessionDate >= startOfWeek
    }).length
    
    const monthlySessions = allSessions.filter((s: any) => {
      const sessionDate = new Date(s.created_at)
      return sessionDate >= startOfMonth
    }).length
    
    return {
      weekly: Math.round(weeklySessions * avgMinutesPerSession),
      monthly: Math.round(monthlySessions * avgMinutesPerSession)
    }
  }

  const currentStreak = calculateStreak()
  const weeklyActivity = calculateWeeklyActivity()
  const scoreTrend = calculateScoreTrend()
  const studyTime = calculateStudyTime()

  const avgScore = recentSessions && recentSessions.length > 0
    ? Math.round(
        recentSessions.reduce((sum: number, s: any) => sum + (s.overall_score || 0), 0) /
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
        <div className="mb-2 flex flex-col items-center gap-2">
          {isUserAdmin && (
            <Link 
              href="/admin"
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md hover:shadow-xl hover:scale-[1.03] transition-all"
            >
              <span className="text-lg">🔑</span>
              <span className="hidden lg:inline">Admin</span>
            </Link>
          )}
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

      {/* Main Content */}
      <div className="flex-1 min-h-screen flex flex-col">
        <header className="md:hidden flex items-center justify-between bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border-b border-slate-200/70 px-4 py-4 shadow-lg z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md">
              <img src="/Icon.png" alt="Locuta.ai" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Locuta.ai
              {isUserAdmin && (
                <span className="px-2 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-full animate-pulse">
                  ADMIN
                </span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isUserAdmin && (
              <Link 
                href="/admin"
                className="text-purple-600 hover:text-purple-700 font-semibold text-sm"
              >
                Admin
              </Link>
            )}
            <Link
              href="/history"
              className="flex items-center gap-1 text-slate-700 hover:text-purple-600 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-white/50"
            >
              <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5"><circle cx="12" cy="12" r="9" strokeWidth="1.7" /><path d="M12 8v5l3 3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"/></svg>
              <span className="hidden sm:inline">History</span>
            </Link>
          </div>
        </header>
        
        <main className="w-full flex-1 md:px-0 px-1 py-8 bg-transparent flex flex-col items-center">
          <div className="w-full max-w-7xl mx-auto rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl shadow-2xl px-4 sm:px-8 py-10 mt-2 mb-8 border border-slate-100">
            <div className="mb-8">
              <h2 className="text-4xl md:text-3xl font-bold text-slate-900/90 mb-2 flex items-center gap-2">
                Welcome back! <span className="">👋</span>
                {isUserAdmin && (
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-full animate-pulse">
                    ADMIN
                  </span>
                )}
              </h2>
              <p className="text-slate-600 text-lg">Ready to improve your speaking skills today?</p>
            </div>

            {/* Analytics Cards - Row 1 */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
              <div className="p-4 md:p-5 rounded-xl md:rounded-2xl glass-card bg-white/70 backdrop-blur-lg border border-white/40 shadow-xl flex items-center gap-4 hover:scale-[1.01] transition-transform duration-200">
                <AnimatedRadialProgress percentage={overallPercentage} size={88} color="#8b5cf6" />
                <div>
                  <div className="text-lg font-bold text-slate-800">Your Progress</div>
                  <div className="text-slate-500">{totalCompleted} / {totalAvailable} lessons complete</div>
                </div>
              </div>
              <div className="p-4 md:p-5 rounded-xl md:rounded-2xl glass-card bg-white/70 backdrop-blur-lg border border-white/40 shadow-xl flex items-center gap-4 hover:scale-[1.01] transition-transform duration-200">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
                  <span className="text-2xl">⭐</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-800">Recent Avg Score</div>
                  <div className="text-slate-500">{recentSessions && recentSessions.length > 0 ? avgScore : '-'}</div>
                </div>
              </div>
              <div className="p-4 md:p-5 rounded-xl md:rounded-2xl glass-card bg-white/70 backdrop-blur-lg border border-white/40 shadow-xl flex items-center gap-4 hover:scale-[1.01] transition-transform duration-200">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-100 to-emerald-100 flex items-center justify-center">
                  <span className="text-2xl">📚</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-800">Categories Started</div>
                  <div className="text-slate-500">{categoryStats.filter((c: any) => c.hasStarted).length} / {categoryStats.length}</div>
                </div>
              </div>
              <div className="p-4 md:p-5 rounded-xl md:rounded-2xl glass-card bg-white/70 backdrop-blur-lg border border-white/40 shadow-xl flex items-center gap-4 hover:scale-[1.01] transition-transform duration-200">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-100 to-amber-100 flex items-center justify-center">
                  <span className="text-2xl">🏆</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-800">Best Score</div>
                  <div className="text-slate-500">
                    {progress && progress.length > 0 
                      ? Math.max(...progress.map((p: any) => p.best_score || 0))
                      : '-'
                    }
                  </div>
                </div>
              </div>
            </section>

            {/* Analytics Cards - Row 2 */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
              <div className="p-4 md:p-5 rounded-xl md:rounded-2xl glass-card bg-white/70 backdrop-blur-lg border border-white/40 shadow-xl flex items-center gap-4 hover:scale-[1.01] transition-transform duration-200">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                  <span className="text-2xl">🔥</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-800">Current Streak</div>
                  <div className="text-slate-500">{currentStreak} day{currentStreak !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <div className="p-4 md:p-5 rounded-xl md:rounded-2xl glass-card bg-white/70 backdrop-blur-lg border border-white/40 shadow-xl hover:scale-[1.01] transition-transform duration-200">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-800">This Week's Activity</div>
                    <div className="text-slate-500">{weeklyActivity.completed} / {weeklyActivity.goal} lessons</div>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-200/70 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-700 rounded-full"
                    style={{ width: `${weeklyActivity.percentage}%` }}
                  />
                </div>
              </div>
              <div className="p-4 md:p-5 rounded-xl md:rounded-2xl glass-card bg-white/70 backdrop-blur-lg border border-white/40 shadow-xl flex items-center gap-4 hover:scale-[1.01] transition-transform duration-200">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                  {scoreTrend.trend === 1 ? (
                    <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  ) : scoreTrend.trend === -1 ? (
                    <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  ) : (
                    <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-800">Score Trend</div>
                  <div className="text-slate-500">
                    {scoreTrend.trend === 1 ? 'Improving' : scoreTrend.trend === -1 ? 'Declining' : 'Stable'}
                  </div>
                </div>
              </div>
              <div className="p-4 md:p-5 rounded-xl md:rounded-2xl glass-card bg-white/70 backdrop-blur-lg border border-white/40 shadow-xl flex items-center gap-4 hover:scale-[1.01] transition-transform duration-200">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                  <span className="text-2xl">⏱️</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-800">Study Time</div>
                  <div className="text-slate-500">{studyTime.weekly} min this week</div>
                  <div className="text-xs text-slate-400">{studyTime.monthly} min this month</div>
                </div>
              </div>
            </section>

            {/* Categories Grid */}
            <section>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                Choose Your Practice Category
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryStats.map((category: any) => (
                  <Link
                    key={category.id}
                    href={`/category/${category.id}/tone`}
                    className="group focus:outline-none"
                  >
                    <div className="relative bg-white/80 backdrop-blur-xl border-2 border-purple-200/40 hover:border-indigo-300/60 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group-hover:scale-[1.02] category-card">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 via-transparent to-indigo-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="relative p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100/80 to-indigo-100/80 backdrop-blur-sm flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 icon-container">
                            <span className="text-3xl category-icon">{category.icon}</span>
                          </div>
                          {category.completionPercentage > 0 && (
                            <div className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-purple-200/50 text-sm font-bold text-purple-700 shadow-sm">
                              {category.completionPercentage}%
                            </div>
                          )}
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-purple-700 transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                          {category.description}
                        </p>

                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-purple-100/60 flex items-center justify-center">
                              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Lessons</div>
                              <div className="text-sm font-bold text-slate-900">{category.completedLessons}/{category.totalLessons}</div>
                            </div>
                          </div>
                          
                          {category.bestScore > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-indigo-100/60 flex items-center justify-center">
                                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                              </div>
                              <div>
                                <div className="text-xs text-slate-500">Best</div>
                                <div className="text-sm font-bold text-slate-900">{category.bestScore}</div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mb-4">
                          <div className="w-full h-2 bg-slate-200/70 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-700"
                              style={{ width: `${category.completionPercentage}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm font-semibold">
                          <span className="text-purple-700 group-hover:text-indigo-700 transition-colors">
                            {category.hasStarted ? 'Continue Learning' : 'Start Learning'}
                          </span>
                          <svg className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {totalCompleted === 0 && (
              <div className="mt-12 text-center bg-white/70 backdrop-blur-xl border-2 border-purple-200/40 rounded-2xl p-12 glass-card shadow-lg">
                <div className="inline-block mb-4 sparkle-icon">
                  <svg className="w-16 h-16 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  Ready to Start Your Journey?
                </h3>
                <p className="text-slate-600 text-lg max-w-2xl mx-auto leading-relaxed">
                  Choose any category above to begin practicing. Each lesson takes just 1-2 minutes, 
                  and you'll get instant AI feedback to help you improve!
                </p>
              </div>
            )}
          </div>
        </main>
        
        <footer className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border-t border-slate-200/70 py-6 mt-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-slate-900">
                  Locuta.ai
                </span>
              </div>
              <p className="text-slate-600 text-sm">
                © 2025 Locuta.ai. Elevate your voice.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}