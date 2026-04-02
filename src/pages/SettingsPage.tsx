import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, storage } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  updatePassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
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
  Loader2,
  Save,
  Upload,
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { resolveAvatar } from "../lib/avatars";
import { getAuthErrorMessage } from "../lib/errorMessages";
import ConfirmModal from "../components/ConfirmModal";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useSEO } from "../hooks/useSEO";
import { getReferralStats, REFERRER_BONUS, REFERRED_BONUS } from "../lib/referralService";
import { ReferralStats } from "../types";

type Tab = "profile" | "account" | "security" | "preferences" | "notifications" | "referrals" | "danger";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
  { id: "account", label: "Account", icon: <Zap className="w-4 h-4" /> },
  { id: "security", label: "Security", icon: <Lock className="w-4 h-4" /> },
  { id: "preferences", label: "Preferences", icon: <Settings className="w-4 h-4" /> },
  { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
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
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white/60 truncate">
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

      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/40 leading-relaxed">
        <strong className="text-white/60">Rules:</strong> No self-referrals. Each new user can only use one referral code.
        Credits are awarded once per unique sign-up.
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [user, authLoading] = useAuthState(auth);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  useSEO({ title: "Account Settings — DevOS" });

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 flex gap-8">
        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4 px-3">Settings</p>
          <nav className="flex flex-col gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
              {activeTab === "referrals" && user && <ReferralsTab uid={user.uid} />}
              {activeTab === "danger" && <DangerZoneTab />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <Footer />
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Profile Tab                                            */
/* ─────────────────────────────────────────────────────── */
function ProfileTab() {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [github, setGithub] = useState("");
  const [twitter, setTwitter] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setFullName(d.fullName || d.displayName || "");
        setUsername(d.username || "");
        setBio(d.bio || "");
        setAvatarUrl(d.avatarUrl || user.photoURL || "");
        const links = d.links || {};
        setGithub(links.github || "");
        setTwitter(links.twitter || "");
        setWebsite(links.website || "");
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const links = {
        ...(github ? { github } : {}),
        ...(twitter ? { twitter } : {}),
        ...(website ? { website } : {}),
      };
      const publicData = {
        uid: user.uid,
        email: user.email || "",
        username,
        displayName: fullName || username,
        fullName,
        bio,
        avatarUrl,
        avatar: avatarUrl,
        updatedAt: serverTimestamp(),
        ...(Object.keys(links).length ? { links } : {}),
      };
      const privateData = {
        username,
        displayName: fullName || username,
        fullName,
        bio,
        avatarUrl,
        avatar: avatarUrl,
        updatedAt: serverTimestamp(),
        ...(Object.keys(links).length ? { links } : {}),
      };
      await Promise.all([
        setDoc(doc(db, "users", user.uid), publicData, { merge: true }),
        setDoc(doc(db, "user_settings", user.uid), privateData, { merge: true }),
      ]);
      toast.success("Profile updated successfully");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB."); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file."); return; }

    setUploading(true);
    setUploadProgress(0);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const storageRef = ref(storage, `avatars/${user.uid}/${fileName}`);
      const task = uploadBytesResumable(storageRef, file);
      task.on(
        "state_changed",
        (snap) => setUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100),
        (err) => { toast.error("Upload failed: " + err.message); setUploading(false); },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          setAvatarUrl(url);
          await Promise.all([
            setDoc(doc(db, "users", user.uid), { uid: user.uid, email: user.email || "", avatarUrl: url, avatar: url, updatedAt: serverTimestamp() }, { merge: true }),
            setDoc(doc(db, "user_settings", user.uid), { avatarUrl: url, avatar: url, updatedAt: serverTimestamp() }, { merge: true }),
          ]);
          toast.success("Avatar updated!");
          setUploading(false);
        }
      );
    } catch (err: any) {
      toast.error("Failed to start upload.");
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
      <div className="flex items-center gap-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative">
            <img src={avatarSrc} alt={fullName || "Avatar"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            {uploading && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 p-3">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
          </div>
          <label className="absolute -bottom-2 -right-2 p-2 bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer transition-all shadow-lg">
            <Upload className="w-3.5 h-3.5 text-white" />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} onClick={(e) => { (e.target as HTMLInputElement).value = ""; }} />
          </label>
        </div>
        <div>
          <p className="text-sm font-bold text-white">{fullName || username || "Your Name"}</p>
          <p className="text-white/40 text-sm font-mono">@{username || "username"}</p>
          <p className="text-white/30 text-xs mt-1">JPG, PNG or GIF — max 5 MB</p>
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Full Name" icon={<User className="w-3.5 h-3.5" />}>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className={inputCls} />
        </Field>
        <Field label="Username" icon={<AtSign className="w-3.5 h-3.5" />} hint="Cannot be changed">
          <div className="relative">
            <input type="text" value={username} readOnly className={`${inputCls} cursor-not-allowed opacity-50`} />
            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
          </div>
        </Field>
      </div>

      <Field label="Bio" icon={<FileText className="w-3.5 h-3.5" />}>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell the world about yourself…" rows={3} maxLength={500} className={`${inputCls} resize-none`} />
        <p className="text-[11px] text-white/25 mt-1 text-right">{bio.length}/500</p>
      </Field>

      <div>
        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Social Links</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="GitHub" icon={<Github className="w-3.5 h-3.5" />}>
            <input type="url" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/…" className={inputCls} />
          </Field>
          <Field label="Twitter / X" icon={<Twitter className="w-3.5 h-3.5" />}>
            <input type="url" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://twitter.com/…" className={inputCls} />
          </Field>
          <Field label="Website" icon={<Globe className="w-3.5 h-3.5" />}>
            <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yoursite.com" className={inputCls} />
          </Field>
        </div>
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Account</h1>
        <p className="text-white/40 text-sm mt-1">Your account details and subscription plan.</p>
      </div>

      <div className="space-y-4">
        <ReadOnlyField label="Email Address" value={user?.email || "—"} />
        <ReadOnlyField label="Account ID" value={user?.uid || "—"} mono />
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
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

  const isEmailProvider = user?.providerData?.some((p) => p.providerId === "password");

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

      {!isEmailProvider ? (
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
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
  const [fontSize, setFontSize] = useState(14);
  const [tabSize, setTabSize] = useState(2);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "user_settings", user.uid)).then((snap) => {
      if (snap.exists()) {
        const prefs = snap.data().preferences || {};
        setFontSize(prefs.fontSize ?? 14);
        setTabSize(prefs.tabSize ?? 2);
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

  if (loading) return <LoadingPanel />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Preferences</h1>
        <p className="text-white/40 text-sm mt-1">Customize your editor experience.</p>
      </div>

      <div className="space-y-6 max-w-sm">
        <div>
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5" />Editor
          </p>
          <div className="space-y-4">
            <Field label="Font Size">
              <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className={selectCls}>
                {[12, 13, 14, 15, 16, 18, 20].map((s) => <option key={s} value={s}>{s}px</option>)}
              </select>
            </Field>
            <Field label="Tab Size">
              <select value={tabSize} onChange={(e) => setTabSize(Number(e.target.value))} className={selectCls}>
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
              </select>
            </Field>
          </div>
        </div>
        <SaveButton loading={saving} onClick={handleSave} />
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
  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText === "DELETE";

  const handleDelete = async () => {
    if (!user || !canDelete) return;
    setDeleting(true);
    try {
      // Delete Firestore documents
      await Promise.allSettled([
        deleteDoc(doc(db, "users", user.uid)),
        deleteDoc(doc(db, "user_settings", user.uid)),
      ]);
      // Delete Firebase Auth account
      await deleteUser(user);
      toast.success("Account deleted. Goodbye.");
      navigate("/");
    } catch (err: any) {
      toast.error(getAuthErrorMessage(err));
    } finally {
      setDeleting(false);
      setShowModal(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-red-400">Danger Zone</h1>
        <p className="text-white/40 text-sm mt-1">Irreversible actions. Proceed with caution.</p>
      </div>

      <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-4">
        <div>
          <p className="text-white font-bold">Delete Account</p>
          <p className="text-white/50 text-sm mt-1">
            Permanently delete your DevOS account and all associated data. This cannot be undone.
          </p>
        </div>
        <button
          onClick={() => { setConfirmText(""); setShowModal(true); }}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all"
        >
          Delete My Account
        </button>
      </div>

      {/* Custom delete modal with typed confirmation */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleting && setShowModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <button onClick={() => !deleting && setShowModal(false)} disabled={deleting} className="absolute top-5 right-5 p-2 hover:bg-white/5 rounded-full transition-colors disabled:opacity-40">
                <X className="w-4 h-4 text-white/40" />
              </button>

              <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-5">
                <ShieldAlert className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Delete Account</h2>
              <p className="text-white/50 text-sm leading-relaxed mb-5">
                This will permanently delete your account, profile, and all data. This action <span className="text-red-400 font-semibold">cannot be undone</span>.
              </p>

              <div className="mb-6 space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Type <span className="text-red-400 font-mono">DELETE</span> to confirm</label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-red-500 transition-colors"
                  autoComplete="off"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} disabled={deleting} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 font-medium text-sm hover:bg-white/5 transition-all disabled:opacity-40">
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!canDelete || deleting}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
                >
                  {deleting ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting…</> : "Delete Account"}
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
  "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors";

const selectCls =
  "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors";

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

function ReadOnlyField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
      <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5">{label}</p>
      <p className={`text-white text-sm ${mono ? "font-mono" : ""}`}>{value}</p>
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
    <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
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

function LoadingPanel() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );
}
