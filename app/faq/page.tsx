'use client'

import { useState } from 'react'
import { lc, fontDisplay } from '@/components/landing/tokens'
import { MarketingShell } from '@/components/marketing/MarketingShell'

// Real Q&As carried over from the previous FAQ page, restyled into an accordion.
const FAQS: { q: string; a: string }[] = [
  { q: "How does Locuta.ai's AI coaching work?", a: "Our AI analyzes your voice recordings across multiple dimensions including pace, clarity, confidence, filler words, and delivery style. It provides personalized feedback based on your specific speaking patterns and goals, learning your unique voice over time to give increasingly tailored recommendations." },
  { q: "Do I need any special equipment to use Locuta.ai?", a: "No special equipment needed! Just a device with a microphone (phone, tablet, or computer). Our AI works with any standard microphone to analyze your speaking and provide feedback." },
  { q: "How is this different from watching YouTube tutorials?", a: "While tutorials are helpful, Locuta.ai provides personalized feedback on YOUR speaking. You get specific insights about your pace, filler words, and delivery\u2014not generic advice. Plus, you practice real scenarios and track improvement over time." },
  { q: "Can I use Locuta.ai to prepare for specific events?", a: "Absolutely! Many users practice for job interviews, presentations, investor pitches, and important meetings. You can record your actual content and get AI feedback to refine your delivery before the real event." },
  { q: "How long does it take to see improvement?", a: "Most users notice improvements in confidence within 1-2 weeks of regular practice. Significant changes in speaking patterns typically occur after 3-4 weeks. The key is consistent practice\u2014even 10-15 minutes daily makes a difference." },
  { q: "Is my voice data private and secure?", a: "Yes! Your privacy is our priority. All recordings are encrypted, processed securely, and never shared. You have complete control over your data and can delete recordings anytime. We never use your voice for any purpose beyond providing you feedback." },
  { q: "What makes Locuta.ai different from hiring a speaking coach?", a: "While human coaches are valuable, Locuta.ai offers 24/7 availability, unlimited practice sessions, instant feedback, and costs a fraction of traditional coaching ($150-500/hour). Think of it as your always-available practice partner that complements human coaching." },
  { q: "Can I switch between different coaching tones?", a: "Yes! You can change your coaching tone anytime. Try Supportive when building confidence, switch to Challenging when you need a push, or use Funny to reduce pressure. Mix and match based on your needs." },
  { q: "What's included in the Free plan?", a: "The Free plan gives you access to 1 category (first module only), up to 5 practice sessions per day, and limited analytics. It's perfect for trying out the platform and seeing if it's right for you." },
  { q: "How does the 14-day trial work?", a: "The 14-day trial gives you full access to all categories, all coaching tones, up to 10 sessions per day, and detailed analytics. It's a one-time offer per user\u2014no credit card required. After the trial, you'll move to the Free plan unless you upgrade to Pro." },
  { q: "Can I cancel my Pro subscription anytime?", a: "Yes! You can cancel your Pro subscription at any time with no penalties or fees. Your access continues until the end of your current billing period." },
  { q: "Do you offer refunds?", a: "Yes. If you're not satisfied with your Pro subscription within the first 7 days, contact us for a full refund. We want you to be confident in your investment." },
  { q: "What payment methods do you accept?", a: "We accept all major credit cards (Visa, Mastercard, American Express, Discover) and process payments securely through Stripe." },
  { q: "What devices and browsers are supported?", a: "Locuta.ai works on any device with a modern web browser (Chrome, Firefox, Safari, Edge). We also have mobile-optimized experiences for iOS and Android devices." },
  { q: "Do I need to download anything?", a: "No downloads required! Locuta.ai is a web-based platform that works directly in your browser. Just sign up and start practicing." },
  { q: "Can I use Locuta.ai offline?", a: "Currently, Locuta.ai requires an internet connection to provide AI feedback and sync your progress. We're exploring offline practice options for future releases." },
  { q: "How many lessons are available?", a: "We have 300+ lessons across 6 comprehensive categories: Public Speaking, Storytelling, Creator Content, Casual Conversation, Workplace Communication, and Pitch Anything. New lessons are added regularly." },
  { q: "Can I track my progress over time?", a: "Yes! Pro users get detailed analytics showing your improvement across various metrics like pace, clarity, filler word usage, and confidence. You can see your progress charts and identify areas for continued focus." },
  { q: "Can I use Locuta.ai for languages other than English?", a: "Currently, Locuta.ai is optimized for English. We're working on adding support for additional languages. Join our waitlist to be notified when your language becomes available." },
  { q: "Who can see my practice recordings?", a: "Only you can see your practice recordings. They are completely private and secured with encryption. Our team never reviews your recordings unless you explicitly request support and grant permission." },
  { q: "How do I get started?", a: "Simply sign up for a free account, choose your first category and coaching tone, and start your first practice session. Our onboarding guide will walk you through everything you need to know." }
]

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <MarketingShell eyebrow="GOOD TO KNOW" title="Questions, answered." subtitle="Everything about how Locuta works, what it costs, and how your data is handled.">
      <div className="mx-auto max-w-[760px]" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {FAQS.map((f, i) => {
          const isOpen = open === i
          return (
            <div
              key={i}
              style={{
                background: '#fff',
                border: `2px solid ${isOpen ? lc.green : lc.cardBorder}`,
                borderRadius: 18,
                boxShadow: `0 4px 0 ${isOpen ? lc.greenDark : lc.cardBorder}`,
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14,
                  padding: '16px 18px',
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: fontDisplay,
                  fontWeight: 800,
                  fontSize: 15,
                  color: lc.ink,
                }}
              >
                {f.q}
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: isOpen ? lc.green : '#eef4e8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 'none',
                    transition: 'transform .2s ease',
                    transform: isOpen ? 'rotate(45deg)' : 'none',
                  }}
                >
                  <span style={{ color: isOpen ? '#fff' : lc.greenDark, fontSize: 18, fontWeight: 800, lineHeight: 1 }}>+</span>
                </span>
              </button>
              {isOpen && (
                <div style={{ padding: '0 18px 18px', fontSize: 14, lineHeight: 1.6, color: '#4a5645', fontWeight: 600 }}>
                  {f.a}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mx-auto mt-8 max-w-[760px] text-center">
        <p style={{ fontSize: 14, color: lc.muted, fontWeight: 600 }}>
          Still stuck? <a href="/contact" style={{ color: lc.greenDark, fontWeight: 800, textDecoration: 'none' }}>Get in touch</a>.
        </p>
      </div>
    </MarketingShell>
  )
}
