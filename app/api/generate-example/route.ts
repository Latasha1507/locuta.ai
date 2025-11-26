// app/api/generate-example/route.ts
// Separate endpoint for AI example generation - called by client after feedback

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const toneVoiceMap: { [key: string]: string } = {
  'Normal': 'shimmer',
  'Supportive': 'nova',
  'Inspiring': 'fable',
  'Funny': 'onyx',
  'Diplomatic': 'nova',
  'Bossy': 'echo',
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { sessionId, prompt, level, tone } = await request.json()
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Verify user owns this session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if session exists and belongs to user
    const { data: session } = await supabase
      .from('sessions')
      .select('id, ai_example_text, ai_example_audio, user_id')
      .eq('id', sessionId)
      .single()
    
    if (!session || session.user_id !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // If already generated, return existing
    if (session.ai_example_text && session.ai_example_audio) {
      return NextResponse.json({
        success: true,
        alreadyGenerated: true,
        text: session.ai_example_text,
        audioLength: session.ai_example_audio.length,
        processingTime: Date.now() - startTime
      })
    }

    // Generate example text
    const exampleResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Create a natural 60-80 word speaking example. Just the speech text, nothing else.' },
        { role: 'user', content: `Task: ${prompt?.substring(0, 200) || 'Practice speaking clearly'}` }
      ],
      max_tokens: 120,
      temperature: 0.8
    })
    
    const exampleText = exampleResponse.choices[0].message.content || 'Example not available.'
    console.log(`✅ AI Example text generated in ${Date.now() - startTime}ms`)

    // Generate TTS audio
    const voice = toneVoiceMap[tone || 'Normal'] || 'shimmer'
    const audioResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice as any,
      input: exampleText,
      speed: 0.95
    })
    
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer())
    const audioBase64 = audioBuffer.toString('base64')
    console.log(`✅ AI Audio generated in ${Date.now() - startTime}ms`)

    // Update session
    await supabase
      .from('sessions')
      .update({
        ai_example_text: exampleText,
        ai_example_audio: audioBase64
      })
      .eq('id', sessionId)

    const totalTime = Date.now() - startTime
    console.log(`✅ Total AI example generation: ${totalTime}ms`)

    return NextResponse.json({
      success: true,
      text: exampleText,
      audio: audioBase64,
      processingTime: totalTime
    })

  } catch (error) {
    console.error('❌ Generate example error:', error)
    return NextResponse.json(
      { error: 'Failed to generate example', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

// GET endpoint to check status
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId')
  
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
  }

  const supabase = await createClient()
  
  const { data: session } = await supabase
    .from('sessions')
    .select('ai_example_text, ai_example_audio')
    .eq('id', sessionId)
    .single()
  
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json({
    hasText: !!session.ai_example_text,
    hasAudio: !!session.ai_example_audio,
    textLength: session.ai_example_text?.length || 0,
    audioLength: session.ai_example_audio?.length || 0
  })
}