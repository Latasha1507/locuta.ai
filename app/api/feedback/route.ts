// app/api/feedback/route.ts
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { checkSessionLimitServer } from '@/lib/check-session-limit-server'
import { uploadAudio, userRecordingPath, exampleAudioPath } from '@/lib/audio-storage'
import { getRequestMeta } from '@/lib/request-meta'
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
    // SECURITY / COST: the browser caps recording length (maxSeconds), but that
    // is bypassable — anyone can POST an arbitrary file straight to this route.
    // Reject oversized or non-audio uploads BEFORE we buffer them into memory
    // and pay OpenAI to transcribe them. A 3-minute recording is well under 1MB;
    // 12MB is generous headroom for higher-bitrate formats.
    // ---------------------------------------------------------------------
    const MAX_AUDIO_BYTES = 12 * 1024 * 1024
    if (audioFile.size > MAX_AUDIO_BYTES) {
      console.warn('⛔ Audio too large:', audioFile.size)
      return NextResponse.json(
        { error: 'That recording is too large. Please keep it under a couple of minutes.' },
        { status: 413 },
      )
    }
    const audioType = audioFile.type || ''
    if (audioType && !audioType.startsWith('audio/')) {
      console.warn('⛔ Non-audio upload rejected:', audioType)
      return NextResponse.json(
        { error: 'Unsupported file type — please submit an audio recording.' },
        { status: 415 },
      )
    }

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

    // Read the recording bytes ONCE, up front. Passing the original File to
    // Whisper consumes its stream, after which a second arrayBuffer() read
    // returns empty — which is why the user recording never got stored. We keep
    // the bytes here and reuse them for BOTH transcription and the upload.
    const userAudioBytes = Buffer.from(await audioFile.arrayBuffer())
    const whisperFile = new File([userAudioBytes], audioFile.name || 'recording.webm', {
      type: audioFile.type || 'audio/webm',
    })

    // Step 1: Transcribe audio with FORCED ENGLISH
    console.log('🎤 Transcribing audio (English only)...')
    const transcription = await getOpenAI().audio.transcriptions.create({
      file: whisperFile,
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
    // Length comes from the lesson's own expected_duration_sec (set by the
    // curriculum author per task) — NOT a fixed 30–60s. A "repeat this line
    // three times" task has a small duration; an open-ended one has a larger
    // one. ~130 words per minute of natural speech. This mirrors how
    // /api/generate-example sizes its answer, so the two stay consistent.
    const exampleDurationSec = Number(lesson.expected_duration_sec) || 30
    const exampleTargetWords = Math.max(12, Math.round((exampleDurationSec / 60) * 130))
    const aiExamplePrompt = `You are demonstrating how to complete this exact speaking task for a Level ${levelNumber} learner, in a ${tone} coaching style.

**Task:** ${lesson.practice_prompt}

Produce ONLY what a strong speaker would actually SAY to complete THIS task — nothing else.

Rules:
- Length: about ${exampleTargetWords} words (~${exampleDurationSec} seconds spoken). Do not exceed the length the task needs.
- Speak the task the way a real person actually would — naturally, once through. If the task lists several phrases or starters to practise, say each ONE naturally with the right tone, as a short flowing example. Do NOT chant or repeat any phrase multiple times. Only say a line more than once if the task LITERALLY tells you to repeat that one exact line a set number of times. If it's open-ended, give one strong, natural response of the target length.
- Do NOT re-teach, coach, narrate breathing, or add warm-ups, intros, or encouragement ("take a deep breath", "great job", "one more time"). Only the spoken answer.
- No meta-commentary, no stage directions, no wrapping quotation marks.

Respond with ONLY the example speech text.`

    const aiExampleResponse = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert speaking coach who demonstrates a task by speaking ONLY the answer, naturally, at the length the task needs. You never pad, never re-teach, never add breathing cues or pep talk. If the task lists several phrases or starters, you say each ONE naturally with good tone — as a flowing example, never chanting or repeating a phrase multiple times. You only repeat a line if the task literally instructs repeating that one exact line a set number of times. If the task is open-ended, you give one natural answer of the requested length.`,
        },
        { role: 'user', content: aiExamplePrompt },
      ],
      temperature: 0.6,
      max_tokens: 400,
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

Respond with ONLY valid JSON (no markdown, no code blocks). The numbers below are PLACEHOLDERS showing the FORMAT — you MUST replace every score with a genuine 0–100 rating of THIS learner's actual recording. Do NOT copy the placeholder numbers. Score honestly: a weak answer with grammar errors, poor vocabulary, or very slow/awkward pacing should score low (40s–60s); an average answer 60s–70s; only a genuinely strong, fluent answer should score 80+. Vary the numbers to match what you actually heard.
{
  "content_score": <0-100: how well they addressed the task, ideas, delivery>,
  "focus_area_scores": {
    "Clarity": <0-100>,
    "Confidence": <0-100>,
    "Delivery": <0-100>
  },
  "passed": <true|false>,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2"],
  "detailed_feedback": "First-person, direct-address paragraph in the coach's voice",
  "linguistic_analysis": {
    "grammar": {
      "score": <0-100: penalise real errors in what they said>,
      "issues": ["issue if any"],
      "suggestions": ["suggestion 1", "suggestion 2"]
    },
    "sentence_formation": {
      "score": <0-100>,
      "complexity_level": "<basic|intermediate|advanced>",
      "variety_score": <0-100>,
      "flow_score": <0-100>,
      "issues": ["issue if any"],
      "suggestions": ["suggestion"]
    },
    "vocabulary": {
      "score": <0-100>,
      "level_appropriateness": <0-100>,
      "variety_score": <0-100>,
      "advanced_words_used": ["word1", "word2"],
      "suggested_alternatives": {
        "word": ["alternative1", "alternative2"]
      },
      "issues": ["issue if any"]
    }
  },
  "language_compliance": {
    "is_english_only": <true|false>,
    "non_english_words_detected": [],
    "language_score_penalty": <0-100>
  },
  "words_to_learn": [
    {"word": "vivid", "meaning": "producing a strong, clear picture in the mind", "example": "She gave a vivid description of the beach."}
  ],
  "grammar_fixes": [
    {"before": "I go to beach yesterday", "after": "I went to the beach yesterday", "why": "past tense + missing article"}
  ]
}

GRAMMAR_FIXES: pull 1-3 SHORT phrases the learner ACTUALLY said that had a grammar mistake, and show the corrected version. "before" must be their real words (quote from the transcript), "after" is the fix, "why" is a 2-5 word reason (e.g. "past tense", "missing article", "subject-verb agreement"). If their grammar was clean, return an empty array — never invent mistakes.

WORDS_TO_LEARN: return 3 useful words (2 minimum — a single word looks broken in the UI) that would genuinely help THIS learner say what they were trying to say, pitched at their level (Level ${levelNumber}). "meaning" is a short plain-English definition (max ~10 words). "example" is one short natural sentence using the word. Only return fewer than 2 if the response is exceptional; never pad with words they clearly already know.

Be encouraging but honest. If non-English content detected, reduce overall score significantly.`

    // Generate + parse feedback with ONE retry. JSON mode makes malformed
    // output rare; if it happens we ask again rather than fabricate a score.
    let feedback: any = null
    let lastParseError: unknown = null
    for (let attempt = 1; attempt <= 2; attempt++) {
      const feedbackResponse = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a warm, specific, personal speaking coach who always talks directly TO the learner as "you" and in the first person — never in the third person or like a report. Respond ONLY with valid JSON, no markdown or code blocks.',
          },
          { role: 'user', content: feedbackPrompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      })
      try {
        feedback = JSON.parse(feedbackResponse.choices[0].message.content || '{}')
        break // parsed OK
      } catch (e) {
        lastParseError = e
        console.error(`⚠️ Feedback parse failed (attempt ${attempt}/2):`, e)
        feedback = null
      }
    }

    if (feedback) {
      // Guard: the model must have returned the real component scores. If any
      // critical one is missing, we do NOT substitute a made-up number — we
      // treat the attempt as unscored and return an honest error below.
      const la0 = feedback.linguistic_analysis ?? {}
      const hasContent =
        typeof feedback.content_score === 'number' ||
        (feedback.focus_area_scores &&
          Object.values(feedback.focus_area_scores).some((v) => Number.isFinite(Number(v))))
      const hasLinguistic =
        Number.isFinite(Number(la0.grammar?.score)) &&
        Number.isFinite(Number(la0.sentence_formation?.score)) &&
        Number.isFinite(Number(la0.vocabulary?.score))
      if (!hasContent || !hasLinguistic) {
        console.error('⚠️ Feedback missing critical component scores — not fabricating.')
        return NextResponse.json(
          { error: "We couldn't score this attempt just now. Please try again." },
          { status: 502 },
        )
      }

      // ── SCORING IS COMPUTED IN CODE, NOT TRUSTED FROM THE MODEL ──────────────
      // The model returns only COMPONENT scores (content, grammar, sentence,
      // vocabulary, focus areas). We derive linguistic + overall ourselves with
      // SCORING_WEIGHTS. Previously the model returned its own overall and the
      // code only recomputed "if missing" — so a value copied from the prompt
      // template (the infamous 84) skipped the formula entirely. Now it always
      // runs, so the score reflects the actual component ratings.

      const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0))

      // Content: prefer the model's content_score; else average the focus areas.
      let contentScore: number
      if (typeof feedback.content_score === 'number') {
        contentScore = clamp(feedback.content_score)
      } else if (feedback.focus_area_scores) {
        const s = Object.values(feedback.focus_area_scores).map(Number).filter(Number.isFinite) as number[]
        contentScore = s.length ? clamp(s.reduce((a, b) => a + b, 0) / s.length) : 60
      } else {
        contentScore = 60
      }

      // Linguistic: ALWAYS computed from grammar / sentence / vocabulary.
      const la = feedback.linguistic_analysis ?? {}
      const grammarScore = clamp(Number(la.grammar?.score ?? 60))
      const sentenceScore = clamp(Number(la.sentence_formation?.score ?? 60))
      const vocabularyScore = clamp(Number(la.vocabulary?.score ?? 60))
      const linguisticScore =
        grammarScore * SCORING_WEIGHTS.GRAMMAR_WEIGHT +
        sentenceScore * SCORING_WEIGHTS.SENTENCE_FORMATION_WEIGHT +
        vocabularyScore * SCORING_WEIGHTS.VOCABULARY_WEIGHT

      // Overall: ALWAYS computed from content + linguistic with level weights.
      let overall = contentScore * weights.CONTENT_WEIGHT + linguisticScore * weights.LINGUISTIC_WEIGHT

      // English-only penalty (the model reports a 0–100 penalty to subtract).
      const penalty = clamp(Number(feedback.language_compliance?.language_score_penalty ?? 0))
      overall = clamp(overall - penalty)

      feedback.content_score = Math.round(contentScore)
      feedback.linguistic_score = Math.round(linguisticScore)
      feedback.weighted_overall_score = overall
      feedback.overall_score = Math.round(overall)

      const passThreshold = levelNumber <= 10 ? 60 : levelNumber <= 30 ? 65 : 70
      feedback.passed = feedback.overall_score >= passThreshold

      console.log('✅ Feedback scored (computed):', {
        content: feedback.content_score,
        grammar: grammarScore,
        sentence: sentenceScore,
        vocab: vocabularyScore,
        linguistic: feedback.linguistic_score,
        overall: feedback.overall_score,
        passed: feedback.passed,
        threshold: passThreshold,
      })

    } else {
      // Both attempts failed to return parseable JSON. Per our rule — NEVER show
      // a fabricated score — we don't invent a 70. Return an honest error so the
      // UI asks the learner to try again. No session/score is recorded.
      console.error('⚠️ Feedback unavailable after retry:', lastParseError)
      return NextResponse.json(
        { error: "We couldn't score this attempt just now. Please try again." },
        { status: 502 },
      )
    }

    // Step 5: Save session to database
    console.log('💾 Attempting to save session...')
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Persist the user's OWN recording so it can be replayed on the feedback
    // page beside the coach version. The blob was already read for Whisper;
    // we upload the same bytes. Non-fatal: if it fails, the compare UI simply
    // falls back to "recording unavailable" rather than blocking feedback.
    // One SERVICE-ROLE client for every privileged write below — audio uploads
    // AND the sessions insert / user_progress upsert / trial counter. The audio
    // bucket's RLS blocks the user client; and just as importantly, sessions
    // (overall_score) and user_progress (completed/best_score) drive gating and
    // lesson unlocks, so they must NOT be writable by the user client — otherwise
    // a user could INSERT a fake 100 straight to the DB and unlock content. All of
    // it now goes through the admin client on the trusted server.
    const admin = createAdminClient()

    let userAudioUrl = ''
    try {
      // Browsers report the recording as e.g. "audio/webm;codecs=opus", but the
      // storage bucket only accepts the base MIME type — the ";codecs=…" suffix
      // makes Supabase reject the upload. Strip it to the base type.
      const rawType = audioFile.type || 'audio/webm'
      const baseType = rawType.split(';')[0].trim() || 'audio/webm'
      // Reuse the bytes we read before Whisper (audioFile's stream is spent).
      const url = await uploadAudio(
        admin,
        userRecordingPath(user.id, sessionId),
        userAudioBytes,
        baseType,
      )
      if (url) userAudioUrl = url
    } catch (e) {
      console.error('⚠️ Failed to store user recording (non-critical):', e)
    }

    let exampleAudioUrl = ''
    try {
      const url = await uploadAudio(
        admin,
        exampleAudioPath(user.id, sessionId),
        aiAudioBuffer,
        'audio/mpeg',
      )
      if (url) exampleAudioUrl = url
    } catch (e) {
      console.error('⚠️ Failed to store coach example audio (non-critical):', e)
    }

    // Analytics dimensions from the request (no IP stored). These feed the admin
    // analytics browser/device/country charts, which were only ever showing
    // "Unknown" because this insert never populated them.
    const meta = getRequestMeta(request)

    const { data: sessionData, error: insertError } = await admin
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
        // Only fall back to inline base64 if the Storage upload FAILED. Writing
        // the ~450 KB blob into the row unconditionally (as this used to) is what
        // bloated `sessions` to 75 MB — the audio is already at
        // ai_example_audio_url. Same pattern as /api/generate-example.
        ai_example_audio: exampleAudioUrl ? '' : aiAudioBase64,
        ai_example_audio_url: exampleAudioUrl,
        feedback: feedback,
        overall_score: feedback.overall_score,
        browser_type: meta.browserType,
        device_type: meta.deviceType,
        user_country: meta.userCountry,
        user_city: meta.userCity,
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

    // Step 6: Increment daily session counter for trial users.
    // The COUNTER WRITES GO THROUGH THE SERVICE-ROLE CLIENT. daily_sessions_used
    // and last_session_date are trial-limit state — the authenticated role must
    // NOT be able to write them (or a user could reset their own daily counter to
    // dodge the limit). The profiles column GRANT now blocks the user client from
    // these columns, so this must use the admin client.
    try {
      const { data: profile } = await admin
        .from('profiles')
        .select('plan_type, last_session_date, daily_sessions_used')
        .eq('id', user.id)
        .single()

      if (profile && profile.plan_type === 'trial') {
        const today = new Date().toISOString().split('T')[0]
        const lastSessionDate = profile.last_session_date

        if (lastSessionDate === today) {
          await admin
            .from('profiles')
            .update({
              daily_sessions_used: (profile.daily_sessions_used || 0) + 1
            })
            .eq('id', user.id)

          console.log('✅ Daily session counted:', (profile.daily_sessions_used || 0) + 1)
        } else {
          await admin
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

      const { data: upsertedData, error: upsertError } = await admin
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