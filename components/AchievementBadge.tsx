'use client'

export default function AchievementBadge({ score }: { score: number }) {
  if (score >= 90) {
    return (
      <div className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow-lg animate-pulse">
        <span className="text-sm">⭐</span>
        <span>Exceptional!</span>
      </div>
    )
  }
  
  if (score >= 80) {
    return (
      <div className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow">
        <span className="text-sm">🏆</span>
        <span>Excellent</span>
      </div>
    )
  }
  
  if (score >= 75) {
    return (
      <div className="inline-flex items-center gap-1 bg-gradient-to-r from-green-400 to-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>Passed</span>
      </div>
    )
  }
  
  if (score >= 70) {
    return (
      <div className="inline-flex items-center gap-1 bg-gradient-to-r from-green-400 to-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>Passed</span>
      </div>
    )
  }
  
  return null
}