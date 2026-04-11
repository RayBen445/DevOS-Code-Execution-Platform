import React, { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { cn } from "../lib/utils";
import { subscribeBuildJob } from "../lib/buildQueueService";
import { BuildJob, BuildJobStatus } from "../types";

interface BuildStatusBadgeProps {
  jobId: string;
  className?: string;
  showPreviewLink?: boolean;
}

const STATUS_CONFIG: Record<
  BuildJobStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  queued: {
    label: "Queued",
    icon: <Clock className="w-3 h-3" />,
    className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  },
  running: {
    label: "Building…",
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  success: {
    label: "Deployed",
    icon: <CheckCircle2 className="w-3 h-3" />,
    className: "bg-green-500/15 text-green-400 border-green-500/30",
  },
  failed: {
    label: "Failed",
    icon: <XCircle className="w-3 h-3" />,
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
};

export default function BuildStatusBadge({
  jobId,
  className,
  showPreviewLink = true,
}: BuildStatusBadgeProps) {
  const [job, setJob] = useState<BuildJob | null>(null);

  useEffect(() => {
    if (!jobId) return;
    return subscribeBuildJob(jobId, setJob);
  }, [jobId]);

  if (!job) return null;

  const cfg = STATUS_CONFIG[job.status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
        cfg.className,
        className
      )}
    >
      {cfg.icon}
      {cfg.label}
      {showPreviewLink && job.status === "success" && job.previewUrl && (
        <a
          href={job.previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-0.5 opacity-70 hover:opacity-100 transition-opacity"
          title="Open preview"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      )}
    </span>
  );
}
