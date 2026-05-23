import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { db, auth } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  Search,
  User,
  Loader2,
  X,
  FolderCode,
  Layout,
  Flame,
  Clock,
  Globe,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { resolveAvatar } from "../lib/avatars";
import FollowButton from "../components/FollowButton";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { useSEO } from "../hooks/useSEO";
import { UserProfile, Project, Template } from "../types";
import { getApprovedTemplates } from "../lib/templateService";
import { cn } from "../lib/utils";

type FilterType = "all" | "developers" | "projects" | "templates";
type SortType = "recent" | "trending";

const FILTERS: { id: FilterType; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "All", icon: null },
  { id: "developers", label: "Developers", icon: <User className="w-3.5 h-3.5" /> },
  { id: "projects", label: "Projects", icon: <FolderCode className="w-3.5 h-3.5" /> },
  { id: "templates", label: "Templates", icon: <Layout className="w-3.5 h-3.5" /> },
];

const SORTS: { id: SortType; label: string; icon: React.ReactNode }[] = [
  { id: "recent", label: "Recent", icon: <Clock className="w-3 h-3" /> },
  { id: "trending", label: "Trending", icon: <Flame className="w-3 h-3" /> },
];

/* ─── helpers ─── */
function rangeQuery(field: string, term: string) {
  const lo = term.toLowerCase();
  return [where(field, ">=", lo), where(field, "<=", lo + "\uf8ff")];
}

