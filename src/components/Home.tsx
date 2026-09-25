import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Users, Cloud, Rocket, Code2, Globe, ArrowRight, Check,
  Terminal, Shield, ChevronRight, Search, Building2, Database,
  Settings, Folder, FolderCode, FileCode, Play, Copy, Split,
  Sliders, Calendar, FileText, CheckSquare, Layers, Bot, Sparkles,
  Laptop, Activity, HardDrive, Lock, Server, Wifi, Share2,
  Twitter, Linkedin, Youtube, Github, ExternalLink, Bell,
  MoreVertical, MoreHorizontal, CheckCircle2, ChevronDown, Flame
} from "lucide-react";
import { useSEO } from "../hooks/useSEO";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";

interface HomeProps {
  setShowLogin: (show: boolean) => void;
  setShowSignup?: (show: boolean) => void;
}

// Kontyra Infinity Loop SVG
function KontyraLogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="kontyra-grad-left" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="kontyra-grad-right" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <path
        d="M12 11C8.134 11 5 14.134 5 18C5 21.866 8.134 25 12 25C15.866 25 18 20.8 18 18C18 15.2 20.134 11 24 11C27.866 11 31 14.134 31 18C31 21.866 27.866 25 24 25"
        stroke="url(#kontyra-grad-right)"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        d="M24 25C27.866 25 31 21.866 31 18C31 14.134 27.866 11 24 11C20.134 11 18 15.2 18 18C18 20.8 15.866 25 12 25C8.134 25 5 21.866 5 18C5 14.134 8.134 11 12 11"
        stroke="url(#kontyra-grad-left)"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

// DevOS Badge Icon
function DevosLogoBadge({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <div className={cn("rounded-xl bg-blue-600 flex items-center justify-center font-mono font-bold text-white text-xs sm:text-sm shadow-md shadow-blue-600/30", className)}>
      &lt;/&gt;
    </div>
  );
}

