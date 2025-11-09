import React, { useState } from 'react';
import { HelpCircle, ChevronDown, MessageCircle, Mail, Shield, Clock, DollarSign, Globe } from 'lucide-react';

const FAQPage = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const faqCategories = [
    { id: 'all', name: 'All Questions', icon: HelpCircle },
    { id: 'getting-started', name: 'Getting Started', icon: MessageCircle },
    { id: 'features', name: 'Features & Usage', icon: Clock },
    { id: 'pricing', name: 'Pricing & Plans', icon: DollarSign },
    { id: 'privacy', name: 'Privacy & Security', icon: Shield },
    { id: 'technical', name: 'Technical', icon: Globe }
  ];

  const faqs = [
    {
      category: 'getting-started',
      question: "How does Locuta.ai's AI coaching work?",
      answer: "Our AI analyzes your voice recordings across multiple dimensions including pace, clarity, confidence, filler words, and delivery style. It provides personalized feedback based on your specific speaking patterns and goals, learning your unique voice over time to give increasingly tailored recommendations."
    },
    {
      category: 'getting-started',
      question: "Do I need any special equipment to use Locuta.ai?",
      answer: "No special equipment needed! Just a device with a microphone (phone, tablet, or computer). Our AI works with any standard microphone to analyze your speaking and provide feedback."
    },
    {
      category: 'features',
      question: "How is this different from watching YouTube tutorials?",
      answer: "While tutorials are helpful, Locuta.ai provides personalized feedback on YOUR speaking. You get specific insights about your pace, filler words, and delivery—not generic advice. Plus, you practice real scenarios and track improvement over time."
    },
    {
      category: 'features',
      question: "Can I use Locuta.ai to prepare for specific events?",
      answer: "Absolutely! Many users practice for job interviews, presentations, investor pitches, and important meetings. You can record your actual content and get AI feedback to refine your delivery before the real event."
    },
    {
      category: 'features',
      question: "How long does it take to see improvement?",
      answer: "Most users notice improvements in confidence within 1-2 weeks of regular practice. Significant changes in speaking patterns typically occur after 3-4 weeks. The key is consistent practice—even 10-15 minutes daily makes a difference."
    },
    {
      category: 'privacy',
      question: "Is my voice data private and secure?",
      answer: "Yes! Your privacy is our priority. All recordings are encrypted, processed securely, and never shared. You have complete control over your data and can delete recordings anytime. We never use your voice for any purpose beyond providing you feedback."
    },
    {
      category: 'features',
      question: "What makes Locuta.ai different from hiring a speaking coach?",
      answer: "While human coaches are valuable, Locuta.ai offers 24/7 availability, unlimited practice sessions, instant feedback, and costs a fraction of traditional coaching ($150-500/hour). Think of it as your always-available practice partner that complements human coaching."
    },
    {
      category: 'features',
      question: "Can I switch between different coaching tones?",
      answer: "Yes! You can change your coaching tone anytime. Try Supportive when building confidence, switch to Challenging when you need a push, or use Funny to reduce pressure. Mix and match based on your needs."
    },
    {
      category: 'pricing',
      question: "What's included in the Free plan?",
      answer: "The Free plan gives you access to 1 category (first module only), up to 5 practice sessions per day, and limited analytics. It's perfect for trying out the platform and seeing if it's right for you."
    },
    {
      category: 'pricing',
      question: "How does the 14-day trial work?",
      answer: "The 14-day trial gives you full access to all categories, all coaching tones, up to 10 sessions per day, and detailed analytics. It's a one-time offer per user—no credit card required. After the trial, you'll move to the Free plan unless you upgrade to Pro."
    },
    {
      category: 'pricing',
      question: "Can I cancel my Pro subscription anytime?",
      answer: "Yes! You can cancel your Pro subscription at any time with no penalties or fees. Your access continues until the end of your current billing period."
    },
    {
      category: 'pricing',
      question: "Do you offer refunds?",
      answer: "Yes. If you're not satisfied with your Pro subscription within the first 7 days, contact us for a full refund. We want you to be confident in your investment."
    },
    {
      category: 'pricing',
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, Mastercard, American Express, Discover) and process payments securely through Stripe."
    },
    {
      category: 'technical',
      question: "What devices and browsers are supported?",
      answer: "Locuta.ai works on any device with a modern web browser (Chrome, Firefox, Safari, Edge). We also have mobile-optimized experiences for iOS and Android devices."
    },
    {
      category: 'technical',
      question: "Do I need to download anything?",
      answer: "No downloads required! Locuta.ai is a web-based platform that works directly in your browser. Just sign up and start practicing."
    },
    {
      category: 'technical',
      question: "Can I use Locuta.ai offline?",
      answer: "Currently, Locuta.ai requires an internet connection to provide AI feedback and sync your progress. We're exploring offline practice options for future releases."
    },
    {
      category: 'features',
      question: "How many lessons are available?",
      answer: "We have 300+ lessons across 6 comprehensive categories: Public Speaking, Storytelling, Creator Content, Casual Conversation, Workplace Communication, and Pitch Anything. New lessons are added regularly."
    },
    {
      category: 'features',
      question: "Can I track my progress over time?",
      answer: "Yes! Pro users get detailed analytics showing your improvement across various metrics like pace, clarity, filler word usage, and confidence. You can see your progress charts and identify areas for continued focus."
    },
    {
      category: 'technical',
      question: "Can I use Locuta.ai for languages other than English?",
      answer: "Currently, Locuta.ai is optimized for English. We're working on adding support for additional languages. Join our waitlist to be notified when your language becomes available."
    },
    {
      category: 'privacy',
      question: "Who can see my practice recordings?",
      answer: "Only you can see your practice recordings. They are completely private and secured with encryption. Our team never reviews your recordings unless you explicitly request support and grant permission."
    },
    {
      category: 'getting-started',
      question: "How do I get started?",
      answer: "Simply sign up for a free account, choose your first category and coaching tone, and start your first practice session. Our onboarding guide will walk you through everything you need to know."
    }
  ];

  const filteredFaqs = selectedCategory === 'all' 
    ? faqs 
    : faqs.filter(faq => faq.category === selectedCategory);

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
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">Help Center</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Frequently Asked
            <br />
            <span className="text-purple-200">Questions</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 leading-relaxed max-w-3xl mx-auto">
            Find answers to common questions about Locuta.ai, features, pricing, and more
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-12 px-4 bg-gradient-to-br from-gray-50 to-purple-50 border-b-2 border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center gap-3">
            {faqCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:shadow-md border-2 border-gray-200'
                }`}
              >
                <category.icon className="w-4 h-4" />
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              {selectedCategory === 'all' 
                ? 'All Questions' 
                : faqCategories.find(c => c.id === selectedCategory)?.name}
            </h2>
            <p className="text-gray-600">
              {filteredFaqs.length} {filteredFaqs.length === 1 ? 'question' : 'questions'}
            </p>
          </div>

          <div className="space-y-4">
            {filteredFaqs.map((faq, idx) => (
              <div key={idx} className="border-2 border-gray-100 rounded-2xl overflow-hidden bg-white hover:shadow-lg transition-shadow">
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full px-6 py-5 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="font-bold text-gray-800 pr-4">{faq.question}</span>
                  <ChevronDown 
                    className={`w-5 h-5 text-purple-600 transition-transform flex-shrink-0 ${
                      activeFaq === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {activeFaq === idx && (
                  <div className="px-6 py-5 bg-gradient-to-br from-gray-50 to-purple-50 border-t-2 border-gray-100">
                    <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Still Have Questions CTA */}
      <section className="py-16 px-4 bg-gradient-to-br from-gray-50 to-purple-50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl p-12 shadow-xl text-center">
            <h2 className="text-3xl font-bold mb-4 text-gray-800">
              Still Have Questions?
            </h2>
            <p className="text-gray-600 mb-8 text-lg">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
              <div className="flex items-start gap-4 p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl">
                <div className="bg-white p-3 rounded-xl shadow-md">
                  <Mail className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-gray-800 mb-1">Email Support</h3>
                  <p className="text-sm text-gray-600 mb-2">support@locuta.ai</p>
                  <p className="text-xs text-gray-500">Response within 24 hours</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl">
                <div className="bg-white p-3 rounded-xl shadow-md">
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-gray-800 mb-1">Live Chat</h3>
                  <p className="text-sm text-gray-600 mb-2">Available Mon-Fri</p>
                  <p className="text-xs text-gray-500">9am-6pm EST</p>
                </div>
              </div>
            </div>

            <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg transition-all">
              Contact Support
            </button>
          </div>
        </div>
      </section>

      {/* Popular Topics */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            Popular Help Topics
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer">
              <div className="bg-white w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Getting Started Guide</h3>
              <p className="text-sm text-gray-600">
                Learn how to create your account, choose categories, and start your first practice session
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer">
              <div className="bg-white w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Practice Tips & Best Practices</h3>
              <p className="text-sm text-gray-600">
                Discover how to get the most out of your practice sessions and maximize improvement
              </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer">
              <div className="bg-white w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Billing & Subscriptions</h3>
              <p className="text-sm text-gray-600">
                Understand pricing plans, manage your subscription, and learn about billing cycles
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQPage;