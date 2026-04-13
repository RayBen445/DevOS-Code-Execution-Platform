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
    title: "Communities",
    desc: "Find your tribe — join developer communities, post updates, and chat in real time.",
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
    title: "Plugin Marketplace",
    desc: "Add auth, database, storage, email, and more to any project in one click. Env vars injected automatically.",
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
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-blue-500/30 overflow-x-hidden">
      <Navbar onSignIn={() => setShowLogin(true)} />

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative max-w-7xl mx-auto px-5 md:px-8 pt-20 md:pt-32 pb-16 md:pb-24">
          {/* Ambient blobs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
            <div className="absolute top-0 left-1/4 w-[700px] h-[700px] bg-blue-600/8 rounded-full blur-[160px] -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-violet-600/6 rounded-full blur-[140px] translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-1/2 w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[120px] -translate-x-1/2" />
          </div>

          <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            {/* Left — copy */}
            <motion.div variants={stagger} initial="hidden" animate="show">
              <motion.a
                variants={fadeUp}
                href="/docs#plugin-marketplace"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wide mb-7 hover:bg-blue-600/20 transition-colors"
              >
                <Puzzle className="w-3 h-3" />
                Now with Plugin Marketplace · Learn more
                <ChevronRight className="w-3 h-3" />
              </motion.a>

              <motion.h1
                variants={fadeUp}
                className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.92] mb-6"
              >
                The cloud IDE{" "}
                <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
                  built for developers
                </span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-lg md:text-xl text-white/45 mb-10 max-w-lg leading-relaxed">
                Write, deploy, and collaborate — all in your browser. No setup required.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
                <button
                  onClick={openSignup}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-500/30 hover:-translate-y-0.5"
                >
                  Start building free
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="/docs"
                  className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-bold text-sm transition-all"
                >
                  See the docs
                </a>
              </motion.div>

              <motion.div variants={fadeUp} className="flex items-center gap-4 mt-8 text-xs text-white/30">
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-500" /> Free forever plan</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-500" /> No credit card needed</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-green-500" /> Deploy instantly</span>
              </motion.div>
            </motion.div>

            {/* Right — mock code editor */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
              className="hidden lg:block"
            >
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 bg-[#0d0d0d]">
                {/* Editor chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-[#161616] border-b border-white/5">
                  <span className="w-3 h-3 rounded-full bg-red-500/70" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <span className="w-3 h-3 rounded-full bg-green-500/70" />
                  <span className="ml-3 text-xs text-white/20 font-mono">Counter.tsx</span>
                </div>
                {/* Sidebar stub */}
                <div className="flex">
                  <div className="w-10 bg-[#111] border-r border-white/5 py-3 flex flex-col items-center gap-3">
                    <Code2 className="w-4 h-4 text-white/20" />
                    <GitBranch className="w-4 h-4 text-white/20" />
                    <Terminal className="w-4 h-4 text-white/20" />
                  </div>
                  {/* Code area */}
                  <div className="flex-1 p-5 font-mono text-sm leading-7 overflow-hidden">
                    {CODE_LINES.map((line, i) => (
                      <div key={i} className="flex">
                        <span className="text-white/15 mr-4 select-none w-4 text-right shrink-0">{i + 1}</span>
                        <span>
                          {line.color && <span className={line.color}>{line.text}</span>}
                          {line.rest && <span className="text-white/70">{line.rest}</span>}
                          {line.tailColor && <span className={line.tailColor}>{line.tail}</span>}
                          {line.after && <span className="text-white/50">{line.after}</span>}
                        </span>
                      </div>
                    ))}
                    {/* Blinking cursor */}
                    <div className="flex mt-1">
                      <span className="text-white/15 mr-4 select-none w-4 text-right shrink-0">15</span>
                      <span className="inline-block w-2 h-5 bg-blue-400 animate-pulse" />
                    </div>
                  </div>
                </div>
                {/* Bottom status bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-blue-600 text-xs text-white/80 font-mono">
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
        </section>

        {/* ── Stats bar ────────────────────────────────────────────────── */}
        <section className="border-y border-white/5 bg-white/[0.02]">
          <div className="max-w-4xl mx-auto px-5 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <p className="text-3xl font-black text-white tracking-tight">{s.value}</p>
                <p className="text-sm text-white/35 mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Features grid ────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">Everything you need</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">
              One platform. Zero friction.
            </h2>
            <p className="text-white/40 text-lg mt-4 max-w-xl mx-auto">
              From writing your first line to collaborating with a team — DevOS has you covered.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                className={`relative p-6 rounded-2xl bg-gradient-to-br ${f.color} border border-white/8 hover:border-white/15 transition-all group`}
              >
                <div className={`w-11 h-11 rounded-xl ${f.ring} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                  <f.icon className={`w-5 h-5 ${f.accent}`} />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{f.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Plugin Marketplace teaser ─────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-5 md:px-8 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/15 via-blue-600/10 to-violet-600/10 p-8 md:p-12"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-indigo-600/15 rounded-full blur-[100px]" />
              <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-violet-600/10 rounded-full blur-[80px]" />
            </div>
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-4">
                  <Puzzle className="w-3 h-3" />
                  Coming soon
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
                  DevOS Plugins
                </h2>
                <p className="text-white/50 max-w-xl leading-relaxed">
                  Extend your projects with one-click plugins. Official first-party plugins for Auth, Database, Storage, and AI — plus a growing library of community contributions.
                </p>
                <div className="flex flex-wrap gap-2 mt-5">
                  {["DevOS Auth", "DevOS DB", "DevOS Storage", "DevOS AI"].map((p) => (
                    <span key={p} className="px-3 py-1 rounded-full bg-white/8 border border-white/10 text-xs text-white/60 font-medium">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <a
                href="/docs#plugin-marketplace"
                className="shrink-0 flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/25"
              >
                Get notified
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </section>

        {/* ── Testimonials ─────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-5 md:px-8 pb-20 md:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">Developers love DevOS</p>
            <h2 className="text-4xl font-black text-white tracking-tight">Don't take our word for it</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/8 hover:border-white/15 transition-all"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-white/60 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center text-xs font-bold text-white`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-xs text-white/35 font-mono">{t.handle}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-5 md:px-8 pb-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden border border-white/10 p-10 md:p-16 bg-gradient-to-b from-blue-600/10 to-transparent"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-48 bg-blue-600/10 blur-[80px]" />
            </div>
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-6">
                <Rocket className="w-7 h-7 text-blue-400" />
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                Ready to build?
              </h2>
              <p className="text-white/40 text-lg mb-8 max-w-lg mx-auto">
                Join thousands of developers building, learning, and shipping on DevOS. It's free to start.
              </p>
              <button
                onClick={openSignup}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base transition-all shadow-xl shadow-blue-600/30 hover:-translate-y-0.5"
              >
                Create your free account
                <ArrowRight className="w-5 h-5" />
              </button>
              <p className="text-white/20 text-xs mt-5">No credit card · No setup · Instant access</p>
            </div>
          </motion.div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
