'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { isAdminClient } from '@/lib/admin-client'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalSessions: number
  totalCompleted: number
  avgScore: number
  avgSessionTime: number
  avgTimeOnPlatform: number
  payingUsers: number
  totalRevenue: number
  monthlyRevenue: number
  browserStats: { name: string; value: number; percentage: number; color: string }[]
  locationStats: { country: string; count: number; percentage: number }[]
  userGrowth: { date: string; users: number; growth: number }[]
  sessionTrends: { date: string; sessions: number }[]
  engagementMetrics: {
    dailyActiveUsers: number
    weeklyActiveUsers: number
    monthlyActiveUsers: number
    avgSessionsPerUser: number
    returnRate: number
  }
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalSessions: 0,
    totalCompleted: 0,
    avgScore: 0,
    avgSessionTime: 0,
    avgTimeOnPlatform: 0,
    payingUsers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    browserStats: [],
    locationStats: [],
    userGrowth: [],
    sessionTrends: [],
    engagementMetrics: {
      dailyActiveUsers: 0,
      weeklyActiveUsers: 0,
      monthlyActiveUsers: 0,
      avgSessionsPerUser: 0,
      returnRate: 0
    }
  })

  useEffect(() => {
    const checkAdmin = async () => {
      const adminStatus = await isAdminClient()
      if (!adminStatus) {
        window.location.href = '/dashboard'
        return
      }
      setIsAdmin(adminStatus)
      setLoading(false)
      fetchStats()
    }
    checkAdmin()
  }, [timeRange])

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/admin/analytics?range=${timeRange}`)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">📊</div>
          <p className="text-slate-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) return null

  const activeRate = stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0
  const conversionRate = stats.totalUsers > 0 ? Math.round((stats.payingUsers / stats.totalUsers) * 100) : 0
  const maxGrowth = Math.max(...stats.userGrowth.map(d => d.users), 1)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
                ← Back to Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  Admin Analytics
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-full">
                    ADMIN
                  </span>
                </h1>
                <p className="text-sm text-slate-600">Real-time business metrics</p>
              </div>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex items-center gap-2">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    timeRange === range
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Users</p>
                <p className="text-3xl font-bold text-slate-900">{stats.totalUsers}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded">
                ↑ {activeRate}% active
              </span>
              <span className="text-xs text-slate-500">{stats.activeUsers} active</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Sessions</p>
                <p className="text-3xl font-bold text-slate-900">{stats.totalSessions}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Avg: {stats.avgSessionTime} min per session
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-slate-600 font-medium">Avg Time on Platform</p>
                <p className="text-3xl font-bold text-slate-900">{stats.avgTimeOnPlatform}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⏱️</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">minutes per user</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-slate-900">${stats.totalRevenue}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              ${stats.monthlyRevenue} this month • {conversionRate}% conversion
            </p>
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
            <p className="text-xs text-purple-700 font-semibold mb-1">DAU</p>
            <p className="text-2xl font-bold text-purple-900">{stats.engagementMetrics.dailyActiveUsers}</p>
            <p className="text-xs text-purple-600 mt-1">Daily Active Users</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <p className="text-xs text-blue-700 font-semibold mb-1">WAU</p>
            <p className="text-2xl font-bold text-blue-900">{stats.engagementMetrics.weeklyActiveUsers}</p>
            <p className="text-xs text-blue-600 mt-1">Weekly Active Users</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
            <p className="text-xs text-green-700 font-semibold mb-1">MAU</p>
            <p className="text-2xl font-bold text-green-900">{stats.engagementMetrics.monthlyActiveUsers}</p>
            <p className="text-xs text-green-600 mt-1">Monthly Active Users</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
            <p className="text-xs text-orange-700 font-semibold mb-1">Sessions/User</p>
            <p className="text-2xl font-bold text-orange-900">{stats.engagementMetrics.avgSessionsPerUser}</p>
            <p className="text-xs text-orange-600 mt-1">Average per user</p>
          </div>
          <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 border border-pink-200">
            <p className="text-xs text-pink-700 font-semibold mb-1">Return Rate</p>
            <p className="text-2xl font-bold text-pink-900">{stats.engagementMetrics.returnRate}%</p>
            <p className="text-xs text-pink-600 mt-1">User retention</p>
          </div>
        </div>

        {/* User Growth Chart (CSS Bar Chart) */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">User Growth Trend</h3>
          <div className="h-64 flex items-end gap-2">
            {stats.userGrowth.slice(-14).map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-lg transition-all hover:from-purple-700 hover:to-purple-500 relative group"
                     style={{ height: `${(data.users / maxGrowth) * 100}%`, minHeight: '4px' }}>
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {data.users} users
                  </div>
                </div>
                <span className="text-xs text-slate-500 transform -rotate-45 origin-top-left">{data.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Browser Stats & Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Browser Usage */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Browser Usage</h3>
            <div className="space-y-4">
              {stats.browserStats.map((browser, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: browser.color }}></div>
                      {browser.name}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{browser.percentage}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ 
                        width: `${browser.percentage}%`,
                        backgroundColor: browser.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-600">Lessons Completed</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalCompleted}</p>
                </div>
                <div className="text-3xl">✅</div>
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-600">Average Score</p>
                  <p className="text-2xl font-bold text-slate-900">{Math.round(stats.avgScore)}</p>
                </div>
                <div className="text-3xl">⭐</div>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-600">Completion Rate</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.totalSessions > 0 ? Math.round((stats.totalCompleted / stats.totalSessions) * 100) : 0}%
                  </p>
                </div>
                <div className="text-3xl">📈</div>
              </div>
            </div>
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Geographic Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.locationStats.map((location, index) => (
              <div key={index} className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🌍</span>
                  <p className="text-xs font-semibold text-slate-700">{location.country}</p>
                </div>
                <p className="text-2xl font-bold text-purple-600">{location.count}</p>
                <p className="text-xs text-slate-500">{location.percentage}% of users</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link href="/dashboard" className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border-2 border-purple-200 hover:border-purple-400 hover:shadow-xl transition-all">
              <div className="text-2xl mb-2">🎓</div>
              <h3 className="font-bold text-slate-900 mb-1">Test Lessons</h3>
              <p className="text-sm text-slate-600">Unrestricted access</p>
            </Link>

            <Link href="/admin/import" className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl transition-all">
              <div className="text-2xl mb-2">📁</div>
              <h3 className="font-bold text-slate-900 mb-1">Import Lessons</h3>
              <p className="text-sm text-slate-600">Upload CSV files</p>
            </Link>

            <a href="https://mixpanel.com" target="_blank" rel="noopener noreferrer" className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 hover:border-green-400 hover:shadow-xl transition-all">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-bold text-slate-900 mb-1">Mixpanel</h3>
              <p className="text-sm text-slate-600">Event analytics</p>
            </a>

            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200 hover:border-indigo-400 hover:shadow-xl transition-all">
              <div className="text-2xl mb-2">🗄️</div>
              <h3 className="font-bold text-slate-900 mb-1">Database</h3>
              <p className="text-sm text-slate-600">Supabase admin</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}