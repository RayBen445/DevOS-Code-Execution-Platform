import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { getOrgBySlug } from "../lib/orgService";
import { Organization, OrgMember, Project } from "../types";
import {
  Building2, Globe, Lock, Users, Zap, AlertCircle, Share2,
  Check, ArrowUpRight, BadgeCheck, ExternalLink,
} from "lucide-react";
import { resolveAvatar } from "../lib/avatars";
import { useSEO } from "../hooks/useSEO";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { buildDevosUrl, buildOrgProjectUrl, buildOrgUrl, buildPortfolioUrl, buildProjectUrl, PRODUCT_BRAND_NAME } from "../lib/brand";

interface Props {
  slug: string;
}

export default function SubdomainOrg({ slug }: Props) {
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const orgUrl = buildOrgUrl(slug);

  useSEO({
    title: org ? `${org.name} — ${PRODUCT_BRAND_NAME}` : `${slug} — ${PRODUCT_BRAND_NAME}`,
    description: org?.description || `${slug}'s organization on ${PRODUCT_BRAND_NAME}`,
    ogUrl: orgUrl,
    ogImage: org?.avatar,
  });

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      try {
        const orgData = await getOrgBySlug(slug);
        if (!orgData) { setError("Organization not found"); setLoading(false); return; }
        setOrg(orgData);

        // Load members
        try {
          const membersSnap = await getDocs(
            collection(db, "organizations", orgData.id, "members")
          );
          setMembers(membersSnap.docs.map(d => ({ id: d.id, ...d.data() } as OrgMember)));
        } catch { /* non-fatal */ }

        // Load public org projects
        try {
          const projectsRef = collection(db, "projects");
          const [ownerOrgProjectsSnap, legacyOrgProjectsSnap] = await Promise.all([
            getDocs(query(
              projectsRef,
              where("ownerOrgId", "==", orgData.id),
              where("isPublic", "==", true),
              limit(18)
            )),
            getDocs(query(
              projectsRef,
              where("orgId", "==", orgData.id),
              where("isPublic", "==", true),
              limit(18)
            )),
          ]);
          const projSnap = ownerOrgProjectsSnap.empty ? legacyOrgProjectsSnap : ownerOrgProjectsSnap;
          const list = projSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
          list.sort((a, b) => {
            const aT = (a.updatedAt as any)?.seconds ?? 0;
            const bT = (b.updatedAt as any)?.seconds ?? 0;
            return bT - aT;
          });
          setProjects(list);
        } catch { /* non-fatal */ }
      } catch {
        setError("Failed to load organization");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(orgUrl);
      setCopied(true);
      toast.success("Org link copied!");
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

  if (error || !org) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center text-white/60 gap-4 px-6 text-center">
        <div className="w-20 h-20 rounded-[24px] bg-white/5 border border-border-base flex items-center justify-center mb-2">
          <AlertCircle className="w-10 h-10 text-white/20" />
        </div>
        <h1 className="text-3xl font-bold text-white">{error || "Organization not found"}</h1>
        <p className="text-white/40 max-w-sm">This organization doesn't exist or may have been removed.</p>
        <a
          href={buildDevosUrl()}
          className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all"
        >
          Go to DevOS
        </a>
      </div>
    );
  }

  const avatarUrl = resolveAvatar(org.avatar);

  return (
    <div className="min-h-screen bg-base text-white selection:bg-blue-500/30">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[140px]" />
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-violet-600/4 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative max-w-4xl mx-auto px-6 pt-14 pb-10 max-h-[90vh] overflow-y-auto flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row items-start sm:items-end gap-6"
        >
          {/* Org avatar / icon */}
          <div className="w-24 h-24 rounded-[28px] ring-2 ring-white/10 overflow-hidden bg-gradient-to-br from-blue-600/30 to-violet-600/20 flex items-center justify-center shadow-2xl shadow-black/50 shrink-0">
            {org.avatar ? (
              <img src={avatarUrl} alt={org.name} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-10 h-10 text-blue-400" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-3xl font-black tracking-tight">{org.name}</h1>
              {org.isOfficial && <BadgeCheck className="w-6 h-6 text-blue-400 shrink-0" />}
              <span
                className={
                  org.isPublic
                    ? "flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20"
                    : "flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-white/5 text-white/30 border border-border-base"
                }
              >
                {org.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {org.isPublic ? "Public" : "Private"}
              </span>
            </div>
            <p className="text-white/40 text-sm font-mono mb-2">{orgUrl.replace(/^https?:\/\//, "")}</p>
            {org.description && (
              <p className="text-white/60 text-sm leading-relaxed max-w-lg">{org.description}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/5 border border-border-base text-xs font-bold text-white/50">
              <Users className="w-3.5 h-3.5" />
              {org.memberCount ?? members.length} member{(org.memberCount ?? members.length) !== 1 ? "s" : ""}
            </div>
            <button
              onClick={handleShare}
              title="Copy org URL"
              className="p-2.5 rounded-2xl bg-white/5 border border-border-base text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
            </button>
            <a
              href={buildDevosUrl(`org/${slug}`)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-blue-600/20"
            >
              View on DevOS
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </motion.div>
      </header>

      {/* Body */}
      <main className="max-w-4xl mx-auto px-6 pb-20 space-y-12">
        {/* Members */}
        {members.length > 0 && (
          <section>
            <h2 className="text-xl font-bold tracking-tight mb-5 flex items-center gap-3">
              Members
              <div className="h-px w-10 bg-blue-500/30" />
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {members.slice(0, 12).map((member, i) => (
                <motion.a
                  key={member.id}
                  href={buildPortfolioUrl(member.username)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.07] hover:border-white/[0.14] transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600/40 to-violet-600/30 flex items-center justify-center text-xs font-bold text-white/70 shrink-0">
                    {member.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors truncate">
                      {member.username}
                    </p>
                    <p className="text-[10px] text-white/30 capitalize">{member.role}</p>
                  </div>
                </motion.a>
              ))}
            </div>
            {members.length > 12 && (
              <p className="text-xs text-white/30 mt-3">+{members.length - 12} more members</p>
            )}
          </section>
        )}

        {/* Projects */}
        <section>
          <h2 className="text-xl font-bold tracking-tight mb-5 flex items-center gap-3">
            Projects
            <div className="h-px w-10 bg-blue-500/30" />
          </h2>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-border-base flex items-center justify-center">
                <ExternalLink className="w-7 h-7 text-white/15" />
              </div>
              <p className="text-white/40 font-medium">No public projects yet</p>
              <p className="text-white/20 text-sm">Projects published by this org will appear here.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {projects.map((project, i) => {
                const projectSlug = project.projectSlug || project.slug || "";
                const ownerUsername = project.ownerUsername || "";
                const isOrgProject = project.ownerType === "organization" || !!project.ownerOrgId;
                const projectUrl =
                  projectSlug && isOrgProject
                    ? buildOrgProjectUrl(slug, projectSlug)
                    : projectSlug && ownerUsername
                      ? buildProjectUrl(ownerUsername, projectSlug)
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
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors leading-snug">
                          {project.title || project.name}
                        </h3>
                        <ArrowUpRight className="w-4 h-4 text-white/25 group-hover:text-white/60 transition-colors shrink-0 mt-0.5" />
                      </div>
                      {project.description && (
                        <p className="text-white/40 text-sm leading-relaxed line-clamp-2 mb-3">
                          {project.description}
                        </p>
                      )}
                      {project.language && (
                        <span className="inline-flex items-center gap-1 text-xs text-white/25">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          {project.language}
                        </span>
                      )}
                    </div>
                  </motion.a>
                );
              })}
            </div>
          )}
        </section>
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
