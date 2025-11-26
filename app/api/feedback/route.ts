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

const SCORING_WEIGHTS = {
  TASK_COMPLETION_WEIGHT: 0.4,
  DELIVERY_WEIGHT: 0.3,
  LINGUISTIC_WEIGHT: 0.3,
}

function parseUserAgent(userAgent: string): { browser: string; deviceType: string } {
  const ua = userAgent.toLowerCase()
  
  let browser = 'Other'
  if (ua.includes('edg/')) browser = 'Edge'
  else if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome'
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari'
  else if (ua.includes('firefox')) browser = 'Firefox'
  else if (ua.includes('opera') || ua.includes('opr/')) browser = 'Opera'
  
  let deviceType = 'Desktop'
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    deviceType = 'Mobile'
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    deviceType = 'Tablet'
  }
  
  return { browser, deviceType }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('📥 [0ms] Feedback API called')
    
    const userAgent = request.headers.get('user-agent') || ''
    const country = request.headers.get('x-vercel-ip-country') || 'Unknown'
    const city = request.headers.get('x-vercel-ip-city') || 'Unknown'
    const { browser, deviceType } = parseUserAgent(userAgent)
    
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const tone = formData.get('tone') as string
    const categoryId = formData.get('categoryId') as string
    const moduleId = formData.get('moduleId') as string
    const lessonId = formData.get('lessonId') as string

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`✅ [${Date.now() - startTime}ms] User authenticated`)

    const categoryName = categoryMap[categoryId]
    const levelNumber = parseInt(lessonId)

    // ⚡ OPTIMIZATION 1: Parallel transcription + lesson fetch
    const [transcription, lessonResult] = await Promise.all([
      openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
      }),
      supabase
        .from('lessons')
        .select('level_title, practice_prompt, practice_example, feedback_focus_areas')
        .eq('category', categoryName)
        .eq('module_number', parseInt(moduleId))
        .eq('level_number', levelNumber)
        .single()
    ])

    const lesson = lessonResult.data

    if (lessonResult.error || !lesson) {
      console.error('❌ Lesson not found:', lessonResult.error)
      return NextResponse.json({ 
        error: 'Lesson not found', 
        details: lessonResult.error?.message
      }, { status: 404 })
    }

    const userTranscript = transcription.text
    console.log(`✅ [${Date.now() - startTime}ms] Transcription + Lesson loaded`)

    const focusAreas = Array.isArray(lesson.feedback_focus_areas) 
      ? lesson.feedback_focus_areas 
      : (lesson.feedback_focus_areas || 'Clarity, Confidence, Delivery').split(',').map((s: string) => s.trim())
    
    // ⚡ OPTIMIZATION 2: MASSIVELY SIMPLIFIED PROMPT (80% smaller)
    const feedbackPrompt = `Evaluate this speaking practice. Be encouraging but honest.

Level: ${levelNumber}/50 (${levelNumber <= 10 ? 'Beginner' : levelNumber <= 30 ? 'Intermediate' : 'Advanced'})
Task: "${lesson.practice_prompt}"
User said: "${userTranscript}"

Scoring Guide:
- 15-35: Off-task or minimal
- 40-55: Barely on-topic
- 60-69: Adequate
- 70-79: Good
- 80-87: Very good (PASS)
- 88-95: Excellent

Evaluate:
1. Task Completion (40%): Did they address the prompt?
2. Delivery (30%): Clear, confident, structured?
3. Language Quality (30%): Grammar, sentence variety, vocabulary for level ${levelNumber}

Filler words: 1-5 = -0, 6-10 = -2, 11-15 = -5, 16-20 = -8, 21+ = -12

Respond ONLY with JSON:
{
  "task_completion_score": 0-100,
  "delivery_score": 0-100,
  "linguistic_score": 0-100,
  "overall_score": 0-100,
  "pass_level": true/false,
  "strengths": ["2-3 specific positives"],
  "improvements": ["2-3 actionable tips"],
  "detailed_feedback": "4-5 sentences: compliment, assessment, constructive guidance, encouragement",
  "filler_analysis": {
    "filler_words_count": 0,
    "filler_words_detected": [],
    "penalty_applied": 0
  },
  "focus_area_scores": {
    "${focusAreas[0]}": 0-100,
    "${focusAreas[1]}": 0-100,
    "${focusAreas[2]}": 0-100
  }
}`

    const voice = toneVoiceMap[tone] || 'shimmer'
    
    // ⚡ OPTIMIZATION 3: Use gpt-4o-mini for 10x faster feedback + Generate example in parallel
    const [feedbackResponse, aiExampleResponse] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4o-mini', // 🚀 10x FASTER than gpt-4o!
        messages: [
          { 
            role: 'system', 
            content: 'You are a supportive speaking coach. Be generous with passing scores (80+) when students do well. Respond ONLY with valid JSON.' 
          },
          { role: 'user', content: feedbackPrompt }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      }),
      openai.chat.completions.create({
        model: 'gpt-4o-mini', // 🚀 Also faster here
        messages: [
          { role: 'system', content: 'Demonstrate speaking tasks naturally.' },
          { 
            role: 'user', 
            content: `Task: ${lesson.practice_prompt}\nLevel: ${levelNumber}\n\nCreate a natural 75-150 word demonstration. ONLY return the speech text.` 
          }
        ],
        temperature: 0.9,
      })
    ])

    console.log(`✅ [${Date.now() - startTime}ms] Feedback + AI Example generated`)

    // Parse and process feedback
    let feedback
    try {
      const feedbackText = feedbackResponse.choices[0].message.content || '{}'
      feedback = JSON.parse(feedbackText)
      
      // Ensure required fields
      feedback.task_completion_score = feedback.task_completion_score || 70
      feedback.delivery_score = feedback.delivery_score || 70
      feedback.linguistic_score = feedback.linguistic_score || 70
      
      // Calculate weighted score
      feedback.weighted_overall_score = (
        feedback.task_completion_score * SCORING_WEIGHTS.TASK_COMPLETION_WEIGHT +
        feedback.delivery_score * SCORING_WEIGHTS.DELIVERY_WEIGHT +
        feedback.linguistic_score * SCORING_WEIGHTS.LINGUISTIC_WEIGHT
      )
      
      if (feedback.filler_analysis?.penalty_applied) {
        feedback.weighted_overall_score -= feedback.filler_analysis.penalty_applied
      }
      
      feedback.weighted_overall_score = Math.max(0, Math.min(100, feedback.weighted_overall_score))
      feedback.overall_score = Math.round(feedback.weighted_overall_score)
      feedback.pass_level = feedback.overall_score >= 80
      
    } catch (e) {
      console.error('⚠️ Failed to parse feedback, using fallback')
      feedback = {
        task_completion_score: 70,
        delivery_score: 70,
        linguistic_score: 70,
        overall_score: 70,
        weighted_overall_score: 70,
        pass_level: false,
        strengths: ['You addressed the task', 'Good effort', 'Clear delivery'],
        improvements: ['Practice pacing', 'Reduce fillers', 'Build confidence'],
        detailed_feedback: "Good attempt! You addressed the task requirements. With more practice on clarity and confidence, you'll improve quickly. Keep practicing!",
        focus_area_scores: { 'Clarity': 70, 'Confidence': 70, 'Delivery': 70 },
        filler_analysis: {
          filler_words_count: 0,
          filler_words_detected: [],
          penalty_applied: 0
        }
      }
    }

    const aiExampleText = aiExampleResponse.choices[0].message.content || 'Example not available.'

    // ⚡ OPTIMIZATION 4: Generate audio ASYNC (don't wait for it!)
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const shouldComplete = feedback.pass_level === true && feedback.overall_score >= 80

    // Start audio generation in background (non-blocking)
    const audioPromise = openai.audio.speech.create({
      model: 'tts-1', // Use tts-1 instead of tts-1-hd (2x faster, good enough quality)
      voice: voice as any,
      input: aiExampleText,
      speed: 0.95
    }).then(async (response) => {
      const aiAudioBuffer = Buffer.from(await response.arrayBuffer())
      // Update session with audio after it's generated
      await supabase
        .from('sessions')
        .update({ 
          ai_example_audio: aiAudioBuffer.toString('base64'),
          ai_example_text: aiExampleText
        })
        .eq('id', sessionId)
      console.log(`✅ [${Date.now() - startTime}ms] Audio generated and saved asynchronously`)
    }).catch(err => {
      console.error('⚠️ Audio generation failed:', err)
    })

    // ⚡ OPTIMIZATION 5: Save to DB in parallel (don't wait for audio)
    const [sessionResult, progressResult] = await Promise.all([
      supabase
        .from('sessions')
        .insert({
          id: sessionId,
          user_id: user.id,
          category: categoryName,
          module_number: parseInt(moduleId),
          level_number: levelNumber,
          tone: tone,
          user_transcript: userTranscript,
          ai_example_text: '', // Will be updated by background process
          ai_example_audio: '', // Will be updated by background process
          feedback: feedback,
          overall_score: feedback.overall_score,
          status: 'completed',
          browser_type: browser,
          device_type: deviceType,
          user_country: country,
          user_city: city,
          completed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }),
      
      supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          category: categoryName,
          module_number: parseInt(moduleId),
          lesson_number: levelNumber,
          completed: shouldComplete,
          best_score: feedback.overall_score,
          last_practiced: new Date().toISOString(),
        }, {
          onConflict: 'user_id,category,module_number,lesson_number'
        })
    ])

    if (sessionResult.error) {
      console.error('❌ Database error:', sessionResult.error)
      return NextResponse.json({ error: 'Failed to save session', details: sessionResult.error.message }, { status: 500 })
    }

    const totalTime = Date.now() - startTime
    console.log(`🎉 [${totalTime}ms] Complete! (Audio generating in background)`)
    
    // Don't wait for audio - return immediately
    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      practice_prompt: lesson.practice_prompt,
      processingTime: totalTime
    })

  } catch (error) {
    console.error('❌ Feedback API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process feedback', 
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}