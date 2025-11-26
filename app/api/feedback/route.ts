// app/api/feedback/route.ts
// Key change: Pass threshold changed from 80 to 75

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
    
    log(`PHASE 1 complete (parallel) - took ${Date.now() - phase1Start}ms`)

    const user = authResult.data.user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    log('Auth verified')

    const lesson = lessonResult.data
    if (!lesson) {
      console.warn('Lesson not found, using defaults')
    }
    
    const userTranscript = transcriptionResult.text
    const practicePrompt = lesson?.practice_prompt || 'Practice speaking clearly'
    log(`Transcript: "${userTranscript.substring(0, 50)}..."`)

    // ============================================
    // ⚡ QUICK ANALYSIS
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
    // ⚡ PHASE 2: GPT-4O
    // ============================================
    const phase2Start = Date.now()
    
    const systemPrompt = `You are an expert speaking coach providing detailed, personalized feedback on voice communication practice.

Your role:
- Analyze how well the speaker addressed the specific task given
- Provide specific, actionable feedback based on what they actually said
- Be encouraging but honest
- Give concrete examples from their response
- Tailor advice to their level (${levelNumber <= 10 ? 'Beginner' : levelNumber <= 30 ? 'Intermediate' : 'Advanced'})

Scoring Philosophy:
- Be fair and realistic, not overly harsh or overly generous
- 75+ = Pass - good execution of the task
- 80+ = Excellent execution of the task
- 60-74 = Good attempt with room for improvement  
- 40-59 = Needs work, but shows effort
- Below 40 = Did not address the task adequately

Always provide specific examples from what they said to justify your feedback.`

    const userPrompt = `Evaluate this speaking practice session:

**TASK GIVEN:**
"${practicePrompt}"

**WHAT THEY SAID:**
"${userTranscript}"

**CONTEXT:**
- Category: ${categoryName}
- Level: ${levelNumber} (${levelNumber <= 10 ? 'Beginner' : levelNumber <= 30 ? 'Intermediate' : 'Advanced'})
- Coaching Tone: ${tone}
- Word Count: ${wordCount} words
- Speaking Pace: ${wordsPerMinute} WPM
- Filler Words: ${fillerCount} (${fillerWords.join(', ') || 'none'})

**REQUIRED OUTPUT (JSON format):**
{
  "task": 0-100 score for how well they addressed the specific task,
  "grammar": 0-100 score for grammar and sentence structure,
  "vocabulary": 0-100 score for word choice and vocabulary usage,
  "delivery": 0-100 score for speaking flow and naturalness,
  "strengths": [
    "Specific strength with concrete example from their speech",
    "Another specific strength citing what they actually said or did well"
  ],
  "improvements": [
    "Specific actionable improvement: 'Instead of X, try Y'",
    "Another concrete suggestion with clear next step"
  ],
  "feedback": "4-5 sentence detailed analysis that references what they actually said and provides specific guidance"
}

**CRITICAL for strengths & improvements:**
- Must be SPECIFIC to this person's actual response
- Reference actual words/phrases they used or techniques they demonstrated
- Strengths: Point out exactly what they did well with examples
- Improvements: Give actionable advice in format "Instead of X, try Y" or "To improve X, do Y"
- Keep each point to ONE clear, concise sentence
- Avoid generic phrases like "good effort" or "keep practicing"

**EXAMPLE of good vs bad feedback:**

❌ BAD (too generic):
- Strengths: ["Good speaking", "Nice delivery"]
- Improvements: ["Work on clarity", "Practice more"]

✅ GOOD (specific & actionable):
- Strengths: ["Your phrase 'persistence is key' was clear and memorable", "Used natural pauses after 'listen carefully' which emphasized your point"]
- Improvements: ["Replace filler 'um' before key points with a silent 2-second pause", "Instead of repeating 'basically', vary your transition words with 'essentially' or 'in other words'"]`

    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: "json_object" }
    })
    
    log(`PHASE 2 complete (GPT) - took ${Date.now() - phase2Start}ms`)

    // Parse response
    let gpt: any = { 
      task: 70, 
      grammar: 70, 
      vocabulary: 70, 
      delivery: 70, 
      strengths: [
        'You successfully completed the speaking task',
        'Your response showed clear understanding of the prompt'
      ], 
      improvements: [
        'Practice reducing filler words by pausing silently',
        'Expand your vocabulary by using varied word choices'
      ], 
      feedback: 'You made a solid effort on this practice session. Your response addressed the task, though there is room to refine your delivery and language use. Keep practicing regularly to build confidence.' 
    }
    
    try {
      const parsed = JSON.parse(gptResponse.choices[0].message.content || '{}')
      gpt = { ...gpt, ...parsed }
    } catch (e) {
      console.error('GPT parse failed:', e)
      console.log('Raw GPT response:', gptResponse.choices[0].message.content)
    }

    // Calculate final scores
    const taskScore = Math.min(100, Math.max(0, gpt.task || 70))
    const grammarScore = Math.min(100, Math.max(0, gpt.grammar || 70))
    const vocabScore = Math.min(100, Math.max(0, gpt.vocabulary || 70))
    let deliveryScore = Math.min(100, Math.max(0, gpt.delivery || 70))
    
    if (voiceMetrics?.deliveryScore) {
      deliveryScore = Math.round((deliveryScore + voiceMetrics.deliveryScore) / 2)
    }
    
    deliveryScore = Math.max(0, deliveryScore - fillerPenalty)
    const linguisticScore = Math.round((grammarScore + vocabScore) / 2)
    
    // 40-30-30 weighted
    const overallScore = Math.round(
      taskScore * 0.40 +
      linguisticScore * 0.30 +
      deliveryScore * 0.30
    )
    
    // *** CHANGED: Pass threshold from 80 to 75 ***
    const passLevel = overallScore >= 75

    log('Scores calculated')

    // Build comprehensive feedback object
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
        explanation: gpt.feedback || 'Your response showed effort in addressing the task. Continue practicing to improve your delivery and content quality.',
        specific_observations: `You were asked to: "${practicePrompt.substring(0, 200)}${practicePrompt.length > 200 ? '...' : ''}". Your response demonstrated ${taskScore >= 80 ? 'excellent' : taskScore >= 60 ? 'good' : 'some'} understanding of the task requirements.`
      },
      linguistic_analysis: {
        grammar: { 
          score: grammarScore, 
          issues: grammarScore < 70 ? ['Consider reviewing sentence structure and verb tenses'] : [], 
          suggestions: grammarScore < 80 ? ['Practice with grammar exercises at your level'] : ['Maintain your strong grammar foundation']
        },
        vocabulary: { 
          score: vocabScore, 
          diversity_score: vocabDiversity, 
          advanced_words_used: uniqueWords.size > 30 ? ['Demonstrated good vocabulary range'] : [],
          observations: `Used ${uniqueWords.size} unique words with ${vocabDiversity}% vocabulary diversity. ${vocabScore >= 80 ? 'Excellent' : vocabScore >= 60 ? 'Good' : 'Developing'} word choice for your level.`
        },
        sentence_formation: { 
          score: linguisticScore, 
          complexity_level: levelNumber <= 10 ? 'beginner' : levelNumber <= 30 ? 'intermediate' : 'advanced', 
          variety_score: vocabDiversity, 
          flow_score: deliveryScore, 
          issues: linguisticScore < 70 ? ['Work on sentence variety and complexity'] : [], 
          suggestions: linguisticScore < 80 ? ['Try using more complex sentence structures'] : ['Your sentence formation is strong']
        }
      },
      filler_analysis: {
        filler_words_count: fillerCount,
        filler_words_detected: fillerWords,
        awkward_pauses_count: voiceMetrics?.longPauseCount || 0,
        repetitive_phrases: [],
        penalty_applied: fillerPenalty,
        analysis: fillerCount === 0 ? 'Excellent - no filler words detected!' : 
                 fillerCount <= 3 ? 'Very good - minimal filler words.' :
                 fillerCount <= 6 ? `Watch out for filler words like "${fillerWords.join(', ')}". Try to pause silently instead.` :
                 `High filler word usage (${fillerCount} times). Practice pausing silently instead of using "${fillerWords.join(', ')}".`
      },
      pace_analysis: {
        words_per_minute: wordsPerMinute,
        assessment: wordsPerMinute < 100 ? 'Too slow - try speaking a bit faster' :
                   wordsPerMinute > 180 ? 'Too fast - slow down for clarity' :
                   'Good speaking pace',
        word_count: wordCount
      },
      voice_metrics: voiceMetrics || null,
      strengths: Array.isArray(gpt.strengths) && gpt.strengths.length >= 2 
        ? gpt.strengths 
        : [
            'You completed the speaking task as instructed',
            `Your speaking pace of ${wordsPerMinute} WPM was ${wordsPerMinute >= 100 && wordsPerMinute <= 180 ? 'well-controlled' : 'noticeable'}`
          ],
      improvements: Array.isArray(gpt.improvements) && gpt.improvements.length >= 2 
        ? gpt.improvements 
        : [
            fillerCount > 3 ? `Reduce filler words like "${fillerWords[0] || 'um'}" by practicing silent pauses` : 'Practice varying your sentence structure for better flow',
            vocabDiversity < 60 ? 'Expand vocabulary by using more diverse word choices' : 'Work on maintaining consistent energy throughout your response'
          ],
      detailed_feedback: gpt.feedback || 'Good work on this practice session! Your response showed effort and engagement with the task. Continue practicing regularly to build your speaking confidence and skills.',
      focus_area_scores: {
        [focusAreas[0]]: taskScore,
        [focusAreas[1]]: deliveryScore,
        [focusAreas[2]]: linguisticScore
      }
    }

    // ============================================
    // ⚡ PHASE 3: SAVE TO DB
    // ============================================
    const phase3Start = Date.now()
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const userAgent = request.headers.get('user-agent') || ''
    const ua = userAgent.toLowerCase()
    let browser = 'Other'
    if (ua.includes('chrome')) browser = 'Chrome'
    else if (ua.includes('safari')) browser = 'Safari'
    else if (ua.includes('firefox')) browser = 'Firefox'
    const deviceType = ua.includes('mobile') ? 'Mobile' : 'Desktop'
    const country = request.headers.get('x-vercel-ip-country') || 'Unknown'

    // Get current progress to check if this is the best score
    const { data: currentProgress } = await supabase
      .from('user_progress')
      .select('best_score')
      .eq('user_id', user.id)
      .eq('category', categoryName)
      .eq('module_number', parseInt(moduleId) || 1)
      .eq('lesson_number', levelNumber)
      .single()

    const currentBestScore = currentProgress?.best_score || 0
    const newBestScore = Math.max(currentBestScore, overallScore)

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
        completed: passLevel, // This will be true if score >= 75
        best_score: newBestScore, // Update to best score
        last_practiced: new Date().toISOString(),
      }, { onConflict: 'user_id,category,module_number,lesson_number' })
    ])
    
    log(`PHASE 3 complete (DB) - took ${Date.now() - phase3Start}ms`)

    const totalTime = Date.now() - START
    log(`✅ TOTAL TIME: ${totalTime}ms`)
    
    console.log('📊 TIMING BREAKDOWN:', timing)
    
    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      practice_prompt: practicePrompt,
      processingTime: totalTime,
      apiVersion: 'v4-pass-threshold-75',
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