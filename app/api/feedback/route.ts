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

// ============================================
// SCORING WEIGHTS (40-30-30)
// ============================================
const WEIGHTS = {
  TASK: 0.40,       // Content/relevance (GPT evaluates)
  LINGUISTIC: 0.30, // Grammar/vocab (GPT evaluates)
  DELIVERY: 0.30,   // Voice metrics (Pre-calculated from Web Audio API)
}

// Filler patterns for transcript analysis
const FILLER_PATTERNS = /\b(um|uh|uhh|umm|erm|like|you know|basically|actually|literally|so yeah|i mean|kind of|sort of|right|okay so|well|anyway)\b/gi

// ============================================
// VOICE METRICS INTERFACE (from Web Audio API)
// ============================================
interface VoiceMetrics {
  currentVolume: number
  averageVolume: number
  volumeStability: number
  speakingTimeMs: number
  silenceTimeMs: number
  speakingRatio: number
  pauseCount: number
  averagePauseDuration: number
  longPauseCount: number
  strategicPauseCount: number
  pitchStability: number
  averagePitch: number
  pitchRange: number
  volumeDropCount: number
  trailingOffCount: number
  confidenceScore: number
  deliveryScore: number
  paceScore: number
}

// ============================================
// TRANSCRIPT ANALYSIS (Runs in parallel)
// ============================================
function analyzeTranscript(transcript: string, durationSeconds: number) {
  const words = transcript.split(/\s+/).filter(w => w.length > 0)
  const wordCount = words.length
  const wordsPerMinute = durationSeconds > 0 ? Math.round((wordCount / durationSeconds) * 60) : 0
  
  // Filler analysis
  const fillerMatches = transcript.match(FILLER_PATTERNS) || []
  const fillerCount = fillerMatches.length
  const fillerWords = [...new Set(fillerMatches.map(f => f.toLowerCase()))]
  
  // Vocabulary diversity
  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z]/g, '')))
  const diversityRatio = wordCount > 0 ? uniqueWords.size / wordCount : 0
  
  // Sentence analysis
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0
  
  // Repetition detection
  const wordFreq: Record<string, number> = {}
  words.forEach(w => {
    const normalized = w.toLowerCase().replace(/[^a-z]/g, '')
    if (normalized.length > 3) {
      wordFreq[normalized] = (wordFreq[normalized] || 0) + 1
    }
  })
  const repetitions = Object.entries(wordFreq).filter(([, c]) => c > 2)
  
  // Calculate filler penalty
  let fillerPenalty = 0
  if (fillerCount <= 3) fillerPenalty = 0
  else if (fillerCount <= 6) fillerPenalty = 2
  else if (fillerCount <= 10) fillerPenalty = 5
  else if (fillerCount <= 15) fillerPenalty = 8
  else if (fillerCount <= 20) fillerPenalty = 12
  else fillerPenalty = 15
  
  return {
    wordCount,
    wordsPerMinute,
    fillerCount,
    fillerWords,
    fillerPenalty,
    vocabularyDiversity: Math.round(diversityRatio * 100),
    sentenceCount: sentences.length,
    avgSentenceLength: Math.round(avgSentenceLength),
    repetitions: repetitions.map(([word, count]) => ({ word, count })),
  }
}

// ============================================
// LEVEL EXPECTATIONS
// ============================================
function getLevelContext(levelNumber: number): string {
  if (levelNumber <= 10) {
    return 'BEGINNER: Accept basic grammar, simple vocabulary, encourage attempts'
  } else if (levelNumber <= 30) {
    return 'INTERMEDIATE: Expect consistent tenses, varied vocabulary, compound sentences'
  } else {
    return 'ADVANCED: Expect sophisticated grammar, rich vocabulary, complex sentences'
  }
}

