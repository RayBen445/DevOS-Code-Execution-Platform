import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { Project, UserSettings, PortfolioData, PortfolioPage } from "../types";
import {
  Globe, Github, Zap, AlertCircle, BadgeCheck, ArrowUpRight,
  Share2, Check, Eye, GitFork, Twitter, Linkedin, ExternalLink, Mail, MapPin, Briefcase
} from "lucide-react";
import { resolveAvatar } from "../lib/avatars";
import { useSEO } from "../hooks/useSEO";
import { cn } from "../lib/utils";
import ActivityGraph from "../components/ActivityGraph";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { buildDevosUrl, buildPortfolioUrl, buildProjectUrl, PRODUCT_BRAND_NAME } from "../lib/brand";
import PremiumLoader from "../components/PremiumLoader";
import { marked } from "marked";

interface Props {
  username: string;
}

export default function SubdomainPortfolio({ username }: Props) {
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const activePageSlug = urlParams.get("page") || "/";

  const portfolioUrl = buildPortfolioUrl(username);

  useSEO({
    title: userSettings ? `${userSettings.displayName || username} — ${PRODUCT_BRAND_NAME}` : `${username} — ${PRODUCT_BRAND_NAME}`,
    description: userSettings?.bio || `${username}'s portfolio on ${PRODUCT_BRAND_NAME}`,
    ogImage: userSettings?.avatarUrl,
    ogUrl: portfolioUrl,
  });

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    const fetchData = async () => {
      try {
        const usersRef = collection(db, "users");
        const userQ = query(usersRef, where("username", "==", username), limit(1));
        const userSnap = await getDocs(userQ);
        if (userSnap.empty) {
          setError("User not found");
          setLoading(false);
          return;
        }
        const foundUid = userSnap.docs[0].id;
        setUid(foundUid);
        const userData = userSnap.docs[0].data();

        // Load Settings
        let sData: any = {};
        try {
          const settingsSnap = await getDoc(doc(db, "user_settings", foundUid));
          if (settingsSnap.exists()) {
            sData = settingsSnap.data();
          }
        } catch {}
        
        setUserSettings({
          ...sData,
          username: userData.username,
          displayName: sData.displayName || userData.displayName || userData.username,
          avatarUrl: sData.avatarUrl || sData.avatar || userData.avatarUrl || undefined,
          bio: sData.bio || userData.bio,
          links: sData.links || userData.links || {},
          availableForWork: sData.availableForWork ?? userData.availableForWork ?? false,
          isVerified: sData.isVerified || userData.isVerified || false,
        } as UserSettings);

        // Load public projects
        try {
          const projectsRef = collection(db, "projects");
          const projectsQ = query(
            projectsRef,
            where("ownerId", "==", foundUid),
            where("isPublic", "==", true),
            limit(24)
          );
          const projectsSnap = await getDocs(projectsQ);
          const projectList = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
          projectList.sort((a, b) => {
            const aTime = (a.updatedAt as any)?.seconds ?? 0;
            const bTime = (b.updatedAt as any)?.seconds ?? 0;
            return bTime - aTime;
          });
          setProjects(projectList.filter(p => !p.isSystem)); // Filter out system projects
        } catch (projErr) {
          console.error("Failed to load projects:", projErr);
        }

        // Load Portfolio Data (if exists)
        try {
          const pRef = collection(db, "projects");
          const pQ = query(
            pRef,
            where("ownerId", "==", foundUid),
            where("isSystem", "==", true),
            where("systemType", "==", "portfolio"),
            limit(1)
          );
          const pSnap = await getDocs(pQ);
          if (!pSnap.empty) {
            const pDoc = pSnap.docs[0].data() as Project;
            if (pDoc.draft && pDoc.draft.portfolio) {
              setPortfolioData(pDoc.draft.portfolio as PortfolioData);
            }
          }
        } catch (e) {
          console.error("Failed to load portfolio project:", e);
        }

      } catch {
        setError("Failed to load portfolio");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(portfolioUrl);
      setCopied(true);
      toast.success("Portfolio link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  if (loading) {
    return <PremiumLoader fullScreen message="LOADING PORTFOLIO" />;
  }

  if (error || !userSettings) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center text-white/60 gap-4 px-6 text-center">
        <div className="w-20 h-20 rounded-[24px] bg-white/5 border border-border-base flex items-center justify-center mb-2">
          <AlertCircle className="w-10 h-10 text-white/20" />
        </div>
        <h1 className="text-3xl font-bold text-white">{error || "Portfolio not found"}</h1>
        <p className="text-white/40 max-w-sm">The portfolio you're looking for doesn't exist or has been moved.</p>
        <a href={buildDevosUrl()} className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all">
          Go to DevOS
        </a>
      </div>
    );
  }

  const displayName = userSettings.displayName || userSettings.username || username;
  const avatarUrl = resolveAvatar(userSettings.avatarUrl);
  const isVerified = (userSettings as any).isVerified || false;
  const availableForWork = userSettings.availableForWork;
  const links = userSettings.links || {};

  // Check if we have multi-page portfolio data
  if (portfolioData && portfolioData.pages && portfolioData.pages.length > 0) {
    const layout = portfolioData.global?.layout || 'classic';
    const pages = portfolioData.pages;
    const activePage = pages.find(p => p.slug === activePageSlug) || pages[0];
    const markdownHtml = marked.parse(activePage.content || "");

    return (
      <div className={`min-h-screen text-white flex flex-col ${layout === 'minimal' ? 'bg-[#0a0a0a]' : 'bg-base'}`}>
        {/* Navbar */}
        {portfolioData.global?.navbar?.style !== 'hidden' && (
          <nav className="sticky top-0 z-50 bg-base/80 backdrop-blur-xl border-b border-border-base">
            <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
              <a href="?page=/" className="font-bold text-lg flex items-center gap-2">
                <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full border border-border-base" />
                {portfolioData.global?.navbar?.logo === 'text' ? displayName : <Zap className="w-5 h-5 text-blue-500" />}
              </a>
              <div className="flex items-center gap-6">
                {pages.map(p => (
                  <a 
                    key={p.id} 
                    href={`?page=${p.slug}`}
                    className={cn(
                      "text-sm font-medium transition-all hover:text-white",
                      activePageSlug === p.slug ? "text-white" : "text-white/50"
                    )}
                  >
                    {p.title}
                  </a>
                ))}
              </div>
            </div>
          </nav>
        )}

        {/* Main Content */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 md:py-20">
          
          {layout === 'developer' && activePageSlug === '/' && (
             <div className="mb-12 p-8 border border-blue-500/20 bg-blue-500/5 rounded-2xl font-mono">
               <h1 className="text-3xl text-blue-400 mb-4">&gt; Hello, World_</h1>
               <p className="text-white/70">I am {displayName}. Welcome to my developer portfolio.</p>
             </div>
          )}

          {layout === 'bento' && activePageSlug === '/' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
              <div className="md:col-span-2 p-8 bg-white/5 border border-border-base rounded-3xl">
                <h1 className="text-4xl font-bold mb-4">{displayName}</h1>
                <p className="text-white/60 text-lg">{portfolioData.bio || userSettings.bio}</p>
              </div>
              <div className="p-8 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-border-base rounded-3xl flex items-center justify-center">
                 <img src={avatarUrl} alt="Avatar" className="w-32 h-32 rounded-full border-4 border-white/10" />
              </div>
            </div>
          )}

          <div 
            className="prose prose-invert prose-blue max-w-none"
            dangerouslySetInnerHTML={{ __html: markdownHtml }}
          />
        </main>

        {/* Footer */}
        <footer className="border-t border-border-base py-12 mt-auto">
          <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/40 text-sm">{portfolioData.global?.footer?.text || `© ${new Date().getFullYear()} ${displayName}`}</p>
            {portfolioData.global?.footer?.showSocials && (
              <div className="flex items-center gap-4">
                {links.github && (
                  <a href={`https://github.com/${links.github}`} target="_blank" rel="noreferrer" className="text-white/40 hover:text-white transition-colors">
                    <Github className="w-5 h-5" />
                  </a>
                )}
                {links.twitter && (
                  <a href={`https://twitter.com/${links.twitter}`} target="_blank" rel="noreferrer" className="text-white/40 hover:text-blue-400 transition-colors">
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {links.linkedin && (
                  <a href={`https://linkedin.com/in/${links.linkedin}`} target="_blank" rel="noreferrer" className="text-white/40 hover:text-blue-500 transition-colors">
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </footer>
      </div>
    );
  }

  // LEGACY SINGLE PAGE VIEW FALLBACK (if no pages array is defined)
  return (
    <div className="min-h-screen bg-base text-white selection:bg-blue-500/30">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[1000px] h-[1000px] bg-blue-500/5 rounded-full blur-[120px] mix-blend-screen opacity-50" />
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-[100px] mix-blend-screen opacity-50" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 bg-base/50 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <span className="font-bold text-white tracking-tight">{displayName}</span>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
            {copied ? "Copied!" : "Share"}
          </button>
        </div>
      </nav>

      <main className="relative pt-32 pb-24 px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          
          {/* Header Profile Section */}
          <section className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-[2rem] overflow-hidden border border-white/10 flex-shrink-0 relative group">
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="flex-1 space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">{displayName}</h1>
                  {isVerified && <BadgeCheck className="w-8 h-8 text-blue-400 flex-shrink-0" />}
                </div>
                <p className="text-lg text-white/50 font-mono">@{username}</p>
              </div>

              {userSettings.bio && (
                <p className="text-xl text-white/80 leading-relaxed max-w-2xl">{userSettings.bio}</p>
              )}

              {availableForWork && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm font-bold text-green-400">Available for work</span>
                </div>
              )}

              {/* Links */}
              <div className="flex flex-wrap items-center gap-3">
                {links.website && (
                  <a href={links.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-colors">
                    <Globe className="w-4 h-4" /> Website
                  </a>
                )}
                {links.github && (
                  <a href={`https://github.com/${links.github}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-colors">
                    <Github className="w-4 h-4" /> GitHub
                  </a>
                )}
                {links.twitter && (
                  <a href={`https://twitter.com/${links.twitter}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-colors">
                    <Twitter className="w-4 h-4" /> Twitter
                  </a>
                )}
                {links.linkedin && (
                  <a href={`https://linkedin.com/in/${links.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-colors">
                    <Linkedin className="w-4 h-4" /> LinkedIn
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* Activity Graph */}
          {uid && (
             <section className="bg-white/5 border border-border-base rounded-[2rem] p-8">
               <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                 <Zap className="w-5 h-5 text-blue-400" />
                 Activity
               </h2>
               <div className="overflow-x-auto pb-4">
                 <div className="min-w-[800px]">
                   <ActivityGraph uid={uid} />
                 </div>
               </div>
             </section>
          )}

          {/* Featured Projects */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Globe className="w-6 h-6 text-purple-400" />
              Featured Work
            </h2>
            
            {projects.length === 0 ? (
              <div className="p-12 border border-dashed border-white/10 rounded-[2rem] text-center bg-white/5">
                <Globe className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No projects yet</h3>
                <p className="text-white/40 max-w-sm mx-auto">This developer hasn't published any public projects yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map((project) => (
                  <a
                    key={project.id}
                    href={buildProjectUrl(username, project.slug || project.id)}
                    className="group block p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[2rem] transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Globe className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="flex items-center gap-3 text-white/40">
                        <div className="flex items-center gap-1.5">
                          <Eye className="w-4 h-4" />
                          <span className="text-sm font-medium">{project.views || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <GitFork className="w-4 h-4" />
                          <span className="text-sm font-medium">{project.forks || 0}</span>
                        </div>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-white/50 text-sm leading-relaxed mb-6 line-clamp-2">
                      {project.description || "No description provided."}
                    </p>
                    <div className="flex items-center gap-2 text-blue-400 text-sm font-bold mt-auto">
                      View Project <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>

        </div>
      </main>
      
      <footer className="border-t border-border-base py-8 mt-12 bg-black/20">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-white/30 text-sm font-medium">Built with {PRODUCT_BRAND_NAME}</p>
        </div>
      </footer>
    </div>
  );
}
