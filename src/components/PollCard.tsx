import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import { signInAnonymously } from "firebase/auth";
import { voteOnPoll, getUserVote } from "../lib/pollService";
import { Poll, PollVote } from "../types";
import { CheckCircle2, Loader2, BarChart2, Clock, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../lib/utils";

interface PollCardProps {
  poll: Poll;
  onVoted?: (updatedPoll: Poll) => void;
  className?: string;
}

export default function PollCard({ poll, onVoted, className }: PollCardProps) {
  const [user] = useAuthState(auth);
  const [myVote, setMyVote] = useState<PollVote | null>(null);
  /** Selected option IDs — supports both single and multi-select */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [textResponse, setTextResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingVote, setLoadingVote] = useState(true);

  const maxSel = poll.maxSelections ?? 1;
  const isMulti = maxSel > 1;
  const isExpired = poll.expiresAt && poll.expiresAt?.toMillis?.() < Date.now();
  const isClosed = !poll.isOpen || !!isExpired;
  const allowGuest = poll.allowGuestVoting ?? false;
  const canVoteAsGuest = allowGuest && !user;

  // Track guest votes locally to prevent duplicate voting in the same session
  const guestVoteKey = `devos_poll_vote_${poll.id}`;
  const [guestVoted, setGuestVoted] = useState<boolean>(() => {
    try { return !!sessionStorage.getItem(guestVoteKey); } catch { return false; }
  });

  useEffect(() => {
    if (!user && !canVoteAsGuest) { setLoadingVote(false); return; }
    if (!user) { setLoadingVote(false); return; }
    getUserVote(poll.id, user.uid)
      .then((v) => setMyVote(v))
      .catch(() => {})
      .finally(() => setLoadingVote(false));
  }, [poll.id, user, canVoteAsGuest]);

  const toggleOption = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (!isMulti) return [id];                        // single-select: replace
      if (prev.length >= maxSel) {
        toast.error(`You can select at most ${maxSel} options.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleVote = async () => {
    if (!user && !allowGuest) { toast.error("Sign in to vote."); return; }
    if (!user && allowGuest && guestVoted) { toast.error("You have already voted."); return; }
    if (selectedIds.length === 0) { toast.error("Select at least one option."); return; }
    setSubmitting(true);
    try {
      let voterId = user?.uid;
      // For guest voting, sign in anonymously so Firestore write is authenticated
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
      // Mark guest vote in sessionStorage to prevent duplicates
      if (!user && allowGuest) {
        try { sessionStorage.setItem(guestVoteKey, "1"); } catch { /* ignore */ }
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
      toast.success("Vote submitted!");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to submit vote.");
    } finally {
      setSubmitting(false);
    }
  };

  const hasVoted = !!myVote || guestVoted;
  const showResults = hasVoted || isClosed;

  return (
    <div className={cn("bg-surface border border-border-base rounded-2xl p-5 space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 text-[10px] font-bold uppercase tracking-wider">Poll</span>
            {isMulti && !isClosed && !hasVoted && (
              <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 text-[10px] font-bold uppercase">Pick up to {maxSel}</span>
            )}
            {isClosed && (
              <span className="px-2 py-0.5 rounded-md bg-white/5 text-white/30 text-[10px] font-bold uppercase">Closed</span>
            )}
          </div>
          <p className="text-base font-bold text-white leading-snug">{poll.question}</p>
        </div>
        {poll.expiresAt && !isClosed && (
          <div className="flex items-center gap-1 text-xs text-white/30 flex-shrink-0">
            <Clock className="w-3.5 h-3.5" />
            {new Date(poll.expiresAt.toMillis()).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Options */}
      {loadingVote ? (
        <div className="flex items-center gap-2 text-white/30 text-sm py-2">
          <Loader2 className="w-4 h-4 animate-spin" />Loading…
        </div>
      ) : (
        <div className="space-y-2">
          {poll.options.map((opt) => {
            const pct = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
            const isMyChoice = myVote?.optionIds?.includes(opt.id) ?? false;
            const isSelected = selectedIds.includes(opt.id);

            return (
              <button
                key={opt.id}
                type="button"
                disabled={showResults || submitting}
                onClick={() => toggleOption(opt.id)}
                className={cn(
                  "w-full text-left rounded-xl border transition-all overflow-hidden relative",
                  showResults
                    ? "cursor-default border-border-base"
                    : isSelected
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-border-base bg-white/5 hover:border-border-base"
                )}
              >
                {showResults && (
                  <div
                    className={cn("absolute inset-y-0 left-0 transition-all", isMyChoice ? "bg-blue-600/20" : "bg-white/5")}
                    style={{ width: `${pct}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {!showResults && (
                      /* Checkbox for multi, radio for single */
                      <span className={cn(
                        "flex-shrink-0 flex items-center justify-center border transition-all",
                        isMulti ? "w-4 h-4 rounded" : "w-4 h-4 rounded-full",
                        isSelected ? "border-blue-500 bg-blue-500" : "border-white/30"
                      )}>
                        {isSelected && (
                          isMulti
                            ? <CheckCircle2 className="w-3 h-3 text-white" />
                            : <span className="w-2 h-2 rounded-full bg-white block" />
                        )}
                      </span>
                    )}
                    {showResults && isMyChoice && <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                    <span className={cn("text-sm font-medium truncate", showResults && isMyChoice ? "text-blue-300" : "text-white/80")}>
                      {opt.text}
                    </span>
                  </div>
                  {showResults && (
                    <div className="flex items-center gap-1.5 flex-shrink-0 text-xs text-white/40">
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>{opt.votes} ({pct}%)</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Free-text input */}
      {!showResults && !loadingVote && poll.allowTextInput && (
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs text-white/40 font-medium">
            <MessageSquare className="w-3.5 h-3.5" />Additional thoughts (optional)
          </label>
          <textarea
            value={textResponse}
            onChange={(e) => setTextResponse(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Type your response…"
            className="w-full bg-white/5 border border-border-base rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 resize-none transition-all"
          />
        </div>
      )}

      {showResults && myVote?.textResponse && (
        <div className="p-3 rounded-xl bg-white/5 border border-border-base">
          <p className="text-xs text-white/30 mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" />Your response</p>
          <p className="text-sm text-white/70">{myVote.textResponse}</p>
        </div>
      )}

      {!showResults && !loadingVote && (
        <>
          {!user && !allowGuest && (
            <p className="text-xs text-white/30 text-center">
              <span className="text-blue-400">Sign in</span> to vote on this poll.
            </p>
          )}
          <button
            onClick={handleVote}
            disabled={selectedIds.length === 0 || submitting || (!user && !allowGuest)}
            className={cn(
              "w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
              selectedIds.length === 0 || (!user && !allowGuest)
                ? "bg-white/5 text-white/20 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white active:scale-95"
            )}
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : "Submit Vote"}
          </button>
        </>
      )}

      <p className="text-xs text-white/25 text-right">{poll.totalVotes} vote{poll.totalVotes !== 1 ? "s" : ""}</p>
    </div>
  );
}
