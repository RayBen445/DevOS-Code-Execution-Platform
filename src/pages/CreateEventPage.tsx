import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import { createEvent } from "../lib/eventsService";
import { EventType } from "../types";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import { ArrowLeft, Loader2, Calendar, Globe, MapPin, Lock, Info } from "lucide-react";
import { toast } from "sonner";
import { getUserSettings } from "../lib/userService";
import { uploadImage, eventBannerPath } from "../lib/storageService";
import ImageUpload from "../components/ImageUpload";

/** Convert a title to a URL-safe slug */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CreateEventPage() {
  useSEO({ title: "Create Event — DevOS", description: "Submit a new developer event on DevOS." });

  const navigate = useNavigate();
  const [user, authLoading] = useAuthState(auth);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [bannerUploading, setBannerUploading] = useState(false);
  const [type, setType] = useState<EventType>("online");
  const [eventLink, setEventLink] = useState("");
  const [venueName, setVenueName] = useState("");
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (user) {
      getUserSettings(user.uid).then((s) => {
        if (s?.username) setUsername(s.username);
      });
    }
  }, [user]);

  // Redirect unauthenticated users after auth loads
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("You must be signed in to create an event");
      navigate("/events");
    }
  }, [authLoading, user, navigate]);

  const handleBannerUpload = async (file: File) => {
    setBannerUploading(true);
    try {
      const path = eventBannerPath(`tmp-${user?.uid ?? "anon"}`, file);
      const url = await uploadImage(file, path);
      setBannerImage(url);
      toast.success("Banner uploaded!");
    } catch (err: any) {
      toast.error("Banner upload failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setBannerUploading(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!description.trim()) { toast.error("Description is required"); return; }
    if (!startDate) { toast.error("Start date is required"); return; }
    if (type === "physical" && !venueName.trim()) {
      toast.error("Venue name is required for in-person events");
      return;
    }

    setSubmitting(true);
    try {
      const slug = `${slugify(title)}-${Date.now()}`;
      await createEvent({
        title: title.trim(),
        slug,
        description: description.trim(),
        bannerImage: bannerImage.trim() || undefined,
        type,
        eventLink: type === "online" ? eventLink.trim() || undefined : undefined,
        venueName: type === "physical" ? venueName.trim() || undefined : undefined,
        address: type === "physical" ? address.trim() || undefined : undefined,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        createdBy: user.uid,
        createdByUsername: username || undefined,
        isPremium,
      });
      toast.success("Event submitted for review! It will be visible once approved.");
      navigate("/events");
    } catch (err: any) {
      console.error("Event creation failed:", err);
      toast.error("Failed to submit event: " + (err?.message ?? "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 pb-24 md:pb-10">
        {/* Back */}
        <Link to="/events" className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-white">Create Event</h1>
          <p className="text-white/40 text-sm mt-1">
            All events require admin approval before becoming public.
          </p>
        </div>

        {/* Approval notice */}
        <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-8 text-sm text-blue-300">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium mb-0.5">Approval Required</p>
            <p className="text-blue-300/70">
              Physical events go through a strict review process. Online events are typically approved faster.
              You will be notified once your event is reviewed.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Event Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Build with AI — Lagos"
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell attendees what to expect…"
              required
              rows={5}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
            />
          </div>

          {/* Event Banner */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Event Banner</label>
            <ImageUpload
              shape="banner"
              value={bannerImage}
              onFile={handleBannerUpload}
              onRemove={() => setBannerImage("")}
              uploading={bannerUploading}
              maxSizeMB={5}
              label="Drop banner image or click to upload"
              hint="JPG, PNG, WEBP — recommended 1200×630 px"
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Event Type <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setType("online")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                  type === "online"
                    ? "bg-green-600/20 border-green-500/40 text-green-300"
                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                }`}
              >
                <Globe className="w-4 h-4" /> Online
              </button>
              <button
                type="button"
                onClick={() => setType("physical")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                  type === "physical"
                    ? "bg-orange-600/20 border-orange-500/40 text-orange-300"
                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                }`}
              >
                <MapPin className="w-4 h-4" /> In Person
              </button>
            </div>
          </div>

          {/* Conditional fields */}
          {type === "online" && (
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Event Link (optional)
              </label>
              <input
                type="url"
                value={eventLink}
                onChange={(e) => setEventLink(e.target.value)}
                placeholder="https://meet.google.com/…"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
          )}

          {type === "physical" && (
            <>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  Venue Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="e.g. Google Lagos Office"
                  required={type === "physical"}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  Address (optional)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Victoria Island, Lagos, Nigeria"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
            </>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Start Date & Time <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 transition-colors [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Premium Toggle */}
          <div className="flex items-start gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex-1">
              <p className="text-sm font-medium text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-yellow-400" />
                Premium Event
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                Premium events require sign-in to view details and register.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPremium(!isPremium)}
              className={`relative w-12 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${
                isPremium ? "bg-yellow-500" : "bg-white/20"
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  isPremium ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              ) : (
                <><Calendar className="w-4 h-4" /> Submit for Review</>
              )}
            </button>
            <Link
              to="/events"
              className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl font-medium text-sm transition-all"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
