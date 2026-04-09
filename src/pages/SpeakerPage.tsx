import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getSpeakerBySlug, getEventById } from "../lib/eventsService";
import { Speaker, Event } from "../types";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import {
  User,
  ArrowLeft,
  Twitter,
  Linkedin,
  Github,
  Link2,
  Calendar,
  Loader2,
  Mic,
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";

function formatDate(ts: any): string {
  if (!ts) return "";
  try {
    const d: Date = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export default function SpeakerPage() {
  const { slug } = useParams<{ slug: string }>();

  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useSEO({
    title: speaker ? `${speaker.name} — DevOS Speakers` : "Speaker — DevOS",
    description: speaker?.bio,
    ogImage: speaker?.image,
  });

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    getSpeakerBySlug(slug)
      .then(async (sp) => {
        if (!sp) { setNotFound(true); return; }
        setSpeaker(sp);

        // Fetch events this speaker is linked to
        const linksSnap = await getDocs(
          query(collection(db, "event_speakers"), where("speakerId", "==", sp.id))
        );
        const eventIds = linksSnap.docs.map((d) => d.data().eventId as string);
        if (eventIds.length > 0) {
          const evs = await Promise.all(eventIds.map(getEventById));
          setEvents(evs.filter((e): e is Event => !!e && e.status === "approved"));
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (notFound || !speaker) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-4">
        <p className="text-xl font-bold">Speaker not found</p>
        <Link to="/speakers" className="text-blue-400 hover:underline text-sm">← Back to Speakers</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 pb-24 md:pb-10">
        <Link to="/speakers" className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Speakers
        </Link>

        {/* Profile card */}
        <div className="flex flex-col sm:flex-row gap-6 items-start p-6 bg-white/5 border border-white/10 rounded-2xl mb-8">
          {speaker.image ? (
            <img
              src={speaker.image}
              alt={speaker.name}
              className="w-24 h-24 rounded-full object-cover border-2 border-white/10 shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-600/20 flex items-center justify-center border-2 border-white/10 shrink-0">
              <User className="w-11 h-11 text-blue-400" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-white">{speaker.name}</h1>
            <p className="text-white/50 mt-0.5">{speaker.title}</p>
            <p className="text-white/60 text-sm mt-3 leading-relaxed">{speaker.bio}</p>
            {speaker.socialLinks && (
              <div className="flex items-center gap-4 mt-4">
                {speaker.socialLinks.twitter && (
                  <a href={speaker.socialLinks.twitter} target="_blank" rel="noreferrer" className="text-white/40 hover:text-sky-400 transition-colors flex items-center gap-1.5 text-sm">
                    <Twitter className="w-4 h-4" /> Twitter
                  </a>
                )}
                {speaker.socialLinks.linkedin && (
                  <a href={speaker.socialLinks.linkedin} target="_blank" rel="noreferrer" className="text-white/40 hover:text-blue-400 transition-colors flex items-center gap-1.5 text-sm">
                    <Linkedin className="w-4 h-4" /> LinkedIn
                  </a>
                )}
                {speaker.socialLinks.github && (
                  <a href={speaker.socialLinks.github} target="_blank" rel="noreferrer" className="text-white/40 hover:text-white transition-colors flex items-center gap-1.5 text-sm">
                    <Github className="w-4 h-4" /> GitHub
                  </a>
                )}
                {speaker.socialLinks.website && (
                  <a href={speaker.socialLinks.website} target="_blank" rel="noreferrer" className="text-white/40 hover:text-green-400 transition-colors flex items-center gap-1.5 text-sm">
                    <Link2 className="w-4 h-4" /> Website
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Events */}
        {events.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Mic className="w-5 h-5 text-blue-400" /> Speaking at
            </h2>
            <div className="space-y-3">
              {events.map((ev) => (
                <Link
                  key={ev.id}
                  to={`/events/${ev.slug}`}
                  className="flex items-start gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:border-blue-500/30 hover:bg-white/[0.07] transition-all"
                >
                  <Calendar className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-white">{ev.title}</p>
                    <p className="text-white/40 text-xs mt-0.5">{formatDate(ev.startDate)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
