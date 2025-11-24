'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { isAdminClient } from '@/lib/admin-client'

export default function AdminPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSessions: 0,
    totalCompleted: 0,
    avgScore: 0
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
      const response = await fetch('/api/admin/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult('')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a CSV file first!')
      return
    }

    setUploading(true)
    setResult('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/import-lessons', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setResult(`✅ Success! Imported ${data.count} lessons.`)
        setFile(null)
      } else {
        setResult(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
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

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
                ← Back to Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  Admin Dashboard
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-full">
                    ADMIN
                  </span>
                </h1>
                <p className="text-sm text-slate-600">Internal analytics & management</p>
              </div>
            </div>
            <img src="/Icon.png" alt="Locuta.ai" className="w-10 h-10" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-600">Total Users</h3>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
                👥
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.totalUsers}</p>
            <p className="text-xs text-slate-500 mt-1">All registered users</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-600">Total Sessions</h3>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                🎯
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.totalSessions}</p>
            <p className="text-xs text-slate-500 mt-1">Practice attempts</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-600">Completed</h3>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
                ✅
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.totalCompleted}</p>
            <p className="text-xs text-slate-500 mt-1">Lessons finished</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-600">Avg Score</h3>
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-2xl">
                ⭐
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{Math.round(stats.avgScore)}</p>
            <p className="text-xs text-slate-500 mt-1">Overall average</p>
          </div>
        </div>

        {/* CSV Import Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Lessons</h2>
          <p className="text-gray-600 mb-6">Upload CSV files to import lessons into the database</p>

          {/* CSV Format Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-blue-900 mb-3">📋 CSV Format Required:</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p className="font-mono bg-blue-100 p-2 rounded text-xs break-all">
                category,module_number,module_name,level_number,level_topic,lesson_explanation,practice_prompt,practice_example,expected_duration_sec,feedback_focus_areas
              </p>
            </div>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                {file ? file.name : 'Click to upload CSV file'}
              </p>
              <p className="text-sm text-gray-500">
                {file ? 'Click to change file' : 'or drag and drop'}
              </p>
            </label>
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload and Import Lessons'}
          </button>

          {result && (
            <div className={`mt-6 p-4 rounded-lg ${result.startsWith('✅') ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
              {result}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/dashboard"
              className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-all"
            >
              <div className="text-2xl mb-2">🎓</div>
              <h3 className="font-bold text-slate-900 mb-1">Test All Lessons</h3>
              <p className="text-sm text-slate-600">Unrestricted access</p>
            </Link>

            
              href="https://mixpanel.com"
              target="_blank"
              <a
                href="https://mixpanel.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-all"
              >
                <div className="text-2xl mb-2">📊</div>
                <h3 className="font-bold text-slate-900 mb-1">View Analytics</h3>
                <p className="text-sm text-slate-600">Mixpanel dashboard</p>
              </a>

            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
              <div className="text-2xl mb-2">⚙️</div>
              <h3 className="font-bold text-slate-900 mb-1">Settings</h3>
              <p className="text-sm text-slate-600">App configuration</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}