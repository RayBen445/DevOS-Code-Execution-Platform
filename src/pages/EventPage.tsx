import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import {
  getEventBySlug,
  getEventSpeakers,
  getSpeakerById,
  registerForEvent,
  isEmailRegistered,
  getEventRegistrations,
} from "../lib/eventsService";
import { Event, EventSpeaker, Speaker, EventRegistration } from "../types";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import {
  Calendar,
  MapPin,
  Globe,
  Lock,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  User,
  Link2,
  Twitter,
  Linkedin,
  Github,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { sendNotification } from "../lib/notificationService";

function formatEventDate(ts: any): string {
  if (!ts) return "";
  try {
    const date: Date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function SpeakerCard({ speakerLink }: { speakerLink: EventSpeaker & { speaker: Speaker | null } }) {
  const { speaker, role } = speakerLink;
  if (!speaker) return null;
  return (
    <div className="flex items-start gap-4 p-4 bg-white/5 border border-border-base rounded-2xl">
      {speaker.image ? (
        <img src={speaker.image} alt={speaker.name} className="w-14 h-14 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
          <User className="w-7 h-7 text-blue-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-white">{speaker.name}</span>
          <span className="text-xs text-white/40 bg-white/5 border border-border-base px-2 py-0.5 rounded-full capitalize">
            {role}
          </span>
        </div>
        <p className="text-white/50 text-sm">{speaker.title}</p>
        <p className="text-white/40 text-xs mt-1 line-clamp-2">{speaker.bio}</p>
        {speaker.socialLinks && (
          <div className="flex items-center gap-2 mt-2">
            {speaker.socialLinks.twitter && (
              <a href={speaker.socialLinks.twitter} target="_blank" rel="noreferrer" className="text-white/40 hover:text-sky-400 transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
            )}
            {speaker.socialLinks.linkedin && (
              <a href={speaker.socialLinks.linkedin} target="_blank" rel="noreferrer" className="text-white/40 hover:text-blue-400 transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            )}
            {speaker.socialLinks.github && (
              <a href={speaker.socialLinks.github} target="_blank" rel="noreferrer" className="text-white/40 hover:text-white transition-colors">
                <Github className="w-4 h-4" />
              </a>
            )}
            {speaker.socialLinks.website && (
              <a href={speaker.socialLinks.website} target="_blank" rel="noreferrer" className="text-white/40 hover:text-green-400 transition-colors">
                <Link2 className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const [user] = useAuthState(auth);

  const [event, setEvent] = useState<Event | null>(null);
  const [speakerLinks, setSpeakerLinks] = useState<Array<EventSpeaker & { speaker: Speaker | null }>>([]);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // RSVP form
  const [showRsvp, setShowRsvp] = useState(false);
  const [rsvpName, setRsvpName] = useState("");
  const [rsvpEmail, setRsvpEmail] = useState("");
  const [rsvpPhone, setRsvpPhone] = useState("");
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpDone, setRsvpDone] = useState(false);

  useSEO({
    title: event ? `${event.title} — DevOS Events` : "Event — DevOS",
    description: event?.description ?? "Join this developer event on DevOS.",
    ogImage: event?.bannerImage,
  });

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getEventBySlug(slug)
      .then(async (ev) => {
        if (!ev) { setNotFound(true); return; }
        setEvent(ev);
        // Load speakers
        const links = await getEventSpeakers(ev.id);
        const enriched = await Promise.all(
          links.map(async (l) => ({
            ...l,
            speaker: await getSpeakerById(l.speakerId),
          }))
        );
        setSpeakerLinks(enriched);
        // Load registration count
        const regs = await getEventRegistrations(ev.id);
        setRegistrationCount(regs.length);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  // Pre-fill email for logged-in users
  useEffect(() => {
    if (user?.email) setRsvpEmail(user.email);
    if (user?.displayName) setRsvpName(user.displayName);
  }, [user]);

  async function handleRsvp(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    if (!rsvpName.trim() || !rsvpEmail.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setRsvpLoading(true);
    try {
      // isEmailRegistered requires an authenticated read — skip the pre-check
      // for guest users (Firestore rules block unauthenticated list queries).
      // Authenticated users still get the duplicate guard.
      if (user) {
        const alreadyRegistered = await isEmailRegistered(event.id, rsvpEmail.trim().toLowerCase());
        if (alreadyRegistered) {
          toast.error("This email is already registered for this event");
          setRsvpLoading(false);
          return;
        }
      }
      await registerForEvent({
        eventId: event.id,
        name: rsvpName.trim(),
        email: rsvpEmail.trim().toLowerCase(),
        phone: rsvpPhone.trim() || undefined,
        userId: user?.uid ?? null,
        source: user ? "user" : "guest",
      });
      setRsvpDone(true);
      setRegistrationCount((c) => c + 1);
      toast.success("You're registered! 🎉");
      if (user) sendNotification({ userId: user.uid, type: "event_rsvp", title: "RSVP confirmed", message: `You're registered for "${event.title}".`, createdBy: "system" }).catch(() => {});
    } catch {
      toast.error("Registration failed. Please try again.");
    } finally {
      setRsvpLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen bg-base text-white flex flex-col items-center justify-center gap-4">
        <p className="text-xl font-bold">Event not found</p>
        <Link to="/events" className="text-blue-400 hover:underline text-sm">← Back to Events</Link>
      </div>
    );
  }

  const isPremiumLocked = event.isPremium && !user;

  return (
    <div className="min-h-screen bg-base text-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-10 pb-24 md:pb-10">
        {/* Back */}
        <Link to="/events" className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </Link>

        {/* Banner */}
        {event.bannerImage ? (
          <div className="h-60 md:h-80 rounded-2xl overflow-hidden mb-6">
            <img src={event.bannerImage} alt={event.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-48 rounded-2xl bg-gradient-to-br from-blue-600/30 to-purple-600/30 flex items-center justify-center mb-6">
            <Calendar className="w-16 h-16 text-blue-400/40" />
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {event.type === "online" ? (
                <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-full">
                  <Globe className="w-3.5 h-3.5" /> Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2.5 py-1 rounded-full">
                  <MapPin className="w-3.5 h-3.5" /> In Person
                </span>
              )}
              {event.isPremium && (
                <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-full">
                  <Lock className="w-3.5 h-3.5" /> Premium
                </span>
              )}
              <span className="text-xs text-white/30 bg-white/5 border border-border-base px-2.5 py-1 rounded-full capitalize">
                {event.status}
              </span>
            </div>

            <h1 className="text-3xl font-extrabold text-white mb-2">{event.title}</h1>

            {/* Date */}
            <div className="flex items-center gap-2 text-white/50 text-sm mb-1">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{formatEventDate(event.startDate)}</span>
            </div>
            {event.endDate && (
              <div className="flex items-center gap-2 text-white/40 text-xs mb-3">
                <span className="pl-6">Ends: {formatEventDate(event.endDate)}</span>
              </div>
            )}

            {/* Location */}
            {event.type === "physical" && (
              <div className="flex items-center gap-2 text-white/50 text-sm mb-4">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>
                  {event.venueName}
                  {event.address ? ` · ${event.address}` : ""}
                </span>
              </div>
            )}
            {event.type === "online" && event.eventLink && !isPremiumLocked && (
              <div className="flex items-center gap-2 text-blue-400 text-sm mb-4">
                <Globe className="w-4 h-4 shrink-0" />
                <a href={event.eventLink} target="_blank" rel="noreferrer" className="hover:underline break-all">
                  {event.eventLink}
                </a>
              </div>
            )}

            {/* Description */}
            <div className="mt-4 border-t border-border-base pt-5">
              <h2 className="text-lg font-semibold text-white mb-3">About this event</h2>
              {isPremiumLocked ? (
                <div className="p-6 rounded-2xl bg-yellow-400/5 border border-yellow-400/20 text-center">
                  <Lock className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
                  <p className="font-semibold text-white mb-1">Premium Event</p>
                  <p className="text-white/50 text-sm mb-4">Sign in to view full details and register.</p>
                  <Link
                    to="/?login=1"
                    className="px-5 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-bold text-sm transition-all"
                  >
                    Sign in to unlock
                  </Link>
                </div>
              ) : (
                <p className="text-white/70 leading-relaxed whitespace-pre-wrap">{event.description}</p>
              )}
            </div>

            {/* Speakers */}
            {speakerLinks.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-white mb-4">Speakers</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {speakerLinks.map((sl) => (
                    <SpeakerCard key={sl.id} speakerLink={sl} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar — RSVP */}
          <div className="lg:w-80 shrink-0">
            <div className="sticky top-6 bg-white/5 border border-border-base rounded-2xl p-5">
              <div className="text-sm text-white/50 mb-1">
                {registrationCount} {registrationCount === 1 ? "person" : "people"} registered
              </div>
              <h3 className="text-lg font-bold text-white mb-4">Register for this event</h3>

              {event.status !== "approved" ? (
                <p className="text-white/40 text-sm text-center py-4">
                  This event is pending approval and not yet open for registration.
                </p>
              ) : rsvpDone ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="font-semibold text-white mb-1">You're in! 🎉</p>
                  <p className="text-white/50 text-sm">Your spot has been reserved.</p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {!showRsvp ? (
                    <motion.button
                      key="register-btn"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowRsvp(true)}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all"
                    >
                      Register / RSVP
                    </motion.button>
                  ) : (
                    <motion.form
                      key="rsvp-form"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleRsvp}
                      className="space-y-3"
                    >
                      <div>
                        <label className="block text-xs text-white/50 mb-1">Full Name *</label>
                        <input
                          type="text"
                          value={rsvpName}
                          onChange={(e) => setRsvpName(e.target.value)}
                          placeholder="Your name"
                          required
                          className="w-full px-3 py-2 bg-white/5 border border-border-base rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/50 mb-1">Email *</label>
                        <input
                          type="email"
                          value={rsvpEmail}
                          onChange={(e) => setRsvpEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                          className="w-full px-3 py-2 bg-white/5 border border-border-base rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/50 mb-1">Phone (optional)</label>
                        <input
                          type="tel"
                          value={rsvpPhone}
                          onChange={(e) => setRsvpPhone(e.target.value)}
                          placeholder="+1 555 000 0000"
                          className="w-full px-3 py-2 bg-white/5 border border-border-base rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={rsvpLoading}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                      >
                        {rsvpLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Confirm Registration
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRsvp(false)}
                        className="w-full py-2 text-white/40 hover:text-white/70 text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
