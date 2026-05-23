import React, { useState, useEffect, useRef } from "react";
import {
  signInWithGoogle,
  signInWithGithub,
  signUpWithEmail,
  signInWithEmail,
  sendVerificationEmail,
  sendPasswordReset,
  getMfaResolver,
  resolveTotpSignIn,
  type MultiFactorResolver,
} from "../lib/firebase";
import { Zap, Github, Mail, Lock, Loader2, X, User, AtSign, Eye, EyeOff, CheckCircle2, XCircle, ShieldCheck, KeyRound, ArrowLeft, Fingerprint } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { registerUserProfile, checkUsernameAvailable, skipNextInitialize } from "../lib/userService";
import { getAuthErrorMessage } from "../lib/errorMessages";
import { signInUsingPasskey } from "../lib/passkeyService";

interface LoginProps {
  onClose: () => void;
  /** Open directly in signup or login mode. Defaults to "login". */
  initialMode?: "login" | "signup";
}

type AuthStep = "social" | "email" | "forgot" | "mfa" | "verify-sent" | "passkey";

export default function Login({ onClose, initialMode = "login" }: LoginProps) {
  const [step, setStep] = useState<AuthStep>("social");
  const [isSignUp, setIsSignUp] = useState(initialMode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [forgotEmail, setForgotEmail] = useState("");
  const [passkeyEmail, setPasskeyEmail] = useState("");

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
    if (step === "email") {
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    }
  }, [step]);

  // Debounced username availability check
  useEffect(() => {
    if (!isSignUp) return;
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);

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
        if (usernameStatus !== "available") {
          try {
            const available = await checkUsernameAvailable(uname);
            if (!available) {
              setError("Username is already taken. Please choose another.");
              setLoading(false);
              return;
            }
          } catch {
            // proceed
          }
        }

        let cred;
        try {
          skipNextInitialize();
          cred = await signUpWithEmail(email, password);
        } catch (authErr: any) {
          setError(getAuthErrorMessage(authErr));
          setLoading(false);
          return;
        }

        try {
          await registerUserProfile(cred.user, { fullName: fullName.trim(), username: uname });
        } catch (profileErr: any) {
          console.error("Profile setup error (non-fatal):", profileErr);
        }

        // Send verification email (non-blocking)
        try {
          await sendVerificationEmail(cred.user);
        } catch {
          // ignore — user is logged in regardless
        }

        // Show "verify your email" notice before closing
        setStep("verify-sent");
        setLoading(false);
        return;
      } else {
        try {
          await signInWithEmail(email, password);
        } catch (authErr: any) {
          // Check if this is an MFA challenge
          const resolver = getMfaResolver(authErr);
          if (resolver) {
            setMfaResolver(resolver);
            setStep("mfa");
            setLoading(false);
            return;
          }
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

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaResolver) return;
    setLoading(true);
    setError("");
    try {
      await resolveTotpSignIn(mfaResolver, otpCode.trim());
      onClose();
    } catch (err: any) {
      setError("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setLoading(true);
    setError("");
    try {
      await sendPasswordReset(forgotEmail.trim());
      setStep("verify-sent");
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeySignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = passkeyEmail.trim().toLowerCase();
    if (!normalized) return;
    setLoading(true);
    setError("");
    try {
      await signInUsingPasskey(normalized);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Passkey sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsSignUp(v => !v);
    setError("");
    setUsernameStatus("idle");
    setUsername("");
    setStep("social");
  };

  const heading = isSignUp ? "Create your account" : step === "mfa" ? "Two-factor auth" : step === "forgot" ? "Reset password" : step === "passkey" ? "Sign in with passkey" : step === "verify-sent" ? "Check your email" : "Welcome back";
  const subheading = isSignUp && step !== "verify-sent"
    ? "Join DevOS — the professional cloud IDE."
    : step === "mfa" ? "Enter the 6-digit code from your authenticator app."
    : step === "forgot" ? "We'll send a reset link to your email."
    : step === "passkey" ? "Use fingerprint, face unlock, or device PIN."
    : step === "verify-sent" && isSignUp ? "We've sent a verification link. Check your inbox to activate your account."
    : step === "verify-sent" ? "Password reset email sent. Check your inbox."
    : "Sign in to continue building on DevOS.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 24 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative w-full max-w-md glass-dark border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/12 rounded-full blur-[60px]" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 hover:bg-white/5 rounded-xl transition-colors"
        >
          <X className="w-5 h-5 text-white/40" />
        </button>

        <div className="flex flex-col items-center mb-8 relative">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30 pulse-glow">
            {step === "mfa" ? <ShieldCheck className="w-8 h-8 text-white" /> : step === "verify-sent" ? <CheckCircle2 className="w-8 h-8 text-white" /> : <Zap className="w-8 h-8 text-white" />}
          </div>
          <h1 className="text-2xl font-black text-white mb-1 tracking-tight">{heading}</h1>
          <p className="text-white/40 text-center text-sm">{subheading}</p>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Verify-sent / password-reset-sent confirmation ── */}
          {step === "verify-sent" && (
            <motion.div key="verify-sent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-[0.98]"
              >
                Got it, close
              </button>
            </motion.div>
          )}

          {/* ── MFA OTP step ── */}
          {step === "mfa" && (
            <motion.form key="mfa" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  placeholder="6-digit code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white text-center tracking-widest text-xl font-mono focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              {error && <p className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-3">{error}</p>}
              <button type="submit" disabled={loading || otpCode.length !== 6} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50">
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                Verify & Sign In
              </button>
              <button type="button" onClick={() => { setStep("email"); setError(""); setOtpCode(""); }} className="w-full text-sm text-white/40 hover:text-white transition-colors flex items-center justify-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            </motion.form>
          )}

          {/* ── Forgot password step ── */}
          {step === "forgot" && (
            <motion.form key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleForgotPassword} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                <input
                  type="email"
                  required
                  placeholder="Your email address"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              {error && <p className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-3">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50">
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                Send Reset Email
              </button>
              <button type="button" onClick={() => { setStep("email"); setError(""); }} className="w-full text-sm text-white/40 hover:text-white transition-colors flex items-center justify-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back to sign in
              </button>
            </motion.form>
          )}

          {/* ── Passkey sign-in step ── */}
          {step === "passkey" && (
            <motion.form key="passkey" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handlePasskeySignIn} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                <input
                  type="email"
                  required
                  placeholder="Email used for your passkey"
                  value={passkeyEmail}
                  onChange={(e) => setPasskeyEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              {error && <p className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-3">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
                Continue with Passkey
              </button>
              <button type="button" onClick={() => { setStep("social"); setError(""); }} className="w-full text-sm text-white/40 hover:text-white transition-colors flex items-center justify-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            </motion.form>
          )}

          {/* ── Social chooser ── */}
          {step === "social" && (
            <motion.div
              key="social"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <button
                onClick={() => { setStep("email"); }}
                className="w-full py-4 bg-white/5 text-white/60 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-[0.98]"
              >
                <Mail className="w-5 h-5" />
                Continue with Email
              </button>
              {!isSignUp && (
                <button
                  onClick={() => { setPasskeyEmail(email); setStep("passkey"); setError(""); }}
                  className="w-full py-4 bg-blue-600/15 text-blue-300 border border-blue-500/30 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-600/25 transition-all active:scale-[0.98]"
                >
                  <Fingerprint className="w-5 h-5" />
                  Continue with Passkey
                </button>
              )}

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
          )}

          {/* ── Email / password form ── */}
          {step === "email" && (
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
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                  <input
                    ref={isSignUp ? undefined : firstFieldRef}
                    type="email"
                    required
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Password */}
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
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => { setStep("forgot"); setForgotEmail(email); setError(""); }}
                    className="text-sm text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setStep("social")}
                  className="text-sm text-white/30 hover:text-white/60 transition-colors flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
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
