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

// Filler patterns
const FILLER_PATTERNS = /\b(um|uh|uhh|umm|erm|like|you know|basically|actually|literally|so yeah|i mean|kind of|sort of|right|okay so|well|anyway)\b/gi

// Quick transcript analysis
function analyzeTranscript(transcript: string, durationSeconds: number) {
  const words = transcript.split(/\s+/).filter(w => w.length > 0)
  const wordCount = words.length
  const wordsPerMinute = durationSeconds > 0 ? Math.round((wordCount / durationSeconds) * 60) : 120
  
  const fillerMatches = transcript.match(FILLER_PATTERNS) || []
  const fillerCount = fillerMatches.length
  const fillerWords = [...new Set(fillerMatches.map(f => f.toLowerCase()))]
  
  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z]/g, '')))
  const vocabularyDiversity = wordCount > 0 ? Math.round((uniqueWords.size / wordCount) * 100) : 50
  
  // Filler penalty
  let fillerPenalty = 0
  if (fillerCount <= 3) fillerPenalty = 0
  else if (fillerCount <= 6) fillerPenalty = 2
  else if (fillerCount <= 10) fillerPenalty = 5
  else if (fillerCount <= 15) fillerPenalty = 8
  else fillerPenalty = 12
  
  return { wordCount, wordsPerMinute, fillerCount, fillerWords, fillerPenalty, vocabularyDiversity }
}

