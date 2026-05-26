import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import { Loader2, Shield, Fingerprint, Trash2, Plus, Smartphone, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import {
  listPasskeyDevices,
  registerCurrentDevicePasskey,
  removePasskeyDevice,
  updatePasskeyDevice,
  type PasskeyDevice,
} from "../lib/passkeyService";

export default function PasskeySetup() {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [devices, setDevices] = useState<PasskeyDevice[]>([]);
  const [deviceName, setDeviceName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const rows = await listPasskeyDevices(user);
      setDevices(rows);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load passkeys.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
  }, [user?.uid]);

  const handleRegister = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await registerCurrentDevicePasskey(user, deviceName.trim() || undefined);
      toast.success("Passkey registered for this device.");
      setDeviceName("");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Passkey registration failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (credentialId: string) => {
    if (!user) return;
    if (!window.confirm("Remove this passkey from your account?")) return;
    setSaving(true);
    try {
      await removePasskeyDevice(user, credentialId);
      toast.success("Passkey removed.");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove passkey.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (credentialId: string) => {
    if (!user) return;
    const trimmed = editingName.trim();
    if (!trimmed) {
      toast.error("Device name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await updatePasskeyDevice(user, credentialId, trimmed);
      toast.success("Passkey name updated.");
      setEditingId(null);
      setEditingName("");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update passkey.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Fingerprint className="w-5 h-5 text-blue-400" />
          <div>
            <p className="text-sm font-semibold text-white">Passkeys</p>
            <p className="text-xs text-white/40">Sign in with fingerprint, face unlock, or device PIN.</p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-blue-500/10 text-blue-300">
          {devices.length} device{devices.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={deviceName}
          onChange={(e) => setDeviceName(e.target.value)}
          placeholder="Device name (optional)"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
          maxLength={80}
        />
        <button
          type="button"
          onClick={handleRegister}
          disabled={saving || !user}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add passkey
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading devices...
        </div>
      ) : devices.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-white/50">
          No passkeys added yet. Register this device to enable biometric passkey sign-in.
        </div>
      ) : (
        <div className="space-y-2">
          {devices.map((d) => {
            const isEditing = editingId === d.credentialId;
            const deviceLabel = d.deviceName || "Passkey device";
            return (
              <div key={d.credentialId} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
                        maxLength={80}
                      />
                      <button
                        type="button"
                        onClick={() => handleEdit(d.credentialId)}
                        disabled={saving}
                        className="p-2 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition-colors disabled:opacity-50"
                        title="Save name"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-white flex items-center gap-2">
                        <Smartphone className="w-3.5 h-3.5 text-blue-300" />
                        <span className="truncate">{deviceLabel}</span>
                        {d.deviceType && (
                          <span className="text-[10px] uppercase tracking-widest text-white/40">
                            {d.deviceType}
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-white/35 font-mono truncate">{d.credentialId}</p>
                      {d.backedUp !== null && d.backedUp !== undefined && (
                        <p className="text-[10px] text-white/30">
                          {d.backedUp ? "Synced passkey" : "Local passkey"}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(d.credentialId);
                        setEditingName(deviceLabel);
                      }}
                      disabled={saving}
                      className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors disabled:opacity-50"
                      title="Rename passkey"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(d.credentialId)}
                    disabled={saving}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Remove passkey"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-2 text-[11px] text-white/35">
        <Shield className="w-3.5 h-3.5 mt-0.5 text-white/30" />
        <p>Passkeys are phishing-resistant credentials bound to this device and your browser profile.</p>
      </div>
    </div>
  );
}
