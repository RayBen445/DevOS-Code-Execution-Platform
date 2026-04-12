import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import {
  Users,
  Search,
  Plus,
  Loader2,
  Globe,
  Lock,
  ChevronRight,
  Hash,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { Community } from "../types";
import {
  subscribeCommunities,
  joinCommunity,
  leaveCommunity,
  getMembership,
  createCommunity,
} from "../lib/communityService";
import { useSEO } from "../hooks/useSEO";
import CustomSelect from "../components/CustomSelect";

const CATEGORIES = ["All", "Web Dev", "Mobile", "DevOps", "AI/ML", "Open Source", "Career", "General"];

interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onCreated: (slug: string) => void;
}

function CreateCommunityModal({ open, onClose, userId, onCreated }: CreateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!slug) {
      toast.error("Please use a name with letters or numbers.");
      return;
    }
    setSaving(true);
    try {
      const created = await createCommunity({ name: name.trim(), slug, description: description.trim(), category, isPublic, createdBy: userId });
      toast.success(`Community "${name}" created!`);
      onCreated(created.slug);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create community");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-[#111827] border border-white/10 rounded-2xl p-6 w-full max-w-md z-10 shadow-2xl"
      >
        <h2 className="text-xl font-bold text-white mb-1">Create a Community</h2>
        <p className="text-white/40 text-sm mb-6">Start a topic-based space for developers.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              required
              placeholder="e.g. Web Development"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all"
            />
            {slug && <p className="text-[11px] text-white/30 mt-1">URL: /c/{slug}</p>}
          </div>
          <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              required
              rows={3}
              placeholder="What's this community about?"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Category</label>
            <CustomSelect
              value={category}
              onChange={setCategory}
              options={CATEGORIES.filter((c) => c !== "All").map((c) => ({ value: c, label: c }))}
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold text-white">Public Community</p>
              <p className="text-xs text-white/40">Anyone can join and view posts</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic((v) => !v)}
              className={cn("relative w-12 h-6 rounded-full transition-all", isPublic ? "bg-blue-600" : "bg-white/10")}
            >
              <span className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all", isPublic ? "left-7" : "left-1")} />
            </button>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 transition-all font-semibold">Cancel</button>
            <button
              type="submit"
              disabled={saving || !name.trim() || !slug}
              className={cn("flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2", saving || !name.trim() || !slug ? "bg-white/5 text-white/30 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white active:scale-95")}
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : "Create Community"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

interface CommunityCardProps {
  community: Community;
  userId?: string;
  isMember: boolean;
  onJoin: () => void;
  onLeave: () => void;
  joining: boolean;
}

function CommunityCard({ community, userId, isMember, onJoin, onLeave, joining }: CommunityCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-[#111827] border border-white/5 hover:border-white/20 rounded-2xl overflow-hidden transition-all group flex flex-col"
    >
      {/* Banner */}
      <div className="h-20 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent relative overflow-hidden">
        {community.banner && (
          <img src={community.banner} alt="" className="w-full h-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111827] to-transparent" />
        {/* Avatar */}
        <div className="absolute bottom-0 left-4 translate-y-1/2">
          <div className="w-12 h-12 rounded-xl bg-[#0a0a0a] border-2 border-[#111827] flex items-center justify-center overflow-hidden shadow-lg">
            {community.avatar ? (
              <img src={community.avatar} alt={community.name} className="w-full h-full object-cover" />
            ) : (
              <Hash className="w-6 h-6 text-blue-400" />
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-8 px-4 pb-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <Link to={`/c/${community.slug}`} className="text-base font-bold text-white hover:text-blue-400 transition-colors truncate block">
              {community.name}
            </Link>
            {community.category && (
              <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">{community.category}</span>
            )}
          </div>
          {!community.isPublic && <Lock className="w-3.5 h-3.5 text-white/30 shrink-0 mt-1" />}
        </div>

        <p className="text-sm text-white/50 leading-relaxed mb-4 flex-1 line-clamp-2">{community.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-white/30 text-xs">
            <Users className="w-3.5 h-3.5" />
            <span>{community.memberCount.toLocaleString()} members</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/c/${community.slug}`}
              className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1"
            >
              View <ChevronRight className="w-3 h-3" />
            </Link>
            {userId && (
              <button
                onClick={isMember ? onLeave : onJoin}
                disabled={joining}
                className={cn(
                  "text-xs font-bold px-3 py-1.5 rounded-lg transition-all",
                  isMember
                    ? "bg-white/5 text-white/60 hover:bg-red-500/10 hover:text-red-400 border border-white/10"
                    : "bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/20"
                )}
              >
                {joining ? <Loader2 className="w-3 h-3 animate-spin" /> : isMember ? "Joined" : "Join"}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function CommunitiesPage() {
  useSEO({ title: "Communities — DevOS", description: "Join topic-based developer communities on DevOS." });

  const [user] = useAuthState(auth);
  const navigate = useNavigate();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [memberships, setMemberships] = useState<Record<string, boolean>>({});
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Load communities
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeCommunities(
      (data) => { setCommunities(data); setLoading(false); },
      category !== "All" ? { category } : undefined
    );
    return unsub;
  }, [category]);

  // Load memberships for current user
  useEffect(() => {
    if (!user || communities.length === 0) return;
    let cancelled = false;
    Promise.all(
      communities.map((c) => getMembership(c.id, user.uid).then((m) => [c.id, !!m] as [string, boolean]))
    ).then((entries) => {
      if (!cancelled) setMemberships(Object.fromEntries(entries));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user, communities]);

  const handleJoin = async (community: Community) => {
    if (!user) { toast.error("Sign in to join communities"); return; }
    setJoiningId(community.id);
    try {
      await joinCommunity(community.id, user.uid);
      setMemberships((prev) => ({ ...prev, [community.id]: true }));
      toast.success(`Joined ${community.name}`);
    } catch {
      toast.error("Failed to join community");
    } finally {
      setJoiningId(null);
    }
  };

  const handleLeave = async (community: Community) => {
    if (!user) return;
    setJoiningId(community.id);
    try {
      await leaveCommunity(community.id, user.uid);
      setMemberships((prev) => ({ ...prev, [community.id]: false }));
      toast.success(`Left ${community.name}`);
    } catch {
      toast.error("Failed to leave community");
    } finally {
      setJoiningId(null);
    }
  };

  const filtered = communities.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 pb-20 md:pb-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white mb-1">Communities</h1>
            <p className="text-white/40 text-sm">Join topic-based spaces. Build, share, and grow together.</p>
          </div>
          {user && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl transition-all text-sm self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              New Community
            </button>
          )}
        </div>

        {/* Search + category filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search communities…"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                category === cat
                  ? "bg-blue-600 text-white"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/5"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Users className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 font-semibold mb-2">No communities found</p>
            <p className="text-white/25 text-sm mb-6">Be the first to create one!</p>
            {user && (
              <button
                onClick={() => setShowCreate(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all text-sm"
              >
                Create Community
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((community) => (
              <CommunityCard
                key={community.id}
                community={community}
                userId={user?.uid}
                isMember={!!memberships[community.id]}
                onJoin={() => handleJoin(community)}
                onLeave={() => handleLeave(community)}
                joining={joiningId === community.id}
              />
            ))}
          </div>
        )}
      </div>

      <Footer />
      <MobileBottomNav />

      {showCreate && user && (
        <CreateCommunityModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          userId={user.uid}
          onCreated={(slug) => { setShowCreate(false); navigate(`/c/${slug}`); }}
        />
      )}
    </div>
  );
}
