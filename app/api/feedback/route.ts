import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Mixpanel from '@/lib/mixpanel';

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

// Strict scoring weights - Task completion is now priority
const SCORING_WEIGHTS = {
  TASK_COMPLETION_WEIGHT: 0.4,  // Must address the prompt
  DELIVERY_WEIGHT: 0.3,          // How well they delivered
  LINGUISTIC_WEIGHT: 0.3,        // Grammar, vocabulary, sentence formation
  
  // Linguistic sub-weights (within the 30%)
  GRAMMAR_WEIGHT: 0.35,
  SENTENCE_FORMATION_WEIGHT: 0.35,
  VOCABULARY_WEIGHT: 0.30,
}

interface LevelExpectation {
  grammar: { tolerance: string; focus: string[] }
  vocabulary: { expected: string; complexity: string; variety: string }
  sentence_formation: { complexity: string; transitions: string }
}

function getLevelExpectations(levelNumber: number): LevelExpectation {
  const category = levelNumber <= 10 ? 'beginner' : 
                   levelNumber <= 30 ? 'intermediate' : 'advanced'
  
  const expectations: Record<string, LevelExpectation> = {
    beginner: {
      grammar: { tolerance: 'high', focus: ['basic sentence structure', 'simple tenses', 'basic questions'] },
      vocabulary: { expected: 'basic conversational vocabulary', complexity: 'simple everyday words', variety: 'moderate repetition acceptable' },
      sentence_formation: { complexity: 'simple and compound sentences', transitions: 'basic connectors (and, but, so)' },
    },
    intermediate: {
      grammar: { tolerance: 'medium', focus: ['consistent tenses', 'proper conjunctions', 'varied sentence types'] },
      vocabulary: { expected: 'expanded casual vocabulary', complexity: 'mix of simple and intermediate words', variety: 'good variety expected' },
      sentence_formation: { complexity: 'mix of compound and complex sentences', transitions: 'varied transitions and connectors' },
    },
    advanced: {
      grammar: { tolerance: 'low', focus: ['complex sentences', 'advanced grammar', 'nuanced expressions'] },
      vocabulary: { expected: 'rich conversational vocabulary', complexity: 'sophisticated word choices', variety: 'minimal repetition, creative expression' },
      sentence_formation: { complexity: 'sophisticated sentence variety', transitions: 'smooth, natural flow with advanced transitions' },
    },
  }
  
  return expectations[category]
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
    const levelNumber = parseInt(lessonId)
    const levelExpectations = getLevelExpectations(levelNumber)

    // Use SERVICE ROLE client to bypass RLS
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get lesson details
    const { data: lessons, error: lessonError } = await supabaseAdmin
      .from('lessons')
      .select('*')
      .eq('category', categoryName)
      .eq('module_number', parseInt(moduleId))
      .eq('level_number', levelNumber)

    const lesson = lessons?.[0]

    if (lessonError || !lesson) {
      console.error('❌ Lesson not found:', lessonError)
      return NextResponse.json({ 
        error: 'Lesson not found', 
        details: lessonError?.message || 'No matching lesson found',
        query: { category: categoryName, module: parseInt(moduleId), level: levelNumber }
      }, { status: 404 })
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
    // Track audio recording event
    Mixpanel.track('Audio Recorded', {
      lesson_id: lesson.id,
      lesson_title: lesson.level_title,
      category: categoryName,
      module_number: moduleId,
      lesson_number: lessonId,
      transcript_length: userTranscript.length,
      coaching_style: tone
    });

    // Step 2: Generate STRICT feedback with task completion validation
    console.log('💬 Generating strict coaching feedback...')
    
    const focusAreas = Array.isArray(lesson.feedback_focus_areas) 
      ? lesson.feedback_focus_areas 
      : (lesson.feedback_focus_areas || 'Clarity, Confidence, Delivery').split(',').map((s: string) => s.trim())
    
    const focusAreasStr = focusAreas.join(', ')

    const feedbackPrompt = `You are a professional public speaking coach who evaluates objectively while being encouraging. Your goal is to help people improve and succeed.

**EVALUATION PHILOSOPHY:**
- Recognize genuine effort and good performance
- Be honest about areas for improvement, but constructive
- Give credit where credit is due - if they did well, reflect that in the score
- Scores should match performance: 50-60 needs work, 65-75 good, 80+ pass-worthy

**Lesson Context:**
- Level: ${levelNumber} (out of 50)
- Title: ${lesson.level_title}
- **TASK:** ${lesson.practice_prompt}
- Focus Areas: ${focusAreasStr}
- Selected Tone: ${tone}

**User's Response:** "${userTranscript}"

**Level Expectations for Level ${levelNumber}:**
- Grammar: ${JSON.stringify(levelExpectations.grammar)}
- Vocabulary: ${JSON.stringify(levelExpectations.vocabulary)}
- Sentence Formation: ${JSON.stringify(levelExpectations.sentence_formation)}

**FAIR EVALUATION PROCESS:**

**STEP 1: TASK COMPLETION ANALYSIS**
- Did they address the prompt: "${lesson.practice_prompt}"?
- Is their response relevant and on-topic?
- Did they provide a complete response?

REALISTIC SCORING GUIDELINES:
- No attempt or completely off-task (e.g., "hello 1 2 3") = 15-35
- Minimal attempt, barely on-topic = 40-55
- Adequate attempt with notable issues = 60-69
- Good completion, addresses task well = 70-79
- Very good completion, meets expectations = 80-87 ✅ PASS
- Excellent completion, exceeds expectations = 88-95

**IMPORTANT:** If they genuinely addressed the task and delivered decently, they should score 70-80+. Don't be stingy with passing scores!

**STEP 2: DELIVERY & QUALITY ANALYSIS**

1. **TASK COMPLETION** (40% of total):
   - Relevance to prompt
   - Completeness of response
   - Follows instructions

2. **DELIVERY & CONTENT** (30% of total):
   - Clarity and confidence
   - Structure and coherence
   - Natural, engaging delivery
   - Appropriate for coaching style: ${tone}

3. **LINGUISTIC QUALITY** (30% of total):
   
   A. Grammar (35% of linguistic):
      - Overall correctness for level ${levelNumber}
      - Don't penalize minor slips in natural speech
      
   B. Sentence Formation (35% of linguistic):
      - Variety and appropriate complexity
      - Natural rhythm
      
   C. Vocabulary (30% of linguistic):
      - Appropriate word choices
      - Natural language use

**STEP 3: FILLER WORDS & FLOW ANALYSIS**
Be reasonable - some filler words are natural:
- 1-5 fillers: -0 points (totally normal!)
- 6-10 fillers: -2 points
- 11-15 fillers: -5 points
- 16-20 fillers: -8 points
- 21+ fillers: -12 points
- Multiple awkward pauses: -3 points

**RESPOND WITH BALANCED, ENCOURAGING JSON:**

{
  "task_completion_analysis": {
    "did_address_task": true/false,
    "relevance_percentage": 0-100,
    "explanation": "Brief assessment - be fair"
  },
  "task_completion_score": 0-100,
  "delivery_score": 0-100,
  "linguistic_score": 0-100,
  "filler_analysis": {
    "filler_words_count": number,
    "filler_words_detected": ["um", "uh"],
    "awkward_pauses_count": number,
    "repetitive_phrases": ["phrase"],
    "penalty_applied": number
  },
  "overall_score": 0-100,
  "weighted_overall_score": 0-100,
  "pass_level": true/false (true if score >= 80),
  "strengths": [
    "Acknowledge 2-3 specific things they did well",
    "Be genuine and encouraging",
    "Celebrate their successes"
  ],
  "improvements": [
    "Give 2-3 actionable, specific suggestions",
    "Be constructive and helpful",
    "Focus on practical next steps"
  ],
  "detailed_feedback": "4-6 sentences of balanced, encouraging feedback. Start with a genuine compliment about what they did well. Address how they met the task requirements. Provide constructive guidance on specific areas to improve. End with encouragement and confidence in their progress. Be a supportive coach who wants them to succeed.",
  "focus_area_scores": {
    "${focusAreas[0] || 'Clarity'}": 0-100,
    "${focusAreas[1] || 'Confidence'}": 0-100,
    "${focusAreas[2] || 'Delivery'}": 0-100
  },
  "linguistic_analysis": {
    "grammar": {
      "score": 0-100,
      "issues": ["specific issues if significant"],
      "suggestions": ["practical improvement tips"]
    },
    "sentence_formation": {
      "score": 0-100,
      "complexity_level": "basic/intermediate/advanced",
      "variety_score": 0-100,
      "flow_score": 0-100,
      "issues": ["issues if significant"],
      "suggestions": ["how to improve"]
    },
    "vocabulary": {
      "score": 0-100,
      "level_appropriateness": 0-100,
      "variety_score": 0-100,
      "casual_tone_score": 0-100,
      "advanced_words_used": ["good words they used"],
      "suggested_alternatives": {
        "word": ["alternatives"]
      },
      "issues": ["significant issues only"]
    }
  }
}

**CRITICAL REMINDERS:**
- If they did the task well, give them 80+ to help them pass!
- Be generous with passing scores - we want users to succeed
- Only give low scores (below 50) for truly poor attempts
- Celebrate good work with good scores (80-90 range)
- Your goal is to help them improve AND succeed`

    const feedbackResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'You are a professional public speaking coach who wants users to succeed. Give honest, balanced feedback. Be generous with scores when users do well - if they addressed the task competently, give them 80+ to help them pass. Scoring: 50-60 needs work, 65-75 good, 80-90 pass-worthy, 90+ excellent. Respond ONLY with valid JSON.' 
        },
        { role: 'user', content: feedbackPrompt }
      ],
      temperature: 0.6,
      response_format: { type: "json_object" }
    })

    let feedback
    try {
      const feedbackText = feedbackResponse.choices[0].message.content || '{}'
      feedback = JSON.parse(feedbackText)
      console.log('✅ Strict feedback generated:', feedback.overall_score)
      
      // Ensure task_completion_score exists
      if (!feedback.task_completion_score && feedback.task_completion_analysis) {
        feedback.task_completion_score = feedback.task_completion_analysis.relevance_percentage || 50
      } else if (!feedback.task_completion_score) {
        feedback.task_completion_score = 50
      }
      
      // Calculate delivery_score if missing
      if (!feedback.delivery_score && feedback.focus_area_scores) {
        const scores = Object.values(feedback.focus_area_scores) as number[]
        feedback.delivery_score = scores.reduce((a: number, b: number) => a + b, 0) / scores.length
      } else if (!feedback.delivery_score) {
        feedback.delivery_score = 50
      }
      
      // Calculate linguistic_score if missing
      if (!feedback.linguistic_score && feedback.linguistic_analysis) {
        const g = feedback.linguistic_analysis.grammar.score || 50
        const s = feedback.linguistic_analysis.sentence_formation.score || 50
        const v = feedback.linguistic_analysis.vocabulary.score || 50
        
        feedback.linguistic_score = (
          g * 0.35 +
          s * 0.35 +
          v * 0.30
        )
      } else if (!feedback.linguistic_score) {
        feedback.linguistic_score = 50
      }
      
      // Calculate weighted overall score with strict weights
      feedback.weighted_overall_score = (
        feedback.task_completion_score * SCORING_WEIGHTS.TASK_COMPLETION_WEIGHT +
        feedback.delivery_score * SCORING_WEIGHTS.DELIVERY_WEIGHT +
        feedback.linguistic_score * SCORING_WEIGHTS.LINGUISTIC_WEIGHT
      )
      
      // Apply filler word penalties
      if (feedback.filler_analysis?.penalty_applied) {
        feedback.weighted_overall_score -= feedback.filler_analysis.penalty_applied
      }
      
      // Ensure score is in valid range
      feedback.weighted_overall_score = Math.max(0, Math.min(100, feedback.weighted_overall_score))
      feedback.overall_score = Math.round(feedback.weighted_overall_score)
      
      // Determine if level is passed (75+ required)
      feedback.pass_level = feedback.overall_score >= 75
      
    } catch (e) {
      console.error('⚠️ Failed to parse feedback:', e)
      feedback = {
        task_completion_analysis: {
          did_address_task: true,
          relevance_percentage: 70,
          explanation: "You made a solid attempt at addressing the task"
        },
        task_completion_score: 70,
        delivery_score: 68,
        linguistic_score: 65,
        overall_score: 68,
        weighted_overall_score: 68,
        pass_level: false,
        strengths: [
          'You addressed the task requirements',
          'You showed good effort and engagement',
          'You delivered a complete response'
        ],
        improvements: [
          'Work on your pacing and flow',
          'Practice reducing filler words',
          'Focus on clarity and confidence in delivery'
        ],
        detailed_feedback: "You did a solid job addressing this task! Your effort and engagement really came through. While you're not quite at passing level yet, you're close - with a bit more practice on clarity and confidence, you'll definitely get there. Keep focusing on the task requirements and your delivery will continue to improve. Great work so far!",
        focus_area_scores: { 'Task Completion': 70, 'Delivery': 68, 'Quality': 65 },
        filler_analysis: {
          filler_words_count: 0,
          filler_words_detected: [],
          awkward_pauses_count: 0,
          repetitive_phrases: [],
          penalty_applied: 0
        },
        linguistic_analysis: {
          grammar: { score: 65, issues: [], suggestions: ['Continue developing natural fluency'] },
          sentence_formation: { score: 65, complexity_level: 'intermediate', variety_score: 60, flow_score: 65, issues: [], suggestions: ['Practice varying sentence structure'] },
          vocabulary: { score: 65, level_appropriateness: 65, variety_score: 60, casual_tone_score: 70, advanced_words_used: [], suggested_alternatives: {}, issues: [] }
        }
      }
    }

    // Step 3 & 4: Generate AI example AND audio in PARALLEL (faster!)
    console.log('🚀 Generating example and audio in parallel...')
    
    const aiExamplePrompt = `You are demonstrating this speaking task naturally and authentically.

**Task:** ${lesson.practice_prompt}
**Context:** ${lesson.practice_example || 'Show natural, authentic communication'}
**Level:** ${levelNumber}

Create a demonstration response that completes the task effectively. Make it 30-60 seconds when spoken (75-150 words), natural, and appropriate for the level.

Respond with ONLY the speech text.`

    const voice = toneVoiceMap[tone] || 'shimmer'

    // Run AI text generation and prepare audio generation in parallel
    const [aiExampleResponse] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You demonstrate speaking tasks naturally and authentically.' },
          { role: 'user', content: aiExamplePrompt }
        ],
        temperature: 0.9,
      })
    ])

    const aiExampleText = aiExampleResponse.choices[0].message.content || 'Example not available.'
    console.log('✅ AI example generated')

    // Generate audio from the text
    console.log('🔊 Generating audio...')
    const aiAudioResponse = await openai.audio.speech.create({
      model: 'tts-1-hd',
      voice: voice as any,
      input: aiExampleText,
      speed: 0.95
    })

    const aiAudioBuffer = Buffer.from(await aiAudioResponse.arrayBuffer())
    console.log('✅ Audio generated')

    // Step 5 & 6: Save to database and update progress in PARALLEL (faster!)
    console.log('💾 Saving session and updating progress in parallel...')
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const shouldComplete = feedback.pass_level === true && feedback.overall_score >= 80

    const [sessionResult, progressResult] = await Promise.all([
      // Save session
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
          ai_example_text: aiExampleText,
          ai_example_audio: aiAudioBuffer.toString('base64'),
          feedback: feedback,
          overall_score: feedback.overall_score,
          status: 'completed',
          completed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }),
      
      // Update progress
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

    if (progressResult.error) {
      console.warn('⚠️ Progress update warning:', progressResult.error)
      // Don't fail the entire request if progress update fails
    }

    console.log(`✅ Session saved and progress updated - Completed: ${shouldComplete}, Score: ${feedback.overall_score}`)
    console.log('🎉 Strict coaching feedback complete!')
    // Track lesson completion event
    Mixpanel.track('Lesson Completed', {
      lesson_id: lesson.id,
      lesson_title: lesson.level_title,
      category: categoryName,
      module_number: moduleId,
      lesson_number: lessonId,
      score: feedback.overall_score,
      passed: feedback.pass_level,
      coaching_style: tone,
      session_id: sessionId
    });
    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      practice_prompt: lesson.practice_prompt,
    })

  } catch (error) {
    console.error('❌ Feedback API error:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      { 
        error: 'Failed to process feedback', 
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}