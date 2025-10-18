import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { useRef } from "react";

// Helper for floating 3D decorative shapes (tailwind + styles only)
function FloatingShapes() {
  // For this static SSR page, we'll just render animated elements via Tailwind's animation utilities and custom style attribute
  return (
    <>
      <div
        className="hidden md:block absolute -top-20 -left-32 w-48 h-48 rounded-full bg-gradient-to-tr from-indigo-200 to-white opacity-50 blur-lg animate-float-slow"
        style={{
          transform: "rotateZ(-10deg) translateZ(0px)",
          zIndex: 1,
          filter: "blur(36px)",
        }}
        aria-hidden
      ></div>
      <div
        className="hidden md:block absolute top-1/3 right-0 w-24 h-24 rounded-full bg-gradient-to-tr from-violet-100 to-indigo-100 opacity-30 blur-2xl animate-float-med"
        style={{
          transform: " rotateZ(15deg) scale(1.2) translateZ(-50px)",
          zIndex: 1,
          filter: "blur(24px)",
        }}
        aria-hidden
      ></div>
      <div
        className="hidden md:block absolute bottom-0 left-[30%] w-20 h-20 rounded-full bg-gradient-to-br from-white via-indigo-50 to-violet-100 opacity-40 blur-2xl animate-float-fast"
        style={{
          transform: "skewY(-6deg) rotateZ(-23deg) translateZ(-40px)",
          filter: "blur(18px)",
          zIndex: 1,
        }}
        aria-hidden
      ></div>
    </>
  );
}

// 3D geometric shapes for features (example: cube, sphere, pyramid)
function Feature3DShape({ type }: { type: "cube" | "sphere" | "pyramid" }) {
  // The shapes are mocked via gradients and border styling, with perspective effect
  switch (type) {
    case "cube":
      return (
        <div className="relative mx-auto mb-6 flex items-center justify-center h-14 w-14 perspective-900">
          <div className="bg-gradient-to-br from-gray-100 to-violet-100 border border-violet-200 rounded-lg shadow-2xl h-12 w-12 transition-transform duration-500 group-hover:rotate-x-12 group-hover:rotate-y-6" style={{
            transform: "rotateY(-12deg) rotateX(8deg)"
          }} />
          {/* Add some reflections */}
          <div className="absolute top-2 left-2 w-6 h-2 bg-white/40 rounded-full blur-[2px]" />
        </div>
      );
    case "sphere":
      return (
        <div className="relative mx-auto mb-6 flex items-center justify-center h-14 w-14 perspective-900">
          <div className="bg-gradient-to-br from-white via-indigo-100 to-gray-200 shadow-xl rounded-full h-12 w-12 transition-transform duration-500 group-hover:scale-105 group-hover:rotate-y-6" style={{
            boxShadow: "0 6px 36px 0 rgba(79,70,229,.15)",
            transform: "rotateY(-10deg)"
          }} />
          {/* Glossy overlay */}
          <div className="absolute top-2 left-3 w-5 h-2 rounded-full bg-white/40 blur-sm" />
        </div>
      );
    case "pyramid":
    default:
      return (
        <div className="relative mx-auto mb-6 flex items-center justify-center h-14 w-14 perspective-900">
          <div className="w-0 h-0 border-l-6 border-l-transparent border-r-6 border-r-transparent border-b-[32px] border-b-indigo-200  opacity-90" style={{
            filter: "drop-shadow(0px 12px 16px rgba(99,102,241,0.13))",
            transform: "rotateZ(-20deg) scale(1.1)"
          }} />
          <div className="absolute left-1 top-3 w-6 h-2 bg-white/40 rounded-full blur-sm" />
        </div>
      );
  }
}

// 3D stepper for "How It Works"
function Step3D({ number, title, desc, last }: { number: number; title: string; desc: string; last?: boolean }) {
  const shapeVariants = [
    "rotate-y-6 rotate-x-2",
    "-rotate-y-6 -rotate-x-6",
    "rotate-y-3 rotate-x-3"
  ];
  return (
    <div className="group flex flex-col items-center text-center relative">
      <div
        className={`relative mb-6 w-16 h-16 rounded-[22%] bg-gradient-to-br from-white via-gray-100 to-indigo-100 shadow-lg border border-gray-200 transition-transform duration-500 will-change-transform
        ${shapeVariants[(number - 1) % 3]}
        group-hover:scale-110 group-hover:-rotate-x-6 group-hover:-rotate-y-6
        `}
        style={{
          perspective: "800px",
          perspectiveOrigin: "center",
        }}
      >
        <span className="flex items-center justify-center h-full text-3xl font-bold text-indigo-500">{number}</span>
        <span className="absolute -inset-1 bg-white/20 blur-md rounded-[28%] -z-10 opacity-80" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500">{desc}</p>
      {/* Connecting line */}
      {!last && (
        <div className="hidden md:block absolute top-[64px] left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-indigo-100 to-gray-100 opacity-70" />
      )}
    </div>
  );
}

