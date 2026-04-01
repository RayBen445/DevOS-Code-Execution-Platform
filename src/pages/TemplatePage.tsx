import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  collection,
  query,
  where,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { getApprovedTemplates, incrementDownloads } from "../lib/templateService";
import { deductCredits, getCredits } from "../lib/creditsService";
import { Template, Credits } from "../types";
import { motion } from "framer-motion";
import {
  Search,
  Download,
  Heart,
  ArrowLeft,
  Zap,
  Tag,
  User as UserIcon,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function TemplatePage() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [using, setUsing] = useState<string | null>(null);
  const [credits, setCredits] = useState<Credits | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getApprovedTemplates();
        setTemplates(data);
      } catch (err) {
        toast.error("Failed to load templates.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!user) return;
    getCredits(user.uid).then(setCredits).catch(() => {});
  }, [user]);

  const filtered = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.tags?.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
  );

  const handleUseTemplate = async (template: Template) => {
    if (!user) {
      toast.error("Please sign in to use templates.");
      return;
    }

    setUsing(template.id);
    try {
      // Check and deduct credits
      const ok = await deductCredits(user.uid, "createProject");
      if (!ok) {
        toast.error("Insufficient credits to create a project. Check your credits balance.");
        setUsing(null);
        return;
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      const username = userData?.username || user.email?.split("@")[0] || "";
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

      // Copy template files
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

      toast.success(`Project "${projectName}" created!`);
      navigate("/");
    } catch (err) {
      toast.error("Failed to create project from template.");
      console.error(err);
    } finally {
      setUsing(null);
    }
  };

  const totalCredits = credits ? credits.daily + credits.monthly : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-4xl font-extrabold text-white">
              Template Marketplace
            </h1>
            <p className="text-white/40 mt-1">
              Start fast with community-built templates
            </p>
          </div>
          {user && totalCredits !== null && (
            <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-300 font-bold text-sm">
                {totalCredits} credits
              </span>
              <span className="text-white/30 text-xs">(5 per project)</span>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            placeholder="Search templates by name, description, or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 transition-all text-lg"
          />
        </div>

        {/* Templates grid */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-32 text-center rounded-3xl border-2 border-dashed border-white/5">
            <Zap className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 font-medium">
              {search
                ? "No templates match your search."
                : "No approved templates yet. Be the first to publish one!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((template) => (
              <motion.div
                key={template.id}
                whileHover={{ y: -4 }}
                className="group p-6 rounded-2xl bg-[#111] border border-white/5 hover:border-white/20 transition-all flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-3 text-white/30 text-sm">
                    <span className="flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" />
                      {template.downloads}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" />
                      {template.likes}
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                  {template.name}
                </h3>
                <p className="text-sm text-white/40 mb-4 flex-1 line-clamp-2">
                  {template.description}
                </p>

                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.tags.slice(0, 4).map((tag) => (
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

                <div className="flex items-center gap-2 text-xs text-white/30 mb-4">
                  <UserIcon className="w-3 h-3" />
                  <span>by {template.authorUsername || template.authorName || "Unknown"}</span>
                </div>

                <button
                  onClick={() => handleUseTemplate(template)}
                  disabled={using === template.id}
                  className={cn(
                    "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                    using === template.id
                      ? "bg-white/5 text-white/30 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-700 text-white active:scale-95"
                  )}
                >
                  {using === template.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Use Template (5 credits)
                    </>
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
