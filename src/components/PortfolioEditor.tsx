import React, { useState, useEffect } from "react";
import { FileData, Project, ProjectVersion } from "../types";
import { 
  User, 
  Layout, 
  Palette, 
  Save, 
  Loader2, 
  Globe, 
  Github, 
  Twitter, 
  Linkedin, 
  Plus, 
  Trash2, 
  Rocket, 
  Eye, 
  AlertCircle, 
  CheckCircle2, 
  History, 
  RotateCcw, 
  X, 
  MessageSquare 
, FileText, LayoutTemplate, Star } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { db } from "../lib/firebase";
import ConfirmModal from "./ConfirmModal";
import CustomSelect from "./CustomSelect";
import { 
  doc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  deleteDoc, 
  onSnapshot,
  writeBatch,
  increment,
  deleteField
} from "firebase/firestore";

interface PortfolioEditorProps {
  project: Project;
  files: FileData[];
  onUpdateFile: (fileId: string, content: string) => Promise<void>;
}

export default function PortfolioEditor({ project, files, onUpdateFile }: PortfolioEditorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "pages" | "layout" | "theme">("content");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [deployMessage, setDeployMessage] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreVersionConfirm, setRestoreVersionConfirm] = useState<ProjectVersion | null>(null);

  // Find files
  const portfolioFile = files.find(f => f.name === "portfolio.json");
  const layoutFile = files.find(f => f.name === "layout.json");
  const themeFile = files.find(f => f.name === "theme.json");

  // Local state for edits
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [layoutData, setLayoutData] = useState<any>(null);
  const [themeData, setThemeData] = useState<any>(null);

  useEffect(() => {
    try {
      if (portfolioFile) {
        const parsed = JSON.parse(portfolioFile.content);
        if (!parsed.pages) {
          parsed.pages = [
            { id: "home", slug: "/", title: "Home", content: "# Welcome to my Portfolio\n\nI am a developer. I love coding and building awesome things." }
          ];
        }
        if (!parsed.global) {
          parsed.global = {
            navbar: { style: 'classic', logo: 'text' },
            footer: { text: `© ${new Date().getFullYear()} ${project.ownerUsername}`, showSocials: true },
            layout: 'classic'
          };
        }
        if (!parsed.links) parsed.links = [];
        if (!parsed.featuredProjects) parsed.featuredProjects = [];
        setPortfolioData(parsed);
      }
      if (layoutFile) {
        const parsed = JSON.parse(layoutFile.content);
        if (!parsed.sections) parsed.sections = ["hero", "projects", "contact"];
        setLayoutData(parsed);
      } else {
        setLayoutData({ sections: ["hero", "projects", "contact"] });
      }
      
      if (themeFile) {
        setThemeData(JSON.parse(themeFile.content));
      } else {
        setThemeData({ primaryColor: "#3b82f6", fontFamily: "Inter", darkMode: true });
      }
    } catch (e) {
      console.error("Error parsing portfolio files:", e);
    }
  }, [portfolioFile, layoutFile, themeFile]);

  useEffect(() => {
    if (!project.id) return;
    const versionsRef = collection(db, "projects", project.id, "versions");
    const q = query(versionsRef, orderBy("timestamp", "desc"), limit(20));
    
    return onSnapshot(q, (snapshot) => {
      const vList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProjectVersion[];
      setVersions(vList);
    });
  }, [project.id]);

  const handleSave = async () => {
    if (!portfolioFile || !layoutFile || !themeFile) return;
    setIsSaving(true);
    try {
      const draft = {
        portfolio: portfolioData,
        layout: layoutData,
        theme: themeData
      };

      await Promise.all([
        onUpdateFile(portfolioFile.id, JSON.stringify(portfolioData, null, 2)),
        onUpdateFile(layoutFile.id, JSON.stringify(layoutData, null, 2)),
        onUpdateFile(themeFile.id, JSON.stringify(themeData, null, 2)),
        updateDoc(doc(db, "projects", project.id), {
          draft,
          updatedAt: serverTimestamp()
        })
      ]);
      toast.success("Draft saved successfully");
    } catch (error) {
      console.error("Error saving portfolio:", error);
      toast.error("Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeploy = async () => {
    if (!portfolioData || !layoutData || !themeData) return;
    
    setIsDeploying(true);
    const toastId = toast.loading("Deploying portfolio...");

    try {
      // Step 1: Validate
      if (!portfolioData.bio || portfolioData.bio.length < 10) {
        throw new Error("Bio is too short (min 10 chars)");
      }

      // Step 2: Save previous version if exists
      if (project.published) {
        const versionsRef = collection(db, "projects", project.id, "versions");
        await addDoc(versionsRef, {
          projectId: project.id,
          timestamp: serverTimestamp(),
          snapshot: project.published,
          message: deployMessage || `Deploy on ${new Date().toLocaleString()}`
        });

        // Cleanup old versions (keep last 20)
        const q = query(versionsRef, orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        if (snapshot.docs.length > 20) {
          const toDelete = snapshot.docs.slice(20);
          await Promise.all(toDelete.map(d => deleteDoc(d.ref)));
        }
      }

      // Update status to building
      await updateDoc(doc(db, "projects", project.id), {
        deployStatus: "building"
      });

      // Simulate build time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Publish
      const published = {
        portfolio: portfolioData,
        layout: layoutData,
        theme: themeData
      };

      await updateDoc(doc(db, "projects", project.id), {
        published,
        isSystem: true,
        deployStatus: "success",
        lastDeployedAt: serverTimestamp(),
        deployError: deleteField()
      });

      setDeployMessage("");
      toast.success("Portfolio deployed successfully!", { id: toastId });
    } catch (error: any) {
      console.error("Deployment failed:", error);
      await updateDoc(doc(db, "projects", project.id), {
        deployStatus: "failed",
        deployError: error.message
      });
      toast.error(`Deployment failed: ${error.message}`, { id: toastId });
    } finally {
      setIsDeploying(false);
    }
  };

  const handlePreview = () => {
    const username = project.ownerUsername;
    if (!username) return;
    
    if (project.systemType === 'portfolio') {
      window.open(`/@${username}?preview=true`, "_blank");
    } else {
      window.open(`/@${username}/${project.projectSlug}?preview=true`, "_blank");
    }
  };

  const handleRestore = async (version: ProjectVersion) => {
    setRestoreVersionConfirm(version);
  };

  const confirmRestoreVersion = async () => {
    const version = restoreVersionConfirm;
    if (!version) return;
    
    setIsRestoring(true);
    try {
      const { portfolio, layout, theme } = version.snapshot;
      setPortfolioData(portfolio);
      setLayoutData(layout);
      setThemeData(theme);
      
      // Update files and draft in Firestore
      await Promise.all([
        onUpdateFile(portfolioFile!.id, JSON.stringify(portfolio, null, 2)),
        onUpdateFile(layoutFile!.id, JSON.stringify(layout, null, 2)),
        onUpdateFile(themeFile!.id, JSON.stringify(theme, null, 2)),
        updateDoc(doc(db, "projects", project.id), {
          draft: version.snapshot,
          updatedAt: serverTimestamp()
        })
      ]);
      
      toast.success("Version restored to draft");
      setShowVersions(false);
      setRestoreVersionConfirm(null);
    } catch (error) {
      console.error("Restore failed:", error);
      toast.error("Failed to restore version");
    } finally {
      setIsRestoring(false);
    }
  };

  if (!portfolioData || !layoutData || !themeData) {
    return (
      <div className="h-full flex items-center justify-center bg-base">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-white/40 text-sm animate-pulse">Loading portfolio editor...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="h-full flex flex-col bg-base">
      {/* Tabs */}
      <div className="flex border-b border-border-base bg-card">
        {[
          { id: "content", label: "General", icon: User },
          { id: "pages", label: "Pages", icon: FileText },
          { id: "layout", label: "Layout", icon: Layout },
          { id: "theme", label: "Theme", icon: Palette }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all relative",
              activeTab === tab.id ? "text-white" : "text-white/40 hover:text-white/60"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        ))}
        <div className="ml-auto flex items-center px-4 gap-3">
          {/* Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-border-base">
            {project.deployStatus === 'building' ? (
              <>
                <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Building</span>
              </>
            ) : project.deployStatus === 'success' ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
              </>
            ) : project.deployStatus === 'failed' ? (
              <>
                <AlertCircle className="w-3 h-3 text-red-400" />
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Failed</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Idle</span>
              </>
            )}
          </div>

          <button
            onClick={() => setShowVersions(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 text-white/80 rounded-lg text-xs font-bold hover:bg-white/10 transition-all border border-border-base"
          >
            <History className="w-3 h-3" />
            History
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 text-white/80 rounded-lg text-xs font-bold hover:bg-white/10 transition-all border border-border-base disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save Draft
          </button>

          <button
            onClick={handleDeploy}
            disabled={isDeploying}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-900/20"
          >
            {isDeploying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
            Deploy
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-12">
          {activeTab === "content" && (
            <div className="space-y-8">
              <section className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                  Deployment Note
                </h3>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Message</label>
                  <input
                    type="text"
                    value={deployMessage}
                    onChange={e => setDeployMessage(e.target.value)}
                    className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="What changed in this deployment?"
                  />
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Profile Information
                </h3>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Bio</label>
                  <textarea
                    value={portfolioData.bio}
                    onChange={e => setPortfolioData({ ...portfolioData, bio: e.target.value })}
                    className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all h-32 resize-none"
                    placeholder="Tell the world about yourself..."
                  />
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  Social Links
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(portfolioData.links || []).map((link: any, index: number) => (
                    <div key={index} className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                        {link.platform === 'github' && <Github className="w-3 h-3" />}
                        {link.platform === 'twitter' && <Twitter className="w-3 h-3" />}
                        {link.platform === 'linkedin' && <Linkedin className="w-3 h-3" />}
                        {link.platform}
                      </label>
                      <input
                        type="url"
                        value={link.url}
                        placeholder={`https://${link.platform}.com/username`}
                        onChange={e => {
                          const newLinks = [...portfolioData.links];
                          newLinks[index].url = e.target.value;
                          setPortfolioData({ ...portfolioData, links: newLinks });
                        }}
                        className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50"

                      />
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-500" />
                  Featured Projects
                </h3>
                <p className="text-sm text-white/40">Enter the IDs of the projects you want to feature on your portfolio.</p>
                <div className="space-y-3">
                  {(portfolioData.featuredProjects || []).map((id: string, index: number) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={id}
                        placeholder="Project ID"
                        onChange={e => {
                          const newFeatured = [...portfolioData.featuredProjects];
                          newFeatured[index] = e.target.value;
                          setPortfolioData({ ...portfolioData, featuredProjects: newFeatured });
                        }}
                        className="flex-1 bg-white/5 border border-border-base rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-all font-mono text-sm"
                      />
                      <button
                        onClick={() => {
                          const newFeatured = portfolioData.featuredProjects.filter((_: any, i: number) => i !== index);
                          setPortfolioData({ ...portfolioData, featuredProjects: newFeatured });
                        }}
                        className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setPortfolioData({ ...portfolioData, featuredProjects: [...portfolioData.featuredProjects, ""] })}
                    className="w-full py-3 border-2 border-dashed border-border-base rounded-xl text-white/20 hover:text-white/40 hover:border-border-base transition-all font-bold text-sm"
                  >
                    + Add Project ID
                  </button>
                </div>
              </section>
            </div>
          )}

          
          {activeTab === "pages" && (
            <div className="space-y-8">
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-500" />
                      Manage Pages
                    </h3>
                    <p className="text-sm text-white/40 mt-1">Create multiple pages and write content using Markdown.</p>
                  </div>
                  <button
                    onClick={() => {
                      const newPage = { id: `page-${Date.now()}`, slug: `/new-page-${Date.now()}`, title: "New Page", content: "# New Page\nWrite something here..." };
                      setPortfolioData({ ...portfolioData, pages: [...portfolioData.pages, newPage] });
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all"
                  >
                    <Plus className="w-3 h-3" /> Add Page
                  </button>
                </div>
                <div className="space-y-4">
                  {(portfolioData.pages || []).map((page: any, index: number) => (
                    <div key={page.id} className="p-4 bg-white/5 border border-border-base rounded-xl space-y-4 relative group">
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Page Title</label>
                          <input
                            type="text"
                            value={page.title}
                            onChange={(e) => {
                              const newPages = [...portfolioData.pages];
                              newPages[index].title = e.target.value;
                              setPortfolioData({ ...portfolioData, pages: newPages });
                            }}
                            className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-all"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">URL Slug</label>
                          <input
                            type="text"
                            value={page.slug}
                            onChange={(e) => {
                              const newPages = [...portfolioData.pages];
                              newPages[index].slug = e.target.value.toLowerCase().replace(/\s+/g, '-');
                              setPortfolioData({ ...portfolioData, pages: newPages });
                            }}
                            className="w-full bg-white/5 border border-border-base rounded-xl px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500 transition-all"
                            disabled={page.isSystem || page.slug === '/'}
                          />
                        </div>
                        {!page.isSystem && page.slug !== '/' && (
                          <div className="flex items-end pb-1">
                            <button
                              onClick={() => {
                                const newPages = portfolioData.pages.filter((_: any, i: number) => i !== index);
                                setPortfolioData({ ...portfolioData, pages: newPages });
                              }}
                              className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center justify-between">
                          <span>Content (Markdown)</span>
                          <span className="text-white/20 normal-case tracking-normal">Supports GitHub Flavored Markdown</span>
                        </label>
                        <textarea
                          value={page.content}
                          onChange={(e) => {
                            const newPages = [...portfolioData.pages];
                            newPages[index].content = e.target.value;
                            setPortfolioData({ ...portfolioData, pages: newPages });
                          }}
                          className="w-full h-64 bg-black/20 border border-border-base rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500 transition-all resize-y"
                          placeholder="# Main Heading..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === "layout" && (
            <div className="space-y-8">
              <section className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Layout className="w-5 h-5 text-blue-500" />
                  Section Order
                </h3>
                <p className="text-sm text-white/40">Reorder the sections of your portfolio page.</p>
                <div className="space-y-2">
                  {(layoutData.sections || []).map((section: string, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white/5 border border-border-base rounded-xl">
                      <span className="font-bold text-white capitalize tracking-tight">{section}</span>
                      <div className="flex gap-2">
                        <button
                          disabled={index === 0}
                          onClick={() => {
                            const newSections = [...layoutData.sections];
                            [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
                            setLayoutData({ ...layoutData, sections: newSections });
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 disabled:opacity-0 transition-all"
                        >
                          ↑
                        </button>
                        <button
                          disabled={index === layoutData.sections.length - 1}
                          onClick={() => {
                            const newSections = [...layoutData.sections];
                            [newSections[index + 1], newSections[index]] = [newSections[index], newSections[index + 1]];
                            setLayoutData({ ...layoutData, sections: newSections });
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 disabled:opacity-0 transition-all"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === "theme" && (
            <div className="space-y-8">
              <section className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-blue-500" />
                  Visual Style
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Primary Color</label>
                    <div className="flex gap-4 items-center">
                      <input
                        type="color"
                        value={themeData.primaryColor}
                        onChange={e => setThemeData({ ...themeData, primaryColor: e.target.value })}
                        className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer"
                      />
                      <input
                        type="text"
                        value={themeData.primaryColor}
                        onChange={e => setThemeData({ ...themeData, primaryColor: e.target.value })}
                        className="flex-1 bg-white/5 border border-border-base rounded-xl px-4 py-2 text-white font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Font Family</label>
                    <CustomSelect
                      value={themeData.fontFamily}
                      onChange={(v) => setThemeData({ ...themeData, fontFamily: v })}
                      options={[
                        { value: "Inter", label: "Inter" },
                        { value: "Roboto", label: "Roboto" },
                        { value: "Poppins", label: "Poppins" },
                        { value: "Space Grotesk", label: "Space Grotesk" },
                      ]}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-6 bg-white/5 border border-border-base rounded-2xl">
                  <div>
                    <h4 className="font-bold text-white mb-1">Dark Mode</h4>
                    <p className="text-xs text-white/40">Toggle between dark and light theme for your portfolio.</p>
                  </div>
                  <button
                    onClick={() => setThemeData({ ...themeData, darkMode: !themeData.darkMode })}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      themeData.darkMode ? "bg-blue-600" : "bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                      themeData.darkMode ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
      {/* Version History Sidebar */}
      <AnimatePresence>
        {showVersions && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVersions(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="relative w-full max-w-md bg-base border-l border-border-base h-full shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-border-base flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg font-bold text-white">Version History</h2>
                </div>
                <button onClick={() => setShowVersions(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {versions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <History className="w-12 h-12 text-white/5 mb-4" />
                    <p className="text-white/40 text-sm">No deployment history found.</p>
                  </div>
                ) : (
                  versions.map((v) => (
                    <div key={v.id} className="p-4 rounded-2xl bg-white/5 border border-border-base space-y-3 group hover:border-border-base transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-bold text-white line-clamp-2">{v.message}</p>
                          <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider mt-1">
                            {v.timestamp?.toDate().toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => handleRestore(v)}
                            disabled={isRestoring}
                            className="p-2 rounded-lg bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white transition-all"
                            title="Restore to Draft"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>

    <ConfirmModal
      open={!!restoreVersionConfirm}
      title="Restore Version"
      description="Restore this version to draft? Current draft changes will be overwritten."
      warning="This action cannot be undone."
      confirmLabel="Restore"
      danger={false}
      loading={isRestoring}
      onConfirm={confirmRestoreVersion}
      onCancel={() => setRestoreVersionConfirm(null)}
    />
    </>
  );
}
