'use client'

interface UpgradeModalProps {
  reason: 'trial_expired' | 'daily_limit'
  daysRemaining?: number
  onClose: () => void
}

export default function UpgradeModal({ reason, daysRemaining, onClose }: UpgradeModalProps) {
  const message = reason === 'trial_expired' 
    ? "Your 14-day trial has ended"
    : "You've used all 10 sessions today"
  
  const subtitle = reason === 'trial_expired'
    ? "Upgrade to continue practicing and improving your speaking skills"
    : `Come back tomorrow for 10 more free sessions, or upgrade now for unlimited access! (${daysRemaining} days left in trial)`
    
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* Icon */}
        <div className="relative mb-6 text-center">
          <div className="text-6xl">{reason === 'trial_expired' ? '🚀' : '⏰'}</div>
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-bold text-slate-900 mb-3 text-center">
          {message}
        </h2>
        
        {/* Subheading */}
        <p className="text-lg text-slate-600 mb-6 text-center">
          {subtitle}
        </p>

        {/* Only show pricing if trial expired */}
        {reason === 'trial_expired' && (
          <>
            {/* Pricing Options */}
            <div className="space-y-3 mb-6">
              {/* Monthly Plan */}
              <div className="border-2 border-purple-500 rounded-xl p-5 bg-purple-50/50 hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-bold text-lg text-slate-900">Monthly Plan</p>
                    <p className="text-sm text-slate-600">Unlimited sessions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-purple-600">$16.99</p>
                    <p className="text-xs text-slate-500">/month</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs bg-white px-2 py-1 rounded-full text-slate-700">✓ Unlimited sessions</span>
                  <span className="text-xs bg-white px-2 py-1 rounded-full text-slate-700">✓ All categories</span>
                  <span className="text-xs bg-white px-2 py-1 rounded-full text-slate-700">✓ AI feedback</span>
                </div>
              </div>
              
              {/* Yearly Plan */}
              <div className="border-2 border-green-500 rounded-xl p-5 bg-green-50/50 hover:shadow-lg transition-all cursor-pointer relative">
                <span className="absolute -top-3 right-4 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-md">
                  SAVE 24%
                </span>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-bold text-lg text-slate-900">Yearly Plan</p>
                    <p className="text-sm text-slate-600">Best value</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-600">$12.99</p>
                    <p className="text-xs text-slate-500">/month</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mt-2">Billed annually at $155.88</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs bg-white px-2 py-1 rounded-full text-slate-700">✓ Everything in Monthly</span>
                  <span className="text-xs bg-white px-2 py-1 rounded-full text-slate-700">✓ Priority support</span>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <button 
                onClick={() => window.location.href = '/pricing'}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:scale-[1.02] transition-all"
              >
                View Pricing & Upgrade
              </button>
              <button 
                onClick={onClose}
                className="w-full text-slate-600 hover:text-slate-800 text-sm font-medium"
              >
                Maybe later
              </button>
            </div>
          </>
        )}

        {/* For daily limit, just show close button */}
        {reason === 'daily_limit' && (
          <div className="space-y-3">
            <button 
              onClick={onClose}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              Got it, see you tomorrow!
            </button>
            <button 
              onClick={() => window.location.href = '/pricing'}
              className="w-full text-purple-600 hover:text-purple-700 text-sm font-semibold"
            >
              Or upgrade now for unlimited access
            </button>
          </div>
        )}
      </div>
    </div>
  )
}