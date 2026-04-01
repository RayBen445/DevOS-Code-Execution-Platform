import { useState, useEffect } from "react";
import { auth, signInWithGoogle, logout, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { LogIn, LogOut, Code2, User as UserIcon, Settings, Zap, Layout, ShieldCheck } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { cn } from "../lib/utils";
import SettingsModal from "./SettingsModal";
import { UserSettings } from "../types";
import { getCredits } from "../lib/creditsService";
import { Credits } from "../types";
import { Link } from "react-router-dom";

interface NavbarProps {
  onSignIn?: () => void;
}

export default function Navbar({ onSignIn }: NavbarProps) {
  const [user] = useAuthState(auth);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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

    // Check admin role
    const unsubscribeUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setIsAdmin(snap.data().role === "admin");
      }
    });

    // Load credits
    getCredits(user.uid).then(setCredits).catch(() => {});

    return () => {
      unsubscribe();
      unsubscribeUser();
    };
  }, [user]);

  const displayName = settings?.displayName || user?.displayName || "User";
  const avatarUrl = settings?.avatarUrl || user?.photoURL;
  const username = settings?.username;
  const totalCredits = credits ? credits.daily + credits.monthly : null;

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

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            {totalCredits !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-yellow-300 font-bold text-sm">{totalCredits}</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-4 h-4 text-white/60" />
              )}
              <div className="flex flex-col leading-none">
                <span className="text-sm font-medium text-white/80">{displayName}</span>
                {username && <span className="text-[10px] text-white/40">@{username}</span>}
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
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

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </nav>
  );
}
