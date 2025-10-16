// Filler word detection
export function countFillers(text: string): { count: number; words: string[] } {
    const fillerWords = [
      'um', 'uh', 'like', 'you know', 'so', 'actually', 'basically',
      'right', 'hmm', 'well', 'sort of', 'kind of', 'i mean', 'you see'
    ]
    
    const lowerText = text.toLowerCase()
    let count = 0
    const found: string[] = []
    
    fillerWords.forEach(filler => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi')
      const matches = lowerText.match(regex)
      if (matches) {
        count += matches.length
        found.push(...matches)
      }
    })
    
    return { count, words: found }
  }
  
  // Calculate words per minute
  export function calculateWPM(text: string, durationSeconds: number): number {
    const words = text.trim().split(/\s+/).length
    const minutes = durationSeconds / 60
    return Math.round(words / minutes)
  }
  
  // Analyze transcript and detect issues
  export function analyzeTranscript(text: string, durationSeconds: number) {
    const words = text.trim().split(/\s+/)
    const wordCount = words.length
    const uniqueWords = new Set(words.map(w => w.toLowerCase()))
    const vocabularyDiversity = (uniqueWords.size / wordCount) * 100
    
    const wpm = calculateWPM(text, durationSeconds)
    const fillers = countFillers(text)
    const fillerRatio = (fillers.count / wordCount) * 100
    
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const avgWordsPerSentence = wordCount / sentences.length
    
    const issues: string[] = []
    
    // Detect pacing issues
    if (wpm < 100) issues.push('too_slow')
    if (wpm > 180) issues.push('too_fast')
    
    // Detect filler word issues
    if (fillerRatio > 5) issues.push('high_filler_words')
    else if (fillerRatio > 2) issues.push('medium_filler_words')
    
    // Detect length issues
    if (durationSeconds < 15) issues.push('too_short')
    if (durationSeconds > 120) issues.push('too_long')
    
    // Detect sentence structure issues
    if (avgWordsPerSentence > 30) issues.push('long_sentences')
    
    // Detect vocabulary diversity
    if (vocabularyDiversity < 40) issues.push('low_vocabulary_diversity')
    
    return {
      wordCount,
      wpm,
      fillerCount: fillers.count,
      fillerWords: fillers.words,
      fillerRatio,
      vocabularyDiversity,
      avgWordsPerSentence,
      issues
    }
  }
  
  // Get lesson difficulty level
  export function getLessonLevel(lessonNumber: number): 'beginner' | 'intermediate' | 'advanced' {
    if (lessonNumber <= 3) return 'beginner'
    if (lessonNumber <= 7) return 'intermediate'
    return 'advanced'
  }