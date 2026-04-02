import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { db, auth } from "../lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
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
          setError("This project is private");
          setLoading(false);
          return;
        }
        setProject(data);

        const filesSnap = await getDocs(collection(db, "projects", projectId, "files"));
        const fileList = filesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FileData));
        setFiles(fileList);
        if (fileList.length > 0) setActiveFile(fileList[0]);
      } catch (e) {
        setError("Failed to load project");
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

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
                to={project.ownerUsername ? `/u/${project.ownerUsername}` : "#"}
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

        {/* Two-column: file list + file viewer */}
        {files.length > 0 && (
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

        {files.length === 0 && (
          <div className="py-16 text-center rounded-2xl border border-dashed border-white/10">
            <FileIcon className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No files in this project</p>
          </div>
        )}
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
