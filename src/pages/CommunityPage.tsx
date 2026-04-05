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
  Send,
  Heart,
  MessageCircle,
  Repeat2,
  MoreHorizontal,
  Trash2,
  ShieldAlert,
  Code2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { formatRelativeTime } from "../lib/utils";
import { resolveAvatar } from "../lib/avatars";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import ConfirmModal from "../components/ConfirmModal";
import { Community, CommunityMember, FeedPost } from "../types";
import {
  getCommunityBySlug,
  subscribeCommunity,
  subscribeMembership,
  subscribeCommunityMembers,
  subscribeCommunityFeed,
  joinCommunity,
  leaveCommunity,
  removeMember,
} from "../lib/communityService";
import {
  createFeedPost,
  likePost,
  unlikePost,
  deletePost,
} from "../lib/feedService";
import { useSEO } from "../hooks/useSEO";

type CommunityTab = "posts" | "members";

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
      toast.success("Post shared to community!");
      onPosted();
    } catch {
      toast.error("Failed to post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="bg-[#111827] border border-white/10 rounded-2xl p-4 mb-4">
      <div className="flex gap-3">
        <img src={resolveAvatar(avatarUrl)} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5" />
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share something with this community…"
            rows={2}
            maxLength={1000}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-blue-500 transition-all placeholder-white/30"
          />
          <div className="flex items-center justify-end mt-2 gap-2">
            <span className="text-[11px] text-white/25">{text.length}/1000</span>
            <button
              onClick={handlePost}
              disabled={posting || !text.trim()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                posting || !text.trim()
                  ? "bg-white/5 text-white/30 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white active:scale-95"
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
    <div className="bg-[#111827] border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all">
      <div className="flex items-start gap-3">
        <Link to={`/u/${post.username}`}>
          <img src={resolveAvatar(post.avatarUrl)} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <Link to={`/u/${post.username}`} className="text-sm font-bold text-white hover:text-blue-400 transition-colors truncate">
                {post.displayName || post.username}
              </Link>
              <span className="text-xs text-white/30 shrink-0">{formatRelativeTime(post.createdAt)}</span>
            </div>
            {canDelete && (
              <button onClick={() => setConfirmDelete(true)} className="text-white/20 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10 shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <p className="text-sm text-white/80 leading-relaxed mb-3 whitespace-pre-wrap break-words">{post.content}</p>

          {post.projectName && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-white/50 w-fit">
              <Code2 className="w-3.5 h-3.5" />
              {post.projectName}
            </div>
          )}

          <div className="flex items-center gap-4 text-white/30 text-xs">
            <button
              onClick={handleLike}
              disabled={!currentUserId}
              className={cn("flex items-center gap-1.5 transition-colors hover:text-red-400", liked && "text-red-400")}
            >
              <Heart className={cn("w-3.5 h-3.5", liked && "fill-current")} />
              {likeCount > 0 && likeCount}
            </button>
            <div className="flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" />
              {(post.commentsCount ?? 0) > 0 && post.commentsCount}
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
  currentUserRole?: CommunityMemberRole | null;
  currentUserId?: string;
  onRemoved: (userId: string) => void;
}

type CommunityMemberRole = "member" | "moderator" | "admin";

function MemberRow({ member, communityId, currentUserRole, currentUserId, onRemoved }: MemberRowProps) {
  const [userData, setUserData] = useState<{ username?: string; displayName?: string; avatarUrl?: string } | null>(null);
  const [removing, setRemoving] = useState(false);

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

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await removeMember(communityId, member.userId);
      onRemoved(member.userId);
      toast.success("Member removed");
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setRemoving(false);
    }
  };

  const roleColors: Record<CommunityMemberRole, string> = {
    admin: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    moderator: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    member: "text-white/30 bg-white/5 border-white/10",
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <Link to={userData?.username ? `/u/${userData.username}` : "#"}>
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
        {canRemove && (
          <button
            onClick={handleRemove}
            disabled={removing}
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
  const [userSettings, setUserSettings] = useState<{ username?: string; displayName?: string; avatarUrl?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<CommunityTab>("posts");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useSEO({
    title: community ? `${community.name} — DevOS` : "Community — DevOS",
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

  // Load current user settings
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setUserSettings(snap.data() as any);
    });
    return unsub;
  }, [user]);

  const handleJoin = async () => {
    if (!user || !community) return;
    setJoining(true);
    try {
      await joinCommunity(community.id, user.uid);
      toast.success(`Joined ${community.name}!`);
    } catch {
      toast.error("Failed to join");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!user || !community) return;
    setJoining(true);
    try {
      await leaveCommunity(community.id, user.uid);
      toast.success(`Left ${community.name}`);
    } catch {
      toast.error("Failed to leave");
    } finally {
      setJoining(false);
    }
  };

  const isMember = !!membership;
  const memberRole = membership?.role ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!community) return null;

  const tabs: { id: CommunityTab; label: string; count?: number }[] = [
    { id: "posts", label: "Posts", count: posts.length },
    { id: "members", label: "Members", count: community.memberCount },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      {/* Banner */}
      <div className="relative h-36 md:h-48 bg-gradient-to-br from-blue-600/30 via-purple-600/20 to-transparent overflow-hidden">
        {community.banner ? (
          <img src={community.banner} alt="" className="w-full h-full object-cover opacity-40" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-indigo-900/20 to-transparent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 pb-20 md:pb-8">
        {/* Community header card */}
        <div className="relative -mt-12 mb-6 flex flex-col sm:flex-row sm:items-end gap-4">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-[#111827] border-4 border-[#0a0a0a] flex items-center justify-center overflow-hidden shadow-xl shrink-0">
            {community.avatar ? (
              <img src={community.avatar} alt={community.name} className="w-full h-full object-cover" />
            ) : (
              <Hash className="w-9 h-9 text-blue-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-black text-white truncate">{community.name}</h1>
                  {!community.isPublic && <Lock className="w-4 h-4 text-white/30 shrink-0" />}
                </div>
                <div className="flex items-center gap-3 text-sm text-white/40 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {community.memberCount.toLocaleString()} members
                  </span>
                  {community.category && (
                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold">
                      {community.category}
                    </span>
                  )}
                </div>
              </div>

              <div className="sm:ml-auto flex items-center gap-2">
                <Link to="/communities" className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-2 rounded-xl hover:bg-white/5">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </Link>
                {user && (
                  <button
                    onClick={isMember ? handleLeave : handleJoin}
                    disabled={joining}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all",
                      isMember
                        ? "bg-white/5 text-white/60 hover:bg-red-500/10 hover:text-red-400 border border-white/10"
                        : "bg-blue-600 hover:bg-blue-700 text-white active:scale-95"
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
          <p className="text-white/50 text-sm leading-relaxed mb-6 max-w-2xl">{community.description}</p>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/10 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-2 -mb-px",
                activeTab === tab.id
                  ? "text-blue-400 border-blue-500"
                  : "text-white/40 border-transparent hover:text-white/70"
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold", activeTab === tab.id ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-white/30")}>
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
                <div className="bg-[#111827] border border-white/5 rounded-2xl p-5 mb-4 text-center">
                  <p className="text-white/40 text-sm mb-3">Sign in to post in this community</p>
                  <Link to="/" className="text-blue-400 text-sm font-semibold hover:text-blue-300 transition-colors">Sign in →</Link>
                </div>
              )}
              {user && !isMember && (
                <div className="bg-[#111827] border border-white/5 rounded-2xl p-5 mb-4 text-center">
                  <p className="text-white/40 text-sm mb-3">Join this community to post</p>
                  <button onClick={handleJoin} disabled={joining} className="text-blue-400 text-sm font-semibold hover:text-blue-300 transition-colors">
                    Join Community →
                  </button>
                </div>
              )}

              {posts.length === 0 ? (
                <div className="text-center py-16">
                  <MessageCircle className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-white/40 font-semibold mb-1">No posts yet</p>
                  <p className="text-white/25 text-sm">Be the first to share something!</p>
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
                <div className="text-center py-16">
                  <Users className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-white/40 font-semibold">No members loaded yet</p>
                </div>
              ) : (
                <div className="bg-[#111827] border border-white/10 rounded-2xl px-4 divide-y divide-white/5">
                  {members.map((m) => (
                    <MemberRow
                      key={m.userId}
                      member={m}
                      communityId={community.id}
                      currentUserRole={memberRole}
                      currentUserId={user?.uid}
                      onRemoved={(id) => setMembers((prev) => prev.filter((x) => x.userId !== id))}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
