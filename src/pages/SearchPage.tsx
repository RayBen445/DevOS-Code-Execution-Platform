import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { db, auth } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { Search, User, Loader2, X, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { resolveAvatar } from "../lib/avatars";
import FollowButton from "../components/FollowButton";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import { UserProfile } from "../types";

export default function SearchPage() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useSEO({ title: "Search Developers — DevOS" });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchTerm.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(searchTerm.trim()), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchTerm]);

  const doSearch = async (term: string) => {
    setLoading(true);
    setSearched(false);
    try {
      const usersRef = collection(db, "users");
      const lo = term.toLowerCase();
      const hi = lo + "\uf8ff";

      const [byUsername, byName] = await Promise.all([
        getDocs(query(usersRef, where("username", ">=", lo), where("username", "<=", hi), limit(20))),
        getDocs(query(usersRef, where("displayName", ">=", term), where("displayName", "<=", term + "\uf8ff"), limit(20))),
      ]);

      const seen = new Set<string>();
      const merged: UserProfile[] = [];
      [...byUsername.docs, ...byName.docs].forEach((d) => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          merged.push({ uid: d.id, ...d.data() } as UserProfile);
        }
      });

      setResults(merged);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const currentSettings = user ? { uid: user.uid, username: user.displayName } : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-12 pb-24 md:pb-12">
        {/* Back button + header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>
          <h1 className="text-3xl font-extrabold text-white mb-2">Search Developers</h1>
          <p className="text-white/40 text-sm">Find developers by username or name.</p>
        </div>

        {/* Search box */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by username or name…"
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors text-base"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-white/40" />
            </button>
          )}
        </div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </motion.div>
          ) : searched && results.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center py-16">
              <User className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 font-medium">No users found for "{searchTerm}"</p>
              <p className="text-white/20 text-sm mt-1">Try searching by username or full name.</p>
            </motion.div>
          ) : results.length > 0 ? (
            <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-4">
                {results.length} result{results.length !== 1 ? "s" : ""}
              </p>
              {results.map((profile) => (
                <UserCard
                  key={profile.uid}
                  profile={profile}
                  currentUid={user?.uid}
                />
              ))}
            </motion.div>
          ) : !searchTerm ? (
            <motion.div key="prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <Search className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/30 text-sm">Start typing to search for developers</p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

function UserCard({ profile, currentUid }: { profile: UserProfile; currentUid?: string }) {
  const avatar = resolveAvatar(profile.avatarUrl);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group"
    >
      <Link to={`/u/${profile.username}`} className="flex items-center gap-4 flex-1 min-w-0">
        <img
          src={avatar}
          alt={profile.displayName}
          className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-white/10"
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0">
          <p className="font-bold text-white truncate">{profile.displayName || profile.username}</p>
          <p className="text-white/40 text-sm font-mono">@{profile.username}</p>
          {profile.bio && <p className="text-white/30 text-xs mt-0.5 truncate">{profile.bio}</p>}
        </div>
      </Link>
      <FollowButton
        targetUid={profile.uid}
        targetUsername={profile.username}
        size="sm"
        className="flex-shrink-0"
      />
    </motion.div>
  );
}
