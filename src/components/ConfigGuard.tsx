import { useState, useEffect } from "react";
import { getDocs, collection, query, limit } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { AlertTriangle, RefreshCw, ExternalLink, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

/** Error codes that indicate Firebase itself is unreachable / misconfigured. */
const INFRA_CODES = new Set([
  "unavailable",         // Firestore service down or network gone
  "failed-precondition", // DB not provisioned / wrong database ID
  "internal",            // Server-side error
  "cancelled",           // Connection reset before any response
]);

/**
 * ConfigGuard — checks Firebase connectivity on startup.
 *
 * Renders a full-screen blocking modal when Firestore is genuinely unreachable
 * (network down, wrong project config, service unavailable).
 *
 * DOES NOT block for permission-denied errors, which just mean the rules are
 * working correctly for unauthenticated users.
 */
export default function ConfigGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "ok" | "blocked">("checking");
  const [failedCheck, setFailedCheck] = useState("");
  const [errorCode, setErrorCode] = useState("");

  const runCheck = async () => {
    setStatus("checking");
    setFailedCheck("");
    setErrorCode("");
    try {
      // `templates` has public read access. An infra failure throws here.
      // `permission-denied` is NOT an infra failure — it means rules are active.
      await getDocs(query(collection(db, "templates"), limit(1)));

      // Optional non-blocking sanity probe for guests.
      // Some DevOS deployments intentionally allow reading `users` for public profile UX,
      // so this probe must never hard-block startup.
      if (!auth.currentUser) {
        try {
          await getDocs(query(collection(db, "users"), limit(1)));
        } catch (rulesErr: any) {
          const code: string = rulesErr?.code ?? "";
          // permission-denied is acceptable. Infra codes are not.
          if (INFRA_CODES.has(code)) {
            setFailedCheck("Firestore users collection access check");
            setErrorCode(code);
            setStatus("blocked");
            return;
          }
        }
      }
      setStatus("ok");
    } catch (err: any) {
      const code: string = err?.code ?? "";

      if (INFRA_CODES.has(code)) {
        setFailedCheck("Firestore templates collection (public read)");
        setErrorCode(code);
        setStatus("blocked");
      } else {
        // permission-denied, not-found, auth/* etc. — Firebase itself is up.
        setStatus("ok");
      }
    }
  };

  useEffect(() => {
    runCheck();
  }, []);

  if (status === "checking") {
    return (
      <div className="h-screen flex items-center justify-center bg-base">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (status === "blocked") {
    return (
      <div className="fixed inset-0 z-[9999] bg-base flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
          className="max-w-md w-full bg-card border border-red-500/20 rounded-2xl p-8 text-center shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col"
        >
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>

          <h1 className="text-xl font-extrabold text-white mb-2">
            Configuration Required
          </h1>
          <p className="text-sm text-white/60 leading-relaxed mb-4">
            DevOS cannot connect to its backend. Check your Firebase project
            configuration, network connection, or Firestore service status.
          </p>

          <div className="text-left bg-white/5 border border-border-base rounded-xl px-4 py-3 mb-6 space-y-1">
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">
              Failed check
            </p>
            <p className="text-xs text-white/70 font-mono">{failedCheck}</p>
            {errorCode && (
              <p className="text-xs text-red-400/70 font-mono">
                Error code: <span className="text-red-300">{errorCode}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={runCheck}
              className="w-full py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Check
            </button>
            <a
              href="/status"
              className="w-full py-3 bg-white/5 border border-border-base hover:bg-white/10 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Setup Guide
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
