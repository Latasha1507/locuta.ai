'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { isAdminClient } from '@/lib/admin-client'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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
  browserStats: { name: string; value: number; color: string }[]
  locationStats: { country: string; count: number; lat: number; lng: number }[]
  userGrowth: { date: string; users: number }[]
  sessionTrends: { date: string; sessions: number }[]
  revenueTrends: { month: string; revenue: number }[]
  engagementMetrics: {
    dailyActiveUsers: number
    weeklyActiveUsers: number
    monthlyActiveUsers: number
    avgSessionsPerUser: number
    returnRate: number
  }
}

const COLORS = {
  chrome: '#4285F4',
  firefox: '#FF7139',
  safari: '#00C2FF',
  edge: '#0078D7',
  other: '#9CA3AF'
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
    revenueTrends: [],
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
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  timeRange === '7d'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  timeRange === '30d'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setTimeRange('90d')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  timeRange === '90d'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                90 Days
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics Row 1 */}
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
              <span className="text-xs text-slate-500">{stats.activeUsers} active users</span>
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

        {/* Charts Row 1: User Growth & Session Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">User Growth Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.userGrowth}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="users" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Session Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.sessionTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sessions" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2: Revenue & Browser Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Revenue Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.revenueTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Browser Usage Distribution</h3>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.browserStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.browserStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Geographic Distribution with Map */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Geographic Distribution</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Map Placeholder */}
            <div className="relative bg-slate-50 rounded-lg p-4 h-80 flex items-center justify-center border-2 border-dashed border-slate-300">
              <div className="text-center">
                <div className="text-6xl mb-4">🗺️</div>
                <p className="text-slate-600 font-medium">Interactive Map</p>
                <p className="text-sm text-slate-500 mt-2">World map visualization coming soon</p>
                <p className="text-xs text-slate-400 mt-1">Requires react-simple-maps integration</p>
              </div>
            </div>

            {/* Location Stats */}
            <div className="space-y-3">
              {stats.locationStats.map((location, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-lg">🌍</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{location.country}</p>
                      <p className="text-xs text-slate-500">{location.count} users</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">{location.count}</p>
                    <p className="text-xs text-slate-500">
                      {stats.totalUsers > 0 ? Math.round((location.count / stats.totalUsers) * 100) : 0}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-3xl font-bold text-purple-900">{stats.totalCompleted}</p>
              <p className="text-sm text-purple-700 mt-2">Lessons Completed</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
              <div className="text-4xl mb-2">⭐</div>
              <p className="text-3xl font-bold text-blue-900">{Math.round(stats.avgScore)}</p>
              <p className="text-sm text-blue-700 mt-2">Average Score</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
              <div className="text-4xl mb-2">📈</div>
              <p className="text-3xl font-bold text-green-900">
                {stats.totalSessions > 0 ? Math.round((stats.totalCompleted / stats.totalSessions) * 100) : 0}%
              </p>
              <p className="text-sm text-green-700 mt-2">Completion Rate</p>
            </div>
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