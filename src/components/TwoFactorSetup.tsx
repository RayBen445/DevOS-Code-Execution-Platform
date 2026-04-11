import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  auth,
  startTotpEnrollment,
  finishTotpEnrollment,
  disableTotp,
  isTotpEnabled,
} from "../lib/firebase";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, Loader2, Copy, CheckCircle2 } from "lucide-react";

interface TwoFactorSetupProps {
  onClose?: () => void;
}

export default function TwoFactorSetup({ onClose }: TwoFactorSetupProps) {
  const [user] = useAuthState(auth);
  const [enabled, setEnabled] = useState(false);
  const [step, setStep] = useState<"idle" | "qr" | "verify">("idle");
  const [secret, setSecret] = useState<any>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) setEnabled(isTotpEnabled(user));
  }, [user]);

  const handleStartEnroll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const totpSecret = await startTotpEnrollment(user);
      setSecret(totpSecret);
      const otpauthUri = totpSecret.generateQrCodeUrl(user.email!, "DevOS");
      setSecretKey(totpSecret.secretKey);
      setQrUrl(
        `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUri)}`
      );
      setStep("qr");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to start 2FA enrollment.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinishEnroll = async () => {
    if (!user || !secret) return;
    setLoading(true);
    try {
      await finishTotpEnrollment(user, secret, otp);
      setEnabled(true);
      setStep("idle");
      setOtp("");
      setSecret(null);
      setQrUrl(null);
      setSecretKey(null);
      toast.success("Two-factor authentication enabled.");
    } catch (err: any) {
      toast.error(err?.message ?? "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!user) return;
    if (!window.confirm("Disable two-factor authentication? Your account will be less secure.")) return;
    setLoading(true);
    try {
      await disableTotp(user);
      setEnabled(false);
      toast.success("Two-factor authentication disabled.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to disable 2FA.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (!secretKey) return;
    navigator.clipboard.writeText(secretKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {enabled ? (
            <ShieldCheck className="w-5 h-5 text-green-400" />
          ) : (
            <ShieldOff className="w-5 h-5 text-white/40" />
          )}
          <div>
            <p className="text-sm font-semibold text-white">Two-Factor Authentication</p>
            <p className="text-xs text-white/40 mt-0.5">
              {enabled ? "TOTP 2FA is active" : "Add an extra layer of security"}
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
            enabled ? "bg-green-500/15 text-green-400" : "bg-white/10 text-white/40"
          }`}
        >
          {enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      {step === "idle" && (
        <>
          {enabled ? (
            <button
              onClick={handleDisable}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-semibold transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
              Disable 2FA
            </button>
          ) : (
            <button
              onClick={handleStartEnroll}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Enable 2FA
            </button>
          )}
        </>
      )}

      {step === "qr" && qrUrl && (
        <div className="space-y-4">
          <p className="text-xs text-white/60">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.).
          </p>
          <div className="flex justify-center">
            <img src={qrUrl} alt="TOTP QR Code" className="rounded-xl border border-white/10" width={200} height={200} />
          </div>
          {secretKey && (
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Manual entry key</p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-white/80 font-mono break-all flex-1">{secretKey}</code>
                <button
                  onClick={handleCopySecret}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                  title="Copy secret key"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-white/40" />
                  )}
                </button>
              </div>
            </div>
          )}
          <button
            onClick={() => setStep("verify")}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all"
          >
            Next — Enter verification code
          </button>
        </div>
      )}

      {step === "verify" && (
        <div className="space-y-4">
          <p className="text-xs text-white/60">
            Enter the 6-digit code from your authenticator app to complete setup.
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-lg tracking-[0.4em] text-center focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          <div className="flex gap-3">
            <button
              onClick={() => { setStep("qr"); setOtp(""); }}
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm font-semibold transition-all"
            >
              Back
            </button>
            <button
              onClick={handleFinishEnroll}
              disabled={loading || otp.length < 6}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Verify & Enable
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
