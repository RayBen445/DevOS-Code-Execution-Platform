import { Wrench, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import MobileBottomNav from "./MobileBottomNav";

interface PageMaintenanceBannerProps {
  banner?: string;
}

/**
 * Per-page maintenance screen. Unlike MaintenancePage (which blocks the whole
 * app), this renders inside the normal layout so the Navbar is still visible and
 * users can navigate to other pages freely.
 */
export default function PageMaintenanceBanner({ banner }: PageMaintenanceBannerProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-base text-white flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="max-w-md w-full text-center"
        >
          {/* Icon */}
          <div className="relative inline-flex items-center justify-center mb-8">
            <div className="absolute w-24 h-24 rounded-full bg-yellow-500/10 animate-ping" />
            <div className="relative w-20 h-20 rounded-2xl bg-yellow-500/15 border border-yellow-500/20 flex items-center justify-center">
              <Wrench className="w-9 h-9 text-yellow-400" />
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-white mb-3">Page Under Maintenance</h1>

          <p className="text-white/50 leading-relaxed mb-8">
            {banner && banner.trim()
              ? banner
              : "This page is temporarily unavailable while we make improvements. Other parts of DevOS are still accessible."}
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-border-base hover:border-border-base text-white/70 hover:text-white rounded-xl text-sm font-semibold transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all active:scale-95"
            >
              Go Home
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-10">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-2 h-2 rounded-full bg-yellow-400/60"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
              />
            ))}
          </div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
