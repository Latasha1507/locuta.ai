import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const categoryMap: { [key: string]: string } = {
  'public-speaking': 'Public Speaking',
  'storytelling': 'Storytelling',
  'creator-speaking': 'Creator Speaking',
  'casual-conversation': 'Casual Conversation',
  'workplace-communication': 'Workplace Communication',
  'pitch-anything': 'Pitch Anything',
}

const tones = [
  {
    id: 'Normal',
    name: 'Normal',
    description: 'Clear, simple, everyday conversational style',
    icon: '💬',
    gradient: 'from-indigo-400 to-purple-500',
    bgGradient: 'from-indigo-50 to-purple-50',
  },
  {
    id: 'Supportive',
    name: 'Supportive',
    description: 'Soft, kind, reassuring - like a supportive friend',
    icon: '🤗',
    gradient: 'from-blue-400 to-indigo-500',
    bgGradient: 'from-blue-50 to-indigo-50',
  },
  {
    id: 'Inspiring',
    name: 'Inspiring',
    description: 'Energizing and passionate - like a motivational coach',
    icon: '⚡',
    gradient: 'from-purple-400 to-pink-500',
    bgGradient: 'from-purple-50 to-pink-50',
  },
  {
    id: 'Funny',
    name: 'Funny',
    description: 'Entertaining, playful, casual with light humor',
    icon: '😄',
    gradient: 'from-yellow-400 to-orange-500',
    bgGradient: 'from-yellow-50 to-orange-50',
  },
  {
    id: 'Diplomatic',
    name: 'Diplomatic',
    description: 'Calm, professional, trustworthy - balanced approach',
    icon: '🤝',
    gradient: 'from-teal-400 to-cyan-500',
    bgGradient: 'from-teal-50 to-cyan-50',
  },
  {
    id: 'Bossy',
    name: 'Bossy',
    description: 'Commanding, no-nonsense, authoritative leadership',
    icon: '👔',
    gradient: 'from-red-400 to-rose-500',
    bgGradient: 'from-red-50 to-rose-50',
  },
]

export default async function CategoryToneSelectionPage({
  params,
}: {
  params: Promise<{ categoryId: string }>
}) {
  const resolvedParams = await params
  const { categoryId } = resolvedParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const categoryName = categoryMap[categoryId]

  if (!categoryName) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#edf2f7] to-[#f7f9fb]">
      {/* Header */}
      <header className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border-b border-slate-200/70 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-slate-700 hover:text-purple-600 transition-colors p-2 rounded-lg hover:bg-white/50"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md">
              <img src="/Icon.png" alt="Locuta.ai" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{categoryName}</h1>
              <p className="text-sm text-slate-600 mt-1">
                Choose how you'd like your AI coach to sound
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Intro Section */}
        <div className="text-center mb-12">
          <div className="inline-block p-4 bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/40 mb-6 glass-card">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 animate-pulse mx-auto" />
          </div>
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Choose Your AI Coach Tone
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Select the coaching style that resonates with you. You can change this anytime during your practice sessions.
          </p>
        </div>

        {/* Tone Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tones.map((tone) => (
            <Link
              key={tone.id}
              href={`/category/${categoryId}/modules?tone=${tone.id}`}
              className="group"
            >
              <div className={`relative bg-white/70 backdrop-blur-lg border border-white/40 rounded-2xl md:rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] h-full glass-card`}>
                {/* Animated Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tone.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {tone.id === 'Normal' && (
                    <svg className="w-7 h-7 text-white animate-[bounce_2s_ease-in-out_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  )}
                  {tone.id === 'Supportive' && (
                    <svg className="w-7 h-7 text-white animate-[pulse_2s_ease-in-out_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  )}
                  {tone.id === 'Inspiring' && (
                    <svg className="w-7 h-7 text-white animate-[spin_3s_linear_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                  {tone.id === 'Funny' && (
                    <svg className="w-7 h-7 text-white animate-[wiggle_1s_ease-in-out_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {tone.id === 'Diplomatic' && (
                    <svg className="w-7 h-7 text-white animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  )}
                  {tone.id === 'Bossy' && (
                    <svg className="w-7 h-7 text-white animate-[scale_1.5s_ease-in-out_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )}
                </div>
                
                {/* Title */}
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  {tone.name}
                </h3>
                
                {/* Description */}
                <p className="text-slate-700 leading-relaxed mb-6">
                  {tone.description}
                </p>

                {/* CTA */}
                <div className={`inline-flex items-center gap-2 text-sm font-semibold bg-gradient-to-r ${tone.gradient} bg-clip-text text-transparent`}>
                  <span>Choose {tone.name}</span>
                  <svg
                    className={`w-4 h-4 text-purple-600 group-hover:translate-x-1 transition-transform`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-12 bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/40 p-8 glass-card">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center animate-pulse">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Why Choose a Tone?
              </h3>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span>Your AI coach will adapt their speaking style to match your preference</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span>Different tones help you practice for different real-world scenarios</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span>You can experiment with different tones to find what works best for you</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes wiggle {
            0%, 100% { transform: rotate(-3deg); }
            50% { transform: rotate(3deg); }
          }
          @keyframes scale {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          .glass-card {
            background-clip: padding-box !important;
            box-shadow: 0 4px 28px 0 rgba(51,57,83,0.09), 0 1.5px 5px 0 rgba(80,70,232,0.05);
          }
        `
      }} />
    </div>
  )
}
