import React, { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { Project, Organization } from "../types";
import { Zap, AlertCircle } from "lucide-react";
import { useSEO } from "../hooks/useSEO";
import { buildDevosUrl, buildOrgProjectUrl, buildOrgUrl, PRODUCT_BRAND_NAME } from "../lib/brand";
import { getOrgBySlug } from "../lib/orgService";

interface Props {
  orgSlug: string;
  projectSlug: string;
}

export default function SubdomainOrgProject({ orgSlug, projectSlug }: Props) {
  const [org, setOrg] = useState<Organization | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSEO({
    title: project
      ? `${project.title || project.name} — ${org?.name ?? orgSlug} on ${PRODUCT_BRAND_NAME}`
      : `${projectSlug} — ${org?.name ?? orgSlug} on ${PRODUCT_BRAND_NAME}`,
    description: project?.description || `A project deployed by ${org?.name ?? orgSlug} on ${PRODUCT_BRAND_NAME}`,
    ogImage: project?.thumbnailUrl || org?.avatar,
    ogUrl: buildOrgProjectUrl(orgSlug, projectSlug),
  });

  useEffect(() => {
    if (!orgSlug || !projectSlug) return;

    const loadProjectContent = async (projectData: Project) => {
      setProject(projectData);

      const filesRef = collection(db, "projects", projectData.id, "files");
      const filesSnap = await getDocs(filesRef);
      let html: string | null = null;

      const entryFile = projectData.entryFile || "index.html";
      for (const fileDoc of filesSnap.docs) {
        const fd = fileDoc.data();
        if (fd.path === entryFile || fd.name === entryFile || fileDoc.id === entryFile) {
          html = fd.content || fd.code || null;
          break;
        }
      }

      if (!html) {
        const draftDoc = await getDoc(doc(db, "projects", projectData.id));
        const draftData = draftDoc.data();
        html = draftData?.published?.files?.[entryFile] || draftData?.draft?.files?.[entryFile] || null;
      }

      setHtmlContent(html);
    };

    const fetchProject = async () => {
      try {
        const orgData = await getOrgBySlug(orgSlug);
        if (!orgData) {
          setError("Organization not found");
          setLoading(false);
          return;
        }
        setOrg(orgData);

        const projectsRef = collection(db, "projects");
        let snap = await getDocs(
          query(
            projectsRef,
            where("ownerOrgId", "==", orgData.id),
            where("projectSlug", "==", projectSlug),
            limit(1)
          )
        );
        if (snap.empty) {
          snap = await getDocs(
            query(
              projectsRef,
              where("ownerOrgId", "==", orgData.id),
              where("slug", "==", projectSlug),
              limit(1)
            )
          );
        }

        if (snap.empty) {
          setError("Project not found");
          setLoading(false);
          return;
        }

        const data = snap.docs[0].data() as Project;
        if (data.ownerType !== "organization" || data.ownerOrgId !== orgData.id) {
          setError("Project not found");
          setLoading(false);
          return;
        }

        await loadProjectContent({ id: snap.docs[0].id, ...data } as Project);
      } catch (e) {
        setError("Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [orgSlug, projectSlug]);

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
        {orgSlug && (
          <a href={buildOrgUrl(orgSlug)} className="text-blue-400 hover:underline text-sm">
            ← Back to {orgSlug} org
          </a>
        )}
        <a href={buildDevosUrl()} className="text-blue-400 hover:underline text-sm">
          Go to DevOS
        </a>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">{project.title || project.name}</h1>
      {project.description && <p className="text-white/60 max-w-md text-center">{project.description}</p>}
      <a
        href={buildDevosUrl(`project/${project.id}`)}
        className="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
      >
        Open in DevOS IDE
      </a>
      <a href={buildOrgUrl(orgSlug)} className="text-white/40 text-sm hover:text-white/70 transition-colors mt-2">
        ← Back to {orgSlug} org
      </a>
      <a href={buildDevosUrl()} className="text-white/20 text-xs hover:text-white/40 transition-colors mt-8">
        Powered by {PRODUCT_BRAND_NAME}
      </a>
    </div>
  );
}
