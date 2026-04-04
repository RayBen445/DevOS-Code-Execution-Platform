import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import { voteOnPoll, getUserVote } from "../lib/pollService";
import { Poll, PollVote } from "../types";
import { CheckCircle2, Loader2, BarChart2, Clock, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../lib/utils";

interface PollCardProps {
  poll: Poll;
  /** Called after a successful vote so parent can refresh totals if needed */
  onVoted?: (updatedPoll: Poll) => void;
  className?: string;
}

export default function PollCard({ poll, onVoted, className }: PollCardProps) {
  const [user] = useAuthState(auth);
  const [myVote, setMyVote] = useState<PollVote | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textResponse, setTextResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingVote, setLoadingVote] = useState(true);

  const isExpired = poll.expiresAt && poll.expiresAt?.toMillis?.() < Date.now();
  const isClosed = !poll.isOpen || isExpired;

  useEffect(() => {
    if (!user) {
      setLoadingVote(false);
      return;
    }
    getUserVote(poll.id, user.uid)
      .then((v) => setMyVote(v))
      .catch(() => {})
      .finally(() => setLoadingVote(false));
  }, [poll.id, user]);

  const handleVote = async () => {
    if (!user) {
      toast.error("Sign in to vote.");
      return;
    }
    if (!selectedOption) {
      toast.error("Select an option first.");
      return;
    }
    setSubmitting(true);
    try {
      await voteOnPoll(poll.id, user.uid, selectedOption, textResponse || undefined);
      const voted: PollVote = {
        userId: user.uid,
        optionId: selectedOption,
        votedAt: new Date(),
        textResponse: textResponse || undefined,
      };
      setMyVote(voted);
      // Optimistically update displayed totals
      const updated: Poll = {
        ...poll,
        totalVotes: poll.totalVotes + 1,
        options: poll.options.map((o) =>
          o.id === selectedOption ? { ...o, votes: o.votes + 1 } : o
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

  const hasVoted = !!myVote;
  const showResults = hasVoted || isClosed;

  return (
    <div className={cn("bg-[#111827] border border-white/10 rounded-2xl p-5 space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
              Poll
            </span>
            {isClosed && (
              <span className="px-2 py-0.5 rounded-md bg-white/5 text-white/30 text-[10px] font-bold uppercase">
                Closed
              </span>
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
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="space-y-2">
          {poll.options.map((opt) => {
            const pct = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
            const isMyChoice = myVote?.optionId === opt.id;
            const isSelected = selectedOption === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                disabled={showResults || submitting}
                onClick={() => setSelectedOption(opt.id)}
                className={cn(
                  "w-full text-left rounded-xl border transition-all overflow-hidden relative",
                  showResults
                    ? "cursor-default border-white/5"
                    : isSelected
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                )}
              >
                {/* Progress bar background (shown after voting) */}
                {showResults && (
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 transition-all",
                      isMyChoice ? "bg-blue-600/20" : "bg-white/5"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {!showResults && (
                      <span className={cn(
                        "w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center",
                        isSelected ? "border-blue-500 bg-blue-500" : "border-white/30"
                      )}>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-white block" />}
                      </span>
                    )}
                    {showResults && isMyChoice && (
                      <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    )}
                    <span className={cn("text-sm font-medium truncate", showResults && isMyChoice ? "text-blue-300" : "text-white/80")}>
                      {opt.text}
                    </span>
                  </div>
                  {showResults && (
                    <div className="flex items-center gap-2 flex-shrink-0 text-xs text-white/40">
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

      {/* Free-text input (only before voting if allowTextInput) */}
      {!showResults && !loadingVote && poll.allowTextInput && (
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs text-white/40 font-medium">
            <MessageSquare className="w-3.5 h-3.5" />
            Additional thoughts (optional)
          </label>
          <textarea
            value={textResponse}
            onChange={(e) => setTextResponse(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Type your response…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 resize-none transition-all"
          />
        </div>
      )}

      {/* Shown text response after voting */}
      {showResults && myVote?.textResponse && (
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <p className="text-xs text-white/30 mb-1 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            Your response
          </p>
          <p className="text-sm text-white/70">{myVote.textResponse}</p>
        </div>
      )}

      {/* Submit button */}
      {!showResults && !loadingVote && (
        <button
          onClick={handleVote}
          disabled={!selectedOption || submitting || !user}
          className={cn(
            "w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
            !selectedOption || !user
              ? "bg-white/5 text-white/20 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white active:scale-95"
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting…
            </>
          ) : (
            "Submit Vote"
          )}
        </button>
      )}

      {/* Footer */}
      <p className="text-xs text-white/25 text-right">
        {poll.totalVotes} vote{poll.totalVotes !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
