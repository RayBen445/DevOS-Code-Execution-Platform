import React, { useState, useEffect, useRef } from "react";
import { Bell, CheckCircle2, XCircle, Zap, Radio, Crown, User, MessageCircle, Repeat2, Heart, Users } from "lucide-react";
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
import { Notification } from "../types";
import { cn } from "../lib/utils";
import { formatRelativeTime } from "../lib/utils";

type NotificationIconProps = { className?: string };
const TYPE_ICON: Record<string, (p: NotificationIconProps) => React.ReactElement> = {
  deployment_success: (p) => <CheckCircle2 {...p} />,
  deployment_failed:  (p) => <XCircle {...p} />,
  credit_warning:     (p) => <Zap {...p} />,
  system_update:      (p) => <Radio {...p} />,
  admin_message:      (p) => <Crown {...p} />,
  follow:             (p) => <User {...p} />,
  post_comment:       (p) => <MessageCircle {...p} />,
  post_repost:        (p) => <Repeat2 {...p} />,
  post_like:          (p) => <Heart {...p} />,
  like:               (p) => <Heart {...p} />,
  community_join:     (p) => <Users {...p} />,
  org_join:           (p) => <Users {...p} />,
  mention:            (p) => <MessageCircle {...p} />,
};

export default function NotificationBell() {
  const [user] = useAuthState(auth);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, setNotifications);
    return unsub;
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const unread = countUnread(notifications, user.uid);

  const handleClickNotification = async (n: Notification) => {
    if (n.userId === "all") {
      await markBroadcastRead(n.id, user.uid);
    } else {
      await markAsRead(n.id);
    }
    setIsOpen(false);
    if (n.link) {
      navigate(n.link);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllRead(notifications, user.uid);
  };

  const isUnread = (n: Notification) => {
    if (n.userId === "all") return !(n.readBy ?? []).includes(user.uid);
    return !n.isRead;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-[#111] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-sm font-bold text-white">Notifications</span>
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-white/20 text-sm">
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClickNotification(n)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors flex gap-3",
                      isUnread(n) && "bg-blue-500/5"
                    )}
                  >
                    <span className="w-6 h-6 mt-0.5 shrink-0 text-white/40 flex items-center justify-center">
                      {(() => {
                        const render = TYPE_ICON[n.type];
                        if (render) return render({ className: "w-4 h-4" });
                        return <Bell className="w-4 h-4" />;
                      })()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-white truncate">{n.title}</span>
                        {isUnread(n) && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-white/40 leading-snug">{n.message}</p>
                      <p className="text-[10px] text-white/20 mt-1">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
