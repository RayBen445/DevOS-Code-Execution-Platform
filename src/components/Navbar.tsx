import { useState, useEffect, useRef } from "react";
import { auth, logout, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { LogIn, LogOut, Code2, User as UserIcon, Settings, Zap, Layout, ShieldCheck, ChevronDown, Gift, Compass, Search } from "lucide-react";
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
    <nav className="h-14 border-b border-white/10 bg-[#0a0a0a] flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">DevOS</span>
        </Link>
        {user && (
          <div className="flex items-center gap-1">
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

      <div className="flex items-center gap-3">
        {user ? (
          <>
            {/* Credit display */}
            {dailyRemaining !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-yellow-300 font-bold text-sm">
                  ⚡ {Math.min(dailyRemaining, DAILY_CREDITS_AMOUNT)} / {DAILY_CREDITS_AMOUNT} today
                </span>
              </div>
            )}

            {/* Notification bell */}
            <Link
              to="/search"
              className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
              title="Search developers"
            >
              <Search className="w-5 h-5" />
            </Link>
            <NotificationBell />

            {/* Profile dropdown */}
            <div className="relative" ref={profileDropdownRef}>
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

      <RedeemCodeModal isOpen={isRedeemOpen} onClose={() => setIsRedeemOpen(false)} />
    </nav>
  );
}
