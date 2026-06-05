import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, sendVerificationEmail } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import {
  updatePassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { uploadImage, avatarPath } from "../lib/storageService";
import ImageUpload from "../components/ImageUpload";
import {
  User,
  AtSign,
  FileText,
  Globe,
  Github,
  Twitter,
  Lock,
  Settings,
  Bell,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Save,
  Eye,
  EyeOff,
  Check,
  X,
  Zap,
  ChevronRight,
  Code2,
  Users,
  Copy,
  Link as LinkIcon,
  Gift,
  Loader2 as Loader2Icon,
  Menu,
  Tag,
  Plus,
  Palette,
  Cake,
  PowerOff,
  Mail,
  CheckCircle2,
  XCircle,
  Smartphone,
  GripVertical,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Keyboard,
  History,
  Linkedin,
  Facebook,
  Instagram,
  Youtube,
  Dribbble,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { resolveAvatar } from "../lib/avatars";
import { getAuthErrorMessage } from "../lib/errorMessages";
import ConfirmModal from "../components/ConfirmModal";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import { getReferralStats, REFERRER_BONUS, REFERRED_BONUS } from "../lib/referralService";
import { redeemCode } from "../lib/redeemCodeService";
import { getCreditTransactions, getCredits } from "../lib/creditsService";
import { CreditTransaction, Credits } from "../types";
import { deactivateAccount, requestAccountDeletion, requestUsernameChange, getUserOwnUsernameRequest, checkUsernameAvailable } from "../lib/userService";
import { UsernameChangeRequest } from "../types";
import UIThemeSwitcher from "../components/UIThemeSwitcher";
import { ReferralStats } from "../types";
import CustomSelect from "../components/CustomSelect";
import TwoFactorSetup from "../components/TwoFactorSetup";
import PasskeySetup from "../components/PasskeySetup";
import { ALL_NAV_OPTIONS, NavOptionId } from "../components/MobileBottomNav";
import { cn } from "../lib/utils";
import { sendNotification } from "../lib/notificationService";
import { getSavedAccounts, logoutAccount, type SavedAccount } from "../lib/sessionManager";

type Tab = "profile" | "account" | "security" | "preferences" | "notifications" | "accessibility" | "referrals" | "danger";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
  { id: "account", label: "Account", icon: <Zap className="w-4 h-4" /> },
  { id: "security", label: "Security", icon: <Lock className="w-4 h-4" /> },
  { id: "preferences", label: "Preferences", icon: <Settings className="w-4 h-4" /> },
  { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
  { id: "accessibility", label: "Accessibility", icon: <Keyboard className="w-4 h-4" /> },
  { id: "referrals", label: "Referrals", icon: <Users className="w-4 h-4" /> },
  { id: "danger", label: "Danger Zone", icon: <ShieldAlert className="w-4 h-4" /> },
];

function ReferralsTab({ uid }: { uid: string }) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getReferralStats(uid).then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, [uid]);

  const referralLink = stats ? `${window.location.origin}/?ref=${stats.code}` : "";

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Referral Program</h2>
        <p className="text-sm text-white/40">
          Share your link and earn credits when friends sign up.
        </p>
      </div>

      {/* Reward info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
          <p className="text-2xl font-black text-green-400">+{REFERRER_BONUS}</p>
          <p className="text-xs text-white/50 mt-1">credits you earn per referral</p>
        </div>
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-2xl font-black text-blue-400">+{REFERRED_BONUS}</p>
          <p className="text-xs text-white/50 mt-1">credits your friend gets</p>
        </div>
      </div>

      {/* Your link */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
          <LinkIcon className="w-3 h-3" />
          Your Referral Link
        </label>
        <div className="flex gap-2">
          <div className="flex-1 bg-white/5 border border-border-base rounded-xl px-4 py-3 text-sm font-mono text-white/60 truncate">
            {referralLink || "Generating…"}
          </div>
          <button
            onClick={handleCopy}
            disabled={!referralLink}
            className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-all active:scale-95"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        {stats?.code && (
          <p className="text-[11px] text-white/30">
            Your code: <span className="font-mono font-bold text-white/50">{stats.code}</span>
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/50">Total Referrals</span>
          <span className="text-2xl font-black text-white">{stats?.totalReferrals ?? 0}</span>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white/5 border border-border-base text-xs text-white/40 leading-relaxed">
        <strong className="text-white/60">Rules:</strong> No self-referrals. Each new user can only use one referral code.
        Credits are awarded once per unique sign-up.
      </div>
    </div>
  );
}

/* ─── Settings Sidebar Nav ─── */

