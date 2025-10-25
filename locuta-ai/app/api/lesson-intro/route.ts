import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const CATEGORY_MAP: Record<string, string> = {
  'public-speaking': 'Public Speaking',
  'storytelling': 'Storytelling',
  'creator-speaking': 'Creator Speaking',
  'casual-conversation': 'Casual Conversation',
  'workplace-communication': 'Workplace Communication',
  'pitch-anything': 'Pitch Anything',
}

// Voice mapping based on tone characterization
const VOICE_MAP: Record<string, 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'> = {
  'Normal': 'shimmer',      // Clear, simple, everyday conversational
  'Supportive': 'nova',     // Soft, kind, reassuring (using nova as closest to Marin)
  'Inspiring': 'fable',     // Energizing, passionate (using fable as closest to Sage)
  'Funny': 'onyx',          // Entertaining, playful (using onyx as closest to Coral)
  'Diplomatic': 'nova',     // Calm, professional, trustworthy
  'Bossy': 'echo'           // Commanding, authoritative (using echo as closest to Ash)
}

// Detailed tone descriptions for AI coach personality
const TONE_CHARACTERISTICS: Record<string, { goal: string; style: string; delivery: string }> = {
  'Normal': {
    goal: 'Clear, simple, everyday conversational style',
    style: 'Speak in a neutral, natural tone like a friendly everyday person—neither too formal nor too casual',
    delivery: 'Use clear words, steady pacing, and straightforward delivery'
  },
  'Supportive': {
    goal: 'Soft, kind, reassuring',
    style: 'Speak gently and empathetically, like a supportive friend or mentor',
    delivery: 'Use a slower pace, softer intonation, and warmth in your voice. Emphasize comfort and reassurance, making the listener feel safe and cared for. Provide comfort and warmth while maintaining a normal pitch'
  },
  'Inspiring': {
    goal: 'Energize, lift confidence, sound passionate',
    style: 'Speak with passion and energy, like a motivational coach',
    delivery: 'Use an uplifting tone, slightly faster pacing, and emphasize positive words. Add warmth and confidence, making the listener feel capable and empowered'
  },
  'Funny': {
    goal: 'Entertaining, playful, casual',
    style: 'Speak in a playful and humorous way, like a friend cracking light-hearted jokes',
    delivery: 'Use lively intonation, slight exaggeration, and occasional pauses for comedic timing. Keep it friendly and engaging'
  },
  'Diplomatic': {
    goal: 'Calm, professional, trustworthy',
    style: 'Speak in a balanced, professional, and respectful tone, like a skilled diplomat',
    delivery: 'Use moderate pacing, steady intonation, and avoid extremes. Sound thoughtful, fair, and neutral while keeping a friendly undertone'
  },
  'Bossy': {
    goal: 'Commanding, no-nonsense, authoritative',
    style: 'Speak with firmness and authority, like a confident leader giving instructions',
    delivery: 'Use direct words and faster pacing. Sound assertive and commanding, but not rude'
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { tone, categoryId, moduleId, lessonId } = body
    const categoryName = CATEGORY_MAP[categoryId]
    if (!categoryName) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    // Fetch lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('category', categoryName)
      .eq('module_number', parseInt(moduleId))
      .eq('level_number', parseInt(lessonId))
      .single()

    if (lessonError || !lesson) {
      console.error('Lesson error:', lessonError)
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }
    // Get user's first name
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', user.id)
      .single()
    const userName = profile?.first_name || null
    const toneChar = TONE_CHARACTERISTICS[tone] || TONE_CHARACTERISTICS['Normal']
    const systemPrompt = `You are a speaking coach with a specific personality. Your coaching style is defined as:

**Goal**: ${toneChar.goal}
**Communication Style**: ${toneChar.style}
**Delivery Instructions**: ${toneChar.delivery}

Your job is to introduce a speaking lesson in an engaging way that matches this personality perfectly. Keep the introduction natural, motivating, and about 30-45 seconds when spoken aloud (approximately 90-120 words).
Structure your introduction as follows:
1. Warm greeting ${userName ? `(use the name ${userName})` : ''}
2. Briefly explain what the lesson is about and why it matters
3. Clearly state the specific task they'll be practicing
4. Give them a helpful tip or example to guide them
5. End with an encouraging call to action to start recording

CRITICAL: Embody the ${tone} coaching style throughout. ${toneChar.style} ${toneChar.delivery}
Make it conversational and engaging, not robotic. Let your ${tone} personality shine through!`
    const userPrompt = `Create an engaging introduction for this speaking lesson in your ${tone} coaching style:
Lesson Title: ${lesson.level_title || 'Speaking Practice'}
Module: ${lesson.module_title || 'Practice Module'}
Basic Explanation: ${lesson.lesson_explanation || 'Practice your speaking skills'}
Practice Task: ${lesson.practice_prompt || 'Speak clearly and confidently'}
Example/Tips: ${lesson.practice_example || 'Focus on clarity and confidence'}
Focus Areas: ${Array.isArray(lesson.feedback_focus_areas) ? lesson.feedback_focus_areas.join(', ') : 'General speaking'}
Remember: You're a ${tone} coach. ${toneChar.goal}. ${toneChar.style}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.85, // Slightly higher for more personality
      max_tokens: 300
    })
    const enhancedIntro = completion.choices[0].message.content || ''
    const voice = VOICE_MAP[tone] || 'shimmer'
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1-hd', // Using HD for better quality with personality
      voice: voice,
      input: enhancedIntro,
      speed: tone === 'Inspiring' ? 1.05 : tone === 'Bossy' ? 1.1 : tone === 'Supportive' ? 0.95 : 1.0
    })
    const buffer = Buffer.from(await mp3Response.arrayBuffer())
    const audioBase64 = buffer.toString('base64')

    return NextResponse.json({
      audioBase64: audioBase64,
      transcript: enhancedIntro,
      lessonTitle: lesson.level_title || 'Lesson',
      moduleTitle: lesson.module_title || 'Module',
      practicePrompt: lesson.practice_prompt || 'Practice speaking clearly and confidently.', // Changed key name
      practiceExample: lesson.practice_example || ''
    })
    
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate lesson introduction' },
      { status: 500 }
    )
  }
}