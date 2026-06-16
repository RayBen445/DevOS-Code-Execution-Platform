import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Brain, Cpu, Zap, Code2, Lock, Rocket } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";

export default function BotsPage() {
  useSEO({ title: "DevOS AI  Coming Soon", description: "The next generation of AI-assisted coding is under development." });

  const features = [
    { icon: Brain, title: "Deep Context Understanding", desc: "Our AI reads your entire workspace to provide hyper-relevant suggestions." },
    { icon: Zap, title: "Real-time Pair Programming", desc: "Code side-by-side with an agent that anticipates your next move." },
    { icon: Code2, title: "Automated Refactoring", desc: "Instantly upgrade legacy code to modern standards with one click." },
    { icon: Lock, title: "Enterprise Grade Security", desc: "Your code never leaves your private DevOS environment." },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col font-sans selection:bg-blue-500/30">
      <Navbar />
      
      <main className="flex-1 relative overflow-hidden pt-20 pb-32">
        {/* Abstract Glowing Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
          <div className="w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
          <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] mix-blend-screen" style={{ animation: "pulse 4s infinite reverse" }} />
        </div>

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-blue-400 mb-8 mt-8"
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-widest">Under Construction</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tighter leading-tight mb-6"
          >
            Meet your new <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
              Coding Co-pilot.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-white/50 max-w-2xl leading-relaxed mb-16 font-light"
          >
            We are hard at work developing the ultimate AI coding assistant native to DevOS. It learns your style, reviews your code, and helps you build faster than ever.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + (idx * 0.1) }}
                className="group relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <feature.icon className="w-10 h-10 text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-500" />
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-white/40 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-20 p-8 rounded-3xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 max-w-4xl flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-md"
          >
            <div>
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                <Rocket className="w-6 h-6 text-purple-400" />
                Join the Waitlist
              </h3>
              <p className="text-white/60">Get early access to DevOS AI when it launches in beta.</p>
            </div>
            <button className="px-8 py-4 bg-white text-black rounded-2xl font-bold text-lg hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.2)]">
              Notify Me
            </button>
          </motion.div>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
