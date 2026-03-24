import React, { useState, useEffect } from "react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDocs, updateDoc, increment } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Plus, FolderCode, Clock, Users, ChevronRight, Github, Trash2, User as UserIcon, GitFork, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Project, UserSettings } from "../types";
import { cn } from "../lib/utils";
import GitHubImportModal from "./GitHubImportModal";

interface DashboardProps {
  onSelectProject: (projectId: string) => void;
}

export default function Dashboard({ onSelectProject }: DashboardProps) {
  const [user] = useAuthState(auth);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isTemplate, setIsTemplate] = useState(false);
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

    try {
      const docRef = await addDoc(collection(db, "projects"), {
        name: newProjectName,
        description: newProjectDescription,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        collaborators: [],
        isPublic,
        isTemplate,
        forksCount: 0
      });

      // Create initial index.js file
      await addDoc(collection(db, "projects", docRef.id, "files"), {
        projectId: docRef.id,
        name: "index.js",
        path: "index.js",
        content: "// Welcome to DevOS!\nconsole.log('Hello World');",
        language: "javascript",
        updatedAt: serverTimestamp()
      });

      setNewProjectName("");
      setNewProjectDescription("");
      setIsPublic(false);
      setIsTemplate(false);
      setIsCreating(false);
      onSelectProject(docRef.id);
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;

    try {
      // Delete files subcollection first
      const filesRef = collection(db, "projects", projectId, "files");
      const filesSnapshot = await getDocs(filesRef);
      const deletePromises = filesSnapshot.docs.map(fileDoc => deleteDoc(fileDoc.ref));
      await Promise.all(deletePromises);

      // Delete the project document
      await deleteDoc(doc(db, "projects", projectId));
    } catch (error) {
      console.error("Error deleting project:", error);
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
        
        <div className="flex gap-4">
          <button
            onClick={() => setIsImporting(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all active:scale-95"
          >
            <Github className="w-5 h-5" />
            Import from GitHub
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

      <GitHubImportModal
        isOpen={isImporting}
        onClose={() => setIsImporting(false)}
        onImportComplete={(projectId) => {
          setIsImporting(false);
          onSelectProject(projectId);
        }}
      />

      {isCreating && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 p-8 rounded-2xl bg-white/5 border border-white/10"
        >
          <form onSubmit={handleCreateProject} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-white/40 uppercase tracking-wider">Project Name</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. My Awesome App"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-white/40 uppercase tracking-wider">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="What are you building?"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={cn(
                  "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                  isPublic ? "bg-blue-600 border-blue-600" : "border-white/10 group-hover:border-white/20"
                )}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                  {isPublic && <Plus className="w-4 h-4 text-white rotate-45" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">Public Project</span>
                  <span className="text-[10px] text-white/40">Visible to everyone, can be forked</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={cn(
                  "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                  isTemplate ? "bg-purple-600 border-purple-600" : "border-white/10 group-hover:border-white/20"
                )}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={isTemplate}
                    onChange={(e) => setIsTemplate(e.target.checked)}
                  />
                  {isTemplate && <Plus className="w-4 h-4 text-white rotate-45" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">Use as Template</span>
                  <span className="text-[10px] text-white/40">Others can use this to start new projects</span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-6 py-3 rounded-xl font-bold text-white/60 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
              >
                Create Project
              </button>
            </div>
          </form>
        </motion.div>
      )}

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
            {project.ownerId === user?.uid ? (
              <button
                onClick={(e) => handleDeleteProject(e, project.id)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all z-10"
                title="Delete Project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={(e) => handleForkProject(e, project)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-blue-500/10 text-blue-500 opacity-0 group-hover:opacity-100 hover:bg-blue-500 hover:text-white transition-all z-10 flex items-center gap-2"
                title="Fork Project"
              >
                <GitFork className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase">Fork</span>
              </button>
            )}
            <div className="flex items-start justify-between mb-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                project.isTemplate ? "bg-purple-600/20 text-purple-500 group-hover:bg-purple-600 group-hover:text-white" : "bg-blue-600/20 text-blue-500 group-hover:bg-blue-600 group-hover:text-white"
              )}>
                <FolderCode className="w-6 h-6" />
              </div>
              <div className="flex gap-2">
                {project.isPublic && (
                  <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider">Public</span>
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
                <span>Just now</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>{project.collaborators.length + 1}</span>
              </div>
              {project.forksCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span>{project.forksCount}</span>
                </div>
              )}
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

      <div className="mt-24 pt-12 border-t border-white/5 flex items-center justify-center gap-2 text-white/20 text-sm font-medium">
        Powered by <span className="text-white/40">Cool Shot Systems</span> & <span className="text-white/40">Tech Visionaries Network</span>
      </div>
    </div>
  );
}
