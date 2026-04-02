import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { db, auth } from "../lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  Tag,
  User as UserIcon,
  File as FileIcon,
  AlertCircle,
  Loader2,
  Zap,
  CheckCircle,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Template } from "../types";
import { cn } from "../lib/utils";
import { incrementDownloads } from "../lib/templateService";
import { deductCredits } from "../lib/creditsService";
import { useSEO } from "../hooks/useSEO";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";

export default function TemplatePreviewPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [using, setUsing] = useState(false);
  const [activeFile, setActiveFile] = useState<Template["files"][0] | null>(null);

  useSEO({
    title: template ? `${template.name} — DevOS Templates` : "Template — DevOS",
    description: template?.description,
  });

  useEffect(() => {
    if (!templateId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "templates", templateId));
        if (!snap.exists()) {
          setError("Template not found");
          setLoading(false);
          return;
        }
        const t = { id: snap.id, ...snap.data() } as Template;
        if (!t.isApproved) {
          setError("This template is not yet approved");
          setLoading(false);
          return;
        }
        setTemplate(t);
        if (t.files.length > 0) setActiveFile(t.files[0]);
      } catch {
        setError("Failed to load template");
      } finally {
        setLoading(false);
      }
    })();
  }, [templateId]);

  const handleUseTemplate = async () => {
    if (!user || !template) {
      toast.error("Please sign in to use templates");
      return;
    }
    if (using) return;
    setUsing(true);
    try {
      const ok = await deductCredits(user.uid, "createProject");
      if (!ok) {
        toast.error("Insufficient credits to create a project.");
        setUsing(false);
        return;
      }

      const userSnap = await getDoc(doc(db, "users", user.uid));
      const username = userSnap.exists() ? (userSnap.data().username ?? user.email?.split("@")[0] ?? "") : "";
      const projectName = `${template.name} (from template)`;
      const projectSlug = projectName.toLowerCase().replace(/[^a-z0-9]/g, "-");

      const docRef = await addDoc(collection(db, "projects"), {
        name: projectName,
        description: template.description,
        ownerId: user.uid,
        ownerUsername: username,
        projectSlug,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        collaborators: [],
        isPublic: false,
        isTemplate: false,
        forksCount: 0,
        views: 0,
        deployStatus: "idle",
        deployError: null,
        parentTemplateId: template.id,
      });

      const filesRef = collection(db, "projects", docRef.id, "files");
      await Promise.all(
        template.files.map((f) =>
          addDoc(filesRef, {
            projectId: docRef.id,
            name: f.name,
            path: f.path,
            content: f.content,
            language: f.language,
            updatedAt: serverTimestamp(),
          })
        )
      );

      await incrementDownloads(template.id);
      toast.success(`Project "${projectName}" created! Opening…`);
      navigate("/projects");
    } catch {
      toast.error("Failed to create project from template.");
    } finally {
      setUsing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-white/20" />
        </div>
        <h1 className="text-3xl font-bold">{error ?? "Template not found"}</h1>
        <Link to="/templates" className="px-6 py-3 bg-white text-black rounded-2xl font-bold hover:bg-white/90 transition-all">
          Browse Templates
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      <main className="flex-1 pb-16 md:pb-0 max-w-7xl mx-auto w-full px-4 md:px-6 py-8 md:py-12">
        {/* Back */}
        <button
          onClick={() => navigate("/templates")}
          className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          All Templates
        </button>

        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          {/* Left: file explorer */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white">{template.name}</h1>
                  {template.isOfficial && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      DevOS Verified
                    </span>
                  )}
                </div>
                <p className="text-white/50 text-sm max-w-xl leading-relaxed">{template.description}</p>
              </div>
            </div>

            {/* Author + stats */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/40 mb-6">
              <span className="flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5" />
                by {template.authorUsername || template.authorName || "Unknown"}
              </span>
              <span className="flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />
                {template.downloads} uses
              </span>
              {template.tags && template.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-white/5 text-white/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* File explorer */}
            <div className="grid md:grid-cols-[180px_1fr] gap-4">
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] overflow-hidden">
                <p className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white/30 border-b border-white/5">
                  Files ({template.files.length})
                </p>
                <ul className="py-2 max-h-[50vh] overflow-y-auto">
                  {template.files.map((file, i) => (
                    <li key={i}>
                      <button
                        onClick={() => setActiveFile(file)}
                        className={cn(
                          "w-full text-left flex items-center gap-2 px-4 py-2 text-sm transition-colors",
                          activeFile?.path === file.path
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

              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] overflow-hidden">
                {activeFile ? (
                  <>
                    <div className="px-4 py-3 text-xs text-white/40 border-b border-white/5 font-mono flex items-center gap-2">
                      <FileIcon className="w-3.5 h-3.5" />
                      {activeFile.path || activeFile.name}
                      <span className="ml-auto text-white/20">{activeFile.language}</span>
                    </div>
                    <pre className="p-5 text-sm font-mono text-white/70 leading-relaxed whitespace-pre-wrap overflow-auto max-h-[50vh]">
                      {activeFile.content}
                    </pre>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-40 text-white/20 text-sm">
                    Select a file
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: CTA sidebar */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Use this template</h3>
              <p className="text-sm text-white/40 mb-5 leading-relaxed">
                Instantly creates a new project in your workspace with all files ready to go.
              </p>

              <button
                onClick={handleUseTemplate}
                disabled={using}
                className={cn(
                  "w-full py-3.5 rounded-2xl font-bold transition-all flex items-center justify-center gap-2",
                  using
                    ? "bg-white/5 text-white/30 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 text-white active:scale-95"
                )}
              >
                {using ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                ) : (
                  <><Download className="w-4 h-4" /> Use Template (5 credits)</>
                )}
              </button>

              <div className="mt-4 space-y-2">
                {["Files copied to your project", "Start coding immediately", "Fully customizable"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-white/40">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/40">Files</span>
                  <span className="text-white font-semibold">{template.files.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Downloads</span>
                  <span className="text-white font-semibold">{template.downloads}</span>
                </div>
                {template.isOfficial && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Status</span>
                    <span className="text-blue-400 font-semibold">Verified</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
