import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || !user.user_metadata?.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    // Get stats
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')

    const { data: progress } = await supabase
      .from('user_progress')
      .select('*')

    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    const totalUsers = userCount || 0
    const totalSessions = sessions?.length || 0
    const totalCompleted = progress?.filter((p: { completed: boolean }) => p.completed).length || 0
    const avgScore = sessions?.length 
      ? sessions.reduce((acc: number, s: { feedback?: { overall_score?: number } }) => acc + (s.feedback?.overall_score || 0), 0) / sessions.length
      : 0

    return NextResponse.json({
      totalUsers,
      totalSessions,
      totalCompleted,
      avgScore
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}