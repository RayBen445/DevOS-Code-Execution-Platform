import React, { useState, useEffect } from "react";
import { Terminal, Plus, X } from "lucide-react";
import { Socket } from "socket.io-client";
import TerminalPanel from "./TerminalPanel";
import { cn } from "../lib/utils";

interface TerminalTabsProps {
  socket: Socket | null;
  onClose: () => void;
  cwd?: string;
}

export default function TerminalTabs({ socket, onClose, cwd }: TerminalTabsProps) {
  const [terminals, setTerminals] = useState<{ id: string; name: string }[]>([{ id: "term-1", name: "bash" }]);
  const [activeTerminalId, setActiveTerminalId] = useState("term-1");

  const handleAddTerminal = () => {
    const newId = `term-${Date.now()}`;
    setTerminals(prev => [...prev, { id: newId, name: "Terminal" }]);
    setActiveTerminalId(newId);
  };

  const handleCloseTerminal = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTerminals(prev => {
      const filtered = prev.filter(t => t.id !== id);
      if (activeTerminalId === id && filtered.length > 0) {
        setActiveTerminalId(filtered[filtered.length - 1].id);
      } else if (filtered.length === 0) {
        onClose();
      }
      return filtered;
    });
  };

  return (
    <div className="flex flex-col w-full h-full bg-surface">
      {/* Tabs Header */}
      <div className="flex items-center bg-[#161B22] border-b border-[#21262D] h-9">
        <div className="flex-1 flex items-center overflow-x-auto custom-scrollbar h-full">
          {terminals.map((term) => (
            <button
              key={term.id}
              onClick={() => setActiveTerminalId(term.id)}
              className={cn(
                "h-full flex items-center gap-2 px-3 border-r border-[#21262D] text-[11px] group transition-colors min-w-[120px]",
                activeTerminalId === term.id ? "bg-surface text-white border-t-2 border-t-blue-500" : "bg-transparent text-white/40 hover:bg-white/5 hover:text-white/80 border-t-2 border-t-transparent"
              )}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="flex-1 text-left truncate">{term.name}</span>
              <div 
                onClick={(e) => handleCloseTerminal(e, term.id)}
                className="p-0.5 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>
        <div className="flex items-center px-2 gap-1 border-l border-[#21262D]">
          <button
            onClick={handleAddTerminal}
            className="p-1.5 text-white/40 hover:text-white transition-colors hover:bg-white/5 rounded"
            title="New Terminal"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-white/5 mx-1" />
          <button
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white transition-colors hover:bg-white/5 rounded"
            title="Close Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Viewports */}
      <div className="flex-1 relative bg-[#0a0a0a] min-h-0">
        {terminals.map((term) => (
          <div
            key={term.id}
            className={cn("absolute inset-0", activeTerminalId === term.id ? "z-10" : "z-0 invisible")}
          >
            {socket && (
              <TerminalPanel
                socket={socket}
                terminalId={term.id}
                cwd={cwd}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
