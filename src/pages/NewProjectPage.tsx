import React, { useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, increment, doc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import * as lucideIcons from "lucide-react";
import { X, Folder, Code, Rocket, Sparkles, Building2, User as UserIcon, ArrowLeft, ArrowRight, Check, Globe, Lock, ChevronRight } from "lucide-react";
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
  const [mobileTab, setMobileTab] = useState<"templates" | "config">("templates");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, "users"), where("uid", "==", user.uid))).then(snap => {
      if (!snap.empty) setSettings(snap.docs[0].data());
    });
  }, [user]);

  const selectedTemplate = TEMPLATES.find(t => t.id === selectedTemplateId) || TEMPLATES[0];

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newProjectName.trim()) return;

    setIsSubmitting(true);
    const toastId = toast.loading("Creating project...");

    try {
      const ok = await deductCredits(user.uid, "createProject");
      if (!ok) {
        toast.error(`Insufficient credits. Creating a project costs ${CREDIT_COSTS.createProject} credits.`, { id: toastId });
        setIsSubmitting(false);
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
        setIsSubmitting(false);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col">
      <Navbar />
      
      {/* Mobile step bar */}
      <div className="lg:hidden px-4 py-2.5 bg-[#0e0e11] border-b border-white/10 flex items-center justify-between sticky top-14 z-20">
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => {
              if (mobileTab === "config") {
                setMobileTab("templates");
              } else {
                navigate(-1);
              }
            }}
            className="p-1.5 -ml-1 text-white/60 hover:text-white rounded-lg hover:bg-white/5 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm text-white">Create Project</span>
        </div>
        
        {/* Mobile Tab Toggle */}
        <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setMobileTab("templates")}
            className={cn(
              "px-3 py-1 rounded-lg font-semibold transition-all",
              mobileTab === "templates" 
                ? "bg-blue-600 text-white shadow-sm" 
                : "text-white/50 hover:text-white"
            )}
          >
            1. Template
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("config")}
            className={cn(
              "px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1",
              mobileTab === "config" 
                ? "bg-blue-600 text-white shadow-sm" 
                : "text-white/50 hover:text-white"
            )}
          >
            2. Details
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        {/* Left side: Templates */}
        <div className={cn(
          "w-full lg:w-2/3 h-full overflow-y-auto border-r-0 lg:border-r border-white/5 p-4 sm:p-6 lg:p-10 xl:p-12 custom-scrollbar relative z-10",
          mobileTab !== "templates" ? "hidden lg:block" : "block"
        )}>
          <div className="max-w-4xl mx-auto pb-24 lg:pb-8">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mb-2">Create New Project</h2>
            <p className="text-white/40 text-sm sm:text-base lg:text-lg mb-6 sm:mb-8">Select a template or start from scratch.</p>
            
            {/* Categories filter - horizontally scrollable on mobile */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar touch-pan-x">
              {["All Templates", ...Array.from(new Set(TEMPLATES.map(t => t.category)))].filter(Boolean).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all shrink-0",
                    selectedCategory === cat 
                      ? "bg-white text-black shadow-md" 
                      : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/5"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Templates grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
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
                        "group cursor-pointer relative p-5 rounded-2xl sm:rounded-3xl border transition-all duration-200 flex flex-col justify-between",
                        isSelected 
                          ? "bg-blue-600/10 border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.15)] ring-1 ring-blue-500" 
                          : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                      <div>
                        <div className={cn(
                          "w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 transition-all duration-200",
                          isSelected ? "bg-blue-600 shadow-md shadow-blue-600/30" : "bg-white/5 group-hover:scale-105"
                        )}>
                          <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6", isSelected ? "text-white" : "text-white/60")} />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 leading-snug">{template.name}</h3>
                        <p className="text-xs sm:text-sm text-white/40 line-clamp-2 leading-relaxed">{template.description}</p>
                      </div>

                      {template.category && (
                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-white/30">{template.category}</span>
                          <span className={cn("font-semibold text-xs", isSelected ? "text-blue-400" : "text-white/30 group-hover:text-white/60")}>
                            {isSelected ? "Selected" : "Select"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Mobile floating bar to continue to details */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-[#0d0d10]/95 backdrop-blur-xl border-t border-white/10 z-30 flex items-center justify-between gap-3 shadow-2xl">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium text-white/50 uppercase tracking-wider">Template selected</p>
              <p className="text-sm font-bold text-white truncate">{selectedTemplate.name}</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileTab("config")}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center gap-1.5 shadow-lg shadow-blue-600/25 shrink-0 active:scale-95 transition-all"
            >
              Configure Details
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right side: Configuration */}
        <div className={cn(
          "w-full lg:w-1/3 h-full bg-[#0d0d10] lg:bg-white/[0.02] p-4 sm:p-6 lg:p-10 xl:p-12 overflow-y-auto custom-scrollbar relative z-10 border-t lg:border-t-0 lg:border-l border-white/5",
          mobileTab !== "config" ? "hidden lg:flex" : "flex flex-col"
        )}>
          <form onSubmit={handleCreateProject} className="max-w-md mx-auto w-full h-full flex flex-col justify-between pb-8 lg:pb-0">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-1.5">Configure Project</h3>
                <p className="text-white/40 text-xs sm:text-sm">Set up your workspace and project details.</p>
              </div>

              {/* Template preview badge */}
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 text-white shadow-sm">
                    {React.createElement(((lucideIcons as any)[selectedTemplate.icon] as React.ElementType) || lucideIcons.Code, { className: "w-4 h-4" })}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-blue-400">Chosen Template</p>
                    <p className="text-sm font-bold text-white truncate">{selectedTemplate.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileTab("templates")}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-2 shrink-0 ml-2"
                >
                  Change
                </button>
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
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5" /> Project Name
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm sm:text-base text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-white/20"
                    placeholder="e.g. NextJS Awesome App"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">
                    Description <span className="text-white/20 lowercase font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm sm:text-base text-white focus:outline-none focus:border-blue-500 transition-all h-20 sm:h-24 resize-none placeholder:text-white/20"
                    placeholder="Briefly describe what this project does..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" /> Visibility
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setVisibility("public")}
                      className={cn(
                        "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all",
                        visibility === "public"
                          ? "bg-blue-600/15 border-blue-500 text-white"
                          : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                      )}
                    >
                      <Globe className="w-4 h-4 shrink-0 text-blue-400" />
                      <div>
                        <p className="text-xs font-bold leading-tight">Public</p>
                        <p className="text-[10px] text-white/40 mt-0.5">Everyone</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibility("private")}
                      className={cn(
                        "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all",
                        visibility === "private"
                          ? "bg-blue-600/15 border-blue-500 text-white"
                          : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                      )}
                    >
                      <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                      <div>
                        <p className="text-xs font-bold leading-tight">Private</p>
                        <p className="text-[10px] text-white/40 mt-0.5">Only you</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">License <span className="text-white/20 lowercase font-normal">(optional)</span></label>
                  <select
                    value={selectedLicense}
                    onChange={(e) => setSelectedLicense(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="none" className="bg-[#121214] text-white">No License (All Rights Reserved)</option>
                    <option value="MIT" className="bg-[#121214] text-white">MIT License</option>
                    <option value="Apache2" className="bg-[#121214] text-white">Apache 2.0</option>
                    <option value="GPL3" className="bg-[#121214] text-white">GNU GPL v3</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-white/10">
              <button
                type="submit"
                disabled={!newProjectName.trim() || isSubmitting}
                className={cn(
                  "w-full py-3.5 sm:py-4 rounded-xl font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base sm:text-lg shadow-lg",
                  newProjectName.trim() && !isSubmitting
                    ? "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/25" 
                    : "bg-white/5 text-white/30 cursor-not-allowed"
                )}
              >
                <Rocket className="w-5 h-5" />
                {isSubmitting ? "Creating Project..." : "Create Project"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
