'use client';

import Link from 'next/link';
import { useState } from 'react';
import Mixpanel from '@/lib/mixpanel';
import { EVENTS } from '@/lib/analytics/events';

interface CategoryCardProps {
  category: any;
  onHover?: () => void;
}

export default function CategoryCardTracking({ category, onHover }: CategoryCardProps) {
  const [hoverStartTime, setHoverStartTime] = useState<number>(0);

  const handleMouseEnter = () => {
    setHoverStartTime(Date.now());
    
    // Track card hover
    Mixpanel.track('Category Card Hovered', {
      category_id: category.id,
      category_name: category.name,
      completion_percentage: category.completionPercentage,
      has_started: category.hasStarted,
      best_score: category.bestScore
    });
    
    if (onHover) onHover();
  };

  const handleMouseLeave = () => {
    if (hoverStartTime > 0) {
      const hoverDuration = Date.now() - hoverStartTime;
      
      // Track hover duration (indicates interest)
      if (hoverDuration > 1000) { // Only track if hovered > 1 second
        Mixpanel.track('Category Card Extended Hover', {
          category_id: category.id,
          category_name: category.name,
          hover_duration_ms: hoverDuration
        });
      }
    }
  };

  const handleClick = () => {
    // Track category selection
    Mixpanel.track(EVENTS.CATEGORY_CARD_CLICKED, {
      category_id: category.id,
      category_name: category.name,
      completion_percentage: category.completionPercentage,
      completed_lessons: category.completedLessons,
      total_lessons: category.totalLessons,
      best_score: category.bestScore,
      has_started: category.hasStarted,
      is_first_category: !category.hasStarted
    });
  };

  return (
    <Link
      href={`/category/${category.id}/tone`}
      className="group focus:outline-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Your existing category card UI */}
      <div className="relative bg-white/80 backdrop-blur-xl border-2 border-purple-200/40 hover:border-indigo-300/60 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group-hover:scale-[1.02] category-card">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 via-transparent to-indigo-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100/80 to-indigo-100/80 backdrop-blur-sm flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300">
              <span className="text-3xl">{category.icon}</span>
            </div>
            {category.completionPercentage > 0 && (
              <div className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-purple-200/50 text-sm font-bold text-purple-700 shadow-sm">
                {category.completionPercentage}%
              </div>
            )}
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-purple-700 transition-colors">
            {category.name}
          </h3>
          <p className="text-slate-600 text-sm mb-4 leading-relaxed">
            {category.description}
          </p>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100/60 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-slate-500">Lessons</div>
                <div className="text-sm font-bold text-slate-900">{category.completedLessons}/{category.totalLessons}</div>
              </div>
            </div>
            
            {category.bestScore > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100/60 flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Best</div>
                  <div className="text-sm font-bold text-slate-900">{category.bestScore}</div>
                </div>
              </div>
            )}
          </div>

          <div className="mb-4">
            <div className="w-full h-2 bg-slate-200/70 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-700"
                style={{ width: `${category.completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-purple-700 group-hover:text-indigo-700 transition-colors">
              {category.hasStarted ? 'Continue Learning' : 'Start Learning'}
            </span>
            <svg className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}