export default async function HomePage() {
  // Auth redirect
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="relative min-h-screen bg-gradient-to-tr from-white via-gray-50 to-indigo-50 text-gray-900">
      <FloatingShapes />
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl backdrop-saturate-150 border-b border-gray-100 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-200 to-indigo-200 rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105">
              {/* existing logo, no emoji, can be replaced with SVG if available */}
              <span className="sr-only">Locuta.ai Logo</span>
              <div className="w-6 h-6 bg-gradient-to-br from-indigo-400/80 to-violet-500/90 rounded-lg scale-110 shadow-lg"></div>
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">Locuta.ai</span>
          </Link>
          {/* Centered Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-base font-medium">
            <Link href="#about" className="text-gray-700 hover:text-indigo-600 transition-colors">About</Link>
            <Link href="#use-cases" className="text-gray-700 hover:text-indigo-600 transition-colors">Use Cases</Link>
            <div className="relative group">
              <span className="cursor-pointer text-gray-700 hover:text-indigo-600 transition-colors">
                Resources
              </span>
              <div className="absolute left-0 top-8 min-w-[160px] bg-white bg-opacity-90 shadow-lg rounded-xl border border-gray-100 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-300 translate-y-4 group-hover:translate-y-0">
                <Link href="/blog" className="block px-5 py-3 text-gray-700 hover:text-indigo-600 transition-colors">Blog</Link>
                <Link href="/faq" className="block px-5 py-3 text-gray-700 hover:text-indigo-600 transition-colors">FAQ</Link>
              </div>
            </div>
          </nav>
          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-gray-700 font-semibold hover:text-indigo-600 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="ml-2 px-5 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-400"
            >
              Try Locuta Free
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 px-5 sm:px-10 max-w-7xl mx-auto py-24 flex flex-col md:flex-row items-center gap-x-16">
        {/* Left: Text */}
        <div className="flex-1 relative flex flex-col items-start" style={{ zIndex: 3 }}>
          <span className="mb-5 bg-gradient-to-r from-indigo-50/80 to-violet-100/80 text-indigo-700 uppercase font-semibold px-4 py-1.5 rounded-full text-xs tracking-wider shadow-sm backdrop-blur-[2.5px]">
            ✨ Your Personal AI Speaking Coach
          </span>
          <h1 className="font-extrabold text-4xl md:text-5xl lg:text-6xl mb-6 text-gray-900 leading-tight tracking-tight [text-wrap:balance] transition-all duration-500 animate-fade-in">
            Master Your Speaking Skills<br className="hidden md:block" />
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 via-violet-600 to-indigo-800 opacity-90" style={{letterSpacing: "-.015em"}}>
              with AI-Powered Practice
            </span>
          </h1>
          <p className="max-w-xl mb-10 text-lg md:text-xl text-gray-500 font-medium leading-relaxed animate-fade-in-del1">
            Locuta.ai helps you master communication through personalized, real-time AI coaching. Practice real scenarios, get instant feedback, and build lasting confidence — at your own pace.
          </p>
          <div className="flex flex-col md:flex-row gap-4 w-full max-w-md animate-fade-in-del2">
            <Link
              href="/auth/signup"
              className="flex-1 text-center bg-gradient-to-r from-violet-500 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-400 relative"
            >
              Start Practicing Free <span aria-hidden>🚀</span>
              <span className="absolute inset-0 rounded-xl bg-white/10 pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-500" />
            </Link>
            <Link
              href="#why"
              className="flex-1 text-center border border-indigo-100 bg-white/50 text-indigo-800 px-8 py-4 rounded-xl font-semibold hover:scale-105 hover:bg-indigo-50/80 transition-all duration-400 shadow-md hover:shadow-lg"
            >
              Learn More
            </Link>
          </div>
        </div>
        {/* Right: 3D Mockup */}
        <div className="flex-1 hidden md:flex items-center justify-center relative group perspective-900 animate-fade-in-del3" style={{ zIndex: 2 }}>
          {/* 3D elevated card */}
          <div className="relative bg-white/70 shadow-2xl rounded-3xl border border-gray-200 overflow-hidden p-8 min-w-[380px] min-h-[390px] flex flex-col justify-between items-center
            transition-transform duration-500 group-hover:rotate-y-6 group-hover:-rotate-x-2
            hover:shadow-3xl
          "
            style={{
              transform: "perspective(800px) rotateY(-12deg) rotateX(6deg)",
              boxShadow:
                "0 10px 50px 0 rgba(55,60,128,.10),0 1.5px 11px 0 rgba(79,70,229,.12)"
            }}
          >
            {/* "Waveform" animation */}
            <div className="flex items-center gap-1 my-4 mb-8">
              {[7, 13, 20, 33, 18, 11, 22].map((h, i) => (
                <div
                  key={i}
                  className={`w-2 rounded-full bg-gradient-to-b from-indigo-400 to-violet-300 transition-all duration-500`}
                  style={{
                    height: `${h + (i % 2 === 0 ? 8 : 0)}px`,
                    animation: `waveformPulse 1.45s ${i * 0.13}s infinite linear alternate`
                  }}
                />
              ))}
              {/* waveformPulse should be defined via Tailwind config or externally */}
            </div>
            {/* Practice Prompt Simulation */}
            <div className="w-full h-16 glassmorphism bg-white/70 rounded-lg flex items-center justify-center text-lg text-gray-700 shadow labeled mb-8">
              <span className="corner-label absolute top-1 left-3 bg-indigo-100 text-indigo-500 text-xs px-2 py-0.5 rounded">Prompt</span>
              “Tell us about a challenge you overcame.”
            </div>
            {/* Feedback Scores Simulation */}
            <div className="grid grid-cols-2 gap-5 w-full mt-8">
              <div className="bg-white/90 bg-gradient-to-br from-indigo-50 to-violet-100 rounded-2xl p-4 shadow-lg border border-gray-50  flex flex-col items-center
                transition-transform duration-400 hover:-rotate-x-4 hover:scale-105
              ">
                <span className="text-sm font-bold text-gray-700 mb-1">Delivery</span>
                <div className="text-2xl font-extrabold text-indigo-600">8.6</div>
              </div>
              <div className="bg-white/90 bg-gradient-to-br from-violet-100 to-indigo-50 rounded-2xl p-4 shadow-lg border border-gray-50 flex flex-col items-center
                transition-transform duration-400 hover:rotate-x-4 hover:scale-105
              ">
                <span className="text-sm font-bold text-gray-700 mb-1">Clarity</span>
                <div className="text-2xl font-extrabold text-violet-600">9.1</div>
              </div>
              <div className="bg-white/90 bg-gradient-to-br from-indigo-50 to-gray-100 rounded-2xl p-4 shadow-lg border border-gray-50 flex flex-col items-center
                transition-transform duration-400 hover:rotate-y-4 hover:scale-105
              ">
                <span className="text-sm font-bold text-gray-700 mb-1">Confidence</span>
                <div className="text-2xl font-extrabold text-indigo-600">8.8</div>
              </div>
              <div className="bg-white/90 bg-gradient-to-br from-gray-100 to-violet-100 rounded-2xl p-4 shadow-lg border border-gray-50 flex flex-col items-center
                transition-transform duration-400 hover:-rotate-y-4 hover:scale-105
              ">
                <span className="text-sm font-bold text-gray-700 mb-1">Language</span>
                <div className="text-2xl font-extrabold text-violet-600">8.3</div>
              </div>
            </div>
            {/* Glass "reflection" overlay */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none rounded-3xl bg-gradient-to-br from-white/40 via-transparent to-white/10 opacity-50"/>
          </div>
          {/* Floating 3D elements */}
          <div className="absolute -top-16 -left-16 w-16 h-16 rounded-full bg-gradient-to-tr from-white via-indigo-50 to-violet-100 shadow-2xl opacity-70 animate-float-slow" />
          <div className="absolute bottom-0 right-0 w-24 h-24 rounded-[33%] bg-gradient-to-br from-violet-100 via-white to-indigo-50 shadow-xl opacity-50 animate-float-fast" />
        </div>
      </section>

      {/* WHY Locuta.ai - Feature Cards */}
      <section id="why" className="relative py-28 px-5 bg-gradient-to-t from-white/60 via-gray-50/80 to-white">
        <div className="max-w-7xl mx-auto text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-5 tracking-tight animate-fade-in">
            Why Locuta.ai?
          </h2>
          <p className="text-lg text-gray-500 font-medium animate-fade-in-del1">
            Everything you need to become a confident speaker.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
          <div className="group bg-gradient-to-br from-white/90 via-indigo-50/80 to-white/70 rounded-3xl p-10 shadow-xl border border-gray-100 flex flex-col items-center text-center
            transition-all duration-400 will-change-transform hover:-rotate-x-6 hover:rotate-y-3 hover:scale-105
            animate-fade-in-del1"
            style={{
              perspective: "800px",
            }}
          >
            <Feature3DShape type="cube" />
            <h3 className="text-2xl font-semibold mb-3 text-gray-900">AI-Powered Feedback</h3>
            <p className="text-base text-gray-500 font-medium">
              Receive detailed, personalized AI feedback. Locuta analyzes your speaking and offers actionable insights—so you improve faster, every session.
            </p>
          </div>
          <div className="group bg-gradient-to-br from-white/90 via-violet-50/80 to-white/70 rounded-3xl p-10 shadow-xl border border-gray-100 flex flex-col items-center text-center
            transition-all duration-400 will-change-transform hover:rotate-x-6 hover:scale-105
            animate-fade-in-del2"
            style={{
              perspective: "800px",
            }}
          >
            <Feature3DShape type="sphere" />
            <h3 className="text-2xl font-semibold mb-3 text-gray-900">Track Your Progress</h3>
            <p className="text-base text-gray-500 font-medium">
              See your growth with rich analytics: speaking trends, scores, lesson completion, and areas to focus on. Make your progress visible and motivating.
            </p>
          </div>
          <div className="group bg-gradient-to-br from-white/90 via-indigo-50/80 to-white/70 rounded-3xl p-10 shadow-xl border border-gray-100 flex flex-col items-center text-center
            transition-all duration-400 will-change-transform hover:-rotate-x-6 hover:scale-105
            animate-fade-in-del3"
            style={{
              perspective: "800px",
            }}
          >
            <Feature3DShape type="pyramid" />
            <h3 className="text-2xl font-semibold mb-3 text-gray-900">Real-World Scenarios</h3>
            <p className="text-base text-gray-500 font-medium">
              Practice realistic situations: public speaking, interviews, pitches, and more. Locuta adapts lessons to your needs and speaking goals.
            </p>
          </div>
        </div>
        {/* Floating decor */}
        <FloatingShapes />
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative py-28 px-5 max-w-7xl mx-auto animate-parallax-fade-in">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-5 tracking-tight animate-fade-in">
            How It Works
          </h2>
          <p className="text-lg text-gray-500 font-medium animate-fade-in-del1">
            Start improving your speaking skills in 3 simple steps.
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-stretch md:gap-12 gap-20 justify-center max-w-4xl mx-auto">
          <Step3D
            number={1}
            title="Choose Your Category"
            desc="Select from public speaking, storytelling, creator content, workplace communication, casual conversation, or persuasive pitches."
          />
          <div className="hidden md:block flex-1 relative">
            {/* Custom parallax connecting line for 3D */}
            <div className="absolute left-1/2 top-10 -translate-x-1/2 w-2 h-[80%] bg-gradient-to-b from-indigo-100 via-violet-100 to-gray-200 rounded-full blur-sm opacity-60" />
          </div>
          <Step3D
            number={2}
            title="Practice Speaking"
            desc="Record yourself responding to real prompts, and choose your AI coach's tone—supportive, inspiring, or even bossy!"
          />
          <div className="hidden md:block flex-1 relative">
            <div className="absolute left-1/2 top-10 -translate-x-1/2 w-2 h-[80%] bg-gradient-to-b from-indigo-100 via-violet-100 to-gray-200 rounded-full blur-sm opacity-60" />
          </div>
          <Step3D
            number={3}
            title="Get Instant Feedback"
            desc="Receive AI feedback with scores, targeted suggestions, and even see how an expert would deliver your message."
            last
          />
        </div>
      </section>

      {/* 6 Categories - 3D lift cards */}
      <section id="categories" className="relative py-28 px-5 bg-gradient-to-t from-white/82 via-gray-50/98 to-white/88">
        <div className="max-w-7xl mx-auto text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-5 tracking-tight">6 Comprehensive Categories</h2>
          <p className="text-lg text-gray-500 font-medium">Over 300 lessons designed by communication experts.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            { name: "Public Speaking", desc: "Master presentations and speeches" },
            { name: "Storytelling", desc: "Craft compelling narratives" },
            { name: "Creator Speaking", desc: "Engage your video audience" },
            { name: "Casual Conversation", desc: "Build social confidence" },
            { name: "Workplace Communication", desc: "Excel in professional settings" },
            { name: "Pitch Anything", desc: "Master persuasive pitching" },
          ].map((category, i) => (
            <div
              key={category.name}
              className="group bg-gradient-to-br from-white via-gray-50 to-indigo-50/80 rounded-2xl p-7 border border-gray-100 shadow-lg flex flex-col items-start
                transition-all duration-400 will-change-transform hover:-rotate-x-4 hover:-rotate-y-4 hover:scale-105
                hover:z-10
              "
              style={{
                perspective: "600px",
              }}
            >
              {/* Abstract 3D shape per card */}
              <div
                className="mb-5 w-9 h-9 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-[34%] shadow-md transition-transform duration-400 group-hover:scale-110"
                style={{
                  transform: `perspective(400px) rotateY(${i % 2 === 0 ? 18 : -14}deg) rotateX(${i % 3 ? 8 : -8}deg)`
                }}
              ></div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">{category.name}</h3>
              <p className="text-gray-600 font-medium">{category.desc}</p>
            </div>
          ))}
        </div>
        <FloatingShapes />
      </section>

      {/* Final CTA */}
      <section className="relative z-10 py-24 px-5 bg-gradient-to-r from-indigo-50 via-white to-violet-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white/80 rounded-3xl p-12 shadow-2xl border border-gray-100 pointer-events-auto 
            transition-transform duration-500 hover:scale-105 hover:-rotate-y-3 hover:shadow-[0_15px_60px_0_rgba(97,80,234,0.13)]
            flex flex-col items-center animate-fade-in"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6">Ready to Transform Your Speaking?</h2>
            <p className="text-lg text-gray-500 mb-9">
              Join thousands of users upgrading their communication skills with AI-powered practice.<br />
              Start your journey today – completely free!
            </p>
            <Link
              href="/auth/signup"
              className="inline-block bg-gradient-to-r from-violet-500 to-indigo-600 text-white px-10 py-4 rounded-xl font-bold text-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-400"
            >
              Get Started Free <span aria-hidden>🚀</span>
            </Link>
            <p className="text-indigo-400 mt-4 text-sm font-medium">
              No credit card required • Start practicing in 30 seconds
            </p>
          </div>
        </div>
        <FloatingShapes />
      </section>

      {/* Professional Footer */}
      <footer className="relative bg-white/80 border-t border-gray-100 backdrop-blur-xl py-12 px-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 md:gap-0">
          {/* Logo and brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-200 to-indigo-200 rounded-xl flex items-center justify-center shadow-md">
              <div className="w-5 h-5 bg-gradient-to-br from-indigo-400/80 to-violet-500/70 rounded-lg"></div>
            </div>
            <span className="text-xl font-bold text-gray-900">Locuta.ai</span>
          </div>
          {/* Footer navigation */}
          <div className="flex flex-wrap gap-6 mt-4 md:mt-0 text-sm text-gray-500">
            <Link href="#about" className="hover:text-indigo-700 transition-colors">About</Link>
            <Link href="#use-cases" className="hover:text-indigo-700 transition-colors">Use Cases</Link>
            <Link href="/blog" className="hover:text-indigo-700 transition-colors">Blog</Link>
            <Link href="/faq" className="hover:text-indigo-700 transition-colors">FAQ</Link>
            <Link href="/auth/login" className="hover:text-indigo-700 transition-colors">Sign In</Link>
          </div>
          {/* Copy */}
          <div className="text-gray-400 text-xs mt-6 md:mt-0">
            © 2025 Locuta.ai. Elevate your communication.
          </div>
        </div>
        {/* Minimal floating shape */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gradient-to-r from-violet-100 to-indigo-100 rounded-full blur-xl opacity-40 pointer-events-none" aria-hidden />
      </footer>

      {/* Tailwind custom keyframes for waveform, float, fade-in, etc. */}
      <style>{`
        @keyframes waveformPulse {
          0%, 100% { height: 18px; }
          50% { height: 42px; }
        }
        .animate-float-slow { animation: floatY 8s ease-in-out infinite alternate; }
        .animate-float-med { animation: floatY 5.5s ease-in-out infinite alternate; }
        .animate-float-fast { animation: floatY 3.2s ease-in-out infinite alternate; }
        @keyframes floatY { 0%{ transform: translateY(0px); } 100%{ transform: translateY(16px); } }
        .animate-fade-in { animation: fadeIn 0.8s both; }
        .animate-fade-in-del1 { animation: fadeIn 1s 0.25s both; }
        .animate-fade-in-del2 { animation: fadeIn 1.4s 0.45s both; }
        .animate-fade-in-del3 { animation: fadeIn 1.7s 0.65s both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(36px); } to { opacity: 1; transform: none; } }
        .animate-parallax-fade-in { animation: fadeIn 1.3s 0.2s both; }
        /* Animate transform on viewport entry for major sections */
        /* For a real project, consider IntersectionObserver for viewport fade-in/slide-in */
      `}</style>
    </div>
  );
}