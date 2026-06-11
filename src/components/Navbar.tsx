import { useState, useEffect, useRef } from "react";
import { auth, logout, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { LogIn, LogOut, Code2, User as UserIcon, Settings, Zap, Layout, ShieldCheck, ChevronDown, Gift, Compass, Search, Menu, X, Home, FolderCode, TrendingUp, Users, MessageSquarePlus, UserPlus, RefreshCw, Building2, Plus, Bot, Calendar, Check, BookOpen, Sun, Moon, History, Accessibility } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { cn } from "../lib/utils";
import NotificationBell from "./NotificationBell";
import RedeemCodeModal from "./RedeemCodeModal";
import FeedbackModal from "./FeedbackModal";
import CreateOrgModal from "./CreateOrgModal";
import { UserSettings, Credits, Organization } from "../types";
import { getCredits, DAILY_CREDITS_AMOUNT, MONTHLY_CREDITS_AMOUNT } from "../lib/creditsService";
import { resolveAvatar } from "../lib/avatars";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { subscribeUserOrgs } from "../lib/orgService";
import {
  registerUser,
  upsertSavedAccount,
  getSavedAccounts,
  switchToAccount,
  logoutAccount,
  type SavedAccount,
} from "../lib/sessionManager";
import { useActiveContext } from "../hooks/useActiveContext";
import UIThemeSwitcher from "./UIThemeSwitcher";
import { PRODUCT_NAV_LABEL, buildPortfolioUrl } from "../lib/brand";
import DevosLogo from "./DevosLogo";

interface NavbarProps {
  onSignIn?: () => void;
}

export default function Navbar({ onSignIn }: NavbarProps) {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCreditsPanelOpen, setIsCreditsPanelOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [isSwitchAccountOpen, setIsSwitchAccountOpen] = useState(false);
  const [switchingUid, setSwitchingUid] = useState<string | null>(null);
  const [userOrgs, setUserOrgs] = useState<Organization[]>([]);
  const [isOrgsOpen, setIsOrgsOpen] = useState(false);
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const creditsPanelRef = useRef<HTMLDivElement>(null);
  const orgsDropdownRef = useRef<HTMLDivElement>(null);

  // Active org/user context
  const { context, setUserContext, setOrgContext } = useActiveContext();

  useEffect(() => {
    if (!user) {
      setSettings(null);
      setCredits(null);
      setIsAdmin(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "user_settings", user.uid), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as UserSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `user_settings/${user.uid}`);
    });

    const unsubscribeUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setIsAdmin(snap.data().role === "admin");
      }
    });

    getCredits(user.uid).then(setCredits).catch((err) => console.error("Failed to load credits:", err));

    return () => {
      unsubscribe();
      unsubscribeUser();
    };
  }, [user]);

  // Register the User object in the in-memory cache whenever auth changes
  useEffect(() => {
    if (user) registerUser(user);
  }, [user]);

  // Load saved accounts from localStorage via sessionManager
  useEffect(() => {
    setSavedAccounts(getSavedAccounts());
  }, [user]);

  // Persist current user to saved accounts list whenever settings are loaded
  useEffect(() => {
    if (!user || !settings?.username) return;
    const account: SavedAccount = {
      uid: user.uid,
      username: settings.username,
      displayName: settings.displayName || user.displayName || settings.username,
      avatarUrl: resolveAvatar(settings.avatarUrl || user.photoURL),
      email: user.email || "",
    };
    upsertSavedAccount(account);
    setSavedAccounts(getSavedAccounts());
  }, [user, settings]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (creditsPanelRef.current && !creditsPanelRef.current.contains(e.target as Node)) {
        setIsCreditsPanelOpen(false);
      }
      if (orgsDropdownRef.current && !orgsDropdownRef.current.contains(e.target as Node)) {
        setIsOrgsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Subscribe to user's organizations for the nav dropdown
  useEffect(() => {
    if (!user) { setUserOrgs([]); return; }
    return subscribeUserOrgs(user.uid, setUserOrgs);
  }, [user]);

  const displayName = settings?.displayName || user?.displayName || "User";
  const avatarUrl = resolveAvatar(settings?.avatarUrl || user?.photoURL);
  const username = settings?.username;
  const dailyRemaining = credits?.daily ?? null;
  const monthlyRemaining = credits?.monthly ?? null;
  const totalRemaining = (credits?.daily ?? 0) + (credits?.monthly ?? 0);
  const dailyPct = credits ? Math.round((credits.daily / DAILY_CREDITS_AMOUNT) * 100) : 0;
  const monthlyPct = credits ? Math.round((credits.monthly / MONTHLY_CREDITS_AMOUNT) * 100) : 0;

  return (
    <nav className="h-14 border-b border-border-base bg-base/70 supports-[backdrop-filter]:bg-base/55 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.35)] flex items-center justify-between px-4 md:px-6 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/25 transition-transform group-hover:scale-105">
            <DevosLogo className="w-5 h-5 text-white" interactive={true} />
          </div>
          <span className="font-black text-lg tracking-tight text-white">{PRODUCT_NAV_LABEL}</span>
        </Link>
        {user && (
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors text-sm font-medium"
            >
              <Home className="w-4 h-4" />
              Feed
            </Link>
            <Link
              to="/explore"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors text-sm font-medium"
            >
              <Compass className="w-4 h-4" />
              Explore
            </Link>
            <Link
              to="/marketplace"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors text-sm font-medium"
            >
              <Layout className="w-4 h-4" />
              Templates
            </Link>
            <Link
              to="/communities"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors text-sm font-medium"
            >
              <Users className="w-4 h-4" />
              Dev Teams
            </Link>

            <Link
              to="/projects"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors text-sm font-medium"
            >
              <FolderCode className="w-4 h-4" />
              My Projects
            </Link>
            <Link
              to="/bots"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors text-sm font-medium"
            >
              <Bot className="w-4 h-4" />
              Bots
            </Link>
            <Link
              to="/events"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors text-sm font-medium"
            >
              <Calendar className="w-4 h-4" />
              Events
            </Link>
            <Link
              to="/learn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors text-sm font-medium"
            >
              <BookOpen className="w-4 h-4" />
              Learn
            </Link>
            {/* Organisations dropdown */}
            <div className="relative" ref={orgsDropdownRef}>
              <button
                onClick={() => setIsOrgsOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors text-sm font-medium"
              >
                <Building2 className="w-4 h-4" />
                Organisations
                <ChevronDown className={cn("w-3 h-3 transition-transform", isOrgsOpen && "rotate-180")} />
              </button>
              <AnimatePresence>
                {isOrgsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.13 }}
                    className="absolute left-0 top-full mt-2 w-52 bg-card border border-border-base rounded-xl shadow-xl overflow-hidden z-50"
                  >
                    {userOrgs.length > 0 ? (
                      <>
                        {userOrgs.map((org) => (
                          <Link
                            key={org.id}
                            to={`/org/${org.slug}`}
                            onClick={() => setIsOrgsOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <Building2 className="w-4 h-4 text-blue-400/70" />
                            <span className="truncate">{org.name}</span>
                          </Link>
                        ))}
                        <div className="border-t border-border-base" />
                      </>
                    ) : (
                      <div className="px-4 py-3">
                        <p className="text-xs text-white/30">No organisations yet</p>
                      </div>
                    )}
                    <button
                      onClick={() => { setIsOrgsOpen(false); setIsCreateOrgOpen(true); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/5 transition-colors text-left"
                    >
                      <Plus className="w-4 h-4" />
                      Create Organisation
                    </button>
                    <div className="border-t border-border-base" />
                    <Link
                      to="/orgs"
                      onClick={() => setIsOrgsOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Users className="w-4 h-4" />
                      Browse all organizations
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-500/10 text-red-400/70 hover:text-red-400 transition-colors text-sm font-medium"
              >
                <ShieldCheck className="w-4 h-4" />
                Admin
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {user ? (
          <>
            {/* Credits display — clickable pill that opens a panel */}
            {(isAdmin || dailyRemaining !== null) && (
              <div className="relative hidden sm:block" ref={creditsPanelRef}>
                <button
                  onClick={() => { setIsCreditsPanelOpen((v) => !v); setIsProfileOpen(false); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all",
                    isAdmin
                      ? "bg-red-500/10 border-red-500/20 hover:bg-red-500/20"
                      : "bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20"
                  )}
                >
                  <Zap className={cn("w-3.5 h-3.5", isAdmin ? "text-red-400" : "text-yellow-400")} />
                  <span className={cn("font-bold text-sm", isAdmin ? "text-red-300" : "text-yellow-300")}>
                    {isAdmin ? "∞ Unlimited" : `${dailyRemaining} credits`}
                  </span>
                  {!isAdmin && <TrendingUp className="w-3 h-3 text-yellow-400/60" />}
                </button>

                <AnimatePresence>
                  {isCreditsPanelOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.13 }}
                      className="absolute right-0 top-full mt-2 w-64 bg-card border border-border-base rounded-xl shadow-xl overflow-hidden z-50 p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", isAdmin ? "bg-red-500/15" : "bg-yellow-500/15")}>
                          <Zap className={cn("w-4 h-4", isAdmin ? "text-red-400" : "text-yellow-400")} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">DevOS Credits</p>
                          <p className="text-[11px] text-white/40">{isAdmin ? "Admin • All limits bypassed" : "Used for projects & deployments"}</p>
                        </div>
                      </div>

                      {isAdmin ? (
                        <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-white/50 font-semibold">Admin Unlimited Pass</span>
                            <span className="text-lg font-black text-red-300">∞</span>
                          </div>
                          <p className="text-[11px] text-white/30 leading-relaxed">
                            As an admin, all credit costs are bypassed automatically.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Total */}
                          <div className="mb-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-white/50 font-semibold">Total Available</span>
                              <span className="text-lg font-black text-yellow-300">{totalRemaining}</span>
                            </div>
                          </div>

                          {/* Daily */}
                          <div className="space-y-2">
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-white/50">Daily</span>
                                <span className="font-bold text-white">{dailyRemaining} / {DAILY_CREDITS_AMOUNT}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className="h-full bg-yellow-400 rounded-full transition-all"
                                  style={{ width: `${Math.max(0, dailyPct)}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-white/50">Monthly</span>
                                <span className="font-bold text-white">{monthlyRemaining ?? 0} / {MONTHLY_CREDITS_AMOUNT}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className="h-full bg-blue-400 rounded-full transition-all"
                                  style={{ width: `${Math.max(0, monthlyPct)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      <div className="border-t border-border-base mt-4 pt-3">
                        <button
                          onClick={() => { setIsCreditsPanelOpen(false); setIsRedeemOpen(true); }}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-border-base text-sm text-white/70 hover:text-white transition-all font-semibold"
                        >
                          <Gift className="w-4 h-4" />
                          Redeem Code
                        </button>
                        <Link
                          to="/settings?tab=account"
                          onClick={() => setIsCreditsPanelOpen(false)}
                          className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-white/40 hover:text-white/70 transition-colors font-medium"
                        >
                          <History className="w-3.5 h-3.5" />
                          View transaction history
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Search */}
            <Link
              to="/search"
              className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
              title="Search developers"
            >
              <Search className="w-5 h-5" />
            </Link>
            <Link
              to="/settings?tab=accessibility"
              className="hidden md:flex p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
              title="Accessibility & shortcuts"
            >
              <Accessibility className="w-5 h-5" />
            </Link>
            <UIThemeSwitcher compact className="hidden sm:block" />
            <NotificationBell />

            {/* Feedback button — desktop only */}
            {user && (
              <button
                onClick={() => setIsFeedbackOpen(true)}
                title="Send Feedback"
                className="hidden md:flex p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
              >
                <MessageSquarePlus className="w-5 h-5" />
              </button>
            )}

            {/* Profile dropdown — hidden on mobile, shown via hamburger */}
            <div className="hidden md:block relative" ref={profileDropdownRef}>
              <button
                onClick={() => setIsProfileOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-border-base hover:border-border-base transition-all"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="w-4 h-4 text-white/60" />
                )}
                <div className="flex flex-col leading-none text-left">
                  {context?.type === "org" ? (
                    <>
                      <span className="text-sm font-medium text-blue-300">{context.name}</span>
                      <span className="text-[10px] text-blue-400/50">org context</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-white/80">{displayName}</span>
                      {username && <span className="text-[10px] text-white/40">@{username}</span>}
                    </>
                  )}
                </div>
                <ChevronDown className={cn("w-3.5 h-3.5 text-white/30 transition-transform", isProfileOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.13 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-card border border-border-base rounded-xl shadow-xl overflow-hidden z-50"
                  >
                    {/* ── Workspaces Section ── */}
                    <div className="px-4 pt-3 pb-1.5">
                      <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Workspace</p>
                    </div>
                    {/* Personal workspace */}
                    <button
                      onClick={() => { setUserContext(user!.uid); setIsProfileOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors text-left",
                        context?.type === "user" || !context
                          ? "text-white bg-white/5 font-semibold"
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <UserIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Personal</span>
                      {(context?.type === "user" || !context) && (
                        <Check className="w-3.5 h-3.5 ml-auto text-blue-400 flex-shrink-0" />
                      )}
                    </button>
                    {/* Org workspaces */}
                    {userOrgs.map((org) => {
                      const isActive = context?.type === "org" && context.id === org.id;
                      return (
                        <button
                          key={org.id}
                          onClick={() => { isActive ? setUserContext(user!.uid) : setOrgContext(org.id, org.slug, org.name); setIsProfileOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors text-left",
                            isActive
                              ? "text-blue-300 bg-blue-500/10 font-semibold"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          )}
                        >
                          <Building2 className="w-4 h-4 text-blue-400/70 flex-shrink-0" />
                          <span className="truncate">{org.name}</span>
                          {isActive && (
                            <Check className="w-3.5 h-3.5 ml-auto text-blue-400 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                    <div className="border-t border-border-base my-1" />
                    {username && (
                      <a
                        href={buildPortfolioUrl(username)}
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <UserIcon className="w-4 h-4" />
                        View Profile
                      </a>
                    )}
                    <Link
                      to="/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                    >
                      <Settings className="w-4 h-4" />
                      Account Settings
                    </Link>
                    <button
                      onClick={() => { setIsProfileOpen(false); setIsRedeemOpen(true); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                    >
                      <Gift className="w-4 h-4" />
                      Redeem Code
                    </button>
                    {/* Switch Account */}
                    {savedAccounts.filter((a) => a.uid !== user?.uid).length > 0 && (
                      <>
                        <div className="border-t border-border-base my-1" />
                        <button
                          onClick={() => setIsSwitchAccountOpen((v) => !v)}
                          className="w-full flex items-center justify-between gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                        >
                          <span className="flex items-center gap-2.5">
                            <RefreshCw className="w-4 h-4" />
                            Switch Account
                          </span>
                          <ChevronDown className={cn("w-3.5 h-3.5 text-white/30 transition-transform", isSwitchAccountOpen && "rotate-180")} />
                        </button>
                        {isSwitchAccountOpen && (
                          <div className="pb-1">
                            {savedAccounts.filter((a) => a.uid !== user?.uid).map((acc) => (
                              <button
                                key={acc.uid}
                                disabled={switchingUid === acc.uid}
                                onClick={async () => {
                                  setSwitchingUid(acc.uid);
                                  const result = await switchToAccount(acc.uid);
                                  setSwitchingUid(null);
                                  if (result.success) {
                                    setIsProfileOpen(false);
                                    navigate("/");
                                    return;
                                  }
                                  // result.success === false here
                                  const fail = result as { success: false; reason: string };
                                  if (fail.reason === "not_in_cache") {
                                    setIsProfileOpen(false);
                                    onSignIn?.();
                                  }
                                }}
                                title={`Switch to ${acc.displayName}`}
                                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors text-left disabled:opacity-50"
                              >
                                <img
                                  src={acc.avatarUrl}
                                  alt={acc.displayName}
                                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-white/80 truncate">{acc.displayName}</p>
                                  <p className="text-[10px] text-white/40 truncate">@{acc.username}</p>
                                </div>
                                {switchingUid === acc.uid
                                  ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400 flex-shrink-0" />
                                  : <RefreshCw className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />}
                              </button>
                            ))}
                            <button
                              onClick={() => { setIsProfileOpen(false); onSignIn?.(); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/5 transition-colors text-left"
                            >
                              <UserPlus className="w-4 h-4" />
                              Add account
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    <div className="border-t border-border-base my-1" />
                    {/* My Organizations — quick navigation links */}
                    {userOrgs.length > 0 && (
                      <>
                        <div className="px-4 py-1.5">
                          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Organizations</p>
                        </div>
                        {userOrgs.slice(0, 4).map((org) => (
                          <Link
                            key={org.id}
                            to={`/org/${org.slug}`}
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <Building2 className="w-4 h-4 text-blue-400/70 flex-shrink-0" />
                            <span className="truncate">{org.name}</span>
                          </Link>
                        ))}
                        <div className="border-t border-border-base my-1" />
                      </>
                    )}
                    <button
                      onClick={() => { setIsProfileOpen(false); if (user) logoutAccount(user.uid); else logout(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </>
        ) : (
          <button
            onClick={onSignIn}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
        )}
      </div>

      {/* Mobile slide-in drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-72 bg-surface border-l border-border-base z-50 flex flex-col md:hidden shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border-base">
                <div className="flex items-center gap-2">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-white/60" />
                    </div>
                  )}
                  <div className="flex flex-col leading-none">
                    <span className="text-sm font-semibold text-white">{displayName}</span>
                    {username && <span className="text-[11px] text-white/40">@{username}</span>}
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Credits on mobile — detailed breakdown */}
              {(isAdmin || dailyRemaining !== null) && (
                <div className={cn(
                  "mx-4 mt-4 rounded-xl border p-3",
                  isAdmin ? "bg-red-500/10 border-red-500/20" : "bg-yellow-500/10 border-yellow-500/20"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Zap className={cn("w-3.5 h-3.5", isAdmin ? "text-red-400" : "text-yellow-400")} />
                      <span className={cn("text-xs font-bold uppercase tracking-widest", isAdmin ? "text-red-300" : "text-yellow-300")}>Credits</span>
                    </div>
                    <span className={cn("text-lg font-black", isAdmin ? "text-red-300" : "text-yellow-300")}>
                      {isAdmin ? "∞" : totalRemaining}
                    </span>
                  </div>
                  {isAdmin ? (
                    <p className="text-[11px] text-white/30">Admin • All credit limits bypassed</p>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-white/50">Daily</span>
                        <span className="text-white font-semibold">{dailyRemaining} / {DAILY_CREDITS_AMOUNT}</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${Math.max(0, dailyPct)}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-white/50">Monthly</span>
                        <span className="text-white font-semibold">{monthlyRemaining ?? 0} / {MONTHLY_CREDITS_AMOUNT}</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.max(0, monthlyPct)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <nav className="flex-1 px-4 py-4 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-3 mb-2">Navigate</p>
                <Link
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-colors text-sm font-medium"
                >
                  <Home className="w-4 h-4" />
                  Feed
                </Link>
                <Link
                  to="/explore"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-colors text-sm font-medium"
                >
                  <Compass className="w-4 h-4" />
                  Explore
                </Link>
                <Link
                  to="/orgs"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-colors text-sm font-medium"
                >
                  <Building2 className="w-4 h-4" />
                  Organizations
                </Link>
                <Link
                  to="/marketplace"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-colors text-sm font-medium"
                >
                  <Layout className="w-4 h-4" />
                  Templates
                </Link>
                <Link
                  to="/communities"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-colors text-sm font-medium"
                >
                  <Users className="w-4 h-4" />
                  Dev Teams
                </Link>

                <Link
                  to="/projects"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-colors text-sm font-medium"
                >
                  <FolderCode className="w-4 h-4" />
                  My Projects
                </Link>
                <Link
                  to="/bots"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-colors text-sm font-medium"
                >
                  <Bot className="w-4 h-4" />
                  Bots
                </Link>
                <Link
                  to="/events"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-colors text-sm font-medium"
                >
                  <Calendar className="w-4 h-4" />
                  Events
                </Link>
                <Link
                  to="/learn"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-colors text-sm font-medium"
                >
                  <BookOpen className="w-4 h-4" />
                  Learn
                </Link>
                <Link
                  to="/settings?tab=accessibility"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-colors text-sm font-medium"
                >
                  <Accessibility className="w-4 h-4" />
                  Accessibility
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-500/10 text-red-400/70 hover:text-red-400 transition-colors text-sm font-medium"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Admin
                  </Link>
                )}

                {/* Workspaces (mobile) */}
                {(userOrgs.length > 0 || true) && (
                  <>
                    <div className="border-t border-border-base my-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-3 mb-2">Workspace</p>
                    {/* Personal */}
                    <button
                      onClick={() => { setUserContext(user!.uid); setIsMobileMenuOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-sm text-left",
                        context?.type === "user" || !context
                          ? "text-white bg-white/5 font-semibold"
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <UserIcon className="w-4 h-4" />
                      Personal
                      {(context?.type === "user" || !context) && <Check className="w-4 h-4 ml-auto text-blue-400" />}
                    </button>
                    {userOrgs.slice(0, 4).map((org) => {
                      const isActive = context?.type === "org" && context.id === org.id;
                      return (
                        <button
                          key={org.id}
                          onClick={() => { isActive ? setUserContext(user!.uid) : setOrgContext(org.id, org.slug, org.name); setIsMobileMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-sm text-left",
                            isActive
                              ? "text-blue-300 bg-blue-500/10 font-semibold"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          )}
                        >
                          <Building2 className="w-4 h-4 text-blue-400/70" />
                          <span className="truncate">{org.name}</span>
                          {isActive && <Check className="w-4 h-4 ml-auto text-blue-400" />}
                        </button>
                      );
                    })}
                  </>
                )}

                <div className="border-t border-border-base my-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-3 mb-2">Account</p>
                {username && (
                  <a
                    href={buildPortfolioUrl(username)}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-colors text-sm"
                  >
                    <UserIcon className="w-4 h-4" />
                    View Profile
                  </a>
                )}
                <Link
                  to="/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-colors text-sm"
                >
                  <Settings className="w-4 h-4" />
                  Account Settings
                </Link>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); setIsRedeemOpen(true); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-colors text-sm text-left"
                >
                  <Gift className="w-4 h-4" />
                  Redeem Code
                </button>
                {/* Switch Account (mobile) */}
                {savedAccounts.filter((a) => a.uid !== user?.uid).length > 0 && (
                  <>
                    {savedAccounts.filter((a) => a.uid !== user?.uid).map((acc) => (
                      <button
                        key={acc.uid}
                        disabled={switchingUid === acc.uid}
                        onClick={async () => {
                          setSwitchingUid(acc.uid);
                          const result = await switchToAccount(acc.uid);
                          setSwitchingUid(null);
                          setIsMobileMenuOpen(false);
                          if (result.success) { navigate("/"); return; }
                          const fail = result as { success: false; reason: string };
                          if (fail.reason === "not_in_cache") { onSignIn?.(); }
                        }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-colors text-sm text-left disabled:opacity-50"
                      >
                        <img src={acc.avatarUrl} alt={acc.displayName} className="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer" />
                        <span className="flex-1">Switch to @{acc.username}</span>
                        {switchingUid === acc.uid && <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />}
                      </button>
                    ))}
                  </>
                )}
                <div className="px-3">
                  <UIThemeSwitcher />
                </div>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); setIsFeedbackOpen(true); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-colors text-sm text-left"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  Send Feedback
                </button>
              </nav>

              <div className="px-4 pb-6">
                <button
                  onClick={() => { setIsMobileMenuOpen(false); if (user) logoutAccount(user.uid); else logout(); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-500/10 text-red-400/70 hover:text-red-400 transition-colors text-sm text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <RedeemCodeModal isOpen={isRedeemOpen} onClose={() => setIsRedeemOpen(false)} />
      <FeedbackModal open={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
      <CreateOrgModal open={isCreateOrgOpen} onClose={() => setIsCreateOrgOpen(false)} />
    </nav>
  );
}
