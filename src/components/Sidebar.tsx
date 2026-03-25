import React, { useState } from "react";
import { FileData } from "../types";
import { File, Folder, Plus, Search, ChevronDown, ChevronRight, FileCode, FileJson, FileType, Upload, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
import { db, storage } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { cn } from "../lib/utils";

interface SidebarProps {
  files: FileData[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  projectId: string;
  readOnly?: boolean;
}

export default function Sidebar({ files, activeFileId, onSelectFile, projectId, readOnly }: SidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    const extension = newFileName.split(".").pop() || "txt";
    const languageMap: Record<string, string> = {
      js: "javascript",
      ts: "typescript",
      tsx: "typescript",
      jsx: "javascript",
      json: "json",
      css: "css",
      html: "html",
      md: "markdown"
    };

    try {
      await addDoc(collection(db, "projects", projectId, "files"), {
        projectId,
        name: newFileName,
        path: newFileName,
        content: "",
        language: languageMap[extension] || "plaintext",
        updatedAt: serverTimestamp()
      });
      setNewFileName("");
      setIsCreating(false);
    } catch (error) {
      console.error("Error creating file:", error);
    }
  };
  
  const handleDeleteFile = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (readOnly) return;
    
    try {
      await deleteDoc(doc(db, "projects", projectId, "files", fileId));
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const storageRef = ref(storage, `projects/${projectId}/files/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      null,
      (error) => {
        console.error("Upload error:", error);
        setIsUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        await addDoc(collection(db, "projects", projectId, "files"), {
          projectId,
          name: file.name,
          path: file.name,
          content: downloadURL,
          language: "image",
          updatedAt: serverTimestamp()
        });
        setIsUploading(false);
      }
    );
  };

  const getFileIcon = (name: string, language?: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (language === "image" || ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext || "")) 
      return <ImageIcon className="w-4 h-4 text-purple-400" />;
    if (ext === "js" || ext === "jsx") return <FileCode className="w-4 h-4 text-yellow-400" />;
    if (ext === "ts" || ext === "tsx") return <FileCode className="w-4 h-4 text-blue-400" />;
    if (ext === "json") return <FileJson className="w-4 h-4 text-orange-400" />;
    if (ext === "css") return <FileType className="w-4 h-4 text-blue-300" />;
    return <File className="w-4 h-4 text-white/40" />;
  };

  return (
    <div className="w-64 border-r border-white/5 bg-[#111] flex flex-col">
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Explorer</span>
        {!readOnly && (
          <div className="flex items-center gap-1">
            <label className="p-1 hover:bg-white/5 rounded text-white/40 hover:text-white transition-colors cursor-pointer">
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <Upload className="w-4 h-4" />}
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
            </label>
            <button
              onClick={() => setIsCreating(true)}
              className="p-1 hover:bg-white/5 rounded text-white/40 hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isCreating && (
          <form onSubmit={handleCreateFile} className="mb-2">
            <input
              autoFocus
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onBlur={() => !newFileName && setIsCreating(false)}
              placeholder="filename.js"
              className="w-full bg-black/40 border border-blue-500/50 rounded px-2 py-1 text-xs text-white focus:outline-none"
            />
          </form>
        )}

        <div className="space-y-0.5">
          {files.map((file) => (
            <div
              key={file.id}
              onClick={() => onSelectFile(file.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all group cursor-pointer",
                activeFileId === file.id
                  ? "bg-blue-600/10 text-blue-400 font-medium"
                  : "text-white/40 hover:bg-white/5 hover:text-white/80"
              )}
            >
              {getFileIcon(file.name, file.language)}
              <span className="truncate flex-1 text-left">{file.name}</span>
              {!readOnly && (
                <button
                  onClick={(e) => handleDeleteFile(e, file.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-500/40 hover:text-red-500 transition-all rounded"
                  title="Delete File"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          
          {files.length === 0 && !isCreating && (
            <div className="py-8 px-4 text-center">
              <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">No files</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
