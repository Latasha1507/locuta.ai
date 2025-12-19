'use client'

interface TrialWelcomeModalProps {
  onClose: () => void
}

export default function TrialWelcomeModal({ onClose }: TrialWelcomeModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Celebration Icon */}
        <div className="relative mb-6">
          <div className="text-6xl animate-bounce">🎉</div>
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-24 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full opacity-20 animate-ping"></div>
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-bold text-slate-900 mb-3">
          Congratulations!
        </h2>
        
        {/* Subheading */}
        <p className="text-lg text-slate-600 mb-6">
          Your 14-day free trial starts now
        </p>

        {/* Trial Details Box */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 mb-6 border-2 border-purple-200">
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl">🎤</span>
              <div className="text-left">
                <p className="text-xl font-bold text-purple-700">10 Free Sessions</p>
                <p className="text-sm text-slate-600">Try any category</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl">📅</span>
              <div className="text-left">
                <p className="text-xl font-bold text-indigo-700">14 Days</p>
                <p className="text-sm text-slate-600">Full access</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="text-left mb-6 space-y-2">
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>Instant AI feedback on every recording</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>300+ lessons across 6 categories</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>Track your progress and improvement</span>
          </div>
        </div>

        {/* CTA Button */}
        <button 
          onClick={onClose}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:scale-105 transition-all"
        >
          Start Practicing! 🚀
        </button>

        {/* Fine Print */}
        <p className="text-xs text-slate-500 mt-4">
          No credit card required • Cancel anytime
        </p>
      </div>
    </div>
  )
}