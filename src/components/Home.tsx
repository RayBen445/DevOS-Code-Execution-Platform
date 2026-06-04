import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Zap, Users, BookOpen, Calendar, Puzzle, Rocket, Code2, Globe,
  ArrowRight, Check, Star, GitBranch, Terminal, Shield,
  Building2, ChevronRight,
} from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";
import { useSEO } from "../hooks/useSEO";

interface HomeProps {
  setShowLogin: (show: boolean) => void;
  setShowSignup?: (show: boolean) => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const STATS = [
  { value: "25,000+", label: "Projects deployed" },
  { value: "8,000+", label: "Developers" },
  { value: "50+", label: "Templates" },
  { value: "99.9%", label: "Uptime" },
];

const FEATURES = [
  {
    icon: Rocket,
    emoji: "🚀",
    title: "Instant Deploy",
    desc: "Your project is live in seconds with a shareable URL. No config, no CI pipeline needed.",
    color: "from-blue-500/10 to-blue-600/5",
    accent: "text-blue-400",
    ring: "bg-blue-600/15",
  },
  {
    icon: Users,
    emoji: "🤝",
    title: "Collaboration",
    desc: "Real-time multiplayer editing and org workspaces for teams of any size.",
    color: "from-purple-500/10 to-purple-600/5",
    accent: "text-purple-400",
    ring: "bg-purple-600/15",
  },
  {
    icon: Code2,
    emoji: "📚",
    title: "Templates",
    desc: "Start faster with 50+ community-built templates for React, Node, Python, and more.",
    color: "from-green-500/10 to-green-600/5",
    accent: "text-green-400",
    ring: "bg-green-600/15",
  },
  {
    icon: BookOpen,
    emoji: "🎓",
    title: "Learn",
    desc: "Built-in structured learning platform with progress tracking — study without leaving DevOS.",
    color: "from-yellow-500/10 to-yellow-600/5",
    accent: "text-yellow-400",
    ring: "bg-yellow-600/15",
  },
  {
    icon: Globe,
    emoji: "🏘️",
    title: "Dev Teams",
    desc: "Build with focused developer teams, post updates, and collaborate in real time.",
    color: "from-pink-500/10 to-pink-600/5",
    accent: "text-pink-400",
    ring: "bg-pink-600/15",
  },
  {
    icon: Zap,
    emoji: "⚡",
    title: "Credits",
    desc: "AI-powered features powered by a fair credit system. Free daily allowance for everyone.",
    color: "from-orange-500/10 to-orange-600/5",
    accent: "text-orange-400",
    ring: "bg-orange-600/15",
  },
  {
    icon: Puzzle,
    emoji: "🔌",
    title: "Marketplace (Coming Soon)",
    desc: "Plugin marketplace improvements are in progress and will roll out soon.",
    color: "from-orange-500/10 to-orange-600/5",
    accent: "text-orange-400",
    ring: "bg-orange-600/15",
  },
  {
    icon: GitBranch,
    emoji: "🌿",
    title: "Branching & PRs",
    desc: "Create branches, open pull requests, and merge changes — all inside the IDE, no Git CLI needed.",
    color: "from-teal-500/10 to-teal-600/5",
    accent: "text-teal-400",
    ring: "bg-teal-600/15",
  },
];

const TESTIMONIALS = [
  {
    name: "Amara Osei",
    handle: "@amara_builds",
    avatar: "AO",
    color: "bg-blue-600",
    text: "DevOS is the only IDE I've used that actually feels at home on mobile. Pushed a fix to production from my phone during a commute — genuinely insane.",
  },
  {
    name: "Luca Ferrante",
    handle: "@lucadev_io",
    avatar: "LF",
    color: "bg-purple-600",
    text: "The org workspaces and real-time chat have replaced three separate tools for our team. Everything just lives in one place now.",
  },
  {
    name: "Priya Nair",
    handle: "@priya_codes",
    avatar: "PN",
    color: "bg-green-600",
    text: "I built my entire portfolio using DevOS and the learning platform to brush up on TypeScript. The deploy-to-subdomain feature is 🔥",
  },
];

const CODE_LINES = [
  { indent: 0, color: "text-purple-400", text: "import" , rest: " { useState } ", tail: "from", tailColor: "text-yellow-400", after: " 'react';" },
  { indent: 0, color: "text-purple-400", text: "import" , rest: " App ", tail: "from", tailColor: "text-yellow-400", after: " './App';" },
  { indent: 0, color: "", text: "", rest: "", tail: "", tailColor: "", after: "" },
  { indent: 0, color: "text-blue-400", text: "export default", rest: " function", tail: "", tailColor: "", after: "" },
  { indent: 0, color: "text-yellow-300", text: " Counter", rest: "() {", tail: "", tailColor: "", after: "" },
  { indent: 1, color: "text-purple-400", text: "  const", rest: " [count, setCount] = ", tail: "useState", tailColor: "text-blue-400", after: "(0);" },
  { indent: 0, color: "", text: "", rest: "", tail: "", tailColor: "", after: "" },
  { indent: 1, color: "text-purple-400", text: "  return", rest: " (", tail: "", tailColor: "", after: "" },
  { indent: 2, color: "text-gray-400", text: "    <button", rest: "", tail: "", tailColor: "", after: "" },
  { indent: 3, color: "text-green-400", text: "      onClick", rest: "={() => setCount(c => c + 1)}", tail: "", tailColor: "", after: "" },
  { indent: 2, color: "text-gray-400", text: "    >", rest: "Count: {count}", tail: "", tailColor: "", after: "" },
  { indent: 2, color: "text-gray-400", text: "    </button>", rest: "", tail: "", tailColor: "", after: "" },
  { indent: 1, color: "", text: "  );", rest: "", tail: "", tailColor: "", after: "" },
  { indent: 0, color: "", text: "}", rest: "", tail: "", tailColor: "", after: "" },
];

export default function Home({ setShowLogin, setShowSignup }: HomeProps) {
  useSEO({
    title: "DevOS — The Cloud IDE Built for Developers",
    description: "Write, deploy, and collaborate on code — all in your browser. No setup required.",
  });

  const openSignup = () => (setShowSignup ?? setShowLogin)(true);

  return (
    <div className="min-h-screen bg-base text-white selection:bg-blue-500/30 overflow-x-hidden">
      <Navbar onSignIn={() => setShowLogin(true)} />

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative w-full overflow-hidden">
          <div className="max-w-7xl mx-auto px-5 md:px-8 pt-20 md:pt-40 pb-16 md:pb-32">
            {/* Ambient blobs - enhanced */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
              <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-blue-600/12 rounded-full blur-[180px] -translate-x-1/2 -translate-y-1/3" />
              <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[150px]" />
              <div className="absolute bottom-0 left-1/2 w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[140px] -translate-x-1/2 translate-y-1/3" />
            </div>

            <div className="grid lg:grid-cols-2 gap-14 lg:gap-24 items-center">
              {/* Left — copy */}
              <motion.div variants={stagger} initial="hidden" animate="show">

                <motion.h1
                  variants={fadeUp}
                  className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.88] mb-8"
                >
                  The cloud IDE{" "}
                  <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
                    built for developers.
                  </span>
                </motion.h1>

                <motion.p variants={fadeUp} className="text-lg md:text-xl text-white/50 mb-12 max-w-2xl leading-relaxed">
                  Write, deploy, and collaborate on code — all in your browser. No setup, no servers, no friction.
                </motion.p>

                <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 mb-12">
                  <button
                    onClick={openSignup}
                    className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/40 hover:shadow-blue-500/50 hover:-translate-y-1"
                  >
                    Start building free
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <a
                    href="/docs"
                    className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/8 hover:bg-white/12 border border-border-base hover:border-white/25 text-white font-bold text-sm transition-all"
                  >
                    View documentation
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </motion.div>

                <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center gap-6 text-sm text-white/40">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span>Free forever plan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span>No credit card needed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span>Deploy instantly</span>
                  </div>
                </motion.div>
              </motion.div>

              {/* Right — mock code editor */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.7, ease: "easeOut" }}
                className="hidden lg:block"
              >
                <div className="relative rounded-2xl overflow-hidden border border-border-base shadow-2xl shadow-blue-600/20 bg-card hover:border-white/25 transition-all">
                  {/* Editor chrome */}
                  <div className="flex items-center gap-2 px-4 py-3.5 bg-gradient-to-r from-[#161616] to-[#0d0d0d] border-b border-border-base">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <span className="w-3 h-3 rounded-full bg-green-500/80" />
                    <span className="ml-3 text-xs text-white/30 font-mono flex-1">Counter.tsx</span>
                    <span className="text-xs text-white/20">Deployed</span>
                  </div>
                  {/* Sidebar stub */}
                  <div className="flex">
                    <div className="w-10 bg-base border-r border-border-base py-3 flex flex-col items-center gap-4">
                      <Code2 className="w-4 h-4 text-white/30 hover:text-white/50 transition-colors" />
                      <GitBranch className="w-4 h-4 text-white/30 hover:text-white/50 transition-colors" />
                      <Terminal className="w-4 h-4 text-white/30 hover:text-white/50 transition-colors" />
                    </div>
                    {/* Code area */}
                    <div className="flex-1 p-6 font-mono text-sm leading-7 overflow-hidden">
                      {CODE_LINES.map((line, i) => (
                        <div key={i} className="flex">
                          <span className="text-white/20 mr-4 select-none w-5 text-right shrink-0">{i + 1}</span>
                          <span>
                            {line.color && <span className={line.color}>{line.text}</span>}
                            {line.rest && <span className="text-white/75">{line.rest}</span>}
                            {line.tailColor && <span className={line.tailColor}>{line.tail}</span>}
                            {line.after && <span className="text-white/55">{line.after}</span>}
                          </span>
                        </div>
                      ))}
                      {/* Blinking cursor */}
                      <div className="flex mt-1">
                        <span className="text-white/20 mr-4 select-none w-5 text-right shrink-0">15</span>
                        <span className="inline-block w-2 h-5 bg-blue-400 animate-pulse" />
                      </div>
                    </div>
                  </div>
                  {/* Bottom status bar */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600/40 to-blue-500/30 text-xs text-white/75 font-mono border-t border-border-base">
                    <span className="flex items-center gap-2">
                      <GitBranch className="w-3 h-3" /> main
                    </span>
                    <span>TypeScript · UTF-8</span>
                    <span className="flex items-center gap-1 text-green-300">
                      <Check className="w-3 h-3" /> Deployed
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Onboarding flow ──────────────────────────────────────────── */}
        <section className="w-full">
          <div className="max-w-7xl mx-auto px-5 md:px-8 py-12 md:py-16">
            <div className="rounded-3xl border border-border-base bg-white/[0.03] p-6 md:p-8">
              <p className="text-blue-400/80 text-xs font-bold uppercase tracking-widest mb-3">Onboarding</p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">Start in under 2 minutes</h2>
              <div className="mt-6 grid md:grid-cols-3 gap-4">
                {[
                  { step: "1", title: "Create account", desc: "Sign up and set your username to activate your workspace." },
                  { step: "2", title: "Create from template", desc: "Pick a starter template and open a file instantly in the editor." },
                  { step: "3", title: "Deploy & share", desc: "Deploy in one click and share your live URL with your team." },
                ].map((item) => (
                  <div key={item.step} className="rounded-2xl border border-border-base bg-black/25 p-4">
                    <div className="w-7 h-7 rounded-lg bg-blue-600/25 text-blue-300 text-sm font-bold flex items-center justify-center">{item.step}</div>
                    <p className="mt-3 font-semibold text-white">{item.title}</p>
                    <p className="text-sm text-white/45 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats bar ────────────────────────────────────────────────── */}
        <section className="w-full border-y border-border-base bg-gradient-to-r from-blue-600/5 via-white/[0.02] to-violet-600/5">
          <div className="max-w-7xl mx-auto px-5 md:px-8 py-16 md:py-20 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {STATS.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center"
              >
                <p className="text-4xl md:text-5xl font-black text-transparent bg-gradient-to-r from-white to-white/80 bg-clip-text tracking-tight mb-2">{s.value}</p>
                <p className="text-sm md:text-base text-white/45 font-medium">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Features grid ────────────────────────────────────────────── */}
        <section className="w-full">
          <div className="max-w-7xl mx-auto px-5 md:px-8 py-24 md:py-32">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16 md:mb-20"
            >
              <p className="text-blue-400/80 text-xs font-bold uppercase tracking-widest mb-4">Packed with features</p>
              <h2 className="text-5xl md:text-6xl font-black tracking-tight text-white mb-6">
                One platform. Zero friction.
              </h2>
              <p className="text-white/50 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                Everything you need to write, deploy, and scale — all built into one powerful platform.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className={`relative p-8 rounded-2xl bg-gradient-to-br ${f.color} border border-border-base hover:border-border-base transition-all group hover:shadow-lg hover:shadow-white/5`}
                >
                  <div className={`w-14 h-14 rounded-xl ${f.ring} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <f.icon className={`w-6 h-6 ${f.accent}`} />
                  </div>
                  <h3 className="font-bold text-white text-xl mb-3">{f.title}</h3>
                  <p className="text-white/50 text-base leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        

        {/* ── Testimonials ─────────────────────────────────────────── */}
        <section className="w-full">
          <div className="max-w-7xl mx-auto px-5 md:px-8 pb-24 md:pb-32">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <p className="text-blue-400/80 text-xs font-bold uppercase tracking-widest mb-4">Social Proof</p>
              <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight mb-6">Loved by developers worldwide</h2>
              <p className="text-white/50 text-lg max-w-2xl mx-auto">See what developers are building with DevOS</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="p-8 rounded-2xl bg-gradient-to-br from-white/8 to-white/3 border border-white/12 hover:border-border-base transition-all group hover:shadow-lg hover:shadow-white/5"
                >
                  <div className="flex gap-1 mb-5">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-white/70 text-base leading-relaxed mb-6 font-medium">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-border-base">
                    <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center font-bold text-sm text-white flex-shrink-0`}>
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{t.name}</p>
                      <p className="text-white/40 text-xs">{t.handle}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────── */}
        <section className="w-full">
          <div className="max-w-5xl mx-auto px-5 md:px-8 pb-32">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded-3xl overflow-hidden border border-border-base p-12 md:p-20 bg-gradient-to-br from-blue-600/15 via-indigo-600/10 to-transparent hover:border-white/25 transition-all group"
            >
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/15 blur-[120px]" />
              </div>
              <div className="relative text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/30 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-8">
                  <Rocket className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight mb-6">
                  Ready to build?
                </h2>
                <p className="text-white/50 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
                  Join thousands of developers building, learning, and shipping on DevOS. Start free today.
                </p>
                <button
                  onClick={openSignup}
                  className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-base transition-all shadow-xl shadow-blue-600/40 hover:shadow-blue-500/50 hover:-translate-y-1"
                >
                  Create your free account
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </section>

      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
