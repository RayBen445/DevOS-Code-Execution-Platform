/**
 * GroupChat — WhatsApp-style group chat component
 * Used by CommunityPage and OrgPage.
 *
 * Features:
 *  • Dark WhatsApp wallpaper background pattern
 *  • Own messages right (green bubble), others left (dark bubble)
 *  • Pointed bubble tail (CSS clip)
 *  • Message grouping: consecutive messages from same sender share one avatar/name
 *  • Date separators (Today / Yesterday / locale date)
 *  • Timestamp + read-receipt ticks inside each bubble
 *  • Emoji picker toggle panel
 *  • Reply-to-message (quote preview, Escape to cancel, highlighted on jump)
 *  • Context menu on right-click / long-press (Reply, Copy, Delete)
 *  • Enter to send, Shift+Enter for newline (textarea)
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Smile, Reply, Copy, Trash2, X, Phone, PhoneOff, Mic, MicOff, Check, CheckCheck, Users } from "lucide-react";
import { cn } from "../lib/utils";
import { resolveAvatar } from "../lib/avatars";
import { renderDevosEmojiText } from "../lib/devosEmoji";
import EmojiPicker from "./EmojiPicker";

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  text: string;
  createdAt: any; // Firestore Timestamp | null
  replyToId?: string;
  replyToText?: string;
  replyToUsername?: string;
}

interface GroupChatProps {
  messages: ChatMessage[];
  currentUserId: string | undefined;
  currentAvatarUrl?: string;
  accentColor?: "indigo" | "green" | "blue";
  onSend: (text: string, replyToId?: string, replyToText?: string, replyToUsername?: string) => Promise<void>;
  onDelete?: (msgId: string) => void;
  canDelete?: (msg: ChatMessage) => boolean;
  voiceCallEnabled?: boolean;
  /** All active call participants (userId → displayName) from Firestore */
  callParticipants?: Record<string, string>;
  /** Whether THIS user is currently in the call */
  inVoiceCall?: boolean;
  /** Whether the local mic is muted */
  muted?: boolean;
  onJoinOrStartCall?: () => void;
  onLeaveCall?: () => void;
  onToggleMute?: () => void;
  /** @deprecated use callParticipants */
  voicePeerCount?: number;
  /** @deprecated use onJoinOrStartCall */
  onStartVoiceCall?: () => void;
  /** @deprecated use onLeaveCall */
  onEndVoiceCall?: () => void;
  emptyLabel?: string;
  notMemberLabel?: string;
  isMember?: boolean;
  onJoin?: () => void;
  joining?: boolean;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function resolveTimestamp(ts: any): Date | null {
  if (!ts) return null;
  if (ts?.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  if (typeof ts === "number") return new Date(ts);
  if (typeof ts === "string") { const d = new Date(ts); return isNaN(d.getTime()) ? null : d; }
  return null;
}

function formatMessageTime(ts: any): string {
  const d = resolveTimestamp(ts);
  if (!d) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

function dayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function sameGroup(a: ChatMessage, b: ChatMessage): boolean {
  if (a.userId !== b.userId) return false;
  const ta = resolveTimestamp(a.createdAt);
  const tb = resolveTimestamp(b.createdAt);
  if (!ta || !tb) return false;
  return Math.abs(ta.getTime() - tb.getTime()) < 5 * 60 * 1000; // within 5 min
}

/* ── Accent colours ───────────────────────────────────────────────────────── */
const ACCENT: Record<string, { bubble: string; send: string; ring: string }> = {
  indigo: { bubble: "bg-indigo-600 text-white shadow-indigo-500/20", send: "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30", ring: "ring-indigo-500/40" },
  green:  { bubble: "bg-[#005c4b] text-white shadow-green-900/30",   send: "bg-[#00a884] hover:bg-[#06cf9c] shadow-green-500/30",  ring: "ring-green-500/40" },
  blue:   { bubble: "bg-blue-600 text-white shadow-blue-500/20",     send: "bg-blue-600 hover:bg-blue-500 shadow-blue-500/30",      ring: "ring-blue-500/40" },
};

/* ── Context menu ─────────────────────────────────────────────────────────── */
interface CtxMenu { msgId: string; x: number; y: number; msg: ChatMessage }

/* ── Component ────────────────────────────────────────────────────────────── */

export default function GroupChat({
  messages,
  currentUserId,
  currentAvatarUrl,
  accentColor = "green",
  onSend,
  onDelete,
  canDelete,
  voiceCallEnabled = false,
  callParticipants = {},
  inVoiceCall = false,
  muted = false,
  onJoinOrStartCall,
  onLeaveCall,
  onToggleMute,
  // deprecated shims
  onStartVoiceCall,
  onEndVoiceCall,
  emptyLabel = "No messages yet. Say hello! 👋",
  notMemberLabel = "Join to chat.",
  isMember = true,
  onJoin,
  joining = false,
}: GroupChatProps) {
  const accent = ACCENT[accentColor];

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* auto-scroll to bottom on new message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* close context menu on outside click */
  useEffect(() => {
    const handler = () => setCtxMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  /* Keyboard handling on textarea */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") { setReplyTo(null); return; }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = useCallback(async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    const reply = replyTo;
    setText("");
    setReplyTo(null);
    try {
      await onSend(t, reply?.id, reply?.text, reply?.displayName || reply?.username);
    } finally {
      setSending(false);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [text, sending, replyTo, onSend]);

  const insertEmoji = (emoji: string) => {
    setText((prev) => prev ? `${prev} ${emoji}` : emoji);
    textareaRef.current?.focus();
  };

  const openCtx = (e: React.MouseEvent, msg: ChatMessage) => {
    e.preventDefault();
    setCtxMenu({ msgId: msg.id, x: e.clientX, y: e.clientY, msg });
  };

  const touchStart = (msg: ChatMessage) => {
    holdTimer.current = setTimeout(() => {
      // approximate centre of screen for long-press context menu
      setCtxMenu({ msgId: msg.id, x: window.innerWidth / 2, y: window.innerHeight / 2 - 50, msg });
    }, 500);
  };
  const touchEnd = () => { if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; } };

  const jumpToMsg = (id: string) => {
    const el = msgRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(id);
      setTimeout(() => setHighlightId(null), 1500);
    }
  };

  /* ── render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full min-h-0 rounded-2xl overflow-hidden border border-white/[0.07] relative">

      {/* WhatsApp-style wallpaper background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 15% 85%, rgba(99,102,241,0.06) 0%, transparent 50%),
            radial-gradient(circle at 85% 15%, rgba(16,185,129,0.04) 0%, transparent 50%),
            #0d1117
          `,
        }}
      />
      {/* subtle tile pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Ccircle cx='20' cy='20' r='1.5'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: "40px 40px",
        }}
      />

      {!isMember ? (
        /* ── not a member ─────────────────────────────────────────────────── */
        <div className="relative flex-1 flex flex-col items-center justify-center gap-3 p-6">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
            <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2h2m10-4H7a2 2 0 00-2 2v0a2 2 0 002 2h10a2 2 0 002-2v0a2 2 0 00-2-2z" />
            </svg>
          </div>
          <p className="text-white/40 text-sm">{notMemberLabel}</p>
          {onJoin && (
            <button
              onClick={onJoin}
              disabled={joining}
              className={cn("text-sm font-semibold transition-colors", `text-${accentColor}-400 hover:text-${accentColor}-300`)}
            >
              {joining ? "Joining…" : "Join →"}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── Call bar (header) ─────────────────────────────────────────── */}
          {voiceCallEnabled && (() => {
            const participantCount = Object.keys(callParticipants).length;
            const callActive = participantCount > 0;
            const handleJoinOrStart = onJoinOrStartCall ?? onStartVoiceCall;
            const handleLeave = onLeaveCall ?? onEndVoiceCall;

            if (inVoiceCall) {
              // Active call bar — user is in the call
              return (
                <div className="relative flex items-center gap-2 px-3 py-2 bg-green-500/10 border-b border-green-500/20 z-10">
                  <span className="flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className="text-xs text-green-300 font-semibold flex-1">
                    Call in progress · {participantCount} participant{participantCount !== 1 ? "s" : ""}
                  </span>
                  {/* Participant name pills */}
                  <div className="hidden sm:flex items-center gap-1 mr-1">
                    {Object.values(callParticipants).slice(0, 3).map((name, i) => (
                      <span key={i} className="text-[10px] bg-green-500/15 text-green-300 px-2 py-0.5 rounded-full border border-green-500/20 max-w-[70px] truncate">{name}</span>
                    ))}
                    {participantCount > 3 && (
                      <span className="text-[10px] text-green-400">+{participantCount - 3}</span>
                    )}
                  </div>
                  <button
                    onClick={onToggleMute}
                    title={muted ? "Unmute" : "Mute"}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      muted ? "bg-red-500/20 text-red-300 hover:bg-red-500/30" : "bg-green-500/15 text-green-300 hover:bg-green-500/25"
                    )}
                  >
                    {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleLeave}
                    title="Leave call"
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg text-xs font-semibold transition-colors border border-red-500/20"
                  >
                    <PhoneOff className="w-3.5 h-3.5" /> Leave
                  </button>
                </div>
              );
            }

            if (callActive) {
              // Call is ongoing but this user hasn't joined
              return (
                <div className="relative flex items-center gap-2 px-3 py-2 bg-blue-500/10 border-b border-blue-500/20 z-10">
                  <span className="flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                  </span>
                  <span className="text-xs text-blue-300 flex-1">
                    <span className="font-semibold">Call in progress</span>
                    {" · "}{participantCount} in call
                  </span>
                  <button
                    onClick={handleJoinOrStart}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5" /> Join Call
                  </button>
                </div>
              );
            }

            // No active call — subtle start button
            return (
              <div className="relative flex items-center justify-end px-3 py-1.5 border-b border-white/[0.04] z-10">
                <button
                  onClick={handleJoinOrStart}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] text-white/40 hover:text-white/70 transition-all border border-white/[0.06]"
                >
                  <Phone className="w-3 h-3" /> Start Call
                </button>
              </div>
            );
          })()}

          {/* ── messages area ────────────────────────────────────────────── */}
          <div className="relative flex-1 overflow-y-auto min-h-0 px-3 pt-3 pb-1 space-y-0.5">

            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="bg-black/30 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/[0.06]">
                  <p className="text-white/40 text-sm text-center">{emptyLabel}</p>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isOwn = msg.userId === currentUserId;
                const prev = i > 0 ? messages[i - 1] : null;
                const next = i < messages.length - 1 ? messages[i + 1] : null;

                const isGroupedWithPrev = !!prev && sameGroup(prev, msg);
                const isGroupedWithNext = !!next && sameGroup(msg, next);

                const msgDate = resolveTimestamp(msg.createdAt);
                const prevDate = prev ? resolveTimestamp(prev.createdAt) : null;
                const showDateSep = msgDate && (!prevDate || !sameDay(prevDate, msgDate));

                const isTail = !isGroupedWithNext; // last in group gets the bubble tail
                const isHighlighted = highlightId === msg.id;

                return (
                  <div key={msg.id}>
                    {/* Date separator */}
                    {showDateSep && msgDate && (
                      <div className="flex justify-center my-3">
                        <span className="bg-surface border border-white/[0.08] text-white/40 text-[10px] font-semibold px-3 py-1 rounded-full tracking-wide">
                          {dayLabel(msgDate)}
                        </span>
                      </div>
                    )}

                    {/* Message row */}
                    <div
                      ref={(el) => { msgRefs.current[msg.id] = el; }}
                      className={cn(
                        "flex items-end gap-2 group transition-colors duration-300",
                        isOwn ? "flex-row-reverse" : "flex-row",
                        !isGroupedWithPrev ? "mt-2" : "mt-0.5",
                        isHighlighted && "bg-white/5 rounded-xl",
                      )}
                      onContextMenu={(e) => openCtx(e, msg)}
                      onTouchStart={() => touchStart(msg)}
                      onTouchEnd={touchEnd}
                    >
                      {/* Avatar – others only, only on tail message of group */}
                      <div className="w-8 shrink-0 flex items-end">
                        {!isOwn && isTail && (
                          <img
                            src={resolveAvatar(msg.avatarUrl)}
                            alt={msg.displayName || msg.username}
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10"
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>

                      {/* Bubble container */}
                      <div className={cn("max-w-[75%] flex flex-col", isOwn ? "items-end" : "items-start")}>
                        {/* Sender name – others, only on first in group */}
                        {!isOwn && !isGroupedWithPrev && (
                          <span
                            className="text-[11px] font-bold px-1 mb-0.5"
                            style={{ color: `hsl(${Math.abs(msg.userId.charCodeAt(0) * 37 + msg.userId.charCodeAt(1) * 17) % 360}, 70%, 65%)` }}
                          >
                            {msg.displayName || msg.username}
                          </span>
                        )}

                        {/* Bubble */}
                        <div
                          className={cn(
                            "relative px-3 py-2 text-sm leading-relaxed break-words select-text",
                            "transition-colors",
                            isOwn
                              ? cn(accent.bubble, isTail ? "rounded-t-2xl rounded-bl-2xl rounded-br-sm" : "rounded-2xl")
                              : cn(
                                  "bg-surface text-white/90 border border-white/[0.07]",
                                  isTail ? "rounded-t-2xl rounded-br-2xl rounded-bl-sm" : "rounded-2xl",
                                ),
                          )}
                        >
                          {/* Reply quote */}
                          {msg.replyToText && (
                            <button
                              onClick={() => msg.replyToId && jumpToMsg(msg.replyToId)}
                              className={cn(
                                "w-full text-left mb-1.5 px-2 py-1 rounded-lg text-[11px] border-l-2",
                                isOwn
                                  ? "bg-black/20 border-white/40 text-white/70"
                                  : "bg-black/20 border-white/30 text-white/60",
                              )}
                            >
                              <span className="font-bold block text-white/50 truncate">{msg.replyToUsername}</span>
                              <span className="line-clamp-2">{renderDevosEmojiText(msg.replyToText)}</span>
                            </button>
                          )}

                          {/* Message text */}
                          <span>{renderDevosEmojiText(msg.text)}</span>

                          {/* Timestamp + ticks – inside bubble, bottom-right */}
                          <span
                            className={cn(
                              "inline-flex items-center gap-0.5 float-right ml-3 mt-1 -mb-0.5 text-[10px] shrink-0",
                              isOwn ? "text-white/50" : "text-white/30",
                            )}
                          >
                            {formatMessageTime(msg.createdAt)}
                            {isOwn && <CheckCheck className="w-3 h-3 ml-0.5 text-sky-300/70" />}
                          </span>
                          <div className="clear-both" />
                        </div>
                      </div>

                      {/* Quick action on hover */}
                      <div className={cn(
                        "opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0 mb-1",
                        isOwn ? "mr-1" : "ml-1",
                      )}>
                        <button
                          onClick={() => setReplyTo(msg)}
                          className="p-1 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/70 transition-all"
                          title="Reply"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Context menu ─────────────────────────────────────────────── */}
          {ctxMenu && (
            <div
              className="fixed z-50 bg-surface border border-border-base rounded-xl shadow-2xl overflow-hidden min-w-[160px] text-sm"
              style={{ left: Math.min(ctxMenu.x, window.innerWidth - 180), top: Math.min(ctxMenu.y, window.innerHeight - 200) }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { setReplyTo(ctxMenu.msg); setCtxMenu(null); textareaRef.current?.focus(); }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-white/5 text-white/80 transition-colors"
              >
                <Reply className="w-4 h-4" /> Reply
              </button>
              <button
                onClick={() => { navigator.clipboard?.writeText(ctxMenu.msg.text).catch(() => {}); setCtxMenu(null); }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-white/5 text-white/80 transition-colors"
              >
                <Copy className="w-4 h-4" /> Copy text
              </button>
              {canDelete?.(ctxMenu.msg) && onDelete && (
                <>
                  <div className="h-px bg-white/[0.07] mx-3" />
                  <button
                    onClick={() => { onDelete(ctxMenu.msgId); setCtxMenu(null); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-red-500/10 text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Bottom area ───────────────────────────────────────────────── */}
          <div className="relative px-3 pb-3 pt-2 space-y-2 border-t border-white/[0.06] bg-surface/60 backdrop-blur-sm">

            {/* Reply preview */}
            {replyTo && (
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2">
                <div className={cn("w-0.5 self-stretch rounded-full", `bg-${accentColor}-400`)} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[11px] font-bold", `text-${accentColor}-400`)}>
                    Replying to {replyTo.displayName || replyTo.username}
                  </p>
                  <p className="text-[11px] text-white/40 truncate">{renderDevosEmojiText(replyTo.text)}</p>
                </div>
                <button onClick={() => setReplyTo(null)} className="shrink-0 p-1 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Full emoji picker */}
            {showEmoji && (
              <div className="absolute bottom-full left-3 right-3 mb-2 z-30">
                <EmojiPicker
                  onSelect={(e) => { insertEmoji(e); setShowEmoji(false); }}
                  onClose={() => setShowEmoji(false)}
                />
              </div>
            )}

            {/* Input row */}
            <div className="flex items-end gap-2">
              {/* Own avatar */}
              <img
                src={resolveAvatar(currentAvatarUrl)}
                alt=""
                className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white/[0.08]"
              />

              {/* Text area */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message…"
                  maxLength={2000}
                  rows={1}
                  className="w-full bg-surface border border-white/[0.08] rounded-2xl pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-border-base transition-all resize-none leading-relaxed"
                  style={{ maxHeight: 120, overflowY: "auto" }}
                  onInput={(e) => {
                    const t = e.currentTarget;
                    t.style.height = "auto";
                    t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
                  }}
                />
                {/* Emoji toggle inside input */}
                <button
                  type="button"
                  onClick={() => setShowEmoji((v) => !v)}
                  className="absolute right-2.5 bottom-2.5 text-white/30 hover:text-white/60 transition-colors"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </div>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={sending || !text.trim()}
                className={cn(
                  "p-2.5 rounded-full text-white transition-all shadow-lg shrink-0 flex items-center justify-center",
                  accent.send,
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                )}
              >
                {sending
                  ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <Send className="w-4 h-4" />}
              </button>
            </div>

            {/* Char count hint */}
            {text.length > 1800 && (
              <p className="text-right text-[10px] text-white/25">{text.length}/2000</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
