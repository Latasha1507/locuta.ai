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
  'investor-pitch': 'Investor Pitch',
}

const toneVoiceMap: { [key: string]: string } = {
  'Normal': 'shimmer',
  'Supportive': 'nova',
  'Inspiring': 'sage',
  'Funny': 'coral',
  'Diplomatic': 'nova',
  'Bossy': 'ash',
}

// Scoring weights configuration
const SCORING_WEIGHTS = {
  CONTENT_WEIGHT: 0.6,
  LINGUISTIC_WEIGHT: 0.4,
  GRAMMAR_WEIGHT: 0.3,
  SENTENCE_FORMATION_WEIGHT: 0.35,
  VOCABULARY_WEIGHT: 0.35,
  
  getAdjustedWeights(levelNumber: number): { CONTENT_WEIGHT: number; LINGUISTIC_WEIGHT: number } {
    if (levelNumber <= 10) {
      return { CONTENT_WEIGHT: 0.7, LINGUISTIC_WEIGHT: 0.3 }
    } else if (levelNumber <= 30) {
      return { CONTENT_WEIGHT: 0.6, LINGUISTIC_WEIGHT: 0.4 }
    } else {
      return { CONTENT_WEIGHT: 0.5, LINGUISTIC_WEIGHT: 0.5 }
    }
  },
}

interface LevelExpectation {
  grammar: {
    tolerance: string
    focus: string[]
  }
  vocabulary: {
    expected: string
    complexity: string
    variety: string
  }
  sentence_formation: {
    complexity: string
    transitions: string
  }
}

