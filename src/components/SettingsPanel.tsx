import { useState, useEffect } from "react";
import { Settings, Github, Send, Loader2, CheckCircle, XCircle, MessageSquare, Trash2, AlertTriangle, Globe, Lock, Eye, EyeOff, Plus, X } from "lucide-react";
import { db, auth } from "../lib/firebase";
import { doc, getDoc, deleteDoc, collection, getDocs, writeBatch, updateDoc, serverTimestamp } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { FileData, Project } from "../types";
import { cn } from "../lib/utils";

interface SettingsPanelProps {
  projectId: string;
  project: Project | null;
  files: FileData[];
  onDelete?: () => void;
}

export default function SettingsPanel({ projectId, project, files, onDelete }: SettingsPanelProps) {
  const [user] = useAuthState(auth);
  const [commitMessage, setCommitMessage] = useState("");
  const [isPushing, setIsPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState<"idle" | "pushing" | "success" | "failed">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [installationId, setInstallationId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvValue, setNewEnvValue] = useState("");
  const [isAddingEnv, setIsAddingEnv] = useState(false);

  const handleAddEnv = async () => {
    if (!projectId || !newEnvKey.trim() || isAddingEnv) return;
    
    // Validate variable name (alphanumeric and underscores only, must start with letter/underscore)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newEnvKey)) {
      alert("Invalid variable name. Use only letters, numbers, and underscores. Must start with a letter or underscore.");
      return;
    }

    setIsAddingEnv(true);
    try {
      const projectRef = doc(db, "projects", projectId);
      const currentEnv = project?.env || {};
      await updateDoc(projectRef, {
        [`env.${newEnvKey}`]: newEnvValue,
        updatedAt: serverTimestamp()
      });
      setNewEnvKey("");
      setNewEnvValue("");
    } catch (error) {
      console.error("Error adding env var:", error);
    } finally {
      setIsAddingEnv(false);
    }
  };

  const handleRemoveEnv = async (key: string) => {
    if (!projectId) return;
    try {
      const projectRef = doc(db, "projects", projectId);
      const updatedEnv = { ...project?.env };
      delete updatedEnv[key];
      
      // Using a full object update to handle deletion correctly in Firestore
      await updateDoc(projectRef, {
        env: updatedEnv,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error removing env var:", error);
    }
  };

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      const settingsDoc = await getDoc(doc(db, "user_settings", user.uid));
      if (settingsDoc.exists()) {
        setInstallationId(settingsDoc.data().githubInstallationId);
      }
    };
    fetchSettings();
  }, [user]);

  const handleToggleVisibility = async () => {
    if (!projectId || isUpdatingVisibility) return;
    setIsUpdatingVisibility(true);
    try {
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, {
        isPublic: !project?.isPublic,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating visibility:", error);
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  const handlePush = async () => {
    if (!user || !commitMessage.trim() || isPushing) return;
    
    setIsPushing(true);
    setPushStatus("pushing");
    setErrorMessage("");

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/github/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          projectId,
          repoFullName: project?.githubRepo,
          files: files.map(f => ({ path: f.path, content: f.content })),
          commitMessage,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to push to GitHub");
      }

      setPushStatus("success");
      setCommitMessage("");
      setTimeout(() => setPushStatus("idle"), 3000);
    } catch (error: any) {
      console.error("Push error:", error);
      setPushStatus("failed");
      setErrorMessage(error.message);
    } finally {
      setIsPushing(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!user || isDeleting) return;
    
    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      
      // Delete all files
      const filesSnapshot = await getDocs(collection(db, "projects", projectId, "files"));
      filesSnapshot.forEach((fileDoc) => {
        batch.delete(fileDoc.ref);
      });

      // Delete all commits
      const commitsSnapshot = await getDocs(collection(db, "projects", projectId, "commits"));
      commitsSnapshot.forEach((commitDoc) => {
        batch.delete(commitDoc.ref);
      });

      // Delete all PRs
      const prsSnapshot = await getDocs(collection(db, "projects", projectId, "pullRequests"));
      prsSnapshot.forEach((prDoc) => {
        batch.delete(prDoc.ref);
      });

      // Delete project document
      batch.delete(doc(db, "projects", projectId));

      await batch.commit();
      
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="w-80 border-r border-white/5 bg-[#111] flex flex-col h-full">
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Settings</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* GitHub Integration Section commented out as requested */}
        {/* <div className="space-y-4">
          <div className="flex items-center gap-2 text-white/60">
            <Github className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">GitHub Integration</span>
          </div>

          {!installationId ? (
            <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
              <p className="text-[10px] text-yellow-500/80 leading-relaxed">
                GitHub App is not linked to your account. Please install and link it from the dashboard.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">Repository</span>
                  <span className="text-[10px] text-blue-400 font-mono truncate max-w-[120px]">
                    {project?.githubRepo || "Not linked"}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] text-white/40 font-bold uppercase tracking-tighter">
                    <MessageSquare className="w-3 h-3" />
                    Commit Message
                  </label>
                  <textarea
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="What changed?"
                    className="w-full h-20 bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500/50 resize-none"
                  />
                </div>

                <button
                  onClick={() => {
                    if (project?.githubRepo) {
                      setIsModalOpen(true);
                    } else {
                      // For first push, maybe we want a message too
                      setIsModalOpen(true);
                    }
                  }}
                  disabled={isPushing}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all shadow-lg",
                    pushStatus === "success" ? "bg-green-600 text-white" :
                    pushStatus === "failed" ? "bg-red-600 text-white" :
                    "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-blue-500/20"
                  )}
                >
                  {isPushing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : pushStatus === "success" ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : pushStatus === "failed" ? (
                    <XCircle className="w-3.5 h-3.5" />
                  ) : (
                    <Github className="w-3.5 h-3.5" />
                  )}
                  {isPushing ? "Pushing..." : 
                   pushStatus === "success" ? "Success!" :
                   pushStatus === "failed" ? "Failed" :
                   project?.githubRepo ? "Push Changes" : "Create & Push Repo"}
                </button>

                {errorMessage && (
                  <p className="text-[10px] text-red-500 mt-2 text-center">{errorMessage}</p>
                )}
              </div>
            </div>
          )}
        </div> */}

        {/* Environment Variables Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white/60">
            <Lock className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Environment Variables</span>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-4">
            <div className="space-y-2">
              {project?.env && Object.entries(project.env).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 group">
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] font-mono text-blue-400 truncate">{key}</span>
                    <span className="text-[9px] text-white/40 truncate font-mono">••••••••</span>
                  </div>
                  <button 
                    onClick={() => handleRemoveEnv(key)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {(!project?.env || Object.keys(project.env).length === 0) && (
                <p className="text-[10px] text-white/20 italic text-center py-2">No variables defined</p>
              )}
            </div>

            <div className="pt-4 border-t border-white/5 space-y-3">
              <div className="space-y-2">
                <input
                  type="text"
                  value={newEnvKey}
                  onChange={(e) => setNewEnvKey(e.target.value)}
                  placeholder="VARIABLE_NAME"
                  className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-mono text-white focus:outline-none focus:border-blue-500/50"
                />
                <input
                  type="text"
                  value={newEnvValue}
                  onChange={(e) => setNewEnvValue(e.target.value)}
                  placeholder="Value"
                  className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-mono text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <button
                onClick={handleAddEnv}
                disabled={isAddingEnv || !newEnvKey.trim()}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 text-[10px] font-bold transition-all disabled:opacity-50"
              >
                {isAddingEnv ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Add Variable
              </button>
            </div>
            <p className="text-[9px] text-white/20 leading-relaxed">
              Variables are available in your code as <code className="text-blue-400/60">process.env.KEY</code>.
            </p>
          </div>
        </div>

        {/* Project Info Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white/60">
            <Settings className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Project Info</span>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">Project Name</span>
              <span className="text-[10px] text-white/80">{project?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">Visibility</span>
                <span className="text-[10px] text-white/80 flex items-center gap-1.5">
                  {project?.isPublic ? <Globe className="w-3 h-3 text-blue-500" /> : <Lock className="w-3 h-3 text-white/20" />}
                  {project?.isPublic ? "Public" : "Private"}
                </span>
              </div>
              <button
                onClick={handleToggleVisibility}
                disabled={isUpdatingVisibility}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2",
                  project?.isPublic 
                    ? "bg-white/5 text-white/60 hover:bg-white/10" 
                    : "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                {isUpdatingVisibility ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : project?.isPublic ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    Make Private
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    Make Public
                  </>
                )}
              </button>
            </div>
            {project?.isPublic && (
              <div className="pt-2 border-t border-white/5">
                <p className="text-[9px] text-white/20 leading-relaxed">
                  Public projects are visible on your portfolio page and can be discovered by others.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-red-500/60">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Danger Zone</span>
          </div>
          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 space-y-4">
            <p className="text-[10px] text-red-500/60 leading-relaxed">
              Once you delete a project, there is no going back. Please be certain.
            </p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold text-red-500 border border-red-500/20 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Project
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] text-white font-bold text-center">Are you absolutely sure?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 rounded-lg text-[10px] font-bold text-white/40 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteProject}
                    disabled={isDeleting}
                    className="flex-1 py-2 rounded-lg text-[10px] font-bold bg-red-600 text-white hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                  >
                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Confirm Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Commit Message Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Push to GitHub</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-white/40 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Commit Message</label>
                <textarea
                  autoFocus
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Describe your changes..."
                  className="w-full h-32 bg-black/40 border border-white/5 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-blue-500/50 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    handlePush();
                  }}
                  disabled={!commitMessage.trim()}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  Confirm Push
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-white/5 bg-black/20">
        <div className="text-[10px] text-white/20 text-center">
          DevOS IDE v1.0.0
        </div>
      </div>
    </div>
  );
}
