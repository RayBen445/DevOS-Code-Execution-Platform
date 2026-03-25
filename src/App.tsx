import { useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./lib/firebase";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import IDE from "./components/IDE";
import Login from "./components/Login";
import Home from "./components/Home";
import PrivacyTerms from "./pages/PrivacyTerms";
import Portfolio from "./pages/Portfolio";
import ScrollToTop from "./components/ScrollToTop";
import { Zap } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Routes, Route } from "react-router-dom";

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Zap className="w-8 h-8 text-blue-500 animate-pulse" />
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/privacy" element={<PrivacyTerms />} />
          <Route path="/terms" element={<PrivacyTerms />} />
          <Route path="/u/:username" element={<Portfolio />} />
          <Route path="/" element={
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
              <div className="min-h-screen bg-[#0a0a0a] text-white">
                <Navbar />
                <Dashboard onSelectProject={setSelectedProjectId} />
              </div>
            )
          } />
        </Routes>
      </AnimatePresence>
    </>
  );
}