function getLevelExpectations(levelNumber: number): LevelExpectation {
  const category = levelNumber <= 10 ? 'beginner' : 
                   levelNumber <= 30 ? 'intermediate' : 'advanced'
  
  const expectations: Record<string, LevelExpectation> = {
    beginner: {
      grammar: {
        tolerance: 'high',
        focus: ['basic sentence structure', 'simple tenses', 'basic questions'],
      },
      vocabulary: {
        expected: 'basic conversational vocabulary',
        complexity: 'simple everyday words',
        variety: 'moderate repetition acceptable',
      },
      sentence_formation: {
        complexity: 'simple and compound sentences',
        transitions: 'basic connectors (and, but, so)',
      },
    },
    intermediate: {
      grammar: {
        tolerance: 'medium',
        focus: ['consistent tenses', 'proper conjunctions', 'varied sentence types'],
      },
      vocabulary: {
        expected: 'expanded casual vocabulary',
        complexity: 'mix of simple and intermediate words',
        variety: 'good variety expected',
      },
      sentence_formation: {
        complexity: 'mix of compound and complex sentences',
        transitions: 'varied transitions and connectors',
      },
    },
    advanced: {
      grammar: {
        tolerance: 'low',
        focus: ['complex sentences', 'advanced grammar', 'nuanced expressions'],
      },
      vocabulary: {
        expected: 'rich conversational vocabulary',
        complexity: 'sophisticated word choices',
        variety: 'minimal repetition, creative expression',
      },
      sentence_formation: {
        complexity: 'sophisticated sentence variety',
        transitions: 'smooth, natural flow with advanced transitions',
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
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('category', categoryName)
      .eq('module_number', parseInt(moduleId))
      .eq('level_number', levelNumber)
      .single()

    if (lessonError || !lesson) {
      console.error('❌ Lesson not found:', lessonError)
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    console.log('✅ Lesson found:', lesson.level_title)

    // Get level expectations and weights
    const levelExpectations = getLevelExpectations(levelNumber)
    const weights = SCORING_WEIGHTS.getAdjustedWeights(levelNumber)

    // Step 1: Transcribe audio
    console.log('🎤 Transcribing audio...')
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    })

    const userTranscript = transcription.text
    console.log('✅ Transcription:', userTranscript.substring(0, 100) + '...')

    // Step 2: Generate enhanced feedback with linguistic analysis
    console.log('💬 Generating enhanced feedback...')
    
    const focusAreas = lesson.feedback_focus_areas || ['Clarity', 'Confidence', 'Delivery']
    const focusAreasStr = Array.isArray(focusAreas) ? focusAreas.join(', ') : focusAreas

    const feedbackPrompt = `You are an expert communication coach specializing in speaking skills. Analyze this practice session and provide comprehensive feedback.

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

1. CONTENT & DELIVERY (${weights.CONTENT_WEIGHT * 100}% of total score):
   - How well did they address the task?
   - Relevance to focus areas: ${focusAreasStr}
   - Overall communication effectiveness

2. LINGUISTIC QUALITY (${weights.LINGUISTIC_WEIGHT * 100}% of total score):
   
   A. Grammar (${SCORING_WEIGHTS.GRAMMAR_WEIGHT * 100}% of linguistic score):
      - Grammatical correctness appropriate for level ${levelNumber}
      - Tense consistency and proper usage
      - Article and preposition usage
      
   B. Sentence Formation (${SCORING_WEIGHTS.SENTENCE_FORMATION_WEIGHT * 100}% of linguistic score):
      - Sentence complexity appropriate for level ${levelNumber}
      - Variety in sentence structures
      - Flow and transitions between ideas
      
   C. Vocabulary (${SCORING_WEIGHTS.VOCABULARY_WEIGHT * 100}% of linguistic score):
      - Vocabulary richness appropriate for level ${levelNumber}
      - Word variety and appropriateness
      - Natural language usage for the context

Respond with ONLY valid JSON in this EXACT structure (no markdown, no code blocks):
{
  "overall_score": 85,
  "content_score": 80,
  "linguistic_score": 90,
  "weighted_overall_score": 84,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "detailed_feedback": "A comprehensive paragraph explaining overall performance",
  "focus_area_scores": {
    "Clarity": 80,
    "Confidence": 85,
    "Delivery": 90
  },
  "linguistic_analysis": {
    "grammar": {
      "score": 85,
      "issues": ["issue 1 if any", "issue 2 if any"],
      "suggestions": ["suggestion 1", "suggestion 2"]
    },
    "sentence_formation": {
      "score": 88,
      "complexity_level": "intermediate",
      "variety_score": 85,
      "flow_score": 90,
      "issues": ["issue if any"],
      "suggestions": ["suggestion 1", "suggestion 2"]
    },
    "vocabulary": {
      "score": 82,
      "level_appropriateness": 85,
      "variety_score": 80,
      "casual_tone_score": 85,
      "advanced_words_used": ["word1", "word2"],
      "suggested_alternatives": {
        "word": ["alternative1", "alternative2"]
      },
      "issues": ["issue if any"]
    }
  }
}

Be encouraging but honest. Give specific, actionable feedback.`

    const feedbackResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert communication coach. Respond ONLY with valid JSON, no markdown or code blocks.' },
        { role: 'user', content: feedbackPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    })

    let feedback
    try {
      const feedbackText = feedbackResponse.choices[0].message.content || '{}'
      feedback = JSON.parse(feedbackText)
      console.log('✅ Feedback generated with score:', feedback.overall_score)
      
      // Calculate weighted scores if not provided by AI
      if (!feedback.content_score && feedback.focus_area_scores) {
        const focusAreaScores = Object.values(feedback.focus_area_scores) as number[]
        feedback.content_score = focusAreaScores.reduce((a: number, b: number) => a + b, 0) / focusAreaScores.length
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
      
      // Ensure overall_score matches weighted_overall_score
      feedback.overall_score = Math.round(feedback.weighted_overall_score)
      
    } catch (e) {
      console.error('⚠️ Failed to parse feedback:', e)
      feedback = {
        overall_score: 75,
        content_score: 75,
        linguistic_score: 75,
        weighted_overall_score: 75,
        strengths: ['Good effort', 'Clear speaking', 'Engaged with task'],
        improvements: ['Practice more', 'Work on pacing', 'Add more detail'],
        detailed_feedback: 'You did well! Keep practicing to improve your speaking skills.',
        focus_area_scores: {
          'Clarity': 75,
          'Confidence': 75,
          'Delivery': 75
        },
        linguistic_analysis: {
          grammar: {
            score: 75,
            issues: [],
            suggestions: ['Focus on proper grammar usage']
          },
          sentence_formation: {
            score: 75,
            complexity_level: 'basic',
            variety_score: 70,
            flow_score: 75,
            issues: [],
            suggestions: ['Vary your sentence structures']
          },
          vocabulary: {
            score: 75,
            level_appropriateness: 75,
            variety_score: 70,
            casual_tone_score: 80,
            advanced_words_used: [],
            suggested_alternatives: {},
            issues: []
          }
        }
      }
    }

    // Step 3: Generate AI example
    console.log('🤖 Generating AI example...')
    
    const aiExamplePrompt = `Create a perfect example response for this task. Respond with ONLY the speech text, no explanations.

Task: ${lesson.practice_prompt}
Context: ${lesson.practice_example || 'Demonstrate excellent speaking skills'}
Level: ${levelNumber}

Create a natural, conversational response (30-60 seconds when spoken) that demonstrates excellent grammar, varied sentence structures, and appropriate vocabulary for level ${levelNumber}.`

    const aiExampleResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are demonstrating excellent speaking skills.' },
        { role: 'user', content: aiExamplePrompt }
      ],
      temperature: 0.8,
    })

    const aiExampleText = aiExampleResponse.choices[0].message.content || 'Example not available.'
    console.log('✅ AI example generated')

    // Step 4: Generate audio of AI example
    console.log('🔊 Generating AI audio...')
    const voice = toneVoiceMap[tone] || 'shimmer'
    const aiAudioResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice as any,
      input: aiExampleText,
    })

    const aiAudioBuffer = Buffer.from(await aiAudioResponse.arrayBuffer())
    console.log('✅ AI audio generated')

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
        lesson_number: levelNumber,
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

    // Step 6: Update progress
    console.log('📊 Updating progress...')
    await supabase
      .from('user_progress')
      .upsert({
        user_id: user.id,
        category: categoryName,
        module_number: parseInt(moduleId),
        lesson_number: levelNumber,
        completed: true,
        best_score: feedback.overall_score,
        last_practiced: new Date().toISOString(),
      }, {
        onConflict: 'user_id,category,module_number,lesson_number'
      })

    console.log('✅ Progress updated')
    console.log('🎉 Enhanced feedback complete!')

    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      feedback: feedback,
    })

  } catch (error) {
    console.error('❌ Feedback API error:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      { 
        error: 'Failed to process feedback', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}