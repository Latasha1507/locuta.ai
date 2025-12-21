'use client'

import { useEffect, useState } from 'react'

interface AchievementPopupProps {
  score: number
  moduleNumber: number
  onClose: () => void
}

export default function AchievementPopup({ score, moduleNumber, onClose }: AchievementPopupProps) {
  const [show, setShow] = useState(false)
  
  const passThreshold = moduleNumber === 1 ? 70 : 75
  const passed = score >= passThreshold
  
  useEffect(() => {
    if (passed) {
      // Show after a brief delay for dramatic effect
      const showTimer = setTimeout(() => setShow(true), 500)
      
      // Auto-hide after 3 seconds
      const hideTimer = setTimeout(() => {
        setShow(false)
        setTimeout(onClose, 300) // Wait for fade out animation
      }, 3500)
      
      return () => {
        clearTimeout(showTimer)
        clearTimeout(hideTimer)
      }
    } else {
      onClose()
    }
  }, [passed, onClose])
  
  if (!passed || !show) return null
  
  // Determine achievement level
  let achievement = {
    icon: '✓',
    title: 'Lesson Completed!',
    color: 'from-green-400 to-emerald-500',
    bgColor: 'from-green-50 to-emerald-50'
  }
  
  if (score >= 90) {
    achievement = {
      icon: '⭐',
      title: 'Exceptional Performance!',
      color: 'from-yellow-400 to-amber-500',
      bgColor: 'from-yellow-50 to-amber-50'
    }
  } else if (score >= 80) {
    achievement = {
      icon: '🏆',
      title: 'Excellent Work!',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'from-purple-50 to-pink-50'
    }
  }
  
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`bg-gradient-to-br ${achievement.bgColor} border-4 border-white rounded-3xl shadow-2xl p-8 mx-4 max-w-md transform transition-all duration-300 ${
          show ? 'scale-100' : 'scale-90'
        }`}
      >
        <div className="text-center">
          {/* Animated Icon */}
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br ${achievement.color} mb-4 animate-bounce`}>
            <span className="text-5xl">{achievement.icon}</span>
          </div>
          
          {/* Title */}
          <h2 className={`text-3xl font-bold mb-2 bg-gradient-to-r ${achievement.color} bg-clip-text text-transparent`}>
            {achievement.title}
          </h2>
          
          {/* Score */}
          <div className="text-6xl font-bold text-gray-800 mb-2">
            {score}
          </div>
          
          {/* Message */}
          <p className="text-gray-700 text-lg font-medium">
            {score >= 90 ? 'Outstanding achievement! You\'re a star! ⭐' :
             score >= 80 ? 'Great job! Keep up the excellent work! 🎉' :
             'Well done! Lesson completed! 🎊'}
          </p>
        </div>
      </div>
    </div>
  )
}