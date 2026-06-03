import React, { useState, useEffect, useRef } from "react";
import {
  Inbox, CheckCircle2, XCircle, Zap, Radio, Crown, User,
  MessageCircle, Repeat2, Heart, Users, CalendarCheck, CalendarX,
  Bot, FolderPlus, Trash2, UserCheck, Gift, KeyRound, PackageCheck,
  Shield, Star, ChevronDown, Check, Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";
import {
  subscribeToNotifications,
  countUnread,
  markAsRead,
  markBroadcastRead,
  markAllRead,
} from "../lib/notificationService";
import { Notification, NotificationType } from "../types";
import { cn } from "../lib/utils";
import { formatRelativeTime } from "../lib/utils";

// ─── Icon map ──────────────────────────────────────────────────────────────
type IconProps = { className?: string };
const TYPE_ICON: Record<string, (p: IconProps) => React.ReactElement> = {
  deployment_success:    (p) => <CheckCircle2 {...p} />,
  deployment_failed:     (p) => <XCircle {...p} />,
  credit_warning:        (p) => <Zap {...p} />,
  credits_redeemed:      (p) => <Gift {...p} />,
  system_update:         (p) => <Radio {...p} />,
  admin_message:         (p) => <Crown {...p} />,
  follow:                (p) => <User {...p} />,
  post_comment:          (p) => <MessageCircle {...p} />,
  post_repost:           (p) => <Repeat2 {...p} />,
  post_like:             (p) => <Heart {...p} />,
  post_mention:          (p) => <MessageCircle {...p} />,
  like:                  (p) => <Heart {...p} />,
  mention:               (p) => <MessageCircle {...p} />,
  community_join:        (p) => <Users {...p} />,
  community_moderated:   (p) => <Shield {...p} />,
  org_join:              (p) => <Users {...p} />,
  org_approved:          (p) => <UserCheck {...p} />,
  org_rejected:          (p) => <XCircle {...p} />,
  org_role_updated:      (p) => <Shield {...p} />,
  event_rsvp:            (p) => <CalendarCheck {...p} />,
  event_approved:        (p) => <CalendarCheck {...p} />,
  event_rejected:        (p) => <CalendarX {...p} />,
  event_reminder:        (p) => <CalendarCheck {...p} />,
  event_created:         (p) => <CalendarCheck {...p} />,
  bot_command:           (p) => <Bot {...p} />,
  project_created:       (p) => <FolderPlus {...p} />,
  project_deleted:       (p) => <Trash2 {...p} />,
  profile_updated:       (p) => <User {...p} />,
  password_changed:      (p) => <KeyRound {...p} />,
  template_published:    (p) => <PackageCheck {...p} />,
  username_change_requested: (p) => <UserCheck {...p} />,
};

// ─── Colour map (dot + icon tint) ──────────────────────────────────────────
const TYPE_COLOR: Record<string, string> = {
  deployment_success: "text-green-400",
  deployment_failed:  "text-red-400",
  credit_warning:     "text-yellow-400",
  credits_redeemed:   "text-emerald-400",
  system_update:      "text-blue-400",
  admin_message:      "text-purple-400",
  follow:             "text-sky-400",
  post_comment:       "text-blue-400",
  post_like:          "text-pink-400",
  like:               "text-pink-400",
  community_join:     "text-teal-400",
  org_join:           "text-indigo-400",
  org_approved:       "text-green-400",
  org_rejected:       "text-red-400",
  event_rsvp:         "text-orange-400",
  event_approved:     "text-green-400",
  project_created:    "text-blue-400",
  project_deleted:    "text-red-400",
  template_published: "text-violet-400",
  password_changed:   "text-yellow-400",
  bot_command:        "text-cyan-400",
};

// ─── Filter tabs ────────────────────────────────────────────────────────────
type FilterTab = "all" | "unread" | "mentions" | "deploys" | "social";
const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all",     label: "All" },
  { id: "unread",  label: "Unread" },
  { id: "mentions",label: "Mentions" },
  { id: "deploys", label: "Deploys" },
  { id: "social",  label: "Social" },
];
const FILTER_TYPES: Record<FilterTab, NotificationType[] | null> = {
  all:      null,
  unread:   null,
  mentions: ["mention", "post_mention"],
  deploys:  ["deployment_success", "deployment_failed"],
  social:   ["follow", "like", "post_like", "post_comment", "post_repost", "post_mention"],
};

