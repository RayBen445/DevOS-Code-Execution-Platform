import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { approveTemplate, rejectTemplate, getPendingTemplates, getAllTemplates } from "../lib/templateService";
import { adjustCredits, getCredits, DAILY_CREDITS_AMOUNT } from "../lib/creditsService";
import { Template, UserProfile, Credits } from "../types";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ShieldCheck,
  Users,
  Zap,
  BarChart3,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  FolderCode,
  Layout,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import Navbar from "../components/Navbar";

type Tab = "overview" | "templates" | "users" | "credits";

interface UserWithCredits extends UserProfile {
  credits?: Credits;
  projectCount?: number;
}

export default function AdminDashboard() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalProjects, setTotalProjects] = useState(0);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const [pendingTemplates, setPendingTemplates] = useState<Template[]>([]);
  const [allTemplates, setAllTemplates] = useState<Template[]>([]);
  const [users, setUsers] = useState<UserWithCredits[]>([]);

  // Credit adjustment state
  const [creditTarget, setCreditTarget] = useState("");
  const [creditAmount, setCreditAmount] = useState("10");
  const [creditType, setCreditType] = useState<"daily" | "monthly">("daily");
  const [adjusting, setAdjusting] = useState(false);

  // Template moderation state
  const [moderating, setModerating] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const checkAdmin = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().role === "admin") {
        setIsAdmin(true);
        loadData();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    };
    checkAdmin();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersSnap, projectsSnap, pending, allTpl] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "projects")),
        getPendingTemplates(),
        getAllTemplates(),
      ]);

      setTotalUsers(usersSnap.size);
      setTotalProjects(projectsSnap.size);
      setTotalTemplates(allTpl.filter((t) => t.isApproved).length);
      setPendingTemplates(pending);
      setAllTemplates(allTpl);

      // Load users with credits
      const usersData = usersSnap.docs.map((d) => d.data() as UserProfile);
      const usersWithCredits: UserWithCredits[] = await Promise.all(
        usersData.map(async (u) => {
          try {
            const cSnap = await getDoc(doc(db, "user_credits", u.uid));
            const credits = cSnap.exists() ? (cSnap.data() as Credits) : undefined;
            const pCount = projectsSnap.docs.filter(
              (p) => p.data().ownerId === u.uid
            ).length;
            return { ...u, credits, projectCount: pCount };
          } catch {
            return u;
          }
        })
      );
      setUsers(usersWithCredits);
    } catch (err) {
      toast.error("Failed to load admin data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (templateId: string) => {
    setModerating(templateId);
    try {
      await approveTemplate(templateId);
      toast.success("Template approved!");
      setPendingTemplates((prev) => prev.filter((t) => t.id !== templateId));
      setAllTemplates((prev) =>
        prev.map((t) => (t.id === templateId ? { ...t, isApproved: true } : t))
      );
      setTotalTemplates((n) => n + 1);
    } catch {
      toast.error("Failed to approve template.");
    } finally {
      setModerating(null);
    }
  };

  const handleReject = async (templateId: string) => {
    setModerating(templateId);
    try {
      await rejectTemplate(templateId);
      toast.success("Template rejected and removed.");
      setPendingTemplates((prev) => prev.filter((t) => t.id !== templateId));
      setAllTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } catch {
      toast.error("Failed to reject template.");
    } finally {
      setModerating(null);
    }
  };

  const handleAdjustCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditTarget.trim() || !creditAmount) return;

    const delta = parseInt(creditAmount, 10);
    if (isNaN(delta)) {
      toast.error("Invalid credit amount.");
      return;
    }

    setAdjusting(true);
    try {
      // Find user by username or email
      const targetUser = users.find(
        (u) =>
          u.username === creditTarget.trim() ||
          u.email === creditTarget.trim() ||
          u.uid === creditTarget.trim()
      );

      if (!targetUser) {
        toast.error("User not found. Use username, email, or UID.");
        return;
      }

      await adjustCredits(targetUser.uid, {
        [creditType]: delta,
      });

      toast.success(
        `Adjusted ${creditType} credits by ${delta > 0 ? "+" : ""}${delta} for @${targetUser.username}`
      );
      // Refresh user credits
      const cSnap = await getDoc(doc(db, "user_credits", targetUser.uid));
      if (cSnap.exists()) {
        setUsers((prev) =>
          prev.map((u) =>
            u.uid === targetUser.uid
              ? { ...u, credits: cSnap.data() as Credits }
              : u
          )
        );
      }
      setCreditTarget("");
      setCreditAmount("10");
    } catch (err) {
      toast.error("Failed to adjust credits.");
    } finally {
      setAdjusting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <p className="text-white/40">Please sign in to access the admin dashboard.</p>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center">
          <ShieldCheck className="w-16 h-16 text-red-500/40 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-white/40 mb-6">You do not have admin permissions.</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-white/5 rounded-xl font-bold hover:bg-white/10 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
    {
      id: "templates",
      label: "Templates",
      icon: <Layout className="w-4 h-4" />,
      badge: pendingTemplates.length || undefined,
    },
    { id: "users", label: "Users", icon: <Users className="w-4 h-4" /> },
    { id: "credits", label: "Credits", icon: <Zap className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white">Admin Dashboard</h1>
              <p className="text-white/40 text-sm">DevOS Platform Control</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="ml-auto p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mb-10 border-b border-white/5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative flex items-center gap-2",
                activeTab === tab.id
                  ? "text-white"
                  : "text-white/20 hover:text-white/40"
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold min-w-[18px] text-center">
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="adminTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500"
                />
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard
                    icon={<Users className="w-6 h-6" />}
                    label="Total Users"
                    value={totalUsers}
                    color="blue"
                  />
                  <StatCard
                    icon={<FolderCode className="w-6 h-6" />}
                    label="Total Projects"
                    value={totalProjects}
                    color="green"
                  />
                  <StatCard
                    icon={<Layout className="w-6 h-6" />}
                    label="Approved Templates"
                    value={totalTemplates}
                    color="purple"
                  />
                </div>

                {pendingTemplates.length > 0 && (
                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-6">
                    <h3 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                      <Layout className="w-4 h-4" />
                      {pendingTemplates.length} template(s) awaiting review
                    </h3>
                    <button
                      onClick={() => setActiveTab("templates")}
                      className="text-sm text-yellow-400/70 hover:text-yellow-400 underline"
                    >
                      Review now →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === "templates" && (
              <div className="space-y-8">
                {pendingTemplates.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">
                        PENDING
                      </span>
                      Awaiting Approval
                    </h2>
                    <div className="space-y-4">
                      {pendingTemplates.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          moderating={moderating}
                          onApprove={() => handleApprove(template.id)}
                          onReject={() => handleReject(template.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                      APPROVED
                    </span>
                    Live Templates
                  </h2>
                  {allTemplates.filter((t) => t.isApproved).length === 0 ? (
                    <p className="text-white/30 text-sm">No approved templates yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {allTemplates
                        .filter((t) => t.isApproved)
                        .map((template) => (
                          <div
                            key={template.id}
                            className="p-5 rounded-2xl bg-[#111] border border-white/5 flex items-center justify-between"
                          >
                            <div>
                              <p className="font-bold text-white">{template.name}</p>
                              <p className="text-sm text-white/40">
                                by {template.authorUsername || template.authorName} · {template.downloads} downloads · {template.likes} likes
                              </p>
                            </div>
                            <span className="px-2 py-1 rounded-lg bg-green-500/10 text-green-400 text-xs font-bold">
                              Live
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === "users" && (
              <div>
                <h2 className="text-xl font-bold text-white mb-6">All Users ({users.length})</h2>
                <div className="space-y-3">
                  {users.map((u) => (
                    <div
                      key={u.uid}
                      className="p-5 rounded-2xl bg-[#111] border border-white/5 flex items-center gap-4"
                    >
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt={u.displayName}
                          className="w-10 h-10 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                          <Users className="w-5 h-5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white truncate">{u.displayName}</p>
                          {u.role === "admin" && (
                            <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[10px] font-bold uppercase">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/40">
                          @{u.username} · {u.email}
                        </p>
                      </div>
                      <div className="text-right text-sm text-white/40 shrink-0">
                        <p>{u.projectCount || 0} projects</p>
                        <p className="flex items-center gap-1 justify-end text-yellow-400/70">
                          <Zap className="w-3 h-3" />
                          {u.credits
                            ? `${u.credits.daily + u.credits.monthly} credits`
                            : "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <p className="text-white/30 text-sm py-8 text-center">No users found.</p>
                  )}
                </div>
              </div>
            )}

            {/* Credits Tab */}
            {activeTab === "credits" && (
              <div className="space-y-8">
                <div className="bg-[#111] border border-white/10 rounded-2xl p-8 max-w-lg">
                  <h2 className="text-xl font-bold text-white mb-2">Adjust User Credits</h2>
                  <p className="text-white/40 text-sm mb-6">
                    Enter username, email, or UID and the amount to add (positive) or subtract
                    (negative).
                  </p>
                  <form onSubmit={handleAdjustCredits} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest">
                        Target User (username / email / UID)
                      </label>
                      <input
                        type="text"
                        value={creditTarget}
                        onChange={(e) => setCreditTarget(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all"
                        placeholder="username or email"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest">
                          Amount
                        </label>
                        <input
                          type="number"
                          value={creditAmount}
                          onChange={(e) => setCreditAmount(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all"
                          placeholder="10"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest">
                          Credit Type
                        </label>
                        <select
                          value={creditType}
                          onChange={(e) =>
                            setCreditType(e.target.value as "daily" | "monthly")
                          }
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all"
                        >
                          <option value="daily">Daily</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={adjusting}
                      className={cn(
                        "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                        adjusting
                          ? "bg-white/5 text-white/30 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white active:scale-95"
                      )}
                    >
                      {adjusting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Adjusting...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Apply Credits Adjustment
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Credits overview per user */}
                <div>
                  <h2 className="text-xl font-bold text-white mb-4">User Credits Overview</h2>
                  <div className="space-y-3">
                    {users.map((u) => (
                      <div
                        key={u.uid}
                        className="p-4 rounded-2xl bg-[#111] border border-white/5 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-white text-sm">
                            @{u.username}
                          </p>
                          <p className="text-xs text-white/30">{u.email}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-yellow-400 font-bold flex items-center gap-1 justify-end">
                            <Zap className="w-3 h-3" />
                            {u.credits
                              ? `${u.credits.daily + u.credits.monthly}`
                              : "—"}{" "}
                            total
                          </p>
                          {u.credits && (
                            <p className="text-white/30 text-xs">
                              {u.credits.daily} daily + {u.credits.monthly} monthly
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "blue" | "green" | "purple";
}) {
  const colors = {
    blue: "bg-blue-600/20 text-blue-400",
    green: "bg-green-600/20 text-green-400",
    purple: "bg-purple-600/20 text-purple-400",
  };
  return (
    <div className="p-6 rounded-2xl bg-[#111] border border-white/5">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", colors[color])}>
        {icon}
      </div>
      <p className="text-4xl font-extrabold text-white mb-1">{value}</p>
      <p className="text-white/40 text-sm font-medium">{label}</p>
    </div>
  );
}

function TemplateCard({
  template,
  moderating,
  onApprove,
  onReject,
}: {
  template: Template;
  moderating: string | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isBusy = moderating === template.id;
  return (
    <div className="p-5 rounded-2xl bg-[#111] border border-white/5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-white text-lg">{template.name}</p>
          <p className="text-sm text-white/40">
            by {template.authorUsername || template.authorName} · {template.files.length} files
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onApprove}
            disabled={isBusy}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all",
              isBusy
                ? "bg-white/5 text-white/20 cursor-not-allowed"
                : "bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white"
            )}
          >
            {isBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Approve
          </button>
          <button
            onClick={onReject}
            disabled={isBusy}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all",
              isBusy
                ? "bg-white/5 text-white/20 cursor-not-allowed"
                : "bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white"
            )}
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
        </div>
      </div>
      {template.description && (
        <p className="text-sm text-white/50 mb-3">{template.description}</p>
      )}
      {template.tags && template.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {template.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-md bg-white/5 text-white/40 text-[10px] font-bold uppercase"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
