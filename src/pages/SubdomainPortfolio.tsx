import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, limit, doc, getDoc } from "firebase/firestore";
import { Project } from "../types";
import { Zap, AlertCircle } from "lucide-react";
import { useSEO } from "../hooks/useSEO";
import { buildDevosUrl, buildPortfolioUrl, PRODUCT_BRAND_NAME } from "../lib/brand";

interface Props {
  username: string;
}

export default function SubdomainPortfolio({ username }: Props) {
  const [project, setProject] = useState<Project | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSEO({
    title: project ? `${project.title || project.name} — ${PRODUCT_BRAND_NAME}` : `${username} — ${PRODUCT_BRAND_NAME}`,
    description: project?.description || `${username}'s portfolio on ${PRODUCT_BRAND_NAME}`,
    ogImage: project?.thumbnailUrl,
  });

  useEffect(() => {
    if (!username) return;

    const loadProjectContent = async (projectData: Project, userData: any) => {
      setProject(projectData);

      // Try to load published HTML from project files subcollection
      const filesRef = collection(db, "projects", projectData.id, "files");
      const filesSnap = await getDocs(filesRef);
      let html: string | null = null;
      let css: string | null = null;
      let js: string | null = null;

      const entryFile = projectData.entryFile || "index.html";
      for (const fileDoc of filesSnap.docs) {
        const fd = fileDoc.data();
        if (fd.path === entryFile || fd.name === entryFile || fileDoc.id === entryFile) {
          html = fd.content || fd.code || null;
        } else if (fd.name === "style.css") {
          css = fd.content || fd.code || null;
        } else if (fd.name === "script.js") {
          js = fd.content || fd.code || null;
        }
      }

      if (!html) {
        const draftDoc = await getDoc(doc(db, "projects", projectData.id));
        const draftData = draftDoc.data();
        html = draftData?.published?.files?.[entryFile] || draftData?.draft?.files?.[entryFile] || null;
        if (!css) css = draftData?.published?.files?.["style.css"] || draftData?.draft?.files?.["style.css"] || null;
        if (!js) js = draftData?.published?.files?.["script.js"] || draftData?.draft?.files?.["script.js"] || null;
      }

      if (html) {
        if (css && !html.includes('style.css')) {
          html = html.replace('</head>', `<style>${css}</style></head>`);
        } else if (css && html.includes('style.css')) {
          html = html.replace(/<link[^>]*href=["']style\.css["'][^>]*>/i, `<style>${css}</style>`);
        }
        if (js && !html.includes('script.js')) {
          html = html.replace('</body>', `<script>${js}</script></body>`);
        } else if (js && html.includes('script.js')) {
          html = html.replace(/<script[^>]*src=["']script\.js["'][^>]*><\/script>/i, `<script>${js}</script>`);
        }
      }

      setHtmlContent(html);
    };

    const fetchProject = async () => {
      try {
        const usersRef = collection(db, "users");
        const userQ = query(usersRef, where("username", "==", username), limit(1));
        const userSnap = await getDocs(userQ);
        
        if (userSnap.empty) {
          setError("User not found");
          setLoading(false);
          return;
        }
        
        const foundUid = userSnap.docs[0].id;

        const projectsRef = collection(db, "projects");
        const pQ = query(
          projectsRef,
          where("ownerId", "==", foundUid),
          where("isSystem", "==", true),
          where("systemType", "==", "portfolio"),
          limit(1)
        );
        const pSnap = await getDocs(pQ);

        if (pSnap.empty) {
          setError("Portfolio not found");
          setLoading(false);
          return;
        }

        await loadProjectContent({ id: pSnap.docs[0].id, ...pSnap.docs[0].data() } as Project, userSnap.docs[0].data());
      } catch (e) {
        setError("Failed to load portfolio");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <Zap className="w-8 h-8 text-blue-500 animate-pulse" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center text-white/60 gap-3">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-lg">{error || "Portfolio not found"}</p>
        <a href={buildDevosUrl()} className="text-blue-400 hover:underline text-sm">Go to DevOS</a>
      </div>
    );
  }

  // If we have a liveUrl or deployUrl, redirect/iframe it
  const externalUrl = project.liveUrl || project.deployUrl;
  if (externalUrl && !htmlContent) {
    return (
      <iframe
        src={externalUrl}
        title={project.title || project.name}
        className="w-full h-screen border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    );
  }

  // Render inline HTML
  if (htmlContent) {
    return (
      <iframe
        srcDoc={htmlContent}
        title={project.title || project.name}
        className="w-full h-screen border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    );
  }

  // Fallback: show project info
  return (
    <div className="min-h-screen bg-base text-white flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">{project.title || project.name}</h1>
      {project.description && <p className="text-white/60 max-w-md text-center">{project.description}</p>}
      <a
        href={buildDevosUrl(`project/${project.id}`)}
        className="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
      >
        Open in DevOS IDE
      </a>
      <a href={buildDevosUrl()} className="text-white/20 text-xs hover:text-white/40 transition-colors mt-8">
        Powered by {PRODUCT_BRAND_NAME}
      </a>
    </div>
  );
}
