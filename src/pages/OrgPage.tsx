import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useActiveContext } from "../hooks/useActiveContext";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../lib/firebase";
import { doc, onSnapshot, addDoc, collection, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import {
  getOrgBySlug,
  subscribeOrg,
  subscribeOrgMembers,
  getOrgMember,
  joinOrg,
  leaveOrg,
  updateMemberRole,
  requestJoinOrg,
  approveJoinRequest,
  rejectJoinRequest,
  subscribeJoinRequests,
  updateOrgJoinPolicy,
  updateOrg,
  subscribeOrgChatMessages,
  sendOrgChatMessage,
  deleteOrgChatMessage,
  setOrgChatEnabled,
} from "../lib/orgService";
import { getUserSettings } from "../lib/userService";
import GroupChat from "../components/GroupChat";
import { Organization, OrgMember, OrgJoinRequest, OrgChatMessage, Project } from "../types";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import { buildOrgUrl, PRODUCT_BRAND_NAME } from "../lib/brand";
import { resolveAvatar } from "../lib/avatars";
import { toast } from "sonner";
import { sendNotification } from "../lib/notificationService";
import { createFeedPost, likePost, unlikePost, deletePost } from "../lib/feedService";
import { subscribeCommunityFeed } from "../lib/communityService";
import { FeedPost } from "../types";
import { deductCredits, CREDIT_COSTS } from "../lib/creditsService";
import { TEMPLATES } from "../constants/templates";
import {
  Users,
  Building2,
  Globe,
  Lock,
  UserPlus,
  LogOut,
  Shield,
  ChevronDown,
  Settings,
  Link2,
  Check,
  UserCheck,
  X,
  ToggleLeft,
  ToggleRight,
  Send,
  Trash2,
  MessageCircle,
  Heart,
  Code2,
  Loader2,
  FolderPlus,
  FolderCode,
  MessageSquare,
  Phone,
} from "lucide-react";
import { formatRelativeTime, formatTime } from "../lib/utils";
import { cn } from "../lib/utils";
import { renderDevosEmojiText } from "../lib/devosEmoji";
import { getSiteConfig, SITE_CONFIG_DEFAULTS } from "../lib/creditsService";
import { useVoiceCall } from "../hooks/useVoiceCall";

type OrgTab = "overview" | "posts" | "chat" | "members" | "projects" | "settings";

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  moderator: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  member: "bg-gray-700 text-gray-400 border border-gray-600",
};

