import React, { useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, increment, doc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import * as lucideIcons from "lucide-react";
import { X, Folder, Code, Rocket, Sparkles, Building2, User as UserIcon } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn, generateAppId } from '../lib/utils';
import { toast } from "sonner";
import { TEMPLATES } from "../constants/templates";
import { deductCredits, CREDIT_COSTS } from "../lib/creditsService";
import { useActiveContext } from "../hooks/useActiveContext";
import Navbar from "../components/Navbar";

export default function NewProjectPage() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const location = useLocation();
  const { context } = useActiveContext();
  const isOrgWorkspace = context?.type === "org";
  
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("blank");
  const [selectedCategory, setSelectedCategory] = useState<string>("All Templates");
  const [selectedLicense, setSelectedLicense] = useState<string>("none");
  const [settings, setSettings] = useState<any>(null);
  
  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, "users"), where("uid", "==", user.uid))).then(snap => {
      if (!snap.empty) setSettings(snap.docs[0].data());
    });
  }, [user]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newProjectName.trim()) return;

    const toastId = toast.loading("Creating project...");

    try {
      const ok = await deductCredits(user.uid, "createProject");
      if (!ok) {
        toast.error(`Insufficient credits. Creating a project costs ${CREDIT_COSTS.createProject} credits.`, { id: toastId });
        return;
      }

      const projectSlug = newProjectName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const template = TEMPLATES.find(t => t.id === selectedTemplateId) || TEMPLATES[0];

      const ownerId = isOrgWorkspace ? context.id : user.uid;
      const ownerUsername = isOrgWorkspace ? context.slug : (settings?.username || "anonymous");
      const ownerType = isOrgWorkspace ? "org" : "user";

      const nameCheckSnap = await getDocs(
        query(collection(db, "projects"), where("ownerId", "==", ownerId), where("name", "==", newProjectName.trim()))
      );
      if (!nameCheckSnap.empty) {
        toast.error("You already have a project with this name in this workspace. Please choose a different name.", { id: toastId });
        return;
      }
      
      const projectData: any = {
        appId: generateAppId(),
        name: newProjectName,
        projectSlug,
        description: newProjectDescription || template.description,
        ownerId,
        ownerUsername,
        ownerType,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        collaborators: [],
        isPublic: visibility === "public",
        isTemplate: false,
        forksCount: 0,
        views: 0,
        deployUrl: `/@${ownerUsername}/${projectSlug}`
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

      await addDoc(filesRef, {
        projectId: docRef.id,
        name: "README.md",
        path: "/README.md",
        content: `# ${newProjectName.trim()}\n\n${newProjectDescription.trim() || "A project built on DevOS."}\n\n## Getting Started\n\nOpen this project in the DevOS IDE and start building!\n`,
        language: "markdown",
        updatedAt: serverTimestamp(),
      });

      if (selectedLicense !== "none") {
        const year = new Date().getFullYear();
        const ownerName = isOrgWorkspace ? context.name : (settings?.displayName || settings?.username || "Author");
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

      toast.success("Project created successfully!", { id: toastId });
      
      if (location.state?.from === "dashboard") {
         navigate("/");
      } else {
         navigate(`/project/${docRef.id}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create project", { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col">
      <Navbar onMenuClick={() => {}} />
      <div className="flex-1 flex overflow-hidden">
        {/* Left side: Templates */}
        <div className="w-2/3 h-full overflow-y-auto border-r border-white/5 p-12 custom-scrollbar relative z-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-black text-white tracking-tight mb-2">Create New Project</h2>
            <p className="text-white/40 text-lg mb-12">Select a template or start from scratch.</p>
            
            <div className="flex flex-wrap gap-2 mb-8">
              {["All Templates", ...Array.from(new Set(TEMPLATES.map(t => t.category)))].filter(Boolean).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-bold transition-all",
                    selectedCategory === cat 
                      ? "bg-white text-black" 
                      : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {TEMPLATES
                .filter(t => selectedCategory === "All Templates" || t.category === selectedCategory)
                .map(template => {
                  const isSelected = selectedTemplateId === template.id;
                  const Icon = ((lucideIcons as any)[template.icon] as React.ElementType) || lucideIcons.Code;
                  return (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={cn(
                        "group cursor-pointer relative p-6 rounded-3xl border transition-all duration-300",
                        isSelected 
                          ? "bg-blue-600/10 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.15)]" 
                          : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300",
                        isSelected ? "bg-blue-600 shadow-lg shadow-blue-600/30" : "bg-white/5 group-hover:scale-110"
                      )}>
                        <Icon className={cn("w-6 h-6", isSelected ? "text-white" : "text-white/60")} />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{template.name}</h3>
                      <p className="text-sm text-white/40 line-clamp-2">{template.description}</p>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right side: Configuration */}
        <div className="w-1/3 h-full bg-white/[0.02] p-12 overflow-y-auto custom-scrollbar relative z-10 border-l border-white/5">
          <form onSubmit={handleCreateProject} className="max-w-md mx-auto h-full flex flex-col">
            <div className="flex-1 space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Configure Project</h3>
                <p className="text-white/40 text-sm">Set up your workspace details.</p>
              </div>

              {isOrgWorkspace && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-purple-300">Creating in Organization</p>
                    <p className="text-xs text-purple-200/70">This project will be owned by {context.name}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Project Name</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-white/20"
                    placeholder="e.g. NextJS Awesome App"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Description <span className="text-white/20">(Optional)</span></label>
                  <textarea
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all h-24 resize-none placeholder:text-white/20"
                    placeholder="Briefly describe what this project does..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">License <span className="text-white/20">(Optional)</span></label>
                  <select
                    value={selectedLicense}
                    onChange={(e) => setSelectedLicense(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="none">No License (All Rights Reserved)</option>
                    <option value="MIT">MIT License</option>
                    <option value="Apache2">Apache 2.0</option>
                    <option value="GPL3">GNU GPL v3</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-8 border-t border-white/10">
              <button
                type="submit"
                disabled={!newProjectName.trim()}
                className={cn(
                  "w-full py-4 rounded-xl font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-lg",
                  newProjectName.trim() 
                    ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/25" 
                    : "bg-white/5 text-white/30 cursor-not-allowed"
                )}
              >
                <Rocket className="w-5 h-5" />
                Create Project
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
