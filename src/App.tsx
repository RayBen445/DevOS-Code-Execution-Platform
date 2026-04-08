import React, { useState, useEffect, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./lib/firebase";
import { initializeUser, updateStreak } from "./lib/userService";
import { getMaintenanceConfig, MaintenanceConfig } from "./lib/creditsService";
import { useUITheme } from "./hooks/useUITheme";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import IDE from "./components/IDE";
import Login from "./components/Login";
import Home from "./components/Home";
import Footer from "./components/Footer";
import FeedHome from "./components/FeedHome";
import MobileBottomNav from "./components/MobileBottomNav";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import CookiePolicyPage from "./pages/CookiePolicyPage";
import AcceptableUsePage from "./pages/AcceptableUsePage";
import CopyrightPage from "./pages/CopyrightPage";
import Portfolio from "./pages/Portfolio";
import ProjectPreview from "./pages/ProjectPreview";
import ProjectView from "./pages/ProjectView";
import TemplatePage from "./pages/TemplatePage";
import TemplatePreviewPage from "./pages/TemplatePreviewPage";
import AdminDashboard from "./pages/AdminDashboard";
import StatusPage from "./pages/StatusPage";
import DocsPage from "./pages/DocsPage";
import SettingsPage from "./pages/SettingsPage";
import SearchPage from "./pages/SearchPage";
import ExplorePage from "./pages/ExplorePage";
import ScrollToTop from "./components/ScrollToTop";
import ConfigGuard from "./components/ConfigGuard";
import MaintenancePage from "./components/MaintenancePage";
import PageMaintenanceBanner from "./components/PageMaintenanceBanner";
import OrgPage from "./pages/OrgPage";
import OrgsPage from "./pages/OrgsPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import BotsPage from "./pages/BotsPage";
import NotFoundPage from "./pages/NotFoundPage";
import SubdomainRouter from "./components/SubdomainRouter";
import { Zap, ShieldAlert } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "./lib/firebase";
import { signOut } from "firebase/auth";
import { initializeDefaultBots, emitBotEventWithToast } from "./lib/botEngine";

import { Toaster } from "sonner";

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

export default function App() {
  // Subdomain routing: *.devos.name.ng → render SubdomainRouter without full app chrome
  const hostname = window.location.hostname;
  const hostParts = hostname.split(".");
  // devos.name.ng is 3 parts; a subdomain makes it 4+ parts
  if (hostParts.length >= 4 && hostname.endsWith(".devos.name.ng")) {
    const subdomain = hostParts[0];
    return <SubdomainRouter subdomain={subdomain} />;
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
    return () => unsub();
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
    const hostname = window.location.hostname;
    if (hostname.includes("devos.zone.id")) {
      const parts = hostname.split(".");
      if (parts.length === 5) {
        const [projectSlug, username] = parts;
        window.location.href = `${window.location.origin}/u/${username}/${projectSlug}`;
      } else if (parts.length === 4) {
        const [username] = parts;
        window.location.href = `${window.location.origin}/u/${username}`;
      }
    }
  }, []);

  if (loading || maintenance === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Zap className="w-8 h-8 text-blue-500 animate-pulse" />
      </div>
    );
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
      <div className="fixed inset-0 z-[9999] bg-[#0B0F17] flex items-center justify-center p-6">
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
      <div className="fixed inset-0 z-[9999] bg-[#0B0F17] flex items-center justify-center p-6">
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
      <div className="fixed inset-0 z-[9999] bg-[#0B0F17] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mx-auto mb-6">
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
    <IDE projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
  ) : (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
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
      <ConfigGuard>
        <ScrollToTop />
        <RouteTracker user={user} />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/cookies" element={<CookiePolicyPage />} />
            <Route path="/acceptable-use" element={<AcceptableUsePage />} />
            <Route path="/copyright" element={<CopyrightPage />} />
            <Route path="/templates" element={withPageMaintenance("/templates", <TemplatePage />)} />
            <Route path="/templates/:templateId" element={withPageMaintenance("/templates", <TemplatePreviewPage />)} />
            <Route path="/project/:projectId" element={withPageMaintenance("/project", <ProjectView />)} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/docs" element={withPageMaintenance("/docs", <DocsPage />)} />
            <Route path="/settings" element={withPageMaintenance("/settings", <SettingsPage />)} />
            <Route path="/search" element={withPageMaintenance("/search", <SearchPage />)} />
            <Route path="/explore" element={withPageMaintenance("/explore", <ExplorePage />)} />
            <Route path="/org/:slug" element={withPageMaintenance("/org", <OrgPage />)} />
            <Route path="/orgs" element={withPageMaintenance("/orgs", <OrgsPage />)} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/bots" element={withPageMaintenance("/bots", <BotsPage />)} />
            <Route path="/not-found" element={<NotFoundPage />} />
            <Route path="/u/:username" element={withPageMaintenance("/u", <Portfolio />)} />
            <Route path="/u/:username/:projectSlug" element={withPageMaintenance("/u", <ProjectPreview />)} />
            {/* /projects — full dashboard & project management */}
            <Route
              path="/projects"
              element={user ? DashboardView : (
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
                  <IDE projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
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
          </Routes>
        </AnimatePresence>
      </ConfigGuard>
    </>
  );
}
