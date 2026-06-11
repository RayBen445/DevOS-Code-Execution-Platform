import React, { useState, useEffect, useRef, useMemo } from "react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDocs, updateDoc, increment, writeBatch } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Plus, FolderCode, Clock, Calendar, Users, ChevronRight, ChevronDown, Github, Trash2, User as UserIcon, GitFork, Zap, Rocket, Sparkles, X, Layout, Code, Globe, Share2, Eye, EyeOff, Upload, Settings, RefreshCw, ExternalLink, ImageDown, Building2, Tag, FolderOpen, Check, Search, Pin, PinOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Project, UserSettings } from "../types";
import { cn, formatRelativeTime, toValidDate, generateAppId } from '../lib/utils';
import GitHubImportModal from "./GitHubImportModal";
import PublishTemplateModal from "./PublishTemplateModal";
import ProjectSettingsModal from "./ProjectSettingsModal";
import ConfirmModal from "./ConfirmModal";
import { toast } from "sonner";
import { TEMPLATES, ProjectTemplate } from "../constants/templates";
import premiumPortfolioTemplate from "../templates/premiumPortfolioTemplate.json";
import { deductCredits, getCredits, CREDIT_COSTS } from "../lib/creditsService";
import { resolveAvatar } from "../lib/avatars";
import { useSEO } from "../hooks/useSEO";
import { useNavigate } from "react-router-dom";
import { ProjectShareCard, useShareAsImage } from "./ShareAsImageCard";
import { emitBotEventWithToast } from "../lib/botEngine";
import { sendNotification } from "../lib/notificationService";
import { createFeedPost } from "../lib/feedService";
import CreateOrgModal from "./CreateOrgModal";
import { useActiveContext } from "../hooks/useActiveContext";
import CustomSelect from "./CustomSelect";
import LiveMap from "./LiveMap";

interface DashboardProps {
  onSelectProject: (projectId: string) => void;
}

