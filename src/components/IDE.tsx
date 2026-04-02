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
import { Loader2, ArrowLeft, Share2, Play, GitBranch, Files, Rocket, Terminal, X, GitFork, Globe, Settings, Code2, Plus, Upload, Maximize2, Minimize2, User as UserIcon, Eye, Copy, Clipboard, Menu, Save, Check } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface IDEProps {
  projectId: string;
  onBack: () => void;
}

type PanelType = "explorer" | "git" | "terminal" | "preview" | "settings" | null;

interface LogEntry {
  type: "system" | "success" | "error" | "info" | "output" | "warning";
  message: string;
  timestamp: string;
}

const SPINNER_FRAMES = ["⠄", "⡀", "⡈", "⡐", "⡠", "⣀", "⣄", "⣤", "⣦", "⣶", "⣿", "⡿", "⠿", "⠟", "⠛", "⠉"];

const AUTO_SAVE_DELAY_MS = 2500;

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
  const [terminalInput, setTerminalInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [isExecRunning, setIsExecRunning] = useState(false);
  const [terminalInitialized, setTerminalInitialized] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isSaved, setIsSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [openFileIds, setOpenFileIds] = useState<string[]>([]);
  const [previewSaveKey, setPreviewSaveKey] = useState(0);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = () => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activePanel === "terminal") {
      scrollToBottom();
      terminalInputRef.current?.focus();
      if (!terminalInitialized) {
        setTerminalInitialized(true);
        const ts = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setRunOutput(prev => [
          ...prev,
          { type: "info", message: "DevOS Terminal v1.0", timestamp: ts },
          { type: "output", message: "Type 'help' to see available commands.", timestamp: ts },
        ]);
      }
    }
  }, [runOutput, activePanel, terminalInitialized]);

  const addLog = (type: LogEntry["type"], message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setRunOutput(prev => [...prev, { type, message, timestamp }]);
  };

  const updateLastLog = (type: LogEntry["type"], message: string) => {
    setRunOutput(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, type, message }];
    });
  };

  const animateStep = async (text: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setRunOutput(prev => [...prev, { type: "info", message: `${SPINNER_FRAMES[0]} ${text}`, timestamp }]);
    for (let f = 1; f < SPINNER_FRAMES.length; f++) {
      await new Promise(r => setTimeout(r, 80));
      updateLastLog("info", `${SPINNER_FRAMES[f]} ${text}`);
    }
    updateLastLog("info", `${SPINNER_FRAMES[SPINNER_FRAMES.length - 1]} ${text}`);
    await new Promise(r => setTimeout(r, 150));
  };

  const handleTerminalDeploy = async () => {
    const hasIndexHtml = files.some(f => f.name.toLowerCase() === "index.html");
    if (!hasIndexHtml) {
      addLog("error", "✖ Deployment failed");
      addLog("error", "Reason: Missing index.html");
      return;
    }

    await animateStep("Preparing project...");
    await animateStep("Validating files...");
    await animateStep("Building preview...");
    await animateStep("Optimizing assets...");
    await animateStep("Uploading deployment...");

    try {
      if (!auth.currentUser) throw new Error("Not authenticated");

      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const username = userDoc.exists() ? userDoc.data().username : null;
      if (!username) throw new Error("Please set a username in Profile Settings before deploying.");

      const projectDoc = await getDoc(doc(db, "projects", projectId));
      const projectData = projectDoc.data();
      const projectSlug = projectData?.projectSlug || `${(project?.name || "project").toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).substring(2, 7)}`;
      const url = `${window.location.origin}/u/${username}/${projectSlug}`;
      const htmlFile = files.find(f => f.name.toLowerCase() === "index.html");
      const entryFile = htmlFile?.path || "index.html";

      await updateDoc(doc(db, "projects", projectId), {
        projectSlug,
        deployUrl: url,
        liveUrl: url,
        title: project?.name || "Project",
        ownerUsername: username,
        entryFile,
        isPublic: true,
        updatedAt: serverTimestamp()
      });

      addLog("success", "✔ Deployment successful");
      addLog("info", `🌐 ${url}`);
    } catch (error: any) {
      addLog("error", "✖ Deployment failed");
      addLog("error", `Reason: ${error.message}`);
    }
  };

  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd || isExecRunning) return;

    setCmdHistory(prev => [cmd, ...prev]);
    setHistoryIdx(-1);
    setTerminalInput("");

    const projectName = project?.name || "project";
    addLog("system", `devos ▶ ${projectName} $ ${cmd}`);
    setIsExecRunning(true);

    // clear
    if (cmd === "clear" || cmd === "cls") {
      setRunOutput([]);
      setIsExecRunning(false);
      return;
    }

    // help
    if (cmd === "help") {
      addLog("info", "Available commands:");
      addLog("output", "  save      Save project and refresh preview");
      addLog("output", "  deploy    Deploy project to DevOS (live URL)");
      addLog("output", "  sync      Sync and deploy project");
      addLog("output", "  run       Run active file in terminal");
      addLog("output", "  clear     Clear terminal output");
      addLog("output", "  help      Show this help");
      addLog("info", "Tips:");
      addLog("output", "  • Use Preview panel for instant live rendering");
      addLog("output", "  • Use 'save' then 'deploy' to publish your project");
      addLog("output", "  • Use ZIP upload to import entire projects");
      setIsExecRunning(false);
      setTimeout(() => terminalInputRef.current?.focus(), 0);
      return;
    }

    // Block npm/yarn/pnpm package manager commands
    const npmBlocked = [
      /^npm\s+install\b/i,
      /^npm\s+run\b/i,
      /^npm\s+start\b/i,
      /^yarn\b/i,
      /^pnpm\b/i,
    ];
    if (npmBlocked.some(p => p.test(cmd))) {
      addLog("error", "npm commands are not supported in DevOS.");
      addLog("warning", "Suggestions:");
      addLog("output", "  • Use Preview panel for instant rendering");
      addLog("output", "  • Use 'deploy' command for a live URL");
      addLog("output", "  • Use Templates or ZIP upload to import projects");
      setIsExecRunning(false);
      setTimeout(() => terminalInputRef.current?.focus(), 0);
      return;
    }

    // save
    if (cmd === "save") {
      addLog("info", "Saving project...");
      try {
        await handleSave();
        addLog("success", "✔ Project saved successfully.");
      } catch (error: any) {
        addLog("error", `✖ Save failed: ${error.message}`);
      }
      setIsExecRunning(false);
      setTimeout(() => terminalInputRef.current?.focus(), 0);
      return;
    }

    // deploy / sync
    if (cmd === "deploy" || cmd === "sync") {
      await handleTerminalDeploy();
      setIsExecRunning(false);
      setTimeout(() => terminalInputRef.current?.focus(), 0);
      return;
    }

    // run — execute active file
    if (cmd === "run") {
      await handleRun();
      setIsExecRunning(false);
      setTimeout(() => terminalInputRef.current?.focus(), 0);
      return;
    }

    // Other commands → send to /api/terminal
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/terminal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ command: cmd }),
      });

      const rawText = await response.text();
      let data: { stdout: string; stderr: string; exitCode: number };
      try {
        data = JSON.parse(rawText);
      } catch {
        addLog("error", "Failed to parse server response");
        addLog("output", rawText.slice(0, 300));
        return;
      }

      if (!response.ok) {
        addLog("error", (data as any).error || "Command failed");
        return;
      }

      if (data.stdout) {
        data.stdout.trimEnd().split("\n").forEach((line) => addLog("output", line));
      }
      if (data.stderr) {
        data.stderr.trimEnd().split("\n").forEach((line) => addLog("error", line));
      }
      if (!data.stdout && !data.stderr) {
        addLog("info", `(exited with code ${data.exitCode})`);
      } else if (data.exitCode !== 0) {
        addLog("error", `Process exited with code ${data.exitCode}`);
      }
    } catch (err: any) {
      addLog("error", err.message || "Connection error");
    } finally {
      setIsExecRunning(false);
      setTimeout(() => terminalInputRef.current?.focus(), 0);
    }
  };

  const handleTerminalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const next = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(next);
      setTerminalInput(cmdHistory[next] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(historyIdx - 1, -1);
      setHistoryIdx(next);
      setTerminalInput(next === -1 ? "" : (cmdHistory[next] ?? ""));
    }
  };

  const isReadOnly = project && user && project.ownerId !== user.uid && !project.collaborators.includes(user.uid);
  const isDeployed = !!project?.deployUrl;

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
        setOpenFileIds(prev => prev.length === 0 ? [fileList[0].id] : prev);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/files`);
    });

    return () => {
      unsubProject();
      unsubFiles();
      socket.disconnect();
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
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

  const openFileInTab = (id: string) => {
    setActiveFileId(id);
    setOpenFileIds(prev => prev.includes(id) ? prev : [...prev, id]);
  };

  const closeFileTab = (id: string) => {
    setOpenFileIds(prev => {
      const next = prev.filter(fid => fid !== id);
      if (id === activeFileId) {
        const idx = prev.indexOf(id);
        const newActive = next[idx] ?? next[idx - 1] ?? null;
        setActiveFileId(newActive);
      }
      return next;
    });
  };

  const handleCodeChange = async (content: string) => {
    if (!activeFileId) return;
    setIsSaved(false);
    await handleUpdateFile(activeFileId, content);

    // Schedule auto-save after 2.5s of idle
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(true);
    }, AUTO_SAVE_DELAY_MS);
  };

  const handleSave = async (silent = false) => {
    if (!projectId || isReadOnly || isSaving) return;
    // Cancel any pending auto-save timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "projects", projectId), {
        savedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setIsSaved(true);
      setPreviewSaveKey(k => k + 1);
      if (!silent) toast.success("Project saved");
    } catch (error) {
      console.error("Error saving project:", error);
      if (!silent) toast.error("Failed to save project");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRun = async () => {
    if (!activeFile) return;

    setIsRunning(true);
    setActivePanel("terminal");
    addLog("system", `devos ▶ ${project?.name || "project"} $ run`);

    // Block unsupported file types — .tsx/.jsx are React components; use Preview instead
    const blockedExtensions = [".tsx", ".jsx"];
    const fileExt = activeFile.name.includes(".") ? `.${activeFile.name.split(".").pop()?.toLowerCase()}` : "";
    if (blockedExtensions.includes(fileExt)) {
      addLog("error", "✖ Execution failed");
      addLog("error", `File: ${activeFile.path}`);
      addLog("error", `Reason: Unsupported file type (${fileExt}). Use Preview instead.`);
      setIsRunning(false);
      return;
    }

    addLog("info", `Running ${activeFile.name}...`);

    // HTML / CSS / JSON → render in Preview
    if (activeFile.language === "html" || activeFile.language === "css" || activeFile.language === "json") {
      await new Promise(r => setTimeout(r, 400));
      addLog("info", `[Frontend] ${activeFile.name} is a client-side file.`);
      addLog("info", "[Frontend] Rendering updates in the Live Preview panel...");
      addLog("success", "✔ Preview updated successfully.");
      setIsRunning(false);
      return;
    }

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ language: activeFile.language, content: activeFile.content })
      });

      const rawText = await response.text();
      let data: { logs?: string[]; error?: string };
      try {
        data = JSON.parse(rawText);
      } catch {
        addLog("error", "Failed to parse execution response");
        addLog("output", rawText.slice(0, 300));
        setIsRunning(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Execution failed");
      }

      (data.logs || []).forEach((log: string) => addLog("output", log));
      addLog("success", "✔ Execution completed successfully.");
    } catch (error: any) {
      addLog("error", "✖ Execution failed");
      addLog("error", error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const togglePanel = (panel: PanelType) => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  const toggleFocusMode = () => {
    setIsFocusMode(prev => {
      if (!prev) setActivePanel(null);
      return !prev;
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleContextMenuCopy = async () => {
    const selection = window.getSelection()?.toString();
    if (selection) {
      await navigator.clipboard.writeText(selection).catch(() => {});
      toast.success("Copied to clipboard");
    }
    setContextMenu(null);
  };

  const handleContextMenuPaste = async () => {
    const text = await navigator.clipboard.readText().catch(() => null);
    if (text && activeFile && !isReadOnly) {
      await handleUpdateFile(activeFile.id, (activeFile.content ?? "") + text);
    }
    setContextMenu(null);
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
      openFileInTab(docRef.id);
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
      <div className="h-screen flex items-center justify-center bg-[#0D1117]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col bg-[#0D1117] overflow-hidden"
      onClick={() => contextMenu && setContextMenu(null)}
    >
      <header className="h-12 border-b border-[#30363D] flex items-center justify-between px-4 bg-[#161B22] flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            {project?.systemType !== 'portfolio' && (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-bold text-white truncate max-w-[100px] md:max-w-none">{project?.name}</span>
                {activeFile?.path && (
                  <>
                    <span className="text-xs text-white/20 flex-shrink-0">/</span>
                    <span className="text-xs text-white/40 truncate max-w-[80px] md:max-w-none">{activeFile?.path}</span>
                  </>
                )}
              </div>
            )}
            {project?.systemType === 'portfolio' && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Portfolio Editor</span>
                <span className="hidden sm:inline px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 text-[10px] font-bold uppercase tracking-wider">
                  Structured UI
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          {isReadOnly && (
            <button
              onClick={handleFork}
              disabled={isForking}
              className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition-all disabled:opacity-50"
            >
              {isForking ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitFork className="w-3 h-3" />}
              <span className="hidden sm:inline">Fork to Edit</span>
            </button>
          )}
          {project?.systemType !== 'portfolio' && (
            <>
              <button 
                onClick={handleRun}
                disabled={isRunning}
                className={cn(
                  "flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 rounded-lg bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white text-xs font-bold transition-all disabled:opacity-50",
                  isRunning && "animate-pulse"
                )}
              >
                {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                <span className="hidden sm:inline">{isRunning ? "Running..." : "Run"}</span>
              </button>
              {!isReadOnly && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  title={isSaved ? "Project saved" : "Save project"}
                  className={cn(
                    "flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50",
                    isSaved
                      ? "bg-green-600/10 text-green-500"
                      : "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                  )}
                >
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : isSaved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                  <span className="hidden sm:inline">{isSaving ? "Saving..." : isSaved ? "Saved" : "Save"}</span>
                </button>
              )}
              <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 text-xs font-bold transition-all">
                <Share2 className="w-3 h-3" />
                Share
              </button>
              {!isReadOnly && (
                <button 
                  onClick={() => setIsDeployModalOpen(true)}
                  className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                >
                  {isDeployed ? <Globe className="w-3.5 h-3.5" /> : <Rocket className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{isDeployed ? "Sync" : "Deploy"}</span>
                </button>
              )}
            </>
          )}
          {/* Focus mode toggle — only for non-portfolio and desktop */}
          {project?.systemType !== 'portfolio' && (
            <button
              onClick={toggleFocusMode}
              title={isFocusMode ? "Exit Focus Mode" : "Focus Mode"}
              className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors hidden md:flex"
            >
              {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
          {/* Mobile sidebar toggle */}
          {project?.systemType !== 'portfolio' && (
            <button
              onClick={() => setIsMobileSidebarOpen(v => !v)}
              title="Files & Tools"
              className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors md:hidden"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile sidebar backdrop */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-30 md:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar icon tabs — hidden on mobile (controlled via hamburger), hidden in focus mode */}
        {project?.systemType !== 'portfolio' && !isFocusMode && (
          <div className="hidden md:flex w-12 border-r border-[#30363D] bg-[#0D1117] flex-col items-center py-4 gap-4 flex-shrink-0">
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

        {/* Mobile slide-in sidebar drawer */}
        <AnimatePresence>
          {isMobileSidebarOpen && project?.systemType !== 'portfolio' && (
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 h-full w-72 bg-[#161B22] border-r border-[#30363D] z-40 flex flex-col md:hidden shadow-2xl"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363D]">
                <span className="text-xs font-bold uppercase tracking-widest text-white/40">Files & Tools</span>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Tab selector */}
              <div className="flex border-b border-white/5">
                {[
                  { panel: "explorer" as PanelType, icon: Files, label: "Files" },
                  { panel: "git" as PanelType, icon: GitBranch, label: "Git" },
                  { panel: "terminal" as PanelType, icon: Terminal, label: "Terminal" },
                  { panel: "settings" as PanelType, icon: Settings, label: "Settings" },
                ].map(({ panel, icon: Icon, label }) => (
                  <button
                    key={panel}
                    onClick={() => { setActivePanel(panel); setIsMobileSidebarOpen(false); }}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors",
                      activePanel === panel ? "text-blue-400 border-b-2 border-blue-500" : "text-white/30 hover:text-white/60"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto">
                {activePanel === "explorer" && (
                  <Sidebar
                    files={files}
                    activeFileId={activeFileId}
                    onSelectFile={(id) => { openFileInTab(id); setIsMobileSidebarOpen(false); }}
                    projectId={projectId}
                    readOnly={isReadOnly}
                  />
                )}
                {activePanel === "git" && <GitPanel projectId={projectId} files={files} />}
                {activePanel === "settings" && (
                  <SettingsPanel projectId={projectId} project={project} files={files} onDelete={onBack} />
                )}
                {activePanel === "terminal" && (
                  <p className="p-4 text-xs text-white/30">Terminal is shown below the editor.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area: Split Screen */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Explorer + Editor + Terminal */}
          <div className="flex-1 flex flex-col border-r border-[#30363D] overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
              {/* Explorer Panel — hidden on mobile (use drawer), hidden in focus mode */}
              {project?.systemType !== 'portfolio' && activePanel === "explorer" && !isFocusMode && (
                <div className="hidden md:flex">
                  <Sidebar
                    files={files}
                    activeFileId={activeFileId}
                    onSelectFile={openFileInTab}
                    projectId={projectId}
                    readOnly={isReadOnly}
                  />
                </div>
              )}

              {/* Git Panel — hidden on mobile, hidden in focus mode */}
              {project?.systemType !== 'portfolio' && activePanel === "git" && !isFocusMode && (
                <div className="hidden md:flex w-80 border-r border-white/5">
                  <GitPanel projectId={projectId} files={files} />
                </div>
              )}

              {/* Settings Panel — hidden on mobile, hidden in focus mode */}
              {project?.systemType !== 'portfolio' && activePanel === "settings" && !isFocusMode && (
                <div className="hidden md:flex">
                  <SettingsPanel 
                    projectId={projectId} 
                    project={project} 
                    files={files} 
                    onDelete={onBack}
                  />
                </div>
              )}

              {/* Editor Area */}
              <main
                className="flex-1 relative bg-[#0D1117] flex flex-col overflow-hidden"
                onContextMenu={handleContextMenu}
              >
                {/* File tabs */}
                {project?.systemType !== 'portfolio' && openFileIds.filter(id => files.some(f => f.id === id)).length > 0 && (
                  <div className="flex items-center overflow-x-auto border-b border-[#30363D] bg-[#161B22] flex-shrink-0 custom-scrollbar">
                    {openFileIds.filter(id => files.some(f => f.id === id)).map(fileId => {
                      const file = files.find(f => f.id === fileId);
                      if (!file) return null;
                      const isActive = fileId === activeFileId;
                      return (
                        <div
                          key={fileId}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer border-r border-[#30363D] flex-shrink-0 group select-none min-w-0",
                            isActive
                              ? "bg-[#0D1117] text-white border-t-2 border-t-[#2F81F7] pt-[6px]"
                              : "text-white/40 hover:text-white/70 hover:bg-white/5"
                          )}
                          onClick={() => setActiveFileId(fileId)}
                        >
                          <span className="truncate max-w-[120px]">{file.name}</span>
                          {!isReadOnly && (
                            <button
                              onClick={(e) => { e.stopPropagation(); closeFileTab(fileId); }}
                              className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all flex-shrink-0 ml-0.5"
                              title="Close tab"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

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
                    <div className="h-full flex flex-col items-center justify-center bg-[#0D1117] p-8 md:p-12 text-center">
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

                {/* Custom context menu */}
                <AnimatePresence>
                  {contextMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.1 }}
                      style={{ top: contextMenu.y, left: contextMenu.x }}
                      className="fixed z-50 bg-[#161B22] border border-[#30363D] rounded-lg shadow-2xl overflow-hidden min-w-[140px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={handleContextMenuCopy}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </button>
                      {!isReadOnly && (
                        <button
                          onClick={handleContextMenuPaste}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                        >
                          <Clipboard className="w-3.5 h-3.5" />
                          Paste
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </main>
            </div>

            {/* Terminal — hidden in focus mode; on mobile it shows as a bottom sheet */}
            {activePanel === "terminal" && !isFocusMode && (
              <motion.div 
                initial={{ y: 256 }}
                animate={{ y: 0 }}
                exit={{ y: 256 }}
                className="h-64 md:h-72 border-t border-[#30363D] bg-[#0D1117] flex flex-col relative z-10 shadow-2xl"
              >
                {/* Terminal title bar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#30363D] bg-[#161B22] flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-white/40">
                      <Terminal className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">DevOS Terminal v1.0</span>
                    </div>
                    <div className="h-3 w-[1px] bg-white/5" />
                    <div className="flex items-center gap-2">
                      <div className={cn("w-1.5 h-1.5 rounded-full", (isRunning || isExecRunning) ? "bg-yellow-500 animate-pulse" : "bg-green-500")} />
                      <span className="text-[9px] text-white/20 font-bold uppercase tracking-tighter">
                        {(isRunning || isExecRunning) ? "Running" : "Ready"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { setRunOutput([]); setCmdHistory([]); setHistoryIdx(-1); setTerminalInitialized(false); }}
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

                {/* Output log */}
                <div
                  className="flex-1 px-4 py-3 font-mono text-[11px] overflow-y-auto custom-scrollbar"
                  onClick={() => terminalInputRef.current?.focus()}
                >
                  <div className="space-y-1.5">
                    {runOutput.length === 0 && (
                      <div className="text-white/20 italic text-[10px]">
                        DevOS Terminal v1.0 — Type 'help' for available commands. Use ↑/↓ for history.
                      </div>
                    )}
                    {runOutput.map((log, i) => (
                      <div key={i} className="flex gap-3 group">
                        <span className="text-white/10 select-none shrink-0 tabular-nums">{log.timestamp}</span>
                        <span className={cn(
                          "break-all leading-relaxed whitespace-pre-wrap",
                          log.type === "system" && "text-green-400/80 font-bold",
                          log.type === "info" && "text-blue-400",
                          log.type === "success" && "text-green-400",
                          log.type === "error" && "text-red-400",
                          log.type === "warning" && "text-yellow-400",
                          log.type === "output" && "text-white/80"
                        )}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                    {(isRunning || isExecRunning) && (
                      <div className="flex gap-3 animate-pulse">
                        <span className="text-white/10 select-none shrink-0">--:--:--</span>
                        <div className="flex items-center gap-2 text-white/40 italic">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Running...
                        </div>
                      </div>
                    )}
                    <div ref={terminalEndRef} />
                  </div>
                </div>

                {/* Command input */}
                <form
                  onSubmit={handleTerminalSubmit}
                  className="flex items-center gap-2 px-4 py-2 border-t border-[#30363D] bg-[#161B22] flex-shrink-0"
                >
                  <span className="text-green-400 font-mono text-[11px] font-bold select-none flex-shrink-0 whitespace-nowrap">
                    devos ▶ {project?.name || "project"} $
                  </span>
                  <input
                    ref={terminalInputRef}
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    onKeyDown={handleTerminalKeyDown}
                    disabled={isExecRunning || isRunning}
                    placeholder={isExecRunning || isRunning ? "Running…" : ""}
                    className="flex-1 bg-transparent outline-none font-mono text-[11px] text-white placeholder-white/20 disabled:opacity-50"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {(isExecRunning || isRunning) && (
                    <Loader2 className="w-3 h-3 text-white/30 animate-spin flex-shrink-0" />
                  )}
                </form>
              </motion.div>
            )}
          </div>

          {/* Right Pane: Live Preview — hidden on mobile, hidden in focus mode */}
          {project?.systemType !== 'portfolio' && !isFocusMode && (
            <div className="w-1/2 bg-[#0D1117] hidden md:flex flex-col border-l border-[#30363D]">
              <div className="h-10 border-b border-[#30363D] flex items-center justify-between px-4 bg-[#161B22]">
                <div className="flex items-center gap-2 text-white/40">
                  <Globe className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Live Preview</span>
                </div>
              </div>
              <div className="flex-1">
                <PreviewPanel projectId={projectId} files={files} entryFile={project?.entryFile} saveKey={previewSaveKey} />
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
