import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { UserSettings, Project } from "../types";
import { Globe, Github, ExternalLink, Calendar, User as UserIcon, Loader2, Zap, Copy, Check, Share2, ArrowUpRight, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "../lib/utils";

export default function Portfolio() {
  const { username } = useParams<{ username: string }>();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (username) {
      fetchPortfolioData();
      document.title = `${username} | DevOS Portfolio`;
    }
    return () => {
      document.title = "DevOS | Collaborative IDE";
    };
  }, [username]);

  const handleCopyLink = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const fetchPortfolioData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch user by username
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("username", "==", username), limit(1));
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        setError("User not found");
        setLoading(false);
        return;
      }

      const userData = userSnapshot.docs[0].data() as UserSettings;
      setUserSettings(userData);

      // 2. Fetch public projects for this user
      const projectsRef = collection(db, "projects");
      const projectsQuery = query(
        projectsRef,
        where("ownerUsername", "==", username),
        where("isPublic", "==", true)
      );
      const projectsSnapshot = await getDocs(projectsQuery);
      
      const projectsList = projectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];

      // Sort in memory to avoid index requirement
      projectsList.sort((a, b) => {
        const timeA = a.updatedAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || 0;
        return timeB - timeA;
      });

      setProjects(projectsList);
    } catch (err) {
      console.error("Error fetching portfolio:", err);
      setError("An error occurred while loading the portfolio.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-blue-500/10 border-t-blue-500 animate-spin" />
          <Zap className="absolute inset-0 m-auto w-6 h-6 text-blue-500 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !userSettings) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-24 h-24 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center mb-8 shadow-2xl shadow-red-500/5"
        >
          <AlertCircle className="w-12 h-12 text-white/20" />
        </motion.div>
        <h1 className="text-4xl font-bold mb-4 tracking-tight">{error || "User not found"}</h1>
        <p className="text-white/40 mb-10 max-w-md leading-relaxed">
          The portfolio you're looking for doesn't exist or has been moved. Check the username and try again.
        </p>
        <Link
          to="/"
          className="px-8 py-4 bg-white text-black rounded-2xl font-bold hover:bg-white/90 transition-all active:scale-95 shadow-xl shadow-white/10"
        >
          Back to DevOS
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Header / Profile Section */}
      <header className="relative max-w-5xl mx-auto pt-32 pb-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center"
        >
          <div className="relative group mb-10">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-8px] rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-20 blur-md group-hover:opacity-40 transition-opacity"
            />
            <div className="relative w-32 h-32 rounded-full bg-[#111] border-2 border-white/10 overflow-hidden shadow-2xl">
              {(userSettings.avatar || userSettings.avatarUrl) ? (
                <img
                  src={userSettings.avatar || userSettings.avatarUrl}
                  alt={userSettings.fullName || userSettings.username}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">
                  <UserIcon className="w-12 h-12" />
                </div>
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 border-4 border-[#050505] flex items-center justify-center shadow-lg">
              <Zap className="w-3.5 h-3.5 text-white fill-white" />
            </div>
          </div>
          
          <h1 className="text-5xl font-black mb-3 tracking-tighter bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            {userSettings.fullName || userSettings.displayName || userSettings.username}
          </h1>
          <div className="flex items-center gap-3 mb-8">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs font-bold">
              @{userSettings.username}
            </span>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <span className="text-white/40 text-xs font-bold uppercase tracking-widest">DevOS Pro</span>
          </div>
          
          {userSettings.bio && (
            <p className="text-white/60 max-w-xl text-lg leading-relaxed mb-10 font-medium">
              {userSettings.bio}
            </p>
          )}

          <div className="flex items-center gap-4">
            <div className="px-6 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-white/60 flex items-center gap-2 backdrop-blur-sm">
              <Globe className="w-3.5 h-3.5" />
              {projects.length} Public Projects
            </div>
            <button 
              onClick={() => handleCopyLink(window.location.href, "profile")}
              className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </header>

      {/* Projects Grid */}
      <main className="relative max-w-5xl mx-auto px-6 pb-32">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            Featured Projects
            <div className="h-[1px] w-12 bg-blue-500/30" />
          </h2>
          <div className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
            Sorted by Recency
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative p-8 rounded-[32px] bg-[#0f0f0f] border border-white/5 hover:border-blue-500/30 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(59,130,246,0.1)] flex flex-col"
            >
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[32px] pointer-events-none" />
              
              <div className="flex items-start justify-between mb-8 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-lg shadow-blue-500/0 group-hover:shadow-blue-500/20">
                  <Globe className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2">
                  {(project.githubUrl || project.githubRepo) && (
                    <a
                      href={project.githubUrl || `https://github.com/${project.githubRepo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-all"
                      title="View Source"
                    >
                      <Github className="w-5 h-5" />
                    </a>
                  )}
                  <button 
                    onClick={() => handleCopyLink(project.liveUrl || project.deployUrl || "", project.id)}
                    className="p-2.5 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-all"
                    title="Copy Link"
                  >
                    {copiedId === project.id ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="relative z-10 flex-1">
                <h3 className="text-2xl font-bold mb-3 group-hover:text-blue-400 transition-colors tracking-tight">
                  {project.title || project.name}
                </h3>
                
                {project.description && (
                  <p className="text-sm text-white/40 line-clamp-3 mb-8 leading-relaxed font-medium">
                    {project.description}
                  </p>
                )}
              </div>

              <div className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between relative z-10">
                {(project.liveUrl || project.deployUrl) ? (
                  <a
                    href={project.liveUrl || project.deployUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl text-xs font-bold hover:bg-white/90 transition-all active:scale-95 shadow-lg shadow-white/5"
                  >
                    Open Live
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest py-2">
                    Not Deployed
                  </div>
                )}

                {project.updatedAt && (
                  <div className="flex items-center gap-2 text-[10px] text-white/20 font-bold uppercase tracking-widest">
                    <Calendar className="w-3 h-3" />
                    {new Date(project.updatedAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {projects.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-32 text-center"
          >
            <div className="w-24 h-24 rounded-[40px] bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Globe className="w-10 h-10 text-white/10" />
            </div>
            <h3 className="text-2xl font-bold text-white/60 mb-3 tracking-tight">No public projects yet</h3>
            <p className="text-white/20 text-sm max-w-xs mx-auto leading-relaxed">
              This user is currently building in stealth mode. Check back later for updates.
            </p>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative max-w-5xl mx-auto px-6 py-20 border-t border-white/5 text-center">
        <div className="flex flex-col items-center gap-6">
          <Link to="/" className="group inline-flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-500 transition-all duration-500">
              <Zap className="w-5 h-5 text-white/20 group-hover:text-white group-hover:fill-white transition-all" />
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-white/20 group-hover:text-white transition-colors">Built with DevOS</span>
          </Link>
          <div className="h-4 w-[1px] bg-white/5" />
          <p className="text-[10px] text-white/10 font-mono uppercase tracking-[0.2em]">
            {username}.devos.zone.id
          </p>
        </div>
      </footer>
    </div>
  );
}
