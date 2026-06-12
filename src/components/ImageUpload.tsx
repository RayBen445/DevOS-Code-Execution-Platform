import React, { useRef, useState, useCallback } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../lib/utils";

const DEFAULT_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";

export interface ImageUploadProps {
  /** Current image URL shown as the preview. */
  value?: string;
  /** Called with the validated File when a file is picked or dropped. */
  onFile: (file: File) => void;
  /** Called when the remove button is clicked (only shown when `value` is set). */
  onRemove?: () => void;
  /** Show a loading spinner + optional progress bar. */
  uploading?: boolean;
  /** Upload progress 0–100. Only rendered when `uploading` is true. */
  progress?: number;
  /** MIME type filter passed to the file input. Defaults to common image types. */
  accept?: string;
  /** Maximum file size in MB before showing an error. Defaults to 5. */
  maxSizeMB?: number;
  disabled?: boolean;
  /**
   * Visual variant:
   *  - "circle"  — round avatar (≈80 px, used in profile modal)
   *  - "square"  — square with rounded corners (96 px, used in settings page)
   *  - "banner"  — full-width landscape rectangle (used for event/community banners)
   */
  shape?: "circle" | "square" | "banner";
  /** Placeholder label shown in the drop zone. */
  label?: string;
  /** Small hint shown below the label (banner shape only). */
  hint?: string;
  className?: string;
}

/**
 * Universal image upload zone.
 *
 * Supports both **drag-and-drop** and **click-to-browse** in every shape variant.
 * Validates file type and size before calling `onFile`.
 * Shows the image as a full-cover preview once a URL is provided via `value`.
 * Displays an animated progress bar while `uploading` is true.
 *
 * Usage:
 * ```tsx
 * <ImageUpload
 *   shape="circle"
 *   value={avatarUrl}
 *   onFile={handleAvatarFile}
 *   onRemove={() => setAvatarUrl("")}
 *   uploading={uploading}
 *   progress={uploadProgress}
 * />
 * ```
 */
export default function ImageUpload({
  value,
  onFile,
  onRemove,
  uploading = false,
  progress = 0,
  accept = DEFAULT_ACCEPT,
  maxSizeMB = 5,
  disabled = false,
  shape = "banner",
  label,
  hint,
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file.");
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`Image must be under ${maxSizeMB} MB.`);
        return;
      }
      onFile(file);
    },
    [onFile, maxSizeMB],
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear drag state when leaving the outer element (not a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset so the same file can be re-selected if needed
    e.target.value = "";
  };

  const handleClick = () => {
    if (!disabled && !uploading) inputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
  };

  const shapeClasses: Record<NonNullable<ImageUploadProps["shape"]>, string> = {
    circle: "w-20 h-20 rounded-full",
    square: "w-24 h-24 rounded-2xl",
    banner: "w-full h-36 rounded-xl",
  };

  const isCircle = shape === "circle";
  const isBanner = shape === "banner";

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={value ? "Change image" : "Upload image"}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "relative group select-none overflow-hidden transition-all duration-200",
        "border-2 border-dashed",
        shapeClasses[shape],
        dragging
          ? "border-blue-400 bg-blue-500/10 scale-[1.02]"
          : value
            ? "border-border-base cursor-pointer"
            : "border-border-base bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06] cursor-pointer",
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
    >
      {/* ── Preview image ───────────────────────────────────────────────── */}
      {value && !uploading && (
        <img
          src={value}
          alt="Preview"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      )}

      {/* ── Empty placeholder ───────────────────────────────────────────── */}
      {!value && !uploading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white/30 group-hover:text-white/50 transition-colors p-3">
          {dragging ? (
            <ImageIcon className={cn("transition-transform scale-110", isCircle ? "w-6 h-6" : "w-7 h-7")} />
          ) : (
            <Upload className={cn(isCircle ? "w-5 h-5" : "w-6 h-6")} />
          )}
          {!isCircle && (
            <span className="text-[11px] font-medium text-center leading-tight pointer-events-none">
              {dragging ? "Drop to upload" : (label ?? "Drop image or click to upload")}
            </span>
          )}
          {isBanner && hint && (
            <span className="text-[10px] text-white/20 pointer-events-none">{hint}</span>
          )}
        </div>
      )}

      {/* ── Upload progress overlay ─────────────────────────────────────── */}
      {uploading && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 p-4">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          {progress > 0 && progress < 100 && (
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Hover overlay when a preview exists (change / remove) ───────── */}
      {value && !uploading && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <span className="flex items-center gap-1 text-white text-[11px] font-semibold bg-black/50 px-2.5 py-1 rounded-lg backdrop-blur-sm">
            <Upload className="w-3 h-3" />
            {isCircle ? "" : "Change"}
          </span>
          {onRemove && (
            <button
              type="button"
              aria-label="Remove image"
              onClick={handleRemove}
              className="flex items-center gap-1 text-white text-[11px] font-semibold bg-red-600/70 hover:bg-red-600 px-2.5 py-1 rounded-lg backdrop-blur-sm transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* ── Drag-over highlight ring ────────────────────────────────────── */}
      {dragging && (
        <div className="absolute inset-0 ring-2 ring-blue-400 ring-inset rounded-[inherit] pointer-events-none" />
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled || uploading}
        tabIndex={-1}
      />
    </div>
  );
}
