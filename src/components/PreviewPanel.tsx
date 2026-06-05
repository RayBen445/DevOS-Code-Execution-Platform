import React, { useEffect, useState } from "react";
import { Globe, RefreshCw, ExternalLink, Monitor, Smartphone, Tablet, Terminal } from "lucide-react";
import { FileData, Project } from "../types";
import { cn } from "../lib/utils";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { SandpackProvider, SandpackPreview, SandpackLayout, SandpackConsole } from "@codesandbox/sandpack-react";

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
}

const getSandpackTemplate = (sandpackFiles: Record<string, string>): "nextjs" | "vite-react" | "react-ts" | "vanilla" | "static" => {
  const pkgContent = sandpackFiles["/package.json"];
  if (pkgContent) {
    try {
      const pkg = JSON.parse(pkgContent);
      if (pkg.dependencies?.next) return "nextjs";
      if (pkg.devDependencies?.vite) return "vite-react";
      if (pkg.dependencies?.react) return "react-ts";
      return "vanilla";
    } catch (e) {}
  }
  const hasJsxTsx = Object.keys(sandpackFiles).some(path => path.endsWith(".tsx") || path.endsWith(".jsx"));
  if (hasJsxTsx) return "react-ts";
  
  const hasHtml = !!sandpackFiles["/index.html"];
  if (hasHtml) return "vanilla";
  
  return "react-ts";
};

export default function PreviewPanel({ projectId, files, entryFile, saveKey }: PreviewPanelProps) {
  const [projectEnv, setProjectEnv] = useState<Record<string, string>>({});
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [sandpackKey, setSandpackKey] = useState(0);
  const [showConsole, setShowConsole] = useState(false);

  useEffect(() => {
    const fetchProjectEnv = async () => {
      try {
        const projectDoc = await getDoc(doc(db, "projects", projectId));
        if (projectDoc.exists()) {
          const data = projectDoc.data() as Project;
          setProjectEnv(data.env || {});
        }
      } catch (err) {
        console.error("Error fetching project env:", err);
      }
    };
    fetchProjectEnv();
  }, [projectId]);

  // Force re-render of Sandpack when refresh is requested via saveKey or manual refresh
  useEffect(() => {
    if (saveKey) setSandpackKey(k => k + 1);
  }, [saveKey]);

  const defaultEntry = entryFile || files.find(f => f.name === "index.html")?.path || files.find(f => f.name === "package.json")?.path || "";
  const rootDir = defaultEntry.includes("/") ? defaultEntry.substring(0, defaultEntry.lastIndexOf("/") + 1) : "";

  const sandpackFiles = files.reduce((acc, f) => {
    let path = f.path;
    if (rootDir && path.startsWith(rootDir)) {
      path = path.substring(rootDir.length);
    } else if (rootDir) {
      path = `_outside_/${path}`;
    }
    path = path.startsWith("/") ? path : `/${path}`;
    acc[path] = f.content;
    return acc;
  }, {} as Record<string, string>);

  if (Object.keys(projectEnv).length > 0) {
    sandpackFiles["/.env"] = Object.entries(projectEnv).map(([k, v]) => `${k}=${v}`).join("\n");
  }

  const template = getSandpackTemplate(sandpackFiles);

  return (
    <div className="w-full bg-card flex flex-col h-full overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-border-base">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Preview</span>
        </div>
        <div className="flex items-center gap-1">
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
                "p-1 rounded text-white/40 hover:text-white transition-colors",
                deviceMode === mode && "bg-white/10 text-white"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
          <div className="w-px h-4 bg-white/10 mx-0.5" />
          <button 
            onClick={() => setSandpackKey(k => k + 1)}
            className="p-1 hover:bg-white/5 rounded text-white/40 hover:text-white transition-colors"
            title="Refresh Preview"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-white/10 mx-0.5" />
          <button 
            onClick={() => setShowConsole(c => !c)}
            className={cn("p-1 rounded transition-colors", showConsole ? "bg-white/10 text-white" : "hover:bg-white/5 text-white/40 hover:text-white")}
            title="Toggle Build Logs"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Viewport wrapper — centres the iframe when in tablet/mobile mode */}
      <div className="flex-1 bg-card flex flex-col items-center overflow-auto p-2 gap-2 min-h-0 relative">
        {deviceMode !== "desktop" && (
          <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest pt-1 flex-shrink-0">
            {deviceMode === "tablet" ? "Tablet — 768px" : "Mobile — 390px"}
          </p>
        )}
        
        {/* Sandpack instance wrapper */}
        <div
          className={cn(
            "relative bg-white shadow-2xl flex-shrink-0 w-full h-full",
            deviceMode === "desktop" ? "flex-1 rounded-xl overflow-hidden" : "rounded-2xl border-2 border-border-base overflow-hidden"
          )}
          style={
            deviceMode !== "desktop"
              ? { width: DEVICE_WIDTHS[deviceMode], height: "600px", maxWidth: "100%" }
              : undefined
          }
        >
          {Object.keys(sandpackFiles).length > 0 ? (
            <SandpackProvider 
              key={sandpackKey}
              template={template} 
              theme="dark"
              files={sandpackFiles}
              options={{
                activeFile: entryFile ? `/${entryFile.startsWith(rootDir) ? entryFile.substring(rootDir.length) : entryFile}` : undefined,
                initMode: "user-visible"
              }}
              style={{ width: "100%", height: "100%" }}
            >
              <SandpackLayout style={{ width: "100%", height: "100%", border: "none", borderRadius: 0, display: "flex", flexDirection: "column" }}>
                <SandpackPreview 
                  showOpenInCodeSandbox={false}
                  showRefreshButton={false}
                  style={{ width: "100%", flex: showConsole ? 1 : "1 1 100%" }} 
                />
                {showConsole && (
                  <div className="h-64 border-t border-border-base w-full bg-[#0a0a0a]">
                    <SandpackConsole style={{ width: "100%", height: "100%" }} />
                  </div>
                )}
              </SandpackLayout>
            </SandpackProvider>
          ) : (
            <div className="absolute inset-0 bg-[#f8f9fa] flex items-center justify-center pointer-events-none">
              <div className="text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/5 flex items-center justify-center mx-auto mb-6">
                  <Globe className="w-8 h-8 text-blue-500/20" />
                </div>
                <h3 className="text-sm font-bold text-black/60 mb-1">Live Preview</h3>
                <p className="text-[10px] text-black/40">Your application will render here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="p-4 border-t border-border-base bg-black/20 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-tighter">Status</span>
          <span className="flex items-center gap-1.5 text-[10px] text-green-500 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live (Sandpack)
          </span>
        </div>
        <div className="text-[10px] text-white/40 leading-relaxed">
          {deviceMode === "desktop" ? "Full width" : deviceMode === "tablet" ? "768 px viewport" : "390 px viewport"} · Engine: {template}
        </div>
      </div>
    </div>
  );
}
