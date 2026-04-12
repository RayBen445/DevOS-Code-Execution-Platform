import React, { useState, useEffect, useRef } from "react";
import { X, Globe, Zap, Check, ExternalLink, Copy, CheckCircle2, Rocket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { db, auth } from "../lib/firebase";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { deductCredits, CREDIT_COSTS } from "../lib/creditsService";
import { emitBotEventWithToast } from "../lib/botEngine";
import { notifyDeployment } from "../lib/notificationService";
import { createDeployment } from "../lib/deploymentService";
import { trackActivity } from "../lib/activityService";
import { logAudit } from "../lib/auditService";
import { detectProject } from "../lib/detectionService";

import { FileData } from "../types";

const SPINNER_FRAMES = ["⠄", "⡀", "⡈", "⡐", "⡠", "⣀", "⣄", "⣤", "⣦", "⣶", "⣿", "⡿", "⠿", "⠟", "⠛", "⠉"];
const DEPLOY_STEPS = [
  "Validating project...",
  "Building files...",
  "Optimizing assets...",
  "Generating output...",
];

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectId: string;
  files: FileData[];
  onDeployed?: () => void;
}

export default function DeployModal({ isOpen, onClose, projectName, projectId, files, onDeployed }: DeployModalProps) {
  const [step, setStep] = useState<"select" | "entry-selection" | "deploying" | "success">("select");
  const [method, setMethod] = useState<"vercel" | "internal" | null>(null);
  const [deployedUrl, setDeployedUrl] = useState("");
  const [isCopying, setIsCopying] = useState(false);
  const [entryFiles, setEntryFiles] = useState<string[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<string>("");
  const [completedSteps, setCompletedSteps] = useState<number>(-1);
  const [spinnerFrame, setSpinnerFrame] = useState(0);
  const spinnerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step === "deploying") {
      setCompletedSteps(-1);
      setSpinnerFrame(0);
      spinnerRef.current = setInterval(() => setSpinnerFrame(f => (f + 1) % SPINNER_FRAMES.length), 80);
    } else {
      if (spinnerRef.current) clearInterval(spinnerRef.current);
    }
    return () => { if (spinnerRef.current) clearInterval(spinnerRef.current); };
  }, [step]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(deployedUrl);
      setIsCopying(true);
      toast.success("URL copied to clipboard");
      setTimeout(() => setIsCopying(false), 2000);
    } catch (err) {
      toast.error("Failed to copy URL");
    }
  };

  const startDeployFlow = async (deployMethod: "internal") => {
    setMethod(deployMethod);
    
    // Apply .devignore filtering
    const devignoreFile = files.find(f => f.name === ".devignore");
    let deployableFiles = files;
    if (devignoreFile) {
      const patterns = devignoreFile.content
        .split("\n")
        .map(l => l.trim())
        .filter(l => l && !l.startsWith("#"));
      deployableFiles = files.filter(f => {
        return !patterns.some(pat => {
          if (pat.startsWith("*.")) {
            return f.name.endsWith(pat.slice(1));
          }
          return f.path === pat || f.path.startsWith(pat + "/") || f.name === pat;
        });
      });
    }

    // Scan for index.html files
    const htmlFiles = deployableFiles.filter(f => f.name.toLowerCase() === "index.html").map(f => f.path);
    
    if (htmlFiles.length === 0) {
      toast.error("No index.html found. Please create an index.html file to deploy.");
      return;
    }

    if (htmlFiles.length === 1) {
      handleDeploy(deployMethod, htmlFiles[0]);
    } else {
      setEntryFiles(htmlFiles);
      // Try to find previous entry file or default to root index.html
      try {
        const projectDoc = await getDoc(doc(db, "projects", projectId));
        const prevEntry = projectDoc.data()?.entryFile;
        if (prevEntry && htmlFiles.includes(prevEntry)) {
          setSelectedEntry(prevEntry);
        } else {
          setSelectedEntry(htmlFiles.find(f => f === "index.html") || htmlFiles[0]);
        }
      } catch (e) {
        setSelectedEntry(htmlFiles[0]);
      }
      setStep("entry-selection");
    }
  };

  const handleDeploy = async (deployMethod: "internal", entryFile: string) => {
    setStep("deploying");
    setCompletedSteps(-1);

    // Animate build steps in parallel with the actual deploy work
    const animateSteps = async () => {
      for (let i = 0; i < DEPLOY_STEPS.length; i++) {
        await new Promise(r => setTimeout(r, 700));
        setCompletedSteps(i);
      }
    };

    try {
      if (!auth.currentUser) throw new Error("Not authenticated");

      const [ok] = await Promise.all([
        deductCredits(auth.currentUser.uid, "deploy"),
        animateSteps(),
      ]);

      if (!ok) {
        toast.error(`Insufficient credits. Deploying costs ${CREDIT_COSTS.deploy} credits.`);
        setStep("select");
        return;
      }

      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const username = userDoc.exists() ? userDoc.data().username : null;
      
      if (!username) {
        throw new Error("Please set a username in Profile Settings before deploying.");
      }

      const projectDoc = await getDoc(doc(db, "projects", projectId));
      const projectData = projectDoc.data();
      
      const projectSlug = projectData?.projectSlug || `${projectName.toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).substring(2, 7)}`;
      // Canonical deploy URL: username subdomain on devos.name.ng
      const subdomainUrl = `https://${username.toLowerCase()}.devos.name.ng`;
      const url = `${subdomainUrl}/${projectSlug}`;
      
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, {
        projectSlug,
        deployUrl: url,
        liveUrl: url,
        title: projectName,
        ownerUsername: username,
        entryFile,
        isPublic: true,
        deployStatus: "success",
        lastDeployedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Record deployment in the deployments collection
      await createDeployment(projectId, auth.currentUser.uid, username, url);

      setDeployedUrl(url);
      setStep("success");
      toast.success("Your project is live!");
      notifyDeployment({ uid: auth.currentUser.uid, projectName, success: true, projectId }).catch(() => {});
      // Track deployment activity for the heatmap
      trackActivity(auth.currentUser.uid, "deploy", { projectId });
      // Audit log
      const det = detectProject(files);
      logAudit({
        userId: auth.currentUser.uid,
        action: "deploy_project",
        projectId,
        metadata: {
          framework: det.framework,
          buildCommand: det.buildCommand,
          outputDir: det.outputDir,
          status: "success",
          url,
        },
      });
      emitBotEventWithToast({
        name: "deploy.triggered",
        payload: { projectId, projectName, deployUrl: url, userId: auth.currentUser.uid },
      }).catch(() => {});
      onDeployed?.();
    } catch (error: any) {
      console.error("Deployment error:", error);
      toast.error(error.message || "Deployment failed");
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
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-[#0f0f0f] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-500/5 to-transparent">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-blue-500" />
                </div>
                Deploy Project
              </h2>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-white/5 rounded-full transition-all hover:rotate-90 duration-300"
              >
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            <div className="p-8">
              {step === "select" && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <p className="text-white/40 text-sm mb-6 leading-relaxed">
                    Choose where you want to host your application. We'll handle the build and deployment process automatically.
                  </p>
                  
                  <button
                    onClick={() => startDeployFlow("internal")}
                    className="w-full p-6 rounded-2xl bg-white text-black hover:bg-white/90 transition-all flex items-center justify-between group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Globe className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-lg">Deploy to DevOS</div>
                        <div className="text-xs opacity-60 font-medium">Instant sandbox deployment</div>
                      </div>
                    </div>
                    <Zap className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
                  </button>

                  <div className="mt-8 p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-[11px] text-white/40 leading-relaxed relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/20" />
                    <p className="font-bold text-blue-400 mb-1 flex items-center gap-2">
                      <Zap className="w-3 h-3" />
                      Deployment Note:
                    </p>
                    Sandbox deployments are instant and accessible via your project subdomain. Perfect for prototypes and sharing.
                  </div>
                </motion.div>
              )}

              {step === "entry-selection" && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-bold mb-2">Select Entry File</h3>
                    <p className="text-white/40 text-sm mb-6">
                      Multiple index.html files detected. Please select which one should be the root of your application.
                    </p>
                  </div>

                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                    {entryFiles.map((path) => (
                      <button
                        key={path}
                        onClick={() => setSelectedEntry(path)}
                        className={cn(
                          "w-full p-4 rounded-xl border transition-all flex items-center justify-between group",
                          selectedEntry === path
                            ? "bg-blue-600/10 border-blue-500 text-blue-400"
                            : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                        )}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <Globe className={cn("w-4 h-4", selectedEntry === path ? "text-blue-400" : "text-white/20")} />
                          <span className="truncate font-mono text-xs">{path}</span>
                        </div>
                        {selectedEntry === path && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setStep("select")}
                      className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => handleDeploy("internal", selectedEntry)}
                      disabled={!selectedEntry}
                      className="flex-1 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Confirm & Deploy
                    </button>
                  </div>
                </motion.div>
              )}

              {step === "deploying" && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 flex flex-col items-center justify-center text-center"
                >
                  <div className="relative mb-10">
                    <div className="w-24 h-24 rounded-full border-4 border-blue-500/10 border-t-blue-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Zap className="w-10 h-10 text-blue-500 animate-pulse" />
                    </div>
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-[-10px] rounded-full bg-blue-500/10 blur-xl"
                    />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                    Deploying your project...
                  </h3>
                  <p className="text-white/40 text-sm max-w-[240px]">
                    Provisioning edge servers and optimizing your assets
                  </p>
                  
                  <div className="mt-10 w-full max-w-[200px] h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2, ease: "easeInOut" }}
                      className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    />
                  </div>
                </motion.div>
              )}

              {step === "success" && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-6 flex flex-col items-center justify-center text-center"
                >
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                    className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mb-8 relative"
                  >
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                    <motion.div 
                      animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="absolute inset-0 rounded-full border-2 border-green-500/50"
                    />
                  </motion.div>
                  
                  <h3 className="text-3xl font-bold mb-3 tracking-tight flex items-center gap-3 justify-center">
                    <Rocket className="w-8 h-8 text-green-400" />
                    Your project is live!
                  </h3>
                  <p className="text-white/40 text-sm mb-10 max-w-[300px]">
                    Deployment successful. Your application is now accessible worldwide.
                  </p>
                  
                  <div className="w-full p-2 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3 mb-10 group">
                    <div className="flex-1 px-4 py-3 rounded-xl bg-white/5 font-mono text-sm text-blue-400 truncate text-left">
                      {deployedUrl}
                    </div>
                    <div className="flex items-center gap-2 pr-2">
                      <button 
                        onClick={handleCopy}
                        className="p-3 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all active:scale-90"
                        title="Copy URL"
                      >
                        {isCopying ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <a 
                        href={deployedUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-all active:scale-90 shadow-lg shadow-blue-600/20"
                        title="Open Project"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 w-full">
                    <button
                      onClick={onClose}
                      className="flex-1 px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/10 transition-all active:scale-95"
                    >
                      Back to IDE
                    </button>
                    <a
                      href={deployedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all active:scale-95 shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                      Open Live
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </motion.div>
              )}
            </div>
            
            <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-center gap-2">
              <Zap className="w-3 h-3 text-white/20" />
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Built with DevOS</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
