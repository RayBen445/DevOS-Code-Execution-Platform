import { useState, useEffect } from "react";
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
import { FileData, Project } from "../types";
import { cn } from "../lib/utils";
import { Loader2, ArrowLeft, Share2, Play, GitBranch, Files, Rocket, Terminal, X, GitFork, Globe, Settings, Code2, Plus, Upload } from "lucide-react";

interface IDEProps {
  projectId: string;
  onBack: () => void;
}

type PanelType = "explorer" | "git" | "terminal" | "preview" | "settings" | null;

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
  const [runOutput, setRunOutput] = useState<string[]>([]);
  const [isForking, setIsForking] = useState(false);

  const isReadOnly = project && user && project.ownerId !== user.uid && !project.collaborators.includes(user.uid);

  useEffect(() => {
    if (!user || !projectId) return;

    // Join socket room
    socket.connect();
    socket.emit("join-project", projectId);

    // Fetch project metadata
    const projectRef = doc(db, "projects", projectId);
    const unsubProject = onSnapshot(projectRef, (snapshot) => {
      if (snapshot.exists()) {
        setProject({ id: snapshot.id, ...snapshot.data() } as Project);
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

  const handleCodeChange = async (content: string) => {
    if (!activeFileId || !projectId || isReadOnly) return;

    // Update Firestore (debounced in real app, but direct for now)
    const fileRef = doc(db, "projects", projectId, "files", activeFileId);
    await updateDoc(fileRef, {
      content,
      updatedAt: serverTimestamp()
    });

    // Notify others via socket
    socket.emit("code-change", {
      projectId,
      fileId: activeFileId,
      content,
      userId: user?.uid
    });
  };

  const handleRun = async () => {
    if (!activeFile) return;
    
    setIsRunning(true);
    setActivePanel("terminal");
    setRunOutput(["[System] Starting execution...", `[System] Running ${activeFile.name}...`]);

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
      setRunOutput(prev => [...prev, ...data.logs]);
    } catch (error: any) {
      setRunOutput(prev => [...prev, `[Error] ${error.message}`]);
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

      await updateDoc(doc(db, "projects", project.id), {
        forksCount: increment(1)
      });

      // Redirect to new project
      window.location.reload(); // Simplest way to reload with new projectId if we don't have a router state for it here
    } catch (error) {
      console.error("Error forking project:", error);
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
    } catch (error) {
      console.error("Error creating file:", error);
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
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
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
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{project?.name}</span>
            <span className="text-xs text-white/20">/</span>
            <span className="text-xs text-white/40">{activeFile?.path}</span>
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
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Tabs */}
        <div className="w-12 border-r border-white/5 bg-[#0a0a0a] flex flex-col items-center py-4 gap-4">
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
            onClick={() => togglePanel("preview")}
            className={cn(
              "p-2 rounded-lg transition-all",
              activePanel === "preview" ? "bg-blue-600/10 text-blue-500" : "text-white/20 hover:text-white/60"
            )}
            title="Preview"
          >
            <Globe className="w-5 h-5" />
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

        {/* Panel Content */}
        {activePanel === "explorer" && (
          <Sidebar
            files={files}
            activeFileId={activeFileId}
            onSelectFile={setActiveFileId}
            projectId={projectId}
            readOnly={isReadOnly}
          />
        )}

        {activePanel === "git" && (
          <div className="w-80 border-r border-white/5">
            <GitPanel projectId={projectId} files={files} />
          </div>
        )}

        {activePanel === "preview" && (
          <PreviewPanel projectId={projectId} files={files} />
        )}

        {activePanel === "settings" && (
          <SettingsPanel 
            projectId={projectId} 
            project={project} 
            files={files} 
            onDelete={onBack}
          />
        )}

        <main className="flex-1 relative bg-[#0a0a0a] flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            {activeFile ? (
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
                      onClick={() => handleCreateFile("index.js")}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95"
                    >
                      <Plus className="w-5 h-5" />
                      Create index.js
                    </button>
                    <label className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all active:scale-95 cursor-pointer relative overflow-hidden">
                      {isUploading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                          <span>Uploading {Math.round(uploadProgress)}%</span>
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                            <div 
                              className="h-full bg-blue-500 transition-all duration-300" 
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          Upload File
                        </>
                      )}
                      <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {activePanel === "terminal" && (
            <div className="h-64 border-t border-white/5 bg-[#050505] flex flex-col absolute bottom-0 left-0 right-0 z-10">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#0a0a0a]">
                <div className="flex items-center gap-2 text-white/40">
                  <Terminal className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Terminal</span>
                </div>
                <button 
                  onClick={() => setActivePanel(null)}
                  className="text-white/20 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1">
                {runOutput.map((line, i) => (
                  <div key={i} className={cn(
                    line.startsWith("[System]") ? "text-blue-400/60" : "text-white/80"
                  )}>
                    {line}
                  </div>
                ))}
                {isRunning && (
                  <div className="flex items-center gap-2 text-white/40 italic">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Executing...
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <DeployModal 
        isOpen={isDeployModalOpen} 
        onClose={() => setIsDeployModalOpen(false)} 
        projectName={project?.name || "Project"} 
        projectId={projectId}
      />
    </div>
  );
}
