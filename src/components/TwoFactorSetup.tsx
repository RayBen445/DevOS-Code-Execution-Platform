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
import { ShieldCheck, ShieldOff, Loader2, Copy, CheckCircle2, Download, KeySquare } from "lucide-react";
import { generateRecoveryCodes, getRecoveryCodesMeta } from "../lib/mfaRecoveryService";

interface TwoFactorSetupProps {
  onClose?: () => void;
}

export default function TwoFactorSetup({ onClose }: TwoFactorSetupProps) {
  const [user] = useAuthState(auth);
  const [enabled, setEnabled] = useState(false);
  const [step, setStep] = useState<"idle" | "qr" | "verify" | "recovery">("idle");
  const [secret, setSecret] = useState<any>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoveryCopied, setRecoveryCopied] = useState(false);
  const [recoveryMeta, setRecoveryMeta] = useState<{ exists: boolean; total: number; remaining: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    setEnabled(isTotpEnabled(user));
    getRecoveryCodesMeta(user)
      .then((meta) => setRecoveryMeta(meta))
      .catch(() => setRecoveryMeta(null));
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
      const codes = await generateRecoveryCodes(user);
      setEnabled(true);
      setStep("recovery");
      setRecoveryCodes(codes);
      setRecoveryMeta({
        exists: true,
        total: codes.length,
        remaining: codes.length,
      });
      setOtp("");
      setSecret(null);
      setQrUrl(null);
      setSecretKey(null);
      toast.success("Two-factor authentication enabled. Save your recovery codes.");
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
      setRecoveryCodes([]);
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

  const handleCopyRecoveryCodes = () => {
    if (!recoveryCodes.length) return;
    navigator.clipboard.writeText(recoveryCodes.join("\n")).then(() => {
      setRecoveryCopied(true);
      setTimeout(() => setRecoveryCopied(false), 2000);
    });
  };

  const handleDownloadRecoveryCodes = () => {
    if (!recoveryCodes.length) return;
    const blob = new Blob(
      [
        "DevOS Recovery Codes\n\n",
        "Each code can be used once if you lose access to your authenticator app.\n",
        "Store these in a safe place.\n\n",
        recoveryCodes.join("\n"),
        "\n",
      ],
      { type: "text/plain;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "devos-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRegenerateRecoveryCodes = async () => {
    if (!user) return;
    if (!window.confirm("Regenerate recovery codes? Existing unused codes will stop working.")) return;
    setLoading(true);
    try {
      const codes = await generateRecoveryCodes(user);
      setRecoveryCodes(codes);
      setStep("recovery");
      setRecoveryMeta({
        exists: true,
        total: codes.length,
        remaining: codes.length,
      });
      toast.success("Recovery codes regenerated.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to regenerate recovery codes.");
    } finally {
      setLoading(false);
    }
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
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRegenerateRecoveryCodes}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 text-sm font-semibold transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeySquare className="w-4 h-4" />}
                Regenerate recovery codes
              </button>
              <button
                onClick={handleDisable}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-semibold transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                Disable 2FA
              </button>
            </div>
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
          {enabled && recoveryMeta?.exists && (
            <p className="text-xs text-white/45">
              Recovery codes remaining: <span className="text-white/70 font-semibold">{recoveryMeta.remaining}</span> / {recoveryMeta.total}
            </p>
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

      {step === "recovery" && (
        <div className="space-y-4">
          <div className="rounded-xl bg-yellow-500/10 border border-yellow-400/30 p-3">
            <p className="text-xs text-yellow-200/90 font-semibold">
              Save these recovery codes now. They are shown only once and each code works a single time.
            </p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
            {recoveryCodes.map((code) => (
              <code key={code} className="block text-xs text-white/85 font-mono">{code}</code>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopyRecoveryCodes}
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              {recoveryCopied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {recoveryCopied ? "Copied" : "Copy codes"}
            </button>
            <button
              onClick={handleDownloadRecoveryCodes}
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
          <button
            onClick={() => { setStep("idle"); setRecoveryCodes([]); }}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all"
          >
            I saved my recovery codes
          </button>
        </div>
      )}
    </div>
  );
}
