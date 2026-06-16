import React, { useState, useRef, useEffect } from "react";
import { FileData } from "../types";
import { File, Folder, Plus, Search, ChevronDown, ChevronRight, FileCode, FileJson, FileType, Upload, Loader2, Image as ImageIcon, Trash2, Edit2, Check, X, PackageOpen } from "lucide-react";
import { db, storage } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { cn } from "../lib/utils";
import JSZip from "jszip";
import ConfirmModal from "./ConfirmModal";
import { toast } from "sonner";

interface SidebarProps {
  files: FileData[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  projectId: string;
  readOnly?: boolean;
  isPortfolio?: boolean;
}

interface SidebarProps {
  files: FileData[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  projectId: string;
  readOnly?: boolean;
  isPortfolio?: boolean;
}

interface FileTreeItem {
  id?: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeItem[];
  file?: FileData;
}

export default function Sidebar({ files, activeFileId, onSelectFile, projectId, readOnly, isPortfolio }: SidebarProps) {
  const [isCreating, setIsCreating] = useState<{ type: 'file' | 'folder', parentPath: string } | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']));
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isZipUploading, setIsZipUploading] = useState(false);
  const [zipStatus, setZipStatus] = useState<string | null>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [newFileName, setNewFileName] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null); // path of the folder
  const [editingFileName, setEditingFileName] = useState("");
  const [editingFolderName, setEditingFolderName] = useState("");
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const folderEditInputRef = useRef<HTMLInputElement>(null);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const buildFileTree = (files: FileData[]): FileTreeItem[] => {
    const root: FileTreeItem[] = [];
    const folders: Record<string, FileTreeItem> = {};

    // Sort files by path depth and then name
    const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

    sortedFiles.forEach(file => {
      const parts = file.path.split('/').filter(Boolean);
      if (parts.length === 0) return;
      let currentPath = '';
      let currentLevel = root;

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (isLast) {
          if (part !== '.keep') {
            currentLevel.push({
              id: file.id,
              name: part,
              path: file.path,
              type: 'file',
              file
            });
          }
        } else {
          if (!folders[currentPath]) {
            const folder: FileTreeItem = {
              name: part,
              path: currentPath,
              type: 'folder',
              children: []
            };
            folders[currentPath] = folder;
            currentLevel.push(folder);
          }
          currentLevel = folders[currentPath].children!;
        }
      });
    });

    return root;
  };

  const fileTree = buildFileTree(files);

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim() || !isCreating) return;

    const fullPath = isCreating.parentPath 
      ? `${isCreating.parentPath}/${newFileName}`
      : newFileName;

    if (isCreating.type === 'folder') {
      try {
        await addDoc(collection(db, "projects", projectId, "files"), {
          projectId,
          name: ".keep",
          path: `${fullPath}/.keep`,
          content: "",
          language: "plaintext",
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Error creating folder:", error);
      }
      setNewFileName("");
      setIsCreating(null);
      return;
    }

    const extension = newFileName.split(".").pop() || "txt";
    if (isPortfolio && !['html', 'css', 'js', 'json'].includes(extension.toLowerCase())) {
      toast.error("Portfolio projects only support HTML, CSS, JS, and JSON files.");
      return;
    }
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
        path: fullPath,
        content: "",
        language: languageMap[extension] || "plaintext",
        updatedAt: serverTimestamp()
      });
      setNewFileName("");
      setIsCreating(null);
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

  const handleStartRename = (e: React.MouseEvent, file: FileData) => {
    e.stopPropagation();
    if (readOnly) return;
    setEditingFileId(file.id);
    setEditingFileName(file.name);
  };

  const handleRenameFile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingFileId || !editingFileName.trim() || readOnly) return;

    const file = files.find(f => f.id === editingFileId);
    if (file && file.name === editingFileName) {
      setEditingFileId(null);
      return;
    }

    try {
      const extension = editingFileName.split(".").pop() || "txt";
      if (isPortfolio && !['html', 'css', 'js', 'json'].includes(extension.toLowerCase())) {
        toast.error("Portfolio projects only support HTML, CSS, JS, and JSON files.");
        return;
      }
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

      const oldPathParts = file?.path.split('/') || [];
      oldPathParts[oldPathParts.length - 1] = editingFileName;
      const newPath = oldPathParts.join('/');

      await updateDoc(doc(db, "projects", projectId, "files", editingFileId), {
        name: editingFileName,
        path: newPath,
        language: languageMap[extension] || "plaintext",
        updatedAt: serverTimestamp()
      });
      setEditingFileId(null);
    } catch (error) {
      console.error("Error renaming file:", error);
    }
  };

  const handleDeleteFolder = async (e: React.MouseEvent, folderPath: string) => {
    e.stopPropagation();
    if (readOnly) return;
    setDeleteFolderConfirm(folderPath);
  };

  const confirmDeleteFolder = async () => {
    const folderPath = deleteFolderConfirm;
    if (!folderPath) return;
    const filesToDelete = files.filter(f => f.path.startsWith(`${folderPath}/`) || f.path === folderPath);
    
    try {
      const deletePromises = filesToDelete.map(f => deleteDoc(doc(db, "projects", projectId, "files", f.id)));
      await Promise.all(deletePromises);
      setDeleteFolderConfirm(null);
    } catch (error) {
      console.error("Error deleting folder:", error);
    }
  };

  const handleStartRenameFolder = (e: React.MouseEvent, item: FileTreeItem) => {
    e.stopPropagation();
    if (readOnly) return;
    setEditingFolderId(item.path);
    setEditingFolderName(item.name);
  };

  const handleRenameFolder = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingFolderId || !editingFolderName.trim() || readOnly) return;

    const oldPath = editingFolderId;
    const newName = editingFolderName;
    
    const parts = oldPath.split('/');
    if (parts[parts.length - 1] === newName) {
      setEditingFolderId(null);
      return;
    }
    
    parts[parts.length - 1] = newName;
    const newPath = parts.join('/');
    
    const filesToUpdate = files.filter(f => f.path.startsWith(`${oldPath}/`) || f.path === oldPath);
    
    try {
      const updatePromises = filesToUpdate.map(f => {
        const relativePath = f.path.slice(oldPath.length);
        const updatedPath = newPath + relativePath;
        
        const fileParts = updatedPath.split('/');
        const updatedName = fileParts[fileParts.length - 1];

        return updateDoc(doc(db, "projects", projectId, "files", f.id), {
          path: updatedPath,
          name: updatedName,
          updatedAt: serverTimestamp()
        });
      });
      await Promise.all(updatePromises);
      setEditingFolderId(null);
    } catch (error) {
      console.error("Error renaming folder:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const extension = file.name.split(".").pop()?.toLowerCase() || "txt";
    const isImage = ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(extension);

    try {
      if (isImage) {
        // Upload image to Storage
        const storageRef = ref(storage, `projects/${projectId}/files/${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        setUploadProgress(0);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
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
      } else {
        // Read text file and save to Firestore
        const reader = new FileReader();
        reader.onload = async (event) => {
          const content = event.target?.result as string;
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

          await addDoc(collection(db, "projects", projectId, "files"), {
            projectId,
            name: file.name,
            path: file.name,
            content: content || "",
            language: languageMap[extension] || "plaintext",
            updatedAt: serverTimestamp()
          });
          setIsUploading(false);
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setIsUploading(false);
    }
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith(".zip")) return;
    // Reset input so the same file can be re-uploaded
    e.target.value = "";

    setIsZipUploading(true);
    setZipStatus("Extracting files...");

    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      const languageMap: Record<string, string> = {
        js: "javascript", ts: "typescript", tsx: "typescript",
        jsx: "javascript", json: "json", css: "css", html: "html", md: "markdown"
      };

      const rawEntries = Object.entries(zipContent.files).filter(([_, entry]) => !entry.dir);
      const validEntries = rawEntries.filter(([relativePath]) => {
        const parts = relativePath.split("/");
        return !parts.some(p => p.startsWith(".") || p === "node_modules");
      });

      const fileEntries: any[] = [];

      for (const [relativePath, zipEntry] of validEntries) {
        const content = await zipEntry.async("string");
        const nameParts = relativePath.split("/");
        const name = nameParts[nameParts.length - 1];
        const ext = name.split(".").pop()?.toLowerCase() || "txt";

        if (isPortfolio && !['html', 'css', 'js', 'json'].includes(ext)) {
          toast.error("Portfolio projects only support HTML, CSS, JS, and JSON files.");
          setZipStatus("");
          setIsZipUploading(false);
          return;
        }

        fileEntries.push({
          path: relativePath,
          name,
          content,
          language: languageMap[ext] || "plaintext"
        });
      }

      // Check for conflicts with existing files
      const existingPaths = new Set(files.map(f => f.path));

      for (const entry of fileEntries) {
        if (existingPaths.has(entry.path)) {
          // Update existing file
          const existingFile = files.find(f => f.path === entry.path);
          if (existingFile) {
            await updateDoc(doc(db, "projects", projectId, "files", existingFile.id), {
              content: entry.content,
              updatedAt: serverTimestamp()
            });
          }
        } else {
          // Create new file
          await addDoc(collection(db, "projects", projectId, "files"), {
            projectId,
            name: entry.name,
            path: entry.path,
            content: entry.content,
            language: entry.language,
            updatedAt: serverTimestamp()
          });
        }
      }

      setZipStatus("Project imported successfully");
      setTimeout(() => setZipStatus(null), 3000);
    } catch (error) {
      console.error("ZIP upload error:", error);
      setZipStatus("Failed to extract ZIP");
      setTimeout(() => setZipStatus(null), 3000);
    } finally {
      setIsZipUploading(false);
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    
    setIsUploading(true);
    setZipStatus("Uploading folder...");

    try {
      const languageMap: Record<string, string> = {
        js: "javascript", ts: "typescript", tsx: "typescript",
        jsx: "javascript", json: "json", css: "css", html: "html", md: "markdown"
      };

      const fileEntries: Array<{ path: string; name: string; content: string; language: string }> = [];

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const relativePath = file.webkitRelativePath || file.name;
        
        // Skip hidden/system files and node_modules
        const parts = relativePath.split("/");
        if (parts.some(p => p.startsWith(".") || p === "node_modules")) continue;

        // Skip binary/image files for now to avoid huge base64 encoding limits
        const ext = file.name.split(".").pop()?.toLowerCase() || "txt";
        const isImage = ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext);
        if (isImage) continue;

        const content = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsText(file);
        });

        fileEntries.push({
          path: relativePath,
          name: file.name,
          content,
          language: languageMap[ext] || "plaintext"
        });
      }

      const existingPaths = new Set(files.map(f => f.path));

      for (const entry of fileEntries) {
        if (existingPaths.has(entry.path)) {
          const existingFile = files.find(f => f.path === entry.path);
          if (existingFile) {
            await updateDoc(doc(db, "projects", projectId, "files", existingFile.id), {
              content: entry.content,
              updatedAt: serverTimestamp()
            });
          }
        } else {
          await addDoc(collection(db, "projects", projectId, "files"), {
            projectId,
            name: entry.name,
            path: entry.path,
            content: entry.content,
            language: entry.language,
            updatedAt: serverTimestamp()
          });
        }
      }

      setZipStatus("Folder uploaded successfully");
      setTimeout(() => setZipStatus(null), 3000);
    } catch (error) {
      console.error("Folder upload error:", error);
      setZipStatus("Failed to upload folder");
      setTimeout(() => setZipStatus(null), 3000);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!readOnly && !isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (readOnly) return;

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    setIsUploading(true);
    setZipStatus("Uploading items...");

    const fileEntries: Array<{ path: string; name: string; content: string; language: string }> = [];
    const languageMap: Record<string, string> = {
      js: "javascript", ts: "typescript", tsx: "typescript",
      jsx: "javascript", json: "json", css: "css", html: "html", md: "markdown"
    };

    const traverseFileTree = async (item: any, path: string = "") => {
      if (item.isFile) {
        const file = await new Promise<File>((resolve) => item.file(resolve));
        const ext = file.name.split(".").pop()?.toLowerCase() || "txt";
        const isImage = ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext);
        if (isImage || file.name.startsWith(".")) return;

        const content = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsText(file);
        });

        fileEntries.push({
          path: path + file.name,
          name: file.name,
          content,
          language: languageMap[ext] || "plaintext"
        });
      } else if (item.isDirectory) {
        if (item.name === "node_modules" || item.name.startsWith(".")) return;
        const dirReader = item.createReader();
        
        const readEntriesPromise = new Promise<any[]>((resolve) => {
          const entries: any[] = [];
          const read = () => {
            dirReader.readEntries((results: any[]) => {
              if (!results.length) {
                resolve(entries);
              } else {
                entries.push(...results);
                read();
              }
            });
          };
          read();
        });
        
        const entries = await readEntriesPromise;
        for (const entry of entries) {
          await traverseFileTree(entry, path + item.name + "/");
        }
      }
    };

      try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) await traverseFileTree(item);
      }

      const existingPaths = new Set(files.map(f => f.path));

      for (const entry of fileEntries) {
        if (existingPaths.has(entry.path)) {
          const existingFile = files.find(f => f.path === entry.path);
          if (existingFile) {
            await updateDoc(doc(db, "projects", projectId, "files", existingFile.id), {
              content: entry.content,
              updatedAt: serverTimestamp()
            });
          }
        } else {
          await addDoc(collection(db, "projects", projectId, "files"), {
            projectId,
            name: entry.name,
            path: entry.path,
            content: entry.content,
            language: entry.language,
            updatedAt: serverTimestamp()
          });
        }
      }

      setZipStatus("Upload complete");
      setTimeout(() => setZipStatus(null), 3000);
    } catch (error) {
      console.error("Drop upload error:", error);
      setZipStatus("Failed to upload items");
      setTimeout(() => setZipStatus(null), 3000);
    } finally {
      setIsUploading(false);
    }
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

  const renderTree = (items: FileTreeItem[], level = 0) => {
    return items.map((item) => {
      const isExpanded = expandedFolders.has(item.path);
      const isActive = activeFileId === item.id;

      if (item.type === 'folder') {
        return (
          <div key={item.path} id="tour-explorer">
            <div
              onClick={() => toggleFolder(item.path)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all group cursor-pointer text-white/40 hover:bg-white/5 hover:text-white/80"
              style={{ paddingLeft: `${level * 12 + 8}px` }}
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Folder className="w-4 h-4 text-blue-400/60" />
              {editingFolderId === item.path ? (
                <form onSubmit={handleRenameFolder} className="flex-1 flex items-center gap-1">
                  <input
                    ref={folderEditInputRef}
                    autoFocus
                    type="text"
                    value={editingFolderName}
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    onBlur={() => handleRenameFolder()}
                    className="flex-1 bg-black/40 border border-blue-500/50 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                  />
                </form>
              ) : (
                <>
                  <span className="truncate flex-1 text-left">{item.name}</span>
                  {!readOnly && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCreating({ type: 'file', parentPath: item.path });
                          setExpandedFolders(new Set([...expandedFolders, item.path]));
                        }}
                        className="p-1 hover:bg-white/10 text-white/40 hover:text-white transition-all rounded"
                        title="New File"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleStartRenameFolder(e, item)}
                        className="p-1 hover:bg-white/10 text-white/40 hover:text-white transition-all rounded"
                        title="Rename Folder"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteFolder(e, item.path)}
                        className="p-1 hover:bg-red-500/20 text-red-500/40 hover:text-red-500 transition-all rounded"
                        title="Delete Folder"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            {isExpanded && (
              <div className="space-y-0.5">
                {isCreating?.parentPath === item.path && (
                  <div style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }} className="px-2 py-1">
                    <form onSubmit={handleCreateFile}>
                      <input
                        autoFocus
                        type="text"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        onBlur={() => !newFileName && setIsCreating(null)}
                        placeholder="filename.js"
                        className="w-full bg-black/40 border border-blue-500/50 rounded px-2 py-1 text-xs text-white focus:outline-none"
                      />
                    </form>
                  </div>
                )}
                {renderTree(item.children || [], level + 1)}
              </div>
            )}
          </div>
        );
      }

      return (
        <div
          key={item.id}
          onClick={() => onSelectFile(item.id!)}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all group cursor-pointer",
            isActive
              ? "bg-blue-600/10 text-blue-400 font-medium"
              : "text-white/40 hover:bg-white/5 hover:text-white/80"
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {getFileIcon(item.name, item.file?.language)}
          
          {editingFileId === item.id ? (
            <form onSubmit={handleRenameFile} className="flex-1 flex items-center gap-1">
              <input
                ref={editInputRef}
                type="text"
                value={editingFileName}
                onChange={(e) => setEditingFileName(e.target.value)}
                onBlur={() => handleRenameFile()}
                className="flex-1 bg-black/40 border border-blue-500/50 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
              />
            </form>
          ) : (
            <>
              <span className="truncate flex-1 text-left">{item.name}</span>
              {!readOnly && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={(e) => handleStartRename(e, item.file!)}
                    className="p-1 hover:bg-white/10 text-white/40 hover:text-white transition-all rounded"
                    title="Rename File"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteFile(e, item.id!)}
                    className="p-1 hover:bg-red-500/20 text-red-500/40 hover:text-red-500 transition-all rounded"
                    title="Delete File"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      );
    });
  };

  return (
    <>
    <div 
      className={cn(
        "w-full md:w-64 h-full border-r border-border-base flex flex-col relative transition-all duration-200",
        isDragOver ? "bg-blue-500/10 border-blue-500 shadow-[inset_0_0_20px_rgba(59,130,246,0.2)]" : "bg-card md:bg-card/80 md:backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none rounded-r-2xl border-2 border-dashed border-blue-500">
          <Upload className="w-10 h-10 text-blue-500 mb-2 animate-bounce" />
          <p className="text-sm font-bold text-blue-400">Drop files here</p>
        </div>
      )}
      <div className="p-4 flex items-center justify-between border-b border-border-base">
        <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Explorer</span>
        {!readOnly && (
          <div className="flex items-center gap-1">
            <label
              className="p-1 hover:bg-white/5 rounded text-white/40 hover:text-white transition-colors cursor-pointer"
              title="Upload Folder"
            >
              <Folder className="w-4 h-4" />
              <input
                type="file"
                className="hidden"
                onChange={handleFolderUpload}
                disabled={isUploading || isZipUploading}
                // @ts-expect-error webkitdirectory is non-standard but supported in all major browsers
                webkitdirectory="true"
                directory="true"
                multiple
              />
            </label>
            <label
              className="p-1 hover:bg-white/5 rounded text-white/40 hover:text-white transition-colors cursor-pointer"
              title="Upload ZIP"
            >
              {isZipUploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              ) : (
                <PackageOpen className="w-4 h-4" />
              )}
              <input
                ref={zipInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleZipUpload}
                disabled={isZipUploading}
              />
            </label>
            <label className="p-1 hover:bg-white/5 rounded text-white/40 hover:text-white transition-colors cursor-pointer relative" title="Upload File">
              {isUploading ? (
                <div className="relative">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : <Upload className="w-4 h-4" />}
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
            </label>
            <button
              onClick={() => setIsCreating({ type: 'folder', parentPath: '' })}
              className="p-1 hover:bg-white/5 rounded text-white/40 hover:text-white transition-colors"
              title="New Folder"
            >
              <Folder className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsCreating({ type: 'file', parentPath: '' })}
              className="p-1 hover:bg-white/5 rounded text-white/40 hover:text-white transition-colors"
              title="New File"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {zipStatus && (
        <div className={cn(
          "px-4 py-2 text-[10px] font-bold border-b border-border-base",
          zipStatus.startsWith("Failed") ? "text-red-400 bg-red-500/5" : "text-green-400 bg-green-500/5"
        )}>
          {zipStatus}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {isCreating?.parentPath === '' && (
          <div className="mb-2">
            <form onSubmit={handleCreateFile}>
              <input
                autoFocus
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onBlur={() => !newFileName && setIsCreating(null)}
                placeholder={isCreating.type === 'folder' ? "folder name" : "filename.js"}
                className="w-full bg-black/40 border border-blue-500/50 rounded px-2 py-1 text-xs text-white focus:outline-none"
              />
            </form>
          </div>
        )}

        <div className="space-y-0.5">
          {renderTree(fileTree)}
          
          {files.length === 0 && !isCreating && (
            <div className="py-8 px-4 text-center">
              <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">No files</p>
            </div>
          )}
        </div>
      </div>
    </div>

    <ConfirmModal
      open={!!deleteFolderConfirm}
      title="Delete Folder"
      description={deleteFolderConfirm ? `Delete the folder "${deleteFolderConfirm}" and all its contents?` : ""}
      warning="This action cannot be undone."
      confirmLabel="Delete Folder"
      onConfirm={confirmDeleteFolder}
      onCancel={() => setDeleteFolderConfirm(null)}
    />
    </>
  );
}
