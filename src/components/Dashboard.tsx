import React, { useState, useEffect, useRef, useMemo } from "react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDocs, updateDoc, increment, writeBatch } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import * as lucideIcons from "lucide-react";
import { LayoutTemplate, Folder, Plus, FolderCode, Clock, Calendar, Users, ChevronRight, ChevronDown, Github, Trash2, User as UserIcon, GitFork, Zap, Rocket, Sparkles, X, Layout, Code, Globe, Share2, Eye, EyeOff, Upload, Settings, RefreshCw, ExternalLink, ImageDown, Building2, Tag, FolderOpen, Check, Search, Pin, PinOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Project, UserSettings } from "../types";
import { cn, formatRelativeTime, toValidDate, generateAppId } from '../lib/utils';
import QuickStartModal from "./QuickStartModal";
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
  const [selectedView, setSelectedView] = useState<string>("all");
  const [customFolders, setCustomFolders] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('devos_custom_folders') || '[]'); } catch { return []; }
  });
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  useEffect(() => { localStorage.setItem('devos_custom_folders', JSON.stringify(customFolders)); }, [customFolders]);
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim() && !customFolders.includes(newFolderName.trim())) {
      setCustomFolders([...customFolders, newFolderName.trim()]);
    }
    setNewFolderName("");
    setIsCreatingFolder(false);
  };

  // One-time cleanup for duplicate system portfolios
  useEffect(() => {
    if (!user || projects.length === 0) return;
    const cleanup = async () => {
      const portfolios = projects.filter(p => p.systemType === "portfolio");
      if (portfolios.length <= 1) return; // Nothing to clean up
      
      // Sort by updatedAt descending
      const sorted = [...portfolios].sort((a, b) => {
        const aTime = a.updatedAt ? (a.updatedAt as any).toMillis() : 0;
        const bTime = b.updatedAt ? (b.updatedAt as any).toMillis() : 0;
        return bTime - aTime;
      });

      const batch = writeBatch(db);
      let changes = false;

      // Keep the most recent one as isSystem = true, downgrade the rest
      for (let i = 0; i < sorted.length; i++) {
        const p = sorted[i];
        if (i === 0) {
          if (!p.isSystem) {
            batch.update(doc(db, "projects", p.id), { isSystem: true });
            changes = true;
          }
        } else {
          if (p.isSystem || p.isPinned) {
            batch.update(doc(db, "projects", p.id), { 
              isSystem: false,
              isPinned: false
            });
            changes = true;
          }
        }
      }

      if (changes) {
        try {
          await batch.commit();
          console.log("Cleaned up duplicate system portfolios.");
        } catch (e) {
          console.error("Cleanup failed:", e);
        }
      }
    };
    cleanup();
  }, [user, projects]);
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
        // Org workspace: show all org projects, but exclude portfolios and admin projects
        filtered = projs.filter(p => p.systemType !== "portfolio" && p.ownerType !== "admin" && !p.isAdminProject);
      } else {
        // Personal workspace: exclude org-owned, admin, and portfolio projects
        filtered = projs.filter(p =>
          p.ownerType !== "organization" &&
          p.ownerType !== "admin" &&
          !p.isAdminProject &&
          p.systemType !== "portfolio"
        );
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
      
      const projectData: any = {
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
        deployUrl: `/@${settings?.username || "anonymous"}/${projectSlug}`
      };
      const docRef = await addDoc(collection(db, "projects"), projectData);
      const filesRef = collection(db, "projects", docRef.id, "files");
      
      if ("files" in template && template.files && template.files.length > 0) {
        const filePromises = template.files.map((file: any) => 
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
      } else if ("project" in template && (template as any).project) {
        const tplFilesSnap = await getDocs(collection(db, "projects", (template as any).project.id, "files"));
        const filePromises = tplFilesSnap.docs.map(fileDoc => {
          const fileData = fileDoc.data();
          return addDoc(filesRef, {
            ...fileData,
            projectId: docRef.id,
            updatedAt: serverTimestamp()
          });
        });
        await Promise.all(filePromises);
        
        await updateDoc(doc(db, "projects", (template as any).project.id), {
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
      window.location.href = '/project/' + docRef.id + '?demo=true';
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
      window.location.href = '/project/' + docRef.id + '?demo=true';
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

      window.location.href = '/project/' + docRef.id + '?demo=true';
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
      // If it's a system portfolio project, we don't allow unpinning it
      if (project.systemType === "portfolio" && project.isSystem) {
        toast.info("Your primary portfolio project is pinned by default");
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
              {project.systemType === 'portfolio' && project.isSystem && (
                <span className="px-2 py-0.5 rounded-md bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(59,130,246,0.5)]">Official Portfolio</span>
              )}
            </div>
          </div>
          <h3 className={cn("text-base font-bold mb-1", project.systemType === 'portfolio' && project.isSystem ? "text-blue-100" : "text-white")}>
            {(() => {
              if (project.systemType === "portfolio") {
                if (project.isSystem) return "Support Portfolio";
                if (project.ownerUsername) return `${project.ownerUsername} Portfolio`;
                return "User Portfolio";
              }
              return project.name;
            })()}
          </h3>
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
              {!(project.systemType === 'portfolio' && project.isSystem) && (
                <button
                  onClick={(e) => handleTogglePin(e, project)}
                  className={`p-2 rounded-xl transition-all ${
                    project.isPinned
                      ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                      : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
                  }`}
                  title={project.isPinned ? "Unpin project" : "Pin project"}
                >
                  <Pin className="w-3.5 h-3.5" />
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
  
  // Projects to show in the right pane based on selectedView
  let displayedGridProjects = [];
  let gridTitle = "";
  if (activeTab === "public-projects") {
    displayedGridProjects = publicProjects.filter(p => !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    gridTitle = "Explore Public";
  } else {
    if (selectedView === "all") {
      displayedGridProjects = filteredProjects;
      gridTitle = "All Projects";
    } else if (selectedView === "pinned") {
      displayedGridProjects = pinnedProjects.filter(p => !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()));
      gridTitle = "Pinned Projects";
    } else if (selectedView.startsWith("group:")) {
      const gName = selectedView.substring(6);
      displayedGridProjects = (groupedMap[gName] || []).filter(p => !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()));
      gridTitle = gName;
    } else if (selectedView === "ungrouped") {
      displayedGridProjects = ungroupedProjects.filter(p => !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()));
      gridTitle = "Ungrouped";
    }
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 py-8 flex flex-col lg:flex-row gap-8">
      {/* ── LEFT SIDEBAR ── */}
      <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-6">
        {/* Workspace Banner */}
        {isOrgWorkspace && context?.type === "org" && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-blue-400/70 font-bold uppercase tracking-wider">Workspace</span>
              <span className="text-sm text-blue-300 font-bold truncate max-w-[150px]">{context.name}</span>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-[1.02] transition-all active:scale-95 border border-blue-400/20"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsQuickStarting(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl font-semibold hover:bg-white/10 transition-all active:scale-95 text-xs"
            >
              <Rocket className="w-3.5 h-3.5 text-blue-400" />
              Quick Start
            </button>
            <button
              onClick={() => navigate("/marketplace")}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl font-semibold hover:bg-white/10 transition-all active:scale-95 text-xs"
            >
              <Layout className="w-3.5 h-3.5 text-purple-400" />
              Templates
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 mb-2">Views</p>
          <button
            onClick={() => { setActiveTab("my-projects"); setSelectedView("all"); }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative overflow-hidden group",
              activeTab === "my-projects" && selectedView === "all" ? "bg-white/[0.08] text-white shadow-inner" : "text-white/50 hover:bg-white/[0.04] hover:text-white"
            )}
          >
            {activeTab === "my-projects" && selectedView === "all" && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
            )}
            <FolderCode className={cn("w-4 h-4 transition-colors", activeTab === "my-projects" && selectedView === "all" ? "text-blue-400" : "group-hover:text-blue-400/70")} />
            All Projects
            <span className={cn("ml-auto text-xs px-2.5 py-0.5 rounded-full font-bold transition-colors", activeTab === "my-projects" && selectedView === "all" ? "bg-blue-500/20 text-blue-300" : "bg-white/5 text-white/40")}>{projects.length}</span>
          </button>
          
          <button
            onClick={() => setActiveTab("public-projects")}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative overflow-hidden group",
              activeTab === "public-projects" ? "bg-white/[0.08] text-white shadow-inner" : "text-white/50 hover:bg-white/[0.04] hover:text-white"
            )}
          >
            {activeTab === "public-projects" && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-green-500 rounded-r-full shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
            )}
            <Globe className={cn("w-4 h-4 transition-colors", activeTab === "public-projects" ? "text-green-400" : "group-hover:text-green-400/70")} />
            Explore Public
          </button>
          
          <button
            onClick={() => setShowCreateOrg(true)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:bg-white/[0.04] hover:text-white transition-all group"
          >
            <Building2 className="w-4 h-4 transition-colors group-hover:text-white/80" />
            New Organization
          </button>
        </div>

        {/* Folders / Groups */}
        {activeTab === "my-projects" && (
          <div className="flex flex-col gap-1.5 mt-4">
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Folders</p>
              <button onClick={() => setIsCreatingFolder(true)} className="text-white/30 hover:text-white/80 transition-colors p-1 rounded-md hover:bg-white/10" title="New Folder">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {isCreatingFolder && (
              <form onSubmit={handleCreateFolder} className="px-3 mb-2">
                <input
                  autoFocus
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onBlur={() => { if(!newFolderName) setIsCreatingFolder(false); }}
                  placeholder="Folder name..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                />
              </form>
            )}
            {pinnedProjects.length > 0 && (
              <button
                onClick={() => setSelectedView("pinned")}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative overflow-hidden group",
                  selectedView === "pinned" ? "bg-amber-500/10 text-amber-400 shadow-inner" : "text-white/50 hover:bg-white/[0.04] hover:text-white"
                )}
              >
                {selectedView === "pinned" && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-amber-500 rounded-r-full shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                )}
                <Pin className={cn("w-4 h-4 transition-colors", selectedView === "pinned" ? "text-amber-500" : "group-hover:text-amber-500/70")} />
                Pinned
                <span className={cn("ml-auto text-xs px-2.5 py-0.5 rounded-full font-bold transition-colors", selectedView === "pinned" ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-white/40")}>{pinnedProjects.length}</span>
              </button>
            )}
            
            {allGroupNames.map(gn => (
              <button
                key={gn}
                onClick={() => setSelectedView(`group:${gn}`)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative overflow-hidden group truncate",
                  selectedView === `group:${gn}` ? "bg-blue-500/10 text-blue-300 shadow-inner" : "text-white/50 hover:bg-white/[0.04] hover:text-white"
                )}
              >
                {selectedView === `group:${gn}` && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                )}
                <FolderOpen className={cn("w-4 h-4 flex-shrink-0 transition-colors", selectedView === `group:${gn}` ? "text-blue-400 fill-blue-500/20" : "group-hover:text-blue-400/70")} />
                <span className="truncate">{gn}</span>
                <span className={cn("ml-auto text-xs px-2.5 py-0.5 rounded-full font-bold flex-shrink-0 transition-colors", selectedView === `group:${gn}` ? "bg-blue-500/20 text-blue-300" : "bg-white/5 text-white/40")}>{(groupedMap[gn] || []).length}</span>
              </button>
            ))}

            {ungroupedProjects.length > 0 && allGroupNames.length > 0 && (
              <button
                onClick={() => setSelectedView("ungrouped")}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative overflow-hidden group",
                  selectedView === "ungrouped" ? "bg-white/[0.08] text-white shadow-inner" : "text-white/50 hover:bg-white/[0.04] hover:text-white"
                )}
              >
                {selectedView === "ungrouped" && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                )}
                <Folder className={cn("w-4 h-4 transition-colors", selectedView === "ungrouped" ? "text-white" : "group-hover:text-white/80")} />
                Ungrouped
                <span className={cn("ml-auto text-xs px-2.5 py-0.5 rounded-full font-bold transition-colors", selectedView === "ungrouped" ? "bg-white/20 text-white" : "bg-white/5 text-white/40")}>{ungroupedProjects.length}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT MAIN AREA ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        
        {/* Top Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">{gridTitle}</h1>
            <p className="text-sm text-white/40">
              {activeTab === "public-projects" ? "Discover projects built by the community." : "Manage your cloud-based development environments."}
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Continue Working Banner (Only on "All Projects" view) */}
        {activeTab === "my-projects" && selectedView === "all" && !searchQuery.trim() && (() => {
          const last = projects.find((p) => p.ownerId === user?.uid);
          if (!last) return null;
          return (
            <div className="rounded-2xl bg-gradient-to-r from-blue-600/10 via-purple-600/5 to-transparent border border-blue-500/20 p-6 flex flex-col sm:flex-row sm:items-center gap-6 relative overflow-hidden group hover:border-blue-500/40 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-2xl" />
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-blue-400/80 font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Continue Working
                </p>
                <h3 className="text-white font-bold text-lg truncate group-hover:text-blue-100 transition-colors">{last.name}</h3>
                <p className="text-sm text-white/40 mt-1 truncate">
                  Last updated {formatRelativeTime(last.updatedAt)}
                  {last.description && <> <span className="mx-1 opacity-50">•</span> {last.description}</>}
                </p>
              </div>
              <button
                onClick={() => onSelectProject(last.id)}
                className="flex-shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-all active:scale-[0.97] border border-white/5 backdrop-blur-sm"
              >
                Resume Workspace
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          );
        })()}

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-8">
          {displayedGridProjects.map((p, i) => renderCard(p, i))}
          
          {/* Empty State */}
          {displayedGridProjects.length === 0 && !isCreating && (
            <div className="col-span-full py-24 text-center rounded-3xl border-2 border-dashed border-white/5 bg-white/[0.01]">
              <FolderCode className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 font-medium text-lg mb-2">No projects found.</p>
              <p className="text-white/30 text-sm mb-6">Create a new project or adjust your search filters.</p>
              {activeTab === "my-projects" && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600/20 text-blue-400 rounded-xl font-bold hover:bg-blue-600 hover:text-white transition-all active:scale-95 border border-blue-500/30"
                >
                  <Plus className="w-4 h-4" />
                  Create Project
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER ELEMENTS ── */}
        <div className="mt-auto pt-12 border-t border-white/5 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-white/20 text-sm font-medium">
            Built with <span className="text-white/40 font-bold tracking-tight">DevOS</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/10 font-bold uppercase tracking-[0.2em]">
            <span>Kontyra and Tech Visionary Network</span>
          </div>
        </div>
      </div>

      {/* ── MODALS & OVERLAYS ── */}
      <AnimatePresence>
        {isQuickStarting && (
          <QuickStartModal
            onClose={() => setIsQuickStarting(false)}
            onCreateProject={() => setIsCreating(true)}
          />
        )}

        {isCreating && (
          <div className="fixed inset-0 z-[100] flex bg-[#0a0a0b] overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full" />
              <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
            </div>

            {/* Close Button */}
            <button 
              onClick={() => setIsCreating(false)} 
              className="absolute top-6 right-6 z-50 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors backdrop-blur-md hover:scale-105 active:scale-95"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>

            {/* Left side: Templates */}
            <div className="w-2/3 h-full overflow-y-auto border-r border-white/5 p-12 custom-scrollbar relative z-10">
              <div className="max-w-4xl mx-auto max-h-[90vh] overflow-y-auto flex flex-col">
                <h2 className="text-4xl font-black text-white tracking-tight mb-2">Create New Project</h2>
                <p className="text-white/40 text-lg mb-12">Select a template or start from scratch.</p>
                
                {/* Categories */}
                <div className="flex flex-wrap gap-2 mb-8">
                  {["All Templates", ...Array.from(new Set(allAvailableTemplates.map(t => t.category)))].filter(Boolean).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-bold transition-all border",
                        selectedCategory === cat 
                          ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                          : "bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {allAvailableTemplates
                    .filter(t => selectedCategory === "All Templates" || t.category === selectedCategory)
                    .map(template => {
                      const isSelected = selectedTemplateId === template.id;
                      const Icon = ((lucideIcons)[template.icon] ) || lucideIcons.Code;
                      return (
                        <div
                          key={template.id}
                          onClick={() => setSelectedTemplateId(template.id)}
                          className={cn(
                            "group cursor-pointer relative p-6 rounded-3xl border transition-all duration-300",
                            isSelected 
                              ? "bg-blue-600/10 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.15)]" 
                              : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/20 hover:shadow-xl"
                          )}
                        >
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300",
                            isSelected ? "bg-blue-600 shadow-lg shadow-blue-600/30" : "bg-white/5 group-hover:bg-white/10 group-hover:scale-110"
                          )}>
                            <Icon className={cn("w-6 h-6 transition-colors", isSelected ? "text-white" : "text-white/60 group-hover:text-white")} />
                          </div>
                          <h3 className="text-lg font-bold text-white mb-2">{template.name}</h3>
                          <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">{template.description}</p>
                          
                          {isSelected && (
                            <div className="absolute top-4 right-4 text-blue-500">
                              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Right side: Project Details */}
            <div className="w-1/3 h-full bg-black/40 backdrop-blur-2xl border-l border-white/5 p-12 overflow-y-auto custom-scrollbar relative z-10 flex flex-col justify-center">
              <form onSubmit={handleCreateProject} className="space-y-8 max-w-md mx-auto w-full">
                
                <div className="space-y-3">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <Folder className="w-4 h-4" /> Project Name
                  </label>
                  <input
                    autoFocus
                    type="text"
                    placeholder="My Awesome App"
                    value={newProjectName}
                    onChange={(e) => { setNewProjectName(e.target.value); setProjectNameTaken(false); }}
                    className={cn(
                      "w-full bg-white/5 border rounded-2xl px-5 py-4 text-lg text-white font-medium focus:outline-none transition-all placeholder:text-white/20",
                      projectNameTaken ? "border-red-500/60 focus:border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "border-white/10 focus:border-blue-500 focus:bg-blue-500/5 shadow-inner"
                    )}
                    required
                  />
                  {projectNameTaken && (
                    <p className="text-xs text-red-400 flex items-center gap-1 font-medium">
                      <X className="w-3 h-3" /> You already have a project with this name
                    </p>
                  )}
                  {checkingProjectName && !projectNameTaken && (
                    <p className="text-xs text-white/30 animate-pulse">Checking availability...</p>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4" /> Description <span className="opacity-50 lowercase font-normal">(optional)</span>
                  </label>
                  <textarea
                    placeholder="What are you building?"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 focus:bg-blue-500/5 transition-all resize-none min-h-[120px] placeholder:text-white/20 shadow-inner"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Visibility
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setVisibility("public")}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                        visibility === "public" ? "bg-blue-600/10 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20 hover:text-white"
                      )}
                    >
                      <Globe className="w-6 h-6" />
                      <span className="font-bold text-sm">Public</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibility("private")}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                        visibility === "private" ? "bg-blue-600/10 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20 hover:text-white"
                      )}
                    >
                      <lucideIcons.Lock className="w-6 h-6" />
                      <span className="font-bold text-sm">Private</span>
                    </button>
                  </div>
                </div>

                <div className="pt-4 mt-8 border-t border-white/5">
                  <button
                    type="submit"
                    disabled={!newProjectName.trim() || projectNameTaken || checkingProjectName}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg hover:shadow-[0_0_40px_rgba(59,130,246,0.4)] hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      <LiveMap className="mt-16 mb-16 hidden" />

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