export default function NotificationBell() {
  const [user] = useAuthState(auth);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    return subscribeToNotifications(user.uid, setNotifications);
  }, [user]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  if (!user) return null;

  const unread = countUnread(notifications, user.uid);

  const isUnread = (n: Notification) =>
    n.userId === "all"
      ? !(n.readBy ?? []).includes(user.uid)
      : !n.isRead;

  // Apply tab filter
  const filtered = notifications.filter((n) => {
    if (activeTab === "unread") return isUnread(n);
    const types = FILTER_TYPES[activeTab];
    if (types) return types.includes(n.type as NotificationType);
    return true;
  });

  const handleClick = async (n: Notification) => {
    if (n.userId === "all") await markBroadcastRead(n.id, user.uid).catch(() => {});
    else await markAsRead(n.id).catch(() => {});
    setIsOpen(false);
    if (n.link) navigate(n.link);
  };

  const iconColor = (type: string) => TYPE_COLOR[type] ?? "text-white/40";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Trigger button ── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
        aria-label="Open notifications"
        title="Notifications"
      >
        <Inbox className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-[380px] bg-card border border-border-base rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
            style={{ maxHeight: "540px" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-base shrink-0">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-white/50" />
                <span className="text-sm font-bold text-white">Inbox</span>
                {unread > 0 && (
                  <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">
                    {unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={() => markAllRead(notifications, user.uid).catch(() => {})}
                    className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/80 transition-colors font-medium"
                    title="Mark all as read"
                  >
                    <Check className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border-base shrink-0 overflow-x-auto scrollbar-none">
              {FILTER_TABS.map((tab) => {
                const tabUnread = tab.id === "unread"
                  ? unread
                  : tab.id === "all"
                  ? 0
                  : notifications.filter((n) => {
                      const types = FILTER_TYPES[tab.id];
                      return types ? types.includes(n.type as NotificationType) && isUnread(n) : false;
                    }).length;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                      activeTab === tab.id
                        ? "bg-white/10 text-white"
                        : "text-white/40 hover:text-white/70 hover:bg-white/5"
                    )}
                  >
                    {tab.label}
                    {tabUnread > 0 && (
                      <span className="w-4 h-4 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {tabUnread > 9 ? "9+" : tabUnread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <div className="py-14 flex flex-col items-center gap-3 text-center px-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                    <Inbox className="w-6 h-6 text-white/20" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/30">
                      {activeTab === "unread" ? "All caught up!" : "Nothing here yet"}
                    </p>
                    <p className="text-xs text-white/20 mt-1">
                      {activeTab === "unread"
                        ? "No unread notifications."
                        : "Notifications will appear here when there's activity."}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  {filtered.map((n) => {
                    const render = TYPE_ICON[n.type];
                    const unreadItem = isUnread(n);
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleClick(n)}
                        className={cn(
                          "w-full text-left px-4 py-3 border-b border-white/[0.04] last:border-0",
                          "hover:bg-white/[0.04] transition-colors flex gap-3 items-start group",
                          unreadItem && "bg-blue-500/[0.04]"
                        )}
                      >
                        {/* Icon */}
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                          "bg-white/5 group-hover:bg-white/10 transition-colors"
                        )}>
                          {render
                            ? render({ className: cn("w-4 h-4", iconColor(n.type)) })
                            : <Inbox className="w-4 h-4 text-white/40" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className={cn(
                              "text-sm leading-tight",
                              unreadItem ? "font-semibold text-white" : "font-medium text-white/70"
                            )}>
                              {n.title}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                              <span className="text-[10px] text-white/25">
                                {formatRelativeTime(n.createdAt)}
                              </span>
                              {unreadItem && (
                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-white/40 leading-snug mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-border-base shrink-0">
              <button
                onClick={() => { setIsOpen(false); navigate("/settings?tab=notifications"); }}
                className="w-full text-center text-xs text-white/30 hover:text-white/60 transition-colors py-0.5"
              >
                Notification settings
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
