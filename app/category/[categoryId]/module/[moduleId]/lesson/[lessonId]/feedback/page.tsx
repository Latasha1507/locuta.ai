// app/api/generate-enhanced-feedback/route.ts

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Type definitions
interface LessonData {
  level_number: number
  feedback_focus_areas: string
  practice_prompt: string
  expected_duration_sec: number
  module_title: string
}

interface AudioData {
  ai_example_audio: string
  ai_example_text: string
}

interface RequestBody {
  sessionId: string
  userTranscript: string
  lessonData: LessonData
  tone: string
  audioData: AudioData
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

export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { 
    sessionId,
    userTranscript,
    lessonData,
    tone,
    audioData 
  }: RequestBody = await request.json()

  try {
    // Get level expectations based on lesson level
    const levelExpectations = getLevelExpectations(lessonData.level_number)
    const weights = SCORING_WEIGHTS.getAdjustedWeights(lessonData.level_number)
    
    // Parse focus areas from the lesson data with explicit typing
    const focusAreas: string[] = lessonData.feedback_focus_areas.split('|')
    
    // Generate comprehensive feedback using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert communication coach specializing in casual conversation skills. 
          Provide detailed, constructive feedback that helps learners improve both their content delivery and linguistic skills.
          For this level ${lessonData.level_number} lesson, apply appropriate expectations:
          - Grammar expectations: ${JSON.stringify(levelExpectations.grammar)}
          - Vocabulary expectations: ${JSON.stringify(levelExpectations.vocabulary)}
          - Sentence formation expectations: ${JSON.stringify(levelExpectations.sentence_formation)}
          
          Remember: This is CASUAL CONVERSATION practice. Natural flow and authentic communication 
          are more important than perfect formal grammar.`
        },
        {
          role: "user",
          content: `
            Analyze this casual conversation practice response and provide comprehensive feedback.
            
            **User's Response:** "${userTranscript}"
            
            **Lesson Context:**
            - Level: ${lessonData.level_number} (out of 50)
            - Practice Prompt: ${lessonData.practice_prompt}
            - Expected Duration: ${lessonData.expected_duration_sec} seconds
            - Tone: ${tone}
            - Module: ${lessonData.module_title}
            
            **Evaluation Criteria:**
            
            1. LESSON-SPECIFIC PARAMETERS (${weights.CONTENT_WEIGHT * 100}% weight):
            ${focusAreas.map((area: string, i: number) => `   ${i + 1}. ${area}`).join('\n')}
            
            2. LINGUISTIC QUALITY (${weights.LINGUISTIC_WEIGHT * 100}% weight):
            
            A. Grammar (${SCORING_WEIGHTS.GRAMMAR_WEIGHT * 100}% of linguistic score):
               - Grammatical correctness appropriate for casual conversation
               - Tense consistency
               - Natural contractions and informal structures
               - Article usage
               - Common casual speech patterns
            
            B. Sentence Formation (${SCORING_WEIGHTS.SENTENCE_FORMATION_WEIGHT * 100}% of linguistic score):
               - Sentence complexity appropriate for level ${lessonData.level_number}
               - Natural conversation flow
               - Variety in sentence structures
               - Appropriate sentence fragments (common in casual speech)
               - Smooth transitions between ideas
            
            C. Vocabulary (${SCORING_WEIGHTS.VOCABULARY_WEIGHT * 100}% of linguistic score):
               - Vocabulary appropriate for level ${lessonData.level_number}
               - Natural, conversational word choices
               - Avoiding overly formal or academic language
               - Word variety without being pretentious
               - Appropriate use of colloquialisms and idioms
            
            Provide feedback in this exact JSON format:
            {
              "overall_score": <0-100 based on all criteria>,
              "focus_area_scores": {
                "<focus_area_name>": <0-100 score for each focus area>
              },
              "detailed_feedback": "<A comprehensive paragraph explaining overall performance, highlighting what worked well and what needs improvement. Be encouraging but specific.>",
              "strengths": [
                "<Specific strength 1>",
                "<Specific strength 2>",
                "<At least 3 strengths>"
              ],
              "improvements": [
                "<Specific improvement area 1 with actionable advice>",
                "<Specific improvement area 2 with actionable advice>",
                "<At least 2-3 improvement areas>"
              ],
              "linguistic_analysis": {
                "grammar": {
                  "score": <0-100>,
                  "issues": ["<List specific grammar issues found, if any>"],
                  "suggestions": ["<Specific suggestions for grammar improvement>"]
                },
                "sentence_formation": {
                  "score": <0-100>,
                  "complexity_level": "<basic|intermediate|advanced based on actual performance>",
                  "variety_score": <0-100 for sentence variety>,
                  "flow_score": <0-100 for conversational flow>,
                  "issues": ["<Specific sentence structure issues>"],
                  "suggestions": ["<Ways to improve sentence formation>"]
                },
                "vocabulary": {
                  "score": <0-100>,
                  "level_appropriateness": <0-100 how well vocabulary matches expected level>,
                  "variety_score": <0-100 for word variety>,
                  "casual_tone_score": <0-100 for maintaining casual conversation tone>,
                  "advanced_words_used": ["<List impressive or well-chosen words>"],
                  "suggested_alternatives": {
                    "<word that could be improved>": ["<alternative 1>", "<alternative 2>"]
                  },
                  "issues": ["<Vocabulary-related issues>"]
                }
              },
              "content_score": <weighted average of focus area scores>,
              "linguistic_score": <weighted average of linguistic scores>,
              "weighted_overall_score": <final weighted score combining content and linguistic>
            }
          `
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const feedback = JSON.parse(completion.choices[0].message.content || '{}')
    
    // Calculate weighted scores if not provided by AI
    if (!feedback.content_score) {
      const focusAreaScores = Object.values(feedback.focus_area_scores) as number[]
      feedback.content_score = focusAreaScores.reduce((a: number, b: number) => a + b, 0) / focusAreaScores.length
    }
    
    if (!feedback.linguistic_score) {
      const grammarScore = feedback.linguistic_analysis.grammar.score
      const sentenceScore = feedback.linguistic_analysis.sentence_formation.score
      const vocabularyScore = feedback.linguistic_analysis.vocabulary.score
      
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

    // Update session with enhanced feedback
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        feedback,
        user_transcript: userTranscript,
        ai_example_audio: audioData.ai_example_audio,
        ai_example_text: audioData.ai_example_text,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ 
      success: true, 
      feedback,
      sessionId 
    })

  } catch (error) {
    console.error('Error generating enhanced feedback:', error)
    return NextResponse.json(
      { error: 'Failed to generate feedback' },
      { status: 500 }
    )
  }
}

// Helper functions
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