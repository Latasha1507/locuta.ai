// app/api/feedback/route.ts
// COMPLETE VERSION - Fast, Accurate, Fair Scoring

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const categoryMap: { [key: string]: string } = {
  'public-speaking': 'Public Speaking',
  'storytelling': 'Storytelling',
  'creator-speaking': 'Creator Speaking',
  'casual-conversation': 'Casual Conversation',
  'workplace-communication': 'Workplace Communication',
  'pitch-anything': 'Pitch Anything',
}

const FILLER_REGEX = /\b(um|uh|uhh|umm|like|you know|basically|actually|literally|i mean|kind of|sort of)\b/gi

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Parse form data
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const tone = formData.get('tone') as string || 'Normal'
    const categoryId = formData.get('categoryId') as string
    const moduleId = formData.get('moduleId') as string
    const lessonId = formData.get('lessonId') as string
    const duration = parseFloat(formData.get('duration') as string) || 60

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 })
    }

    const supabase = await createClient()
    const categoryName = categoryMap[categoryId] || 'Public Speaking'
    const moduleNumber = parseInt(moduleId) || 1
    const levelNumber = parseInt(lessonId) || 1

    // ============================================
    // PARALLEL PHASE - Fast execution
    // ============================================
    const [authResult, transcriptionResult, lessonResult] = await Promise.all([
      supabase.auth.getUser(),
      openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
      }),
      supabase
        .from('lessons')
        .select('practice_prompt, feedback_focus_areas')
        .eq('category', categoryName)
        .eq('module_number', moduleNumber)
        .eq('level_number', levelNumber)
        .single()
    ])

    const user = authResult.data.user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lesson = lessonResult.data
    const transcript = transcriptionResult.text.trim()
    const taskPrompt = lesson?.practice_prompt || 'Practice speaking clearly'
    
    // Quick metrics
    const words = transcript.split(/\s+/).filter(w => w.length > 0)
    const wordCount = words.length
    const wpm = duration > 0 ? Math.round((wordCount / duration) * 60) : 120
    const fillers = transcript.match(FILLER_REGEX) || []
    const fillerCount = fillers.length
    const uniqueFillers = [...new Set(fillers.map(f => f.toLowerCase()))]
    
    // Calculate filler penalty (fair and progressive)
    let fillerPenalty = 0
    if (moduleNumber === 1) {
      // Module 1: Very lenient (only penalize 8+ fillers)
      if (fillerCount >= 8) fillerPenalty = Math.min(8, (fillerCount - 7) * 1)
    } else {
      // Other modules: Progressive penalty
      if (fillerCount >= 5) fillerPenalty = Math.min(12, (fillerCount - 4) * 1.5)
    }

    const focusAreas = lesson?.feedback_focus_areas || ['Clarity', 'Delivery', 'Confidence']

    // ============================================
    // GPT EVALUATION - Like a real teacher
    // ============================================
    const systemPrompt = `You are a supportive speaking coach who provides accurate, personalized feedback like a real teacher would.

YOUR EVALUATION APPROACH:
1. READ what they actually said - reference specific words/phrases
2. ASSESS how well they completed the task
3. EVALUATE their speaking quality (clarity, flow, grammar)
4. PROVIDE specific, actionable guidance

SCORING GUIDELINES (Be fair and realistic):
- Module 1: Beginners - 70+ is achievable with basic effort
- 85-95: Excellent - task completed well with strong delivery
- 75-84: Good - solid attempt, task addressed, clear speaking
- 65-74: Decent - task attempted but needs improvement
- 50-64: Needs work - didn't fully address task or had issues
- Below 50: Significant problems

CRITICAL: Be specific! Reference what they actually said. Give actionable tips.`

    const userPrompt = `Evaluate this speaking practice:

TASK GIVEN: "${taskPrompt}"

WHAT THEY SAID: "${transcript}"

CONTEXT:
- Module ${moduleNumber}, Lesson ${levelNumber} (${moduleNumber === 1 ? 'Beginner level' : moduleNumber <= 3 ? 'Early stage' : 'Intermediate'})
- ${wordCount} words in ${Math.round(duration)}s (${wpm} WPM)
- ${fillerCount} filler words detected

Return ONLY valid JSON (no markdown):
{
  "clarity": 60-100 (pronunciation, articulation - did I understand them?),
  "delivery": 60-100 (flow, naturalness, pacing, pauses),
  "confidence": 60-100 (energy, conviction, assertiveness in voice),
  "task_score": 60-100 (did they address the task requirements?),
  "grammar": 60-100 (sentence structure, verb tenses),
  "vocabulary": 60-100 (word choice, variety, appropriateness),
  "strengths": ["Specific thing they did well with example", "Another specific strength"],
  "improvements": ["Actionable tip: Instead of X, try Y", "Another concrete suggestion"],
  "feedback": "3-4 sentences explaining their performance with specific references to what they said"
}

IMPORTANT: 
- Reference actual words/phrases they used
- Be encouraging but honest
- Strengths: Point out specific examples from their response
- Improvements: Give concrete "try this instead" advice`

    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: 600,
      response_format: { type: "json_object" }
    })

    // Parse with safe defaults
    let scores: any = {
      clarity: 75, delivery: 75, confidence: 75,
      task_score: 75, grammar: 75, vocabulary: 75,
      strengths: ['You completed the task', 'Clear speaking attempt'],
      improvements: ['Practice regularly', 'Work on consistency'],
      feedback: 'Good effort on this practice session. Keep working on your speaking skills.'
    }
    
    try {
      const parsed = JSON.parse(gptResponse.choices[0].message.content || '{}')
      scores = { ...scores, ...parsed }
    } catch (e) {
      console.error('Parse error, using defaults')
    }

    // Apply filler penalty to delivery
    const clarityScore = Math.max(60, Math.min(100, scores.clarity))
    let deliveryScore = Math.max(60, Math.min(100, scores.delivery))
    deliveryScore = Math.max(60, deliveryScore - fillerPenalty)
    const confidenceScore = Math.max(60, Math.min(100, scores.confidence))
    const taskScore = Math.max(60, Math.min(100, scores.task_score))
    
    // Calculate overall score
    // Weights: Task (35%), Clarity (25%), Delivery (25%), Confidence (15%)
    const overallScore = Math.round(
      taskScore * 0.35 +
      clarityScore * 0.25 +
      deliveryScore * 0.25 +
      confidenceScore * 0.15
    )
    
    // Pass threshold (module-based)
    const passThreshold = moduleNumber === 1 ? 70 : 75
    const passed = overallScore >= passThreshold

    // Build feedback object
    const feedback = {
      overall_score: overallScore,
      pass_level: passed,
      pass_threshold: passThreshold,
      
      clarity_score: clarityScore,
      delivery_score: deliveryScore,
      confidence_score: confidenceScore,
      task_completion_score: taskScore,
      grammar_score: Math.max(60, Math.min(100, scores.grammar)),
      vocabulary_score: Math.max(60, Math.min(100, scores.vocabulary)),
      
      focus_area_scores: {
        [focusAreas[0]]: clarityScore,
        [focusAreas[1]]: deliveryScore,
        [focusAreas[2]]: confidenceScore
      },
      
      filler_words_count: fillerCount,
      filler_words_detected: uniqueFillers,
      filler_penalty_applied: fillerPenalty,
      
      word_count: wordCount,
      words_per_minute: wpm,
      pace_assessment: wpm < 100 ? 'Too slow - speak faster' :
                       wpm > 180 ? 'Too fast - slow down' : 'Good pace',
      
      strengths: scores.strengths,
      improvements: scores.improvements,
      detailed_feedback: scores.feedback
    }

    // ============================================
    // SAVE TO DATABASE
    // ============================================
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Get current best score
    const { data: progress } = await supabase
      .from('user_progress')
      .select('best_score')
      .eq('user_id', user.id)
      .eq('category', categoryName)
      .eq('module_number', moduleNumber)
      .eq('lesson_number', levelNumber)
      .single()

    const bestScore = Math.max(progress?.best_score || 0, overallScore)

    // Save session and update progress in parallel
    await Promise.all([
      supabase.from('sessions').insert({
        id: sessionId,
        user_id: user.id,
        category: categoryName,
        module_number: moduleNumber,
        level_number: levelNumber,
        tone: tone,
        user_transcript: transcript,
        feedback: feedback,
        overall_score: overallScore,
        status: 'completed',
        completed_at: new Date().toISOString()
      }),
      
      supabase.from('user_progress').upsert({
        user_id: user.id,
        category: categoryName,
        module_number: moduleNumber,
        lesson_number: levelNumber,
        completed: passed,
        best_score: bestScore,
        last_practiced: new Date().toISOString()
      }, { onConflict: 'user_id,category,module_number,lesson_number' })
    ])

    const totalTime = Date.now() - startTime
    console.log(`✅ Feedback complete in ${totalTime}ms | Score: ${overallScore} | Passed: ${passed}`)
    
    return NextResponse.json({
      success: true,
      sessionId,
      processingTime: totalTime,
      passed: passed,
      isFirstPass: passed && !('completed' in (progress ?? {})) ? true : passed && !(progress as any)?.completed, // New achievement!
      score: overallScore,
      threshold: passThreshold
    })

  } catch (error) {
    console.error('Feedback API Error:', error)
    return NextResponse.json(
      { error: 'Failed to process feedback' },
      { status: 500 }
    )
  }
}