export default function OrgPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const { setOrgContext } = useActiveContext();

  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [myMember, setMyMember] = useState<OrgMember | null>(null);
  const [joinRequests, setJoinRequests] = useState<OrgJoinRequest[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [chatMessages, setChatMessages] = useState<OrgChatMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [userSettings, setUserSettings] = useState<{ username?: string; displayName?: string; avatarUrl?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [activeTab, setActiveTab] = useState<OrgTab>("overview");
  const [linkCopied, setLinkCopied] = useState(false);
  const [togglingPolicy, setTogglingPolicy] = useState(false);
  const [togglingChat, setTogglingChat] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [orgProjects, setOrgProjects] = useState<Project[]>([]);
  const [siteConfig, setSiteConfig] = useState(SITE_CONFIG_DEFAULTS);

  const copyOrgLink = () => {
    navigator.clipboard.writeText(buildOrgUrl(slug ?? "")).then(() => {
      setLinkCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  useSEO({
    title: org ? `${org.name} — ${PRODUCT_BRAND_NAME}` : `Organization — ${PRODUCT_BRAND_NAME}`,
    description: org?.description ?? `${PRODUCT_BRAND_NAME} organization page`,
  });

  // Load org by slug
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getOrgBySlug(slug).then((found) => {
      if (!found) {
        navigate("/explore");
        return;
      }
      setOrg(found);
      setLoading(false);
    }).catch(() => {
      toast.error("Failed to load organisation");
      setLoading(false);
    });
  }, [slug, navigate]);

  // Subscribe to live org data + members once we have the id.
  // Members subscription requires authentication (Firestore rules deny unauthenticated reads).
  useEffect(() => {
    if (!org?.id) return;
    const unsub1 = subscribeOrg(org.id, (o) => { if (o) setOrg(o); });
    if (!user) return () => { unsub1(); };
    const unsub2 = subscribeOrgMembers(org.id, setMembers);
    return () => { unsub1(); unsub2(); };
  }, [org?.id, user]);

  // Check if current user is a member
  useEffect(() => {
    if (!org?.id || !user) { setMyMember(null); return; }
    getOrgMember(org.id, user.uid).then(setMyMember).catch(() => {
      setMyMember(null);
    });
  }, [org?.id, user, members]);

  // Subscribe to join requests (admin only)
  useEffect(() => {
    if (!org?.id || myMember?.role !== "admin") { setJoinRequests([]); return; }
    return subscribeJoinRequests(org.id, setJoinRequests);
  }, [org?.id, myMember?.role]);

  // Subscribe to feed posts for this org
  useEffect(() => {
    if (!org?.id) return;
    // Reuse community feed subscription – posts tagged with orgId
    return subscribeCommunityFeed(org.id, setPosts);
  }, [org?.id]);

  // Subscribe to org chat when on chat tab and is a member
  useEffect(() => {
    if (!org?.id || activeTab !== "chat" || !myMember) return;
    return subscribeOrgChatMessages(org.id, setChatMessages);
  }, [org?.id, activeTab, myMember]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Load current user profile
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setUserSettings(snap.data() as any);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    getSiteConfig().then(setSiteConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (org?.chatEnabled === false && activeTab === "chat") {
      setActiveTab("posts");
    }
  }, [org?.chatEnabled, activeTab]);

  // Subscribe to org projects when on the projects tab
  useEffect(() => {
    if (!org?.id || activeTab !== "projects") return;
    const q = query(collection(db, "projects"), where("ownerOrgId", "==", org.id));
    return onSnapshot(q, (snap) => {
      const projs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
      projs.sort((a, b) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0));
      setOrgProjects(projs);
    });
  }, [org?.id, activeTab]);

  const roomId = org?.id ? `org-${org.id}` : "";

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const voiceDisplayName = userSettings?.displayName || userSettings?.username || "User";
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { inVoiceCall, callParticipants, muted, joinOrStartCall, endCall: endVoiceCall, toggleMute } = useVoiceCall(roomId || null, user?.uid, voiceDisplayName);

  const handleJoin = async () => {
    if (!user || !org) return;
    const settings = await getUserSettings(user.uid);
    const username = settings?.username ?? user.displayName ?? user.email ?? "user";
    setJoining(true);
    try {
      if ((org.joinPolicy ?? "open") === "request") {
        await requestJoinOrg(org.id, user.uid, username, settings?.displayName, settings?.avatarUrl);
        toast.success("Join request sent! Awaiting admin approval.");
      } else {
        await joinOrg(org.id, user.uid, username);
        toast.success("Joined organization");
        sendNotification({ userId: user.uid, type: "org_join", title: "Joined org", message: `You joined ${org.name}.`, createdBy: "system" }).catch(() => {});
      }
    } catch {
      toast.error("Failed to join organization");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!myMember || !org || !user) return;
    try {
      await leaveOrg(org.id, user.uid);
      toast.success("Left organization");
      sendNotification({ userId: user.uid, type: "org_join", title: "Left org", message: `You left ${org.name}.`, createdBy: "system" }).catch(() => {});
      setMyMember(null);
    } catch {
      toast.error("Failed to leave organization");
    }
  };

  const handleRoleChange = async (member: OrgMember, role: OrgMember["role"]) => {
    if (!org) return;
    try {
      await updateMemberRole(org.id, member.userId, role);
      toast.success(`Updated ${member.username}'s role to ${role}`);
      sendNotification({ userId: member.userId, type: "org_role_updated", title: "Role updated", message: `Your role in "${org.name}" was changed to ${role}.`, createdBy: "system" }).catch(() => {});
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleApproveRequest = async (req: OrgJoinRequest) => {
    if (!org) return;
    try {
      await approveJoinRequest(org.id, req.userId, req.username);
      toast.success(`${req.username} approved`);
      sendNotification({ userId: req.userId, type: "org_approved", title: "Join request approved", message: `Your request to join "${org.name}" was approved.`, createdBy: "system" }).catch(() => {});
    } catch {
      toast.error("Failed to approve request");
    }
  };

  const handleRejectRequest = async (req: OrgJoinRequest) => {
    if (!org) return;
    try {
      await rejectJoinRequest(org.id, req.userId);
      toast.success(`${req.username} rejected`);
      sendNotification({ userId: req.userId, type: "org_rejected", title: "Join request rejected", message: `Your request to join "${org.name}" was rejected.`, createdBy: "system" }).catch(() => {});
    } catch {
      toast.error("Failed to reject request");
    }
  };

  const handleToggleJoinPolicy = async () => {
    if (!org) return;
    const newPolicy = (org.joinPolicy ?? "open") === "open" ? "request" : "open";
    setTogglingPolicy(true);
    try {
      await updateOrgJoinPolicy(org.id, newPolicy);
      toast.success(newPolicy === "request" ? "Join requests enabled" : "Open joining enabled");
    } catch {
      toast.error("Failed to update join policy");
    } finally {
      setTogglingPolicy(false);
    }
  };

  const handleToggleChat = async () => {
    if (!org) return;
    const newEnabled = !(org.chatEnabled ?? true);
    setTogglingChat(true);
    try {
      await setOrgChatEnabled(org.id, newEnabled);
      toast.success(newEnabled ? "Chat enabled" : "Chat disabled");
    } catch {
      toast.error("Failed to toggle chat");
    } finally {
      setTogglingChat(false);
    }
  };

  const handlePost = async (text: string) => {
    if (!user || !org || !userSettings?.username) return;
    await createFeedPost({
      userId: user.uid,
      username: userSettings.username,
      displayName: userSettings.displayName,
      avatarUrl: userSettings.avatarUrl,
      content: text,
      type: "update",
      isPublic: true,
      communityId: org.id,
      communityName: org.name,
      communitySlug: org.slug,
    });
  };

  const handleSendChat = async (text: string, replyToId?: string, replyToText?: string, replyToUsername?: string) => {
    if (!user || !org?.id || org.chatEnabled === false) return;
    try {
      await sendOrgChatMessage({
        orgId: org.id,
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

  const handleCreateOrgProject = async (name: string, description: string, isPublic: boolean) => {
    if (!user || !org || !userSettings?.username) return;
    const toastId = toast.loading("Creating project…");
    try {
      const ok = await deductCredits(user.uid, "createProject");
      if (!ok) {
        toast.error(`Insufficient credits. Creating a project costs ${CREDIT_COSTS.createProject} credits.`, { id: toastId });
        return;
      }
      // Duplicate name guard within this org
      const nameSnap = await getDocs(
        query(collection(db, "projects"), where("ownerOrgId", "==", org.id), where("name", "==", name.trim()))
      );
      if (!nameSnap.empty) {
        toast.error("This organization already has a project with that name.", { id: toastId });
        return;
      }
      const projectSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const template = TEMPLATES[0]; // blank
      const docRef = await addDoc(collection(db, "projects"), {
        name: name.trim(),
        projectSlug,
        description: description.trim(),
        ownerId: user.uid,
        ownerUsername: userSettings.username,
        ownerType: "organization",
        ownerOrgId: org.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        collaborators: [],
        isPublic,
        isTemplate: false,
        forksCount: 0,
        views: 0,
        deployUrl: `/org/${org.slug}/${projectSlug}`,
      });
      const filesRef = collection(db, "projects", docRef.id, "files");
      await Promise.all(template.files.map((f) =>
        addDoc(filesRef, { projectId: docRef.id, name: f.name, path: f.path, content: f.content, language: f.language, updatedAt: serverTimestamp() })
      ));
      await addDoc(filesRef, {
        projectId: docRef.id, name: "README.md", path: "/README.md",
        content: `# ${name.trim()}\n\n${description.trim() || `A project by ${org.name}.`}\n`,
        language: "markdown", updatedAt: serverTimestamp(),
      });
      toast.success("Project created!", { id: toastId });
      setShowCreateProject(false);
      // Switch to the Projects tab so the user sees the new project in the org
      setActiveTab("projects");
    } catch {
      toast.error("Failed to create project", { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Building2 className="w-8 h-8 text-blue-500 animate-pulse" />
      </div>
    );
  }

  if (!org) return null;

  const isAdmin = myMember?.role === "admin";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />
      <main className="flex-1 w-full px-4 md:px-8 py-8 pb-24 md:pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-xl bg-[#1a1a2e] border border-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
            {org.avatar ? (
              <img src={org.avatar} alt={org.name} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-8 h-8 text-blue-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white truncate">{org.name}</h1>
              {org.isPublic ? (
                <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">
                  <Globe className="w-3 h-3" /> Public
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">
                  <Lock className="w-3 h-3" /> Private
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mt-1">{org.description}</p>
            <p className="text-gray-600 text-xs mt-1 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {org.memberCount} {org.memberCount === 1 ? "member" : "members"}
            </p>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {user && !myMember && (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                {(org.joinPolicy ?? "open") === "request" ? "Request to Join" : "Join"}
              </button>
            )}
            {myMember && !isAdmin && (
              <button
                onClick={handleLeave}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Leave
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setActiveTab("settings")}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            )}
            {myMember && (
              <button
                onClick={() => setShowCreateProject(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-md shadow-blue-500/20"
              >
                <FolderPlus className="w-4 h-4" />
                New Project
              </button>
            )}
            {/* Copy Link */}
            <button
              onClick={copyOrgLink}
              title="Copy organization link"
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
            >
              {linkCopied ? <Check className="w-4 h-4 text-green-400" /> : <Link2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-800 overflow-x-auto">
          {(["overview", "posts", ...(org.chatEnabled !== false ? ["chat"] : []), "members", "projects", ...(isAdmin ? ["settings"] : [])] as OrgTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as OrgTab)}
              className={cn(
                "px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              )}
            >
              {tab === "members" ? `Members (${members.length})` : tab === "posts" ? `Posts (${posts.length})` : tab === "projects" ? `Projects (${orgProjects.length})` : tab}
              {tab === "settings" && joinRequests.length > 0 && (
                <span className="ml-1 text-xs bg-orange-500 text-white rounded-full px-1.5 py-0.5">{joinRequests.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Posts tab */}
        {activeTab === "posts" && (
          <div>
            {/* Composer — members only */}
            {myMember && userSettings?.username && (
              <OrgPostComposer
                orgId={org.id}
                orgName={org.name}
                orgSlug={org.slug}
                userId={user!.uid}
                username={userSettings.username}
                displayName={userSettings.displayName}
                avatarUrl={userSettings.avatarUrl}
                onPost={handlePost}
              />
            )}
            {!myMember && (
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 mb-4 text-center">
                <p className="text-white/40 text-sm">Join this organization to post</p>
              </div>
            )}
            {posts.length === 0 ? (
              <div className="text-center py-16">
                <MessageCircle className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No posts yet. Be the first!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <OrgPostItem
                    key={post.id}
                    post={post}
                    currentUserId={user?.uid}
                    isAdmin={isAdmin}
                    onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat tab */}
        {activeTab === "chat" && org.chatEnabled !== false && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/30">Organization Chat</span>
              <Link
                to={`/org/${org.slug}/chat`}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Open full chat page
              </Link>
            </div>
            <GroupChat
              messages={chatMessages}
              currentUserId={user?.uid}
              currentAvatarUrl={userSettings?.avatarUrl}
              accentColor="blue"
              onSend={handleSendChat}
              onDelete={(msgId) => org?.id && deleteOrgChatMessage(org.id, msgId)}
              canDelete={(msg) => msg.userId === user?.uid || isAdmin}
              voiceCallEnabled={(org.voiceCallsEnabled ?? true) && siteConfig.allowVoiceCalls}
              callParticipants={callParticipants}
              inVoiceCall={inVoiceCall}
              muted={muted}
              onJoinOrStartCall={joinOrStartCall}
              onLeaveCall={endVoiceCall}
              onToggleMute={toggleMute}
              emptyLabel="No messages yet. Say hello! 👋"
              notMemberLabel="Join this organization to chat."
              isMember={!!myMember}
              onJoin={handleJoin}
              joining={joining}
            />
          </div>
        )}

        {/* Overview tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stat cards */}
            <div className="bg-[#111] border border-gray-800 rounded-xl p-5 flex flex-col gap-1">
              <p className="text-gray-500 text-xs uppercase tracking-wider">Members</p>
              <p className="text-3xl font-bold text-white">{org.memberCount}</p>
            </div>
            <div className="bg-[#111] border border-gray-800 rounded-xl p-5 flex flex-col gap-1">
              <p className="text-gray-500 text-xs uppercase tracking-wider">Visibility</p>
              <p className="text-lg font-semibold text-white capitalize">
                {org.isPublic ? "Public" : "Private"}
              </p>
            </div>
            <div className="bg-[#111] border border-gray-800 rounded-xl p-5 flex flex-col gap-1">
              <p className="text-gray-500 text-xs uppercase tracking-wider">Created</p>
              <p className="text-sm text-gray-300">
                {org.createdAt
                  ? formatRelativeTime(org.createdAt)
                  : "—"}
              </p>
            </div>

            {/* Recent members preview */}
            <div className="md:col-span-3 bg-[#111] border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Recent members
              </h3>
              <div className="flex flex-wrap gap-3">
                {members.slice(0, 8).map((m) => (
                  <div key={m.id} className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-2">
                    <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                      {m.username?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <span className="text-sm text-gray-300">{m.username}</span>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded", ROLE_BADGE[m.role])}>{m.role}</span>
                  </div>
                ))}
                {members.length > 8 && (
                  <button
                    onClick={() => setActiveTab("members")}
                    className="text-xs text-blue-400 hover:text-blue-300 underline self-center"
                  >
                    +{members.length - 8} more
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Members tab */}
        {activeTab === "members" && (
          <div className="space-y-3">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 bg-[#111] border border-gray-800 rounded-xl px-4 py-3"
              >
                <div className="w-9 h-9 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold">
                  {m.username?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{m.username}</p>
                  <p className="text-xs text-gray-500">
                    Joined {m.joinedAt
                      ? formatRelativeTime(m.joinedAt)
                      : "recently"}
                  </p>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full", ROLE_BADGE[m.role])}>
                  {m.role}
                </span>
                {/* Admin can change roles */}
                {isAdmin && m.userId !== user?.uid && (
                  <div className="relative group">
                    <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                      <Shield className="w-3.5 h-3.5" />
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <div className="absolute right-0 top-6 bg-[#1a1a2e] border border-gray-700 rounded-lg shadow-xl z-10 hidden group-hover:block min-w-[110px]">
                      {(["member", "moderator", "admin"] as const).map((role) => (
                        <button
                          key={role}
                          onClick={() => handleRoleChange(m, role)}
                          className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 capitalize transition-colors"
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-center text-gray-500 py-12">No members yet.</p>
            )}
          </div>
        )}

        {/* Projects tab */}
        {activeTab === "projects" && (
          <div>
            {isAdmin && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowCreateProject(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/20"
                >
                  <FolderPlus className="w-4 h-4" />
                  New Project
                </button>
              </div>
            )}
            {orgProjects.length === 0 ? (
              <div className="text-center py-16">
                <FolderCode className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 font-semibold mb-1">No projects yet</p>
                {isAdmin && (
                  <p className="text-white/25 text-sm">Create the first project for this organization.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {orgProjects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-[#111] border border-gray-800 hover:border-blue-500/40 rounded-xl p-4 flex flex-col gap-3 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{project.name}</p>
                        {project.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{project.description}</p>
                        )}
                      </div>
                      {project.isPublic ? (
                        <Globe className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <span>Updated {project.updatedAt ? formatRelativeTime(project.updatedAt) : "—"}</span>
                    </div>
                    <button
                      onClick={() => {
                        setOrgContext(org.id, org.slug, org.name);
                        navigate('/projects?open=' + project.id);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 transition-all text-xs font-bold"
                    >
                      <FolderCode className="w-3.5 h-3.5" />
                      Open in IDE
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings tab (admin only) */}
        {activeTab === "settings" && isAdmin && (
          <div className="space-y-6">
            {/* Join Policy */}
            <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                Join Policy
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">Require approval to join</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {(org.joinPolicy ?? "open") === "request"
                      ? "Members must request and be approved by an admin"
                      : "Anyone can join this organization directly"}
                  </p>
                </div>
                <button
                  onClick={handleToggleJoinPolicy}
                  disabled={togglingPolicy}
                  className="flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  {(org.joinPolicy ?? "open") === "request" ? (
                    <ToggleRight className="w-8 h-8 text-blue-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Chat toggle */}
            <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-blue-400" />
                Group Chat
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">Enable group chat</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {(org.chatEnabled ?? true)
                      ? "Members can chat in the Chat tab"
                      : "Chat is disabled for this organization"}
                  </p>
                </div>
                <button
                  onClick={handleToggleChat}
                  disabled={togglingChat}
                  className="flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  {(org.chatEnabled ?? true) ? (
                    <ToggleRight className="w-8 h-8 text-blue-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-400" />
                Voice Calls
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">Enable voice calls</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {(org.voiceCallsEnabled ?? true)
                      ? "Members can start voice calls in chat"
                      : "Voice calls are disabled for this organization"}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!org) return;
                    try {
                      await updateOrg(org.id, { voiceCallsEnabled: !(org.voiceCallsEnabled ?? true) });
                    } catch {
                      toast.error("Failed to toggle voice calls");
                    }
                  }}
                  className="flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  {(org.voiceCallsEnabled ?? true) ? (
                    <ToggleRight className="w-8 h-8 text-blue-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Pending Join Requests */}
            {(org.joinPolicy ?? "open") === "request" && (
              <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-orange-400" />
                  Pending Requests ({joinRequests.length})
                </h3>
                {joinRequests.length === 0 ? (
                  <p className="text-gray-500 text-sm">No pending requests.</p>
                ) : (
                  <div className="space-y-3">
                    {joinRequests.map((req) => (
                      <div key={req.id} className="flex items-center gap-3 bg-gray-900 rounded-lg px-4 py-3">
                        <img
                          src={resolveAvatar(req.avatarUrl)}
                          alt={req.username}
                          className="w-8 h-8 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{req.displayName || req.username}</p>
                          <p className="text-xs text-gray-500">@{req.username}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveRequest(req)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs rounded-lg transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectRequest(req)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 text-xs rounded-lg transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
      <MobileBottomNav />
      {showCreateProject && org && (
        <CreateOrgProjectModal
          orgName={org.name}
          onClose={() => setShowCreateProject(false)}
          onCreate={handleCreateOrgProject}
        />
      )}
    </div>
  );
}

// ── Create Org Project Modal ──────────────────────────────────────────────────
function CreateOrgProjectModal({
  orgName,
  onClose,
  onCreate,
}: {
  orgName: string;
  onClose: () => void;
  onCreate: (name: string, description: string, isPublic: boolean) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Project name is required"); return; }
    setCreating(true);
    try {
      await onCreate(name.trim(), description.trim(), isPublic);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <FolderCode className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-white">New project in {orgName}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">Project name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="my-awesome-project"
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="What does this project do?"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border border-white/[0.07] rounded-xl">
              <div>
                <p className="text-sm font-semibold text-white">Public project</p>
                <p className="text-xs text-white/30 mt-0.5">Visible to everyone; private is org-only</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic((v) => !v)}
                className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", isPublic ? "bg-blue-600" : "bg-white/10")}
              >
                <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", isPublic ? "translate-x-6" : "translate-x-1")} />
              </button>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl font-semibold text-sm transition-all">
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/20"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
                {creating ? "Creating…" : "Create & Open"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Post Composer ─────────────────────────────────────────────────────────────
function OrgPostComposer({
  orgId, orgName, orgSlug, userId, username, displayName, avatarUrl, onPost,
}: {
  orgId: string; orgName: string; orgSlug: string;
  userId: string; username: string; displayName?: string; avatarUrl?: string;
  onPost: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPosting(true);
    try {
      await onPost(trimmed);
      setText("");
      toast.success("Post shared!");
    } catch {
      toast.error("Failed to post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 mb-4">
      <div className="flex gap-3">
        <img src={resolveAvatar(avatarUrl)} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5 ring-2 ring-white/10" />
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Share something with ${orgName}…`}
            rows={2}
            maxLength={1000}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.07] transition-all placeholder-white/25"
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
                  : "bg-blue-600 hover:bg-blue-500 text-white active:scale-95 shadow-md shadow-blue-500/20"
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

// ── Post Item ─────────────────────────────────────────────────────────────────
function OrgPostItem({ post, currentUserId, isAdmin, onDeleted }: {
  post: FeedPost; currentUserId?: string; isAdmin: boolean; onDeleted: (id: string) => void;
}) {
  const [liked, setLiked] = useState(currentUserId ? (post.likedBy ?? []).includes(currentUserId) : false);
  const [likeCount, setLikeCount] = useState(post.likes ?? 0);
  const [deleting, setDeleting] = useState(false);

  const canDelete = currentUserId === post.userId || isAdmin;

  const handleLike = async () => {
    if (!currentUserId) return;
    try {
      if (liked) { await unlikePost(post.id, currentUserId); setLiked(false); setLikeCount((n) => Math.max(0, n - 1)); }
      else { await likePost(post.id, currentUserId); setLiked(true); setLikeCount((n) => n + 1); }
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
    }
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.14] rounded-2xl p-4 transition-all">
      <div className="flex items-start gap-3">
        <Link to={`/@${post.username}`}>
          <img src={resolveAvatar(post.avatarUrl)} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-white/10" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <Link to={`/@${post.username}`} className="text-sm font-bold text-white hover:text-blue-400 transition-colors truncate">
                {post.displayName || post.username}
              </Link>
              <span className="text-[11px] text-white/25">·</span>
              <span className="text-[11px] text-white/25">{formatRelativeTime(post.createdAt)}</span>
            </div>
            {canDelete && (
              <button onClick={handleDelete} disabled={deleting} className="text-white/20 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 shrink-0">
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          <p className="text-sm text-white/75 leading-relaxed mb-3 whitespace-pre-wrap break-words">{post.content}</p>
          {post.projectName && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 w-fit">
              <Code2 className="w-3.5 h-3.5" />{post.projectName}
            </div>
          )}
          <div className="flex items-center gap-4 text-white/30 text-xs pt-2.5 border-t border-white/[0.05]">
            <button
              onClick={handleLike}
              className={cn("flex items-center gap-1.5 transition-colors hover:text-red-400", liked && "text-red-400")}
            >
              <Heart className={cn("w-3.5 h-3.5", liked && "fill-red-400")} />
              {likeCount > 0 && likeCount}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
