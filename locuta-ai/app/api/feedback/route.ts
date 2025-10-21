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

// Scoring weights
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
    const weights = SCORING_WEIGHTS.getAdjustedWeights(levelNumber)

    // Get lesson details - query by level_number
    const { data: lessons, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('category', categoryName)
      .eq('module_number', parseInt(moduleId))
      .eq('level_number', levelNumber)

    const lesson = lessons?.[0]

    if (lessonError || !lesson) {
      console.error('❌ Lesson not found:', lessonError)
      console.error('❌ Query params:', { categoryName, moduleId: parseInt(moduleId), levelNumber })
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

    // Step 2: Generate enhanced feedback with authentic coaching voice
    console.log('💬 Generating authentic coaching feedback...')
    
    const focusAreas = Array.isArray(lesson.feedback_focus_areas) 
      ? lesson.feedback_focus_areas 
      : (lesson.feedback_focus_areas || 'Clarity, Confidence, Delivery').split(',').map((s: string) => s.trim())
    
    const focusAreasStr = focusAreas.join(', ')

    const feedbackPrompt = `You are one of the world's most renowned and experienced public speaking coaches. You've helped thousands of people find their authentic voice and build genuine human connections through communication. You're known for your creative, honest, and deeply human approach to coaching - you never sugarcoat, but you always inspire.

Your coaching philosophy: Authenticity matters above all else. Real human connection beats perfect technique every time. You help people speak from the heart, not from a script.

**CRITICAL TONE INSTRUCTIONS:**
- Write like you're having a real conversation with this person over coffee
- Use natural, flowing language - never robotic or formulaic
- Be specific and personal - reference actual things they said
- Mix encouragement with honest observations
- Show genuine excitement about their strengths
- Be creative and unexpected in your feedback - avoid clichés
- Write as if you really care about helping this human being grow

**Lesson Context:**
- Level: ${levelNumber} (out of 50)
- Title: ${lesson.level_title}
- Task: ${lesson.practice_prompt}
- Focus Areas: ${focusAreasStr}

**User's Response:** "${userTranscript}"

**Level Expectations for Level ${levelNumber}:**
- Grammar: ${JSON.stringify(levelExpectations.grammar)}
- Vocabulary: ${JSON.stringify(levelExpectations.vocabulary)}
- Sentence Formation: ${JSON.stringify(levelExpectations.sentence_formation)}

**Evaluation Criteria:**

1. CONTENT & DELIVERY (${weights.CONTENT_WEIGHT * 100}% of total score):
   - How authentically did they engage with the task?
   - Did they create a genuine human moment?
   - Relevance to: ${focusAreasStr}

2. LINGUISTIC QUALITY (${weights.LINGUISTIC_WEIGHT * 100}% of total score):
   
   A. Grammar (${SCORING_WEIGHTS.GRAMMAR_WEIGHT * 100}% of linguistic):
      - Natural, conversational correctness for level ${levelNumber}
      - Don't penalize casual speech patterns if they're authentic
      
   B. Sentence Formation (${SCORING_WEIGHTS.SENTENCE_FORMATION_WEIGHT * 100}% of linguistic):
      - Does it flow like real human speech?
      - Appropriate variety for level ${levelNumber}
      
   C. Vocabulary (${SCORING_WEIGHTS.VOCABULARY_WEIGHT * 100}% of linguistic):
      - Words that feel natural, not forced
      - Appropriate richness for level ${levelNumber}

**CRITICAL: Your feedback must feel HUMAN, not AI-generated. Respond with valid JSON but make every word count:**

{
  "overall_score": 85,
  "content_score": 80,
  "linguistic_score": 90,
  "weighted_overall_score": 84,
  "strengths": [
    "Write 3-4 specific, genuine observations about what they did well - reference actual moments from their speech",
    "Be enthusiastic but authentic - show you really heard them",
    "Mix technical and emotional/human elements"
  ],
  "improvements": [
    "Give 2-3 honest, actionable suggestions",
    "Be direct but caring",
    "Include specific examples of what they could try next time"
  ],
  "detailed_feedback": "Write 4-6 sentences as if you're talking directly to them. Start with something specific you noticed. Build to your main observation. End with genuine encouragement. Make it personal and conversational - never generic or robotic.",
  "focus_area_scores": {
    "Clarity": 80,
    "Confidence": 85,
    "Delivery": 90
  },
  "linguistic_analysis": {
    "grammar": {
      "score": 85,
      "issues": ["Only mention real issues - be specific about what you heard"],
      "suggestions": ["Give practical, human advice - not textbook rules"]
    },
    "sentence_formation": {
      "score": 88,
      "complexity_level": "intermediate",
      "variety_score": 85,
      "flow_score": 90,
      "issues": ["Be honest about flow or rhythm issues"],
      "suggestions": ["Suggest natural ways to vary their speaking"]
    },
    "vocabulary": {
      "score": 82,
      "level_appropriateness": 85,
      "variety_score": 80,
      "casual_tone_score": 85,
      "advanced_words_used": ["List actual impressive words they used"],
      "suggested_alternatives": {
        "word": ["alternatives"]
      },
      "issues": ["Note any vocabulary that felt forced or unnatural"]
    }
  }
}

Remember: You're a world-class coach who builds authentic human connection. Every word should feel real, personal, and genuinely helpful. Never sound like a bot.`

    const feedbackResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'You are a world-renowned public speaking coach known for authentic, creative, deeply human feedback. You write like you talk - natural, flowing, genuine. Never robotic. Respond ONLY with valid JSON.' 
        },
        { role: 'user', content: feedbackPrompt }
      ],
      temperature: 0.85,
      response_format: { type: "json_object" }
    })

    let feedback
    try {
      const feedbackText = feedbackResponse.choices[0].message.content || '{}'
      feedback = JSON.parse(feedbackText)
      console.log('✅ Authentic feedback generated:', feedback.overall_score)
      
      // Calculate scores if missing
      if (!feedback.content_score && feedback.focus_area_scores) {
        const scores = Object.values(feedback.focus_area_scores) as number[]
        feedback.content_score = scores.reduce((a: number, b: number) => a + b, 0) / scores.length
      }
      
      if (!feedback.linguistic_score && feedback.linguistic_analysis) {
        const g = feedback.linguistic_analysis.grammar.score || 75
        const s = feedback.linguistic_analysis.sentence_formation.score || 75
        const v = feedback.linguistic_analysis.vocabulary.score || 75
        
        feedback.linguistic_score = (
          g * SCORING_WEIGHTS.GRAMMAR_WEIGHT +
          s * SCORING_WEIGHTS.SENTENCE_FORMATION_WEIGHT +
          v * SCORING_WEIGHTS.VOCABULARY_WEIGHT
        )
      }
      
      if (!feedback.weighted_overall_score) {
        feedback.weighted_overall_score = (
          feedback.content_score * weights.CONTENT_WEIGHT +
          feedback.linguistic_score * weights.LINGUISTIC_WEIGHT
        )
      }
      
      feedback.overall_score = Math.round(feedback.weighted_overall_score)
      
    } catch (e) {
      console.error('⚠️ Failed to parse feedback:', e)
      feedback = {
        overall_score: 75,
        content_score: 75,
        linguistic_score: 75,
        weighted_overall_score: 75,
        strengths: ['You showed up and practiced - that takes courage', 'Your message came through', 'You engaged with the task authentically'],
        improvements: ['Keep practicing to build confidence', 'Work on finding your natural rhythm', 'Experiment with varying your delivery'],
        detailed_feedback: "I can tell you put thought into this. The foundation is there - now it's about finding your authentic voice and letting it shine through. Keep practicing, and remember: the goal isn't perfection, it's connection.",
        focus_area_scores: { 'Clarity': 75, 'Confidence': 75, 'Delivery': 75 },
        linguistic_analysis: {
          grammar: { score: 75, issues: [], suggestions: ['Keep working on natural fluency'] },
          sentence_formation: { score: 75, complexity_level: 'basic', variety_score: 70, flow_score: 75, issues: [], suggestions: ['Experiment with different sentence rhythms'] },
          vocabulary: { score: 75, level_appropriateness: 75, variety_score: 70, casual_tone_score: 80, advanced_words_used: [], suggested_alternatives: {}, issues: [] }
        }
      }
    }

    // Step 3: Generate AI example with authentic human voice
    console.log('🤖 Generating authentic example...')
    
    const aiExamplePrompt = `You are one of the world's best public speaking coaches, demonstrating this speaking task. You're known for your authentic, natural, deeply human communication style. You never sound scripted - you sound real.

**Task:** ${lesson.practice_prompt}
**Context:** ${lesson.practice_example || 'Show natural, authentic communication'}
**Level:** ${levelNumber} (appropriate complexity)

Create a demonstration response that:
- Sounds like a real human having a genuine moment
- Shows authentic emotion and connection
- Flows naturally - not scripted or robotic
- Includes natural pauses, emphasis, and human rhythm
- Is 30-60 seconds when spoken (roughly 75-150 words)
- Demonstrates the skill while staying true and real

CRITICAL: Don't write a perfect speech. Write something that sounds like a real person speaking from the heart. Include natural imperfections that make it human. Make it conversational, warm, and genuine.

Respond with ONLY the speech text - no explanations, no markdown, just the natural spoken words.`

    const aiExampleResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'You are a master communicator demonstrating authentic, natural speech. Never robotic. Always real and human.' 
        },
        { role: 'user', content: aiExamplePrompt }
      ],
      temperature: 0.9,
    })

    const aiExampleText = aiExampleResponse.choices[0].message.content || 'Example not available.'
    console.log('✅ Authentic AI example generated')

    // Step 4: Generate audio with natural, authentic voice
    console.log('🔊 Generating authentic audio...')
    const voice = toneVoiceMap[tone] || 'shimmer'
    const aiAudioResponse = await openai.audio.speech.create({
      model: 'tts-1-hd', // Use HD for better quality
      voice: voice as any,
      input: aiExampleText,
      speed: 0.95 // Slightly slower for more natural feel
    })

    const aiAudioBuffer = Buffer.from(await aiAudioResponse.arrayBuffer())
    console.log('✅ Authentic audio generated')

    // Step 5: Save to database - using level_number
    console.log('💾 Saving to database...')
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const { error: insertError } = await supabase
      .from('sessions')
      .insert({
        id: sessionId,
        user_id: user.id,
        category: categoryName,
        module_number: parseInt(moduleId),
        level_number: levelNumber,  // Using level_number as required
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

    // Step 6: Update progress - needs to match your user_progress table structure
    console.log('📊 Updating progress...')
    
    // Check if user_progress table uses lesson_number or level_number
    // Adjust this based on your actual table structure
    await supabase
      .from('user_progress')
      .upsert({
        user_id: user.id,
        category: categoryName,
        module_number: parseInt(moduleId),
        lesson_number: levelNumber,  // Or level_number if your user_progress table uses that
        completed: true,
        best_score: feedback.overall_score,
        last_practiced: new Date().toISOString(),
      }, {
        onConflict: 'user_id,category,module_number,lesson_number'  // Adjust based on your actual constraint
      })

    console.log('✅ Progress updated')
    console.log('🎉 Authentic coaching feedback complete!')

    // Return with practice_prompt for frontend display
    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      practice_prompt: lesson.practice_prompt,  // Include for frontend task display
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