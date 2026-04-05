import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  limit,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { approveTemplate, rejectTemplate, getPendingTemplates, getAllTemplates, createOfficialTemplate, deleteTemplateById, updateTemplateFiles } from "../lib/templateService";
import { adjustCredits, getCreditConfig, saveCreditConfig, CreditConfig, giftCredits, giftUnlimitedCredits, getMaintenanceConfig, saveMaintenanceConfig, MaintenanceConfig } from "../lib/creditsService";
import { sendNotification } from "../lib/notificationService";
import { createRedeemCode, toggleRedeemCode, deleteRedeemCode } from "../lib/redeemCodeService";
import { createAdminPost } from "../lib/feedService";
import { banUser, suspendUser, reinstateUser, adminChangeUsername, checkUsernameAvailable, setUserOfficial, getUsernameChangeRequests, resolveUsernameChangeRequest } from "../lib/userService";
import { createPoll, getAllPolls, closePoll, deletePoll } from "../lib/pollService";
import { Template, UserProfile, Credits, RedeemCode, NotificationType, Poll } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ShieldCheck,
  Shield,
  ShieldOff,
  Users,
  Zap,
  BarChart3,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  FolderCode,
  Layout,
  Plus,
  Star,
  Trash2,
  Bell,
  Gift,
  Send,
  ToggleLeft,
  ToggleRight,
  Newspaper,
  Menu,
  X,
  FileCode,
  ChevronDown,
  ChevronUp,
  Settings2,
  AlertTriangle,
  Activity,
  Wifi,
  WifiOff,
  AtSign,
  MessageSquare,
  Bug,
  Lightbulb,
  Ban,
  Clock,
  Infinity,
  BarChart2,
  Vote,
  Wrench,
  Pencil,
  BadgeCheck,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import Avatar from "../components/Avatar";
import ConfirmModal from "../components/ConfirmModal";

type Tab = "overview" | "templates" | "users" | "credits" | "notifications" | "redeem" | "posts" | "reserved" | "polls" | "feedback" | "maintenance";

const detectLanguage = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    html: "html", css: "css", js: "javascript", ts: "typescript",
    tsx: "typescript", jsx: "javascript", json: "json", md: "markdown",
  };
  return map[ext] || "plaintext";
};

interface UserWithCredits extends UserProfile {
  credits?: Credits;
  projectCount?: number;
  isOfficial?: boolean;
}

interface SystemHealth {
  firestoreOk: boolean;
  feedReadable: boolean;
  templatesReadable: boolean;
  checkedAt: string | null;
  errors: string[];
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

  // Create official template state
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [newTplName, setNewTplName] = useState("");
  const [newTplDesc, setNewTplDesc] = useState("");
  const [newTplTags, setNewTplTags] = useState("");
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<string | null>(null);
  const [deleteTemplateConfirm, setDeleteTemplateConfirm] = useState<string | null>(null);
  const [deleteCodeConfirm, setDeleteCodeConfirm] = useState<string | null>(null);

