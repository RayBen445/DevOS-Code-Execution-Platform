/**
 * ShareAsImageCard — DOM-based cards captured by html2canvas and downloaded as PNG.
 *
 * Exports:
 *   - FeedPostShareCard   — styled card for a feed post
 *   - ProjectShareCard    — styled card for a project
 *   - useShareAsImage     — hook that triggers the html2canvas capture + download
 */
import { useRef, useCallback, useState, RefObject } from "react";
import html2canvas from "html2canvas";
import { FeedPost, Project } from "../types";
import { resolveAvatar } from "../lib/avatars";
import { formatRelativeTime } from "../lib/utils";

/* ─── Hook ─── */

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
        foreignObjectRendering: false,
      });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch {
      // Silently ignore capture errors (CORS on avatars etc.)
    } finally {
      setCapturing(false);
    }
  }, [cardRef, filename, capturing]);

  return { capture, capturing };
}

/* ─── Shared style tokens (inline — html2canvas cannot read Tailwind classes reliably) ─── */

const CARD_STYLE: React.CSSProperties = {
  width: 600,
  background: "#0f0f11",
  borderRadius: 20,
  overflow: "hidden",
  fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  color: "#ffffff",
  position: "relative",
};

const ACCENT_STYLE: React.CSSProperties = {
  height: 4,
  background: "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)",
};

const BRANDING_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 6,
  padding: "10px 24px",
  borderTop: "1px solid rgba(255,255,255,0.06)",
};

const BRAND_DOT: React.CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: 5,
  background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

function Branding() {
  return (
    <div style={BRANDING_STYLE}>
      <div style={BRAND_DOT}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <circle cx="5" cy="5" r="4" stroke="white" strokeWidth="1.5" />
          <path d="M3.5 5h3M5 3.5v3" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6", letterSpacing: "0.04em" }}>
        DevOS
      </span>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 2 }}>
        devos.io
      </span>
    </div>
  );
}

function Avatar({ src, name, size = 40 }: { src?: string | null; name?: string | null; size?: number }) {
  const initial = (name ?? "U")[0].toUpperCase();
  const resolved = resolveAvatar(src ?? null);
  const isDefault = !src || src.startsWith("data:");

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#1e3a5f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {!isDefault ? (
        // Use img for real avatars; html2canvas + useCORS will handle it
        <img
          src={resolved}
          alt={name ?? "avatar"}
          crossOrigin="anonymous"
          style={{ width: size, height: size, objectFit: "cover" }}
        />
      ) : (
        <span style={{ fontSize: size * 0.4, fontWeight: 700, color: "#93c5fd" }}>{initial}</span>
      )}
    </div>
  );
}

/* ─── Feed Post Card ─── */

interface FeedPostShareCardProps {
  post: FeedPost;
  cardRef: RefObject<HTMLDivElement | null>;
}

const POST_TYPE_COLOR: Record<string, string> = {
  deployment: "#22c55e",
  announcement: "#3b82f6",
  feature: "#a855f7",
  update: "#eab308",
  snippet: "#f97316",
  repost: "#14b8a6",
};

const POST_TYPE_LABEL: Record<string, string> = {
  deployment: "🚀 Deployment",
  announcement: "📢 Announcement",
  feature: "✨ Feature",
  update: "🔄 Update",
  snippet: "💾 Snippet",
  repost: "🔁 Repost",
};

