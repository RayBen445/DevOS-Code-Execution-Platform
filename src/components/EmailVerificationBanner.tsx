import React, { useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, sendVerificationEmail } from "../lib/firebase";
import { toast } from "sonner";
import { Mail, X, Loader2 } from "lucide-react";

export default function EmailVerificationBanner() {
  const [user] = useAuthState(auth);
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  if (!user || user.emailVerified || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await sendVerificationEmail(user);
      toast.success("Verification email sent. Check your inbox.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send verification email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-500/90 backdrop-blur-sm text-amber-950 text-sm font-medium shadow-lg">
      <div className="flex items-center gap-2 min-w-0">
        <Mail className="w-4 h-4 shrink-0" />
        <span className="truncate">Please verify your email address to access all features.</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleResend}
          disabled={sending}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/15 hover:bg-amber-950/25 disabled:opacity-50 transition-colors text-xs font-semibold"
        >
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Resend verification email
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-amber-950/15 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
