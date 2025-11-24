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
  payingUsers: number
  totalRevenue: number
  monthlyRevenue: number
  browserStats: { [key: string]: number }
  locationStats: { country: string; count: number }[]
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalSessions: 0,
    totalCompleted: 0,
    avgScore: 0,
    avgSessionTime: 0,
    payingUsers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    browserStats: {},
    locationStats: []
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
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/analytics')
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
          <div className="text-6xl mb-4 animate-pulse">🔐</div>
          <p className="text-slate-600">Verifying admin access...</p>
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
            <img src="/Icon.png" alt="Locuta.ai" className="w-10 h-10" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-600">Total Users</h3>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
                👥
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.totalUsers}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-slate-500">{stats.activeUsers} active</span>
              <span className="text-xs text-green-600 font-semibold">({activeRate}%)</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-600">Total Sessions</h3>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                🎯
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.totalSessions}</p>
            <p className="text-xs text-slate-500 mt-2">Avg: {stats.avgSessionTime} min/session</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-600">Paying Users</h3>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
                💳
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.payingUsers}</p>
            <p className="text-xs text-slate-500 mt-2">Conversion: {conversionRate}%</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-600">Total Revenue</h3>
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-2xl">
                💰
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">${stats.totalRevenue}</p>
            <p className="text-xs text-slate-500 mt-2">This month: ${stats.monthlyRevenue}</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Browser Usage</h3>
            <div className="space-y-3">
              {Object.entries(stats.browserStats).length > 0 ? (
                Object.entries(stats.browserStats).map(([browser, count]) => {
                  const percentage = stats.totalSessions > 0 ? Math.round((count / stats.totalSessions) * 100) : 0
                  return (
                    <div key={browser}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{browser}</span>
                        <span className="text-sm text-slate-600">{percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-700"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-slate-500 text-sm">No browser data yet</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-600">Lessons Completed</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalCompleted}</p>
                </div>
                <div className="text-3xl">✅</div>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-600">Average Score</p>
                  <p className="text-2xl font-bold text-slate-900">{Math.round(stats.avgScore)}</p>
                </div>
                <div className="text-3xl">⭐</div>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.locationStats.slice(0, 8).map((location) => (
              <div key={location.country} className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm font-semibold text-slate-700">{location.country}</p>
                <p className="text-2xl font-bold text-purple-600">{location.count}</p>
                <p className="text-xs text-slate-500">users</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link href="/dashboard" className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-all">
              <div className="text-2xl mb-2">🎓</div>
              <h3 className="font-bold text-slate-900 mb-1">Test Lessons</h3>
              <p className="text-sm text-slate-600">Unrestricted access</p>
            </Link>

            <Link href="/admin/import" className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-all">
              <div className="text-2xl mb-2">📁</div>
              <h3 className="font-bold text-slate-900 mb-1">Import Lessons</h3>
              <p className="text-sm text-slate-600">Upload CSV files</p>
            </Link>

            <a href="https://mixpanel.com" target="_blank" rel="noopener noreferrer" className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 hover:border-green-400 transition-all">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-bold text-slate-900 mb-1">Mixpanel</h3>
              <p className="text-sm text-slate-600">Event analytics</p>
            </a>

            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200 hover:border-indigo-400 transition-all">
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