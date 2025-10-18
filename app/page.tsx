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
    <div className="relative min-h-screen bg-gradient-to-tr from-white via-gray-50 to-indigo-50 text-gray-900">
      <FloatingShapes />
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl backdrop-saturate-150 border-b border-gray-100 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105">
              <img 
                src="/logo.png" 
                alt="Locuta.ai Logo" 
                className="w-full h-full object-contain"
              />
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
            Locuta.ai helps you master communication through personalized, real-time AI coaching. Practice real scenarios, get instant feedback, and build lasting confidence at your own pace.
          </p>
          <div className="flex flex-col md:flex-row gap-4 w-full max-w-2xl animate-fade-in-del2">
            <Link
              href="/auth/signup"
              className="flex-1 text-center bg-gradient-to-r from-violet-500 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-400 relative min-h-[56px] flex items-center justify-center"
            >
              Start Practicing Free <span aria-hidden>🚀</span>
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

      {/* USP Highlights Section */}
      <section className="relative py-20 bg-gradient-to-br from-indigo-50 via-white to-violet-50">
        <div className="max-w-7xl mx-auto px-5 sm:px-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-5 tracking-tight">
              Train Like an Athlete, Speak Like a Pro
            </h2>
            <p className="text-lg text-gray-600 font-medium max-w-2xl mx-auto">
              Elite speakers spend 90% of their time practicing so they can perform when it counts
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Step 1: Practice */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white rounded animate-pulse"></div>
                  </div>
                </div>
                {/* Speech bubbles */}
                <div className="absolute top-0 right-0 w-16 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-xs font-medium text-orange-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Book follow-up
                </div>
                <div className="absolute bottom-0 left-0 w-20 h-8 bg-green-100 rounded-lg flex items-center justify-center text-xs font-medium text-green-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{transitionDelay: '0.1s'}}>
                  Objection handling
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Step into the speaking cage</h3>
              <p className="text-gray-600 leading-relaxed">
                Get unlimited reps with realistic AI simulations that mimic real-world scenarios. Practice until speaking feels natural.
              </p>
            </div>

            {/* Step 2: Feedback */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-violet-200 rounded-2xl flex items-center justify-center mb-4 group-hover:-rotate-12 transition-transform duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white rounded animate-bounce"></div>
                  </div>
                </div>
                {/* Feedback items */}
                <div className="space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-700">Topic: What's your pricing?</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700">5 talking points hit</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700">Strong discovery</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                    <span className="text-gray-700">Use BANT framework</span>
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Coaching on your highlight reel</h3>
              <p className="text-gray-600 leading-relaxed">
                Break down your performance with instant insights on what to double down on and what to improve. See your speaking patterns clearly.
              </p>
            </div>

            {/* Step 3: Mastery */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-pink-200 rounded-2xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white rounded animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  </div>
                </div>
                {/* Video call mockup */}
                <div className="relative w-24 h-16 bg-gray-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-2 bg-gray-600 rounded flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                  <div className="absolute -inset-1 border-2 border-pink-400 rounded-lg animate-ping"></div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Fine-tune your swing</h3>
              <p className="text-gray-600 leading-relaxed">
                Focus on specific parts of your pitch like your opener, close, and discovery until it feels effortless. Master every component.
              </p>
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
              Start improving your speaking skills in 3 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-4xl font-bold text-white mx-auto mb-6 shadow-2xl">
                1
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Choose Your Category</h3>
              <p className="text-gray-600 leading-relaxed">
                Select from Public Speaking, Storytelling, Creator Content, Workplace Communication, 
                Casual Conversation, or Pitches for anything
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center text-4xl font-bold text-white mx-auto mb-6 shadow-2xl">
                2
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Practice Speaking</h3>
              <p className="text-gray-600 leading-relaxed">
                Record yourself responding to real-world prompts. Choose your AI coach's tone - 
                supportive, inspiring, or even bossy!
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center text-4xl font-bold text-white mx-auto mb-6 shadow-2xl">
                3
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Get Instant Feedback</h3>
              <p className="text-gray-600 leading-relaxed">
                Receive detailed AI feedback with scores, strengths, areas to improve, and even 
                hear how AI would deliver the same message.
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

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-violet-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="text-white">
              <div className="text-4xl md:text-5xl font-bold mb-2 animate-pulse">50K+</div>
              <p className="text-indigo-100">Active Users</p>
            </div>
            <div className="text-white">
              <div className="text-4xl md:text-5xl font-bold mb-2 animate-pulse">300+</div>
              <p className="text-indigo-100">Practice Lessons</p>
            </div>
            <div className="text-white">
              <div className="text-4xl md:text-5xl font-bold mb-2 animate-pulse">6</div>
              <p className="text-indigo-100">Speaking Categories</p>
            </div>
            <div className="text-white">
              <div className="text-4xl md:text-5xl font-bold mb-2 animate-pulse">4.9★</div>
              <p className="text-indigo-100">User Rating</p>
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
              Get Started Free 🚀
            </Link>
            <p className="text-gray-500 mt-4 text-sm">
              No credit card required • Start practicing in 30 seconds
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                <img 
                  src="/logo.png" 
                  alt="Locuta.ai Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-white">Locuta.ai</span>
            </div>
            <p className="text-gray-300">
              © 2025 Locuta.ai. Elevate your voice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}