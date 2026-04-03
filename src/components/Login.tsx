import React, { useState, useEffect, useRef } from "react";
import { signInWithGoogle, signInWithGithub, signUpWithEmail, signInWithEmail } from "../lib/firebase";
import { Zap, Github, Mail, Lock, Loader2, X, User, AtSign, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { registerUserProfile, checkUsernameAvailable } from "../lib/userService";
import { getAuthErrorMessage } from "../lib/errorMessages";

interface LoginProps {
  onClose: () => void;
  /** Open directly in signup or login mode. Defaults to "login". */
  initialMode?: "login" | "signup";
}

export default function Login({ onClose, initialMode = "login" }: LoginProps) {
  const [isEmailMode, setIsEmailMode] = useState(initialMode === "signup");
  const [isSignUp, setIsSignUp] = useState(initialMode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Live username availability
  type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "error";
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generateSuggestions = (base: string): string[] => [
    `${base}_dev`,
    `${base}01`,
    `the${base}`,
  ];

  // Autofocus first field when email mode activates
  const firstFieldRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isEmailMode) {
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    }
  }, [isEmailMode]);

  // Debounced username availability check
  useEffect(() => {
    if (!isSignUp) return;
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);

    // Always work with the lowercased value so uppercase input doesn't
    // incorrectly trigger "invalid" status
    const uname = username.trim().toLowerCase();
    if (!uname) { setUsernameStatus("idle"); return; }
    if (!/^[a-z0-9_-]{3,20}$/.test(uname)) { setUsernameStatus("invalid"); return; }

    setUsernameStatus("checking");
    usernameDebounceRef.current = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(uname);
        if (available) {
          setUsernameStatus("available");
          setUsernameSuggestions([]);
        } else {
          setUsernameStatus("taken");
          setUsernameSuggestions(generateSuggestions(uname));
        }
      } catch {
        // Show a non-blocking error so the user knows something went wrong
        // with the check, but don't prevent them from proceeding
        setUsernameStatus("error");
      }
    }, 400);

    return () => {
      if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
    };
  }, [username, isSignUp]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isSignUp) {
        const uname = username.trim().toLowerCase();
        if (!uname || !/^[a-z0-9_-]{3,20}$/.test(uname)) {
          setError("Username must be 3–20 characters: letters, numbers, _ or -");
          setLoading(false);
          return;
        }
        if (usernameStatus === "taken") {
          setError("Username is already taken. Please choose another.");
          setLoading(false);
          return;
        }
        // Final availability guard — runs only when the debounce hasn't
        // resolved yet (status is still "idle", "checking", or "error").
        // We keep this in its own try/catch so a Firestore failure here
        // never causes a misleading "something went wrong" auth error.
        if (usernameStatus !== "available") {
          try {
            const available = await checkUsernameAvailable(uname);
            if (!available) {
              setError("Username is already taken. Please choose another.");
              setLoading(false);
              return;
            }
          } catch {
            // Username service unavailable — proceed with sign-up.
            // The username uniqueness constraint in Firestore will still
            // enforce correctness at write time if needed.
          }
        }

        // ── Firebase Auth create user ──────────────────────────────
        let cred;
        try {
          cred = await signUpWithEmail(email, password);
        } catch (authErr: any) {
          setError(getAuthErrorMessage(authErr));
          setLoading(false);
          return;
        }

        // ── Write Firestore profile (best-effort; auth already succeeded) ──
        try {
          await registerUserProfile(cred.user, { fullName: fullName.trim(), username: uname });
        } catch (profileErr: any) {
          console.error("Profile setup error (non-fatal):", profileErr);
          // Auth succeeded — user is signed in. Profile writes failing
          // shouldn't block the user from entering the app.
        }
      } else {
        try {
          await signInWithEmail(email, password);
        } catch (authErr: any) {
          setError(getAuthErrorMessage(authErr));
          setLoading(false);
          return;
        }
      }
      onClose();
    } catch (err: any) {
      console.error("Unexpected auth error:", err);
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsSignUp(v => !v);
    setError("");
    setUsernameStatus("idle");
    setUsername("");
  };

  const heading = isSignUp ? "Create your account" : "Welcome back";
  const subheading = isSignUp
    ? "Join DevOS — the professional cloud IDE."
    : "Sign in to continue building on DevOS.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-white/40" />
        </button>

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-600/20">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">{heading}</h1>
          <p className="text-white/40 text-center text-sm">{subheading}</p>
        </div>

        <AnimatePresence mode="wait">
          {!isEmailMode ? (
            <motion.div
              key="social"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <button
                onClick={() => { setIsEmailMode(true); }}
                className="w-full py-4 bg-white/5 text-white/60 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-[0.98]"
              >
                <Mail className="w-5 h-5" />
                Continue with Email
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-sm text-white/40 hover:text-white transition-colors"
                >
                  {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="email"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleEmailAuth}
              className="space-y-4"
            >
              <div className="space-y-2">
                {isSignUp && (
                  <>
                    {/* Full name */}
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                      <input
                        ref={firstFieldRef}
                        type="text"
                        required
                        placeholder="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    {/* Username with live availability */}
                    <div>
                      <div className="relative">
                        <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                        <input
                          type="text"
                          required
                          placeholder="Username (e.g. johndoe)"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                          className={`w-full bg-black/40 border rounded-2xl pl-12 pr-10 py-4 text-white focus:outline-none transition-colors ${
                            usernameStatus === "taken" || usernameStatus === "invalid"
                              ? "border-red-500/60 focus:border-red-500"
                              : usernameStatus === "available"
                              ? "border-green-500/60 focus:border-green-500"
                              : usernameStatus === "error"
                              ? "border-yellow-500/60 focus:border-yellow-500"
                              : "border-white/10 focus:border-blue-500"
                          }`}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2">
                          {usernameStatus === "checking" && <Loader2 className="w-4 h-4 text-white/30 animate-spin" />}
                          {usernameStatus === "available" && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                          {usernameStatus === "taken" && <XCircle className="w-4 h-4 text-red-400" />}
                          {usernameStatus === "invalid" && <XCircle className="w-4 h-4 text-red-400" />}
                          {usernameStatus === "error" && <XCircle className="w-4 h-4 text-yellow-400" />}
                        </span>
                      </div>
                      {/* Inline status message */}
                      {usernameStatus === "available" && (
                        <p className="text-[11px] text-green-400 px-1 mt-1">✓ Username available</p>
                      )}
                      {usernameStatus === "taken" && (
                        <div className="px-1 mt-1 space-y-1.5">
                          <p className="text-[11px] text-red-400">✗ Username already taken</p>
                          {usernameSuggestions.length > 0 && (
                            <div>
                              <p className="text-[10px] text-white/40 mb-1">Try:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {usernameSuggestions.map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => { setUsername(s); setUsernameStatus("idle"); setUsernameSuggestions([]); }}
                                    className="text-[11px] px-2 py-0.5 rounded-lg bg-blue-600/15 text-blue-400 border border-blue-500/20 hover:bg-blue-600/25 transition-all font-mono"
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {usernameStatus === "invalid" && (
                        <p className="text-[11px] text-red-400 px-1 mt-1">3–20 chars: letters, numbers, _ or -</p>
                      )}
                      {usernameStatus === "error" && (
                        <p className="text-[11px] text-yellow-400/80 px-1 mt-1">Could not verify availability — you can still continue.</p>
                      )}
                      {usernameStatus === "idle" && (
                        <p className="text-[11px] text-white/40 px-1 mt-1">Username cannot be changed after sign-up</p>
                      )}
                    </div>
                  </>
                )}

                {/* Email */}
                {!isSignUp && (
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input
                      ref={isSignUp ? undefined : firstFieldRef}
                      type="email"
                      required
                      placeholder="Email address"
                      value={email}
                      autoFocus={!isSignUp}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                )}
                {isSignUp && (
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input
                      type="email"
                      required
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                )}

                {/* Password with visibility toggle */}
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-3">{error}</p>}

              <button
                type="submit"
                disabled={loading || (isSignUp && (usernameStatus === "taken" || usernameStatus === "invalid" || usernameStatus === "checking"))}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                {isSignUp ? "Create Account" : "Sign In"}
              </button>

              <div className="flex flex-col gap-2 text-center">
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-sm text-white/40 hover:text-white transition-colors"
                >
                  {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEmailMode(false)}
                  className="text-sm text-blue-500 hover:text-blue-400 transition-colors"
                >
                  Back to login options
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-xs text-white/20">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
