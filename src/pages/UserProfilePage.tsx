import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { UserSettings, FeedPost, Project } from "../types";
import { resolveAvatar } from "../lib/avatars";
import { buildPortfolioUrl } from "../lib/brand";
import Navbar from "../components/Navbar";
import { Calendar, Link as LinkIcon, MapPin, Grid, MessageSquare, Copy, Edit2, Share2, Briefcase, Camera, Github, Twitter, Linkedin, CheckCircle2, ChevronRight, Activity, Image as ImageIcon, ExternalLink, Plus, FolderCode, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime } from "../lib/utils";
import FollowButton from "../components/FollowButton";
import { getFollowerCount } from "../lib/followService";
import { cn } from "../lib/utils";

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [user] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"profile" | "projects" | "posts" | "activity">("profile");

  const isOwnProfile = user && userProfile && user.uid === userProfile.uid;

  useEffect(() => {
    if (!username) return;

    const fetchUser = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "user_settings"), where("username", "==", username.toLowerCase()), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data() as UserSettings & { uid: string };
          data.uid = snap.docs[0].id;
          setUserProfile(data);
          
          const uid = snap.docs[0].id;
          
          getFollowerCount(uid).then(setFollowerCount).catch(console.error);
          
          const projQ = query(collection(db, "projects"), where("ownerUsername", "==", username.toLowerCase()), where("isPublic", "==", true), limit(30));
          const projSnap = await getDocs(projQ);
          const filteredProjs = projSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as Project))
            .filter(p => p.systemType !== "portfolio")
            .slice(0, 10);
          setProjects(filteredProjs);

          const postQ = query(collection(db, "feed_posts"), where("userId", "==", uid), orderBy("createdAt", "desc"), limit(20));
          const postSnap = await getDocs(postQ);
          setPosts(postSnap.docs.map(d => ({ id: d.id, ...d.data() } as FeedPost)));
        } else {
          setUserProfile(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-bg-base">
        <Navbar />
        <div className="max-w-2xl mx-auto pt-32 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">User Not Found</h1>
          <p className="text-white/60 mb-8">The user @{username} does not exist.</p>
          <Link to="/" className="text-blue-500 hover:underline">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base pb-24">
      <Navbar />

      <main className="max-w-3xl mx-auto border-x border-border-base min-h-screen relative pt-16">
        {/* Header / Banner */}
        <div className="w-full h-48 sm:h-64 bg-zinc-900 relative">
          {userProfile.bannerUrl ? (
            <img src={userProfile.bannerUrl} alt="banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-900/40 to-purple-900/40" />
          )}
          {isOwnProfile && (
            <button className="absolute top-4 right-4 px-3 py-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-2 text-xs font-semibold text-white transition-colors">
              <ImageIcon className="w-3.5 h-3.5" />
              Change Banner
            </button>
          )}
        </div>

        {/* Profile Info Card */}
        <div className="px-6 relative pb-6 border-b border-border-base">
          <div className="flex justify-between items-start -mt-16 sm:-mt-20 relative z-10">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl border-[6px] border-bg-base overflow-hidden bg-zinc-800 shadow-xl">
                <img src={resolveAvatar(userProfile.avatarUrl || userProfile.avatar)} alt="avatar" className="w-full h-full object-cover" />
              </div>
              {isOwnProfile && (
                <button className="absolute bottom-1 right-1 w-10 h-10 bg-zinc-800 hover:bg-zinc-700 border-4 border-bg-base rounded-2xl flex items-center justify-center text-white transition-colors shadow-lg">
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="pt-20 flex items-center gap-2">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(buildPortfolioUrl(username!));
                  toast.success("Portfolio link copied!");
                }}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              {userProfile.fullName || userProfile.displayName || username}
              <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" />
            </h1>
            <p className="text-white/50 text-sm sm:text-base mt-0.5">@{username}</p>

            <p className="text-white/90 mt-4 text-sm sm:text-base">{userProfile.bio || "Just a young Developer"}</p>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <div className="px-2.5 py-1 rounded-md bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                DevOS Pro
              </div>
              <div className="px-2.5 py-1 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-bold flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5" />
                Creator
              </div>
              <div className="px-2.5 py-1 rounded-md bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                Open to Work
              </div>
            </div>

            {/* Meta info */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4 mt-5 text-white/40 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{userProfile.location || "Earth"}</span>
              </div>
              {userProfile.links?.website && (
                <a href={userProfile.links.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-400 hover:underline">
                  <LinkIcon className="w-4 h-4" />
                  {userProfile.links.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Joined {userProfile.createdAt ? new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Jun 2023'}</span>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-white/[0.03] border border-border-base rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2">
                  <FolderCode className="w-4 h-4" />
                </div>
                <div className="text-xl font-bold text-white">{projects.length}</div>
                <div className="text-[11px] text-white/40 font-medium">Projects</div>
              </div>
              <div className="bg-white/[0.03] border border-border-base rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
                  <Grid className="w-4 h-4" />
                </div>
                <div className="text-xl font-bold text-white">{followerCount}</div>
                <div className="text-[11px] text-white/40 font-medium">Followers</div>
              </div>
              <div className="bg-white/[0.03] border border-border-base rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="text-xl font-bold text-white">12.4K</div>
                <div className="text-[11px] text-white/40 font-medium">Views</div>
              </div>
            </div>

            {/* Big Action Button */}
            <div className="mt-6">
              {isOwnProfile ? (
                <button className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2">
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              ) : (
                <FollowButton targetUid={userProfile.uid} targetUsername={username!} followerUsername={user?.displayName || ""} className="w-full py-3 rounded-xl justify-center text-base" />
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-base overflow-x-auto no-scrollbar px-2 sm:px-6">
          {(["profile", "projects", "posts", "activity"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-4 text-sm font-bold transition-all relative whitespace-nowrap",
                activeTab === tab ? "text-white" : "text-white/40 hover:text-white/70"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-t-full shadow-[0_-2px_10px_rgba(59,130,246,0.5)]" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 pb-20">
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="bg-white/[0.02] border border-border-base rounded-3xl p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Grid className="w-4 h-4 text-blue-400" />
                    About
                  </h3>
                  {isOwnProfile && <button className="text-blue-400 hover:text-blue-300"><Edit2 className="w-4 h-4" /></button>}
                </div>
                <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                  <p className="text-sm text-white/70 leading-relaxed">{userProfile.bio || "No bio added yet."}</p>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-border-base rounded-3xl p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FolderCode className="w-4 h-4 text-purple-400" />
                    Skills
                  </h3>
                  {isOwnProfile && <button className="text-blue-400 hover:text-blue-300"><Edit2 className="w-4 h-4" /></button>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {userProfile.skills?.length ? userProfile.skills.map(skill => (
                    <div key={skill} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-white/80">
                      {skill}
                    </div>
                  )) : (
                    <>
                      <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-white/80">React</div>
                      <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-white/80">TypeScript</div>
                      <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-white/80">JavaScript</div>
                    </>
                  )}
                  {isOwnProfile && (
                    <button className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs font-medium text-blue-400 flex items-center gap-1 hover:bg-blue-500/20 transition-colors">
                      <Plus className="w-3 h-3" /> Add Skill
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white/[0.02] border border-border-base rounded-3xl p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-emerald-400" />
                    Social Links
                  </h3>
                  {isOwnProfile && <button className="text-blue-400 hover:text-blue-300"><Edit2 className="w-4 h-4" /></button>}
                </div>
                <div className="space-y-3">
                  <a href={userProfile.links?.github || "#"} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group">
                    <div className="flex items-center gap-3">
                      <Github className="w-5 h-5 text-white/70" />
                      <span className="text-sm text-blue-400 font-medium">github.com/{userProfile.links?.github ? new URL(userProfile.links.github).pathname.replace('/','') : username}</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-white/50" />
                  </a>
                  <a href={userProfile.links?.twitter || "#"} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group">
                    <div className="flex items-center gap-3">
                      <Twitter className="w-5 h-5 text-white/70" />
                      <span className="text-sm text-blue-400 font-medium">twitter.com/{userProfile.links?.twitter ? new URL(userProfile.links.twitter).pathname.replace('/','') : username}</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-white/50" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === "posts" && (
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="text-center py-12 text-white/40">No posts yet.</div>
              ) : (
                posts.map(post => (
                  <div key={post.id} className="p-4 rounded-3xl border border-border-base bg-white/[0.02]">
                    <div className="flex items-center gap-3 mb-3">
                      <img src={resolveAvatar(post.avatarUrl)} className="w-10 h-10 rounded-full" />
                      <div>
                        <div className="text-sm font-bold text-white">{post.displayName || post.username}</div>
                        <div className="text-[11px] text-white/40">{post.createdAt ? formatRelativeTime(post.createdAt) : "just now"}</div>
                      </div>
                    </div>
                    <div className="text-white/90 text-sm whitespace-pre-wrap">{post.content}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "projects" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.length === 0 ? (
                <div className="col-span-full text-center py-12 text-white/40">No public projects.</div>
              ) : (
                projects.map(proj => (
                  <Link key={proj.id} to={`/project/${proj.id}`} className="block p-5 rounded-3xl border border-border-base bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                    <h3 className="text-lg font-bold text-white mb-2">{proj.name}</h3>
                    <p className="text-sm text-white/60 line-clamp-2">{proj.description}</p>
                  </Link>
                ))
              )}
            </div>
          )}

          {activeTab === "activity" && (
            <div className="text-center py-12 text-white/40 bg-white/[0.02] border border-border-base rounded-3xl">
              Activity timeline coming soon.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
