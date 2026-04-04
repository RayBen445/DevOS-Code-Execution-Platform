import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db, auth } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import {
  Flame,
  Users,
  Activity,
  Trophy,
  ExternalLink,
  Loader2,
  Eye,
  Zap,
  Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { resolveAvatar } from "../lib/avatars";
import FollowButton from "../components/FollowButton";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import { formatRelativeTime, cn } from "../lib/utils";
import { getFollowerCount } from "../lib/followService";
import { Project, UserProfile, FeedPost } from "../types";

type Tab = "trending" | "developers" | "activity" | "leaderboard";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "trending", label: "Trending Projects", icon: <Flame className="w-4 h-4" /> },
  { id: "developers", label: "Trending Devs", icon: <Users className="w-4 h-4" /> },
  { id: "activity", label: "Latest Activity", icon: <Activity className="w-4 h-4" /> },
  { id: "leaderboard", label: "Leaderboard", icon: <Trophy className="w-4 h-4" /> },
];

export default function ExplorePage() {
  const [user] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState<Tab>("trending");

  useSEO({ title: "Explore — DevOS" });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-6 py-8 pb-24 md:pb-12">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 flex items-center justify-center flex-shrink-0">
              <Globe className="w-4.5 h-4.5 text-blue-400" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Explore</h1>
          </div>
          <p className="text-white/40 text-sm pl-12">Discover trending projects and developers on DevOS.</p>
        </div>

        {/* Tabs — horizontally scrollable on mobile */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-6 no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 border",
                activeTab === tab.id
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "trending" && <TrendingProjectsTab />}
            {activeTab === "developers" && <TrendingDevsTab currentUser={user} />}
            {activeTab === "activity" && <LatestActivityTab />}
            {activeTab === "leaderboard" && <LeaderboardTab currentUser={user} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

/* ─────────────────────── Trending Projects ─────────────────────── */
function TrendingProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "projects"),
      where("isPublic", "==", true),
      where("isSystem", "==", false),
      orderBy("views", "desc"),
      limit(12)
    );
    const unsub = onSnapshot(q, (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  if (loading) return <LoadingGrid />;

  if (projects.length === 0) {
    return <EmptyState icon={<Flame className="w-10 h-10 text-white/10" />} text="No trending projects yet. Be the first to deploy something!" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((p, i) => (
        <ProjectCard key={p.id} project={p} rank={i + 1} />
      ))}
    </div>
  );
}

