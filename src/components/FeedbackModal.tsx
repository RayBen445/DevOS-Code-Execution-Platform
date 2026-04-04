import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bug, Lightbulb, MessageSquare, Send, Loader2 } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import { toast } from "sonner";
import { cn } from "../lib/utils";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

type FeedbackType = "bug" | "feature" | "feedback";

const TYPES: { value: FeedbackType; label: string; icon: React.ElementType; desc: string; color: string }[] = [
  {
    value: "bug",
    label: "Bug Report",
    icon: Bug,
    desc: "Something isn't working",
    color: "red",
  },
  {
    value: "feature",
    label: "Feature Request",
    icon: Lightbulb,
    desc: "Suggest an improvement",
    color: "yellow",
  },
  {
    value: "feedback",
    label: "General Feedback",
    icon: MessageSquare,
    desc: "Share your thoughts",
    color: "blue",
  },
];

export default function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [user] = useAuthState(auth);
  const [type, setType] = useState<FeedbackType>("feedback");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, "feedback"), {
        type,
        message: message.trim(),
        userId: user?.uid ?? null,
        userEmail: user?.email ?? null,
        createdAt: serverTimestamp(),
        status: "open",
      });
      toast.success("Feedback sent. Thank you!");
      setMessage("");
      onClose();
    } catch {
      toast.error("Failed to send feedback. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998]"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <h2 className="text-base font-extrabold text-white tracking-tight">Send Feedback</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Type selector */}
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map(({ value, label, icon: Icon, desc, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setType(value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all",
                        type === value
                          ? color === "red"
                            ? "bg-red-600/15 border-red-500/50 text-red-300"
                            : color === "yellow"
                            ? "bg-yellow-500/15 border-yellow-500/50 text-yellow-300"
                            : "bg-blue-600/15 border-blue-500/50 text-blue-300"
                          : "bg-white/[0.03] border-white/[0.08] text-white/50 hover:border-white/15 hover:text-white/70"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px] font-bold leading-tight">{label}</span>
                      <span className="text-[10px] leading-tight opacity-60">{desc}</span>
                    </button>
                  ))}
                </div>

                {/* Message */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-1.5">
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    required
                    placeholder={
                      type === "bug"
                        ? "Describe the bug and steps to reproduce it…"
                        : type === "feature"
                        ? "What feature would you like to see?"
                        : "Share your thoughts about DevOS…"
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !message.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
