'use client'

import { useState } from 'react'
import AchievementPopup from './AchievementPopup'

export default function FeedbackWithPopup({ 
  score, 
  moduleNumber 
}: { 
  score: number
  moduleNumber: number 
}) {
  const [showPopup, setShowPopup] = useState(true)
  
  return showPopup ? (
    <AchievementPopup 
      score={score}
      moduleNumber={moduleNumber}
      onClose={() => setShowPopup(false)}
    />
  ) : null
}