function ProjectCard({ project, rank }: { project: Project; rank: number }) {
  return (
    <div className="p-4 rounded-2xl bg-[#111827] border border-white/[0.06] hover:border-white/[0.12] transition-all group flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white/20 font-mono w-5 text-right">#{rank}</span>
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
        </div>
        <div className="flex items-center gap-1 text-white/30 text-xs">
          <Eye className="w-3.5 h-3.5" />
          {(project.views ?? 0).toLocaleString()}
        </div>
      </div>
      <h3 className="font-bold text-white text-sm mb-1 truncate">{project.name}</h3>
      {project.description && <p className="text-white/40 text-xs line-clamp-2 mb-3 flex-1">{project.description}</p>}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/[0.06]">
        <Link to={`/u/${project.ownerUsername}`} className="text-xs text-white/40 hover:text-white transition-colors font-mono">
          @{project.ownerUsername || "unknown"}
        </Link>
        {(project.liveUrl || project.deployUrl) && (
          <a href={project.liveUrl || project.deployUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">
            Open <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────── Trending Developers ─────────────────────── */
function TrendingDevsTab({ currentUser }: { currentUser: any }) {
  const [users, setUsers] = useState<(UserProfile & { followerCount: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "users"), orderBy("updatedAt", "desc"), limit(20))
        );
        const raw = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
        // Batch-fetch follower counts
        const withCounts = await Promise.all(
          raw.map(async (u) => ({
            ...u,
            followerCount: await getFollowerCount(u.uid).catch(() => 0),
          }))
        );
        if (!cancelled) {
          setUsers(withCounts.sort((a, b) => b.followerCount - a.followerCount));
        }
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <LoadingGrid count={6} />;
  if (users.length === 0) return <EmptyState icon={<Users className="w-10 h-10 text-white/10" />} text="No developers found yet." />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {users.map((u, i) => (
        <DevCard key={u.uid} user={u} rank={i + 1} />
      ))}
    </div>
  );
}

function DevCard({ user, rank }: { user: UserProfile & { followerCount: number }; rank: number }) {
  const avatar = resolveAvatar(user.avatarUrl);
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#111827] border border-white/[0.06] hover:border-white/[0.12] transition-all">
      <span className="text-xs font-bold text-white/20 font-mono w-5 text-right flex-shrink-0">#{rank}</span>
      <Link to={`/u/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
        <img src={avatar} alt={user.displayName} className="w-11 h-11 rounded-full object-cover border border-white/10 flex-shrink-0" referrerPolicy="no-referrer" />
        <div className="min-w-0">
          <p className="font-bold text-white truncate text-sm">{user.displayName || user.username}</p>
          <p className="text-white/40 text-xs font-mono">@{user.username}</p>
          <p className="text-white/25 text-xs mt-0.5">{user.followerCount.toLocaleString()} followers</p>
        </div>
      </Link>
      <FollowButton targetUid={user.uid} targetUsername={user.username} size="sm" className="flex-shrink-0" />
    </div>
  );
}

/* ─────────────────────── Latest Activity ─────────────────────── */
function LatestActivityTab() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "feed"),
      where("isPublic", "==", true),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FeedPost)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  if (loading) return <LoadingList />;
  if (posts.length === 0) return <EmptyState icon={<Activity className="w-10 h-10 text-white/10" />} text="No activity yet. Start deploying projects!" />;

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <ActivityCard key={post.id} post={post} />
      ))}
    </div>
  );
}

function ActivityCard({ post }: { post: FeedPost }) {
  const avatar = resolveAvatar(post.avatarUrl);
  const TYPE_BADGE: Record<string, string> = {
    deployment: "Deploy",
    snippet: "Code",
    announcement: "News",
    update: "Update",
    feature: "Feature",
  };
  return (
    <div className="flex gap-4 p-4 rounded-2xl bg-[#111827] border border-white/[0.06] hover:border-white/[0.12] transition-all">
      <Link to={`/u/${post.username}`} className="flex-shrink-0">
        <img src={avatar} alt={post.displayName || post.username} className="w-10 h-10 rounded-full object-cover border border-white/10" referrerPolicy="no-referrer" />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Link to={`/u/${post.username}`} className="font-bold text-sm text-white hover:text-blue-400 transition-colors">
            {post.displayName || post.username}
          </Link>
          <span className="text-white/30 text-xs font-mono">@{post.username}</span>
          <span className="ml-auto text-white/20 text-xs flex-shrink-0">{formatRelativeTime(post.createdAt)}</span>
        </div>
        <p className="text-white/70 text-sm leading-relaxed">{post.content}</p>
        {post.projectId && post.projectName && (
          <Link to={`/u/${post.username}/${post.projectId}`} className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">
            <Zap className="w-3 h-3" />
            {post.projectName}
          </Link>
        )}
      </div>
      <span className="text-lg flex-shrink-0 self-start">{TYPE_BADGE[post.type] ?? "📝"}</span>
    </div>
  );
}

/* ─────────────────────── Leaderboard ─────────────────────── */
function LeaderboardTab({ currentUser }: { currentUser: any }) {
  const [topDevs, setTopDevs] = useState<(UserProfile & { followerCount: number })[]>([]);
  const [topProjects, setTopProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [usersSnap, projectsSnap] = await Promise.all([
          getDocs(query(collection(db, "users"), orderBy("updatedAt", "desc"), limit(10))),
          getDocs(query(collection(db, "projects"), where("isPublic", "==", true), orderBy("views", "desc"), limit(10))),
        ]);
        const rawUsers = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
        const withCounts = await Promise.all(
          rawUsers.map(async (u) => ({ ...u, followerCount: await getFollowerCount(u.uid).catch(() => 0) }))
        );
        if (!cancelled) {
          setTopDevs(withCounts.sort((a, b) => b.followerCount - a.followerCount).slice(0, 8));
          setTopProjects(projectsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Project)));
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <LoadingGrid />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Top Developers */}
      <div>
        <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" /> Top Developers
        </h2>
        <div className="space-y-2">
          {topDevs.map((u, i) => (
            <div key={u.uid} className="flex items-center gap-3 p-3 rounded-xl bg-[#111827] border border-white/[0.06] hover:border-white/[0.12] transition-all">
              <RankBadge rank={i + 1} />
              <Link to={`/u/${u.username}`} className="flex items-center gap-2.5 flex-1 min-w-0">
                <img src={resolveAvatar(u.avatarUrl)} alt={u.displayName} className="w-9 h-9 rounded-full object-cover border border-white/10" referrerPolicy="no-referrer" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{u.displayName || u.username}</p>
                  <p className="text-white/30 text-xs">{u.followerCount.toLocaleString()} followers</p>
                </div>
              </Link>
              <FollowButton targetUid={u.uid} targetUsername={u.username} size="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Top Projects */}
      <div>
        <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" /> Top Projects
        </h2>
        <div className="space-y-2">
          {topProjects.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#111827] border border-white/[0.06] hover:border-white/[0.12] transition-all">
              <RankBadge rank={i + 1} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{p.name}</p>
                <p className="text-white/30 text-xs font-mono">@{p.ownerUsername}</p>
              </div>
              <div className="flex items-center gap-1 text-white/30 text-xs flex-shrink-0">
                <Eye className="w-3.5 h-3.5" />
                {(p.views ?? 0).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Shared helpers ─────────────────────── */
function RankBadge({ rank }: { rank: number }) {
  const gold = rank === 1, silver = rank === 2, bronze = rank === 3;
  return (
    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${
      gold ? "bg-yellow-500/20 text-yellow-400" :
      silver ? "bg-white/10 text-white/50" :
      bronze ? "bg-orange-500/15 text-orange-400" :
      "bg-white/5 text-white/25"
    }`}>
      {rank}
    </span>
  );
}

function LoadingGrid({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-32 rounded-2xl bg-[#111827] animate-pulse" />
      ))}
    </div>
  );
}

function LoadingList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-20 rounded-2xl bg-[#111827] animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-center py-16">
      <div className="flex justify-center mb-4">{icon}</div>
      <p className="text-white/30 text-sm">{text}</p>
    </div>
  );
}
