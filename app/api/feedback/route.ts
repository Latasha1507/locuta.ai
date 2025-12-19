// app/api/feedback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

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
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // FORCE ENGLISH ONLY - Critical fix
      prompt: 'This is an English speaking practice recording. Transcribe only in English.', // Additional hint
    })

    const userTranscript = transcription.text
    console.log('✅ Transcription:', userTranscript.substring(0, 100) + '...')

    // Validate that transcription is primarily English
    if (!isEnglishText(userTranscript)) {
      console.warn('⚠️ Non-English content detected, but proceeding with transcription')
    }

    // Step 2: Generate AI example FIRST (before feedback)
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

    const aiExampleResponse = await openai.chat.completions.create({
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
    const aiAudioResponse = await openai.audio.speech.create({
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

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "overall_score": 85,
  "content_score": 80,
  "linguistic_score": 90,
  "weighted_overall_score": 84,
  "passed": true,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2"],
  "detailed_feedback": "Comprehensive paragraph",
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
  }
}

Be encouraging but honest. If non-English content detected, reduce overall score significantly.`

    const feedbackResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert communication coach. Respond ONLY with valid JSON, no markdown or code blocks.' 
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
      
      // Calculate scores if missing
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
      
      // Determine pass/fail based on level-appropriate threshold
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
        level_number: levelNumber,  // sessions table uses level_number, not lesson_number
        tone: tone,
        user_transcript: userTranscript,
        ai_example_text: aiExampleText,
        ai_example_audio: aiAudioBase64,
        feedback: feedback,
        overall_score: feedback.overall_score,
        status: 'completed',
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('❌ Database error:', insertError)
      return NextResponse.json({ 
        error: 'Failed to save session', 
        details: insertError.message 
      }, { status: 500 })
    }

    console.log('✅ Session saved:', sessionId)

    // Step 6: Update progress
    const { data: existingProgress } = await supabase
      .from('user_progress')
      .select('best_score')
      .eq('user_id', user.id)
      .eq('category', categoryName)
      .eq('module_number', parseInt(moduleId))
      .eq('lesson_number', levelNumber)
      .single()

    const isNewBest = !existingProgress || 
                      feedback.overall_score > (existingProgress.best_score || 0)

    await supabase
      .from('user_progress')
      .upsert({
        user_id: user.id,
        category: categoryName,
        module_number: parseInt(moduleId),
        lesson_number: levelNumber,
        completed: feedback.passed,
        best_score: isNewBest ? feedback.overall_score : existingProgress?.best_score,
        last_practiced: new Date().toISOString(),
      }, {
        onConflict: 'user_id,category,module_number,lesson_number'
      })

    console.log('✅ Progress updated')
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
  // Simple heuristic: check if text contains mostly Latin characters
  const latinChars = text.match(/[a-zA-Z\s]/g) || []
  const totalChars = text.replace(/\s/g, '').length
  
  if (totalChars === 0) return false
  
  const latinRatio = latinChars.length / totalChars
  return latinRatio > 0.7 // At least 70% Latin characters
}