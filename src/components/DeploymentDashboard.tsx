import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RotateCcw,
  Rocket,
  ExternalLink,
  GitBranch,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import {
  subscribeProjectDeployments,
  rollbackToDeployment,
  promoteToProduction,
} from "../lib/rollbackService";
import { Deployment } from "../types";
import { toast } from "sonner";

interface DeploymentDashboardProps {
  projectId: string;
  userId: string;
  activeDeploymentId?: string | null;
  canManage?: boolean;
}

function relativeTime(ts: any): string {
  try {
    const date: Date =
      ts?.toDate ? ts.toDate() : ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return "—";
  }
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  ready: <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />,
  building: <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />,
  failed: <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />,
};

const STATUS_LABEL: Record<string, string> = {
  ready: "Ready",
  building: "Building",
  failed: "Failed",
};

export default function DeploymentDashboard({
  projectId,
  userId,
  activeDeploymentId,
  canManage = false,
}: DeploymentDashboardProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  useEffect(() => {
    return subscribeProjectDeployments(projectId, setDeployments);
  }, [projectId]);

  const handleRollback = async (deployment: Deployment) => {
    if (working) return;
    setWorking(deployment.id);
    try {
      const url = await rollbackToDeployment(projectId, deployment.id, userId);
      toast.success(`Rolled back — live at ${url}`);
    } catch (err: any) {
      toast.error(err.message || "Rollback failed");
    } finally {
      setWorking(null);
    }
  };

  const handlePromote = async (deployment: Deployment) => {
    if (working) return;
    setWorking(deployment.id);
    try {
      const url = await promoteToProduction(projectId, deployment.id, userId);
      toast.success(`Promoted to production — live at ${url}`);
    } catch (err: any) {
      toast.error(err.message || "Promote failed");
    } finally {
      setWorking(null);
    }
  };

  if (deployments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-white/30 text-sm gap-2">
        <Rocket className="w-8 h-8 opacity-30" />
        <p>No deployments yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {deployments.map((dep) => {
        const isActive = dep.id === activeDeploymentId;
        const isExpanded = expanded === dep.id;
        const isMain = dep.branch === "main" || dep.branch === "production" || dep.branch === "master" || !dep.branch;
        const isBusy = working === dep.id;

        return (
          <div
            key={dep.id}
            className={cn(
              "rounded-xl border transition-colors",
              isActive
                ? "border-green-500/30 bg-green-500/5"
                : "border-border-base bg-white/3 hover:bg-white/5"
            )}
          >
            {/* Row */}
            <div className="flex items-center gap-2 px-3 py-2.5">
              {STATUS_ICON[dep.status] ?? STATUS_ICON.building}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Branch badge */}
                  <span className="flex items-center gap-1 text-[11px] font-medium text-white/70">
                    <GitBranch className="w-3 h-3 opacity-50" />
                    {dep.branch ?? "main"}
                  </span>

                  {/* Active badge */}
                  {isActive && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/15 text-green-400 border border-green-500/30 uppercase tracking-wider">
                      Live
                    </span>
                  )}

                  {/* Commit hash */}
                  {dep.commitHash && (
                    <span className="font-mono text-[10px] text-white/30">
                      {dep.commitHash.slice(0, 7)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-white/30">
                    <Clock className="w-2.5 h-2.5 inline mr-0.5 opacity-50" />
                    {relativeTime(dep.createdAt)}
                  </span>
                  {dep.framework && (
                    <span className="text-[10px] text-white/20">{dep.framework}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {dep.url && dep.status === "ready" && (
                  <a
                    href={dep.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                    title="Open live URL"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                {canManage && dep.status === "ready" && !isActive && (
                  <>
                    {/* Rollback (for older deployments on main branch) */}
                    {isMain && (
                      <button
                        onClick={() => handleRollback(dep)}
                        disabled={isBusy}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-white/5 hover:bg-amber-500/15 text-white/50 hover:text-amber-400 border border-border-base hover:border-amber-500/30 transition-all disabled:opacity-40"
                        title="Roll back to this deployment"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                        Rollback
                      </button>
                    )}

                    {/* Promote (for branch deployments) */}
                    {!isMain && (
                      <button
                        onClick={() => handlePromote(dep)}
                        disabled={isBusy}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-white/5 hover:bg-blue-500/15 text-white/50 hover:text-blue-400 border border-border-base hover:border-blue-500/30 transition-all disabled:opacity-40"
                        title="Promote to production"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Rocket className="w-3 h-3" />
                        )}
                        Promote
                      </button>
                    )}
                  </>
                )}

                {/* Expand toggle */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : dep.id)}
                  className="p-1.5 rounded-lg hover:bg-white/8 text-white/20 hover:text-white/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Expanded detail */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 border-t border-border-base pt-2 flex flex-col gap-1.5 text-[11px]">
                    <div className="flex items-center gap-2 text-white/40">
                      <span className="font-medium text-white/60">Status:</span>
                      <span>{STATUS_LABEL[dep.status] ?? dep.status}</span>
                    </div>
                    {dep.url && (
                      <div className="flex items-center gap-2 text-white/40 min-w-0">
                        <span className="font-medium text-white/60 flex-shrink-0">Live URL:</span>
                        <a
                          href={dep.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-blue-400 hover:underline"
                        >
                          {dep.url}
                        </a>
                      </div>
                    )}
                    {dep.previewUrl && dep.previewUrl !== dep.url && (
                      <div className="flex items-center gap-2 text-white/40 min-w-0">
                        <span className="font-medium text-white/60 flex-shrink-0">Preview:</span>
                        <a
                          href={dep.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-violet-400 hover:underline"
                        >
                          {dep.previewUrl}
                        </a>
                      </div>
                    )}
                    {dep.buildCommand && (
                      <div className="flex items-center gap-2 text-white/40">
                        <span className="font-medium text-white/60">Build:</span>
                        <code className="font-mono text-white/50">{dep.buildCommand}</code>
                      </div>
                    )}
                    {dep.error && (
                      <div className="flex items-start gap-2 text-red-400">
                        <span className="font-medium text-red-500 flex-shrink-0">Error:</span>
                        <span className="break-all">{dep.error}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
