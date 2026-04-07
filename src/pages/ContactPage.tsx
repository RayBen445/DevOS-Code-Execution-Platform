import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MessageSquare, Github, Twitter, Globe, Send, Loader2, CheckCircle2, MapPin, Clock } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import { getSiteConfig, SITE_CONFIG_DEFAULTS } from "../lib/creditsService";
import { useEffect } from "react";
import type { SiteConfig } from "../lib/creditsService";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const TOPICS = [
  "General Inquiry",
  "Bug Report",
  "Feature Request",
  "Partnership / Business",
  "Press & Media",
  "Other",
];

export default function ContactPage() {
  useSEO({
    title: "Contact — DevOS",
    description: "Get in touch with the DevOS team. We'd love to hear from you.",
  });

  const [config, setConfig] = useState<SiteConfig>(SITE_CONFIG_DEFAULTS);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSiteConfig().then(setConfig).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Compose a mailto link as a best-effort contact form (no server required)
    const subject = encodeURIComponent(`[DevOS Contact] ${topic} – from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`);
    window.open(`mailto:${config.contactEmail}?subject=${subject}&body=${body}`, "_blank");
    // Simulate a brief delay then show success
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setSubmitted(true);
  };

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/60 transition-all text-sm";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-16 px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-blue-600/10 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8">
              <MessageSquare className="w-3.5 h-3.5" />
              Get in Touch
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-5">
              We'd love to{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                hear from you.
              </span>
            </h1>
            <p className="text-lg text-white/50 max-w-xl mx-auto leading-relaxed">
              Have a question, bug report, or partnership inquiry? Drop us a message and we'll get back to you as soon as possible.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto grid md:grid-cols-5 gap-10">

          {/* Left — info */}
          <motion.div {...fadeUp} className="md:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-5">Contact Info</h2>
              <div className="space-y-4">
                <ContactDetail icon={Mail} label="Email" value={config.contactEmail} href={`mailto:${config.contactEmail}`} />
                <ContactDetail icon={Clock} label="Response Time" value="Within 24–48 hours" />
                <ContactDetail icon={MapPin} label="Based in" value="Global · Remote-first" />
              </div>
            </div>

            <div className="border-t border-white/5 pt-6">
              <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">Find Us Online</p>
              <div className="flex flex-col gap-3">
                {config.githubUrl && (
                  <a href={config.githubUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-white/50 hover:text-white transition-colors">
                    <Github className="w-4 h-4 flex-shrink-0" />
                    {config.githubUrl.replace("https://", "")}
                  </a>
                )}
                {config.twitterUrl && (
                  <a href={config.twitterUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-white/50 hover:text-white transition-colors">
                    <Twitter className="w-4 h-4 flex-shrink-0" />
                    {config.twitterUrl.replace("https://", "")}
                  </a>
                )}
                {config.websiteUrl && (
                  <a href={config.websiteUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-white/50 hover:text-white transition-colors">
                    <Globe className="w-4 h-4 flex-shrink-0" />
                    {config.websiteUrl.replace("https://", "")}
                  </a>
                )}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10">
              <p className="text-xs font-bold text-blue-400 mb-2 uppercase tracking-widest">For Bugs & Issues</p>
              <p className="text-sm text-white/50 leading-relaxed">
                Please include steps to reproduce, browser/OS, and any console errors.
                Screenshots are always helpful!
              </p>
            </div>
          </motion.div>

          {/* Right — form */}
          <motion.div {...fadeUp} className="md:col-span-3">
            <div className="p-8 rounded-3xl bg-[#0f0f0f] border border-white/[0.06]">
              {submitted ? (
                <div className="py-16 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-5">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Message Sent!</h3>
                  <p className="text-sm text-white/40 max-w-sm leading-relaxed mb-6">
                    Your email client should have opened. If not, email us directly at{" "}
                    <a href={`mailto:${config.contactEmail}`} className="text-blue-400 hover:underline">{config.contactEmail}</a>.
                  </p>
                  <button
                    onClick={() => { setSubmitted(false); setName(""); setEmail(""); setMessage(""); setTopic(TOPICS[0]); }}
                    className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-sm font-semibold transition-all"
                  >
                    Send Another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h2 className="text-xl font-bold text-white mb-6">Send a Message</h2>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Your Name</label>
                      <input
                        type="text"
                        placeholder="Jane Smith"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputCls}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Email Address</label>
                      <input
                        type="email"
                        placeholder="jane@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputCls}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Topic</label>
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className={inputCls + " cursor-pointer"}
                    >
                      {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Message</label>
                    <textarea
                      placeholder="Tell us what's on your mind…"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className={inputCls + " h-36 resize-none"}
                      required
                      minLength={10}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {loading ? "Opening mail client…" : "Send Message"}
                  </button>

                  <p className="text-xs text-white/20 text-center">
                    This will open your email client. Alternatively, email us directly at{" "}
                    <a href={`mailto:${config.contactEmail}`} className="text-blue-400/60 hover:text-blue-400 transition-colors">{config.contactEmail}</a>.
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

function ContactDetail({ icon: Icon, label, value, href }: { icon: React.ElementType; label: string; value: string; href?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-white/40" />
      </div>
      <div>
        <p className="text-xs text-white/30 font-semibold mb-0.5">{label}</p>
        {href ? (
          <a href={href} className="text-sm text-white/70 hover:text-white transition-colors">{value}</a>
        ) : (
          <p className="text-sm text-white/70">{value}</p>
        )}
      </div>
    </div>
  );
}
