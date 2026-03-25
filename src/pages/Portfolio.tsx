import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { UserSettings, Project } from "../types";
import { Globe, Github, ExternalLink, Calendar, User as UserIcon, Loader2, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function Portfolio() {
  const { username } = useParams<{ username: string }>();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (username) {
      fetchPortfolioData();
      document.title = `${username} | DevOS Portfolio`;
    }
    return () => {
      document.title = "DevOS | Collaborative IDE";
    };
  }, [username]);

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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !userSettings) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8">
          <Zap className="w-10 h-10 text-white/20" />
        </div>
        <h1 className="text-4xl font-bold mb-4">{error || "User not found"}</h1>
        <p className="text-white/40 mb-8 max-w-md">
          The portfolio you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
        >
          Back to DevOS
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Header / Profile Section */}
      <header className="max-w-4xl mx-auto pt-24 pb-16 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <div className="w-32 h-32 rounded-full bg-white/5 border border-white/10 overflow-hidden mb-8 shadow-2xl shadow-blue-500/10">
            {(userSettings.avatar || userSettings.avatarUrl) ? (
              <img
                src={userSettings.avatar || userSettings.avatarUrl}
                alt={userSettings.fullName || userSettings.username}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/20">
                <UserIcon className="w-12 h-12" />
              </div>
            )}
          </div>
          
          <h1 className="text-4xl font-bold mb-2 tracking-tight">
            {userSettings.fullName || userSettings.displayName || userSettings.username}
          </h1>
          <p className="text-blue-500 font-mono text-sm mb-6">@{userSettings.username}</p>
          
          {userSettings.bio && (
            <p className="text-white/60 max-w-lg leading-relaxed mb-8">
              {userSettings.bio}
            </p>
          )}

          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/40">
              {projects.length} Public Projects
            </div>
          </div>
        </motion.div>
      </header>

      {/* Projects Grid */}
      <main className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group p-6 rounded-3xl bg-[#111] border border-white/5 hover:border-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
                  {(project.githubUrl || project.githubRepo) && (
                    <a
                      href={project.githubUrl || `https://github.com/${project.githubRepo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
                    >
                      <Github className="w-4 h-4" />
                    </a>
                  )}
                  {project.updatedAt && (
                    <div className="flex items-center gap-1.5 text-[10px] text-white/20 font-medium uppercase tracking-widest">
                      <Calendar className="w-3 h-3" />
                      {new Date(project.updatedAt.seconds * 1000).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-bold mb-2 group-hover:text-blue-400 transition-colors">
                {project.title || project.name}
              </h3>
              
              {project.description && (
                <p className="text-sm text-white/40 line-clamp-2 mb-6">
                  {project.description}
                </p>
              )}

              {(project.liveUrl || project.deployUrl) ? (
                <a
                  href={project.liveUrl || project.deployUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl text-xs font-bold hover:bg-white/90 transition-all active:scale-95"
                >
                  Open Project
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest py-2">
                  Not Deployed
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
              <Globe className="w-8 h-8 text-white/10" />
            </div>
            <h3 className="text-xl font-bold text-white/60 mb-2">No public projects</h3>
            <p className="text-white/20 text-sm">
              This user hasn't shared any public projects yet.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-12 border-t border-white/5 text-center">
        <div className="flex flex-col items-center gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-white/20 hover:text-white transition-colors">
            <Zap className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Built with DevOS</span>
          </Link>
          <p className="text-[10px] text-white/10 font-mono uppercase tracking-widest">
            {username}.devos.zone.id
          </p>
        </div>
      </footer>
    </div>
  );
}
