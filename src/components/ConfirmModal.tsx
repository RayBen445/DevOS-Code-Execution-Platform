import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2, X } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  warning?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  /** When true the confirm button uses a red/danger style */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  description,
  warning,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !loading && onCancel()}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-md bg-card border border-border-base rounded-3xl p-8 shadow-2xl"
          >
            {/* Close */}
            <button
              onClick={() => !loading && onCancel()}
              disabled={loading}
              className="absolute top-5 right-5 p-2 hover:bg-white/5 rounded-full transition-colors disabled:opacity-40"
            >
              <X className="w-4 h-4 text-white/40" />
            </button>

            {/* Icon */}
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-5">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2 tracking-tight">{title}</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-4">{description}</p>

            {warning && (
              <div className="flex items-start gap-2 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-6">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-300 text-xs leading-relaxed">{warning}</p>
              </div>
            )}

            {!warning && <div className="mb-6" />}

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 py-3 rounded-xl border border-border-base text-white/60 font-medium text-sm hover:bg-white/5 transition-all disabled:opacity-40"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                  danger
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
