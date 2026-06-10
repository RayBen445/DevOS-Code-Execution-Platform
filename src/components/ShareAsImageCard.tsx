import { useRef, useCallback, useState, RefObject } from "react";
import html2canvas from "html2canvas";
import { FeedPost, Project } from "../types";
import { resolveAvatar } from "../lib/avatars";
import { formatRelativeTime } from "../lib/utils";
import { toast } from "sonner";

type ExportStyle = "default" | "gradient" | "minimal" | "premium" | "hacker";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const STYLE_MAP: Record<ExportStyle, { bg: string; cardBg: string; border: string; glow: string }> = {
  default: {
    bg: "radial-gradient(circle at top left, rgba(59,130,246,0.3) 0%, transparent 50%), radial-gradient(circle at bottom right, rgba(139,92,246,0.3) 0%, transparent 50%), #06070a",
    cardBg: "rgba(14, 17, 23, 0.4)",
    border: "1px solid rgba(255,255,255,0.05)",
    glow: "0 8px 32px 0 rgba(0,0,0,0.37)"
  },
  gradient: {
    bg: "linear-gradient(135deg, #0b1020 0%, #1e1b4b 50%, #0f172a 100%)",
    cardBg: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255,255,255,0.1)",
    glow: "0 8px 32px 0 rgba(0,0,0,0.37)"
  },
  premium: {
    bg: "radial-gradient(ellipse at center, #1a2035 0%, #06070a 100%)",
    cardBg: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
    border: "1px solid rgba(255,255,255,0.1)",
    glow: "0 8px 32px 0 rgba(0,0,0,0.5)"
  },
  minimal: {
    bg: "#06070A",
    cardBg: "#0E1117",
    border: "1px solid rgba(255,255,255,0.04)",
    glow: "none"
  },
  hacker: {
    bg: "#000000",
    cardBg: "rgba(0,255,0,0.02)",
    border: "1px solid rgba(0,255,0,0.2)",
    glow: "0 0 20px rgba(0,255,0,0.1)"
  }
};

function clampText(text: string, max = 200): string {
  const t = (text || "").trim();
  return t.length > max ? `${t.slice(0, max).trimEnd()}...` : t;
}

export function useShareAsImage(
  cardRef: RefObject<HTMLDivElement | null>,
  filename: string
): { capture: () => Promise<void>; capturing: boolean } {
  const [capturing, setCapturing] = useState(false);

  const capture = useCallback(async () => {
    if (!cardRef.current || capturing) return;
    setCapturing(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        useCORS: true,
        scale: 2,
        logging: false,
        allowTaint: false,
      });
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      toast.error("Could not generate image. Try again.");
    } finally {
      setCapturing(false);
    }
  }, [cardRef, filename, capturing]);

  return { capture, capturing };
}

