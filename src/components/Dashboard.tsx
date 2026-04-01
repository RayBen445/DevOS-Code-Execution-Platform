import React, { useState, useEffect } from "react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDocs, updateDoc, increment, writeBatch } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Plus, FolderCode, Clock, Users, ChevronRight, Github, Trash2, User as UserIcon, GitFork, Zap, Rocket, Sparkles, X, Layout, Code, Globe, Share2, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Project, UserSettings } from "../types";
import { cn, formatRelativeTime } from "../lib/utils";
import GitHubImportModal from "./GitHubImportModal";
import { toast } from "sonner";
import { TEMPLATES, ProjectTemplate } from "../constants/templates";

interface DashboardProps {
  onSelectProject: (projectId: string) => void;
}

export default function Dashboard({ onSelectProject }: DashboardProps) {
  const [user] = useAuthState(auth);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isQuickStarting, setIsQuickStarting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("blank");
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [publicProjects, setPublicProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<"my-projects" | "public-projects">("my-projects");

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
      const projectSlug = newProjectName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const template = TEMPLATES.find(t => t.id === selectedTemplateId) || TEMPLATES[0];
      
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
        ...(selectedTemplateId === "portfolio" ? { systemType: "portfolio" } : {}),
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
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;

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
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project. Please try again.");
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

  const displayName = settings?.displayName || user?.displayName || "Developer";
  const avatarUrl = settings?.avatarUrl || user?.photoURL;

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header / Profile Section */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/20">
                <UserIcon className="w-8 h-8" />
              </div>
            )}
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
        
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setIsQuickStarting(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all active:scale-95"
          >
            <Rocket className="w-5 h-5 text-blue-500" />
            Quick Start
          </button>
          <button
            onClick={handleTryDemo}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all active:scale-95"
          >
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Try Demo Project
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-white/90 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            New Project
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
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all"
                      required
                    />
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
                    className="px-10 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
            whileHover={{ y: -4 }}
            onClick={() => onSelectProject(project.id)}
            className="group p-6 rounded-2xl bg-[#111] border border-white/5 hover:border-white/20 cursor-pointer transition-all relative"
          >
            {project.ownerId === user?.uid && project.isDeletable !== false ? (
              <button
                onClick={(e) => handleDeleteProject(e, project.id)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all z-10"
                title="Delete Project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : project.ownerId !== user?.uid ? (
              <button
                onClick={(e) => handleForkProject(e, project)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-blue-500/10 text-blue-500 opacity-0 group-hover:opacity-100 hover:bg-blue-500 hover:text-white transition-all z-10 flex items-center gap-2"
                title="Fork Project"
              >
                <GitFork className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase">Fork</span>
              </button>
            ) : null}
            <div className="flex items-start justify-between mb-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                project.systemType === 'portfolio' ? "bg-yellow-600/20 text-yellow-500 group-hover:bg-yellow-600 group-hover:text-white" :
                project.isTemplate ? "bg-purple-600/20 text-purple-500 group-hover:bg-purple-600 group-hover:text-white" : "bg-blue-600/20 text-blue-500 group-hover:bg-blue-600 group-hover:text-white"
              )}>
                {project.systemType === 'portfolio' ? <UserIcon className="w-6 h-6" /> : <FolderCode className="w-6 h-6" />}
              </div>
              <div className="flex gap-2">
                {project.isPublic && (
                  <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider">Public</span>
                )}
                {project.systemType === 'portfolio' && (
                  <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 text-[10px] font-bold uppercase tracking-wider">Portfolio</span>
                )}
                {project.isTemplate && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase tracking-wider">Template</span>
                )}
                <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{project.name}</h3>
            {project.description && (
              <p className="text-sm text-white/40 mb-4 line-clamp-2">{project.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-white/40">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Updated {formatRelativeTime(project.updatedAt)}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-white/10" />
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span>{project.views || 0} views</span>
              </div>
            </div>
          </motion.div>
        ))}

        {(activeTab === "my-projects" ? projects : publicProjects).length === 0 && !isCreating && (
          <div className="col-span-full py-20 text-center rounded-3xl border-2 border-dashed border-white/5">
            <FolderCode className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 font-medium">
              {activeTab === "my-projects" ? "No projects yet. Create your first one to get started!" : "No public projects found."}
            </p>
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
    </div>
  );
}
