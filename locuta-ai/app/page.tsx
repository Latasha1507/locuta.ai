import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  // Check if user is already logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // If logged in, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      {/* Navigation */}
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🎤</span>
            </div>
            <span className="text-2xl font-bold text-white">Locuta.ai</span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/auth/login"
              className="text-white hover:text-purple-200 transition-colors font-medium"
            >
              Log In
            </Link>
            <Link
              href="/auth/signup"
              className="bg-white text-purple-900 px-6 py-2 rounded-lg font-semibold hover:bg-purple-50 transition-all hover:shadow-lg"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <div className="inline-block mb-6">
            <span className="bg-purple-400/20 text-purple-200 px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm">
              ✨ Your Personal AI Speaking Coach
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Master Your Speaking Skills
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              with AI-Powered Practice
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-purple-200 mb-10 max-w-3xl mx-auto leading-relaxed">
            Practice real-world speaking scenarios, get instant AI feedback, and track your progress. 
            Your 24/7 speaking coach is ready whenever you are.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all"
            >
              Start Practicing Free 🚀
            </Link>
            <Link
              href="#features"
              className="bg-white/10 backdrop-blur-sm text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-all border border-white/20"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Demo Screenshot Placeholder */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-purple-400/20 to-indigo-400/20 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
            <div className="bg-slate-900/50 rounded-xl p-8 text-center">
              <div className="text-6xl mb-4">🎤</div>
              <p className="text-purple-200 text-lg">
                Interactive practice interface with real-time feedback
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="bg-white/5 backdrop-blur-md py-20 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Why Locuta.ai?
            </h2>
            <p className="text-xl text-purple-200">
              Everything you need to become a confident speaker
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:border-purple-400/50 transition-all hover:scale-105">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold text-white mb-3">AI-Powered Feedback</h3>
              <p className="text-purple-200 leading-relaxed">
                Get detailed, personalized feedback on every practice session. Our AI analyzes your 
                speaking patterns and provides actionable insights to improve.
              </p>
            </div>

            <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:border-pink-400/50 transition-all hover:scale-105">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-2xl font-bold text-white mb-3">Track Your Progress</h3>
              <p className="text-purple-200 leading-relaxed">
                Watch your skills improve over time with detailed analytics. See your scores, 
                completion rates, and areas of strength across all categories.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:border-blue-400/50 transition-all hover:scale-105">
              <div className="text-5xl mb-4">🎤</div>
              <h3 className="text-2xl font-bold text-white mb-3">Real-World Scenarios</h3>
              <p className="text-purple-200 leading-relaxed">
                Practice situations you'll actually encounter - from public speaking to casual 
                conversations. 300+ lessons across 6 comprehensive categories.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-purple-200">
              Start improving your speaking skills in 3 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-4xl font-bold text-white mx-auto mb-6 shadow-2xl">
                1
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Choose Your Category</h3>
              <p className="text-purple-200 leading-relaxed">
                Select from Public Speaking, Storytelling, Creator Content, Workplace Communication, 
                Casual Conversation, or Pitches for anything.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center text-4xl font-bold text-white mx-auto mb-6 shadow-2xl">
                2
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Practice Speaking</h3>
              <p className="text-purple-200 leading-relaxed">
                Record yourself responding to real-world prompts. Choose your AI coach's tone - 
                supportive, inspiring, or even bossy!
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center text-4xl font-bold text-white mx-auto mb-6 shadow-2xl">
                3
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Get Instant Feedback</h3>
              <p className="text-purple-200 leading-relaxed">
                Receive detailed AI feedback with scores, strengths, areas to improve, and even 
                hear how AI would deliver the same message.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Showcase */}
      <div className="bg-white/5 backdrop-blur-md py-20 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              6 Comprehensive Categories
            </h2>
            <p className="text-xl text-purple-200">
              Over 300 lessons designed by speaking experts
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '🎤', name: 'Public Speaking', desc: 'Master presentations and speeches' },
              { icon: '📖', name: 'Storytelling', desc: 'Craft compelling narratives' },
              { icon: '🎥', name: 'Creator Speaking', desc: 'Engage your video audience' },
              { icon: '💬', name: 'Casual Conversation', desc: 'Build social confidence' },
              { icon: '💼', name: 'Workplace Communication', desc: 'Excel in professional settings' },
              { icon: '💰', name: 'Pitch Anything', desc: 'Master persuasive pitching' },
            ].map((category) => (
              <div 
                key={category.name}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:border-purple-400/50 transition-all"
              >
                <div className="text-4xl mb-3">{category.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{category.name}</h3>
                <p className="text-purple-200">{category.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 backdrop-blur-md rounded-3xl p-12 border border-white/20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Speaking?
            </h2>
            <p className="text-xl text-purple-200 mb-8">
              Join thousands of users improving their communication skills with AI-powered practice.
              Start your journey today - completely free!
            </p>
            <Link
              href="/auth/signup"
              className="inline-block bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-12 py-5 rounded-xl font-bold text-xl hover:shadow-2xl hover:scale-105 transition-all"
            >
              Get Started Free 🚀
            </Link>
            <p className="text-purple-300 mt-4 text-sm">
              No credit card required • Start practicing in 30 seconds
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white/5 backdrop-blur-md border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🎤</span>
              </div>
              <span className="text-xl font-bold text-white">Locuta.ai</span>
            </div>
            <p className="text-purple-200">
              © 2025 Locuta.ai. Elevate your voice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
{/* Desktop Navigation */}
<nav className="hidden md:flex items-center gap-6 text-base font-medium">
  <Link href="/about" className="text-gray-700 hover:text-indigo-600 transition-colors">About</Link>
  <Link href="/use-cases" className="text-gray-700 hover:text-indigo-600 transition-colors">Use Cases</Link>
  <Link href="/pricing" className="text-gray-700 hover:text-indigo-600 transition-colors">Pricing</Link>
  <div className="relative group">
    <span className="cursor-pointer text-gray-700 hover:text-indigo-600 transition-colors">
      Resources
    </span>
    <div className="absolute left-0 top-8 min-w-[160px] bg-white bg-opacity-90 shadow-lg rounded-xl border border-gray-100 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-300 translate-y-4 group-hover:translate-y-0">
      <Link href="/blog" className="block px-5 py-3 text-gray-700 hover:text-indigo-600 transition-colors">Blog</Link>
      <Link href="/faq" className="block px-5 py-3 text-gray-700 hover:text-indigo-600 transition-colors">FAQ</Link>
      <Link href="/resources" className="block px-5 py-3 text-gray-700 hover:text-indigo-600 transition-colors">All Resources</Link>
    </div>
  </div>
  <Link href="/contact" className="text-gray-700 hover:text-indigo-600 transition-colors">Contact</Link>
</nav>
{/* Mobile Menu */}
<div id="mobile-menu" className="md:hidden hidden border-t border-gray-100 py-4">
  <nav className="flex flex-col space-y-4">
    <Link href="/about" className="text-gray-700 hover:text-indigo-600 transition-colors px-2 py-2">About</Link>
    <Link href="/use-cases" className="text-gray-700 hover:text-indigo-600 transition-colors px-2 py-2">Use Cases</Link>
    <Link href="/pricing" className="text-gray-700 hover:text-indigo-600 transition-colors px-2 py-2">Pricing</Link>
    <Link href="/blog" className="text-gray-700 hover:text-indigo-600 transition-colors px-2 py-2">Blog</Link>
    <Link href="/faq" className="text-gray-700 hover:text-indigo-600 transition-colors px-2 py-2">FAQ</Link>
    <Link href="/resources" className="text-gray-700 hover:text-indigo-600 transition-colors px-2 py-2">Resources</Link>
    <Link href="/contact" className="text-gray-700 hover:text-indigo-600 transition-colors px-2 py-2">Contact</Link>
    <div className="flex flex-col space-y-2 pt-4 border-t border-gray-200">
      <Link href="/auth/login" className="text-gray-700 hover:text-indigo-600 transition-colors px-2 py-2">Sign In</Link>
      <Link href="/auth/signup" className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-center px-5 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all">Try Locuta Free</Link>
    </div>
  </nav>
</div>