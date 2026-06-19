import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import AdminThemesTab from "../components/AdminThemesTab";
import AdminVuxTab from "../components/AdminVuxTab";
import KoraChatWidget from "../components/KoraChatWidget";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  query,
  limit,
  where,
  orderBy,
  onSnapshot,
  getCountFromServer,
} from "firebase/firestore";
import { approveTemplate, rejectTemplate, getPendingTemplates, getAllTemplates, createOfficialTemplate, deleteTemplateById, updateTemplateFiles } from "../lib/templateService";
import { getAllEvents, setEventStatus, deleteEvent as deleteEventDoc, createEvent, getEventRegistrations } from "../lib/eventsService";
import { adjustCredits, getCreditConfig, saveCreditConfig, CreditConfig, giftCredits, giftUnlimitedCredits, getMaintenanceConfig, saveMaintenanceConfig, MaintenanceConfig, getSiteConfig, saveSiteConfig, SiteConfig, SITE_CONFIG_DEFAULTS } from "../lib/creditsService";
import { sendNotification } from "../lib/notificationService";
import { createRedeemCode, toggleRedeemCode, deleteRedeemCode } from "../lib/redeemCodeService";
import { createAdminPost } from "../lib/feedService";
import { banUser, suspendUser, reinstateUser, adminChangeUsername, checkUsernameAvailable, setUserOfficial, getUsernameChangeRequests, resolveUsernameChangeRequest, createPortfolioProject } from "../lib/userService";
import { createPoll, getAllPolls, closePoll, deletePoll } from "../lib/pollService";
import { updateCommunity, deleteCommunity, createCommunity, batchAddAllUsersToCommunity } from "../lib/communityService";
import { getAllOrgs, deleteOrg, updateOrg, createOrg, batchAddAllUsersToOrg } from "../lib/orgService";
import { Template, UserProfile, Credits, RedeemCode, NotificationType, Poll, Community, Organization, Project, EventRegistration } from "../types";
import { useDevOSAI } from "../hooks/useDevOSAI";
import { Event as DevEvent, EventStatus, EventType } from "../types";
import { TOPICS } from "../lib/learnData";
import { getAllLessons, createLesson, updateLesson, deleteLesson, slugifyTitle, DynamicLesson } from "../lib/learnService";
import { enqueueEmail } from "../lib/emailQueueService";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
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
  ChevronRight,
  ChevronLeft,
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
  Globe,
  Users2,
  Save,
  Link2,
  Building2,
  FolderPlus,
  Calendar,
  MapPin,
  Bot,
  Sparkles,
  BookOpen,
  Bold,
  Italic,
  Code2,
  Quote,
  List,
  ImageDown,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { cn, generateAppId } from '../lib/utils';
import Avatar from "../components/Avatar";
import ConfirmModal from "../components/ConfirmModal";
import CustomSelect from "../components/CustomSelect";

type Tab = "overview" | "templates" | "themes" | "users" | "credits" | "notifications" | "redeem" | "posts" | "reserved" | "polls" | "feedback" | "deletions" | "maintenance" | "email" | "communities" | "organizations" | "projects" | "site" | "events" | "learn" | "kora" | "vux" | "portfolio-ide";

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
  hasPortfolio?: boolean;
}

interface SystemHealth {
  firestoreOk: boolean;
  feedReadable: boolean;
  templatesReadable: boolean;
  checkedAt: string | null;
  errors: string[];
}

