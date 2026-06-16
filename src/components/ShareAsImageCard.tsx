import React, { useState, useRef, useCallback, RefObject } from "react";
import html2canvas from "html2canvas";
import { FeedPost, Project } from "../types";
import { resolveAvatar } from "../lib/avatars";
import { formatRelativeTime } from "../lib/utils";
import { toast } from "sonner";
import { Layers, Flame, Star, Sparkles } from "lucide-react";

type ExportStyle = "default" | "gradient" | "premium" | "glass" | "neon";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const STYLE_MAP: Record<ExportStyle, { bg: string; cardBg: string; border: string; glow: string }> = {
  default: {
    bg: "radial-gradient(circle at top left, #0f172a 0%, #020617 100%)",
    cardBg: "rgba(15, 23, 42, 0.7)",
    border: "1px solid rgba(255,255,255,0.05)",
    glow: "0 25px 50px -12px rgba(0,0,0,0.5)"
  },
  gradient: {
    bg: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
    cardBg: "linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
    border: "1px solid rgba(255,255,255,0.1)",
    glow: "0 25px 50px -12px rgba(0,0,0,0.5)"
  },
  premium: {
    bg: "radial-gradient(ellipse at center, #1e293b 0%, #020617 100%)",
    cardBg: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))",
    border: "1px solid rgba(255,255,255,0.1)",
    glow: "0 30px 60px -12px rgba(0,0,0,0.6)"
  },
  glass: {
    bg: "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop') center/cover",
    cardBg: "rgba(15, 23, 42, 0.65)",
    border: "1px solid rgba(255,255,255,0.2)",
    glow: "0 8px 32px 0 rgba(0,0,0,0.37)"
  },
  neon: {
    bg: "#09090b",
    cardBg: "rgba(18, 18, 20, 0.9)",
    border: "1px solid rgba(139, 92, 246, 0.3)",
    glow: "0 0 40px rgba(139, 92, 246, 0.2)"
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
  styleVariant = "premium",
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
        overflow: "hidden",
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          padding: "48px 56px",
          background: style.cardBg,
          border: style.border,
          boxShadow: style.glow,
          borderRadius: 32,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          position: "relative",
        }}
      >
        {/* Ambient top glow inside card */}
        <div style={{
          position: "absolute", top: 0, left: "20%", width: "60%", height: "20%",
          background: "radial-gradient(ellipse at top, rgba(59,130,246,0.15) 0%, transparent 70%)",
          pointerEvents: "none"
        }} />
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
        width: 64,
        height: 64,
        borderRadius: "50%",
        overflow: "hidden",
        boxShadow: "0 0 0 2px rgba(255,255,255,0.1), 0 0 20px rgba(59,130,246,0.3)",
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
    <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end", opacity: 0.9 }}>
      <div style={{ 
        width: 32, height: 32, borderRadius: 10, 
        background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", 
        boxShadow: "0 4px 14px rgba(139,92,246,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <Sparkles size={16} color="white" />
      </div>
      <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", background: "linear-gradient(to right, #fff, #cbd5e1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>DevOS</span>
    </div>
  );
}

export function FeedPostShareCard({ post, cardRef, styleVariant = "premium" }: { post: FeedPost; cardRef: RefObject<HTMLDivElement | null>; styleVariant?: ExportStyle }) {
  // Try to remove markdown formatting for the image
  const plainText = clampText(post.content.replace(/[*_#>`]/g, ''), 220);

  return (
    <ExportShell cardRef={cardRef} styleVariant={styleVariant}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar src={post.avatarUrl} name={post.displayName || post.username} />
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.01em", color: "#f8fafc" }}>{post.displayName || post.username}</div>
            <div style={{ fontSize: 18, color: "#94a3b8", fontWeight: 500, marginTop: 4 }}>
              @{post.username} &middot; {post.createdAt ? formatRelativeTime(post.createdAt) : "just now"}
            </div>
          </div>
        </div>
        {/* Post Type Badge */}
        <div style={{
          padding: "8px 16px", borderRadius: 999, background: "rgba(255,255,255,0.05)", 
          border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1", fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em"
        }}>
          {post.type.toUpperCase()}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", zIndex: 10 }}>
        <p style={{ 
          fontSize: 38, lineHeight: 1.4, fontWeight: 600, margin: 0, 
          color: "#f1f5f9", textShadow: "0 2px 10px rgba(0,0,0,0.5)"
        }}>
          {plainText}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 32, zIndex: 10 }}>
        <div>
          {post.projectName && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 999,
                background: "linear-gradient(90deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))",
                border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa", fontSize: 18, fontWeight: 700,
                boxShadow: "0 0 20px rgba(59,130,246,0.1)"
              }}>
                <Layers size={20} />
                {post.projectName}
              </div>
            </div>
          )}
        </div>
        <Branding />
      </div>
    </ExportShell>
  );
}

export function ProjectShareCard({ project, username, avatarUrl, cardRef, styleVariant = "glass" }: { project: Project; username?: string | null; avatarUrl?: string | null; cardRef: RefObject<HTMLDivElement | null>; styleVariant?: ExportStyle }) {
  return (
    <ExportShell cardRef={cardRef} styleVariant={styleVariant}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, zIndex: 10 }}>
        <Avatar src={avatarUrl} name={username} />
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#f8fafc" }}>{username ?? "Developer"}</div>
          <div style={{ fontSize: 18, color: "#94a3b8", fontWeight: 500, marginTop: 4 }}>Featured Project</div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20, zIndex: 10 }}>
        <h2 style={{ 
          margin: 0, fontSize: 56, lineHeight: 1.1, fontWeight: 800, letterSpacing: "-0.02em",
          background: "linear-gradient(to right, #ffffff, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
        }}>{project.name}</h2>
        <p style={{ margin: 0, fontSize: 30, lineHeight: 1.4, color: "#cbd5e1", fontWeight: 500, maxWidth: "90%" }}>
          {clampText(project.description || "Built with DevOS")}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 32, zIndex: 10 }}>
        <div style={{ display: "flex", gap: 12 }}>
           <span style={{
             display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 999,
             border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#f8fafc", fontSize: 16, fontWeight: 700
           }}>
             <Flame size={18} color="#fbbf24" /> Top Project
           </span>
        </div>
        <Branding />
      </div>
    </ExportShell>
  );
}

export function LearnProgressShareCard({ topicTitle, username, avatarUrl, cardRef, styleVariant = "neon" }: { topicTitle: string, username?: string | null, avatarUrl?: string | null, cardRef: RefObject<HTMLDivElement | null>, styleVariant?: ExportStyle }) {
  return (
    <ExportShell cardRef={cardRef} styleVariant={styleVariant}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, zIndex: 10 }}>
        <Avatar src={avatarUrl} name={username} />
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#f8fafc" }}>{username ?? "Developer"}</div>
          <div style={{ fontSize: 18, color: "#94a3b8", fontWeight: 500, marginTop: 4 }}>Learning Progress</div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20, zIndex: 10 }}>
        <h2 style={{ 
          margin: 0, fontSize: 56, lineHeight: 1.1, fontWeight: 800, letterSpacing: "-0.02em",
          background: "linear-gradient(to right, #ffffff, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
        }}>Completed: {topicTitle}</h2>
        <p style={{ margin: 0, fontSize: 30, lineHeight: 1.4, color: "#cbd5e1", fontWeight: 500, maxWidth: "90%" }}>
          Just leveled up my skills on DevOS! 🚀
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 32, zIndex: 10 }}>
        <Branding />
      </div>
    </ExportShell>
  );
}
