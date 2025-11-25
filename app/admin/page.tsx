'use client'

import { useState, useEffect, useRef } from 'react'
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
  deviceStats: { name: string; value: number; percentage: number }[]
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

// Country coordinates for map
const countryCoords: { [key: string]: [number, number] } = {
  'United States': [37.0902, -95.7129],
  'USA': [37.0902, -95.7129],
  'US': [37.0902, -95.7129],
  'India': [20.5937, 78.9629],
  'IN': [20.5937, 78.9629],
  'United Kingdom': [55.3781, -3.4360],
  'UK': [55.3781, -3.4360],
  'GB': [55.3781, -3.4360],
  'Canada': [56.1304, -106.3468],
  'CA': [56.1304, -106.3468],
  'Australia': [-25.2744, 133.7751],
  'AU': [-25.2744, 133.7751],
  'Germany': [51.1657, 10.4515],
  'DE': [51.1657, 10.4515],
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  
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
    deviceStats: [],
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

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current || !stats.locationStats.length) return

    const initMap = async () => {
      const L = (await import('leaflet')).default
      try {
        // Dynamically inject leaflet.css ONLY if it does not yet exist
        if (!document.querySelector('link[data-leaflet-css]')) {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = 'https://unpkg.com/leaflet/dist/leaflet.css'
          link.setAttribute('data-leaflet-css', 'true')
          document.head.appendChild(link)
        }
      } catch (e) {
        // Fallback or warning
        console.warn("Leaflet CSS could not be loaded.", e)
      }

      mapInstance.current = L.map(mapRef.current!).setView([20, 0], 2)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(mapInstance.current)

      stats.locationStats.forEach(location => {
        const coords = countryCoords[location.country]
        if (coords && mapInstance.current) {
          const markerSize = Math.max(15, Math.min(location.count * 5, 50))
          const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="
              background: linear-gradient(135deg, #8b5cf6, #6366f1);
              width: ${markerSize}px;
              height: ${markerSize}px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 4px 12px rgba(139, 92, 246, 0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: ${markerSize > 30 ? '14px' : '10px'};
            ">${location.count}</div>`,
            iconSize: [markerSize, markerSize],
          })

          L.marker([coords[0], coords[1]], { icon: customIcon })
            .bindPopup(`
              <div style="padding: 8px;">
                <strong style="font-size: 14px;">${location.country}</strong><br/>
                <span style="font-size: 16px; font-weight: bold; color: #8b5cf6;">${location.count}</span> 
                <span style="font-size: 12px;">users (${location.percentage}%)</span>
              </div>
            `)
            .addTo(mapInstance.current)
        }
      })
    }

    initMap()

    return () => {
      mapInstance.current?.remove()
      mapInstance.current = null
    }
  }, [stats.locationStats])

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

        {/* User Growth Chart */}
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

        {/* Browser & Device Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Browser Usage */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Browser Usage</h3>
            <div className="space-y-4">
              {stats.browserStats.length > 0 ? (
                stats.browserStats.map((browser, index) => (
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
                ))
              ) : (
                <p className="text-slate-500 text-sm">No data yet</p>
              )}
            </div>
          </div>

          {/* Device Usage */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Device Usage</h3>
            <div className="space-y-4">
              {stats.deviceStats.length > 0 ? (
                stats.deviceStats.map((device, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <span className="text-xl">{device.name === 'Mobile' ? '📱' : device.name === 'Desktop' ? '💻' : '📟'}</span>
                        {device.name}
                      </span>
                      <span className="text-sm font-bold text-slate-900">{device.percentage}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-700"
                        style={{ width: `${device.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-sm">No data yet</p>
              )}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Performance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-600">Lessons Completed</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalCompleted}</p>
                </div>
                <div className="text-2xl">✅</div>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-600">Average Score</p>
                  <p className="text-2xl font-bold text-slate-900">{Math.round(stats.avgScore)}</p>
                </div>
                <div className="text-2xl">⭐</div>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-600">Completion Rate</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.totalSessions > 0 ? Math.round((stats.totalCompleted / stats.totalSessions) * 100) : 0}%
                  </p>
                </div>
                <div className="text-2xl">📈</div>
              </div>
            </div>
          </div>
        </div>

        {/* Geographic Distribution with Interactive Map */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Geographic Distribution</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interactive Map */}
            <div className="h-96 rounded-lg overflow-hidden border border-slate-200">
              {stats.locationStats.length > 0 ? (
                <div ref={mapRef} className="w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-50">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🗺️</div>
                    <p className="text-slate-600 font-medium">No location data yet</p>
                    <p className="text-sm text-slate-500 mt-2">Complete lessons to see user locations</p>
                  </div>
                </div>
              )}
            </div>

            {/* Location Stats */}
            <div className="space-y-3 overflow-y-auto max-h-96">
              {stats.locationStats.length > 0 ? (
                stats.locationStats.map((location, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-lg">🌍</span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{location.country}</p>
                        <p className="text-xs text-slate-500">{location.percentage}% of users</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">{location.count}</p>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-sm text-center py-8">No location data yet</p>
              )}
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