import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getSiteConfig } from "../lib/creditsService";
import { getFollowing } from "../lib/followService";
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
  Trash2,
  BadgeCheck,
  Building2,
  RefreshCcw,
  Save,
  Rocket,
  Flame,
  Users,
  BarChart2,
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Pencil,
  ChevronDown,
Layout, Video, Link2, File, Calendar, Smile, MapPin, Settings, ChevronRight, Bookmark } from "lucide-react";
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
  deletePost,
  deleteComment,
  editPost,
} from "../lib/feedService";
import { notifyComment, notifyRepost } from "../lib/notificationService";
import { resolveAvatar } from "../lib/avatars";
import { formatRelativeTime, cn } from "../lib/utils";
import { FeedPost, FeedComment, Project, UserSettings, Poll } from "../types";
import { getActivePolls, voteOnPoll, getUserVote } from "../lib/pollService";
import PollCard from "./PollCard";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";
import Avatar from "./Avatar";
import ConfirmModal from "./ConfirmModal";
import { MarkdownContent } from "./MarkdownContent";
import TiptapEditor from "./TiptapEditor";
import PremiumEditor from "./PremiumEditor";
import { useSEO } from "../hooks/useSEO";
import { emitBotEventWithToast } from "../lib/botEngine";
import { toast } from "sonner";
import { FeedPostShareCard, ProjectShareCard, useShareAsImage } from "./ShareAsImageCard";
import PostContentRenderer from "./PostContentRenderer";
import MentionInput, { extractMentions } from "./MentionInput";
import { notifyMention } from "../lib/notificationService";

interface FeedHomeProps {
  onOpenProject: (projectId: string) => void;
  onShowLogin?: () => void;
}



