/**
 * CommunityChatPage — dedicated full-page chat for /communities/:slug/chat
 *
 * Layout:
 *  ┌──────────────────────────────────────────────────────────┐
 *  │ header: ← back  community name  voice call  member count │
 *  ├────────────────────┬─────────────────────────────────────┤
 *  │  Members sidebar   │         GroupChat (main)             │
 *  └────────────────────┴─────────────────────────────────────┘
 */
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import { ArrowLeft, Users, Hash, Loader2 } from "lucide-react";
import { toast } from "sonner";
import GroupChat from "../components/GroupChat";
import { Community, CommunityMember, CommunityChatMessage } from "../types";
import {
  getCommunityBySlug,
  subscribeCommunity,
  subscribeMembership,
  subscribeCommunityMembers,
  subscribeChatMessages,
  sendChatMessage,
  deleteChatMessage,
  joinCommunity,
} from "../lib/communityService";
import { getUserSettings } from "../lib/userService";
import { useVoiceCall } from "../hooks/useVoiceCall";
import { useSEO } from "../hooks/useSEO";
import { getSiteConfig, SITE_CONFIG_DEFAULTS } from "../lib/creditsService";
import Navbar from "../components/Navbar";

export default function CommunityChatPage() {
  const { slug } = useParams<{ slug: string }>();
  const [user] = useAuthState(auth);

  const [community, setCommunity] = useState<Community | null>(null);
  const [membership, setMembership] = useState<CommunityMember | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [chatMessages, setChatMessages] = useState<CommunityChatMessage[]>([]);
  const [userSettings, setUserSettings] = useState<{ username?: string; displayName?: string; avatarUrl?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [siteConfig, setSiteConfig] = useState(SITE_CONFIG_DEFAULTS);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useSEO({
    title: community ? `${community.name} Chat — DevOS` : "Community Chat — DevOS",
  });

  // Load community
  useEffect(() => {
    if (!slug) return;
    getCommunityBySlug(slug).then((c) => {
      setCommunity(c);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug]);

  // Subscribe to live community updates
  useEffect(() => {
    if (!community?.id) return;
    return subscribeCommunity(community.id, setCommunity);
  }, [community?.id]);

  // Subscribe to membership
  useEffect(() => {
    if (!community?.id || !user?.uid) return;
    return subscribeMembership(community.id, user.uid, setMembership);
  }, [community?.id, user?.uid]);

  // Subscribe to members list
  useEffect(() => {
    if (!community?.id) return;
    return subscribeCommunityMembers(community.id, setMembers);
  }, [community?.id]);

  // Subscribe to chat messages
  useEffect(() => {
    if (!community?.id || !membership) return;
    return subscribeChatMessages(community.id, (msgs) => setChatMessages(msgs as CommunityChatMessage[]));
  }, [community?.id, membership]);

  // Load user settings
  useEffect(() => {
    if (!user) return;
    getUserSettings(user.uid).then(setUserSettings).catch(() => {});
  }, [user?.uid]);

  // Site config
  useEffect(() => {
    getSiteConfig().then(setSiteConfig).catch(() => {});
  }, []);

  const roomId = community?.id ? `community-${community.id}` : "";
  const voiceDisplayName = userSettings?.displayName || userSettings?.username || "User";
  const { inVoiceCall, callParticipants, muted, joinOrStartCall, endCall, toggleMute } = useVoiceCall(
    roomId || null, user?.uid, voiceDisplayName
  );

  const handleSendChat = async (text: string, replyToId?: string, replyToText?: string, replyToUsername?: string) => {
    if (!user || !community?.id) return;
    const settings = userSettings ?? await getUserSettings(user.uid);
    await sendChatMessage({
      communityId: community.id,
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
    if (!user || !community?.id) return;
    setJoining(true);
    try {
      await joinCommunity(community.id, user.uid);
      toast.success("Joined community!");
    } catch {
      toast.error("Failed to join community.");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/40">Community not found.</p>
        </div>
      </div>
    );
  }

  const isMember = !!membership;
  const participantCount = Object.keys(callParticipants).length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07] bg-[#0d1117] shrink-0">
        <Link
          to={`/c/${slug}`}
          className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        {community.avatar ? (
          <img src={community.avatar} alt="" className="w-7 h-7 rounded-lg object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 flex items-center justify-center">
            <Hash className="w-3.5 h-3.5 text-indigo-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-white truncate">{community.name}</h1>
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
                  <div className="w-7 h-7 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-indigo-300">{m.userId.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/80 truncate font-medium">Member</p>
                    <p className="text-[10px] text-white/30 truncate">{m.role}</p>
                  </div>
                  {m.role === "admin" && (
                    <span className="text-[9px] font-bold text-indigo-400">Admin</span>
                  )}
                  {m.role === "moderator" && (
                    <span className="text-[9px] font-bold text-purple-400">Mod</span>
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
            accentColor="indigo"
            onSend={handleSendChat}
            onDelete={(msgId) => community?.id && deleteChatMessage(community.id, msgId)}
            canDelete={(msg) => msg.userId === user?.uid || membership?.role === "admin" || membership?.role === "moderator"}
            voiceCallEnabled={(community.voiceCallsEnabled ?? true) && siteConfig.allowVoiceCalls}
            callParticipants={callParticipants}
            inVoiceCall={inVoiceCall}
            muted={muted}
            onJoinOrStartCall={joinOrStartCall}
            onLeaveCall={endCall}
            onToggleMute={toggleMute}
            emptyLabel="No messages yet. Say hello! 👋"
            notMemberLabel="Join the community to chat."
            isMember={isMember}
            onJoin={handleJoin}
            joining={joining}
          />
        </main>
      </div>
    </div>
  );
}
