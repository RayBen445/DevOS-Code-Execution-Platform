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
  X,
  MessageCircle,
  Repeat2,
  Eye,
  ImageDown,
  Layers,
} from "lucide-react";
import { collection, query, where, onSnapshot, orderBy, limit, doc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import {
  subscribeFeed,
  toggleLike,
  createFeedPost,
  addComment,
  subscribeComments,
  repostPost,
} from "../lib/feedService";
import { notifyComment, notifyRepost } from "../lib/notificationService";
import { resolveAvatar } from "../lib/avatars";
import { formatRelativeTime, cn } from "../lib/utils";
import { FeedPost, FeedComment, Project, UserSettings } from "../types";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";
import Avatar from "./Avatar";
import { useSEO } from "../hooks/useSEO";
import { toast } from "sonner";
import { FeedPostShareCard, useShareAsImage } from "./ShareAsImageCard";

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
  const [showComposer, setShowComposer] = useState(false);
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

  const handleRepost = async (originalPost: FeedPost, commentary: string) => {
    if (!user) return;
    try {
      await repostPost({
        originalPost,
        userId: user.uid,
        username: settings?.username || user.email?.split("@")[0] || "user",
        displayName: settings?.displayName || user.displayName || undefined,
        avatarUrl: settings?.avatarUrl || user.photoURL || undefined,
        commentary,
      });
      await notifyRepost({
        postOwnerId: originalPost.userId,
        reposterUsername: settings?.username || user.email?.split("@")[0] || "user",
        reposterId: user.uid,
        postId: originalPost.id,
      });
      toast.success("Reposted!");
    } catch {
      toast.error("Failed to repost.");
    }
  };

  const handleAddComment = async (post: FeedPost, content: string) => {
    if (!user || !content.trim()) return;
    try {
      await addComment({
        postId: post.id,
        userId: user.uid,
        username: settings?.username || user.email?.split("@")[0] || "user",
        displayName: settings?.displayName || user.displayName || undefined,
        avatarUrl: settings?.avatarUrl || user.photoURL || undefined,
        content: content.trim(),
      });
      await notifyComment({
        postOwnerId: post.userId,
        commenterUsername: settings?.username || user.email?.split("@")[0] || "user",
        commenterId: user.uid,
        postId: post.id,
      });
    } catch {
      toast.error("Failed to post comment.");
    }
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
      setShowComposer(false);
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

              {/* Post Composer — desktop trigger */}
              {user && (
                <button
                  onClick={() => setShowComposer(true)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/15 hover:bg-white/[0.05] transition-all group text-left"
                >
                  <Avatar
                    src={settings?.avatarUrl || user.photoURL}
                    displayName={settings?.displayName || user.displayName}
                    size="sm"
                  />
                  <span className="text-sm text-white/30 group-hover:text-white/50 transition-colors flex-1">
                    What are you building?
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                    <Plus className="w-4 h-4 text-blue-400" />
                  </div>
                </button>
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
                  <FeedItem
                    key={post.id}
                    post={post}
                    userId={user?.uid}
                    onLike={handleLike}
                    onRepost={handleRepost}
                    onComment={handleAddComment}
                    index={i}
                  />
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

      {/* FAB for mobile */}
      {user && (
        <button
          onClick={() => setShowComposer(true)}
          className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/30 flex items-center justify-center text-white transition-all active:scale-90"
          aria-label="New post"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Fullscreen Post Composer Modal */}
      {user && (
        <PostComposerModal
          open={showComposer}
          onClose={() => { setShowComposer(false); setPostText(""); setSelectedProjectId(""); }}
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

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

/* ─── Post Composer Modal ─── */

interface PostComposerModalProps {
  open: boolean;
  onClose: () => void;
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

const TYPE_OPTIONS: { value: FeedPost["type"]; label: string; emoji: string; desc: string; color: string }[] = [
  { value: "update", label: "Update", emoji: "🔄", desc: "Share what you're working on", color: "yellow" },
  { value: "snippet", label: "Snippet", emoji: "💾", desc: "Share a code snippet", color: "orange" },
  { value: "feature", label: "Feature", emoji: "✨", desc: "Announce a new feature", color: "purple" },
  { value: "deployment", label: "Deployment", emoji: "🚀", desc: "You shipped something live", color: "green" },
];

function PostComposerModal({
  open,
  onClose,
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
}: PostComposerModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-50 bg-[#111827] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="text-sm font-bold text-white leading-none">{displayName}</p>
                  <p className="text-[11px] text-white/40 mt-0.5">New post</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="What are you building?"
                rows={4}
                autoFocus
                className="w-full bg-transparent text-white placeholder-white/25 text-base leading-relaxed resize-none focus:outline-none"
              />

              {/* Post type cards */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-3">Post Type</p>
                <div className="grid grid-cols-2 gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPostType(opt.value)}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-xl border transition-all text-left",
                        postType === opt.value
                          ? "bg-blue-600/15 border-blue-500/60 shadow-[0_0_0_1px_rgba(59,130,246,0.3)]"
                          : "bg-white/[0.03] border-white/[0.08] hover:border-white/15 hover:bg-white/[0.06]"
                      )}
                    >
                      <span className="text-lg leading-none mt-0.5">{opt.emoji}</span>
                      <div>
                        <p className={cn(
                          "text-xs font-bold leading-none mb-1",
                          postType === opt.value ? "text-blue-300" : "text-white"
                        )}>
                          {opt.label}
                        </p>
                        <p className="text-[10px] text-white/35 leading-snug">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Project selector */}
              {myProjects.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-3">Attach Project</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {/* Deselect option */}
                    <button
                      type="button"
                      onClick={() => setSelectedProjectId("")}
                      className={cn(
                        "w-full flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left",
                        selectedProjectId === ""
                          ? "bg-white/10 border-white/20"
                          : "bg-white/[0.03] border-white/[0.08] hover:border-white/15"
                      )}
                    >
                      <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Layers className="w-3.5 h-3.5 text-white/50" />
                      </div>
                      <span className="text-xs text-white/50">No project attached</span>
                    </button>
                    {myProjects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProjectId(p.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left",
                          selectedProjectId === p.id
                            ? "bg-blue-600/15 border-blue-500/60"
                            : "bg-white/[0.03] border-white/[0.08] hover:border-white/15 hover:bg-white/[0.06]"
                        )}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                          selectedProjectId === p.id ? "bg-blue-600/30" : "bg-white/5"
                        )}>
                          <FolderCode className={cn("w-3.5 h-3.5", selectedProjectId === p.id ? "text-blue-400" : "text-white/40")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-xs font-semibold truncate",
                            selectedProjectId === p.id ? "text-blue-300" : "text-white/80"
                          )}>
                            {p.name}
                          </p>
                          {p.description && <p className="text-[10px] text-white/30 truncate">{p.description}</p>}
                        </div>
                        {p.isPublic ? (
                          <Globe className="w-3 h-3 text-white/20 flex-shrink-0" />
                        ) : (
                          <Lock className="w-3 h-3 text-white/20 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Post button */}
            <div className="p-4 border-t border-white/5">
              <button
                onClick={onSubmit}
                disabled={isPosting || !postText.trim()}
                className={cn(
                  "w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                  postText.trim() && !isPosting
                    ? "bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98] shadow-lg shadow-blue-500/20"
                    : "bg-white/5 text-white/25 cursor-not-allowed"
                )}
              >
                {isPosting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Post
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Feed Item ─── */

const TYPE_COLORS: Record<string, string> = {
  deployment: "bg-green-500/10 text-green-400 border-green-500/20",
  announcement: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  feature: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  update: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  snippet: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  repost: "bg-teal-500/10 text-teal-400 border-teal-500/20",
};

const TYPE_LABEL: Record<string, string> = {
  deployment: "🚀 Deployment",
  announcement: "📢 Announcement",
  feature: "✨ Feature",
  update: "🔄 Update",
  snippet: "💾 Snippet",
  repost: "🔁 Repost",
};

function FeedItem({
  post,
  userId,
  onLike,
  onRepost,
  onComment,
  index,
}: {
  post: FeedPost;
  userId?: string;
  onLike: (post: FeedPost) => void;
  onRepost: (post: FeedPost, commentary: string) => void;
  onComment: (post: FeedPost, content: string) => void;
  index: number;
}) {
  const liked = userId ? (post.likedBy?.includes(userId) ?? false) : false;
  const avatarUrl = resolveAvatar(post.avatarUrl || null);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [repostText, setRepostText] = useState("");
  const [isReposting, setIsReposting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const { capture: captureImage, capturing } = useShareAsImage(
    shareCardRef,
    `devos-post-${post.id.slice(0, 8)}.png`
  );

  // Subscribe to comments when expanded
  useEffect(() => {
    if (!showComments) return;
    const unsub = subscribeComments(post.id, setComments);
    return unsub;
  }, [showComments, post.id]);

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    setIsSubmittingComment(true);
    await onComment(post, commentText);
    setCommentText("");
    setIsSubmittingComment(false);
  };

  const handleRepost = async () => {
    setIsReposting(true);
    await onRepost(post, repostText);
    setRepostText("");
    setShowRepostModal(false);
    setIsReposting(false);
  };

  return (
    <>
      {/* Hidden card rendered off-screen for html2canvas capture */}
      <FeedPostShareCard post={post} cardRef={shareCardRef} />

      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.3 }}
        className="rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all p-5"
      >
      {/* Repost header */}
      {post.type === "repost" && (
        <div className="flex items-center gap-1.5 text-xs text-teal-400/70 mb-3 font-medium">
          <Repeat2 className="w-3.5 h-3.5" />
          <span>{post.displayName || post.username} reposted</span>
        </div>
      )}

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
              {post.createdAt && <> · {formatRelativeTime(post.createdAt)}</>}
            </p>
          </div>
        </div>

        {/* Type badge */}
        {post.type !== "repost" && (
          <span
            className={cn(
              "flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border",
              TYPE_COLORS[post.type] ?? "bg-white/5 text-white/40 border-white/10"
            )}
          >
            {TYPE_LABEL[post.type] ?? post.type}
          </span>
        )}
      </div>

      {/* Content (only show if not a silent repost) */}
      {post.content && (
        <p className="text-sm text-white/70 leading-relaxed mb-3">{post.content}</p>
      )}

      {/* Embedded original post (for reposts) */}
      {post.type === "repost" && post.originalPost && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white/80 truncate">
                {post.originalPost.displayName || post.originalPost.username}
              </p>
              <p className="text-[10px] text-white/30">@{post.originalPost.username}</p>
            </div>
          </div>
          <p className="text-sm text-white/60 leading-relaxed">{post.originalPost.content}</p>
          {post.originalPost.projectName && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-blue-400">
              <FolderCode className="w-3 h-3" />
              {post.originalPost.projectName}
            </div>
          )}
        </div>
      )}

      {/* Project preview */}
      {post.projectName && post.type !== "repost" && (
        <a
          href={post.username ? `/u/${post.username}` : undefined}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-sm text-white/60 hover:text-white w-fit max-w-full mb-3"
        >
          <FolderCode className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" />
          <span className="truncate font-medium">{post.projectName}</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-40" />
        </a>
      )}

      {/* Metrics row */}
      {(post.viewsCount ?? 0) > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-white/20 mb-2">
          <Eye className="w-3 h-3" />
          <span>{post.viewsCount} views</span>
        </div>
      )}

      {/* Engagement bar */}
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-white/5">
        {/* Like */}
        <button
          onClick={() => onLike(post)}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl transition-all hover:bg-white/5",
            liked ? "text-red-400" : "text-white/40 hover:text-white/70"
          )}
          aria-label={liked ? "Unlike" : "Like"}
        >
          <Heart className={cn("w-3.5 h-3.5", liked && "fill-current")} />
          {(post.likes ?? 0) > 0 && <span>{post.likes}</span>}
        </button>

        {/* Comment toggle */}
        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
          aria-label="View comments"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {(post.commentsCount ?? 0) > 0 && <span>{post.commentsCount}</span>}
        </button>

        {/* Repost */}
        {post.type !== "repost" && (
          <button
            onClick={() => setShowRepostModal(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl text-white/40 hover:text-teal-400 hover:bg-teal-500/5 transition-all"
            aria-label="Repost"
          >
            <Repeat2 className="w-3.5 h-3.5" />
            {(post.repostCount ?? 0) > 0 && <span>{post.repostCount}</span>}
          </button>
        )}

        {/* Share as Image */}
        <button
          onClick={captureImage}
          disabled={capturing}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl text-white/40 hover:text-blue-400 hover:bg-blue-500/5 transition-all ml-auto disabled:opacity-50"
          aria-label="Share as image"
          title="Download as image"
        >
          {capturing ? (
            <span className="w-3.5 h-3.5 border-[1.5px] border-white/30 border-t-blue-400 rounded-full animate-spin" />
          ) : (
            <ImageDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Comments section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
              {comments.length === 0 ? (
                <p className="text-xs text-white/25 text-center py-2">No comments yet</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                      {c.avatarUrl ? (
                        <img src={resolveAvatar(c.avatarUrl)} alt={c.username} className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Code2 className="w-3.5 h-3.5 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5 mb-0.5">
                        <span className="text-xs font-semibold text-white/80">{c.displayName || c.username}</span>
                        <span className="text-[10px] text-white/25">{formatRelativeTime(c.createdAt)}</span>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                ))
              )}

              {/* Comment input */}
              {userId && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); } }}
                    placeholder="Write a comment…"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
                  />
                  <button
                    onClick={handleSubmitComment}
                    disabled={isSubmittingComment || !commentText.trim()}
                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Repost Modal */}
      <AnimatePresence>
        {showRepostModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50"
              onClick={() => setShowRepostModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">Repost</h3>
                <button onClick={() => setShowRepostModal(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <textarea
                value={repostText}
                onChange={(e) => setRepostText(e.target.value)}
                placeholder="Add your thoughts… (optional)"
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 resize-none mb-3"
              />

              {/* Original post preview */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 mb-4">
                <p className="text-xs font-semibold text-white/50 mb-1">@{post.username}</p>
                <p className="text-xs text-white/60 leading-relaxed line-clamp-3">{post.content}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowRepostModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRepost}
                  disabled={isReposting}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold transition-all disabled:opacity-50"
                >
                  {isReposting ? "Reposting…" : "🔁 Repost"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </motion.div>
    </>
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
