import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, FolderCode, Compass, User, Newspaper, Users, Calendar, Layout, Settings, BookOpen, Bot } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { cn } from "../lib/utils";

export const ALL_NAV_OPTIONS = [
  { id: "home",        label: "Home",        icon: Home,      href: "/" },
  { id: "projects",    label: "Projects",    icon: FolderCode, href: "/projects" },
  { id: "explore",     label: "Explore",     icon: Compass,   href: "/explore" },
  { id: "feed",        label: "Feed",        icon: Newspaper, href: "/feed" },
  { id: "communities", label: "Dev Teams", icon: Users,     href: "/communities" },
  { id: "templates",   label: "Templates",   icon: Layout,    href: "/templates" },
  { id: "events",      label: "Events",      icon: Calendar,  href: "/events" },
  { id: "learn",       label: "Learn",       icon: BookOpen,  href: "/learn" },
  { id: "bots",        label: "Bots",        icon: Bot,       href: "/bots" },
  { id: "profile",     label: "Profile",     icon: User,      href: "__profile__" },
  { id: "settings",    label: "Settings",    icon: Settings,  href: "/settings" },
] as const;

export type NavOptionId = typeof ALL_NAV_OPTIONS[number]["id"];

const DEFAULT_NAV: NavOptionId[] = ["home", "projects", "explore", "profile"];

export default function MobileBottomNav() {
  const [user] = useAuthState(auth);
  const location = useLocation();
  const [username, setUsername] = useState<string | null>(null);
  const [navButtons, setNavButtons] = useState<NavOptionId[]>(DEFAULT_NAV);

  useEffect(() => {
    if (!user) {
      setUsername(null);
      setNavButtons(DEFAULT_NAV);
      return;
    }
    const unsub = onSnapshot(doc(db, "user_settings", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUsername(data.username ?? null);
        const saved: NavOptionId[] = data.bottomNavButtons ?? [];
        setNavButtons(saved.length >= 1 && saved.length <= 4 ? saved : DEFAULT_NAV);
      }
    });
    return unsub;
  }, [user]);

  if (!user) return null;

  const tabs = navButtons.map((id) => {
    const opt = ALL_NAV_OPTIONS.find((o) => o.id === id)!;
    const href = opt.href === "__profile__"
      ? (username ? `/@${username}` : "/settings")
      : opt.href;
    return { href, icon: opt.icon, label: opt.label };
  });

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-base/95 backdrop-blur border-t border-border-base"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around safe-area-bottom">
        {tabs.map((tab) => {
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