  // Template file editor state
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateFiles, setEditingTemplateFiles] = useState<Template['files']>([]);
  const [savingTemplateFiles, setSavingTemplateFiles] = useState(false);
  const [newTplFileName, setNewTplFileName] = useState("index.html");
  const [newTplFileContent, setNewTplFileContent] = useState("");
  const [expandedFileIndex, setExpandedFileIndex] = useState<number | null>(null);

  // Notifications state
  const [notifUserId, setNotifUserId] = useState("all");
  const [notifType, setNotifType] = useState<NotificationType>("admin_message");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);

  // Redeem codes state
  const [redeemCodes, setRedeemCodes] = useState<RedeemCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [showCreateCode, setShowCreateCode] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newCodeValue, setNewCodeValue] = useState("50");
  const [newCodeUsageLimit, setNewCodeUsageLimit] = useState("100");
  const [newCodePerUser, setNewCodePerUser] = useState("1");
  const [newCodeExpiry, setNewCodeExpiry] = useState("");
  const [creatingCode, setCreatingCode] = useState(false);

  // Admin posts state
  const [postContent, setPostContent] = useState("");
  const [postType, setPostType] = useState<"announcement" | "update" | "feature">("announcement");
  const [publishingPost, setPublishingPost] = useState(false);

  // Reserved usernames state
  const [reservedNames, setReservedNames] = useState<string[]>([]);
  const [loadingReserved, setLoadingReserved] = useState(false);
  const [newReservedName, setNewReservedName] = useState("");
  const [savingReserved, setSavingReserved] = useState(false);

  // Credit config state
  const [creditConfig, setCreditConfig] = useState<CreditConfig>({ creditsEnabled: true, chargePerAction: 0, actionCosts: {} });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Role update state
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  // Ban/Suspend state
  const [moderatingUser, setModeratingUser] = useState<string | null>(null);
  const [userActionConfirm, setUserActionConfirm] = useState<{ uid: string; action: "ban" | "suspend" | "reinstate" } | null>(null);

  // Username change state
  const [usernameEditUid, setUsernameEditUid] = useState<string | null>(null);
  const [usernameEditValue, setUsernameEditValue] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

  // Official toggle state
  const [togglingOfficial, setTogglingOfficial] = useState<string | null>(null);

  // Feedback state
  const [feedbackItems, setFeedbackItems] = useState<Array<{
    id: string;
    type: 'bug' | 'feature' | 'feedback';
    message: string;
    userId?: string;
    userEmail?: string;
    createdAt: any;
    status: string;
  }>>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [openFeedbackCount, setOpenFeedbackCount] = useState(0);
  const [resolvingFeedback, setResolvingFeedback] = useState<string | null>(null);

  // Username change requests state
  const [usernameRequests, setUsernameRequests] = useState<Array<{
    id: string; uid: string; currentUsername: string; requestedUsername: string;
    reason?: string; status: string; createdAt: any; rejectionReason?: string;
  }>>([]);
  const [loadingUsernameRequests, setLoadingUsernameRequests] = useState(false);
  const [resolvingRequest, setResolvingRequest] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);

  // Gift Credits state
  const [giftTarget, setGiftTarget] = useState("");
  const [giftAmount, setGiftAmount] = useState("50");
  const [giftExpiry, setGiftExpiry] = useState("");
  const [gifting, setGifting] = useState(false);

  // Unlimited pass state
  const [unlimitedTarget, setUnlimitedTarget] = useState("");
  const [unlimitedUntil, setUnlimitedUntil] = useState("");
  const [grantingUnlimited, setGrantingUnlimited] = useState(false);

  // Polls state
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loadingPolls, setLoadingPolls] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollAllowText, setPollAllowText] = useState(false);
  const [pollExpiry, setPollExpiry] = useState("");
  const [pollMaxSelections, setPollMaxSelections] = useState(1);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [deletePollConfirm, setDeletePollConfirm] = useState<string | null>(null);

  // Maintenance mode state
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceBanner, setMaintenanceBanner] = useState("");
  const [maintenancePages, setMaintenancePages] = useState<string[]>([]);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);

  // System health state
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [runningHealthCheck, setRunningHealthCheck] = useState(false);

  useEffect(() => {
    if (!user) return;
    const checkAdmin = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;
      const role = userData?.role ?? "user";
      console.log("User:", { uid: user.uid, email: user.email, role, userData });
      if (role === "admin") {
        setIsAdmin(true);
        loadData();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (activeTab === "redeem" && isAdmin && redeemCodes.length === 0) {
      loadRedeemCodes();
    }
    if (activeTab === "reserved" && isAdmin && reservedNames.length === 0) {
      loadReservedNames();
    }
    if (activeTab === "polls" && isAdmin) {
      loadPolls();
    }
    if (activeTab === "overview" && isAdmin) {
      loadMaintenanceConfig();
    }
    if (activeTab === "maintenance" && isAdmin) {
      loadMaintenanceConfig();
    }
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (activeTab === "credits" && isAdmin) {
      setLoadingConfig(true);
      getCreditConfig().then((cfg) => { setCreditConfig(cfg); setLoadingConfig(false); }).catch(() => setLoadingConfig(false));
    }
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (activeTab !== "feedback" || !isAdmin) return;
    setLoadingFeedback(true);
    getDocs(query(collection(db, "feedback"), orderBy("createdAt", "desc"), limit(100)))
      .then((snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
        setFeedbackItems(items);
        setOpenFeedbackCount(items.filter((i: any) => i.status === "open").length);
      })
      .catch(() => {})
      .finally(() => setLoadingFeedback(false));
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (activeTab !== "users" || !isAdmin) return;
    setLoadingUsernameRequests(true);
    getUsernameChangeRequests("pending")
      .then(setUsernameRequests)
      .catch(() => {})
      .finally(() => setLoadingUsernameRequests(false));
  }, [activeTab, isAdmin]);

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

  const handleCreateOfficialTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTplName.trim() || !newTplDesc.trim()) return;
    setCreatingTemplate(true);
    try {
      await createOfficialTemplate({
        name: newTplName.trim(),
        description: newTplDesc.trim(),
        files: [],
        tags: newTplTags.split(",").map(t => t.trim()).filter(Boolean),
      });
      toast.success("Official template created!");
      setNewTplName(""); setNewTplDesc(""); setNewTplTags("");
      setShowCreateTemplate(false);
      await loadData();
    } catch {
      toast.error("Failed to create template.");
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    setDeleteTemplateConfirm(templateId);
  };

  const handleOpenTemplateFileEditor = (template: Template) => {
    setEditingTemplateId(template.id);
    setEditingTemplateFiles(template.files ? [...template.files] : []);
    setExpandedFileIndex(null);
    setNewTplFileName("index.html");
    setNewTplFileContent("");
  };

  const handleAddTemplateFile = () => {
    const name = newTplFileName.trim();
    if (!name) return;
    setEditingTemplateFiles(prev => [
      ...prev,
      { name, path: name, content: newTplFileContent, language: detectLanguage(name) },
    ]);
    setNewTplFileName("index.html");
    setNewTplFileContent("");
  };

  const handleUpdateTemplateFileContent = (index: number, content: string) => {
    setEditingTemplateFiles(prev =>
      prev.map((f, i) => i === index ? { ...f, content } : f)
    );
  };

  const handleRemoveTemplateFile = (index: number) => {
    setEditingTemplateFiles(prev => prev.filter((_, i) => i !== index));
    setExpandedFileIndex(null);
  };

  const handleSaveTemplateFiles = async () => {
    if (!editingTemplateId) return;
    setSavingTemplateFiles(true);
    try {
      await updateTemplateFiles(editingTemplateId, editingTemplateFiles);
      toast.success("Template files saved!");
      setAllTemplates(prev =>
        prev.map(t => t.id === editingTemplateId ? { ...t, files: editingTemplateFiles } : t)
      );
      setEditingTemplateId(null);
    } catch {
      toast.error("Failed to save template files.");
    } finally {
      setSavingTemplateFiles(false);
    }
  };

  const confirmDeleteTemplate = async () => {
    const templateId = deleteTemplateConfirm;
    if (!templateId) return;
    setDeletingTemplate(templateId);
    try {
      await deleteTemplateById(templateId);
      toast.success("Template deleted.");
      setAllTemplates(prev => prev.filter(t => t.id !== templateId));
      setTotalTemplates(prev => Math.max(0, prev - 1));
      setDeleteTemplateConfirm(null);
    } catch {
      toast.error("Failed to delete template.");
    } finally {
      setDeletingTemplate(null);
    }
  };

  const handlePublishAdminPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !postContent.trim()) return;
    setPublishingPost(true);
    try {
      await createAdminPost({
        content: postContent.trim(),
        type: postType,
        createdBy: user.uid,
      });
      toast.success("Post published to feed!");
      setPostContent("");
    } catch {
      toast.error("Failed to publish post.");
    } finally {
      setPublishingPost(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !notifTitle.trim() || !notifMessage.trim()) return;
    setSendingNotif(true);
    try {
      await sendNotification({
        userId: notifUserId.trim() || "all",
        type: notifType,
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        createdBy: user.uid,
      });
      toast.success(
        notifUserId === "all" || !notifUserId.trim()
          ? "Notification sent to all users."
          : `Notification sent to ${notifUserId}.`
      );
      setNotifTitle("");
      setNotifMessage("");
    } catch {
      toast.error("Failed to send notification.");
    } finally {
      setSendingNotif(false);
    }
  };

  const loadReservedNames = async () => {
    setLoadingReserved(true);
    try {
      const snap = await getDocs(collection(db, "reservedUsernames"));
      setReservedNames(snap.docs.map((d) => d.id));
    } catch {
      toast.error("Failed to load reserved names.");
    } finally {
      setLoadingReserved(false);
    }
  };

  const handleReserveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newReservedName.trim().toLowerCase();
    if (!name || !/^[a-z0-9_-]{1,30}$/.test(name)) {
      toast.error("Invalid username format.");
      return;
    }
    setSavingReserved(true);
    try {
      await setDoc(doc(db, "reservedUsernames", name), { reservedAt: new Date().toISOString(), reservedBy: user?.uid });
      setReservedNames((prev) => [...prev, name].sort());
      setNewReservedName("");
      toast.success(`"${name}" reserved.`);
    } catch {
      toast.error("Failed to reserve name.");
    } finally {
      setSavingReserved(false);
    }
  };

  const handleUnreserveName = async (name: string) => {
    try {
      await deleteDoc(doc(db, "reservedUsernames", name));
      setReservedNames((prev) => prev.filter((n) => n !== name));
      toast.success(`"${name}" removed from reserved list.`);
    } catch {
      toast.error("Failed to remove reserved name.");
    }
  };

  const loadRedeemCodes = async () => {
    setLoadingCodes(true);
    try {
      const snap = await getDocs(collection(db, "redeem_codes"));
      setRedeemCodes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RedeemCode)));
    } catch {
      toast.error("Failed to load redeem codes.");
    } finally {
      setLoadingCodes(false);
    }
  };

  const handleCreateRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCode.trim()) return;
    setCreatingCode(true);
    try {
      await createRedeemCode({
        code: newCode,
        type: "credits",
        value: parseInt(newCodeValue, 10) || 50,
        usageLimit: parseInt(newCodeUsageLimit, 10) || -1,
        perUserLimit: parseInt(newCodePerUser, 10) || 1,
        expiresAt: newCodeExpiry ? new Date(newCodeExpiry) : null,
        createdBy: user.uid,
      });
      toast.success("Redeem code created!");
      setNewCode("");
      setNewCodeValue("50");
      setNewCodeUsageLimit("100");
      setNewCodePerUser("1");
      setNewCodeExpiry("");
      setShowCreateCode(false);
      await loadRedeemCodes();
    } catch {
      toast.error("Failed to create code.");
    } finally {
      setCreatingCode(false);
    }
  };

  const handleToggleCode = async (codeId: string, isActive: boolean) => {
    try {
      await toggleRedeemCode(codeId, !isActive);
      setRedeemCodes((prev) =>
        prev.map((c) => (c.id === codeId ? { ...c, isActive: !isActive } : c))
      );
    } catch {
      toast.error("Failed to update code.");
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    setDeleteCodeConfirm(codeId);
  };

  const confirmDeleteCode = async () => {
    const codeId = deleteCodeConfirm;
    if (!codeId) return;
    try {
      await deleteRedeemCode(codeId);
      setRedeemCodes((prev) => prev.filter((c) => c.id !== codeId));
      toast.success("Code deleted.");
      setDeleteCodeConfirm(null);
    } catch {
      toast.error("Failed to delete code.");
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

  const handleUpdateRole = async (uid: string, newRole: "user" | "admin") => {
    setUpdatingRole(uid);
    try {
      await updateDoc(doc(db, "users", uid), { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u))
      );
      toast.success(newRole === "admin" ? "User promoted to admin." : "User demoted to user.");
    } catch {
      toast.error("Failed to update role.");
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleUserAction = async () => {
    if (!userActionConfirm) return;
    const { uid, action } = userActionConfirm;
    setModeratingUser(uid);
    try {
      if (action === "ban") {
        await banUser(uid);
        setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, status: "banned" } : u)));
        toast.success("User banned.");
      } else if (action === "suspend") {
        await suspendUser(uid);
        setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, status: "suspended" } : u)));
        toast.success("User suspended.");
      } else {
        await reinstateUser(uid);
        setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, status: "active" } : u)));
        toast.success("User reinstated.");
      }
    } catch {
      toast.error("Failed to update user status.");
    } finally {
      setModeratingUser(null);
      setUserActionConfirm(null);
    }
  };

  const handleAdminChangeUsername = async (uid: string, newUsername: string) => {
    const trimmed = newUsername.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) {
      toast.error("Username must be 3–20 chars: letters, numbers, underscores only.");
      return;
    }
    const available = await checkUsernameAvailable(trimmed);
    if (!available) {
      // Allow saving if it's the same user's existing username
      const owner = users.find((u) => u.uid === uid);
      if (owner?.username !== trimmed) {
        toast.error("That username is already taken.");
        return;
      }
    }
    setSavingUsername(true);
    try {
      await adminChangeUsername(uid, trimmed);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, username: trimmed } : u)));
      toast.success(`Username changed to @${trimmed}.`);
      setUsernameEditUid(null);
      setUsernameEditValue("");
    } catch {
      toast.error("Failed to change username.");
    } finally {
      setSavingUsername(false);
    }
  };

  const handleToggleOfficial = async (uid: string, currentIsOfficial: boolean) => {
    setTogglingOfficial(uid);
    try {
      await setUserOfficial(uid, !currentIsOfficial);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, isOfficial: !currentIsOfficial } : u)));
      toast.success(!currentIsOfficial ? "User marked as official ✓" : "Official status removed.");
    } catch {
      toast.error("Failed to update official status.");
    } finally {
      setTogglingOfficial(null);
    }
  };

  const handleResolveFeedback = async (id: string, status: "resolved" | "dismissed") => {
    setResolvingFeedback(id);
    try {
      await updateDoc(doc(db, "feedback", id), { status });
      setFeedbackItems((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
      setOpenFeedbackCount((c) => Math.max(0, c - 1));
      toast.success(status === "resolved" ? "Marked as resolved." : "Dismissed.");
    } catch {
      toast.error("Failed to update feedback.");
    } finally {
      setResolvingFeedback(null);
    }
  };

  const handleApproveUsernameRequest = async (req: typeof usernameRequests[0]) => {
    setResolvingRequest(req.id);
    try {
      await adminChangeUsername(req.uid, req.requestedUsername);
      await resolveUsernameChangeRequest(req.id, "approved", user!.uid);
      setUsernameRequests((prev) => prev.filter((r) => r.id !== req.id));
      toast.success(`Username changed to @${req.requestedUsername}`);
    } catch {
      toast.error("Failed to approve request.");
    } finally {
      setResolvingRequest(null);
    }
  };

  const handleRejectUsernameRequest = async (req: typeof usernameRequests[0]) => {
    setResolvingRequest(req.id);
    try {
      await resolveUsernameChangeRequest(req.id, "rejected", user!.uid, rejectReason || undefined);
      setUsernameRequests((prev) => prev.filter((r) => r.id !== req.id));
      setShowRejectInput(null);
      setRejectReason("");
      toast.success("Request rejected.");
    } catch {
      toast.error("Failed to reject request.");
    } finally {
      setResolvingRequest(null);
    }
  };

  const handleGiftCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = users.find(
      (u) => u.username === giftTarget.trim() || u.email === giftTarget.trim() || u.uid === giftTarget.trim()
    );
    if (!targetUser) { toast.error("User not found."); return; }
    const amount = parseInt(giftAmount, 10);
    if (isNaN(amount) || amount <= 0) { toast.error("Invalid amount."); return; }
    setGifting(true);
    try {
      const expiry = giftExpiry ? new Date(giftExpiry) : null;
      await giftCredits(targetUser.uid, amount, expiry);
      toast.success(`Gifted ${amount} credits to @${targetUser.username}${expiry ? ` (expires ${expiry.toLocaleDateString()})` : ""}.`);
      setGiftTarget(""); setGiftAmount("50"); setGiftExpiry("");
    } catch {
      toast.error("Failed to gift credits.");
    } finally {
      setGifting(false);
    }
  };

  const handleGrantUnlimited = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = users.find(
      (u) => u.username === unlimitedTarget.trim() || u.email === unlimitedTarget.trim() || u.uid === unlimitedTarget.trim()
    );
    if (!targetUser) { toast.error("User not found."); return; }
    if (!unlimitedUntil) { toast.error("Select an end date."); return; }
    setGrantingUnlimited(true);
    try {
      await giftUnlimitedCredits(targetUser.uid, new Date(unlimitedUntil));
      toast.success(`Unlimited credits granted to @${targetUser.username} until ${new Date(unlimitedUntil).toLocaleDateString()}.`);
      setUnlimitedTarget(""); setUnlimitedUntil("");
    } catch {
      toast.error("Failed to grant unlimited credits.");
    } finally {
      setGrantingUnlimited(false);
    }
  };

  const loadPolls = async () => {
    setLoadingPolls(true);
    try {
      const all = await getAllPolls();
      setPolls(all);
    } catch {
      toast.error("Failed to load polls.");
    } finally {
      setLoadingPolls(false);
    }
  };

  const loadMaintenanceConfig = async () => {
    setLoadingMaintenance(true);
    try {
      const cfg = await getMaintenanceConfig();
      setMaintenanceMode(cfg.maintenanceMode);
      setMaintenanceBanner(cfg.maintenanceBanner ?? "");
      setMaintenancePages(cfg.maintenancePages ?? []);
    } catch { /* silently skip */ }
    finally { setLoadingMaintenance(false); }
  };

  const handleSaveMaintenance = async () => {
    setSavingMaintenance(true);
    try {
      await saveMaintenanceConfig({ maintenanceMode, maintenanceBanner, maintenancePages });
      toast.success(maintenanceMode ? "Maintenance mode enabled." : "Maintenance mode disabled.");
    } catch {
      toast.error("Failed to update maintenance mode.");
    } finally {
      setSavingMaintenance(false);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) { toast.error("Add at least 2 options."); return; }
    setCreatingPoll(true);
    try {
      await createPoll({
        createdBy: user.uid,
        question: pollQuestion,
        options: opts,
        allowTextInput: pollAllowText,
        expiresAt: pollExpiry ? new Date(pollExpiry) : null,
      });
      toast.success("Poll created!");
      setPollQuestion(""); setPollOptions(["", ""]); setPollAllowText(false); setPollExpiry("");
      await loadPolls();
    } catch {
      toast.error("Failed to create poll.");
    } finally {
      setCreatingPoll(false);
    }
  };

  const handleClosePoll = async (pollId: string) => {
    try {
      await closePoll(pollId);
      setPolls((prev) => prev.map((p) => (p.id === pollId ? { ...p, isOpen: false } : p)));
      toast.success("Poll closed.");
    } catch {
      toast.error("Failed to close poll.");
    }
  };

  const confirmDeletePoll = async () => {
    if (!deletePollConfirm) return;
    try {
      await deletePoll(deletePollConfirm);
      setPolls((prev) => prev.filter((p) => p.id !== deletePollConfirm));
      toast.success("Poll deleted.");
      setDeletePollConfirm(null);
    } catch {
      toast.error("Failed to delete poll.");
    }
  };

  const runHealthCheck = async () => {
    setRunningHealthCheck(true);
    const errors: string[] = [];
    let firestoreOk = false;
    let feedReadable = false;
    let templatesReadable = false;

    // Check 1: Firestore connectivity + templates public read.
    // `templates` must be publicly readable (allow read: if true).
    // A permission-denied here means the rule is misconfigured.
    try {
      await getDocs(query(collection(db, "templates"), limit(1)));
      templatesReadable = true;
      firestoreOk = true;
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code === "permission-denied") {
        // Templates are expected to be public — permission-denied is a misconfiguration.
        firestoreOk = true; // Firestore itself is reachable
        errors.push(
          "Templates: permission-denied — the templates collection should allow public read (allow read: if true;)"
        );
      } else {
        errors.push(`Firestore/templates: ${code || err?.message || "unknown"}`);
      }
    }

    // Check 2: Feed public read (unauthenticated query for public posts).
    try {
      await getDocs(query(collection(db, "feed"), where("isPublic", "==", true), limit(1)));
      feedReadable = true;
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code === "permission-denied") {
        errors.push(
          "Feed: permission-denied on public read — the feed rule should allow read for isPublic posts"
        );
      } else {
        errors.push(`Feed: ${code || err?.message || "unknown"}`);
      }
    }

    setSystemHealth({
      firestoreOk,
      feedReadable,
      templatesReadable,
      checkedAt: new Date().toLocaleTimeString(),
      errors,
    });
    setRunningHealthCheck(false);
  };

  const handleSaveCreditConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await saveCreditConfig(creditConfig);
      toast.success("Credit config saved.");
    } catch {
      toast.error("Failed to save config.");
    } finally {
      setSavingConfig(false);
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
    { id: "polls", label: "Polls", icon: <Vote className="w-4 h-4" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
    { id: "redeem", label: "Redeem Codes", icon: <Gift className="w-4 h-4" /> },
    { id: "posts", label: "Posts", icon: <Newspaper className="w-4 h-4" /> },
    { id: "feedback", label: "Feedback", icon: <MessageSquare className="w-4 h-4" />, badge: openFeedbackCount || undefined },
    { id: "reserved", label: "Reserved Names", icon: <AtSign className="w-4 h-4" /> },
    { id: "maintenance", label: "Maintenance", icon: <Wrench className="w-4 h-4" /> },
  ];

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const SidebarNav = ({ onSelect }: { onSelect?: () => void }) => (
    <nav className="flex flex-col gap-1 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 px-3 mb-3">
        Platform Control
      </p>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => { setActiveTab(tab.id); onSelect?.(); }}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left relative",
            activeTab === tab.id
              ? "bg-blue-600/15 text-blue-400 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]"
              : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          {tab.icon}
          <span className="flex-1">{tab.label}</span>
          {tab.badge !== undefined && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold min-w-[18px] text-center">
              {tab.badge}
            </span>
          )}
          {activeTab === tab.id && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
          )}
        </button>
      ))}
    </nav>
  );

  return (
    <>
    <div className="min-h-screen bg-[#0B0F17] text-white flex flex-col">
      {/* Top Navbar */}
      <div className="border-b border-white/5 bg-[#0B0F17]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center justify-between h-14 px-4 md:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-extrabold text-white leading-none block">Admin</span>
                <span className="text-[10px] text-white/30 leading-none">DevOS Control</span>
              </div>
            </div>
          </div>
          <button
            onClick={loadData}
            className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-60 flex-shrink-0 flex-col border-r border-white/5 bg-[#0B0F17] overflow-y-auto">
          <SidebarNav />
        </aside>

        {/* Mobile slide-in drawer */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 z-40 md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed left-0 top-0 h-full w-72 bg-[#111827] border-r border-white/10 z-50 md:hidden flex flex-col shadow-2xl overflow-y-auto"
              >
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-white">Admin Dashboard</span>
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <SidebarNav onSelect={() => setSidebarOpen(false)} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
            {/* Page title */}
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold text-white">
                {tabs.find((t) => t.id === activeTab)?.label}
              </h1>
              <p className="text-sm text-white/40 mt-0.5">
                {activeTab === "overview" && "Platform health and key metrics"}
                {activeTab === "templates" && "Review, approve, and manage all templates"}
                {activeTab === "users" && "View and manage all registered users"}
                {activeTab === "credits" && "Adjust user credit balances"}
                {activeTab === "notifications" && "Send targeted or global notifications"}
                {activeTab === "redeem" && "Create and manage promotional codes"}
                {activeTab === "posts" && "Publish official announcements to the feed"}
                {activeTab === "polls" && "Create and manage community polls"}
                {activeTab === "reserved" && "Manage reserved and protected usernames"}
                {activeTab === "maintenance" && "Toggle maintenance mode and set the banner message"}
              </p>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

                    {/* System Health */}
                    <div className="bg-[#111827] border border-white/10 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                          <Activity className="w-4 h-4 text-green-400" />
                          System Health
                        </h2>
                        <button
                          onClick={runHealthCheck}
                          disabled={runningHealthCheck}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-all disabled:opacity-50"
                        >
                          {runningHealthCheck
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <RefreshCw className="w-3.5 h-3.5" />}
                          {runningHealthCheck ? "Checking…" : "Run Check"}
                        </button>
                      </div>

                      {!systemHealth && !runningHealthCheck && (
                        <p className="text-sm text-white/30 text-center py-4">
                          Click "Run Check" to validate backend configuration.
                        </p>
                      )}

                      {runningHealthCheck && (
                        <div className="flex items-center justify-center py-6 gap-2 text-white/40 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Running health checks…
                        </div>
                      )}

                      {systemHealth && !runningHealthCheck && (
                        <div className="space-y-3">
                          {/* Checked at */}
                          <p className="text-[11px] text-white/30 mb-4">
                            Last checked at {systemHealth.checkedAt}
                          </p>

                          {[
                            {
                              label: "Firestore Connectivity",
                              ok: systemHealth.firestoreOk,
                              desc: systemHealth.firestoreOk
                                ? "Firestore is reachable"
                                : "Cannot connect to Firestore — check Firebase config",
                            },
                            {
                              label: "Templates (public read)",
                              ok: systemHealth.templatesReadable,
                              desc: systemHealth.templatesReadable
                                ? "Public template reads work correctly"
                                : "Templates collection is unreadable",
                            },
                            {
                              label: "Feed (public read)",
                              ok: systemHealth.feedReadable,
                              desc: systemHealth.feedReadable
                                ? "Public feed reads work correctly"
                                : "Feed collection unreadable — check Firestore rules",
                            },
                          ].map(({ label, ok, desc }) => (
                            <div
                              key={label}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border",
                                ok
                                  ? "bg-green-500/5 border-green-500/20"
                                  : "bg-red-500/5 border-red-500/20"
                              )}
                            >
                              {ok ? (
                                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className={cn("text-sm font-semibold", ok ? "text-green-300" : "text-red-300")}>
                                  {label}
                                </p>
                                <p className="text-xs text-white/40 truncate">{desc}</p>
                              </div>
                              <span className={cn(
                                "ml-auto flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                ok ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                              )}>
                                {ok ? "OK" : "Fail"}
                              </span>
                            </div>
                          ))}

                          {systemHealth.errors.length > 0 && (
                            <div className="mt-4 p-4 rounded-xl bg-red-500/5 border border-red-500/15">
                              <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Detected Issues
                              </p>
                              <ul className="space-y-1">
                                {systemHealth.errors.map((e, i) => (
                                  <li key={i} className="text-xs text-red-300/70 font-mono">{e}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {systemHealth.errors.length === 0 && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-green-400/60">
                              <Wifi className="w-3.5 h-3.5" />
                              All systems operational
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Maintenance Mode Quick Toggle */}
                    <div className="bg-[#111827] border border-white/10 rounded-2xl p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-orange-400" />
                            Maintenance Mode
                          </h2>
                          <p className="text-white/40 text-sm">Blocks all non-admin users from the platform. Or put individual pages under maintenance.</p>
                        </div>
                        {loadingMaintenance ? (
                          <Loader2 className="w-6 h-6 text-white/30 animate-spin flex-shrink-0 mt-1" />
                        ) : (
                          <button
                            onClick={() => { setMaintenanceMode((v) => !v); }}
                            className="flex-shrink-0 mt-1"
                            aria-label="Toggle maintenance mode"
                          >
                            {maintenanceMode
                              ? <ToggleRight className="w-10 h-10 text-orange-400" />
                              : <ToggleLeft className="w-10 h-10 text-white/30" />}
                          </button>
                        )}
                      </div>
                      <div className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border ${maintenanceMode ? "bg-orange-500/10 text-orange-300 border-orange-500/20" : "bg-white/5 text-white/40 border-white/10"}`}>
                        {maintenanceMode ? <><WifiOff className="w-4 h-4" /> Maintenance is <strong>ON</strong></> : <><Wifi className="w-4 h-4" /> Maintenance is <strong>OFF</strong></>}
                      </div>
                      <button
                        onClick={handleSaveMaintenance}
                        disabled={savingMaintenance || loadingMaintenance}
                        className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all"
                      >
                        {savingMaintenance ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : "Save"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Templates Tab */}
                {activeTab === "templates" && (
                  <div className="space-y-8">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-400" />
                          Official Templates
                        </h2>
                        <button
                          onClick={() => setShowCreateTemplate(v => !v)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all active:scale-95"
                        >
                          <Plus className="w-4 h-4" />
                          Create Template
                        </button>
                      </div>
                      {showCreateTemplate && (
                        <form onSubmit={handleCreateOfficialTemplate} className="bg-[#111827] border border-white/10 rounded-2xl p-6 mb-6 space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Template Name</label>
                            <input value={newTplName} onChange={e => setNewTplName(e.target.value)} required placeholder="My Official Template" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Description</label>
                            <textarea value={newTplDesc} onChange={e => setNewTplDesc(e.target.value)} required placeholder="What does this template do?" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 h-20 resize-none" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Tags (comma-separated)</label>
                            <input value={newTplTags} onChange={e => setNewTplTags(e.target.value)} placeholder="react, landing-page" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" />
                          </div>
                          <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setShowCreateTemplate(false)} className="px-5 py-2.5 rounded-xl font-bold text-white/40 hover:text-white transition-colors">Cancel</button>
                            <button type="submit" disabled={creatingTemplate} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-60">
                              {creatingTemplate && <Loader2 className="w-4 h-4 animate-spin" />}
                              {creatingTemplate ? "Creating..." : "Create Official Template"}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>

                    {pendingTemplates.length > 0 && (
                      <div>
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">PENDING</span>
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
                      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">LIVE</span>
                        Approved Templates
                      </h2>
                      {allTemplates.filter((t) => t.isApproved).length === 0 ? (
                        <p className="text-white/30 text-sm py-8 text-center">No approved templates yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {allTemplates.filter((t) => t.isApproved).map((template) => (
                            <div key={template.id} className="p-4 rounded-2xl bg-[#111827] border border-white/5 flex items-center justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="font-bold text-white truncate">{template.name}</p>
                                  {template.isOfficial && (
                                    <span className="px-2 py-0.5 rounded-md bg-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase flex items-center gap-1 flex-shrink-0">
                                      <Star className="w-2.5 h-2.5" />
                                      Official
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-white/40">
                                  by {template.authorUsername || template.authorName} · {template.downloads} downloads · {template.likes} likes
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="px-2 py-1 rounded-lg bg-green-500/10 text-green-400 text-xs font-bold">Live</span>
                                <button
                                  onClick={() => handleOpenTemplateFileEditor(template)}
                                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all text-xs font-bold"
                                  title="Edit files"
                                >
                                  <FileCode className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Files ({(template.files || []).length})</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteTemplate(template.id)}
                                  disabled={deletingTemplate === template.id}
                                  className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                                >
                                  {deletingTemplate === template.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                              </div>
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
                    <p className="text-white/40 text-sm mb-6">{users.length} registered users</p>
                    {/* Pending Username Change Requests */}
                    {usernameRequests.length > 0 && (
                      <div className="mb-6 bg-[#111827] border border-yellow-500/20 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <AtSign className="w-4 h-4 text-yellow-400" />
                          <h3 className="text-sm font-bold text-white">Pending Username Requests</h3>
                          <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 text-[10px] font-bold border border-yellow-500/20">
                            {usernameRequests.length}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {usernameRequests.map((req) => (
                            <div key={req.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                              <div className="min-w-0">
                                <p className="text-sm text-white">
                                  <span className="font-mono text-white/60">@{req.currentUsername}</span>
                                  <span className="text-white/30 mx-2">→</span>
                                  <span className="font-mono font-bold text-yellow-400">@{req.requestedUsername}</span>
                                </p>
                                {req.reason && <p className="text-xs text-white/40 mt-0.5 truncate">{req.reason}</p>}
                              </div>
                              <div className="shrink-0 flex items-center gap-1.5">
                                {showRejectInput === req.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      value={rejectReason}
                                      onChange={(e) => setRejectReason(e.target.value)}
                                      placeholder="Reason (optional)"
                                      className="text-xs px-2 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-red-500/40 w-32"
                                    />
                                    <button
                                      onClick={() => handleRejectUsernameRequest(req)}
                                      disabled={resolvingRequest === req.id}
                                      className="px-2.5 py-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all disabled:opacity-50"
                                    >
                                      {resolvingRequest === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Reject"}
                                    </button>
                                    <button
                                      onClick={() => { setShowRejectInput(null); setRejectReason(""); }}
                                      className="px-2.5 py-1.5 rounded-xl bg-white/5 text-white/40 hover:text-white text-xs font-bold transition-all"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleApproveUsernameRequest(req)}
                                      disabled={resolvingRequest === req.id}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs font-bold transition-all disabled:opacity-50"
                                    >
                                      {resolvingRequest === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => setShowRejectInput(req.id)}
                                      className="px-2.5 py-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Desktop: table-like rows; Mobile: cards */}
                    <div className="space-y-2">
                      {users.map((u) => (
                        <div key={u.uid} className="rounded-2xl bg-[#111827] border border-white/5">
                          <div className="p-4 flex items-center gap-3">
                          <Avatar src={u.avatarUrl} displayName={u.displayName} size="md" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-white text-sm truncate">{u.displayName}</p>
                              {u.role === "admin" && (
                                <span className="px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[10px] font-bold uppercase flex-shrink-0">Admin</span>
                              )}
                            </div>
                            <p className="text-xs text-white/40 truncate">@{u.username} · {u.email}</p>
                          </div>
                          <div className="text-right text-xs text-white/40 shrink-0 hidden sm:block">
                            <p>{u.projectCount || 0} projects</p>
                            <p className="flex items-center gap-1 justify-end text-yellow-400/70">
                              <Zap className="w-3 h-3" />
                              {u.credits ? `${u.credits.daily + u.credits.monthly}` : "—"}
                            </p>
                          </div>
                          {/* Role controls */}
                          <div className="shrink-0 ml-2">
                            {u.role === "admin" ? (
                              <button
                                onClick={() => handleUpdateRole(u.uid, "user")}
                                disabled={updatingRole === u.uid}
                                title="Demote to user"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-xs font-bold disabled:opacity-50"
                              >
                                {updatingRole === u.uid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" />}
                                <span className="hidden sm:inline">Demote</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateRole(u.uid, "admin")}
                                disabled={updatingRole === u.uid}
                                title="Promote to admin"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all text-xs font-bold disabled:opacity-50"
                              >
                                {updatingRole === u.uid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                                <span className="hidden sm:inline">Promote</span>
                              </button>
                            )}
                          </div>

                          {/* Moderation controls */}
                          <div className="shrink-0 flex items-center gap-1 ml-1">
                            {u.status === "banned" || u.status === "suspended" ? (
                              <button
                                onClick={() => setUserActionConfirm({ uid: u.uid, action: "reinstate" })}
                                disabled={moderatingUser === u.uid}
                                title="Reinstate user"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all text-xs font-bold disabled:opacity-50"
                              >
                                {moderatingUser === u.uid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                <span className="hidden sm:inline">Reinstate</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => setUserActionConfirm({ uid: u.uid, action: "suspend" })}
                                  disabled={moderatingUser === u.uid || u.uid === user?.uid}
                                  title="Suspend user"
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-all text-xs font-bold disabled:opacity-50"
                                >
                                  {moderatingUser === u.uid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                                  <span className="hidden sm:inline">Suspend</span>
                                </button>
                                <button
                                  onClick={() => setUserActionConfirm({ uid: u.uid, action: "ban" })}
                                  disabled={moderatingUser === u.uid || u.uid === user?.uid}
                                  title="Ban user"
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-xs font-bold disabled:opacity-50"
                                >
                                  {moderatingUser === u.uid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                                  <span className="hidden sm:inline">Ban</span>
                                </button>
                              </>
                            )}
                          </div>

                          {/* Change Username button */}
                          <div className="shrink-0 ml-1">
                            <button
                              onClick={() => {
                                setUsernameEditUid(u.uid);
                                setUsernameEditValue(u.username);
                              }}
                              title="Change username"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs font-bold"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Rename</span>
                            </button>
                          </div>
                          {/* Official toggle */}
                          <div className="shrink-0 ml-1">
                            <button
                              onClick={() => handleToggleOfficial(u.uid, !!u.isOfficial)}
                              disabled={togglingOfficial === u.uid}
                              title={u.isOfficial ? "Remove official status" : "Mark as official"}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all text-xs font-bold disabled:opacity-50 ${
                                u.isOfficial
                                  ? "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                                  : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              {togglingOfficial === u.uid
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <BadgeCheck className="w-3.5 h-3.5" />}
                              <span className="hidden sm:inline">{u.isOfficial ? "Official ✓" : "Official"}</span>
                            </button>
                          </div>
                          </div>

                          {/* Inline username editor */}
                          {usernameEditUid === u.uid && (
                            <div className="px-4 pb-4 flex items-center gap-2">
                              <input
                                autoFocus
                                type="text"
                                value={usernameEditValue}
                                onChange={(e) => setUsernameEditValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                                placeholder="new_username"
                                maxLength={20}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500 transition-all"
                              />
                              <button
                                onClick={() => handleAdminChangeUsername(u.uid, usernameEditValue)}
                                disabled={savingUsername || !usernameEditValue.trim()}
                                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                              >
                                {savingUsername ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                              </button>
                              <button
                                onClick={() => { setUsernameEditUid(null); setUsernameEditValue(""); }}
                                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-xs font-bold transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
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
                    {/* Global Credit Config */}
                    <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 max-w-lg">
                      <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-purple-400" />
                        Global Credit Config
                      </h2>
                      <p className="text-white/40 text-sm mb-6">Control whether credits are enforced platform-wide and set a universal action cost.</p>
                      {loadingConfig ? (
                        <div className="flex items-center gap-2 text-white/30 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading config…</div>
                      ) : (
                        <form onSubmit={handleSaveCreditConfig} className="space-y-5">
                          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                            <div>
                              <p className="text-sm font-semibold text-white">Credits Enabled</p>
                              <p className="text-xs text-white/40">When disabled, all actions are free for everyone.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCreditConfig((c) => ({ ...c, creditsEnabled: !c.creditsEnabled }))}
                              className={cn(
                                "w-12 h-6 rounded-full transition-all relative flex-shrink-0",
                                creditConfig.creditsEnabled ? "bg-blue-600" : "bg-white/10"
                              )}
                            >
                              <span className={cn(
                                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow",
                                creditConfig.creditsEnabled ? "left-7" : "left-1"
                              )} />
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">
                              Charge Per Action (0 = use per-action defaults)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={creditConfig.chargePerAction}
                              onChange={(e) => setCreditConfig((c) => ({ ...c, chargePerAction: parseInt(e.target.value, 10) || 0 }))}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all"
                              placeholder="0"
                            />
                            <p className="text-[11px] text-white/30">Set a flat cost per action. Leave 0 to use individual action costs below.</p>
                          </div>

                          {/* Per-action cost overrides */}
                          <div className="space-y-3">
                            <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Per-Action Cost Overrides</p>
                            <div className="grid grid-cols-2 gap-3">
                              {(["createProject", "deploy", "sync", "save", "post", "aiRequest"] as const).map((action) => (
                                <div key={action} className="space-y-1">
                                  <label className="text-[11px] text-white/40 capitalize">{action === "aiRequest" ? "AI Request" : action.replace(/([A-Z])/g, " $1")}</label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder={String({ createProject: 5, deploy: 10, sync: 3, save: 1, post: 2, aiRequest: 5 }[action])}
                                    value={creditConfig.actionCosts?.[action] ?? ""}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      setCreditConfig((c) => ({
                                        ...c,
                                        actionCosts: {
                                          ...c.actionCosts,
                                          [action]: isNaN(val) ? undefined : val,
                                        },
                                      }));
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-all"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                          <button
                            type="submit"
                            disabled={savingConfig}
                            className={cn(
                              "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                              savingConfig ? "bg-white/5 text-white/30 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 text-white active:scale-95"
                            )}
                          >
                            {savingConfig ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Settings2 className="w-4 h-4" />Save Config</>}
                          </button>
                        </form>
                      )}
                    </div>

                    <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 max-w-lg">
                      <h2 className="text-lg font-bold text-white mb-1">Adjust User Credits</h2>
                      <p className="text-white/40 text-sm mb-6">Enter username, email, or UID and the amount to add (positive) or subtract (negative).</p>
                      <form onSubmit={handleAdjustCredits} className="space-y-5">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Target User</label>
                          <input type="text" value={creditTarget} onChange={(e) => setCreditTarget(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all" placeholder="username, email, or UID" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Amount</label>
                            <input type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all" placeholder="10" required />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Type</label>
                            <select value={creditType} onChange={(e) => setCreditType(e.target.value as "daily" | "monthly")} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all">
                              <option value="daily">Daily</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          </div>
                        </div>
                        <button type="submit" disabled={adjusting} className={cn("w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2", adjusting ? "bg-white/5 text-white/30 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white active:scale-95")}>
                          {adjusting ? <><Loader2 className="w-4 h-4 animate-spin" />Adjusting...</> : <><Zap className="w-4 h-4" />Apply Credits Adjustment</>}
                        </button>
                      </form>
                    </div>

                    {/* Gift Credits */}
                    <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 max-w-lg">
                      <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        <Gift className="w-4 h-4 text-green-400" />
                        Gift Credits
                      </h2>
                      <p className="text-white/40 text-sm mb-5">Give a user bonus credits with an optional expiry date.</p>
                      <form onSubmit={handleGiftCredits} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Target User</label>
                          <input
                            type="text"
                            value={giftTarget}
                            onChange={(e) => setGiftTarget(e.target.value)}
                            placeholder="username, email, or UID"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-all"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Amount</label>
                            <input
                              type="number"
                              min="1"
                              value={giftAmount}
                              onChange={(e) => setGiftAmount(e.target.value)}
                              required
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Expires (optional)</label>
                            <input
                              type="date"
                              value={giftExpiry}
                              onChange={(e) => setGiftExpiry(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-all"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={gifting}
                          className="w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {gifting ? <><Loader2 className="w-4 h-4 animate-spin" />Gifting…</> : <><Gift className="w-4 h-4" />Gift Credits</>}
                        </button>
                      </form>
                    </div>

                    {/* Unlimited Credits Pass */}
                    <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 max-w-lg">
                      <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        <Infinity className="w-4 h-4 text-yellow-400" />
                        Grant Unlimited Pass
                      </h2>
                      <p className="text-white/40 text-sm mb-5">Give a user unlimited credits until a specified date.</p>
                      <form onSubmit={handleGrantUnlimited} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Target User</label>
                          <input
                            type="text"
                            value={unlimitedTarget}
                            onChange={(e) => setUnlimitedTarget(e.target.value)}
                            placeholder="username, email, or UID"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Valid Until</label>
                          <input
                            type="date"
                            value={unlimitedUntil}
                            onChange={(e) => setUnlimitedUntil(e.target.value)}
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-all"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={grantingUnlimited}
                          className="w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {grantingUnlimited ? <><Loader2 className="w-4 h-4 animate-spin" />Granting…</> : <><Infinity className="w-4 h-4" />Grant Unlimited Pass</>}
                        </button>
                      </form>
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-white mb-4">User Credits Overview</h2>
                      <div className="space-y-2">
                        {users.map((u) => (
                          <div key={u.uid} className="p-4 rounded-2xl bg-[#111827] border border-white/5 flex items-center justify-between">
                            <div>
                              <p className="font-bold text-white text-sm">@{u.username}</p>
                              <p className="text-xs text-white/30">{u.email}</p>
                            </div>
                            <div className="text-right text-sm">
                              <p className="text-yellow-400 font-bold flex items-center gap-1 justify-end">
                                <Zap className="w-3 h-3" />
                                {u.credits ? `${u.credits.daily + u.credits.monthly}` : "—"} total
                              </p>
                              {u.credits && (
                                <p className="text-white/30 text-xs">{u.credits.daily} daily + {u.credits.monthly} monthly</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Polls Tab */}
                {activeTab === "polls" && (
                  <div className="space-y-8 max-w-2xl">
                    {/* Create Poll */}
                    <div className="bg-[#111827] border border-white/10 rounded-2xl p-6">
                      <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        <Vote className="w-4 h-4 text-blue-400" />
                        Create Poll
                      </h2>
                      <p className="text-white/40 text-sm mb-5">Published polls appear on the community feed for all users to vote on.</p>
                      <form onSubmit={handleCreatePoll} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Question</label>
                          <input
                            type="text"
                            value={pollQuestion}
                            onChange={(e) => setPollQuestion(e.target.value)}
                            placeholder="e.g. What feature should we build next?"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Options</label>
                          {pollOptions.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => { const next = [...pollOptions]; next[i] = e.target.value; setPollOptions(next); }}
                                placeholder={`Option ${i + 1}`}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                              />
                              {pollOptions.length > 2 && (
                                <button type="button" onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                          {pollOptions.length < 6 && (
                            <button type="button" onClick={() => setPollOptions([...pollOptions, ""])} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1">
                              <Plus className="w-3.5 h-3.5" /> Add option
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Max Selections</label>
                            <input
                              type="number"
                              min="1"
                              max={pollOptions.filter(Boolean).length || 1}
                              value={pollMaxSelections}
                              onChange={(e) => setPollMaxSelections(parseInt(e.target.value, 10) || 1)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Expires (optional)</label>
                            <input
                              type="datetime-local"
                              value={pollExpiry}
                              onChange={(e) => setPollExpiry(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                          <input
                            id="pollAllowText"
                            type="checkbox"
                            checked={pollAllowText}
                            onChange={(e) => setPollAllowText(e.target.checked)}
                            className="w-4 h-4 accent-blue-500"
                          />
                          <label htmlFor="pollAllowText" className="text-sm text-white/70 cursor-pointer">Allow free-text answer</label>
                        </div>
                        <button
                          type="submit"
                          disabled={creatingPoll}
                          className="w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {creatingPoll ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : <><Vote className="w-4 h-4" />Create Poll</>}
                        </button>
                      </form>
                    </div>

                    {/* Poll list */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest">All Polls</h2>
                        <button onClick={loadPolls} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-all" title="Refresh">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {loadingPolls ? (
                        <div className="flex items-center gap-2 text-white/30 text-sm py-6"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
                      ) : polls.length === 0 ? (
                        <p className="text-white/30 text-sm text-center py-8">No polls yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {polls.map((p) => (
                            <div key={p.id} className="bg-[#111827] border border-white/10 rounded-2xl p-5">
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="min-w-0">
                                  <p className="font-semibold text-white text-sm">{p.question}</p>
                                  <p className="text-xs text-white/30 mt-0.5">
                                    {p.options?.length ?? 0} options · {p.totalVotes ?? 0} votes
                                    {p.expiresAt && <> · expires {new Date(p.expiresAt instanceof Object && "toDate" in p.expiresAt ? (p.expiresAt as any).toDate() : p.expiresAt).toLocaleDateString()}</>}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${p.isOpen ? "bg-green-500/15 text-green-400" : "bg-white/10 text-white/30"}`}>
                                    {p.isOpen ? "Open" : "Closed"}
                                  </span>
                                  {p.isOpen && (
                                    <button
                                      onClick={() => handleClosePoll(p.id)}
                                      title="Close poll"
                                      className="p-1.5 rounded-lg text-white/30 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setDeletePollConfirm(p.id)}
                                    title="Delete poll"
                                    className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                {p.options?.map((opt) => {
                                  const totalVotes = p.totalVotes ?? 0;
                                  const optVotes = opt.votes ?? 0;
                                  const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                                  return (
                                    <div key={opt.id} className="flex items-center gap-2 text-xs">
                                      <span className="text-white/60 w-32 truncate">{opt.text}</span>
                                      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                      </div>
                                      <span className="text-white/40 w-8 text-right">{pct}%</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notifications Tab */}
                {activeTab === "notifications" && (
                  <div className="space-y-8">
                    <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 max-w-lg">
                      <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-blue-400" />
                        Send Notification
                      </h2>
                      <p className="text-white/40 text-sm mb-6">Send a message to all users or a specific user.</p>
                      <form onSubmit={handleSendNotification} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Recipient (UID or "all")</label>
                          <input type="text" value={notifUserId} onChange={(e) => setNotifUserId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all" placeholder="all" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Type</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(["admin_message", "system_update", "credit_warning"] as NotificationType[]).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setNotifType(t)}
                                className={cn(
                                  "py-2 px-3 rounded-xl text-xs font-bold border transition-all",
                                  notifType === t
                                    ? "bg-blue-600/20 border-blue-500 text-blue-300"
                                    : "bg-white/5 border-white/10 text-white/50 hover:border-white/20"
                                )}
                              >
                                {t.replace("_", " ")}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Title</label>
                          <input type="text" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all" required placeholder="Notification title" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Message</label>
                          <textarea value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all resize-none" required placeholder="Notification message..." />
                        </div>
                        <button type="submit" disabled={sendingNotif} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                          {sendingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          {sendingNotif ? "Sending..." : "Send Notification"}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Redeem Codes Tab */}
                {activeTab === "redeem" && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Gift className="w-4 h-4 text-yellow-400" />
                        Redeem Codes
                      </h2>
                      <div className="flex gap-2">
                        <button onClick={loadRedeemCodes} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors" title="Refresh">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowCreateCode((v) => !v)} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-bold text-sm transition-all">
                          <Plus className="w-4 h-4" />
                          Create Code
                        </button>
                      </div>
                    </div>

                    {showCreateCode && (
                      <form onSubmit={handleCreateRedeemCode} className="bg-[#111827] border border-white/10 rounded-2xl p-6 space-y-4 max-w-xl">
                        <h3 className="text-base font-bold text-white">New Redeem Code</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5 col-span-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Code</label>
                            <input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono tracking-widest focus:outline-none focus:border-yellow-500/50 transition-all uppercase" required placeholder="DEVOS2024" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Credits Value</label>
                            <input type="number" value={newCodeValue} onChange={(e) => setNewCodeValue(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50 transition-all" min="1" required />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Usage Limit (-1 = ∞)</label>
                            <input type="number" value={newCodeUsageLimit} onChange={(e) => setNewCodeUsageLimit(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50 transition-all" required />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Per User Limit</label>
                            <input type="number" value={newCodePerUser} onChange={(e) => setNewCodePerUser(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50 transition-all" min="1" required />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Expires At (optional)</label>
                            <input type="datetime-local" value={newCodeExpiry} onChange={(e) => setNewCodeExpiry(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50 transition-all" />
                          </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => setShowCreateCode(false)} className="px-5 py-2.5 rounded-xl font-bold text-white/40 hover:text-white transition-colors">Cancel</button>
                          <button type="submit" disabled={creatingCode} className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-60">
                            {creatingCode && <Loader2 className="w-4 h-4 animate-spin" />}
                            {creatingCode ? "Creating..." : "Create Code"}
                          </button>
                        </div>
                      </form>
                    )}

                    {loadingCodes ? (
                      <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-white/20 animate-spin" /></div>
                    ) : redeemCodes.length === 0 ? (
                      <div className="py-12 text-center text-white/20 text-sm">No redeem codes yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {redeemCodes.map((code) => (
                          <div key={code.id} className="p-4 rounded-2xl bg-[#111827] border border-white/5 flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-mono font-bold text-white tracking-widest">{code.id}</span>
                                <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase", code.isActive ? "bg-green-500/10 text-green-400" : "bg-white/5 text-white/20")}>
                                  {code.isActive ? "Active" : "Disabled"}
                                </span>
                              </div>
                              <p className="text-xs text-white/40">
                                +{code.value} credits · Used {code.usedCount} / {code.usageLimit === -1 ? "∞" : code.usageLimit} · {code.perUserLimit}×/user
                                {code.expiresAt && <> · Expires {new Date(code.expiresAt.toMillis?.() ?? code.expiresAt).toLocaleDateString()}</>}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => handleToggleCode(code.id, code.isActive)} className={cn("p-2 rounded-lg transition-all", code.isActive ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" : "bg-white/5 text-white/30 hover:bg-white/10")} title={code.isActive ? "Disable" : "Enable"}>
                                {code.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                              </button>
                              <button onClick={() => handleDeleteCode(code.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Admin Posts Tab */}
                {activeTab === "posts" && (
                  <div className="space-y-8">
                    <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 max-w-2xl">
                      <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        <Newspaper className="w-4 h-4 text-blue-400" />
                        Publish Official Post
                      </h2>
                      <p className="text-white/40 text-sm mb-6">
                        Posts appear in the community feed as <span className="text-yellow-400 font-bold">DevOS Official</span>.
                      </p>
                      <form onSubmit={handlePublishAdminPost} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Post Type</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(["announcement", "update", "feature"] as const).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setPostType(t)}
                                className={cn(
                                  "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all",
                                  postType === t
                                    ? "bg-blue-600/20 border-blue-500 text-blue-300"
                                    : "bg-white/5 border-white/10 text-white/50 hover:border-white/20"
                                )}
                              >
                                {t === "announcement" ? "Announcement" : t === "update" ? "Update" : "Feature"}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Content</label>
                          <textarea value={postContent} onChange={(e) => setPostContent(e.target.value)} rows={5} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all resize-none" required placeholder="Write your official announcement here..." />
                        </div>
                        <div className="flex items-center gap-3">
                          <button type="submit" disabled={publishingPost} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold transition-all">
                            {publishingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {publishingPost ? "Publishing..." : "Publish to Feed"}
                          </button>
                          <p className="text-xs text-white/30">Appears as <span className="text-yellow-400">DevOS Official</span></p>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
                {activeTab === "reserved" && (
                  <div className="space-y-6 max-w-xl">
                    <div className="bg-[#111827] border border-white/10 rounded-2xl p-6">
                      <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        <AtSign className="w-4 h-4 text-blue-400" />
                        Reserve a Username
                      </h2>
                      <p className="text-white/40 text-sm mb-5">
                        Reserved usernames cannot be registered by anyone. Use this to protect brand names.
                      </p>
                      <form onSubmit={handleReserveName} className="flex gap-2">
                        <input
                          type="text"
                          value={newReservedName}
                          onChange={(e) => setNewReservedName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                          placeholder="e.g. devos, admin, support"
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500 font-mono"
                        />
                        <button
                          type="submit"
                          disabled={savingReserved || !newReservedName.trim()}
                          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all"
                        >
                          {savingReserved ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          Reserve
                        </button>
                      </form>
                    </div>

                    <div className="bg-[#111827] border border-white/10 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest">Reserved List</h2>
                        <button
                          onClick={loadReservedNames}
                          className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-all"
                          title="Refresh"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {loadingReserved ? (
                        <div className="flex items-center gap-2 text-white/30 text-sm py-4">
                          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                        </div>
                      ) : reservedNames.length === 0 ? (
                        <p className="text-white/30 text-sm py-4 text-center">No reserved names yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {reservedNames.map((name) => (
                            <div key={name} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                              <span className="text-sm font-mono text-white/80">@{name}</span>
                              <button
                                onClick={() => handleUnreserveName(name)}
                                className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Feedback Tab */}
                {activeTab === "feedback" && (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-lg font-bold text-white">User Feedback</h2>
                        <p className="text-white/40 text-sm mt-1">Bug reports, feature requests, and general feedback.</p>
                      </div>
                      {openFeedbackCount > 0 && (
                        <span className="px-3 py-1 rounded-full bg-yellow-500/15 text-yellow-400 text-xs font-bold border border-yellow-500/20">
                          {openFeedbackCount} open
                        </span>
                      )}
                    </div>

                    {loadingFeedback ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
                      </div>
                    ) : feedbackItems.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="w-10 h-10 text-white/15 mx-auto mb-3" />
                        <p className="text-white/30 text-sm">No feedback yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {feedbackItems.map((item) => (
                          <div
                            key={item.id}
                            className={`bg-[#111827] border rounded-2xl p-5 transition-all ${
                              item.status === "open" ? "border-white/10" : "border-white/5 opacity-60"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  item.type === "bug"
                                    ? "bg-red-500/15 text-red-400 border-red-500/20"
                                    : item.type === "feature"
                                    ? "bg-purple-500/15 text-purple-400 border-purple-500/20"
                                    : "bg-blue-500/15 text-blue-400 border-blue-500/20"
                                }`}>
                                  {item.type === "bug" ? "🐛 Bug" : item.type === "feature" ? "✨ Feature" : "💬 Feedback"}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  item.status === "open"
                                    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                    : item.status === "resolved"
                                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                                    : "bg-white/5 text-white/30 border-white/10"
                                }`}>
                                  {item.status}
                                </span>
                              </div>
                              {item.status === "open" && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => handleResolveFeedback(item.id, "resolved")}
                                    disabled={resolvingFeedback === item.id}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs font-bold transition-all disabled:opacity-50"
                                  >
                                    {resolvingFeedback === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                    Resolve
                                  </button>
                                  <button
                                    onClick={() => handleResolveFeedback(item.id, "dismissed")}
                                    disabled={resolvingFeedback === item.id}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 text-white/30 hover:bg-white/10 hover:text-white text-xs font-bold transition-all disabled:opacity-50"
                                  >
                                    <X className="w-3 h-3" />
                                    Dismiss
                                  </button>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-white/80 mt-3 leading-relaxed">{item.message}</p>
                            <div className="flex items-center gap-3 mt-3 text-[11px] text-white/30">
                              {item.userEmail && <span>From: {item.userEmail}</span>}
                              {item.createdAt && (
                                <span>{new Date(item.createdAt.toDate?.() ?? item.createdAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Maintenance Mode Tab */}
                {activeTab === "maintenance" && (
                  <div className="space-y-6 max-w-xl">
                    {loadingMaintenance ? (
                      <div className="flex items-center gap-2 text-white/30 text-sm py-8">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                      </div>
                    ) : (
                      <>
                        {/* Global toggle card */}
                        <div className="bg-[#111827] border border-white/10 rounded-2xl p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                                <Wrench className="w-4 h-4 text-orange-400" />
                                Global Maintenance Mode
                              </h2>
                              <p className="text-white/40 text-sm">
                                When enabled, all non-admin users see a full-screen maintenance page and cannot access the platform.
                              </p>
                            </div>
                            <button
                              onClick={() => setMaintenanceMode((v) => !v)}
                              className="flex-shrink-0 mt-1"
                              aria-label="Toggle maintenance mode"
                            >
                              {maintenanceMode
                                ? <ToggleRight className="w-10 h-10 text-orange-400" />
                                : <ToggleLeft className="w-10 h-10 text-white/30" />}
                            </button>
                          </div>

                          <div className={`mt-4 px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${
                            maintenanceMode
                              ? "bg-orange-500/10 text-orange-300 border border-orange-500/20"
                              : "bg-white/5 text-white/40 border border-white/10"
                          }`}>
                            {maintenanceMode
                              ? <><WifiOff className="w-4 h-4" /> Global maintenance is currently <strong>ON</strong></>
                              : <><Wifi className="w-4 h-4" /> Global maintenance is currently <strong>OFF</strong></>}
                          </div>
                        </div>

                        {/* Per-page maintenance */}
                        <div className="bg-[#111827] border border-white/10 rounded-2xl p-6">
                          <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest mb-1">
                            Per-Page Maintenance
                          </h2>
                          <p className="text-white/40 text-xs mb-4">
                            Select individual pages to put under maintenance. Navigation still works — only the selected pages are blocked.
                          </p>
                          <div className="space-y-2">
                            {[
                              { label: "Explore", path: "/explore" },
                              { label: "Templates", path: "/templates" },
                              { label: "Communities", path: "/communities" },
                              { label: "Search", path: "/search" },
                              { label: "Docs", path: "/docs" },
                              { label: "Settings", path: "/settings" },
                              { label: "Projects / IDE", path: "/projects" },
                              { label: "User Profiles (/u/...)", path: "/u" },
                              { label: "Project Pages (/project/...)", path: "/project" },
                              { label: "Orgs (/org/...)", path: "/org" },
                            ].map(({ label, path }) => {
                              const isOn = maintenancePages.includes(path);
                              return (
                                <button
                                  key={path}
                                  onClick={() => setMaintenancePages(prev =>
                                    prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
                                  )}
                                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                                    isOn
                                      ? "bg-orange-500/10 border-orange-500/30 text-orange-300"
                                      : "bg-black/20 border-white/10 text-white/50 hover:text-white hover:border-white/20"
                                  }`}
                                >
                                  <span className="font-mono text-xs text-white/40 mr-3">{path}</span>
                                  <span>{label}</span>
                                  {isOn
                                    ? <ToggleRight className="w-6 h-6 text-orange-400 ml-auto flex-shrink-0" />
                                    : <ToggleLeft className="w-6 h-6 text-white/20 ml-auto flex-shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                          {maintenancePages.length > 0 && (
                            <p className="text-xs text-orange-400/70 mt-3">
                              {maintenancePages.length} page{maintenancePages.length !== 1 ? "s" : ""} under maintenance. Users can still navigate to other pages.
                            </p>
                          )}
                        </div>

                        {/* Banner message */}
                        <div className="bg-[#111827] border border-white/10 rounded-2xl p-6">
                          <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest mb-1">
                            Maintenance Banner Message
                          </h2>
                          <p className="text-white/40 text-xs mb-4">
                            Optional message shown to users on both global and per-page maintenance screens.
                          </p>
                          <textarea
                            value={maintenanceBanner}
                            onChange={(e) => setMaintenanceBanner(e.target.value)}
                            placeholder="e.g. We'll be back in 30 minutes. Thanks for your patience!"
                            rows={3}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                          />
                        </div>

                        {/* Save */}
                        <button
                          onClick={handleSaveMaintenance}
                          disabled={savingMaintenance}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all"
                        >
                          {savingMaintenance
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                            : <><Wrench className="w-4 h-4" /> Save Changes</>}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>

    <ConfirmModal
      open={!!deleteTemplateConfirm}
      title="Delete Template"
      description="This template will be permanently removed from the marketplace."
      warning="This action cannot be undone."
      confirmLabel="Delete Template"
      loading={!!deletingTemplate}
      onConfirm={confirmDeleteTemplate}
      onCancel={() => setDeleteTemplateConfirm(null)}
    />

    <ConfirmModal
      open={!!deleteCodeConfirm}
      title="Delete Code"
      description={deleteCodeConfirm ? `Delete redeem code "${deleteCodeConfirm}"? Users will no longer be able to use it.` : ""}
      warning="This action cannot be undone."
      confirmLabel="Delete Code"
      onConfirm={confirmDeleteCode}
      onCancel={() => setDeleteCodeConfirm(null)}
    />

    <ConfirmModal
      open={!!deletePollConfirm}
      title="Delete Poll"
      description="This poll will be permanently removed."
      warning="This action cannot be undone."
      confirmLabel="Delete Poll"
      onConfirm={confirmDeletePoll}
      onCancel={() => setDeletePollConfirm(null)}
    />

    <ConfirmModal
      open={!!userActionConfirm}
      title={
        userActionConfirm?.action === "ban" ? "Ban User" :
        userActionConfirm?.action === "suspend" ? "Suspend User" : "Reinstate User"
      }
      description={
        userActionConfirm?.action === "ban"
          ? "This user will be permanently banned from the platform."
          : userActionConfirm?.action === "suspend"
          ? "This user will be temporarily suspended."
          : "This user will regain full access to the platform."
      }
      warning={userActionConfirm?.action !== "reinstate" ? "The user will be notified." : undefined}
      confirmLabel={
        userActionConfirm?.action === "ban" ? "Ban User" :
        userActionConfirm?.action === "suspend" ? "Suspend User" : "Reinstate User"
      }
      loading={!!moderatingUser}
      onConfirm={handleUserAction}
      onCancel={() => setUserActionConfirm(null)}
    />

    {/* Template File Editor Modal */}
    <AnimatePresence>
      {editingTemplateId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <FileCode className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="font-bold text-white text-sm">
                    Edit Template Files
                  </p>
                  <p className="text-xs text-white/40">
                    {editingTemplateFiles.length} file{editingTemplateFiles.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingTemplateId(null)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Existing files */}
              {editingTemplateFiles.length === 0 && (
                <p className="text-sm text-white/30 text-center py-4">No files yet. Add one below.</p>
              )}
              {editingTemplateFiles.map((file, index) => (
                <div key={index} className="rounded-xl border border-white/10 overflow-hidden">
                  <div
                    className="flex items-center justify-between px-4 py-3 bg-white/5 cursor-pointer hover:bg-white/8 transition-colors"
                    onClick={() => setExpandedFileIndex(expandedFileIndex === index ? null : index)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode className="w-4 h-4 text-white/40 flex-shrink-0" />
                      <span className="text-sm font-mono text-white truncate">{file.path}</span>
                      <span className="text-xs text-white/30 flex-shrink-0">{file.language}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveTemplateFile(index); }}
                        className="p-1 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {expandedFileIndex === index
                        ? <ChevronUp className="w-3.5 h-3.5 text-white/30" />
                        : <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                      }
                    </div>
                  </div>
                  {expandedFileIndex === index && (
                    <textarea
                      value={file.content}
                      onChange={(e) => handleUpdateTemplateFileContent(index, e.target.value)}
                      className="w-full bg-[#0D1117] text-white/80 font-mono text-xs p-4 resize-none outline-none border-t border-white/10"
                      rows={12}
                      spellCheck={false}
                      placeholder="File content..."
                    />
                  )}
                </div>
              ))}

              {/* Add new file */}
              <div className="rounded-xl border border-dashed border-white/10 p-4 space-y-3">
                <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Add New File</p>
                <input
                  type="text"
                  value={newTplFileName}
                  onChange={(e) => setNewTplFileName(e.target.value)}
                  placeholder="filename (e.g. css/style.css)"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50 font-mono"
                />
                <textarea
                  value={newTplFileContent}
                  onChange={(e) => setNewTplFileContent(e.target.value)}
                  placeholder="File content (optional)..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50 font-mono resize-none"
                  rows={6}
                  spellCheck={false}
                />
                <button
                  onClick={handleAddTemplateFile}
                  disabled={!newTplFileName.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-sm rounded-lg font-bold transition-all disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                  Add File
                </button>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 flex-shrink-0">
              <button
                onClick={() => setEditingTemplateId(null)}
                className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplateFiles}
                disabled={savingTemplateFiles}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
              >
                {savingTemplateFiles ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4" />}
                {savingTemplateFiles ? "Saving..." : "Save Files"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
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
