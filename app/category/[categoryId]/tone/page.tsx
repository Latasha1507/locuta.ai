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
  'investor-pitch': 'Investor Pitch',
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-gray-900 transition-colors"
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{categoryName}</h1>
              <p className="text-sm text-gray-600 mt-1">
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
          <div className="inline-block p-4 bg-white rounded-2xl shadow-lg mb-6">
            <span className="text-6xl">🎤</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your AI Coach Tone
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
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
              <div className={`relative bg-gradient-to-br ${tone.bgGradient} border-2 border-transparent hover:border-purple-400 rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 h-full`}>
                {/* Icon */}
                <div className="text-6xl mb-4">{tone.icon}</div>
                
                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {tone.name}
                </h3>
                
                {/* Description */}
                <p className="text-gray-700 leading-relaxed mb-6">
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

                {/* Hover Effect Border */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${tone.gradient} opacity-0 group-hover:opacity-20 transition-opacity -z-10`}></div>
              </div>
            </Link>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-12 bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="flex items-start gap-4">
            <span className="text-4xl">💡</span>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Why Choose a Tone?
              </h3>
              <ul className="space-y-2 text-gray-700">
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
    </div>
  )
}