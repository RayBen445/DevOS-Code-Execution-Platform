import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  FolderCode,
  Sparkles,
  Clock,
  Heart,
  Rocket,
  Globe,
  Lock,
  ExternalLink,
  Activity,
  Zap,
  Code2,
} from "lucide-react";
import { collection, query, where, onSnapshot, orderBy, limit, doc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { subscribeFeed, toggleLike } from "../lib/feedService";
import { resolveAvatar } from "../lib/avatars";
import { formatRelativeTime, cn } from "../lib/utils";
import { FeedPost, Project, UserSettings } from "../types";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";
import { useSEO } from "../hooks/useSEO";

interface FeedHomeProps {
  onOpenProject: (projectId: string) => void;
  onShowLogin?: () => void;
}

export default function FeedHome({ onOpenProject, onShowLogin }: FeedHomeProps) {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [feedLoading, setFeedLoading] = useState(true);

  useSEO({ title: "Home — DevOS" });

  useEffect(() => {
    const unsub = subscribeFeed((posts) => {
      setFeed(posts);
      setFeedLoading(false);
    }, { maxItems: 50 });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "user_settings", user.uid), (snap) => {
      if (snap.exists()) setSettings(snap.data() as UserSettings);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "projects"),
      where("ownerId", "==", user.uid),
      orderBy("updatedAt", "desc"),
      limit(6)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMyProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "projects"));
    return unsub;
  }, [user]);

  const lastProject = myProjects[0] ?? null;

  const quickActions = [
    {
      label: "+ New Project",
      icon: Plus,
      color: "bg-blue-600 hover:bg-blue-700 text-white",
      onClick: () => navigate("/projects"),
    },
    {
      label: "Open Projects",
      icon: FolderCode,
      color: "bg-white/5 border border-white/10 hover:bg-white/10 text-white",
      onClick: () => navigate("/projects"),
    },
    {
      label: "Try Demo",
      icon: Sparkles,
      color: "bg-white/5 border border-white/10 hover:bg-white/10 text-white",
      onClick: onShowLogin ?? (() => navigate("/templates")),
    },
    ...(lastProject
      ? [
          {
            label: "Continue Last",
            icon: Clock,
            color: "bg-white/5 border border-white/10 hover:bg-white/10 text-white",
            onClick: () => onOpenProject(lastProject.id),
          },
        ]
      : []),
  ];

  const handleLike = async (post: FeedPost) => {
    if (!user) return;
    const liked = post.likedBy?.includes(user.uid) ?? false;
    await toggleLike(post.id, user.uid, liked);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">
          {/* Page heading */}
          <div className="mb-6 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white leading-none">
                {settings?.displayName ? `Hey, ${settings.displayName.split(" ")[0]} 👋` : "Your Feed"}
              </h1>
              <p className="text-xs text-white/40 mt-0.5">What's happening in the community</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95",
                  action.color
                )}
              >
                <action.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{action.label}</span>
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Feed (main column) */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-white/30 px-1">
                Community Feed
              </h2>

              {feedLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-2xl bg-white/5 border border-white/5 p-5 animate-pulse">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-full bg-white/10" />
                        <div className="space-y-1.5">
                          <div className="h-3 w-28 rounded bg-white/10" />
                          <div className="h-2 w-16 rounded bg-white/5" />
                        </div>
                      </div>
                      <div className="h-4 w-full rounded bg-white/5" />
                    </div>
                  ))}
                </div>
              ) : feed.length === 0 ? (
                <div className="rounded-2xl bg-white/5 border border-white/5 p-10 text-center">
                  <Zap className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No activity yet. Be the first to deploy!</p>
                </div>
              ) : (
                feed.map((post, i) => (
                  <FeedItem key={post.id} post={post} userId={user?.uid} onLike={handleLike} index={i} />
                ))
              )}
            </div>

            {/* My Projects sidebar */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white/30">
                  My Projects
                </h2>
                <button
                  onClick={() => navigate("/projects")}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  View all →
                </button>
              </div>

              {myProjects.length === 0 ? (
                <div className="rounded-2xl bg-white/5 border border-white/5 p-6 text-center">
                  <FolderCode className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-white/40 text-xs">No projects yet</p>
                  <button
                    onClick={() => navigate("/projects")}
                    className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Create one
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {myProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={() => onOpenProject(project.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

/* ─── Feed Item ─── */

function FeedItem({
  post,
  userId,
  onLike,
  index,
}: {
  post: FeedPost;
  userId?: string;
  onLike: (post: FeedPost) => void;
  index: number;
}) {
  const liked = userId ? (post.likedBy?.includes(userId) ?? false) : false;
  const avatarUrl = resolveAvatar(post.avatarUrl || null);

  const typeColors: Record<string, string> = {
    deployment: "bg-green-500/10 text-green-400 border-green-500/20",
    announcement: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    feature: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    update: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    snippet: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  };

  const typeLabel: Record<string, string> = {
    deployment: "🚀 Deployment",
    announcement: "📢 Announcement",
    feature: "✨ Feature",
    update: "🔄 Update",
    snippet: "💾 Snippet",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all p-5"
    >
      {/* Author row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={post.displayName || post.username}
              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
              <Code2 className="w-4 h-4 text-blue-400" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {post.displayName || post.username}
              {post.isOfficial && (
                <span className="ml-1.5 text-[10px] bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded-full border border-blue-500/20 font-bold">
                  Official
                </span>
              )}
            </p>
            <p className="text-[11px] text-white/40 truncate">
              @{post.username}
              {post.createdAt && (
                <> · {formatRelativeTime(post.createdAt)}</>
              )}
            </p>
          </div>
        </div>

        {/* Type badge */}
        <span
          className={cn(
            "flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border",
            typeColors[post.type] ?? "bg-white/5 text-white/40 border-white/10"
          )}
        >
          {typeLabel[post.type] ?? post.type}
        </span>
      </div>

      {/* Content */}
      <p className="text-sm text-white/70 leading-relaxed mb-3">{post.content}</p>

      {/* Project preview */}
      {post.projectName && (
        <a
          href={post.projectId ? `/projects` : undefined}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-sm text-white/60 hover:text-white w-fit max-w-full"
        >
          <FolderCode className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" />
          <span className="truncate font-medium">{post.projectName}</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-40" />
        </a>
      )}

      {/* Engagement */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5">
        <button
          onClick={() => onLike(post)}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium transition-colors",
            liked ? "text-red-400 hover:text-red-300" : "text-white/40 hover:text-white/70"
          )}
          aria-label={liked ? "Unlike" : "Like"}
        >
          <Heart className={cn("w-3.5 h-3.5", liked && "fill-current")} />
          {post.likes > 0 && <span>{post.likes}</span>}
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Project Card ─── */

function ProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all p-4 group"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors truncate">
          {project.name}
        </p>
        <span className="flex-shrink-0">
          {project.isPublic ? (
            <Globe className="w-3.5 h-3.5 text-white/30" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-white/30" />
          )}
        </span>
      </div>
      {project.description && (
        <p className="text-[11px] text-white/40 truncate">{project.description}</p>
      )}
      {project.updatedAt && (
        <p className="text-[10px] text-white/25 mt-1.5">
          Updated {formatRelativeTime(project.updatedAt)}
        </p>
      )}
    </button>
  );
}
