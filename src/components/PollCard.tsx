import { useState, useEffect, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import { signInAnonymously } from "firebase/auth";
import { voteOnPoll, getUserVote } from "../lib/pollService";
import { Poll, PollVote } from "../types";
import {
  CheckCircle2,
  Loader2,
  Clock,
  MessageSquare,
  Users,
  Trophy,
  Lock,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface PollCardProps {
  poll: Poll;
  onVoted?: (updatedPoll: Poll) => void;
  className?: string;
  /** Show in compact mode (e.g. inside a feed post) */
  compact?: boolean;
}

function getTimeLeft(expiresAt: { toMillis(): number } | null | undefined): string | null {
  if (!expiresAt) return null;
  const ms = expiresAt.toMillis() - Date.now();
  if (ms <= 0) return "Ended";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  return `${mins}m left`;
}

// Deterministic color per option index
const OPTION_COLORS = [
  "from-blue-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-sky-600",
];

const OPTION_BG_VOTED = [
  "bg-blue-500/20 border-blue-500/50",
  "bg-violet-500/20 border-violet-500/50",
  "bg-emerald-500/20 border-emerald-500/50",
  "bg-orange-500/20 border-orange-500/50",
  "bg-pink-500/20 border-pink-500/50",
  "bg-cyan-500/20 border-cyan-500/50",
];

const OPTION_BAR_COLORS = [
  "bg-blue-500/30",
  "bg-violet-500/30",
  "bg-emerald-500/30",
  "bg-orange-500/30",
  "bg-pink-500/30",
  "bg-cyan-500/30",
];

export default function PollCard({ poll, onVoted, className, compact = false }: PollCardProps) {
  const [user] = useAuthState(auth);
  const [myVote, setMyVote] = useState<PollVote | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [textResponse, setTextResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingVote, setLoadingVote] = useState(true);
  const [showTextInput, setShowTextInput] = useState(false);
  // Animated bar widths
  const [barWidths, setBarWidths] = useState<Record<string, number>>({});
  const prevWidths = useRef<Record<string, number>>({});

  const maxSel = poll.maxSelections ?? 1;
  const isMulti = maxSel > 1;
  const isExpired = poll.expiresAt && poll.expiresAt?.toMillis?.() < Date.now();
  const isClosed = !poll.isOpen || !!isExpired;
  const allowGuest = poll.allowGuestVoting ?? false;
  const timeLeft = getTimeLeft(poll.expiresAt);

  const guestVoteKey = `devos_poll_vote_${poll.id}`;
  const [guestVoted, setGuestVoted] = useState<boolean>(() => {
    try { return !!sessionStorage.getItem(guestVoteKey); } catch { return false; }
  });

  const hasVoted = !!myVote || guestVoted;
  const showResults = hasVoted || isClosed;

  // Find winner option (most votes)
  const maxVotes = Math.max(...poll.options.map((o) => o.votes), 0);
  const winnerIds = poll.totalVotes > 0
    ? poll.options.filter((o) => o.votes === maxVotes).map((o) => o.id)
    : [];

  useEffect(() => {
    if (!user) { setLoadingVote(false); return; }
    getUserVote(poll.id, user.uid)
      .then((v) => setMyVote(v))
      .catch(() => {})
      .finally(() => setLoadingVote(false));
  }, [poll.id, user]);

  // Animate bars on results reveal
  useEffect(() => {
    if (!showResults) return;
    const targets: Record<string, number> = {};
    poll.options.forEach((opt) => {
      targets[opt.id] = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
    });
    // Start from 0 if first time showing
    if (Object.keys(prevWidths.current).length === 0) {
      setBarWidths({});
      setTimeout(() => { setBarWidths(targets); prevWidths.current = targets; }, 50);
    } else {
      setBarWidths(targets);
      prevWidths.current = targets;
    }
  }, [showResults, poll.options, poll.totalVotes]);

  const toggleOption = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (!isMulti) return [id];
      if (prev.length >= maxSel) {
        toast.error(`You can select at most ${maxSel} options.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleVote = async () => {
    if (!user && !allowGuest) { toast.error("Sign in to vote."); return; }
    if (!user && allowGuest && guestVoted) { toast.error("You've already voted."); return; }
    if (selectedIds.length === 0) { toast.error("Select at least one option."); return; }
    setSubmitting(true);
    try {
      let voterId = user?.uid;
      if (!user && allowGuest) {
        const cred = await signInAnonymously(auth);
        voterId = cred.user.uid;
      }
      await voteOnPoll(poll.id, voterId!, selectedIds, textResponse || undefined);
      const voted: PollVote = {
        userId: voterId!,
        optionIds: selectedIds,
        votedAt: new Date(),
        textResponse: textResponse || undefined,
      };
      setMyVote(voted);
      if (!user && allowGuest) {
        try { sessionStorage.setItem(guestVoteKey, "1"); } catch { /* */ }
        setGuestVoted(true);
      }
      const updated: Poll = {
        ...poll,
        totalVotes: poll.totalVotes + 1,
        options: poll.options.map((o) =>
          selectedIds.includes(o.id) ? { ...o, votes: o.votes + 1 } : o
        ),
      };
      onVoted?.(updated);
      toast.success("Vote submitted! 🗳️");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to submit vote.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border transition-all",
        "bg-gradient-to-br from-white/[0.04] to-white/[0.01]",
        "border-white/10",
        compact ? "p-4" : "p-6",
        className
      )}
    >
      {/* Subtle top gradient accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="space-y-2 min-w-0 flex-1">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">
              <Zap className="w-2.5 h-2.5" />
              Poll
            </span>
            {isMulti && !isClosed && !hasVoted && (
              <span className="px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-400 text-[10px] font-bold uppercase border border-violet-500/20">
                Pick up to {maxSel}
              </span>
            )}
            {isClosed && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 text-white/30 text-[10px] font-bold uppercase border border-white/10">
                <Lock className="w-2.5 h-2.5" />
                Closed
              </span>
            )}
            {allowGuest && !isClosed && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/20">
                Open vote
              </span>
            )}
          </div>

          <p className={cn("font-bold text-white leading-snug", compact ? "text-sm" : "text-base")}>
            {poll.question}
          </p>
        </div>

        {/* Expiry */}
        {timeLeft && !isClosed && (
          <div className={cn(
            "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border",
            Number(timeLeft.replace(/\D/g, "")) <= 1 && timeLeft.includes("h")
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : "bg-white/5 border-white/10 text-white/40"
          )}>
            <Clock className="w-3 h-3" />
            <span className="text-[11px] font-semibold">{timeLeft}</span>
          </div>
        )}
      </div>

      {/* Options */}
      {loadingVote ? (
        <div className="flex items-center gap-2 text-white/30 text-sm py-4 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading…</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          {poll.options.map((opt, idx) => {
            const pct = barWidths[opt.id] ?? 0;
            const rawPct = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
            const isMyChoice = myVote?.optionIds?.includes(opt.id) ?? selectedIds.includes(opt.id);
            const isSelected = selectedIds.includes(opt.id);
            const isWinner = showResults && winnerIds.includes(opt.id) && poll.totalVotes > 0;
            const colorIdx = idx % OPTION_COLORS.length;

            return (
              <motion.button
                key={opt.id}
                type="button"
                disabled={showResults || submitting}
                onClick={() => !showResults && toggleOption(opt.id)}
                whileTap={!showResults ? { scale: 0.985 } : {}}
                className={cn(
                  "w-full text-left rounded-xl border transition-all overflow-hidden relative focus:outline-none group",
                  showResults
                    ? cn(
                        "cursor-default",
                        isMyChoice
                          ? OPTION_BG_VOTED[colorIdx]
                          : "bg-white/[0.03] border-white/[0.07]"
                      )
                    : isSelected
                    ? "border-blue-500/60 bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.2)]"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20"
                )}
              >
                {/* Result bar */}
                {showResults && (
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 transition-all duration-700 ease-out rounded-xl",
                      OPTION_BAR_COLORS[colorIdx]
                    )}
                    style={{ width: `${pct}%` }}
                  />
                )}

                <div className="relative flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Selection indicator */}
                    {!showResults && (
                      <span className={cn(
                        "flex-shrink-0 flex items-center justify-center border-2 transition-all",
                        isMulti ? "w-4 h-4 rounded" : "w-4 h-4 rounded-full",
                        isSelected
                          ? "border-blue-500 bg-blue-500"
                          : "border-white/25 group-hover:border-white/50"
                      )}>
                        {isSelected && (
                          isMulti
                            ? <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                            : <span className="w-2 h-2 rounded-full bg-white block" />
                        )}
                      </span>
                    )}

                    {/* Winner trophy */}
                    {showResults && isWinner && (
                      <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    )}

                    {/* My vote check */}
                    {showResults && isMyChoice && !isWinner && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    )}

                    <span className={cn(
                      "text-sm font-medium truncate",
                      showResults && isMyChoice
                        ? "text-white"
                        : showResults
                        ? "text-white/70"
                        : isSelected
                        ? "text-white"
                        : "text-white/80"
                    )}>
                      {opt.text}
                    </span>
                  </div>

                  {/* Result stats */}
                  {showResults && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={cn(
                        "text-xs font-bold",
                        isMyChoice ? "text-white" : "text-white/40"
                      )}>
                        {rawPct}%
                      </span>
                      <span className="text-[11px] text-white/25">{opt.votes}</span>
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Free-text toggle & input */}
      <AnimatePresence>
        {!showResults && !loadingVote && poll.allowTextInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setShowTextInput((p) => !p)}
              className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors mb-2"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {showTextInput ? "Hide comment" : "Add a comment (optional)"}
            </button>

            <AnimatePresence>
              {showTextInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <textarea
                    value={textResponse}
                    onChange={(e) => setTextResponse(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Share your thoughts…"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:shadow-[0_0_15px_rgba(59,130,246,0.1)] resize-none transition-all"
                  />
                  <p className="text-right text-[10px] text-white/20 mt-1">{textResponse.length}/500</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voted text response display */}
      {showResults && myVote?.textResponse && (
        <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.07]">
          <p className="text-[11px] text-white/30 mb-1.5 flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3" />
            Your comment
          </p>
          <p className="text-sm text-white/60 italic">"{myVote.textResponse}"</p>
        </div>
      )}

      {/* Vote button / sign-in prompt */}
      <AnimatePresence mode="wait">
        {!showResults && !loadingVote && (
          <motion.div
            key="vote-btn"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-5 space-y-3"
          >
            {!user && !allowGuest && (
              <p className="text-xs text-white/30 text-center">
                <span className="text-blue-400 font-semibold">Sign in</span> to vote on this poll.
              </p>
            )}
            <button
              onClick={handleVote}
              disabled={selectedIds.length === 0 || submitting || (!user && !allowGuest)}
              className={cn(
                "w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                selectedIds.length > 0 && (user || allowGuest) && !submitting
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                  : "bg-white/[0.04] text-white/20 cursor-not-allowed border border-white/5"
              )}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Submit Vote{isMulti && selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
                </>
              )}
            </button>
          </motion.div>
        )}

        {showResults && (
          <motion.div
            key="results-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-1.5 text-white/30">
              <Users className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{poll.totalVotes} vote{poll.totalVotes !== 1 ? "s" : ""}</span>
            </div>
            {hasVoted && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                Voted
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
