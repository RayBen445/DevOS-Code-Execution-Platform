import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import { getApprovedEvents } from "../lib/eventsService";
import { Event } from "../types";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import { Calendar, MapPin, Globe, Lock, Loader2, Plus, Search, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";

function formatEventDate(ts: any): string {
  if (!ts) return "";
  try {
    const date: Date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function EventCard({ event }: { event: Event }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/40 hover:bg-white/[0.07] transition-all group"
    >
      {event.bannerImage ? (
        <div className="h-44 overflow-hidden">
          <img
            src={event.bannerImage}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      ) : (
        <div className="h-44 bg-gradient-to-br from-blue-600/30 to-purple-600/30 flex items-center justify-center">
          <Calendar className="w-12 h-12 text-blue-400/50" />
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          {event.type === "online" ? (
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
              <Globe className="w-3 h-3" /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2 py-0.5 rounded-full">
              <MapPin className="w-3 h-3" /> In Person
            </span>
          )}
          {event.isPremium && (
            <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3" /> Premium
            </span>
          )}
        </div>

        <h3 className="font-semibold text-white text-lg leading-snug mb-1 line-clamp-2">
          {event.title}
        </h3>

        <p className="text-white/50 text-sm mb-3 line-clamp-2">{event.description}</p>

        <div className="flex items-center gap-1.5 text-xs text-white/40">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatEventDate(event.startDate)}</span>
        </div>

        {event.type === "physical" && event.venueName && (
          <div className="flex items-center gap-1.5 text-xs text-white/40 mt-1">
            <MapPin className="w-3.5 h-3.5" />
            <span className="line-clamp-1">{event.venueName}</span>
          </div>
        )}

        <Link
          to={`/events/${event.slug}`}
          className="mt-4 block w-full text-center text-sm font-medium py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/20 transition-all"
        >
          View Event
        </Link>
      </div>
    </motion.div>
  );
}

export default function EventsPage() {
  useSEO({
    title: "Events — DevOS",
    description: "Discover developer events, conferences, and meetups on DevOS.",
  });

  const [user] = useAuthState(auth);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "online" | "physical">("all");

  useEffect(() => {
    setLoading(true);
    getApprovedEvents(100)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter((e) => {
    const matchSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || e.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-10 pb-24 md:pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Events</h1>
            <p className="text-white/50 text-sm mt-1">
              Developer meetups, workshops, and conferences
            </p>
          </div>
          {user && (
            <Link
              to="/events/create"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search events…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-white/40 shrink-0" />
            {(["all", "online", "physical"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  typeFilter === t
                    ? "bg-blue-600 text-white"
                    : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-white/40">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No events found</p>
            <p className="text-sm mt-1">
              {search || typeFilter !== "all"
                ? "Try adjusting your filters"
                : "Be the first to create one!"}
            </p>
            {user && (
              <Link
                to="/events/create"
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-all"
              >
                <Plus className="w-4 h-4" /> Create Event
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
