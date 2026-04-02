import React, { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import { resolveAvatar } from "../lib/avatars";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<AvatarSize, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-20 h-20 text-xl",
};

interface AvatarProps {
  src?: string | null;
  displayName?: string | null;
  size?: AvatarSize;
  className?: string;
  /** If provided, shows an edit overlay on hover/tap and calls this when the user picks a file */
  onEditClick?: () => void;
  /** Shows a spinner overlay over the avatar */
  uploading?: boolean;
  uploadProgress?: number;
}

export default function Avatar({
  src,
  displayName,
  size = "md",
  className,
  onEditClick,
  uploading,
  uploadProgress,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const resolvedSrc = resolveAvatar(src);
  const trimmedName = displayName?.trim() || "";
  const initial = trimmedName ? trimmedName[0].toUpperCase() : "?";

  return (
    <div className={cn("relative flex-shrink-0 group/avatar", SIZE_MAP[size], className)}>
      <div className="w-full h-full rounded-full overflow-hidden ring-2 ring-white/10 transition-all group-hover/avatar:ring-white/20">
        {!imgError ? (
          <img
            src={resolvedSrc}
            alt={displayName ?? "avatar"}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600/30 to-purple-600/30 text-white font-bold">
            {initial}
          </div>
        )}
      </div>

      {/* Upload progress overlay */}
      {uploading && (
        <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
          {uploadProgress !== undefined && uploadProgress < 100 ? (
            <div className="relative w-2/3">
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <Loader2 className="w-1/3 h-1/3 text-white animate-spin" />
          )}
        </div>
      )}

      {/* Edit overlay (desktop hover / mobile tap) */}
      {onEditClick && !uploading && (
        <button
          type="button"
          onClick={onEditClick}
          className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center"
          aria-label="Change avatar"
        >
          <Camera className="w-1/3 h-1/3 text-white" />
        </button>
      )}
    </div>
  );
}
