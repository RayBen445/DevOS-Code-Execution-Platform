import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DevosLogo from "./DevosLogo";
import { cn } from "../lib/utils";

interface PremiumLoaderProps {
  className?: string;
  message?: string;
  fullScreen?: boolean;
  mode?: "full" | "lightweight";
}

export default function PremiumLoader({ 
  className, 
  message, 
  fullScreen = false,
  mode = "full" 
}: PremiumLoaderProps) {
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    if (mode === "full") {
      const timer = setTimeout(() => setShowText(true), 2500); // Show text after logo flow and pulse
      return () => clearTimeout(timer);
    }
  }, [mode]);

  const containerClasses = cn(
    "flex flex-col items-center justify-center gap-8",
    fullScreen ? "h-screen w-full bg-base fixed inset-0 z-50" : "w-full h-full min-h-[300px]",
    className
  );

  return (
    <div className={containerClasses}>
      <div className="relative flex flex-col items-center justify-center">
        {/* Ambient Glow */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-48 h-48 bg-blue-500/20 rounded-full blur-[60px]"
        />

        {/* The Logo */}
        <div className="relative z-10 w-24 h-24 sm:w-32 sm:h-32">
          <DevosLogo 
            animateStartup={mode === "full"} 
            animateFlow={mode === "lightweight"} 
            className="w-full h-full drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
          />
        </div>

        {/* Text Sequence for Full Mode */}
        <AnimatePresence>
          {mode === "full" && showText && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center gap-3 mt-8 absolute top-full w-[300px]"
            >
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md">
                DevOS
              </h2>
              <p className="text-sm sm:text-base font-medium tracking-[0.2em] uppercase text-blue-400/80 bg-clip-text text-center">
                Build. Automate. Deploy.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lightweight Mode Message */}
        {mode === "lightweight" && message && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-[120%] whitespace-nowrap flex items-center gap-1 text-xs font-bold tracking-[0.2em] uppercase text-white/40"
          >
            {message}
            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1] }}>.</motion.span>
            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1], delay: 0.2 }}>.</motion.span>
            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1], delay: 0.4 }}>.</motion.span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
