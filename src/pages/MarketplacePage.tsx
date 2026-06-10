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
import { TEMPLATES } from "../constants/templates";
import { getCommunityThemes, CommunityTheme, toggleThemeLike, incrementThemeInstalls } from "../lib/themeService";
import { Palette } from "lucide-react";
import { useUITheme } from "../hooks/useUITheme";
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
import { cn, generateAppId } from '../lib/utils';
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";

const ALL_CATEGORY = "All";
const CATEGORIES = [ALL_CATEGORY, "React", "Vue", "HTML/CSS", "Node.js", "Python", "Next.js", "Landing Page", "Dashboard", "Other"];

export default function MarketplacePage() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [using, setUsing] = useState<string | null>(null);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [activeTab, setActiveTab] = useState<"templates" | "themes">("templates");
  const [communityThemes, setCommunityThemes] = useState<CommunityTheme[]>([]);
  const { setCustomTheme, changeTheme } = useUITheme();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getApprovedTemplates();
        const themesData = await getCommunityThemes();
        setCommunityThemes(themesData);
        
        const hardcodedTemplates: Template[] = TEMPLATES.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          authorId: "system",
          authorUsername: "devos",
          authorName: "DevOS Official",
          projectId: "",
          files: t.files as any,
          downloads: 1000 + Math.floor(Math.random() * 5000), // aesthetic mock downloads
          likes: 500 + Math.floor(Math.random() * 1000),
          tags: t.category ? [t.category.toLowerCase()] : ["starter"],
          isOfficial: true,
        }));

        setTemplates([...hardcodedTemplates, ...data]);
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
        projectSlug,
        description: template.description || "",
        ownerId: user.uid,
        ownerUsername: username,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        collaborators: [],
        isPublic: true,
        isTemplate: false,
        forksCount: 0,
        views: 0,
        deployUrl: `/@${username}/${projectSlug}`
      });

      const filesRef = collection(db, "projects", docRef.id, "files");
      const filePromises = template.files.map(file => 
        addDoc(filesRef, { 
          projectId: docRef.id,
          name: file.name || "Untitled", 
          path: file.path || file.name || "Untitled",
          content: file.content || "", 
          language: file.language || "plaintext", 
          updatedAt: serverTimestamp() 
        })
      );
      await Promise.all(filePromises);

      await incrementDownloads(template.id);
      toast.success("Project created successfully!");
      navigate(`/@${username}/${projectSlug}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create project from template");
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
        <div className="text-center max-w-3xl mx-auto space-y-6 mb-12">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-sm font-bold border border-blue-500/20">
              <Star className="w-4 h-4" /> The Unified Ecosystem
            </motion.div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
              DevOS <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Marketplace</span>
            </h1>
            <p className="text-xl text-white/60">
              Discover official templates, premium themes, and community creations to supercharge your workflow.
            </p>
          </div>
          
          <div className="flex justify-center mb-12">
            <div className="flex bg-surface border border-border-base rounded-2xl p-1">
              <button
                onClick={() => setActiveTab("templates")}
                className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "templates" ? "bg-blue-600 text-white" : "text-white/60 hover:text-white"}`}
              >
                Templates
              </button>
              <button
                onClick={() => setActiveTab("themes")}
                className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "themes" ? "bg-purple-600 text-white" : "text-white/60 hover:text-white"}`}
              >
                Themes
              </button>
            </div>
          </div>

        
        {activeTab === "templates" && (
          <>
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
      
          </>
        )}

        {activeTab === "themes" && (
          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-black mb-6 flex items-center gap-2"><Star className="w-6 h-6 text-yellow-500"/> Official Premium Themes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-6 bg-surface border border-border-base rounded-3xl flex flex-col items-center justify-center text-center h-48 border-dashed">
                  <Palette className="w-8 h-8 text-white/20 mb-2"/>
                  <p className="text-white/40 text-sm">Official themes are available in the Theme Studio.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-black mb-6 flex items-center gap-2"><TrendingUp className="w-6 h-6 text-purple-500"/> Community Gallery</h2>
              {communityThemes.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                <div className="text-center py-20 bg-surface border border-border-base rounded-3xl border-dashed">
                  <p className="text-white/60">No themes found matching your search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {communityThemes
                    .filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase()))
                    .map(theme => (
                    <div key={theme.id} className="group bg-surface border border-border-base rounded-3xl overflow-hidden hover:border-purple-500/50 transition-all shadow-xl hover:shadow-purple-500/10 flex flex-col">
                      {/* Theme Preview */}
                      <div className="h-40 relative p-4 flex flex-col justify-between" style={{ background: theme.vars['--bg-base'] || '#000', color: theme.vars['--text-primary'] || '#fff' }}>
                        <div className="flex justify-between items-start">
                          <div className="w-1/2 space-y-2">
                            <div className="h-3 w-3/4 rounded" style={{ background: theme.vars['--bg-surface'] || '#111' }} />
                            <div className="h-2 w-1/2 rounded opacity-50" style={{ background: theme.vars['--text-secondary'] || '#888' }} />
                          </div>
                          <div className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: theme.vars['--accent'] || '#3b82f6', color: '#fff' }}>Preview</div>
                        </div>
                        <div className="flex gap-2">
                          <div className="h-8 w-8 rounded-full" style={{ background: theme.vars['--bg-surface'] || '#111' }} />
                          <div className="h-8 flex-1 rounded-lg" style={{ background: theme.vars['--bg-card'] || '#222' }} />
                        </div>
                      </div>
                      
                      {/* Details */}
                      <div className="p-6 flex-1 flex flex-col">
                        <h3 className="text-lg font-bold mb-1 truncate">{theme.name}</h3>
                        <p className="text-sm text-white/50 mb-4 line-clamp-2 min-h-[40px]">{theme.description}</p>
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border-base">
                          <div className="flex items-center gap-2 text-xs text-white/40">
                            <UserIcon className="w-3 h-3" /> @{theme.authorUsername}
                          </div>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={async () => {
                                if(!user) { toast.error("Sign in to like"); return; }
                                const liked = theme.likedBy?.includes(user.uid);
                                await toggleThemeLike(theme.id, user.uid, liked);
                                setCommunityThemes(prev => prev.map(t => t.id === theme.id ? { ...t, likes: liked ? t.likes - 1 : t.likes + 1, likedBy: liked ? t.likedBy.filter(id => id !== user.uid) : [...(t.likedBy || []), user.uid] } : t));
                              }}
                              className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${theme.likedBy?.includes(user?.uid || '') ? 'text-red-400' : 'text-white/40 hover:text-white'}`}
                            >
                              <Heart className={`w-4 h-4 ${theme.likedBy?.includes(user?.uid || '') ? 'fill-current' : ''}`} />
                              {theme.likes || 0}
                            </button>
                            <button 
                              onClick={async () => {
                                setCustomTheme(theme.vars);
                                changeTheme('custom');
                                toast.success("Theme Applied!");
                                await incrementThemeInstalls(theme.id);
                              }}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                              Install
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
</div>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}

