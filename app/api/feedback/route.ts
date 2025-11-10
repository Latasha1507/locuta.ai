import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

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

    // Step 2: Generate STRICT feedback with task completion validation
    console.log('💬 Generating strict coaching feedback...')
    
    const focusAreas = Array.isArray(lesson.feedback_focus_areas) 
      ? lesson.feedback_focus_areas 
      : (lesson.feedback_focus_areas || 'Clarity, Confidence, Delivery').split(',').map((s: string) => s.trim())
    
    const focusAreasStr = focusAreas.join(', ')

    const feedbackPrompt = `You are a strict but fair public speaking coach with rigorous evaluation standards. You evaluate objectively based on task completion, quality, and appropriateness.

**CRITICAL EVALUATION PHILOSOPHY:**
- TASK COMPLETION IS MANDATORY - if they didn't do the task, score drops to 0-30 range
- Be brutally honest about whether they addressed the prompt
- Scores 0-30 are common for off-task or nonsensical responses
- Scores 80+ are RARE and only for excellent, on-task execution
- Don't inflate scores for "effort" - evaluate actual performance

**Lesson Context:**
- Level: ${levelNumber} (out of 50)
- Title: ${lesson.level_title}
- **REQUIRED TASK:** ${lesson.practice_prompt}
- Focus Areas: ${focusAreasStr}
- Selected Tone: ${tone}

**User's Response:** "${userTranscript}"

**Level Expectations for Level ${levelNumber}:**
- Grammar: ${JSON.stringify(levelExpectations.grammar)}
- Vocabulary: ${JSON.stringify(levelExpectations.vocabulary)}
- Sentence Formation: ${JSON.stringify(levelExpectations.sentence_formation)}

**STRICT EVALUATION PROCESS:**

**STEP 1: TASK COMPLETION ANALYSIS (MANDATORY)**
First, analyze if they actually did the task:
- Did they address the specific prompt: "${lesson.practice_prompt}"?
- Is their response relevant to the lesson topic?
- Did they provide substance, or just filler/nonsense?

SCORING RULES:
- Completely off-task (e.g., "hello 1 2 3", random words) = 0-20
- Partially addresses task but mostly irrelevant = 20-40
- Addresses task but poorly executed = 40-60
- Adequately addresses task = 60-75
- Well addresses task = 75-85
- Excellently addresses task = 85-95

**STEP 2: DELIVERY & QUALITY ANALYSIS**
Only if task completion score is 40+, evaluate:

1. **TASK COMPLETION** (40% of total):
   - Relevance to prompt
   - Completeness of response
   - Appropriateness for the task

2. **DELIVERY & CONTENT** (30% of total):
   - Clarity and confidence
   - Structure and coherence
   - Engagement and authenticity
   - Appropriate tone for selected coaching style: ${tone}

3. **LINGUISTIC QUALITY** (30% of total):
   
   A. Grammar (35% of linguistic):
      - Sentence structure correctness
      - Tense consistency
      - Subject-verb agreement
      
   B. Sentence Formation (35% of linguistic):
      - Variety and complexity
      - Natural flow
      - Appropriate transitions
      
   C. Vocabulary (30% of linguistic):
      - Appropriateness for level ${levelNumber}
      - Word variety and richness
      - Natural vs. forced word choices

**STEP 3: FILLER WORDS & FLOW ANALYSIS**
Count and penalize:
- Filler words (um, uh, like, you know, basically, actually, literally when overused)
- Excessive pauses or awkward gaps
- Repetitive phrases
- False starts

Penalties:
- 1-3 fillers: -2 points
- 4-6 fillers: -5 points
- 7-10 fillers: -10 points
- 10+ fillers: -15 points
- Long awkward pauses: -5 points each

**RESPOND WITH STRICT, HONEST JSON:**

{
  "task_completion_analysis": {
    "did_address_task": true/false,
    "relevance_percentage": 0-100,
    "explanation": "1-2 sentences explaining if they did the task"
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
  "pass_level": true/false (true only if score >= 80),
  "strengths": [
    "Be specific - what exactly did they do well?",
    "Only list real strengths, not participation trophies",
    "If they did poorly, keep this list short or empty"
  ],
  "improvements": [
    "Be direct about what needs work",
    "Prioritize task completion issues first",
    "Give actionable, specific feedback"
  ],
  "detailed_feedback": "3-5 sentences of honest, constructive feedback. Start by addressing whether they completed the task. Be encouraging but truthful about the quality. If score is low, explain why clearly.",
  "focus_area_scores": {
    "${focusAreas[0] || 'Clarity'}": 0-100,
    "${focusAreas[1] || 'Confidence'}": 0-100,
    "${focusAreas[2] || 'Delivery'}": 0-100
  },
  "linguistic_analysis": {
    "grammar": {
      "score": 0-100,
      "issues": ["specific grammar mistakes found"],
      "suggestions": ["how to fix them"]
    },
    "sentence_formation": {
      "score": 0-100,
      "complexity_level": "basic/intermediate/advanced",
      "variety_score": 0-100,
      "flow_score": 0-100,
      "issues": ["specific flow or structure problems"],
      "suggestions": ["how to improve"]
    },
    "vocabulary": {
      "score": 0-100,
      "level_appropriateness": 0-100,
      "variety_score": 0-100,
      "casual_tone_score": 0-100,
      "advanced_words_used": ["actual good words they used"],
      "suggested_alternatives": {
        "weak_word": ["better alternatives"]
      },
      "issues": ["specific vocabulary problems"]
    }
  }
}

**CRITICAL REMINDERS:**
- If they didn't do the task, overall_score MUST be 0-30
- Don't give high scores just because audio quality is good
- Scores 80+ should be RARE - only for truly excellent responses
- Be honest - low scores help users improve more than inflated ones`

    const feedbackResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'You are a strict, objective public speaking evaluator. You give honest scores based on task completion and quality. Low scores (0-30) are common for poor responses. High scores (80+) are RARE. Respond ONLY with valid JSON.' 
        },
        { role: 'user', content: feedbackPrompt }
      ],
      temperature: 0.3,
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
      
      // Determine if level is passed (80+ required)
      feedback.pass_level = feedback.overall_score >= 80
      
    } catch (e) {
      console.error('⚠️ Failed to parse feedback:', e)
      feedback = {
        task_completion_analysis: {
          did_address_task: false,
          relevance_percentage: 30,
          explanation: "Unable to properly evaluate task completion"
        },
        task_completion_score: 30,
        delivery_score: 40,
        linguistic_score: 40,
        overall_score: 35,
        weighted_overall_score: 35,
        pass_level: false,
        strengths: ['You attempted the exercise'],
        improvements: [
          'Focus on directly addressing the specific task given',
          'Review the prompt carefully before recording',
          'Practice the complete response before recording'
        ],
        detailed_feedback: "Your response needs more focus on the specific task. Make sure you understand what's being asked before you start recording. Practice following the prompt exactly to improve your score.",
        focus_area_scores: { 'Task Completion': 30, 'Delivery': 40, 'Quality': 35 },
        filler_analysis: {
          filler_words_count: 0,
          filler_words_detected: [],
          awkward_pauses_count: 0,
          repetitive_phrases: [],
          penalty_applied: 0
        },
        linguistic_analysis: {
          grammar: { score: 40, issues: ['Unable to evaluate'], suggestions: ['Focus on task completion first'] },
          sentence_formation: { score: 40, complexity_level: 'basic', variety_score: 40, flow_score: 40, issues: [], suggestions: ['Follow the task prompt'] },
          vocabulary: { score: 40, level_appropriateness: 40, variety_score: 40, casual_tone_score: 40, advanced_words_used: [], suggested_alternatives: {}, issues: [] }
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
      })

    if (insertError) {
      console.error('❌ Database error:', insertError)
      return NextResponse.json({ error: 'Failed to save session', details: insertError.message }, { status: 500 })
    }

    console.log('✅ Session saved:', sessionId)

    // Step 6: Update progress - only mark completed if score >= 80
    console.log('📊 Updating progress...')
    
    const shouldComplete = feedback.pass_level === true && feedback.overall_score >= 80
    
    await supabase
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

    console.log(`✅ Progress updated - Completed: ${shouldComplete}, Score: ${feedback.overall_score}`)
    console.log('🎉 Strict coaching feedback complete!')

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