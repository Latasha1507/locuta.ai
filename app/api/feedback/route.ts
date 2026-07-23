// app/api/feedback/route.ts
import { createClient } from '@/lib/supabase/server'
import { checkSessionLimitServer } from '@/lib/check-session-limit-server'
import { uploadAudio, userRecordingPath, exampleAudioPath } from '@/lib/audio-storage'
import { analyzeSpeech, composeScore, type ModelScores } from '@/lib/speech-metrics'
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

// Scoring weights now live in lib/speech-metrics.ts (the real engine). The old
// SCORING_WEIGHTS/getAdjustedWeights here were never actually applied — the
// score came straight from a number GPT echoed — so they've been removed.

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
    // Clip length in seconds (the practice recorder sends this). Used only to
    // compute a real speaking pace — never trusted for billing.
    const duration = Number(formData.get('duration') ?? 0)

    console.log('📝 Request params:', { tone, categoryId, moduleId, lessonId })

    if (!audioFile) {
      console.error('❌ No audio file')
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Read the recording bytes ONCE, up front, and reuse them for the storage
    // upload later. Reading audioFile.arrayBuffer() only AFTER Whisper has read
    // the stream can silently come back empty — that's why user recordings were
    // never saved. Also strip any ";codecs=opus" suffix from the type: Supabase
    // Storage matches the bucket's allowed-MIME list on the bare type, so
    // "audio/webm;codecs=opus" is rejected where "audio/webm" is accepted.
    const audioBytes = Buffer.from(await audioFile.arrayBuffer())
    const cleanAudioType = (audioFile.type || 'audio/webm').split(';')[0].trim() || 'audio/webm'
    // Match the file extension to the real container (Safari records mp4, Chrome
    // webm, some browsers ogg) so the stored object isn't mislabelled.
    const audioExt = cleanAudioType.includes('mp4')
      ? 'mp4'
      : cleanAudioType.includes('ogg')
        ? 'ogg'
        : 'webm'

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

    // Get level expectations (used as context for the model's rubric).
    const levelExpectations = getLevelExpectations(levelNumber)

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

    // OBJECTIVE metrics measured straight from the transcript + clip length.
    // These form the deterministic core of the score (see lib/speech-metrics).
    const expectedWords = Math.round((Number(lesson.expected_duration_sec) || 45) * 2.1)
    const metrics = analyzeSpeech(userTranscript, duration, expectedWords)

    const feedbackPrompt = `You are an expert English speaking coach. Judge ONE ~30-60 second spoken answer.

**Lesson Context:**
- Level: ${levelNumber} (out of 50)
- Title: ${lesson.level_title}
- Task: ${lesson.practice_prompt}
- Focus Areas: ${focusAreasStr}
- Coaching Style: ${tone}

**What "good" looks like at Level ${levelNumber}:**
- Grammar: ${JSON.stringify(levelExpectations.grammar)}
- Vocabulary: ${JSON.stringify(levelExpectations.vocabulary)}
- Sentence Formation: ${JSON.stringify(levelExpectations.sentence_formation)}

**The learner actually said:** "${userTranscript}"

**SCORING RUBRIC — score each dimension INDEPENDENTLY, 0-100, for a Level ${levelNumber} learner.**
Use the FULL range and be discriminating. Do NOT cluster everything around 75-85. Two different answers must get clearly different scores. Base every score on SPECIFIC evidence in the words above.
- 90-100: excellent; near-flawless for this level.
- 80-89: strong; only minor issues.
- 70-79: solid; a few clear issues.
- 60-69: developing; noticeable or frequent issues.
- 45-59: weak; errors often get in the way of meaning.
- below 45: very limited, off-task, or hard to follow.

Score these FIVE:
- "task_completion": did they actually DO what the task asked — answer the real question and cover what it wanted? An eloquent answer that dodges or only half-addresses the task scores LOW here, however nice it sounds.
- "content": richness and relevance of the ideas — specific, on-topic, effective (judge quality, not length).
- "grammar": correctness for the level — tense, agreement, articles, prepositions.
- "vocabulary": range, precision and naturalness of word choice for the level.
- "coherence": structure, logical flow, transitions, and staying on the task.
Also score EACH focus area listed above (keys exactly: ${focusAreasStr}) on the same 0-100 rubric.
Set "is_english" to false if the answer contains meaningful non-English content.
DO NOT return an overall, average, or weighted score — only the components. The platform computes the final number from your component scores plus objective delivery metrics it measures itself.

**HOW TO WRITE "detailed_feedback" (this is what the learner reads as their coach speaking):**
- Talk directly TO the learner as "you" — never "the user", "the speaker", "the response", or "the story".
- Write in FIRST PERSON as their coach ("I loved how you…", "I'd push you to…"). It must feel like one person talking to them, not a report.
- Quote or name something SPECIFIC they actually said, so it's obviously about THEIR answer and not a template.
- Match the ${tone} coaching style: Funny = playful and light; Supportive = warm and reassuring; Bossy = direct and punchy; Inspiring = energising; Diplomatic = calm and measured; Normal = clear and friendly.
- 2-4 sentences. One genuine specific strength, then the single most useful thing to work on. No generic filler like "keep practicing to improve".
- "strengths" and "improvements": also address the learner as "you" and reference their actual words where possible.

Respond with ONLY valid JSON (no markdown, no code blocks). Replace every <0-100> with an integer you choose per the rubric:
{
  "is_english": true,
  "scores": {
    "task_completion": <0-100>,
    "content": <0-100>,
    "grammar": <0-100>,
    "vocabulary": <0-100>,
    "coherence": <0-100>
  },
  "focus_area_scores": { "<each focus area>": <0-100> },
  "strengths": ["you-focused strength referencing their answer", "another"],
  "improvements": ["the single most useful fix, you-focused", "optional second"],
  "detailed_feedback": "First-person, direct-address paragraph in the coach's voice",
  "words_to_learn": [
    {"word": "vivid", "meaning": "producing a strong, clear mental picture", "example": "She gave a vivid description of the beach."}
  ],
  "grammar_fixes": [
    {"before": "I go to beach yesterday", "after": "I went to the beach yesterday", "why": "past tense + missing article"}
  ]
}

GRAMMAR_FIXES: pull 1-3 SHORT phrases the learner ACTUALLY said that had a grammar mistake, with the corrected version. "before" must quote their real words, "after" is the fix, "why" is a 2-5 word reason. If their grammar was clean, return an empty array — never invent mistakes.

WORDS_TO_LEARN: return 3 useful words (2 minimum) that would genuinely help THIS learner say what they were trying to say, pitched at Level ${levelNumber}. "meaning" is a short plain-English definition (max ~10 words). "example" is one short natural sentence. Never pad with words they clearly already know.

Be encouraging but honest.`

    const feedbackResponse = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'You are a warm, specific, personal speaking coach who always talks directly TO the learner as "you" and in the first person — never in the third person or like a report. Respond ONLY with valid JSON, no markdown or code blocks.' 
        },
        { role: 'user', content: feedbackPrompt }
      ],
      temperature: 0.4,
      response_format: { type: "json_object" }
    })

    let feedback
    try {
      const feedbackText = feedbackResponse.choices[0].message.content || '{}'
      feedback = JSON.parse(feedbackText)
      
      // Component scores from the model (0-100 each), clamped. The model NO
      // LONGER returns an overall — we compute it here from these components
      // plus the objective metrics measured above.
      const clampScore = (x: unknown, dflt = 62): number => {
        const n = Math.round(Number(x))
        return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : dflt
      }
      const componentScores = (feedback.scores ?? {})
      const model = {
        grammar: clampScore(componentScores.grammar),
        vocabulary: clampScore(componentScores.vocabulary),
        coherence: clampScore(componentScores.coherence),
        content: clampScore(componentScores.content),
        task: clampScore(componentScores.task_completion),
      }
      const isEnglish = feedback.is_english !== false && isEnglishText(userTranscript)
      const result = composeScore(model, metrics, levelNumber, isEnglish)

      // Re-derive focus-area scores. "Confidence" and "delivery/fluency/pace"
      // areas are GROUNDED in the objective delivery signal rather than the
      // model's guess — we can't measure confidence, so we approximate it from
      // how they actually delivered. Other areas keep the model's judgement.
      const rawFocus = (feedback.focus_area_scores ?? {})
      const focusAreaScores: Record<string, number> = {}
      for (const area of focusAreas) {
        const key = String(area).toLowerCase()
        if (key.includes('confid')) focusAreaScores[area] = result.confidence
        else if (key.includes('deliver') || key.includes('fluen') || key.includes('pace'))
          focusAreaScores[area] = result.delivery
        else focusAreaScores[area] = Math.max(30, clampScore(rawFocus[area], result.coherence))
      }
      feedback.focus_area_scores = focusAreaScores

      feedback.content_score = result.content
      feedback.linguistic_score = result.linguistic
      feedback.delivery_score = result.delivery
      feedback.task_score = result.task
      feedback.confidence_score = result.confidence
      feedback.weighted_overall_score = result.overall
      feedback.overall_score = result.overall
      feedback.linguistic_analysis = {
        grammar: { score: result.grammar },
        sentence_formation: { score: result.coherence },
        vocabulary: { score: result.vocabulary },
      }

      const passThreshold = parseInt(moduleId) === 1 ? 70 : 75
      feedback.passed = feedback.overall_score >= passThreshold

      console.log('✅ Feedback scored:', {
        overall: result.overall,
        task: result.task,
        content: result.content,
        linguistic: result.linguistic,
        delivery: result.delivery,
        confidence: result.confidence,
        wpm: metrics.wpm,
        fillers: metrics.fillerCount,
        passed: feedback.passed,
      })
      
    } catch (e) {
      console.error('⚠️ Failed to parse model feedback, scoring from metrics only:', e)
      const fb = composeScore(
        { grammar: 62, vocabulary: 62, coherence: 62, content: 60, task: 58 },
        metrics,
        levelNumber,
        isEnglishText(userTranscript),
      )
      feedback = {
        overall_score: fb.overall,
        content_score: fb.content,
        linguistic_score: fb.linguistic,
        weighted_overall_score: fb.overall,
        delivery_score: fb.delivery,
        task_score: fb.task,
        confidence_score: fb.confidence,
        passed: fb.overall >= (parseInt(moduleId) === 1 ? 70 : 75),
        strengths: ['You completed the task', 'You kept going to the end'],
        improvements: ['Add a little more detail next time'],
        detailed_feedback: '',
        words_to_learn: [],
        grammar_fixes: [],
        focus_area_scores: Object.fromEntries(focusAreas.map((a: string) => [a, fb.content])),
        linguistic_analysis: {
          grammar: { score: fb.grammar },
          sentence_formation: { score: fb.coherence },
          vocabulary: { score: fb.vocabulary },
        },
      }
    }

    // Objective delivery metrics for the UI chips (already measured above).
    feedback.filler_count = metrics.fillerCount
    feedback.speaking_wpm = metrics.wpm

    // Step 5: Save session to database
    console.log('💾 Attempting to save session...')
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Persist the user's OWN recording so it can be replayed on the feedback
    // page beside the coach version. The blob was already read for Whisper;
    // we upload the same bytes. Non-fatal: if it fails, the compare UI simply
    // falls back to "recording unavailable" rather than blocking feedback.
    let userAudioUrl = ''
    try {
      const url = await uploadAudio(
        supabase,
        userRecordingPath(user.id, sessionId, audioExt),
        audioBytes,
        cleanAudioType,
      )
      if (url) {
        userAudioUrl = url
      } else {
        // uploadAudio already logged the Supabase error; add a pointer to the
        // most common cause so it's obvious in the logs.
        console.error(
          `⚠️ User recording upload returned no URL (type ${cleanAudioType}). ` +
            'Check the lesson-audio bucket allows audio/webm, audio/mp4 and audio/ogg.',
        )
      }
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