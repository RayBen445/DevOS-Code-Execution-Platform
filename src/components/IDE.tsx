import { useState, useEffect, useRef } from "react";
import { db, auth, handleFirestoreError, OperationType, storage } from "../lib/firebase";
import { collection, onSnapshot, doc, getDoc, updateDoc, setDoc, deleteDoc, serverTimestamp, addDoc, getDocs, increment, query, orderBy, limit } from "firebase/firestore";
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

import { FileData, Project, OrgMember, OrgMemberRole, PresenceUser, ActivityItem, DetectionResult, BuildJob } from "../types";
import { cn, generateAppId } from '../lib/utils';
import { subscribeOrgMembers, getOrgMember } from "../lib/orgService";
import { canPerform } from "../lib/rbacService";
import { logAudit } from "../lib/auditService";
import { detectProject, FRAMEWORK_BADGE_COLORS } from "../lib/detectionService";
import { hashFiles, shortHash } from "../lib/buildCacheService";
import { enqueueJob, subscribeProjectBuildJobs, buildPreviewUrl } from "../lib/buildQueueService";
import DeploymentDashboard from "./DeploymentDashboard";
import BuildStatusBadge from "./BuildStatusBadge";
import { Loader2, ArrowLeft, Share2, Play, GitBranch, Files, Rocket, Terminal, X, GitFork, Globe, Settings, Code2, Plus, Upload, Maximize2, Minimize2, User as UserIcon, Eye, Copy, Clipboard, Save, Check, RefreshCw, ExternalLink, Users, Building2, Crown, Shield, UserCheck, Activity, Clock, Puzzle } from "lucide-react";
import TerminalTabs from "./TerminalTabs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { emitBotEvent } from "../lib/botEngine";
import ErrorPanel from "./ErrorPanel";
import { validateProject } from "../lib/validationService";
import { ValidationResult } from "../types";
import ProjectAnalytics from "./ProjectAnalytics";

interface IDEProps {
  projectId: string;
  onBack: () => void;
}