const mockActivityData = [
      { name: "Mon", users: 120, projects: 40 },
      { name: "Tue", users: 150, projects: 55 },
      { name: "Wed", users: 200, projects: 80 },
      { name: "Thu", users: 180, projects: 70 },
      { name: "Fri", users: 250, projects: 120 },
      { name: "Sat", users: 300, projects: 150 },
      { name: "Sun", users: 280, projects: 140 },
    ];

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
  const [adminPostAttachments, setAdminPostAttachments] = useState<string[]>([]);
  const adminPostTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [publishingPost, setPublishingPost] = useState(false);

  // Reserved usernames state
  const [reservedNames, setReservedNames] = useState<string[]>([]);
  const [loadingReserved, setLoadingReserved] = useState(false);
  const [newReservedName, setNewReservedName] = useState("");
  const [savingReserved, setSavingReserved] = useState(false);
  const [reservedPortfolios, setReservedPortfolios] = useState<Record<string, boolean>>({});
  const [creatingReservedPortfolio, setCreatingReservedPortfolio] = useState<string | null>(null);

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
  const [creatingPortfolio, setCreatingPortfolio] = useState<string | null>(null);

  // Duplicate portfolios state
  const [dupPortfolios, setDupPortfolios] = useState<Array<{ uid: string; username: string; portfolios: Array<{ id: string; name: string; createdAt: any }> }>>([]);
  const [loadingDupPortfolios, setLoadingDupPortfolios] = useState(false);
  const [deletingPortfolio, setDeletingPortfolio] = useState<string | null>(null);

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

  // Deletion requests state
  const [deletionRequests, setDeletionRequests] = useState<Array<{
    id: string;
    userId: string;
    email: string;
    reason?: string;
    requestedAt: any;
    status: string;
  }>>([]);
  const [loadingDeletions, setLoadingDeletions] = useState(false);
  const [pendingDeletionCount, setPendingDeletionCount] = useState(0);
  const [processingDeletion, setProcessingDeletion] = useState<string | null>(null);

  // Admin notification bell state
  const [showAdminNotifPanel, setShowAdminNotifPanel] = useState(false);
  const [pendingUsernameRequestCount, setPendingUsernameRequestCount] = useState(0);

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
  const [pollAllowGuest, setPollAllowGuest] = useState(false);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
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

  // Admin email state
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Communities management state
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  const [communityEditName, setCommunityEditName] = useState("");
  const [communityEditDesc, setCommunityEditDesc] = useState("");
  const [communityEditCategory, setCommunityEditCategory] = useState("");
  const [communityEditPublic, setCommunityEditPublic] = useState(true);
  const [savingCommunity, setSavingCommunity] = useState(false);
  const [deleteCommunityConfirm, setDeleteCommunityConfirm] = useState<string | null>(null);
  const [deletingCommunity, setDeletingCommunity] = useState(false);

  // Site settings state
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(SITE_CONFIG_DEFAULTS);

  // Learn lessons state
  const [dynamicLessons, setDynamicLessons] = useState<DynamicLesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<DynamicLesson | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: "", slug: "", description: "", codeExample: "",
    language: "javascript" as DynamicLesson["language"],
    explanation: "", expectedOutput: "", published: true,
  });
  const [savingLesson, setSavingLesson] = useState(false);
  const [deleteLessonConfirm, setDeleteLessonConfirm] = useState<string | null>(null);
  const [deletingLesson, setDeletingLesson] = useState(false);
  const [loadingSiteConfig, setLoadingSiteConfig] = useState(false);
  const [savingSiteConfig, setSavingSiteConfig] = useState(false);

  // Organizations management state
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [orgEditName, setOrgEditName] = useState("");
  const [orgEditDesc, setOrgEditDesc] = useState("");
  const [orgEditPublic, setOrgEditPublic] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);
  const [deleteOrgConfirm, setDeleteOrgConfirm] = useState<string | null>(null);
  const [deletingOrg, setDeletingOrg] = useState(false);

  // Create-community form state (admin)
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState("");
  const [newCommunityDesc, setNewCommunityDesc] = useState("");
  const [newCommunityCategory, setNewCommunityCategory] = useState("general");
  const [newCommunityPublic, setNewCommunityPublic] = useState(true);
  const [newCommunityOfficial, setNewCommunityOfficial] = useState(false);
  const [creatingCommunity, setCreatingCommunity] = useState(false);

  // Create-org form state (admin)
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDesc, setNewOrgDesc] = useState("");
  const [newOrgPublic, setNewOrgPublic] = useState(true);
  const [newOrgOfficial, setNewOrgOfficial] = useState(false);
  const [creatingOrg, setCreatingOrg] = useState(false);

  // Events management state
  const [adminEvents, setAdminEvents] = useState<DevEvent[]>([]);
  const [loadingAdminEvents, setLoadingAdminEvents] = useState(false);
  const [eventStatusFilter, setEventStatusFilter] = useState<"all" | EventStatus>("all");
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);
  const [deleteEventConfirm, setDeleteEventConfirm] = useState<string | null>(null);
  const [deletingEvent, setDeletingEvent] = useState(false);

  // RSVP viewer state
  const [expandedRsvpEventId, setExpandedRsvpEventId] = useState<string | null>(null);
  const [eventRsvps, setEventRsvps] = useState<Record<string, EventRegistration[]>>({});
  const [loadingRsvpEventId, setLoadingRsvpEventId] = useState<string | null>(null);

  // Create event state (admin)
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEvTitle, setNewEvTitle] = useState("");
  const [newEvDesc, setNewEvDesc] = useState("");
  const [newEvType, setNewEvType] = useState<EventType>("online");
  const [newEvStart, setNewEvStart] = useState("");
  const [newEvEnd, setNewEvEnd] = useState("");
  const [newEvLink, setNewEvLink] = useState("");
  const [newEvVenue, setNewEvVenue] = useState("");
  const [newEvAddress, setNewEvAddress] = useState("");
  const [newEvPremium, setNewEvPremium] = useState(false);
  const [creatingAdminEvent, setCreatingAdminEvent] = useState(false);

  // AI Template Generator state (templates tab)
  const [aiTestPrompt, setAiTestPrompt] = useState("");
  const [aiGenName, setAiGenName] = useState("");
  const [aiGenDesc, setAiGenDesc] = useState("");
  const [aiGenTags, setAiGenTags] = useState("");
  const [aiGenFiles, setAiGenFiles] = useState<Template["files"]>([]);
  const [aiGenReady, setAiGenReady] = useState(false);
  const [savingAiTemplate, setSavingAiTemplate] = useState(false);
  const { ask: askAI, isLoading: aiTesting, error: aiTestError, reset: resetAiTest } = useDevOSAI();

  // Admin projects state
  const [adminProjects, setAdminProjects] = useState<Project[]>([]);
  const [loadingAdminProjects, setLoadingAdminProjects] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectPublic, setNewProjectPublic] = useState(true);
  const [newProjectOfficial, setNewProjectOfficial] = useState(true);
  const [creatingAdminProject, setCreatingAdminProject] = useState(false);

  const loadData = async () => {
    // Data is loaded via individual useEffect hooks or specific load functions
  };

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
        setLoading(false);
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
    if (activeTab === "communities" && isAdmin) {
      loadCommunities();
    }
    if (activeTab === "organizations" && isAdmin) {
      loadOrgs();
    }
    if (activeTab === "projects" && isAdmin) {
      loadAdminProjects();
    }
    if (activeTab === "site" && isAdmin) {
      loadSiteConfig();
    }
    if (activeTab === "events" && isAdmin) {
      loadAdminEvents();
    }
    if (activeTab === "learn" && isAdmin) {
      setLoadingLessons(true);
      getAllLessons().then(setDynamicLessons).catch(() => {}).finally(() => setLoadingLessons(false));
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

  // Real-time badge counts — run once when admin is confirmed
  useEffect(() => {
    if (!isAdmin) return;

    const unsubs: (() => void)[] = [];

    // Open feedback count
    unsubs.push(onSnapshot(
      query(collection(db, "feedback"), where("status", "==", "open")),
      (snap) => setOpenFeedbackCount(snap.size)
    ));

    // Pending username change requests
    unsubs.push(onSnapshot(
      query(collection(db, "username_change_requests"), where("status", "==", "pending")),
      (snap) => setPendingUsernameRequestCount(snap.size)
    ));

    // Pending deletion requests
    unsubs.push(onSnapshot(
      query(collection(db, "deletion_requests"), where("status", "==", "pending")),
      (snap) => setPendingDeletionCount(snap.size)
    ));

    return () => unsubs.forEach((u) => u());
  }, [isAdmin]);

  useEffect(() => {
    if (activeTab !== "deletions" || !isAdmin) return;
    setLoadingDeletions(true);
    getDocs(query(collection(db, "deletion_requests"), orderBy("requestedAt", "desc"), limit(100)))
      .then((snap) => {
        setDeletionRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any)));
      })
      .catch(() => {})
      .finally(() => setLoadingDeletions(false));
  }, [activeTab, isAdmin]);

  const adminNotifRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!showAdminNotifPanel) return;
    const handler = (e: MouseEvent) => {
      if (adminNotifRef.current && !adminNotifRef.current.contains(e.target as Node)) {
        setShowAdminNotifPanel(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAdminNotifPanel]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubs: any[] = [];
    
    // Load users
    unsubs.push(onSnapshot(collection(db, 'users'), async (snap) => {
      setTotalUsers(snap.size);
      const usersData = snap.docs.map(d => d.data());
      const usersWithDetails = await Promise.all(usersData.map(async (u: any) => {
        let projectCount = 0;
        let hasPortfolio = false;
        let credits;
        try {
          const pSnap = await getDocs(query(collection(db, 'projects'), where('ownerId', '==', u.uid)));
          projectCount = pSnap.size;
          hasPortfolio = pSnap.docs.some(d => d.data().systemType === 'portfolio');
        } catch (e) { }
        try {
          const cSnap = await getDoc(doc(db, 'user_credits', u.uid));
          if (cSnap.exists()) credits = cSnap.data();
        } catch (e) {}
        return { ...u, projectCount, hasPortfolio, credits };
      }));
      setUsers(usersWithDetails as any[]);
    }));

    // Fetch total projects count once instead of real-time to avoid permission issues and huge reads
    import("firebase/firestore").then(({ getCountFromServer }) => {
      getCountFromServer(collection(db, 'projects')).then((snap) => {
        setTotalProjects(snap.data().count);
      }).catch(console.error);
    });

    unsubs.push(onSnapshot(collection(db, 'templates'), (snap) => {
      const allTpl = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setAllTemplates(allTpl as any[]);
      setPendingTemplates(allTpl.filter(t => !(t as any).isApproved) as any[]);
      setTotalTemplates(allTpl.filter(t => (t as any).isApproved).length);
    }));
    return () => unsubs.forEach(u => typeof u === 'function' && u());
  }, [isAdmin]);

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
        type: postType as "update" | "feature" | "announcement",
        attachments: adminPostAttachments,
        createdBy: user.uid,
      });
      toast.success("Post published to feed!");
      setPostContent("");
      setAdminPostAttachments([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to publish post");
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
      const names = snap.docs.map((d) => d.id);
      setReservedNames(names);

      // Check which reserved names already have a portfolio project
      const portfolioChecks = await Promise.all(
        names.map(async (name) => {
          const q = query(
            collection(db, "projects"),
            where("ownerUsername", "==", name),
            where("isSystem", "==", true),
            where("systemType", "==", "portfolio"),
            limit(1)
          );
          const pSnap = await getDocs(q);
          return [name, !pSnap.empty] as [string, boolean];
        })
      );
      setReservedPortfolios(Object.fromEntries(portfolioChecks));
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

  const handleCreateReservedPortfolio = async (name: string) => {
    if (!user) return;
    setCreatingReservedPortfolio(name);
    try {
      await createPortfolioProject(user.uid, name);
      setReservedPortfolios((prev) => ({ ...prev, [name]: true }));
      toast.success(`Portfolio created for @${name}`);
    } catch {
      toast.error(`Failed to create portfolio for @${name}`);
    } finally {
      setCreatingReservedPortfolio(null);
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

  const handleCreatePortfolio = async (uid: string, username: string) => {
    setCreatingPortfolio(uid);
    try {
      await createPortfolioProject(uid, username);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, hasPortfolio: true } : u)));
      toast.success(`Portfolio created for @${username}`);
    } catch {
      toast.error("Failed to create portfolio.");
    } finally {
      setCreatingPortfolio(null);
    }
  };

  const loadDuplicatePortfolios = async () => {
    setLoadingDupPortfolios(true);
    try {
      const q = query(collection(db, "projects"), where("systemType", "==", "portfolio"));
      const snap = await getDocs(q);
      // Group by ownerId
      const grouped: Record<string, { uid: string; username: string; portfolios: Array<{ id: string; name: string; createdAt: any }> }> = {};
      for (const d of snap.docs) {
        const data = d.data();
        const uid = data.ownerId as string;
        if (!uid) continue;
        if (!grouped[uid]) grouped[uid] = { uid, username: data.ownerUsername ?? uid, portfolios: [] };
        grouped[uid].portfolios.push({ id: d.id, name: data.name ?? "Portfolio", createdAt: data.createdAt });
      }
      // Only keep users with more than 1 portfolio
      setDupPortfolios(Object.values(grouped).filter((g) => g.portfolios.length > 1));
    } catch {
      toast.error("Failed to load portfolios");
    } finally {
      setLoadingDupPortfolios(false);
    }
  };

  const handleDeletePortfolio = async (projectId: string) => {
    setDeletingPortfolio(projectId);
    try {
      await deleteDoc(doc(db, "projects", projectId));
      setDupPortfolios((prev) =>
        prev
          .map((u) => ({ ...u, portfolios: u.portfolios.filter((p) => p.id !== projectId) }))
          .filter((u) => u.portfolios.length > 1)
      );
      toast.success("Portfolio deleted");
    } catch {
      toast.error("Failed to delete portfolio");
    } finally {
      setDeletingPortfolio(null);
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

  const handleMarkDeletionProcessed = async (docId: string) => {
    setProcessingDeletion(docId);
    try {
      await updateDoc(doc(db, "deletion_requests", docId), { status: "processed" });
      setDeletionRequests((prev) => prev.map((d) => (d.id === docId ? { ...d, status: "processed" } : d)));
      setPendingDeletionCount((c) => Math.max(0, c - 1));
      toast.success("Marked as processed.");
    } catch {
      toast.error("Failed to update.");
    } finally {
      setProcessingDeletion(null);
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

    // ── Send email via queue (same as verification email flow) ────────────────

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const toList = emailTo.split(",").map((s) => s.trim()).filter(Boolean);
    if (toList.length === 0) { toast.error("Enter at least one recipient email."); return; }
    if (!emailSubject.trim()) { toast.error("Subject is required."); return; }
    if (!emailMessage.trim()) { toast.error("Message body is required."); return; }
    setSendingEmail(true);
    try {
      await Promise.all(
        toList.map((to) =>
          enqueueEmail({
            to,
            templateKey: "admin_custom",
            payload: { subject: emailSubject.trim(), body: emailMessage },
            userId: user.uid,
          })
        )
      );
      toast.success(`Email queued for ${toList.length} recipient${toList.length !== 1 ? "s" : ""}.`);
      setEmailTo(""); setEmailSubject(""); setEmailMessage("");
    } catch (err: any) {
      toast.error(err.message || "Failed to queue email.");
    } finally {
      setSendingEmail(false);
    }
  };

  // ── Learn lesson handlers ────────────────────────────────────────────────

  const openNewLessonForm = () => {
    setEditingLesson(null);
    setLessonForm({ title: "", slug: "", description: "", codeExample: "", language: "javascript", explanation: "", expectedOutput: "", published: true });
    setShowLessonForm(true);
  };

  const openEditLessonForm = (lesson: DynamicLesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      slug: lesson.slug,
      description: lesson.description,
      codeExample: lesson.codeExample,
      language: lesson.language,
      explanation: lesson.explanation,
      expectedOutput: (lesson.expectedOutput ?? []).join("\n"),
      published: lesson.published,
    });
    setShowLessonForm(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonForm.title.trim()) { toast.error("Title is required."); return; }
    setSavingLesson(true);
    try {
      const payload = {
        title: lessonForm.title.trim(),
        slug: lessonForm.slug.trim() || slugifyTitle(lessonForm.title.trim()),
        description: lessonForm.description.trim(),
        codeExample: lessonForm.codeExample,
        language: lessonForm.language,
        explanation: lessonForm.explanation.trim(),
        expectedOutput: lessonForm.expectedOutput.split("\n").map((s) => s.trim()).filter(Boolean),
        published: lessonForm.published,
      };
      if (editingLesson) {
        await updateLesson(editingLesson.id, payload);
        toast.success("Lesson updated.");
      } else {
        await createLesson(payload);
        toast.success("Lesson created.");
      }
      setShowLessonForm(false);
      setEditingLesson(null);
      setDynamicLessons(await getAllLessons());
    } catch { toast.error("Failed to save lesson."); }
    finally { setSavingLesson(false); }
  };

  const handleDeleteLesson = async () => {
    if (!deleteLessonConfirm) return;
    setDeletingLesson(true);
    try {
      await deleteLesson(deleteLessonConfirm);
      toast.success("Lesson deleted.");
      setDynamicLessons((prev) => prev.filter((l) => l.id !== deleteLessonConfirm));
    } catch { toast.error("Failed to delete lesson."); }
    finally { setDeletingLesson(false); setDeleteLessonConfirm(null); }
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

  // ── Community management handlers ─────────────────────────────────────────

  const loadCommunities = async () => {
    setLoadingCommunities(true);
    try {
      const snap = await getDocs(collection(db, "communities"));
      setCommunities(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Community)));
    } catch {
      toast.error("Failed to load communities.");
    } finally {
      setLoadingCommunities(false);
    }
  };

  const handleEditCommunity = (c: Community) => {
    setEditingCommunity(c);
    setCommunityEditName(c.name);
    setCommunityEditDesc(c.description);
    setCommunityEditCategory(c.category ?? "general");
    setCommunityEditPublic(c.isPublic);
  };

  const handleSaveCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCommunity) return;
    if (!communityEditName.trim()) { toast.error("Name is required."); return; }
    setSavingCommunity(true);
    try {
      await updateCommunity(editingCommunity.id, {
        name: communityEditName.trim(),
        description: communityEditDesc.trim(),
        category: communityEditCategory.trim() || "general",
        isPublic: communityEditPublic,
      });
      setCommunities((prev) => prev.map((c) =>
        c.id === editingCommunity.id
          ? { ...c, name: communityEditName.trim(), description: communityEditDesc.trim(), category: communityEditCategory || "general", isPublic: communityEditPublic }
          : c
      ));
      toast.success("Community updated.");
      setEditingCommunity(null);
    } catch {
      toast.error("Failed to update community.");
    } finally {
      setSavingCommunity(false);
    }
  };

  const confirmDeleteCommunity = async () => {
    if (!deleteCommunityConfirm) return;
    setDeletingCommunity(true);
    try {
      await deleteCommunity(deleteCommunityConfirm);
      setCommunities((prev) => prev.filter((c) => c.id !== deleteCommunityConfirm));
      toast.success("Community deleted.");
      setDeleteCommunityConfirm(null);
    } catch {
      toast.error("Failed to delete community.");
    } finally {
      setDeletingCommunity(false);
    }
  };

  const handleAdminCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCommunityName.trim()) return;
    setCreatingCommunity(true);
    try {
      const slug = newCommunityName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { id } = await createCommunity({
        name: newCommunityName.trim(),
        slug,
        description: newCommunityDesc.trim(),
        category: newCommunityCategory.trim() || "general",
        isPublic: newCommunityPublic,
        isOfficial: newCommunityOfficial,
        createdBy: user.uid,
      });
      if (newCommunityOfficial) {
        toast.info("Adding all existing users to official community…");
        await batchAddAllUsersToCommunity(id);
      }
      toast.success("Community created!");
      setShowCreateCommunity(false);
      setNewCommunityName(""); setNewCommunityDesc(""); setNewCommunityCategory("general");
      setNewCommunityPublic(true); setNewCommunityOfficial(false);
      await loadCommunities();
    } catch (err: any) {
      toast.error(err.message || "Failed to create community.");
    } finally {
      setCreatingCommunity(false);
    }
  };

  const handleAdminCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newOrgName.trim()) return;
    setCreatingOrg(true);
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const username = userDoc.exists() ? (userDoc.data().username ?? "admin") : "admin";
      const slug = newOrgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const orgId = await createOrg({
        name: newOrgName.trim(),
        slug,
        description: newOrgDesc.trim(),
        isPublic: newOrgPublic,
        isOfficial: newOrgOfficial,
        createdBy: user.uid,
        createdByUsername: username,
      });
      if (newOrgOfficial) {
        toast.info("Adding all existing users to official organization…");
        await batchAddAllUsersToOrg(orgId);
      }
      toast.success("Organization created!");
      setShowCreateOrg(false);
      setNewOrgName(""); setNewOrgDesc(""); setNewOrgPublic(true); setNewOrgOfficial(false);
      await loadOrgs();
    } catch (err: any) {
      toast.error(err.message || "Failed to create organization.");
    } finally {
      setCreatingOrg(false);
    }
  };

  const loadAdminProjects = async () => {
    setLoadingAdminProjects(true);
    try {
      const snap = await getDocs(query(collection(db, "projects"), orderBy("createdAt", "desc"), limit(100)));
      setAdminProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project)));
    } catch {
      toast.error("Failed to load projects.");
    } finally {
      setLoadingAdminProjects(false);
    }
  };

  const handleAdminCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newProjectName.trim()) return;
    setCreatingAdminProject(true);
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const username = userDoc.exists() ? (userDoc.data().username ?? "admin") : "admin";
      const slug = newProjectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const ref = await addDoc(collection(db, "projects"), {
      appId: generateAppId(),
        name: newProjectName.trim(),
        description: newProjectDesc.trim(),
        projectSlug: slug,
        ownerId: user.uid,
        ownerUsername: username,
        ownerType: "user",
        isPublic: newProjectPublic,
        isOfficial: newProjectOfficial,
        isTemplate: false,
        collaborators: [],
        forksCount: 0,
        views: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // Seed with an empty README
      await addDoc(collection(db, "projects", ref.id, "files"), {
        projectId: ref.id,
        name: "README.md",
        path: "/README.md",
        content: `# ${newProjectName.trim()}\n\n${newProjectDesc.trim() || "An official DevOS project."}\n`,
        language: "markdown",
        updatedAt: serverTimestamp(),
      });
      toast.success("Project created!");
      setShowCreateProject(false);
      setNewProjectName(""); setNewProjectDesc(""); setNewProjectPublic(true); setNewProjectOfficial(true);
      await loadAdminProjects();
    } catch (err: any) {
      toast.error(err.message || "Failed to create project.");
    } finally {
      setCreatingAdminProject(false);
    }
  };

  // ── Site settings handlers ─────────────────────────────────────────────────

  // ── Organizations management handlers ─────────────────────────────────────

  const loadOrgs = async () => {
    setLoadingOrgs(true);
    try {
      const data = await getAllOrgs();
      setOrgs(data.sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0)));
    } catch {
      toast.error("Failed to load organizations.");
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handleEditOrg = (org: Organization) => {
    setEditingOrg(org);
    setOrgEditName(org.name);
    setOrgEditDesc(org.description ?? "");
    setOrgEditPublic(org.isPublic);
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;
    if (!orgEditName.trim()) { toast.error("Name is required."); return; }
    setSavingOrg(true);
    try {
      await updateOrg(editingOrg.id, { name: orgEditName.trim(), description: orgEditDesc.trim(), isPublic: orgEditPublic });
      setOrgs((prev) => prev.map((o) =>
        o.id === editingOrg.id
          ? { ...o, name: orgEditName.trim(), description: orgEditDesc.trim(), isPublic: orgEditPublic }
          : o
      ));
      toast.success("Organization updated.");
      setEditingOrg(null);
    } catch {
      toast.error("Failed to update organization.");
    } finally {
      setSavingOrg(false);
    }
  };

  const confirmDeleteOrg = async () => {
    if (!deleteOrgConfirm) return;
    setDeletingOrg(true);
    try {
      await deleteOrg(deleteOrgConfirm);
      setOrgs((prev) => prev.filter((o) => o.id !== deleteOrgConfirm));
      toast.success("Organization deleted.");
      setDeleteOrgConfirm(null);
    } catch {
      toast.error("Failed to delete organization.");
    } finally {
      setDeletingOrg(false);
    }
  };

  const loadSiteConfig = () => {
    setLoadingSiteConfig(true);
    getSiteConfig()
      .then(setSiteConfig)
      .catch(() => {})
      .finally(() => setLoadingSiteConfig(false));
  };

  const handleSaveSiteConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSiteConfig(true);
    try {
      await saveSiteConfig(siteConfig);
      toast.success("Site settings saved. Footer will update on next page load.");
    } catch {
      toast.error("Failed to save site settings.");
    } finally {
      setSavingSiteConfig(false);
    }
  };

  const loadAdminEvents = async () => {
    setLoadingAdminEvents(true);
    try {
      const data = await getAllEvents();
      setAdminEvents(data);
    } catch {
      toast.error("Failed to load events.");
    } finally {
      setLoadingAdminEvents(false);
    }
  };

  const handleSetEventStatus = async (eventId: string, status: EventStatus) => {
    setUpdatingEventId(eventId);
    try {
      await setEventStatus(eventId, status);
      setAdminEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, status } : e))
      );
      toast.success(`Event ${status === "approved" ? "approved" : status === "rejected" ? "rejected" : "updated"}`);
    } catch {
      toast.error("Failed to update event status.");
    } finally {
      setUpdatingEventId(null);
    }
  };

  const handleToggleRsvps = async (eventId: string) => {
    if (expandedRsvpEventId === eventId) {
      setExpandedRsvpEventId(null);
      return;
    }
    setExpandedRsvpEventId(eventId);
    if (eventRsvps[eventId]) return; // already loaded
    setLoadingRsvpEventId(eventId);
    try {
      const regs = await getEventRegistrations(eventId);
      setEventRsvps((prev) => ({ ...prev, [eventId]: regs }));
    } catch {
      toast.error("Failed to load RSVPs.");
    } finally {
      setLoadingRsvpEventId(null);
    }
  };

  const confirmDeleteEvent = async () => {
    if (!deleteEventConfirm) return;
    setDeletingEvent(true);
    try {
      await deleteEventDoc(deleteEventConfirm);
      setAdminEvents((prev) => prev.filter((e) => e.id !== deleteEventConfirm));
      setDeleteEventConfirm(null);
      toast.success("Event deleted.");
    } catch {
      toast.error("Failed to delete event.");
    } finally {
      setDeletingEvent(false);
    }
  };

  const handleCreateAdminEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreatingAdminEvent(true);
    try {
      const slug = newEvTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 80);
      const userData = (await getDoc(doc(db, "users", user.uid))).data();
      const id = await createEvent({
        title: newEvTitle.trim(),
        slug: `${slug}-${Date.now()}`,
        description: newEvDesc.trim(),
        type: newEvType,
        startDate: new Date(newEvStart),
        endDate: new Date(newEvEnd),
        ...(newEvType === "online" && newEvLink ? { eventLink: newEvLink.trim() } : {}),
        ...(newEvType === "physical" && newEvVenue ? { venueName: newEvVenue.trim() } : {}),
        ...(newEvType === "physical" && newEvAddress ? { address: newEvAddress.trim() } : {}),
        createdBy: user.uid,
        createdByUsername: userData?.username ?? user.email ?? "",
        isPremium: newEvPremium,
      });
      // Auto-approve admin-created events
      await setEventStatus(id, "approved");
      toast.success("Event created and approved!");
      setShowCreateEvent(false);
      setNewEvTitle(""); setNewEvDesc(""); setNewEvType("online");
      setNewEvStart(""); setNewEvEnd(""); setNewEvLink("");
      setNewEvVenue(""); setNewEvAddress(""); setNewEvPremium(false);
      await loadAdminEvents();
    } catch (err) {
      toast.error("Failed to create event.");
      console.error(err);
    } finally {
      setCreatingAdminEvent(false);
    }
  };

  const handleAiGenerateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTestPrompt.trim()) return;
    resetAiTest();
    setAiGenReady(false);
    setAiGenFiles([]);
    setAiGenName("");
    setAiGenDesc("");
    setAiGenTags("");

    const systemPrompt = `You are a web template generator for DevOS, a browser-based code IDE.
Return ONLY valid JSON — no markdown fences, no explanation — in this exact shape:
{
  "name": "<short template name>",
  "description": "<one sentence>",
  "tags": ["tag1","tag2"],
  "files": [
    { "name": "index.html", "path": "index.html", "content": "<full file content>", "language": "html" }
  ]
}
Include all necessary files (HTML, CSS, JS). Keep file content complete and functional.
User request: ${aiTestPrompt.trim()}`;

    const raw = await askAI(systemPrompt, { maxTokens: 2048 });
    if (!raw) return;

    try {
      // Strip possible markdown code fences
      const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(clean);
      if (!parsed.files || !Array.isArray(parsed.files)) throw new Error("No files array");
      setAiGenName(parsed.name ?? "AI Template");
      setAiGenDesc(parsed.description ?? "");
      setAiGenTags((parsed.tags ?? []).join(", "));
      setAiGenFiles(parsed.files);
      setAiGenReady(true);
    } catch {
      toast.error("AI returned invalid JSON. Try rephrasing your prompt.");
    }
  };

  const handleSaveAiTemplate = async () => {
    if (!aiGenName.trim() || aiGenFiles.length === 0) return;
    setSavingAiTemplate(true);
    try {
      await createOfficialTemplate({
        name: aiGenName.trim(),
        description: aiGenDesc.trim(),
        files: aiGenFiles,
        tags: aiGenTags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      toast.success("AI template created and approved!");
      setAiTestPrompt(""); setAiGenReady(false);
      setAiGenName(""); setAiGenDesc(""); setAiGenTags(""); setAiGenFiles([]);
      resetAiTest();
      await loadData();
    } catch {
      toast.error("Failed to save template.");
    } finally {
      setSavingAiTemplate(false);
    }
  };

  const handleAiTest = handleAiGenerateTemplate;

  if (!user) {
    return (
      <div className="min-h-screen bg-base text-white flex items-center justify-center">
        <p className="text-white/40">Please sign in to access the admin dashboard.</p>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-base text-white flex items-center justify-center">
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
    { id: "themes", label: "Themes", icon: <Palette className="w-4 h-4" /> },
    { id: "users", label: "Users", icon: <Users className="w-4 h-4" />, badge: pendingUsernameRequestCount || undefined },
    { id: "credits", label: "Credits", icon: <Zap className="w-4 h-4" /> },
    { id: "polls", label: "Polls", icon: <Vote className="w-4 h-4" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
    { id: "redeem", label: "Redeem Codes", icon: <Gift className="w-4 h-4" /> },
    { id: "posts", label: "Posts", icon: <Newspaper className="w-4 h-4" /> },
    { id: "feedback", label: "Feedback", icon: <MessageSquare className="w-4 h-4" />, badge: openFeedbackCount || undefined },
    { id: "deletions", label: "Deletion Requests", icon: <Trash2 className="w-4 h-4" />, badge: pendingDeletionCount || undefined },
    { id: "reserved", label: "Reserved Names", icon: <AtSign className="w-4 h-4" /> },
    { id: "maintenance", label: "Maintenance", icon: <Wrench className="w-4 h-4" /> },
    { id: "email", label: "Send Email", icon: <Send className="w-4 h-4" /> },
    { id: "communities", label: "Communities", icon: <Users2 className="w-4 h-4" /> },
    { id: "organizations", label: "Organizations", icon: <Building2 className="w-4 h-4" /> },
    { id: "projects", label: "Projects", icon: <FolderPlus className="w-4 h-4" /> },
    { id: "events", label: "Events", icon: <Calendar className="w-4 h-4" /> },
    { id: "learn", label: "Learn", icon: <BookOpen className="w-4 h-4" /> },
    { id: "kora", label: "KORA AI", icon: <Bot className="w-4 h-4" /> },
      { id: "vux", label: "VUX Status", icon: <Activity className="w-4 h-4" /> },
    { id: "site", label: "Site Settings", icon: <Globe className="w-4 h-4" /> },
    { id: "portfolio-ide", label: "Official Portfolios", icon: <Code2 className="w-4 h-4" />, badge: "LIVE" as any },
  ];

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [officialPortfolios, setOfficialPortfolios] = useState<any[]>([]);
  const [loadingPortfolios, setLoadingPortfolios] = useState(false);

  useEffect(() => {
    if (activeTab === "portfolio-ide" && !selectedPortfolioId) {
      const fetchPortfolios = async () => {
        setLoadingPortfolios(true);
        try {
          const q = query(collection(db, "projects"), where("systemType", "==", "portfolio"));
          const snap = await getDocs(q);
          setOfficialPortfolios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.error("Failed to fetch portfolios", e);
        } finally {
          setLoadingPortfolios(false);
        }
      };
      fetchPortfolios();
    }
  }, [activeTab, selectedPortfolioId]);

  const tabDescriptions: Record<string, string> = {
    overview: "Platform health and key metrics",
    templates: "Review, approve, and manage all templates",
    users: "View and manage all registered users",
    credits: "Adjust user credit balances",
    notifications: "Send targeted or global notifications",
    redeem: "Create and manage promotional codes",
    posts: "Publish official announcements to the feed",
    polls: "Create and manage community polls",
    reserved: "Manage reserved and protected usernames",
    deletions: "Users who have requested account deletion",
    maintenance: "Toggle maintenance mode and set the banner message",
    email: "Send a custom email to any user via Gmail SMTP",
    communities: "View, create, edit and delete all platform communities",
    organizations: "View, create, edit and delete all platform organizations",
    projects: "Create and manage official DevOS projects",
    events: "Approve, reject, or delete developer events submitted by users",
    learn: "Browse the learning topics and lessons available on the platform",
    site: "Edit branding, links, footer text, and global voice-call availability",
    kora: "Manage KORA AI settings",
    vux: "Check the status of the VUX execution engine",
    themes: "Create and manage platform themes",
  };

  const tabColors: Record<string, string> = {
    overview: "blue", templates: "purple", themes: "orange", users: "blue", credits: "green",
    polls: "orange", notifications: "blue", redeem: "purple", posts: "blue", feedback: "blue",
    deletions: "red", reserved: "zinc", maintenance: "orange", email: "blue", communities: "purple",
    organizations: "blue", projects: "blue", events: "orange", learn: "blue", site: "zinc",
    kora: "blue", vux: "green"
  };

  const SubpageWrapper = ({ children, activeTabId }: { children: React.ReactNode, activeTabId: string }) => {
    const activeTabData = tabs.find(t => t.id === activeTabId);
    if (!activeTabData) return <>{children}</>;

    const color = tabColors[activeTabId] || "blue";
    const colorClasses = {
      blue: "from-blue-500/20 via-blue-500/5 to-transparent border-blue-500/20 text-blue-400",
      purple: "from-purple-500/20 via-purple-500/5 to-transparent border-purple-500/20 text-purple-400",
      green: "from-green-500/20 via-green-500/5 to-transparent border-green-500/20 text-green-400",
      orange: "from-orange-500/20 via-orange-500/5 to-transparent border-orange-500/20 text-orange-400",
      red: "from-red-500/20 via-red-500/5 to-transparent border-red-500/20 text-red-400",
      zinc: "from-white/10 via-white/5 to-transparent border-white/10 text-white/60",
    }[color] as string;

    const barClass = colorClasses.split(' ')[0];

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col min-h-full"
      >
        <div className="mb-6 flex items-start gap-4">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border bg-gradient-to-b", colorClasses)}>
            <div className="scale-125">{activeTabData.icon}</div>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{activeTabData.label}</h1>
            <p className="text-sm text-white/40 mt-1">{tabDescriptions[activeTabId]}</p>
          </div>
        </div>
        <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden relative shadow-2xl flex flex-col">
          <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r z-10", barClass)} />
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar relative z-0">
            {children}
          </div>
        </div>
      </motion.div>
    );
  };


  const tabGroups = [
    {
      title: "Analytics",
      tabs: ["overview"]
    },
    {
      title: "Users & Content",
      tabs: ["users", "credits", "posts", "polls", "feedback", "deletions", "reserved"]
    },
    {
      title: "Platform",
      tabs: ["templates", "themes", "communities", "organizations", "projects", "events", "learn"]
    },
    {
      title: "System",
      tabs: ["notifications", "redeem", "email", "maintenance", "site", "kora", "vux"]
    },
    {
      title: "Developer Tools",
      tabs: ["portfolio-ide"]
    }
  ];

  const SidebarNav = ({ onSelect }: { onSelect?: () => void }) => (
    <nav className="flex flex-col gap-6 p-4">
      {tabGroups.map((group, idx) => (
        <div key={idx} className="flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25 px-3 mb-2">
            {group.title}
          </p>
          {group.tabs.map((tabId) => {
            const tab = tabs.find(t => t.id === tabId);
            if (!tab) return null;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as Tab); onSelect?.(); }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left relative group",
                  activeTab === tab.id
                    ? "bg-blue-600/15 text-blue-400 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                <div className={cn("transition-transform duration-300", activeTab === tab.id ? "scale-110" : "group-hover:scale-110")}>
                  {tab.icon}
                </div>
                <span className="flex-1">{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[18px] text-center",
                    tab.badge === "LIVE" ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse" : "bg-red-600 text-white"
                  )}>
                    {tab.badge}
                  </span>
                )}
                {activeTab === tab.id && (
                  <motion.div layoutId="activeTabIndicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <>
    <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col relative overflow-hidden">
      {/* Glowing background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Top Navbar */}
      <div className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-30">
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

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 flex-shrink-0 flex-col border-r border-white/5 bg-black/20 backdrop-blur-md overflow-y-auto custom-scrollbar">
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
                className="fixed left-0 top-0 h-full w-72 bg-surface border-r border-border-base z-50 md:hidden flex flex-col shadow-2xl overflow-y-auto"
              >
                <div className="flex items-center justify-between p-4 border-b border-border-base">
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
        <main className="flex-1 overflow-y-auto relative bg-[#0a0a0b]">
          {activeTab === "portfolio-ide" ? (
            selectedPortfolioId ? (
              <div className="h-full w-full flex flex-col animate-in fade-in duration-500">
                <div className="h-12 bg-[#0a0a0b] border-b border-white/10 flex items-center px-4 shrink-0">
                  <button 
                    onClick={() => setSelectedPortfolioId(null)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg text-sm font-bold transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Portfolios
                  </button>
                </div>
                <div className="flex-1 relative">
                  <PortfolioIDE projectId={selectedPortfolioId} />
                </div>
              </div>
            ) : (
              <SubpageWrapper activeTabId={activeTab}>
                {loadingPortfolios ? (
                  <div className="flex items-center justify-center py-32">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                ) : officialPortfolios.length === 0 ? (
                  <div className="text-center py-32 text-white/40">No official portfolios found.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {officialPortfolios.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPortfolioId(p.id)}
                        className="p-6 bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-2xl text-left transition-all group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center justify-between mb-4 relative z-10">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                            <Code2 className="w-5 h-5" />
                          </div>
                          <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2 relative z-10">{p.isSystem ? 'System Support Portfolio' : p.name}</h3>
                        <p className="text-sm text-white/40 mb-4 relative z-10 line-clamp-2">{p.description || "No description provided."}</p>
                        <div className="flex items-center gap-2 text-xs font-bold relative z-10">
                          <span className="px-2 py-1 bg-white/5 text-white/40 rounded-lg border border-white/5">{p.id}</span>
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">{p.ownerUsername || 'admin'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </SubpageWrapper>
            )
          ) : (
            <SubpageWrapper activeTabId={activeTab}>
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                {activeTab === "overview" && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

                    {/* Chart Section */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50" />
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-purple-400" />
                          Platform Activity (7 Days)
                        </h2>
                      </div>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={mockActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                            <RechartsTooltip
                              contentStyle={{ backgroundColor: 'rgba(15, 15, 20, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                              itemStyle={{ color: '#fff', fontSize: '14px' }}
                            />
                            <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                            <Area type="monotone" dataKey="projects" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorProjects)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* System Health */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="flex items-center justify-between mb-6 relative">
                          <h2 className="text-base font-bold text-white flex items-center gap-2">
                            <Activity className="w-5 h-5 text-green-400" />
                            System Health
                          </h2>
                          <button
                            onClick={runHealthCheck}
                            disabled={runningHealthCheck}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold transition-all disabled:opacity-50 border border-white/5"
                          >
                            {runningHealthCheck
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <RefreshCw className="w-3.5 h-3.5" />}
                            {runningHealthCheck ? "Checking…" : "Run Check"}
                          </button>
                        </div>

                        <div className="relative">
                        {!systemHealth && !runningHealthCheck && (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                              <ShieldCheck className="w-6 h-6 text-white/30" />
                            </div>
                            <p className="text-sm text-white/40 font-medium">
                              Click "Run Check" to validate backend configuration.
                            </p>
                          </div>
                        )}

                        {runningHealthCheck && (
                          <div className="flex flex-col items-center justify-center py-8 gap-3 text-white/50 text-sm font-medium">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                            Running diagnostic health checks…
                          </div>
                        )}

                        {systemHealth && !runningHealthCheck && (
                          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                            <p className="text-[11px] text-white/30 font-medium uppercase tracking-widest">
                              Last checked at {systemHealth.checkedAt}
                            </p>

                            <div className="space-y-2">
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
                                  "flex items-center gap-3 p-3.5 rounded-2xl border transition-colors",
                                  ok
                                    ? "bg-green-500/5 border-green-500/20 hover:bg-green-500/10"
                                    : "bg-red-500/5 border-red-500/20 hover:bg-red-500/10"
                                )}
                              >
                                <div className={cn("p-2 rounded-xl", ok ? "bg-green-500/10" : "bg-red-500/10")}>
                                  {ok ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className={cn("text-sm font-bold", ok ? "text-green-300" : "text-red-300")}>
                                    {label}
                                  </p>
                                  <p className="text-[11px] text-white/40 truncate mt-0.5">{desc}</p>
                                </div>
                                <span className={cn(
                                  "ml-auto flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                                  ok ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                )}>
                                  {ok ? "OK" : "Fail"}
                                </span>
                              </div>
                            ))}
                            </div>

                            {systemHealth.errors.length > 0 && (
                              <div className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
                                <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4" />
                                  Detected Issues
                                </p>
                                <ul className="space-y-2">
                                  {systemHealth.errors.map((e, i) => (
                                    <li key={i} className="text-[11px] leading-relaxed text-red-300/80 font-mono bg-red-500/10 p-2 rounded-lg">{e}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {systemHealth.errors.length === 0 && (
                              <div className="flex items-center justify-center gap-2 mt-4 p-3 rounded-2xl bg-green-500/10 border border-green-500/20 text-xs font-bold text-green-400">
                                <Wifi className="w-4 h-4" />
                                All systems operational
                              </div>
                            )}
                          </div>
                        )}
                        </div>
                      </div>

                      {/* Maintenance Mode Quick Toggle */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="flex items-start justify-between gap-4 relative">
                          <div>
                            <h2 className="text-base font-bold text-white mb-1.5 flex items-center gap-2">
                              <Wrench className="w-5 h-5 text-orange-400" />
                              Maintenance Mode
                            </h2>
                            <p className="text-white/40 text-sm leading-relaxed">Blocks all non-admin users from the platform. Use when deploying major upgrades.</p>
                          </div>
                          {loadingMaintenance ? (
                            <Loader2 className="w-8 h-8 text-white/30 animate-spin flex-shrink-0 mt-1" />
                          ) : (
                            <button
                              onClick={() => { setMaintenanceMode((v) => !v); }}
                              className="flex-shrink-0 transition-transform hover:scale-105 active:scale-95"
                              aria-label="Toggle maintenance mode"
                            >
                              {maintenanceMode
                                ? <ToggleRight className="w-12 h-12 text-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]" />
                                : <ToggleLeft className="w-12 h-12 text-white/20 hover:text-white/40 transition-colors" />}
                            </button>
                          )}
                        </div>
                        <div className={cn(
                          "relative mt-6 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold border transition-all",
                          maintenanceMode ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-white/5 text-white/40 border-white/5"
                        )}>
                          {maintenanceMode ? <><WifiOff className="w-4 h-4" /> Maintenance is ON</> : <><Wifi className="w-4 h-4" /> Maintenance is OFF</>}
                        </div>
                        <button
                          onClick={handleSaveMaintenance}
                          disabled={savingMaintenance || loadingMaintenance}
                          className="relative mt-4 w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-blue-500/20"
                        >
                          {savingMaintenance ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : "Save Configuration"}
                        </button>
                      </div>
                    </div>
                    
                    {pendingTemplates.length > 0 && (
                      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-3xl p-6 backdrop-blur-xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
                            <Layout className="w-6 h-6 text-yellow-400" />
                          </div>
                          <div>
                            <h3 className="text-yellow-400 font-black text-lg">
                              {pendingTemplates.length} Pending Review{pendingTemplates.length > 1 ? "s" : ""}
                            </h3>
                            <p className="text-yellow-500/60 text-sm font-medium mt-0.5">Templates waiting for your approval.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab("templates")}
                          className="px-5 py-2.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 font-bold rounded-xl transition-colors"
                        >
                          Review Now
                        </button>
                      </div>
                    )}
                    
                    {/* System Maintenance Section */}
                    <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden mt-8">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500 opacity-50" />
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-black tracking-tight text-red-400 flex items-center gap-2">
                          <Trash2 className="w-5 h-5 text-red-400" />
                          System Maintenance Actions
                        </h2>
                      </div>
                      <div className="flex flex-col gap-4">
                        <p className="text-white/60 text-sm">
                          Warning: The actions below modify core platform data and cannot be undone.
                        </p>
                        <div className="flex items-center gap-4 flex-wrap">
                          <button
                            onClick={async () => {
                              try {
                                const snapshot = await getDocs(query(collection(db, "projects"), where("systemType", "==", "portfolio"), where("ownerUsername", "in", ["admin", "support"])));
                                if (snapshot.empty) {
                                  alert("Official portfolio not found! Please trigger a reset to recreate it.");
                                  return;
                                }
                                navigate(`/projects?open=${snapshot.docs[0].id}`);
                              } catch (e) {
                                alert(e.message);
                              }
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500/10 text-blue-400 rounded-xl font-bold hover:bg-blue-500/20 transition-all border border-blue-500/20 w-fit"
                          >
                            <FolderCode className="w-4 h-4" />
                            Edit Official Portfolio
                          </button>
                          
                          <button
                            onClick={async () => {
                              if (!confirm("Are you sure you want to delete ALL portfolio projects?")) return;
                              try {
                                const snapshot = await getDocs(query(collection(db, "projects"), where("systemType", "==", "portfolio")));
                                let deleted = 0;
                                for (const docSnap of snapshot.docs) {
                                  const filesSnap = await getDocs(collection(db, "projects", docSnap.id, "files"));
                                  for (const fileDoc of filesSnap.docs) {
                                    await deleteDoc(fileDoc.ref);
                                  }
                                  await deleteDoc(docSnap.ref);
                                  deleted++;
                                }
                                alert(`Deleted ${deleted} portfolios. They will automatically recreate on next login/refresh.`);
                                window.location.reload();
                              } catch (e) {
                                alert(e.message);
                              }
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-400 rounded-xl font-bold hover:bg-red-500/20 transition-all border border-red-500/20 w-fit"
                          >
                            <Trash2 className="w-4 h-4" />
                            Reset All Portfolios
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
                {/* Templates Tab */}
                {activeTab === "themes" && (<AdminThemesTab />)}

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
                      <AnimatePresence>
                        {showCreateTemplate && (
                          <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-sm flex min-h-full items-center justify-center p-4">
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 20 }}
                              className="w-full max-w-2xl bg-base border border-border-base rounded-3xl overflow-hidden shadow-2xl"
                            >
                              <div className="p-8 border-b border-border-base flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-white tracking-tight">Create Official Template</h2>
                                <button onClick={() => setShowCreateTemplate(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                                  <X className="w-6 h-6 text-white/40" />
                                </button>
                              </div>
                              <form onSubmit={handleCreateOfficialTemplate} className="p-8 space-y-8">
                                <div className="space-y-6">
                                  <div className="space-y-2">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Template Name</label>
                                    <input autoFocus value={newTplName} onChange={e => setNewTplName(e.target.value)} required placeholder="My Official Template" className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all" />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Description</label>
                                    <textarea value={newTplDesc} onChange={e => setNewTplDesc(e.target.value)} required placeholder="What does this template do?" className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 h-24 resize-none transition-all" />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Tags (comma-separated)</label>
                                    <input value={newTplTags} onChange={e => setNewTplTags(e.target.value)} placeholder="react, landing-page" className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all" />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-4 pt-8 border-t border-border-base">
                                  <button type="button" onClick={() => setShowCreateTemplate(false)} className="px-6 py-3 rounded-xl font-bold text-white/40 hover:text-white transition-colors">Cancel</button>
                                  <button type="submit" disabled={creatingTemplate} className="px-10 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50">
                                    {creatingTemplate && <Loader2 className="w-5 h-5 animate-spin" />}
                                    {creatingTemplate ? "Creating..." : "Create Template"}
                                  </button>
                                </div>
                              </form>
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>
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
                            <div key={template.id} className="p-4 rounded-2xl bg-surface border border-border-base flex items-center justify-between gap-4">
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

                    {/* ── AI Template Generator ──────────────────────── */}
                    <div className="bg-surface border border-border-base rounded-2xl p-6 space-y-5">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-purple-400" />
                        <h2 className="text-sm font-bold text-white">Generate Template with AI</h2>
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 text-[10px] font-bold uppercase border border-purple-500/20">Beta</span>
                      </div>
                      <p className="text-xs text-white/40">Describe the template you want. The AI will generate all the files. Review and edit before publishing.</p>

                      <form onSubmit={handleAiGenerateTemplate} className="space-y-3">
                        <textarea
                          value={aiTestPrompt}
                          onChange={(e) => setAiTestPrompt(e.target.value)}
                          placeholder="e.g. A dark-themed SaaS landing page with hero, features, and pricing sections"
                          rows={3}
                          className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                          required
                        />
                        <div className="flex items-center gap-3">
                          <button type="submit" disabled={aiTesting || !aiTestPrompt.trim()} className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all active:scale-95 disabled:opacity-50">
                            {aiTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {aiTesting ? "Generating…" : "Generate with AI"}
                          </button>
                          {aiGenReady && (
                            <button type="button" onClick={() => { setAiGenReady(false); setAiGenFiles([]); setAiTestPrompt(""); resetAiTest(); }} className="px-4 py-2.5 rounded-xl font-bold text-white/40 hover:text-white text-sm transition-colors">
                              Reset
                            </button>
                          )}
                        </div>
                      </form>

                      {aiTestError && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>{aiTestError}</span>
                        </div>
                      )}

                      {aiGenReady && (
                        <div className="space-y-4 border-t border-border-base pt-5">
                          <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Review & Edit Before Publishing</p>
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Template Name</label>
                              <input value={aiGenName} onChange={(e) => setAiGenName(e.target.value)} className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Description</label>
                              <input value={aiGenDesc} onChange={(e) => setAiGenDesc(e.target.value)} className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Tags (comma-separated)</label>
                              <input value={aiGenTags} onChange={(e) => setAiGenTags(e.target.value)} placeholder="react, landing-page" className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors" />
                            </div>
                          </div>

                          {/* Generated files */}
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-white/30 uppercase tracking-widest">{aiGenFiles.length} file{aiGenFiles.length !== 1 ? "s" : ""} generated</p>
                            {aiGenFiles.map((f, i) => (
                              <div key={i} className="border border-border-base rounded-xl overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 bg-white/3">
                                  <span className="text-xs font-mono text-blue-300">{f.name}</span>
                                  <span className="text-[10px] text-white/30">{f.language}</span>
                                </div>
                                <textarea
                                  value={f.content}
                                  onChange={(e) => setAiGenFiles((prev) => prev.map((file, idx) => idx === i ? { ...file, content: e.target.value } : file))}
                                  rows={6}
                                  className="w-full bg-black/60 px-3 py-2 text-xs text-white/80 font-mono focus:outline-none resize-y"
                                />
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={handleSaveAiTemplate}
                            disabled={savingAiTemplate || !aiGenName.trim()}
                            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
                          >
                            {savingAiTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {savingAiTemplate ? "Publishing…" : "Create & Approve Template"}
                          </button>
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
                      <div className="mb-6 bg-surface border border-yellow-500/20 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <AtSign className="w-4 h-4 text-yellow-400" />
                          <h3 className="text-sm font-bold text-white">Pending Username Requests</h3>
                          <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 text-[10px] font-bold border border-yellow-500/20">
                            {usernameRequests.length}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {usernameRequests.map((req) => (
                            <div key={req.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/3 border border-border-base">
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
                                      className="text-xs px-2 py-1.5 rounded-xl bg-white/5 border border-border-base text-white placeholder-white/30 focus:outline-none focus:border-red-500/40 w-32"
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
                        <div key={u.uid} className="rounded-2xl bg-surface border border-border-base">
                          <div className="p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0 w-full xl:w-auto flex-1">
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
                            </div>
                            
                            {/* Action Buttons Container */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <div className="text-right text-xs text-white/40 hidden sm:block mr-2">
                                <p className="flex items-center gap-1 justify-end">
                                  <span className="font-bold">{u.projectCount || 0}</span> projects
                                </p>
                                <p className="flex items-center gap-1 justify-end text-yellow-400/70">
                                  <Zap className="w-3 h-3" />
                                  {u.credits ? `${u.credits.daily + u.credits.monthly}` : "—"}
                                </p>
                              </div>
                              
                              {/* Role controls */}
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

                              {/* Moderation controls */}
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

                              {/* Change Username button */}
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

                              {/* Official toggle */}
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

                              {/* Create Portfolio button */}
                              {!u.hasPortfolio && (
                                <button
                                  onClick={() => handleCreatePortfolio(u.uid, u.username)}
                                  disabled={creatingPortfolio === u.uid}
                                  title="Create portfolio for this user"
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-bold disabled:opacity-50"
                                >
                                  {creatingPortfolio === u.uid
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Plus className="w-3.5 h-3.5" />}
                                  <span className="hidden sm:inline">Portfolio</span>
                                </button>
                              )}
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
                                className="flex-1 bg-white/5 border border-border-base rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500 transition-all"
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
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                    {/* Global Credit Config */}
                    <div className="bg-surface border border-border-base rounded-2xl p-6">
                      <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-purple-400" />
                        Global Credit Config
                      </h2>
                      <p className="text-white/40 text-sm mb-6">Control whether credits are enforced platform-wide and set a universal action cost.</p>
                      {loadingConfig ? (
                        <div className="flex items-center gap-2 text-white/30 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading config…</div>
                      ) : (
                        <form onSubmit={handleSaveCreditConfig} className="space-y-5">
                          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-border-base">
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
                              className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all"
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
                                    className="w-full bg-white/5 border border-border-base rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-all"
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

                    <div className="bg-surface border border-border-base rounded-2xl p-6">
                      <h2 className="text-lg font-bold text-white mb-1">Adjust User Credits</h2>
                      <p className="text-white/40 text-sm mb-6">Enter username, email, or UID and the amount to add (positive) or subtract (negative).</p>
                      <form onSubmit={handleAdjustCredits} className="space-y-5">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Target User</label>
                          <input type="text" value={creditTarget} onChange={(e) => setCreditTarget(e.target.value)} className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all" placeholder="username, email, or UID" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Amount</label>
                            <input type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all" placeholder="10" required />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Type</label>
                            <CustomSelect
                              value={creditType}
                              onChange={(v) => setCreditType(v as "daily" | "monthly")}
                              options={[
                                { value: "daily", label: "Daily" },
                                { value: "monthly", label: "Monthly" },
                              ]}
                            />
                          </div>
                        </div>
                        <button type="submit" disabled={adjusting} className={cn("w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2", adjusting ? "bg-white/5 text-white/30 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white active:scale-95")}>
                          {adjusting ? <><Loader2 className="w-4 h-4 animate-spin" />Adjusting...</> : <><Zap className="w-4 h-4" />Apply Credits Adjustment</>}
                        </button>
                      </form>
                    </div>

                    {/* Gift Credits */}
                    <div className="bg-surface border border-border-base rounded-2xl p-6">
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
                            className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-all"
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
                              className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Expires (optional)</label>
                            <input
                              type="date"
                              value={giftExpiry}
                              onChange={(e) => setGiftExpiry(e.target.value)}
                              className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-all"
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
                    <div className="bg-surface border border-border-base rounded-2xl p-6">
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
                            className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Valid Until</label>
                          <input
                            type="date"
                            value={unlimitedUntil}
                            onChange={(e) => setUnlimitedUntil(e.target.value)}
                            required
                            className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-all"
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

                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-white mb-4">User Credits Overview</h2>
                      <div className="space-y-2">
                        {users.map((u) => (
                          <div key={u.uid} className="p-4 rounded-2xl bg-surface border border-border-base flex items-center justify-between">
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
                    <div className="bg-surface border border-border-base rounded-2xl p-6">
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
                            className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all"
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
                                className="flex-1 bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
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
                              className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Expires (optional)</label>
                            <input
                              type="datetime-local"
                              value={pollExpiry}
                              onChange={(e) => setPollExpiry(e.target.value)}
                              className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-border-base">
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
                            <div key={p.id} className="bg-surface border border-border-base rounded-2xl p-5">
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
                    <div className="bg-surface border border-border-base rounded-2xl p-6">
                      <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-blue-400" />
                        Send Notification
                      </h2>
                      <p className="text-white/40 text-sm mb-6">Send a message to all users or a specific user.</p>
                      <form onSubmit={handleSendNotification} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Recipient (UID or "all")</label>
                          <input type="text" value={notifUserId} onChange={(e) => setNotifUserId(e.target.value)} className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all" placeholder="all" />
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
                                    : "bg-white/5 border-border-base text-white/50 hover:border-border-base"
                                )}
                              >
                                {t.replace("_", " ")}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Title</label>
                          <input type="text" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all" required placeholder="Notification title" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Message</label>
                          <textarea value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} rows={3} className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all resize-none" required placeholder="Notification message..." />
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
                      <form onSubmit={handleCreateRedeemCode} className="bg-surface border border-border-base rounded-2xl p-6 space-y-4 max-w-xl">
                        <h3 className="text-base font-bold text-white">New Redeem Code</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5 col-span-2">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Code</label>
                            <input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-white font-mono tracking-widest focus:outline-none focus:border-yellow-500/50 transition-all uppercase" required placeholder="DEVOS2024" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Credits Value</label>
                            <input type="number" value={newCodeValue} onChange={(e) => setNewCodeValue(e.target.value)} className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50 transition-all" min="1" required />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Usage Limit (-1 = ∞)</label>
                            <input type="number" value={newCodeUsageLimit} onChange={(e) => setNewCodeUsageLimit(e.target.value)} className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50 transition-all" required />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Per User Limit</label>
                            <input type="number" value={newCodePerUser} onChange={(e) => setNewCodePerUser(e.target.value)} className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50 transition-all" min="1" required />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Expires At (optional)</label>
                            <input type="datetime-local" value={newCodeExpiry} onChange={(e) => setNewCodeExpiry(e.target.value)} className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50 transition-all" />
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
                          <div key={code.id} className="p-4 rounded-2xl bg-surface border border-border-base flex items-center gap-4">
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
                    <div className="bg-surface border border-border-base rounded-2xl p-6 max-w-2xl">
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
                                    : "bg-white/5 border-border-base text-white/50 hover:border-border-base"
                                )}
                              >
                                {t === "announcement" ? "Announcement" : t === "update" ? "Update" : "Feature"}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Content</label>
                          <div className="bg-white/5 border border-border-base rounded-xl overflow-hidden focus-within:border-blue-500 transition-all">
                            {/* Toolbar */}
                            <div className="flex items-center gap-0.5 border-b border-white/[0.06] p-2 bg-black/20">
                              {([
                                { icon: Bold,   title: "Bold",        wrap: ["**", "**"],    placeholder: "bold text" },
                                { icon: Italic, title: "Italic",      wrap: ["*", "*"],      placeholder: "italic text" },
                                { icon: Code2,  title: "Inline code", wrap: ["`", "`"],      placeholder: "code" },
                                { icon: Link2,   title: "Link",        wrap: ["[", "](url)"], placeholder: "link text" },
                                { icon: List,   title: "List item",   wrap: ["- ", ""],      placeholder: "item" },
                                { icon: Quote,  title: "Blockquote",  wrap: ["> ", ""],      placeholder: "quote" },
                              ] as const).map(({ icon: Icon, title, wrap, placeholder }) => (
                                <button
                                  key={title}
                                  type="button"
                                  title={title}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    const el = adminPostTextareaRef.current;
                                    if (!el) return;
                                    const start = el.selectionStart ?? 0;
                                    const end = el.selectionEnd ?? 0;
                                    const selected = postContent.slice(start, end) || placeholder;
                                    const before = postContent.slice(0, start);
                                    const after = postContent.slice(end);
                                    setPostContent(before + wrap[0] + selected + wrap[1] + after);
                                    requestAnimationFrame(() => {
                                      el.focus();
                                      const cursor = start + wrap[0].length + selected.length + wrap[1].length;
                                      el.setSelectionRange(cursor, cursor);
                                    });
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                </button>
                              ))}
                              <div className="w-px h-4 bg-white/10 mx-2" />
                              <label className="p-1.5 rounded-lg hover:bg-white/10 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer" title="Attach Image">
                                <ImageDown className="w-3.5 h-3.5" />
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={async (e) => {
                                    if (!e.target.files?.length) return;
                                    const files = Array.from(e.target.files);
                                    toast.loading("Uploading image(s)...", { id: "admin-upload" });
                                    try {
                                      const { uploadImage } = await import("../lib/storageService");
                                      const newAttachments = await Promise.all(
                                        files.map(f => uploadImage(f, `feed/${Date.now()}_${f.name}`))
                                      );
                                      setAdminPostAttachments(prev => [...prev, ...newAttachments]);
                                      toast.success("Image(s) attached!", { id: "admin-upload" });
                                    } catch (err) {
                                      toast.error("Failed to upload image(s)", { id: "admin-upload" });
                                    }
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                            <textarea ref={adminPostTextareaRef} value={postContent} onChange={(e) => setPostContent(e.target.value)} rows={5} className="w-full bg-transparent px-4 py-3 text-white focus:outline-none resize-none" required placeholder="Write your official announcement here... (Markdown supported)" />
                            {adminPostAttachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 p-3 border-t border-white/[0.06] bg-black/20">
                                {adminPostAttachments.map((url, i) => (
                                  <div key={i} className="relative group">
                                    <img src={url} className="w-16 h-16 object-cover rounded-lg border border-border-base" alt="attachment" />
                                    <button
                                      type="button"
                                      onClick={() => setAdminPostAttachments(adminPostAttachments.filter((_, idx) => idx !== i))}
                                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
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
                    <div className="bg-surface border border-border-base rounded-2xl p-6">
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
                          className="flex-1 bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500 font-mono"
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

                    <div className="bg-surface border border-border-base rounded-2xl p-6">
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
                            <div key={name} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-border-base">
                              <span className="text-sm font-mono text-white/80">@{name}</span>
                              <div className="flex items-center gap-2">
                                {reservedPortfolios[name] ? (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider">
                                    <CheckCircle2 className="w-3 h-3" /> Portfolio
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleCreateReservedPortfolio(name)}
                                    disabled={creatingReservedPortfolio === name}
                                    title={`Create portfolio for @${name}`}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-bold disabled:opacity-50"
                                  >
                                    {creatingReservedPortfolio === name
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : <Plus className="w-3 h-3" />}
                                    Portfolio
                                  </button>
                                )}
                                <button
                                  onClick={() => handleUnreserveName(name)}
                                  className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                  title="Remove"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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
                            className={`bg-surface border rounded-2xl p-5 transition-all ${
                              item.status === "open" ? "border-border-base" : "border-border-base opacity-60"
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
                                    : "bg-white/5 text-white/30 border-border-base"
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

                {/* Deletion Requests Tab */}
                {activeTab === "deletions" && (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-lg font-bold text-white">Account Deletion Requests</h2>
                        <p className="text-white/40 text-sm mt-1">Users who have requested their account to be deleted.</p>
                      </div>
                      {pendingDeletionCount > 0 && (
                        <span className="px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-bold border border-red-500/20">
                          {pendingDeletionCount} pending
                        </span>
                      )}
                    </div>

                    {loadingDeletions ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
                      </div>
                    ) : deletionRequests.length === 0 ? (
                      <div className="text-center py-12">
                        <Trash2 className="w-10 h-10 text-white/15 mx-auto mb-3" />
                        <p className="text-white/30 text-sm">No deletion requests.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {deletionRequests.map((req) => (
                          <div
                            key={req.id}
                            className={`bg-surface border rounded-2xl p-5 transition-all ${
                              req.status === "pending" ? "border-red-500/20" : "border-border-base opacity-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    req.status === "pending"
                                      ? "bg-red-500/15 text-red-400 border-red-500/20"
                                      : "bg-green-500/10 text-green-400 border-green-500/20"
                                  }`}>
                                    {req.status}
                                  </span>
                                </div>
                                <p className="text-sm font-semibold text-white">{req.email}</p>
                                <p className="text-xs text-white/40 font-mono mt-0.5">{req.userId}</p>
                                {req.reason && (
                                  <p className="text-xs text-white/50 mt-2 italic">"{req.reason}"</p>
                                )}
                                {req.requestedAt && (
                                  <p className="text-[11px] text-white/25 mt-1">
                                    {new Date(req.requestedAt.toDate?.() ?? req.requestedAt).toLocaleString()}
                                  </p>
                                )}
                              </div>
                              {req.status === "pending" && (
                                <button
                                  onClick={() => handleMarkDeletionProcessed(req.id)}
                                  disabled={processingDeletion === req.id}
                                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs font-bold transition-all disabled:opacity-50"
                                >
                                  {processingDeletion === req.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Check className="w-3.5 h-3.5" />}
                                  Mark Processed
                                </button>
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
                        <div className="bg-surface border border-border-base rounded-2xl p-6">
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
                              : "bg-white/5 text-white/40 border border-border-base"
                          }`}>
                            {maintenanceMode
                              ? <><WifiOff className="w-4 h-4" /> Global maintenance is currently <strong>ON</strong></>
                              : <><Wifi className="w-4 h-4" /> Global maintenance is currently <strong>OFF</strong></>}
                          </div>
                        </div>

                        {/* Per-page maintenance */}
                        <div className="bg-surface border border-border-base rounded-2xl p-6">
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
                              { label: "User Profiles (/@...)", path: "/u" },
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
                                      : "bg-black/20 border-border-base text-white/50 hover:text-white hover:border-border-base"
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
                        <div className="bg-surface border border-border-base rounded-2xl p-6">
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
                            className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors resize-none"
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

                {/* Send Email Tab */}
                {activeTab === "email" && (
                  <div className="space-y-6 max-w-2xl">
                    <div className="bg-surface border border-border-base rounded-2xl p-6">
                      <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        <Send className="w-4 h-4 text-blue-400" />
                        Send Email
                      </h2>
                      <p className="text-white/40 text-sm mb-6">
                        Send a custom email via Gmail SMTP. HTML is supported in the message body.
                        Separate multiple recipients with commas.
                      </p>

                      <form onSubmit={handleSendEmail} className="space-y-4">
                        {/* To */}
                        <div>
                          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                            To
                          </label>
                          <input
                            type="text"
                            value={emailTo}
                            onChange={(e) => setEmailTo(e.target.value)}
                            placeholder="user@example.com, another@example.com"
                            className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors"
                            required
                          />
                          {/* Quick-fill from user list */}
                          {users.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className="text-[10px] text-white/30 self-center mr-1">Quick-fill:</span>
                              {users.slice(0, 8).map((u) => (
                                u.email ? (
                                  <button
                                    key={u.uid}
                                    type="button"
                                    onClick={() => setEmailTo((prev) => {
                                      const existing = prev.split(",").map((s) => s.trim()).filter(Boolean);
                                      if (existing.includes(u.email!)) return prev;
                                      return [...existing, u.email!].join(", ");
                                    })}
                                    className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-blue-600/20 border border-border-base hover:border-blue-500/30 text-[10px] text-white/50 hover:text-blue-300 transition-all"
                                  >
                                    @{u.username}
                                  </button>
                                ) : null
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Subject */}
                        <div>
                          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                            Subject
                          </label>
                          <input
                            type="text"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            placeholder="Your email subject"
                            className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors"
                            required
                          />
                        </div>

                        {/* Message */}
                        <div>
                          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                            Message (HTML supported)
                          </label>
                          <textarea
                            value={emailMessage}
                            onChange={(e) => setEmailMessage(e.target.value)}
                            placeholder={"<p>Hi {{name}},</p>\n<p>Your message here…</p>"}
                            rows={10}
                            className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors resize-y font-mono"
                            required
                          />
                        </div>

                        {/* Template shortcuts */}
                        <div>
                          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Quick Templates</p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              {
                                label: "Welcome",
                                subject: "Welcome to DevOS 🚀",
                                body: "<p>Hi there,</p>\n<p>Your DevOS account is ready. Start building at <a href=\"https://devos.zone.id/projects\">devos.zone.id/projects</a>.</p>\n<p>— The DevOS Team</p>",
                              },
                              {
                                label: "Banned",
                                subject: "Your DevOS account has been suspended",
                                body: "<p>Hi,</p>\n<p>Your DevOS account has been permanently suspended for violating our Acceptable Use Policy.</p>\n<p>To appeal: <a href=\"mailto:appeals@devos.zone.id\">appeals@devos.zone.id</a></p>\n<p>— DevOS Trust &amp; Safety</p>",
                              },
                              {
                                label: "Reinstated",
                                subject: "Your DevOS account has been reinstated ✓",
                                body: "<p>Hi,</p>\n<p>Good news — your DevOS account has been reinstated. You can sign in again at <a href=\"https://devos.zone.id\">devos.zone.id</a>.</p>\n<p>— The DevOS Team</p>",
                              },
                              {
                                label: "Announcement",
                                subject: "An important update from DevOS",
                                body: "<p>Hi DevOS community,</p>\n<p>We have an important update to share…</p>\n<p>— The DevOS Team</p>",
                              },
                            ].map((tpl) => (
                              <button
                                key={tpl.label}
                                type="button"
                                onClick={() => {
                                  setEmailSubject(tpl.subject);
                                  setEmailMessage(tpl.body);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-border-base text-xs text-white/60 hover:text-white transition-all"
                              >
                                {tpl.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={sendingEmail}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all"
                        >
                          {sendingEmail
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Queueing…</>
                            : <><Send className="w-4 h-4" /> Queue Email</>}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Communities Tab */}
                {activeTab === "communities" && (
                  <div className="space-y-6">
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-white/40">{communities.length} community{communities.length !== 1 ? "ies" : ""} total</p>
                      <div className="flex items-center gap-2">
                        <button onClick={loadCommunities} disabled={loadingCommunities} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingCommunities ? "animate-spin" : ""}`} />
                          Refresh
                        </button>
                        <button onClick={() => setShowCreateCommunity((v) => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                          New Community
                        </button>
                      </div>
                    </div>

                    {/* Create-community form */}
                    {showCreateCommunity && (
                      <form onSubmit={handleAdminCreateCommunity} className="bg-surface border border-blue-500/30 rounded-2xl p-5 space-y-3">
                        <p className="text-sm font-bold text-white mb-1 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-400" />Create New Community</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Name *</label>
                            <input value={newCommunityName} onChange={(e) => setNewCommunityName(e.target.value)} placeholder="DevOS Community" required className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Category</label>
                            <input value={newCommunityCategory} onChange={(e) => setNewCommunityCategory(e.target.value)} placeholder="general" className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Description</label>
                          <textarea value={newCommunityDesc} onChange={(e) => setNewCommunityDesc(e.target.value)} rows={2} placeholder="What is this community about?" className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 resize-none" />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button type="button" onClick={() => setNewCommunityPublic((v) => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${newCommunityPublic ? "bg-green-600/10 border-green-500/30 text-green-400" : "bg-white/5 border-border-base text-white/40"}`}>
                            {newCommunityPublic ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            {newCommunityPublic ? "Public" : "Private"}
                          </button>
                          <button type="button" onClick={() => setNewCommunityOfficial((v) => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${newCommunityOfficial ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" : "bg-white/5 border-border-base text-white/40"}`}>
                            <BadgeCheck className="w-4 h-4" />
                            {newCommunityOfficial ? "Official ✓" : "Mark Official"}
                          </button>
                          <div className="flex-1" />
                          <button type="button" onClick={() => setShowCreateCommunity(false)} className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white/5 text-white/50 hover:bg-white/10 transition-colors">Cancel</button>
                          <button type="submit" disabled={creatingCommunity || !newCommunityName.trim()} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                            {creatingCommunity ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            Create
                          </button>
                        </div>
                      </form>
                    )}

                    {loadingCommunities ? (
                      <div className="flex items-center gap-2 text-white/40 py-8 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading communities…
                      </div>
                    ) : communities.length === 0 ? (
                      <div className="text-center py-12 text-white/30">
                        <Users2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No communities yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {communities.map((c) => (
                          <div key={c.id} className="bg-surface border border-border-base rounded-2xl p-5">
                            {editingCommunity?.id === c.id ? (
                              <form onSubmit={handleSaveCommunity} className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Name</label>
                                    <input
                                      value={communityEditName}
                                      onChange={(e) => setCommunityEditName(e.target.value)}
                                      className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500"
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Category</label>
                                    <input
                                      value={communityEditCategory}
                                      onChange={(e) => setCommunityEditCategory(e.target.value)}
                                      placeholder="general"
                                      className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Description</label>
                                  <textarea
                                    value={communityEditDesc}
                                    onChange={(e) => setCommunityEditDesc(e.target.value)}
                                    rows={2}
                                    className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 resize-none"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setCommunityEditPublic(v => !v)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${communityEditPublic ? "bg-green-600/10 border-green-500/30 text-green-400" : "bg-white/5 border-border-base text-white/40"}`}
                                  >
                                    {communityEditPublic ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                    {communityEditPublic ? "Public" : "Private"}
                                  </button>
                                  <div className="flex-1" />
                                  <button
                                    type="button"
                                    onClick={() => setEditingCommunity(null)}
                                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white/5 text-white/50 hover:bg-white/10 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={savingCommunity}
                                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                  >
                                    {savingCommunity ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    Save
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-white text-sm">{c.name}</p>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 font-mono">/{c.slug}</span>
                                    {c.category && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-400 border border-blue-500/20">{c.category}</span>
                                    )}
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${c.isPublic ? "bg-green-600/10 text-green-400" : "bg-orange-600/10 text-orange-400"}`}>
                                      {c.isPublic ? "Public" : "Private"}
                                    </span>
                                    {c.isOfficial && (
                                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-bold">
                                        <BadgeCheck className="w-3 h-3" /> Official
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-white/40 mt-1 line-clamp-2">{c.description || <span className="italic opacity-50">No description</span>}</p>
                                  <p className="text-[10px] text-white/25 mt-1">
                                    {c.memberCount ?? 0} member{(c.memberCount ?? 0) !== 1 ? "s" : ""}
                                    {" · "}
                                    <a href={`/c/${c.slug}`} target="_blank" rel="noopener noreferrer" className="text-blue-400/60 hover:text-blue-400 transition-colors">View ↗</a>
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => handleEditCommunity(c)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteCommunityConfirm(c.id)}
                                    className="p-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Organizations Tab */}
                {activeTab === "organizations" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-white/40">{orgs.length} organization{orgs.length !== 1 ? "s" : ""} total</p>
                      <div className="flex items-center gap-2">
                        <button onClick={loadOrgs} disabled={loadingOrgs} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingOrgs ? "animate-spin" : ""}`} />
                          Refresh
                        </button>
                        <button onClick={() => setShowCreateOrg((v) => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                          New Org
                        </button>
                      </div>
                    </div>

                    {/* Create-org form */}
                    {showCreateOrg && (
                      <form onSubmit={handleAdminCreateOrg} className="bg-surface border border-blue-500/30 rounded-2xl p-5 space-y-3">
                        <p className="text-sm font-bold text-white mb-1 flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-400" />Create New Organization</p>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Name *</label>
                          <input value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} placeholder="DevOS HQ" required className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Description</label>
                          <textarea value={newOrgDesc} onChange={(e) => setNewOrgDesc(e.target.value)} rows={2} placeholder="What does this org do?" className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 resize-none" />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button type="button" onClick={() => setNewOrgPublic((v) => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${newOrgPublic ? "bg-green-600/10 border-green-500/30 text-green-400" : "bg-white/5 border-border-base text-white/40"}`}>
                            {newOrgPublic ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            {newOrgPublic ? "Public" : "Private"}
                          </button>
                          <button type="button" onClick={() => setNewOrgOfficial((v) => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${newOrgOfficial ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" : "bg-white/5 border-border-base text-white/40"}`}>
                            <BadgeCheck className="w-4 h-4" />
                            {newOrgOfficial ? "Official ✓ (auto-joins everyone)" : "Mark Official"}
                          </button>
                          <div className="flex-1" />
                          <button type="button" onClick={() => setShowCreateOrg(false)} className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white/5 text-white/50 hover:bg-white/10 transition-colors">Cancel</button>
                          <button type="submit" disabled={creatingOrg || !newOrgName.trim()} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                            {creatingOrg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            Create
                          </button>
                        </div>
                      </form>
                    )}

                    {loadingOrgs ? (
                      <div className="flex items-center gap-2 text-white/40 py-8 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading organizations…
                      </div>
                    ) : orgs.length === 0 ? (
                      <div className="text-center py-12 text-white/30">
                        <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No organizations yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {orgs.map((org) => (
                          <div key={org.id} className="bg-surface border border-border-base rounded-2xl p-5">
                            {editingOrg?.id === org.id ? (
                              <form onSubmit={handleSaveOrg} className="space-y-3">
                                <div>
                                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Name</label>
                                  <input
                                    value={orgEditName}
                                    onChange={(e) => setOrgEditName(e.target.value)}
                                    className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Description</label>
                                  <textarea
                                    value={orgEditDesc}
                                    onChange={(e) => setOrgEditDesc(e.target.value)}
                                    rows={2}
                                    className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 resize-none"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setOrgEditPublic(v => !v)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${orgEditPublic ? "bg-green-600/10 border-green-500/30 text-green-400" : "bg-white/5 border-border-base text-white/40"}`}
                                  >
                                    {orgEditPublic ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                    {orgEditPublic ? "Public" : "Private"}
                                  </button>
                                  <div className="flex-1" />
                                  <button
                                    type="button"
                                    onClick={() => setEditingOrg(null)}
                                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white/5 text-white/50 hover:bg-white/10 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={savingOrg}
                                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                  >
                                    {savingOrg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    Save
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-white text-sm">{org.name}</p>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 font-mono">/{org.slug}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${org.isPublic ? "bg-green-600/10 text-green-400" : "bg-orange-600/10 text-orange-400"}`}>
                                      {org.isPublic ? "Public" : "Private"}
                                    </span>
                                    {org.isOfficial && (
                                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-bold">
                                        <BadgeCheck className="w-3 h-3" /> Official
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-white/40 mt-1 line-clamp-2">{org.description || <span className="italic opacity-50">No description</span>}</p>
                                  <p className="text-[10px] text-white/25 mt-1">
                                    {org.memberCount ?? 0} member{(org.memberCount ?? 0) !== 1 ? "s" : ""}
                                    {" · "}
                                    <a href={`/org/${org.slug}`} target="_blank" rel="noopener noreferrer" className="text-blue-400/60 hover:text-blue-400 transition-colors">
                                      View page ↗
                                    </a>
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => handleEditOrg(org)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteOrgConfirm(org.id)}
                                    className="p-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Projects Tab */}
                {activeTab === "projects" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-white/40">{adminProjects.length} project{adminProjects.length !== 1 ? "s" : ""} total</p>
                      <div className="flex items-center gap-2">
                        <button onClick={loadAdminProjects} disabled={loadingAdminProjects} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingAdminProjects ? "animate-spin" : ""}`} />
                          Refresh
                        </button>
                        <button onClick={() => setShowCreateProject((v) => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                          New Project
                        </button>
                      </div>
                    </div>

                    {/* Create project form */}
                    {showCreateProject && (
                      <form onSubmit={handleAdminCreateProject} className="bg-surface border border-blue-500/30 rounded-2xl p-5 space-y-3">
                        <p className="text-sm font-bold text-white mb-1 flex items-center gap-2"><FolderPlus className="w-4 h-4 text-blue-400" />Create Official DevOS Project</p>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Project Name *</label>
                          <input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="DevOS Starter Kit" required className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Description</label>
                          <textarea value={newProjectDesc} onChange={(e) => setNewProjectDesc(e.target.value)} rows={2} placeholder="Brief description of the project" className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 resize-none" />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button type="button" onClick={() => setNewProjectPublic((v) => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${newProjectPublic ? "bg-green-600/10 border-green-500/30 text-green-400" : "bg-white/5 border-border-base text-white/40"}`}>
                            {newProjectPublic ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            {newProjectPublic ? "Public" : "Private"}
                          </button>
                          <button type="button" onClick={() => setNewProjectOfficial((v) => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${newProjectOfficial ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" : "bg-white/5 border-border-base text-white/40"}`}>
                            <BadgeCheck className="w-4 h-4" />
                            {newProjectOfficial ? "Official ✓" : "Mark Official"}
                          </button>
                          <div className="flex-1" />
                          <button type="button" onClick={() => setShowCreateProject(false)} className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white/5 text-white/50 hover:bg-white/10 transition-colors">Cancel</button>
                          <button type="submit" disabled={creatingAdminProject || !newProjectName.trim()} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                            {creatingAdminProject ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            Create
                          </button>
                        </div>
                      </form>
                    )}

                    {loadingAdminProjects ? (
                      <div className="flex items-center gap-2 text-white/40 py-8 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading projects…
                      </div>
                    ) : adminProjects.length === 0 ? (
                      <div className="text-center py-12 text-white/30">
                        <FolderPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No projects yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {adminProjects.map((proj) => (
                          <div key={proj.id} className="bg-surface border border-border-base rounded-2xl p-4 flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-white text-sm">{proj.name}</p>
                                {proj.isOfficial && (
                                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-bold">
                                    <BadgeCheck className="w-3 h-3" /> Official
                                  </span>
                                )}
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${proj.isPublic ? "bg-green-600/10 text-green-400" : "bg-orange-600/10 text-orange-400"}`}>
                                  {proj.isPublic ? "Public" : "Private"}
                                </span>
                              </div>
                              <p className="text-xs text-white/40 mt-1 line-clamp-1">{proj.description || <span className="italic opacity-50">No description</span>}</p>
                              <p className="text-[10px] text-white/25 mt-1">
                                by @{proj.ownerUsername ?? "—"}
                                {" · "}
                                <a href={`/projects?open=${proj.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-400/60 hover:text-blue-400 transition-colors">Open in IDE ↗</a>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Events Management Tab */}
                {activeTab === "events" && (
                  <div className="space-y-6">
                    {/* Create Event */}
                    <div className="bg-surface border border-border-base rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setShowCreateEvent((v) => !v)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-bold text-white">Create Event</span>
                          <span className="text-xs text-white/30">(auto-approved)</span>
                        </div>
                        {showCreateEvent ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                      </button>

                      {showCreateEvent && (
                        <form onSubmit={handleCreateAdminEvent} className="border-t border-border-base px-5 pb-5 pt-4 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                              <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Title *</label>
                              <input value={newEvTitle} onChange={(e) => setNewEvTitle(e.target.value)} required placeholder="e.g. DevOS Hackathon 2025" className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Description *</label>
                              <textarea value={newEvDesc} onChange={(e) => setNewEvDesc(e.target.value)} required rows={3} placeholder="What's this event about?" className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Type</label>
                              <select value={newEvType} onChange={(e) => setNewEvType(e.target.value as EventType)} className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors">
                                <option value="online">Online</option>
                                <option value="physical">Physical</option>
                                <option value="hybrid">Hybrid</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-3 pt-5">
                              <button type="button" onClick={() => setNewEvPremium((v) => !v)} className={cn("relative w-10 h-5 rounded-full transition-all shrink-0", newEvPremium ? "bg-yellow-500" : "bg-white/10")}>
                                <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all", newEvPremium ? "left-5" : "left-0.5")} />
                              </button>
                              <span className="text-sm text-white/60">Premium event</span>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Start Date *</label>
                              <input type="datetime-local" value={newEvStart} onChange={(e) => setNewEvStart(e.target.value)} required className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">End Date *</label>
                              <input type="datetime-local" value={newEvEnd} onChange={(e) => setNewEvEnd(e.target.value)} required className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            {newEvType === "online" && (
                              <div className="sm:col-span-2">
                                <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Event Link</label>
                                <input type="url" value={newEvLink} onChange={(e) => setNewEvLink(e.target.value)} placeholder="https://meet.google.com/..." className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                              </div>
                            )}
                            {newEvType === "physical" && (
                              <>
                                <div>
                                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Venue Name</label>
                                  <input value={newEvVenue} onChange={(e) => setNewEvVenue(e.target.value)} placeholder="Tech Hub Lagos" className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-1.5">Address</label>
                                  <input value={newEvAddress} onChange={(e) => setNewEvAddress(e.target.value)} placeholder="123 Tech Street" className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-3 pt-1">
                            <button type="button" onClick={() => setShowCreateEvent(false)} className="px-5 py-2.5 rounded-xl font-bold text-white/40 hover:text-white transition-colors text-sm">Cancel</button>
                            <button type="submit" disabled={creatingAdminEvent} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60">
                              {creatingAdminEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                              {creatingAdminEvent ? "Creating…" : "Create & Approve"}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>

                    {/* Filters */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        {(["all", "pending", "under_review", "approved", "rejected"] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => setEventStatusFilter(s)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all",
                              eventStatusFilter === s
                                ? "bg-blue-600 text-white"
                                : "bg-white/5 text-white/50 hover:bg-white/10"
                            )}
                          >
                            {s.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={loadAdminEvents}
                        disabled={loadingAdminEvents}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingAdminEvents ? "animate-spin" : ""}`} />
                        Refresh
                      </button>
                    </div>

                    {loadingAdminEvents ? (
                      <div className="flex items-center justify-center py-12 text-white/40 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading events…
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {adminEvents
                          .filter((e) => eventStatusFilter === "all" || e.status === eventStatusFilter)
                          .map((ev) => (
                            <div
                              key={ev.id}
                              className="bg-surface border border-border-base rounded-2xl p-5"
                            >
                              <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className={cn(
                                      "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                                      ev.status === "approved" && "bg-green-600/10 text-green-400 border-green-500/20",
                                      ev.status === "rejected" && "bg-red-600/10 text-red-400 border-red-500/20",
                                      ev.status === "pending" && "bg-yellow-600/10 text-yellow-400 border-yellow-500/20",
                                      ev.status === "under_review" && "bg-blue-600/10 text-blue-400 border-blue-500/20",
                                    )}>
                                      {ev.status.replace("_", " ")}
                                    </span>
                                    <span className={cn(
                                      "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                                      ev.type === "online" ? "bg-green-600/10 text-green-400 border-green-500/20" : "bg-orange-600/10 text-orange-400 border-orange-500/20"
                                    )}>
                                      {ev.type}
                                    </span>
                                    {ev.isPremium && (
                                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border bg-yellow-600/10 text-yellow-400 border-yellow-500/20">
                                        Premium
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="font-semibold text-white">{ev.title}</h3>
                                  <p className="text-white/40 text-xs mt-1 line-clamp-2">{ev.description}</p>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-white/30">
                                    {ev.createdByUsername && (
                                      <span>By @{ev.createdByUsername}</span>
                                    )}
                                    {ev.type === "physical" && ev.venueName && (
                                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.venueName}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap shrink-0">
                                  {ev.status !== "approved" && (
                                    <button
                                      onClick={() => handleSetEventStatus(ev.id, "approved")}
                                      disabled={updatingEventId === ev.id}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white transition-colors disabled:opacity-50"
                                    >
                                      {updatingEventId === ev.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                      Approve
                                    </button>
                                  )}
                                  {ev.status !== "rejected" && (
                                    <button
                                      onClick={() => handleSetEventStatus(ev.id, "rejected")}
                                      disabled={updatingEventId === ev.id}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50"
                                    >
                                      <XCircle className="w-3 h-3" />
                                      Reject
                                    </button>
                                  )}
                                  {ev.status === "pending" && (
                                    <button
                                      onClick={() => handleSetEventStatus(ev.id, "under_review")}
                                      disabled={updatingEventId === ev.id}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50"
                                    >
                                      <Clock className="w-3 h-3" />
                                      Mark Under Review
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleToggleRsvps(ev.id)}
                                    className={cn(
                                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                                      expandedRsvpEventId === ev.id
                                        ? "bg-purple-600/30 text-purple-300"
                                        : "bg-white/5 text-white/40 hover:bg-purple-600/20 hover:text-purple-300"
                                    )}
                                  >
                                    {loadingRsvpEventId === ev.id
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : <Users className="w-3 h-3" />}
                                    RSVPs {eventRsvps[ev.id] ? `(${eventRsvps[ev.id].length})` : ""}
                                  </button>
                                  <button
                                    onClick={() => setDeleteEventConfirm(ev.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-white/40 hover:bg-red-600/20 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                  </button>
                                </div>
                              </div>

                              {/* RSVP panel */}
                              {expandedRsvpEventId === ev.id && (
                                <div className="mt-4 border-t border-border-base pt-4">
                                  {loadingRsvpEventId === ev.id ? (
                                    <div className="flex items-center gap-2 text-white/40 text-xs py-2">
                                      <Loader2 className="w-4 h-4 animate-spin" /> Loading RSVPs…
                                    </div>
                                  ) : (eventRsvps[ev.id] ?? []).length === 0 ? (
                                    <p className="text-xs text-white/30 py-2">No RSVPs yet.</p>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-white/30 uppercase text-[10px] tracking-widest">
                                            <th className="text-left pb-2 pr-4">Name</th>
                                            <th className="text-left pb-2 pr-4">Email</th>
                                            <th className="text-left pb-2 pr-4">Phone</th>
                                            <th className="text-left pb-2">Source</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(eventRsvps[ev.id] ?? []).map((reg) => (
                                            <tr key={reg.id} className="border-t border-border-base">
                                              <td className="py-2 pr-4 text-white/80">{reg.name}</td>
                                              <td className="py-2 pr-4 text-white/60">{reg.email}</td>
                                              <td className="py-2 pr-4 text-white/40">{reg.phone ?? "—"}</td>
                                              <td className="py-2">
                                                <span className={cn(
                                                  "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                                                  reg.source === "user"
                                                    ? "bg-blue-600/20 text-blue-400"
                                                    : "bg-white/10 text-white/40"
                                                )}>
                                                  {reg.source}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        {adminEvents.filter((e) => eventStatusFilter === "all" || e.status === eventStatusFilter).length === 0 && (
                          <div className="text-center py-12 text-white/30">
                            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p>No events found</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Learn Tab */}
                {activeTab === "vux" && (<AdminVuxTab />)}

                {activeTab === "kora" && (
          <div className="space-y-6" style={{ height: "calc(100vh - 200px)" }}>
            <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-6 h-full flex flex-col">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Bot className="w-6 h-6 text-blue-400" />
                KORA AI Assistant
              </h3>
              <p className="text-gray-400 mb-6 text-sm">Access the live KORA Backend API directly from the dashboard.</p>
              <div className="flex-1 min-h-0">
                <KoraChatWidget />
              </div>
            </div>
          </div>
        )}

        {activeTab === "learn" && (
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="text-sm text-white/50">
                          {TOPICS.length} built-in topics · {dynamicLessons.length} custom lesson{dynamicLessons.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setLoadingLessons(true); getAllLessons().then(setDynamicLessons).catch(() => {}).finally(() => setLoadingLessons(false)); }}
                          disabled={loadingLessons}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingLessons ? "animate-spin" : ""}`} />
                          Refresh
                        </button>
                        <a href="/learn" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all text-xs font-bold">
                          <BookOpen className="w-3.5 h-3.5" />
                          Visit Learn
                        </a>
                        <button onClick={openNewLessonForm} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                          New Lesson
                        </button>
                      </div>
                    </div>

                    {/* Lesson create/edit form */}
                    {showLessonForm && (
                      <form onSubmit={handleSaveLesson} className="bg-surface border border-blue-500/30 rounded-2xl p-5 space-y-4">
                        <p className="text-sm font-bold text-white flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-blue-400" />
                          {editingLesson ? "Edit Lesson" : "New Lesson"}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Title *</label>
                            <input
                              value={lessonForm.title}
                              onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value, slug: slugifyTitle(e.target.value) }))}
                              placeholder="e.g. Variables & Data Types"
                              required
                              className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Slug</label>
                            <input
                              value={lessonForm.slug}
                              onChange={(e) => setLessonForm((f) => ({ ...f, slug: e.target.value }))}
                              placeholder="auto-generated from title"
                              className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white/70 font-mono placeholder-white/20 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Description</label>
                          <input
                            value={lessonForm.description}
                            onChange={(e) => setLessonForm((f) => ({ ...f, description: e.target.value }))}
                            placeholder="Short description of this lesson"
                            className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Language</label>
                          <select
                            value={lessonForm.language}
                            onChange={(e) => setLessonForm((f) => ({ ...f, language: e.target.value as DynamicLesson["language"] }))}
                            className="bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                          >
                            <option value="javascript">JavaScript</option>
                            <option value="typescript">TypeScript</option>
                            <option value="html">HTML</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Code Example</label>
                          <textarea
                            value={lessonForm.codeExample}
                            onChange={(e) => setLessonForm((f) => ({ ...f, codeExample: e.target.value }))}
                            rows={6}
                            placeholder="// Paste the runnable code example here"
                            className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-white/20 focus:outline-none focus:border-blue-500 resize-y"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Explanation (markdown)</label>
                          <textarea
                            value={lessonForm.explanation}
                            onChange={(e) => setLessonForm((f) => ({ ...f, explanation: e.target.value }))}
                            rows={4}
                            placeholder="Explain the key concepts in this lesson…"
                            className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 resize-y"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Expected Output (one line per entry)</label>
                          <textarea
                            value={lessonForm.expectedOutput}
                            onChange={(e) => setLessonForm((f) => ({ ...f, expectedOutput: e.target.value }))}
                            rows={3}
                            placeholder={"DevOS\n42\ntrue"}
                            className="w-full bg-black/40 border border-border-base rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-white/20 focus:outline-none focus:border-blue-500 resize-y"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setLessonForm((f) => ({ ...f, published: !f.published }))}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${lessonForm.published ? "bg-green-600/10 border-green-500/30 text-green-400" : "bg-white/5 border-border-base text-white/40"}`}
                          >
                            {lessonForm.published ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            {lessonForm.published ? "Published" : "Draft"}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="submit" disabled={savingLesson} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all">
                            {savingLesson ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {editingLesson ? "Update" : "Create"}
                          </button>
                          <button type="button" onClick={() => { setShowLessonForm(false); setEditingLesson(null); }} className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white bg-white/5 hover:bg-white/10 transition-all">Cancel</button>
                        </div>
                      </form>
                    )}

                    {/* Custom lessons list */}
                    {loadingLessons ? (
                      <div className="flex items-center gap-2 text-white/30 py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
                    ) : dynamicLessons.length === 0 ? (
                      <div className="bg-surface border border-border-base rounded-2xl p-8 text-center">
                        <BookOpen className="w-8 h-8 text-white/10 mx-auto mb-2" />
                        <p className="text-white/40 text-sm">No custom lessons yet. Click <strong>New Lesson</strong> to add one.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Custom Lessons ({dynamicLessons.length})</p>
                        {dynamicLessons.map((lesson) => (
                          <div key={lesson.id} className="flex items-center justify-between gap-3 bg-surface border border-border-base hover:border-border-base rounded-xl px-4 py-3 transition-all">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold text-white truncate">{lesson.title}</p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-white/30 font-mono">{lesson.language}</span>
                                {lesson.published ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-400 font-bold">published</span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-white/30 font-bold">draft</span>
                                )}
                              </div>
                              {lesson.description && <p className="text-xs text-white/30 mt-0.5 truncate">{lesson.description}</p>}
                              <p className="text-[10px] text-white/20 font-mono mt-0.5">/learn/l/{lesson.slug}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={() => openEditLessonForm(lesson)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setDeleteLessonConfirm(lesson.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Built-in topics (read-only) */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Built-in Topics ({TOPICS.length})</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {TOPICS.map((topic) => (
                          <div key={topic.id} className="bg-surface border border-border-base rounded-2xl p-5">
                            <div className="flex items-start justify-between mb-2">
                              <p className="font-bold text-white">{topic.title}</p>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 bg-white/5 px-2 py-0.5 rounded-md">
                                {topic.lessons.length} lessons
                              </span>
                            </div>
                            <p className="text-xs text-white/40 mb-3 line-clamp-2">{topic.description}</p>
                            <ul className="space-y-1">
                              {topic.lessons.map((lesson) => (
                                <li key={lesson.id} className="flex items-center gap-2 text-xs text-white/50">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0" />
                                  {lesson.title}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delete confirmation */}
                    <ConfirmModal
                      open={!!deleteLessonConfirm}
                      title="Delete Lesson"
                      description="This will permanently delete the lesson."
                      warning="This action cannot be undone."
                      confirmLabel={deletingLesson ? "Deleting…" : "Delete"}
                      onConfirm={handleDeleteLesson}
                      onCancel={() => setDeleteLessonConfirm(null)}
                    />
                  </div>
                )}

                {/* Site Settings Tab */}
                {activeTab === "site" && (
                  <div className="space-y-6 max-w-2xl">
                    {loadingSiteConfig ? (
                      <div className="flex items-center gap-2 text-white/40 py-8 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading…
                      </div>
                    ) : (
                      <form onSubmit={handleSaveSiteConfig} className="space-y-5">
                        {/* Branding */}
                        <div className="bg-surface border border-border-base rounded-2xl p-6 space-y-4">
                          <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                            <Globe className="w-4 h-4 text-blue-400" />
                            Branding
                          </h2>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">Platform Name</label>
                            <input
                              type="text"
                              value={siteConfig.platformName}
                              onChange={(e) => setSiteConfig((s) => ({ ...s, platformName: e.target.value }))}
                              placeholder="DevOS"
                              className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">Tagline</label>
                            <input
                              type="text"
                              value={siteConfig.tagline}
                              onChange={(e) => setSiteConfig((s) => ({ ...s, tagline: e.target.value }))}
                              placeholder="The cloud IDE built for builders…"
                              className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">Footer Credit Text</label>
                            <input
                              type="text"
                              value={siteConfig.footerCredit}
                              onChange={(e) => setSiteConfig((s) => ({ ...s, footerCredit: e.target.value }))}
                              placeholder="Built by Kontyra and Tech Visionary Network"
                              className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                          </div>
                        </div>

                        {/* Contact */}
                        <div className="bg-surface border border-border-base rounded-2xl p-6 space-y-4">
                          <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                            <Send className="w-4 h-4 text-blue-400" />
                            Contact
                          </h2>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">Contact Email</label>
                            <input
                              type="email"
                              value={siteConfig.contactEmail}
                              onChange={(e) => setSiteConfig((s) => ({ ...s, contactEmail: e.target.value }))}
                              placeholder="info@devos.zone.id"
                              className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors"
                              required
                            />
                          </div>
                          <div className="flex items-center justify-between py-3.5 px-4 bg-black/30 border border-border-base rounded-xl">
                            <div>
                              <p className="text-sm font-semibold text-white">Allow voice calls platform-wide</p>
                              <p className="text-xs text-white/35 mt-0.5">If disabled, community and organization voice call buttons are hidden.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSiteConfig((s) => ({ ...s, allowVoiceCalls: !s.allowVoiceCalls }))}
                              className="text-white/70 hover:text-white transition-colors"
                            >
                              {siteConfig.allowVoiceCalls ? <ToggleRight className="w-8 h-8 text-blue-400" /> : <ToggleLeft className="w-8 h-8 text-white/35" />}
                            </button>
                          </div>
                        </div>

                        {/* Social Links */}
                        <div className="bg-surface border border-border-base rounded-2xl p-6 space-y-4">
                          <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-blue-400" />
                            Social Links
                          </h2>
                          {[
                            { key: "githubUrl", label: "GitHub URL", placeholder: "https://github.com/devos" },
                            { key: "twitterUrl", label: "Twitter / X URL", placeholder: "https://twitter.com/devos" },
                            { key: "websiteUrl", label: "Website URL", placeholder: "https://devos.app" },
                          ].map(({ key, label, placeholder }) => (
                            <div key={key}>
                              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">{label}</label>
                              <input
                                type="url"
                                value={(siteConfig as any)[key]}
                                onChange={(e) => setSiteConfig((s) => ({ ...s, [key]: e.target.value }))}
                                placeholder={placeholder}
                                className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors"
                              />
                            </div>
                          ))}
                        </div>

                        <button
                          type="submit"
                          disabled={savingSiteConfig}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all"
                        >
                          {savingSiteConfig
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                            : <><Save className="w-4 h-4" /> Save Site Settings</>}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </>
            )}
            </SubpageWrapper>
          )}
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
      open={!!deleteCommunityConfirm}
      title="Delete Community"
      description={`Delete this community? All its data will be permanently removed.`}
      warning="This action cannot be undone."
      confirmLabel="Delete Community"
      loading={deletingCommunity}
      onConfirm={confirmDeleteCommunity}
      onCancel={() => setDeleteCommunityConfirm(null)}
    />

    <ConfirmModal
      open={!!deleteOrgConfirm}
      title="Delete Organization"
      description="Delete this organization? The organization document will be permanently removed."
      warning="This action cannot be undone."
      confirmLabel="Delete Organization"
      loading={deletingOrg}
      onConfirm={confirmDeleteOrg}
      onCancel={() => setDeleteOrgConfirm(null)}
    />

    <ConfirmModal
      open={!!deleteEventConfirm}
      title="Delete Event"
      description="This event will be permanently removed from the platform."
      warning="This action cannot be undone."
      confirmLabel="Delete Event"
      loading={deletingEvent}
      onConfirm={confirmDeleteEvent}
      onCancel={() => setDeleteEventConfirm(null)}
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
            className="bg-surface border border-border-base rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-base flex-shrink-0">
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
                <div key={index} className="rounded-xl border border-border-base overflow-hidden">
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
                      className="w-full bg-surface text-white/80 font-mono text-xs p-4 resize-none outline-none border-t border-border-base"
                      rows={12}
                      spellCheck={false}
                      placeholder="File content..."
                    />
                  )}
                </div>
              ))}

              {/* Add new file */}
              <div className="rounded-xl border border-dashed border-border-base p-4 space-y-3">
                <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Add New File</p>
                <input
                  type="text"
                  value={newTplFileName}
                  onChange={(e) => setNewTplFileName(e.target.value)}
                  placeholder="filename (e.g. css/style.css)"
                  className="w-full bg-white/5 border border-border-base rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50 font-mono"
                />
                <textarea
                  value={newTplFileContent}
                  onChange={(e) => setNewTplFileContent(e.target.value)}
                  placeholder="File content (optional)..."
                  className="w-full bg-white/5 border border-border-base rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50 font-mono resize-none"
                  rows={6}
                  spellCheck={false}
                />
                <button
                  onClick={handleAddTemplateFile}
                  disabled={!newTplFileName.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-border-base text-white/80 text-sm rounded-lg font-bold transition-all disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                  Add File
                </button>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-base flex-shrink-0">
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
    blue: "bg-blue-600/20 text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.15)]",
    green: "bg-green-600/20 text-green-400 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.15)]",
    purple: "bg-purple-600/20 text-purple-400 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]",
  };
  return (
    <div className="relative group p-6 rounded-3xl bg-white/[0.02] border border-white/5 overflow-hidden transition-all hover:bg-white/[0.04] hover:border-white/10">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3", colors[color])}>
        {icon}
      </div>
      <p className="text-4xl font-black text-white mb-1 tracking-tight">{value}</p>
      <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{label}</p>
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
    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all">
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
