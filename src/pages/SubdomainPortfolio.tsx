import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { Project, UserSettings } from "../types";
import {
  Globe, Github, Zap, AlertCircle, BadgeCheck, ArrowUpRight,
  Share2, Check, Eye, GitFork, Twitter, Linkedin, ExternalLink,
} from "lucide-react";
import { resolveAvatar } from "../lib/avatars";
import { useSEO } from "../hooks/useSEO";
import { cn } from "../lib/utils";
import ActivityGraph from "../components/ActivityGraph";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { buildDevosUrl, buildPortfolioUrl, buildProjectUrl, PRODUCT_BRAND_NAME } from "../lib/brand";

interface Props {
  username: string;
}

export default function SubdomainPortfolio({ username }: Props) {
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

        try {
          const settingsSnap = await getDoc(doc(db, "user_settings", foundUid));
          if (settingsSnap.exists()) {
            const s = settingsSnap.data();
            setUserSettings({
              ...s,
              avatarUrl: s.avatarUrl || s.avatar || userData.avatarUrl || undefined,
            } as UserSettings);
          } else {
            setUserSettings({
              username: userData.username,
              displayName: userData.displayName || userData.username,
              avatarUrl: userData.avatarUrl || undefined,
              bio: userData.bio,
            } as UserSettings);
          }
        } catch {
          setUserSettings({
            username: userData.username,
            displayName: userData.displayName || userData.username,
            avatarUrl: userData.avatarUrl || undefined,
            bio: userData.bio,
          } as UserSettings);
        }

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
          setProjects(projectList);
        } catch (projErr) {
          console.error("[SubdomainPortfolio] Failed to load projects:", projErr);
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
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-blue-500/10 border-t-blue-500 animate-spin" />
          <Zap className="absolute inset-0 m-auto w-6 h-6 text-blue-500 animate-pulse" />
        </div>
      </div>
    );
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
  const bio = userSettings.bio || (userSettings as any).about || "";
  const websiteUrl = userSettings.links?.website || (userSettings as any).websiteUrl || "";
  const githubUrl = userSettings.links?.github || (userSettings as any).githubUrl || "";
  const twitterUrl = (userSettings as any).twitterUrl || userSettings.links?.twitter || "";
  const linkedinUrl = (userSettings as any).linkedinUrl || userSettings.links?.linkedin || "";
  const isVerified = (userSettings as any).isVerified || false;

  return (
    <div className="min-h-screen bg-base text-white selection:bg-blue-500/30">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[140px]" />
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-violet-600/4 rounded-full blur-[120px]" />
      </div>

      {/* Hero / Profile header */}
      <header className="relative max-w-4xl mx-auto px-6 pt-14 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row items-start sm:items-end gap-6"
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-[28px] ring-2 ring-white/10 overflow-hidden shadow-2xl shadow-black/50">
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-green-500 border-2 border-[#050505]" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-3xl font-black tracking-tight">{displayName}</h1>
              {isVerified && <BadgeCheck className="w-6 h-6 text-blue-400 shrink-0" />}
            </div>
            <p className="text-white/40 text-sm font-mono mb-2">@{username}</p>
            {bio && <p className="text-white/60 text-sm leading-relaxed max-w-lg">{bio}</p>}

            {/* Links */}
            <div className="flex flex-wrap items-center gap-4 mt-3">
              {websiteUrl && (
                <a href={websiteUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors">
                  <Globe className="w-3.5 h-3.5" /> Website
                </a>
              )}
              {githubUrl && (
                <a href={githubUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors">
                  <Github className="w-3.5 h-3.5" /> GitHub
                </a>
              )}
              {twitterUrl && (
                <a href={twitterUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors">
                  <Twitter className="w-3.5 h-3.5" /> Twitter
                </a>
              )}
              {linkedinUrl && (
                <a href={linkedinUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors">
                  <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                </a>
              )}
            </div>
          </div>

          {/* Action row */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-4 py-2 rounded-2xl bg-white/5 border border-border-base text-xs font-bold text-white/50 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              {projects.length} project{projects.length !== 1 ? "s" : ""}
            </div>
            <button
              onClick={handleShare}
              title="Copy portfolio URL"
              className="p-2.5 rounded-2xl bg-white/5 border border-border-base text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>
      </header>

      {/* Projects grid */}
      <main className="max-w-4xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-3">
            Projects
            <div className="h-px w-10 bg-blue-500/30" />
          </h2>
          <span className="text-xs text-white/25 font-mono uppercase tracking-widest">Public</span>
        </div>

        {projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 gap-3 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-border-base flex items-center justify-center mb-2">
              <ExternalLink className="w-8 h-8 text-white/15" />
            </div>
            <p className="text-white/40 font-medium">No public projects yet</p>
            <p className="text-white/20 text-sm">Projects published by @{username} will appear here.</p>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {projects.map((project, i) => {
              const projectUrl = project.projectSlug || project.slug
                ? buildProjectUrl(username, project.projectSlug || project.slug || "")
                : buildDevosUrl(`project/${project.id}`);
              return (
                <motion.a
                  key={project.id}
                  href={projectUrl}
                  target="_blank"
                  rel="noreferrer"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group relative flex flex-col p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.14] transition-all overflow-hidden"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors leading-snug">
                        {project.title || project.name}
                      </h3>
                      <ArrowUpRight className="w-4 h-4 text-white/25 group-hover:text-white/60 transition-colors shrink-0 mt-0.5" />
                    </div>
                    {project.description && (
                      <p className="text-white/40 text-sm leading-relaxed line-clamp-2 mb-4">
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-white/25">
                      {project.language && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          {project.language}
                        </span>
                      )}
                      {(project as any).views != null && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {(project as any).views}
                        </span>
                      )}
                      {(project.forksCount ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <GitFork className="w-3 h-3" />
                          {project.forksCount}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.a>
              );
            })}
          </div>
        )}

        {/* Activity Graph */}
        {uid && (
          <div className="mt-12">
            <h2 className="text-xl font-bold tracking-tight mb-6 flex items-center gap-3">
              Activity
              <div className="h-px w-10 bg-blue-500/30" />
            </h2>
            <ActivityGraph userId={uid} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-base py-8 text-center">
        <a href={buildDevosUrl()} className="inline-flex items-center gap-2 text-white/20 text-xs hover:text-white/50 transition-colors">
          <Zap className="w-3.5 h-3.5" />
          Powered by {PRODUCT_BRAND_NAME}
        </a>
      </footer>
    </div>
  );
}

