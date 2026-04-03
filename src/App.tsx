import { useState, useEffect, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./lib/firebase";
import { initializeUser, updateStreak } from "./lib/userService";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import IDE from "./components/IDE";
import Login from "./components/Login";
import Home from "./components/Home";
import Footer from "./components/Footer";
import FeedHome from "./components/FeedHome";
import MobileBottomNav from "./components/MobileBottomNav";
import PrivacyTerms from "./pages/PrivacyTerms";
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
import { Zap } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";

import { Toaster } from "sonner";

/* ─── Paths excluded from tracking (privacy-sensitive or utility) ─── */
const EXCLUDED_ROUTES = ["/admin", "/settings", "/privacy", "/terms", "/docs", "/status"];
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
  const [user, loading] = useAuthState(auth);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    // Restore last-opened project for authenticated sessions.
    // Cleared when the user explicitly closes the project (onBack).
    try { return sessionStorage.getItem("devos_active_project") ?? null; } catch { return null; }
  });
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

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

  useEffect(() => {
    if (user) {
      initializeUser(user);
      updateStreak(user.uid).catch(() => {}); // fire-and-forget
    } else {
      // Clear the project session when the user logs out
      try { sessionStorage.removeItem("devos_active_project"); } catch { /* noop */ }
      setSelectedProjectId(null);
    }
  }, [user]);

  // Capture ?ref= query param on first visit and persist to sessionStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && !sessionStorage.getItem("devos_pending_ref")) {
      sessionStorage.setItem("devos_pending_ref", ref);
    }
  }, []);

  // Handle subdomain redirects for backward compatibility
  useEffect(() => {
    const hostname = window.location.hostname;
    if (hostname.includes("devos.zone.id")) {
      const parts = hostname.split(".");
      // Format: projectSlug.username.devos.zone.id (5 parts)
      // Format: username.devos.zone.id (4 parts)
      if (parts.length === 5) {
        const [projectSlug, username] = parts;
        window.location.href = `${window.location.origin}/u/${username}/${projectSlug}`;
      } else if (parts.length === 4) {
        const [username] = parts;
        window.location.href = `${window.location.origin}/u/${username}`;
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Zap className="w-8 h-8 text-blue-500 animate-pulse" />
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

  return (
    <>
      <Toaster position="top-right" richColors theme="dark" />
      <ConfigGuard>
        <ScrollToTop />
        <RouteTracker user={user} />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/privacy" element={<PrivacyTerms />} />
            <Route path="/terms" element={<PrivacyTerms />} />
            <Route path="/templates" element={<TemplatePage />} />
            <Route path="/templates/:templateId" element={<TemplatePreviewPage />} />
            <Route path="/project/:projectId" element={<ProjectView />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/u/:username" element={<Portfolio />} />
            <Route path="/u/:username/:projectSlug" element={<ProjectPreview />} />
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
          </Routes>
        </AnimatePresence>
      </ConfigGuard>
    </>
  );
}