function SettingsSidebarNav({
  activeTab,
  onSelect,
}: {
  activeTab: Tab;
  onSelect: (id: Tab) => void;
}) {
  return (
    <>
      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4 px-3">
        Settings
      </p>
      <nav className="flex flex-col gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
              activeTab === tab.id
                ? tab.id === "danger"
                  ? "bg-red-500/15 text-red-400"
                  : "bg-white/8 text-white"
                : tab.id === "danger"
                ? "text-red-400/60 hover:bg-red-500/10 hover:text-red-400"
                : "text-white/50 hover:bg-white/5 hover:text-white"
            }`}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && (
              <ChevronRight className="w-3.5 h-3.5 ml-auto text-white/30" />
            )}
          </button>
        ))}
      </nav>
    </>
  );
}

export default function SettingsPage() {
  const [user, authLoading] = useAuthState(auth);
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = (searchParams.get("tab") as Tab) ?? "profile";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useSEO({ title: "Account Settings — DevOS" });

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-base">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const handleTabSelect = (id: Tab) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-base text-white flex flex-col">
      <Navbar />

      {/* Mobile header bar — only visible below md */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border-base bg-base sticky top-0 z-20">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl hover:bg-white/5 text-white/50 hover:text-white transition-colors"
          aria-label="Open settings menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-white/70">
          {TABS.find((t) => t.id === activeTab)?.label ?? "Settings"}
        </span>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile slide-in drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-60 bg-base border-r border-border-base z-40 flex flex-col p-5 transform transition-transform duration-300 ease-in-out md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-bold text-white">Settings</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors"
            aria-label="Close settings menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <SettingsSidebarNav activeTab={activeTab} onSelect={handleTabSelect} />
      </aside>

      {/* Main layout */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 py-6 md:py-10 flex gap-8">
        {/* Desktop sidebar — always visible on md+ */}
        <aside className="hidden md:block w-52 flex-shrink-0">
          <SettingsSidebarNav activeTab={activeTab} onSelect={handleTabSelect} />
        </aside>

        {/* Panel */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "profile" && <ProfileTab />}
              {activeTab === "account" && <AccountTab />}
              {activeTab === "security" && <SecurityTab />}
              {activeTab === "preferences" && <PreferencesTab />}
              {activeTab === "notifications" && <NotificationsTab />}
              {activeTab === "accessibility" && <AccessibilityTab />}
              {activeTab === "referrals" && user && <ReferralsTab uid={user.uid} />}
              {activeTab === "danger" && <DangerZoneTab />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
function ProfileTab() {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [github, setGithub] = useState("");
  const [twitter, setTwitter] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [dribbble, setDribbble] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [birthday, setBirthday] = useState("");
  const [availableForWork, setAvailableForWork] = useState(false);

  const [usernameRequest, setUsernameRequest] = useState<UsernameChangeRequest | null>(null);
  const [showUsernameRequestForm, setShowUsernameRequestForm] = useState(false);
  const [requestedUsername, setRequestedUsername] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [requestingUsername, setRequestingUsername] = useState(false);
  const [requestUsernameStatus, setRequestUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setFullName(d.fullName || d.displayName || "");
        setUsername(d.username || "");
        setBio(d.bio || "");
        setAvatarUrl(d.avatarUrl || user.photoURL || "");
        setBannerUrl(d.bannerUrl || "");
        setSkills(Array.isArray(d.skills) ? d.skills : []);
        setBirthday(d.birthday || "");
        setAvailableForWork(d.availableForWork ?? false);
        const links = d.links || {};
        setGithub(links.github || "");
        setTwitter(links.twitter || "");
        setWebsite(links.website || "");
        setLinkedin(links.linkedin || "");
        setFacebook(links.facebook || "");
        setInstagram(links.instagram || "");
        setYoutube(links.youtube || "");
        setDribbble(links.dribbble || "");
        setWhatsapp(links.whatsapp || "");
      }
      setLoading(false);
    });
    if (user) {
      getUserOwnUsernameRequest(user.uid).then(setUsernameRequest).catch(() => {});
    }
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!requestedUsername.trim()) { setRequestUsernameStatus("idle"); return; }
    const uname = requestedUsername.toLowerCase().trim();
    if (!/^[a-z0-9_]{3,20}$/.test(uname)) { setRequestUsernameStatus("invalid"); return; }
    setRequestUsernameStatus("checking");
    const t = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(uname);
        setRequestUsernameStatus(available ? "available" : "taken");
      } catch { setRequestUsernameStatus("idle"); }
    }, 400);
    return () => clearTimeout(t);
  }, [requestedUsername]);

  const handleRequestUsernameChange = async () => {
    const uname = requestedUsername.toLowerCase().trim();
    if (!uname || !/^[a-z0-9_]{3,20}$/.test(uname)) return;
    if (requestUsernameStatus !== "available") return;
    if (!user) return;
    setRequestingUsername(true);
    try {
      await requestUsernameChange(user.uid, username, uname, requestReason);
      const req = await getUserOwnUsernameRequest(user.uid);
      setUsernameRequest(req);
      setShowUsernameRequestForm(false);
      setRequestedUsername("");
      setRequestReason("");
      toast.success("Username change request submitted!");
      sendNotification({ userId: user.uid, type: "username_change_requested", title: "Username change requested", message: "Your username change request is under review.", createdBy: "system" }).catch(() => {});
    } catch {
      toast.error("Failed to submit request.");
    } finally {
      setRequestingUsername(false);
    }
  };

  const handleSave = async (silentParam?: boolean | React.MouseEvent) => {
    const silent = silentParam === true;
    if (!user) return;
    if (!silent) setSaving(true);
    try {
      const links = {
        ...(github ? { github } : {}),
        ...(twitter ? { twitter } : {}),
        ...(website ? { website } : {}),
        ...(linkedin ? { linkedin } : {}),
        ...(facebook ? { facebook } : {}),
        ...(instagram ? { instagram } : {}),
        ...(youtube ? { youtube } : {}),
        ...(dribbble ? { dribbble } : {}),
        ...(whatsapp ? { whatsapp } : {}),
      };
      const publicData = {
        uid: user.uid,
        email: user.email || "",
        username,
        displayName: fullName || username,
        fullName,
        bio,
        skills,
        availableForWork,
        avatarUrl,
        avatar: avatarUrl,
        bannerUrl,
        updatedAt: serverTimestamp(),
        ...(birthday ? { birthday } : {}),
        ...(Object.keys(links).length ? { links } : {}),
      };
      const privateData = {
        username,
        displayName: fullName || username,
        fullName,
        bio,
        skills,
        availableForWork,
        avatarUrl,
        avatar: avatarUrl,
        bannerUrl,
        updatedAt: serverTimestamp(),
        ...(birthday ? { birthday } : {}),
        ...(Object.keys(links).length ? { links } : {}),
      };
      await Promise.all([
        setDoc(doc(db, "users", user.uid), publicData, { merge: true }),
        setDoc(doc(db, "user_settings", user.uid), privateData, { merge: true }),
      ]);
      if (!silent) toast.success("Profile updated successfully");
      if (!silent) {
        sendNotification({ userId: user.uid, type: "profile_updated", title: "Profile updated", message: "Your profile has been updated.", createdBy: "system" }).catch(() => {});
      }
    } catch (err: any) {
      console.error(err);
      if (!silent) toast.error("Failed to save profile. Please try again.");
    } finally {
      if (!silent) setSaving(false);
    }
  };

  useEffect(() => {
    if (loading || !user) return;
    const timer = setTimeout(() => {
      handleSave(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [fullName, bio, skills, availableForWork, birthday, github, twitter, website, linkedin, facebook, instagram, youtube, dribbble, whatsapp]);

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const url = await uploadImage(file, avatarPath(user.uid, file), {
        onProgress: setUploadProgress,
      });
      setAvatarUrl(url);
      await Promise.all([
        setDoc(doc(db, "users", user.uid), { uid: user.uid, email: user.email || "", avatarUrl: url, avatar: url, updatedAt: serverTimestamp() }, { merge: true }),
        setDoc(doc(db, "user_settings", user.uid), { avatarUrl: url, avatar: url, updatedAt: serverTimestamp() }, { merge: true }),
      ]);
      toast.success("Avatar updated!");
    } catch (err: any) {
      toast.error("Upload failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

  const handleBannerUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      // Import userBannerPath dynamically if needed or assume it's imported (wait, let's make sure it's imported!)
      const url = await uploadImage(file, `users/${user.uid}/banners/${Date.now()}-${file.name}`, {
        onProgress: setUploadProgress,
      });
      setBannerUrl(url);
      await Promise.all([
        setDoc(doc(db, "users", user.uid), { bannerUrl: url, updatedAt: serverTimestamp() }, { merge: true }),
        setDoc(doc(db, "user_settings", user.uid), { bannerUrl: url, updatedAt: serverTimestamp() }, { merge: true }),
      ]);
      toast.success("Profile banner updated!");
    } catch (err: any) {
      toast.error("Banner upload failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <LoadingPanel />;
  }

  const avatarSrc = resolveAvatar(avatarUrl);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-white/40 text-sm mt-1">Manage your public profile information.</p>
      </div>

      {/* Avatar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <ImageUpload
          shape="square"
          value={avatarSrc}
          onFile={handleAvatarUpload}
          onRemove={() => setAvatarUrl("")}
          uploading={uploading}
          progress={uploadProgress}
          maxSizeMB={5}
          hint="JPG, PNG, GIF — max 5 MB"
        />
        <div>
          <p className="text-sm font-bold text-white">{fullName || username || "Your Name"}</p>
          <p className="text-white/40 text-sm font-mono">@{username || "username"}</p>
          <p className="text-white/30 text-xs mt-1">Profile Avatar · Drop or click to change · max 5 MB</p>
        </div>
      </div>

      {/* Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4">
        <ImageUpload
          shape="banner"
          value={bannerUrl}
          onFile={handleBannerUpload}
          onRemove={() => setBannerUrl("")}
          uploading={uploading}
          progress={uploadProgress}
          maxSizeMB={5}
          hint="Recommend 3:1 ratio — max 5 MB"
        />
        <div>
          <p className="text-sm font-bold text-white">Profile Banner</p>
          <p className="text-white/40 text-sm mt-1">This image will appear at the top of your portfolio.</p>
          <p className="text-white/30 text-xs mt-1">Recommend 1500x500px</p>
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Full Name" icon={<User className="w-3.5 h-3.5" />}>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className={inputCls} />
        </Field>
        <Field label="Username" icon={<AtSign className="w-3.5 h-3.5" />}>
          <div className="relative">
            <input type="text" value={username} readOnly className={`${inputCls} cursor-not-allowed opacity-50`} />
            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
          </div>
          {/* Username change request status / form */}
          {usernameRequest?.status === "pending" ? (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/8 border border-yellow-500/20 text-xs text-yellow-400">
              <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
              Request pending: @{usernameRequest.requestedUsername}
            </div>
          ) : usernameRequest?.status === "approved" ? (
            <p className="mt-2 text-xs text-green-400 px-1">✓ Previous request approved</p>
          ) : usernameRequest?.status === "rejected" ? (
            <div className="mt-2 px-3 py-2 rounded-xl bg-red-500/8 border border-red-500/20">
              <p className="text-xs text-red-400">✗ Last request rejected{usernameRequest.rejectionReason ? `: ${usernameRequest.rejectionReason}` : ""}</p>
              {!showUsernameRequestForm && (
                <button onClick={() => setShowUsernameRequestForm(true)} className="text-xs text-blue-400 hover:text-blue-300 mt-1 transition-colors">
                  Request again →
                </button>
              )}
            </div>
          ) : !showUsernameRequestForm ? (
            <button
              onClick={() => setShowUsernameRequestForm(true)}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Request username change →
            </button>
          ) : null}

          {showUsernameRequestForm && usernameRequest?.status !== "pending" && (
            <div className="mt-3 p-4 rounded-xl bg-white/3 border border-border-base space-y-3">
              <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Request Username Change</p>
              <div className="relative">
                <input
                  type="text"
                  value={requestedUsername}
                  onChange={(e) => setRequestedUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="Desired username"
                  maxLength={20}
                  className={`${inputCls} pr-8 ${
                    requestUsernameStatus === "available" ? "border-green-500/40" :
                    requestUsernameStatus === "taken" || requestUsernameStatus === "invalid" ? "border-red-500/40" : ""
                  }`}
                />
                {requestUsernameStatus === "checking" && <Loader2Icon className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 animate-spin" />}
                {requestUsernameStatus === "available" && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-green-400" />}
                {(requestUsernameStatus === "taken" || requestUsernameStatus === "invalid") && <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-red-400" />}
              </div>
              {requestUsernameStatus === "available" && <p className="text-[11px] text-green-400">✓ Available</p>}
              {requestUsernameStatus === "taken" && <p className="text-[11px] text-red-400">✗ Already taken</p>}
              {requestUsernameStatus === "invalid" && <p className="text-[11px] text-red-400">3–20 chars: letters, numbers, underscores only</p>}
              <textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="Reason for change (optional)"
                rows={2}
                maxLength={200}
                className={`${inputCls} resize-none`}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleRequestUsernameChange}
                  disabled={requestingUsername || requestUsernameStatus !== "available"}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all"
                >
                  {requestingUsername ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Submit Request
                </button>
                <button
                  onClick={() => { setShowUsernameRequestForm(false); setRequestedUsername(""); setRequestReason(""); }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Field>
      </div>

      <Field label="Bio" icon={<FileText className="w-3.5 h-3.5" />}>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell the world about yourself…" rows={3} maxLength={500} className={`${inputCls} resize-none`} />
        <p className="text-[11px] text-white/25 mt-1 text-right">{bio.length}/500</p>
      </Field>

      <Field label="Birthday" icon={<Cake className="w-3.5 h-3.5" />} hint="Used for birthday greetings; not shown publicly">
        <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className={inputCls} max={new Date().toISOString().split("T")[0]} />
      </Field>

      {/* Skills */}
      <div>
        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" /> Skills
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {skills.map((skill) => (
            <span key={skill} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-border-base text-white/70 text-xs font-semibold">
              {skill}
              <button
                type="button"
                onClick={() => setSkills((prev) => prev.filter((s) => s !== skill))}
                className="text-white/30 hover:text-red-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(ev) => {
              if ((ev.key === "Enter" || ev.key === ",") && skillInput.trim()) {
                ev.preventDefault();
                const s = skillInput.trim().replace(/,/g, "");
                if (s && !skills.includes(s) && skills.length < 20) {
                  setSkills((prev) => [...prev, s]);
                }
                setSkillInput("");
              }
            }}
            placeholder="e.g. React, TypeScript… (Enter to add)"
            className={inputCls}
            maxLength={30}
          />
          <button
            type="button"
            onClick={() => {
              const s = skillInput.trim().replace(/,/g, "");
              if (s && !skills.includes(s) && skills.length < 20) {
                setSkills((prev) => [...prev, s]);
              }
              setSkillInput("");
            }}
            className="px-4 py-2.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-white/25 mt-1">{skills.length}/20 skills</p>
      </div>

      <div>
        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Social Links</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="GitHub" icon={<Github className="w-3.5 h-3.5" />}>
            <div className="flex bg-white/5 border border-border-base rounded-xl overflow-hidden focus-within:border-blue-500 transition-all">
              <span className="pl-4 pr-1 py-3 text-white/30 text-sm bg-transparent flex items-center select-none">github.com/</span>
              <input type="text" value={github} onChange={(e) => setGithub(e.target.value.replace(/https?:\/\/(www\.)?github\.com\//, ''))} placeholder="username" className="bg-transparent text-white text-sm py-3 pr-4 outline-none w-full" />
            </div>
          </Field>
          <Field label="Twitter / X" icon={<Twitter className="w-3.5 h-3.5" />}>
            <div className="flex bg-white/5 border border-border-base rounded-xl overflow-hidden focus-within:border-blue-500 transition-all">
              <span className="pl-4 pr-1 py-3 text-white/30 text-sm bg-transparent flex items-center select-none">twitter.com/</span>
              <input type="text" value={twitter} onChange={(e) => setTwitter(e.target.value.replace(/https?:\/\/(www\.)?(twitter|x)\.com\//, ''))} placeholder="username" className="bg-transparent text-white text-sm py-3 pr-4 outline-none w-full" />
            </div>
          </Field>
          <Field label="LinkedIn" icon={<Linkedin className="w-3.5 h-3.5" />}>
            <div className="flex bg-white/5 border border-border-base rounded-xl overflow-hidden focus-within:border-blue-500 transition-all">
              <span className="pl-4 pr-1 py-3 text-white/30 text-sm bg-transparent flex items-center select-none">linkedin.com/in/</span>
              <input type="text" value={linkedin} onChange={(e) => setLinkedin(e.target.value.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, ''))} placeholder="username" className="bg-transparent text-white text-sm py-3 pr-4 outline-none w-full" />
            </div>
          </Field>
          <Field label="Facebook" icon={<Facebook className="w-3.5 h-3.5" />}>
            <div className="flex bg-white/5 border border-border-base rounded-xl overflow-hidden focus-within:border-blue-500 transition-all">
              <span className="pl-4 pr-1 py-3 text-white/30 text-sm bg-transparent flex items-center select-none">facebook.com/</span>
              <input type="text" value={facebook} onChange={(e) => setFacebook(e.target.value.replace(/https?:\/\/(www\.)?facebook\.com\//, ''))} placeholder="username" className="bg-transparent text-white text-sm py-3 pr-4 outline-none w-full" />
            </div>
          </Field>
          <Field label="Instagram" icon={<Instagram className="w-3.5 h-3.5" />}>
            <div className="flex bg-white/5 border border-border-base rounded-xl overflow-hidden focus-within:border-blue-500 transition-all">
              <span className="pl-4 pr-1 py-3 text-white/30 text-sm bg-transparent flex items-center select-none">instagram.com/</span>
              <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value.replace(/https?:\/\/(www\.)?instagram\.com\//, ''))} placeholder="username" className="bg-transparent text-white text-sm py-3 pr-4 outline-none w-full" />
            </div>
          </Field>
          <Field label="YouTube" icon={<Youtube className="w-3.5 h-3.5" />}>
            <div className="flex bg-white/5 border border-border-base rounded-xl overflow-hidden focus-within:border-blue-500 transition-all">
              <span className="pl-4 pr-1 py-3 text-white/30 text-sm bg-transparent flex items-center select-none">youtube.com/@</span>
              <input type="text" value={youtube} onChange={(e) => setYoutube(e.target.value.replace(/https?:\/\/(www\.)?youtube\.com\/(@|c\/|channel\/)?/, ''))} placeholder="username" className="bg-transparent text-white text-sm py-3 pr-4 outline-none w-full" />
            </div>
          </Field>
          <Field label="Dribbble" icon={<Dribbble className="w-3.5 h-3.5" />}>
            <div className="flex bg-white/5 border border-border-base rounded-xl overflow-hidden focus-within:border-blue-500 transition-all">
              <span className="pl-4 pr-1 py-3 text-white/30 text-sm bg-transparent flex items-center select-none">dribbble.com/</span>
              <input type="text" value={dribbble} onChange={(e) => setDribbble(e.target.value.replace(/https?:\/\/(www\.)?dribbble\.com\//, ''))} placeholder="username" className="bg-transparent text-white text-sm py-3 pr-4 outline-none w-full" />
            </div>
          </Field>
          <Field label="Website" icon={<Globe className="w-3.5 h-3.5" />}>
            <div className="flex bg-white/5 border border-border-base rounded-xl overflow-hidden focus-within:border-blue-500 transition-all">
              <span className="pl-4 pr-1 py-3 text-white/30 text-sm bg-transparent flex items-center select-none">https://</span>
              <input type="text" value={website} onChange={(e) => setWebsite(e.target.value.replace(/https?:\/\//, ''))} placeholder="yoursite.com" className="bg-transparent text-white text-sm py-3 pr-4 outline-none w-full" />
            </div>
          </Field>
          <Field label="WhatsApp" icon={<MessageCircle className="w-3.5 h-3.5" />}>
            <div className="flex bg-white/5 border border-border-base rounded-xl overflow-hidden focus-within:border-blue-500 transition-all">
              <span className="pl-4 pr-1 py-3 text-white/30 text-sm bg-transparent flex items-center select-none">wa.me/</span>
              <input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/https?:\/\/(www\.)?wa\.me\//, ''))} placeholder="1234567890" className="bg-transparent text-white text-sm py-3 pr-4 outline-none w-full" />
            </div>
          </Field>
        </div>
      </div>

      {/* Available for Work */}
      <div className="pt-4 border-t border-border-base">
        <label className="flex items-center gap-3 cursor-pointer p-4 rounded-2xl bg-white/5 border border-border-base hover:border-blue-500/30 transition-all group">
          <input 
            type="checkbox" 
            checked={availableForWork}
            onChange={(e) => setAvailableForWork(e.target.checked)}
            className="w-5 h-5 rounded border-border-base text-blue-600 focus:ring-blue-500/20 bg-white/10 cursor-pointer"
          />
          <div>
            <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">Available for Work</p>
            <p className="text-white/40 text-xs mt-0.5">Show a "Hire Me" button on your portfolio to let recruiters know you are open to opportunities.</p>
          </div>
        </label>
      </div>

      <SaveButton loading={saving} onClick={handleSave} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Account Tab                                            */
/* ─────────────────────────────────────────────────────── */
function AccountTab() {
  const [user] = useAuthState(auth);
  const [redeemCodeValue, setRedeemCodeValue] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setTxLoading(true);
    Promise.all([
      getCredits(user.uid),
      getCreditTransactions(user.uid, 30),
    ]).then(([cr, txs]) => {
      if (!cancelled) {
        setCredits(cr);
        setTransactions(txs);
      }
    }).catch(() => {}).finally(() => { if (!cancelled) setTxLoading(false); });
    return () => { cancelled = true; };
  }, [user?.uid]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !redeemCodeValue.trim()) return;
    setRedeeming(true);
    try {
      const result = await redeemCode(redeemCodeValue.trim(), user.uid);
      if (result.success) {
        toast.success(`Code redeemed! +${result.value} credits added.`);
        sendNotification({ userId: user.uid, type: "credits_redeemed", title: "Credits redeemed", message: `"${redeemCodeValue.trim()}" redeemed successfully.`, createdBy: "system" }).catch(() => {});
        setRedeemCodeValue("");
        // Refresh balance + transactions
        const [cr, txs] = await Promise.all([getCredits(user.uid), getCreditTransactions(user.uid, 30)]);
        setCredits(cr); setTransactions(txs);
      } else {
        toast.error((result as { success: false; error: string }).error);
      }
    } catch {
      toast.error("Failed to redeem code. Please try again.");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Account</h1>
        <p className="text-white/40 text-sm mt-1">Your account details, subscription plan, and credits.</p>
      </div>

      <div className="space-y-4">
        <ReadOnlyField label="Email Address" value={user?.email || "—"} />
        <ReadOnlyField label="Account ID" value={user?.uid || "—"} mono copyValue={user?.uid} />
        <div className="p-5 rounded-2xl bg-white/5 border border-border-base flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Plan</p>
            <p className="text-white font-semibold">Free</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-white/10 text-white/60 text-xs font-bold uppercase tracking-wider">Free</span>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all">
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>

      {/* Credit Balance */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">Credits</h2>
        </div>
        {credits ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white/5 border border-border-base rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">Daily</p>
              <p className="text-2xl font-black text-white">{credits.daily}</p>
              <p className="text-[10px] text-white/30 mt-0.5">resets every 24 h</p>
            </div>
            <div className="bg-white/5 border border-border-base rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">Monthly</p>
              <p className="text-2xl font-black text-white">{credits.monthly}</p>
              <p className="text-[10px] text-white/30 mt-0.5">resets each month</p>
            </div>
            {credits.gifted && credits.gifted.length > 0 && (
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400/60 mb-1">Gifted</p>
                <p className="text-2xl font-black text-yellow-300">{credits.gifted.reduce((s, g) => s + g.amount, 0)}</p>
                <p className="text-[10px] text-white/30 mt-0.5">bonus credits</p>
              </div>
            )}
          </div>
        ) : txLoading ? (
          <div className="flex items-center gap-2 text-white/30 text-sm py-2"><Loader2Icon className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : null}
      </div>

      {/* Credit Transaction History */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">Transaction History</h2>
        </div>
        {txLoading ? (
          <div className="flex items-center gap-2 text-white/30 text-sm py-4 justify-center"><Loader2Icon className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-white/30 py-4 text-center">No transactions yet — they appear after you spend or receive credits.</p>
        ) : (
          <div className="space-y-1.5">
            {transactions.map((tx) => {
              const isPositive = tx.delta >= 0;
              const ts = tx.createdAt?.toDate ? tx.createdAt.toDate() : tx.createdAt ? new Date(tx.createdAt) : null;
              return (
                <div key={tx.id} className="flex items-center justify-between gap-3 bg-white/3 hover:bg-white/5 border border-border-base rounded-xl px-4 py-3 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isPositive ? "bg-green-500/10" : "bg-red-500/10"}`}>
                      {isPositive
                        ? <ArrowUpRight className="w-3.5 h-3.5 text-green-400" />
                        : <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white/80 truncate capitalize">{tx.label}</p>
                      {ts && <p className="text-[10px] text-white/30">{ts.toLocaleDateString()} {ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
                    </div>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${isPositive ? "text-green-400" : "text-red-400"}`}>
                    {isPositive ? "+" : ""}{tx.delta}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Redeem Code */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-yellow-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">Redeem Code</h2>
        </div>
        <p className="text-white/40 text-sm">Have a promo code? Enter it below to add credits to your account.</p>
        <form onSubmit={handleRedeem} className="flex gap-3">
          <input
            type="text"
            value={redeemCodeValue}
            onChange={(e) => setRedeemCodeValue(e.target.value.toUpperCase())}
            placeholder="e.g. DEVOS2024"
            className="flex-1 bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white font-mono tracking-widest text-center focus:outline-none focus:border-yellow-500/50 transition-all uppercase placeholder-white/20"
          />
          <button
            type="submit"
            disabled={redeeming || !redeemCodeValue.trim()}
            className="px-5 py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-xl font-bold transition-all flex items-center gap-2 flex-shrink-0"
          >
            {redeeming ? (
              <Loader2Icon className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Gift className="w-4 h-4" />
                Redeem
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Security Tab                                           */
/* ─────────────────────────────────────────────────────── */
function SecurityTab() {
  const [user] = useAuthState(auth);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<SavedAccount[]>([]);

  const isEmailProvider = user?.providerData?.some((p) => p.providerId === "password");

  useEffect(() => {
    setSessions(getSavedAccounts());
  }, [user]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!user) return;
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }

    setSaving(true);
    try {
      if (currentPassword) {
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }
      await updatePassword(user, newPassword);
      toast.success("Password updated successfully.");
      sendNotification({ userId: user.uid, type: "password_changed", title: "Password changed", message: "Your password has been changed.", createdBy: "system" }).catch(() => {});
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Security</h1>
        <p className="text-white/40 text-sm mt-1">Keep your account safe.</p>
      </div>

      {/* Email verification status */}
      <div className="p-5 rounded-2xl bg-white/5 border border-border-base flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-white/40" />
          <span className="text-sm text-white/80">Email address</span>
          <span className="text-sm text-white/40 font-mono">{user?.email}</span>
        </div>
        {user?.emailVerified ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified
          </span>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-full">⚠ Not verified</span>
            <button
              onClick={() => user && sendVerificationEmail(user).then(() => toast.success("Verification email sent.")).catch((e: any) => toast.error(e?.message ?? "Failed to send email."))}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Resend verification email
            </button>
          </div>
        )}
      </div>

      {!isEmailProvider ? (
        <div className="p-5 rounded-2xl bg-white/5 border border-border-base">
          <p className="text-white/60 text-sm">
            You signed in with a social provider (Google / GitHub). Password management is handled by your provider.
          </p>
        </div>
      ) : (
        <form onSubmit={handleUpdatePassword} className="space-y-5 max-w-md">
          <PasswordField label="Current Password" value={currentPassword} onChange={setCurrentPassword} show={showCurrent} toggle={() => setShowCurrent((v) => !v)} />
          <PasswordField label="New Password" value={newPassword} onChange={setNewPassword} show={showNew} toggle={() => setShowNew((v) => !v)} />
          <Field label="Confirm New Password" icon={<Lock className="w-3.5 h-3.5" />}>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" className={inputCls} />
          </Field>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Updating…" : "Update Password"}
          </button>
        </form>
      )}

      {/* Two-Factor Authentication */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-white">Two-Factor Authentication</h2>
        <TwoFactorSetup />
      </div>

      {/* Passkey Authentication */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-white">Passkey Authentication</h2>
        <PasskeySetup />
      </div>

      {/* Active Sessions */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-white">Active Sessions</h2>
        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-border-base bg-white/5 p-4 text-sm text-white/40">
            No active sessions found.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => {
              const isCurrent = session.uid === user?.uid;
              return (
                <div key={session.uid} className="flex items-center justify-between gap-3 rounded-2xl border border-border-base bg-white/[0.03] px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white font-semibold truncate">
                      {session.displayName || session.username}
                      {isCurrent && (
                        <span className="ml-2 text-[10px] uppercase tracking-widest text-green-400">Current</span>
                      )}
                    </p>
                    <p className="text-[11px] text-white/40 font-mono truncate">{session.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await logoutAccount(session.uid);
                      setSessions(getSavedAccounts());
                    }}
                    className="px-3 py-1.5 rounded-xl border border-border-base text-xs text-white/60 hover:text-white hover:border-border-base transition-all"
                  >
                    {isCurrent ? "Sign out" : "Remove"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Preferences Tab                                        */
/* ─────────────────────────────────────────────────────── */
function PreferencesTab() {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingNav, setSavingNav] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [tabSize, setTabSize] = useState(2);
  const [navButtons, setNavButtons] = useState<NavOptionId[]>(["home", "projects", "explore", "profile"]);
  const [topNavButtons, setTopNavButtons] = useState<NavOptionId[]>(["feed", "explore", "templates", "communities", "projects", "bots", "events", "learn"]);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "user_settings", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const prefs = data.preferences || {};
        setFontSize(prefs.fontSize ?? 14);
        setTabSize(prefs.tabSize ?? 2);
        const saved: NavOptionId[] = data.bottomNavButtons ?? [];
        if (saved.length >= 1 && saved.length <= 4) setNavButtons(saved);
        const topSaved: NavOptionId[] = data.topNavButtons ?? [];
        if (topSaved.length > 0) setTopNavButtons(topSaved);
      }
      setLoading(false);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "user_settings", user.uid), { preferences: { fontSize, tabSize }, updatedAt: serverTimestamp() }, { merge: true });
      toast.success("Preferences saved.");
    } catch {
      toast.error("Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const toggleNavButton = (id: NavOptionId) => {
    setNavButtons((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // keep at least 1
        return prev.filter((b) => b !== id);
      }
      if (prev.length >= 4) {
        toast.error("Maximum 4 buttons allowed.");
        return prev;
      }
      return [...prev, id];
    });
  };

  const moveNavButton = (id: NavOptionId, dir: -1 | 1) => {
    setNavButtons((prev) => {
      const idx = prev.indexOf(id);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  const handleSaveNav = async () => {
    if (!user) return;
    setSavingNav(true);
    try {
      await setDoc(doc(db, "user_settings", user.uid), { bottomNavButtons: navButtons, topNavButtons, updatedAt: serverTimestamp() }, { merge: true });
      toast.success("Navigation preferences saved.");
    } catch {
      toast.error("Failed to save navigation.");
    } finally {
      setSavingNav(false);
    }
  };

  if (loading) return <LoadingPanel />;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Preferences</h1>
        <p className="text-white/40 text-sm mt-1">Customize your editor and visual experience.</p>
      </div>

      <div className="space-y-6 max-w-sm">
        <div>
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5" />Editor
          </p>
          <div className="space-y-4">
            <Field label="Font Size">
              <CustomSelect
                value={String(fontSize)}
                onChange={(v) => setFontSize(Number(v))}
                options={[12, 13, 14, 15, 16, 18, 20].map((s) => ({ value: String(s), label: `${s}px` }))}
              />
            </Field>
            <Field label="Tab Size">
              <CustomSelect
                value={String(tabSize)}
                onChange={(v) => setTabSize(Number(v))}
                options={[
                  { value: "2", label: "2 spaces" },
                  { value: "4", label: "4 spaces" },
                ]}
              />
            </Field>
          </div>
        </div>

        {/* UI Theme Switcher */}
        <UIThemeSwitcher />

        <SaveButton loading={saving} onClick={handleSave} />
      </div>

      {/* ── Top Navigation Customisation ───────────────────── */}
      <div className="border-t border-white/[0.06] pt-8 max-w-lg">
        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1 flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5" />Desktop Top Navigation
        </p>
        <p className="text-xs text-white/30 mb-5">Choose which shortcuts appear in the top navigation bar. Tap to toggle.</p>

        <div className="grid grid-cols-3 gap-2 mb-6">
          {ALL_NAV_OPTIONS.filter(o => o.id !== "profile" && o.id !== "settings" && o.id !== "home").map(({ id, label, icon: Icon }) => {
            const selected = topNavButtons.includes(id);
            return (
              <button
                key={`top-${id}`}
                type="button"
                onClick={() => {
                  setTopNavButtons((prev) => 
                    prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
                  );
                }}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-semibold transition-all",
                  selected
                    ? "bg-blue-600/15 border-blue-500/40 text-blue-300"
                    : "bg-white/3 border-white/8 text-white/40 hover:bg-white/8 hover:text-white/70"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bottom Navigation Customisation ───────────────────── */}
      <div className="border-t border-white/[0.06] pt-8 max-w-lg">
        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1 flex items-center gap-2">
          <Smartphone className="w-3.5 h-3.5" />Mobile Bottom Navigation
        </p>
        <p className="text-xs text-white/30 mb-5">Choose 1 – 4 shortcuts that appear in the bottom bar on mobile. Tap to toggle, use arrows to reorder.</p>

        {/* All available options */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {ALL_NAV_OPTIONS.map(({ id, label, icon: Icon }) => {
            const selected = navButtons.includes(id);
            const pos = navButtons.indexOf(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleNavButton(id)}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-semibold transition-all",
                  selected
                    ? "bg-blue-600/15 border-blue-500/40 text-blue-300"
                    : "bg-white/3 border-border-base text-white/40 hover:bg-white/8 hover:text-white/70"
                )}
              >
                {selected && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center">
                    {pos + 1}
                  </span>
                )}
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Selected order with reorder controls */}
        {navButtons.length > 0 && (
          <div className="space-y-2 mb-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2">Current order</p>
            {navButtons.map((id, idx) => {
              const opt = ALL_NAV_OPTIONS.find((o) => o.id === id)!;
              const Icon = opt.icon;
              return (
                <div key={id} className="flex items-center gap-3 bg-white/4 border border-border-base rounded-xl px-3 py-2.5">
                  <GripVertical className="w-4 h-4 text-white/20 shrink-0" />
                  <Icon className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="flex-1 text-sm text-white font-medium">{opt.label}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveNavButton(id, -1)}
                      disabled={idx === 0}
                      className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveNavButton(id, 1)}
                      disabled={idx === navButtons.length - 1}
                      className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleNavButton(id)}
                      disabled={navButtons.length === 1}
                      className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-20 transition-all"
                      aria-label="Remove"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={handleSaveNav}
          disabled={savingNav}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60"
        >
          {savingNav ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {savingNav ? "Saving…" : "Save Navigation"}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Notifications Tab                                      */
/* ─────────────────────────────────────────────────────── */
function NotificationsTab() {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deployments, setDeployments] = useState(true);
  const [adminAnnouncements, setAdminAnnouncements] = useState(true);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "user_settings", user.uid)).then((snap) => {
      if (snap.exists()) {
        const notifs = snap.data().notifications || {};
        setDeployments(notifs.deployments ?? true);
        setAdminAnnouncements(notifs.adminAnnouncements ?? true);
      }
      setLoading(false);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "user_settings", user.uid), { notifications: { deployments, adminAnnouncements }, updatedAt: serverTimestamp() }, { merge: true });
      toast.success("Notification preferences saved.");
    } catch {
      toast.error("Failed to save notifications.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingPanel />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <p className="text-white/40 text-sm mt-1">Choose what you want to be notified about.</p>
      </div>

      <div className="space-y-3 max-w-lg">
        <Toggle
          label="Deployment Notifications"
          description="Get notified when your projects deploy successfully or fail."
          checked={deployments}
          onChange={setDeployments}
        />
        <Toggle
          label="Admin Announcements"
          description="Receive platform updates and announcements from the DevOS team."
          checked={adminAnnouncements}
          onChange={setAdminAnnouncements}
        />
        <div className="pt-2">
          <SaveButton loading={saving} onClick={handleSave} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Danger Zone Tab                                        */
/* ─────────────────────────────────────────────────────── */
function DangerZoneTab() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();

  // Deactivate
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  // Request deletion
  const [showDeleteRequest, setShowDeleteRequest] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [requestingSent, setRequestingSent] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const handleDeactivate = async () => {
    if (!user) return;
    setDeactivating(true);
    try {
      await deactivateAccount(user.uid);
      await auth.signOut();
      toast.success("Your account has been deactivated.");
      navigate("/");
    } catch (err: any) {
      toast.error(getAuthErrorMessage(err));
    } finally {
      setDeactivating(false);
      setShowDeactivate(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!user) return;
    setRequesting(true);
    try {
      await requestAccountDeletion(user.uid, user.email ?? "", deleteReason);
      setRequestingSent(true);
      toast.success("Deletion request submitted. Our team will contact you via email.");
    } catch {
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-red-400">Danger Zone</h1>
        <p className="text-white/40 text-sm mt-1">Irreversible actions. Proceed with caution.</p>
      </div>

      {/* Deactivate account */}
      <div className="p-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <PowerOff className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <p className="text-white font-bold">Deactivate Account</p>
            <p className="text-white/50 text-sm mt-1">
              Temporarily disable your account. You will be signed out and won't be able to log in until reactivated by support.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowDeactivate(true)}
          className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-black rounded-xl font-bold text-sm transition-all"
        >
          Deactivate My Account
        </button>
      </div>

      {/* Request account deletion */}
      <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Mail className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-white font-bold">Request Account Deletion</p>
            <p className="text-white/50 text-sm mt-1">
              Account deletion is processed manually by our team. Submit a request and we'll contact you at <span className="text-white/70 font-mono">{user?.email}</span> to complete the process.
            </p>
          </div>
        </div>
        {requestingSent ? (
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
            <Check className="w-4 h-4" />
            Request submitted. Check your email for next steps.
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteRequest(true)}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all"
          >
            Request Account Deletion
          </button>
        )}
      </div>

      {/* Deactivate confirm modal */}
      <AnimatePresence>
        {showDeactivate && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !deactivating && setShowDeactivate(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative w-full max-w-md bg-card border border-border-base rounded-3xl p-8 shadow-2xl"
            >
              <button onClick={() => !deactivating && setShowDeactivate(false)} disabled={deactivating}
                className="absolute top-5 right-5 p-2 hover:bg-white/5 rounded-full transition-colors disabled:opacity-40">
                <X className="w-4 h-4 text-white/40" />
              </button>
              <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center mb-5">
                <PowerOff className="w-6 h-6 text-yellow-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Deactivate Account?</h2>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                You will be signed out immediately and your account will be disabled. Contact support to reactivate.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeactivate(false)} disabled={deactivating}
                  className="flex-1 py-3 rounded-xl border border-border-base text-white/60 font-medium text-sm hover:bg-white/5 transition-all disabled:opacity-40">
                  Cancel
                </button>
                <button onClick={handleDeactivate} disabled={deactivating}
                  className="flex-1 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-black font-bold text-sm flex items-center justify-center gap-2 transition-all">
                  {deactivating ? <><Loader2 className="w-4 h-4 animate-spin" />Deactivating…</> : "Deactivate"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Request deletion modal */}
      <AnimatePresence>
        {showDeleteRequest && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !requesting && setShowDeleteRequest(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative w-full max-w-md bg-card border border-border-base rounded-3xl p-8 shadow-2xl"
            >
              <button onClick={() => !requesting && setShowDeleteRequest(false)} disabled={requesting}
                className="absolute top-5 right-5 p-2 hover:bg-white/5 rounded-full transition-colors disabled:opacity-40">
                <X className="w-4 h-4 text-white/40" />
              </button>
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-5">
                <ShieldAlert className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Request Account Deletion</h2>
              <p className="text-white/50 text-sm leading-relaxed mb-5">
                Our team will process your request manually and email you at <span className="font-mono text-white/70">{user?.email}</span>.
              </p>
              <div className="mb-5 space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Reason (optional)</label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Tell us why you'd like to delete your account…"
                  className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteRequest(false)} disabled={requesting}
                  className="flex-1 py-3 rounded-xl border border-border-base text-white/60 font-medium text-sm hover:bg-white/5 transition-all disabled:opacity-40">
                  Cancel
                </button>
                <button onClick={handleRequestDeletion} disabled={requesting}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all">
                  {requesting ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : "Submit Request"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Shared helpers                                         */
/* ─────────────────────────────────────────────────────── */
const inputCls =
  "w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors";

const selectCls =
  "w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors";

function Field({ label, icon, hint, children }: { label: string; icon?: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
        {icon}
        {label}
        {hint && <span className="text-white/20 font-normal normal-case tracking-normal">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value, mono = false, copyValue }: { label: string; value: string; mono?: boolean; copyValue?: string }) {
  const handleCopy = async () => {
    if (!copyValue) return;
    try {
      await navigator.clipboard.writeText(copyValue);
      toast.success(`${label} copied to clipboard.`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}.`);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-border-base">
      <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5">{label}</p>
      {copyValue ? (
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "w-full flex items-center gap-2 text-left text-white text-sm hover:text-blue-300 transition-colors",
            mono && "font-mono"
          )}
          title={`Copy ${label}`}
        >
          <span className="truncate">{value}</span>
          <Copy className="w-3.5 h-3.5 text-white/40 shrink-0" />
        </button>
      ) : (
        <p className={`text-white text-sm ${mono ? "font-mono" : ""}`}>{value}</p>
      )}
    </div>
  );
}

