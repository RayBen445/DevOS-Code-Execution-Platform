import React from "react";
import { motion } from "framer-motion";
import { Code2, Terminal, Shield, Zap, Globe, ChevronRight, Rocket, Sparkles, X, Plus, Code, Share2, Smartphone, Users, BookOpen, CloudLightning } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";

interface HomeProps {
  setShowLogin: (show: boolean) => void;
  setShowSignup?: (show: boolean) => void;
}

const VALUE_STRIP = [
  { icon: CloudLightning, label: "Never Lose Your Work" },
  { icon: BookOpen, label: "Your Portfolio Builds Itself" },
  { icon: Users, label: "Code Together Instantly" },
  { icon: Smartphone, label: "Code From Your Phone" },
  { icon: Rocket, label: "Deploy Instantly" },
  { icon: Shield, label: "Sandboxed & Secure" },
  { icon: Code2, label: "VS Code Engine" },
  { icon: Globe, label: "Deploy to the Edge" },
];

const FEATURES = [
  {
    icon: Smartphone,
    title: "Mobile-First IDE",
    desc: "Write, run, and deploy code from your phone. Full IDE experience on any screen size.",
    color: "from-blue-500/10 to-blue-600/5",
    accent: "text-blue-400",
    ring: "bg-blue-600/15",
  },
  {
    icon: Users,
    title: "Social Developer Feed",
    desc: "Follow builders, discover projects, and share deployments in a community feed.",
    color: "from-purple-500/10 to-purple-600/5",
    accent: "text-purple-400",
    ring: "bg-purple-600/15",
  },
  {
    icon: Globe,
    title: "Instant Deployments",
    desc: "One-click deployments to shareable URLs. Your projects are always live.",
    color: "from-green-500/10 to-green-600/5",
    accent: "text-green-400",
    ring: "bg-green-600/15",
  },
  {
    icon: Shield,
    title: "Sandboxed Execution",
    desc: "Every project runs in an isolated environment. Safe, fast, and reliable.",
    color: "from-yellow-500/10 to-yellow-600/5",
    accent: "text-yellow-400",
    ring: "bg-yellow-600/15",
  },
  {
    icon: Code2,
    title: "VS Code Engine",
    desc: "Monaco editor with syntax highlighting, IntelliSense, and multi-file support.",
    color: "from-cyan-500/10 to-cyan-600/5",
    accent: "text-cyan-400",
    ring: "bg-cyan-600/15",
  },
  {
    icon: CloudLightning,
    title: "Auto Portfolio",
    desc: "Your profile page builds itself as you ship. Show off your work automatically.",
    color: "from-rose-500/10 to-rose-600/5",
    accent: "text-rose-400",
    ring: "bg-rose-600/15",
  },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function Home({ setShowLogin, setShowSignup }: HomeProps) {
  const openSignup = () => (setShowSignup ?? setShowLogin)(true);
  const [isQuickStarting, setIsQuickStarting] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-blue-500/30 overflow-x-hidden">
      <Navbar onSignIn={() => setShowLogin(true)} />

      <main>
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="relative max-w-7xl mx-auto px-5 md:px-6 pt-16 md:pt-28 pb-12 md:pb-20">
          {/* Ambient gradient blobs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] -translate-x-1/2 -translate-y-1/3" />
            <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3" />
          </div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
                <Zap className="w-3 h-3" />
                Next-Gen Cloud IDE
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-6 md:mb-8">
                Build, Run, and{" "}
                <span className="gradient-text-blue">Deploy Code</span>{" "}
                — From Any Device.
              </motion.h1>
              <motion.p variants={fadeUp} className="text-lg md:text-xl text-white/40 mb-10 max-w-lg leading-relaxed">
                A social-first cloud development platform with real-time collaboration,
                sandboxed execution, and instant deployments — from mobile to desktop.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={openSignup}
                  className="w-full sm:w-auto px-7 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-blue-600/25 pulse-glow"
                >
                  Get Started Free
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsQuickStarting(true)}
                  className="w-full sm:w-auto px-7 py-4 glass border border-white/10 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                >
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  Try Demo
                </button>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-violet-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-700" />
              <div className="relative glass-dark rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/40 border border-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/40 border border-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/40 border border-green-500/50" />
                  </div>
                  <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest ml-2">Terminal — devos-cli</div>
                </div>
                <div className="p-6 md:p-8 font-mono text-sm space-y-2.5">
                  <div className="flex gap-2">
                    <span className="text-green-400">➜</span>
                    <span className="text-blue-400">~</span>
                    <span className="text-white">devos login</span>
                  </div>
                  <div className="text-white/40 pl-4">✓ Authenticated with GitHub</div>
                  <div className="flex gap-2">
                    <span className="text-green-400">➜</span>
                    <span className="text-blue-400">~</span>
                    <span className="text-white">devos deploy --prod</span>
                  </div>
                  <div className="text-white/40 pl-4">Building "my-app"...</div>
                  <div className="text-white/40 pl-4">Pushing to edge network...</div>
                  <div className="flex gap-2 items-center pl-4">
                    <div className="w-2 h-3.5 bg-blue-500 animate-pulse rounded-sm" />
                    <span className="text-white/60 italic text-xs">Deploying to production...</span>
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.4, duration: 0.6 }}
                    className="pt-3 text-green-400"
                  >
                    ✓ Deploy successful!
                    <br />
                    <span className="text-white/40 text-xs">→ https://my-app.devos.app</span>
                  </motion.div>
                </div>
              </div>

              {/* Floating badges */}
              <motion.div
                initial={{ opacity: 0, x: 12, y: -12 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="absolute -top-5 -right-5 px-3.5 py-2.5 rounded-2xl glass border border-white/10 shadow-xl flex items-center gap-2.5"
              >
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-sm font-bold">Sandboxed</span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -12, y: 12 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 1.0, duration: 0.5 }}
                className="absolute -bottom-5 -left-5 px-3.5 py-2.5 rounded-2xl glass border border-white/10 shadow-xl flex items-center gap-2.5"
              >
                <Terminal className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold">Node.js Runtime</span>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Value Strip (auto-scroll marquee) ──────────────────────────── */}
        <section className="border-y border-white/5 bg-white/[0.02] py-5 overflow-hidden">
          <div className="marquee-track">
            {[...VALUE_STRIP, ...VALUE_STRIP].map(({ icon: Icon, label }, i) => (
              <div key={i} className="flex items-center gap-2.5 flex-shrink-0 text-white/50 mx-8">
                <Icon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="text-sm font-semibold whitespace-nowrap">{label}</span>
                <span className="ml-6 text-white/10 select-none">•</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-5 md:px-6 py-16 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">Features</p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
              Everything you need to ship faster
            </h2>
            <p className="text-white/40 max-w-xl mx-auto text-lg">
              DevOS combines a powerful IDE, a social developer feed, and instant deployments in one place.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6"
          >
            {FEATURES.map((feature, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className={`group p-7 rounded-3xl bg-gradient-to-br ${feature.color} border border-white/[0.07] hover:border-white/15 card-glow cursor-default`}
              >
                <div className={`w-11 h-11 rounded-xl ${feature.ring} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110`}>
                  <feature.icon className={`w-5 h-5 ${feature.accent}`} />
                </div>
                <h3 className="text-lg font-bold mb-2.5 text-white">{feature.title}</h3>
                <p className="text-white/40 leading-relaxed text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── Social loop CTA ────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-5 md:px-6 pb-20 md:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600/15 via-violet-600/8 to-transparent border border-blue-500/20 p-10 md:p-16 text-center"
          >
            {/* Ambient blob */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-600/10 rounded-full blur-[80px]" />
            </div>

            <div className="relative">
              <div className="flex flex-wrap justify-center gap-3 mb-8 text-sm font-bold text-white/50">
                {["Discover", "Build", "Deploy", "Share", "Repeat"].map((step, i) => (
                  <React.Fragment key={step}>
                    <span className="text-white">{step}</span>
                    {i < 4 && <span className="text-blue-400">→</span>}
                  </React.Fragment>
                ))}
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
                Join the developer community
              </h2>
              <p className="text-white/40 mb-10 max-w-md mx-auto text-lg">
                Build in public, deploy instantly, and grow your portfolio — all from one platform.
              </p>
              <button
                onClick={openSignup}
                className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg transition-all active:scale-95 shadow-lg shadow-blue-600/30 inline-flex items-center gap-3"
              >
                Get Started Free
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </section>
      </main>

      <Footer />

      {/* ── Quick Start modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {isQuickStarting && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="w-full sm:max-w-2xl glass-dark border border-white/10 sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                    <Rocket className="w-6 h-6 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Quick Start Guide</h2>
                </div>
                <button onClick={() => setIsQuickStarting(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  { icon: Plus, title: "1. Create a project", desc: "Start fresh or use a template to kick off your vision." },
                  { icon: Code, title: "2. Write your code", desc: "Use our powerful editor with real-time preview." },
                  { icon: Globe, title: "3. Click Deploy", desc: "Get a live, shareable link for your project instantly." },
                  { icon: Share2, title: "4. Share your project", desc: "Show off your work to the community with one click." },
                ].map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    className="flex gap-4"
                  >
                    <div className="w-11 h-11 rounded-2xl glass border border-white/10 flex items-center justify-center flex-shrink-0">
                      <step.icon className="w-5 h-5 text-white/60" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white mb-1">{step.title}</h3>
                      <p className="text-sm text-white/40 leading-relaxed">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="p-5 bg-white/[0.03] border-t border-white/5 flex justify-end gap-3">
                <button
                  onClick={() => setIsQuickStarting(false)}
                  className="px-5 py-2.5 text-sm text-white/40 hover:text-white transition-colors font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => { setIsQuickStarting(false); openSignup(); }}
                  className="px-7 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20 text-sm"
                >
                  Get Started
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


interface HomeProps {
  setShowLogin: (show: boolean) => void;
  setShowSignup?: (show: boolean) => void;
}

const VALUE_STRIP = [
  { icon: CloudLightning, label: "Never Lose Your Work" },
  { icon: BookOpen, label: "Your Portfolio Builds Itself" },
  { icon: Users, label: "Code Together Instantly" },
  { icon: Smartphone, label: "Code From Your Phone" },
  { icon: Rocket, label: "Deploy Instantly" },
];

export default function Home({ setShowLogin, setShowSignup }: HomeProps) {
  const openSignup = () => (setShowSignup ?? setShowLogin)(true);
  const [isQuickStarting, setIsQuickStarting] = useState(false);
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-blue-500/30">
      <Navbar onSignIn={() => setShowLogin(true)} />
      
      <main>
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-5 md:px-6 pt-16 md:pt-24 pb-12 md:pb-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
                <Zap className="w-3 h-3" />
                Next-Gen Cloud IDE
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-6 md:mb-8">
                Build, Run, and{" "}
                <span className="text-blue-500">Deploy Code</span>{" "}
                — From Any Device.
              </h1>
              <p className="text-lg md:text-xl text-white/40 mb-10 max-w-lg leading-relaxed">
                A social-first cloud development platform with real-time collaboration,
                sandboxed execution, and instant deployments — from mobile to desktop.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={openSignup}
                  className="w-full sm:w-auto px-7 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-blue-600/25"
                >
                  Get Started Free
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsQuickStarting(true)}
                  className="w-full sm:w-auto px-7 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                >
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  Try Demo
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
              <div className="relative bg-[#0d0d0d] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/30 border border-red-500/40" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/30 border border-yellow-500/40" />
                    <div className="w-3 h-3 rounded-full bg-green-500/30 border border-green-500/40" />
                  </div>
                  <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest ml-2">Terminal — devos-cli</div>
                </div>
                <div className="p-6 md:p-8 font-mono text-sm space-y-2.5">
                  <div className="flex gap-2">
                    <span className="text-green-500">➜</span>
                    <span className="text-blue-400">~</span>
                    <span className="text-white">devos login</span>
                  </div>
                  <div className="text-white/40 pl-4">✓ Authenticated with GitHub</div>
                  <div className="flex gap-2">
                    <span className="text-green-500">➜</span>
                    <span className="text-blue-400">~</span>
                    <span className="text-white">devos deploy --prod</span>
                  </div>
                  <div className="text-white/40 pl-4">Building "my-app"...</div>
                  <div className="text-white/40 pl-4">Pushing to edge network...</div>
                  <div className="flex gap-2 items-center pl-4">
                    <div className="w-2 h-3.5 bg-blue-500 animate-pulse rounded-sm" />
                    <span className="text-white/60 italic text-xs">Deploying to production...</span>
                  </div>
                  <div className="pt-3 text-green-400">
                    ✓ Deploy successful!
                    <br />
                    <span className="text-white/40 text-xs">→ https://my-app.devos.app</span>
                  </div>
                </div>
              </div>
              
              <div className="absolute -top-5 -right-5 p-3.5 rounded-2xl bg-[#111] border border-white/10 shadow-xl flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-sm font-bold">Sandboxed</span>
              </div>
              <div className="absolute -bottom-5 -left-5 p-3.5 rounded-2xl bg-[#111] border border-white/10 shadow-xl flex items-center gap-2.5">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold">Node.js Runtime</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Value Strip */}
        <section className="border-y border-white/5 bg-white/[0.02] py-6 overflow-hidden">
          <div className="flex items-center gap-10 px-6 overflow-x-auto no-scrollbar">
            {VALUE_STRIP.map(({ icon: Icon, label }, i) => (
              <div key={i} className="flex items-center gap-2.5 flex-shrink-0 text-white/50">
                <Icon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="text-sm font-semibold whitespace-nowrap">{label}</span>
                {i < VALUE_STRIP.length - 1 && (
                  <span className="ml-6 text-white/10 select-none">•</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-5 md:px-6 py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
              Everything you need to ship faster
            </h2>
            <p className="text-white/40 max-w-xl mx-auto">
              DevOS combines a powerful IDE, a social developer feed, and instant deployments in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8">
            {[
              {
                icon: Smartphone,
                title: "Mobile-First IDE",
                desc: "Write, run, and deploy code from your phone. Full IDE experience on any screen size.",
              },
              {
                icon: Users,
                title: "Social Developer Feed",
                desc: "Follow builders, discover projects, and share deployments in a community feed.",
              },
              {
                icon: Globe,
                title: "Instant Deployments",
                desc: "One-click deployments to shareable URLs. Your projects are always live.",
              },
              {
                icon: Shield,
                title: "Sandboxed Execution",
                desc: "Every project runs in an isolated environment. Safe, fast, and reliable.",
              },
              {
                icon: Code2,
                title: "VS Code Engine",
                desc: "Monaco editor with syntax highlighting, IntelliSense, and multi-file support.",
              },
              {
                icon: CloudLightning,
                title: "Auto Portfolio",
                desc: "Your profile page builds itself as you ship. Show off your work automatically.",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="p-6 md:p-8 rounded-3xl bg-white/[0.03] border border-white/[0.07] hover:border-white/15 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600/15 flex items-center justify-center mb-5">
                  <feature.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-white/40 leading-relaxed text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Social loop CTA */}
        <section className="max-w-7xl mx-auto px-5 md:px-6 pb-16 md:pb-24">
          <div className="rounded-3xl bg-blue-600/10 border border-blue-500/20 p-8 md:p-12 text-center">
            <div className="flex flex-wrap justify-center gap-2 mb-8 text-sm font-bold text-white/50">
              {["Discover", "Build", "Deploy", "Share", "Repeat"].map((step, i) => (
                <React.Fragment key={step}>
                  <span className="text-white">{step}</span>
                  {i < 4 && <span className="text-blue-500">→</span>}
                </React.Fragment>
              ))}
            </div>
            <h2 className="text-2xl md:text-4xl font-black text-white mb-4 tracking-tight">
              Join the developer community
            </h2>
            <p className="text-white/40 mb-8 max-w-md mx-auto">
              Build in public, deploy instantly, and grow your portfolio — all from one platform.
            </p>
            <button
              onClick={openSignup}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg transition-all active:scale-95 shadow-lg shadow-blue-600/25 inline-flex items-center gap-3"
            >
              Get Started Free
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </section>
      </main>

      <Footer />

      <AnimatePresence>
        {isQuickStarting && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full sm:max-w-2xl bg-[#0f0f0f] border border-white/10 sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                    <Rocket className="w-6 h-6 text-blue-500" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Quick Start Guide</h2>
                </div>
                <button onClick={() => setIsQuickStarting(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <X className="w-6 h-6 text-white/40" />
                </button>
              </div>
              
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { icon: Plus, title: "1. Create a project", desc: "Start fresh or use a template to kick off your vision." },
                  { icon: Code, title: "2. Write your code", desc: "Use our powerful editor with real-time preview." },
                  { icon: Globe, title: "3. Click Deploy", desc: "Get a live, shareable link for your project instantly." },
                  { icon: Share2, title: "4. Share your project", desc: "Show off your work to the community with one click." }
                ].map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <step.icon className="w-5 h-5 text-white/60" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white mb-1">{step.title}</h3>
                      <p className="text-sm text-white/40 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-white/5 flex justify-end gap-3">
                <button
                  onClick={() => setIsQuickStarting(false)}
                  className="px-5 py-2.5 text-sm text-white/40 hover:text-white transition-colors font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setIsQuickStarting(false);
                    openSignup();
                  }}
                  className="px-7 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20 text-sm"
                >
                  Get Started
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

