import React, { useState, useEffect } from "react";
import { useActiveContext } from "../hooks/useActiveContext";
import { Project, Organization, OrgMember } from "../types";
import { getOrgBySlug } from "../lib/orgService";
import { db, auth } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Building2, Plus, FolderCode, Users, Settings, FolderOpen, ChevronRight, Activity, Zap, ExternalLink, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { formatRelativeTime } from "../lib/utils";
import { toast } from "sonner";
import ContextSwitcher from "./ContextSwitcher";
import DevosLogo from "./DevosLogo";

interface OrgDashboardProps {
  onSelectProject: (projectId: string) => void;
}

export default function OrgDashboard({ onSelectProject }: OrgDashboardProps) {
  const { context } = useActiveContext();
  const [org, setOrg] = useState<Organization | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<"projects" | "members" | "settings">("projects");

  useEffect(() => {
    if (context?.type === "org") {
      getOrgBySlug(context.slug).then(setOrg).catch(console.error);
      
      const q = query(
        collection(db, "projects"),
        where("ownerOrgId", "==", context.id)
      );
      
      const unsub = onSnapshot(q, (snap) => {
        const projs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
        setProjects(projs.sort((a,b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)));
      });
      return () => unsub();
    }
  }, [context]);

  if (context?.type !== "org" || !org) return null;

  return (
    <div className="flex h-screen bg-base text-white overflow-hidden">
      {/* Sidebar for Org Dashboard */}
      <div className="w-64 bg-black/40 border-r border-border-base flex flex-col hidden md:flex shrink-0">
        <div className="p-4 border-b border-border-base">
          <div className="flex items-center gap-2 mb-6">
            <DevosLogo className="w-6 h-6" />
            <span className="font-bold tracking-tight">DevOS <span className="text-blue-500">Org</span></span>
          </div>
          <ContextSwitcher />
        </div>
        
        <div className="flex-1 p-3 space-y-1 overflow-y-auto">
          <button 
            onClick={() => setActiveTab("projects")}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === "projects" ? "bg-blue-500/10 text-blue-400" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
          >
            <FolderCode className="w-4 h-4" />
            <span className="font-medium text-sm">Projects</span>
            <span className="ml-auto text-xs bg-white/10 px-2 py-0.5 rounded-full">{projects.length}</span>
          </button>
          <button 
            onClick={() => setActiveTab("members")}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === "members" ? "bg-blue-500/10 text-blue-400" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
          >
            <Users className="w-4 h-4" />
            <span className="font-medium text-sm">Team Members</span>
          </button>
          <button 
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === "settings" ? "bg-blue-500/10 text-blue-400" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
          >
            <Settings className="w-4 h-4" />
            <span className="font-medium text-sm">Org Settings</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#0a0a0a]">
        <div className="h-16 border-b border-border-base flex items-center justify-between px-6 bg-black/20 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20 overflow-hidden">
              {org.avatar ? <img src={org.avatar} className="w-full h-full object-cover" /> : <Building2 className="w-4 h-4 text-blue-400" />}
            </div>
            <h1 className="font-bold text-lg">{org.name}</h1>
          </div>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors">
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
          {activeTab === "projects" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Organization Projects</h2>
              </div>
              
              {projects.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
                  <FolderOpen className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">No projects yet</h3>
                  <p className="text-white/40 max-w-sm mx-auto">Create a project for your organization to collaborate with your team.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => onSelectProject(p.id)}
                      className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 cursor-pointer transition-all hover:bg-white/[0.07]"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                          <FolderCode className="w-5 h-5" />
                        </div>
                        {p.isPublic && <span className="text-[10px] uppercase tracking-wider font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Public</span>}
                      </div>
                      <h3 className="font-bold mb-1 truncate">{p.name}</h3>
                      <p className="text-xs text-white/40">Updated {formatRelativeTime(p.updatedAt)}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "members" && (
            <div className="text-center py-20">
              <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Team Members</h3>
              <p className="text-white/40">Manage your organization's team members here.</p>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="text-center py-20">
              <Settings className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Organization Settings</h3>
              <p className="text-white/40">Manage billing, access controls, and preferences.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