// Parse user agent
function parseUserAgent(userAgent: string) {
  const ua = userAgent.toLowerCase()
  let browser = 'Other'
  if (ua.includes('edg/')) browser = 'Edge'
  else if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome'
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari'
  else if (ua.includes('firefox')) browser = 'Firefox'
  
  let deviceType = 'Desktop'
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) deviceType = 'Mobile'
  else if (ua.includes('tablet') || ua.includes('ipad')) deviceType = 'Tablet'
  
  return { browser, deviceType }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const log = (msg: string) => console.log(`[${Date.now() - startTime}ms] ${msg}`)
  
  try {
    log('📥 API Start')
    
    const userAgent = request.headers.get('user-agent') || ''
    const country = request.headers.get('x-vercel-ip-country') || 'Unknown'
    const city = request.headers.get('x-vercel-ip-city') || 'Unknown'
    const { browser, deviceType } = parseUserAgent(userAgent)
    
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const tone = formData.get('tone') as string || 'Normal'
    const categoryId = formData.get('categoryId') as string
    const moduleId = formData.get('moduleId') as string
    const lessonId = formData.get('lessonId') as string
    const durationStr = formData.get('duration') as string
    const voiceMetricsStr = formData.get('voiceMetrics') as string
    
    const duration = parseFloat(durationStr) || 60

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    const supabase = await createClient()
    const categoryName = categoryMap[categoryId] || 'Public Speaking'
    const levelNumber = parseInt(lessonId) || 1

    // ⚡ PHASE 1: PARALLEL - Auth + Transcription + Lesson (saves ~2s)
    log('⚡ Phase 1: Starting parallel calls')
    
    const [authResult, transcription, lessonResult] = await Promise.all([
      supabase.auth.getUser(),
      openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
      }),
      supabase
        .from('lessons')
        .select('level_title, practice_prompt, feedback_focus_areas')
        .eq('category', categoryName)
        .eq('module_number', parseInt(moduleId) || 1)
        .eq('level_number', levelNumber)
        .single()
    ])
    
    log('✅ Phase 1 complete')

    const user = authResult.data.user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lesson = lessonResult.data
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    const userTranscript = transcription.text
    log(`📝 Transcript: ${userTranscript.substring(0, 50)}...`)
    
    // Analyze transcript (instant)
    const transcriptMetrics = analyzeTranscript(userTranscript, duration)
    
    // Parse voice metrics if provided
    let voiceMetrics: any = null
    if (voiceMetricsStr) {
      try { voiceMetrics = JSON.parse(voiceMetricsStr) } catch (e) {}
    }

    const focusAreas = Array.isArray(lesson.feedback_focus_areas) 
      ? lesson.feedback_focus_areas 
      : ['Clarity', 'Delivery', 'Confidence']

    // ⚡ PHASE 2: GPT FEEDBACK - Use gpt-4o-mini (saves ~5s)
    log('⚡ Phase 2: GPT feedback')
    
    const levelDesc = levelNumber <= 10 ? 'Beginner' : levelNumber <= 30 ? 'Intermediate' : 'Advanced'
    
    // ULTRA SHORT PROMPT - ~300 tokens
    const feedbackPrompt = `Speaking coach. Evaluate and score fairly.

Task: "${lesson.practice_prompt}"
Response: "${userTranscript}"
Level: ${levelNumber}/50 (${levelDesc})
Words: ${transcriptMetrics.wordCount}, WPM: ${transcriptMetrics.wordsPerMinute}, Fillers: ${transcriptMetrics.fillerCount}

Score 0-100 for:
- task_score: Did they address the prompt?
- grammar_score: Grammar correctness for ${levelDesc}
- vocabulary_score: Word choice quality
- delivery_score: Clarity and confidence

Passing is 80+. Be encouraging but honest.

JSON only:
{"task_score":0,"task_addressed":true,"grammar_score":0,"vocabulary_score":0,"delivery_score":0,"overall_score":0,"pass":false,"strengths":["str1","str2"],"improvements":["imp1","imp2"],"feedback":"3-4 encouraging sentences","focus_scores":{"${focusAreas[0]}":0,"${focusAreas[1]}":0,"${focusAreas[2]}":0}}`

    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // 🚀 10x faster than gpt-4o
      messages: [
        { role: 'system', content: 'Speaking coach. Respond with valid JSON only.' },
        { role: 'user', content: feedbackPrompt }
      ],
      temperature: 0.5,
      max_tokens: 400,
      response_format: { type: "json_object" }
    })
    
    log('✅ Phase 2 complete')

    // Parse GPT response
    let gptEval: any = {}
    try {
      gptEval = JSON.parse(gptResponse.choices[0].message.content || '{}')
    } catch (e) {
      log('⚠️ GPT parse error')
      gptEval = {
        task_score: 70, grammar_score: 70, vocabulary_score: 70, delivery_score: 70,
        overall_score: 70, pass: false, task_addressed: true,
        strengths: ['Good effort', 'Completed the task'],
        improvements: ['Keep practicing'],
        feedback: 'Good work! Keep practicing to improve.',
        focus_scores: { [focusAreas[0]]: 70, [focusAreas[1]]: 70, [focusAreas[2]]: 70 }
      }
    }

    // Calculate final scores
    const taskScore = gptEval.task_score || 70
    const grammarScore = gptEval.grammar_score || 70
    const vocabScore = gptEval.vocabulary_score || 70
    let deliveryScore = gptEval.delivery_score || 70
    
    // Use voice metrics if available
    if (voiceMetrics?.deliveryScore) {
      deliveryScore = Math.round((deliveryScore + voiceMetrics.deliveryScore) / 2)
    }
    
    // Apply filler penalty
    deliveryScore = Math.max(0, deliveryScore - transcriptMetrics.fillerPenalty)
    
    const linguisticScore = Math.round((grammarScore * 0.5 + vocabScore * 0.5))
    
    // 40-30-30 weighted
    const weightedScore = Math.round(
      taskScore * 0.40 +
      linguisticScore * 0.30 +
      deliveryScore * 0.30
    )
    
    const overallScore = Math.min(100, Math.max(0, weightedScore))
    const passLevel = overallScore >= 80

    // Build feedback object
    const feedback = {
      task_completion_score: taskScore,
      delivery_score: deliveryScore,
      linguistic_score: linguisticScore,
      overall_score: overallScore,
      weighted_overall_score: weightedScore,
      pass_level: passLevel,
      task_completion_analysis: {
        did_address_task: gptEval.task_addressed ?? true,
        relevance_percentage: taskScore,
        explanation: gptEval.feedback?.substring(0, 100) || 'Good attempt'
      },
      linguistic_analysis: {
        grammar: { score: grammarScore, issues: [], suggestions: [] },
        vocabulary: { score: vocabScore, diversity_score: transcriptMetrics.vocabularyDiversity, advanced_words_used: [] },
        sentence_formation: { score: linguisticScore, complexity_level: levelDesc.toLowerCase(), variety_score: 70, flow_score: 70, issues: [], suggestions: [] }
      },
      filler_analysis: {
        filler_words_count: transcriptMetrics.fillerCount,
        filler_words_detected: transcriptMetrics.fillerWords,
        awkward_pauses_count: voiceMetrics?.longPauseCount || 0,
        repetitive_phrases: [],
        penalty_applied: transcriptMetrics.fillerPenalty
      },
      voice_metrics: voiceMetrics ? {
        confidence_score: voiceMetrics.confidenceScore,
        delivery_score: voiceMetrics.deliveryScore,
        pace_score: voiceMetrics.paceScore,
        volume_stability: voiceMetrics.volumeStability,
        pause_count: voiceMetrics.pauseCount,
        strategic_pauses: voiceMetrics.strategicPauseCount,
        long_pauses: voiceMetrics.longPauseCount
      } : null,
      strengths: gptEval.strengths || ['Good effort', 'Completed the task'],
      improvements: gptEval.improvements || ['Keep practicing'],
      detailed_feedback: gptEval.feedback || 'Good work! Keep practicing.',
      focus_area_scores: gptEval.focus_scores || { [focusAreas[0]]: 70, [focusAreas[1]]: 70, [focusAreas[2]]: 70 }
    }

    // ⚡ PHASE 3: Save to DB
    log('⚡ Phase 3: Saving to DB')
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const [sessionResult, progressResult] = await Promise.all([
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
        user_city: city,
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

    if (sessionResult.error) {
      log(`❌ Session save error: ${sessionResult.error.message}`)
    }
    
    log('✅ Phase 3 complete')

    // 🔄 BACKGROUND: Generate AI example (non-blocking)
    generateAIExampleBackground(sessionId, lesson.practice_prompt, levelNumber, toneVoiceMap[tone] || 'shimmer')

    const totalTime = Date.now() - startTime
    log(`🎉 DONE in ${totalTime}ms`)
    
    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      practice_prompt: lesson.practice_prompt,
      processingTime: totalTime,
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
      { error: 'Failed to process', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

// Background AI example generation (doesn't block response)
async function generateAIExampleBackground(sessionId: string, prompt: string, level: number, voice: string) {
  try {
    const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    // Generate example text
    const exampleResponse = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Create a natural speaking example. 60-100 words only.' },
        { role: 'user', content: `Task: ${prompt}` }
      ],
      max_tokens: 150,
    })
    
    const exampleText = exampleResponse.choices[0].message.content || ''
    
    // Generate audio
    const audioResponse = await openaiClient.audio.speech.create({
      model: 'tts-1',
      voice: voice as any,
      input: exampleText,
      speed: 0.95
    })
    
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer())
    
    // Update session
    const supabase = await createClient()
    await supabase
      .from('sessions')
      .update({
        ai_example_text: exampleText,
        ai_example_audio: audioBuffer.toString('base64')
      })
      .eq('id', sessionId)
    
    console.log(`✅ Background: AI example saved for ${sessionId}`)
  } catch (err) {
    console.error('⚠️ Background AI example failed:', err)
  }
}