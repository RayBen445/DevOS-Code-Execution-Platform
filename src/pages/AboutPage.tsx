import { motion } from "framer-motion";
import { Code2, Zap, Users, Globe, Rocket, Shield, Heart, Star, Building2, GitBranch } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const VALUES = [
  {
    icon: Zap,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    title: "Ship Faster",
    body: "We eliminate setup friction. From zero to deployed in under a minute — so you can focus on building, not configuring.",
  },
  {
    icon: Users,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    title: "Built for Collaboration",
    body: "Code is better when it's shared. Organizations, communities, and live collaboration put teamwork at the core of DevOS.",
  },
  {
    icon: Shield,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    title: "Reliable & Secure",
    body: "Firestore-backed persistence, fine-grained access controls, and real-time sync mean your work is always safe and available.",
  },
  {
    icon: Heart,
    color: "text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/20",
    title: "Community First",
    body: "Templates, projects, and feed posts are public by default. We believe great ideas spread further when shared openly.",
  },
];

const STATS = [
  { value: "10k+", label: "Developers" },
  { value: "50k+", label: "Projects Deployed" },
  { value: "100+", label: "Templates" },
  { value: "99.9%", label: "Uptime" },
];

const TEAM = [
  { name: "RayBen445", role: "Founder & Lead Engineer", avatar: "https://github.com/RayBen445.png" },
];

export default function AboutPage() {
  useSEO({
    title: "About — DevOS",
    description: "Learn about DevOS — the cloud IDE built for builders who want to ship faster.",
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-20 px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-600/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-purple-600/8 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8">
              <Star className="w-3.5 h-3.5" />
              Our Story
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-6">
              Built by builders,{" "}
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                for builders.
              </span>
            </h1>
            <p className="text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
              DevOS started as a frustration — too much time wasted on environment setup, config files, and deployment complexity.
              We built a cloud IDE that removes all of that, so developers can focus on what they love: writing code and shipping products.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map(({ value, label }) => (
              <div key={label} className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
                <p className="text-4xl font-black text-white mb-1">{value}</p>
                <p className="text-xs font-bold text-white/30 uppercase tracking-widest">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Our Mission</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-5">
                Make great software accessible to everyone.
              </h2>
              <p className="text-white/50 leading-relaxed mb-4">
                We believe that infrastructure should be invisible. Whether you're a solo developer prototyping your next idea
                or a team of 50 shipping a production product, DevOS gives you the same professional-grade tooling —
                without the operational burden.
              </p>
              <p className="text-white/50 leading-relaxed">
                From browser-based coding to instant deployments and organisation management, every feature is designed
                to remove friction and put creativity first.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Code2, label: "Monaco Editor", desc: "VS Code-grade editing" },
                { icon: Rocket, label: "Instant Deploy", desc: "Live in seconds" },
                { icon: Building2, label: "Organisations", desc: "Team collaboration" },
                { icon: GitBranch, label: "Version Control", desc: "GitHub integration" },
                { icon: Globe, label: "Public Projects", desc: "Share your work" },
                { icon: Users, label: "Communities", desc: "Learn together" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-2">
                  <Icon className="w-5 h-5 text-blue-400" />
                  <p className="text-sm font-bold text-white">{label}</p>
                  <p className="text-xs text-white/30">{desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="px-6 pb-24 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto py-20">
          <motion.div {...fadeUp} className="text-center mb-12">
            <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">What We Believe</p>
            <h2 className="text-3xl font-black tracking-tight">Our core values</h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6">
            {VALUES.map(({ icon: Icon, color, bg, title, body }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-[#0f0f0f] border border-white/[0.06] flex gap-5"
              >
                <div className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center border ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1.5">{title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">The People</p>
            <h2 className="text-3xl font-black tracking-tight">Who builds DevOS</h2>
          </motion.div>
          <div className="flex flex-wrap justify-center gap-6">
            {TEAM.map(({ name, role, avatar }) => (
              <motion.div
                key={name}
                {...fadeUp}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] w-52"
              >
                <img src={avatar} alt={name} className="w-16 h-16 rounded-full object-cover border-2 border-white/10" referrerPolicy="no-referrer" />
                <div className="text-center">
                  <p className="font-bold text-white text-sm">@{name}</p>
                  <p className="text-xs text-white/40 mt-0.5">{role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <motion.div
            {...fadeUp}
            className="relative p-10 rounded-3xl bg-gradient-to-br from-blue-600/20 to-purple-600/10 border border-blue-500/20 text-center overflow-hidden"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
            <Zap className="w-10 h-10 text-blue-400 mx-auto mb-5" />
            <h2 className="text-3xl font-black tracking-tight mb-3">Ready to start building?</h2>
            <p className="text-white/50 mb-8 max-w-md mx-auto">
              Join thousands of developers already shipping faster with DevOS.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/projects"
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20"
              >
                Start for Free
              </Link>
              <Link
                to="/contact"
                className="px-8 py-3 bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
              >
                Contact Us
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
