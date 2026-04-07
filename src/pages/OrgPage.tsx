import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
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
} from "../lib/orgService";
import { getUserSettings } from "../lib/userService";
import { Organization, OrgMember, OrgJoinRequest } from "../types";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useSEO } from "../hooks/useSEO";
import { resolveAvatar } from "../lib/avatars";
import { toast } from "sonner";
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
} from "lucide-react";
import { formatRelativeTime } from "../lib/utils";
import { cn } from "../lib/utils";

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  moderator: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  member: "bg-gray-700 text-gray-400 border border-gray-600",
};

export default function OrgPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);

  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [myMember, setMyMember] = useState<OrgMember | null>(null);
  const [joinRequests, setJoinRequests] = useState<OrgJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "members" | "settings">("overview");
  const [linkCopied, setLinkCopied] = useState(false);
  const [togglingPolicy, setTogglingPolicy] = useState(false);

  const copyOrgLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/org/${slug}`).then(() => {
      setLinkCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  useSEO({
    title: org ? `${org.name} — DevOS` : "Organization — DevOS",
    description: org?.description ?? "DevOS organization page",
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
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleApproveRequest = async (req: OrgJoinRequest) => {
    if (!org) return;
    try {
      await approveJoinRequest(org.id, req.userId, req.username);
      toast.success(`${req.username} approved`);
    } catch {
      toast.error("Failed to approve request");
    }
  };

  const handleRejectRequest = async (req: OrgJoinRequest) => {
    if (!org) return;
    try {
      await rejectJoinRequest(org.id, req.userId);
      toast.success(`${req.username} rejected`);
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
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 pb-24 md:pb-8">
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
        <div className="flex gap-1 mb-6 border-b border-gray-800">
          {(isAdmin ? ["overview", "members", "settings"] : ["overview", "members"]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={cn(
                "px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors",
                activeTab === tab
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              )}
            >
              {tab === "members" ? `Members (${members.length})` : tab}
              {tab === "settings" && joinRequests.length > 0 && (
                <span className="ml-1 text-xs bg-orange-500 text-white rounded-full px-1.5 py-0.5">{joinRequests.length}</span>
              )}
            </button>
          ))}
        </div>

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
                {org.createdAt?.seconds
                  ? formatRelativeTime({ seconds: org.createdAt.seconds, nanoseconds: 0 } as any)
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
                    Joined {m.joinedAt?.seconds
                      ? formatRelativeTime({ seconds: m.joinedAt.seconds, nanoseconds: 0 } as any)
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
                  title="Toggle join policy"
                >
                  {(org.joinPolicy ?? "open") === "request" ? (
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
    </div>
  );
}
