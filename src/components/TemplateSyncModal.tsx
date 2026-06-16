import React, { useState, useEffect } from "react";
import { X, RefreshCw, AlertCircle, FileCode, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DiffEditor } from "@monaco-editor/react";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { FileData, Project } from "../types";
import { toast } from "sonner";
import { cn } from "../lib/utils";

interface TemplateSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  localFiles: FileData[];
  onAcceptChanges: (updatedFiles: FileData[]) => void;
}

export default function TemplateSyncModal({
  isOpen,
  onClose,
  project,
  localFiles,
  onAcceptChanges
}: TemplateSyncModalProps) {
  const theme = "dark";
  const [isLoading, setIsLoading] = useState(false);
  const [templateFiles, setTemplateFiles] = useState<FileData[]>([]);
  const [diffFiles, setDiffFiles] = useState<{ local: FileData | null, template: FileData }[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [acceptedFiles, setAcceptedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && project.forkedFrom) {
      fetchTemplateFiles();
    }
  }, [isOpen, project.forkedFrom]);

  const fetchTemplateFiles = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, "projects", project.forkedFrom!, "files"));
      const tFiles = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FileData));
      setTemplateFiles(tFiles);

      // Compute diffs
      const diffs: { local: FileData | null, template: FileData }[] = [];
      tFiles.forEach(tFile => {
        const lFile = localFiles.find(f => f.path === tFile.path);
        // Only include if missing locally or content differs
        if (!lFile || lFile.content !== tFile.content) {
          diffs.push({ local: lFile || null, template: tFile });
        }
      });
      setDiffFiles(diffs);
      setSelectedFileIndex(0);
      setAcceptedFiles(new Set());
    } catch (err) {
      console.error("Error fetching template files:", err);
      toast.error("Failed to fetch template files");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptFile = () => {
    if (diffFiles.length === 0) return;
    const currentDiff = diffFiles[selectedFileIndex];
    setAcceptedFiles(prev => new Set(prev).add(currentDiff.template.path));
    
    // Auto-advance to next unaccepted file
    const nextIndex = diffFiles.findIndex((diff, i) => i > selectedFileIndex && !acceptedFiles.has(diff.template.path));
    if (nextIndex !== -1) {
      setSelectedFileIndex(nextIndex);
    }
  };

  const handleApplyAllAccepted = () => {
    if (acceptedFiles.size === 0) {
      onClose();
      return;
    }

    const updatedFiles = [...localFiles];
    let newFilesToAdd: FileData[] = [];

    diffFiles.forEach(diff => {
      if (acceptedFiles.has(diff.template.path)) {
        const existingIndex = updatedFiles.findIndex(f => f.path === diff.template.path);
        if (existingIndex !== -1) {
          updatedFiles[existingIndex] = { ...updatedFiles[existingIndex], content: diff.template.content };
        } else {
          newFilesToAdd.push({ ...diff.template, id: crypto.randomUUID() });
        }
      }
    });

    onAcceptChanges([...updatedFiles, ...newFilesToAdd]);
    toast.success(`Successfully synced ${acceptedFiles.size} file(s) from template!`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className={cn(
            "w-full max-w-6xl h-[85vh] rounded-2xl flex flex-col overflow-hidden border shadow-2xl",
            theme === "dark" 
              ? "bg-[#0B0E14] border-white/10" 
              : "bg-white border-black/10"
          )}
        >
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between px-6 py-4 border-b",
            theme === "dark" ? "border-white/10 bg-[#0B0E14]" : "border-black/10 bg-gray-50/50"
          )}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 text-blue-500 rounded-lg">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Template Sync</h2>
                <p className={theme === "dark" ? "text-gray-400 text-sm" : "text-gray-500 text-sm"}>
                  Review updates from the original template
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={cn(
                "p-2 rounded-lg transition-colors",
                theme === "dark" ? "hover:bg-white/5" : "hover:bg-black/5"
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                <p className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
                  Analyzing template changes...
                </p>
              </div>
            ) : diffFiles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-medium">Up to Date</h3>
                <p className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
                  Your project is perfectly synced with the original template.
                </p>
              </div>
            ) : (
              <>
                {/* Sidebar */}
                <div className={cn(
                  "w-72 flex flex-col border-r overflow-y-auto",
                  theme === "dark" ? "border-white/10 bg-[#0B0E14]" : "border-black/10 bg-gray-50/50"
                )}>
                  <div className="p-4">
                    <div className="text-sm font-medium mb-3 flex items-center justify-between">
                      <span className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>Changed Files</span>
                      <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {diffFiles.length}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {diffFiles.map((diff, idx) => {
                        const isAccepted = acceptedFiles.has(diff.template.path);
                        return (
                          <button
                            key={diff.template.path}
                            onClick={() => setSelectedFileIndex(idx)}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left",
                              selectedFileIndex === idx
                                ? (theme === "dark" ? "bg-white/10 text-white" : "bg-black/5 text-black")
                                : (theme === "dark" ? "text-gray-400 hover:bg-white/5 hover:text-gray-300" : "text-gray-600 hover:bg-black/5"),
                              isAccepted && "opacity-60"
                            )}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileCode className={cn("w-4 h-4 shrink-0", isAccepted ? "text-green-500" : "text-blue-500")} />
                              <span className="truncate">{diff.template.name}</span>
                            </div>
                            {isAccepted && <Check className="w-4 h-4 text-green-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Diff Viewer */}
                <div className="flex-1 flex flex-col relative bg-[#1e1e1e]">
                  {diffFiles[selectedFileIndex] && (
                    <>
                      <div className={cn(
                        "flex items-center justify-between px-4 py-2 border-b z-10",
                        theme === "dark" ? "border-white/10 bg-[#0B0E14]" : "border-black/10 bg-white"
                      )}>
                        <div className="flex items-center gap-2">
                          <span className={theme === "dark" ? "text-gray-400 text-sm" : "text-gray-500 text-sm"}>
                            {diffFiles[selectedFileIndex].template.path}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {acceptedFiles.has(diffFiles[selectedFileIndex].template.path) ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-500 rounded-lg text-sm font-medium">
                              <Check className="w-4 h-4" />
                              Accepted
                            </div>
                          ) : (
                            <button
                              onClick={handleAcceptFile}
                              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              Accept Template File
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 relative">
                        <DiffEditor
                          height="100%"
                          language={diffFiles[selectedFileIndex].template.language || "javascript"}
                          original={diffFiles[selectedFileIndex].local?.content || ""}
                          modified={diffFiles[selectedFileIndex].template.content || ""}
                          theme={theme === 'dark' ? 'vs-dark' : 'light'}
                          options={{
                            renderSideBySide: true,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            readOnly: true,
                            fontFamily: "var(--font-mono)",
                            fontSize: 14,
                            lineHeight: 24,
                            padding: { top: 16 }
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!isLoading && diffFiles.length > 0 && (
            <div className={cn(
              "px-6 py-4 border-t flex items-center justify-between",
              theme === "dark" ? "border-white/10 bg-[#0B0E14]" : "border-black/10 bg-gray-50/50"
            )}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className={theme === "dark" ? "text-gray-400 text-sm" : "text-gray-500 text-sm"}>
                  Accepting a file will completely overwrite your local version. You can also manually copy-paste specific lines.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    theme === "dark" ? "hover:bg-white/5 text-gray-300" : "hover:bg-black/5 text-gray-700"
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyAllAccepted}
                  disabled={acceptedFiles.size === 0}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Apply {acceptedFiles.size} Changes
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
