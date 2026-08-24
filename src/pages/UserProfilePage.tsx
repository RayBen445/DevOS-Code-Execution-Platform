import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserSettings, FeedPost, Project } from "../types";
import { resolveAvatar } from "../lib/avatars";
import { buildPortfolioUrl } from "../lib/brand";
import Navbar from "../components/Navbar";
import { Calendar, Link as LinkIcon, MapPin, Grid, MessageSquare, Copy } from "lucide-react";
import { toast } from "sonner";
import { FeedPostShareCard, ProjectShareCard } from "../components/ShareAsImageCard";
import { formatRelativeTime } from "../lib/utils";

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [userProfile, setUserProfile] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "projects">("posts");

  useEffect(() => {
    if (!username) return;

    const fetchUser = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "user_settings"), where("username", "==", username.toLowerCase()), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data() as UserSettings;
          setUserProfile(data);
          
          // Fetch projects
          const projQ = query(collection(db, "projects"), where("ownerUsername", "==", username.toLowerCase()), where("isPublic", "==", true), limit(30));
          const projSnap = await getDocs(projQ);
          const filteredProjs = projSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as Project))
            .filter(p => p.systemType !== "portfolio")
            .slice(0, 10);
          setProjects(filteredProjs);

          // Fetch posts
          const uid = snap.docs[0].id;
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
    <div className="min-h-screen bg-bg-base pb-20">
      <Navbar />

      <main className="max-w-3xl mx-auto border-x border-border-base min-h-screen relative top-16">
        {/* Banner */}
        <div className="w-full h-48 bg-white/5 relative">
          {userProfile.bannerUrl && (
            <img src={userProfile.bannerUrl} alt="banner" className="w-full h-full object-cover" />
          )}
        </div>

        {/* Profile Info */}
        <div className="px-6 relative pb-6 border-b border-border-base">
          <div className="absolute -top-16 flex justify-between items-end w-[calc(100%-48px)]">
            <div className="w-32 h-32 rounded-full border-4 border-bg-base overflow-hidden bg-bg-base">
              <img src={resolveAvatar(userProfile.avatarUrl || userProfile.avatar)} alt="avatar" className="w-full h-full object-cover" />
            </div>
                        <button
              onClick={() => {
                navigator.clipboard.writeText(buildPortfolioUrl(username!));
                toast.success("Portfolio link copied!");
              }}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium text-sm flex items-center gap-2 border border-white/10 transition-all active:scale-95"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </button>
          </div>

          <div className="pt-20">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {userProfile.fullName || userProfile.displayName || username}
            </h1>
            <p className="text-white/50 text-sm">@{username}</p>

            {userProfile.bio && (
              <p className="text-white/90 mt-4 whitespace-pre-wrap">{userProfile.bio}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 mt-4 text-white/40 text-sm">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Joined DevOS</span>
              </div>
              {userProfile.links?.website && (
                <a href={userProfile.links.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-400 hover:underline">
                  <LinkIcon className="w-4 h-4" />
                  {userProfile.links.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-base">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 py-4 text-sm font-bold transition-all relative ${activeTab === "posts" ? "text-white" : "text-white/40 hover:bg-white/5"}`}
          >
            Posts
            {activeTab === "posts" && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-blue-500 rounded-t-full" />}
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`flex-1 py-4 text-sm font-bold transition-all relative ${activeTab === "projects" ? "text-white" : "text-white/40 hover:bg-white/5"}`}
          >
            Public Projects
            {activeTab === "projects" && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-blue-500 rounded-t-full" />}
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === "posts" && (
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="text-center py-12 text-white/40">No posts yet.</div>
              ) : (
                posts.map(post => (
                  <div key={post.id} className="p-4 rounded-2xl border border-border-base bg-white/[0.02]">
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
                  <Link key={proj.id} to={`/project/${proj.id}`} className="block p-4 rounded-2xl border border-border-base bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                    <h3 className="text-lg font-bold text-white mb-2">{proj.name}</h3>
                    <p className="text-sm text-white/60 line-clamp-2">{proj.description}</p>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
