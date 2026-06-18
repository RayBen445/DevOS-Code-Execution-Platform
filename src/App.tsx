import React, { useState, useEffect, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./lib/firebase";
import { initializeUser, updateStreak } from "./lib/userService";
import { getMaintenanceConfig, MaintenanceConfig } from "./lib/creditsService";
import { useUITheme } from "./hooks/useUITheme";
import Navbar from "./components/Navbar";
import { useActiveContext } from "./hooks/useActiveContext";




import Footer from "./components/Footer";

import MobileBottomNav from "./components/MobileBottomNav";
















import ScrollToTop from "./components/ScrollToTop";
import ConfigGuard from "./components/ConfigGuard";
import MaintenancePage from "./components/MaintenancePage";
import PageMaintenanceBanner from "./components/PageMaintenanceBanner";







import SubdomainRouter from "./components/SubdomainRouter";
import SubdomainNotFound from "./components/SubdomainNotFound";
import SubdomainReserved from "./components/SubdomainReserved";
import SwipeNavigation from "./components/SwipeNavigation";
const NewProjectPage = React.lazy(() => import("./pages/NewProjectPage"));















import { Zap, ShieldAlert } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Routes, Route, Navigate, useParams, useLocation, useNavigate } from "react-router-dom";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "./lib/firebase";
import { signOut } from "firebase/auth";
import { initializeDefaultBots, emitBotEventWithToast } from "./lib/botEngine";
import { buildPortfolioUrl, buildProjectUrl, COMPANY_DOMAIN, getLegacyRedirectUrl, parseDevosHost } from "./lib/brand";
import PremiumLoader from "./components/PremiumLoader";
import CommandPalette from "./components/CommandPalette";
import OfflineGame from "./components/OfflineGame";

import { Toaster } from "sonner";

