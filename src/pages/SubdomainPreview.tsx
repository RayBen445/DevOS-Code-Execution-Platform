import React, { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  limit,
} from "firebase/firestore";
import { Project, FileData } from "../types";
import { Zap, AlertCircle } from "lucide-react";
import { useSEO } from "../hooks/useSEO";
import * as Babel from "@babel/standalone";

interface Props {
  username: string;
  previewId: string;
}

/**
 * Renders a project preview for `previewId.username.devos.name.ng`.
 *
 * Lookup order:
 *   1. ownerUsername == username && projectSlug == previewId (public projects)
 *   2. Firestore document id == previewId with ownerUsername == username
 */
export default function SubdomainPreview({ username, previewId }: Props) {
  const [project, setProject] = useState<Project | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSEO({
    title: project
      ? `${project.title || project.name} — ${username} on DevOS`
      : `Preview — ${username} on DevOS`,
    description: project?.description || `Project preview on DevOS`,
  });

  useEffect(() => {
    let objectUrl: string | null = null;

    const fetchProject = async () => {
      try {
        let projectData: Project | null = null;

        // 1. Try lookup by ownerUsername + projectSlug
        const q = query(
          collection(db, "projects"),
          where("isPublic", "==", true),
          where("ownerUsername", "==", username),
          where("projectSlug", "==", previewId),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          projectData = { id: snap.docs[0].id, ...snap.docs[0].data() } as Project;
        }

        // 2. Fallback: try Firestore document ID
        if (!projectData) {
          const docSnap = await getDoc(doc(db, "projects", previewId));
          if (docSnap.exists()) {
            const data = docSnap.data() as Project;
            if (data.ownerUsername === username) {
              projectData = { id: docSnap.id, ...data };
            }
          }
        }

        if (!projectData) {
          setError("Preview not found");
          setLoading(false);
          return;
        }

        setProject(projectData);

        // If an external deploy URL is available, use it directly
        const externalUrl = projectData.liveUrl || projectData.deployUrl;
        if (externalUrl) {
          setIframeUrl(externalUrl);
          setLoading(false);
          return;
        }

        // Load project files and assemble HTML preview
        const filesSnap = await getDocs(
          collection(db, "projects", projectData.id, "files")
        );
        const files = filesSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as FileData)
        );

        const url = buildPreviewUrl(projectData, files);
        if (url) {
          objectUrl = url;
          setIframeUrl(url);
        } else {
          setError("No entry point found for this project.");
        }
      } catch (err: any) {
        console.error("[SubdomainPreview] Failed to load preview:", err);
        setError(err?.message || "Failed to load preview.");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();

    return () => {
      // Clean up Blob URL on unmount
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [username, previewId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-3">
        <Zap className="w-8 h-8 text-blue-500 animate-pulse" />
        <p className="text-sm text-white/40 uppercase tracking-widest font-bold">
          Loading Preview…
        </p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white gap-3 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-xl font-bold">Preview not found</p>
        <p className="text-white/50 text-sm">{error}</p>
        <a
          href="https://devos.name.ng"
          className="mt-4 text-blue-400 hover:underline text-sm"
        >
          Go to DevOS
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
          title={project.title || project.name}
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
        />
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolvePath(basePath: string, relPath: string): string | null {
  if (
    relPath.startsWith("http") ||
    relPath.startsWith("//") ||
    relPath.startsWith("data:")
  )
    return null;

  const cleanRelPath = relPath.startsWith("./") ? relPath.slice(2) : relPath;
  const baseParts = basePath.split("/").slice(0, -1);
  const relParts = cleanRelPath.split("/");
  const result = [...baseParts];

  for (const part of relParts) {
    if (part === ".") continue;
    if (part === "..") result.pop();
    else result.push(part);
  }
  return result.join("/");
}

function buildPreviewUrl(project: Project, files: FileData[]): string | null {
  const entryName = project.entryFile || "index.html";
  let htmlFile =
    files.find((f) => f.path === entryName) ||
    files.find((f) => f.name?.toLowerCase() === "index.html") ||
    files.find((f) => f.name?.toLowerCase().endsWith(".html"));

  if (!htmlFile) return null;

  let content = htmlFile.content ?? "";

  // Suppress ResizeObserver noise inside the iframe
  const suppressionScript = `<script>
    window.addEventListener('error', (e) => {
      if (e.message && (
        e.message.includes('ResizeObserver loop') ||
        e.message.includes('ResizeObserver loop limit')
      )) { e.stopImmediatePropagation(); e.preventDefault(); }
    });
  </script>`;
  content = content.includes("<head>")
    ? content.replace("<head>", `<head>${suppressionScript}`)
    : suppressionScript + content;

  // Inline CSS links
  content = content.replace(
    /<link[^>]*href=["']([^"']+)["'][^>]*>/gi,
    (match, href) => {
      const resolved = resolvePath(htmlFile!.path, href);
      const css = resolved && files.find((f) => f.path === resolved && f.language === "css");
      return css ? `<style data-filename="${css.path}">${css.content}</style>` : match;
    }
  );

  // Inline scripts
  content = content.replace(
    /<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi,
    (match, src) => {
      const resolved = resolvePath(htmlFile!.path, src);
      const jsFile = resolved && files.find((f) => f.path === resolved);
      if (!jsFile) return match;

      let scriptContent = jsFile.content ?? "";

      // Inject env vars
      if (project.env) {
        for (const [key, value] of Object.entries(project.env)) {
          scriptContent = scriptContent.replace(
            new RegExp(`process\\.env\\.${key}`, "g"),
            JSON.stringify(value)
          );
        }
      }

      // Transpile JSX/TS
      if (/\.(jsx|tsx|ts)$/.test(jsFile.path)) {
        try {
          const transpiled = Babel.transform(scriptContent, {
            presets: ["react", "typescript"],
            filename: jsFile.path,
          }).code;
          return `<script data-filename="${jsFile.path}">${transpiled}</script>`;
        } catch {
          return `<script>console.error("Transpilation failed for ${jsFile.path}");</script>`;
        }
      }

      return `<script data-filename="${jsFile.path}">${scriptContent}</script>`;
    }
  );

  // Inline images in src attributes
  content = content.replace(/src=["']([^"']+)["']/gi, (match, src) => {
    const resolved = resolvePath(htmlFile!.path, src);
    const img = resolved && files.find((f) => f.path === resolved && f.language === "image");
    return img ? `src="${img.content}"` : match;
  });

  // Inline images in CSS url()
  content = content.replace(/url\(["']?([^"')]+)["']?\)/gi, (match, url) => {
    const resolved = resolvePath(htmlFile!.path, url);
    const img = resolved && files.find((f) => f.path === resolved && f.language === "image");
    return img ? `url("${img.content}")` : match;
  });

  const blob = new Blob([content], { type: "text/html" });
  return URL.createObjectURL(blob);
}