export default function SearchPage() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search term is the source of truth from the URL (?q=...)
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") ?? "");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("recent");

  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [projectResults, setProjectResults] = useState<Project[]>([]);
  const [templateResults, setTemplateResults] = useState<Template[]>([]);

  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Pre-loaded suggestions shown before any typing
  const [suggestedDevs, setSuggestedDevs] = useState<UserProfile[]>([]);
  const [suggestedProjects, setSuggestedProjects] = useState<Project[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  // Cached templates for client-side template search
  const allTemplatesRef = useRef<Template[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useSEO({ title: "Search — DevOS" });

  // Auto-focus + load suggestions + pre-fetch templates
  useEffect(() => {
    inputRef.current?.focus();
    const loadSuggestions = async () => {
      try {
        const [devsSnap, projectsSnap, templates] = await Promise.all([
          getDocs(
            query(collection(db, "users"), orderBy("updatedAt", "desc"), limit(6))
          ),
          getDocs(
            query(
              collection(db, "projects"),
              where("isPublic", "==", true),
              orderBy("views", "desc"),
              limit(6)
            )
          ),
          getApprovedTemplates(),
        ]);
        setSuggestedDevs(
          devsSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile))
        );
        setSuggestedProjects(
          projectsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Project))
        );
        allTemplatesRef.current = templates;
      } catch {
        /* ignore */
      } finally {
        setLoadingSuggestions(false);
      }
    };
    loadSuggestions();
  }, []);

  // Sync searchTerm → URL (?q=...) with a small debounce to avoid thrashing
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchTerm.trim();
      if (trimmed) {
        setSearchParams({ q: trimmed }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // If URL ?q param changes externally (back/forward), sync into state
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setSearchTerm((prev) => (prev === q ? prev : q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("q")]);

  // Re-run search when filter or sort changes while there's an active term
  useEffect(() => {
    if (searchTerm.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(searchTerm.trim()), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort]);

  // Debounced search on term change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchTerm.trim()) {
      setUserResults([]);
      setProjectResults([]);
      setTemplateResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(searchTerm.trim()), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const doSearch = async (term: string) => {
    setLoading(true);
    setSearched(false);
    const lo = term.toLowerCase();

    try {
      const tasks: Promise<void>[] = [];

      if (filter === "all" || filter === "developers") {
        tasks.push(
          (async () => {
            const usersRef = collection(db, "users");
            const [byUsername, byName] = await Promise.all([
              getDocs(query(usersRef, ...rangeQuery("username", lo), limit(20))),
              getDocs(query(usersRef, ...rangeQuery("displayName", term), limit(20))),
            ]);
            const seen = new Set<string>();
            const merged: UserProfile[] = [];
            [...byUsername.docs, ...byName.docs].forEach((d) => {
              if (!seen.has(d.id)) {
                seen.add(d.id);
                merged.push({ uid: d.id, ...d.data() } as UserProfile);
              }
            });
            setUserResults(merged);
          })()
        );
      }

      if (filter === "all" || filter === "projects") {
        tasks.push(
          (async () => {
            const projectsRef = collection(db, "projects");
            const snap = await getDocs(
              query(
                projectsRef,
                where("isPublic", "==", true),
                ...rangeQuery("name", lo),
                limit(15)
              )
            );
            let projects = snap.docs.map(
              (d) => ({ id: d.id, ...d.data() } as Project)
            );
            if (sort === "trending") {
              projects = projects.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
            }
            setProjectResults(projects);
          })()
        );
      }

      if (filter === "all" || filter === "templates") {
        tasks.push(
          (async () => {
            // Use cached list for template search
            const all =
              allTemplatesRef.current.length > 0
                ? allTemplatesRef.current
                : await getApprovedTemplates();
            if (allTemplatesRef.current.length === 0) {
              allTemplatesRef.current = all;
            }
            const matched = all.filter(
              (t) =>
                t.name.toLowerCase().includes(lo) ||
                t.description?.toLowerCase().includes(lo) ||
                t.tags?.some((tag) => tag.toLowerCase().includes(lo))
            );
            const sorted =
              sort === "trending"
                ? [...matched].sort((a, b) => b.downloads - a.downloads)
                : matched;
            setTemplateResults(sorted.slice(0, 15));
          })()
        );
      }

      // Clear collections not being searched
      if (filter !== "all" && filter !== "developers") setUserResults([]);
      if (filter !== "all" && filter !== "projects") setProjectResults([]);
      if (filter !== "all" && filter !== "templates") setTemplateResults([]);

      await Promise.all(tasks);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const totalResults =
    userResults.length + projectResults.length + templateResults.length;

  const hasTerm = !!searchTerm.trim();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-8 pb-24 md:pb-12">

        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 flex items-center justify-center flex-shrink-0">
              <Search className="w-4.5 h-4.5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white leading-tight">Search DevOS</h1>
              <p className="text-white/40 text-xs mt-0.5">Find developers, projects, and templates</p>
            </div>
          </div>
        </div>

        {/* ── Search input ── */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, username, or keyword…"
            className="w-full bg-white/[0.05] border border-white/10 rounded-2xl pl-11 pr-11 py-3.5 text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5 text-white/40" />
            </button>
          )}
        </div>

        {/* ── Filter pills ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-3 no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 border",
                filter === f.id
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"
              )}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Sort pills (only when there's a search term or results) ── */}
        {(hasTerm || searched) && (
          <div className="flex items-center gap-2 mb-5">
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex-shrink-0">Sort</span>
            <div className="flex gap-1.5">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border",
                    sort === s.id
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-transparent border-transparent text-white/30 hover:text-white/60"
                  )}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </div>
            {searched && (
              <span className="ml-auto text-[10px] text-white/25">
                {totalResults} result{totalResults !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* ── Results / suggestions ── */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-16"
            >
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </motion.div>

          ) : searched && totalResults === 0 ? (
            /* ── No results ── */
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center"
            >
              <Search className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/40 font-medium text-sm">
                No results for "{searchTerm}"
              </p>
              <p className="text-white/20 text-xs mt-1">
                Try a different keyword or filter.
              </p>
              <button
                onClick={() => { setSearchTerm(""); setFilter("all"); }}
                className="mt-4 text-xs text-blue-400 hover:text-blue-300 underline transition-colors"
              >
                Clear search
              </button>
            </motion.div>

          ) : hasTerm && totalResults > 0 ? (
            /* ── Search results ── */
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {userResults.length > 0 && (
                <ResultSection title="Developers" count={userResults.length}>
                  {userResults.map((p) => (
                    <UserCard key={p.uid} profile={p} currentUid={user?.uid} />
                  ))}
                </ResultSection>
              )}
              {projectResults.length > 0 && (
                <ResultSection title="Projects" count={projectResults.length}>
                  {projectResults.map((p) => (
                    <ProjectResultCard key={p.id} project={p} />
                  ))}
                </ResultSection>
              )}
              {templateResults.length > 0 && (
                <ResultSection title="Templates" count={templateResults.length}>
                  {templateResults.map((t) => (
                    <TemplateResultCard key={t.id} template={t} />
                  ))}
                </ResultSection>
              )}
            </motion.div>

          ) : !hasTerm ? (
            /* ── Suggestions (pre-search) ── */
            <motion.div
              key="suggestions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {loadingSuggestions ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
                </div>
              ) : (
                <>
                  {suggestedDevs.length > 0 && (
                    <ResultSection title="Trending Developers" icon={<Flame className="w-3.5 h-3.5 text-orange-400" />}>
                      {suggestedDevs.map((p) => (
                        <UserCard key={p.uid} profile={p} currentUid={user?.uid} compact />
                      ))}
                    </ResultSection>
                  )}
                  {suggestedProjects.length > 0 && (
                    <ResultSection title="Popular Projects" icon={<Globe className="w-3.5 h-3.5 text-blue-400" />}>
                      {suggestedProjects.map((p) => (
                        <ProjectResultCard key={p.id} project={p} />
                      ))}
                    </ResultSection>
                  )}
                </>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

/* ─── Result Section wrapper ─── */
function ResultSection({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count?: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">
          {title}
        </span>
        {count !== undefined && (
          <span className="text-[10px] text-white/20 ml-1">{count}</span>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/* ─── User card ─── */
function UserCard({
  profile,
  currentUid,
  compact,
}: {
  profile: UserProfile;
  currentUid?: string;
  compact?: boolean;
}) {
  const avatar = resolveAvatar(profile.avatarUrl);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#111827] border border-white/[0.06] hover:border-white/[0.12] transition-all"
    >
      <Link to={`/@${profile.username}`} className="flex items-center gap-3 flex-1 min-w-0">
        <img
          src={avatar}
          alt={profile.displayName}
          className={cn(
            "rounded-full object-cover flex-shrink-0 border border-white/10",
            compact ? "w-9 h-9" : "w-11 h-11"
          )}
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0">
          <p className="font-semibold text-white text-sm truncate">
            {profile.displayName || profile.username}
          </p>
          <p className="text-white/40 text-xs font-mono">@{profile.username}</p>
          {!compact && profile.bio && (
            <p className="text-white/25 text-xs mt-0.5 truncate">{profile.bio}</p>
          )}
        </div>
      </Link>
      <FollowButton
        targetUid={profile.uid}
        targetUsername={profile.username}
        size="sm"
        className="flex-shrink-0"
      />
    </motion.div>
  );
}

/* ─── Project result card ─── */
function ProjectResultCard({ project }: { project: Project }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Link
        to={`/@${project.ownerUsername}/${project.id}`}
        className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#111827] border border-white/[0.06] hover:border-white/[0.12] transition-all group block"
      >
        <div className="w-10 h-10 rounded-xl bg-blue-600/15 flex items-center justify-center flex-shrink-0">
          <FolderCode className="w-4.5 h-4.5 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate group-hover:text-blue-300 transition-colors">
            {project.name}
          </p>
          <p className="text-white/40 text-xs font-mono truncate">@{project.ownerUsername}</p>
          {project.description && (
            <p className="text-white/25 text-xs mt-0.5 truncate">{project.description}</p>
          )}
        </div>
        {(project.views ?? 0) > 0 && (
          <div className="flex items-center gap-1 text-white/25 text-xs flex-shrink-0">
            <Eye className="w-3 h-3" />
            {project.views}
          </div>
        )}
      </Link>
    </motion.div>
  );
}

/* ─── Template result card ─── */
function TemplateResultCard({ template }: { template: Template }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Link
        to={`/templates/${template.id}`}
        className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#111827] border border-white/[0.06] hover:border-white/[0.12] transition-all group block"
      >
        <div className="w-10 h-10 rounded-xl bg-purple-600/15 flex items-center justify-center flex-shrink-0">
          <Layout className="w-4.5 h-4.5 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate group-hover:text-purple-300 transition-colors">
            {template.name}
          </p>
          <p className="text-white/40 text-xs truncate">
            {template.authorUsername ? `@${template.authorUsername}` : "Unknown"}
          </p>
          {template.description && (
            <p className="text-white/25 text-xs mt-0.5 truncate">{template.description}</p>
          )}
        </div>
        {(template.downloads ?? 0) > 0 && (
          <div className="flex items-center gap-1 text-white/25 text-xs flex-shrink-0">
            <span>↓{template.downloads}</span>
          </div>
        )}
      </Link>
    </motion.div>
  );
}

