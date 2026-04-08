import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, limit, doc, getDoc } from "firebase/firestore";
import { Project } from "../types";
import { Zap, AlertCircle } from "lucide-react";
import { useSEO } from "../hooks/useSEO";

interface Props {
  slug: string;
}

export default function SubdomainProject({ slug }: Props) {
  const [project, setProject] = useState<Project | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSEO({
    title: project ? `${project.title || project.name} — DevOS` : `${slug} — DevOS`,
    description: project?.description || `A project deployed on DevOS`,
  });

  useEffect(() => {
    if (!slug) return;
    const fetchProject = async () => {
      try {
        // Search by slug or projectSlug
        const projectsRef = collection(db, "projects");
        const q1 = query(projectsRef, where("slug", "==", slug), where("deployed", "==", true), limit(1));
        let snap = await getDocs(q1);

        if (snap.empty) {
          const q2 = query(projectsRef, where("projectSlug", "==", slug), where("isPublic", "==", true), limit(1));
          snap = await getDocs(q2);
        }

        if (snap.empty) {
          setError("Project not found");
          setLoading(false);
          return;
        }

        const projectData = { id: snap.docs[0].id, ...snap.docs[0].data() } as Project;
        setProject(projectData);

        // Try to load published HTML from project files subcollection
        const filesRef = collection(db, "projects", projectData.id, "files");
        const filesSnap = await getDocs(filesRef);
        let html: string | null = null;

        // Look for index.html in published files
        const entryFile = projectData.entryFile || "index.html";
        for (const fileDoc of filesSnap.docs) {
          const fd = fileDoc.data();
          if (fd.path === entryFile || fd.name === entryFile || fileDoc.id === entryFile) {
            html = fd.content || fd.code || null;
            break;
          }
        }

        if (!html) {
          // Try published draft
          const draftDoc = await getDoc(doc(db, "projects", projectData.id));
          const draftData = draftDoc.data();
          html = draftData?.published?.files?.[entryFile] || draftData?.draft?.files?.[entryFile] || null;
        }

        setHtmlContent(html);
      } catch (e) {
        setError("Failed to load project");
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Zap className="w-8 h-8 text-blue-500 animate-pulse" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white/60 gap-3">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-lg">{error || "Project not found"}</p>
        <a href="https://devos.zone.id" className="text-blue-400 hover:underline text-sm">Go to DevOS</a>
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
        className="w-full h-screen border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    );
  }

  // Fallback: show project info
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">{project.title || project.name}</h1>
      {project.description && <p className="text-white/60 max-w-md text-center">{project.description}</p>}
      <a
        href={`https://devos.zone.id/project/${project.id}`}
        className="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
      >
        Open in DevOS IDE
      </a>
      <a href="https://devos.zone.id" className="text-white/20 text-xs hover:text-white/40 transition-colors mt-8">
        Powered by DevOS
      </a>
    </div>
  );
}
