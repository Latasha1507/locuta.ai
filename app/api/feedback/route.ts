// app/api/feedback/route.ts
import { createClient } from '@/lib/supabase/server'
import { checkSessionLimitServer } from '@/lib/check-session-limit-server'
import { uploadAudio, userRecordingPath, exampleAudioPath } from '@/lib/audio-storage'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Lazily constructed. Building the client at module scope throws during
// import if OPENAI_API_KEY is missing, which turns a config problem into a
// 500 on every request to the whole route (including the auth check).
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
    _openai = new OpenAI({ apiKey })
  }
  return _openai
}

const categoryMap: { [key: string]: string } = {
  'public-speaking': 'Public Speaking',
  'storytelling': 'Storytelling',
  'creator-speaking': 'Creator Speaking',
  'casual-conversation': 'Casual Conversation',
  'workplace-communication': 'Workplace Communication',
  'pitch-anything': 'Pitch Anything',
}

const toneVoiceMap: { [key: string]: string } = {
  'Supportive': 'nova',
  'Challenging': 'onyx',
  'Funny': 'alloy',
  'Diplomatic': 'shimmer',
  'Normal': 'shimmer',
}

const SCORING_WEIGHTS = {
  GRAMMAR_WEIGHT: 0.30,
  SENTENCE_FORMATION_WEIGHT: 0.35,
  VOCABULARY_WEIGHT: 0.35,
  
  getAdjustedWeights: (levelNumber: number) => {
    if (levelNumber <= 10) {
      return { CONTENT_WEIGHT: 0.70, LINGUISTIC_WEIGHT: 0.30 }
    } else if (levelNumber <= 30) {
      return { CONTENT_WEIGHT: 0.60, LINGUISTIC_WEIGHT: 0.40 }
    } else {
      return { CONTENT_WEIGHT: 0.50, LINGUISTIC_WEIGHT: 0.50 }
    }
  }
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
      grammar: { 
        tolerance: 'high', 
        focus: ['basic sentence structure', 'simple tenses', 'basic questions'] 
      },
      vocabulary: { 
        expected: 'basic conversational vocabulary', 
        complexity: 'simple everyday words', 
        variety: 'moderate repetition acceptable' 
      },
      sentence_formation: { 
        complexity: 'simple and compound sentences', 
        transitions: 'basic connectors (and, but, so)' 
      },
    },
    intermediate: {
      grammar: { 
        tolerance: 'medium', 
        focus: ['consistent tenses', 'proper conjunctions', 'varied sentence types'] 
      },
      vocabulary: { 
        expected: 'expanded casual vocabulary', 
        complexity: 'mix of simple and intermediate words', 
        variety: 'good variety expected' 
      },
      sentence_formation: { 
        complexity: 'mix of compound and complex sentences', 
        transitions: 'varied transitions and connectors' 
      },
    },
    advanced: {
      grammar: { 
        tolerance: 'low', 
        focus: ['complex sentences', 'advanced grammar', 'nuanced expressions'] 
      },
      vocabulary: { 
        expected: 'rich conversational vocabulary', 
        complexity: 'sophisticated word choices', 
        variety: 'minimal repetition, creative expression' 
      },
      sentence_formation: { 
        complexity: 'sophisticated sentence variety', 
        transitions: 'smooth, natural flow with advanced transitions' 
      },
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

    // ---------------------------------------------------------------------
    // SECURITY / COST: enforce the trial + daily limit HERE, on the server,
    // before we spend anything on Whisper or GPT-4. The browser check in
    // lib/check-session-limit.ts is only a UX affordance — anyone can POST
    // straight to this route and skip it.
    // ---------------------------------------------------------------------
    const limit = await checkSessionLimitServer(user.id)
    if (!limit.allowed) {
      console.warn('⛔ Session blocked by limit:', limit.reason)
      return NextResponse.json(
        {
          error:
            limit.reason === 'trial_expired'
              ? 'Your free trial has ended. Upgrade to keep practising.'
              : "You've used all your practice sessions for today. Come back tomorrow, or upgrade for unlimited.",
          reason: limit.reason,
          daysRemaining: limit.daysRemaining,
          sessionsRemainingToday: limit.sessionsRemainingToday,
        },
        { status: 429 },
      )
    }

    const categoryName = categoryMap[categoryId]
    const levelNumber = parseInt(lessonId)

    // Get lesson details
    const { data: lessons, error: lessonError } = await supabase
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
      }, { status: 404 })
    }

    console.log('✅ Lesson found:', lesson.level_title)

    // Get level expectations and weights
    const levelExpectations = getLevelExpectations(levelNumber)
    const weights = SCORING_WEIGHTS.getAdjustedWeights(levelNumber)

    // Step 1: Transcribe audio with FORCED ENGLISH
    console.log('🎤 Transcribing audio (English only)...')
    const transcription = await getOpenAI().audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
      prompt: 'This is an English speaking practice recording. Transcribe only in English.',
    })

    const userTranscript = transcription.text
    console.log('✅ Transcription:', userTranscript.substring(0, 100) + '...')

    if (!isEnglishText(userTranscript)) {
      console.warn('⚠️ Non-English content detected, but proceeding with transcription')
    }

    // Step 2: Generate AI example
    console.log('🎯 Generating AI example response...')
    const aiExamplePrompt = `You are demonstrating how to complete this speaking task perfectly for a Level ${levelNumber} learner.

**Task:** ${lesson.practice_prompt}

**Category:** ${categoryName}
**Coaching Style:** ${tone}
**Focus Areas:** ${lesson.feedback_focus_areas}

Create a natural, authentic example response that:
1. Directly addresses the task
2. Uses appropriate vocabulary for Level ${levelNumber}
3. Demonstrates good pacing and natural flow
4. Is 30-60 seconds when spoken (approximately 75-150 words)
5. Sounds like real human speech, not scripted

Respond with ONLY the example speech text - no explanation, no meta-commentary.`

    const aiExampleResponse = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: `You are an expert speaking coach creating demonstration examples. 
          Speak naturally and authentically. Never say things like "As a language model..." 
          or "Here's an example..." - just speak the example directly.` 
        },
        { role: 'user', content: aiExamplePrompt }
      ],
      temperature: 0.8,
      max_tokens: 200,
    })

    const aiExampleText = aiExampleResponse.choices[0].message.content || 
                          'Example not available.'
    console.log('✅ AI example generated:', aiExampleText.substring(0, 50) + '...')

    // Step 3: Generate audio for AI example
    console.log('🔊 Generating AI audio...')
    const voice = toneVoiceMap[tone] || 'shimmer'
    const aiAudioResponse = await getOpenAI().audio.speech.create({
      model: 'tts-1',
      voice: voice as any,
      input: aiExampleText,
    })

    const aiAudioBuffer = Buffer.from(await aiAudioResponse.arrayBuffer())
    const aiAudioBase64 = aiAudioBuffer.toString('base64')
    console.log('✅ AI audio generated')
    // Step 4: Generate comprehensive feedback
    console.log('💬 Generating feedback...')
    
    const focusAreas = Array.isArray(lesson.feedback_focus_areas) 
      ? lesson.feedback_focus_areas 
      : (lesson.feedback_focus_areas || 'Clarity, Confidence, Delivery')
          .split(',')
          .map((s: string) => s.trim())
    
    const focusAreasStr = focusAreas.join(', ')

    const feedbackPrompt = `You are an expert communication coach. Analyze this English-only speaking practice session.

**CRITICAL: This is an ENGLISH-ONLY platform. The user should be speaking ONLY in English. If the transcription contains non-English words, note this as a major issue.**

**Lesson Context:**
- Level: ${levelNumber} (out of 50)
- Title: ${lesson.level_title}
- Task: ${lesson.practice_prompt}
- Focus Areas: ${focusAreasStr}
- Communication Style: ${tone}

**Level Expectations for Level ${levelNumber}:**
- Grammar: ${JSON.stringify(levelExpectations.grammar)}
- Vocabulary: ${JSON.stringify(levelExpectations.vocabulary)}
- Sentence Formation: ${JSON.stringify(levelExpectations.sentence_formation)}

**User's Response:** "${userTranscript}"

**Evaluation Criteria:**

1. ENGLISH LANGUAGE REQUIREMENT:
   - Verify the response is entirely in English
   - Flag any non-English content as a critical issue

2. CONTENT & DELIVERY (${weights.CONTENT_WEIGHT * 100}% of total score):
   - Task completion
   - Relevance to focus areas: ${focusAreasStr}
   - Communication effectiveness

3. LINGUISTIC QUALITY (${weights.LINGUISTIC_WEIGHT * 100}% of total score):
   
   A. Grammar (${SCORING_WEIGHTS.GRAMMAR_WEIGHT * 100}% of linguistic score):
      - Grammatical correctness for level ${levelNumber}
      - Tense consistency
      - Article and preposition usage
      
   B. Sentence Formation (${SCORING_WEIGHTS.SENTENCE_FORMATION_WEIGHT * 100}% of linguistic score):
      - Sentence complexity appropriate for level ${levelNumber}
      - Variety in structures
      - Flow and transitions
      
   C. Vocabulary (${SCORING_WEIGHTS.VOCABULARY_WEIGHT * 100}% of linguistic score):
      - Vocabulary richness for level ${levelNumber}
      - Word variety
      - Natural usage

**HOW TO WRITE "detailed_feedback" (this is what the learner reads as their coach speaking):**
- Talk directly TO the learner as "you" — never "the user", "the speaker", "the response", or "the story".
- Write in FIRST PERSON as their coach ("I loved how you…", "I'd push you to…"). It must feel like one person talking to them, not a report.
- Quote or name something SPECIFIC they actually said, so it's obviously about THEIR answer and not a template.
- Match the ${tone} coaching style in voice: Funny = playful and light; Supportive = warm and reassuring; Bossy = direct and punchy; Inspiring = energising; Diplomatic = calm and measured; Normal = clear and friendly.
- 2-4 sentences. One genuine specific strength, then the single most useful thing to work on. No generic filler like "keep practicing to improve".
- "strengths" and "improvements" arrays: also address the learner as "you" and reference their actual answer where possible.

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "overall_score": 85,
  "content_score": 80,
  "linguistic_score": 90,
  "weighted_overall_score": 84,
  "passed": true,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2"],
  "detailed_feedback": "First-person, direct-address paragraph in the coach's voice",
  "focus_area_scores": {
    "Clarity": 80,
    "Confidence": 85,
    "Delivery": 90
  },
  "linguistic_analysis": {
    "grammar": {
      "score": 85,
      "issues": ["issue if any"],
      "suggestions": ["suggestion 1", "suggestion 2"]
    },
    "sentence_formation": {
      "score": 88,
      "complexity_level": "intermediate",
      "variety_score": 85,
      "flow_score": 90,
      "issues": ["issue if any"],
      "suggestions": ["suggestion"]
    },
    "vocabulary": {
      "score": 82,
      "level_appropriateness": 85,
      "variety_score": 80,
      "advanced_words_used": ["word1", "word2"],
      "suggested_alternatives": {
        "word": ["alternative1", "alternative2"]
      },
      "issues": ["issue if any"]
    }
  },
  "language_compliance": {
    "is_english_only": true,
    "non_english_words_detected": [],
    "language_score_penalty": 0
  },
  "words_to_learn": [
    {"word": "vivid", "meaning": "producing a strong, clear picture in the mind", "example": "She gave a vivid description of the beach."}
  ],
  "grammar_fixes": [
    {"before": "I go to beach yesterday", "after": "I went to the beach yesterday", "why": "past tense + missing article"}
  ]
}

GRAMMAR_FIXES: pull 1-3 SHORT phrases the learner ACTUALLY said that had a grammar mistake, and show the corrected version. "before" must be their real words (quote from the transcript), "after" is the fix, "why" is a 2-5 word reason (e.g. "past tense", "missing article", "subject-verb agreement"). If their grammar was clean, return an empty array — never invent mistakes.

WORDS_TO_LEARN: pick 2-3 useful words that would genuinely help THIS learner say what they were trying to say, pitched at their level (Level ${levelNumber}). "meaning" is a short plain-English definition (max ~10 words). "example" is one short natural sentence using the word. If the response is already strong, return fewer or an empty array — never pad with words they clearly already know.

Be encouraging but honest. If non-English content detected, reduce overall score significantly.`

    const feedbackResponse = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'You are a warm, specific, personal speaking coach who always talks directly TO the learner as "you" and in the first person — never in the third person or like a report. Respond ONLY with valid JSON, no markdown or code blocks.' 
        },
        { role: 'user', content: feedbackPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    })

    let feedback
    try {
      const feedbackText = feedbackResponse.choices[0].message.content || '{}'
      feedback = JSON.parse(feedbackText)
      
      if (!feedback.content_score && feedback.focus_area_scores) {
        const scores = Object.values(feedback.focus_area_scores) as number[]
        feedback.content_score = scores.reduce((a, b) => a + b, 0) / scores.length
      }
      
      if (!feedback.linguistic_score && feedback.linguistic_analysis) {
        const grammarScore = feedback.linguistic_analysis.grammar.score || 75
        const sentenceScore = feedback.linguistic_analysis.sentence_formation.score || 75
        const vocabularyScore = feedback.linguistic_analysis.vocabulary.score || 75
        
        feedback.linguistic_score = (
          grammarScore * SCORING_WEIGHTS.GRAMMAR_WEIGHT +
          sentenceScore * SCORING_WEIGHTS.SENTENCE_FORMATION_WEIGHT +
          vocabularyScore * SCORING_WEIGHTS.VOCABULARY_WEIGHT
        )
      }
      
      if (!feedback.weighted_overall_score) {
        feedback.weighted_overall_score = (
          feedback.content_score * weights.CONTENT_WEIGHT +
          feedback.linguistic_score * weights.LINGUISTIC_WEIGHT
        )
      }
      
      feedback.overall_score = Math.round(feedback.weighted_overall_score)
      
      const passThreshold = levelNumber <= 10 ? 60 : levelNumber <= 30 ? 65 : 70
      feedback.passed = feedback.overall_score >= passThreshold
      
      console.log('✅ Feedback generated:', {
        overall: feedback.overall_score,
        passed: feedback.passed,
        threshold: passThreshold
      })
      
    } catch (e) {
      console.error('⚠️ Failed to parse feedback:', e)
      feedback = {
        overall_score: 70,
        content_score: 70,
        linguistic_score: 70,
        weighted_overall_score: 70,
        passed: false,
        strengths: ['Good effort', 'Clear speaking', 'Engaged with task'],
        improvements: ['Practice more', 'Focus on task requirements'],
        detailed_feedback: 'Keep practicing to improve your speaking skills.',
        words_to_learn: [],
        grammar_fixes: [],
        focus_area_scores: { Clarity: 70, Confidence: 70, Delivery: 70 },
        linguistic_analysis: {
          grammar: { score: 70, issues: [], suggestions: [] },
          sentence_formation: { 
            score: 70, 
            complexity_level: 'basic',
            variety_score: 70,
            flow_score: 70,
            issues: [], 
            suggestions: [] 
          },
          vocabulary: { 
            score: 70,
            level_appropriateness: 70,
            variety_score: 70,
            advanced_words_used: [],
            suggested_alternatives: {},
            issues: [] 
          }
        }
      }
    }

    // Step 5: Save session to database
    console.log('💾 Attempting to save session...')
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Persist the user's OWN recording so it can be replayed on the feedback
    // page beside the coach version. The blob was already read for Whisper;
    // we upload the same bytes. Non-fatal: if it fails, the compare UI simply
    // falls back to "recording unavailable" rather than blocking feedback.
    let userAudioUrl = ''
    try {
      const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
      const url = await uploadAudio(
        supabase,
        userRecordingPath(user.id, sessionId),
        audioBuffer,
        audioFile.type || 'audio/webm',
      )
      if (url) userAudioUrl = url
    } catch (e) {
      console.error('⚠️ Failed to store user recording (non-critical):', e)
    }

    // Upload the coach's spoken example to storage and keep a real URL. Until
    // now this audio was generated then only stored as base64 under a column
    // the feedback page never read, so the coach player never appeared. A URL
    // streams from the CDN and is what the compare UI actually uses.
    let exampleAudioUrl = ''
    try {
      const url = await uploadAudio(
        supabase,
        exampleAudioPath(user.id, sessionId),
        aiAudioBuffer,
        'audio/mpeg',
      )
      if (url) exampleAudioUrl = url
    } catch (e) {
      console.error('⚠️ Failed to store coach example audio (non-critical):', e)
    }

    const { data: sessionData, error: insertError } = await supabase
      .from('sessions')
      .insert({
        id: sessionId,
        user_id: user.id,
        category: categoryName,
        module_number: parseInt(moduleId),
        level_number: levelNumber,
        tone: tone,
        user_transcript: userTranscript,
        user_audio_url: userAudioUrl,
        ai_example_text: aiExampleText,
        ai_example_audio: aiAudioBase64,
        ai_example_audio_url: exampleAudioUrl,
        feedback: feedback,
        overall_score: feedback.overall_score,
        status: 'completed',
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()

    if (insertError) {
      console.error('❌ SESSION INSERT FAILED:', {
        error: insertError,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      })
      return NextResponse.json({ 
        error: 'Failed to save session', 
        details: insertError.message 
      }, { status: 500 })
    }

    console.log('✅ Session saved successfully:', sessionId)

    // Step 6: Increment daily session counter for trial users
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_type, last_session_date, daily_sessions_used')
        .eq('id', user.id)
        .single()
      
      if (profile && profile.plan_type === 'trial') {
        const today = new Date().toISOString().split('T')[0]
        const lastSessionDate = profile.last_session_date
        
        if (lastSessionDate === today) {
          await supabase
            .from('profiles')
            .update({ 
              daily_sessions_used: (profile.daily_sessions_used || 0) + 1 
            })
            .eq('id', user.id)
          
          console.log('✅ Daily session counted:', (profile.daily_sessions_used || 0) + 1)
        } else {
          await supabase
            .from('profiles')
            .update({ 
              last_session_date: today,
              daily_sessions_used: 1 
            })
            .eq('id', user.id)
          
          console.log('✅ New day, session count reset to 1')
        }
      }
    } catch (error) {
      console.error('⚠️ Failed to update session count (non-critical):', error)
    }

    // Step 7: Update progress with correct completion logic
    try {
      const moduleNumber = parseInt(moduleId)
      const passThreshold = moduleNumber === 1 ? 70 : 75

      console.log('🔍 Step 7: Starting progress update...', {
        moduleNumber,
        passThreshold,
        userId: user.id,
        categoryName,
        levelNumber,
        score: feedback.overall_score
      })

      const { data: existingProgress, error: fetchError } = await supabase
        .from('user_progress')
        .select('best_score, completed')
        .eq('user_id', user.id)
        .eq('category', categoryName)
        .eq('module_number', moduleNumber)
        .eq('level_number', levelNumber)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Error fetching existing progress:', fetchError)
      } else {
        console.log('✅ Existing progress:', existingProgress || 'No existing progress')
      }

      const isNewBest = !existingProgress || 
                        feedback.overall_score > (existingProgress.best_score || 0)

      const isCompleted = feedback.overall_score >= passThreshold
      const finalCompletedStatus = existingProgress?.completed || isCompleted

      const progressData = {
        user_id: user.id,
        category: categoryName,
        module_number: moduleNumber,
        level_number: levelNumber,
        completed: finalCompletedStatus,
        best_score: isNewBest ? feedback.overall_score : existingProgress?.best_score,
        last_attempted_at: new Date().toISOString(),
      }

      console.log('💾 About to upsert progress:', progressData)

      const { data: upsertedData, error: upsertError } = await supabase
        .from('user_progress')
        .upsert(progressData, {
          onConflict: 'user_id,category,module_number,level_number'
        })
        .select()

      if (upsertError) {
        console.error('❌ UPSERT FAILED:', {
          error: upsertError,
          message: upsertError.message,
          details: upsertError.details,
          hint: upsertError.hint,
          code: upsertError.code
        })
      } else {
        console.log('✅ Progress saved successfully!', upsertedData)
      }

    } catch (progressError) {
      console.error('❌ EXCEPTION in progress update:', progressError)
    }

    console.log('🎉 Feedback generation complete!')

    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      feedback: feedback,
      score: feedback.overall_score,
      passed: feedback.passed,
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

// Helper function to validate English text
function isEnglishText(text: string): boolean {
  const latinChars = text.match(/[a-zA-Z\s]/g) || []
  const totalChars = text.replace(/\s/g, '').length
  
  if (totalChars === 0) return false
  
  const latinRatio = latinChars.length / totalChars
  return latinRatio > 0.7
}