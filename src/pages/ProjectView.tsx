import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { db, auth } from "../lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { motion } from "framer-motion";
import {
  GitFork,
  Globe,
  Lock,
  Eye,
  Calendar,
  AlertCircle,
  Loader2,
  ArrowLeft,
  File as FileIcon,
  ExternalLink,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
  Activity,
  Rocket,
  GitCommit,
  Tag,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Project, FileData } from "../types";
import { cn, formatRelativeTime } from "../lib/utils";
import { resolveAvatar } from "../lib/avatars";
import { forkProject } from "../lib/projectService";
import { useSEO } from "../hooks/useSEO";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import PreviewPanel from "../components/PreviewPanel";
import FeedbackModal from "../components/FeedbackModal";

export default function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isForking, setIsForking] = useState(false);
  const [activeFile, setActiveFile] = useState<FileData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"files" | "activity">("files");

  // Activity timeline events (derived from files + project metadata)
  interface ActivityEvent {
    id: string;
    type: "file_updated" | "created" | "deployed" | "forked";
    label: string;
    detail?: string;
    ts: any;
  }
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  useSEO({
    title: project ? `${project.name} — DevOS` : "Project — DevOS",
    description: project?.description,
  });

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const projectSnap = await getDoc(doc(db, "projects", projectId));
        if (!projectSnap.exists()) {
          setError("Project not found");
          setLoading(false);
          return;
        }
        const data = { id: projectSnap.id, ...projectSnap.data() } as Project;
        if (!data.isPublic) {
          // Allow access to the owner
          const isOwner = user && user.uid === data.ownerId;
          // Allow org members to access private org projects
          let isOrgMember = false;
          if (!isOwner && data.ownerType === "organization" && data.ownerOrgId && user) {
            const memberSnap = await getDoc(
              doc(db, "organizations", data.ownerOrgId, "members", user.uid)
            );
            isOrgMember = memberSnap.exists();
          }
          if (!isOwner && !isOrgMember) {
            setError("This project is private");
            setLoading(false);
            return;
          }
        }
        setProject(data);

        const filesSnap = await getDocs(collection(db, "projects", projectId, "files"));
        const fileList = filesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FileData));
        setFiles(fileList);
        if (fileList.length > 0) setActiveFile(fileList[0]);

        // Build activity timeline from files + project metadata
        const events: ActivityEvent[] = [];
        if (data.createdAt) {
          events.push({ id: "created", type: "created", label: "Project created", ts: data.createdAt });
        }
        if (data.lastDeployedAt) {
          events.push({ id: "deployed", type: "deployed", label: "Deployed", detail: data.deployUrl, ts: data.lastDeployedAt });
        }
        if (data.forkedFrom) {
          events.push({ id: "forked", type: "forked", label: `Forked from @${data.forkedFromOwner ?? "unknown"}`, ts: data.createdAt });
        }
        // Add recent file-update events (deduplicated by filename)
        const seen = new Set<string>();
        for (const f of fileList.sort((a, b) => {
          const aT = (a.updatedAt as any)?.seconds ?? 0;
          const bT = (b.updatedAt as any)?.seconds ?? 0;
          return bT - aT;
        }).slice(0, 6)) {
          if (!seen.has(f.name)) {
            seen.add(f.name);
            events.push({
              id: `file_${f.id}`,
              type: "file_updated",
              label: `Updated ${f.name}`,
              ts: f.updatedAt,
            });
          }
        }
        events.sort((a, b) => (b.ts?.seconds ?? 0) - (a.ts?.seconds ?? 0));
        setActivityEvents(events);
      } catch (e) {
        setError("Failed to load project");
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId, user]);

  const handleFork = async () => {
    if (!user || !project) {
      toast.error("Please sign in to fork projects");
      return;
    }
    if (isForking) return;
    setIsForking(true);
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const username = userSnap.exists() ? (userSnap.data().username ?? "") : "";
      const newId = await forkProject(project, user.uid, username);
      toast.success(`Forked "${project.name}"! Opening your copy…`);
      navigate(`/projects`);
    } catch {
      toast.error("Failed to fork project. Please try again.");
    } finally {
      setIsForking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-white/20" />
        </div>
        <h1 className="text-3xl font-bold">{error ?? "Project not found"}</h1>
        <Link to="/" className="px-6 py-3 bg-white text-black rounded-2xl font-bold hover:bg-white/90 transition-all">
          Back to DevOS
        </Link>
      </div>
    );
  }

  const liveUrl = project.liveUrl || project.deployUrl;
  const isOwner = !!(user && user.uid === project.ownerId);

  // ─── CLIENT VIEW (non-owner) ──────────────────────────────────────────────
  if (!isOwner) {
    // Derive tech stack from file extensions
    const extSet = new Set(
      files.map(f => {
        const parts = (f.name || "").split(".");
        return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
      }).filter(Boolean)
    );
    const techStack = Array.from(extSet).slice(0, 8);

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
        <Navbar />
        <main className="flex-1 pb-20 md:pb-0">
          {/* Hero */}
          <div className="relative overflow-hidden border-b border-white/5">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-blue-600/8 blur-[100px] rounded-full" />
              <div className="absolute top-0 right-1/4 w-[400px] h-[200px] bg-purple-600/8 blur-[100px] rounded-full" />
            </div>
            <div className="relative max-w-4xl mx-auto px-6 py-16 md:py-24">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-8"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="flex flex-col md:flex-row md:items-start gap-8">
                {/* Project icon / initials */}
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600/30 to-purple-600/30 border border-white/10 flex items-center justify-center flex-shrink-0 text-3xl font-black text-white/60 shadow-xl">
                  {project.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {project.isPublic
                      ? <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">Public</span>
                      : <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">Private</span>
                    }
                    {project.forkedFrom && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                        <GitFork className="w-3 h-3" />
                        Forked
                      </span>
                    )}
                  </div>

                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">{project.name}</h1>

                  {project.description && (
                    <p className="text-white/50 text-lg leading-relaxed mb-5 max-w-2xl">{project.description}</p>
                  )}

                  {/* Tech stack chips */}
                  {techStack.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {techStack.map(ext => (
                        <span key={ext} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white/50 font-semibold uppercase">
                          {ext}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="flex flex-wrap items-center gap-5 text-sm text-white/40 mb-7">
                    <Link
                      to={project.ownerUsername ? `/@${project.ownerUsername}` : "#"}
                      className="flex items-center gap-1.5 hover:text-white transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      @{project.ownerUsername ?? "unknown"}
                    </Link>
                    {project.views !== undefined && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {project.views} views
                      </span>
                    )}
                    {project.forksCount > 0 && (
                      <span className="flex items-center gap-1">
                        <GitFork className="w-3.5 h-3.5" />
                        {project.forksCount} forks
                      </span>
                    )}
                    {project.updatedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Updated {formatRelativeTime(project.updatedAt)}
                      </span>
                    )}
                  </div>

                  {/* CTA buttons */}
                  <div className="flex flex-wrap gap-3">
                    {liveUrl && (
                      <a
                        href={liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl font-bold hover:bg-white/90 transition-all active:scale-95 shadow-lg shadow-white/10"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Live
                      </a>
                    )}
                    <button
                      onClick={handleFork}
                      disabled={isForking}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-2xl font-bold transition-all active:scale-95"
                    >
                      {isForking ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitFork className="w-4 h-4" />}
                      Fork Project
                    </button>
                    <button
                      onClick={() => setIsFeedbackOpen(true)}
                      className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-2xl font-semibold transition-all"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Feedback
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview section */}
          <div className="max-w-4xl mx-auto px-6 py-10">
            {files.length > 0 && (
              <div className="mb-10">
                <button
                  onClick={() => setPreviewOpen((v) => !v)}
                  className="flex items-center gap-2 mb-4 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {previewOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  {previewOpen ? "Hide" : "Show"} live preview
                </button>

                {previewOpen && (
                  <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl h-[460px]">
                    <PreviewPanel projectId={project.id} files={files} entryFile={project.entryFile} />
                  </div>
                )}
              </div>
            )}

            {/* Activity */}
            {activityEvents.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Activity
                </h2>
                <div className="space-y-0">
                  {activityEvents.slice(0, 5).map((ev, i) => {
                    const Icon = ev.type === "deployed" ? Rocket
                      : ev.type === "forked" ? GitFork
                      : ev.type === "created" ? Tag
                      : GitCommit;
                    const iconColor = ev.type === "deployed" ? "text-green-400"
                      : ev.type === "forked" ? "text-purple-400"
                      : ev.type === "created" ? "text-blue-400"
                      : "text-white/40";
                    return (
                      <div key={ev.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={cn("w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-1", iconColor)}>
                            <Icon className="w-4 h-4" />
                          </div>
                          {i < Math.min(activityEvents.length, 5) - 1 && (
                            <div className="w-px flex-1 bg-white/5 mt-1 mb-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-5">
                          <p className="text-sm text-white font-medium">{ev.label}</p>
                          <p className="text-xs text-white/30 mt-1">
                            {ev.ts?.seconds ? formatRelativeTime({ seconds: ev.ts.seconds, nanoseconds: 0 } as any) : "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
        <Footer />
        <FeedbackModal open={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
        <MobileBottomNav />
      </div>
    );
  }

  // ─── DEVELOPER VIEW (project owner) ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      {/* Developer mode banner */}
      <div className="bg-blue-600/10 border-b border-blue-500/20 px-4 py-2 flex items-center justify-between gap-4">
        <span className="text-xs font-semibold text-blue-400 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" />
          Developer View — you own this project
        </span>
        <Link
          to="/projects"
          className="text-xs text-blue-400/70 hover:text-blue-300 transition-colors font-medium"
        >
          Open in IDE
        </Link>
      </div>

      <main className="flex-1 pb-16 md:pb-0 max-w-7xl mx-auto w-full px-4 md:px-6 py-8 md:py-12">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Project header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              {project.isPublic ? (
                <Globe className="w-4 h-4 text-green-400 flex-shrink-0" />
              ) : (
                <Lock className="w-4 h-4 text-white/30 flex-shrink-0" />
              )}
              <h1 className="text-2xl md:text-3xl font-extrabold text-white truncate">
                {project.name}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/40">
              <Link
                to={project.ownerUsername ? `/@${project.ownerUsername}` : "#"}
                className="flex items-center gap-1.5 hover:text-white transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>@{project.ownerUsername ?? "unknown"}</span>
              </Link>
              {project.forkedFrom && (
                <span className="flex items-center gap-1 text-xs text-white/30">
                  <GitFork className="w-3 h-3" />
                  Forked from @{project.forkedFromOwner ?? "unknown"}
                </span>
              )}
              {project.views !== undefined && (
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {project.views} views
                </span>
              )}
              {project.forksCount > 0 && (
                <span className="flex items-center gap-1">
                  <GitFork className="w-3.5 h-3.5" />
                  {project.forksCount} forks
                </span>
              )}
              {project.updatedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatRelativeTime(project.updatedAt)}
                </span>
              )}
            </div>

            {project.description && (
              <p className="text-sm text-white/50 mt-3 max-w-2xl leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {liveUrl && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:border-white/20 text-white rounded-xl text-sm font-semibold transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Live
              </a>
            )}
            <button
              onClick={() => setIsFeedbackOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-xl text-sm font-semibold transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              Feedback
            </button>
            <button
              onClick={handleFork}
              disabled={isForking}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all active:scale-95"
            >
              {isForking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <GitFork className="w-4 h-4" />
              )}
              Fork
            </button>
          </div>
        </div>

        {/* Toggle preview button */}
        {files.length > 0 && (
          <button
            onClick={() => setPreviewOpen((v) => !v)}
            className="flex items-center gap-2 mb-4 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            {previewOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {previewOpen ? "Hide" : "Show"} live preview
          </button>
        )}

        {/* Live preview */}
        {previewOpen && files.length > 0 && (
          <div className="mb-8 rounded-2xl overflow-hidden border border-white/10 h-[420px] md:h-[520px]">
            <PreviewPanel projectId={project.id} files={files} entryFile={project.entryFile} />
          </div>
        )}

        {/* Tabs: Files / Activity */}
        <div className="flex gap-1 mb-4 border-b border-white/10">
          {(["files", "activity"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors",
                activeTab === tab
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-white/40 hover:text-white/70"
              )}
            >
              {tab === "files" ? `Files (${files.length})` : "Activity"}
            </button>
          ))}
        </div>

        {/* Activity Timeline */}
        {activeTab === "activity" && (
          <div className="relative">
            {activityEvents.length === 0 ? (
              <p className="text-center text-white/30 py-10 text-sm">No activity yet.</p>
            ) : (
              <div className="space-y-0">
                {activityEvents.map((ev, i) => {
                  const Icon = ev.type === "deployed" ? Rocket
                    : ev.type === "forked" ? GitFork
                    : ev.type === "created" ? Tag
                    : GitCommit;
                  const iconColor = ev.type === "deployed" ? "text-green-400"
                    : ev.type === "forked" ? "text-purple-400"
                    : ev.type === "created" ? "text-blue-400"
                    : "text-white/40";
                  return (
                    <div key={ev.id} className="flex gap-4 group">
                      {/* Timeline line */}
                      <div className="flex flex-col items-center">
                        <div className={cn("w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-1", iconColor)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {i < activityEvents.length - 1 && (
                          <div className="w-px flex-1 bg-white/5 mt-1 mb-1" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex-1 pb-5">
                        <p className="text-sm text-white font-medium">{ev.label}</p>
                        {ev.detail && (
                          <p className="text-xs text-white/40 mt-0.5 truncate max-w-sm">{ev.detail}</p>
                        )}
                        <p className="text-xs text-white/30 mt-1">
                          {ev.ts?.seconds ? formatRelativeTime({ seconds: ev.ts.seconds, nanoseconds: 0 } as any) : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Two-column: file list + file viewer */}
        {activeTab === "files" && files.length > 0 && (
          <div className="grid md:grid-cols-[220px_1fr] gap-4">
            {/* File list */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] overflow-hidden">
              <p className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white/30 border-b border-white/5">
                Files ({files.length})
              </p>
              <ul className="py-2 max-h-[60vh] overflow-y-auto">
                {files.map((file) => (
                  <li key={file.id}>
                    <button
                      onClick={() => setActiveFile(file)}
                      className={cn(
                        "w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm transition-colors",
                        activeFile?.id === file.id
                          ? "bg-blue-600/15 text-blue-300"
                          : "text-white/50 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <FileIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{file.path || file.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* File content (read-only) */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] overflow-hidden flex flex-col">
              {activeFile ? (
                <>
                  <div className="px-4 py-3 text-xs text-white/40 border-b border-white/5 font-mono flex items-center gap-2">
                    <FileIcon className="w-3.5 h-3.5" />
                    {activeFile.path || activeFile.name}
                    <span className="ml-auto text-white/20">{activeFile.language}</span>
                  </div>
                  <pre className="flex-1 overflow-auto p-5 text-sm font-mono text-white/70 leading-relaxed whitespace-pre-wrap max-h-[60vh]">
                    {activeFile.content}
                  </pre>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
                  Select a file to view
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "files" && files.length === 0 && (
          <div className="py-16 text-center rounded-2xl border border-dashed border-white/10">
            <FileIcon className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No files in this project</p>
          </div>
        )}
      </main>

      <Footer />
      <FeedbackModal open={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
      <MobileBottomNav />
    </div>
  );
}
