import type { Metadata } from 'next'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { Section, P, UL, LI, Updated } from '@/components/legal/LegalDoc'

export const metadata: Metadata = {
  title: 'Privacy Policy · Locuta',
  description: 'How Locuta collects, uses, stores, and protects your data, including your voice recordings.',
}

export default function PrivacyPage() {
  return (
    <MarketingShell
      eyebrow="Legal"
      title="Privacy Policy"
      subtitle="What we collect, why, and the control you have over it — in plain language."
    >
      <div style={{ maxWidth: 760 }}>

        <Section n="1" title="Who we are">
          <P>
            Locuta (&ldquo;Locuta&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) provides an AI-powered
            English speaking and communication practice platform. This policy explains how we handle
            your personal data when you use our website and app. If you have questions, contact us at{' '}
            <strong>info@locuta.in</strong>.
          </P>
        </Section>

        <Section n="2" title="Information we collect">
          <P>We collect the following, and only what we need to run the service:</P>
          <UL>
            <LI>
              <strong>Account information</strong> — your name and email address when you sign up, and
              authentication details managed by our auth provider.
            </LI>
            <LI>
              <strong>Voice recordings</strong> — when you complete a speaking practice, we record your
              audio so we can transcribe it, score it, and let you replay it against a coach example.
              This is the core of how the product works.
            </LI>
            <LI>
              <strong>Transcripts and practice results</strong> — the text of what you said, your scores,
              feedback, streaks, and progress through lessons.
            </LI>
            <LI>
              <strong>Preferences and usage data</strong> — settings you choose (such as your coach tone
              and sound preferences), and analytics about how you use the app so we can improve it.
            </LI>
            <LI>
              <strong>Communications</strong> — messages you send us and, if you book a session, the
              details you provide for that booking.
            </LI>
          </UL>
        </Section>

        <Section n="3" title="How we use your information">
          <UL>
            <LI>To provide the service — transcribe, analyse, and score your speaking practice.</LI>
            <LI>To personalise your experience — tailor examples and feedback to your level and chosen coach.</LI>
            <LI>To maintain your account, progress, streaks, and history.</LI>
            <LI>To improve the product and fix problems.</LI>
            <LI>To communicate with you about your account and support requests.</LI>
          </UL>
          <P>
            We do <strong>not</strong> sell your personal data, and we do not use your voice recordings
            to advertise to you.
          </P>
        </Section>

        <Section n="4" title="Third-party services we rely on">
          <P>
            To deliver Locuta we share the minimum necessary data with trusted providers who process it
            on our behalf:
          </P>
          <UL>
            <LI><strong>OpenAI</strong> — to transcribe your audio, generate feedback, and produce coach-voice examples.</LI>
            <LI><strong>Supabase</strong> — to store your account, recordings, transcripts, and progress.</LI>
            <LI><strong>Vercel</strong> — to host and serve the application.</LI>
            <LI><strong>Mixpanel</strong> — to understand product usage in aggregate.</LI>
            <LI><strong>Brevo</strong> — to send account and service emails.</LI>
            <LI><strong>Cal.com</strong> — to schedule sessions, if you book one.</LI>
          </UL>
          <P>
            Each provider handles your data under its own privacy terms and only for the purposes above.
          </P>
        </Section>

        <Section n="5" title="Where your data is stored and transferred">
          <P>
            Locuta is operated from India and serves users internationally, including in the United States.
            Your data — including voice recordings — may be stored and processed on servers located outside
            your country of residence. By using Locuta, you understand that your data may be transferred to
            and processed in countries with different data-protection laws than your own.
          </P>
        </Section>

        <Section n="6" title="How long we keep your data">
          <P>
            We keep your account data and practice history for as long as your account is active. Voice
            recordings and transcripts are retained so you can review your progress; you can delete
            individual recordings or your entire account at any time (see below). When you delete your
            account, we remove your personal data within a reasonable period, except where we must keep
            something to comply with the law.
          </P>
        </Section>

        <Section n="7" title="Your rights and choices">
          <P>Depending on where you live, you may have the right to:</P>
          <UL>
            <LI>Access the personal data we hold about you.</LI>
            <LI>Correct inaccurate data.</LI>
            <LI>Delete your data, including your voice recordings and your account.</LI>
            <LI>Object to or restrict certain processing.</LI>
            <LI>Request a copy of your data in a portable format.</LI>
          </UL>
          <P>
            To exercise any of these, email <strong>info@locuta.in</strong>. We will respond within the
            timeframe required by applicable law. If you are in India, you may also contact us regarding
            your rights under the Digital Personal Data Protection Act; if you are in the EEA or UK, under
            the GDPR.
          </P>
        </Section>

        <Section n="8" title="Security">
          <P>
            We use industry-standard measures to protect your data, including access controls on stored
            recordings and encrypted connections. No system is perfectly secure, but we work to protect
            your information and to limit who can access it.
          </P>
        </Section>

        <Section n="9" title="Children">
          <P>
            Locuta is not directed to children under 13 (or the minimum age required in your country), and
            we do not knowingly collect their personal data. If you believe a child has provided us data,
            contact us and we will delete it.
          </P>
        </Section>

        <Section n="10" title="Changes to this policy">
          <P>
            We may update this policy as the product evolves. When we make material changes, we will update
            the date above and, where appropriate, notify you.
          </P>
        </Section>

        <Section n="11" title="Contact">
          <P>
            Questions about this policy or your data? Email <strong>info@locuta.in</strong>.
          </P>
        </Section>
      </div>
    </MarketingShell>
  )
}
