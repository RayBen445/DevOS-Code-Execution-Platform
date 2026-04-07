import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Building2, Users, Globe, Lock, Search, ChevronRight, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import CreateOrgModal from "../components/CreateOrgModal";
import { Organization } from "../types";
import { getPublicOrgs } from "../lib/orgService";
import { useSEO } from "../hooks/useSEO";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";

export default function OrgsPage() {
  useSEO({
    title: "Organizations — DevOS",
    description: "Discover public organizations on DevOS and collaborate with developers around the world.",
  });

  const [user] = useAuthState(auth);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    getPublicOrgs()
      .then(setOrgs)
      .catch(() => toast.error("Failed to load organizations."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = orgs.filter((o) =>
    !search.trim() ||
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.description?.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-12 px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Organizations</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">
                Find your team.
              </h1>
              <p className="text-white/40 text-sm max-w-md leading-relaxed">
                Browse public organizations, join a team, or create your own to collaborate on projects together.
              </p>
            </div>
            {user && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-blue-600/20 flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                New Organization
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search organizations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/60 transition-all"
            />
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="px-6 pb-24 flex-1">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-36 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <Building2 className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white/40 mb-2">
                {search ? "No organizations match your search" : "No public organizations yet"}
              </h3>
              <p className="text-sm text-white/25 mb-6">
                {search ? "Try different keywords." : "Be the first to create one!"}
              </p>
              {user && !search && (
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all"
                >
                  Create Organization
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-white/30 mb-5 font-semibold">
                {filtered.length} organization{filtered.length !== 1 ? "s" : ""}
                {search ? ` matching "${search}"` : ""}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((org, i) => (
                  <OrgCard key={org.id} org={org} index={i} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
      <MobileBottomNav />

      {user && (
        <CreateOrgModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      )}
    </div>
  );
}

function OrgCard({ org, index }: { org: Organization; index: number }) {
  const initial = org.name.charAt(0).toUpperCase();
  const colors = [
    "from-blue-600 to-blue-800",
    "from-purple-600 to-purple-800",
    "from-teal-600 to-teal-800",
    "from-orange-600 to-orange-800",
    "from-pink-600 to-pink-800",
    "from-indigo-600 to-indigo-800",
  ];
  const gradient = colors[index % colors.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={`/org/${org.slug}`}
        className={cn(
          "group flex flex-col p-5 rounded-2xl border border-white/[0.06] bg-white/[0.03]",
          "hover:border-white/10 hover:bg-white/[0.05] transition-all duration-300"
        )}
      >
        {/* Avatar */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xl font-black shadow-lg flex-shrink-0`}>
            {org.avatar ? (
              <img src={org.avatar} alt={org.name} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              initial
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm mb-0.5 truncate group-hover:text-blue-300 transition-colors">
            {org.name}
          </p>
          <p className="text-xs text-white/30 font-mono mb-2 truncate">@{org.slug}</p>
          {org.description && (
            <p className="text-xs text-white/40 line-clamp-2 leading-relaxed mb-3">{org.description}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
          <div className="flex items-center gap-1 text-xs text-white/30">
            <Users className="w-3 h-3" />
            <span>{org.memberCount ?? 0} member{(org.memberCount ?? 0) !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-white/25">
            {org.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {org.isPublic ? "Public" : "Private"}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
