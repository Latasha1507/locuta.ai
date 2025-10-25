import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Category mapping - MUST match your Supabase database exactly
const CATEGORY_MAP: Record<string, string> = {
  'public-speaking': 'Public Speaking',
  'storytelling': 'Storytelling',
  'creator-speaking': 'Creator Speaking',
  'casual-conversation': 'Casual Conversation',
  'workplace-communication': 'Workplace Communication',
  'pitch-anything': 'Pitch Anything',
}

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

    console.log('📥 Lesson intro request:', { tone, categoryId, moduleId, lessonId })

    // Convert category ID to database name using map
    const categoryName = CATEGORY_MAP[categoryId]
    
    if (!categoryName) {
      console.error('❌ Invalid category ID:', categoryId)
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    console.log('🔍 Looking for lesson:', { categoryName, moduleId, lessonId })

    // Fetch lesson from database
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('level_title, module_title, lesson_explanation, practice_prompt, practice_example, feedback_focus_areas')
      .eq('category', categoryName)
      .eq('module_number', parseInt(moduleId))
      .eq('level_number', parseInt(lessonId))
      .single()

    if (lessonError) {
      console.error('❌ Lesson query error:', lessonError)
      return NextResponse.json({ error: 'Lesson not found', details: lessonError.message }, { status: 404 })
    }

    if (!lesson) {
      console.error('❌ No lesson found')
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    console.log('✅ Lesson found:', lesson.level_title)
    console.log('🔍 practice_prompt value:', lesson.practice_prompt)
    console.log('🔍 All lesson keys:', Object.keys(lesson))

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

Focus Areas: ${Array.isArray(lesson.feedback_focus_areas) ? lesson.feedback_focus_areas.join(', ') : lesson.feedback_focus_areas}

Remember: Be ${toneDescription} and make this introduction feel like a real coach talking to the learner!`

    console.log('🤖 Generating intro with GPT-4o...')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 300
    })

    const enhancedIntro = completion.choices[0].message.content || ''
    console.log('✅ Intro generated:', enhancedIntro.substring(0, 100) + '...')

    // Generate audio using OpenAI TTS with the tone-specific voice
    const voice = VOICE_MAP[tone] || 'shimmer'
    
    console.log('🔊 Generating audio with voice:', voice)

    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: enhancedIntro,
      speed: 1.0
    })

    // Convert audio to base64
    const buffer = Buffer.from(await mp3Response.arrayBuffer())
    const audioBase64 = buffer.toString('base64')

    console.log('✅ Audio generated successfully')

    return NextResponse.json({
      audioBase64: audioBase64,
      transcript: enhancedIntro,
      lessonTitle: lesson.level_title,
      moduleTitle: lesson.module_title,
      practice_prompt: lesson.practice_prompt,
      practice_example: lesson.practice_example  // Keep this for now
    })

  } catch (error) {
    console.error('❌ Error generating lesson intro:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      { 
        error: 'Failed to generate lesson introduction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}