/**
 * OrgChatPage — dedicated full-page chat for /org/:slug/chat
 *
 * Layout:
 *  ┌──────────────────────────────────────────────────────────┐
 *  │ header: ← back  org name  voice call  member count       │
 *  ├────────────────────┬─────────────────────────────────────┤
 *  │  Members sidebar   │         GroupChat (main)             │
 *  └────────────────────┴─────────────────────────────────────┘
 */
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import { ArrowLeft, Users, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import GroupChat from "../components/GroupChat";
import { Organization, OrgMember, OrgChatMessage } from "../types";
import {
  getOrgBySlug,
  subscribeOrg,
  subscribeOrgMembers,
  getOrgMember,
  joinOrg,
  subscribeOrgChatMessages,
  sendOrgChatMessage,
  deleteOrgChatMessage,
} from "../lib/orgService";
import { getUserSettings } from "../lib/userService";
import { useVoiceCall } from "../hooks/useVoiceCall";
import { useSEO } from "../hooks/useSEO";
import { getSiteConfig, SITE_CONFIG_DEFAULTS } from "../lib/creditsService";
import Navbar from "../components/Navbar";

const ROLE_BADGE: Record<string, string> = {
  admin: "text-blue-400",
  moderator: "text-purple-400",
  member: "",
};

export default function OrgChatPage() {
  const { slug } = useParams<{ slug: string }>();
  const [user] = useAuthState(auth);

  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [myMember, setMyMember] = useState<OrgMember | null>(null);
  const [chatMessages, setChatMessages] = useState<OrgChatMessage[]>([]);
  const [userSettings, setUserSettings] = useState<{ username?: string; displayName?: string; avatarUrl?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [siteConfig, setSiteConfig] = useState(SITE_CONFIG_DEFAULTS);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useSEO({
    title: org ? `${org.name} Chat — DevOS` : "Org Chat — DevOS",
  });

  // Load org
  useEffect(() => {
    if (!slug) return;
    getOrgBySlug(slug).then((o) => {
      setOrg(o);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug]);

  // Subscribe to live org updates
  useEffect(() => {
    if (!org?.id) return;
    return subscribeOrg(org.id, setOrg);
  }, [org?.id]);

  // Subscribe to members
  useEffect(() => {
    if (!org?.id) return;
    return subscribeOrgMembers(org.id, setMembers);
  }, [org?.id]);

  // Load my membership
  useEffect(() => {
    if (!org?.id || !user?.uid) return;
    getOrgMember(org.id, user.uid).then(setMyMember).catch(() => setMyMember(null));
  }, [org?.id, user?.uid]);

  // Subscribe to chat messages
  useEffect(() => {
    if (!org?.id || !myMember) return;
    return subscribeOrgChatMessages(org.id, (msgs) => setChatMessages(msgs as OrgChatMessage[]));
  }, [org?.id, myMember]);

  // Load user settings
  useEffect(() => {
    if (!user) return;
    getUserSettings(user.uid).then(setUserSettings).catch(() => {});
  }, [user?.uid]);

  // Site config
  useEffect(() => {
    getSiteConfig().then(setSiteConfig).catch(() => {});
  }, []);

  const roomId = org?.id ? `org-${org.id}` : "";
  const voiceDisplayName = userSettings?.displayName || userSettings?.username || "User";
  const { inVoiceCall, callParticipants, muted, joinOrStartCall, endCall, toggleMute } = useVoiceCall(
    roomId || null, user?.uid, voiceDisplayName
  );

  const handleSendChat = async (text: string, replyToId?: string, replyToText?: string, replyToUsername?: string) => {
    if (!user || !org?.id) return;
    const settings = userSettings ?? await getUserSettings(user.uid);
    await sendOrgChatMessage({
      orgId: org.id,
      userId: user.uid,
      username: settings?.username ?? user.displayName ?? "User",
      displayName: settings?.displayName,
      avatarUrl: settings?.avatarUrl,
      text,
      replyToId,
      replyToText,
      replyToUsername,
    });
  };

  const handleJoin = async () => {
    if (!user || !org?.id) return;
    setJoining(true);
    try {
      const settings = await getUserSettings(user.uid);
      await joinOrg(org.id, user.uid, settings?.username ?? "user");
      toast.success("Joined organization!");
    } catch {
      toast.error("Failed to join organization.");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/40">Organization not found.</p>
        </div>
      </div>
    );
  }

  const participantCount = Object.keys(callParticipants).length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07] bg-[#0d1117] shrink-0">
        <Link
          to={`/org/${slug}`}
          className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        {org.avatar ? (
          <img src={org.avatar} alt="" className="w-7 h-7 rounded-lg object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-white truncate">{org.name}</h1>
          <p className="text-[11px] text-white/30">
            {members.length} member{members.length !== 1 ? "s" : ""}
            {participantCount > 0 && (
              <span className="ml-2 text-green-400">
                · {participantCount} in call
              </span>
            )}
          </p>
        </div>

        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
          title="Toggle members"
        >
          <Users className="w-4 h-4" />
        </button>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Members sidebar ───────────────────────────────────────────── */}
        {sidebarOpen && (
          <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/[0.06] bg-[#0d1117] overflow-y-auto">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                Members — {members.length}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/[0.03] rounded-lg mx-1 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-blue-300">{m.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/80 truncate font-medium">@{m.username}</p>
                    <p className="text-[10px] text-white/30 truncate capitalize">{m.role}</p>
                  </div>
                  {m.role !== "member" && (
                    <span className={`text-[9px] font-bold capitalize ${ROLE_BADGE[m.role] ?? ""}`}>
                      {m.role}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* ── Chat main area ─────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 min-h-0 p-3 overflow-hidden">
          <GroupChat
            messages={chatMessages}
            currentUserId={user?.uid}
            currentAvatarUrl={userSettings?.avatarUrl}
            accentColor="blue"
            onSend={handleSendChat}
            onDelete={(msgId) => org?.id && deleteOrgChatMessage(org.id, msgId)}
            canDelete={(msg) => msg.userId === user?.uid || myMember?.role === "admin"}
            voiceCallEnabled={(org.voiceCallsEnabled ?? true) && siteConfig.allowVoiceCalls}
            callParticipants={callParticipants}
            inVoiceCall={inVoiceCall}
            muted={muted}
            onJoinOrStartCall={joinOrStartCall}
            onLeaveCall={endCall}
            onToggleMute={toggleMute}
            emptyLabel="No messages yet. Say hello! 👋"
            notMemberLabel="Join this organization to chat."
            isMember={!!myMember}
            onJoin={handleJoin}
            joining={joining}
          />
        </main>
      </div>
    </div>
  );
}
