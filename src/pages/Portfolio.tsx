import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { db, auth } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { UserSettings, Project, FeedPost } from "../types";
import { Globe, Github, ExternalLink, Calendar, User as UserIcon, Zap, Copy, Check, Share2, ArrowUpRight, AlertCircle, Twitter, Linkedin, Eye, Heart, GitFork, Users, Pencil, Flame, BadgeCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn, formatRelativeTime, toValidDate } from "../lib/utils";
import { resolveAvatar } from "../lib/avatars";
import { useSEO } from "../hooks/useSEO";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import Navbar from "../components/Navbar";
import FollowButton from "../components/FollowButton";
import ActivityGraph from "../components/ActivityGraph";
import { getFollowerCount, getFollowingCount } from "../lib/followService";
import { subscribeFeed } from "../lib/feedService";
import { buildPortfolioUrl, PRODUCT_BRAND_NAME } from "../lib/brand";

type PortfolioTab = "projects" | "posts" | "about";

export default function Portfolio() {
  const { username } = useParams<{ username: string }>();
  const [currentUser] = useAuthState(auth);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [portfolioConfig, setPortfolioConfig] = useState<any>(null);
  const [themeConfig, setThemeConfig] = useState<any>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<PortfolioTab>("projects");

  useEffect(() => {
    if (!username) return;

    const params = new URLSearchParams(window.location.search);
    const previewMode = params.get('preview') === 'true';
    setIsPreview(previewMode);

    setLoading(true);
    setError(null);

    // 1. Fetch user by username from users (public)
    const usersRef = collection(db, "users");
    const userQuery = query(usersRef, where("username", "==", username), limit(1));
    
    const unsubUser = onSnapshot(userQuery, (userSnapshot) => {
      if (userSnapshot.empty) {
        setError("User not found");
        setLoading(false);
        return;
      }

      const uid = userSnapshot.docs[0].id;
      const userData = userSnapshot.docs[0].data() as UserSettings;
      setUserSettings(userData);
      setUid(uid);

      // Load follower/following counts
      Promise.all([getFollowerCount(uid), getFollowingCount(uid)]).then(
        ([followers, following]) => {
          setFollowerCount(followers);
          setFollowingCount(following);
        }
      ).catch(() => {});

      // 2. Fetch the portfolio project for this user to get config
      const projectsRef = collection(db, "projects");
      const portfolioQuery = query(
        projectsRef,
        where("ownerId", "==", uid),
        where("isSystem", "==", true),
        where("systemType", "==", "portfolio")
      );

      const unsubPortfolio = onSnapshot(portfolioQuery, (portfolioSnapshot) => {
        if (portfolioSnapshot.empty) {
          setLoading(false);
          return;
        }

        const projectDoc = portfolioSnapshot.docs[0];
        const projectData = projectDoc.data() as Project;
        
        let pConfig = null;
        let tConfig = null;

        if (previewMode) {
          // In preview mode, use the draft data
          pConfig = projectData.draft?.portfolio;
          tConfig = projectData.draft?.theme;
        } else {
          // In live mode, use the published data
          pConfig = projectData.published?.portfolio;
          tConfig = projectData.published?.theme;
        }

        setPortfolioConfig(pConfig);
        setThemeConfig(tConfig);

        // Apply theme
        if (tConfig?.primaryColor) {
          document.documentElement.style.setProperty('--primary-color', tConfig.primaryColor);
        }
        if (tConfig?.fontFamily) {
          document.documentElement.style.setProperty('--font-family', tConfig.fontFamily);
        }

        // 3. Fetch public projects for this user
        const publicProjectsQuery = query(
          projectsRef,
          where("ownerId", "==", uid),
          where("isPublic", "==", true)
        );

        const unsubProjects = onSnapshot(publicProjectsQuery, (projectsSnapshot) => {
          let projectsList = projectsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Project[];

          // Filter out the portfolio project itself
          projectsList = projectsList.filter(p => p.systemType !== 'portfolio');

          // Sort based on featured projects
          if (pConfig?.featuredProjects?.length > 0) {
            const featuredIds = pConfig.featuredProjects;
            projectsList.sort((a, b) => {
              const aFeatured = featuredIds.includes(a.id);
              const bFeatured = featuredIds.includes(b.id);
              if (aFeatured && !bFeatured) return -1;
              if (!aFeatured && bFeatured) return 1;
              
              const timeA = a.updatedAt?.seconds || 0;
              const timeB = b.updatedAt?.seconds || 0;
              return timeB - timeA;
            });
          } else {
            projectsList.sort((a, b) => {
              const timeA = a.updatedAt?.seconds || 0;
              const timeB = b.updatedAt?.seconds || 0;
              return timeB - timeA;
            });
          }

          setProjects(projectsList);
          setLoading(false);
        });

        // 4. Subscribe to this user's feed posts
        const unsubFeed = subscribeFeed((feedPosts) => {
          setPosts(feedPosts);
        }, { userId: uid });

        return () => { unsubProjects(); unsubFeed(); };
      });

      return () => unsubPortfolio();
    }, (err) => {
      console.error("Error fetching portfolio:", err);
      setError("An error occurred while loading the portfolio.");
      setLoading(false);
    });

    return () => {
      unsubUser();
    };
  }, [username]);

  const portfolioAvatarUrl = resolveAvatar(userSettings?.avatar || userSettings?.avatarUrl);
  const portfolioDisplayName = userSettings?.fullName || userSettings?.displayName || userSettings?.username || username || "";
  // True when logged-in user is viewing their own portfolio
  const isOwner = !!(currentUser && uid && currentUser.uid === uid);

  useSEO({
    title: `@${username ?? ""} — ${PRODUCT_BRAND_NAME}`,
    description: `Explore projects built by @${username ?? ""} on ${PRODUCT_BRAND_NAME}`,
    ogImage: portfolioAvatarUrl,
    ogUrl: typeof window !== "undefined" ? window.location.href : undefined,
  });

  const handleCopyLink = async (url: string, id: string) => {    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
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
      {/* Navbar — show for authenticated users */}
      {currentUser && !isPreview && <Navbar />}

      <AnimatePresence>
        {isPreview && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-blue-600 text-white py-2 px-4 flex items-center justify-center gap-4 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span className="text-sm font-bold uppercase tracking-wider">Preview Mode</span>
            </div>
            <p className="text-xs text-white/80 hidden sm:block">You are viewing your draft changes. These are not live yet.</p>
            <button 
              onClick={() => window.close()}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-[10px] font-bold uppercase transition-all"
            >
              Close Preview
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Header / Profile Section */}
      <header className="relative w-full pt-32 pb-20 px-6 md:px-8">
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
              <img
                src={portfolioAvatarUrl}
                alt={portfolioDisplayName}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 border-4 border-[#050505] flex items-center justify-center shadow-lg">
              <Zap className="w-3.5 h-3.5 text-white fill-white" />
            </div>
          </div>
          
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-5xl font-black tracking-tighter bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
              {userSettings.fullName || userSettings.displayName || userSettings.username}
            </h1>
            {(userSettings as any)?.isOfficial && (
              <span title="Official">
                <BadgeCheck className="w-8 h-8 text-blue-400 flex-shrink-0" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mb-8">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs font-bold">
              @{userSettings.username}
            </span>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <span className="text-white/40 text-xs font-bold uppercase tracking-widest">DevOS Pro</span>
          </div>
          
          {(portfolioConfig?.bio || userSettings.bio) && (
            <p className="text-white/60 max-w-xl text-lg leading-relaxed mb-6 font-medium">
              {portfolioConfig?.bio || userSettings.bio}
            </p>
          )}

          {/* Skills tags */}
          {userSettings.skills && userSettings.skills.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {userSettings.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-semibold"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {/* Streak badges */}
          {((userSettings.dailyStreak ?? 0) > 0 || (userSettings.monthlyStreak ?? 0) > 0) && (
            <div className="flex items-center justify-center gap-3 mb-8">
              {(userSettings.dailyStreak ?? 0) > 0 && (
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-bold">
                  <Flame className="w-4 h-4" />
                  {userSettings.dailyStreak} day{userSettings.dailyStreak !== 1 ? "s" : ""} streak
                </div>
              )}
              {(userSettings.monthlyStreak ?? 0) > 0 && (
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold">
                  <Calendar className="w-3.5 h-3.5" />
                  {userSettings.monthlyStreak} month{userSettings.monthlyStreak !== 1 ? "s" : ""} streak
                </div>
              )}
            </div>
          )}

          {portfolioConfig?.links && portfolioConfig.links.some((l: any) => l.url) && (
            <div className="flex items-center gap-6 mb-10">
              {portfolioConfig.links.map((link: any, index: number) => {
                if (!link.url) return null;
                return (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/40 hover:text-white transition-all flex items-center gap-2 text-sm font-bold group"
                  >
                    {link.platform === 'github' && <Github className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                    {link.platform === 'twitter' && <Twitter className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                    {link.platform === 'linkedin' && <Linkedin className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                    <span className="capitalize">{link.platform}</span>
                  </a>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 mt-2 mb-8">
            {/* Follower/following counts */}
            <button className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
              <Users className="w-3.5 h-3.5" />
              <span className="font-bold text-white">{followerCount ?? "…"}</span>
              <span>followers</span>
            </button>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <button className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
              <span className="font-bold text-white">{followingCount ?? "…"}</span>
              <span>following</span>
            </button>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <div className="px-5 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-white/60 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              {projects.length} projects
            </div>

            {/* Owner vs Public actions */}
            {isOwner ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/settings"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all active:scale-90"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Profile
                </Link>
              </div>
            ) : (
              uid && (
                <FollowButton
                  targetUid={uid}
                  targetUsername={userSettings.username ?? username ?? ""}
                  followerUsername={currentUser?.displayName ?? undefined}
                />
              )
            )}

            <button
              onClick={() => handleCopyLink(buildPortfolioUrl(username ?? ""), "profile")}
              title="Copy portfolio URL"
              className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </header>

      {/* Tabs + main content */}
      <main className="relative w-full px-6 md:px-8 pb-32">
        {/* Tab nav */}
        <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl mb-10 w-fit">
          {(["projects", "posts", "about"] as PortfolioTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-2 rounded-xl text-sm font-semibold transition-all capitalize",
                activeTab === tab
                  ? "bg-white text-black shadow"
                  : "text-white/50 hover:text-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Projects tab ── */}
        {activeTab === "projects" && (
          <>
            <div className="flex items-center justify-between mb-8">
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
                  transition={{ delay: index * 0.08 }}
                  className="group relative p-8 rounded-[32px] bg-[#0f0f0f] border border-white/5 hover:border-blue-500/30 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(59,130,246,0.1)] flex flex-col"
                >
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[32px] pointer-events-none" />

                  <div className="flex items-start justify-between mb-8 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2">
                      {(project.githubUrl || project.githubRepo) && (
                        <a
                          href={project.githubUrl || `https://github.com/${project.githubRepo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-all"
                        >
                          <Github className="w-5 h-5" />
                        </a>
                      )}
                      <button
                        onClick={() => handleCopyLink(project.liveUrl || project.deployUrl || "", project.id)}
                        className="p-2.5 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-all"
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
                      <p className="text-sm text-white/40 line-clamp-3 mb-4 leading-relaxed">
                        {project.description}
                      </p>
                    )}
                    {/* Tech stack chips derived from file extensions if available */}
                    {project.tags && project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {project.tags.slice(0, 4).map((tag: string) => (
                          <span key={tag} className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-semibold text-white/40 uppercase">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-white/25 font-semibold">
                      {project.views !== undefined && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {project.views} views
                        </span>
                      )}
                      {project.forksCount > 0 && (
                        <span className="flex items-center gap-1">
                          <GitFork className="w-3 h-3" />
                          {project.forksCount} forks
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                    {(project.liveUrl || project.deployUrl) ? (
                      <a
                        href={project.liveUrl || project.deployUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl text-xs font-bold hover:bg-white/90 transition-all active:scale-95"
                      >
                        Open Live
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <Link
                        to={`/project/${project.id}`}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white/60 rounded-2xl text-xs font-bold hover:border-white/20 transition-all"
                      >
                        View Project
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    {project.updatedAt && (
                      <div className="flex items-center gap-2 text-[10px] text-white/20 font-bold uppercase tracking-widest">
                        <Calendar className="w-3 h-3" />
                        {toValidDate(project.updatedAt)?.toLocaleDateString(undefined, { month: "short", year: "numeric" }) ?? "—"}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {projects.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32 text-center">
                <div className="w-24 h-24 rounded-[40px] bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8">
                  <Globe className="w-10 h-10 text-white/10" />
                </div>
                <h3 className="text-2xl font-bold text-white/60 mb-3 tracking-tight">No public projects yet</h3>
                <p className="text-white/20 text-sm max-w-xs mx-auto">
                  This user is currently building in stealth mode. Check back later.
                </p>
              </motion.div>
            )}
          </>
        )}

        {/* ── Posts tab ── */}
        {activeTab === "posts" && (
          <div className="space-y-4 max-w-2xl">
            {posts.length === 0 ? (
              <div className="py-20 text-center rounded-2xl border border-dashed border-white/10">
                <Heart className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">No posts yet</p>
              </div>
            ) : (
              posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/30 font-semibold capitalize">{post.type}</span>
                    {post.createdAt && (
                      <span className="text-xs text-white/20">{formatRelativeTime(post.createdAt)}</span>
                    )}
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">{post.content}</p>
                  {post.projectName && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-400">
                      <ExternalLink className="w-3 h-3" />
                      {post.projectName}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 text-xs text-white/30">
                    <Heart className="w-3.5 h-3.5" />
                    {post.likes > 0 ? post.likes : "0"} likes
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* ── About tab ── */}
        {activeTab === "about" && (
          <div className="max-w-xl space-y-6">
            {(portfolioConfig?.bio || userSettings.bio) && (
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">Bio</p>
                <p className="text-white/70 leading-relaxed">{portfolioConfig?.bio || userSettings.bio}</p>
              </div>
            )}

            {/* Skills */}
            {userSettings.skills && userSettings.skills.length > 0 && (
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {userSettings.skills.map((skill) => (
                    <span key={skill} className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Projects", value: projects.length },
                { label: "Followers", value: followerCount ?? "—" },
                { label: "Following", value: followingCount ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
                  <div className="text-2xl font-extrabold text-white mb-1">{value}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</div>
                </div>
              ))}
            </div>

            {portfolioConfig?.links && portfolioConfig.links.some((l: any) => l.url) && (
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">Links</p>
                <div className="flex flex-col gap-3">
                  {portfolioConfig.links.map((link: any, index: number) => {
                    if (!link.url) return null;
                    return (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors group"
                      >
                        {link.platform === "github" && <Github className="w-4 h-4 flex-shrink-0" />}
                        {link.platform === "twitter" && <Twitter className="w-4 h-4 flex-shrink-0" />}
                        {link.platform === "linkedin" && <Linkedin className="w-4 h-4 flex-shrink-0" />}
                        <span className="truncate">{link.url}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-40 group-hover:opacity-100 ml-auto" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {userSettings.links && (
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">External Links</p>
                <div className="flex flex-col gap-3">
                  {userSettings.links.github && (
                    <a href={userSettings.links.github} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors">
                      <Github className="w-4 h-4" /> {userSettings.links.github}
                    </a>
                  )}
                  {userSettings.links.twitter && (
                    <a href={userSettings.links.twitter} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors">
                      <Twitter className="w-4 h-4" /> {userSettings.links.twitter}
                    </a>
                  )}
                  {userSettings.links.website && (
                    <a href={userSettings.links.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors">
                      <Globe className="w-4 h-4" /> {userSettings.links.website}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Hire Me / Contact card */}
            {!isOwner && (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-400/70 mb-2">Available for Work</p>
                <h3 className="text-lg font-bold text-white mb-2">
                  Interested in working with {userSettings.fullName || userSettings.username}?
                </h3>
                <p className="text-sm text-white/50 mb-5 leading-relaxed">
                  Reach out via their social links or send them a message on DevOS.
                </p>
                <a
                  href={`mailto:?subject=Hiring%20inquiry%20for%20%40${userSettings.username}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all active:scale-95"
                >
                  Get in Touch
                </a>
              </div>
            )}

            {!portfolioConfig?.bio && !userSettings.bio && !portfolioConfig?.links?.some((l: any) => l.url) && !userSettings.links && isOwner && (
              <div className="py-16 text-center rounded-2xl border border-dashed border-white/10">
                <UserIcon className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">No about info yet</p>
                <Link to="/settings" className="inline-block mt-4 text-xs text-blue-400 hover:text-blue-300 transition-colors font-semibold">
                  Add your bio and links in Settings
                </Link>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Activity Graph */}
      {uid && (
        <div className="w-full px-4 sm:px-6 md:px-8 pb-10">
          <ActivityGraph userId={uid} />
        </div>
      )}

      {/* Footer */}
      <footer className="relative w-full px-6 md:px-8 py-20 border-t border-white/5 text-center">
        <div className="flex flex-col items-center gap-6">
          <Link to="/" className="group inline-flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-500 transition-all duration-500">
              <Zap className="w-5 h-5 text-white/20 group-hover:text-white group-hover:fill-white transition-all" />
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-white/20 group-hover:text-white transition-colors">Built with DevOS</span>
          </Link>
          <div className="h-4 w-[1px] bg-white/5" />
          <p className="text-[10px] text-white/10 font-mono uppercase tracking-[0.2em]">
            devos.zone.id/@{username}
          </p>
        </div>
      </footer>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
