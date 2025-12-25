'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminAnalytics() {
  const [progressData, setProgressData] = useState<any[]>([])
  const [sessionsData, setSessionsData] = useState<any[]>([])

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient()
      
      // Load from readable views
      const [progressRes, sessionsRes] = await Promise.all([
        supabase.from('user_progress_readable').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('sessions_readable').select('*').order('created_at', { ascending: false }).limit(50)
      ])
      
      setProgressData(progressRes.data || [])
      setSessionsData(sessionsRes.data || [])
    }
    
    loadData()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Analytics</h1>
      
      {/* User Progress Table */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-4">User Progress</h2>
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Best Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {progressData.map((row) => (
                <tr key={row.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{row.user_name}</div>
                    <div className="text-sm text-gray-500">{row.user_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{row.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{row.module_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{row.level_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {row.completed ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">✓ Completed</span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">In Progress</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">{row.best_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sessions Table */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Recent Sessions</h2>
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sessionsData.map((row) => (
                <tr key={row.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{row.user_name}</div>
                    <div className="text-sm text-gray-500">{row.user_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{row.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{row.tone}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      row.overall_score >= 90 ? 'bg-green-100 text-green-800' :
                      row.overall_score >= 80 ? 'bg-blue-100 text-blue-800' :
                      row.overall_score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {row.overall_score}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(row.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}