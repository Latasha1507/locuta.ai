import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const categoryMap: { [key: string]: string } = {
  'public-speaking': 'Public Speaking',
  'storytelling': 'Storytelling',
  'creator-speaking': 'Creator Speaking',
  'casual-conversation': 'Casual Conversation',
  'workplace-communication': 'Workplace Communication',
  'investor-pitch': 'Investor Pitch',
}

const toneVoiceMap: { [key: string]: string } = {
  'Normal': 'shimmer',
  'Supportive': 'nova',
  'Inspiring': 'sage',
  'Funny': 'coral',
  'Diplomatic': 'nova',
  'Bossy': 'ash',
}

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Feedback API called')
    
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const tone = formData.get('tone') as string
    const categoryId = formData.get('categoryId') as string
    const moduleId = formData.get('moduleId') as string
    const lessonId = formData.get('lessonId') as string

    console.log('📝 Request params:', { tone, categoryId, moduleId, lessonId })

    if (!audioFile) {
      console.error('❌ No audio file')
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error('❌ No user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ User authenticated:', user.id)

    const categoryName = categoryMap[categoryId]

    // Get lesson details
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('category', categoryName)
      .eq('module_number', parseInt(moduleId))
      .eq('level_number', parseInt(lessonId))
      .single()

    if (lessonError || !lesson) {
      console.error('❌ Lesson not found:', lessonError)
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    console.log('✅ Lesson found:', lesson.level_title)

    // Step 1: Transcribe audio
    console.log('🎤 Transcribing audio...')
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    })

    const userTranscript = transcription.text
    console.log('✅ Transcription:', userTranscript.substring(0, 100) + '...')

    // Step 2: Generate feedback
    console.log('💬 Generating feedback...')
    
    const feedbackPrompt = `You are an expert speaking coach. Analyze this practice session and respond ONLY with valid JSON.

Lesson: ${lesson.level_title}
Task: ${lesson.practice_prompt}
Focus Areas: ${lesson.feedback_focus_areas?.join(', ') || 'General speaking skills'}

User's Response: "${userTranscript}"

Respond with this EXACT JSON structure:
{
  "overall_score": 85,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "detailed_feedback": "Detailed paragraph here",
  "focus_area_scores": {
    "Clarity": 80,
    "Confidence": 85,
    "Delivery": 90
  }
}

Be encouraging but honest. Give specific feedback.`

    const feedbackResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert speaking coach. Respond ONLY with valid JSON, no markdown.' },
        { role: 'user', content: feedbackPrompt }
      ],
      temperature: 0.7,
    })

    let feedback
    try {
      const feedbackText = feedbackResponse.choices[0].message.content || '{}'
      const cleanedText = feedbackText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      feedback = JSON.parse(cleanedText)
      console.log('✅ Feedback generated:', feedback.overall_score)
    } catch (e) {
      console.error('⚠️ Failed to parse feedback, using default')
      feedback = {
        overall_score: 75,
        strengths: ['Good effort', 'Clear speaking', 'Engaged with task'],
        improvements: ['Practice more', 'Work on pacing', 'Add more detail'],
        detailed_feedback: 'You did well! Keep practicing to improve your speaking skills. Focus on clarity and confidence.',
        focus_area_scores: {
          'Clarity': 75,
          'Confidence': 75,
          'Delivery': 75
        }
      }
    }

    // Step 3: Generate AI example
    console.log('🤖 Generating AI example...')
    
    const aiExamplePrompt = `Create a perfect example response for this task. Respond with ONLY the speech text, no explanations.

Task: ${lesson.practice_prompt}
Context: ${lesson.practice_example}

Create a natural, conversational response (30-60 seconds when spoken).`

    const aiExampleResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are demonstrating excellent public speaking.' },
        { role: 'user', content: aiExamplePrompt }
      ],
      temperature: 0.8,
    })

    const aiExampleText = aiExampleResponse.choices[0].message.content || 'Example not available.'
    console.log('✅ AI example generated')

    // Step 4: Generate audio of AI example
    console.log('🔊 Generating AI audio...')
    const voice = toneVoiceMap[tone] || 'shimmer'
    const aiAudioResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice as any,
      input: aiExampleText,
    })

    const aiAudioBuffer = Buffer.from(await aiAudioResponse.arrayBuffer())
    console.log('✅ AI audio generated')

    // Step 5: Save to database
    console.log('💾 Saving to database...')
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const { error: insertError } = await supabase
      .from('sessions')
      .insert({
        id: sessionId,
        user_id: user.id,
        category: categoryName,
        module_number: parseInt(moduleId),
        lesson_number: parseInt(lessonId),
        tone: tone,
        user_transcript: userTranscript,
        ai_example_text: aiExampleText,
        ai_example_audio: aiAudioBuffer.toString('base64'),
        feedback: feedback,
        overall_score: feedback.overall_score,
        created_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('❌ Database error:', insertError)
      return NextResponse.json({ error: 'Failed to save session', details: insertError.message }, { status: 500 })
    }

    console.log('✅ Session saved:', sessionId)

    // Step 6: Update progress
    console.log('📊 Updating progress...')
    await supabase
      .from('user_progress')
      .upsert({
        user_id: user.id,
        category: categoryName,
        module_number: parseInt(moduleId),
        lesson_number: parseInt(lessonId),
        completed: true,
        best_score: feedback.overall_score,
        last_practiced: new Date().toISOString(),
      }, {
        onConflict: 'user_id,category,module_number,lesson_number'
      })

    console.log('✅ Progress updated')
    console.log('🎉 Feedback complete!')

    return NextResponse.json({
      success: true,
      sessionId: sessionId,
    })

  } catch (error) {
    console.error('❌ Feedback API error:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      { 
        error: 'Failed to process feedback', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
