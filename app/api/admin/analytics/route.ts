import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || !user.user_metadata?.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get all data
    const { data: sessions } = await supabase.from('sessions').select('*')
    const { data: progress } = await supabase.from('user_progress').select('*')
    const { data: profiles } = await supabase.from('profiles').select('*')

    // Calculate metrics
    const totalUsers = profiles?.length || 0
    const activeUsers = profiles?.filter(p => {
      const lastActive = new Date(p.updated_at || p.created_at)
      const daysSince = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
      return daysSince <= 30
    }).length || 0

    const totalSessions = sessions?.length || 0
    const totalCompleted = progress?.filter(p => p.completed).length || 0
    const avgScore = sessions?.length 
      ? sessions.reduce((acc, s) => acc + (s.feedback?.overall_score || 0), 0) / sessions.length
      : 0

    // Session time (estimate 2.5 min per session)
    const avgSessionTime = 2.5

    // Paying users (mock data - replace with actual subscription data)
    const payingUsers = 0
    const totalRevenue = 0
    const monthlyRevenue = 0

    // Browser stats
    const browserStats: { [key: string]: number } = {}
    sessions?.forEach(s => {
      const browser = 'Chrome' // Parse from user agent in production
      browserStats[browser] = (browserStats[browser] || 0) + 1
    })

    // Location stats (mock data - add actual location tracking)
    const locationStats = [
      { country: 'United States', count: Math.floor(totalUsers * 0.4) },
      { country: 'India', count: Math.floor(totalUsers * 0.3) },
      { country: 'United Kingdom', count: Math.floor(totalUsers * 0.15) },
      { country: 'Canada', count: Math.floor(totalUsers * 0.1) },
      { country: 'Others', count: Math.floor(totalUsers * 0.05) },
    ]

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalSessions,
      totalCompleted,
      avgScore,
      avgSessionTime,
      payingUsers,
      totalRevenue,
      monthlyRevenue,
      browserStats,
      locationStats,
      recentSessions: sessions?.slice(0, 10) || []
    })
  } catch (error) {
    console.error('Admin analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}