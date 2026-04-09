import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { Project, UserSettings } from "../types";
import { Globe, Github, ExternalLink, Zap, AlertCircle, BadgeCheck, ArrowUpRight } from "lucide-react";
import { resolveAvatar } from "../lib/avatars";
import { useSEO } from "../hooks/useSEO";
import { cn } from "../lib/utils";
import ActivityGraph from "../components/ActivityGraph";

interface Props {
  username: string;
}

export default function SubdomainPortfolio({ username }: Props) {
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSEO({
    title: userSettings ? `${userSettings.displayName || username} — DevOS Portfolio` : `${username} — DevOS`,
    description: userSettings?.bio || `${username}'s portfolio on DevOS`,
    ogImage: userSettings?.avatarUrl,
  });

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    const fetchData = async () => {
      try {
        // Fetch user
        const usersRef = collection(db, "users");
        const userQ = query(usersRef, where("username", "==", username), limit(1));
        const userSnap = await getDocs(userQ);
        if (userSnap.empty) {
          setError("User not found");
          setLoading(false);
          return;
        }
        const uid = userSnap.docs[0].id;
        setUid(uid);
        const userData = userSnap.docs[0].data();

        // Fetch settings doc keyed by uid (user_settings/{uid})
        const settingsSnap = await getDoc(doc(db, "user_settings", uid));
        if (settingsSnap.exists()) {
          const s = settingsSnap.data();
          setUserSettings({
            ...s,
            // Normalise avatar: prefer avatarUrl, fall back to avatar or users doc
            avatarUrl: s.avatarUrl || s.avatar || userData.avatarUrl || undefined,
          } as UserSettings);
        } else {
          // Fall back to users doc fields
          setUserSettings({
            username: userData.username,
            displayName: userData.displayName || userData.username,
            avatarUrl: userData.avatarUrl || undefined,
            bio: userData.bio,
          } as UserSettings);
        }

        // Fetch public projects
        const projectsRef = collection(db, "projects");
        const projectsQ = query(projectsRef, where("ownerId", "==", uid), where("isPublic", "==", true), orderBy("updatedAt", "desc"), limit(20));
        const projectsSnap = await getDocs(projectsQ);
        setProjects(projectsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
      } catch (e) {
        setError("Failed to load portfolio");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Zap className="w-8 h-8 text-blue-500 animate-pulse" />
      </div>
    );
  }

  if (error || !userSettings) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white/60 gap-3">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-lg">{error || "Portfolio not found"}</p>
        <a href="https://devos.name.ng" className="text-blue-400 hover:underline text-sm">Go to DevOS</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Hero */}
      <div className="max-w-3xl mx-auto px-4 pt-16 pb-10">
        <div className="flex items-center gap-5">
          <img
            src={resolveAvatar(userSettings.avatarUrl, userSettings.displayName || userSettings.username)}
            alt={userSettings.displayName || username}
            className="w-20 h-20 rounded-full ring-2 ring-white/10 object-cover"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{userSettings.displayName || username}</h1>
              {(userSettings as any).isVerified && <BadgeCheck className="w-5 h-5 text-blue-400" />}
            </div>
            <p className="text-white/50 text-sm">@{username}</p>
            {userSettings.bio && <p className="text-white/70 mt-2 text-sm">{userSettings.bio}</p>}
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-3 mt-5">
          {(userSettings.links?.website || (userSettings as any).websiteUrl) && (
            <a href={userSettings.links?.website || (userSettings as any).websiteUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
              <Globe className="w-4 h-4" /> Website
            </a>
          )}
          {(userSettings.links?.github || (userSettings as any).githubUrl) && (
            <a href={userSettings.links?.github || (userSettings as any).githubUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
              <Github className="w-4 h-4" /> GitHub
            </a>
          )}
        </div>
      </div>

      {/* Projects */}
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <h2 className="text-lg font-semibold mb-4 text-white/80">Projects</h2>
        {projects.length === 0 ? (
          <p className="text-white/40 text-sm">No public projects yet.</p>
        ) : (
          <div className="grid gap-3">
            {projects.map(project => (
              <a
                key={project.id}
                href={`https://devos.name.ng/project/${project.id}`}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/8 border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white group-hover:text-blue-300 transition-colors truncate">
                    {project.title || project.name}
                  </p>
                  {project.description && (
                    <p className="text-white/40 text-sm mt-0.5 truncate">{project.description}</p>
                  )}
                </div>
                <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors ml-3 shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Activity Graph */}
      {uid && (
        <div className="px-6 pb-8">
          <ActivityGraph userId={uid} />
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-white/5 py-6 text-center">
        <a href="https://devos.name.ng" className="text-white/20 text-xs hover:text-white/40 transition-colors">
          Powered by DevOS
        </a>
      </div>
    </div>
  );
}
