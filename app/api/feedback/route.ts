// app/api/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

// For Vercel - increase timeout
export const maxDuration = 30

// Reuse OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const categoryMap: { [key: string]: string } = {
  'public-speaking': 'Public Speaking',
  'storytelling': 'Storytelling',
  'creator-speaking': 'Creator Speaking',
  'casual-conversation': 'Casual Conversation',
  'workplace-communication': 'Workplace Communication',
  'pitch-anything': 'Pitch Anything',
}

const toneVoiceMap: { [key: string]: string } = {
  'Normal': 'shimmer',
  'Supportive': 'nova',
  'Inspiring': 'fable',
  'Funny': 'onyx',
  'Diplomatic': 'nova',
  'Bossy': 'echo',
}

// Filler detection
const FILLER_REGEX = /\b(um|uh|uhh|umm|like|you know|basically|actually|literally|i mean|kind of|sort of)\b/gi

export async function POST(request: NextRequest) {
  const START = Date.now()
  const timing: Record<string, number> = {}
  const log = (step: string) => {
    const now = Date.now()
    timing[step] = now - START
    console.log(`⏱️ [${timing[step]}ms] ${step}`)
  }
  
  try {
    log('START')
    
    // Parse form data
    const formData = await request.formData()
    log('FormData parsed')
    
    const audioFile = formData.get('audio') as File
    const tone = formData.get('tone') as string || 'Normal'
    const categoryId = formData.get('categoryId') as string || 'public-speaking'
    const moduleId = formData.get('moduleId') as string || '1'
    const lessonId = formData.get('lessonId') as string || '1'
    const durationStr = formData.get('duration') as string
    const voiceMetricsStr = formData.get('voiceMetrics') as string
    
    const duration = parseFloat(durationStr) || 60

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 })
    }

    const supabase = await createClient()
    log('Supabase client created')
    
    const categoryName = categoryMap[categoryId] || 'Public Speaking'
    const levelNumber = parseInt(lessonId) || 1

    // ============================================
    // ⚡ PHASE 1: PARALLEL CALLS
    // ============================================
    const phase1Start = Date.now()
    
    const [authResult, transcriptionResult, lessonResult] = await Promise.all([
      // Auth
      supabase.auth.getUser(),
      
      // Whisper - this is the slowest part (~2-3s)
      openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
      }),
      
      // Lesson fetch
      supabase
        .from('lessons')
        .select('level_title, practice_prompt, feedback_focus_areas')
        .eq('category', categoryName)
        .eq('module_number', parseInt(moduleId) || 1)
        .eq('level_number', levelNumber)
        .single()
    ])
    
    log(`PHASE 1 complete (parallel) - took ${Date.now() - phase1Start}ms`)

    const user = authResult.data.user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    log('Auth verified')

    const lesson = lessonResult.data
    if (!lesson) {
      // Fallback if lesson not found
      console.warn('Lesson not found, using defaults')
    }
    
    const userTranscript = transcriptionResult.text
    const practicePrompt = lesson?.practice_prompt || 'Practice speaking clearly'
    log(`Transcript: "${userTranscript.substring(0, 50)}..."`)

    // ============================================
    // ⚡ QUICK ANALYSIS (NO API CALL)
    // ============================================
    const words = userTranscript.split(/\s+/).filter(w => w.length > 0)
    const wordCount = words.length
    const wordsPerMinute = duration > 0 ? Math.round((wordCount / duration) * 60) : 120
    const fillerMatches = userTranscript.match(FILLER_REGEX) || []
    const fillerCount = fillerMatches.length
    const fillerWords = [...new Set(fillerMatches.map(f => f.toLowerCase()))]
    const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z]/g, '')))
    const vocabDiversity = wordCount > 0 ? Math.round((uniqueWords.size / wordCount) * 100) : 50
    
    // Filler penalty
    let fillerPenalty = 0
    if (fillerCount > 3) fillerPenalty = Math.min(12, Math.floor((fillerCount - 3) / 2) * 2)
    
    log('Quick analysis done')

    // Parse voice metrics if provided
    let voiceMetrics: any = null
    if (voiceMetricsStr) {
      try { voiceMetrics = JSON.parse(voiceMetricsStr) } catch {}
    }

    const focusAreas = Array.isArray(lesson?.feedback_focus_areas) 
      ? lesson.feedback_focus_areas 
      : ['Clarity', 'Delivery', 'Confidence']

    // ============================================
    // ⚡ PHASE 2: GPT-4O-MINI (Fast!)
    // ============================================
    const phase2Start = Date.now()
    
    // MINIMAL PROMPT - ~200 tokens input
    const prompt = `Rate this speaking response 0-100. Be encouraging.
Task: "${practicePrompt.substring(0, 100)}"
Response: "${userTranscript.substring(0, 500)}"
Level: ${levelNumber <= 10 ? 'Beginner' : levelNumber <= 30 ? 'Intermediate' : 'Advanced'}

JSON only: {"task":0-100,"grammar":0-100,"vocabulary":0-100,"delivery":0-100,"strengths":["s1","s2"],"improvements":["i1","i2"],"feedback":"2-3 sentences"}`

    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // MUST be gpt-4o-mini for speed
      messages: [
        { role: 'system', content: 'Speaking coach. JSON only. Be encouraging.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 300, // Limit output
      response_format: { type: "json_object" }
    })
    
    log(`PHASE 2 complete (GPT) - took ${Date.now() - phase2Start}ms`)

    // Parse response
    let gpt: any = { task: 70, grammar: 70, vocabulary: 70, delivery: 70, strengths: [], improvements: [], feedback: '' }
    try {
      gpt = JSON.parse(gptResponse.choices[0].message.content || '{}')
    } catch (e) {
      console.warn('GPT parse failed, using defaults')
    }

    // Calculate final scores
    const taskScore = Math.min(100, Math.max(0, gpt.task || 70))
    const grammarScore = Math.min(100, Math.max(0, gpt.grammar || 70))
    const vocabScore = Math.min(100, Math.max(0, gpt.vocabulary || 70))
    let deliveryScore = Math.min(100, Math.max(0, gpt.delivery || 70))
    
    // Apply voice metrics if available
    if (voiceMetrics?.deliveryScore) {
      deliveryScore = Math.round((deliveryScore + voiceMetrics.deliveryScore) / 2)
    }
    
    // Apply filler penalty
    deliveryScore = Math.max(0, deliveryScore - fillerPenalty)
    
    const linguisticScore = Math.round((grammarScore + vocabScore) / 2)
    
    // 40-30-30 weighted
    const overallScore = Math.round(
      taskScore * 0.40 +
      linguisticScore * 0.30 +
      deliveryScore * 0.30
    )
    const passLevel = overallScore >= 80

    log('Scores calculated')

    // Build feedback object
    const feedback = {
      task_completion_score: taskScore,
      delivery_score: deliveryScore,
      linguistic_score: linguisticScore,
      overall_score: overallScore,
      weighted_overall_score: overallScore,
      pass_level: passLevel,
      task_completion_analysis: {
        did_address_task: taskScore >= 50,
        relevance_percentage: taskScore,
        explanation: gpt.feedback?.substring(0, 100) || 'Good attempt at the task.'
      },
      linguistic_analysis: {
        grammar: { score: grammarScore, issues: [], suggestions: [] },
        vocabulary: { score: vocabScore, diversity_score: vocabDiversity, advanced_words_used: [] },
        sentence_formation: { score: linguisticScore, complexity_level: levelNumber <= 10 ? 'beginner' : levelNumber <= 30 ? 'intermediate' : 'advanced', variety_score: 70, flow_score: 70, issues: [], suggestions: [] }
      },
      filler_analysis: {
        filler_words_count: fillerCount,
        filler_words_detected: fillerWords,
        awkward_pauses_count: voiceMetrics?.longPauseCount || 0,
        repetitive_phrases: [],
        penalty_applied: fillerPenalty
      },
      voice_metrics: voiceMetrics || null,
      strengths: gpt.strengths?.length > 0 ? gpt.strengths : ['Good effort', 'Completed the task'],
      improvements: gpt.improvements?.length > 0 ? gpt.improvements : ['Keep practicing'],
      detailed_feedback: gpt.feedback || 'Good work! Keep practicing to improve your speaking skills.',
      focus_area_scores: {
        [focusAreas[0]]: taskScore,
        [focusAreas[1]]: deliveryScore,
        [focusAreas[2]]: linguisticScore
      }
    }

    // ============================================
    // ⚡ PHASE 3: SAVE TO DB (Parallel)
    // ============================================
    const phase3Start = Date.now()
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Get user agent info
    const userAgent = request.headers.get('user-agent') || ''
    const ua = userAgent.toLowerCase()
    let browser = 'Other'
    if (ua.includes('chrome')) browser = 'Chrome'
    else if (ua.includes('safari')) browser = 'Safari'
    else if (ua.includes('firefox')) browser = 'Firefox'
    const deviceType = ua.includes('mobile') ? 'Mobile' : 'Desktop'
    const country = request.headers.get('x-vercel-ip-country') || 'Unknown'

    await Promise.all([
      supabase.from('sessions').insert({
        id: sessionId,
        user_id: user.id,
        category: categoryName,
        module_number: parseInt(moduleId) || 1,
        level_number: levelNumber,
        tone: tone,
        user_transcript: userTranscript,
        ai_example_text: '',
        ai_example_audio: '',
        feedback: feedback,
        overall_score: overallScore,
        status: 'completed',
        browser_type: browser,
        device_type: deviceType,
        user_country: country,
        user_city: request.headers.get('x-vercel-ip-city') || 'Unknown',
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }),
      supabase.from('user_progress').upsert({
        user_id: user.id,
        category: categoryName,
        module_number: parseInt(moduleId) || 1,
        lesson_number: levelNumber,
        completed: passLevel,
        best_score: overallScore,
        last_practiced: new Date().toISOString(),
      }, { onConflict: 'user_id,category,module_number,lesson_number' })
    ])
    
    log(`PHASE 3 complete (DB) - took ${Date.now() - phase3Start}ms`)

    // Note: AI Example is generated via separate /api/generate-example endpoint
    // This is called by the client after receiving this response

    const totalTime = Date.now() - START
    log(`✅ TOTAL TIME: ${totalTime}ms`)
    
    // Log timing breakdown
    console.log('📊 TIMING BREAKDOWN:', timing)
    
    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      practice_prompt: practicePrompt,
      processingTime: totalTime,
      apiVersion: 'v3-ultra-optimized', // Version identifier
      timing: timing,
      quickFeedback: {
        score: overallScore,
        passed: passLevel,
        message: feedback.detailed_feedback,
        task: taskScore,
        delivery: deliveryScore,
        linguistic: linguisticScore
      }
    })

  } catch (error) {
    console.error('❌ API Error:', error)
    return NextResponse.json(
      { error: 'Failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}