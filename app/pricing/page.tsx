"use client"

import React from 'react';
import { Check, Zap, Crown, Sparkles, Star } from 'lucide-react';
import Link from 'next/link';

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-white opacity-60"></div>
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-purple-200 to-indigo-200 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full blur-3xl opacity-20"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-md px-6 py-2 rounded-full mb-6 border border-white/40 shadow-lg">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-gray-800">Simple, Transparent Pricing</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
              Choose Your Perfect
              <br />
              Speaking Coach Plan
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Start free, upgrade anytime. No credit card required for trial.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 px-4 -mt-16 relative z-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Free Trial Plan */}
            <div className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 border-2 border-white/60 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-indigo-50/50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-indigo-100 rounded-2xl flex items-center justify-center shadow-md">
                    <Zap className="w-7 h-7 text-indigo-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">30-Day Free Trial</h3>
                </div>
                
                <div className="mb-8">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-bold text-gray-900">$0</span>
                  </div>
                  <p className="text-gray-600 font-medium">, then choose a plan</p>
                </div>

                <Link
                  href="/auth/signup"
                  className="block w-full bg-gradient-to-r from-gray-900 to-indigo-900 text-white text-center py-4 rounded-xl font-bold hover:shadow-lg transition-all mb-8"
                >
                  Start Free Trial
                </Link>

                <div className="space-y-3 mb-6">
                  <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Access Limit</p>
                  <div className="flex items-start gap-3 bg-indigo-50/50 rounded-lg p-3">
                    <Check className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 font-medium">Up to 10 sessions per day</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Features Included</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Basic communication analysis</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">AI feedback summary</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Limited access to analytics dashboard</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Ideal For</p>
                  <p className="text-gray-700">First-time users exploring the product</p>
                </div>
              </div>
            </div>

            {/* Monthly Plan - Most Popular */}
            <div className="group relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 border-2 border-indigo-200 shadow-2xl transform scale-105 hover:scale-110 transition-all duration-300">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                MOST POPULAR
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 to-purple-50/40 rounded-3xl opacity-50"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Crown className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Monthly Plan</h3>
                </div>
                
                <div className="mb-8">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">$16.99</span>
                    <span className="text-gray-600 font-medium">/month</span>
                  </div>
                  <p className="text-gray-600 font-medium">Billed monthly</p>
                </div>

                <Link
                  href="/auth/signup"
                  className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-center py-4 rounded-xl font-bold hover:shadow-xl transition-all mb-8 shadow-lg"
                >
                  Get Started
                </Link>

                <div className="space-y-3 mb-6">
                  <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Access Limit</p>
                  <div className="flex items-start gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-3">
                    <Star className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5 fill-indigo-600" />
                    <span className="text-gray-900 font-semibold">Unlimited sessions</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Features Included</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Full analytics dashboard</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Personalized AI recommendations</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Access to all practice modes</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Progress tracking & insights</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-indigo-200">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Ideal For</p>
                  <p className="text-gray-700">Professionals or learners testing short-term</p>
                </div>
              </div>
            </div>

            {/* Yearly Plan - Best Value */}
            <div className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 border-2 border-white/60 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
              <div className="absolute top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                SAVE 24%
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-green-50/50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center shadow-md">
                    <Sparkles className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Yearly Plan</h3>
                </div>
                
                <div className="mb-8">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">$12.99</span>
                    <span className="text-gray-600 font-medium">/month</span>
                  </div>
                  <p className="text-gray-600 font-medium">Billed annually at $155.88</p>
                </div>

                <Link
                  href="/auth/signup"
                  className="block w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white text-center py-4 rounded-xl font-bold hover:shadow-lg transition-all mb-8"
                >
                  Get Started
                </Link>

                <div className="space-y-3 mb-6">
                  <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Access Limit</p>
                  <div className="flex items-start gap-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-3">
                    <Star className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5 fill-emerald-600" />
                    <span className="text-gray-900 font-semibold">Unlimited sessions</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Features Included</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Everything in Monthly Plan</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Priority support</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Early access to new AI modules</span>
                    </div>
                    <div className="flex items-start gap-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-2 -mx-2">
                      <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-900 font-semibold">Save $48/year</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Ideal For</p>
                  <p className="text-gray-700">Committed learners seeking long-term growth</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Compare All Plans
            </h2>
            <p className="text-xl text-gray-600">
              See what's included in each plan
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xl border border-white/40">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-indigo-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wide">Feature</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-900 uppercase tracking-wide">Free Trial</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-indigo-600 uppercase tracking-wide">Monthly</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-emerald-600 uppercase tracking-wide">Yearly</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-6 py-4 text-gray-700 font-medium">Sessions per day</td>
                    <td className="px-6 py-4 text-center text-gray-700">Up to 10</td>
                    <td className="px-6 py-4 text-center text-gray-900 font-semibold">Unlimited</td>
                    <td className="px-6 py-4 text-center text-gray-900 font-semibold">Unlimited</td>
                  </tr>
                  <tr className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-6 py-4 text-gray-700 font-medium">AI feedback</td>
                    <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-indigo-600 mx-auto" /></td>
                    <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-indigo-600 mx-auto" /></td>
                    <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-6 py-4 text-gray-700 font-medium">Full analytics dashboard</td>
                    <td className="px-6 py-4 text-center text-gray-400">Limited</td>
                    <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-indigo-600 mx-auto" /></td>
                    <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-6 py-4 text-gray-700 font-medium">Priority support</td>
                    <td className="px-6 py-4 text-center text-gray-400">—</td>
                    <td className="px-6 py-4 text-center text-gray-400">—</td>
                    <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-6 py-4 text-gray-700 font-medium">Early access to new features</td>
                    <td className="px-6 py-4 text-center text-gray-400">—</td>
                    <td className="px-6 py-4 text-center text-gray-400">—</td>
                    <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-4">
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/40 shadow-lg hover:shadow-xl transition-all">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-600">Yes! You can cancel your subscription at any time with no penalties or fees. Your access continues until the end of your current billing period.</p>
            </div>

            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/40 shadow-lg hover:shadow-xl transition-all">
              <h3 className="text-xl font-bold text-gray-900 mb-2">What happens after the 14-day trial?</h3>
              <p className="text-gray-600">After your 14-day trial, you'll need to choose a plan to continue. No credit card required for the trial!</p>
            </div>

            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/40 shadow-lg hover:shadow-xl transition-all">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Do you offer refunds?</h3>
              <p className="text-gray-600">Yes. If you're not satisfied with your subscription within the first 7 days, contact us for a full refund.</p>
            </div>

            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/40 shadow-lg hover:shadow-xl transition-all">
              <h3 className="text-xl font-bold text-gray-900 mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600">We accept all major credit cards (Visa, Mastercard, American Express, Discover) and process payments securely through Stripe.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-12 border-2 border-white/60 shadow-2xl">
            <h2 className="text-4xl font-bold mb-6">
              <span className="bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                Ready to Transform Your Speaking?
              </span>
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Start your free trial today. No credit card required.
            </p>
            <Link
              href="/auth/signup"
              className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-12 py-5 rounded-xl font-bold text-xl hover:shadow-2xl hover:scale-105 transition-all"
            >
              Get Started Free 🚀
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;