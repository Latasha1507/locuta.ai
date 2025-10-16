import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Voice mapping for different tones
const VOICE_MAP: Record<string, 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'> = {
  'Normal': 'shimmer',
  'Supportive': 'nova',
  'Inspiring': 'fable',
  'Funny': 'onyx',
  'Diplomatic': 'nova',
  'Bossy': 'echo'
}

// Tone descriptions for AI
const TONE_DESCRIPTIONS: Record<string, string> = {
  'Normal': 'friendly, clear, and professional',
  'Supportive': 'warm, encouraging, and empathetic',
  'Inspiring': 'motivational, enthusiastic, and uplifting',
  'Funny': 'witty, lighthearted, and engaging with appropriate humor',
  'Diplomatic': 'tactful, balanced, and thoughtful',
  'Bossy': 'direct, commanding, and no-nonsense'
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tone, categoryId, moduleId, lessonId } = body

    // Convert category ID format to database format
    const categoryName = categoryId
      .split('-')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    // Fetch lesson from database
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('category', categoryName)
      .eq('module_number', parseInt(moduleId))
      .eq('level_number', parseInt(lessonId))
      .single()

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // Get user's first name if available
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', user.id)
      .single()

    const userName = profile?.first_name || null

    // Generate enhanced lesson introduction using GPT-4o
    const toneDescription = TONE_DESCRIPTIONS[tone] || 'friendly and professional'
    
    const systemPrompt = `You are a ${toneDescription} speaking coach. Your job is to introduce a speaking lesson in an engaging, conversational way. 

Your tone should be ${toneDescription}. Keep the introduction natural, motivating, and about 30-45 seconds when spoken aloud (approximately 90-120 words).

Structure your introduction as follows:
1. Warm greeting ${userName ? `(use the name ${userName})` : ''}
2. Briefly explain what the lesson is about and why it matters
3. Clearly state the specific task they'll be practicing
4. Give them a helpful tip or example to guide them
5. End with an encouraging call to action to start recording

Make it conversational and engaging, not robotic. Avoid overly formal language unless the tone calls for it.`

    const userPrompt = `Create an engaging introduction for this speaking lesson:

Lesson Title: ${lesson.level_title}
Module: ${lesson.module_title}

Basic Explanation: ${lesson.lesson_explanation}

Practice Task: ${lesson.practice_prompt}

Example/Tips: ${lesson.practice_example}

Focus Areas: ${lesson.feedback_focus_areas?.join(', ')}

Remember: Be ${toneDescription} and make this introduction feel like a real coach talking to the learner!`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8, // More creative for varied introductions
      max_tokens: 300
    })

    const enhancedIntro = completion.choices[0].message.content || ''

    // Generate audio using OpenAI TTS with the tone-specific voice
    const voice = VOICE_MAP[tone] || 'shimmer'
    
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: enhancedIntro,
      speed: 1.0
    })

    // Convert audio to base64
    const buffer = Buffer.from(await mp3Response.arrayBuffer())
    const audioBase64 = buffer.toString('base64')

    return NextResponse.json({
      audioBase64: audioBase64,
      transcript: enhancedIntro,
      lessonTitle: lesson.level_title,
      moduleTitle: lesson.module_title
    })

  } catch (error) {
    console.error('Error generating lesson intro:', error)
    return NextResponse.json(
      { error: 'Failed to generate lesson introduction' },
      { status: 500 }
    )
  }
}