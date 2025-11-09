import React, { useState } from 'react';
import { Mic, Video, MessageCircle, Briefcase, Target, BookOpen, Heart, Sparkles, Zap, Shield, Smile, TrendingUp, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

const UseCasesPage = () => {
  const [activeScenario, setActiveScenario] = useState(0);

  // Real-world use cases as the main focus
  const realWorldCases = [
    {
      title: "Conference Keynote",
      situation: "You're delivering a 20-minute keynote to 500+ attendees at an industry conference",
      challenge: "Maintaining audience engagement, managing stage presence, and delivering your message with impact without losing momentum",
      withoutLocuta: "Practice alone with no feedback, worry about filler words, uncertain about pacing and emphasis",
      withLocuta: "Practice with AI analyzing your pacing, pauses, and emphasis. Get specific feedback on audience connection techniques and refine delivery until it's perfect",
      category: "Public Speaking"
    },
    {
      title: "YouTube Video",
      situation: "Creating content that needs to hook viewers in the first 10 seconds and keep them watching",
      challenge: "Standing out on a crowded platform, maintaining energy throughout, and developing authentic on-camera presence",
      withoutLocuta: "Record multiple takes feeling awkward, unsure if your energy is right, guess what works",
      withLocuta: "Practice hooks repeatedly, get feedback on vocal variety and timing, develop natural camera presence with specific guidance",
      category: "Creator Content"
    },
    {
      title: "Team Meeting",
      situation: "You need to share an idea in a meeting but often feel talked over or ignored",
      challenge: "Speaking up confidently without rambling, getting your point across clearly, and being heard by the team",
      withoutLocuta: "Stay quiet and frustrated, or speak up and lose your train of thought halfway through",
      withLocuta: "Practice concise delivery, learn to structure ideas quickly, build confidence to jump into discussions naturally",
      category: "Workplace Communication"
    },
    {
      title: "Customer Success Story",
      situation: "Presenting a case study that needs to inspire prospects and drive conversions",
      challenge: "Balancing data with emotional appeal, making technical results relatable and memorable",
      withoutLocuta: "Present dry facts and figures, lose audience attention, fail to create emotional connection",
      withLocuta: "Transform data into narrative, practice weaving facts into compelling stories, master the art of relatable examples",
      category: "Storytelling"
    },
    {
      title: "Performance Review",
      situation: "Advocating for yourself during annual review or promotion discussion",
      challenge: "Balancing confidence with humility, highlighting achievements without bragging, asking for what you deserve",
      withoutLocuta: "Downplay achievements, forget key wins under pressure, accept whatever is offered",
      withLocuta: "Practice articulating value diplomatically, rehearse specific examples, build confidence in self-advocacy",
      category: "Workplace Communication"
    },
    {
      title: "Sales Presentation",
      situation: "Demonstrating your product to a potential customer who's evaluating competitors",
      challenge: "Standing out from competition, handling objections gracefully, emphasizing value over features",
      withoutLocuta: "List features robotically, fumble when asked tough questions, miss closing opportunities",
      withLocuta: "Master consultative approach, practice handling objections smoothly, develop benefit-focused language",
      category: "Pitch Anything"
    },
    {
      title: "Social Gathering",
      situation: "Attending a party or dinner where you want to feel comfortable and make connections",
      challenge: "Joining group conversations naturally, contributing without dominating, building rapport",
      withoutLocuta: "Stand awkwardly on the sidelines, leave early feeling drained",
      withLocuta: "Practice conversation threading, build confidence in jumping into discussions, develop authentic interaction style",
      category: "Casual Conversation"
    },
    {
      title: "TikTok Content",
      situation: "Creating 30-60 second videos that need maximum impact in minimal time",
      challenge: "Delivering punchy messages, perfect timing, maintaining high energy in ultra-short format",
      withoutLocuta: "Record 50 takes, unsure which is best, wonder why videos don't perform",
      withLocuta: "Practice rapid-fire delivery, perfect timing down to the second, get feedback on energy and pacing",
      category: "Creator Content"
    }
  ];

  // Coaching tones with better presentation
  const coachingPersonalities = [
    {
      name: "Supportive",
      icon: Heart,
      gradient: "from-purple-500 via-purple-600 to-pink-500",
      vibe: "Your encouraging friend who celebrates every win",
      approach: "Gentle encouragement, frames feedback constructively, focuses on progress over perfection",
      perfectFor: "Building foundation confidence, overcoming speaking anxiety, early-stage practice"
    },
    {
      name: "Inspiring",
      icon: Sparkles,
      gradient: "from-yellow-400 via-orange-500 to-pink-500",
      vibe: "Your motivational coach who sees your potential",
      approach: "Energizing vision-focused feedback, connects practice to bigger goals, pushes you to level up",
      perfectFor: "Breaking through plateaus, preparing for big moments, ambitious skill development"
    },
    {
      name: "Challenging",
      icon: Zap,
      gradient: "from-red-500 via-orange-600 to-yellow-500",
      vibe: "Your tough-love trainer who demands excellence",
      approach: "Direct honest feedback, high standards, identifies gaps immediately, no sugar-coating",
      perfectFor: "Rapid improvement needs, competitive individuals, high-stakes preparation"
    },
    {
      name: "Diplomatic",
      icon: Shield,
      gradient: "from-blue-500 via-indigo-500 to-purple-500",
      vibe: "Your professional mentor with executive polish",
      approach: "Tactful suggestions, considers context, maintains professional tone, sophisticated guidance",
      perfectFor: "Executive coaching, professional settings, sensitive communication work"
    },
    {
      name: "Funny",
      icon: Smile,
      gradient: "from-green-400 via-teal-500 to-blue-500",
      vibe: "Your witty friend who makes practice actually fun",
      approach: "Humor to disarm nerves, playful corrections, keeps sessions light and enjoyable",
      perfectFor: "Content creators, reducing pressure, maintaining motivation through practice"
    },
    {
      name: "Bossy",
      icon: TrendingUp,
      gradient: "from-indigo-600 via-purple-600 to-pink-600",
      vibe: "Your no-nonsense drill sergeant who gets results",
      approach: "Clear directives, minimal fluff, results-focused commands, efficiency over comfort",
      perfectFor: "Deadline-driven prep, building discipline, those who respond to firm direction"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-300 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Real Situations.
            <br />
            <span className="text-purple-200">Real Practice.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 leading-relaxed max-w-3xl mx-auto">
            See yourself in these scenarios? That's exactly what Locuta is built for.
          </p>
        </div>
      </section>

      {/* Main Use Cases Grid - Better Presentation */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Moments That Matter
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              These are real situations our users face. Which one resonates with you?
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {realWorldCases.map((useCase, idx) => (
              <div
                key={idx}
                className={`border-2 rounded-3xl p-8 transition-all cursor-pointer ${
                  activeScenario === idx
                    ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-blue-50 shadow-xl'
                    : 'border-gray-200 hover:border-purple-300 hover:shadow-lg'
                }`}
                onClick={() => setActiveScenario(idx)}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-800">{useCase.title}</h3>
                  <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold">
                    {useCase.category}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-500 mb-2">THE SITUATION</p>
                    <p className="text-gray-700 leading-relaxed">{useCase.situation}</p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-orange-600 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      THE CHALLENGE
                    </p>
                    <p className="text-gray-700 leading-relaxed">{useCase.challenge}</p>
                  </div>

                  {activeScenario === idx && (
                    <>
                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-sm font-semibold text-red-600 mb-2">WITHOUT LOCUTA</p>
                        <p className="text-gray-600 text-sm italic">{useCase.withoutLocuta}</p>
                      </div>

                      <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl p-6 text-white">
                        <p className="text-sm font-bold mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5" />
                          WITH LOCUTA
                        </p>
                        <p className="text-white/95 leading-relaxed">{useCase.withLocuta}</p>
                      </div>
                    </>
                  )}
                </div>

                {activeScenario !== idx && (
                  <button className="mt-4 text-purple-600 font-semibold text-sm flex items-center gap-2 hover:gap-3 transition-all">
                    See how Locuta helps <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Elevated Scenarios Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Your Communication Arsenal
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Whether you're leading, creating, connecting, or persuading. We've designed practice for every moment
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Professional Impact */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mb-6">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Professional Impact</h3>
              <p className="text-white/80 mb-6">Master the moments that define your career trajectory</p>
              <ul className="space-y-3">
                {[
                  "Present with executive presence to boards and leadership",
                  "Lead meetings where your ideas are heard and valued",
                  "Navigate difficult conversations with diplomacy",
                  "Advocate for yourself in reviews and negotiations"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-white/90">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Creative Expression */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-orange-500 rounded-2xl flex items-center justify-center mb-6">
                <Video className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Creative Expression</h3>
              <p className="text-white/80 mb-6">Develop the presence that makes audiences stop scrolling</p>
              <ul className="space-y-3">
                {[
                  "Hook viewers in the first 10 seconds of every video",
                  "Build authentic on-camera presence without awkwardness",
                  "Engage live audiences with natural energy",
                  "Tell stories that resonate with your community"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-white/90">
                    <div className="w-1.5 h-1.5 bg-pink-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Persuasive Power */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mb-6">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Persuasive Power</h3>
              <p className="text-white/80 mb-6">Win the moments when everything is on the line</p>
              <ul className="space-y-3">
                {[
                  "Pitch your vision to investors with clarity and conviction",
                  "Close deals with persuasive demonstrations",
                  "Negotiate from a position of confident communication",
                  "Sell ideas internally to skeptical stakeholders"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-white/90">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social Confidence */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center mb-6">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Social Confidence</h3>
              <p className="text-white/80 mb-6">Feel comfortable and authentic in any social setting</p>
              <ul className="space-y-3">
                {[
                  "Make memorable first impressions at networking events",
                  "Navigate group conversations without feeling awkward",
                  "Turn small talk into meaningful connections",
                  "Share your story in interviews and social settings"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-white/90">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Coaching Personalities - Enhanced */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Your AI Coach, Your Personality
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Different people need different coaching styles. Choose the personality that brings out your best or switch it up based on your mood and goals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coachingPersonalities.map((personality, idx) => (
              <div
                key={idx}
                className="group relative bg-white rounded-3xl p-8 border-2 border-gray-100 hover:border-transparent hover:shadow-2xl transition-all overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${personality.gradient} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                
                <div className="relative z-10">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br ${personality.gradient} shadow-lg`}>
                    <personality.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-2 text-gray-800">{personality.name}</h3>
                  <p className="text-sm text-gray-500 mb-4 italic">"{personality.vibe}"</p>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-2">COACHING APPROACH</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{personality.approach}</p>
                    </div>
                    
                    <div className={`pt-4 border-t-2 border-gradient-to-r ${personality.gradient}`}>
                      <p className="text-xs font-bold text-gray-500 mb-2">PERFECT FOR</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{personality.perfectFor}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 max-w-3xl mx-auto">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl p-8 text-white text-center">
              <h3 className="text-2xl font-bold mb-4">Mix. Match. Master.</h3>
              <p className="text-white/90 leading-relaxed">
                Use Supportive when building confidence. Switch to Challenging when you need a push. Try Funny to reduce pressure before a big moment. The choice is always yours because you know what you need.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-600 to-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Which Scenario Will You Master First?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Choose from 300+ lessons designed for real situations you'll actually face
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-purple-600 px-8 py-4 rounded-xl font-bold hover:shadow-2xl transition-all text-lg">
              Start Practicing Free
            </button>
            <button className="bg-white/10 backdrop-blur-sm border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white/20 transition-all text-lg">
              Explore All Scenarios
            </button>
          </div>
          <p className="text-white/80 mt-6 text-sm">
            No credit card required • Practice in 30 seconds
          </p>
        </div>
      </section>
    </div>
  );
};

export default UseCasesPage;