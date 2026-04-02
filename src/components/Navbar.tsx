import { useState, useEffect, useRef } from "react";
import { auth, logout, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { LogIn, LogOut, Code2, User as UserIcon, Settings, Zap, Layout, ShieldCheck, ChevronDown, Gift, Compass, Search, Menu, X, Home, FolderCode } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { cn } from "../lib/utils";
import NotificationBell from "./NotificationBell";
import RedeemCodeModal from "./RedeemCodeModal";
import { UserSettings, Credits } from "../types";
import { getCredits, DAILY_CREDITS_AMOUNT } from "../lib/creditsService";
import { resolveAvatar } from "../lib/avatars";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface NavbarProps {
  onSignIn?: () => void;
}

export default function Navbar({ onSignIn }: NavbarProps) {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = settings?.displayName || user?.displayName || "User";
  const avatarUrl = resolveAvatar(settings?.avatarUrl || user?.photoURL);
  const username = settings?.username;
  const dailyRemaining = credits?.daily ?? null;

  return (
    <nav className="h-14 border-b border-white/10 bg-[#0a0a0a] flex items-center justify-between px-4 md:px-6 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">DevOS</span>
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
              to="/templates"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors text-sm font-medium"
            >
              <Layout className="w-4 h-4" />
              Templates
            </Link>
            <Link
              to="/projects"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors text-sm font-medium"
            >
              <FolderCode className="w-4 h-4" />
              My Projects
            </Link>
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
            {/* Credit display — hidden on mobile */}
            {dailyRemaining !== null && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-yellow-300 font-bold text-sm">
                  ⚡ {Math.min(dailyRemaining, DAILY_CREDITS_AMOUNT)} / {DAILY_CREDITS_AMOUNT} today
                </span>
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
            <NotificationBell />

            {/* Profile dropdown — hidden on mobile, shown via hamburger */}
            <div className="hidden md:block relative" ref={profileDropdownRef}>
              <button
                onClick={() => setIsProfileOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 transition-all"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="w-4 h-4 text-white/60" />
                )}                <div className="flex flex-col leading-none text-left">
                  <span className="text-sm font-medium text-white/80">{displayName}</span>
                  {username && <span className="text-[10px] text-white/40">@{username}</span>}
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
                    className="absolute right-0 top-full mt-2 w-48 bg-[#111] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
                  >
                    {username && (
                      <Link
                        to={`/u/${username}`}
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <UserIcon className="w-4 h-4" />
                        View Profile
                      </Link>
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
                    <div className="border-t border-white/5 my-1" />
                    <button
                      onClick={() => { setIsProfileOpen(false); logout(); }}
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
              className="fixed top-0 right-0 h-full w-72 bg-[#111] border-l border-white/10 z-50 flex flex-col md:hidden shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
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

              {/* Credits on mobile */}
              {dailyRemaining !== null && (
                <div className="mx-4 mt-4 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <span className="text-yellow-300 font-bold text-sm">
                    {Math.min(dailyRemaining, DAILY_CREDITS_AMOUNT)} / {DAILY_CREDITS_AMOUNT} credits today
                  </span>
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
                  to="/templates"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-colors text-sm font-medium"
                >
                  <Layout className="w-4 h-4" />
                  Templates
                </Link>
                <Link
                  to="/projects"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-colors text-sm font-medium"
                >
                  <FolderCode className="w-4 h-4" />
                  My Projects
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

                <div className="border-t border-white/5 my-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-3 mb-2">Account</p>
                {username && (
                  <Link
                    to={`/u/${username}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-colors text-sm"
                  >
                    <UserIcon className="w-4 h-4" />
                    View Profile
                  </Link>
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
              </nav>

              <div className="px-4 pb-6">
                <button
                  onClick={() => { setIsMobileMenuOpen(false); logout(); }}
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
    </nav>
  );
}