export function FeedPostShareCard({ post, cardRef }: FeedPostShareCardProps) {
  const typeColor = POST_TYPE_COLOR[post.type] ?? "#6b7280";
  const typeLabel = POST_TYPE_LABEL[post.type] ?? post.type;

  return (
    <div
      ref={cardRef}
      style={{
        ...CARD_STYLE,
        position: "fixed",
        left: -9999,
        top: 0,
        zIndex: -1,
      }}
    >
      {/* Gradient accent bar */}
      <div style={ACCENT_STYLE} />

      {/* Body */}
      <div style={{ padding: "24px 24px 20px" }}>
        {/* Author row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Avatar src={post.avatarUrl} name={post.displayName || post.username} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 2 }}>
              {post.displayName || post.username}
              {post.isOfficial && (
                <span style={{
                  marginLeft: 8,
                  fontSize: 10,
                  background: "rgba(59,130,246,0.2)",
                  color: "#93c5fd",
                  padding: "2px 7px",
                  borderRadius: 100,
                  fontWeight: 700,
                  verticalAlign: "middle",
                }}>
                  Official
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
              @{post.username}
              {post.createdAt && <> · {formatRelativeTime(post.createdAt)}</>}
            </div>
          </div>
          {/* Type pill */}
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: 100,
            background: `${typeColor}18`,
            color: typeColor,
            border: `1px solid ${typeColor}30`,
            flexShrink: 0,
          }}>
            {typeLabel}
          </div>
        </div>

        {/* Content */}
        <p style={{
          fontSize: 15,
          color: "rgba(255,255,255,0.82)",
          lineHeight: 1.65,
          marginBottom: 16,
          wordBreak: "break-word",
          maxHeight: 120,
          overflow: "hidden",
        }}>
          {post.content}
        </p>

        {/* Embedded repost */}
        {post.type === "repost" && post.originalPost && (
          <div style={{
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            background: "rgba(255,255,255,0.03)",
            padding: "12px 14px",
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
              @{post.originalPost.username}
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
              {post.originalPost.content}
            </p>
          </div>
        )}

        {/* Project chip */}
        {post.projectName && (
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 10px",
            borderRadius: 8,
            background: "rgba(59,130,246,0.08)",
            border: "1px solid rgba(59,130,246,0.2)",
            fontSize: 12,
            color: "#93c5fd",
            marginBottom: 16,
          }}>
            📁 {post.projectName}
          </div>
        )}

        {/* Metrics */}
        <div style={{
          display: "flex",
          gap: 20,
          paddingTop: 14,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          fontSize: 13,
          color: "rgba(255,255,255,0.35)",
        }}>
          <span>❤️ {post.likes ?? 0}</span>
          <span>💬 {post.commentsCount ?? 0}</span>
          <span>🔁 {post.repostCount ?? 0}</span>
          {(post.viewsCount ?? 0) > 0 && <span>👁 {post.viewsCount}</span>}
        </div>
      </div>

      <Branding />
    </div>
  );
}

/* ─── Project Card ─── */

interface ProjectShareCardProps {
  project: Project;
  username?: string | null;
  avatarUrl?: string | null;
  cardRef: RefObject<HTMLDivElement | null>;
}

const DEPLOY_STATUS_COLOR: Record<string, string> = {
  success: "#22c55e",
  building: "#f59e0b",
  failed: "#ef4444",
  idle: "#6b7280",
};

export function ProjectShareCard({ project, username, avatarUrl, cardRef }: ProjectShareCardProps) {
  const statusColor = DEPLOY_STATUS_COLOR[project.deployStatus ?? "idle"];

  return (
    <div
      ref={cardRef}
      style={{
        ...CARD_STYLE,
        position: "fixed",
        left: -9999,
        top: 0,
        zIndex: -1,
      }}
    >
      {/* Gradient accent bar */}
      <div style={ACCENT_STYLE} />

      {/* Body */}
      <div style={{ padding: "24px 24px 20px" }}>
        {/* Author row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <Avatar src={avatarUrl} name={username} size={40} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#fff" }}>{username ?? "Developer"}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>on DevOS</div>
          </div>
          {/* Visibility badge */}
          <div style={{ marginLeft: "auto" }}>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 6,
              background: project.isPublic ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
              color: project.isPublic ? "#4ade80" : "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
            }}>
              {project.isPublic ? "Public" : "Private"}
            </span>
          </div>
        </div>

        {/* Project icon + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "rgba(59,130,246,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: 24,
          }}>
            📁
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: "#fff", marginBottom: 4 }}>
              {project.name}
            </div>
            {project.description && (
              <p style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.5)",
                lineHeight: 1.5,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
              } as React.CSSProperties}>
                {project.description}
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: "flex",
          gap: 16,
          padding: "12px 16px",
          borderRadius: 12,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: 16,
          fontSize: 13,
        }}>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: 16 }}>{project.forksCount ?? 0}</div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>Forks</div>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: 16 }}>{project.views ?? 0}</div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>Views</div>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontWeight: 700, color: statusColor, fontSize: 13, textTransform: "capitalize" }}>
              {project.deployStatus ?? "idle"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>Deploy</div>
          </div>
        </div>

        {/* Live URL */}
        {(project.liveUrl || project.deployUrl) && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 8,
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.2)",
            fontSize: 12,
            color: "#4ade80",
          }}>
            🌐 {project.liveUrl ?? project.deployUrl}
          </div>
        )}
      </div>

      <Branding />
    </div>
  );
}
