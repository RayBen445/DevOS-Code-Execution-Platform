import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { Project, FileData } from "../types";
import { Loader2, AlertCircle, Globe } from "lucide-react";
import * as Babel from "@babel/standalone";

export default function ProjectPreview() {
  const { username, projectSlug } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";
  
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (!username || !projectSlug) return;
      
      try {
        // 1. Find the deployed (public) project by ownerUsername and projectSlug.
        //    The isPublic constraint is required: Firestore security rules for
        //    unauthenticated list queries mandate that the WHERE clauses imply the
        //    rule condition (isPublic == true).  A composite index on
        //    (isPublic ASC, ownerUsername ASC, projectSlug ASC) covers this query
        //    — see firestore.indexes.json.
        const q = query(
          collection(db, "projects"),
          where("isPublic", "==", true),
          where("ownerUsername", "==", username),
          where("projectSlug", "==", projectSlug),
          limit(1)
        );
        
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          setError("Project not found");
          setLoading(false);
          return;
        }
        
        const projectData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Project;
        setProject(projectData);
        
        // 2. Fetch files for the project
        const filesSnapshot = await getDocs(collection(db, "projects", projectData.id, "files"));
        const filesData = filesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FileData[];
        setFiles(filesData);
        
        // 3. Generate preview content
        generatePreview(projectData, filesData);
      } catch (err: any) {
        console.error("Error fetching project:", err);
        const code = err?.code || "";
        if (code === "permission-denied") {
          setError("This project is private or you don't have access to view it.");
        } else {
          const msg = err?.message || String(err);
          setError(`Failed to load project: ${msg}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [username, projectSlug]);

  const generatePreview = (project: Project, files: FileData[]) => {
    try {
      // Find the main HTML file
      let htmlFile = null;
      if (project.entryFile) {
        htmlFile = files.find(f => f.path === project.entryFile);
      }
      
      if (!htmlFile) {
        htmlFile = files.find(f => f.name.toLowerCase() === "index.html") || 
                   files.find(f => f.name.toLowerCase().endsWith(".html"));
      }

      if (!htmlFile) {
        setError("No entry point found for this project.");
        return;
      }

      const basePath = htmlFile.path;
      let content = htmlFile.content;

      // Helper to resolve paths relative to the current HTML file
      const resolveRelativePath = (relPath: string) => {
        if (relPath.startsWith('http') || relPath.startsWith('//') || relPath.startsWith('data:')) return null;
        
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
        const file = files.find(f => f.path === resolvedPath && f.language === "css");
        if (file) {
          return `<style data-filename="${file.path}">${file.content}</style>`;
        }
        return match;
      });

      // Process Scripts
      const scriptRegex = /<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;
      content = content.replace(scriptRegex, (match, src) => {
        const resolvedPath = resolveRelativePath(src);
        const file = files.find(f => f.path === resolvedPath);
        
        if (file) {
          let scriptContent = file.content;
          
          // Inject environment variables
          if (project.env) {
            Object.entries(project.env).forEach(([key, value]) => {
              const envRegex = new RegExp(`process\\.env\\.${key}`, 'g');
              scriptContent = scriptContent.replace(envRegex, JSON.stringify(value));
            });
          }

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
        const file = files.find(f => f.path === resolvedPath && f.language === "image");
        if (file) {
          return `src="${file.content}"`;
        }
        return match;
      });

      // Process background-image in styles
      const urlRegex = /url\(["']?([^"'\)]+)["']?\)/gi;
      content = content.replace(urlRegex, (match, url) => {
        const resolvedPath = resolveRelativePath(url);
        const file = files.find(f => f.path === resolvedPath && f.language === "image");
        if (file) {
          return `url("${file.content}")`;
        }
        return match;
      });

      const blob = new Blob([content], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      setIframeUrl(url);
    } catch (err) {
      console.error("Preview generation failed:", err);
      setError("Failed to render project.");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-sm font-bold uppercase tracking-widest text-white/40">Loading Project...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Error</h1>
        <p className="text-white/60 max-w-md">{error}</p>
        <a href="/" className="mt-8 px-6 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-bold transition-all">
          Back to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-white overflow-hidden">
      {iframeUrl && (
        <iframe 
          src={iframeUrl} 
          className="w-full h-full border-none"
          title={project?.name || "Project Preview"}
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        />
      )}
    </div>
  );
}