// ============================================
// OPTIMIZED GPT PROMPT (Content + Linguistic ONLY)
// ============================================
function buildEvaluationPrompt(
  transcript: string,
  task: string,
  levelNumber: number,
  transcriptMetrics: ReturnType<typeof analyzeTranscript>,
  focusAreas: string[]
): string {
  const levelContext = getLevelContext(levelNumber)
  
  // Minimal, focused prompt - GPT only evaluates CONTENT & LANGUAGE
  return `Evaluate this speaking response for CONTENT and LANGUAGE only.

TASK: "${task}"
RESPONSE: "${transcript}"
LEVEL: ${levelNumber}/50 (${levelContext})
STATS: ${transcriptMetrics.wordCount} words, ${transcriptMetrics.sentenceCount} sentences, ${transcriptMetrics.fillerCount} fillers

Evaluate:
1. TASK COMPLETION (0-100): Did they address the prompt? Relevant? Complete?
2. LINGUISTIC QUALITY (0-100): Grammar accuracy, vocabulary appropriateness, sentence variety

Scoring: 60-69=adequate, 70-79=good, 80-89=very good, 90+=excellent

Respond with JSON only:
{
  "task_score": 0-100,
  "task_addressed": true/false,
  "task_explanation": "1 sentence",
  "linguistic_score": 0-100,
  "grammar_score": 0-100,
  "vocabulary_score": 0-100,
  "sentence_variety_score": 0-100,
  "linguistic_notes": "1 sentence",
  "strengths": ["2-3 specific positives"],
  "improvements": ["2-3 actionable tips"],
  "feedback": "4-5 encouraging sentences with specific observations",
  "focus_scores": {"${focusAreas[0]}": 0-100, "${focusAreas[1]}": 0-100, "${focusAreas[2]}": 0-100}
}`
}

// ============================================
// COMBINE SCORES (GPT + Voice Metrics)
// ============================================
function calculateFinalScores(
  gptScores: { task_score: number; linguistic_score: number },
  voiceMetrics: VoiceMetrics | null,
  transcriptMetrics: ReturnType<typeof analyzeTranscript>
): { overall: number; delivery: number; weighted: number; pass: boolean } {
  
  // Delivery score: Use voice metrics if available, otherwise estimate from transcript
  let deliveryScore: number
  
  if (voiceMetrics && voiceMetrics.deliveryScore > 0) {
    // Real voice metrics from Web Audio API
    deliveryScore = voiceMetrics.deliveryScore
  } else {
    // Fallback: Estimate from transcript (less accurate but functional)
    const fluencyFromFillers = Math.max(50, 100 - transcriptMetrics.fillerPenalty * 3)
    const paceFromWPM = calculatePaceScore(transcriptMetrics.wordsPerMinute)
    deliveryScore = fluencyFromFillers * 0.6 + paceFromWPM * 0.4
  }
  
  // Apply filler penalty
  deliveryScore = Math.max(0, deliveryScore - transcriptMetrics.fillerPenalty)
  
  // Weighted calculation
  const weighted = (
    gptScores.task_score * WEIGHTS.TASK +
    gptScores.linguistic_score * WEIGHTS.LINGUISTIC +
    deliveryScore * WEIGHTS.DELIVERY
  )
  
  const overall = Math.round(weighted)
  const pass = overall >= 80
  
  return { overall, delivery: Math.round(deliveryScore), weighted, pass }
}

function calculatePaceScore(wpm: number): number {
  // Optimal: 120-150 WPM
  if (wpm >= 120 && wpm <= 150) return 95
  if (wpm >= 100 && wpm < 120) return 85
  if (wpm >= 150 && wpm <= 170) return 85
  if (wpm >= 80 && wpm < 100) return 70
  if (wpm > 170 && wpm <= 200) return 70
  if (wpm < 80) return Math.max(40, 40 + wpm / 2)
  return Math.max(50, 100 - (wpm - 200) / 2)
}

