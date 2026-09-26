import React, { useEffect, useState, useRef } from "react";
import { Globe, RefreshCw, ExternalLink, Monitor, Smartphone, Tablet, Terminal, Zap, Loader2 } from "lucide-react";
import { FileData, Project } from "../types";
import { cn } from "../lib/utils";
import { db, auth } from "../lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { buildProjectUrl, buildPortfolioUrl } from "../lib/brand";

type DeviceMode = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTHS: Record<DeviceMode, string> = {
  desktop: "100%",
  tablet:  "768px",
  mobile:  "390px",
};

interface PreviewPanelProps {
  projectId: string;
  files: FileData[];
  entryFile?: string;
  saveKey?: number;
  "data-tour"?: string;
}

export default function PreviewPanel({ projectId, files, entryFile, saveKey }: PreviewPanelProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [vercelUrl, setVercelUrl] = useState<string | null>(null);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [iframeKey, setIframeKey] = useState(0);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState<string>("");
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [localSrcDoc, setLocalSrcDoc] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Load project metadata from Firestore
  useEffect(() => {
    let isMounted = true;
    const fetchProject = async () => {
      try {
        const projectDoc = await getDoc(doc(db, "projects", projectId));
        if (projectDoc.exists() && isMounted) {
          const data = projectDoc.data() as Project;
          setProject({ id: projectDoc.id, ...data });
          if (data.vercelUrl) {
            setVercelUrl(data.vercelUrl);
          } else if (data.deployUrl && !data.deployUrl.includes("localhost") && data.deployTarget === "vercel") {
            setVercelUrl(data.deployUrl);
          }
        }
      } catch (err) {
        console.error("Error fetching project in PreviewPanel:", err);
      }
    };

    fetchProject();
    return () => { isMounted = false; };
  }, [projectId]);

  // Compute local static fallback HTML for projects with index.html (useful before Vercel deploy)
  useEffect(() => {
    const htmlFile = files.find(f => f.name.toLowerCase() === "index.html") ||
                     files.find(f => f.path.toLowerCase().endsWith(".html"));
    
    if (!htmlFile) {
      setLocalSrcDoc("");
      return;
    }

    let html = htmlFile.content || "";
    const cssFile = files.find(f => f.name.toLowerCase() === "style.css");
    const jsFile = files.find(f => f.name.toLowerCase() === "script.js");

    if (cssFile?.content && !html.includes("<style>")) {
      html = html.replace("</head>", `<style>${cssFile.content}</style></head>`);
    }
    if (jsFile?.content && !html.includes(jsFile.content)) {
      html = html.replace("</body>", `<script>${jsFile.content}</script></body>`);
    }

    setLocalSrcDoc(html);
  }, [files]);

  // Refresh iframe when saveKey changes
  useEffect(() => {
    if (saveKey) {
      setIframeKey(k => k + 1);
    }
  }, [saveKey]);

  // Deploy or sync current files to Vercel Edge
  const handleDeployToVercel = async () => {
    if (!auth.currentUser) {
      toast.error("Please sign in to deploy to Vercel.");
      return;
    }

    setIsDeploying(true);
    setDeployStep("Extracting files & preparing Vercel build...");
    setBuildLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] Initiating Vercel Edge build...`]);

    try {
      // Calculate DevOS Vanity URL
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const username = userDoc.exists() ? userDoc.data().username : "dev";
      const projectSlug = project?.projectSlug || `project-${projectId.slice(0, 6)}`;
      
      let devosUrl = "";
      if (project?.systemType === "portfolio") {
        devosUrl = buildPortfolioUrl(username);
      } else {
        devosUrl = buildProjectUrl(username, projectSlug, project?.appId);
      }

      setDeployStep("Deploying to Vercel global edge network...");
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch("/api/deploy/vercel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          projectId,
          files,
          framework: project?.framework || "Unknown",
          devosUrl,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Vercel edge deployment failed");
      }

      const deployedVercelUrl = data.vercelUrl || data.url;
      setVercelUrl(deployedVercelUrl);
      setBuildLogs(logs => [
        ...logs,
        `[${new Date().toLocaleTimeString()}] ✅ Deployed successfully to ${deployedVercelUrl}`,
        `[${new Date().toLocaleTimeString()}] DevOS custom domain: ${devosUrl}`
      ]);

      // Update Firestore project
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, {
        vercelUrl: deployedVercelUrl,
        deployUrl: devosUrl,
        liveUrl: devosUrl,
        deployTarget: "vercel",
        deployStatus: "success",
        lastDeployedAt: serverTimestamp(),
      });

      toast.success("Vercel Edge Preview updated!");
      setIframeKey(k => k + 1);
    } catch (err: any) {
      console.error("Vercel preview deploy error:", err);
      const msg = err.message || "Failed to deploy preview to Vercel";
      setBuildLogs(logs => [...logs, `[${new Date().toLocaleTimeString()}] ❌ Error: ${msg}`]);
      toast.error(msg);
    } finally {
      setIsDeploying(false);
      setDeployStep("");
    }
  };

  const activeUrl = vercelUrl;

  return (
    <div id="tour-preview" className="w-full bg-card flex flex-col h-full overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="p-3 px-4 flex items-center justify-between border-b border-border-base bg-[#0a0a0c]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center">
            {/* Vercel triangle vector logo */}
            <svg viewBox="0 0 75 65" height="11" width="13" fill="currentColor" className="text-white">
              <path d="M37.5 0L75 65H0z" />
            </svg>
          </div>
          <span className="text-xs font-bold text-white tracking-wide">Vercel Edge Preview</span>
          {activeUrl && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Edge
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Device mode switcher */}
          {([
            { mode: "desktop" as DeviceMode, icon: Monitor,    title: "Desktop" },
            { mode: "tablet"  as DeviceMode, icon: Tablet,     title: "Tablet (768px)" },
            { mode: "mobile"  as DeviceMode, icon: Smartphone, title: "Mobile (390px)" },
          ]).map(({ mode, icon: Icon, title }) => (
            <button
              key={mode}
              onClick={() => setDeviceMode(mode)}
              title={title}
              className={cn(
                "p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/5 transition-all",
                deviceMode === mode && "bg-white/10 text-white"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}

          <div className="w-px h-4 bg-white/10 mx-1" />

          {/* Refresh preview */}
          <button 
            onClick={() => setIframeKey(k => k + 1)}
            className="p-1.5 hover:bg-white/5 rounded-md text-white/40 hover:text-white transition-all"
            title="Reload Preview"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Open in external tab */}
          {activeUrl && (
            <button 
              onClick={() => window.open(activeUrl, "_blank", "noopener,noreferrer")}
              className="p-1.5 hover:bg-white/5 rounded-md text-white/40 hover:text-white transition-all"
              title="Open Live URL in New Window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Sync / Deploy to Vercel button */}
          <button
            onClick={handleDeployToVercel}
            disabled={isDeploying}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all shadow-sm",
              isDeploying
                ? "bg-white/10 text-white/60 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white active:scale-95"
            )}
            title="Deploy latest changes directly to Vercel Edge"
          >
            {isDeploying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-300" />
                <span className="hidden sm:inline">Building...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{activeUrl ? "Sync Edge" : "Deploy Preview"}</span>
              </>
            )}
          </button>

          {/* Terminal / Build logs toggle */}
          <button 
            onClick={() => setShowConsole(c => !c)}
            className={cn(
              "p-1.5 rounded-md transition-all ml-1",
              showConsole ? "bg-white/15 text-white" : "hover:bg-white/5 text-white/40 hover:text-white"
            )}
            title="Toggle Deployment Logs"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Viewport Area */}
      <div className="flex-1 bg-[#0d0d11] flex flex-col items-center overflow-auto p-2 min-h-0 relative">
        {deviceMode !== "desktop" && (
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest pt-1 flex-shrink-0">
            {deviceMode === "tablet" ? "Tablet Viewport — 768px" : "Mobile Viewport — 390px"}
          </p>
        )}

        {/* Deploying Progress Banner */}
        {isDeploying && (
          <div className="absolute top-4 z-20 flex items-center gap-3 px-4 py-2 bg-blue-950/90 border border-blue-500/40 rounded-xl backdrop-blur-md shadow-2xl text-xs text-blue-200 animate-in fade-in slide-in-from-top-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            <span>{deployStep || "Building on Vercel Global Edge Network..."}</span>
          </div>
        )}

        {/* Viewport Frame */}
        <div
          className={cn(
            "relative shadow-2xl flex-shrink-0 transition-all duration-300 flex flex-col",
            deviceMode === "desktop"
              ? "flex-1 w-full h-full rounded-lg overflow-hidden border border-border-base bg-white"
              : "rounded-2xl border-4 border-slate-800 overflow-hidden bg-white my-auto shadow-black/80"
          )}
          style={
            deviceMode !== "desktop"
              ? { width: DEVICE_WIDTHS[deviceMode], height: "640px", maxWidth: "100%" }
              : undefined
          }
        >
          {activeUrl ? (
            /* Live Vercel Edge Frame */
            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={activeUrl}
              title="Vercel Edge Preview"
              className="w-full h-full border-none bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            />
          ) : localSrcDoc ? (
            /* Instant Static Fallback Frame while awaiting Vercel Deploy */
            <iframe
              key={`static-${iframeKey}`}
              srcDoc={localSrcDoc}
              title="Local Preview"
              className="w-full h-full border-none bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            />
          ) : (
            /* Empty State: Prompt to Launch Vercel Edge Preview */
            <div className="flex-1 w-full h-full bg-[#0a0a0f] flex flex-col items-center justify-center p-8 text-center text-white">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-xl">
                <svg viewBox="0 0 75 65" height="28" width="32" fill="white">
                  <path d="M37.5 0L75 65H0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Vercel Edge Preview</h3>
              <p className="text-xs text-white/60 max-w-sm mb-6 leading-relaxed">
                Run your React, Vite, Next.js, or HTML application on Vercel's edge network for 100% framework fidelity and lightning-fast previews.
              </p>
              <button
                onClick={handleDeployToVercel}
                disabled={isDeploying}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-black hover:bg-slate-200 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Deploying Edge Preview...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-black" />
                    <span>Launch Vercel Preview</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Console / Build Log Drawer */}
          {showConsole && (
            <div className="h-44 border-t border-border-base w-full bg-[#07070a] text-xs font-mono flex flex-col">
              <div className="p-2 px-3 border-b border-white/5 bg-white/5 flex items-center justify-between text-[11px] text-white/50">
                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                  <Terminal className="w-3 h-3 text-blue-400" />
                  Edge Build Logs
                </span>
                <button
                  onClick={() => setBuildLogs([])}
                  className="hover:text-white transition-colors text-[10px]"
                >
                  Clear
                </button>
              </div>
              <div className="flex-1 overflow-auto p-3 space-y-1">
                {buildLogs.length === 0 ? (
                  <p className="text-white/30 italic">No build activity yet. Click "Sync Edge" to deploy.</p>
                ) : (
                  buildLogs.map((log, i) => (
                    <div key={i} className="text-white/80 leading-relaxed font-mono text-[11px]">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status bar */}
      <div className="p-3 px-4 border-t border-border-base bg-[#0a0a0c] flex items-center justify-between flex-shrink-0 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-white/40 uppercase tracking-wider font-semibold text-[10px]">Status:</span>
          {activeUrl ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected (Vercel Edge)
            </span>
          ) : localSrcDoc ? (
            <span className="text-amber-400 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Local HTML (Ready to sync with Vercel)
            </span>
          ) : (
            <span className="text-white/40 italic">Awaiting preview deployment</span>
          )}
        </div>
        <div className="text-white/30 font-mono text-[10px]">
          {activeUrl ? activeUrl.replace(/^https?:\/\//, "") : "Global Edge Network"}
        </div>
      </div>
    </div>
  );
}
