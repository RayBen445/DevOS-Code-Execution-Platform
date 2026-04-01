import React from "react";
import { motion } from "framer-motion";
import { Code2, Terminal, Shield, Zap, Github, Globe, ChevronRight, Rocket, Sparkles, X, Plus, Code, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";

interface HomeProps {
  setShowLogin: (show: boolean) => void;
}

export default function Home({ setShowLogin }: HomeProps) {
  const [isQuickStarting, setIsQuickStarting] = useState(false);
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-blue-500/30">
      <Navbar onSignIn={() => setShowLogin(true)} />
      
      <main className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
              <Zap className="w-3 h-3" />
              Next-Gen IDE
            </div>
            <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
              CODE IN THE <span className="text-blue-600">CLOUD</span>.
            </h1>
            <p className="text-xl text-white/40 mb-12 max-w-lg leading-relaxed">
              A browser-based development environment with real-time collaboration, 
              sandboxed execution, and instant deployments.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowLogin(true)}
                className="px-8 py-4 bg-white text-black rounded-2xl font-black text-lg hover:bg-white/90 transition-all active:scale-95 flex items-center gap-3"
              >
                Get Started Free
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsQuickStarting(true)}
                className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all flex items-center gap-3"
              >
                <Rocket className="w-5 h-5 text-blue-500" />
                Quick Start
              </button>
              <button
                onClick={() => setShowLogin(true)}
                className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all flex items-center gap-3"
              >
                <Sparkles className="w-5 h-5 text-yellow-500" />
                Try Demo Project
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/40" />
                  <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/40" />
                </div>
                <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest ml-2">Terminal — devos-cli</div>
              </div>
              <div className="p-8 font-mono text-sm space-y-3">
                <div className="flex gap-2">
                  <span className="text-green-500">➜</span>
                  <span className="text-blue-400">~</span>
                  <span className="text-white">devos login</span>
                </div>
                <div className="text-white/40">Authenticating with GitHub... Done.</div>
                <div className="flex gap-2">
                  <span className="text-green-500">➜</span>
                  <span className="text-blue-400">~</span>
                  <span className="text-white">devos deploy --vercel</span>
                </div>
                <div className="text-white/40">Building project "cool-app"...</div>
                <div className="flex gap-2 items-center">
                  <div className="w-2 h-4 bg-blue-500 animate-pulse" />
                  <span className="text-white/60 italic">Deploying to production...</span>
                </div>
                <div className="pt-4 text-green-400">
                  ✓ Deployment successful!
                  <br />
                  <span className="text-white/40">URL: https://cool-app.devos.app</span>
                </div>
              </div>
            </div>
            
            {/* Floating badges */}
            <div className="absolute -top-6 -right-6 p-4 rounded-2xl bg-[#111] border border-white/10 shadow-xl flex items-center gap-3">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="text-sm font-bold">Sandboxed</span>
            </div>
            <div className="absolute -bottom-6 -left-6 p-4 rounded-2xl bg-[#111] border border-white/10 shadow-xl flex items-center gap-3">
              <Terminal className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-bold">Node.js Runtime</span>
            </div>
          </motion.div>
        </div>

        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Zap, title: "Instant Setup", desc: "No more 'it works on my machine'. Spin up environments in seconds." },
            { icon: Globe, title: "Deploy Anywhere", desc: "One-click deployments to Replit or Vercel-style subdomains." },
            { icon: Code2, title: "VS Code Engine", desc: "Powered by Monaco Editor for the best coding experience." }
          ].map((feature, i) => (
            <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
              <feature.icon className="w-8 h-8 text-blue-500 mb-6" />
              <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
              <p className="text-white/40 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-white/20 text-sm font-medium">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <span>© 2026 DevOS IDE</span>
        </div>
        <div className="flex items-center gap-1">
          Powered by <span className="text-white/40">Cool Shot Systems</span> & <span className="text-white/40">Tech Visionaries Network</span>
        </div>
        <div className="flex gap-6">
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
          <a href="#" className="hover:text-white transition-colors">Status</a>
        </div>
      </footer>

      <AnimatePresence>
        {isQuickStarting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                    <Rocket className="w-6 h-6 text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Quick Start Guide</h2>
                </div>
                <button onClick={() => setIsQuickStarting(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <X className="w-6 h-6 text-white/40" />
                </button>
              </div>
              
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  { icon: Plus, title: "1. Create a project", desc: "Start fresh or use a template to kick off your vision." },
                  { icon: Code, title: "2. Write your code", desc: "Use our powerful editor with real-time preview." },
                  { icon: Globe, title: "3. Click Deploy", desc: "Get a live, shareable link for your project instantly." },
                  { icon: Share2, title: "4. Share your project", desc: "Show off your work to the world with one click." }
                ].map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <step.icon className="w-6 h-6 text-white/60" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{step.title}</h3>
                      <p className="text-sm text-white/40 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-8 bg-white/5 flex justify-end">
                <button
                  onClick={() => {
                    setIsQuickStarting(false);
                    setShowLogin(true);
                  }}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                >
                  Get Started
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <Footer />
    </div>
  );
}