function ExpandablePost({ content, isPreview = false }: { content: string, isPreview?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  // Auto-detect raw code pasted without backticks
  let processedContent = content;
  if (!content.includes('```') && (content.trim().startsWith('export ') || content.trim().startsWith('import ') || content.trim().startsWith('function ') || content.trim().startsWith('const '))) {
    processedContent = '```tsx\n' + content + '\n```';
  }

  const isLong = processedContent.length > 300 || processedContent.split('\n').length > 6;
  
  // Extract URLs for link previews
  const urlRegex = /(?:https?:\/\/|www\.)[^\s()]+/g;
  const rawUrls = Array.from(content.matchAll(urlRegex)).map(m => m[0]);
  const urls = [...new Set(rawUrls)]; // unique
  
  return (
    <div>
      <div className={cn("relative overflow-hidden transition-all duration-300", !expanded && isLong ? "max-h-[150px]" : "max-h-[5000px]")}>
        <MarkdownContent text={processedContent} className={isPreview ? "text-xs" : "text-sm"} />
        {!expanded && isLong && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0d1117] to-transparent pointer-events-none" />
        )}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-blue-400 hover:text-blue-300 text-sm font-semibold"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
      {!isPreview && urls.length > 0 && (
        <div className="mt-3 space-y-2">
          {urls.map((url, uidx) => {
            const validUrl = url.startsWith('http') ? url : `https://${url}`;
            let hostname = url;
            try { hostname = new URL(validUrl).hostname; } catch(e){}
            return (
              <a key={uidx} href={validUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                  <ExternalLink className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{hostname}</div>
                  <div className="text-xs text-white/40 truncate">{validUrl}</div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FeedHome({ onOpenProject, onShowLogin }: FeedHomeProps) {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % quotes.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [activeFeedTab, setActiveFeedTab] = useState("For you");
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [quotes, setQuotes] = useState<string[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  useEffect(() => {
    getSiteConfig().then((cfg) => {
      if (cfg.quotes && cfg.quotes.length > 0) {
        setQuotes(cfg.quotes);
      } else {
        setQuotes(["Better developers build a brighter tomorrow."]);
      }
    }).catch(() => setQuotes(["Better developers build a brighter tomorrow."]));
  }, []);

  useEffect(() => {
    if (user) {
      getFollowing(user.uid).then(setFollowingIds).catch(() => {});
    } else {
      setFollowingIds([]);
    }
  }, [user]);

  // Post composer state
  const [postText, setPostText] = useState("");
  const [postType, setPostType] = useState<FeedPost["type"]>("update");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [composerTab, setComposerTab] = useState<"image"|"video"|"code"|"link"|"poll"|"file"|"event">("image");
  const [showComposer, setShowComposer] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<FeedPost | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [activePolls, setActivePolls] = useState<Poll[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, string[]>>({});
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
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

  useEffect(() => {
    getActivePolls().then(setActivePolls).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user || activePolls.length === 0) return;
    Promise.all(
      activePolls.map((p) =>
        getUserVote(p.id, user.uid).then((v) => v ? [p.id, v.optionIds] as const : null)
      )
    ).then((results) => {
      const map: Record<string, string[]> = {};
      for (const r of results) {
        if (r) map[r[0]] = r[1];
      }
      setUserVotes(map);
    }).catch(() => {});
  }, [user, activePolls]);

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) {
      toast.error("Sign in to vote.");
      return;
    }
    if (userVotes[pollId]) return;
    setVotingPollId(pollId);
    try {
      await voteOnPoll(pollId, user.uid, [optionId]);
      setUserVotes((prev) => ({ ...prev, [pollId]: [optionId] }));
      getActivePolls().then(setActivePolls).catch(() => {});
      toast.success("Vote recorded!");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to vote.");
    } finally {
      setVotingPollId(null);
    }
  };

  const lastProject = myProjects[0] ?? null;

  const quickActions = [
    {
      title: "New Project",
      subtitle: "Start building",
      icon: Plus,
      color: "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/20",
      onClick: () => navigate("/projects"),
    },
    {
      title: "Open Projects",
      subtitle: "View and manage",
      icon: FolderCode,
      color: "bg-surface border border-white/5 hover:bg-white/5 hover:border-white/10 text-white",
      onClick: () => navigate("/projects"),
    },
    {
      title: "Try Demo",
      subtitle: "Explore DevOS",
      icon: Sparkles,
      color: "bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white shadow-lg shadow-purple-500/20",
      onClick: onShowLogin ?? (() => navigate("/templates")),
    },
    {
      title: "Continue Last",
      subtitle: "Pick up where you left off",
      icon: Clock,
      color: "bg-surface border border-white/5 hover:bg-white/5 hover:border-white/10 text-white",
      onClick: () => { if (lastProject) onOpenProject(lastProject.id); else navigate("/projects"); },
    },
  ];

  /** Returns true when an error is a Firestore permission-denied error. */
  const isPermissionError = (err: any): boolean =>
    err?.code === "permission-denied" ||
    (err?.message ?? "").includes("PERMISSION_DENIED");

  const handleLike = async (post: FeedPost) => {
    if (!user) {
      toast.error("Sign in to like posts.");
      return;
    }
    try {
      const liked = post.likedBy?.includes(user.uid) ?? false;
      setFeed((prev) =>
        prev.map((p) =>
          p.id !== post.id
            ? p
            : {
                ...p,
                likes: Math.max(0, (p.likes ?? 0) + (liked ? -1 : 1)),
                likedBy: liked
                  ? (p.likedBy ?? []).filter((id) => id !== user.uid)
                  : [...(p.likedBy ?? []), user.uid],
              }
        )
      );
      await toggleLike(post.id, user.uid, liked);
    } catch (err: any) {
      // Rollback snapshot from server subscription shortly; force local correction now too.
      setFeed((prev) =>
        prev.map((p) =>
          p.id !== post.id
            ? p
            : {
                ...p,
                likes: post.likes ?? 0,
                likedBy: post.likedBy ?? [],
              }
        )
      );
      toast.error(
        isPermissionError(err)
          ? "Permission denied. Firebase rules may need updating."
          : "Failed to update like. Please try again."
      );
    }
  };

  const handleRepost = async (originalPost: FeedPost, commentary: string) => {
    if (!user) {
      toast.error("Sign in to repost.");
      return;
    }
    try {
      setFeed((prev) =>
        prev.map((p) =>
          p.id === originalPost.id || p.id === (originalPost.originalPostId ?? originalPost.id)
            ? { ...p, repostCount: (p.repostCount ?? 0) + 1 }
            : p
        )
      );
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
    } catch (err: any) {
      setFeed((prev) =>
        prev.map((p) =>
          p.id === originalPost.id || p.id === (originalPost.originalPostId ?? originalPost.id)
            ? { ...p, repostCount: Math.max(0, (p.repostCount ?? 1) - 1) }
            : p
        )
      );
      toast.error(
        isPermissionError(err)
          ? "Permission denied. Firebase rules may need updating."
          : "Failed to repost."
      );
    }
  };

  const handleAddComment = async (post: FeedPost, content: string) => {
    if (!user || !content.trim()) return;
    const commenterUsername = settings?.username || user.email?.split("@")[0] || "user";
    const mentions = extractMentions(content.trim());
    setFeed((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, commentsCount: (p.commentsCount ?? 0) + 1 } : p
      )
    );
    try {
      const commentId = await addComment({
        postId: post.id,
        userId: user.uid,
        username: commenterUsername,
        displayName: settings?.displayName || user.displayName || undefined,
        avatarUrl: settings?.avatarUrl || user.photoURL || undefined,
        content: content.trim(),
        mentions,
      });
      await notifyComment({
        postOwnerId: post.userId,
        commenterUsername,
        commenterId: user.uid,
        postId: post.id,
      });
      // Notify mentioned users
      if (mentions.length) {
        const { getDocs: _getDocs, query: _query, collection: _col, where: _where } = await import("firebase/firestore");
        const { db: _db } = await import("../lib/firebase");
        for (const mentionedUsername of mentions) {
          const snap = await _getDocs(_query(_col(_db, "users"), _where("username", "==", mentionedUsername)));
          if (!snap.empty) {
            const mentionedUid = snap.docs[0].data().uid as string;
            await notifyMention({
              mentionedUserId: mentionedUid,
              mentionedUsername,
              mentionerUserId: user.uid,
              mentionerUsername: commenterUsername,
              contextType: "comment",
              postId: post.id,
            });
          }
        }
      }
      void commentId; // suppress unused warning
    } catch (err: any) {
      setFeed((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, commentsCount: Math.max(0, (p.commentsCount ?? 1) - 1) } : p
        )
      );
      toast.error(
        isPermissionError(err)
          ? "Permission denied. Firebase rules may need updating."
          : "Failed to post comment."
      );
    }
  };

  const handleEditPost = async (postId: string, newContent: string) => {
    try {
      await editPost(postId, newContent);
      setFeed((prev) => prev.map((p) => p.id === postId ? { ...p, content: newContent } : p));
      toast.success("Post updated.");
    } catch (err: any) {
      toast.error("Failed to update post.");
    }
  };

  const handleDeletePost = async (post: FeedPost) => {
    if (!user || user.uid !== post.userId) {
      toast.error("You do not have permission to delete this post.");
      return;
    }
    setIsDeletingPost(true);
    try {
      await deletePost(post.id);
      setFeed((prev) => prev.filter((p) => p.id !== post.id));
      toast.success("Post deleted.");
    } catch (err: any) {
      toast.error(
        isPermissionError(err)
          ? "Permission denied. Firebase rules may need updating."
          : "Failed to delete post."
      );
    } finally {
      setIsDeletingPost(false);
      setDeleteConfirmPost(null);
    }
  };

  const handleSubmitPost = async () => {
    if (!user) return;
    setIsPosting(true);
    const posterUsername = settings?.username || user.email?.split("@")[0] || "user";
    const mentions = extractMentions(postText.trim());
    try {
      const selectedProject = myProjects.find((p) => p.id === selectedProjectId);
      const postId = await createFeedPost({
        userId: user.uid,
        username: posterUsername,
        displayName: settings?.displayName || user.displayName || undefined,
        avatarUrl: settings?.avatarUrl || user.photoURL || undefined,
        content: postText.trim(),
        type: postType,
        projectId: selectedProject?.id,
        projectName: selectedProject?.name,
        isPublic: true,
        mentions,
        isOfficial: settings?.isOfficial ?? false,
      });
      emitBotEventWithToast({
        name: "post.created",
        payload: { postId, content: postText.trim(), userId: user.uid },
      }).catch(() => {});
      // Notify mentioned users
      if (mentions.length) {
        const { getDocs: _getDocs, query: _query, collection: _col, where: _where } = await import("firebase/firestore");
        const { db: _db } = await import("../lib/firebase");
        for (const mentionedUsername of mentions) {
          const snap = await _getDocs(_query(_col(_db, "users"), _where("username", "==", mentionedUsername)));
          if (!snap.empty) {
            const mentionedUid = snap.docs[0].data().uid as string;
            await notifyMention({
              mentionedUserId: mentionedUid,
              mentionedUsername,
              mentionerUserId: user.uid,
              mentionerUsername: posterUsername,
              contextType: "post",
              postId,
            });
          }
        }
      }
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
    <div className="min-h-screen bg-base text-white flex flex-col w-full max-w-full min-w-0 overflow-x-hidden">
      <Navbar />

      <main className="flex-1 pb-16 md:pb-0 w-full min-w-0 overflow-x-hidden">
        <div className="h-full w-full min-w-0">
          <div className="w-full px-4 md:px-8 py-6 md:py-10 h-full min-w-0">
          {/* Page heading */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                  <Avatar
                    src={settings?.avatarUrl || user?.photoURL}
                    displayName={settings?.displayName || user?.displayName || "User"}
                    size="md"
                    className="w-14 h-14"
                  />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-extrabold text-white leading-none">
                    {settings?.displayName
                      ? (() => {
                          const h = new Date().getHours();
                          const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
                          return `${g}, ${settings.displayName.split(" ")[0]}`;
                        })()
                      : "Good evening"}
                  </h1>
                  {settings?.isOfficial && (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold tracking-wide">
                      <BadgeCheck className="w-3 h-3" /> DevOS Pro
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/50 mt-1.5 hidden md:block">
                  Build. Share. Learn. Grow — with a global community of developers.
                </p>
                <p className="text-sm text-white/50 mt-1.5 md:hidden">
                  Build. Share. Learn. Grow.
                </p>
              </div>
            </div>
            {/* Quote (Desktop Only) */}
          <div className="hidden md:flex flex-col items-end text-right">
            <p className="text-sm text-white/40 italic">"{quotes[quoteIndex]}"</p>
            <p className="text-xs text-white/20 mt-0.5">- DevOS</p>
          </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={action.onClick}
                className={cn(
                  "flex items-center gap-4 px-5 py-4 rounded-[1.25rem] transition-all active:scale-[0.98] group text-left",
                  action.color
                )}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <action.icon className={cn("w-6 h-6 flex-shrink-0 transition-transform group-hover:scale-110", action.color.includes("bg-surface") ? "text-white/60" : "text-white/90")} />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-bold text-sm text-white truncate">{action.title}</span>
                    <span className="text-[11px] font-medium opacity-70 truncate">{action.subtitle}</span>
                  </div>
                </div>
                <div className="hidden md:block">
                  <span className="text-lg opacity-40 group-hover:opacity-100 transition-opacity group-hover:translate-x-1 inline-block">›</span>
                </div>
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6 w-full max-w-full min-w-0">
            {/* Feed (main column) */}
            <div className="lg:col-span-2 space-y-4 w-full max-w-full min-w-0">
              {/* Inline Composer (Trigger) */}
            <div className="bg-white/[0.03] border border-border-base rounded-2xl p-4 mb-6 shadow-sm">
              <div className="flex gap-3">
                <Avatar
                  src={settings?.avatarUrl || user?.photoURL}
                  displayName={settings?.displayName || user?.displayName || "User"}
                  className="w-10 h-10 ring-2 ring-white/5 flex-shrink-0"
                />
                <button
                  onClick={() => { setComposerTab("image"); setShowComposer(true); }}
                  className="flex-1 bg-black/20 hover:bg-black/40 border border-transparent hover:border-white/5 rounded-xl px-4 text-left text-white/30 text-sm transition-all"
                >
                  What are you building today?
                </button>
              </div>
              <div className="flex items-center justify-between sm:justify-start sm:gap-6 mt-4 px-1">
                <button 
                  onClick={() => { setPostType("update"); setComposerTab("image"); setShowComposer(true); }}
                  className="flex items-center gap-2 text-white/40 hover:text-white transition-colors"
                >
                  <ImageDown className="w-4 h-4" />
                  <span className="text-sm font-semibold hidden sm:inline">Image</span>
                </button>
                <button 
                  onClick={() => { setPostType("update"); setComposerTab("poll"); setShowComposer(true); }}
                  className="flex items-center gap-2 text-white/40 hover:text-white transition-colors"
                >
                  <BarChart2 className="w-4 h-4" />
                  <span className="text-sm font-semibold hidden sm:inline">Poll</span>
                </button>
                <button 
                  onClick={() => { setPostType("deployment"); setComposerTab("link"); setShowComposer(true); }}
                  className="flex items-center gap-2 text-white/40 hover:text-white transition-colors"
                >
                  <FolderCode className="w-4 h-4" />
                  <span className="text-sm font-semibold hidden sm:inline">Project</span>
                </button>
                <button 
                  onClick={() => { setPostType("snippet"); setComposerTab("code"); setShowComposer(true); }}
                  className="flex items-center gap-2 text-white/40 hover:text-white transition-colors"
                >
                  <Code2 className="w-4 h-4" />
                  <span className="text-sm font-semibold hidden sm:inline">Code</span>
                </button>
              </div>
            </div>

              {/* Feed Tabs */}
              <div className="flex items-center justify-between border-b border-white/10 mb-4 px-1">
                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
                  {["For you", "Following", "DevOS Official", "Communities", "Announcements", "Polls"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveFeedTab(tab)}
                      className={cn(
                        "pb-3 text-sm font-bold whitespace-nowrap transition-colors relative",
                        activeFeedTab === tab ? "text-white" : "text-white/40 hover:text-white/70"
                      )}
                    >
                      {tab}
                      {activeFeedTab === tab && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full shadow-[0_-2px_10px_rgba(59,130,246,0.5)]" />
                      )}
                    </button>
                  ))}
                </div>
                <button className="hidden md:flex items-center gap-1 pb-3 text-xs font-bold text-white/40 hover:text-white transition-colors">
                  Latest <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {feedLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-2xl glass border border-white/[0.05] p-5 overflow-hidden">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-full shimmer" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3 w-28 rounded shimmer" />
                          <div className="h-2 w-16 rounded shimmer" />
                        </div>
                      </div>
                      <div className="h-3 w-full rounded shimmer mb-2" />
                      <div className="h-3 w-3/4 rounded shimmer" />
                    </div>
                  ))}
                </div>
              ) : activeFeedTab === "Polls" ? (
                  activePolls.length > 0 ? (
                    <div className="space-y-4">
                      {activePolls.map((poll) => (
                        <PollCard
                          key={poll.id}
                          poll={poll}
                          onVoted={(updated) =>
                            setActivePolls((prev) =>
                              prev.map((p) => (p.id === updated.id ? updated : p))
                            )
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-white/5 border border-border-base p-10 text-center">
                      <BarChart2 className="w-10 h-10 text-white/20 mx-auto mb-3" />
                      <p className="text-white/40 text-sm">No active polls right now.</p>
                    </div>
                  )
              ) : feed.length === 0 ? (
                <div className="rounded-2xl bg-white/5 border border-border-base p-10 text-center">
                  <Zap className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No activity yet. Be the first to deploy!</p>
                </div>
              ) : (
                feed.filter(post => {
                  if (activeFeedTab === "Announcements") return post.type === "announcement";
                  if (activeFeedTab === "DevOS Official") return post.username === "devos" || post.type === "announcement";
                  if (activeFeedTab === "Following") return followingIds.includes(post.userId);
                  if (activeFeedTab === "Communities") return !!post.communityId;
                  return true;
                }).map((post, i) => (
                  <FeedItem
                    key={post.id}
                    post={post}
                    userId={user?.uid}
                    onLike={handleLike}
                    onRepost={handleRepost}
                    onComment={handleAddComment}
                    onDelete={(p) => setDeleteConfirmPost(p)}
                    onEdit={handleEditPost}
                    index={i}
                    isAdmin={settings?.role === "admin"}
                  />
                ))
              )}
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6 w-full max-w-full min-w-0">

              {/* ── Active Polls (top of sidebar — premium position) ── */}
              {activePolls.length > 0 && (
                <div className="hidden lg:block space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                      <Users className="w-4 h-4 text-blue-400" /> Live Polls
                    </h2>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-[10px] font-bold text-green-400">{activePolls.length} active</span>
                    </span>
                  </div>
                  {activePolls.map((poll) => (
                    <PollCard
                      key={poll.id}
                      poll={poll}
                      compact
                      onVoted={(updated) =>
                        setActivePolls((prev) =>
                          prev.map((p) => (p.id === updated.id ? updated : p))
                        )
                      }
                    />
                  ))}
                </div>
              )}

              {/* ── My Projects ── */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                    <FolderCode className="w-4 h-4 text-orange-400" /> Your Projects
                  </h2>
                  <button
                    onClick={() => navigate("/projects")}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  >
                    View all →
                  </button>
                </div>

                {myProjects.length === 0 ? (
                  <div className="rounded-2xl bg-white/5 border border-border-base p-6 text-center">
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
        </div>
        </div>
      </main>

      {/* FAB for mobile */}
      {user && (
        <button
          onClick={() => setShowCreateMenu(true)}
          className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/30 flex items-center justify-center text-white transition-all active:scale-90"
          aria-label="Create"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Mobile Create Bottom Sheet */}
      <AnimatePresence>
        {showCreateMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateMenu(false)}
              className="fixed inset-0 bg-black/60 z-[100] md:hidden backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[101] bg-[#0d121c] rounded-t-3xl border-t border-white/10 p-6 pb-10 md:hidden flex flex-col"
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Create</h3>
                <button onClick={() => setShowCreateMenu(false)} className="p-2 rounded-full hover:bg-white/10 text-white/60 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { setShowCreateMenu(false); navigate("/new"); }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                    <FolderCode className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-base">New Project</h4>
                    <p className="text-white/40 text-xs mt-0.5">Start a new project from scratch</p>
                  </div>
                  <ChevronDown className="w-5 h-5 text-white/20 -rotate-90" />
                </button>
                <button
                  onClick={() => { setShowCreateMenu(false); setShowComposer(true); }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                    <Pencil className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-base">Create Post</h4>
                    <p className="text-white/40 text-xs mt-0.5">Share an update with the community</p>
                  </div>
                  <ChevronDown className="w-5 h-5 text-white/20 -rotate-90" />
                </button>
                <button
                  onClick={() => { setShowCreateMenu(false); setShowComposer(true); }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/20">
                    <BarChart2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-base">Create Poll</h4>
                    <p className="text-white/40 text-xs mt-0.5">Get opinions from the community</p>
                  </div>
                  <ChevronDown className="w-5 h-5 text-white/20 -rotate-90" />
                </button>
                <button
                  onClick={() => { setShowCreateMenu(false); navigate("/orgs"); }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-base">Create Dev Team</h4>
                    <p className="text-white/40 text-xs mt-0.5">Start a team and collaborate</p>
                  </div>
                  <ChevronDown className="w-5 h-5 text-white/20 -rotate-90" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Fullscreen Post Composer Modal */}
      {user && (
        <PostComposerModal
          open={showComposer}
          onClose={() => { setShowComposer(false); setPostText(""); setSelectedProjectId(""); setAttachments([]); }}
          avatarUrl={resolveAvatar(settings?.avatarUrl || user.photoURL)}
          displayName={settings?.displayName || user.displayName || "You"}
          userId={user.uid}
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

      <ConfirmModal
        open={!!deleteConfirmPost}
        title="Delete Post"
        description="Are you sure you want to delete this post? This cannot be undone."
        confirmLabel="Delete"
        danger={true}
        loading={isDeletingPost}
        onConfirm={() => deleteConfirmPost && handleDeletePost(deleteConfirmPost)}
        onCancel={() => setDeleteConfirmPost(null)}
      />

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
  userId: string;
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
  initialTab?: "image"|"video"|"code"|"link"|"poll"|"file"|"event";
}

const TYPE_OPTIONS: { value: FeedPost["type"]; label: string; icon: React.ElementType; desc: string; color: string; accent: string }[] = [
  { value: "update",      label: "Update",     icon: RefreshCcw, desc: "Share progress",       color: "text-yellow-400",  accent: "bg-yellow-500/10 border-yellow-500/30" },
  { value: "snippet",     label: "Snippet",    icon: Code2,      desc: "Code or tip",          color: "text-orange-400",  accent: "bg-orange-500/10 border-orange-500/30" },
  { value: "feature",     label: "Feature",    icon: Sparkles,   desc: "New feature",          color: "text-purple-400",  accent: "bg-purple-500/10 border-purple-500/30" },
  { value: "deployment",  label: "Deployed",   icon: Rocket,     desc: "Shipped live",         color: "text-green-400",   accent: "bg-green-500/10 border-green-500/30" },
];

const TOOLBAR_ACTIONS = [
  { icon: Bold,        title: "Bold",          wrap: ["**", "**"],    placeholder: "bold text" },
  { icon: Italic,      title: "Italic",        wrap: ["*",  "*"],     placeholder: "italic text" },
  { icon: Code2,       title: "Code",          wrap: ["`",  "`"],     placeholder: "code" },
  { icon: Link,        title: "Link",          wrap: ["[",  "](url)"],placeholder: "link text" },
  { icon: List,        title: "Bullet List",   wrap: ["- ", ""],      placeholder: "item" },
  { icon: ListOrdered, title: "Numbered List", wrap: ["1. ", ""],     placeholder: "item" },
  { icon: Quote,       title: "Quote",         wrap: ["> ", ""],      placeholder: "quote" },
] as const;

function PostComposerModal({
  open,
  onClose,
  avatarUrl,
  displayName,
  userId,
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
  initialTab = "image",
}: PostComposerModalProps) {
  const [activeTab, setActiveTab] = React.useState<"image"|"video"|"code"|"link"|"poll"|"file"|"event">(initialTab);

  React.useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [open, initialTab]);
  const charCount = postText.length;
  const MAX_CHARS = 2000;
  const isOverLimit = charCount > MAX_CHARS;
  
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          className="w-full max-w-2xl bg-[#0B0D14] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-white/[0.05]">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                <Layout className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Create a Post</h2>
                <p className="text-sm text-white/50">Share your thoughts, ideas, progress or questions with the DevOS community.</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {/* User Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={avatarUrl} alt={displayName} className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10" />
                <div>
                  <p className="text-sm font-bold text-white">{displayName}</p>
                  <p className="text-xs text-white/50">@user_{userId.slice(0, 5)}</p>
                </div>
              </div>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-xs font-semibold text-white/80">
                <Globe className="w-3.5 h-3.5" /> Public <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {/* Editor Area */}
            <div className="border border-white/10 rounded-xl bg-white/[0.02] flex flex-col focus-within:border-white/30 focus-within:bg-white/[0.04] transition-all">
              <TiptapEditor
                value={postText}
                onChange={setPostText}
                placeholder={"What's on your mind, " + displayName.split(" ")[0] + "?"}
                currentUserId={userId}
                autoFocus
                className="w-full min-h-[120px] p-4 text-sm text-white border-none focus:ring-0 bg-transparent resize-none"
              />
              <div className="flex justify-end p-3">
                <span className={cn("text-xs font-mono", charCount > MAX_CHARS ? "text-red-400" : "text-white/30")}>
                  {charCount}/{MAX_CHARS}
                </span>
              </div>
            </div>

            {/* Media/Tabs Toolbar */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: "image", icon: ImageDown, label: "Image", color: "text-blue-400" },
                { id: "video", icon: Video, label: "Video", color: "text-purple-400" },
                { id: "code", icon: Code2, label: "Code", color: "text-green-400" },
                { id: "link", icon: Link2, label: "Link", color: "text-blue-400" },
                { id: "poll", icon: BarChart2, label: "Poll", color: "text-yellow-400" },
                { id: "file", icon: File, label: "File", color: "text-white/70" },
                { id: "event", icon: Calendar, label: "Event", color: "text-red-400" },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      if (tab.id === "code") setPostType("snippet");
                      else if (tab.id === "poll") setPostType("update");
                      else if (tab.id === "link") setPostType("deployment");
                      else setPostType("update");
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all whitespace-nowrap",
                      isActive
                        ? "bg-white/10 border-white/20 text-white"
                        : "bg-transparent border-white/10 text-white/50 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <tab.icon className={cn("w-4 h-4", tab.color)} />
                    <span className="text-xs font-semibold">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Attachment Area (Dynamic) */}
            <div className="border border-white/10 border-dashed rounded-xl p-6 flex flex-col items-center justify-center bg-white/[0.01] hover:bg-white/[0.03] transition-colors cursor-pointer group">
              {activeTab === "image" && (
                <>
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <ImageDown className="w-5 h-5 text-white/50" />
                  </div>
                  <p className="text-sm text-white font-medium mb-1">Drag and drop files here, or <span className="text-blue-400">click to upload</span></p>
                  <p className="text-xs text-white/40">Supports JPG, PNG, WebP, GIF (max 10MB)</p>
                </>
              )}
              {activeTab === "video" && (
                <>
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Video className="w-5 h-5 text-white/50" />
                  </div>
                  <p className="text-sm text-white font-medium mb-1">Drag and drop a video here, or <span className="text-blue-400">click to upload</span></p>
                  <p className="text-xs text-white/40">Supports MP4, MOV, WebM (max 100MB)</p>
                </>
              )}
              {activeTab === "code" && (
                <div className="w-full text-left">
                  <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3">
                     <span className="text-sm font-semibold text-white/70">TypeScript <ChevronDown className="w-3 h-3 inline ml-1"/></span>
                     <div className="flex items-center gap-2">
                       <span className="text-xs text-white/50">Wrap lines</span>
                       <div className="w-8 h-4 bg-blue-500 rounded-full relative"><div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5" /></div>
                     </div>
                  </div>
                  <pre className="text-sm font-mono text-white/70">
                    <span className="text-blue-400">function</span> <span className="text-yellow-200">greet</span>(name: <span className="text-green-300">string</span>) {'{\n'}
                    {'  '}return <span className="text-orange-300">Hello, !</span>;{'\n'}
                    {'}\n'}
                  </pre>
                </div>
              )}
              {activeTab === "poll" && (
                <div className="w-full space-y-3">
                  <input type="text" placeholder="Option 1" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/30" />
                  <input type="text" placeholder="Option 2" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/30" />
                  <div className="flex items-center justify-between pt-2">
                    <button className="text-blue-400 text-sm font-semibold hover:text-blue-300 transition-colors">+ Add option</button>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/50">Poll duration</span>
                      <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white">7 days <ChevronDown className="w-3 h-3"/></button>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "link" && (
                <div className="w-full">
                  <input type="text" placeholder="Paste a link..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30" />
                </div>
              )}
              {activeTab === "file" && (
                <>
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <File className="w-5 h-5 text-white/50" />
                  </div>
                  <p className="text-sm text-white font-medium mb-1">Drag and drop a file here, or <span className="text-blue-400">click to upload</span></p>
                  <p className="text-xs text-white/40">Supports PDF, Docs, ZIPs and more (max 50MB)</p>
                </>
              )}
              {activeTab === "event" && (
                <div className="w-full space-y-3 text-left">
                  <input type="text" placeholder="Event Title" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/30" />
                  <div className="flex items-center gap-3">
                    <input type="date" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/30" />
                    <input type="time" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/30" />
                  </div>
                </div>
              )}
            </div>
            
            {/* Quick Actions List (Bottom of scrollable area) */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white transition-colors">
                  <Smile className="w-4 h-4" /> Add emoji
                </button>
                <button className="flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white transition-colors">
                  <MapPin className="w-4 h-4" /> Add location
                </button>
                <button className="flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white transition-colors">
                  <Users className="w-4 h-4" /> Tag people
                </button>
              </div>
              <button className="flex items-center gap-1 text-xs font-semibold text-white/50 hover:text-white transition-colors">
                <Settings className="w-4 h-4" /> Advanced options <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Footer Footer */}
          <div className="p-5 border-t border-white/[0.05] flex items-center justify-between bg-black/20">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-all">
              <Bookmark className="w-4 h-4" /> Save draft
            </button>
            
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white/50 hover:text-white transition-all">
                Cancel
              </button>
              <button 
                onClick={onSubmit}
                disabled={isPosting || !postText.trim() || isOverLimit}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)]"
              >
                <Send className="w-4 h-4" /> {isPosting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
/* Feed Item */


const TYPE_COLORS: Record<string, string> = {
  deployment: "bg-green-500/10 text-green-400 border-green-500/20",
  announcement: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  feature: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  update: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  snippet: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  repost: "bg-teal-500/10 text-teal-400 border-teal-500/20",
};

const TYPE_LABEL: Record<string, string> = {
  deployment: "Deployment",
  announcement: "Announcement",
  feature: "Feature",
  update: "Update",
  snippet: "Snippet",
  repost: "Repost",
};

function FeedItem({
  post,
  userId,
  onLike,
  onRepost,
  onComment,
  onDelete,
  onEdit,
  index,
  isAdmin,
}: {
  post: FeedPost;
  userId?: string;
  onLike: (post: FeedPost) => void;
  onRepost: (post: FeedPost, commentary: string) => void;
  onComment: (post: FeedPost, content: string) => void;
  onDelete: (post: FeedPost) => void;
  onEdit?: (postId: string, newContent: string) => void;
  index: number;
  isAdmin?: boolean;
}) {
  const liked = userId ? (post.likedBy?.includes(userId) ?? false) : false;
  const avatarUrl = resolveAvatar(post.avatarUrl || null);

  const [showComments, setShowComments] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [repostText, setRepostText] = useState("");
  const [isReposting, setIsReposting] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
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

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId, post.id);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      toast.error("Failed to delete comment.");
    }
  };

  const handleRepost = async () => {
    setIsReposting(true);
    await onRepost(post, repostText);
    setRepostText("");
    setShowRepostModal(false);
    setIsReposting(false);
  };

  const handleCaptureImage = async () => {
    setShowShareCard(true);
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await captureImage();
    setShowShareCard(false);
  };

  return (
    <>
      {/* Hidden card rendered off-screen for html2canvas capture */}
      {(showShareCard || capturing) && <FeedPostShareCard post={post} cardRef={shareCardRef} />}

      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.045, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "rounded-2xl border p-6 transition-all hover:shadow-lg w-full max-w-full min-w-0 overflow-hidden",
          post.communityId
            ? "border-purple-500/30 hover:border-purple-400/50 bg-gradient-to-br from-purple-600/10 to-purple-500/5 shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20"
            : post.isOfficial
              ? "border-blue-500/30 hover:border-blue-400/50 bg-gradient-to-br from-blue-600/12 via-white/6 to-blue-500/8 shadow-xl shadow-blue-500/15 hover:shadow-blue-500/25"
            : "border-border-base hover:border-white/25 bg-gradient-to-br from-white/8 to-white/3 shadow-xl shadow-black/40"
        )}
      >
      {/* Dev Team banner */}
      {post.communityId && (
        <div className="flex items-center gap-1.5 text-xs text-purple-400/80 mb-3 font-medium">
          <Users className="w-3.5 h-3.5" />
          <span>
            {post.communityName ? (
              <a
                href={post.communitySlug ? `/c/${post.communitySlug}` : `/communities`}
                className="hover:text-purple-300 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {post.communityName}
              </a>
            ) : (
              "Dev Team Post"
            )}
          </span>
        </div>
      )}
      {post.isOfficial && (
        <div className="inline-flex items-center gap-1.5 text-[11px] text-blue-300 bg-blue-500/10 border border-blue-500/25 rounded-full px-2.5 py-1 mb-3 font-semibold">
          <BadgeCheck className="w-3.5 h-3.5" />
          DevOS Official
        </div>
      )}
      {/* Repost header */}
      {post.type === "repost" && (
        <div className="flex items-center gap-1.5 text-xs text-teal-400/70 mb-3 font-medium">
          <Repeat2 className="w-3.5 h-3.5" />
          <span>{post.displayName || post.username} reposted</span>
        </div>
      )}

      {/* Author row */}
      <div className="flex items-start justify-between gap-3 mb-3 min-w-0 max-w-full">
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
            <p className="text-sm font-bold text-white truncate flex items-center gap-1.5 flex-wrap">
              {post.displayName || post.username}
              {post.isOfficial && (
                <span className="text-[10px] bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded-full border border-blue-500/20 font-bold">
                  Official
                </span>
              )}
              {post.authorRole === "company" && (
                <span className="flex items-center gap-0.5 text-[10px] bg-purple-600/20 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-500/20 font-bold">
                  <Building2 className="w-2.5 h-2.5" /> Company
                </span>
              )}
              {(post.authorRole === "company" || post.isOfficial) && (
                <BadgeCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              )}
            </p>
            <p className="text-[11px] text-white/40 truncate">
              @{post.username}
              {post.createdAt && <> · {formatRelativeTime(post.createdAt)}</>}
            </p>
          </div>
        </div>

        {/* Right side: type badge + owner delete */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {post.type !== "repost" && (
            <span
              className={cn(
                "text-[10px] font-bold px-2.5 py-1 rounded-full border",
                TYPE_COLORS[post.type] ?? "bg-white/5 text-white/40 border-border-base"
              )}
            >
              {TYPE_LABEL[post.type] ?? post.type}
            </span>
          )}
          {(userId === post.userId || isAdmin) && (
            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  onClick={() => setIsEditingPost(!isEditingPost)}
                  className="p-1.5 rounded-lg text-white/20 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                  aria-label="Edit post"
                  title="Edit post"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => onDelete(post)}
                className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                aria-label="Delete post"
                title="Delete post"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content (only show if not a silent repost) */}
      {isEditingPost ? (
        <div className="mb-3 space-y-2 border border-white/10 rounded-xl p-2 bg-black/20">
          <TiptapEditor
            value={editContent}
            onChange={setEditContent}
            currentUserId={userId}
            placeholder="Edit post..."
            className="w-full"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (onEdit && editContent.trim() !== post.content) {
                  onEdit(post.id, editContent);
                }
                setIsEditingPost(false);
              }
            }}
          />
          <div className="flex justify-end gap-2 px-1 pb-1">
            <button 
              onClick={() => { setIsEditingPost(false); setEditContent(post.content || ""); }}
              className="text-xs px-3 py-1.5 rounded-lg hover:bg-white/10 text-white/60 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                if (onEdit && editContent.trim() !== post.content) {
                  onEdit(post.id, editContent);
                }
                setIsEditingPost(false);
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      ) : (post.content && (
        <div className="mb-3">
          <ExpandablePost content={post.content} />
        </div>
      ))}

      {/* Attached Images */}
      {post.attachments && post.attachments.length > 0 && (
        <div className={`grid gap-2 mb-3 ${post.attachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {post.attachments.map((url, i) => (
            <img key={i} src={url} alt="attachment" className="w-full rounded-xl border border-border-base object-cover max-h-80" referrerPolicy="no-referrer" />
          ))}
        </div>
      )}

      {/* Embedded original post (for reposts) */}
      {post.type === "repost" && post.originalPost && (
        <div className="rounded-xl border border-border-base bg-gradient-to-br from-white/6 to-white/2 hover:border-border-base transition-all p-4 mb-3 shadow-md shadow-black/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-blue-600/30 flex items-center justify-center flex-shrink-0">
              <Code2 className="w-3.5 h-3.5 text-blue-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white/90 truncate">
                {post.originalPost.displayName || post.originalPost.username}
              </p>
              <p className="text-[10px] text-white/40">@{post.originalPost.username}</p>
            </div>
          </div>
          <div className="text-sm text-white/70 leading-relaxed">
            {post.originalPost.content && (
              <ExpandablePost content={post.originalPost.content} />
            )}
          </div>
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
          href={post.username ? `/@${post.username}` : undefined}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-border-base hover:border-border-base transition-all text-sm text-white/60 hover:text-white w-fit max-w-full mb-3"
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
      <div className="flex items-center gap-1 mt-4 pt-4 border-t border-border-base flex-wrap min-w-0 max-w-full">
        {/* Like */}
        <button
          onClick={() => onLike(post)}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all hover:bg-white/8",
            liked ? "text-red-400" : "text-white/50 hover:text-white/80"
          )}
          aria-label={liked ? "Unlike" : "Like"}
        >
          <Heart className={cn("w-4 h-4", liked && "fill-current")} />
          {(post.likes ?? 0) > 0 && <span>{post.likes}</span>}
        </button>

        {/* Comment toggle */}
        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/8 transition-all"
          aria-label="View comments"
        >
          <MessageCircle className="w-4 h-4" />
          {(post.commentsCount ?? 0) > 0 && <span>{post.commentsCount}</span>}
        </button>

        {/* Repost */}
        <button
          onClick={() => setShowRepostModal(true)}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg text-white/50 hover:text-teal-400 hover:bg-teal-500/10 transition-all"
          aria-label="Repost"
        >
          <Repeat2 className="w-4 h-4" />
          {(post.repostCount ?? 0) > 0 && <span>{post.repostCount}</span>}
        </button>

        {/* Share as Image */}
        <button
          onClick={handleCaptureImage}
          disabled={capturing}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg text-white/50 hover:text-blue-400 hover:bg-blue-500/10 transition-all ml-auto disabled:opacity-50"
          aria-label="Share as image"
          title="Download as image"
        >
          {capturing ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-blue-400 rounded-full animate-spin" />
          ) : (
            <ImageDown className="w-4 h-4" />
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
            <div className="mt-3 pt-3 border-t border-border-base space-y-3">
              {comments.length === 0 ? (
                <p className="text-xs text-white/25 text-center py-2">No comments yet</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5 group">
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
                      <p className="text-xs text-white/60 leading-relaxed break-words [overflow-wrap:anywhere]">{c.content}</p>
                    </div>
                    {userId === c.userId && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 text-red-400/60 hover:text-red-400 transition-all shrink-0 self-start mt-0.5"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))
              )}

              {/* Comment input */}
              {userId && (
                <div className="flex items-center gap-2 pt-1">
                  <MentionInput
                    value={commentText}
                    onChange={setCommentText}
                    currentUserId={userId}
                    placeholder="Write a comment… (@mention someone)"
                    multiline={false}
                    className="flex-1 bg-white/5 border border-border-base rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-border-base transition-colors"
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); } }}
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
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-md bg-card border border-border-base rounded-2xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto flex flex-col"
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
                className="w-full bg-white/5 border border-border-base rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-border-base resize-none mb-3"
              />

              {/* Original post preview */}
              <div className="rounded-xl border border-border-base bg-white/[0.03] p-3 mb-4">
                <p className="text-xs font-semibold text-white/50 mb-1">@{post.username}</p>
                <div className="text-xs leading-relaxed">
                  <ExpandablePost content={post.content} isPreview={true} />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowRepostModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-border-base text-sm text-white/60 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRepost}
                  disabled={isReposting}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold transition-all disabled:opacity-50"
                >
                  {isReposting ? "Reposting…" : "Repost"}
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
      className="w-full text-left rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-border-base transition-all p-4 group"
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




