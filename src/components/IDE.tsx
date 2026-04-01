import { useState, useEffect, useRef } from "react";
import { db, auth, handleFirestoreError, OperationType, storage } from "../lib/firebase";
import { collection, onSnapshot, doc, getDoc, updateDoc, serverTimestamp, addDoc, getDocs, increment } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuthState } from "react-firebase-hooks/auth";
import Sidebar from "./Sidebar";
import GitPanel from "./GitPanel";
import PreviewPanel from "./PreviewPanel";
import SettingsPanel from "./SettingsPanel";
import DeployModal from "./DeployModal";
import Editor from "./Editor";
import Navbar from "./Navbar";
import socket from "../lib/socket";
import PortfolioEditor from "./PortfolioEditor";
import { FileData, Project } from "../types";
import { cn } from "../lib/utils";
import { Loader2, ArrowLeft, Share2, Play, GitBranch, Files, Rocket, Terminal, X, GitFork, Globe, Settings, Code2, Plus, Upload, Maximize2, Minimize2, User as UserIcon, Eye } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface IDEProps {
  projectId: string;
  onBack: () => void;
}

type PanelType = "explorer" | "git" | "terminal" | "preview" | "settings" | null;

interface LogEntry {
  type: "system" | "success" | "error" | "info" | "output";
  message: string;
  timestamp: string;
}

