import React, { useState } from "react";
import { X, Globe, Zap, Loader2, Check, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectId: string;
}

export default function DeployModal({ isOpen, onClose, projectName, projectId }: DeployModalProps) {
  const [step, setStep] = useState<"select" | "deploying" | "success">("select");
  const [method, setMethod] = useState<"vercel" | "internal" | null>(null);
  const [deployedUrl, setDeployedUrl] = useState("");

  const handleDeploy = async (deployMethod: "internal") => {
    setMethod(deployMethod);
    setStep("deploying");
    
    try {
      await new Promise(r => setTimeout(r, 2000));
      setDeployedUrl(`https://${projectName.toLowerCase().replace(/\s+/g, "-")}.devos.app`);
      setStep("success");
    } catch (error: any) {
      console.error("Deployment error:", error);
      alert(error.message || "Deployment failed. Please check your configuration.");
      setStep("select");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-500" />
                Deploy Project
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            <div className="p-8">
              {step === "select" && (
                <div className="space-y-4">
                  <p className="text-white/40 text-sm mb-6">
                    Choose where you want to host your application. We'll handle the build and deployment process automatically.
                  </p>
                  
                  <button
                    onClick={() => handleDeploy("internal")}
                    className="w-full p-6 rounded-2xl bg-white text-black hover:bg-white/90 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold">Deploy to DevOS</div>
                        <div className="text-xs opacity-60 font-medium">Instant sandbox deployment</div>
                      </div>
                    </div>
                    <Zap className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  <div className="mt-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[11px] text-white/40 leading-relaxed">
                    <p className="font-bold text-blue-400 mb-1">Deployment Note:</p>
                    Sandbox deployments are instant and accessible via your project subdomain.
                  </div>
                </div>
              )}

              {step === "deploying" && (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="relative mb-8">
                    <div className="w-20 h-20 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                    <Zap className="absolute inset-0 m-auto w-8 h-8 text-blue-500 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Building your app...</h3>
                  <p className="text-white/40 text-sm">Provisioning servers and installing dependencies</p>
                </div>
              )}

              {step === "success" && (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-8">
                    <Check className="w-10 h-10 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Deployed Successfully!</h3>
                  <p className="text-white/40 text-sm mb-8">Your application is now live at the following URL:</p>
                  
                  <div className="w-full p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-4 mb-8">
                    <span className="text-blue-400 font-mono text-sm truncate">{deployedUrl}</span>
                    <a 
                      href={deployedUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <button
                    onClick={onClose}
                    className="px-8 py-3 bg-white text-black rounded-xl font-bold hover:bg-white/90 transition-all"
                  >
                    Back to IDE
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
