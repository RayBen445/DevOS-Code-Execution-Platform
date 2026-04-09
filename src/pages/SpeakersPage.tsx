import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllSpeakers } from "../lib/eventsService";
import { Speaker } from "../types";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import { User, Search, Twitter, Linkedin, Github, Link2, Loader2, Mic } from "lucide-react";
import { motion } from "framer-motion";

function SpeakerCard({ speaker }: { speaker: Speaker }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-blue-500/30 hover:bg-white/[0.07] transition-all flex flex-col items-center text-center"
    >
      {speaker.image ? (
        <img
          src={speaker.image}
          alt={speaker.name}
          className="w-20 h-20 rounded-full object-cover mb-3 border-2 border-white/10"
        />
      ) : (
        <div className="w-20 h-20 rounded-full bg-blue-600/20 flex items-center justify-center mb-3 border-2 border-white/10">
          <User className="w-9 h-9 text-blue-400" />
        </div>
      )}

      <h3 className="font-semibold text-white">{speaker.name}</h3>
      <p className="text-white/50 text-sm mt-0.5">{speaker.title}</p>
      <p className="text-white/40 text-xs mt-2 line-clamp-3">{speaker.bio}</p>

      {speaker.socialLinks && (
        <div className="flex items-center gap-3 mt-3">
          {speaker.socialLinks.twitter && (
            <a href={speaker.socialLinks.twitter} target="_blank" rel="noreferrer" className="text-white/30 hover:text-sky-400 transition-colors">
              <Twitter className="w-4 h-4" />
            </a>
          )}
          {speaker.socialLinks.linkedin && (
            <a href={speaker.socialLinks.linkedin} target="_blank" rel="noreferrer" className="text-white/30 hover:text-blue-400 transition-colors">
              <Linkedin className="w-4 h-4" />
            </a>
          )}
          {speaker.socialLinks.github && (
            <a href={speaker.socialLinks.github} target="_blank" rel="noreferrer" className="text-white/30 hover:text-white transition-colors">
              <Github className="w-4 h-4" />
            </a>
          )}
          {speaker.socialLinks.website && (
            <a href={speaker.socialLinks.website} target="_blank" rel="noreferrer" className="text-white/30 hover:text-green-400 transition-colors">
              <Link2 className="w-4 h-4" />
            </a>
          )}
        </div>
      )}

      <Link
        to={`/speakers/${speaker.slug}`}
        className="mt-4 text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >
        View profile →
      </Link>
    </motion.div>
  );
}

export default function SpeakersPage() {
  useSEO({
    title: "Speakers — DevOS Events",
    description: "Browse developer event speakers on DevOS.",
  });

  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    getAllSpeakers()
      .then(setSpeakers)
      .catch(() => setSpeakers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = speakers.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.bio.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-10 pb-24 md:pb-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white">Speakers</h1>
          <p className="text-white/50 text-sm mt-1">
            Global developer event speakers and hosts
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search speakers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-white/40">
            <Mic className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No speakers found</p>
            {search && <p className="text-sm mt-1">Try a different search</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map((s) => (
              <SpeakerCard key={s.id} speaker={s} />
            ))}
          </div>
        )}
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
