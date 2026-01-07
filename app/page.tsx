import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link";

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
    <>
      <script dangerouslySetInnerHTML={{
        __html: `
          document.addEventListener('DOMContentLoaded', function() {
            const menuButton = document.querySelector('button[aria-label="Toggle mobile menu"]');
            const mobileMenu = document.getElementById('mobile-menu');
            
            if (menuButton && mobileMenu) {
              menuButton.addEventListener('click', function() {
                mobileMenu.classList.toggle('hidden');
              });
            }
          });
        `
      }} />
    <div className="relative min-h-screen bg-gradient-to-tr from-white via-gray-50 to-indigo-50 text-gray-900">
      <FloatingShapes />
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl backdrop-saturate-150 border-b border-gray-100 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105">
                <img 
                  src="/Icon.png" 
                  alt="Locuta.ai Logo" 
                  className="w-full h-full object-contain"
                />
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">Locuta.ai</span>
          </Link>
            
            {/* Desktop Navigation */}
<nav className="hidden md:flex items-center gap-6 text-base font-medium">
  <Link href="/about" className="text-gray-700 hover:text-indigo-600 transition-colors">About</Link>
  <Link href="/use-cases" className="text-gray-700 hover:text-indigo-600 transition-colors">Use Cases</Link>
  <Link href="/pricing" className="text-gray-700 hover:text-indigo-600 transition-colors">Pricing</Link>
  <div className="relative group">
  <span className="cursor-pointer text-gray-700 hover:text-indigo-600 transition-colors">
    Resources
  </span>
  <div className="absolute left-0 top-full mt-2 min-w-[160px] bg-white shadow-lg rounded-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none group-hover:pointer-events-auto transition-all duration-200 z-50">
    <Link href="/blog" className="block px-5 py-3 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 transition-colors rounded-t-xl">Blog</Link>
    <Link href="/faq" className="block px-5 py-3 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 transition-colors rounded-b-xl">FAQ</Link>
  </div>
</div>
  <Link href="/contact" className="text-gray-700 hover:text-indigo-600 transition-colors">Contact</Link>
</nav>
            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex items-center gap-2">
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
              Try 14 Days Free
            </Link>
            </div>
            
            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Toggle mobile menu">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          
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
              <div className="pt-4 border-t border-gray-100 flex flex-col space-y-3">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-gray-700 font-semibold hover:text-indigo-600 transition-colors text-center"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-5 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transition-all duration-400 text-center"
                >
                  Try 14 Days Free
                </Link>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 px-5 sm:px-10 max-w-7xl mx-auto py-12 md:py-16 flex flex-col md:flex-row items-center gap-x-16">
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
            Locuta.ai helps you master communication through personalized, real-time AI coaching. Practice real scenarios, get instant feedback, and build lasting confidence at your own pace.
          </p>
          <div className="flex flex-col md:flex-row gap-4 w-full max-w-2xl animate-fade-in-del2">
          <Link
  href="/auth/signup"
  className="flex-1 text-center bg-gradient-to-r from-violet-500 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-400 relative min-h-[56px] flex items-center justify-center"
>
  Start Your 14-Day Free Trial <span aria-hidden>Start</span>
  <span className="absolute inset-0 rounded-xl bg-white/10 pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-500" />
