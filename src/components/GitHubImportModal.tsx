import React, { useState, useEffect } from "react";
import { X, Github, Search, Loader2, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";

interface GitHubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (projectId: string) => void;
}

interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  default_branch: string;
  updated_at: string;
  language: string;
}

export default function GitHubImportModal({ isOpen, onClose, onImportComplete }: GitHubImportModalProps) {
  const { user, session } = useSupabaseAuth();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      checkInstallation();
      handleInstallationCallback();
    }
  }, [isOpen, user]);

  const handleInstallationCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const installationId = urlParams.get("installation_id");
    
    if (installationId && session) {
      try {
        await fetch("/api/github/link-installation", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ installationId }),
        });
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        checkInstallation();
      } catch (err) {
        console.error("Error linking installation:", err);
      }
    }
  };

  const checkInstallation = async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/github/repositories", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRepos(data);
        setIsAppInstalled(true);
      } else if (response.status === 404) {
        setIsAppInstalled(false);
      } else {
        setError("Failed to fetch repositories. Please ensure the GitHub App is installed.");
      }
    } catch (err) {
      console.error("Error checking installation:", err);
      setError("Failed to connect to GitHub.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstallApp = () => {
    const appName = import.meta.env.VITE_GITHUB_APP_NAME || "devos-zone";
    window.location.href = `https://github.com/apps/${appName}/installations/new`;
  };

  const handleImport = async (repo: Repo) => {
    if (!user || !session) return;
    setIsImporting(true);
    setError(null);

    try {
      // 1. Create Project in Supabase
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          name: repo.name,
          owner_id: user.id,
          github_repo: repo.full_name,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // 2. Import Files via Backend
      const importResponse = await fetch("/api/github/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          repoFullName: repo.full_name,
          branch: repo.default_branch,
        }),
      });

      if (!importResponse.ok) throw new Error("Failed to import repository content");
      const { files } = await importResponse.json();
      
      // 3. Save files to Supabase
      const filesToInsert = files.map((file: any) => {
        const ext = file.path.split('.').pop()?.toLowerCase() || "";
        const langMap: Record<string, string> = {
          js: "javascript",
          ts: "typescript",
          tsx: "typescript",
          jsx: "javascript",
          html: "html",
          css: "css",
          json: "json",
          md: "markdown",
          py: "python",
        };

        return {
          project_id: project.id,
          name: file.path.split('/').pop(),
          path: file.path,
          content: file.content,
          language: langMap[ext] || "plaintext"
        };
      });

      const { error: filesError } = await supabase
        .from("files")
        .insert(filesToInsert);

      if (filesError) throw filesError;

      onImportComplete(project.id);
    } catch (err) {
      console.error("Error importing repo:", err);
      setError("Failed to import repository content. Please try again.");
      setIsImporting(false);
    }
  };

  const filteredRepos = repos.filter(repo => 
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
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
            className="relative w-full max-w-2xl bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#111] z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Github className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Import Repository</h2>
                  <p className="text-white/40 text-xs">Select a repository to import into DevOS</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            <div className="p-6 border-b border-white/5 bg-[#0a0a0a]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                <input
                  type="text"
                  placeholder="Search your repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                  <p className="text-white/40 font-medium">Fetching repositories...</p>
                </div>
              ) : (!isAppInstalled && !isLoading) ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-center px-12">
                  <Github className="w-12 h-12 text-white/20" />
                  <h3 className="text-xl font-bold">GitHub App Not Installed</h3>
                  <p className="text-white/40 text-sm max-w-sm">
                    To import repositories, you need to install the DevOS GitHub App on your account or organization.
                  </p>
                  <button
                    onClick={handleInstallApp}
                    className="flex items-center gap-2 px-8 py-4 bg-white text-black rounded-2xl font-bold hover:bg-white/90 transition-all active:scale-95 mt-4"
                  >
                    <Github className="w-5 h-5" />
                    Install GitHub App
                  </button>
                </div>
              ) : error ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-center px-12">
                  <AlertCircle className="w-12 h-12 text-red-500/40" />
                  <p className="text-white/60 font-medium">{error}</p>
                  <button
                    onClick={checkInstallation}
                    className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all active:scale-95"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-white/40">No repositories found matching your search.</p>
                </div>
              ) : (
                filteredRepos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => handleImport(repo)}
                    disabled={isImporting}
                    className="w-full group p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex items-center justify-between text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-blue-600/20 transition-colors">
                        <Github className="w-5 h-5 text-white/40 group-hover:text-blue-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white group-hover:text-blue-400 transition-colors">{repo.name}</span>
                          {repo.private && (
                            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/40 uppercase font-bold tracking-wider">Private</span>
                          )}
                        </div>
                        <p className="text-xs text-white/40 line-clamp-1 mt-0.5">{repo.description || "No description provided."}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                  </button>
                ))
              )}
            </div>

            {isImporting && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-6 p-12 text-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                  <Github className="absolute inset-0 m-auto w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Importing Repository...</h3>
                  <p className="text-white/40 max-w-xs mx-auto">
                    We're fetching your files and setting up your DevOS environment. This may take a moment.
                  </p>
                </div>
                <div className="w-full max-w-xs h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 10, ease: "linear" }}
                    className="h-full bg-blue-600"
                  />
                </div>
              </div>
            )}

            <div className="p-4 bg-[#0a0a0a] border-t border-white/5 flex items-center justify-between text-[10px] text-white/20 uppercase tracking-widest font-bold">
              <span>GitHub API v3</span>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span>Secure Connection</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
