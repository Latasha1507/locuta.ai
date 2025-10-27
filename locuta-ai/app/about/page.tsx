import React from 'react';
import { Target, Heart, Users, TrendingUp, Award, Lightbulb, BookOpen, Sparkles, Brain, MessageSquare, Briefcase, Globe } from 'lucide-react';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-300 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">About Locuta.ai</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Democratizing World-Class
            <br />
            <span className="text-purple-200">Communication Training</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 leading-relaxed max-w-3xl mx-auto">
            We believe everyone deserves access to the communication skills that unlock opportunities, build confidence, and transform lives.
          </p>
        </div>
      </section>

      {/* Our Story Section - MOVED TO FIRST */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Our Story
            </h2>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl p-8 md:p-12 shadow-xl">
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-700 leading-relaxed mb-6 text-lg">
                Locuta.ai was born out of one simple but persistent question, why is it so hard to practice and improve the way we speak?
              </p>
              
              <p className="text-gray-700 leading-relaxed mb-6 text-lg">
                We had seen skilled professionals struggle with presentations, passionate founders lose their confidence in investor meetings, and so many people avoid speaking opportunities because of not having the right space to practice and get feedback.
              </p>
              
              <p className="text-gray-700 leading-relaxed mb-6 text-lg">
                We struggled with the same ourselves. Knowing what to say is one thing, but confidently and consistently doing so is a different matter altogether. That experience stuck with us and brought about one important realization: what if technology could make communication coaching accessible to anyone, anywhere, anytime?
              </p>
              
              <p className="text-gray-700 leading-relaxed mb-6 text-lg">
                That's how Locuta.ai was born as your always-available AI speaking coach that helps you practice, get personalized feedback, and grow into a more confident communicator at a fraction of traditional coaching costs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission, Vision, Values - MOVED TO SECOND */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Our Mission, Vision & Values
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Mission */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl p-8 text-white">
              <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
              <p className="text-white/90 leading-relaxed">
                Make world-class communication training accessible to everyone, everywhere—regardless of budget, location, or schedule.
              </p>
            </div>

            {/* Vision */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-8 text-white">
              <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Our Vision</h3>
              <p className="text-white/90 leading-relaxed">
                A world where confidence in communication unlocks human potential and creates opportunities for all.
              </p>
            </div>

            {/* Values */}
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl p-8 text-white">
              <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Our Values</h3>
              <p className="text-white/90 leading-relaxed">
                Accessibility first. Personalized learning. Continuous improvement. Real, measurable results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section - MOVED TO THIRD */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              The Communication Crisis
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-6 text-gray-600 leading-relaxed">
                <p>
                  Great communication is the most valuable skill in the modern world. Yet quality training remains out of reach for most people.
                </p>
                <p>
                  Traditional speaking coaches cost <strong className="text-gray-800">$150-500 per hour</strong>. Public speaking courses run <strong className="text-gray-800">$2,000-10,000</strong>. Scheduling is inflexible. Practice opportunities are limited.
                </p>
                <p>
                  Meanwhile, the stakes have never been higher. Whether pitching investors, leading teams, creating content, or simply connecting with others, your ability to communicate determines your success.
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl p-8">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">The Cost of Poor Communication</h3>
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="text-3xl font-bold text-red-600 mb-1">$37B</p>
                  <p className="text-sm text-gray-600">Annual cost of poor communication in US businesses alone</p>
                  <p className="text-xs text-gray-500 mt-2">Source: SHRM, 2023</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="text-3xl font-bold text-orange-600 mb-1">70%</p>
                  <p className="text-sm text-gray-600">Of employees report communication issues hurt their productivity</p>
                  <p className="text-xs text-gray-500 mt-2">Source: Grammarly Business Communication Report</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="text-3xl font-bold text-red-500 mb-1">#1</p>
                  <p className="text-sm text-gray-600">Skill employers seek but struggle to find in candidates</p>
                  <p className="text-xs text-gray-500 mt-2">Source: LinkedIn Workplace Learning Report</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Communication Skills Matter - Research-Backed - MOVED TO FOURTH */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-purple-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Why Communication Skills Matter
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Research consistently shows that communication ability is the #1 predictor of career success
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Career Impact */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-purple-100 p-3 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Career Success</h3>
                  <p className="text-sm text-purple-600 font-semibold">The #1 Career Accelerator</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="border-l-4 border-purple-500 pl-4">
                  <p className="font-bold text-gray-800 mb-1">85% of career success</p>
                  <p className="text-sm text-gray-600">Depends on communication and people skills, while technical skills account for only 15%</p>
                  <p className="text-xs text-gray-500 mt-2">Source: Carnegie Institute of Technology study</p>
                </div>
                
                <div className="border-l-4 border-purple-500 pl-4">
                  <p className="font-bold text-gray-800 mb-1">44% higher salary</p>
                  <p className="text-sm text-gray-600">Strong communicators earn significantly more than peers with weak communication skills</p>
                  <p className="text-xs text-gray-500 mt-2">Source: National Association of Colleges and Employers</p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <p className="font-bold text-gray-800 mb-1">73% of employers</p>
                  <p className="text-sm text-gray-600">Say communication is the most important skill when hiring, more important than technical ability</p>
                  <p className="text-xs text-gray-500 mt-2">Source: National Association of Colleges and Employers, 2023</p>
                </div>
              </div>
            </div>

            {/* Leadership & Influence */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-blue-100 p-3 rounded-xl">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Leadership Impact</h3>
                  <p className="text-sm text-blue-600 font-semibold">Build Influence & Trust</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="font-bold text-gray-800 mb-1">91% of employees</p>
                  <p className="text-sm text-gray-600">Say their leaders lack effective communication skills, impacting team performance</p>
                  <p className="text-xs text-gray-500 mt-2">Source: Salesforce State of the Connected Customer</p>
                </div>
                
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="font-bold text-gray-800 mb-1">50% higher returns</p>
                  <p className="text-sm text-gray-600">Companies with leaders who communicate effectively see 47% higher returns to shareholders</p>
                  <p className="text-xs text-gray-500 mt-2">Source: Towers Watson study</p>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="font-bold text-gray-800 mb-1">86% of professionals</p>
                  <p className="text-sm text-gray-600">Cite lack of effective communication as the primary cause of workplace failures</p>
                  <p className="text-xs text-gray-500 mt-2">Source: Fierce Inc. survey</p>
                </div>
              </div>
            </div>

            {/* Personal Development */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-indigo-100 p-3 rounded-xl">
                  <Brain className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Personal Growth</h3>
                  <p className="text-sm text-indigo-600 font-semibold">Confidence & Well-being</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="border-l-4 border-indigo-500 pl-4">
                  <p className="font-bold text-gray-800 mb-1">75% of people</p>
                  <p className="text-sm text-gray-600">Experience glossophobia (fear of public speaking), limiting career and personal opportunities</p>
                  <p className="text-xs text-gray-500 mt-2">Source: National Institute of Mental Health</p>
                </div>
                
                <div className="border-l-4 border-indigo-500 pl-4">
                  <p className="font-bold text-gray-800 mb-1">Confidence multiplier</p>
                  <p className="text-sm text-gray-600">Improved speaking skills directly correlate with increased self-esteem and life satisfaction</p>
                  <p className="text-xs text-gray-500 mt-2">Source: Journal of Applied Psychology</p>
                </div>

                <div className="border-l-4 border-indigo-500 pl-4">
                  <p className="font-bold text-gray-800 mb-1">Better relationships</p>
                  <p className="text-sm text-gray-600">Strong communicators report 60% higher relationship satisfaction in both personal and professional contexts</p>
                  <p className="text-xs text-gray-500 mt-2">Source: Journal of Social and Personal Relationships</p>
                </div>
              </div>
            </div>

            {/* Business Impact */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-green-100 p-3 rounded-xl">
                  <Briefcase className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Business Results</h3>
                  <p className="text-sm text-green-600 font-semibold">ROI of Good Communication</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4">
                  <p className="font-bold text-gray-800 mb-1">25% higher productivity</p>
                  <p className="text-sm text-gray-600">Teams with strong communication see significant productivity gains and lower turnover</p>
                  <p className="text-xs text-gray-500 mt-2">Source: McKinsey Global Institute</p>
                </div>
                
                <div className="border-l-4 border-green-500 pl-4">
                  <p className="font-bold text-gray-800 mb-1">3.5x more likely</p>
                  <p className="text-sm text-gray-600">Companies with effective communication are 3.5x more likely to outperform competitors</p>
                  <p className="text-xs text-gray-500 mt-2">Source: Deloitte research</p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <p className="font-bold text-gray-800 mb-1">50% reduction</p>
                  <p className="text-sm text-gray-600">In project failures when teams prioritize clear communication practices</p>
                  <p className="text-xs text-gray-500 mt-2">Source: Project Management Institute</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl p-8 md:p-12 text-white text-center">
            <h3 className="text-3xl font-bold mb-4">The Evidence Is Clear</h3>
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
              Communication skills are not a "nice to have" they're the foundation of career success, leadership effectiveness, and personal fulfillment. Yet most people never receive proper training.
            </p>
            <p className="text-2xl font-bold">That's what we're here to change.</p>
          </div>
        </div>
      </section>

      {/* How We're Different */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              How We're Different
            </h2>
            <p className="text-xl text-gray-600">
              Technology meets expertise to create something unprecedented
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-gradient-to-br from-purple-100 to-purple-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Accessible</h3>
              <p className="text-sm text-gray-600">
                Practice anytime, anywhere. No scheduling, no commute, no barriers.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-100 to-blue-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Brain className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Personalized</h3>
              <p className="text-sm text-gray-600">
                AI that learns YOUR voice and adapts to YOUR goals and learning style.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-indigo-100 to-indigo-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Expert-Designed</h3>
              <p className="text-sm text-gray-600">
                300+ lessons created by professional speaking coaches and communication experts.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-green-100 to-green-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Actionable</h3>
              <p className="text-sm text-gray-600">
                Instant, specific feedback you can apply immediately to improve.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-600 to-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Join Thousands Transforming Their Communication
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Start practicing today with unlimited AI coaching, personalized feedback, and 300+ expert-designed lessons.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-purple-600 px-8 py-4 rounded-xl font-bold hover:shadow-2xl transition-all text-lg">
              Try Locuta Free
            </button>
            <button className="bg-white/10 backdrop-blur-sm border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white/20 transition-all text-lg">
              Learn More
            </button>
          </div>
          <p className="text-white/80 mt-6 text-sm">
            No credit card required • Start practicing in 30 seconds
          </p>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;