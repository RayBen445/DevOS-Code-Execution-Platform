import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  FolderCode,
  Sparkles,
  Clock,
  Heart,
  Globe,
  Lock,
  ExternalLink,
  Activity,
  Zap,
  Code2,
  Send,
  ChevronDown,
  X,
} from "lucide-react";
import { collection, query, where, onSnapshot, orderBy, limit, doc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { subscribeFeed, toggleLike, createFeedPost } from "../lib/feedService";
import { resolveAvatar } from "../lib/avatars";
import { formatRelativeTime, cn } from "../lib/utils";
import { FeedPost, Project, UserSettings } from "../types";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import { toast } from "sonner";

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

  // Post composer state
  const [postText, setPostText] = useState("");
  const [postType, setPostType] = useState<FeedPost["type"]>("update");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isPosting, setIsPosting] = useState(false);
  const [showMobileFab, setShowMobileFab] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSubmitPost = async () => {
    if (!user) return;
    setIsPosting(true);
    try {
      const selectedProject = myProjects.find((p) => p.id === selectedProjectId);
      await createFeedPost({
        userId: user.uid,
        username: settings?.username || user.email?.split("@")[0] || "user",
        displayName: settings?.displayName || user.displayName || undefined,
        avatarUrl: settings?.avatarUrl || user.photoURL || undefined,
        content: postText.trim(),
        type: postType,
        projectId: selectedProject?.id,
        projectName: selectedProject?.name,
        isPublic: true,
      });
      setPostText("");
      setSelectedProjectId("");
      setShowMobileFab(false);
      toast.success("Post shared!");
    } catch {
      toast.error("Failed to share post.");
    } finally {
      setIsPosting(false);
    }
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
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white/30">
                  Community Feed
                </h2>
              </div>

              {/* Post Composer — desktop inline, mobile via FAB */}
              {user && (
                <PostComposer
                  avatarUrl={resolveAvatar(settings?.avatarUrl || user.photoURL)}
                  displayName={settings?.displayName || user.displayName || "You"}
                  postText={postText}
                  setPostText={setPostText}
                  postType={postType}
                  setPostType={setPostType}
                  selectedProjectId={selectedProjectId}
                  setSelectedProjectId={setSelectedProjectId}
                  myProjects={myProjects}
                  isPosting={isPosting}
                  onSubmit={handleSubmitPost}
                  textareaRef={textareaRef}
                />
              )}

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

      {/* Mobile FAB — floating post button */}
      {user && (
        <>
          <button
            onClick={() => setShowMobileFab(true)}
            className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/30 flex items-center justify-center text-white transition-all active:scale-90"
            aria-label="New post"
          >
            <Plus className="w-6 h-6" />
          </button>

          {/* Mobile post sheet */}
          <AnimatePresence>
            {showMobileFab && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/70 z-40 md:hidden"
                  onClick={() => setShowMobileFab(false)}
                />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 28, stiffness: 300 }}
                  className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#111] border-t border-white/10 rounded-t-2xl p-4 pb-8"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white">New Post</h3>
                    <button onClick={() => setShowMobileFab(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <PostComposer
                    avatarUrl={resolveAvatar(settings?.avatarUrl || user.photoURL)}
                    displayName={settings?.displayName || user.displayName || "You"}
                    postText={postText}
                    setPostText={setPostText}
                    postType={postType}
                    setPostType={setPostType}
                    selectedProjectId={selectedProjectId}
                    setSelectedProjectId={setSelectedProjectId}
                    myProjects={myProjects}
                    isPosting={isPosting}
                    onSubmit={handleSubmitPost}
                    textareaRef={textareaRef}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

/* ─── Post Composer ─── */

interface PostComposerProps {
  avatarUrl: string;
  displayName: string;
  postText: string;
  setPostText: (v: string) => void;
  postType: FeedPost["type"];
  setPostType: (v: FeedPost["type"]) => void;
  selectedProjectId: string;
  setSelectedProjectId: (v: string) => void;
  myProjects: Project[];
  isPosting: boolean;
  onSubmit: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

function PostComposer({
  avatarUrl,
  displayName,
  postText,
  setPostText,
  postType,
  setPostType,
  selectedProjectId,
  setSelectedProjectId,
  myProjects,
  isPosting,
  onSubmit,
  textareaRef,
}: PostComposerProps) {
  const typeOptions: { value: FeedPost["type"]; label: string; emoji: string }[] = [
    { value: "update", label: "Update", emoji: "🔄" },
    { value: "snippet", label: "Snippet", emoji: "💾" },
    { value: "feature", label: "Feature", emoji: "✨" },
    { value: "deployment", label: "Deployment", emoji: "🚀" },
  ];

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 space-y-3">
      <div className="flex items-start gap-3">
        <img
          src={avatarUrl}
          alt={displayName}
          className="w-9 h-9 rounded-full object-cover flex-shrink-0"
          referrerPolicy="no-referrer"
        />
        <textarea
          ref={textareaRef}
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          placeholder="Share something with the community…"
          rows={2}
          className="flex-1 bg-transparent text-sm text-white placeholder-white/30 resize-none focus:outline-none leading-relaxed"
        />
      </div>

      {/* Options row */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
        {/* Post type selector */}
        <div className="relative">
          <select
            value={postType}
            onChange={(e) => setPostType(e.target.value as FeedPost["type"])}
            className="appearance-none text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white focus:outline-none focus:border-white/20 pr-6 cursor-pointer transition-all"
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.emoji} {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
        </div>

        {/* Project selector */}
        {myProjects.length > 0 && (
          <div className="relative">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="appearance-none text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white focus:outline-none focus:border-white/20 pr-6 cursor-pointer transition-all max-w-[140px]"
            >
              <option value="">📁 Attach project</option>
              {myProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
          </div>
        )}

        <div className="ml-auto">
          <button
            onClick={onSubmit}
            disabled={isPosting || !postText.trim()}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-bold transition-all",
              postText.trim() && !isPosting
                ? "bg-blue-600 hover:bg-blue-700 text-white active:scale-95"
                : "bg-white/5 text-white/30 cursor-not-allowed"
            )}
          >
            {isPosting ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Post
          </button>
        </div>
      </div>
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
          href={post.username ? `/u/${post.username}` : undefined}
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
