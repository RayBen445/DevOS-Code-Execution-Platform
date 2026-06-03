import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Building2, Globe, Lock, Loader2 } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import { createOrg } from "../lib/orgService";
import { getUserSettings } from "../lib/userService";
import { cn } from "../lib/utils";
import { DEVOS_PRODUCT_HOST } from "../lib/brand";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface CreateOrgModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateOrgModal({ open, onClose }: CreateOrgModalProps) {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  const toSlug = (v: string) =>
    v.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugManual) setSlug(toSlug(v));
  };

  const handleSlugChange = (v: string) => {
    setSlugManual(true);
    setSlug(toSlug(v));
  };

  const handleClose = () => {
    if (creating) return;
    setName("");
    setSlug("");
    setSlugManual(false);
    setDescription("");
    setIsPublic(true);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim() || !slug.trim()) return;

    setCreating(true);
    try {
      const settings = await getUserSettings(user.uid);
      const username = settings?.username || user.email?.split("@")[0] || "user";
      await createOrg({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        isPublic,
        createdBy: user.uid,
        createdByUsername: username,
      });
      toast.success(`Organization "${name.trim()}" created!`);
      handleClose();
      navigate(`/org/${slug.trim()}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create organization.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50"
            onClick={handleClose}
          />
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-base border border-border-base rounded-3xl overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="p-6 border-b border-border-base flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <h2 className="text-lg font-bold text-white">New Organization</h2>
                </div>
                <button
                  onClick={handleClose}
                  disabled={creating}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">
                    Organization Name
                  </label>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Acme Corp"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all"
                    required
                    maxLength={50}
                    disabled={creating}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">
                    URL Slug
                  </label>
                  <div className="flex items-center rounded-xl border border-border-base bg-white/5 overflow-hidden focus-within:border-blue-500 transition-all">
                    <span className="px-3 text-white/30 text-sm select-none">https://</span>
                    <input
                      type="text"
                      placeholder="acme-corp"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      className="flex-1 bg-transparent py-3 pr-4 text-white focus:outline-none text-sm"
                      required
                      maxLength={40}
                      disabled={creating}
                    />
                    <span className="px-3 text-white/30 text-sm select-none">
                      {`.org.${DEVOS_PRODUCT_HOST}`}
                    </span>
                  </div>
                  <p className="text-xs text-white/25">Lowercase letters, numbers, and hyphens only.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">
                    Description (Optional)
                  </label>
                  <textarea
                    placeholder="What does your organization build?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all h-20 resize-none text-sm"
                    maxLength={200}
                    disabled={creating}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5",
                      isPublic
                        ? "bg-blue-600/10 border-blue-600"
                        : "bg-white/5 border-border-base hover:border-border-base"
                    )}
                    disabled={creating}
                  >
                    <Globe className={cn("w-5 h-5", isPublic ? "text-blue-400" : "text-white/20")} />
                    <span className="text-xs font-bold">Public</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5",
                      !isPublic
                        ? "bg-blue-600/10 border-blue-600"
                        : "bg-white/5 border-border-base hover:border-border-base"
                    )}
                    disabled={creating}
                  >
                    <Lock className={cn("w-5 h-5", !isPublic ? "text-blue-400" : "text-white/20")} />
                    <span className="text-xs font-bold">Private</span>
                  </button>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={creating}
                    className="flex-1 py-3 rounded-xl bg-white/5 border border-border-base text-white/60 hover:text-white hover:bg-white/10 font-semibold transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !name.trim() || !slug.trim()}
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating…
                      </>
                    ) : (
                      "Create Organization"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
