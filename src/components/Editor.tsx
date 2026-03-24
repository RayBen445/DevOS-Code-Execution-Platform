import { useEffect, useRef, useState } from "react";
import MonacoEditor, { OnMount } from "@monaco-editor/react";
import { FileData } from "../types";
import socket from "../lib/socket";
import { auth } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

interface EditorProps {
  file: FileData;
  onChange: (content: string) => void;
  projectId: string;
  readOnly?: boolean;
}

export default function Editor({ file, onChange, projectId, readOnly }: EditorProps) {
  const [user] = useAuthState(auth);
  const editorRef = useRef<any>(null);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, any>>({});

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

  if (file.language === "image") {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#050505] p-12 overflow-auto">
        <div className="max-w-full max-h-full rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black">
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
    <div className="h-full w-full relative">
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
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
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
  );
}
