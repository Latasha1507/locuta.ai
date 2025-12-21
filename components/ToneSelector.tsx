'use client';

import Link from 'next/link';
import { useState } from 'react';
import Mixpanel from '@/lib/mixpanel';

interface Tone {
  id: string;
  name: string;
  voice: string;
  description: string;
  icon: string;
  borderGradient: string;
  bgGradient: string;
}

interface ToneSelectorProps {
  tones: Tone[];
  categoryId: string;
  moduleId: string;
  lessonId: string;
  lesson: any;
  categoryName: string;
}

export default function ToneSelector({
  tones,
  categoryId,
  moduleId,
  lessonId,
  lesson,
  categoryName
}: ToneSelectorProps) {
  const [hoverTimes, setHoverTimes] = useState<{ [key: string]: number }>({});

  const handleToneHover = (toneId: string) => {
    setHoverTimes({ ...hoverTimes, [toneId]: Date.now() });
    
    // Track tone hover (browsing behavior)
    Mixpanel.track('Tone Card Hovered', {
      tone: toneId,
      lesson_id: lessonId,
      category: categoryName
    });
  };

  const handleToneHoverEnd = (toneId: string, toneName: string) => {
    const startTime = hoverTimes[toneId];
    if (startTime) {
      const hoverDuration = Date.now() - startTime;
      
      // Track extended hover (indicates interest/consideration)
      if (hoverDuration > 1500) {
        Mixpanel.track('Tone Card Extended Hover', {
          tone: toneId,
          tone_name: toneName,
          hover_duration_ms: hoverDuration,
          lesson_id: lessonId,
          category: categoryName
        });
      }
    }
  };

  const handleToneClick = (tone: Tone) => {
    // Track tone selection with rich context
    Mixpanel.track('Lesson Started', {
      lesson_id: lesson.id,
      lesson_title: lesson.level_title,
      category: categoryName,
      module_number: moduleId,
      level_number: lessonId,
      coaching_style: tone.id,
      coaching_style_name: tone.name,
      isFirstLesson: false
    });
    
    // Track tone preference (for user profiling)
    Mixpanel.people.increment(`Tone Selected: ${tone.id}`, 1);
    Mixpanel.people.set({
      'Last Coaching Style': tone.id,
      'Last Coaching Style Name': tone.name
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tones.map((tone) => (
        <Link
          key={tone.id}
          href={`/category/${categoryId}/module/${moduleId}/lesson/${lessonId}/practice?tone=${tone.id}`}
          onClick={() => handleToneClick(tone)}
          onMouseEnter={() => handleToneHover(tone.id)}
          onMouseLeave={() => handleToneHoverEnd(tone.id, tone.name)}
          className={`bg-gradient-to-br ${tone.bgGradient} border-2 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl block group`}
        >
          <div className="text-4xl mb-3">{tone.icon}</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {tone.name}
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            {tone.description}
          </p>
          <div className="flex items-center text-purple-600 font-semibold text-sm">
            <span>Start with {tone.name}</span>
            <svg
              className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </Link>
      ))}
    </div>
  );
}