type PanelType = "explorer" | "git" | "terminal" | "preview" | "deployments" | "settings" | "collaborators" | null;

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
  const [activeFileId, setActiveFileId] = useState<string | null>(() => {
    // Restore last active file for this specific project on mount
    try { return localStorage.getItem(`ide_file_${projectId}`) ?? null; } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<PanelType>(() => {
    try { return (localStorage.getItem(`ide_panel_${projectId}`) as PanelType) ?? "explorer"; } catch { return "explorer"; }
  });
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
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isSaved, setIsSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [openFileIds, setOpenFileIds] = useState<string[]>([]);
  const [previewSaveKey, setPreviewSaveKey] = useState(0);
  const [buildPreviewFiles, setBuildPreviewFiles] = useState<FileData[] | null>(null);
  const [fileModes, setFileModes] = useState<Record<string, "read" | "edit">>({});
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runAbortRef = useRef<AbortController | null>(null);
  const [terminalHeight, setTerminalHeight] = useState(240);
  const terminalResizeRef = useRef<boolean>(false);
  const terminalDragStartY = useRef<number>(0);
  const terminalDragStartH = useRef<number>(0);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validationHash, setValidationHash] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  // Mobile top-nav state (replaces slide-in drawer)
  type MobileTabId = "editor" | "files" | "preview" | "git" | "terminal" | "deployments" | "settings" | "collaborators";
  const [mobileTab, setMobileTab] = useState<MobileTabId>("editor");
  const touchStartX = useRef<number>(0);

  // Org-aware state
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [orgRole, setOrgRole] = useState<OrgMemberRole | null>(null);
  const [orgMembersLoading, setOrgMembersLoading] = useState(false);
  const [orgRoleLoading, setOrgRoleLoading] = useState(false);

  // Real-time collaboration state (org projects only)
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [realtimeConnected, setRealtimeConnected] = useState(true);
  const orgMembersRef = useRef<OrgMember[]>([]); // stable ref for use in closures
  const notifiedActivityIds = useRef<Set<string>>(new Set()); // prevents duplicate toasts
  const editDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Framework / command / output-dir detection — updated whenever files change
  const [detection, setDetection] = useState<DetectionResult | null>(null);

  // Build queue state
  const [buildJobs, setBuildJobs] = useState<BuildJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const botDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [botSuggestions, setBotSuggestions] = useState<string[]>([]);
  const autoOpenedInitialFileRef = useRef(false);

  // Splitter state
  const [splitWidth, setSplitWidth] = useState(50);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const splitDragStartX = useRef(0);
  const splitDragStartW = useRef(50);

  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
    splitDragStartX.current = e.clientX;
    splitDragStartW.current = splitWidth;
  };

  useEffect(() => {
    if (!isDraggingSplitter) return;
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - splitDragStartX.current;
      const deltaPercent = (deltaX / window.innerWidth) * 100;
      setSplitWidth(Math.max(20, Math.min(80, splitDragStartW.current + deltaPercent)));
    };
    const handleMouseUp = () => setIsDraggingSplitter(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplitter]);

  // Persist active file and panel to localStorage (per-project key)
  useEffect(() => {
    if (activeFileId) {
      try { localStorage.setItem(`ide_file_${projectId}`, activeFileId); } catch { /* storage full or private mode */ }
    }
  }, [activeFileId, projectId]);

  useEffect(() => {
    if (activePanel) {
      try { localStorage.setItem(`ide_panel_${projectId}`, activePanel); } catch { /* noop */ }
    }
  }, [activePanel, projectId]);

  // If no file is selected yet, auto-open a sensible default to reduce friction.
  useEffect(() => {
    if (autoOpenedInitialFileRef.current) return;
    if (activeFileId || files.length === 0) return;

    const preferred = files.find((f) => {
      const name = f.name.toLowerCase();
      const path = f.path.toLowerCase();
      return (
        name === "readme.md" ||
        name === "index.html" ||
        name === "app.tsx" ||
        name === "app.jsx" ||
        path.endsWith("readme.md")
      );
    });
    const fallback = [...files].sort((a, b) => a.name.localeCompare(b.name))[0];
    const target = preferred ?? fallback;
    if (!target) return;

    autoOpenedInitialFileRef.current = true;
    setActiveFileId(target.id);
    setOpenFileIds((prev) => (prev.includes(target.id) ? prev : [target.id, ...prev]));
  }, [activeFileId, files]);

  const scrollToBottom = () => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activePanel === "terminal" || mobileTab === "terminal") {
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
  }, [runOutput, activePanel, mobileTab, terminalInitialized]);

  const addLog = (type: LogEntry["type"], message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setRunOutput(prev => [...prev, { type, message, timestamp }]);
  };

  // Re-detect project type whenever the file list changes
  useEffect(() => {
    if (files.length > 0) {
      setDetection(detectProject(files));
    }
  }, [files]);

  // Audit log: preview_project when the preview panel is opened
  const prevActivePanel = useRef<string | null>(null);
  useEffect(() => {
    if (activePanel === "preview" && prevActivePanel.current !== "preview" && user && projectId) {
      logAudit({
        userId: user.uid,
        action: "preview_project",
        projectId,
        orgId: project?.ownerOrgId ?? null,
        metadata: { framework: detection?.framework ?? "Unknown" },
      });
    }
    prevActivePanel.current = activePanel;
  }, [activePanel]);

  // Subscribe to build jobs for this project
  useEffect(() => {
    if (!projectId) return;
    return subscribeProjectBuildJobs(projectId, setBuildJobs);
  }, [projectId]);

  // Listen for real-time build log events from the server via Socket.io
  useEffect(() => {
    const handleBuildLog = (payload: { jobId: string; level: string; message: string }) => {
      const typeMap: Record<string, LogEntry["type"]> = {
        info: "info",
        warning: "warning",
        error: "error",
        success: "success",
      };
      addLog(typeMap[payload.level] ?? "output", `[build] ${payload.message}`);
    };

    const handleBuildComplete = (payload: { jobId: string; status: string; previewUrl?: string }) => {
      if (payload.status === "success") {
        addLog("success", `✔ Build ${payload.jobId.slice(0, 8)} complete`);
        if (payload.previewUrl) addLog("info", `🔗 Preview: ${payload.previewUrl}`);
        toast.success("Build complete!");
      } else {
        addLog("error", `✖ Build ${payload.jobId.slice(0, 8)} failed`);
        toast.error("Build failed — check terminal");
      }
    };

    socket.on("build-log", handleBuildLog);
    socket.on("build-complete", handleBuildComplete);
    return () => {
      socket.off("build-log", handleBuildLog);
      socket.off("build-complete", handleBuildComplete);
    };
  }, []);

  const updateLastLog = (type: LogEntry["type"], message: string) => {
    setRunOutput(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, type, message }];
    });
  };

  const handleTerminalResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    terminalResizeRef.current = true;
    terminalDragStartY.current = e.clientY;
    terminalDragStartH.current = terminalHeight;
    const onMove = (ev: MouseEvent) => {
      if (!terminalResizeRef.current) return;
      const delta = terminalDragStartY.current - ev.clientY;
      setTerminalHeight(Math.max(120, Math.min(600, terminalDragStartH.current + delta)));
    };
    const onUp = () => {
      terminalResizeRef.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
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
    // Permission check via RBAC
    if (isOrgProject && !canPerform(orgRole, "deploy_project")) {
      addLog("error", "✖ Permission denied");
      addLog("error", "Reason: deploy_project requires developer role or higher.");
      return;
    }

    const det = detection ?? detectProject(files);
    const hasIndexHtml = files.some(f => f.name.toLowerCase() === "index.html");
    if (!hasIndexHtml && !det.hasPackageJson) {
      addLog("error", "✖ Deployment failed");
      addLog("error", "Reason: Missing both index.html and package.json — cannot determine deploy strategy");
      return;
    }

    if (det.framework !== "Unknown" && det.framework !== "Static") {
      addLog("info", `⚡ Detected framework: ${det.framework}`);
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
      const url = `${window.location.origin}/@${username}/${projectSlug}`;
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

      // Audit: deploy_project
      logAudit({
        userId: auth.currentUser.uid,
        action: "deploy_project",
        projectId,
        orgId: project?.ownerOrgId ?? null,
        metadata: {
          framework: det.framework,
          buildCommand: det.buildCommand,
          outputDir: det.outputDir,
          status: "success",
          url,
        },
      });
    } catch (error: any) {
      addLog("error", "✖ Deployment failed");
      addLog("error", `Reason: ${error.message}`);
      if (auth.currentUser) {
        logAudit({
          userId: auth.currentUser.uid,
          action: "deploy_project",
          projectId,
          orgId: project?.ownerOrgId ?? null,
          metadata: {
            framework: det.framework,
            status: "failed",
            error: error.message,
          },
        });
      }
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
      addLog("output", "  save              Save project and refresh preview");
      addLog("output", "  deploy            Deploy project to DevOS (live URL)");
      addLog("output", "  sync              Sync and deploy project");
      addLog("output", "  run               Run active file in terminal");
      addLog("output", "  clear             Clear terminal output");
      addLog("output", "  help              Show this help");
      addLog("info", "npm / node:");
      addLog("output", "  npm install       Install packages from package.json");
      addLog("output", "  npm install <pkg> Install a specific package");
      addLog("output", "  npm run <script>  Run a package.json script");
      addLog("output", "  node <file>       Run a Node.js file");
      addLog("info", "Tips:");
      addLog("output", "  • Use Preview panel for instant live rendering");
      addLog("output", "  • Use 'save' then 'deploy' to publish your project");
      addLog("output", "  • Use ZIP upload to import entire projects");
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

  const isOrgProject = project?.ownerType === "organization" && !!project?.ownerOrgId;

  // Mobile nav tabs definition (order matters for swipe)
  const mobileNavTabs = [
    { id: "editor" as MobileTabId, icon: Code2, label: "Editor" },
    { id: "files" as MobileTabId, icon: Files, label: "Files" },
    { id: "preview" as MobileTabId, icon: Eye, label: "Preview" },
    ...(isOrgProject ? [{ id: "collaborators" as MobileTabId, icon: Users, label: "Team" }] : []),
    { id: "git" as MobileTabId, icon: GitBranch, label: "Git" },
    { id: "terminal" as MobileTabId, icon: Terminal, label: "Term" },
    { id: "deployments" as MobileTabId, icon: Rocket, label: "Deploy" },
    { id: "settings" as MobileTabId, icon: Settings, label: "More" },
  ];

  // Swipe handler: horizontal swipe ≥ 60px switches to adjacent tab
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 60) return;
    const ids = mobileNavTabs.map(t => t.id);
    const cur = ids.indexOf(mobileTab);
    if (diff > 0 && cur < ids.length - 1) setMobileTab(ids[cur + 1]);
    else if (diff < 0 && cur > 0) setMobileTab(ids[cur - 1]);
  };

  // Org-aware: read-only if not a member, or personal project owned by someone else
  const isReadOnly = (() => {
    if (!project || !user) return true;
    if (project.ownerId === user.uid) return false; // owner always has full access
    if (isOrgProject) {
      // While the role is still loading, stay editable so the user isn't
      // incorrectly blocked by a temporary null role.
      if (orgRoleLoading) return false;
      if (orgRole === null) return true;
      return !canPerform(orgRole, "update_project");
    }
    // Personal project: must be owner or collaborator
    return !project.collaborators.includes(user.uid);
  })();

  // Can deploy: owner always; in org projects use RBAC deploy_project permission
  const canDeploy = (() => {
    if (!project || !user) return false;
    if (project.ownerId === user.uid) return true;
    if (isOrgProject) {
      if (orgRoleLoading) return false;
      return canPerform(orgRole, "deploy_project");
    }
    return project.collaborators.includes(user.uid);
  })();
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
    socket.emit("joinProject", projectId);

    const onConnect = () => setRealtimeConnected(true);
    const onDisconnect = () => setRealtimeConnected(false);
    const onConnectError = () => setRealtimeConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

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
      } else {
        setLoading(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `projects/${projectId}`);
      setLoading(false);
    });

    // Fetch files
    const filesRef = collection(db, "projects", projectId, "files");
    const unsubFiles = onSnapshot(filesRef, (snapshot) => {
      const fileList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FileData[];
      setFiles(fileList);

      // Restore persisted active file if it still exists; otherwise fall back to first file.
      setActiveFileId(prev => {
        if (prev && fileList.some(f => f.id === prev)) return prev; // valid restore
        if (fileList.length > 0) return fileList[0].id;
        return null;
      });
      setOpenFileIds(prev => {
        const validOpen = prev.filter((id) => fileList.some((f) => f.id === id));
        if (validOpen.length > 0) return validOpen;
        return fileList.length > 0 ? [fileList[0].id] : [];
      });
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/files`);
      setLoading(false);
    });

    return () => {
      unsubProject();
      unsubFiles();
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
      Object.values(editDebounceRef.current).forEach((t) => clearTimeout(t));
      editDebounceRef.current = {};
      if (botDebounceRef.current) clearTimeout(botDebounceRef.current);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [user, projectId]);

  // Load org members when project is loaded and it's an org project
  useEffect(() => {
    if (!project?.ownerOrgId || project?.ownerType !== "organization") {
      setOrgMembers([]);
      setOrgRole(null);
      setOrgRoleLoading(false);
      return;
    }
    const orgId = project.ownerOrgId;
    setOrgMembersLoading(true);
    const unsub = subscribeOrgMembers(orgId, (members) => {
      setOrgMembers(members);
      setOrgMembersLoading(false);
    });
    // Load user's own role
    if (user) {
      setOrgRoleLoading(true);
      getOrgMember(orgId, user.uid)
        .then((m) => setOrgRole(m?.role ?? null))
        .catch(() => setOrgRole(null))
        .finally(() => setOrgRoleLoading(false));
    }
    return () => unsub();
  }, [project?.ownerOrgId, project?.ownerType, user?.uid]);

  // Keep stable ref in sync (used inside activity subscription closure)
  useEffect(() => { orgMembersRef.current = orgMembers; }, [orgMembers]);

  // ── Presence: write own record on mount + heartbeat + cleanup on unmount ────
  useEffect(() => {
    if (!isOrgProject || !user || !projectId) return;
    const presenceRef = doc(db, "projects", projectId, "presence", user.uid);
    setDoc(presenceRef, {
      userId: user.uid,
      name: user.displayName || user.email?.split("@")[0] || "User",
      avatar: user.photoURL || "",
      lastSeen: serverTimestamp(),
      active: true,
      currentFile: null,
    }).catch(() => {});
    const heartbeat = setInterval(() => {
      updateDoc(presenceRef, { lastSeen: serverTimestamp() }).catch(() => {});
    }, 30_000);
    return () => {
      clearInterval(heartbeat);
      updateDoc(presenceRef, { active: false, lastSeen: serverTimestamp() }).catch(() => {});
      deleteDoc(presenceRef).catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOrgProject, user?.uid, projectId]);

  // ── Presence: update currentFile whenever active file changes ───────────────
  useEffect(() => {
    if (!isOrgProject || !user || !projectId) return;
    const presenceRef = doc(db, "projects", projectId, "presence", user.uid);
    const currentFileName = files.find(f => f.id === activeFileId)?.name ?? null;
    setDoc(presenceRef, {
      currentFile: currentFileName,
      active: true,
      lastSeen: serverTimestamp(),
    }, { merge: true }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFileId, files, isOrgProject, user?.uid, projectId]);

  // ── Presence: subscribe to all active users in this project ─────────────────
  useEffect(() => {
    if (!isOrgProject || !projectId) return;
    const unsub = onSnapshot(collection(db, "projects", projectId, "presence"), (snap) => {
      const STALE_MS = 90_000; // 3× heartbeat interval
      const now = Date.now();
      const users = snap.docs
        .map(d => d.data() as PresenceUser)
        .filter(u => now - (u.lastSeen?.toMillis?.() ?? 0) < STALE_MS);
      setPresenceUsers(users);
    }, () => {});
    return unsub;
  }, [isOrgProject, projectId]);

  // ── Activity: subscribe to activity stream + notify on remote saves ──────────
  useEffect(() => {
    if (!isOrgProject || !projectId) return;
    const q = query(
      collection(db, "projects", projectId, "activity"),
      orderBy("timestamp", "desc"),
      limit(20)
    );
    let initialized = false;
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityItem));
      setActivityItems(items);
      // After the first load, show toasts for new events from other users
      if (initialized && items.length > 0) {
        const latest = items[0];
        const age = Date.now() - (latest.timestamp?.toMillis?.() ?? 0);
        if (age < 8_000 && latest.userId !== user?.uid) {
          const actor = orgMembersRef.current.find(m => m.userId === latest.userId);
          const name = actor?.username ?? "A collaborator";
          if (latest.action === "save") {
            toast.info(`${name} saved ${latest.file ?? "a file"}`, { duration: 3000, icon: "💾" });
          } else if (latest.action === "deploy") {
            toast.success(`${name} deployed the project`, { duration: 4000, icon: "🚀" });
          }
        }
      }
      initialized = true;
    }, () => {});
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOrgProject, projectId, user?.uid]);

  const activeFile = files.find(f => f.id === activeFileId);
  const activeFileMode: "read" | "edit" = activeFileId ? (fileModes[activeFileId] ?? "edit") : "edit";
  const editorReadOnly = isReadOnly || activeFileMode === "read";

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

  const handleCodeChange = (content: string) => {
    if (!activeFileId) return;
    if (editorReadOnly) return;
    if (buildPreviewFiles) setBuildPreviewFiles(null);
    setIsSaved(false);
    // Local optimistic update for smooth typing
    setFiles((prev) => prev.map((f) => (f.id === activeFileId ? { ...f, content } : f)));

    // Debounced sync (last-write-wins)
    if (editDebounceRef.current[activeFileId]) {
      clearTimeout(editDebounceRef.current[activeFileId]);
    }
    editDebounceRef.current[activeFileId] = setTimeout(() => {
      handleUpdateFile(activeFileId, content);
    }, 120);

    if (botDebounceRef.current) clearTimeout(botDebounceRef.current);
    botDebounceRef.current = setTimeout(async () => {
      const messages = await emitBotEvent({
        name: "file_changed",
        payload: { projectId, fileId: activeFileId, content },
      });
      setBotSuggestions(messages.map((m) => m.text).slice(0, 3));
    }, 250);

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

      // Run validation in the background after every manual save.
      if (!silent && files.length > 0) {
        validateProject(files, projectId, validationHash).then((res) => {
          setValidationResult(res);
          setValidationHash(res.hash);
          if (res.errors?.some((e) => e.severity === "error")) setShowErrors(true);
        }).catch(() => { /* validation is best-effort */ });
      }

      // Create a version snapshot on every manual save (not auto-save).
      // Best-effort: a version failure must never block the normal save flow.
      if (!silent && files.length > 0) {
        try {
          const MAX_FILE_BYTES = 32_000;
          const filesSnapshot = files.map(f => {
            const truncated = f.content.length > MAX_FILE_BYTES;
            return {
              name: f.name,
              path: f.path,
              content: truncated ? f.content.slice(0, MAX_FILE_BYTES) : f.content,
              language: f.language,
              truncated,
            };
          });
          // Include a descriptive message with the list of files in this snapshot.
          const fileNames = files.map(f => f.name).join(", ");
          const versionMessage = `Manual save — ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} (${files.length} file${files.length !== 1 ? "s" : ""}: ${fileNames.slice(0, 120)}${fileNames.length > 120 ? "…" : ""})`;
          await addDoc(collection(db, "projects", projectId, "versions"), {
            filesSnapshot,
            createdAt: serverTimestamp(),
            message: versionMessage,
          });
        } catch (versionErr) {
          // Version creation is best-effort; log for debugging but do not surface to user.
          console.warn("Version snapshot failed:", versionErr);
        }
      }

      // Track activity for org projects (best-effort)
      if (!silent && isOrgProject && user) {
        try {
          await addDoc(collection(db, "projects", projectId, "activity"), {
            userId: user.uid,
            action: "save",
            file: activeFile?.name ?? null,
            timestamp: serverTimestamp(),
          });
        } catch { /* best-effort */ }
      }
    } catch (error) {
      console.error("Error saving project:", error);
      if (!silent) toast.error("Failed to save project");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Queue a build job and immediately dispatch it to the server.
   * Streams live logs via Socket.io; UI updates via subscribeProjectBuildJobs.
   */
  const handleQueueDeploy = async (branch = "main") => {
    if (!user || !project) return;

    // Permission check
    if (isOrgProject && !canPerform(orgRole, "deploy_project")) {
      toast.error("Permission denied: deploy requires developer role or higher");
      return;
    }

    const det = detection ?? detectProject(files);
    const hash = await hashFiles(files);
    const short = shortHash(hash);

    setActivePanel("terminal");
    addLog("system", `devos ▶ ${project.name} $ deploy --branch ${branch}`);
    addLog("info", `Detected: ${det.framework}`);
    addLog("info", `Commit: ${short}`);

    // Get username for preview URL
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const username = userDoc.exists() ? userDoc.data().username : null;
    const slug = project.projectSlug || project.name.toLowerCase().replace(/\s+/g, "-");

    const previewUrl = username
      ? buildPreviewUrl(window.location.origin, username, slug, hash)
      : null;

    try {
      // Enqueue
      const jobId = await enqueueJob({
        projectId,
        userId: user.uid,
        commitHash: short,
        framework: det.framework,
        buildCommand: det.buildCommand,
        outputDir: det.outputDir,
        priority: "normal",
      });

      setActiveJobId(jobId);
      addLog("info", `Build job queued: ${jobId.slice(0, 8)}`);

      logAudit({
        userId: user.uid,
        action: "build_queued",
        projectId,
        orgId: project.ownerOrgId ?? null,
        metadata: { jobId, framework: det.framework, branch, commitHash: short },
      });

      // Dispatch to server
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/build-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          jobId,
          projectId,
          files: files.map((f) => ({
            name: (f.path || f.name || "").replace(/^\/+/, ""),
            content: f.content ?? "",
          })),
          framework: det.framework,
          buildCommand: det.buildCommand,
          outputDir: det.outputDir,
          commitHash: short,
          username,
          projectSlug: slug,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 429) {
          addLog("warning", "⚠ Build queue full — job will run when a slot opens");
          toast("Build queued — waiting for slot");
        } else {
          addLog("error", `✖ Dispatch failed: ${err.error ?? response.statusText}`);
        }
      }
    } catch (err: any) {
      addLog("error", `✖ ${err.message}`);
    }
  };

  const handleRun = async () => {
    if (!activeFile) return;

    // Permission check for org projects
    if (isOrgProject && !canPerform(orgRole, "run_project")) {
      toast.error("Permission denied: run_project requires developer role or higher.");
      return;
    }

    const det = detection ?? detectProject(files);

    setIsRunning(true);
    setActivePanel("terminal");
    addLog("system", `devos ▶ ${project?.name || "project"} $ run`);
    if (det.framework !== "Unknown") {
      addLog("info", `⚡ Framework: ${det.framework}`);
    }

    // Audit: run_project
    if (user) {
      logAudit({
        userId: user.uid,
        action: "run_project",
        projectId,
        orgId: project?.ownerOrgId ?? null,
        metadata: { framework: det.framework, file: activeFile.name },
      });
    }

    const packageFile = files.find((f) => f.name === "package.json" || f.path === "/package.json");
    if (packageFile) {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const controller = new AbortController();
        runAbortRef.current = controller;
        const response = await fetch("/api/run-project", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          signal: controller.signal,
          body: JSON.stringify({
            mode: "build",
            files: files.map((f) => ({
              name: (f.path || f.name || "").replace(/^\/+/, ""),
              content: f.content ?? "",
            })),
          }),
        });
        const data = await response.json();
        if (!response.ok || !data?.success) {
          addLog("error", "✖ Build failed");
          addLog("error", data?.stderr || data?.error || "Build request failed");
          setIsRunning(false);
          return;
        }

        addLog("output", data.stdout || "Build completed.");
        if (data.stderr) addLog("output", data.stderr);

        const generatedFiles: FileData[] = (data.outputFiles || []).map((f: any, index: number) => ({
          id: `build-${index}-${f.path}`,
          projectId,
          name: String(f.path).split("/").pop() || f.path,
          path: `/${String(f.path).replace(/^\/+/, "")}`,
          content: String(f.content ?? ""),
          language: f.path.endsWith(".css")
            ? "css"
            : f.path.endsWith(".js")
              ? "javascript"
              : f.path.endsWith(".html")
                ? "html"
                : "plaintext",
          updatedAt: new Date().toISOString(),
        }));
        setBuildPreviewFiles(generatedFiles);
        setPreviewSaveKey((k) => k + 1);
        setActivePanel("preview");
        setMobileTab("preview");
        addLog("success", "✔ Build output loaded into Preview.");
      } catch (error: any) {
        if (error?.name === "AbortError") {
          addLog("error", "Execution stopped by user.");
        } else {
          addLog("error", "✖ Build pipeline failed");
          addLog("error", error.message || "Unknown build error");
        }
      } finally {
        runAbortRef.current = null;
        setIsRunning(false);
      }
      return;
    }

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
      runAbortRef.current = null;
      setIsRunning(false);
    }
  };

  const handleStopExecution = () => {
    if (runAbortRef.current) {
      runAbortRef.current.abort();
      runAbortRef.current = null;
    }
  };

  const toggleActiveFileMode = () => {
    if (!activeFileId) return;
    setFileModes((prev) => ({
      ...prev,
      [activeFileId]: (prev[activeFileId] ?? "edit") === "edit" ? "read" : "edit",
    }));
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
      appId: generateAppId(),
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
      <div className="h-screen flex flex-col items-center justify-center bg-surface gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center">
          <Code2 className="w-6 h-6 text-blue-400" />
        </div>
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        <p className="text-[11px] text-white/30 font-mono">Loading project…</p>
      </div>
    );
  }

  // Breadcrumb data
  const breadcrumbUsername = project?.ownerUsername || user?.email?.split("@")[0] || "";
  const breadcrumbFilePath = activeFile?.path ?? activeFile?.name ?? "";
  const breadcrumbSegments = breadcrumbFilePath ? breadcrumbFilePath.split("/") : [];
  const breadcrumbFileName = breadcrumbSegments[breadcrumbSegments.length - 1] ?? "";
  const breadcrumbFolders = breadcrumbSegments.length > 1 ? breadcrumbSegments.slice(0, -1) : [];
  const breadcrumbProjectHref =
    project?.projectSlug && breadcrumbUsername
      ? `/@${breadcrumbUsername}/${project.projectSlug}`
      : `/project/${projectId}`;

  return (
    <div
      className="h-screen flex flex-col bg-surface overflow-hidden"
      onClick={() => contextMenu && setContextMenu(null)}
    >
      {/* Org project permission banner */}
      {isOrgProject && orgRole === null && !loading && !orgRoleLoading && (
        <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border-b border-orange-500/20 text-orange-300 text-xs font-medium">
          <Shield className="w-3.5 h-3.5 flex-shrink-0" />
          You are not a member of this organization — the project is read-only.
        </div>
      )}
      {isOrgProject && orgRole === "member" && !loading && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border-b border-blue-500/20 text-blue-300 text-xs font-medium">
          <UserCheck className="w-3.5 h-3.5 flex-shrink-0" />
          Org member — you can edit files. Deployment requires admin role.
        </div>
      )}
      <header className="h-11 border-b border-[#21262D] flex items-center justify-between px-3 bg-[#161B22] flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white/80 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            {/* ── GitHub-style breadcrumb ── */}
            {project?.systemType !== 'portfolio' && (
              <nav
                aria-label="breadcrumb"
                className="flex items-center gap-1 min-w-0 text-xs"
              >
                {/* Org badge for org projects — desktop only */}
                {isOrgProject && project?.ownerOrgName && (
                  <>
                    <a
                      href={`/org/${project.ownerOrgSlug ?? ""}`}
                      className="hidden md:flex items-center gap-1 text-[#9CA3AF] hover:text-white font-medium transition-colors flex-shrink-0"
                      title={project.ownerOrgName}
                    >
                      <Building2 className="w-3 h-3" />
                      {project.ownerOrgName}
                    </a>
                    <span className="hidden md:inline text-white/20 flex-shrink-0 select-none">/</span>
                  </>
                )}
                {/* @username — desktop only (personal projects) */}
                {!isOrgProject && breadcrumbUsername && (
                  <>
                    <a
                      href={`/@${breadcrumbUsername}`}
                      className="hidden md:inline text-[#9CA3AF] hover:text-white font-medium transition-colors flex-shrink-0"
                      title={`@${breadcrumbUsername}'s profile`}
                    >
                      @{breadcrumbUsername}
                    </a>
                    <span className="hidden md:inline text-white/20 flex-shrink-0 select-none">/</span>
                  </>
                )}

                {/* Project name */}
                <a
                  href={breadcrumbProjectHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#E5E7EB] hover:text-white font-semibold transition-colors truncate max-w-[90px] sm:max-w-[130px] md:max-w-none flex-shrink-0"
                  title={project?.name}
                >
                  {project?.name}
                </a>

                {/* Framework badge */}
                {detection && detection.framework !== "Unknown" && (
                  <span
                    className={cn(
                      "hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0",
                      FRAMEWORK_BADGE_COLORS[detection.framework]
                    )}
                    title={`Detected: ${detection.framework}`}
                  >
                    {detection.framework}
                  </span>
                )}

                {/* File path */}
                {breadcrumbFilePath && (
                  <>
                    <span className="text-white/20 flex-shrink-0 select-none">/</span>

                    {/* Folder segments — desktop only */}
                    {breadcrumbFolders.map((seg, i) => (
                      <span key={i} className="hidden md:contents">
                        <span className="text-[#9CA3AF] font-medium">{seg}</span>
                        <span className="text-white/20 select-none">/</span>
                      </span>
                    ))}

                    {/* Filename — always visible, accent blue */}
                    <span
                      className="text-[#3B82F6] font-semibold truncate max-w-[90px] md:max-w-[180px]"
                      title={breadcrumbFilePath}
                    >
                      {breadcrumbFileName}
                    </span>
                  </>
                )}
              </nav>
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
          {/* ── Presence avatars (org projects, desktop) ── */}
          {isOrgProject && presenceUsers.filter(u => u.userId !== user?.uid).length > 0 && (
            <div className="hidden md:flex items-center -space-x-1.5 mr-1">
              {presenceUsers
                .filter(u => u.userId !== user?.uid)
                .slice(0, 5)
                .map(u => (
                  <div key={u.userId} className="relative group">
                    <div className="w-6 h-6 rounded-full ring-2 ring-[#161B22] overflow-hidden bg-blue-600/30 flex items-center justify-center flex-shrink-0">
                      {u.avatar
                        ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                        : <span className="text-[9px] font-bold text-white">{u.name.charAt(0).toUpperCase()}</span>
                      }
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 ring-1 ring-[#161B22]" />
                    {/* Tooltip */}
                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50 pointer-events-none">
                      <div className="bg-surface border border-border-base rounded-lg px-2.5 py-1.5 shadow-xl text-xs text-white whitespace-nowrap">
                        <p className="font-semibold">{u.name}</p>
                        {u.currentFile && <p className="text-white/50 text-[11px]">editing {u.currentFile}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              {presenceUsers.filter(u => u.userId !== user?.uid).length > 5 && (
                <div className="w-6 h-6 rounded-full ring-2 ring-[#161B22] bg-white/10 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white/50">
                    +{presenceUsers.filter(u => u.userId !== user?.uid).length - 5}
                  </span>
                </div>
              )}
            </div>
          )}
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
          {!realtimeConnected && (
            <span className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 text-[10px] font-bold border border-amber-500/25">
              Realtime disabled
            </span>
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
              {isRunning && (
                <button
                  onClick={handleStopExecution}
                  className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 rounded-lg bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white text-xs font-bold transition-all"
                >
                  <X className="w-3 h-3" />
                  <span className="hidden sm:inline">Stop Execution</span>
                </button>
              )}
              {!isReadOnly && (
                <button
                  onClick={toggleActiveFileMode}
                  className={cn(
                    "flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    activeFileMode === "read"
                      ? "bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25"
                      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                  )}
                  title={activeFileMode === "read" ? "Switch active file to edit mode" : "Switch active file to read mode"}
                >
                  {activeFileMode === "read" ? "Read mode" : "Edit mode"}
                </button>
              )}
              {!isReadOnly && (
                <button
                  onClick={() => handleSave()}
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
              {!isReadOnly && canDeploy && (
                <>
                  {/* Active job badge */}
                  {activeJobId && (
                    <BuildStatusBadge jobId={activeJobId} className="hidden md:inline-flex" />
                  )}
                  <button
                    onClick={() =>
                      detection?.hasPackageJson
                        ? handleQueueDeploy("main")
                        : setIsDeployModalOpen(true)
                    }
                    className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                  >
                    {isDeployed ? <Globe className="w-3.5 h-3.5" /> : <Rocket className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{isDeployed ? "Sync" : "Deploy"}</span>
                  </button>
                </>
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
        </div>
      </header>

      {/* ── Mobile top navigation bar (replaces slide-in drawer) ───────────── */}
      {project?.systemType !== 'portfolio' && !isFocusMode && (
        <nav className="md:hidden flex-shrink-0 bg-base border-b border-[#21262D] overflow-x-auto">
          <div className="flex items-stretch min-w-max">
            {mobileNavTabs.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setMobileTab(id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap transition-colors relative",
                  mobileTab === id ? "text-blue-400" : "text-white/30 active:text-white/70"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {mobileTab === id && (
                  <motion.div
                    layoutId="mobileTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                    transition={{ duration: 0.15 }}
                  />
                )}
              </button>
            ))}
          </div>
        </nav>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar icon tabs — desktop only, hidden in focus mode */}
        {project?.systemType !== 'portfolio' && !isFocusMode && (
          <div className="hidden md:flex w-12 border-r border-[#21262D] bg-surface flex-col items-center py-3 gap-1 flex-shrink-0">
            {[
              { id: "explorer" as PanelType, icon: Files, label: "Explorer" },
              { id: "git" as PanelType, icon: GitBranch, label: "Source Control" },
              { id: "terminal" as PanelType, icon: Terminal, label: "Terminal" },
              { id: "preview" as PanelType, icon: Eye, label: "Preview" },
              { id: "deployments" as PanelType, icon: Rocket, label: "Deploy" },
              ...(isOrgProject ? [{ id: "collaborators" as PanelType, icon: Users, label: "Collaborators" }] : []),
              { id: "settings" as PanelType, icon: Settings, label: "Settings" },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => togglePanel(id)}
                title={label}
                className={cn(
                  "w-full flex items-center justify-center p-2.5 transition-all relative group",
                  activePanel === id
                    ? "text-blue-400 bg-blue-600/10 before:absolute before:left-0 before:top-1/4 before:h-1/2 before:w-0.5 before:bg-blue-500 before:rounded-r"
                    : "text-white/25 hover:text-white/70 hover:bg-white/[0.06]"
                )}
              >
                <Icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        )}

        {/* ── Mobile panel overlay ─────────────────────────────────────────── */}
        {/* Lightweight absolute overlay — only appears on mobile when not in editor mode.
            The editor underneath stays mounted (no unmount/remount cost). */}
        <AnimatePresence>
          {mobileTab !== "editor" && project?.systemType !== 'portfolio' && (
            <motion.div
              key={mobileTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="md:hidden absolute inset-0 z-20 bg-surface flex flex-col overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Files */}
              {mobileTab === "files" && (
                <div className="h-full overflow-y-auto">
                  <Sidebar
                    files={files}
                    activeFileId={activeFileId}
                    onSelectFile={(id) => { openFileInTab(id); setMobileTab("editor"); }}
                    projectId={projectId}
                    readOnly={editorReadOnly}
                  />
                </div>
              )}

              {/* Preview */}
              {mobileTab === "preview" && (
                <div className="h-full flex flex-col">
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#161B22] border-b border-[#21262D] flex-shrink-0">
                    <Globe className="w-3.5 h-3.5 text-green-400/60" />
                    <span className="text-xs text-white/40 font-bold uppercase tracking-widest flex-1">Live Preview</span>
                    {project?.entryFile && (
                      <span className="text-[10px] text-white/20 font-mono">{project.entryFile}</span>
                    )}
                    <button
                      onClick={() => setPreviewSaveKey(k => k + 1)}
                      className="p-1.5 rounded text-white/30 hover:text-white/70 transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    {(project?.liveUrl || project?.deployUrl) && (
                      <button
                        onClick={() => window.open(project?.liveUrl || project?.deployUrl, "_blank")}
                        className="p-1.5 rounded text-white/30 hover:text-white/70 transition-colors"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <PreviewPanel projectId={projectId} files={buildPreviewFiles ?? files} entryFile={project?.entryFile} saveKey={previewSaveKey} />
                  </div>
                </div>
              )}

              {/* Git */}
              {mobileTab === "git" && (
                <div className="h-full overflow-y-auto">
                  <GitPanel projectId={projectId} files={files} />
                </div>
              )}

              {/* Terminal — full-height on mobile */}
              {mobileTab === "terminal" && (
                <div className="h-full flex flex-col bg-surface">
                  <div className="flex-1 min-h-0 relative">
                    <TerminalTabs socket={socket} onClose={() => setMobileTab("files")} cwd={(project?.systemType as string) === "v0" ? "/app" : undefined} />
                  </div>
                </div>
              )}

              {/* Settings */}
              {mobileTab === "settings" && (
                <div className="h-full overflow-y-auto">
                  <SettingsPanel projectId={projectId} project={project} files={files} onDelete={onBack} />
                </div>
              )}

              {/* Deployments */}
              {mobileTab === "deployments" && canDeploy && (
                <div className="h-full overflow-y-auto p-4">
                  <h3 className="text-sm font-bold text-white mb-4">Deployments</h3>
                  <DeploymentDashboard
                    projectId={projectId}
                    userId={user?.uid ?? ""}
                    activeDeploymentId={project?.activeDeploymentId}
                    canManage={canDeploy}
                  />
                </div>
              )}

              {/* Collaborators (org projects only) */}
              {mobileTab === "collaborators" && isOrgProject && (
                <CollaboratorsPanel orgMembers={orgMembers} loading={orgMembersLoading} currentUserId={user?.uid} ownerId={project?.ownerId} presenceUsers={presenceUsers} activityItems={activityItems} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area: Split Screen */}
        <div
          className="flex-1 flex overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Left Pane: Explorer + Editor + Terminal */}
          <div className={cn(
            "flex flex-col border-r border-[#21262D] overflow-hidden",
            isPreviewFullscreen ? "hidden" : "flex-1"
          )}>
            <div className="flex-1 flex overflow-hidden">
              {/* Explorer Panel — desktop only, hidden in focus mode */}
              {project?.systemType !== 'portfolio' && activePanel === "explorer" && !isFocusMode && (
                <div className="hidden md:flex">
                  <Sidebar
                    files={files}
                    activeFileId={activeFileId}
                    onSelectFile={openFileInTab}
                    projectId={projectId}
                    readOnly={editorReadOnly}
                  />
                </div>
              )}

              {/* Git Panel — hidden on mobile, hidden in focus mode */}
              {project?.systemType !== 'portfolio' && activePanel === "git" && !isFocusMode && (
                <div className="hidden md:flex w-80 border-r border-border-base">
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

              {/* Collaborators Panel — org projects only, hidden on mobile */}
              {project?.systemType !== 'portfolio' && activePanel === "collaborators" && !isFocusMode && isOrgProject && (
                <div className="hidden md:flex w-72 border-r border-border-base flex-col overflow-y-auto">
                  <CollaboratorsPanel orgMembers={orgMembers} loading={orgMembersLoading} currentUserId={user?.uid} ownerId={project?.ownerId} presenceUsers={presenceUsers} activityItems={activityItems} />
                </div>
              )}

              {/* Deployments Panel — shows history, rollback, branch deployments */}
              {project?.systemType !== 'portfolio' && activePanel === "settings" && !isFocusMode && canDeploy && (
                <div className="hidden md:flex w-80 border-r border-border-base flex-col overflow-y-auto">
                  <div className="p-4 border-b border-border-base">
                    <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider">Deployments</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3">
                    <DeploymentDashboard
                      projectId={projectId}
                      userId={user?.uid ?? ""}
                      activeDeploymentId={project?.activeDeploymentId}
                      canManage={canDeploy}
                    />
                  </div>
                </div>
              )}

              {/* Editor Area */}
              <main
                className="flex-1 relative bg-surface flex flex-col overflow-hidden"
                onContextMenu={handleContextMenu}
              >
                {/* File tabs */}
                {project?.systemType !== 'portfolio' && openFileIds.filter(id => files.some(f => f.id === id)).length > 0 && (
                  <div className="flex items-center overflow-x-auto border-b border-[#21262D] bg-[#161B22] flex-shrink-0 custom-scrollbar">
                    {openFileIds.filter(id => files.some(f => f.id === id)).map(fileId => {
                      const file = files.find(f => f.id === fileId);
                      if (!file) return null;
                      const isActive = fileId === activeFileId;
                      // Presence: other users with this file open
                      const watchers = presenceUsers.filter(u => u.userId !== user?.uid && u.currentFile === file.name);
                      return (
                        <div
                          key={fileId}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer border-r border-[#21262D] flex-shrink-0 group select-none min-w-0 transition-colors",
                            isActive
                              ? "bg-surface text-white border-b-2 border-b-blue-500"
                              : "text-white/35 hover:text-white/70 hover:bg-white/[0.04]"
                          )}
                          onClick={() => setActiveFileId(fileId)}
                        >
                          <span className="truncate max-w-[120px]">{file.name}</span>
                          {/* Per-tab presence dot */}
                          {isOrgProject && watchers.length > 0 && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0"
                              title={`${watchers.map(w => w.name).join(", ")} ${watchers.length === 1 ? "is" : "are"} viewing`}
                            />
                          )}
                          {!isReadOnly && (
                            <>
                              {!isSaved && fileId === activeFileId && (
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" title="Unsaved changes" />
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); closeFileTab(fileId); }}
                                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all flex-shrink-0 ml-0.5"
                                title="Close tab"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* "X is editing this file" banner (org projects only) */}
                {isOrgProject && (() => {
                  const editing = presenceUsers.filter(u => u.userId !== user?.uid && u.currentFile === activeFile?.name);
                  if (!editing.length || !activeFile) return null;
                  const names = editing.slice(0, 2).map(u => u.name).join(", ");
                  const extra = editing.length > 2 ? ` +${editing.length - 2} more` : "";
                  return (
                    <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/8 border-b border-yellow-500/15 text-yellow-300/70 text-[11px] flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
                      <span>{names}{extra} {editing.length === 1 ? "is" : "are"} viewing this file</span>
                    </div>
                  );
                })()}

                <div className="flex-1 relative min-h-0 flex flex-col">
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
                      readOnly={editorReadOnly}
                      onCursorChange={(line, col) => { setCursorLine(line); setCursorCol(col); }}
                      showToolbar
                    />
                  ) : (
                    /* ── GitHub-style project homepage shown when no file is open ── */
                    <ProjectHomepage
                      project={project}
                      files={files}
                      isReadOnly={isReadOnly}
                      onOpenFile={(id) => { openFileInTab(id); setMobileTab("editor"); }}
                      onCreateFile={handleCreateFile}
                      onOpenExplorer={() => { togglePanel("explorer"); setMobileTab("files"); }}
                    />
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
                      className="fixed z-50 bg-[#161B22] border border-[#21262D] rounded-lg shadow-2xl overflow-hidden min-w-[140px]"
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
                className="border-t border-[#21262D] bg-surface flex flex-col relative z-10 shadow-2xl"
                style={{ height: terminalHeight }}
              >
                {/* Resize handle */}
                <div
                  className="h-1 cursor-row-resize bg-transparent hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors flex-shrink-0"
                  onMouseDown={handleTerminalResizeStart}
                />
                <div className="flex-1 min-h-0 relative">
                  <TerminalTabs socket={socket} onClose={() => setActivePanel(null)} cwd={(project?.systemType as string) === "v0" ? "/app" : undefined} />
                </div>
                {/* Command input */}
                <form
                  onSubmit={handleTerminalSubmit}
                  className="flex items-center gap-2 px-4 py-2 border-t border-[#21262D] bg-surface flex-shrink-0"
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

                {/* Validation errors panel — shown when there are build/type errors */}
                {showErrors && validationResult && (
                  <ErrorPanel
                    result={validationResult}
                    isRunning={isRunning || isExecRunning}
                  />
                )}
              </motion.div>
            )}
          </div>

          {/* Right Pane: Live Preview — hidden on mobile, hidden in focus mode */}
          {project?.systemType !== 'portfolio' && !isFocusMode && (
            <div className={cn(
              "bg-surface hidden md:flex flex-col border-l border-[#21262D] overflow-hidden",
              isPreviewFullscreen ? "flex-1" : "w-1/2"
            )}>
              <div className="h-10 border-b border-[#21262D] flex items-center justify-between px-3 bg-[#161B22] flex-shrink-0">
                <div className="flex items-center gap-2 text-white/40 min-w-0">
                  <Globe className="w-3.5 h-3.5 flex-shrink-0 text-green-400/60" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Live Preview</span>
                  {project?.entryFile && (
                    <span className="text-[10px] text-white/20 font-mono truncate hidden lg:inline">— {project.entryFile}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setPreviewSaveKey(k => k + 1)}
                    title="Refresh preview"
                    className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                  {(project?.liveUrl || project?.deployUrl) && (
                    <button
                      onClick={() => window.open(project.liveUrl || project.deployUrl, "_blank")}
                      title="Open in new tab"
                      className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsPreviewFullscreen(v => !v)}
                    title={isPreviewFullscreen ? "Restore split view" : "Fullscreen preview"}
                    className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                  >
                    {isPreviewFullscreen
                      ? <Minimize2 className="w-3 h-3" />
                      : <Maximize2 className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <PreviewPanel projectId={projectId} files={buildPreviewFiles ?? files} entryFile={project?.entryFile} saveKey={previewSaveKey} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <footer className="h-6 flex items-center justify-between px-3 bg-[#161B22] border-t border-[#21262D] flex-shrink-0 select-none z-10">
        <div className="flex items-center gap-4 text-[10px] text-white/25 font-mono">
          <span className="flex items-center gap-1.5">
            <GitBranch className="w-3 h-3" />
            main
          </span>
          {activeFile && (
            <span className="text-white/20">{activeFile.language ?? "text"}</span>
          )}
          {activeFile && (
            <span className={cn("px-1.5 py-0.5 rounded", activeFileMode === "read" ? "bg-indigo-500/20 text-indigo-300" : "bg-white/10 text-white/40")}>
              {activeFileMode === "read" ? "READ" : "EDIT"}
            </span>
          )}
          {!isSaved && (
            <span className="text-orange-400/70 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
              Unsaved changes
            </span>
          )}
          {botSuggestions.length > 0 && (
            <span className="text-blue-300/70 truncate max-w-[360px]">
              🤖 {botSuggestions[0]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[10px] text-white/25 font-mono">
          {activeFile && (
            <span>Ln {cursorLine}, Col {cursorCol}</span>
          )}
          <span>UTF-8</span>
          <span>LF</span>
        </div>
      </footer>

      <DeployModal 
        isOpen={isDeployModalOpen} 
        onClose={() => setIsDeployModalOpen(false)} 
        projectName={project?.name || "Project"} 
        projectId={projectId}
        files={files}
        onDeployed={isOrgProject && user ? async () => {
          try {
            await addDoc(collection(db, "projects", projectId, "activity"), {
              userId: user.uid,
              action: "deploy",
              file: null,
              timestamp: serverTimestamp(),
            });
          } catch { /* best-effort */ }
        } : undefined}
      />
    </div>
  );
}

// ── Collaborators Panel ───────────────────────────────────────────────────────

function roleIcon(role: OrgMemberRole) {
  if (role === "admin") return <Crown className="w-3 h-3 text-yellow-400" />;
  if (role === "moderator") return <Shield className="w-3 h-3 text-blue-400" />;
  return <UserCheck className="w-3 h-3 text-white/30" />;
}

function CollaboratorsPanel({
  orgMembers,
  loading,
  currentUserId,
  ownerId,
  presenceUsers,
  activityItems,
}: {
  orgMembers: OrgMember[];
  loading: boolean;
  currentUserId?: string;
  ownerId?: string;
  presenceUsers: PresenceUser[];
  activityItems: ActivityItem[];
}) {
  const isOnline = (userId: string) => presenceUsers.some(p => p.userId === userId);
  const currentFile = (userId: string) => presenceUsers.find(p => p.userId === userId)?.currentFile ?? null;

  const formatRelative = (ts: any): string => {
    if (!ts?.toMillis) return "";
    const secs = Math.floor((Date.now() - ts.toMillis()) / 1000);
    if (secs < 60) return "just now";
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
  };

  const actionLabel = (item: ActivityItem) => {
    const actor = orgMembers.find(m => m.userId === item.userId);
    const name = actor ? `@${actor.username ?? actor.userId}` : "Someone";
    if (item.action === "save") return `${name} saved ${item.file ?? "a file"}`;
    if (item.action === "deploy") return `${name} deployed the project`;
    return `${name} edited ${item.file ?? "a file"}`;
  };

  return (
    <div className="h-full flex flex-col bg-[#161B22]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#21262D] flex items-center gap-2 flex-shrink-0">
        <Users className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs font-bold uppercase tracking-widest text-white/40">Team</span>
        {!loading && (
          <span className="ml-auto text-[10px] text-white/25 font-mono">{orgMembers.length}</span>
        )}
        {presenceUsers.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-green-400/70 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            {presenceUsers.length} online
          </span>
        )}
      </div>

      {/* Members list */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            </div>
          ) : orgMembers.length === 0 ? (
            <p className="text-xs text-white/25 text-center py-8">No members found.</p>
          ) : (
            orgMembers.map((m) => {
              const online = isOnline(m.userId);
              const file = currentFile(m.userId);
              return (
                <div
                  key={m.userId}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors",
                    m.userId === currentUserId ? "bg-blue-600/10" : "hover:bg-white/[0.04]"
                  )}
                >
                  {/* Avatar with online dot */}
                  <div className="relative flex-shrink-0">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/50 uppercase">
                      {(m.username ?? m.userId).charAt(0)}
                    </div>
                    {online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 ring-2 ring-[#161B22]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      @{m.username ?? m.userId}
                      {m.userId === ownerId && (
                        <span className="ml-1.5 text-[9px] text-yellow-400/70 font-bold uppercase">owner</span>
                      )}
                      {m.userId === currentUserId && (
                        <span className="ml-1.5 text-[9px] text-blue-400/70 font-bold uppercase">you</span>
                      )}
                    </p>
                    {online && file && (
                      <p className="text-[10px] text-white/30 truncate">editing {file}</p>
                    )}
                    {online && !file && (
                      <p className="text-[10px] text-green-400/50">● Active now</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" title={m.role}>
                    {roleIcon(m.role as OrgMemberRole)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Activity stream */}
        {activityItems.length > 0 && (
          <div className="border-t border-[#21262D] mt-1">
            <div className="flex items-center gap-2 px-4 py-2.5">
              <Activity className="w-3 h-3 text-white/25" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/25">Activity</span>
            </div>
            <div className="px-3 pb-3 space-y-1">
              {activityItems.slice(0, 10).map((item) => (
                <div key={item.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                    item.action === "deploy" ? "bg-blue-400" : item.action === "save" ? "bg-green-400/60" : "bg-white/20"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/50 leading-snug truncate">{actionLabel(item)}</p>
                    <p className="text-[10px] text-white/20">{formatRelative(item.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── GitHub-style project homepage ────────────────────────────────────────────

function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    html: "🌐", css: "🎨", js: "⚡", ts: "⚡", jsx: "⚛", tsx: "⚛",
    json: "📋", md: "📝", txt: "📄", svg: "🖼", png: "🖼", jpg: "🖼",
    jpeg: "🖼", gif: "🖼", webp: "🖼", py: "🐍", sh: "🐚", env: "🔑",
  };
  return map[ext] ?? "📄";
}

interface ProjectHomepageProps {
  project: Project;
  files: FileData[];
  isReadOnly: boolean;
  onOpenFile: (id: string) => void;
  onCreateFile: (name: string) => void;
  onOpenExplorer: () => void;
}

function ProjectHomepage({ project, files, isReadOnly, onOpenFile, onCreateFile, onOpenExplorer }: ProjectHomepageProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "analytics">("overview");
  const readmeFile = files.find(f => f.name.toLowerCase() === "readme.md");
  const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));

  // Derive tech-stack badges from file extensions
  const extSet = new Set(
    files.map(f => f.name.split(".").pop()?.toLowerCase() ?? "").filter(Boolean)
  );
  const techStack = Array.from(extSet).slice(0, 8);

  return (
    <div className="h-full overflow-y-auto bg-surface text-white">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* ── Project header ── */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/30 to-purple-600/20 border border-border-base flex items-center justify-center text-2xl font-black text-white/60 flex-shrink-0">
            {project.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-extrabold text-white truncate">{project.name}</h1>
              {project.isPublic
                ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">Public</span>
                : <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-border-base">Private</span>
              }
              {project.forkedFrom && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                  <GitFork className="w-3 h-3" /> Forked
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-white/50 text-sm leading-relaxed">{project.description}</p>
            )}
            {techStack.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {techStack.map(ext => (
                  <span key={ext} className="px-2 py-0.5 rounded-md bg-white/5 border border-border-base text-[11px] font-mono text-white/40 uppercase">
                    {ext}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Quick actions ── */}
        {!isReadOnly && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onCreateFile("index.html")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all active:scale-95 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              New file
            </button>
            <button
              onClick={onOpenExplorer}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-border-base text-white/60 rounded-lg font-semibold hover:bg-white/10 transition-all text-xs"
            >
              <Files className="w-3.5 h-3.5" />
              Open Explorer
            </button>
          </div>
        )}

        {/* ── File browser ── */}
        <div className="border border-[#21262D] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#161B22] border-b border-[#21262D]">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/50">
              <Files className="w-3.5 h-3.5" />
              {files.length} file{files.length !== 1 ? "s" : ""}
            </div>
            {project.updatedAt && (
              <span className="text-[11px] text-white/25">
                Updated {formatTimestamp(project.updatedAt)}
              </span>
            )}
          </div>

          {sortedFiles.length === 0 ? (
            <div className="px-4 py-8 text-center text-white/30 text-sm">
              No files yet. Create your first file to get started.
            </div>
          ) : (
            <div className="divide-y divide-[#21262D]">
              {sortedFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => onOpenFile(file.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors text-left group"
                >
                  <span className="text-base flex-shrink-0 w-5 text-center">{getFileIcon(file.name)}</span>
                  <span className="flex-1 text-sm text-[#E5E7EB] group-hover:text-white font-mono truncate">
                    {file.name}
                  </span>
                  <span className="text-[11px] text-white/20 flex-shrink-0">
                    {formatTimestamp(file.updatedAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── README preview ── */}
        {readmeFile && (
          <div className="border border-[#21262D] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161B22] border-b border-[#21262D]">
              <span className="text-base">📝</span>
              <span className="text-xs font-semibold text-white/50">README.md</span>
            </div>
            <div className="px-5 py-5">
              <ReadmeRenderer content={readmeFile.content} />
            </div>
          </div>
        )}

        <p className="text-[11px] text-white/15 font-mono text-center pb-4">
          Click any file above to open it in the editor · Tip: Ctrl+P for quick-open
        </p>
      </div>
    </div>
  );
}

/** Format a Firestore Timestamp or ISO string as a relative time label */
function formatTimestamp(ts: any): string {
  if (!ts) return "";
  const ms = ts?.toMillis?.() ?? (ts?.seconds ? ts.seconds * 1000 : typeof ts === "string" ? Date.parse(ts) : 0);
  if (!ms) return "";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

/** README renderer — headings, bold, italic, inline-code, links, images,
 *  fenced code blocks, unordered & ordered lists, blockquotes, and hr. */
function ReadmeRenderer({ content }: { content: string }) {
  if (!content?.trim()) {
    return <p className="text-white/30 text-sm italic">No content.</p>;
  }

  // ── Inline renderer: bold, italic, inline-code, links, images ─────────────
  const renderInline = (text: string, baseKey: string): React.ReactNode => {
    // Split on the following patterns (order matters):
    //   ![alt](url)   — image
    //   [text](url)   — link
    //   `code`        — inline code
    //   **bold**      — bold
    //   *italic*      — italic (single asterisk or underscore)
    const re = /(!\[[^\]]*\]\([^)]*\)|\[[^\]]*\]\([^)]*\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;
    const parts: React.ReactNode[] = [];
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      if (match.index > last) parts.push(text.slice(last, match.index));
      const token = match[0];
      const ki = `${baseKey}-${match.index}`;
      if (token.startsWith("![")) {
        const alt = token.slice(2, token.indexOf("]"));
        const src = token.slice(token.indexOf("(") + 1, -1);
        parts.push(
          <img key={ki} src={src} alt={alt} className="max-w-full rounded-lg my-2 inline-block" />
        );
      } else if (token.startsWith("[")) {
        const label = token.slice(1, token.indexOf("]"));
        const href = token.slice(token.indexOf("(") + 1, -1);
        parts.push(
          <a key={ki} href={href} target="_blank" rel="noopener noreferrer"
            className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors">
            {label}
          </a>
        );
      } else if (token.startsWith("`")) {
        parts.push(
          <code key={ki} className="px-1 py-0.5 bg-white/10 rounded text-blue-300 text-[12px] font-mono">
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith("**")) {
        parts.push(<strong key={ki} className="text-white font-bold">{token.slice(2, -2)}</strong>);
      } else {
        // *italic* or _italic_
        parts.push(<em key={ki} className="italic text-white/80">{token.slice(1, -1)}</em>);
      }
      last = match.index + token.length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return <span key={baseKey}>{parts}</span>;
  };

  // ── Block-level pass ──────────────────────────────────────────────────────
  const lines = content.split("\n");
  const out: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = "";
  // Accumulate consecutive list items so we can wrap them
  type ListItem = { ordered: boolean; content: string; lineIdx: number };
  let pendingList: ListItem[] = [];

  const flushList = () => {
    if (pendingList.length === 0) return;
    const ordered = pendingList[0].ordered;
    const Tag = ordered ? "ol" : "ul";
    out.push(
      <Tag
        key={`list-${pendingList[0].lineIdx}`}
        className={`text-sm text-white/60 leading-relaxed pl-6 space-y-0.5 ${ordered ? "list-decimal" : "list-disc"} my-1`}
      >
        {pendingList.map((item) => (
          <li key={item.lineIdx}>{renderInline(item.content, `li-${item.lineIdx}`)}</li>
        ))}
      </Tag>
    );
    pendingList = [];
  };

  lines.forEach((line, i) => {
    // Fenced code block toggle
    if (line.startsWith("```")) {
      flushList();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
        codeLines = [];
      } else {
        inCodeBlock = false;
        out.push(
          <pre
            key={`code-${i}`}
            className="bg-white/5 border border-border-base rounded-lg p-4 overflow-x-auto text-[12px] font-mono text-green-300 leading-relaxed my-3"
            data-lang={codeLang || undefined}
          >
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
        codeLang = "";
      }
      return;
    }
    if (inCodeBlock) { codeLines.push(line); return; }

    // Headings
    if (line.startsWith("#### ")) {
      flushList();
      out.push(<h4 key={i} className="text-sm font-bold text-white mt-3 mb-1">{renderInline(line.slice(5), `h4-${i}`)}</h4>);
    } else if (line.startsWith("### ")) {
      flushList();
      out.push(<h3 key={i} className="text-base font-bold text-white mt-4 mb-1">{renderInline(line.slice(4), `h3-${i}`)}</h3>);
    } else if (line.startsWith("## ")) {
      flushList();
      out.push(<h2 key={i} className="text-lg font-extrabold text-white mt-5 mb-2 border-b border-border-base pb-1">{renderInline(line.slice(3), `h2-${i}`)}</h2>);
    } else if (line.startsWith("# ")) {
      flushList();
      out.push(<h1 key={i} className="text-xl font-black text-white mt-5 mb-2">{renderInline(line.slice(2), `h1-${i}`)}</h1>);
    // Horizontal rule: --- or *** or ___
    } else if (/^(\s*[-*_]){3,}\s*$/.test(line)) {
      flushList();
      out.push(<hr key={i} className="border-border-base my-4" />);
    // Blockquote
    } else if (line.startsWith("> ")) {
      flushList();
      out.push(
        <blockquote key={i} className="border-l-4 border-blue-500/40 pl-4 text-sm text-white/50 italic my-2">
          {renderInline(line.slice(2), `bq-${i}`)}
        </blockquote>
      );
    // Unordered list
    } else if (/^[-*+] /.test(line)) {
      pendingList.push({ ordered: false, content: line.slice(2), lineIdx: i });
    // Ordered list
    } else if (/^\d+\. /.test(line)) {
      pendingList.push({ ordered: true, content: line.replace(/^\d+\. /, ""), lineIdx: i });
    // Blank line
    } else if (line.trim() === "") {
      flushList();
      out.push(<div key={i} className="h-2" />);
    // Paragraph
    } else {
      flushList();
      out.push(
        <p key={i} className="text-sm text-white/60 leading-relaxed">
          {renderInline(line, `p-${i}`)}
        </p>
      );
    }
  });

  // Flush any trailing list / code block
  flushList();
  if (inCodeBlock && codeLines.length) {
    out.push(
      <pre key="code-eof" className="bg-white/5 border border-border-base rounded-lg p-4 overflow-x-auto text-[12px] font-mono text-green-300 leading-relaxed my-3">
        <code>{codeLines.join("\n")}</code>
      </pre>
    );
  }

  return <div className="space-y-1 leading-relaxed">{out}</div>;
}