export default function Dashboard({ onSelectProject }: DashboardProps) {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const { context } = useActiveContext();
  const isOrgWorkspace = context?.type === "org";
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
  const [selectedCategory, setSelectedCategory] = useState<string>("All Templates");
  const [selectedLicense, setSelectedLicense] = useState<string>("none");
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [publicProjects, setPublicProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<"my-projects" | "public-projects">("my-projects");
  const [publishTemplateProject, setPublishTemplateProject] = useState<Project | null>(null);
  const [settingsProject, setSettingsProject] = useState<Project | null>(null);
  // Confirm modals
  const [deleteConfirm, setDeleteConfirm] = useState<{ projectId: string } | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  // Project grouping
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [groupPopoverProjectId, setGroupPopoverProjectId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

    let q;
    if (isOrgWorkspace && context?.type === "org") {
      // In org workspace: show projects owned by the org
      q = query(
        collection(db, "projects"),
        where("ownerOrgId", "==", context.id),
        where("ownerType", "==", "organization")
      );
    } else {
      // Personal workspace: show user-owned personal projects
      q = query(
        collection(db, "projects"),
        where("ownerId", "==", user.uid)
      );
    }

    const unsubscribeProjects = onSnapshot(q, (snapshot) => {
      const projs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];

      let filtered: Project[];
      if (isOrgWorkspace) {
        // Org workspace: show all org projects
        filtered = projs;
      } else {
        // Personal workspace: exclude org-owned projects
        filtered = projs.filter(p => p.ownerType !== "organization");
      }

      // Sort by updatedAt descending
      filtered.sort((a, b) => {
        const timeA = a.updatedAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || 0;
        return timeB - timeA;
      });
      
      setProjects(filtered);
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
  }, [user, context]);

  const marketplaceTemplates = publicProjects.filter(p => p.isTemplate);
  const allAvailableTemplates = useMemo(() => [
    ...TEMPLATES.map(t => ({ 
      id: t.id, 
      name: t.name, 
      description: t.description, 
      icon: t.icon, 
      category: t.category || "Starters", 
      source: "hardcoded" as const, 
      files: t.files 
    })),
    ...marketplaceTemplates.map(p => ({ 
      id: p.id, 
      name: p.name, 
      description: p.description || "", 
      icon: "Globe", 
      category: "Marketplace", 
      source: "firestore" as const, 
      project: p 
    }))
  ], [publicProjects]);

  const templateCategories = useMemo(() => 
    ["All Templates", ...Array.from(new Set(allAvailableTemplates.map(t => t.category)))], 
  [allAvailableTemplates]);

  const displayedTemplates = selectedCategory === "All Templates" 
    ? allAvailableTemplates 
    : allAvailableTemplates.filter(t => t.category === selectedCategory);

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
      const template = allAvailableTemplates.find(t => t.id === selectedTemplateId) || allAvailableTemplates[0];

      // Check if user already has a project with this exact name
      const nameCheckSnap = await getDocs(
        query(collection(db, "projects"), where("ownerId", "==", user.uid), where("name", "==", newProjectName.trim()))
      );
      if (!nameCheckSnap.empty) {
        toast.error("You already have a project with this name. Please choose a different name.", { id: toastId });
        return;
      }
      
      const docRef = await addDoc(collection(db, "projects"), {
      appId: generateAppId(),
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
        deployUrl: `/@${settings?.username || "anonymous"}/${projectSlug}`,
        systemType: template.id === "premium-portfolio" ? "portfolio" : undefined
      });

      // Create default files based on template
      const filesRef = collection(db, "projects", docRef.id, "files");
      
      
      if (template.id === "premium-portfolio") {
        const displayName = settings?.displayName || settings?.username || "Developer";
        const username = settings?.username || "anonymous";
        
        let portfolioJsonString = JSON.stringify(premiumPortfolioTemplate, null, 2);
        portfolioJsonString = portfolioJsonString.replace(/{{displayName}}/g, displayName);
        portfolioJsonString = portfolioJsonString.replace(/{{username}}/g, username);

        await addDoc(filesRef, {
          projectId: docRef.id,
          name: "portfolio.json",
          path: "/portfolio.json",
          content: portfolioJsonString,
          language: "json",
          updatedAt: serverTimestamp()
        });
      }

      if (template.source === "hardcoded") {
        const filePromises = template.files.map(file => 
          addDoc(filesRef, { 
            projectId: docRef.id,
            name: file.name || "Untitled", 
            path: file.path || file.name || "Untitled",
            content: file.content || "", 
            language: file.language || "plaintext", 
            updatedAt: serverTimestamp() 
          })
        );
        await Promise.all(filePromises);
      } else {
        const tplFilesSnap = await getDocs(collection(db, "projects", template.project!.id, "files"));
        const filePromises = tplFilesSnap.docs.map(fileDoc => {
          const fileData = fileDoc.data();
          return addDoc(filesRef, {
            ...fileData,
            projectId: docRef.id,
            updatedAt: serverTimestamp()
          });
        });
        await Promise.all(filePromises);
        
        await updateDoc(doc(db, "projects", template.project!.id), {
          forksCount: increment(1)
        });
      }

      // Auto-add README.md
      await addDoc(filesRef, {
        projectId: docRef.id,
        name: "README.md",
        path: "/README.md",
        content: `# ${newProjectName.trim()}\n\n${newProjectDescription.trim() || "A project built on DevOS."}\n\n## Getting Started\n\nOpen this project in the DevOS IDE and start building!\n`,
        language: "markdown",
        updatedAt: serverTimestamp(),
      });

      // Add LICENSE file if a license was selected
      if (selectedLicense !== "none") {
        const year = new Date().getFullYear();
        const ownerName = settings?.displayName || settings?.username || "Author";
        const licenseTexts: Record<string, string> = {
          MIT: `MIT License\n\nCopyright (c) ${year} ${ownerName}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`,
          Apache2: `Apache License\nVersion 2.0, January 2004\n\nCopyright ${year} ${ownerName}\n\nLicensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at\n\n    http://www.apache.org/licenses/LICENSE-2.0\n\nUnless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.`,
          GPL3: `GNU GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007\n\nCopyright (C) ${year} ${ownerName}\n\nThis program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.`,
        };
        await addDoc(filesRef, {
          projectId: docRef.id,
          name: "LICENSE",
          path: "/LICENSE",
          content: licenseTexts[selectedLicense] ?? "",
          language: "plaintext",
          updatedAt: serverTimestamp(),
        });
      }

      setNewProjectName("");
      setNewProjectDescription("");
      setVisibility("public");
      setSelectedTemplateId("blank");
      setSelectedLicense("none");
      setIsCreating(false);
      
      toast.success("Project created successfully", { id: toastId });
      emitBotEventWithToast({
        name: "project.created",
        payload: { projectId: docRef.id, projectName: newProjectName, userId: user.uid },
      }).catch(() => {});
      sendNotification({ userId: user.uid, type: "project_created", title: "Project created", message: `"${newProjectName}" has been created.`, createdBy: "system" }).catch(() => {});
      // Auto-post to the public feed when project is public
      if (visibility === "public" && settings?.username) {
        createFeedPost({
          userId: user.uid,
          username: settings.username,
          displayName: settings.displayName || settings.username,
          avatarUrl: settings.avatarUrl,
          content: `🚀 Just created a new project: **${newProjectName}**${newProjectDescription ? ` — ${newProjectDescription}` : ""}`,
          type: "update",
          projectId: docRef.id,
          projectName: newProjectName,
          isPublic: true,
        }).catch(() => {});
      }
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
      appId: generateAppId(),
        name: "Demo Project",
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
      sendNotification({ userId: user.uid, type: "project_deleted", title: "Project deleted", message: "Your project has been deleted.", createdBy: "system" }).catch(() => {});
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

      await updateDoc(doc(db, "projects", project.id), {
        forksCount: increment(1)
      });

      onSelectProject(docRef.id);
    } catch (error) {
      console.error("Error forking project:", error);
    }
  };

    const displayName = settings?.displayName || user?.displayName || "Developer";
  const avatarUrl = resolveAvatar(settings?.avatarUrl || user?.photoURL);

  // ── Grouping helpers ────────────────────────────────────────────────────────
  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  const handleMoveToGroup = async (projectId: string, groupValue: string | null) => {
    setSavingGroup(true);
    try {
      await updateDoc(doc(db, "projects", projectId), {
        group: groupValue ?? null,
        updatedAt: serverTimestamp(),
      });
      setGroupPopoverProjectId(null);
      setNewGroupName("");
    } catch {
      toast.error("Failed to update group.");
    } finally {
      setSavingGroup(false);
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    try {
      // If it's a portfolio project, we don't allow unpinning it
      if (project.systemType === "portfolio") {
        toast.info("Portfolio project is pinned by default");
        return;
      }
      await updateDoc(doc(db, "projects", project.id), {
        isPinned: !project.isPinned,
        updatedAt: serverTimestamp(),
      });
      toast.success(project.isPinned ? "Project unpinned" : "Project pinned");
    } catch {
      toast.error("Failed to pin/unpin project");
    }
  };

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const lowerQuery = searchQuery.toLowerCase();
    return projects.filter(p => p.name.toLowerCase().includes(lowerQuery) || p.description?.toLowerCase().includes(lowerQuery));
  }, [projects, searchQuery]);

  // Collect all unique group names from the user's projects
  const allGroupNames = useMemo(() => {
    const names = new Set<string>();
    for (const p of filteredProjects) {
      if (p.group) names.add(p.group);
    }
    return Array.from(names).sort();
  }, [filteredProjects]);

  // Compute groups for "My Projects" tab:
  //   - pinned              → Pinned section at top
  //   - user-defined group  → one section per group (sorted alphabetically)
  //   - no group            → "Ungrouped" section at bottom
  const { pinnedProjects, groupedMap, ungroupedProjects } = useMemo(() => {
    const pinned: Project[] = [];
    const grouped: Record<string, Project[]> = {};
    const ungrouped: Project[] = [];
    for (const p of filteredProjects) {
      if (p.isPinned || p.systemType === "portfolio") {
        pinned.push(p);
      } else if (p.group) {
        if (!grouped[p.group]) grouped[p.group] = [];
        grouped[p.group].push(p);
      } else {
        ungrouped.push(p);
      }
    }
    return { pinnedProjects: pinned, groupedMap: grouped, ungroupedProjects: ungrouped };
  }, [filteredProjects]);

  // ── Card renderer (used in every group section) ────────────────────────────
  const renderCard = (project: Project, animIdx: number) => {
    const isGroupPopoverOpen = groupPopoverProjectId === project.id;
    return (
      <motion.div
        key={project.id}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: animIdx * 0.04, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "group rounded-2xl border transition-all relative flex flex-col card-glow",
          "glass border-white/[0.07] hover:border-border-base"
        )}
      >
        {/* Card body */}
        <div
          className="p-5 flex-1 cursor-pointer"
          onClick={() => onSelectProject(project.id)}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
              project.isTemplate ? "bg-purple-600/20 text-purple-500 group-hover:bg-purple-600 group-hover:text-white" : "bg-blue-600/20 text-blue-500 group-hover:bg-blue-600 group-hover:text-white"
            )}>
              {project.isTemplate ? <Upload className="w-5 h-5" /> : <FolderCode className="w-5 h-5" />}
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
              {project.systemType === 'portfolio' && (
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider">Portfolio</span>
              )}
            </div>
          </div>
          <h3 className="text-base font-bold text-white mb-1">{project.name}</h3>
          {project.description && (
            <p className="text-xs text-white/40 mb-3 line-clamp-2 leading-relaxed">{project.description}</p>
          )}
          {project.group && (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400/70 text-[10px] font-medium border border-blue-500/15">
                <Tag className="w-2.5 h-2.5" />{project.group}
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/30">
            <div className="flex items-center gap-1" title="Last edited">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatRelativeTime(project.updatedAt)}</span>
            </div>
            {project.createdAt && (
              <>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <div className="flex items-center gap-1" title="Created">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{toValidDate(project.createdAt)?.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) ?? ''}</span>
                </div>
              </>
            )}
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{project.views || 0}</span>
            </div>
          </div>
        </div>

        {/* Card actions footer */}
        <div className="px-4 pb-4 flex gap-2">
          {project.ownerId === user?.uid ? (
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
              {!project.isTemplate && (
                <button
                  onClick={(e) => { e.stopPropagation(); setPublishTemplateProject(project); }}
                  className="flex items-center justify-center px-3 py-2 rounded-lg bg-white/5 text-white/30 hover:bg-purple-500/10 hover:text-purple-400 transition-all"
                  title="Publish as Template"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onSelectProject(project.id); }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all"
                title="Deploy project (open IDE → Deploy tab)"
              >
                <Rocket className="w-3.5 h-3.5" />
              </button>
              {/* ── Group button + popover ── */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGroupPopoverProjectId(isGroupPopoverOpen ? null : project.id);
                    setNewGroupName("");
                  }}
                  className={cn(
                    "flex items-center justify-center px-3 py-2 rounded-lg transition-all",
                    project.group
                      ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                      : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60"
                  )}
                  title="Move to group"
                >
                  <Tag className="w-3.5 h-3.5" />
                </button>
                <AnimatePresence>
                  {isGroupPopoverOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full right-0 mb-2 w-52 bg-card border border-border-base rounded-xl shadow-2xl z-30 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-3 py-2 border-b border-border-base">
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Move to Group</p>
                        </div>
                        <div className="py-1 max-h-48 overflow-y-auto">
                          {allGroupNames.map((gn) => (
                            <button
                              key={gn}
                              onClick={() => handleMoveToGroup(project.id, project.group === gn ? null : gn)}
                              disabled={savingGroup}
                              className="w-full flex items-center justify-between px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors text-left"
                            >
                              <span className="flex items-center gap-2">
                                <FolderOpen className="w-3.5 h-3.5 text-white/30" />
                                {gn}
                              </span>
                              {project.group === gn && <Check className="w-3.5 h-3.5 text-blue-400" />}
                            </button>
                          ))}
                          {project.group && (
                            <button
                              onClick={() => handleMoveToGroup(project.id, null)}
                              disabled={savingGroup}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors text-left"
                            >
                              <X className="w-3.5 h-3.5" />
                              Remove from group
                            </button>
                          )}
                        </div>
                        {/* New group input */}
                        <div className="px-3 py-2 border-t border-border-base">
                          <div className="flex gap-1.5">
                            <input
                              autoFocus
                              type="text"
                              placeholder="New group…"
                              value={newGroupName}
                              onChange={(e) => setNewGroupName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && newGroupName.trim()) {
                                  handleMoveToGroup(project.id, newGroupName.trim());
                                }
                              }}
                              className="flex-1 bg-white/5 border border-border-base rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-blue-500"
                            />
                            <button
                              onClick={() => { if (newGroupName.trim()) handleMoveToGroup(project.id, newGroupName.trim()); }}
                              disabled={!newGroupName.trim() || savingGroup}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              {/* ── Pin Button ── */}
              <button
                onClick={(e) => handleTogglePin(e, project)}
                className={cn(
                  "flex items-center justify-center px-3 py-2 rounded-lg transition-all",
                  project.isPinned || project.systemType === 'portfolio'
                    ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                    : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60"
                )}
                title={project.isPinned || project.systemType === 'portfolio' ? "Unpin project" : "Pin project"}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
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
    );
  };

  // Close group popover when clicking outside
  useEffect(() => {
    if (!groupPopoverProjectId) return;
    const handler = () => setGroupPopoverProjectId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [groupPopoverProjectId]);

  useSEO({ title: isOrgWorkspace && context?.type === "org" ? `${context.name} — DevOS` : "Dashboard — DevOS" });
  return (
    <div className="w-full px-4 md:px-8 py-8">
      {/* Workspace Banner */}
      {isOrgWorkspace && context?.type === "org" && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span className="text-sm text-blue-300 font-medium">
            Workspace: <span className="font-bold">{context.name}</span>
          </span>
          <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 text-[10px] font-bold uppercase tracking-wider">org</span>
        </div>
      )}
      {/* Header / Profile Section */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-white/40">
            {isOrgWorkspace && context?.type === "org"
              ? `Showing projects for ${context.name}.`
              : "Manage your cloud-based development environments."}
          </p>
          {!isOrgWorkspace && settings?.username && (
            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
              @{settings.username}
            </span>
          )}
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
          <button
            onClick={() => setShowCreateOrg(true)}
            className="flex items-center gap-2 px-5 py-3 bg-white/10 border border-border-base text-white rounded-xl font-semibold hover:bg-white/15 transition-all active:scale-95"
          >
            <Building2 className="w-4 h-4 text-blue-400" />
            New Organization
          </button>
          {/* Secondary */}
          <button
            onClick={() => setIsQuickStarting(true)}
            className="flex items-center gap-2 px-5 py-3 bg-white/10 border border-border-base text-white rounded-xl font-semibold hover:bg-white/15 transition-all active:scale-95"
          >
            <Rocket className="w-4 h-4 text-blue-400" />
            Quick Start
          </button>
          <button
            onClick={() => navigate("/marketplace")}
            className="flex items-center gap-2 px-5 py-3 bg-white/10 border border-border-base text-white rounded-xl font-semibold hover:bg-white/15 transition-all active:scale-95"
          >
            <Layout className="w-4 h-4 text-purple-400" />
            Templates
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
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
            {/* Scrollable overlay — allows the modal to scroll on short viewports */}
            <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-base border border-border-base rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-border-base flex items-center justify-between">
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
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-border-base flex items-center justify-center flex-shrink-0">
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
          </div>
        )}

        {isCreating && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
            {/* Scrollable overlay — allows the modal to scroll on short viewports */}
            <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-base border border-border-base rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-border-base flex items-center justify-between">
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
                        projectNameTaken ? "border-red-500/60 focus:border-red-500" : "border-border-base focus:border-blue-500"
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
                      className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all h-24 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setVisibility("public")}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                        visibility === "public" ? "bg-blue-600/10 border-blue-600" : "bg-white/5 border-border-base hover:border-border-base"
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
                        visibility === "private" ? "bg-blue-600/10 border-blue-600" : "bg-white/5 border-border-base hover:border-border-base"
                      )}
                    >
                      <EyeOff className={cn("w-6 h-6", visibility === "private" ? "text-blue-500" : "text-white/20")} />
                      <span className="font-bold text-sm">Private</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Choose a Template</label>
                    </div>
                    
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {templateCategories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                            selectedCategory === cat 
                              ? "bg-blue-600 text-white" 
                              : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                      {displayedTemplates.map((t) => {
                        const Icon = t.icon === "Globe" ? Globe : t.icon === "User" ? UserIcon : t.icon === "Code2" ? Code : FolderCode;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedTemplateId(t.id)}
                            className={cn(
                              "p-4 rounded-2xl border-2 transition-all flex flex-col items-start gap-2 text-left",
                              selectedTemplateId === t.id ? "bg-blue-600/10 border-blue-600" : "bg-white/5 border-border-base hover:border-border-base"
                            )}
                          >
                            <div className="flex items-center justify-between w-full mb-1">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                selectedTemplateId === t.id ? "bg-blue-600 text-white" : "bg-white/5 text-white/40"
                              )}>
                                <Icon className="w-5 h-5" />
                              </div>
                              {t.source === "firestore" && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">Community</span>
                              )}
                            </div>
                            <span className="font-bold text-sm text-white line-clamp-1">{t.name}</span>
                            <p className="text-[10px] text-white/40 leading-tight line-clamp-2">{t.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">License</label>
                    <CustomSelect
                      value={selectedLicense}
                      onChange={setSelectedLicense}
                      options={[
                        { value: "none", label: "No License" },
                        { value: "MIT", label: "MIT License" },
                        { value: "Apache2", label: "Apache License 2.0" },
                        { value: "GPL3", label: "GNU GPL v3" },
                      ]}
                    />
                    {selectedLicense !== "none" && (
                      <p className="text-xs text-white/30">A LICENSE file will be added to your project.</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-8 border-t border-border-base">
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
          </div>
        )}
      </AnimatePresence>

      {/* ─── Continue Working banner ─── */}
      {activeTab === "my-projects" && (() => {
        const last = projects.find((p) => p.ownerId === user?.uid);
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-border-base pb-4">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("my-projects")}
            className={cn(
              "text-sm font-bold uppercase tracking-widest transition-all relative",
              activeTab === "my-projects" ? "text-white" : "text-white/20 hover:text-white/40"
            )}
          >
            {isOrgWorkspace ? "Org Projects" : "My Projects"}
            {activeTab === "my-projects" && (
              <motion.div layoutId="activeTab" className="absolute -bottom-[18px] left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("public-projects")}
            className={cn(
              "text-sm font-bold uppercase tracking-widest transition-all relative",
              activeTab === "public-projects" ? "text-white" : "text-white/20 hover:text-white/40"
            )}
          >
            Explore Public
            {activeTab === "public-projects" && (
              <motion.div layoutId="activeTab" className="absolute -bottom-[18px] left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        </div>
        <div className="relative w-full sm:w-auto mt-2 sm:mt-0">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50 transition-all"
          />
        </div>
      </div>

      {/* ─── My Projects: Grouped Sections ─── */}
      {activeTab === "my-projects" && (
        <div className="space-y-8">
          {/* Pinned Projects */}
          {pinnedProjects.length > 0 && (
            <div>
              <button
                onClick={() => toggleGroupCollapse("__pinned__")}
                className="w-full flex items-center justify-between mb-4 group"
              >
                <div className="flex items-center gap-2">
                  <Pin className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-amber-500 uppercase tracking-widest">Pinned Projects</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold">
                    {pinnedProjects.length}
                  </span>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-white/20 transition-transform", collapsedGroups.has("__pinned__") && "-rotate-90")} />
              </button>
              <AnimatePresence initial={false}>
                {!collapsedGroups.has("__pinned__") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {pinnedProjects.map((p, i) => renderCard(p, i))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* User-defined named groups */}
          {allGroupNames.map((groupName, gi) => {
            const groupProjects = groupedMap[groupName] ?? [];
            const collapseKey = `__group__${groupName}`;
            return (
              <div key={groupName}>
                <button
                  onClick={() => toggleGroupCollapse(collapseKey)}
                  className="w-full flex items-center justify-between mb-4 group"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-blue-400/60" />
                    <span className="text-sm font-bold text-white/50 uppercase tracking-widest">{groupName}</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400/70 text-[10px] font-bold">
                      {groupProjects.length}
                    </span>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-white/20 transition-transform", collapsedGroups.has(collapseKey) && "-rotate-90")} />
                </button>
                <AnimatePresence initial={false}>
                  {!collapsedGroups.has(collapseKey) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {groupProjects.map((p, i) => renderCard(p, gi * 50 + i))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Ungrouped projects */}
          {ungroupedProjects.length > 0 && (
            <div>
              {/* Only show section header when there are also named groups */}
              {allGroupNames.length > 0 && (
                <button
                  onClick={() => toggleGroupCollapse("__ungrouped__")}
                  className="w-full flex items-center justify-between mb-4 group"
                >
                  <div className="flex items-center gap-2">
                    <FolderCode className="w-4 h-4 text-white/20" />
                    <span className="text-sm font-bold text-white/30 uppercase tracking-widest">Ungrouped</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-white/5 text-white/30 text-[10px] font-bold">
                      {ungroupedProjects.length}
                    </span>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-white/20 transition-transform", collapsedGroups.has("__ungrouped__") && "-rotate-90")} />
                </button>
              )}
              <AnimatePresence initial={false}>
                {!collapsedGroups.has("__ungrouped__") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {ungroupedProjects.map((p, i) => renderCard(p, allGroupNames.length * 50 + i))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Empty state */}
          {projects.length === 0 && !isCreating && (
            <div className="py-20 text-center rounded-3xl border-2 border-dashed border-border-base">
              <FolderCode className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 font-medium mb-6">No projects yet. Create your first one to get started!</p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Create Project
                </button>
                <button
                  onClick={() => navigate("/marketplace")}
                  className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-border-base text-white rounded-xl font-bold hover:bg-white/10 transition-all active:scale-95"
                >
                  <Layout className="w-4 h-4 text-purple-400" />
                  Use Template
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Explore Public: Flat Grid ─── */}
      {activeTab === "public-projects" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {publicProjects
            .filter(p => !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((project, idx) => renderCard(project, idx))}
          {publicProjects.filter(p => !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && !isCreating && (
            <div className="col-span-full py-20 text-center rounded-3xl border-2 border-dashed border-border-base">
              <FolderCode className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 font-medium mb-6">No public projects found.</p>
            </div>
          )}
        </div>
      )}

      <LiveMap className="mt-16 mb-16" />

      <div className="mt-24 pt-12 border-t border-border-base flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-white/20 text-sm font-medium">
          Built with <span className="text-white/40 font-bold tracking-tight">DevOS</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/10 font-bold uppercase tracking-[0.2em]">
          <span>Kontyra and Tech Visionary Network</span>
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

      <CreateOrgModal open={showCreateOrg} onClose={() => setShowCreateOrg(false)} />
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
  const [showShareCard, setShowShareCard] = useState(false);
  const filename = `devos-${project.name.replace(/\s+/g, "-").toLowerCase().slice(0, 40)}.png`;
  const { capture, capturing } = useShareAsImage(shareCardRef, filename);

  const handleCapture = async () => {
    setShowShareCard(true);
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await capture();
    setShowShareCard(false);
  };

  return (
    <>
      {(showShareCard || capturing) && <ProjectShareCard
        project={project}
        username={username}
        avatarUrl={avatarUrl}
        cardRef={shareCardRef}
      />}
      <button
        onClick={(e) => { e.stopPropagation(); handleCapture(); }}
        disabled={capturing}
        className="flex items-center justify-center px-3 py-2 rounded-lg bg-white/5 text-white/30 hover:bg-blue-500/10 hover:text-blue-400 transition-all disabled:opacity-50"
        title="Share as Image"
      >
        {capturing ? (
          <span className="w-3.5 h-3.5 border-[1.5px] border-border-base border-t-blue-400 rounded-full animate-spin" />
        ) : (
          <ImageDown className="w-3.5 h-3.5" />
        )}
      </button>
    </>
  );
}
