import React, { useEffect, useState, useRef } from "react";
import { Globe, RefreshCw, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { FileData } from "../types";
import { cn } from "../lib/utils";

interface PreviewPanelProps {
  projectId: string;
  files: FileData[];
}

export default function PreviewPanel({ projectId, files }: PreviewPanelProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const generatePreview = () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Find the main HTML file (index.html or first .html file)
      const htmlFile = files.find(f => f.name.toLowerCase() === "index.html") || 
                       files.find(f => f.name.toLowerCase().endsWith(".html"));

      if (!htmlFile) {
        setError("No HTML file found. Create an 'index.html' to see a preview.");
        setIsGenerating(false);
        return;
      }

      let content = htmlFile.content;

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

      // Simple replacement of local JS/CSS references with their content
      // This is a basic implementation for HTML/CSS/JS projects
      files.forEach(file => {
        if (file.language === "css") {
          const styleTag = `<style data-filename="${file.name}">${file.content}</style>`;
          // Replace <link href="filename.css"> or similar
          const linkRegex = new RegExp(`<link[^>]*href=["']${file.name}["'][^>]*>`, "gi");
          if (linkRegex.test(content)) {
            content = content.replace(linkRegex, styleTag);
          } else {
            // If not explicitly linked, append to head
            content = content.replace("</head>", `${styleTag}</head>`);
          }
        } else if (file.language === "javascript" && file.name !== htmlFile.name) {
          const scriptTag = `<script data-filename="${file.name}">${file.content}</script>`;
          // Replace <script src="filename.js"> or similar
          const scriptRegex = new RegExp(`<script[^>]*src=["']${file.name}["'][^>]*><\/script>`, "gi");
          if (scriptRegex.test(content)) {
            content = content.replace(scriptRegex, scriptTag);
          } else {
            // If not explicitly linked, append to body
            content = content.replace("</body>", `${scriptTag}</body>`);
          }
        }
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
  }, [files]);

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

      <div className="flex-1 bg-white m-4 rounded-lg overflow-hidden shadow-2xl relative group">
        {error ? (
          <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
            <h3 className="text-sm font-bold text-black/80 mb-1">Preview Error</h3>
            <p className="text-[10px] text-black/40">{error}</p>
          </div>
        ) : isGenerating ? (
          <div className="absolute inset-0 bg-white flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : previewUrl ? (
          <iframe 
            ref={iframeRef}
            src={previewUrl} 
            className="w-full h-full border-none"
            title="Project Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
          />
        ) : (
          <div className="absolute inset-0 bg-black/5 flex items-center justify-center pointer-events-none group-hover:bg-transparent transition-colors">
            <div className="text-center p-6">
              <Globe className="w-12 h-12 text-blue-500/20 mx-auto mb-4" />
              <h3 className="text-sm font-bold text-black/60 mb-1">Live Preview</h3>
              <p className="text-[10px] text-black/40">Your application will render here</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/5 bg-black/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-tighter">Status</span>
          <span className="flex items-center gap-1.5 text-[10px] text-green-500 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {isGenerating ? "Syncing..." : "Live"}
          </span>
        </div>
        <div className="text-[10px] text-white/40 leading-relaxed">
          Preview is synchronized with your latest changes in the editor.
        </div>
      </div>
    </div>
  );
}
