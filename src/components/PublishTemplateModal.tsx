import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Tag, Loader2 } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { publishTemplate, createOfficialTemplate } from "../lib/templateService";
import { FileData } from "../types";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { sendNotification } from "../lib/notificationService";

interface PublishTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectId: string;
}

export default function PublishTemplateModal({
  isOpen,
  onClose,
  projectName,
  projectId,
}: PublishTemplateModalProps) {
  const [name, setName] = useState(projectName);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<FileData[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [publishAsOfficial, setPublishAsOfficial] = useState(false);

  useEffect(() => {
    if (!isOpen || !projectId) return;
    setName(projectName);
    setDescription("");
    setTags("");
    setIsAdmin(false);
    setPublishAsOfficial(false);
    const loadFiles = async () => {
      setLoadingFiles(true);
      try {
        const snap = await getDocs(collection(db, "projects", projectId, "files"));
        setFiles(snap.docs.map(d => ({ id: d.id, ...d.data() } as FileData)));
        if (auth.currentUser) {
          const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
          const admin = userSnap.exists() && userSnap.data()?.role === "admin";
          setIsAdmin(admin);
          setPublishAsOfficial(admin);
        }
      } catch {
        setFiles([]);
      } finally {
        setLoadingFiles(false);
      }
    };
    loadFiles();
  }, [isOpen, projectId, projectName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    if (!name.trim() || !description.trim()) {
      toast.error("Please fill in name and description.");
      return;
    }

    setIsSubmitting(true);
    try {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const userData = userDoc.data();

      const templateFiles = files.map((f) => ({
        name: f.name,
        path: f.path,
        content: f.content,
        language: f.language,
      }));

      const normalizedTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (isAdmin && publishAsOfficial) {
        await createOfficialTemplate({
          name: name.trim(),
          description: description.trim(),
          files: templateFiles,
          tags: normalizedTags,
        });
        toast.success("Official template published successfully.");
      } else {
        await publishTemplate({
          name: name.trim(),
          description: description.trim(),
          authorId: auth.currentUser.uid,
          authorName: userData?.displayName || auth.currentUser.displayName || "Unknown",
          authorUsername: userData?.username || "",
          files: templateFiles,
          tags: normalizedTags,
        });

        toast.success(
          "Template submitted for review! An admin will approve it shortly."
        );
      }
      if (auth.currentUser) sendNotification({ userId: auth.currentUser.uid, type: "template_published", title: "Template published", message: "Your template is now in the marketplace.", createdBy: "system" }).catch(() => {});
      onClose();
    } catch (err) {
      toast.error("Failed to publish template. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-[#111] border border-white/10 rounded-3xl p-8 w-full max-w-lg z-10"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white">Publish Template</h2>
                <p className="text-sm text-white/40 mt-1">
                  Submit your project as a reusable template
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingFiles ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="My Awesome Template"
                    required
                  />
                </div>

                {isAdmin && (
                  <label className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-blue-500/25 bg-blue-500/10">
                    <div>
                      <p className="text-sm font-semibold text-blue-300">Admin publish mode</p>
                      <p className="text-xs text-blue-200/70">Publish instantly as an official verified template.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={publishAsOfficial}
                      onChange={(e) => setPublishAsOfficial(e.target.checked)}
                      className="w-4 h-4 accent-blue-500"
                    />
                  </label>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all h-24 resize-none"
                    placeholder="What does this template do?"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <Tag className="w-3 h-3" />
                    Tags (comma-separated, optional)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="react, tailwind, landing-page"
                  />
                </div>

                <div className="bg-white/5 rounded-xl px-4 py-3 text-sm text-white/40">
                  {files.length} file{files.length !== 1 ? "s" : ""} will be included
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                  <p className="text-yellow-400 text-sm">
                    Your template will be reviewed by an admin before appearing in the marketplace.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 rounded-xl font-bold text-white/40 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      "px-8 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all active:scale-95 flex items-center gap-2",
                      isSubmitting && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <Upload className="w-4 h-4" />
                    {isSubmitting ? "Submitting..." : "Submit for Review"}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
