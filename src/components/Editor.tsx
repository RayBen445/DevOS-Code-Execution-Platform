import { useEffect, useRef, useState } from "react";
import MonacoEditor, { OnMount } from "@monaco-editor/react";
import { FileData } from "../types";
import socket from "../lib/socket";
import { auth } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Copy, Clipboard, AlignLeft, Download, Eye, WrapText, X, Check } from "lucide-react";
import { toast } from "sonner";

interface EditorProps {
  file: FileData;
  onChange: (content: string) => void;
  projectId: string;
  readOnly?: boolean;
  onCursorChange?: (line: number, col: number) => void;
  /** Show the file-actions toolbar above the editor */
  showToolbar?: boolean;
}

export default function Editor({ file, onChange, projectId, readOnly, onCursorChange, showToolbar }: EditorProps) {
  const [user] = useAuthState(auth);
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, any>>({});
  const [wordWrap, setWordWrap] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Set theme
    monaco.editor.defineTheme("devos-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#0a0a0a",
        "editor.lineHighlightBackground": "#ffffff05",
        "editorCursor.foreground": "#3b82f6",
        "editor.selectionBackground": "#3b82f633",
      },
    });
    monaco.editor.setTheme("devos-dark");

    // Cursor movement tracking
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.(e.position.lineNumber, e.position.column);
      socket.emit("cursor-move", {
        projectId,
        userId: user?.uid,
        userName: user?.displayName,
        cursor: {
          lineNumber: e.position.lineNumber,
          column: e.position.column
        }
      });
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      if (editorRef.current) {
        requestAnimationFrame(() => {
          if (editorRef.current) {
            editorRef.current.layout();
          }
        });
      }
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleCodeUpdate = ({ fileId, content, userId }: any) => {
      if (fileId === file.id && userId !== user?.uid) {
        // Only update if content is different to avoid loops
        const currentContent = editorRef.current?.getValue();
        if (currentContent !== content) {
          editorRef.current?.setValue(content);
        }
      }
    };

    const handleCursorUpdate = ({ userId, cursor, userName }: any) => {
      if (userId !== user?.uid) {
        setRemoteCursors(prev => ({
          ...prev,
          [userId]: { cursor, userName }
        }));
      }
    };

    socket.on("code-update", handleCodeUpdate);
    socket.on("cursor-update", handleCursorUpdate);

    return () => {
      socket.off("code-update", handleCodeUpdate);
      socket.off("cursor-update", handleCursorUpdate);
    };
  }, [file.id, user?.uid]);

  // Sync word-wrap option to Monaco whenever it changes
  useEffect(() => {
    editorRef.current?.updateOptions({ wordWrap: wordWrap ? "on" : "off" });
  }, [wordWrap]);

  // ── Toolbar actions ─────────────────────────────────────────────────────────

  const handleCopy = async () => {
    const content = editorRef.current?.getValue() ?? file.content;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed — check browser permissions.");
    }
  };

  const handlePaste = async () => {
    if (readOnly) { toast.error("This file is read-only."); return; }
    try {
      const text = await navigator.clipboard.readText();
      if (editorRef.current) {
        // Insert at cursor rather than replacing everything
        editorRef.current.trigger("keyboard", "type", { text });
      } else {
        onChange(text);
      }
    } catch {
      toast.error("Paste failed — check browser clipboard permissions.");
    }
  };

  const handleSelectAll = () => {
    editorRef.current?.trigger("keyboard", "editor.action.selectAll", null);
    editorRef.current?.focus();
  };

  const handleDownload = () => {
    const content = editorRef.current?.getValue() ?? file.content;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleWordWrap = () => setWordWrap((v) => !v);

  if (file.language === "image") {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-base p-12 overflow-auto">
        <div className="max-w-full max-h-full rounded-2xl border border-border-base overflow-hidden shadow-2xl shadow-black">
          <img 
            src={file.content} 
            alt={file.name} 
            className="max-w-full h-auto object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="mt-8 flex flex-col items-center gap-2">
          <span className="text-sm font-bold text-white">{file.name}</span>
          <span className="text-xs text-white/20 font-mono break-all text-center max-w-md">{file.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full relative flex flex-col">
      {/* ── File-actions toolbar ── */}
      {showToolbar && (
        <div className="flex items-center gap-1 px-3 py-1 bg-surface border-b border-[#21262D] flex-shrink-0 overflow-x-auto">
          <ToolbarBtn icon={copied ? Check : Copy} label={copied ? "Copied!" : "Copy"} onClick={handleCopy} active={copied} />
          {!readOnly && (
            <ToolbarBtn icon={Clipboard} label="Paste" onClick={handlePaste} />
          )}
          <ToolbarBtn icon={AlignLeft} label="Select All" onClick={handleSelectAll} />
          <div className="w-px h-4 bg-white/10 mx-1 flex-shrink-0" />
          <ToolbarBtn icon={Download} label="Download" onClick={handleDownload} />
          <ToolbarBtn icon={Eye} label="View Raw" onClick={() => setShowRaw((v) => !v)} active={showRaw} />
          <ToolbarBtn icon={WrapText} label="Word Wrap" onClick={toggleWordWrap} active={wordWrap} />
        </div>
      )}

      {/* ── View-raw overlay ── */}
      {showRaw && (
        <div className="flex-shrink-0 relative bg-base border-b border-[#21262D]" style={{ maxHeight: 240, overflowY: "auto" }}>
          <button
            onClick={() => setShowRaw(false)}
            className="absolute top-2 right-3 text-white/30 hover:text-white transition-colors z-10"
            title="Close raw view"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <pre className="px-4 py-3 font-mono text-xs text-white/60 whitespace-pre-wrap break-all leading-relaxed pr-10">
            {file.content}
          </pre>
        </div>
      )}

      <div className="flex-1 relative min-h-0">
        <MonacoEditor
          height="100%"
          language={file.language}
          value={file.content}
          onChange={(value) => onChange(value || "")}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
            lineNumbers: "on",
            roundedSelection: true,
            scrollBeyondLastLine: false,
            readOnly: readOnly || false,
            automaticLayout: false,
            padding: { top: 16, bottom: 16 },
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            wordWrap: wordWrap ? "on" : "off",
          }}
        />

        {/* Remote Cursors Overlay (Simplified Visualization) */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-none">
          {Object.entries(remoteCursors).map(([uid, data]: [string, any]) => (
            <div key={uid} className="flex items-center gap-2 px-2 py-1 rounded bg-blue-600/20 border border-blue-500/30 text-[10px] text-blue-400 font-bold uppercase tracking-tighter">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {data.userName || "Collaborator"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Toolbar button helper ─────────────────────────────────────────────────────

function ToolbarBtn({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all flex-shrink-0 ${
        active
          ? "bg-blue-600/20 text-blue-400"
          : "text-white/30 hover:text-white/70 hover:bg-white/5"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
