import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import AdminThemesTab from "../components/AdminThemesTab";
import AdminVuxTab from "../components/AdminVuxTab";
import { AdminOverviewTab } from '../components/admin/AdminOverviewTab';
import { AdminPollsTab } from '../components/admin/AdminPollsTab';
import { AdminNotificationsTab } from '../components/admin/AdminNotificationsTab';
import { AdminRedeemTab } from '../components/admin/AdminRedeemTab';
import { AdminReservedTab } from '../components/admin/AdminReservedTab';
import { AdminFeedbackTab } from '../components/admin/AdminFeedbackTab';
import { AdminDeletionsTab } from '../components/admin/AdminDeletionsTab';
import { AdminMaintenanceTab } from '../components/admin/AdminMaintenanceTab';
import { AdminEmailTab } from '../components/admin/AdminEmailTab';
import { AdminCommunitiesTab } from '../components/admin/AdminCommunitiesTab';
import { AdminOrganizationsTab } from '../components/admin/AdminOrganizationsTab';
import { AdminProjectsTab } from '../components/admin/AdminProjectsTab';
import { AdminEventsTab } from '../components/admin/AdminEventsTab';
import { AdminKoraTab } from '../components/admin/AdminKoraTab';
import { AdminLearnTab } from '../components/admin/AdminLearnTab';
import { AdminSiteTab } from '../components/admin/AdminSiteTab';
import { AdminTemplatesTab } from '../components/admin/AdminTemplatesTab';
import KoraChatWidget from "../components/KoraChatWidget";
import PortfolioIDE from "../components/PortfolioIDE";
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
        ownerType: "admin",         // platform-level project, not a personal user project
        isAdminProject: true,       // extra flag to make filtering unambiguous
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
                {activeTab === "overview" && <AdminOverviewTab {...adminTabProps} />}
                {/* Templates Tab */}
                {activeTab === "themes" && (<AdminThemesTab />)}

                {activeTab === "templates" && <AdminTemplatesTab {...adminTabProps} />}

                {/* Users Tab */}
                {activeTab === "users" && <AdminUsersTab {...adminTabProps} />}

                {/* Credits Tab */}
                {activeTab === "credits" && <AdminCreditsTab {...adminTabProps} />}

                {/* Polls Tab */}
                {activeTab === "polls" && <AdminPollsTab {...adminTabProps} />}

                {/* Notifications Tab */}
                {activeTab === "notifications" && <AdminNotificationsTab {...adminTabProps} />}

                {/* Redeem Codes Tab */}
                {activeTab === "redeem" && <AdminRedeemTab {...adminTabProps} />}

                {/* Admin Posts Tab */}
                {activeTab === "posts" && <AdminPostsTab {...adminTabProps} />}
                {activeTab === "reserved" && <AdminReservedTab {...adminTabProps} />}

                {/* Feedback Tab */}
                {activeTab === "feedback" && <AdminFeedbackTab {...adminTabProps} />}

                {/* Deletion Requests Tab */}
                {activeTab === "deletions" && <AdminDeletionsTab {...adminTabProps} />}

                {/* Maintenance Mode Tab */}
                {activeTab === "maintenance" && <AdminMaintenanceTab {...adminTabProps} />}

                {/* Send Email Tab */}
                {activeTab === "email" && <AdminEmailTab {...adminTabProps} />}

                {/* Communities Tab */}
                {activeTab === "communities" && <AdminCommunitiesTab {...adminTabProps} />}

                {/* Organizations Tab */}
                {activeTab === "organizations" && <AdminOrganizationsTab {...adminTabProps} />}

                {/* Projects Tab */}
                {activeTab === "projects" && <AdminProjectsTab {...adminTabProps} />}

                {/* Events Management Tab */}
                {activeTab === "events" && <AdminEventsTab {...adminTabProps} />}

                {/* Learn Tab */}
                {activeTab === "vux" && (<AdminVuxTab />)}

                {activeTab === "kora" && <AdminKoraTab {...adminTabProps} />}

        {activeTab === "learn" && <AdminLearnTab {...adminTabProps} />}

                {/* Site Settings Tab */}
                {activeTab === "site" && <AdminSiteTab {...adminTabProps} />}
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


  const adminTabProps = {
    users, usernameRequests, showRejectInput, rejectReason, setRejectReason,
    handleRejectUsernameRequest, resolvingRequest, setShowRejectInput,
    handleApproveUsernameRequest, userSearch, setUserSearch,
    handleRoleUpdate, updatingRole, setUserActionConfirm, moderatingUser,
    usernameEditUid, setUsernameEditUid, usernameEditValue, setUsernameEditValue,
    handleAdminChangeUsername, savingUsername, handleToggleOfficial, togglingOfficial,
    handleCreatePortfolio, creatingPortfolio, user
  , postContent, setPostContent, postType, setPostType, adminPostAttachments, setAdminPostAttachments, adminPostTextareaRef, publishingPost, handleAdminPost, handleAdminPostAttachmentUpload, removeAdminPostAttachment, loadingConfig, config, saveGlobalCreditConfig, savingConfig, globalCost, setGlobalCost, globalCreditsEnabled, setGlobalCreditsEnabled, targetUid, setTargetUid, creditAmount, setCreditAmount, operation, setOperation, handleAddOrDeductCredits, savingUserCredits, searchUid, setSearchUid, searchedUser, handleSearchUserCredits, searchingUser, adjusting, giftTarget, setGiftTarget, giftAmount, setGiftAmount, giftExpiry, setGiftExpiry, handleGiftCredits, gifting, unlimitedTarget, setUnlimitedTarget, unlimitedUntil, setUnlimitedUntil, handleGrantUnlimited, grantingUnlimited};
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
