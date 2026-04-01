/**
 * Maps Firebase Auth error codes to clean, user-friendly messages.
 */
export function getAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Something went wrong. Please try again.";
  const code = (error as { code?: string }).code ?? "";
  const message = (error as { message?: string }).message ?? "";

  switch (code) {
    // Sign-in errors
    case "auth/wrong-password":
    case "auth/invalid-password":
      return "Invalid email or password.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact support.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";

    // Sign-up errors
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/operation-not-allowed":
      return "Sign-up is currently disabled. Please try again later.";

    // Network / other
    case "auth/network-request-failed":
      return "Connection lost. Check your internet and try again.";
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled.";
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Pop-up was blocked by your browser. Please allow pop-ups and try again.";
    case "auth/requires-recent-login":
      return "Please sign out and sign in again to continue.";

    default:
      if (message.includes("network") || message.includes("fetch")) {
        return "Connection lost. Check your internet and try again.";
      }
      return "Something went wrong. Please try again.";
  }
}
