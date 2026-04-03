import React, { useState, useEffect, useRef } from "react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDocs, updateDoc, increment, writeBatch } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Plus, FolderCode, Clock, Users, ChevronRight, Github, Trash2, User as UserIcon, GitFork, Zap, Rocket, Sparkles, X, Layout, Code, Globe, Share2, Eye, EyeOff, Upload, Settings, RefreshCw, ExternalLink, ImageDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Project, UserSettings } from "../types";
import { cn, formatRelativeTime } from "../lib/utils";
import GitHubImportModal from "./GitHubImportModal";
import PublishTemplateModal from "./PublishTemplateModal";
import ProjectSettingsModal from "./ProjectSettingsModal";
import ConfirmModal from "./ConfirmModal";
import { toast } from "sonner";
import { TEMPLATES, ProjectTemplate } from "../constants/templates";
import { deductCredits, getCredits, CREDIT_COSTS } from "../lib/creditsService";
import { resolveAvatar } from "../lib/avatars";
import { useSEO } from "../hooks/useSEO";
import { useNavigate } from "react-router-dom";
import { ProjectShareCard, useShareAsImage } from "./ShareAsImageCard";

interface DashboardProps {
  onSelectProject: (projectId: string) => void;
}

export default function Dashboard({ onSelectProject }: DashboardProps) {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isQuickStarting, setIsQuickStarting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [projectNameTaken, setProjectNameTaken] = useState(false);
  const [checkingProjectName, setCheckingProjectName] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("blank");
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [publicProjects, setPublicProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<"my-projects" | "public-projects">("my-projects");
  const [publishTemplateProject, setPublishTemplateProject] = useState<Project | null>(null);
  const [settingsProject, setSettingsProject] = useState<Project | null>(null);
  const [resettingPortfolio, setResettingPortfolio] = useState(false);

  // Confirm modals
  const [deleteConfirm, setDeleteConfirm] = useState<{ projectId: string } | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [resetPortfolioConfirm, setResetPortfolioConfirm] = useState<Project | null>(null);

  // Debounced project name uniqueness check
  useEffect(() => {
    if (!user || !isCreating) return;
    const name = newProjectName.trim();
    if (!name) { setProjectNameTaken(false); return; }

    setCheckingProjectName(true);
    const t = setTimeout(async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "projects"), where("ownerId", "==", user.uid), where("name", "==", name))
        );
        setProjectNameTaken(!snap.empty);
      } catch {
        setProjectNameTaken(false);
      } finally {
        setCheckingProjectName(false);
      }
    }, 400);
    return () => { clearTimeout(t); setCheckingProjectName(false); };
  }, [newProjectName, user, isCreating]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "projects"),
      where("ownerId", "==", user.uid)
    );

    const unsubscribeProjects = onSnapshot(q, (snapshot) => {
      const projs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      
      // Sort: Portfolio first, then by updatedAt
      projs.sort((a, b) => {
        if (a.systemType === 'portfolio') return -1;
        if (b.systemType === 'portfolio') return 1;
        const timeA = a.updatedAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || 0;
        return timeB - timeA;
      });
      
      setProjects(projs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "projects");
    });

    const unsubscribeSettings = onSnapshot(doc(db, "user_settings", user.uid), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as UserSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `user_settings/${user.uid}`);
    });

    const publicQuery = query(
      collection(db, "projects"),
      where("isPublic", "==", true)
    );

    const unsubscribePublic = onSnapshot(publicQuery, (snapshot) => {
      const projs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      setPublicProjects(projs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "projects");
    });

    return () => {
      unsubscribeProjects();
      unsubscribeSettings();
      unsubscribePublic();
    };
  }, [user]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newProjectName.trim()) return;

    const toastId = toast.loading("Creating project...");

    try {
      // Deduct credits for project creation
      const ok = await deductCredits(user.uid, "createProject");
      if (!ok) {
        toast.error(`Insufficient credits. Creating a project costs ${CREDIT_COSTS.createProject} credits.`, { id: toastId });
        return;
      }

      const projectSlug = newProjectName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const template = TEMPLATES.find(t => t.id === selectedTemplateId) || TEMPLATES[0];

      // Check if user already has a project with this exact name
      const nameCheckSnap = await getDocs(
        query(collection(db, "projects"), where("ownerId", "==", user.uid), where("name", "==", newProjectName.trim()))
      );
      if (!nameCheckSnap.empty) {
        toast.error("You already have a project with this name. Please choose a different name.", { id: toastId });
        return;
      }
      
      const docRef = await addDoc(collection(db, "projects"), {
        name: newProjectName,
        projectSlug,
        description: newProjectDescription || template.description,
        ownerId: user.uid,
        ownerUsername: settings?.username || "anonymous",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        collaborators: [],
        isPublic: visibility === "public",
        isTemplate: false,
        forksCount: 0,
        views: 0,
        ...(selectedTemplateId === "portfolio" ? { isSystem: true, systemType: "portfolio" } : {}),
        deployUrl: `/u/${settings?.username || "anonymous"}/${projectSlug}`
      });

      // Create default files based on template
      const filesRef = collection(db, "projects", docRef.id, "files");
      
      const filePromises = template.files.map(file => 
        addDoc(filesRef, { 
          projectId: docRef.id,
          name: file.name, 
          path: file.path,
          content: file.content, 
          language: file.language, 
          updatedAt: serverTimestamp() 
        })
      );

      await Promise.all(filePromises);

      setNewProjectName("");
      setNewProjectDescription("");
      setVisibility("public");
      setSelectedTemplateId("blank");
      setIsCreating(false);
      
      toast.success("Project created successfully", { id: toastId });
      onSelectProject(docRef.id);
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project", { id: toastId });
    }
  };

  const handleTryDemo = async () => {
    if (!user) return;
    const toastId = toast.loading("Loading demo project...");

    try {
      const docRef = await addDoc(collection(db, "projects"), {
        name: "✨ Demo Project",
        description: "A sample project to explore DevOS features.",
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        collaborators: [],
        isPublic: false,
        isTemplate: false,
        forksCount: 0,
        views: 0
      });

      const filesRef = collection(db, "projects", docRef.id, "files");
      
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DevOS Demo</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="icon">✨</div>
            <h1>DevOS Demo</h1>
            <p>Edit the code on the left to see changes here instantly!</p>
            <div class="stats">
                <div class="stat">
                    <span class="value">100%</span>
                    <span class="label">Cloud</span>
                </div>
                <div class="stat">
                    <span class="value">Real-time</span>
                    <span class="label">Preview</span>
                </div>
            </div>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>`;

      const cssContent = `body {
    margin: 0;
    font-family: 'Inter', sans-serif;
    background: #050505;
    color: white;
    display: grid;
    place-items: center;
    min-height: 100vh;
}

.container {
    padding: 2rem;
}

.card {
    background: #111;
    border: 1px solid #222;
    padding: 3rem;
    border-radius: 2rem;
    text-align: center;
    max-width: 400px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
}

.icon {
    font-size: 3rem;
    margin-bottom: 1.5rem;
}

h1 {
    font-size: 2rem;
    margin-bottom: 1rem;
    letter-spacing: -0.02em;
}

p {
    color: #666;
    line-height: 1.6;
    margin-bottom: 2rem;
}

.stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    border-top: 1px solid #222;
    padding-top: 2rem;
}

.stat {
    display: flex;
    flex-direction: column;
}

.value {
    font-weight: bold;
    color: #3b82f6;
}

.label {
    font-size: 0.75rem;
    color: #444;
    text-transform: uppercase;
    letter-spacing: 0.1em;
}`;

      const jsContent = `console.log("✨ Demo project loaded! Try changing the background color in style.css");`;

      await Promise.all([
        addDoc(filesRef, { 
          projectId: docRef.id,
          name: "index.html", 
          path: "index.html",
          content: htmlContent, 
          language: "html", 
          updatedAt: serverTimestamp() 
        }),
        addDoc(filesRef, { 
          projectId: docRef.id,
          name: "style.css", 
          path: "style.css",
          content: cssContent, 
          language: "css", 
          updatedAt: serverTimestamp() 
        }),
        addDoc(filesRef, { 
          projectId: docRef.id,
          name: "script.js", 
          path: "script.js",
          content: jsContent, 
          language: "javascript", 
          updatedAt: serverTimestamp() 
        })
      ]);

      toast.success("Demo project ready!", { id: toastId });
      onSelectProject(docRef.id);
    } catch (error) {
      console.error("Error creating demo:", error);
      toast.error("Failed to load demo", { id: toastId });
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setDeleteConfirm({ projectId });
  };

  const confirmDeleteProject = async () => {
    if (!deleteConfirm) return;
    const { projectId } = deleteConfirm;
    setDeletingProject(true);
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
      toast.success("Project deleted.");
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project. Please try again.");
    } finally {
      setDeletingProject(false);
    }
  };

  const handleForkProject = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    if (!user) return;

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

      onSelectProject(docRef.id);
    } catch (error) {
      console.error("Error forking project:", error);
    }
  };

  const handleResetPortfolio = async (portfolio: Project) => {
    if (!user) return;
    setResetPortfolioConfirm(portfolio);
  };

  const confirmResetPortfolio = async () => {
    const portfolio = resetPortfolioConfirm;
    if (!user || !portfolio) return;
    setResettingPortfolio(true);
    try {
      // Delete existing files in batches of 500
      const filesSnap = await getDocs(collection(db, "projects", portfolio.id, "files"));
      const BATCH_SIZE = 500;
      const docs = filesSnap.docs;
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        docs.slice(i, i + BATCH_SIZE).forEach((f) => batch.delete(f.ref));
        await batch.commit();
      }

      // Restore default portfolio files
      const username = settings?.username || "user";
      const defaultFiles = [
        {
          name: "portfolio.json",
          path: "portfolio.json",
          language: "json",
          content: JSON.stringify({
            displayName: settings?.displayName || user.displayName || username,
            username,
            bio: settings?.bio || "Full-stack developer. Building cool things with DevOS.",
            featuredProjects: [],
            socialLinks: { github: "", twitter: "", linkedin: "" },
          }, null, 2),
        },
        {
          name: "layout.json",
          path: "layout.json",
          language: "json",
          content: JSON.stringify({ sections: ["hero", "projects", "activity"] }, null, 2),
        },
        {
          name: "theme.json",
          path: "theme.json",
          language: "json",
          content: JSON.stringify({ colorScheme: "dark", accentColor: "#3b82f6" }, null, 2),
        },
      ];
      const filesRef = collection(db, "projects", portfolio.id, "files");
      await Promise.all(
        defaultFiles.map((f) =>
          addDoc(filesRef, { ...f, projectId: portfolio.id, updatedAt: serverTimestamp() })
        )
      );
      await updateDoc(doc(db, "projects", portfolio.id), { updatedAt: serverTimestamp() });
      toast.success("Portfolio reset to default.");
      setResetPortfolioConfirm(null);
    } catch {
      toast.error("Failed to reset portfolio.");
    } finally {
      setResettingPortfolio(false);
    }
  };

  const displayName = settings?.displayName || user?.displayName || "Developer";
  const avatarUrl = resolveAvatar(settings?.avatarUrl || user?.photoURL);

  useSEO({ title: "Dashboard — DevOS" });
  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header / Profile Section */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Welcome, {displayName}</h1>
            <div className="flex items-center gap-3">
              <p className="text-white/40">Manage your cloud-based development environments.</p>
              {settings?.username && (
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                  @{settings.username}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* Primary */}
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-white/90 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            New Project
          </button>
          {/* Secondary */}
          <button
            onClick={() => setIsQuickStarting(true)}
            className="flex items-center gap-2 px-5 py-3 bg-white/10 border border-white/10 text-white rounded-xl font-semibold hover:bg-white/15 transition-all active:scale-95"
          >
            <Rocket className="w-4 h-4 text-blue-400" />
            Quick Start
          </button>
          <button
            onClick={() => navigate("/templates")}
            className="flex items-center gap-2 px-5 py-3 bg-white/10 border border-white/10 text-white rounded-xl font-semibold hover:bg-white/15 transition-all active:scale-95"
          >
            <Layout className="w-4 h-4 text-purple-400" />
            Marketplace
          </button>
          {/* Tertiary */}
          <button
            onClick={handleTryDemo}
            className="flex items-center gap-2 px-4 py-3 text-white/40 hover:text-white/70 rounded-xl font-medium transition-all active:scale-95 text-sm"
          >
            <Sparkles className="w-4 h-4 text-yellow-500/60" />
            Try Demo
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isQuickStarting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                    <Rocket className="w-6 h-6 text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Quick Start Guide</h2>
                </div>
                <button onClick={() => setIsQuickStarting(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <X className="w-6 h-6 text-white/40" />
                </button>
              </div>
              
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  { icon: Plus, title: "1. Create a project", desc: "Start fresh or use a template to kick off your vision." },
                  { icon: Code, title: "2. Write your code", desc: "Use our powerful editor with real-time preview." },
                  { icon: Globe, title: "3. Click Deploy", desc: "Get a live, shareable link for your project instantly." },
                  { icon: Share2, title: "4. Share your project", desc: "Show off your work to the world with one click." }
                ].map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <step.icon className="w-6 h-6 text-white/60" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{step.title}</h3>
                      <p className="text-sm text-white/40 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-8 bg-white/5 flex justify-end">
                <button
                  onClick={() => {
                    setIsQuickStarting(false);
                    setIsCreating(true);
                  }}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                >
                  Let's Go!
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white tracking-tight">Create New Project</h2>
                <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <X className="w-6 h-6 text-white/40" />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="p-8 space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Project Name</label>
                    <input
                      autoFocus
                      type="text"
                      placeholder="My Awesome App"
                      value={newProjectName}
                      onChange={(e) => { setNewProjectName(e.target.value); setProjectNameTaken(false); }}
                      className={cn(
                        "w-full bg-white/5 border rounded-xl px-4 py-3 text-white focus:outline-none transition-all",
                        projectNameTaken ? "border-red-500/60 focus:border-red-500" : "border-white/10 focus:border-blue-500"
                      )}
                      required
                    />
                    {projectNameTaken && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        ✗ You already have a project with this name
                      </p>
                    )}
                    {checkingProjectName && !projectNameTaken && (
                      <p className="text-xs text-white/30">Checking availability…</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Description (Optional)</label>
                    <textarea
                      placeholder="What are you building?"
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all h-24 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setVisibility("public")}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                        visibility === "public" ? "bg-blue-600/10 border-blue-600" : "bg-white/5 border-white/5 hover:border-white/10"
                      )}
                    >
                      <Eye className={cn("w-6 h-6", visibility === "public" ? "text-blue-500" : "text-white/20")} />
                      <span className="font-bold text-sm">Public</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibility("private")}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                        visibility === "private" ? "bg-blue-600/10 border-blue-600" : "bg-white/5 border-white/5 hover:border-white/10"
                      )}
                    >
                      <EyeOff className={cn("w-6 h-6", visibility === "private" ? "text-blue-500" : "text-white/20")} />
                      <span className="font-bold text-sm">Private</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Choose a Template</label>
                    <div className="grid grid-cols-2 gap-4">
                      {TEMPLATES.map((t) => {
                        const Icon = t.icon === "Globe" ? Globe : t.icon === "User" ? UserIcon : t.icon === "Code2" ? Code : FolderCode;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedTemplateId(t.id)}
                            className={cn(
                              "p-4 rounded-2xl border-2 transition-all flex flex-col items-start gap-2 text-left",
                              selectedTemplateId === t.id ? "bg-blue-600/10 border-blue-600" : "bg-white/5 border-white/5 hover:border-white/10"
                            )}
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center mb-1",
                              selectedTemplateId === t.id ? "bg-blue-600 text-white" : "bg-white/5 text-white/40"
                            )}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-sm text-white">{t.name}</span>
                            <p className="text-[10px] text-white/40 leading-tight">{t.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-8 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-6 py-3 rounded-xl font-bold text-white/40 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={projectNameTaken || checkingProjectName}
                    className="px-10 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Continue Working banner ─── */}
      {activeTab === "my-projects" && (() => {
        const last = projects.find((p) => p.systemType !== "portfolio" && p.ownerId === user?.uid);
        if (!last) return null;
        return (
          <div className="mb-8 rounded-2xl bg-gradient-to-r from-blue-600/10 to-blue-500/5 border border-blue-500/20 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-blue-400/70 font-bold uppercase tracking-widest mb-1">Continue Working</p>
              <h3 className="text-white font-bold text-base truncate">{last.name}</h3>
              <p className="text-xs text-white/40 mt-0.5">
                Last updated {formatRelativeTime(last.updatedAt)}
                {last.description && <> · {last.description}</>}
              </p>
            </div>
            <button
              onClick={() => onSelectProject(last.id)}
              className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all active:scale-[0.97]"
            >
              <ChevronRight className="w-4 h-4" />
              Resume
            </button>
          </div>
        );
      })()}

      <div className="flex gap-8 mb-8 border-b border-white/5">
        <button
          onClick={() => setActiveTab("my-projects")}
          className={cn(
            "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative",
            activeTab === "my-projects" ? "text-white" : "text-white/20 hover:text-white/40"
          )}
        >
          My Projects
          {activeTab === "my-projects" && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("public-projects")}
          className={cn(
            "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative",
            activeTab === "public-projects" ? "text-white" : "text-white/20 hover:text-white/40"
          )}
        >
          Explore Public
          {activeTab === "public-projects" && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(activeTab === "my-projects" ? projects : publicProjects).map((project) => (
          <motion.div
            key={project.id}
            whileHover={{ y: -2 }}
            className={cn(
              "group rounded-2xl border transition-all relative flex flex-col",
              project.systemType === 'portfolio'
                ? "bg-gradient-to-br from-yellow-500/5 to-yellow-600/5 border-yellow-500/20 hover:border-yellow-500/40"
                : "bg-[#111] border-white/5 hover:border-white/20"
            )}
          >
            {/* Portfolio badge */}
            {project.systemType === 'portfolio' && (
              <div className="px-4 pt-3 pb-0">
                <span className="text-[10px] font-bold text-yellow-400/80 uppercase tracking-widest">
                  ⭐ Your Public Profile
                </span>
              </div>
            )}

            {/* Card body */}
            <div
              className="p-5 flex-1 cursor-pointer"
              onClick={() => onSelectProject(project.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                  project.systemType === 'portfolio' ? "bg-yellow-600/20 text-yellow-500 group-hover:bg-yellow-600 group-hover:text-white" :
                  project.isTemplate ? "bg-purple-600/20 text-purple-500 group-hover:bg-purple-600 group-hover:text-white" : "bg-blue-600/20 text-blue-500 group-hover:bg-blue-600 group-hover:text-white"
                )}>
                  {project.systemType === 'portfolio' ? <UserIcon className="w-5 h-5" /> : <FolderCode className="w-5 h-5" />}
                </div>
                <div className="flex gap-1.5 items-center">
                  {project.isPublic ? (
                    <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider">Public</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-white/5 text-white/30 text-[10px] font-bold uppercase tracking-wider">Private</span>
                  )}
                  {project.isTemplate && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase tracking-wider">Template</span>
                  )}
                </div>
              </div>
              <h3 className="text-base font-bold text-white mb-1">{project.name}</h3>
              {project.description && (
                <p className="text-xs text-white/40 mb-3 line-clamp-2 leading-relaxed">{project.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-white/30">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatRelativeTime(project.updatedAt)}</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <div className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{project.views || 0}</span>
                </div>
              </div>
            </div>

            {/* Card actions footer */}
            <div className="px-4 pb-4 flex gap-2">
              {project.systemType === 'portfolio' ? (
                /* Portfolio-specific actions */
                <>
                  <button
                    onClick={() => onSelectProject(project.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-all text-xs font-bold"
                  >
                    <FolderCode className="w-3.5 h-3.5" />
                    Open
                  </button>
                  {settings?.username && (
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/u/${settings.username}`); }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all text-xs font-bold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Portfolio
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleResetPortfolio(project); }}
                    disabled={resettingPortfolio}
                    className="flex items-center justify-center px-3 py-2 rounded-lg bg-white/5 text-white/30 hover:bg-orange-500/10 hover:text-orange-400 transition-all"
                    title="Reset Portfolio"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", resettingPortfolio && "animate-spin")} />
                  </button>
                  <ProjectShareButton project={project} username={settings?.username} avatarUrl={settings?.avatarUrl} />
                </>
              ) : project.ownerId === user?.uid ? (
                /* Owner actions */
                <>
                  <button
                    onClick={() => onSelectProject(project.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 transition-all text-xs font-bold"
                  >
                    <FolderCode className="w-3.5 h-3.5" />
                    Open
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSettingsProject(project); }}
                    className="flex items-center justify-center px-3 py-2 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all"
                    title="Project Settings"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  {!['portfolio' as string].includes(project.systemType ?? '') && !project.isTemplate && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPublishTemplateProject(project); }}
                      className="flex items-center justify-center px-3 py-2 rounded-lg bg-white/5 text-white/30 hover:bg-purple-500/10 hover:text-purple-400 transition-all"
                      title="Publish as Template"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!['portfolio' as string].includes(project.systemType ?? '') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onSelectProject(project.id); }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all"
                      title="Deploy project (open IDE → Deploy tab)"
                    >
                      <Rocket className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ProjectShareButton project={project} username={settings?.username} avatarUrl={settings?.avatarUrl} />
                  {project.isDeletable !== false && (
                    <button
                      onClick={(e) => handleDeleteProject(e, project.id)}
                      className="flex items-center justify-center px-3 py-2 rounded-lg bg-white/5 text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-all"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              ) : (
                /* Public project - fork */
                <>
                  <button
                    onClick={() => onSelectProject(project.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all text-xs font-bold"
                  >
                    <FolderCode className="w-3.5 h-3.5" />
                    Open
                  </button>
                  <button
                    onClick={(e) => handleForkProject(e, project)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all text-xs font-bold"
                    title="Fork Project"
                  >
                    <GitFork className="w-3.5 h-3.5" />
                    Fork
                  </button>
                  <ProjectShareButton project={project} username={project.ownerUsername} avatarUrl={null} />
                </>
              )}
            </div>
          </motion.div>
        ))}

        {(activeTab === "my-projects" ? projects : publicProjects).length === 0 && !isCreating && (
          <div className="col-span-full py-20 text-center rounded-3xl border-2 border-dashed border-white/5">
            <FolderCode className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 font-medium mb-6">
              {activeTab === "my-projects" ? "No projects yet. Create your first one to get started!" : "No public projects found."}
            </p>
            {activeTab === "my-projects" && (
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Create Project
                </button>
                <button
                  onClick={() => navigate("/templates")}
                  className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all active:scale-95"
                >
                  <Layout className="w-4 h-4 text-purple-400" />
                  Use Template
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-24 pt-12 border-t border-white/5 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-white/20 text-sm font-medium">
          Built with <span className="text-white/40 font-bold tracking-tight">DevOS</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-white/10 font-bold uppercase tracking-[0.2em]">
          <span>Cool Shot Systems</span>
          <div className="w-1 h-1 rounded-full bg-white/5" />
          <span>Tech Visionaries Network</span>
        </div>
      </div>

      {publishTemplateProject && (
        <PublishTemplateModal
          isOpen={!!publishTemplateProject}
          onClose={() => setPublishTemplateProject(null)}
          projectName={publishTemplateProject.name}
          projectId={publishTemplateProject.id}
        />
      )}

      {settingsProject && (
        <ProjectSettingsModal
          project={settingsProject}
          isOpen={!!settingsProject}
          onClose={() => setSettingsProject(null)}
        />
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Project"
        description="This will permanently delete this project, all its files, commits, and pull requests."
        warning="This action cannot be undone."
        confirmLabel="Delete Project"
        loading={deletingProject}
        onConfirm={confirmDeleteProject}
        onCancel={() => setDeleteConfirm(null)}
      />

      <ConfirmModal
        open={!!resetPortfolioConfirm}
        title="Reset Portfolio"
        description="This will remove all your custom files and restore the default template. Your profile URL remains unchanged."
        warning="This action cannot be undone."
        confirmLabel="Reset Portfolio"
        loading={resettingPortfolio}
        onConfirm={confirmResetPortfolio}
        onCancel={() => setResetPortfolioConfirm(null)}
      />
    </div>
  );
}

/* ─── Project Share Button ─── */

function ProjectShareButton({
  project,
  username,
  avatarUrl,
}: {
  project: Project;
  username?: string | null;
  avatarUrl?: string | null;
}) {
  const shareCardRef = useRef<HTMLDivElement>(null);
  const filename = `devos-${project.name.replace(/\s+/g, "-").toLowerCase().slice(0, 40)}.png`;
  const { capture, capturing } = useShareAsImage(shareCardRef, filename);

  return (
    <>
      <ProjectShareCard
        project={project}
        username={username}
        avatarUrl={avatarUrl}
        cardRef={shareCardRef}
      />
      <button
        onClick={(e) => { e.stopPropagation(); capture(); }}
        disabled={capturing}
        className="flex items-center justify-center px-3 py-2 rounded-lg bg-white/5 text-white/30 hover:bg-blue-500/10 hover:text-blue-400 transition-all disabled:opacity-50"
        title="Share as Image"
      >
        {capturing ? (
          <span className="w-3.5 h-3.5 border-[1.5px] border-white/20 border-t-blue-400 rounded-full animate-spin" />
        ) : (
          <ImageDown className="w-3.5 h-3.5" />
        )}
      </button>
    </>
  );
}
