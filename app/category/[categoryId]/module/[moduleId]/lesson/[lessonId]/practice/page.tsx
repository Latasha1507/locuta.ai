import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { resolveTone } from '@/lib/tones'
import { checkSessionLimitServer } from '@/lib/check-session-limit-server'
import { PracticeView } from '@/components/practice/PracticeView'

export const dynamic = 'force-dynamic'

const categoryMap: Record<string, string> = {
  'public-speaking': 'Public Speaking',
  storytelling: 'Storytelling',
  'creator-speaking': 'Creator Speaking',
  'casual-conversation': 'Casual Conversation',
  'workplace-communication': 'Workplace Communication',
  'pitch-anything': 'Pitch Anything',
}

// Server component: the lesson text is fetched here, so the task is readable
// the moment the page paints. The old version was a client component that
// showed "Loading task..." until /api/lesson-intro (an OpenAI TTS call) came
// back — you had to wait on a text-to-speech round trip just to read the task.
export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string; moduleId: string; lessonId: string }>
  searchParams: Promise<{ tone?: string }>
}) {
  const { categoryId, moduleId, lessonId } = await params
  const { tone: toneParam } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const categoryName = categoryMap[categoryId]
  if (!categoryName) notFound()

  const moduleNumber = Number(moduleId)
  const levelNumber = Number(lessonId)
  if (!Number.isInteger(moduleNumber) || !Number.isInteger(levelNumber)) notFound()

  const [lessonRes, limit] = await Promise.all([
    supabase
      .from('lessons')
      .select('level_title, lesson_explanation, practice_prompt, practice_example, expected_duration_sec')
      .eq('category', categoryName)
      .eq('module_number', moduleNumber)
      .eq('level_number', levelNumber)
      .maybeSingle(),
    checkSessionLimitServer(user.id),
  ])

  const lesson = lessonRes.data
  if (!lesson) notFound()

  return (
    <PracticeView
      categoryId={categoryId}
      categoryName={categoryName}
      moduleId={moduleId}
      lessonId={lessonId}
      tone={resolveTone(toneParam)}
      lessonTitle={lesson.level_title || `Lesson ${levelNumber}`}
      practicePrompt={lesson.practice_prompt || 'Speak clearly and confidently about the topic.'}
      lessonExplanation={lesson.lesson_explanation || ''}
      practiceExample={lesson.practice_example || ''}
      expectedDurationSec={lesson.expected_duration_sec || 60}
      limit={{
        allowed: limit.allowed,
        reason: limit.reason,
        sessionsRemainingToday: limit.sessionsRemainingToday,
      }}
    />
  )
}