</Link>
            <Link
              href="#why"
              className="flex-1 text-center border border-indigo-100 bg-white/50 text-indigo-800 px-8 py-4 rounded-xl font-semibold hover:scale-105 hover:bg-indigo-50/80 transition-all duration-400 shadow-md hover:shadow-lg min-h-[56px] flex items-center justify-center"
            >
              Learn More
            </Link>
          </div>
        </div>
        {/* Right: 3D Mockup */}
        <div className="flex-1 hidden md:flex items-center justify-center relative group perspective-900 animate-fade-in-del3" style={{ zIndex: 2 }}>
          {/* 3D elevated card */}
          <div className="relative bg-white/70 shadow-2xl rounded-3xl border border-gray-200 overflow-hidden p-10 min-w-[450px] min-h-[480px] flex flex-col justify-between items-center
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

      {/* USP Highlights Section */}
      <section className="relative py-20 bg-gradient-to-br from-gray-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-5 sm:px-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-5 tracking-tight">
              Why Top Performers Choose Locuta.ai
          </h2>
            <p className="text-lg text-gray-600 font-medium max-w-3xl mx-auto">
              Three game-changing advantages that separate confident speakers from the rest
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* USP 1: AI Personalization */}
            <div className="group bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full -translate-y-16 translate-x-16 opacity-20 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-300 shadow-lg">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded animate-pulse"></div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">AI-Powered Personalization</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Get detailed feedback by analyzing your speaking patterns, pace, and delivery style. Our AI learns your unique voice and provides tailored coaching.
                </p>
                <div className="flex items-center gap-2 text-sm text-indigo-600 font-semibold">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                  <span>Personalized coaching that adapts to you</span>
                </div>
              </div>
            </div>

            {/* USP 2: Coaching Tones */}
            <div className="group bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-100 to-violet-200 rounded-full -translate-y-16 translate-x-16 opacity-20 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl flex items-center justify-center mb-6 group-hover:-rotate-12 transition-transform duration-300 shadow-lg">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-gradient-to-br from-violet-400 to-violet-600 rounded animate-bounce"></div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">6 Unique Coaching Tones</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Choose from supportive, inspiring, challenging, or even bossy coaches to shape your personality. Find the coaching style that brings out your best.
                </p>
                <div className="flex items-center gap-2 text-sm text-violet-600 font-semibold">
                  <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  <span>Multiple coaching personalities to match your needs</span>
                </div>
              </div>
            </div>

            {/* USP 3: Categories */}
            <div className="group bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full -translate-y-16 translate-x-16 opacity-20 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-300 shadow-lg">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-gradient-to-br from-pink-400 to-pink-600 rounded animate-pulse" style={{animationDelay: '1s'}}></div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">6 Comprehensive Categories</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Master everything from public speaking to casual conversations with 300+ expert-designed lessons. Every speaking scenario covered.
                </p>
                <div className="flex items-center gap-2 text-sm text-pink-600 font-semibold">
                  <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                  <span>Complete coverage of all speaking situations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <div id="features" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Locuta.ai?
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to become a confident speaker
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-indigo-300 transition-all hover:scale-105 shadow-lg group">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-300">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg animate-pulse"></div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">AI-Powered Feedback</h3>
              <p className="text-gray-600 leading-relaxed">
                Get detailed, personalized feedback on every practice session. Our AI analyzes your 
                speaking patterns and provides actionable insights to improve.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-pink-300 transition-all hover:scale-105 shadow-lg group">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-pink-200 rounded-2xl flex items-center justify-center mb-6 group-hover:-rotate-12 transition-transform duration-300">
                <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg animate-bounce"></div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Track Your Progress</h3>
              <p className="text-gray-600 leading-relaxed">
                Watch your skills improve over time with detailed analytics. See your scores, 
                completion rates, and areas of strength across all categories.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-blue-300 transition-all hover:scale-105 shadow-lg group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-300">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg animate-pulse" style={{animationDelay: '0.5s'}}></div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Real-World Scenarios</h3>
              <p className="text-gray-600 leading-relaxed">
                Practice situations you'll actually encounter - from public speaking to casual 
                conversations. 300+ lessons across 6 comprehensive categories.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Start improving your speaking skills in 4 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-4xl font-bold text-white mx-auto mb-6 shadow-2xl group-hover:scale-110 transition-transform duration-300">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Choose Your Category</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Select from 6 comprehensive categories: Public Speaking, Storytelling, Creator Content, Workplace Communication, Casual Conversation, or Pitch Anything. Each category is designed by speaking experts for real-world scenarios.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-violet-600 rounded-full flex items-center justify-center text-4xl font-bold text-white mx-auto mb-6 shadow-2xl group-hover:scale-110 transition-transform duration-300">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Choose Your Tone</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Pick from 6 unique coaching personalities: Supportive, Inspiring, Diplomatic, Bossy, or Funny. Each tone helps shape different aspects of your speaking personality and builds confidence in various situations.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center text-4xl font-bold text-white mx-auto mb-6 shadow-2xl group-hover:scale-110 transition-transform duration-300">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Start Practice & Record</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Get AI-generated tasks tailored to your chosen category and tone. Record your voice responding to realistic scenarios. Practice with unlimited attempts until you feel confident with your delivery and message.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-4xl font-bold text-white mx-auto mb-6 shadow-2xl group-hover:scale-110 transition-transform duration-300">
                4
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Get AI Feedback</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Receive instant, personalized AI feedback for each lesson. Get detailed analysis on delivery, clarity, confidence, and language use. See your progress over time and identify areas for improvement with actionable insights.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Showcase */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              6 Comprehensive Categories
            </h2>
            <p className="text-xl text-gray-600">
              Over 300 lessons designed by speaking experts
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Public Speaking', desc: 'Master presentations and speeches', color: 'from-indigo-500 to-indigo-600' },
              { name: 'Storytelling', desc: 'Craft compelling narratives', color: 'from-violet-500 to-violet-600' },
              { name: 'Creator Speaking', desc: 'Engage your video audience', color: 'from-pink-500 to-pink-600' },
              { name: 'Casual Conversation', desc: 'Build social confidence', color: 'from-blue-500 to-blue-600' },
              { name: 'Workplace Communication', desc: 'Excel in professional settings', color: 'from-green-500 to-green-600' },
              { name: 'Pitch Anything', desc: 'Master persuasive pitching', color: 'from-orange-500 to-orange-600' },
            ].map((category, index) => (
              <div 
                key={category.name}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-indigo-300 transition-all shadow-lg group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <div className={`w-6 h-6 bg-gradient-to-br ${category.color} rounded-lg animate-pulse`} style={{animationDelay: `${index * 0.2}s`}}></div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{category.name}</h3>
                <p className="text-gray-600">{category.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Loved by Thousands of Speakers
            </h2>
            <p className="text-xl text-gray-600">
              See how Locuta.ai is transforming communication skills worldwide
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-8 border border-indigo-200 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  S
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">Sarah Chen</h4>
                  <p className="text-sm text-gray-600">Sales Director</p>
                </div>
              </div>
              <p className="text-gray-700 italic mb-4">
                "I went from dreading presentations to actually enjoying them. The AI feedback helped me identify my filler words and improve my pacing. My confidence has skyrocketed!"
              </p>
              <div className="flex text-yellow-400">
                {'★'.repeat(5)}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-2xl p-8 border border-violet-200 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-violet-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  M
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">Marcus Rodriguez</h4>
                  <p className="text-sm text-gray-600">Content Creator</p>
                </div>
              </div>
              <p className="text-gray-700 italic mb-4">
                "The different coaching tones are game-changing. I can practice with a supportive coach or challenge myself with the bossy one. It's like having multiple mentors!"
              </p>
              <div className="flex text-yellow-400">
                {'★'.repeat(5)}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-8 border border-pink-200 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  A
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">Alex Thompson</h4>
                  <p className="text-sm text-gray-600">Startup Founder</p>
                </div>
              </div>
              <p className="text-gray-700 italic mb-4">
                "Pitching to investors used to terrify me. Now I practice with realistic scenarios and get instant feedback. I've closed 3 deals this quarter alone!"
              </p>
              <div className="flex text-yellow-400">
                {'★'.repeat(5)}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-br from-indigo-50 to-violet-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-3xl p-12 border border-gray-200 shadow-xl">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Ready to Transform Your Speaking?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Join thousands of users improving their communication skills with AI-powered practice.
              Start your journey today - completely free!
            </p>
            <Link
  href="/auth/signup"
  className="inline-block bg-gradient-to-r from-violet-500 to-indigo-600 text-white px-12 py-5 rounded-xl font-bold text-xl hover:shadow-2xl hover:scale-105 transition-all"
>
  Try 14 Days Free - No Card Required
</Link>
<p className="text-gray-500 mt-4 text-sm">
  14-day free trial • 10 sessions per day • Cancel anytime
</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border-t border-slate-200/70 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-slate-900 hover:scale-110 transition-transform duration-300 cursor-default">
                Locuta.ai
              </span>
            </div>
            <p className="text-slate-600 text-sm footer-text">
              © 2025 Locuta.ai. Elevate your voice.
            </p>
          </div>
        </div>
      </footer>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .footer-text {
            animation: fadeInUp 1s ease-in-out 0.3s forwards;
            opacity: 0;
          }
        `
      }} />
    </div>
    </>
  )
}