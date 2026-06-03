import React, { useState } from "react";
import { AlertTriangle, XCircle, ChevronDown, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import { ValidationError, ValidationResult } from "../types";

interface ErrorPanelProps {
  result: ValidationResult | null;
  isRunning: boolean;
  onJumpToError?: (file: string, line: number, col: number) => void;
  className?: string;
}

function groupByFile(errors: ValidationError[]): Record<string, ValidationError[]> {
  return errors.reduce<Record<string, ValidationError[]>>((acc, e) => {
    const key = e.file || "unknown";
    (acc[key] ??= []).push(e);
    return acc;
  }, {});
}

export default function ErrorPanel({ result, isRunning, onJumpToError, className }: ErrorPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (isRunning) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 text-white/40 text-xs", className)}>
        <Loader2 className="w-3 h-3 animate-spin" />
        Running validation…
      </div>
    );
  }

  if (!result) return null;

  if (result.status === "skipped") {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 text-white/30 text-xs", className)}>
        Validation skipped — no TypeScript or Vite detected
      </div>
    );
  }

  if (result.status === "success" && result.errors.length === 0) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 text-green-400 text-xs", className)}>
        <CheckCircle2 className="w-3.5 h-3.5" />
        No errors found
        {result.durationMs && (
          <span className="text-white/20 ml-1">({result.durationMs}ms)</span>
        )}
      </div>
    );
  }

  const errors = result.errors.filter((e) => e.severity === "error");
  const warnings = result.errors.filter((e) => e.severity === "warning");
  const grouped = groupByFile(result.errors);

  return (
    <div className={cn("flex flex-col text-xs", className)}>
      {/* Summary bar */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-border-base bg-[#161B22]">
        {errors.length > 0 && (
          <span className="flex items-center gap-1 text-red-400 font-medium">
            <XCircle className="w-3.5 h-3.5" />
            {errors.length} error{errors.length !== 1 ? "s" : ""}
          </span>
        )}
        {warnings.length > 0 && (
          <span className="flex items-center gap-1 text-yellow-400 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            {warnings.length} warning{warnings.length !== 1 ? "s" : ""}
          </span>
        )}
        {result.durationMs && (
          <span className="ml-auto text-white/20">{result.durationMs}ms</span>
        )}
      </div>

      {/* Per-file error groups */}
      <div className="overflow-y-auto max-h-48 custom-scrollbar">
        {Object.entries(grouped).map(([file, fileErrors]) => {
          const isCollapsed = collapsed[file];
          const hasError = fileErrors.some((e) => e.severity === "error");

          return (
            <div key={file} className="border-b border-border-base">
              {/* File header */}
              <button
                className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-white/4 text-left transition-colors"
                onClick={() => setCollapsed((p) => ({ ...p, [file]: !p[file] }))}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3 h-3 text-white/30 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-white/30 flex-shrink-0" />
                )}
                {hasError ? (
                  <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                )}
                <span className="font-mono text-white/60 truncate">{file}</span>
                <span className="ml-auto text-white/30 flex-shrink-0">
                  {fileErrors.length}
                </span>
              </button>

              {/* Error rows */}
              {!isCollapsed && (
                <div className="pl-8">
                  {fileErrors.map((err, i) => (
                    <button
                      key={i}
                      onClick={() => onJumpToError?.(err.file, err.line, err.col)}
                      className={cn(
                        "flex items-start gap-2 w-full px-3 py-1 text-left hover:bg-white/4 transition-colors group",
                        err.severity === "error" ? "text-red-300" : "text-yellow-300"
                      )}
                      title={`${err.file}:${err.line}:${err.col}`}
                    >
                      <span className="font-mono text-white/30 flex-shrink-0 mt-0.5 text-[10px]">
                        {err.line}:{err.col}
                      </span>
                      <span className="break-words">{err.message}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