// Lazy loaded components
const Dashboard = React.lazy(() => import("./components/Dashboard"));
const OrgDashboard = React.lazy(() => import("./components/OrgDashboard"));
const IDE = React.lazy(() => import("./components/IDE"));
const PortfolioIDE = React.lazy(() => import("./components/PortfolioIDE"));
const Login = React.lazy(() => import("./components/Login"));
const Home = React.lazy(() => import("./components/Home"));
const FeedHome = React.lazy(() => import("./components/FeedHome"));
const PrivacyPage = React.lazy(() => import("./pages/PrivacyPage"));
const TermsPage = React.lazy(() => import("./pages/TermsPage"));
const CookiePolicyPage = React.lazy(() => import("./pages/CookiePolicyPage"));
const AcceptableUsePage = React.lazy(() => import("./pages/AcceptableUsePage"));
const CopyrightPage = React.lazy(() => import("./pages/CopyrightPage"));
const ProjectPreview = React.lazy(() => import("./pages/ProjectPreview"));
const ProjectView = React.lazy(() => import("./pages/ProjectView"));
const MarketplacePage = React.lazy(() => import("./pages/MarketplacePage"));
const TemplatePreviewPage = React.lazy(() => import("./pages/TemplatePreviewPage"));
const UserProfilePage = React.lazy(() => import("./pages/UserProfilePage"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const StatusPage = React.lazy(() => import("./pages/StatusPage"));
const DocsPage = React.lazy(() => import("./pages/DocsPage"));
const SettingsPage = React.lazy(() => import("./pages/SettingsPage"));
const ThemeStudio = React.lazy(() => import("./components/ThemeStudio"));
const SSOCallback = React.lazy(() => import("./pages/SSOCallback"));

const SearchPage = React.lazy(() => import("./pages/SearchPage"));
const ExplorePage = React.lazy(() => import("./pages/ExplorePage"));
const OrgPage = React.lazy(() => import("./pages/OrgPage"));
const OrgsPage = React.lazy(() => import("./pages/OrgsPage"));
const AboutPage = React.lazy(() => import("./pages/AboutPage"));
const ContactPage = React.lazy(() => import("./pages/ContactPage"));

const Portfolio = React.lazy(() => import("./pages/Portfolio"));
const NotFoundPage = React.lazy(() => import("./pages/NotFoundPage"));
const SubdomainOrg = React.lazy(() => import("./pages/SubdomainOrg"));
const SubdomainOrgProject = React.lazy(() => import("./pages/SubdomainOrgProject"));
const CommunitiesPage = React.lazy(() => import("./pages/CommunitiesPage"));
const CommunityPage = React.lazy(() => import("./pages/CommunityPage"));
const LearnPage = React.lazy(() => import("./pages/LearnPage"));
const LearnTopicPage = React.lazy(() => import("./pages/LearnTopicPage"));
const LearnLessonPage = React.lazy(() => import("./pages/LearnLessonPage"));
const LearnDynamicLessonPage = React.lazy(() => import("./pages/LearnDynamicLessonPage"));
const EventsPage = React.lazy(() => import("./pages/EventsPage"));
const EventPage = React.lazy(() => import("./pages/EventPage"));
const CreateEventPage = React.lazy(() => import("./pages/CreateEventPage"));
const SpeakersPage = React.lazy(() => import("./pages/SpeakersPage"));
const SpeakerPage = React.lazy(() => import("./pages/SpeakerPage"));
const CommunityChatPage = React.lazy(() => import("./pages/CommunityChatPage"));
const OrgChatPage = React.lazy(() => import("./pages/OrgChatPage"));


/* ─── Paths excluded from tracking (privacy-sensitive or utility) ─── */
const EXCLUDED_ROUTES = ["/admin", "/settings", "/privacy", "/terms", "/cookies", "/acceptable-use", "/copyright", "/docs", "/status"];
const STORAGE_KEY = "devos_lastRoute";

/** Saves every meaningful navigation to localStorage and auto-restores on first load. */
function RouteTracker({ user }: { user: any }) {
  const location = useLocation();
  const navigate = useNavigate();
  const restoredRef = useRef(false);

  // Persist route on every change (skip excluded paths)
  useEffect(() => {
    const path = location.pathname + location.search;
    const isExcluded = EXCLUDED_ROUTES.some((p) => path.startsWith(p));
    if (!isExcluded) {
      localStorage.setItem(STORAGE_KEY, path);
    }
  }, [location]);

  // Auto-restore once per browser session when landing at "/"
  useEffect(() => {
    if (!user || restoredRef.current) return;
    if (location.pathname !== "/") return;
    // Only restore once per tab session
    if (sessionStorage.getItem("devos_restored")) return;

    const lastRoute = localStorage.getItem(STORAGE_KEY);
    if (lastRoute && lastRoute !== "/" && !lastRoute.startsWith("/?")) {
      restoredRef.current = true;
      sessionStorage.setItem("devos_restored", "1");
      navigate(lastRoute, { replace: true });
    }
  }, [user, location.pathname, navigate]);

  return null;
}

/** /u/:username redirects to canonical /@:username routes. */
function LegacyPortfolioRedirect() {
  const { username, projectSlug } = useParams<{ username: string; projectSlug?: string }>();
  const location = useLocation();
  if (!username) return <NotFoundPage />;
  if (projectSlug) {
    // /u/:username/:projectSlug → /@:username/:projectSlug
    return <Navigate to={`/@${username}/${projectSlug}${location.search}`} replace />;
  }
  // /u/:username → /@:username (then subdomain redirect)
  return <Navigate to={`/@${username}${location.search}`} replace />;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const PROJECT_SLUG_REGEX = /^[a-zA-Z0-9_-]+$/;

/**
 * Handles /@:username routes.
 * Validates the username, then redirects the browser to https://<username>.devos.kontyra.name.ng
 * so that subdomain-based portfolio rendering takes over.
 * An invalid username shows a 404.
 */
function AtUsernameRoute() {
  const { username } = useParams<{ username: string }>();

  // Validate username before doing anything
  if (!username || !USERNAME_REGEX.test(username)) {
    return <NotFoundPage />;
  }

  // Always redirect /@username → https://username.devos.kontyra.name.ng
  // (SubdomainRouter on *.devos.kontyra.name.ng will render the portfolio)
  window.location.replace(buildPortfolioUrl(username));
  return null;
}

/** Legacy project URL redirect: /projects/:username/:projectSlug → project subdomain */
function LegacyProjectRedirect() {
  const { username, projectSlug } = useParams<{ username: string; projectSlug: string }>();
  const location = useLocation();
  if (!username || !projectSlug) return <NotFoundPage />;
  if (!USERNAME_REGEX.test(username) || !PROJECT_SLUG_REGEX.test(projectSlug)) {
    return <NotFoundPage />;
  }
  window.location.replace(`${buildProjectUrl(username, projectSlug)}${location.search}`);
  return null;
}

/** Redirect /communities/:slug → /c/:slug (and /chat variant) */
function CommunitySlugRedirect({ chat = false }: { chat?: boolean }) {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/c/${slug}${chat ? "/chat" : ""}`} replace />;
}


function ProjectIDEWrapper({ projectId, onBack }: { projectId: string; onBack?: () => void }) {
  const [systemType, setSystemType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;
    
    const projectRef = doc(db, "projects", projectId);
    unsubscribe = onSnapshot(projectRef, (docSnap) => {
      if (docSnap.exists()) {
        setSystemType(docSnap.data().systemType || 'react');
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching project systemType:", error);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [projectId]);

  if (loading) return <PremiumLoader />;

  if (systemType === "portfolio") {
    return <PortfolioIDE projectId={projectId} onBack={onBack} />;
  }
  
  return <IDE projectId={projectId} onBack={onBack} />;
}

export default function App() {
  // Subdomain routing: *.devos.kontyra.name.ng → render the appropriate component
  // without full app chrome and without changing the browser URL.
  //
  //   username.devos.kontyra.name.ng          → portfolio
  //   project-username.devos.kontyra.name.ng  → deployed project
  const currentHostname = window.location.hostname.toLowerCase();
  const hostTarget = parseDevosHost(currentHostname);
  const isCompanyHost =
    currentHostname === COMPANY_DOMAIN || currentHostname.endsWith(`.${COMPANY_DOMAIN}`);

  // Redirect legacy nested subdomains to the new hyphenated format
  if (hostTarget.kind === "legacy-project") {
    window.location.replace(`${buildProjectUrl(hostTarget.username, hostTarget.projectSlug)}${window.location.pathname}${window.location.search}`);
    return null;
  }

  if (hostTarget.kind === "reserved") {
    return <SubdomainReserved />;
  }
  if (hostTarget.kind === "portfolio") {
    return <SubdomainRouter username={hostTarget.username} />;
  }
  if (hostTarget.kind === "project") {
    return (
      <SubdomainRouter
        username={hostTarget.username}
        projectSlug={hostTarget.projectSlug}
      />
    );
  }
  if (hostTarget.kind === "app-project") {
    return (
      <SubdomainRouter
        appId={hostTarget.appId}
        projectSlug={hostTarget.projectSlug}
      />
    );
  }
  if (hostTarget.kind === "organization") {
    return <SubdomainOrg slug={hostTarget.orgSlug} />;
  }
  if (hostTarget.kind === "org-project") {
    return <SubdomainOrgProject orgSlug={hostTarget.orgSlug} projectSlug={hostTarget.projectSlug} />;
  }
  if (hostTarget.kind === "unknown" && isCompanyHost) {
    return <SubdomainNotFound />;
  }

  const [user, loading] = useAuthState(auth);
  const { } = useUITheme(); // bootstraps theme on mount
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    try { return sessionStorage.getItem("devos_active_project") ?? null; } catch { return null; }
  });
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  // Maintenance mode state (real-time listener — public read so even guests see it)
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; banner: string; pages: string[] } | null>(null);

  // User account status (banned / suspended / deactivated)
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const closeAuth = () => { setShowLogin(false); setShowSignup(false); };

  // Open a specific project directly when navigating to /projects?open=<projectId>
  useEffect(() => {
    if (location.pathname !== "/projects") return;
    const params = new URLSearchParams(location.search);
    const openId = params.get("open");
    if (openId && user) setSelectedProjectId(openId);
  }, [location.pathname, location.search, user]);

  // Keep sessionStorage in sync with the active project
  useEffect(() => {
    try {
      if (selectedProjectId) {
        sessionStorage.setItem("devos_active_project", selectedProjectId);
      } else {
        sessionStorage.removeItem("devos_active_project");
      }
    } catch { /* noop */ }
  }, [selectedProjectId]);

  // Bootstrap user on login, clean up on logout
  useEffect(() => {
    if (user) {
      initializeUser(user);
      updateStreak(user.uid).catch(() => {});
    } else {
      try { sessionStorage.removeItem("devos_active_project"); } catch { /* noop */ }
      setSelectedProjectId(null);
      setUserStatus(null);
      setUserRole(null);
    }
  }, [user]);

  // Real-time listener on user's own doc to detect status changes
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setUserStatus(snap.data()?.status ?? null);
        setUserRole(snap.data()?.role ?? null);
      }
    });
    return () => unsub();
  }, [user?.uid]);

  // Real-time listener on maintenance config (public read)
  useEffect(() => {
    // Fallback timeout in case Firestore snapshot is blocked (e.g. ad blockers) or network hangs
    const timeout = setTimeout(() => {
      setMaintenance(prev => prev === null ? { enabled: false, banner: "", pages: [] } : prev);
    }, 3000);

    const unsub = onSnapshot(doc(db, "system_config", "maintenance"), (snap) => {
      if (snap.exists()) {
        setMaintenance({
          enabled: snap.data()?.maintenanceMode ?? false,
          banner: snap.data()?.maintenanceBanner ?? "",
          pages: snap.data()?.maintenancePages ?? [],
        });
      } else {
        setMaintenance({ enabled: false, banner: "", pages: [] });
      }
    }, () => setMaintenance({ enabled: false, banner: "", pages: [] }));
    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, []);

  // Capture ?ref= query param on first visit
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && !sessionStorage.getItem("devos_pending_ref")) {
      sessionStorage.setItem("devos_pending_ref", ref);
    }
  }, []);

  // Boot bot system once per app session
  useEffect(() => {
    initializeDefaultBots();
    emitBotEventWithToast({
      name: "system.boot",
      payload: { firebaseReady: true },
    }).catch(() => {});
  }, []);

  // Handle subdomain redirects for backward compatibility
  useEffect(() => {
    const redirectUrl = getLegacyRedirectUrl(
      window.location.hostname,
      window.location.pathname,
      window.location.search
    );
    if (redirectUrl && redirectUrl !== window.location.href) {
      window.location.replace(redirectUrl);
    }
  }, []);

  // Global accessibility shortcuts (Ctrl + letter)
  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      // Handle ? for accessibility shortcuts
      if (event.key === "?" && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        window.location.assign("/settings?tab=accessibility");
        return;
      }

      // Handle Ctrl + [key]
      if (event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
        const key = event.key.toLowerCase();
        const routeByKey: Record<string, string> = {
          p: "/projects",
          e: "/explore",
          d: "/communities",
          t: "/marketplace",
          l: "/learn",
          ",": "/settings",
        };
        const route = routeByKey[key];
        if (route) {
          event.preventDefault();
          if (window.location.pathname !== route) {
            window.location.assign(route);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (loading || maintenance === null) {
    return <PremiumLoader fullScreen message="INITIALIZING SECURE ENVIRONMENT" />;
  }

  // Maintenance mode — block everyone except admins, but allow sign-in
  if (maintenance.enabled && userRole !== "admin") {
    return (
      <>
        <MaintenancePage
          banner={maintenance.banner}
          isAuthenticated={!!user}
          onSignIn={() => setShowLogin(true)}
          onSignOut={() => signOut(auth)}
        />
        <AnimatePresence>
          {showLogin && <Login onClose={closeAuth} initialMode="login" />}
        </AnimatePresence>
      </>
    );
  }

  // Banned user — hard block, force sign-out
  if (user && userStatus === "banned") {
    return (
      <div className="fixed inset-0 z-[9999] bg-base flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-red-500/15 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-9 h-9 text-red-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-3">Account Banned</h1>
          <p className="text-white/50 text-sm leading-relaxed mb-6">
            Your account has been permanently banned for violating our terms of service. If you believe this is a mistake, contact support.
          </p>
          <button
            onClick={() => signOut(auth)}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all"
          >
            Sign Out
          </button>
        </motion.div>
      </div>
    );
  }

  // Suspended user — timed notice, force sign-out
  if (user && userStatus === "suspended") {
    return (
      <div className="fixed inset-0 z-[9999] bg-base flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-yellow-500/15 border border-yellow-500/20 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-9 h-9 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-3">Account Suspended</h1>
          <p className="text-white/50 text-sm leading-relaxed mb-6">
            Your account has been temporarily suspended. Please contact support for more information or to appeal this decision.
          </p>
          <button
            onClick={() => signOut(auth)}
            className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-black rounded-xl font-bold text-sm transition-all"
          >
            Sign Out
          </button>
        </motion.div>
      </div>
    );
  }

  // Deactivated user — inform and sign out
  if (user && userStatus === "deactivated") {
    return (
      <div className="fixed inset-0 z-[9999] bg-base flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-white/10 border border-border-base flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-9 h-9 text-white/40" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-3">Account Deactivated</h1>
          <p className="text-white/50 text-sm leading-relaxed mb-6">
            Your account has been deactivated. Contact support to reactivate it.
          </p>
          <button
            onClick={() => signOut(auth)}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition-all"
          >
            Sign Out
          </button>
        </motion.div>
      </div>
    );
  }

  // Projects / Dashboard view (accessible at /projects)
  const DashboardView = selectedProjectId ? (
    <ProjectIDEWrapper projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
  ) : (
    <div className="min-h-screen bg-base text-white flex flex-col">
      <Navbar />
      <div className="flex-1 pb-16 md:pb-0">
        <Dashboard onSelectProject={setSelectedProjectId} />
      </div>
      <Footer />
      <MobileBottomNav />
    </div>
  );

  // Helper: returns true if the given path prefix is under per-page maintenance
  const isPageMaintenance = (pathPrefix: string): boolean => {
    if (!maintenance || userRole === "admin") return false;
    return (maintenance.pages ?? []).some((p) => pathPrefix.startsWith(p));
  };

  // Wrap a page element with a per-page maintenance screen if needed
  const withPageMaintenance = (pathPrefix: string, element: React.ReactNode): React.ReactNode => {
    if (isPageMaintenance(pathPrefix)) {
      return <PageMaintenanceBanner banner={maintenance?.banner} />;
    }
    return element;
  };

  return (
    <>
      <Toaster position="top-right" richColors theme="dark" />
      <OfflineGame />
      <ConfigGuard>
        <ScrollToTop />
        <RouteTracker user={user} />
        <SwipeNavigation />
        <AnimatePresence mode="wait">
          <React.Suspense fallback={<PremiumLoader mode="lightweight" message="Loading Workspace..." />}><Routes>
            <Route path="/sso-callback" element={<SSOCallback />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/cookies" element={<CookiePolicyPage />} />
            <Route path="/acceptable-use" element={<AcceptableUsePage />} />
            <Route path="/copyright" element={<CopyrightPage />} />
            <Route path="/marketplace" element={withPageMaintenance("/marketplace", <MarketplacePage />)} />
            <Route path="/templates" element={<Navigate to="/marketplace" replace />} />
            <Route path="/templates/:templateId" element={withPageMaintenance("/templates", <TemplatePreviewPage />)} />
            <Route path="/project/:projectId" element={withPageMaintenance("/project", <ProjectView />)} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/new" element={withPageMaintenance("/new", <NewProjectPage />)} />
            <Route path="/docs" element={withPageMaintenance("/docs", <DocsPage />)} />
            <Route path="/settings" element={withPageMaintenance("/settings", <SettingsPage />)} />
            <Route path="/theme-studio" element={withPageMaintenance("/theme-studio", <ThemeStudio />)} />
            <Route path="/search" element={withPageMaintenance("/search", <SearchPage />)} />
            <Route path="/explore" element={withPageMaintenance("/explore", <ExplorePage />)} />
            <Route path="/org/:slug" element={withPageMaintenance("/org", <OrgPage />)} />
            <Route path="/org/:slug/chat" element={withPageMaintenance("/org", <OrgChatPage />)} />
            <Route path="/orgs" element={withPageMaintenance("/orgs", <OrgsPage />)} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/learn" element={withPageMaintenance("/learn", <LearnPage />)} />
            <Route path="/learn/:topicId" element={withPageMaintenance("/learn", <LearnTopicPage />)} />
            <Route path="/learn/:topicId/:lessonId" element={withPageMaintenance("/learn", <LearnLessonPage />)} />
            <Route path="/learn/l/:slug" element={withPageMaintenance("/learn", <LearnDynamicLessonPage />)} />
            <Route path="/communities" element={withPageMaintenance("/communities", <CommunitiesPage />)} />
            <Route path="/communities/:slug" element={<CommunitySlugRedirect />} />
            <Route path="/communities/:slug/chat" element={<CommunitySlugRedirect chat />} />
            <Route path="/c/:slug" element={withPageMaintenance("/communities", <CommunityPage />)} />
            <Route path="/c/:slug/chat" element={withPageMaintenance("/communities", <CommunityChatPage />)} />

            <Route path="/events" element={withPageMaintenance("/events", <EventsPage />)} />
            <Route path="/events/create" element={withPageMaintenance("/events", <CreateEventPage />)} />
            <Route path="/events/:slug" element={withPageMaintenance("/events", <EventPage />)} />
            <Route path="/speakers" element={withPageMaintenance("/speakers", <SpeakersPage />)} />
            <Route path="/speakers/:slug" element={withPageMaintenance("/speakers", <SpeakerPage />)} />
            <Route path="/not-found" element={<NotFoundPage />} />
            <Route path="/@:username" element={withPageMaintenance("/u", <AtUsernameRoute />)} />
            <Route path="/@:username/:projectSlug" element={withPageMaintenance("/u", <ProjectPreview />)} />
            <Route path="/projects/:username/:projectSlug" element={withPageMaintenance("/projects", <LegacyProjectRedirect />)} />
            <Route path="/u/:username" element={withPageMaintenance("/u", <LegacyPortfolioRedirect />)} />
            <Route path="/u/:username/:projectSlug" element={withPageMaintenance("/u", <LegacyPortfolioRedirect />)} />
            {/* /projects — full dashboard & project management */}
            <Route
              path="/projects"
              element={user ? withPageMaintenance("/projects", DashboardView) : (
                <>
                  <Home setShowLogin={setShowLogin} setShowSignup={setShowSignup} />
                  <AnimatePresence>
                    {showLogin && <Login onClose={closeAuth} initialMode="login" />}
                    {showSignup && <Login onClose={closeAuth} initialMode="signup" />}
                  </AnimatePresence>
                </>
              )}
            />
            {/* / — feed-first home for authenticated users, landing page for guests */}
            <Route
              path="/"
              element={
                !user ? (
                  <>
                    <Home setShowLogin={setShowLogin} setShowSignup={setShowSignup} />
                    <AnimatePresence>
                      {showLogin && <Login onClose={closeAuth} initialMode="login" />}
                      {showSignup && <Login onClose={closeAuth} initialMode="signup" />}
                    </AnimatePresence>
                  </>
                ) : selectedProjectId ? (
                  <ProjectIDEWrapper projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
                ) : (
                  <FeedHome
                    onOpenProject={setSelectedProjectId}
                    onShowLogin={() => setShowLogin(true)}
                  />
                )
              }
            />
            {/* 404 catch-all */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes></React.Suspense>
        </AnimatePresence>
        <CommandPalette />
      </ConfigGuard>
    </>
  );
}
