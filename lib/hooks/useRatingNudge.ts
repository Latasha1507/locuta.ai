import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface RatingNudgeState {
  shouldShow: boolean
  isFirstClear: boolean
}

export const useRatingNudge = (
  score: number | null,
  lessonId: string,
  userId: string
): RatingNudgeState => {
  const [shouldShow, setShouldShow] = useState(false)
  const [isFirstClear, setIsFirstClear] = useState(false)

  useEffect(() => {
    if (!score || !lessonId || !userId) return

    const checkShouldShowRating = async () => {
      const supabase = createClient()

      // Check if user rated in last 24 hours
      const { data: ratingHistory } = await supabase
        .from('user_rating_history')
        .select('last_rated_at')
        .eq('user_id', userId)
        .single()

      if (ratingHistory) {
        const lastRated = new Date(ratingHistory.last_rated_at)
        const now = new Date()
        const hoursSinceLastRating = (now.getTime() - lastRated.getTime()) / (1000 * 60 * 60)

        if (hoursSinceLastRating < 24) {
          return // Don't show if rated in last 24h
        }
      }

      // Check if this is first time clearing this level
      const { data: levelClear } = await supabase
        .from('user_level_clears')
        .select('id')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .single()

      const isFirst = !levelClear

      // Show if: first clear with 70+ OR any 85+ score
      if ((isFirst && score >= 70) || score >= 85) {
        setIsFirstClear(isFirst)
        setShouldShow(true)

        // Record this clear
        if (isFirst) {
          await supabase.from('user_level_clears').insert({
            user_id: userId,
            lesson_id: lessonId,
            highest_score: score,
          })
        } else {
          // Update highest score if better
          await supabase
            .from('user_level_clears')
            .update({ highest_score: score })
            .eq('user_id', userId)
            .eq('lesson_id', lessonId)
            .lt('highest_score', score)
        }
      }
    }

    checkShouldShowRating()
  }, [score, lessonId, userId])

  return { shouldShow, isFirstClear }
}

export const markRatingShown = async (userId: string) => {
  const supabase = createClient()

  const { data: existing } = await supabase
    .from('user_rating_history')
    .select('id, total_ratings')
    .eq('user_id', userId)
    .single()

  if (existing) {
    await supabase
      .from('user_rating_history')
      .update({
        last_rated_at: new Date().toISOString(),
        total_ratings: existing.total_ratings + 1,
      })
      .eq('user_id', userId)
  } else {
    await supabase.from('user_rating_history').insert({
      user_id: userId,
      last_rated_at: new Date().toISOString(),
      total_ratings: 1,
    })
  }
}