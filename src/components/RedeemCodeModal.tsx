import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Loader2 } from "lucide-react";
import { auth } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { redeemCode } from "../lib/redeemCodeService";
import { toast } from "sonner";

interface RedeemCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RedeemCodeModal({ isOpen, onClose }: RedeemCodeModalProps) {
  const [user] = useAuthState(auth);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const normalized = code.replace(/[^A-Z0-9_-]/g, "").trim();

  useEffect(() => {
    if (!isOpen) {
      setCode("");
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !normalized) return;

    setLoading(true);
    try {
      const result = await redeemCode(normalized, user.uid);
      if (result.success) {
        toast.success(`Code redeemed successfully! +${result.value} credits added.`);
        setCode("");
        onClose();
      } else {
        toast.error((result as { success: false; error: string }).error);
      }
    } catch {
      toast.error("Failed to redeem code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm" onClick={onClose}>
          <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-yellow-400" />
                </div>
                <h2 className="text-lg font-bold text-white">Redeem Code</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">
                  Enter your code
                </label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. DEVOS2024"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-lg tracking-widest text-center focus:outline-none focus:border-yellow-500/50 transition-all uppercase"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white/40 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !normalized}
                  className="flex-1 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Gift className="w-4 h-4" />
                      Redeem
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
