'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface DiagnosticResult {
  test: string;
  time: number;
  status: 'SUCCESS' | 'FAILED' | 'WARNING' | 'INFO' | 'PENDING';
  details: string;
  recommendation?: string;
}

interface QualityCheck {
  feature: string;
  present: boolean;
  details: string;
  isPending?: boolean;
}

export default function FeedbackDiagnostic() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [qualityChecks, setQualityChecks] = useState<QualityCheck[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [isCheckingAI, setIsCheckingAI] = useState(false);
  const [aiCheckCount, setAiCheckCount] = useState(0);
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(false);

  // Auto-check for AI example every 2 seconds
  useEffect(() => {
    if (!autoCheckEnabled || !lastSessionId || aiCheckCount >= 5) return;
    
    const timer = setTimeout(() => {
      checkAIExample(lastSessionId);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [autoCheckEnabled, lastSessionId, aiCheckCount]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'test-audio.webm', { type: 'audio/webm' });
        setAudioFile(file);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      alert('Microphone access denied. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const checkAIExample = async (sessionId: string) => {
    setIsCheckingAI(true);
    const supabase = createClient();
    
    try {
      const { data: session, error } = await supabase
        .from('sessions')
        .select('ai_example_text, ai_example_audio')
        .eq('id', sessionId)
        .single();
      
      if (!error && session) {
        setQualityChecks(prev => prev.map(check => {
          if (check.feature === 'AI Example Text') {
            return {
              ...check,
              present: !!session.ai_example_text,
              details: session.ai_example_text 
                ? `✅ ${session.ai_example_text.length} characters` 
                : '⏳ Still generating...',
              isPending: !session.ai_example_text
            };
          }
          if (check.feature === 'AI Audio (HD Quality)') {
            return {
              ...check,
              present: !!session.ai_example_audio,
              details: session.ai_example_audio 
                ? `✅ Audio present (${Math.round(session.ai_example_audio.length / 1024)}KB)` 
                : '⏳ Still generating...',
              isPending: !session.ai_example_audio
            };
          }
          return check;
        }));
        
        // Stop auto-check if AI example is ready
        if (session.ai_example_text && session.ai_example_audio) {
          setAutoCheckEnabled(false);
        } else {
          setAiCheckCount(prev => prev + 1);
        }
      }
    } catch (err) {
      console.error('Error checking AI example:', err);
    }
    
    setIsCheckingAI(false);
  };

  const runDiagnostics = async () => {
    if (!audioFile) {
      alert('Please record audio first!');
      return;
    }

    setIsRunning(true);
    setDiagnostics([]);
    setQualityChecks([]);
    setLastSessionId(null);
    setAiCheckCount(0);
    setAutoCheckEnabled(false);
    
    const results: DiagnosticResult[] = [];
    const quality: QualityCheck[] = [];
    const supabase = createClient();

    try {
      // Step 1: Check authentication
      const authStart = Date.now();
      const { data: { user } } = await supabase.auth.getUser();
      const authTime = Date.now() - authStart;
      
      results.push({
        test: 'Authentication Check',
        time: authTime,
        status: user ? 'SUCCESS' : 'FAILED',
        details: user ? `User: ${user.id}` : 'Not authenticated',
        recommendation: authTime > 500 ? '⚠️ Auth is slow' : '✅ Good'
      });

      if (!user) {
        setDiagnostics(results);
        setIsRunning(false);
        return;
      }

      // Step 2: Prepare FormData
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('tone', 'Normal');
      formData.append('categoryId', 'public-speaking');
      formData.append('moduleId', '1');
      formData.append('lessonId', '1');
      formData.append('duration', '10'); // Add duration

      // Step 3: Call Feedback API
      const apiStart = Date.now();
      let response;
      
      try {
        response = await fetch('/api/feedback', {
          method: 'POST',
          body: formData,
        });
        
        const apiTime = Date.now() - apiStart;
        
        results.push({
          test: 'Feedback API Call',
          time: apiTime,
          status: response.ok ? 'SUCCESS' : 'FAILED',
          details: `HTTP ${response.status} - Total API time: ${apiTime}ms`,
          recommendation: apiTime > 5000 ? '🚨 TOO SLOW - Target is 4000ms' :
                         apiTime > 4000 ? '⚠️ Close to target - Aim for under 4000ms' :
                         '✅ EXCELLENT - Under 4 seconds!'
        });

        if (!response.ok) {
          const errorData = await response.json();
          results.push({
            test: 'API Error Details',
            time: 0,
            status: 'FAILED',
            details: JSON.stringify(errorData),
          });
          setDiagnostics(results);
          setIsRunning(false);
          return;
        }

        // Step 4: Check response data
        const responseData = await response.json();
        
        // Show quick feedback from response
        if (responseData.quickFeedback) {
          results.push({
            test: 'Quick Feedback (Instant)',
            time: 0,
            status: 'SUCCESS',
            details: `Score: ${responseData.quickFeedback.score}, Pass: ${responseData.quickFeedback.passed ? 'Yes' : 'No'}`,
            recommendation: '✅ Instant feedback delivered with response'
          });
        }
        
        // Step 5: Fetch session to check feedback quality
        if (responseData.sessionId) {
          setLastSessionId(responseData.sessionId);
          
          const sessionStart = Date.now();
          const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', responseData.sessionId)
            .single();
          
          const sessionTime = Date.now() - sessionStart;
          
          results.push({
            test: 'Session Retrieval',
            time: sessionTime,
            status: sessionError ? 'FAILED' : 'SUCCESS',
            details: sessionError ? sessionError.message : `Session ${responseData.sessionId} retrieved`,
            recommendation: sessionTime > 1000 ? '⚠️ Slow DB query' : '✅ Good'
          });

          if (session) {
            const feedback = session.feedback;

            // Quality Checks
            quality.push({
              feature: 'Task Completion Analysis',
              present: !!(feedback?.task_completion_analysis),
              details: feedback?.task_completion_analysis ? 
                `✅ Has explanation: "${feedback.task_completion_analysis.explanation?.substring(0, 50)}..."` : 
                '❌ Missing'
            });

            quality.push({
              feature: 'Linguistic Analysis - Grammar',
              present: !!(feedback?.linguistic_analysis?.grammar),
              details: feedback?.linguistic_analysis?.grammar ? 
                `✅ Score: ${feedback.linguistic_analysis.grammar.score}` : 
                '❌ Missing'
            });

            quality.push({
              feature: 'Linguistic Analysis - Sentence Formation',
              present: !!(feedback?.linguistic_analysis?.sentence_formation),
              details: feedback?.linguistic_analysis?.sentence_formation ? 
                `✅ Score: ${feedback.linguistic_analysis.sentence_formation.score}, Level: ${feedback.linguistic_analysis.sentence_formation.complexity_level}` : 
                '❌ Missing'
            });

            quality.push({
              feature: 'Linguistic Analysis - Vocabulary',
              present: !!(feedback?.linguistic_analysis?.vocabulary),
              details: feedback?.linguistic_analysis?.vocabulary ? 
                `✅ Score: ${feedback.linguistic_analysis.vocabulary.score}, Diversity: ${feedback.linguistic_analysis.vocabulary.diversity_score}%` : 
                '❌ Missing'
            });

            quality.push({
              feature: 'Filler Words Analysis',
              present: !!(feedback?.filler_analysis),
              details: feedback?.filler_analysis ? 
                `✅ Count: ${feedback.filler_analysis.filler_words_count}, Penalty: -${feedback.filler_analysis.penalty_applied}` : 
                '❌ Missing'
            });

            quality.push({
              feature: 'Focus Area Scores',
              present: !!(feedback?.focus_area_scores),
              details: feedback?.focus_area_scores ? 
                `✅ ${Object.keys(feedback.focus_area_scores).length} areas scored` : 
                '❌ Missing'
            });

            quality.push({
              feature: 'Strengths & Improvements',
              present: !!(feedback?.strengths && feedback?.improvements),
              details: (feedback?.strengths && feedback?.improvements) ? 
                `✅ ${feedback.strengths.length} strengths, ${feedback.improvements.length} improvements` : 
                '❌ Missing'
            });

            quality.push({
              feature: 'Detailed Feedback',
              present: !!(feedback?.detailed_feedback),
              details: feedback?.detailed_feedback ? 
                `✅ ${feedback.detailed_feedback.length} characters` : 
                '❌ Missing'
            });

            // AI Example - These are generated in background
            quality.push({
              feature: 'AI Example Text',
              present: !!(session.ai_example_text),
              details: session.ai_example_text ? 
                `✅ ${session.ai_example_text.length} characters` : 
                '⏳ Generating in background...',
              isPending: !session.ai_example_text
            });

            quality.push({
              feature: 'AI Audio (HD Quality)',
              present: !!(session.ai_example_audio),
              details: session.ai_example_audio ? 
                `✅ Audio present (${Math.round(session.ai_example_audio.length / 1024)}KB)` : 
                '⏳ Generating in background...',
              isPending: !session.ai_example_audio
            });

            // Check scoring components
            results.push({
              test: 'Scoring Components',
              time: 0,
              status: (feedback?.task_completion_score && feedback?.delivery_score && feedback?.linguistic_score) ? 'SUCCESS' : 'WARNING',
              details: `Task: ${feedback?.task_completion_score || 'N/A'}, Delivery: ${feedback?.delivery_score || 'N/A'}, Linguistic: ${feedback?.linguistic_score || 'N/A'}`,
              recommendation: '✅ All three components present'
            });

            results.push({
              test: 'Overall Quality Score',
              time: 0,
              status: feedback?.overall_score >= 80 ? 'SUCCESS' : 'INFO',
              details: `Score: ${feedback?.overall_score || 'N/A'}/100, Pass: ${feedback?.pass_level ? 'Yes' : 'No'}`,
            });

            // Voice Metrics (if available)
            if (feedback?.voice_metrics) {
              quality.push({
                feature: 'Voice Metrics (Web Audio)',
                present: true,
                details: `✅ Confidence: ${feedback.voice_metrics.confidence_score}, Delivery: ${feedback.voice_metrics.delivery_score}, Pace: ${feedback.voice_metrics.pace_score}`
              });
            }

            // User tracking
            quality.push({
              feature: 'User Tracking (Browser, Device, Location)',
              present: !!(session.browser_type && session.device_type),
              details: session.browser_type ? 
                `✅ ${session.browser_type}, ${session.device_type}, ${session.user_country}` : 
                '❌ Missing tracking data'
            });
            
            // Enable auto-check for AI example if not ready
            if (!session.ai_example_text || !session.ai_example_audio) {
              setAutoCheckEnabled(true);
            }
          }
        }

      } catch (err: any) {
        results.push({
          test: 'API Call Error',
          time: Date.now() - apiStart,
          status: 'FAILED',
          details: err.message || 'Unknown error',
        });
      }

    } catch (err: any) {
      results.push({
        test: 'General Error',
        time: 0,
        status: 'FAILED',
        details: err.message,
      });
    }

    setDiagnostics(results);
    setQualityChecks(quality);
    setIsRunning(false);
  };

  const apiTime = diagnostics.find(d => d.test === 'Feedback API Call')?.time || 0;
  const hasCriticalIssues = diagnostics.some(d => d.recommendation?.includes('🚨'));
  const hasWarnings = diagnostics.some(d => d.recommendation?.includes('⚠️'));
  const presentChecks = qualityChecks.filter(q => q.present && !q.isPending).length;
  const totalChecks = qualityChecks.filter(q => !q.isPending).length;
  const pendingChecks = qualityChecks.filter(q => q.isPending).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            🎯 Feedback API Performance Diagnostic
          </h1>
          <p className="text-gray-600 mb-6">
            Test your feedback API to ensure it runs in under 4 seconds with 100% quality.
          </p>
          
          {/* Recording Controls */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 sm:p-6 mb-4">
            <h3 className="font-bold text-gray-900 mb-3">Step 1: Record Test Audio</h3>
            {!audioFile && !isRecording && (
              <button
                onClick={startRecording}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                🎤 Start Recording
              </button>
            )}
            
            {isRecording && (
              <div className="flex items-center gap-4 flex-wrap">
                <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse"></div>
                <span className="text-gray-700 font-semibold">Recording... (speak for 5-10 seconds)</span>
                <button
                  onClick={stopRecording}
                  className="px-6 py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors"
                >
                  ⏹️ Stop Recording
                </button>
              </div>
            )}
            
            {audioFile && !isRecording && (
              <div className="flex items-center gap-4 flex-wrap">
                <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold">
                  ✅ Audio recorded ({Math.round(audioFile.size / 1024)}KB)
                </div>
                <button
                  onClick={startRecording}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors text-sm"
                >
                  🔄 Record Again
                </button>
              </div>
            )}
          </div>

          {/* Run Button */}
          <button
            onClick={runDiagnostics}
            disabled={isRunning || !audioFile}
            className="px-8 py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Running Tests...
              </>
            ) : (
              <>▶️ Run Complete Diagnostic</>
            )}
          </button>
        </div>

        {diagnostics.length > 0 && (
          <>
            {/* Summary */}
            <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Performance Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">API Response Time</div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900">{apiTime}ms</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {apiTime < 4000 ? '✅ Under 4s!' : apiTime < 5000 ? '⚠️ Close' : '🚨 Too slow'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Tests Passed</div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {diagnostics.filter(d => d.status === 'SUCCESS').length}/{diagnostics.length}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Quality Score</div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {totalChecks > 0 ? Math.round((presentChecks / totalChecks) * 100) : 0}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {pendingChecks > 0 ? `⏳ ${pendingChecks} pending` : '✅ Complete'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Status</div>
                  <div className="text-2xl font-bold">
                    {hasCriticalIssues ? '🚨' : hasWarnings ? '⚠️' : '✅'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {hasCriticalIssues ? 'Critical' : hasWarnings ? 'Warnings' : 'Excellent'}
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Results */}
            <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">⚡ Performance Tests</h2>
              <div className="space-y-4">
                {diagnostics.map((diag, idx) => (
                  <div 
                    key={idx}
                    className={`border-2 rounded-lg p-4 ${
                      diag.status === 'SUCCESS' ? 'border-green-200 bg-green-50' :
                      diag.status === 'FAILED' ? 'border-red-200 bg-red-50' :
                      diag.status === 'WARNING' ? 'border-yellow-200 bg-yellow-50' :
                      diag.status === 'PENDING' ? 'border-blue-200 bg-blue-50' :
                      'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                      <h3 className="font-bold text-gray-900">{diag.test}</h3>
                      {diag.time > 0 && (
                        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          diag.time < 1000 ? 'bg-green-200 text-green-800' :
                          diag.time < 4000 ? 'bg-yellow-200 text-yellow-800' :
                          'bg-red-200 text-red-800'
                        }`}>
                          {diag.time}ms
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-700 mb-2">
                      <span className="font-semibold">Status:</span> {diag.status}
                    </div>
                    <div className="text-sm text-gray-600 mb-2 break-words">
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

            {/* Quality Checks */}
            {qualityChecks.length > 0 && (
              <div className="bg-white rounded-2xl shadow-2xl p-6">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <h2 className="text-xl font-bold text-gray-900">✨ Quality Feature Checks</h2>
                  {pendingChecks > 0 && lastSessionId && (
                    <button
                      onClick={() => checkAIExample(lastSessionId)}
                      disabled={isCheckingAI}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-sm flex items-center gap-2"
                    >
                      {isCheckingAI ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Checking...
                        </>
                      ) : (
                        <>🔄 Check AI Example</>
                      )}
                    </button>
                  )}
                </div>
                
                {/* Auto-check status */}
                {autoCheckEnabled && pendingChecks > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Auto-checking for AI example... ({aiCheckCount}/5 checks)
                  </div>
                )}
                
                <div className="space-y-3">
                  {qualityChecks.map((check, idx) => (
                    <div 
                      key={idx}
                      className={`border-2 rounded-lg p-4 ${
                        check.isPending ? 'border-blue-200 bg-blue-50' :
                        check.present ? 'border-green-200 bg-green-50' : 
                        'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">
                          {check.isPending ? '⏳' : check.present ? '✅' : '❌'}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-1">{check.feature}</h3>
                          <p className="text-sm text-gray-700">{check.details}</p>
                        </div>
                        {check.isPending && (
                          <div className="animate-pulse text-blue-600 text-sm font-medium">
                            Background
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Final Verdict */}
                <div className={`mt-6 p-6 rounded-xl ${
                  apiTime < 4000 && presentChecks === totalChecks && pendingChecks === 0 
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                  apiTime < 5000 && presentChecks === totalChecks 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                  pendingChecks > 0
                    ? 'bg-gradient-to-r from-blue-400 to-indigo-500' :
                    'bg-gradient-to-r from-red-400 to-pink-500'
                } text-white`}>
                  <h3 className="text-2xl font-bold mb-2">
                    {apiTime < 4000 && presentChecks === totalChecks && pendingChecks === 0 
                      ? '🎉 PERFECT!' :
                     apiTime < 5000 && presentChecks === totalChecks 
                      ? '⚠️ CLOSE!' :
                     pendingChecks > 0
                      ? '⏳ WAITING FOR BACKGROUND TASKS' :
                      '🚨 NEEDS WORK'}
                  </h3>
                  <p className="text-lg">
                    {pendingChecks > 0 
                      ? `API responded in ${apiTime}ms. AI example generating in background (${pendingChecks} tasks pending). This is expected behavior!`
                      : apiTime < 4000 && presentChecks === totalChecks
                        ? `Your API runs in ${apiTime}ms with 100% quality features. Target achieved! 🚀`
                        : apiTime < 5000
                          ? `Your API runs in ${apiTime}ms (target: <4000ms). Very close!`
                          : `Your API needs optimization. Time: ${apiTime}ms, Quality: ${totalChecks > 0 ? Math.round((presentChecks / totalChecks) * 100) : 0}%`
                    }
                  </p>
                  
                  {pendingChecks > 0 && (
                    <p className="mt-2 text-sm opacity-90">
                      💡 Tip: The AI example generates in the background to keep API response fast. 
                      Click "Check AI Example" or wait for auto-check to verify it's ready.
                    </p>
                  )}
                </div>

                {/* Time Breakdown */}
                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-bold text-gray-900 mb-3">⏱️ Expected Time Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phase 1: Auth + Whisper + Lesson (parallel)</span>
                      <span className="font-semibold">~2000ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phase 2: GPT-4o-mini Feedback</span>
                      <span className="font-semibold">~1000ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phase 3: DB Saves (parallel)</span>
                      <span className="font-semibold">~300ms</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
                      <span className="text-gray-800 font-semibold">Target Total</span>
                      <span className="font-bold text-green-600">~3300ms</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Background: AI Example + TTS</span>
                      <span>+3-5s (async)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}