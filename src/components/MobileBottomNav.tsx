import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, FolderCode, Users, User } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { cn } from "../lib/utils";

export default function MobileBottomNav() {
  const [user] = useAuthState(auth);
  const location = useLocation();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setUsername(null);
      return;
    }
    const unsub = onSnapshot(doc(db, "user_settings", user.uid), (snap) => {
      if (snap.exists()) setUsername(snap.data().username ?? null);
    });
    return unsub;
  }, [user]);

  if (!user) return null;

  const tabs = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/projects", icon: FolderCode, label: "Projects" },
    { href: "/explore", icon: Users, label: "Explore" },
    { href: username ? `/@${username}` : "/settings", icon: User, label: "Profile" },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-t border-white/10"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around safe-area-bottom">
        {tabs.map((tab) => {
          // Use exact match for root "/" to avoid matching every path
          const isActive =
            tab.href === "/"
              ? location.pathname === "/"
              : location.pathname === tab.href || location.pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-3 min-w-[60px] transition-colors",
                isActive ? "text-blue-400" : "text-white/40 active:text-white/70"
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold tracking-tight">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