function PasswordField({ label, value, onChange, show, toggle }: { label: string; value: string; onChange: (v: string) => void; show: boolean; toggle: () => void; }) {
  return (
    <Field label={label} icon={<Lock className="w-3.5 h-3.5" />}>
      <div className="relative">
        <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder="••••••••" className={`${inputCls} pr-12`} />
        <button type="button" onClick={toggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </Field>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void; }) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-border-base">
      <div>
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="text-white/40 text-xs mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-all ${checked ? "bg-blue-600" : "bg-white/10"}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

function SaveButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {loading ? "Saving…" : "Save Changes"}
    </button>
  );
}

function AccessibilityTab() {
  const SHORTCUT_SECTIONS = [
    {
      title: "IDE",
      shortcuts: [
        { mac: "⌘S", win: "Ctrl+S", desc: "Save current file" },
        { mac: "⌘⇧P", win: "Ctrl+Shift+P", desc: "Command palette" },
        { mac: "⌘`", win: "Ctrl+`", desc: "Toggle terminal" },
        { mac: "⌘B", win: "Ctrl+B", desc: "Toggle sidebar" },
        { mac: "⌘⇧E", win: "Ctrl+Shift+E", desc: "Open file explorer" },
        { mac: "⌘⇧G", win: "Ctrl+Shift+G", desc: "Open source control (Git)" },
        { mac: "F5", win: "F5", desc: "Run project" },
        { mac: "⌘⇧F", win: "Ctrl+Shift+F", desc: "Deploy project" },
        { mac: "Escape", win: "Escape", desc: "Exit focus mode / close modal" },
      ],
    },
    {
      title: "Editor",
      shortcuts: [
        { mac: "⌘Z", win: "Ctrl+Z", desc: "Undo" },
        { mac: "⌘⇧Z", win: "Ctrl+Shift+Z", desc: "Redo" },
        { mac: "⌘/", win: "Ctrl+/", desc: "Toggle line comment" },
        { mac: "⌘D", win: "Ctrl+D", desc: "Select next occurrence" },
        { mac: "⌘F", win: "Ctrl+F", desc: "Find in file" },
        { mac: "⌘H", win: "Ctrl+H", desc: "Find and replace" },
        { mac: "⌥↑/↓", win: "Alt+↑/↓", desc: "Move line up/down" },
        { mac: "Tab", win: "Tab", desc: "Indent" },
        { mac: "⇧Tab", win: "Shift+Tab", desc: "Dedent" },
        { mac: "⌘A", win: "Ctrl+A", desc: "Select all" },
        { mac: "⌘C / X / V", win: "Ctrl+C / X / V", desc: "Copy / Cut / Paste" },
      ],
    },
    {
      title: "Navigation",
      shortcuts: [
        { mac: "⌘P", win: "Ctrl+P", desc: "Quick open file" },
        { mac: "⌘W", win: "Ctrl+W", desc: "Close current tab" },
        { mac: "⌘Tab", win: "Ctrl+Tab", desc: "Switch between open tabs" },
        { mac: "⌘1–9", win: "Ctrl+1–9", desc: "Jump to tab N" },
        { mac: "⌥←/→", win: "Alt+←/→", desc: "Navigate back/forward in history" },
      ],
    },
    {
      title: "Git",
      shortcuts: [
        { mac: "⌘↵", win: "Ctrl+Enter", desc: "Commit (in commit message box)" },
      ],
    },
    {
      title: "General",
      shortcuts: [
        { mac: "⌘K", win: "Ctrl+K", desc: "Open search" },
        { mac: "?", win: "?", desc: "Show keyboard shortcuts (this page)" },
        { mac: "⌘,", win: "Ctrl+,", desc: "Open settings" },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Keyboard Shortcuts</h2>
        <p className="text-white/40 text-sm">
          Reference for all keyboard shortcuts. Customisation is not yet available — that feature is coming soon.
        </p>
      </div>

      {SHORTCUT_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-2">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">{section.title}</h3>
          <div className="rounded-2xl border border-border-base overflow-hidden">
            {section.shortcuts.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 px-5 py-3 ${i !== 0 ? "border-t border-border-base" : ""} bg-base hover:bg-white/[0.02] transition-colors`}
              >
                <div className="flex items-center gap-1.5 min-w-[160px]">
                  <kbd className="px-2 py-0.5 rounded-md bg-white/10 border border-border-base text-white/80 text-xs font-mono">
                    {s.mac}
                  </kbd>
                  {s.mac !== s.win && (
                    <>
                      <span className="text-white/20 text-xs">/</span>
                      <kbd className="px-2 py-0.5 rounded-md bg-white/10 border border-border-base text-white/60 text-xs font-mono">
                        {s.win}
                      </kbd>
                    </>
                  )}
                </div>
                <span className="text-white/60 text-sm">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex gap-3 px-5 py-4 bg-white/[0.03] border border-border-base rounded-2xl">
        <Keyboard className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5" />
        <p className="text-white/40 text-sm leading-relaxed">
          Keyboard shortcut customisation is not yet available. It's on the roadmap and will be added in a future update.
        </p>
      </div>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );
}
