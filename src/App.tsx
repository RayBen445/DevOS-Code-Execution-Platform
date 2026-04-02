import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./lib/firebase";
import { initializeUser } from "./lib/userService";
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
import TemplatePage from "./pages/TemplatePage";
import AdminDashboard from "./pages/AdminDashboard";
import StatusPage from "./pages/StatusPage";
import DocsPage from "./pages/DocsPage";
import SettingsPage from "./pages/SettingsPage";
import SearchPage from "./pages/SearchPage";
import ExplorePage from "./pages/ExplorePage";
import ScrollToTop from "./components/ScrollToTop";
import { Zap } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Routes, Route } from "react-router-dom";

import { Toaster } from "sonner";

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (user) {
      initializeUser(user);
    }
  }, [user]);

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
      <ScrollToTop />
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/privacy" element={<PrivacyTerms />} />
          <Route path="/terms" element={<PrivacyTerms />} />
          <Route path="/templates" element={<TemplatePage />} />
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
                <Home setShowLogin={setShowLogin} />
                <AnimatePresence>
                  {showLogin && <Login onClose={() => setShowLogin(false)} />}
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
                  <Home setShowLogin={setShowLogin} />
                  <AnimatePresence>
                    {showLogin && (
                      <Login onClose={() => setShowLogin(false)} />
                    )}
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
    </>
  );
}

