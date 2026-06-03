import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import {
  Users,
  ArrowLeft,
  Hash,
  Globe,
  Lock,
  Loader2,
  UserPlus,
  UserCheck,
  Heart,
  MessageCircle,
  ShieldAlert,
  Code2,
  Settings,
  ShieldCheck,
  UserMinus,
  Link2,
  Check,
  ToggleLeft,
  ToggleRight,
  Send,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { sendNotification } from "../lib/notificationService";
import { formatRelativeTime } from "../lib/utils";
import { resolveAvatar } from "../lib/avatars";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import ConfirmModal from "../components/ConfirmModal";
import GroupChat from "../components/GroupChat";
import { Community, CommunityMember, FeedPost, CommunityChatMessage } from "../types";
import {
  getCommunityBySlug,
  subscribeCommunity,
  subscribeMembership,
  subscribeCommunityMembers,
  subscribeCommunityFeed,
  joinCommunity,
  leaveCommunity,
  removeMember,
  updateMemberRole,
  updateCommunity,
  subscribeChatMessages,
  sendChatMessage,
  deleteChatMessage,
} from "../lib/communityService";
import {
  createFeedPost,
  likePost,
  unlikePost,
  deletePost,
} from "../lib/feedService";
import { useSEO } from "../hooks/useSEO";
import ImageUpload from "../components/ImageUpload";
import { uploadImage, communityAvatarPath, communityBannerPath } from "../lib/storageService";
import { getSiteConfig, SITE_CONFIG_DEFAULTS } from "../lib/creditsService";
import { useVoiceCall } from "../hooks/useVoiceCall";
import { getUserSettings } from "../lib/userService";

type CommunityTab = "posts" | "members" | "chat" | "settings";

// ─── Mini post composer ───────────────────────────────────────────────────────
interface ComposerProps {
  communityId: string;
  communityName?: string;
  communitySlug?: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  onPosted: () => void;
}

function PostComposer({ communityId, communityName, communitySlug, userId, username, displayName, avatarUrl, onPosted }: ComposerProps) {
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handlePost = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPosting(true);
    try {
      await createFeedPost({
        userId,
        username,
        displayName,
        avatarUrl,
        content: trimmed,
        type: "update",
        isPublic: true,
        communityId,
        communityName,
        communitySlug,
      });
      setText("");
      toast.success("Post shared to dev team!");
      onPosted();
    } catch {
      toast.error("Failed to post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 mb-4 backdrop-blur-sm">
      <div className="flex gap-3">
        <img src={resolveAvatar(avatarUrl)} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5 ring-2 ring-white/10" />
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share something with this dev team…"
            rows={2}
            maxLength={1000}
            className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] transition-all placeholder-white/25"
          />
          <div className="flex items-center justify-end mt-2 gap-2">
            <span className="text-[11px] text-white/20">{text.length}/1000</span>
            <button
              onClick={handlePost}
              disabled={posting || !text.trim()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                posting || !text.trim()
                  ? "bg-white/5 text-white/25 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95 shadow-md shadow-indigo-500/20"
              )}
            >
              {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Feed post item ───────────────────────────────────────────────────────────
interface PostItemProps {
  post: FeedPost;
  currentUserId?: string;
  isAdmin: boolean;
  onDeleted: (id: string) => void;
}

function PostItem({ post, currentUserId, isAdmin, onDeleted }: PostItemProps) {
  const [liked, setLiked] = useState(currentUserId ? (post.likedBy ?? []).includes(currentUserId) : false);
  const [likeCount, setLikeCount] = useState(post.likes ?? 0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete = currentUserId === post.userId || isAdmin;

  const handleLike = async () => {
    if (!currentUserId) return;
    try {
      if (liked) {
        await unlikePost(post.id, currentUserId);
        setLiked(false);
        setLikeCount((n) => Math.max(0, n - 1));
      } else {
        await likePost(post.id, currentUserId);
        setLiked(true);
        setLikeCount((n) => n + 1);
      }
    } catch { /* noop */ }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePost(post.id);
      onDeleted(post.id);
      toast.success("Post deleted");
    } catch {
      toast.error("Failed to delete post");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.14] rounded-2xl p-4 transition-all backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <Link to={`/@${post.username}`}>
          <img src={resolveAvatar(post.avatarUrl)} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-white/10" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <Link to={`/@${post.username}`} className="text-sm font-bold text-white hover:text-indigo-400 transition-colors truncate">
                {post.displayName || post.username}
              </Link>
              <span className="text-[11px] text-white/25 shrink-0">·</span>
              <span className="text-[11px] text-white/25 shrink-0">{formatRelativeTime(post.createdAt)}</span>
            </div>
            {canDelete && (
              <button onClick={() => setConfirmDelete(true)} className="text-white/20 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <p className="text-sm text-white/75 leading-relaxed mb-3 whitespace-pre-wrap break-words">{post.content}</p>

          {post.projectName && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 w-fit">
              <Code2 className="w-3.5 h-3.5" />
              {post.projectName}
            </div>
          )}

          <div className="flex items-center gap-4 text-white/30 text-xs pt-2.5 border-t border-white/[0.05]">
            <button
              onClick={handleLike}
              disabled={!currentUserId}
              className={cn("flex items-center gap-1.5 transition-colors hover:text-rose-400 disabled:cursor-not-allowed", liked && "text-rose-400")}
            >
              <Heart className={cn("w-3.5 h-3.5", liked && "fill-current")} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>
            <div className="flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" />
              {(post.commentsCount ?? 0) > 0 && <span>{post.commentsCount}</span>}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="Delete Post"
        description="Are you sure you want to delete this post? This cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

// ─── Member row ───────────────────────────────────────────────────────────────
interface MemberRowProps {
  member: CommunityMember;
  communityId: string;
  communityName?: string;
  currentUserRole?: CommunityMemberRole | null;
  currentUserId?: string;
  onRemoved: (userId: string) => void;
  onRoleChanged: (userId: string, newRole: CommunityMemberRole) => void;
}

type CommunityMemberRole = "member" | "moderator" | "admin";

function MemberRow({ member, communityId, communityName, currentUserRole, currentUserId, onRemoved, onRoleChanged }: MemberRowProps) {
  const [userData, setUserData] = useState<{ username?: string; displayName?: string; avatarUrl?: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "users", member.userId), (snap) => {
      if (snap.exists()) setUserData(snap.data() as any);
    });
    return unsub;
  }, [member.userId]);

  const canRemove =
    (currentUserRole === "admin" || currentUserRole === "moderator") &&
    currentUserId !== member.userId &&
    member.role !== "admin";

  const canPromote =
    currentUserRole === "admin" &&
    currentUserId !== member.userId &&
    member.role === "member";

  const canDemote =
    currentUserRole === "admin" &&
    currentUserId !== member.userId &&
    member.role === "moderator";

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await removeMember(communityId, member.userId);
      onRemoved(member.userId);
      toast.success("Member removed");
      sendNotification({ userId: member.userId, type: "community_moderated", title: "Removed from dev team", message: `You were removed from ${communityName ?? "the dev team"}.`, createdBy: "system" }).catch(() => {});
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setRemoving(false);
    }
  };

  const handleRoleChange = async (newRole: CommunityMemberRole) => {
    setUpdatingRole(true);
    try {
      await updateMemberRole(communityId, member.userId, newRole);
      onRoleChanged(member.userId, newRole);
      toast.success(newRole === "moderator" ? "Promoted to moderator" : "Demoted to member");
    } catch {
      toast.error("Failed to update role");
    } finally {
      setUpdatingRole(false);
    }
  };

  const roleColors: Record<CommunityMemberRole, string> = {
    admin: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    moderator: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    member: "text-white/30 bg-white/5 border-border-base",
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-border-base last:border-0">
      <div className="flex items-center gap-3">
        <Link to={userData?.username ? `/@${userData.username}` : "#"}>
          <img src={resolveAvatar(userData?.avatarUrl)} alt="" className="w-9 h-9 rounded-full object-cover" />
        </Link>
        <div>
          <p className="text-sm font-semibold text-white">
            {userData?.displayName || userData?.username || member.userId.slice(0, 8)}
          </p>
          {userData?.username && <p className="text-xs text-white/30">@{userData.username}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border", roleColors[member.role])}>
          {member.role}
        </span>
        {canPromote && (
          <button
            onClick={() => handleRoleChange("moderator")}
            disabled={updatingRole}
            title="Promote to moderator"
            className="text-white/20 hover:text-blue-400 transition-colors p-1.5 rounded-lg hover:bg-blue-500/10"
          >
            {updatingRole ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          </button>
        )}
        {canDemote && (
          <button
            onClick={() => handleRoleChange("member")}
            disabled={updatingRole}
            title="Demote to member"
            className="text-white/20 hover:text-orange-400 transition-colors p-1.5 rounded-lg hover:bg-orange-500/10"
          >
            {updatingRole ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
          </button>
        )}
        {canRemove && (
          <button
            onClick={handleRemove}
            disabled={removing}
            title="Remove member"
            className="text-white/20 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
          >
            {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CommunityPage() {
  const { slug } = useParams<{ slug: string }>();
  const [user] = useAuthState(auth);
  const navigate = useNavigate();

  const [community, setCommunity] = useState<Community | null>(null);
  const [membership, setMembership] = useState<CommunityMember | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [chatMessages, setChatMessages] = useState<CommunityChatMessage[]>([]);
  const [siteConfig, setSiteConfig] = useState(SITE_CONFIG_DEFAULTS);
  const [userSettings, setUserSettings] = useState<{ username?: string; displayName?: string; avatarUrl?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<CommunityTab>("posts");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Settings form state
  const [settingsName, setSettingsName] = useState("");
  const [settingsDescription, setSettingsDescription] = useState("");
  const [settingsCategory, setSettingsCategory] = useState("");
  const [settingsAvatar, setSettingsAvatar] = useState("");
  const [settingsBanner, setSettingsBanner] = useState("");
  const [settingsIsPublic, setSettingsIsPublic] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  useSEO({
    title: community ? `${community.name} — DevOS` : "Dev Team — DevOS",
    description: community?.description,
  });

  // Load community by slug
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getCommunityBySlug(slug).then((c) => {
      if (!c) { navigate("/communities"); return; }
      setCommunity(c);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug, navigate]);

  // Subscribe to live community updates once we have the id
  useEffect(() => {
    if (!community?.id) return;
    return subscribeCommunity(community.id, (c) => { if (c) setCommunity(c); });
  }, [community?.id]);

  // Subscribe to membership
  useEffect(() => {
    if (!community?.id || !user) return;
    return subscribeMembership(community.id, user.uid, setMembership);
  }, [community?.id, user]);

  // Subscribe to feed
  useEffect(() => {
    if (!community?.id) return;
    return subscribeCommunityFeed(community.id, setPosts);
  }, [community?.id]);

  // Subscribe to members
  useEffect(() => {
    if (!community?.id || activeTab !== "members") return;
    return subscribeCommunityMembers(community.id, setMembers);
  }, [community?.id, activeTab]);

  const isMember = !!membership;
  const memberRole = membership?.role ?? null;

  // Subscribe to chat when on chat tab and is a member
  useEffect(() => {
    if (!community?.id || activeTab !== "chat" || !isMember || community.chatEnabled === false) return;
    return subscribeChatMessages(community.id, setChatMessages);
  }, [community?.id, activeTab, isMember, community?.chatEnabled]);

  useEffect(() => {
    getSiteConfig().then(setSiteConfig).catch(() => {});
  }, []);

  // Load current user settings
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setUserSettings(snap.data() as any);
    });
    return unsub;
  }, [user]);

  // Voice call — must be called unconditionally before any early returns
  const roomId = community?.id ? `community-${community.id}` : null;
  const voiceDisplayName = userSettings?.displayName || userSettings?.username || "User";
  const { inVoiceCall, callParticipants, muted, joinOrStartCall, endCall: endVoiceCall, toggleMute } = useVoiceCall(roomId, user?.uid, voiceDisplayName);

  // Sync settings form when community loads or settings tab is opened
  useEffect(() => {
    if (!community || activeTab !== "settings") return;
    setSettingsName(community.name);
    setSettingsDescription(community.description);
    setSettingsCategory(community.category ?? "");
    setSettingsAvatar(community.avatar ?? "");
    setSettingsBanner(community.banner ?? "");
    setSettingsIsPublic(community.isPublic);
  }, [community, activeTab]);

  // Switch away from the chat tab if chat gets disabled while user is on it
  useEffect(() => {
    if (community?.chatEnabled === false && activeTab === "chat") {
      setActiveTab("posts");
    }
  }, [community?.chatEnabled, activeTab]);

  const handleSaveSettings = async () => {
    if (!community) return;
    const trimmedName = settingsName.trim();
    if (!trimmedName) { toast.error("Dev Team name is required"); return; }
    setSavingSettings(true);
    try {
      await updateCommunity(community.id, {
        name: trimmedName,
        description: settingsDescription.trim(),
        category: settingsCategory.trim() || undefined,
        avatar: settingsAvatar.trim(),
        banner: settingsBanner.trim(),
        isPublic: settingsIsPublic,
      });
      toast.success("Dev Team settings saved!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAvatarFile = async (file: File) => {
    if (!community) return;
    setAvatarUploading(true);
    try {
      const url = await uploadImage(file, communityAvatarPath(community.id, file));
      setSettingsAvatar(url);
      toast.success("Avatar uploaded!");
    } catch (err: any) {
      toast.error("Avatar upload failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleBannerFile = async (file: File) => {
    if (!community) return;
    setBannerUploading(true);
    try {
      const url = await uploadImage(file, communityBannerPath(community.id, file));
      setSettingsBanner(url);
      toast.success("Banner uploaded!");
    } catch (err: any) {
      toast.error("Banner upload failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setBannerUploading(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !community) return;
    setJoining(true);
    try {
      await joinCommunity(community.id, user.uid);
      toast.success(`Joined ${community.name}!`);
      sendNotification({ userId: user.uid, type: "community_join", title: "Joined dev team", message: `You joined ${community.name}.`, createdBy: "system" }).catch(() => {});
    } catch {
      toast.error("Failed to join");
    } finally {
      setJoining(false);
    }
  };

  const copyCommunityLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/c/${slug}`).then(() => {
      setLinkCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const handleLeave = async () => {
    if (!user || !community) return;
    setJoining(true);
    try {
      await leaveCommunity(community.id, user.uid);
      toast.success(`Left ${community.name}`);
      sendNotification({ userId: user.uid, type: "community_join", title: "Left dev team", message: `You left ${community.name}.`, createdBy: "system" }).catch(() => {});
    } catch {
      toast.error("Failed to leave");
    } finally {
      setJoining(false);
    }
  };

  const handleSendChat = async (text: string, replyToId?: string, replyToText?: string, replyToUsername?: string) => {
    if (!user || !community?.id || community.chatEnabled === false) return;
    try {
      await sendChatMessage({
        communityId: community.id,
        userId: user.uid,
        username: userSettings?.username || user.email?.split("@")[0] || "user",
        displayName: userSettings?.displayName || user.displayName || undefined,
        avatarUrl: userSettings?.avatarUrl || user.photoURL || undefined,
        text,
        replyToId,
        replyToText,
        replyToUsername,
      });
    } catch {
      toast.error("Failed to send message.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-white/30 text-sm">Loading dev team…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!community) return null;

  const tabs: { id: CommunityTab; label: string; count?: number; icon?: React.ReactNode }[] = [
    { id: "posts", label: "Posts", count: posts.length },
    ...(community.chatEnabled === false ? [] : [{ id: "chat" as CommunityTab, label: "Chat", count: undefined }]),
    { id: "members", label: "Members", count: community.memberCount },
    ...(memberRole === "admin" ? [{ id: "settings" as CommunityTab, label: "Settings", icon: <Settings className="w-3.5 h-3.5" /> }] : []),
  ];

  return (
    <div className="min-h-screen bg-base text-white flex flex-col">
      <Navbar />

      {/* Hero banner */}
      <div className="relative h-40 md:h-52 overflow-hidden bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-transparent">
        {community.banner ? (
          <img src={community.banner} alt="" className="w-full h-full object-cover opacity-30" />
        ) : (
          <>
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-600/10 blur-3xl" />
            <div className="absolute top-10 left-1/4 w-48 h-48 rounded-full bg-purple-600/10 blur-2xl" />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/20 to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 pb-20 md:pb-8 -mt-14 relative z-10">
        {/* Community header */}
        <div className="relative mb-6 flex flex-col sm:flex-row sm:items-end gap-4">
          {/* Avatar */}
          <div className="w-22 h-22 w-[88px] h-[88px] rounded-2xl bg-surface border-4 border-[#0a0a0f] flex items-center justify-center overflow-hidden shadow-2xl shrink-0 ring-1 ring-white/10">
            {community.avatar ? (
              <img src={community.avatar} alt={community.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-600/30 to-purple-600/30 flex items-center justify-center">
                <Hash className="w-10 h-10 text-indigo-400" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pb-1">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap mb-1">
                  <h1 className="text-2xl font-black text-white tracking-tight">{community.name}</h1>
                  {!community.isPublic
                    ? <span className="flex items-center gap-1 text-[11px] text-white/40 bg-white/5 border border-border-base px-2 py-0.5 rounded-full"><Lock className="w-3 h-3" />Private</span>
                    : <span className="flex items-center gap-1 text-[11px] text-indigo-400/70 bg-indigo-500/5 border border-indigo-500/20 px-2 py-0.5 rounded-full"><Globe className="w-3 h-3" />Public</span>
                  }
                </div>
                <div className="flex items-center gap-3 text-sm text-white/40 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-400/60" />
                    <span className="font-semibold text-white/60">{community.memberCount.toLocaleString()}</span> members
                  </span>
                  {community.category && (
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-semibold text-indigo-400 capitalize">
                      {community.category}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link to="/communities" className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-border-base">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </Link>
                {/* Copy link */}
                <button
                  onClick={copyCommunityLink}
                  title="Copy dev team link"
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-border-base"
                >
                  {linkCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Link2 className="w-3.5 h-3.5" />}
                </button>
                {user && (
                  <button
                    onClick={isMember ? handleLeave : handleJoin}
                    disabled={joining}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all",
                      isMember
                        ? "bg-white/5 text-white/50 hover:bg-red-500/10 hover:text-red-400 border border-border-base hover:border-red-500/20"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95 shadow-lg shadow-indigo-500/20 border border-indigo-500/30"
                    )}
                  >
                    {joining ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isMember ? (
                      <><UserCheck className="w-4 h-4" />Joined</>
                    ) : (
                      <><UserPlus className="w-4 h-4" />Join</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {community.description && (
          <p className="text-white/45 text-sm leading-relaxed mb-6 max-w-2xl">{community.description}</p>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/[0.07] mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-2 -mb-px",
                activeTab === tab.id
                  ? "text-indigo-400 border-indigo-500"
                  : "text-white/35 border-transparent hover:text-white/60"
              )}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold", activeTab === tab.id ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-white/25")}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === "posts" && (
            <motion.div key="posts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Composer — members only */}
              {user && isMember && userSettings?.username && (
                <PostComposer
                  communityId={community.id}
                  communityName={community.name}
                  communitySlug={community.slug}
                  userId={user.uid}
                  username={userSettings.username}
                  displayName={userSettings.displayName}
                  avatarUrl={userSettings.avatarUrl}
                  onPosted={() => {}}
                />
              )}
              {!user && (
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 mb-4 text-center">
                  <p className="text-white/40 text-sm mb-3">Sign in to post in this dev team</p>
                  <Link to="/" className="text-indigo-400 text-sm font-semibold hover:text-indigo-300 transition-colors">Sign in →</Link>
                </div>
              )}
              {user && !isMember && (
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 mb-4 text-center">
                  <p className="text-white/40 text-sm mb-3">Join this dev team to post</p>
                  <button onClick={handleJoin} disabled={joining} className="text-indigo-400 text-sm font-semibold hover:text-indigo-300 transition-colors">
                    Join Dev Team →
                  </button>
                </div>
              )}

              {posts.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-7 h-7 text-white/15" />
                  </div>
                  <p className="text-white/40 font-semibold mb-1">No posts yet</p>
                  <p className="text-white/20 text-sm">Be the first to share something!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.map((post) => (
                    <PostItem
                      key={post.id}
                      post={post}
                      currentUserId={user?.uid}
                      isAdmin={memberRole === "admin" || memberRole === "moderator"}
                      onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "members" && (
            <motion.div key="members" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {members.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center mx-auto mb-4">
                    <Users className="w-7 h-7 text-white/15" />
                  </div>
                  <p className="text-white/40 font-semibold">No members loaded yet</p>
                </div>
              ) : (
                <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl px-4 divide-y divide-white/[0.05] backdrop-blur-sm">
                  {members.map((m) => (
                    <MemberRow
                      key={m.userId}
                      member={m}
                      communityId={community.id}
                      communityName={community.name}
                      currentUserRole={memberRole}
                      currentUserId={user?.uid}
                      onRemoved={(id) => setMembers((prev) => prev.filter((x) => x.userId !== id))}
                      onRoleChanged={(id, newRole) =>
                        setMembers((prev) => prev.map((x) => x.userId === id ? { ...x, role: newRole } : x))
                      }
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "chat" && community.chatEnabled !== false && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/30">Community Chat</span>
                <Link
                  to={`/c/${community.slug}/chat`}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Open full chat page
                </Link>
              </div>
              <GroupChat
                messages={chatMessages}
                currentUserId={user?.uid}
                currentAvatarUrl={userSettings?.avatarUrl}
                accentColor="indigo"
                onSend={handleSendChat}
                onDelete={(msgId) => community?.id && deleteChatMessage(community.id, msgId)}
                canDelete={(msg) => msg.userId === user?.uid || memberRole === "admin" || memberRole === "moderator"}
                voiceCallEnabled={(community.voiceCallsEnabled ?? true) && siteConfig.allowVoiceCalls}
                callParticipants={callParticipants}
                inVoiceCall={inVoiceCall}
                muted={muted}
                onJoinOrStartCall={joinOrStartCall}
                onLeaveCall={endVoiceCall}
                onToggleMute={toggleMute}
                emptyLabel="No messages yet. Say hello! 👋"
                notMemberLabel="Join the community to chat."
                isMember={isMember}
                onJoin={handleJoin}
                joining={joining}
              />
            </div>
          )}

          {activeTab === "settings" && memberRole === "admin" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 space-y-5 backdrop-blur-sm">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Settings className="w-4 h-4 text-indigo-400/70" />
                  Community Settings
                </h2>

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">Name</label>
                  <input
                    type="text"
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                    maxLength={100}
                    placeholder="Community name"
                    className="w-full bg-white/5 border border-border-base rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">Description</label>
                  <textarea
                    value={settingsDescription}
                    onChange={(e) => setSettingsDescription(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="What is this community about?"
                    className="w-full bg-white/5 border border-border-base rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">Category</label>
                  <input
                    type="text"
                    value={settingsCategory}
                    onChange={(e) => setSettingsCategory(e.target.value)}
                    maxLength={50}
                    placeholder="e.g. Web Dev, AI/ML, Gaming…"
                    className="w-full bg-white/5 border border-border-base rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>

                <div className="space-y-3 border-t border-border-base pt-4">
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Realtime</h3>
                  <ToggleRow
                    label="Group chat"
                    description={(community.chatEnabled ?? true) ? "Members can chat in this community." : "Community chat is disabled."}
                    enabled={community.chatEnabled ?? true}
                    onToggle={async () => {
                      try {
                        await updateCommunity(community.id, { chatEnabled: !(community.chatEnabled ?? true) });
                      } catch {
                        toast.error("Failed to update chat setting.");
                      }
                    }}
                  />
                  <ToggleRow
                    label="Voice calls"
                    description={(community.voiceCallsEnabled ?? true) ? "Members can start voice calls." : "Voice calls are disabled for this community."}
                    enabled={community.voiceCallsEnabled ?? true}
                    onToggle={async () => {
                      try {
                        await updateCommunity(community.id, { voiceCallsEnabled: !(community.voiceCallsEnabled ?? true) });
                      } catch {
                        toast.error("Failed to update voice call setting.");
                      }
                    }}
                  />
                </div>

                {/* Avatar */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">Community Avatar</label>
                  <div className="flex items-center gap-4">
                    <ImageUpload
                      shape="circle"
                      value={settingsAvatar}
                      onFile={handleAvatarFile}
                      onRemove={() => setSettingsAvatar("")}
                      uploading={avatarUploading}
                      maxSizeMB={3}
                    />
                    <p className="text-xs text-white/30">Drop or click to upload · max 3 MB</p>
                  </div>
                </div>

                {/* Banner */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">Community Banner</label>
                  <ImageUpload
                    shape="banner"
                    value={settingsBanner}
                    onFile={handleBannerFile}
                    onRemove={() => setSettingsBanner("")}
                    uploading={bannerUploading}
                    maxSizeMB={8}
                    label="Drop banner image or click to upload"
                    hint="JPG, PNG, WEBP — recommended 1500×500 px"
                  />
                </div>

                {/* Visibility */}
                <div className="flex items-center justify-between py-3.5 px-4 bg-white/[0.03] border border-white/[0.07] rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-white">Public community</p>
                    <p className="text-xs text-white/30 mt-0.5">Anyone can discover and join this community</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettingsIsPublic((v) => !v)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0",
                      settingsIsPublic ? "bg-indigo-600" : "bg-white/10"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                        settingsIsPublic ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>

                {/* Save */}
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings || !settingsName.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-md shadow-indigo-500/20"
                >
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {savingSettings ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

function ToggleRow({ label, description, enabled, onToggle }: { label: string; description: string; enabled: boolean; onToggle: () => void; }) {
  return (
    <div className="flex items-center justify-between py-3.5 px-4 bg-white/[0.03] border border-white/[0.07] rounded-xl">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-white/30 mt-0.5">{description}</p>
      </div>
      <button type="button" onClick={onToggle} className="text-white/60 hover:text-white transition-colors">
        {enabled ? <ToggleRight className="w-7 h-7 text-indigo-400" /> : <ToggleLeft className="w-7 h-7 text-white/30" />}
      </button>
    </div>
  );
}
