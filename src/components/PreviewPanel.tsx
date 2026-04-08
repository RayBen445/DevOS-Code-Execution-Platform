import React, { useEffect, useState, useRef } from "react";
import { Globe, RefreshCw, ExternalLink, Loader2, AlertCircle, Zap, Monitor, Smartphone, Tablet } from "lucide-react";
import { FileData, Project } from "../types";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import * as Babel from "@babel/standalone";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

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

export default function PreviewPanel({ projectId, files, entryFile, saveKey }: PreviewPanelProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [projectEnv, setProjectEnv] = useState<Record<string, string>>({});
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  const generatePreview = () => {
    setIsGenerating(true);
    setIframeLoading(true);
    setError(null);

    try {
      // Find the main HTML file
      let htmlFile = null;
      if (entryFile) {
        htmlFile = files.find(f => f.path === entryFile);
      }
      
      if (!htmlFile) {
        htmlFile = files.find(f => f.name.toLowerCase() === "index.html") || 
                   files.find(f => f.name.toLowerCase().endsWith(".html"));
      }

      if (!htmlFile) {
        setError("No HTML file found. Create an 'index.html' to see a preview.");
        setIsGenerating(false);
        return;
      }

      const basePath = htmlFile.path;
      let content = htmlFile.content;

      const normalizeProjectPath = (value: string) => {
        const trimmed = (value || "").trim();
        if (!trimmed) return "";
        return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
      };

      const findFileByPath = (candidatePath: string, predicate?: (file: FileData) => boolean) => {
        const normalized = normalizeProjectPath(candidatePath);
        return files.find((f) => {
          const samePath = normalizeProjectPath(f.path) === normalized;
          if (!samePath) return false;
          return predicate ? predicate(f) : true;
        });
      };

      // Helper to resolve paths relative to the current HTML file
      const resolveRelativePath = (relPath: string) => {
        if (relPath.startsWith('http') || relPath.startsWith('//') || relPath.startsWith('data:')) return null;
        
        // Handle absolute paths by stripping the leading slash and treating as root-relative
        if (relPath.startsWith('/')) {
          const stripped = relPath.slice(1);
          return stripped || null;
        }

        // Remove leading ./
        let cleanRelPath = relPath.startsWith('./') ? relPath.slice(2) : relPath;
        
        const baseParts = basePath.split('/').slice(0, -1);
        const relParts = cleanRelPath.split('/');
        
        const resultParts = [...baseParts];
        for (const part of relParts) {
          if (part === '.') continue;
          if (part === '..') {
            resultParts.pop();
          } else {
            resultParts.push(part);
          }
        }
        
        return resultParts.join('/');
      };

      // Add ResizeObserver error suppression script to the preview
      const suppressionScript = `
        <script>
          window.addEventListener('error', (e) => {
            if (e.message.includes('ResizeObserver loop completed with undelivered notifications.') || 
                e.message.includes('ResizeObserver loop limit exceeded')) {
              e.stopImmediatePropagation();
              e.preventDefault();
            }
          });
        </script>
      `;
      
      if (content.includes("<head>")) {
        content = content.replace("<head>", `<head>${suppressionScript}`);
      } else {
        content = suppressionScript + content;
      }

      // Process CSS links
      const linkRegex = /<link[^>]*href=["']([^"']+)["'][^>]*>/gi;
      content = content.replace(linkRegex, (match, href) => {
        const resolvedPath = resolveRelativePath(href);
        const file = resolvedPath ? findFileByPath(resolvedPath, (f) => f.language === "css") : undefined;
        if (file) {
          return `<style data-filename="${file.path}">${file.content}</style>`;
        }
        return match;
      });

      // Process Scripts
      const scriptRegex = /<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;
      content = content.replace(scriptRegex, (match, src) => {
        const resolvedPath = resolveRelativePath(src);
        const file = resolvedPath ? findFileByPath(resolvedPath) : undefined;
        
        if (file) {
          let scriptContent = file.content;
          
          // Inject environment variables
          Object.entries(projectEnv).forEach(([key, value]) => {
            const envRegex = new RegExp(`process\\.env\\.${key}`, 'g');
            scriptContent = scriptContent.replace(envRegex, JSON.stringify(value));
          });

          // Transpile if needed
          const isJSX = file.path.endsWith(".jsx") || file.path.endsWith(".tsx");
          const isTS = file.path.endsWith(".ts") || file.path.endsWith(".tsx");

          if (isJSX || isTS) {
            try {
              const transpiled = Babel.transform(scriptContent, {
                presets: ["react", "typescript"],
                filename: file.path
              }).code;
              return `<script data-filename="${file.path}">${transpiled}</script>`;
            } catch (babelErr) {
              console.error(`Babel transpilation failed for ${file.path}:`, babelErr);
              return `<script>console.error("Babel transpilation failed for ${file.path}");</p>`;
            }
          }
          
          if (file.language === "javascript") {
            return `<script data-filename="${file.path}">${scriptContent}</script>`;
          }
        }
        return match;
      });

      // Process Images in HTML
      const imgRegex = /src=["']([^"']+)["']/gi;
      content = content.replace(imgRegex, (match, src) => {
        const resolvedPath = resolveRelativePath(src);
        const file = resolvedPath ? findFileByPath(resolvedPath, (f) => f.language === "image") : undefined;
        if (file) {
          return `src="${file.content}"`;
        }
        return match;
      });

      // Process background-image in styles
      const urlRegex = /url\(["']?([^"'\)]+)["']?\)/gi;
      content = content.replace(urlRegex, (match, url) => {
        const resolvedPath = resolveRelativePath(url);
        const file = resolvedPath ? findFileByPath(resolvedPath, (f) => f.language === "image") : undefined;
        if (file) {
          return `url("${file.content}")`;
        }
        return match;
      });

      const blob = new Blob([content], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      
      // Clean up old URL
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      
      setPreviewUrl(url);
    } catch (err) {
      console.error("Preview generation failed:", err);
      setError("Failed to generate preview.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    generatePreview();
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [files, saveKey]);

  const handleOpenExternal = () => {
    if (previewUrl) {
      window.open(previewUrl, "_blank");
    }
  };

  return (
    <div className="w-96 border-r border-white/5 bg-[#111] flex flex-col h-full">
      <div className="p-4 flex items-center justify-between border-b border-white/5">
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
            onClick={generatePreview}
            disabled={isGenerating}
            className="p-1 hover:bg-white/5 rounded text-white/40 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh Preview"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
          </button>
          <button 
            onClick={handleOpenExternal}
            disabled={!previewUrl}
            className="p-1 hover:bg-white/5 rounded text-white/40 hover:text-white transition-colors disabled:opacity-50"
            title="Open in New Tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Viewport wrapper — centres the iframe when in tablet/mobile mode */}
      <div className="flex-1 bg-[#0d0d0d] flex flex-col items-center overflow-auto p-2 gap-2 min-h-0">
        {deviceMode !== "desktop" && (
          <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest pt-1 flex-shrink-0">
            {deviceMode === "tablet" ? "Tablet — 768px" : "Mobile — 390px"}
          </p>
        )}
        {/* Device frame */}
        <div
          className={cn(
            "relative bg-white shadow-2xl overflow-hidden flex-shrink-0",
            deviceMode === "desktop" ? "w-full flex-1 rounded-xl" : "rounded-2xl border-2 border-white/10"
          )}
          style={
            deviceMode !== "desktop"
              ? { width: DEVICE_WIDTHS[deviceMode], height: "600px", maxWidth: "100%" }
              : undefined
          }
        >
          <AnimatePresence mode="wait">
            {error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white flex flex-col items-center justify-center p-6 text-center"
              >
                <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
                <h3 className="text-base font-bold text-black mb-2">Preview Error</h3>
                <p className="text-xs text-black/40 max-w-[200px]">{error}</p>
                <button
                  onClick={generatePreview}
                  className="mt-6 px-4 py-2 bg-black text-white rounded-lg text-xs font-bold hover:bg-black/80 transition-all"
                >
                  Try Again
                </button>
              </motion.div>
            ) : (isGenerating || (previewUrl && iframeLoading)) ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#f8f9fa] flex flex-col items-center justify-center"
              >
                <div className="relative mb-4">
                  <div className="w-12 h-12 rounded-full border-2 border-blue-500/10 border-t-blue-500 animate-spin" />
                  <Globe className="absolute inset-0 m-auto w-5 h-5 text-blue-500/40" />
                </div>
                <p className="text-[10px] font-bold text-blue-500/60 uppercase tracking-widest animate-pulse">
                  Rendering Preview...
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {previewUrl && !error && (
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className={cn(
                "w-full h-full border-none transition-opacity duration-500",
                iframeLoading ? "opacity-0" : "opacity-100"
              )}
              onLoad={() => setIframeLoading(false)}
              title="Project Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            />
          )}

          {!previewUrl && !isGenerating && !error && (
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
      <div className="p-4 border-t border-white/5 bg-black/20 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-tighter">Status</span>
          <span className="flex items-center gap-1.5 text-[10px] text-green-500 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {isGenerating ? "Syncing..." : "Live"}
          </span>
        </div>
        <div className="text-[10px] text-white/40 leading-relaxed">
          {deviceMode === "desktop" ? "Full width" : deviceMode === "tablet" ? "768 px viewport" : "390 px viewport"} · synchronized with your latest save.
        </div>
      </div>
    </div>
  );
}
