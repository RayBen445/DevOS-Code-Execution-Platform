import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Code, Globe, Share2, X, ChevronRight, Check, Rocket } from "lucide-react";
import { cn } from "../lib/utils";

interface QuickStartModalProps {
  onClose: () => void;
  onCreateProject: () => void;
}

export default function QuickStartModal({ onClose, onCreateProject }: QuickStartModalProps) {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: "create",
      icon: Plus,
      title: "Create your first project",
      desc: "Start from scratch or pick a beautiful template to kick off your vision.",
      actionLabel: "Open Creator",
      action: () => {
        onClose();
        onCreateProject();
      },
      color: "blue",
    },
    {
      id: "code",
      icon: Code,
      title: "Write your code",
      desc: "Use our powerful built-in editor with real-time preview, intelligent autocomplete, and a full terminal.",
      actionLabel: "Next Step",
      action: () => setActiveStep(2),
      color: "purple",
    },
    {
      id: "deploy",
      icon: Globe,
      title: "Deploy instantly",
      desc: "Get a live, shareable URL for your project with zero configuration. It just works.",
      actionLabel: "Next Step",
      action: () => setActiveStep(3),
      color: "emerald",
    },
    {
      id: "share",
      icon: Share2,
      title: "Share with the world",
      desc: "Show off your work to the community, get feedback, and build your developer portfolio.",
      actionLabel: "Ready to Start",
      action: () => onClose(),
      color: "orange",
    },
  ];

  const currentStep = steps[activeStep];
  const StepIcon = currentStep.icon;

  const colorConfig: Record<string, { bg: string; border: string; text: string; from: string; to: string }> = {
    blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", from: "from-blue-600", to: "to-blue-500" },
    purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", from: "from-purple-600", to: "to-purple-500" },
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", from: "from-emerald-600", to: "to-emerald-500" },
    orange: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", from: "from-orange-600", to: "to-orange-500" },
  };

  const currentColors = colorConfig[currentStep.color];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-4xl bg-[#0a0a0b] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row z-10"
      >
        {/* Left Side: Navigation / Stepper */}
        <div className="w-full md:w-1/3 bg-white/[0.02] border-b md:border-b-0 md:border-r border-white/5 p-6 md:p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
              <Rocket className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Quick Start</h2>
          </div>

          <div className="flex flex-row md:flex-col gap-2 md:gap-4 flex-1">
            {steps.map((step, idx) => {
              const isActive = activeStep === idx;
              const isPast = activeStep > idx;
              const Icon = step.icon;

              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(idx)}
                  className={cn(
                    "flex items-center gap-3 md:p-3 p-2 rounded-xl text-left transition-all relative overflow-hidden group flex-1 md:flex-none",
                    isActive
                      ? "bg-white/10 shadow-lg"
                      : "hover:bg-white/5"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 border-2 border-white/20 rounded-xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <div
                    className={cn(
                      "w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors z-10",
                      isActive ? "bg-white text-black" : isPast ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-white/40 group-hover:text-white/60"
                    )}
                  >
                    {isPast ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : <Icon className="w-4 h-4 md:w-5 md:h-5" />}
                  </div>
                  <span
                    className={cn(
                      "font-bold text-sm z-10 hidden md:block",
                      isActive ? "text-white" : isPast ? "text-white/70" : "text-white/40 group-hover:text-white/60"
                    )}
                  >
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Content */}
        <div className="w-full md:w-2/3 p-6 md:p-12 flex flex-col justify-center relative min-h-[300px] md:min-h-[400px]">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors z-20"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center text-center max-w-sm mx-auto w-full"
            >
              <div
                className={cn(
                  "w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-2xl border relative group",
                  currentColors.bg,
                  currentColors.border
                )}
              >
                <div className={cn("absolute inset-0 rounded-3xl bg-gradient-to-br opacity-20 group-hover:opacity-40 transition-opacity", currentColors.from, currentColors.to)} />
                <StepIcon className={cn("w-12 h-12 relative z-10", currentColors.text)} />
              </div>

              <h3 className="text-3xl font-black text-white mb-4 tracking-tight">{currentStep.title}</h3>
              <p className="text-white/60 text-base leading-relaxed mb-10">
                {currentStep.desc}
              </p>

              <button
                onClick={currentStep.action}
                className={cn(
                  "flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-white transition-all hover:scale-105 active:scale-95 shadow-xl bg-gradient-to-r",
                  currentColors.from,
                  currentColors.to
                )}
              >
                {currentStep.actionLabel}
                {activeStep < steps.length - 1 && <ChevronRight className="w-5 h-5" />}
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