function ExportShell({
  cardRef,
  children,
  styleVariant = "default",
}: {
  cardRef: RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  styleVariant?: ExportStyle;
}) {
  const style = STYLE_MAP[styleVariant];
  return (
    <div
      ref={cardRef}
      id="export-card"
      style={{
        width: OG_WIDTH,
        height: OG_HEIGHT,
        position: "fixed",
        top: -9999,
        left: 0,
        zIndex: -1,
        background: style.bg,
        borderRadius: 24,
        overflow: "hidden",
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
        color: "#fff",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          padding: 60,
          background: style.cardBg,
          border: style.border,
          boxShadow: style.glow,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Avatar({ src, name }: { src?: string | null; name?: string | null }) {
  const resolved = resolveAvatar(src ?? null);
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        overflow: "hidden",
        boxShadow: "0 0 0 2px rgba(59,130,246,0.4)",
        flexShrink: 0,
      }}
    >
      <img
        src={resolved}
        alt={name ?? "avatar"}
        crossOrigin="anonymous"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

function Branding() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end", opacity: 0.8 }}>
      <div style={{ width: 24, height: 24, borderRadius: 8, background: "linear-gradient(135deg, #60A5FA, #8B5CF6)", boxShadow: "0 2px 10px rgba(139,92,246,0.4)" }} />
      <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>DevOS</span>
    </div>
  );
}

interface FeedPostShareCardProps {
  post: FeedPost;
  cardRef: RefObject<HTMLDivElement | null>;
  styleVariant?: ExportStyle;
}

export function FeedPostShareCard({ post, cardRef, styleVariant = "default" }: FeedPostShareCardProps) {
  return (
    <ExportShell cardRef={cardRef} styleVariant={styleVariant}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar src={post.avatarUrl} name={post.displayName || post.username} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{post.displayName || post.username}</div>
            <div style={{ fontSize: 16, color: "#9CA3AF" }}>@{post.username} · {post.createdAt ? formatRelativeTime(post.createdAt) : "just now"}</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        <p style={{ fontSize: 32, lineHeight: 1.4, fontWeight: 600, margin: 0, whiteSpace: "pre-wrap", color: "#f8fafc" }}>
          {clampText(post.content)}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
        <div>
          {post.projectName && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "8px 16px",
                borderRadius: 999,
                background: "rgba(59,130,246,0.1)",
                border: "1px solid #3B82F6",
                color: "#93c5fd",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {post.projectName}
            </span>
          )}
        </div>
        <Branding />
      </div>
    </ExportShell>
  );
}

interface ProjectShareCardProps {
  project: Project;
  username?: string | null;
  avatarUrl?: string | null;
  cardRef: RefObject<HTMLDivElement | null>;
  styleVariant?: ExportStyle;
}

export function ProjectShareCard({ project, username, avatarUrl, cardRef, styleVariant = "gradient" }: ProjectShareCardProps) {
  return (
    <ExportShell cardRef={cardRef} styleVariant={styleVariant}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <Avatar src={avatarUrl} name={username} />
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{username ?? "Developer"}</div>
          <div style={{ fontSize: 16, color: "#9CA3AF" }}>Project highlight</div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 44, lineHeight: 1.15 }}>{project.name}</h2>
        <p style={{ margin: 0, fontSize: 28, lineHeight: 1.35, color: "#d1d5db", fontWeight: 600 }}>
          {clampText(project.description || "Built with DevOS")}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
        <span
          style={{
            display: "inline-flex",
            padding: "8px 16px",
            borderRadius: 999,
            border: "1px solid #3B82F6",
            background: "rgba(59,130,246,0.1)",
            color: "#93c5fd",
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          {project.isPublic ? "Public Project" : "Private Project"}
        </span>
        <Branding />
      </div>
    </ExportShell>
  );
}


interface LearnProgressShareCardProps {
  topicTitle: string;
  username?: string | null;
  avatarUrl?: string | null;
  cardRef: RefObject<HTMLDivElement | null>;
  styleVariant?: ExportStyle;
}

export function LearnProgressShareCard({ topicTitle, username, avatarUrl, cardRef, styleVariant = "premium" }: LearnProgressShareCardProps) {
  return (
    <ExportShell cardRef={cardRef} styleVariant={styleVariant}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <Avatar src={avatarUrl} name={username} />
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{username ?? "Developer"}</div>
          <div style={{ fontSize: 16, color: "#9CA3AF" }}>Learning Progress</div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 44, lineHeight: 1.15 }}>{topicTitle}</h2>
        <p style={{ margin: 0, fontSize: 28, lineHeight: 1.35, color: "#10b981", fontWeight: 600 }}>
          🎉 Topic Completed!
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
        <span
          style={{
            display: "inline-flex",
            padding: "8px 16px",
            borderRadius: 999,
            border: "1px solid #10B981",
            background: "rgba(16,185,129,0.1)",
            color: "#6ee7b7",
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          DevOS Learn
        </span>
        <Branding />
      </div>
    </ExportShell>
  );
}