export default function IDE({ projectId, onBack }: IDEProps) {
  const [user] = useAuthState(auth);
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileData[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<PanelType>("explorer");
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<LogEntry[]>([]);
  const [isForking, setIsForking] = useState(false);
  const [editorMode, setEditorMode] = useState<"code" | "visual">("visual");
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activePanel === "terminal") {
      scrollToBottom();
    }
  }, [runOutput, activePanel]);

  const addLog = (type: LogEntry["type"], message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setRunOutput(prev => [...prev, { type, message, timestamp }]);
  };

  const isReadOnly = project && user && project.ownerId !== user.uid && !project.collaborators.includes(user.uid);

  useEffect(() => {
    if (!user || !projectId) return;

    // Increment views
    const incrementViews = async () => {
      try {
        await updateDoc(doc(db, "projects", projectId), {
          views: increment(1)
        });
      } catch (error) {
        console.error("Error incrementing views:", error);
      }
    };
    incrementViews();

    // Join socket room
    socket.connect();
    socket.emit("join-project", projectId);

    // Fetch project metadata
    const projectRef = doc(db, "projects", projectId);
    const unsubProject = onSnapshot(projectRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Project;
        setProject({ id: snapshot.id, ...data } as Project);
        // Default to code mode for non-system projects
        if (data.systemType !== 'portfolio') {
          setEditorMode("code");
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `projects/${projectId}`);
    });

    // Fetch files
    const filesRef = collection(db, "projects", projectId, "files");
    const unsubFiles = onSnapshot(filesRef, (snapshot) => {
      const fileList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FileData[];
      setFiles(fileList);
      
      if (!activeFileId && fileList.length > 0) {
        setActiveFileId(fileList[0].id);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/files`);
    });

    return () => {
      unsubProject();
      unsubFiles();
      socket.disconnect();
    };
  }, [user, projectId]);

  const activeFile = files.find(f => f.id === activeFileId);

  const handleUpdateFile = async (fileId: string, content: string) => {
    if (!fileId || !projectId || isReadOnly) return;

    try {
      const fileRef = doc(db, "projects", projectId, "files", fileId);
      await updateDoc(fileRef, {
        content,
        updatedAt: serverTimestamp()
      });

      socket.emit("code-change", {
        projectId,
        fileId,
        content,
        userId: user?.uid
      });
    } catch (error) {
      console.error("Error saving file:", error);
      toast.error("Failed to save changes");
    }
  };

  const handleCodeChange = async (content: string) => {
    if (!activeFileId) return;
    await handleUpdateFile(activeFileId, content);
  };

  const handleRun = async () => {
    if (!activeFile) return;
    
    setIsRunning(true);
    setActivePanel("terminal");
    setRunOutput([]);
    addLog("system", "Starting execution...");
    addLog("info", `Running ${activeFile.name}...`);

    // Handle client-side files locally
    if (activeFile.language === "html" || activeFile.language === "css" || activeFile.language === "json") {
      setTimeout(() => {
        addLog("info", `[Frontend] ${activeFile.name} is a static/client-side file.`);
        addLog("info", `[Frontend] Rendering updates in the Live Preview panel...`);
        addLog("success", "Preview updated successfully.");
        setIsRunning(false);
      }, 500);
      return;
    }

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          language: activeFile.language,
          content: activeFile.content
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Execution failed");
      }

      const data = await response.json();
      data.logs.forEach((log: string) => addLog("output", log));
      addLog("success", "Execution completed successfully.");
    } catch (error: any) {
      addLog("error", error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const togglePanel = (panel: PanelType) => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  const handleFork = async () => {
    if (!user || !project || isForking) return;
    setIsForking(true);

    try {
      const docRef = await addDoc(collection(db, "projects"), {
        name: `${project.name} (Fork)`,
        description: project.description || "",
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        collaborators: [],
        isPublic: false,
        isTemplate: false,
        forksCount: 0,
        parentProjectId: project.id
      });

      const filesRef = collection(db, "projects", project.id, "files");
      const filesSnapshot = await getDocs(filesRef);
      const copyPromises = filesSnapshot.docs.map(fileDoc => {
        const fileData = fileDoc.data();
        return addDoc(collection(db, "projects", docRef.id, "files"), {
          ...fileData,
          projectId: docRef.id,
          updatedAt: serverTimestamp()
        });
      });
      await Promise.all(copyPromises);

      toast.success("Project forked successfully!");
      // Redirect to new project
      window.location.reload(); 
    } catch (error) {
      console.error("Error forking project:", error);
      toast.error("Failed to fork project");
    } finally {
      setIsForking(false);
    }
  };

  const handleCreateFile = async (name: string) => {
    if (!projectId || !name.trim() || isReadOnly) return;
    const extension = name.split(".").pop() || "txt";
    const languageMap: Record<string, string> = {
      js: "javascript",
      ts: "typescript",
      tsx: "typescript",
      jsx: "javascript",
      json: "json",
      css: "css",
      html: "html",
      md: "markdown"
    };

    try {
      const docRef = await addDoc(collection(db, "projects", projectId, "files"), {
        projectId,
        name,
        path: name,
        content: "",
        language: languageMap[extension] || "plaintext",
        updatedAt: serverTimestamp()
      });
      setActiveFileId(docRef.id);
      toast.success(`File "${name}" created`);
    } catch (error) {
      console.error("Error creating file:", error);
      toast.error("Failed to create file");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId || isReadOnly) return;

    const extension = file.name.split(".").pop()?.toLowerCase() || "txt";
    const isImage = ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(extension);

    setIsUploading(true);
    setUploadProgress(0);

    try {
      if (isImage) {
        const storageRef = ref(storage, `projects/${projectId}/files/${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            console.error("Upload error:", error);
            setIsUploading(false);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            const docRef = await addDoc(collection(db, "projects", projectId, "files"), {
              projectId,
              name: file.name,
              path: file.name,
              content: downloadURL,
              language: "image",
              updatedAt: serverTimestamp()
            });
            setActiveFileId(docRef.id);
            setIsUploading(false);
            toast.success(`Image "${file.name}" uploaded`);
          }
        );
      } else {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const content = event.target?.result as string;
          const languageMap: Record<string, string> = {
            js: "javascript",
            ts: "typescript",
            tsx: "typescript",
            jsx: "javascript",
            json: "json",
            css: "css",
            html: "html",
            md: "markdown"
          };

          const docRef = await addDoc(collection(db, "projects", projectId, "files"), {
            projectId,
            name: file.name,
            path: file.name,
            content: content || "",
            language: languageMap[extension] || "plaintext",
            updatedAt: serverTimestamp()
          });
          setActiveFileId(docRef.id);
          setIsUploading(false);
          toast.success(`File "${file.name}" uploaded`);
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setIsUploading(false);
      toast.error("Failed to upload file");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] overflow-hidden">
      <header className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-[#111]">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-4">
            {project?.systemType !== 'portfolio' && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{project?.name}</span>
                <span className="text-xs text-white/20">/</span>
                <span className="text-xs text-white/40">{activeFile?.path}</span>
              </div>
            )}
            {project?.systemType === 'portfolio' && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Portfolio Editor</span>
                <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 text-[10px] font-bold uppercase tracking-wider ml-2">
                  Structured UI
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isReadOnly && (
            <button
              onClick={handleFork}
              disabled={isForking}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition-all disabled:opacity-50"
            >
              {isForking ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitFork className="w-3 h-3" />}
              Fork to Edit
            </button>
          )}
          {project?.systemType !== 'portfolio' && (
            <>
              <button 
                onClick={handleRun}
                disabled={isRunning}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white text-xs font-bold transition-all disabled:opacity-50",
                  isRunning && "animate-pulse"
                )}
              >
                {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                {isRunning ? "Running..." : "Run"}
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 text-xs font-bold transition-all">
                <Share2 className="w-3 h-3" />
                Share
              </button>
              {!isReadOnly && (
                <button 
                  onClick={() => setIsDeployModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  Deploy
                </button>
              )}
            </>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Tabs */}
        {project?.systemType !== 'portfolio' && (
          <div className="w-12 border-r border-white/5 bg-[#0a0a0a] flex flex-col items-center py-4 gap-4 flex-shrink-0">
            <button
              onClick={() => togglePanel("explorer")}
              className={cn(
                "p-2 rounded-lg transition-all",
                activePanel === "explorer" ? "bg-blue-600/10 text-blue-500" : "text-white/20 hover:text-white/60"
              )}
              title="Explorer"
            >
              <Files className="w-5 h-5" />
            </button>
            <button
              onClick={() => togglePanel("git")}
              className={cn(
                "p-2 rounded-lg transition-all",
                activePanel === "git" ? "bg-blue-600/10 text-blue-500" : "text-white/20 hover:text-white/60"
              )}
              title="Source Control"
            >
              <GitBranch className="w-5 h-5" />
            </button>
            <button
              onClick={() => togglePanel("terminal")}
              className={cn(
                "p-2 rounded-lg transition-all",
                activePanel === "terminal" ? "bg-blue-600/10 text-blue-500" : "text-white/20 hover:text-white/60"
              )}
              title="Terminal"
            >
              <Code2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => togglePanel("settings")}
              className={cn(
                "p-2 rounded-lg transition-all",
                activePanel === "settings" ? "bg-blue-600/10 text-blue-500" : "text-white/20 hover:text-white/60"
              )}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Main Content Area: Split Screen */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Explorer + Editor + Terminal */}
          <div className="flex-1 flex flex-col border-r border-white/5 overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
              {/* Explorer Panel */}
              {project?.systemType !== 'portfolio' && activePanel === "explorer" && (
                <Sidebar
                  files={files}
                  activeFileId={activeFileId}
                  onSelectFile={setActiveFileId}
                  projectId={projectId}
                  readOnly={isReadOnly}
                />
              )}

              {/* Git Panel */}
              {project?.systemType !== 'portfolio' && activePanel === "git" && (
                <div className="w-80 border-r border-white/5">
                  <GitPanel projectId={projectId} files={files} />
                </div>
              )}

              {/* Settings Panel */}
              {project?.systemType !== 'portfolio' && activePanel === "settings" && (
                <SettingsPanel 
                  projectId={projectId} 
                  project={project} 
                  files={files} 
                  onDelete={onBack}
                />
              )}

              {/* Editor Area */}
              <main className="flex-1 relative bg-[#0a0a0a] flex flex-col overflow-hidden">
                <div className="flex-1 relative">
                  {project?.systemType === 'portfolio' ? (
                    <PortfolioEditor 
                      project={project} 
                      files={files} 
                      onUpdateFile={handleUpdateFile} 
                    />
                  ) : activeFile ? (
                    <Editor
                      file={activeFile}
                      onChange={handleCodeChange}
                      projectId={projectId}
                      readOnly={isReadOnly}
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center bg-[#0a0a0a] p-12 text-center">
                      <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8">
                        <Files className="w-10 h-10 text-white/20" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">No file selected</h2>
                      <p className="text-white/40 max-w-sm mb-8">
                        Select a file from the explorer or create a new one to start building your project.
                      </p>
                      
                      {!isReadOnly && (
                        <div className="flex flex-col sm:flex-row gap-4">
                          <button
                            onClick={() => handleCreateFile("index.html")}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95"
                          >
                            <Plus className="w-5 h-5" />
                            Create index.html
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </main>
            </div>

            {/* Terminal at the bottom of the Left Pane */}
            {activePanel === "terminal" && (
              <motion.div 
                initial={{ y: 256 }}
                animate={{ y: 0 }}
                exit={{ y: 256 }}
                className="h-64 border-t border-white/5 bg-[#050505] flex flex-col relative z-10 shadow-2xl"
              >
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#0a0a0a]">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-white/40">
                      <Terminal className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Terminal</span>
                    </div>
                    <div className="h-3 w-[1px] bg-white/5" />
                    <div className="flex items-center gap-2">
                      <div className={cn("w-1.5 h-1.5 rounded-full", isRunning ? "bg-yellow-500 animate-pulse" : "bg-green-500")} />
                      <span className="text-[9px] text-white/20 font-bold uppercase tracking-tighter">
                        {isRunning ? "Executing" : "Ready"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setRunOutput([])}
                      className="text-[9px] font-bold uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors px-2 py-1 rounded hover:bg-white/5"
                    >
                      Clear
                    </button>
                    <button 
                      onClick={() => setActivePanel(null)}
                      className="p-1 text-white/20 hover:text-white transition-colors hover:bg-white/5 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-4 font-mono text-[11px] overflow-y-auto custom-scrollbar">
                  <div className="space-y-1.5">
                    {runOutput.map((log, i) => (
                      <div key={i} className="flex gap-3 group">
                        <span className="text-white/10 select-none shrink-0 tabular-nums">{log.timestamp}</span>
                        <span className={cn(
                          "break-all leading-relaxed",
                          log.type === "system" && "text-blue-400/60 font-bold",
                          log.type === "info" && "text-blue-400",
                          log.type === "success" && "text-green-400",
                          log.type === "error" && "text-red-400",
                          log.type === "output" && "text-white/80"
                        )}>
                          {log.type === "error" && <span className="mr-2">✖</span>}
                          {log.type === "success" && <span className="mr-2">✔</span>}
                          {log.message}
                        </span>
                      </div>
                    ))}
                    {isRunning && (
                      <div className="flex gap-3 animate-pulse">
                        <span className="text-white/10 select-none shrink-0">--:--:--</span>
                        <div className="flex items-center gap-2 text-white/40 italic">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Processing...
                        </div>
                      </div>
                    )}
                    <div ref={terminalEndRef} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Pane: Live Preview */}
          {project?.systemType !== 'portfolio' && (
            <div className="w-1/2 bg-[#050505] hidden md:flex flex-col border-l border-white/5">
              <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-[#0a0a0a]">
                <div className="flex items-center gap-2 text-white/40">
                  <Globe className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Live Preview</span>
                </div>
              </div>
              <div className="flex-1">
                <PreviewPanel projectId={projectId} files={files} entryFile={project?.entryFile} />
              </div>
            </div>
          )}
        </div>
      </div>

      <DeployModal 
        isOpen={isDeployModalOpen} 
        onClose={() => setIsDeployModalOpen(false)} 
        projectName={project?.name || "Project"} 
        projectId={projectId}
        files={files}
      />
    </div>
  );
}
