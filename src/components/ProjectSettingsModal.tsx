import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Settings, Globe, Lock, Trash2, Server, Code2, Users,
  GitBranch, Layers, AlertTriangle, Loader2, Plus, Eye, EyeOff, Save,
} from "lucide-react";
import { db, auth } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  doc, updateDoc, serverTimestamp, deleteDoc, collection, getDocs,
  addDoc, query, orderBy,
} from "firebase/firestore";
import { Project } from "../types";
import { cn } from "../lib/utils";
import { toast } from "sonner";

type Section =
  | "general"
  | "env"
  | "deployment"
  | "versions"
  | "collaboration"
  | "danger";

interface ProjectSettingsModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "general", label: "General", icon: <Settings className="w-4 h-4" /> },
  { id: "env", label: "Environment Variables", icon: <Code2 className="w-4 h-4" /> },
  { id: "deployment", label: "Deployment", icon: <Server className="w-4 h-4" /> },
  { id: "versions", label: "Versions", icon: <GitBranch className="w-4 h-4" /> },
  { id: "collaboration", label: "Collaboration", icon: <Users className="w-4 h-4" /> },
  { id: "danger", label: "Danger Zone", icon: <AlertTriangle className="w-4 h-4" /> },
];

export default function ProjectSettingsModal({
  project,
  isOpen,
  onClose,
  onDeleted,
}: ProjectSettingsModalProps) {
  const [user] = useAuthState(auth);
  const [activeSection, setActiveSection] = useState<Section>("general");

  // General
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [isPublic, setIsPublic] = useState(project.isPublic);
  const [savingGeneral, setSavingGeneral] = useState(false);

  // Env vars
  const [envPairs, setEnvPairs] = useState<{ key: string; value: string }[]>(
    Object.entries(project.env ?? {}).map(([key, value]) => ({ key, value }))
  );
  const [savingEnv, setSavingEnv] = useState(false);

  // Versions
  const [versions, setVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Collaboration
  const [collabInput, setCollabInput] = useState("");
  const [savingCollab, setSavingCollab] = useState(false);

  // Danger
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (activeSection === "versions" && versions.length === 0) {
      loadVersions();
    }
  }, [activeSection]);

  const loadVersions = async () => {
    setLoadingVersions(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "projects", project.id, "versions"),
          orderBy("createdAt", "desc")
        )
      );
      setVersions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {
      // ignore
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleSaveGeneral = async () => {
    if (!name.trim()) return;
    setSavingGeneral(true);
    try {
      await updateDoc(doc(db, "projects", project.id), {
        name: name.trim(),
        description: description.trim(),
        isPublic,
        updatedAt: serverTimestamp(),
      });
      toast.success("Project settings saved.");
    } catch {
      toast.error("Failed to save settings.");
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleSaveEnv = async () => {
    setSavingEnv(true);
    try {
      const env: Record<string, string> = {};
      for (const { key, value } of envPairs) {
        if (key.trim()) env[key.trim()] = value;
      }
      await updateDoc(doc(db, "projects", project.id), {
        env,
        updatedAt: serverTimestamp(),
      });
      toast.success("Environment variables saved.");
    } catch {
      toast.error("Failed to save env vars.");
    } finally {
      setSavingEnv(false);
    }
  };

  const handleAddCollaborator = async () => {
    if (!collabInput.trim() || !user) return;
    setSavingCollab(true);
    try {
      const current = project.collaborators ?? [];
      if (current.includes(collabInput.trim())) {
        toast.error("Already a collaborator.");
        return;
      }
      const updated = [...current, collabInput.trim()];
      await updateDoc(doc(db, "projects", project.id), {
        collaborators: updated,
        updatedAt: serverTimestamp(),
      });
      toast.success("Collaborator added.");
      setCollabInput("");
    } catch {
      toast.error("Failed to add collaborator.");
    } finally {
      setSavingCollab(false);
    }
  };

  const handleRemoveCollaborator = async (uid: string) => {
    try {
      const updated = (project.collaborators ?? []).filter((c) => c !== uid);
      await updateDoc(doc(db, "projects", project.id), {
        collaborators: updated,
        updatedAt: serverTimestamp(),
      });
      toast.success("Collaborator removed.");
    } catch {
      toast.error("Failed to remove collaborator.");
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== project.name) return;
    if (project.isDeletable === false) {
      toast.error("This project cannot be deleted.");
      return;
    }
    setDeleting(true);
    try {
      // Delete subcollections in parallel, and within each subcollection delete docs in parallel
      await Promise.all(
        ["files", "commits", "pullRequests", "versions"].map(async (sub) => {
          const snap = await getDocs(collection(db, "projects", project.id, sub));
          await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
        })
      );
      await deleteDoc(doc(db, "projects", project.id));
      toast.success("Project deleted.");
      onDeleted?.();
      onClose();
    } catch {
      toast.error("Failed to delete project.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="w-full max-w-3xl max-h-[85vh] bg-card border border-border-base rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-base shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white/60" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">{project.name}</h2>
                  <p className="text-xs text-white/30">Project Settings</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            <div className="flex flex-1 min-h-0">
              {/* Sidebar */}
              <div className="w-48 border-r border-border-base p-3 shrink-0 overflow-y-auto">
                {SECTIONS.filter((s) =>
                  s.id !== "danger" || project.isDeletable !== false
                ).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left mb-1",
                      activeSection === s.id
                        ? s.id === "danger"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-white/10 text-white"
                        : s.id === "danger"
                        ? "text-red-400/50 hover:text-red-400 hover:bg-red-500/5"
                        : "text-white/40 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {s.icon}
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                {activeSection === "general" && (
                  <div className="space-y-5">
                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest">General</h3>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-white/40">Project Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-white/40">Description</label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={3}
                          className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-white/40">Visibility</label>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setIsPublic(true)}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
                              isPublic
                                ? "bg-green-500/10 border-green-500/30 text-green-400"
                                : "border-border-base text-white/40 hover:border-border-base"
                            )}
                          >
                            <Eye className="w-4 h-4" /> Public
                          </button>
                          <button
                            onClick={() => setIsPublic(false)}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
                              !isPublic
                                ? "bg-white/10 border-border-base text-white"
                                : "border-border-base text-white/40 hover:border-border-base"
                            )}
                          >
                            <EyeOff className="w-4 h-4" /> Private
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleSaveGeneral}
                      disabled={savingGeneral || !name.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all"
                    >
                      {savingGeneral ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </div>
                )}

                {activeSection === "env" && (
                  <div className="space-y-5">
                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest">Environment Variables</h3>
                    <div className="space-y-2">
                      {envPairs.map((pair, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="KEY"
                            value={pair.key}
                            onChange={(e) => setEnvPairs((prev) => prev.map((p, idx) => idx === i ? { ...p, key: e.target.value } : p))}
                            className="flex-1 bg-white/5 border border-border-base rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500/50 transition-all"
                          />
                          <input
                            type="text"
                            placeholder="VALUE"
                            value={pair.value}
                            onChange={(e) => setEnvPairs((prev) => prev.map((p, idx) => idx === i ? { ...p, value: e.target.value } : p))}
                            className="flex-1 bg-white/5 border border-border-base rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500/50 transition-all"
                          />
                          <button
                            onClick={() => setEnvPairs((prev) => prev.filter((_, idx) => idx !== i))}
                            className="p-2 rounded-xl hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setEnvPairs((prev) => [...prev, { key: "", value: "" }])}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border-base hover:border-border-base text-white/40 hover:text-white text-sm transition-all w-full"
                      >
                        <Plus className="w-4 h-4" />
                        Add variable
                      </button>
                    </div>
                    <button
                      onClick={handleSaveEnv}
                      disabled={savingEnv}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all"
                    >
                      {savingEnv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Variables
                    </button>
                  </div>
                )}

                {activeSection === "deployment" && (
                  <div className="space-y-5">
                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest">Deployment</h3>
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-white/5 border border-border-base">
                        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Status</p>
                        <span className={cn(
                          "text-sm font-semibold capitalize",
                          project.deployStatus === "success" && "text-green-400",
                          project.deployStatus === "failed" && "text-red-400",
                          project.deployStatus === "building" && "text-yellow-400",
                          (!project.deployStatus || project.deployStatus === "idle") && "text-white/40",
                        )}>
                          {project.deployStatus ?? "Not deployed"}
                        </span>
                      </div>
                      {project.deployUrl && (
                        <div className="p-4 rounded-xl bg-white/5 border border-border-base">
                          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Deploy URL</p>
                          <a
                            href={project.deployUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                          >
                            {project.deployUrl}
                          </a>
                        </div>
                      )}
                      {project.deployError && (
                        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                          <p className="text-xs font-bold text-red-400/60 uppercase tracking-widest mb-1">Last Error</p>
                          <p className="text-sm text-red-400 font-mono">{project.deployError}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeSection === "versions" && (
                  <div className="space-y-5">
                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest">Version History</h3>
                    <p className="text-xs text-white/40">These are automatic snapshots created every time you manually save your project.</p>
                    {loadingVersions ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
                      </div>
                    ) : versions.length === 0 ? (
                      <div className="py-12 text-center text-white/20 text-sm">
                        No versions found.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {versions.map((v) => (
                          <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-border-base group">
                            <div className="flex items-start gap-3 min-w-0">
                              <GitBranch className="w-4 h-4 text-white/30 mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white">{v.message || "Manual Save"}</p>
                                <p className="text-xs text-white/30">
                                  {v.createdAt?.toDate ? v.createdAt.toDate().toLocaleString() : "Unknown date"}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                if (!window.confirm("Are you sure you want to rollback to this version? Your current unsaved changes will be lost.")) return;
                                try {
                                  // 1. Delete all current files
                                  const currentFilesSnap = await getDocs(collection(db, "projects", project.id, "files"));
                                  await Promise.all(currentFilesSnap.docs.map(d => deleteDoc(d.ref)));
                                  
                                  // 2. Restore files from snapshot
                                  if (v.filesSnapshot && Array.isArray(v.filesSnapshot)) {
                                    await Promise.all(v.filesSnapshot.map((f: any) => 
                                      addDoc(collection(db, "projects", project.id, "files"), {
                                        ...f,
                                        projectId: project.id,
                                        updatedAt: serverTimestamp()
                                      })
                                    ));
                                  }
                                  toast.success("Rolled back successfully! Please refresh the page.");
                                  onClose();
                                } catch (e) {
                                  toast.error("Failed to rollback version.");
                                }
                              }}
                              className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold transition-all opacity-0 group-hover:opacity-100"
                            >
                              Restore
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeSection === "collaboration" && (
                  <div className="space-y-5">
                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest">Collaborators</h3>
                    <div className="space-y-2">
                      {(project.collaborators ?? [])
                        .filter((c) => c !== user?.uid)
                        .map((uid) => (
                          <div key={uid} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-border-base">
                            <span className="text-sm text-white/60 font-mono">{uid}</span>
                            <button
                              onClick={() => handleRemoveCollaborator(uid)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="User UID"
                        value={collabInput}
                        onChange={(e) => setCollabInput(e.target.value)}
                        className="flex-1 bg-white/5 border border-border-base rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                      />
                      <button
                        onClick={handleAddCollaborator}
                        disabled={savingCollab || !collabInput.trim()}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {activeSection === "danger" && (
                  <div className="space-y-5">
                    <h3 className="text-sm font-bold text-red-400/60 uppercase tracking-widest">Danger Zone</h3>
                    <div className="p-5 rounded-xl border border-red-500/20 bg-red-500/5 space-y-4">
                      <div>
                        <p className="text-sm font-bold text-red-400 mb-1">Delete this project</p>
                        <p className="text-xs text-white/30">
                          This action cannot be undone. Type <span className="text-white font-mono">{project.name}</span> to confirm.
                        </p>
                      </div>
                      <input
                        type="text"
                        placeholder={`Type "${project.name}" to confirm`}
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        className="w-full bg-white/5 border border-red-500/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50 transition-all"
                      />
                      <button
                        onClick={handleDelete}
                        disabled={deleting || deleteConfirm !== project.name}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all"
                      >
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Delete Project
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
