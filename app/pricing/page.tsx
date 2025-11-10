"use client"

import React from 'react';
import { Check, Zap, Crown, Sparkles } from 'lucide-react';
import Link from 'next/link';

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-indigo-50">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-300 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">Simple, Transparent Pricing</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Choose Your Perfect
            <br />
            <span className="text-purple-200">Speaking Coach Plan</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 leading-relaxed max-w-3xl mx-auto">
            Start free, upgrade anytime. No credit card required for trial.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 px-4 -mt-32 relative z-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Free Plan */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-gray-200 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-gray-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Free</h3>
              </div>
              
              <div className="mb-6">
                <div className="text-5xl font-bold text-gray-900 mb-2">$0</div>
                <p className="text-gray-600">Forever free</p>
              </div>

              <Link
                href="/auth/signup"
                className="block w-full bg-gray-900 text-white text-center py-4 rounded-xl font-bold hover:bg-gray-800 transition-all mb-8"
              >
                Get Started Free
              </Link>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">1 category access (first module only)</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Up to 5 practice sessions per day</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Basic AI feedback</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Limited analytics</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">1 coaching tone</span>
                </div>
              </div>
            </div>

            {/* Trial Plan - Most Popular */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-8 shadow-2xl border-2 border-indigo-400 relative transform scale-105 hover:scale-110 transition-all duration-300">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                MOST POPULAR
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">14-Day Trial</h3>
              </div>
              
              <div className="mb-6">
                <div className="text-5xl font-bold text-white mb-2">$0</div>
                <p className="text-white/80">14 days, then $9.99/month</p>
              </div>

              <Link
                href="/auth/signup"
                className="block w-full bg-white text-indigo-600 text-center py-4 rounded-xl font-bold hover:bg-gray-50 transition-all mb-8 shadow-lg"
              >
                Start Free Trial
              </Link>

              <div className="space-y-4 text-white">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
                  <span>All 6 categories (full access)</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
                  <span>Up to 10 sessions per day</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
                  <span>Advanced AI feedback</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
                  <span>Detailed analytics & progress tracking</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
                  <span>All 6 coaching tones</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
                  <span>Priority support</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
                  <span>AI voice demo feature</span>
                </div>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-purple-200 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Pro</h3>
              </div>
              
              <div className="mb-6">
                <div className="text-5xl font-bold text-gray-900 mb-2">$9.99</div>
                <p className="text-gray-600">Per month, billed monthly</p>
              </div>

              <Link
                href="/auth/signup"
                className="block w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-center py-4 rounded-xl font-bold hover:shadow-xl transition-all mb-8"
              >
                Upgrade to Pro
              </Link>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">All 6 categories (full access)</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Unlimited practice sessions</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Advanced AI feedback</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Detailed analytics & progress tracking</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">All 6 coaching tones</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Priority support</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">AI voice demo feature</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Export transcripts & feedback</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-600">Yes! You can cancel your Pro subscription at any time with no penalties or fees. Your access continues until the end of your current billing period.</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">What happens after the 14-day trial?</h3>
              <p className="text-gray-600">After your 14-day trial, you'll automatically move to the Free plan unless you choose to upgrade to Pro. No credit card required for the trial!</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Do you offer refunds?</h3>
              <p className="text-gray-600">Yes. If you're not satisfied with your Pro subscription within the first 7 days, contact us for a full refund.</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600">We accept all major credit cards (Visa, Mastercard, American Express, Discover) and process payments securely through Stripe.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Transform Your Speaking?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Start your free trial today. No credit card required.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-12 py-5 rounded-xl font-bold text-xl hover:shadow-2xl hover:scale-105 transition-all"
          >
            Get Started Free 🚀
          </Link>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;