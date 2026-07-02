import { Wrench, Zap, LogIn, LogOut } from "lucide-react";
import { motion } from "framer-motion";

interface MaintenancePageProps {
  banner?: string;
  isAuthenticated?: boolean;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export default function MaintenancePage({ banner, isAuthenticated, onSignIn, onSignOut }: MaintenancePageProps) {
  return (
    <div className="fixed inset-0 z-[9999] bg-base flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 280 }}
        className="max-w-md w-full text-center max-h-[90vh] overflow-y-auto flex flex-col"
      >
        {/* Animated icon */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="absolute w-24 h-24 rounded-full bg-yellow-500/10 animate-ping" />
          <div className="relative w-20 h-20 rounded-2xl bg-yellow-500/15 border border-yellow-500/20 flex items-center justify-center">
            <Wrench className="w-9 h-9 text-yellow-400" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-blue-400" />
          <span className="text-sm font-bold text-blue-400 tracking-widest uppercase">DevOS</span>
        </div>

        <h1 className="text-3xl font-extrabold text-white mb-3">
          Under Maintenance
        </h1>

        <p className="text-white/50 leading-relaxed mb-6">
          {banner && banner.trim()
            ? banner
            : "We're making improvements to give you a better experience. We'll be back shortly."}
        </p>

        <div className="flex items-center justify-center gap-1.5 mt-8">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-yellow-400/60"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}
        </div>

        <p className="text-xs text-white/20 mt-6">
          Check back soon or follow our status page for updates.
        </p>

        {/* Auth actions */}
        <div className="mt-8 flex items-center justify-center gap-3">
          {isAuthenticated ? (
            <button
              onClick={onSignOut}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-border-base text-white/60 hover:text-white text-sm font-medium transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          ) : (
            <button
              onClick={onSignIn}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
