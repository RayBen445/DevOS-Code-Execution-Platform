import { motion, useAnimation, Variants } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "../lib/utils";

interface DevosLogoProps {
  className?: string;
  /** If true, the full multi-stage startup animation plays on mount */
  animateStartup?: boolean;
  /** If true, a continuous lightweight flow animation plays */
  animateFlow?: boolean;
  /** If true, adds a subtle hover pulse effect */
  interactive?: boolean;
}

export default function DevosLogo({
  className = "",
  animateStartup = false,
  animateFlow = false,
  interactive = false,
}: DevosLogoProps) {
  // We define standard paths
  const paths = [
    "M360 280 H680 A180 180 0 0 1 860 460", // Top curve
    "M360 440 H620 A120 120 0 0 1 740 560 A120 120 0 0 1 620 680 H360", // Inner loop
    "M180 560 H470", // Middle straight
    "M360 760 H680 A180 180 0 0 0 860 580", // Bottom curve
  ];

  // Base stroke/fill style
  const gradientUrl = "url(#devos-g)";
  const brightGradientUrl = "url(#devos-g-bright)";

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 1024"
      className={cn("overflow-visible", className)}
      whileHover={interactive ? { scale: 1.05 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <defs>
        {/* Standard Gradient */}
        <linearGradient id="devos-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        {/* Bright/Illuminated Gradient for data flow */}
        <linearGradient id="devos-g-bright" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        
        {/* Glow Filter */}
        <filter id="devos-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="15" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 
        Base Layer: The actual logo structure 
        We make it slightly dim initially if doing the startup animation 
      */}
      <motion.g
        initial={animateStartup ? { opacity: 0 } : { opacity: 1 }}
        animate={animateStartup ? { opacity: [0, 0.3, 1] } : { opacity: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
      >
        <circle cx="220" cy="360" r="28" fill={gradientUrl} />
        <circle cx="220" cy="760" r="28" fill={gradientUrl} />
        
        {/* Center Node */}
        <motion.circle 
          cx="560" cy="560" r="52" 
          fill={gradientUrl}
          animate={
            animateStartup 
              ? { scale: [1, 1.2, 1], filter: ["none", "url(#devos-glow)", "none"] } 
              : interactive ? { scale: [1, 1.05, 1] } : {}
          }
          transition={{
            duration: animateStartup ? 1.5 : 2,
            delay: animateStartup ? 1.5 : 0,
            repeat: interactive ? Infinity : 0,
            ease: "easeInOut"
          }}
        />

        {paths.map((d, i) => (
          <path
            key={`base-${i}`}
            d={d}
            fill="none"
            stroke={gradientUrl}
            strokeWidth="60"
            strokeLinecap="round"
          />
        ))}
      </motion.g>

      {/* 
        Flow Overlay Layer: The "Data Particles" 
        Animated strokes on top of the base paths
      */}
      {(animateStartup || animateFlow) && (
        <g filter="url(#devos-glow)">
          {paths.map((d, i) => (
            <motion.path
              key={`flow-${i}`}
              d={d}
              fill="none"
              stroke={brightGradientUrl}
              strokeWidth="60"
              strokeLinecap="round"
              initial={{ pathLength: 0, pathOffset: 1, opacity: 0 }}
              animate={{
                pathLength: [0, 0.2, 0],
                pathOffset: [1, 0.5, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: animateStartup ? 2.5 : 2,
                ease: "easeInOut",
                delay: animateStartup ? 0.5 + (i * 0.2) : i * 0.15,
                repeat: animateFlow ? Infinity : 0,
                repeatDelay: 1
              }}
            />
          ))}
        </g>
      )}
    </motion.svg>
  );
}
