import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  BadgeCheck,
  TrendingUp,
  Star,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";

const ALL_CATEGORY = "All";
const CATEGORIES = [ALL_CATEGORY, "React", "Vue", "HTML/CSS", "Node.js", "Python", "Next.js", "Landing Page", "Dashboard", "Other"];

export default function TemplatePage() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [using, setUsing] = useState<string | null>(null);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);

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

  const filtered = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.tags?.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      activeCategory === ALL_CATEGORY ||
      t.tags?.some((tag) => tag.toLowerCase() === activeCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  const officialTemplates = filtered.filter((t) => t.isOfficial);
  const trendingTemplates = filtered.filter((t) => !t.isOfficial).sort((a, b) => b.downloads - a.downloads).slice(0, 6);
  const allTemplates = filtered.filter((t) => !t.isOfficial);

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
      navigate("/projects");
    } catch (err) {
      toast.error("Failed to create project from template.");
      console.error(err);
    } finally {
      setUsing(null);
    }
  };

  const totalCredits = credits ? credits.daily + credits.monthly : null;

  // Reusable template card
  const TemplateCard = ({ template }: { template: Template }) => (
    <motion.div
      key={template.id}
      whileHover={{ y: -4 }}
      className="group p-6 rounded-2xl bg-surface border border-white/[0.06] hover:border-white/[0.12] transition-all flex flex-col"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
            <Zap className="w-6 h-6" />
          </div>
          {template.isOfficial && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 text-[10px] font-bold">
              <BadgeCheck className="w-3 h-3" />
              Verified
            </span>
          )}
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

      <h3 className="text-xl font-bold text-white mb-2">{template.name}</h3>
      <p className="text-sm text-white/40 mb-4 flex-1 line-clamp-2">{template.description}</p>

      {template.tags && template.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {template.tags.slice(0, 4).map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveCategory(tag.charAt(0).toUpperCase() + tag.slice(1))}
              className="px-2 py-0.5 rounded-md bg-white/5 text-white/40 hover:text-white hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
            >
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-white/30 mb-4">
        <UserIcon className="w-3 h-3" />
        <span>by {template.authorUsername || template.authorName || "Unknown"}</span>
      </div>

      <div className="flex gap-2">
        <Link
          to={`/templates/${template.id}`}
          className="flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-white/5 border border-border-base text-white/60 hover:text-white hover:border-border-base text-sm"
        >
          <Eye className="w-4 h-4" />
          Preview
        </Link>
        <button
          onClick={() => handleUseTemplate(template)}
          disabled={using === template.id}
          className={cn(
            "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm",
            using === template.id
              ? "bg-white/5 text-white/30 cursor-not-allowed"
              : "bg-purple-600 hover:bg-purple-700 text-white active:scale-95"
          )}
        >
          {using === template.id ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Creating…</>
          ) : (
            <><Download className="w-4 h-4" />Use</>
          )}
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-base text-white flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-10 pb-16 md:pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors w-fit"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white">Template Marketplace</h1>
            <p className="text-white/40 mt-1">Start fast with community-built and verified templates</p>
          </div>
          {user && totalCredits !== null && (
            <div className="sm:ml-auto flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl w-fit">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-300 font-bold text-sm">{totalCredits} credits</span>
              <span className="text-white/30 text-xs">(5 per project)</span>
            </div>
          )}
        </div>

        {/* Search + category filter */}
        <div className="space-y-4 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-border-base rounded-2xl pl-12 pr-6 py-4 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>
          {/* Category chips — horizontally scrollable on mobile */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0",
                  activeCategory === cat
                    ? "bg-blue-600 text-white"
                    : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-32 text-center rounded-3xl border-2 border-dashed border-border-base">
            <Zap className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 font-medium">
              {search || activeCategory !== ALL_CATEGORY
                ? "No templates match your filters."
                : "No approved templates yet. Be the first to publish one!"}
            </p>
            {activeCategory !== ALL_CATEGORY && (
              <button
                onClick={() => setActiveCategory(ALL_CATEGORY)}
                className="mt-4 text-sm text-blue-400 hover:text-blue-300 underline"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-12">
            {/* Featured / Official */}
            {officialTemplates.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <BadgeCheck className="w-5 h-5 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">DevOS Verified</h2>
                  <span className="text-xs text-white/30">{officialTemplates.length} templates</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {officialTemplates.map((t) => <TemplateCard key={t.id} template={t} />)}
                </div>
              </section>
            )}

            {/* Trending */}
            {trendingTemplates.length > 0 && !search && activeCategory === ALL_CATEGORY && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <TrendingUp className="w-5 h-5 text-orange-400" />
                  <h2 className="text-xl font-bold text-white">Trending</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trendingTemplates.map((t) => <TemplateCard key={t.id} template={t} />)}
                </div>
              </section>
            )}

            {/* All templates (deduped with trending when filtered) */}
            {(search || activeCategory !== ALL_CATEGORY) && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-xl font-bold text-white">Results</h2>
                  <span className="text-xs text-white/30">{filtered.length} templates</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.map((t) => <TemplateCard key={t.id} template={t} />)}
                </div>
              </section>
            )}

            {/* All community templates */}
            {!search && activeCategory === ALL_CATEGORY && allTemplates.length > trendingTemplates.length && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <Star className="w-5 h-5 text-white/30" />
                  <h2 className="text-xl font-bold text-white">All Community Templates</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allTemplates.map((t) => <TemplateCard key={t.id} template={t} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