// ============================================
// MAIN API HANDLER
// ============================================
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const log = (msg: string) => console.log(`⏱️ [${Date.now() - startTime}ms] ${msg}`)
  
  try {
    log('📥 Feedback API called')
    
    // Parse form data
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const tone = formData.get('tone') as string
    const categoryId = formData.get('categoryId') as string
    const moduleId = formData.get('moduleId') as string
    const lessonId = formData.get('lessonId') as string
    const durationStr = formData.get('duration') as string
    const voiceMetricsStr = formData.get('voiceMetrics') as string
    
    const duration = parseFloat(durationStr) || 60
    let voiceMetrics: VoiceMetrics | null = null
    
    try {
      if (voiceMetricsStr) {
        voiceMetrics = JSON.parse(voiceMetricsStr)
        log('✅ Voice metrics received from client')
      }
    } catch (e) {
      log('⚠️ Failed to parse voice metrics, will estimate from transcript')
    }

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    const supabase = await createClient()
    const categoryName = categoryMap[categoryId]
    const levelNumber = parseInt(lessonId)

    // ============================================
    // ⚡ PHASE 1: PARALLEL - Auth + Transcription + Lesson
    // ============================================
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
        .eq('module_number', parseInt(moduleId))
        .eq('level_number', levelNumber)
        .single()
    ])
    
    log('✅ Phase 1 complete (auth + transcription + lesson)')

    const user = authResult.data.user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lesson = lessonResult.data
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    const userTranscript = transcription.text
    
    // ============================================
    // ⚡ PHASE 2: PARALLEL - Transcript Analysis + GPT Evaluation
    // ============================================
    const transcriptMetrics = analyzeTranscript(userTranscript, duration)
    log('✅ Transcript analysis complete')
    
    const focusAreas = Array.isArray(lesson.feedback_focus_areas) 
      ? lesson.feedback_focus_areas 
      : ['Clarity', 'Delivery', 'Confidence']

    const evaluationPrompt = buildEvaluationPrompt(
      userTranscript,
      lesson.practice_prompt,
      levelNumber,
      transcriptMetrics,
      focusAreas
    )

    // 🎯 Use gpt-4o for QUALITY but with minimal prompt
    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'You are a speaking coach. Evaluate content and language. Be encouraging but honest. Respond with valid JSON only.'
        },
        { role: 'user', content: evaluationPrompt }
      ],
      temperature: 0.5,
      max_tokens: 600,
      response_format: { type: "json_object" }
    })
    
    log('✅ GPT evaluation complete')

    // ============================================
    // PARSE GPT RESPONSE
    // ============================================
    let gptEvaluation
    try {
      gptEvaluation = JSON.parse(gptResponse.choices[0].message.content || '{}')
    } catch (e) {
      log('⚠️ GPT parse error, using defaults')
      gptEvaluation = {
        task_score: 70,
        linguistic_score: 70,
        task_addressed: true,
        task_explanation: 'Response recorded',
        grammar_score: 70,
        vocabulary_score: 70,
        sentence_variety_score: 70,
        linguistic_notes: '',
        strengths: ['Good effort', 'Completed the task'],
        improvements: ['Keep practicing'],
        feedback: 'Good work! Keep practicing to improve your skills.',
        focus_scores: { [focusAreas[0]]: 70, [focusAreas[1]]: 70, [focusAreas[2]]: 70 }
      }
    }

    // ============================================
    // COMBINE SCORES (GPT + Voice Metrics)
    // ============================================
    const finalScores = calculateFinalScores(
      { 
        task_score: gptEvaluation.task_score || 70, 
        linguistic_score: gptEvaluation.linguistic_score || 70 
      },
      voiceMetrics,
      transcriptMetrics
    )
    
    log('✅ Final scores calculated')

    // ============================================
    // BUILD COMPLETE FEEDBACK OBJECT
    // ============================================
    const feedback = {
      // Main scores
      task_completion_score: gptEvaluation.task_score,
      delivery_score: finalScores.delivery,
      linguistic_score: gptEvaluation.linguistic_score,
      overall_score: finalScores.overall,
      weighted_overall_score: finalScores.weighted,
      pass_level: finalScores.pass,
      
      // Task analysis
      task_completion_analysis: {
        did_address_task: gptEvaluation.task_addressed ?? true,
        relevance_percentage: gptEvaluation.task_score,
        explanation: gptEvaluation.task_explanation || '',
      },
      
      // Linguistic analysis
      linguistic_analysis: {
        grammar: { 
          score: gptEvaluation.grammar_score || gptEvaluation.linguistic_score,
          notes: gptEvaluation.linguistic_notes || '',
        },
        vocabulary: { 
          score: gptEvaluation.vocabulary_score || gptEvaluation.linguistic_score,
          diversity_score: transcriptMetrics.vocabularyDiversity,
        },
        sentence_formation: {
          score: gptEvaluation.sentence_variety_score || gptEvaluation.linguistic_score,
          avg_length: transcriptMetrics.avgSentenceLength,
          count: transcriptMetrics.sentenceCount,
        }
      },
      
      // Filler analysis
      filler_analysis: {
        filler_words_count: transcriptMetrics.fillerCount,
        filler_words_detected: transcriptMetrics.fillerWords,
        penalty_applied: transcriptMetrics.fillerPenalty,
      },
      
      // Voice metrics (from Web Audio API)
      voice_metrics: voiceMetrics ? {
        confidence_score: voiceMetrics.confidenceScore,
        delivery_score: voiceMetrics.deliveryScore,
        pace_score: voiceMetrics.paceScore,
        volume_stability: voiceMetrics.volumeStability,
        pause_count: voiceMetrics.pauseCount,
        strategic_pauses: voiceMetrics.strategicPauseCount,
        long_pauses: voiceMetrics.longPauseCount,
        speaking_ratio: voiceMetrics.speakingRatio,
        trailing_off_count: voiceMetrics.trailingOffCount,
        pitch_stability: voiceMetrics.pitchStability,
      } : null,
      
      // Transcript metrics
      transcript_metrics: {
        word_count: transcriptMetrics.wordCount,
        words_per_minute: transcriptMetrics.wordsPerMinute,
        vocabulary_diversity: transcriptMetrics.vocabularyDiversity,
      },
      
      // Feedback content
      strengths: gptEvaluation.strengths || ['Good effort'],
      improvements: gptEvaluation.improvements || ['Keep practicing'],
      detailed_feedback: gptEvaluation.feedback || 'Good work!',
      focus_area_scores: gptEvaluation.focus_scores || {},
    }

    // ============================================
    // ⚡ PHASE 3: PARALLEL - Save to DB + Start async tasks
    // ============================================
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Save session and progress in parallel
    const [sessionResult, progressResult] = await Promise.all([
      supabase.from('sessions').insert({
        id: sessionId,
        user_id: user.id,
        category: categoryName,
        module_number: parseInt(moduleId),
        level_number: levelNumber,
        tone: tone,
        user_transcript: userTranscript,
        feedback: feedback,
        overall_score: finalScores.overall,
        status: 'completed',
        completed_at: new Date().toISOString(),
      }),
      supabase.from('user_progress').upsert({
        user_id: user.id,
        category: categoryName,
        module_number: parseInt(moduleId),
        lesson_number: levelNumber,
        completed: finalScores.pass,
        best_score: finalScores.overall,
        last_practiced: new Date().toISOString(),
      }, { onConflict: 'user_id,category,module_number,lesson_number' })
    ])
    
    log('✅ Database saves complete')

    if (sessionResult.error) {
      console.error('DB error:', sessionResult.error)
    }

    // 🎯 Generate AI example in BACKGROUND (non-blocking)
    generateAIExampleAsync(openai, supabase, sessionId, lesson.practice_prompt, levelNumber, toneVoiceMap[tone] || 'shimmer')

    const totalTime = Date.now() - startTime
    log(`🎉 API Complete! Total time: ${totalTime}ms`)
    
    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      practice_prompt: lesson.practice_prompt,
      processingTime: totalTime,
      quickFeedback: {
        score: finalScores.overall,
        passed: finalScores.pass,
        message: feedback.detailed_feedback,
        delivery: finalScores.delivery,
        task: gptEvaluation.task_score,
        linguistic: gptEvaluation.linguistic_score,
      }
    })

  } catch (error) {
    console.error('❌ Feedback API error:', error)
    return NextResponse.json(
      { error: 'Failed to process feedback', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// ============================================
// BACKGROUND: AI EXAMPLE GENERATION
// ============================================
async function generateAIExampleAsync(
  openai: OpenAI,
  supabase: any,
  sessionId: string,
  prompt: string,
  level: number,
  voice: string
) {
  try {
    // Use gpt-4o-mini for speed on example (content less critical)
    const exampleResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Create a natural speaking example. 60-100 words, speech text only.' },
        { role: 'user', content: `Task: ${prompt}\nLevel: ${level}` }
      ],
      temperature: 0.8,
      max_tokens: 200,
    })

    const exampleText = exampleResponse.choices[0].message.content || ''

    // Generate TTS audio
    const audioResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice as any,
      input: exampleText,
      speed: 0.95
    })

    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer())

    await supabase
      .from('sessions')
      .update({ 
        ai_example_text: exampleText,
        ai_example_audio: audioBuffer.toString('base64')
      })
      .eq('id', sessionId)

    console.log(`✅ AI Example saved for ${sessionId}`)
  } catch (err) {
    console.error('⚠️ Background AI example failed:', err)
  }
}