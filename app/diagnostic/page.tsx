'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function DashboardDiagnostic() {
  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDiagnostics([]);
    const results: any[] = [];
    const supabase = createClient();

    // Test 1: Auth
    const authStart = Date.now();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const authTime = Date.now() - authStart;
      results.push({
        test: 'Auth Check',
        time: authTime,
        status: user ? 'SUCCESS' : 'FAILED',
        details: user ? `User: ${user.id}` : 'No user found'
      });
      
      if (!user) {
        setDiagnostics(results);
        setIsRunning(false);
        return;
      }

      // Test 2: User Progress Query
      const progressStart = Date.now();
      try {
        const { data, error } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id);
        const progressTime = Date.now() - progressStart;
        results.push({
          test: 'User Progress Query',
          time: progressTime,
          status: error ? 'FAILED' : 'SUCCESS',
          details: error ? error.message : `${data?.length || 0} records`,
          recommendation: progressTime > 2000 ? '⚠️ SLOW - Add index on user_id' : progressTime > 1000 ? '⚠️ Could be faster' : '✅ Good'
        });
      } catch (err: any) {
        results.push({
          test: 'User Progress Query',
          time: Date.now() - progressStart,
          status: 'ERROR',
          details: err.message
        });
      }

      // Test 3: Lessons Query (ALL lessons - no user filter)
      const lessonsStart = Date.now();
      try {
        const { data, error } = await supabase
          .from('lessons')
          .select('category, module_number, level_number');
        const lessonsTime = Date.now() - lessonsStart;
        results.push({
          test: 'Lessons Query (All)',
          time: lessonsTime,
          status: error ? 'FAILED' : 'SUCCESS',
          details: error ? error.message : `${data?.length || 0} records`,
          recommendation: lessonsTime > 3000 ? '🚨 VERY SLOW - Table too large or missing index' : lessonsTime > 1500 ? '⚠️ Slow' : '✅ Good'
        });
      } catch (err: any) {
        results.push({
          test: 'Lessons Query (All)',
          time: Date.now() - lessonsStart,
          status: 'ERROR',
          details: err.message
        });
      }

      // Test 4: All Sessions Query
      const allSessionsStart = Date.now();
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        const allSessionsTime = Date.now() - allSessionsStart;
        results.push({
          test: 'All Sessions Query',
          time: allSessionsTime,
          status: error ? 'FAILED' : 'SUCCESS',
          details: error ? error.message : `${data?.length || 0} records`,
          recommendation: allSessionsTime > 3000 ? '🚨 CRITICAL - Add composite index on (user_id, created_at)' : allSessionsTime > 1500 ? '⚠️ Add index' : '✅ Good'
        });
      } catch (err: any) {
        results.push({
          test: 'All Sessions Query',
          time: Date.now() - allSessionsStart,
          status: 'ERROR',
          details: err.message
        });
      }

      // Test 5: Recent Sessions Query (with limit)
      const recentSessionsStart = Date.now();
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        const recentSessionsTime = Date.now() - recentSessionsStart;
        results.push({
          test: 'Recent Sessions Query (limit 10)',
          time: recentSessionsTime,
          status: error ? 'FAILED' : 'SUCCESS',
          details: error ? error.message : `${data?.length || 0} records`,
          recommendation: recentSessionsTime > 2000 ? '🚨 SLOW even with LIMIT - Check indexes' : recentSessionsTime > 1000 ? '⚠️ Could be faster' : '✅ Good'
        });
      } catch (err: any) {
        results.push({
          test: 'Recent Sessions Query (limit 10)',
          time: Date.now() - recentSessionsStart,
          status: 'ERROR',
          details: err.message
        });
      }

      // Test 6: RLS Policy Check
      const rlsStart = Date.now();
      try {
        // Try to read from sessions without user filter (should be blocked by RLS)
        const { data, error } = await supabase
          .from('sessions')
          .select('id')
          .limit(1);
        const rlsTime = Date.now() - rlsStart;
        results.push({
          test: 'RLS Policy Check',
          time: rlsTime,
          status: 'INFO',
          details: error ? `RLS Active: ${error.message}` : `RLS might be too permissive - returned ${data?.length} records`,
          recommendation: rlsTime > 2000 ? '⚠️ RLS evaluation is slow' : '✅ RLS performing well'
        });
      } catch (err: any) {
        results.push({
          test: 'RLS Policy Check',
          time: Date.now() - rlsStart,
          status: 'INFO',
          details: err.message
        });
      }

    } catch (err: any) {
      results.push({
        test: 'General Error',
        time: 0,
        status: 'FAILED',
        details: err.message
      });
    }

    setDiagnostics(results);
    setIsRunning(false);
  };

  const totalTime = diagnostics.reduce((sum, d) => sum + (d.time || 0), 0);
  const hasSlowQueries = diagnostics.some(d => d.time > 2000);
  const hasCriticalIssues = diagnostics.some(d => d.recommendation?.includes('🚨'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔍 Dashboard Performance Diagnostic
          </h1>
          <p className="text-gray-600 mb-6">
            This tool measures exactly how long each database query takes to help identify bottlenecks.
          </p>
          
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? '⏳ Running Tests...' : '▶️ Run Diagnostics'}
          </button>
        </div>

        {diagnostics.length > 0 && (
          <>
            {/* Summary */}
            <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Total Time</div>
                  <div className="text-2xl font-bold text-gray-900">{totalTime}ms</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {totalTime < 3000 ? '✅ Good' : totalTime < 5000 ? '⚠️ Slow' : '🚨 Very Slow'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Slow Queries</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {diagnostics.filter(d => d.time > 2000).length}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    &gt;2000ms
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Status</div>
                  <div className="text-2xl font-bold">
                    {hasCriticalIssues ? '🚨' : hasSlowQueries ? '⚠️' : '✅'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {hasCriticalIssues ? 'Critical Issues' : hasSlowQueries ? 'Needs Optimization' : 'Healthy'}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🔬 Detailed Results</h2>
              <div className="space-y-4">
                {diagnostics.map((diag, idx) => (
                  <div 
                    key={idx}
                    className={`border-2 rounded-lg p-4 ${
                      diag.status === 'SUCCESS' ? 'border-green-200 bg-green-50' :
                      diag.status === 'FAILED' ? 'border-red-200 bg-red-50' :
                      diag.status === 'ERROR' ? 'border-orange-200 bg-orange-50' :
                      'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-900">{diag.test}</h3>
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        diag.time < 1000 ? 'bg-green-200 text-green-800' :
                        diag.time < 2000 ? 'bg-yellow-200 text-yellow-800' :
                        'bg-red-200 text-red-800'
                      }`}>
                        {diag.time}ms
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 mb-2">
                      <span className="font-semibold">Status:</span> {diag.status}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {diag.details}
                    </div>
                    {diag.recommendation && (
                      <div className={`text-sm font-semibold p-2 rounded ${
                        diag.recommendation.includes('🚨') ? 'bg-red-100 text-red-800' :
                        diag.recommendation.includes('⚠️') ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {diag.recommendation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {(hasSlowQueries || hasCriticalIssues) && (
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-2xl p-6 mt-6 text-white">
                <h2 className="text-xl font-bold mb-4">💡 Quick Fixes</h2>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-2xl">1️⃣</span>
                    <div>
                      <div className="font-semibold">Add Database Indexes</div>
                      <div className="text-purple-100 text-sm">
                        Run these in Supabase SQL Editor:
                      </div>
                      <code className="block bg-black/20 rounded p-2 mt-1 text-xs">
                        CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);<br/>
                        CREATE INDEX idx_sessions_user_created ON sessions(user_id, created_at DESC);
                      </code>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-2xl">2️⃣</span>
                    <div>
                      <div className="font-semibold">Optimize RLS Policies</div>
                      <div className="text-purple-100 text-sm">
                        Make sure RLS policies use indexed columns
                      </div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-2xl">3️⃣</span>
                    <div>
                      <div className="font-semibold">Reduce Data Fetched</div>
                      <div className="text-purple-100 text-sm">
                        Select only needed columns instead of SELECT *
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}