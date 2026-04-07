import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Code2, Home, ArrowLeft, Search } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useSEO } from "../hooks/useSEO";

export default function NotFoundPage() {
  useSEO({ title: "404 — Page Not Found | DevOS" });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="text-center max-w-lg">
          {/* Glowing 404 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="relative mb-8 inline-block"
          >
            <div className="absolute inset-0 bg-blue-600/20 rounded-full blur-[60px]" />
            <div className="relative flex items-center justify-center w-32 h-32 mx-auto">
              <span className="text-[80px] font-black text-white/5 select-none absolute">404</span>
              <div className="w-20 h-20 bg-[#111] border border-white/10 rounded-3xl flex items-center justify-center shadow-2xl">
                <Code2 className="w-9 h-9 text-blue-400" />
              </div>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-4xl font-black tracking-tight mb-3"
          >
            Page not found
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-white/40 text-sm leading-relaxed mb-10 max-w-sm mx-auto"
          >
            Looks like this page doesn't exist — maybe the URL changed, the page was removed, or
            you followed a broken link.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              to="/"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-blue-600/20"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 rounded-xl font-bold text-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <Link
              to="/search"
              className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 rounded-xl font-bold text-sm transition-all"
            >
              <Search className="w-4 h-4" />
              Search
            </Link>
          </motion.div>

          {/* Quick links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 pt-8 border-t border-white/[0.06]"
          >
            <p className="text-xs text-white/25 uppercase tracking-widest font-bold mb-4">
              Helpful links
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              {[
                { to: "/explore", label: "Explore" },
                { to: "/templates", label: "Templates" },
                { to: "/communities", label: "Communities" },
                { to: "/orgs", label: "Organizations" },
                { to: "/docs", label: "Docs" },
                { to: "/status", label: "Status" },
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