export default function Home({ setShowLogin, setShowSignup }: HomeProps) {
  useSEO({
    title: "DevOS — Build. Ship. Evolve.",
    description: "DevOS gives you the tools, infrastructure and workflow to turn your ideas into real products — all in one place.",
  });

  const openSignup = () => (setShowSignup ?? setShowLogin)(true);
  const openLogin = () => setShowLogin(true);

  // Interactive IDE editor tab state
  const [activeEditorTab, setActiveEditorTab] = useState<"page.tsx" | "package.json">("page.tsx");
  const [activeEcoItem, setActiveEcoItem] = useState<string>("Docs");

  // Code snippets for the editor mockup
  const pageCode = `import { Hero } from "@/components/hero";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
    </main>
  );
}`;

  const packageCode = `{
  "name": "kontyra-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next": "^15.0.0"
  }
}`;

  // Deployment logs data
  const deploymentLogs = [
    { text: "Cloning repository...", time: "2s", done: true },
    { text: "Installing dependencies...", time: "12s", done: true },
    { text: "Building project...", time: "28s", done: true },
    { text: "Running tests...", time: "8s", done: true },
    { text: "Deploying to production...", time: "15s", done: true },
    { text: "Deployment successful! 🚀", time: "3s", done: true, highlight: true },
  ];

  // Feature cards data
  const featureCards = [
    {
      title: "Projects",
      desc: "Create and manage all your projects in one place.",
      icon: Code2,
      iconColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Development",
      desc: "A smooth development environment for modern workflows.",
      icon: Terminal,
      iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Deployments",
      desc: "Deploy to production with simple, reliable workflows.",
      icon: Cloud,
      iconColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: "Databases",
      desc: "Manage databases, run queries and monitor performance.",
      icon: Database,
      iconColor: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    },
    {
      title: "Domains",
      desc: "Connect and manage your domains.",
      icon: Globe,
      iconColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    },
    {
      title: "Settings",
      desc: "Customize your environment to fit your workflow.",
      icon: Settings,
      iconColor: "text-slate-300 bg-white/5 border-white/10",
    },
  ];

  // Ecosystem apps list
  const ecosystemApps = [
    { name: "Docs", icon: FileText, color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30", glow: "hover:shadow-emerald-500/30" },
    { name: "Tasks", icon: CheckSquare, color: "text-amber-400 bg-amber-500/15 border-amber-500/30", glow: "hover:shadow-amber-500/30" },
    { name: "Calendar", icon: Calendar, color: "text-blue-400 bg-blue-500/15 border-blue-500/30", glow: "hover:shadow-blue-500/30" },
    { name: "Forms", icon: Sliders, color: "text-purple-400 bg-purple-500/15 border-purple-500/30", glow: "hover:shadow-purple-500/30" },
    { name: "Hearth", icon: Users, color: "text-orange-400 bg-orange-500/15 border-orange-500/30", glow: "hover:shadow-orange-500/30" },
    { name: "VUX", icon: Layers, color: "text-pink-400 bg-pink-500/15 border-pink-500/30", glow: "hover:shadow-pink-500/30" },
    { name: "KORA", icon: Bot, color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30", glow: "hover:shadow-cyan-500/30" },
  ];

  return (
    <div className="min-h-screen bg-[#06070a] text-white selection:bg-blue-600/30 overflow-x-hidden font-sans">
      {/* ── 1. GLOBAL KONTYRA HEADER ── */}
      <header className="w-full bg-[#050608] border-b border-white/[0.06] text-xs text-white/70 relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-6 sm:gap-8">
            <Link to="/" className="flex items-center gap-2 text-white font-bold text-sm tracking-tight hover:opacity-90 transition-opacity">
              <KontyraLogo className="w-5 h-5" />
              <span className="font-extrabold tracking-tight text-white text-base">Kontyra</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-white/60">
              <a href="#products" className="hover:text-white transition-colors">Products</a>
              <a href="#developers" className="hover:text-white transition-colors">Developers</a>
              <a href="#blog" className="hover:text-white transition-colors">Blog</a>
              <a href="#company" className="hover:text-white transition-colors">Company</a>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={openLogin}
              className="p-1.5 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            <button 
              onClick={openSignup}
              className="hidden sm:flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-semibold group transition-colors"
            >
              Explore Kontyra
              <ArrowRight className="w-3.5 h-3.5 text-white/50 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. DEVOS SUB-NAV (STICKY) ── */}
      <nav className="sticky top-0 z-40 bg-[#06070a]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <DevosLogoBadge className="w-7 h-7 group-hover:scale-105 transition-transform" />
              <span className="font-extrabold text-white text-lg tracking-tight">DevOS</span>
            </Link>

            <div className="hidden sm:flex items-center gap-6 text-sm font-medium">
              <a href="#overview" className="text-white relative py-1 after:absolute after:bottom-[-18px] after:left-0 after:right-0 after:h-[2px] after:bg-blue-500 after:rounded-full">
                Overview
              </a>
              <a href="#features" className="text-white/60 hover:text-white transition-colors">
                Features
              </a>
              <a href="#integrations" className="text-white/60 hover:text-white transition-colors">
                Integrations
              </a>
              <Link to="/docs" className="text-white/60 hover:text-white transition-colors">
                Documentation
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openSignup}
              className="px-5 py-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              Explore DevOS
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── 3. HERO SECTION ── */}
      <section id="overview" className="relative pt-12 sm:pt-20 pb-20 sm:pb-32 overflow-hidden">
        {/* Luminous background lightwaves */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-gradient-to-br from-blue-600/20 via-purple-600/15 to-transparent rounded-full blur-[140px]" />
          <div className="absolute top-[20%] left-[-15%] w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[160px]" />
          {/* Subtle curved glow ray */}
          <div className="absolute top-1/3 right-1/4 w-[1000px] h-[300px] bg-gradient-to-r from-transparent via-blue-500/10 to-indigo-500/15 rotate-[-25deg] blur-[90px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Headline & Value Prop */}
            <div className="lg:col-span-6 flex flex-col items-start text-left">
              <div className="inline-flex items-center gap-2 mb-6">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.25em] text-sky-400">
                  A MODERN DEVELOPMENT ENVIRONMENT
                </span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.02] mb-6">
                Build. Ship.<br />
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-fuchsia-500 bg-clip-text text-transparent">
                  Evolve.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-white/60 leading-relaxed mb-8 max-w-xl">
                DevOS gives you the tools, infrastructure and workflow to turn your ideas into real products — all in one place.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 mb-12">
                <button
                  onClick={openSignup}
                  className="px-7 py-3.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm flex items-center gap-2 shadow-xl shadow-blue-600/25 active:scale-95 transition-all"
                >
                  Explore DevOS
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={openLogin}
                  className="px-7 py-3.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-white font-bold text-sm active:scale-95 transition-all"
                >
                  View live demo
                </button>
              </div>

              {/* 3 Pillars / Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full pt-8 border-t border-white/[0.06]">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">All-in-one</h3>
                    <p className="text-[11px] text-white/40 mt-0.5">Build, deploy and manage.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Built for teams</h3>
                    <p className="text-[11px] text-white/40 mt-0.5">Collaborate seamlessly.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Modern infrastructure</h3>
                    <p className="text-[11px] text-white/40 mt-0.5">Fast, reliable and scalable.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: 3D Tilted Dashboard Mockup */}
            <div className="lg:col-span-6 relative flex justify-center">
              <div className="w-full max-w-xl relative group">
                {/* Glow behind device */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 transition-opacity" />

                {/* Tablet Frame */}
                <div className="relative rounded-3xl bg-[#090a10] border border-white/10 shadow-2xl overflow-hidden backdrop-blur-2xl">
                  
                  {/* Dashboard Layout: Sidebar + Main Content */}
                  <div className="flex h-[420px] sm:h-[460px] text-left select-none">
                    
                    {/* Left Sidebar */}
                    <div className="w-36 sm:w-44 border-r border-white/5 bg-black/40 p-3 sm:p-4 flex flex-col justify-between shrink-0">
                      <div>
                        {/* DevOS Brand in Dashboard */}
                        <div className="flex items-center gap-2 mb-6 px-1">
                          <DevosLogoBadge className="w-5 h-5 rounded-md text-[10px]" />
                          <span className="font-bold text-white text-xs">DevOS</span>
                        </div>

                        {/* Navigation items */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-600/15 text-blue-400 text-xs font-semibold border border-blue-500/20">
                            <FolderCode className="w-3.5 h-3.5" />
                            <span>Projects</span>
                          </div>
                          {[
                            { name: "Development", icon: Terminal },
                            { name: "Deployments", icon: Cloud },
                            { name: "Databases", icon: Database },
                            { name: "Domains", icon: Globe },
                            { name: "APIs", icon: Activity },
                            { name: "Storage", icon: HardDrive },
                            { name: "Settings", icon: Settings },
                          ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 text-xs transition-colors cursor-pointer">
                              <item.icon className="w-3.5 h-3.5" />
                              <span>{item.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Main Workspace Area */}
                    <div className="flex-1 bg-[#0b0c14]/80 p-4 sm:p-5 flex flex-col justify-between overflow-hidden">
                      
                      {/* Top Header inside Mockup */}
                      <div>
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
                          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 w-44 sm:w-56 text-[11px] text-white/30">
                            <Search className="w-3 h-3" />
                            <span>Search projects...</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <div className="relative text-white/40 hover:text-white">
                              <Bell className="w-3.5 h-3.5" />
                              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                            </div>
                            <div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-[10px] font-bold text-blue-300">
                              T
                            </div>
                          </div>
                        </div>

                        {/* Greeting banner */}
                        <div className="mb-4">
                          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                            Good morning, Builder ☀️
                          </h2>
                          <p className="text-[11px] text-white/40">Let's build something amazing today.</p>
                        </div>

                        {/* 4 Action Cards */}
                        <div className="grid grid-cols-4 gap-2 mb-4">
                          <div onClick={openSignup} className="cursor-pointer p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-blue-500/30 transition-all text-center">
                            <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto mb-1.5">
                              <Folder className="w-3.5 h-3.5" />
                            </div>
                            <p className="text-[10px] font-bold text-white truncate">New Project</p>
                            <p className="text-[8px] text-white/40 truncate">Start building</p>
                          </div>

                          <div onClick={openSignup} className="cursor-pointer p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-blue-500/30 transition-all text-center">
                            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto mb-1.5">
                              <Rocket className="w-3.5 h-3.5" />
                            </div>
                            <p className="text-[10px] font-bold text-white truncate">Deploy</p>
                            <p className="text-[8px] text-white/40 truncate">Push to prod</p>
                          </div>

                          <div onClick={openSignup} className="cursor-pointer p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-blue-500/30 transition-all text-center">
                            <div className="w-7 h-7 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center mx-auto mb-1.5">
                              <Database className="w-3.5 h-3.5" />
                            </div>
                            <p className="text-[10px] font-bold text-white truncate">Database</p>
                            <p className="text-[8px] text-white/40 truncate">Manage data</p>
                          </div>

                          <div onClick={openSignup} className="cursor-pointer p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-blue-500/30 transition-all text-center">
                            <div className="w-7 h-7 rounded-lg bg-sky-600/20 text-sky-400 flex items-center justify-center mx-auto mb-1.5">
                              <Globe className="w-3.5 h-3.5" />
                            </div>
                            <p className="text-[10px] font-bold text-white truncate">Domain</p>
                            <p className="text-[8px] text-white/40 truncate">Connect domain</p>
                          </div>
                        </div>

                        {/* Recent Projects Section */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-white/80">Recent Projects</span>
                            <span onClick={openSignup} className="text-[10px] text-blue-400 hover:underline cursor-pointer flex items-center gap-0.5">
                              View all <ArrowRight className="w-2.5 h-2.5" />
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                              <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                                  K
                                </div>
                                <div>
                                  <p className="text-[11px] font-bold text-white">kontyra-web</p>
                                  <p className="text-[9px] text-white/40">Production · Deployed 2h ago</p>
                                </div>
                              </div>
                              <MoreHorizontal className="w-3.5 h-3.5 text-white/30" />
                            </div>

                            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                              <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-md bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-bold">
                                  H
                                </div>
                                <div>
                                  <p className="text-[11px] font-bold text-white">hearth-api</p>
                                  <p className="text-[9px] text-white/40">Development · Updated 1d ago</p>
                                </div>
                              </div>
                              <MoreHorizontal className="w-3.5 h-3.5 text-white/30" />
                            </div>

                            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                              <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">
                                  V
                                </div>
                                <div>
                                  <p className="text-[11px] font-bold text-white">vux-events</p>
                                  <p className="text-[9px] text-blue-400 animate-pulse">Staging · Deploying...</p>
                                </div>
                              </div>
                              <MoreHorizontal className="w-3.5 h-3.5 text-white/30" />
                            </div>
                          </div>
                        </div>

                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 4. SECTION 2: BUILD WITHOUT LIMITS & IDE MOCKUP ── */}
      <section id="features" className="py-20 sm:py-28 relative border-t border-white/[0.06] bg-[#07080d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          {/* Top Row: Description + IDE Mockup */}
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center mb-16">
            
            {/* Left Column: Heading */}
            <div className="lg:col-span-5 text-left">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400 mb-4 block">
                BUILD WITHOUT LIMITS
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.1] mb-5">
                A complete environment for modern builders.
              </h2>
              <p className="text-sm sm:text-base text-white/60 leading-relaxed mb-8">
                From code to cloud, DevOS brings everything you need to develop, test, deploy and scale — without the complexity.
              </p>
              <button 
                onClick={openSignup}
                className="px-6 py-3 rounded-full border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white font-bold text-xs sm:text-sm flex items-center gap-2 active:scale-95 transition-all"
              >
                Explore all features
                <ArrowRight className="w-4 h-4 text-cyan-400" />
              </button>
            </div>

            {/* Right Column: Code Editor Mockup */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl sm:rounded-3xl bg-[#090b12] border border-white/10 shadow-2xl overflow-hidden text-left">
                {/* Editor Header Bar */}
                <div className="bg-[#0e101a] px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                      <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                      <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 text-xs text-white/80 font-mono">
                      <Folder className="w-3.5 h-3.5 text-blue-400" />
                      <span>web-app</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="p-1 text-white/40 hover:text-white">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1 text-white/40 hover:text-white">
                      <Split className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={openSignup}
                      className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                    >
                      <Rocket className="w-3 h-3" />
                      Deploy
                    </button>
                  </div>
                </div>

                {/* Editor Body */}
                <div className="flex h-72 sm:h-80 font-mono text-xs">
                  {/* File tree sidebar */}
                  <div className="w-36 sm:w-44 border-r border-white/5 bg-[#090a10] p-3 overflow-y-auto hidden sm:block shrink-0 select-none text-white/50 text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 text-white/80 font-bold">
                      <ChevronDown className="w-3 h-3" />
                      <span>web-app</span>
                    </div>
                    <div className="pl-3 space-y-1">
                      <div className="flex items-center gap-1.5 hover:text-white cursor-pointer"><Folder className="w-3 h-3 text-blue-400" /> app</div>
                      <div className="flex items-center gap-1.5 hover:text-white cursor-pointer"><Folder className="w-3 h-3 text-purple-400" /> components</div>
                      <div className="flex items-center gap-1.5 hover:text-white cursor-pointer"><Folder className="w-3 h-3 text-yellow-400" /> lib</div>
                      <div className="flex items-center gap-1.5 hover:text-white cursor-pointer"><Folder className="w-3 h-3 text-sky-400" /> public</div>
                      <div className="flex items-center gap-1.5 hover:text-white cursor-pointer"><Folder className="w-3 h-3 text-pink-400" /> styles</div>
                      <div className="flex items-center gap-1.5 hover:text-white cursor-pointer"><FileCode className="w-3 h-3 text-green-400" /> .env</div>
                      <div className="flex items-center gap-1.5 hover:text-white cursor-pointer"><FileCode className="w-3 h-3 text-amber-400" /> package.json</div>
                      <div className="flex items-center gap-1.5 hover:text-white cursor-pointer"><FileCode className="w-3 h-3 text-blue-400" /> next.config.js</div>
                      <div className="flex items-center gap-1.5 hover:text-white cursor-pointer"><FileText className="w-3 h-3 text-white/40" /> README.md</div>
                    </div>
                  </div>

                  {/* Main code editor */}
                  <div className="flex-1 bg-[#06070d] flex flex-col justify-between overflow-hidden">
                    {/* Tab header */}
                    <div className="flex items-center border-b border-white/5 bg-[#080a12] px-2 text-xs">
                      <button
                        onClick={() => setActiveEditorTab("page.tsx")}
                        className={cn(
                          "px-4 py-2 border-b-2 font-medium flex items-center gap-1.5 transition-colors",
                          activeEditorTab === "page.tsx"
                            ? "border-blue-500 text-white bg-white/[0.02]"
                            : "border-transparent text-white/40 hover:text-white"
                        )}
                      >
                        <FileCode className="w-3.5 h-3.5 text-blue-400" />
                        <span>page.tsx</span>
                      </button>
                      <button
                        onClick={() => setActiveEditorTab("package.json")}
                        className={cn(
                          "px-4 py-2 border-b-2 font-medium flex items-center gap-1.5 transition-colors",
                          activeEditorTab === "package.json"
                            ? "border-blue-500 text-white bg-white/[0.02]"
                            : "border-transparent text-white/40 hover:text-white"
                        )}
                      >
                        <FileCode className="w-3.5 h-3.5 text-amber-400" />
                        <span>package.json</span>
                      </button>
                    </div>

                    {/* Code Display */}
                    <div className="flex-1 p-4 overflow-y-auto leading-relaxed text-xs sm:text-sm">
                      <pre className="text-white/80">
                        {activeEditorTab === "page.tsx" ? (
                          <code>
                            <span className="text-purple-400">import</span> &#123; <span className="text-blue-300">Hero</span> &#125; <span className="text-purple-400">from</span> <span className="text-emerald-300">"@/components/hero"</span>;<br /><br />
                            <span className="text-purple-400">export default function</span> <span className="text-yellow-300">Home</span>() &#123;<br />
                            &nbsp;&nbsp;<span className="text-purple-400">return</span> (<br />
                            &nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-blue-400">main</span> <span className="text-sky-300">className</span>=<span className="text-emerald-300">"min-h-screen"</span>&gt;<br />
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="text-yellow-200">Hero</span> /&gt;<br />
                            &nbsp;&nbsp;&nbsp;&nbsp;&lt;/<span className="text-blue-400">main</span>&gt;<br />
                            &nbsp;&nbsp;);<br />
                            &#125;
                          </code>
                        ) : (
                          <code className="text-white/70">
                            {packageCode}
                          </code>
                        )}
                      </pre>
                    </div>

                    {/* Editor Status Bar */}
                    <div className="bg-[#0b0c16] px-4 py-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-white/60"><FolderCode className="w-3 h-3 text-blue-400" /> main</span>
                        <span>0 errors</span>
                        <span>0 warnings</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span>TypeScript</span>
                        <span>LF</span>
                        <span>UTF-8</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Grid: 6 Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {featureCards.map((feat, idx) => (
              <div
                key={idx}
                onClick={openSignup}
                className="group cursor-pointer p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.04] transition-all flex flex-col justify-between text-left"
              >
                <div>
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border transition-transform group-hover:scale-105", feat.iconColor)}>
                    <feat.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                  <p className="text-xs sm:text-sm text-white/50 leading-relaxed mb-4">{feat.desc}</p>
                </div>
                <div className="flex items-center justify-end">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white group-hover:bg-white/10 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 5. SECTION 3: DEPLOY FASTER (FROM LOCAL TO GLOBAL) ── */}
      <section className="py-20 sm:py-28 relative border-t border-white/[0.06] bg-[#05060a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Heading */}
            <div className="lg:col-span-5 text-left">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400 mb-4 block">
                DEPLOY FASTER
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.1] mb-5">
                From local to global.
              </h2>
              <p className="text-sm sm:text-base text-white/60 leading-relaxed mb-8">
                Push your code, deploy to production and make your ideas live in minutes. DevOS handles the infrastructure, so you can focus on building.
              </p>
              <button 
                onClick={openSignup}
                className="px-6 py-3 rounded-full border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white font-bold text-xs sm:text-sm flex items-center gap-2 active:scale-95 transition-all"
              >
                See deployment flow
                <ArrowRight className="w-4 h-4 text-cyan-400" />
              </button>
            </div>

            {/* Right Column: Deployment Stepper & Terminal Box */}
            <div className="lg:col-span-7 space-y-6">
              {/* Stepper Pipeline */}
              <div className="grid grid-cols-4 gap-2 sm:gap-4 relative text-center">
                {[
                  { step: "1", title: "Push code", desc: "Connect your repository.", icon: Github, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
                  { step: "2", title: "Build", desc: "Dependencies & build.", icon: Settings, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
                  { step: "3", title: "Deploy", desc: "Automatic deployment.", icon: Cloud, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
                  { step: "4", title: "Live", desc: "Your app is live.", icon: Rocket, color: "text-pink-400 bg-pink-500/10 border-pink-500/20" },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-2.5 border shadow-lg", item.color)}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-white mb-0.5">{item.title}</p>
                    <p className="text-[10px] sm:text-xs text-white/40 leading-tight hidden sm:block">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Deployment Logs Terminal Card */}
              <div className="rounded-2xl sm:rounded-3xl bg-[#090b14] border border-white/10 p-5 sm:p-6 shadow-2xl text-left font-mono text-xs">
                <div className="space-y-3">
                  {deploymentLogs.map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className={cn(log.highlight ? "text-emerald-300 font-bold" : "text-white/80")}>
                          {log.text}
                        </span>
                      </div>
                      <span className="text-[11px] text-white/30 shrink-0">{log.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 6. SECTION 4: BUILT FOR THE WORLD (GLOBAL AND RELIABLE) ── */}
      <section className="py-20 sm:py-28 relative border-t border-white/[0.06] bg-[#06070c] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Stylized Dotted World Map */}
            <div className="lg:col-span-7 relative flex justify-center">
              <div className="w-full max-w-2xl relative">
                {/* World map SVG with locations */}
                <svg viewBox="0 0 900 450" className="w-full h-auto text-blue-500/20 fill-current opacity-80" xmlns="http://www.w3.org/2000/svg">
                  {/* Subtle Grid Dots Map Representation */}
                  <g fill="currentColor" opacity="0.3">
                    {/* Continents dots matrix silhouette */}
                    <circle cx="210" cy="120" r="3" /><circle cx="230" cy="130" r="3" /><circle cx="250" cy="140" r="3" />
                    <circle cx="220" cy="150" r="3" /><circle cx="240" cy="160" r="3" /><circle cx="200" cy="140" r="3" />
                    <circle cx="180" cy="120" r="3" /><circle cx="270" cy="150" r="3" /><circle cx="260" cy="180" r="3" />
                    <circle cx="280" cy="240" r="3" /><circle cx="300" cy="270" r="3" /><circle cx="320" cy="300" r="3" />
                    <circle cx="420" cy="90" r="3" /><circle cx="430" cy="105" r="3" /><circle cx="450" cy="115" r="3" />
                    <circle cx="460" cy="130" r="3" /><circle cx="470" cy="150" r="3" /><circle cx="460" cy="195" r="3" />
                    <circle cx="480" cy="220" r="3" /><circle cx="490" cy="250" r="3" /><circle cx="510" cy="280" r="3" />
                    <circle cx="600" cy="120" r="3" /><circle cx="630" cy="140" r="3" /><circle cx="670" cy="160" r="3" />
                    <circle cx="700" cy="180" r="3" /><circle cx="740" cy="205" r="3" /><circle cx="780" cy="240" r="3" />
                    <circle cx="800" cy="320" r="3" /><circle cx="820" cy="340" r="3" />
                  </g>

                  {/* Arcs between data centers */}
                  <path
                    d="M 230 130 Q 330 60 430 105"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    opacity="0.6"
                  />
                  <path
                    d="M 430 105 Q 445 150 460 195"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    opacity="0.6"
                  />
                  <path
                    d="M 460 195 Q 600 230 740 205"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    opacity="0.6"
                  />

                  {/* Ping Beacons */}
                  {/* New York */}
                  <circle cx="230" cy="130" r="8" fill="#3b82f6" opacity="0.3" className="animate-ping" />
                  <circle cx="230" cy="130" r="4" fill="#60a5fa" />
                  
                  {/* London */}
                  <circle cx="430" cy="105" r="8" fill="#8b5cf6" opacity="0.3" className="animate-ping" />
                  <circle cx="430" cy="105" r="4" fill="#a78bfa" />
                  
                  {/* Lagos */}
                  <circle cx="460" cy="195" r="8" fill="#ec4899" opacity="0.3" className="animate-ping" />
                  <circle cx="460" cy="195" r="4" fill="#f472b6" />
                  
                  {/* Singapore */}
                  <circle cx="740" cy="205" r="8" fill="#06b6d4" opacity="0.3" className="animate-ping" />
                  <circle cx="740" cy="205" r="4" fill="#22d3ee" />
                </svg>

                {/* Floating Ping Badges */}
                <div className="absolute top-[22%] left-[20%] -translate-x-1/2 p-2 rounded-xl bg-black/80 border border-blue-500/30 backdrop-blur-md shadow-xl text-left">
                  <p className="text-[10px] font-bold text-white">New York</p>
                  <p className="text-[9px] text-blue-400 font-mono">45ms</p>
                </div>

                <div className="absolute top-[16%] left-[48%] -translate-x-1/2 p-2 rounded-xl bg-black/80 border border-purple-500/30 backdrop-blur-md shadow-xl text-left">
                  <p className="text-[10px] font-bold text-white">London</p>
                  <p className="text-[9px] text-purple-400 font-mono">38ms</p>
                </div>

                <div className="absolute top-[42%] left-[51%] -translate-x-1/2 p-2 rounded-xl bg-black/80 border border-pink-500/30 backdrop-blur-md shadow-xl text-left">
                  <p className="text-[10px] font-bold text-white">Lagos</p>
                  <p className="text-[9px] text-pink-400 font-mono">22ms</p>
                </div>

                <div className="absolute top-[46%] left-[82%] -translate-x-1/2 p-2 rounded-xl bg-black/80 border border-cyan-500/30 backdrop-blur-md shadow-xl text-left">
                  <p className="text-[10px] font-bold text-white">Singapore</p>
                  <p className="text-[9px] text-cyan-400 font-mono">120ms</p>
                </div>
              </div>
            </div>

            {/* Right Column: Copy & Reliability Highlights */}
            <div className="lg:col-span-5 text-left">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400 mb-4 block">
                BUILT FOR THE WORLD
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.1] mb-5">
                Global and reliable.
              </h2>
              <p className="text-sm sm:text-base text-white/60 leading-relaxed mb-8">
                Your projects run on a global infrastructure with high availability, automatic scaling and edge performance.
              </p>

              {/* 2x2 Feature points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <Globe className="w-5 h-5 text-blue-400 shrink-0" />
                  <span className="text-xs font-bold text-white">Global deployment regions</span>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <Zap className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span className="text-xs font-bold text-white">Automatic scaling</span>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-white">99.99% uptime</span>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <Activity className="w-5 h-5 text-purple-400 shrink-0" />
                  <span className="text-xs font-bold text-white">Built-in monitoring</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 7. SECTION 5: PART OF A BIGGER ECOSYSTEM (KONTYRA) ── */}
      <section id="integrations" className="py-20 sm:py-28 relative border-t border-white/[0.06] bg-[#07070d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Heading */}
            <div className="lg:col-span-5 text-left">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400 mb-4 block">
                PART OF A BIGGER ECOSYSTEM
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.1] mb-5">
                Works seamlessly with Kontyra.
              </h2>
              <p className="text-sm sm:text-base text-white/60 leading-relaxed mb-8">
                DevOS integrates with other Kontyra products giving you a unified experience for development, productivity, events and more.
              </p>
              <button 
                onClick={openSignup}
                className="px-6 py-3 rounded-full border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white font-bold text-xs sm:text-sm flex items-center gap-2 active:scale-95 transition-all"
              >
                Explore the ecosystem
                <ArrowRight className="w-4 h-4 text-cyan-400" />
              </button>
            </div>

            {/* Right Column: Orbit Constellation */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center relative py-6">
              
              {/* App Tiles Curved Orbit */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-xl mb-10 relative z-10">
                {ecosystemApps.map((app, i) => (
                  <div
                    key={i}
                    onMouseEnter={() => setActiveEcoItem(app.name)}
                    className={cn(
                      "cursor-pointer p-3 sm:p-4 rounded-2xl border transition-all flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 shadow-lg",
                      app.color,
                      app.glow,
                      activeEcoItem === app.name ? "scale-110 ring-2 ring-white/30" : "opacity-80 hover:opacity-100"
                    )}
                  >
                    <app.icon className="w-5 h-5 sm:w-6 sm:h-6 mb-1" />
                    <span className="text-[10px] sm:text-xs font-bold">{app.name}</span>
                  </div>
                ))}
              </div>

              {/* Glowing Kontyra Infinity Core Anchor */}
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 border border-white/20 flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.4)] backdrop-blur-xl">
                  <KontyraLogo className="w-8 h-8" />
                </div>
                <div className="h-6 w-[2px] bg-gradient-to-b from-purple-500/40 to-transparent" />
                <span className="text-xs font-extrabold uppercase tracking-widest text-white/50 mt-1">KONTYRA CORE</span>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ── 8. SECTION 6: READY TO BUILD? PRE-FOOTER CTA ── */}
      <section className="py-16 sm:py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-3xl p-8 sm:p-12 md:p-16 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 border border-white/20 shadow-2xl overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 text-left">
            {/* Ambient wave glow */}
            <div className="pointer-events-none absolute -right-20 -bottom-20 w-96 h-96 bg-cyan-400/20 rounded-full blur-[100px]" />
            <div className="pointer-events-none absolute -left-20 -top-20 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-[100px]" />

            <div className="relative z-10 max-w-xl">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-blue-200 mb-2 block">
                READY TO BUILD?
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-3">
                Start building with DevOS.
              </h2>
              <p className="text-white/80 text-sm sm:text-base leading-relaxed">
                Join builders, teams and creators using DevOS to turn ideas into real products.
              </p>
            </div>

            <div className="relative z-10 shrink-0">
              <button
                onClick={openSignup}
                className="px-8 py-4 rounded-full bg-white hover:bg-white/90 text-black font-extrabold text-sm sm:text-base flex items-center gap-2 shadow-2xl hover:scale-105 active:scale-95 transition-all"
              >
                Explore DevOS
                <ArrowRight className="w-4 h-4 text-black" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. SECTION 7: FOOTER ── */}
      <footer className="pt-16 pb-12 border-t border-white/[0.06] bg-[#050609] text-left text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-16">
            {/* Brand column */}
            <div className="col-span-2 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <KontyraLogo className="w-6 h-6" />
                <span className="font-black text-white text-base tracking-tight">Kontyra</span>
              </div>
              <p className="text-white/40 text-xs leading-relaxed max-w-xs">
                Building products for how people work, create, connect and build.
              </p>
            </div>

            {/* Products */}
            <div className="flex flex-col gap-2.5">
              <p className="font-bold text-white mb-1">Products</p>
              <Link to="/" className="text-white/50 hover:text-white transition-colors">DevOS</Link>
              <a href="#hearth" className="text-white/50 hover:text-white transition-colors">Hearth</a>
              <a href="#vux" className="text-white/50 hover:text-white transition-colors">VUX</a>
              <a href="#docs" className="text-white/50 hover:text-white transition-colors">Docs</a>
              <a href="#tasks" className="text-white/50 hover:text-white transition-colors">Tasks</a>
              <a href="#calendar" className="text-white/50 hover:text-white transition-colors">Calendar</a>
              <a href="#forms" className="text-white/50 hover:text-white transition-colors">Forms</a>
              <a href="#kora" className="text-white/50 hover:text-white transition-colors">KORA</a>
            </div>

            {/* Company */}
            <div className="flex flex-col gap-2.5">
              <p className="font-bold text-white mb-1">Company</p>
              <Link to="/about" className="text-white/50 hover:text-white transition-colors">About</Link>
              <a href="#careers" className="text-white/50 hover:text-white transition-colors">Careers</a>
              <a href="#blog" className="text-white/50 hover:text-white transition-colors">Blog</a>
              <a href="#press" className="text-white/50 hover:text-white transition-colors">Press</a>
              <Link to="/contact" className="text-white/50 hover:text-white transition-colors">Contact</Link>
            </div>

            {/* Developers */}
            <div className="flex flex-col gap-2.5">
              <p className="font-bold text-white mb-1">Developers</p>
              <Link to="/docs" className="text-white/50 hover:text-white transition-colors">Documentation</Link>
              <a href="#api" className="text-white/50 hover:text-white transition-colors">API</a>
              <Link to="/status" className="text-white/50 hover:text-white transition-colors">Status</Link>
              <Link to="/communities" className="text-white/50 hover:text-white transition-colors">Community</Link>
            </div>

            {/* Resources */}
            <div className="flex flex-col gap-2.5">
              <p className="font-bold text-white mb-1">Resources</p>
              <a href="#help" className="text-white/50 hover:text-white transition-colors">Help Center</a>
              <Link to="/privacy" className="text-white/50 hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="text-white/50 hover:text-white transition-colors">Terms</Link>
              <a href="#brand" className="text-white/50 hover:text-white transition-colors">Brand</a>
              <Link to="/acceptable-use" className="text-white/50 hover:text-white transition-colors">Security</Link>
            </div>
          </div>

          {/* Socials & Language */}
          <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-white/50">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <Github className="w-4 h-4" />
              </a>
            </div>

            <div className="flex items-center gap-2 text-xs text-white/50 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg cursor-pointer hover:text-white transition-colors">
              <Globe className="w-3.5 h-3.5" />
              <span>English (US)</span>
              <ChevronDown className="w-3 h-3 text-white/40" />
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="pt-6 mt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-2 text-white/30 text-[11px]">
            <p>© 2026 Kontyra. All rights reserved.</p>
            <p>Building a brighter digital tomorrow.</p>
          </div>

        </div>
      </footer>
    </div>
  );
}
