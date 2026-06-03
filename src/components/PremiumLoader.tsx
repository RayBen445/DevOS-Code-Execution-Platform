import React from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { cn } from "../lib/utils";

interface PremiumLoaderProps {
  className?: string;
  message?: string;
  fullScreen?: boolean;
}

export default function PremiumLoader({ className, message = "Loading", fullScreen = false }: PremiumLoaderProps) {
  const containerClasses = cn(
    "flex flex-col items-center justify-center gap-6",
    fullScreen ? "h-screen w-full bg-base fixed inset-0 z-50" : "w-full h-full min-h-[400px]",
    className
  );

  return (
    <div className={containerClasses}>
      <div className="relative flex items-center justify-center">
        {/* Ambient Glow */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-32 h-32 bg-blue-500/20 rounded-full blur-[40px]"
        />

        {/* Outer Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute w-24 h-24 rounded-full border border-blue-500/20 border-t-blue-500/60 border-l-purple-500/60 border-b-transparent border-r-transparent"
        />

        {/* Inner Ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="absolute w-16 h-16 rounded-full border-2 border-transparent border-t-purple-500/80 border-b-blue-500/80"
        />

        {/* Core Icon */}
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)] backdrop-blur-xl"
        >
          <Zap className="w-6 h-6 text-blue-400 fill-blue-400/20" />
        </motion.div>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="flex items-center gap-1 text-sm font-bold tracking-[0.2em] uppercase text-white/50">
            {message}
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1] }}
            >
              .
            </motion.span>
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1], delay: 0.2 }}
            >
              .
            </motion.span>
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1], delay: 0.4 }}
            >
              .
            </motion.span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
