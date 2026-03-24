import { useState, useEffect } from "react";
import { Settings, Github, Send, Loader2, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import { db, auth } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { FileData, Project } from "../types";
import { cn } from "../lib/utils";

interface SettingsPanelProps {
  projectId: string;
  project: Project | null;
  files: FileData[];
}

export default function SettingsPanel({ projectId, project, files }: SettingsPanelProps) {
  const [user] = useAuthState(auth);
  const [commitMessage, setCommitMessage] = useState("");
  const [isPushing, setIsPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState<"idle" | "pushing" | "success" | "failed">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [installationId, setInstallationId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  return (
    <div className="w-80 border-r border-white/5 bg-[#111] flex flex-col h-full">
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Settings</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* GitHub Integration Section */}
        <div className="space-y-4">
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
        </div>

        {/* Project Info Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-white/60">
            <Settings className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Project Info</span>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">Project Name</span>
              <span className="text-[10px] text-white/80">{project?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">Visibility</span>
              <span className="text-[10px] text-white/80">{project?.isPublic ? "Public" : "Private"}</span>
            </div>
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
