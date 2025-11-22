'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { trackFeedbackViewed } from '@/lib/analytics/helpers';
import Mixpanel from '@/lib/mixpanel';
import { EVENTS } from '@/lib/analytics/events';
import { createClient } from '@/lib/supabase/client';

interface FeedbackPageClientProps {
  categoryId: string;
  moduleId: string;
  lessonId: string;
  sessionId: string;
  session: any;
  feedback: any;
  score: number;
  userId: string;
}

export default function FeedbackPageClient({
  categoryId,
  moduleId,
  lessonId,
  sessionId,
  session,
  feedback,
  score,
  userId 
}: FeedbackPageClientProps) {
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [attemptCount, setAttemptCount] = useState(1);

  // Count previous attempts for this lesson - ADD THIS ENTIRE USEEFFECT
  useEffect(() => {
    const countAttempts = async () => {
      const supabase = createClient();
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('category', session.category)
        .eq('module_number', session.module_number)
        .eq('level_number', session.level_number);
      
      if (sessions) {
        setAttemptCount(sessions.length);
      }
    };
    
    countAttempts();
  }, [userId, session]);

  // Track feedback viewed on mount
  useEffect(() => {
    if (!hasTrackedView) {
      trackFeedbackViewed({
        lessonId: lessonId,
        overallScore: score,
        passed: feedback.pass_level || false,
        timeToView: 0
      });
      setHasTrackedView(true);
    }
  }, [hasTrackedView, lessonId, score, feedback]);

  // Track AI example played
  const handleAudioPlay = () => {
    Mixpanel.track(EVENTS.AI_EXAMPLE_PLAYED, {
      lesson_id: lessonId,
      coaching_style: session.tone,
      session_id: sessionId
    });
  };

  // ENHANCED: Track retry with attempt count
  const handleRetryClick = () => {
    Mixpanel.track(EVENTS.RETRY_LESSON_CLICKED, {
      lesson_id: lessonId,
      lesson_title: session.category, // Add more context
      category: categoryId,
      module_number: parseInt(moduleId),
      lesson_number: parseInt(lessonId),
      previous_score: score,
      attempt_number: attemptCount, // THIS IS KEY - shows which attempt they're on
      reason: score >= 80 ? 'want_better_score' : 'failed',
      score_difference_from_passing: 80 - score // How far from passing
    });
    
    // ALSO increment a user property for total retries
    Mixpanel.people.increment('Total Lesson Retries', 1);
  };

  // Track back to lessons
  const handleBackClick = () => {
    Mixpanel.track('Back to Lessons Clicked', {
      from_page: 'feedback',
      lesson_id: lessonId,
      final_score: score,
      attempt_number: attemptCount,
      passed: feedback.pass_level || false
    });
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      {/* Score Card */}
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-8 py-12 text-white text-center">
          <div className="text-8xl font-bold mb-4">{score}</div>
          <div className="text-2xl font-semibold">Overall Score</div>
          <p className="text-white/90 mt-2">
            {score >= 90 ? 'Excellent!' : score >= 75 ? 'Great job!' : score >= 60 ? 'Good effort!' : 'Keep practicing!'}
          </p>
        </div>

        {/* Focus Area Scores */}
        {feedback.focus_area_scores && Object.keys(feedback.focus_area_scores).length > 0 && (
          <div className="p-8 bg-gray-50">
            <h3 className="font-bold text-xl text-gray-900 mb-6">Focus Area Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(feedback.focus_area_scores).map(([area, score]: [string, any]) => (
                <div key={area} className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="text-3xl font-bold text-purple-600 mb-2">{score}</div>
                  <div className="text-sm font-medium text-gray-700">{area}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detailed Feedback */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Detailed Feedback</h2>
        <p className="text-gray-700 leading-relaxed text-lg mb-8">
          {feedback.detailed_feedback}
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="bg-green-50 rounded-xl p-6 border border-green-200">
            <h3 className="font-bold text-lg text-green-900 mb-4">
              Strengths
            </h3>
            <ul className="space-y-3">
              {feedback.strengths?.map((strength: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-green-800">
                  <span className="text-green-600">•</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Improvements */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <h3 className="font-bold text-lg text-blue-900 mb-4">
              Areas to Improve
            </h3>
            <ul className="space-y-3">
              {feedback.improvements?.map((improvement: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-blue-800">
                  <span className="text-blue-600">•</span>
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Your Transcript */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          What You Said
        </h2>
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <p className="text-gray-700 leading-relaxed italic">
            &quot;{session.user_transcript}&quot;
          </p>
        </div>
      </div>

      {/* AI Example */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-6 text-white">
          <h2 className="text-2xl font-bold">
            How I Would Have Done It
          </h2>
          <p className="text-white/90 mt-1">Listen to an example response</p>
        </div>
        
        <div className="p-8">
          {/* Audio Player with tracking */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border-2 border-purple-200 mb-6">
            <audio
              controls
              className="w-full"
              src={`data:audio/mpeg;base64,${session.ai_example_audio}`}
              onPlay={handleAudioPlay}
            >
              Your browser does not support audio playback.
            </audio>
          </div>

          {/* Transcript */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Transcript:</h3>
            <p className="text-gray-700 leading-relaxed">
              {session.ai_example_text}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons with tracking */}
      <div className="flex gap-4 justify-center">
        <Link
          href={`/category/${categoryId}/module/${moduleId}/lesson/${lessonId}/practice?tone=${session.tone}`}
          onClick={handleRetryClick}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-xl transition-transform hover:scale-105"
        >
          Practice Again
        </Link>
        <Link
          href={`/category/${categoryId}/modules?tone=${session.tone}`}
          onClick={handleBackClick}
          className="px-8 py-4 border-2 border-purple-600 text-purple-600 hover:bg-purple-50 rounded-xl font-bold transition-colors"
        >
          ← Back to Lessons
        </Link>
      </div>
    </main>
  );
}