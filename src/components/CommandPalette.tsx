import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Search, Folder, Zap, Settings, Book, Palette, MessageSquare, Terminal } from "lucide-react";
import { cn } from "../lib/utils";

interface CommandItem {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  action: () => void;
  shortcut?: string[];
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle palette on Ctrl+K / Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const commands: CommandItem[] = [
    {
      id: "dashboard",
      icon: Folder,
      title: "Go to Dashboard",
      subtitle: "View your projects and feed",
      action: () => navigate("/"),
    },
    {
      id: "projects",
      icon: Terminal,
      title: "My Projects",
      action: () => navigate("/projects"),
      shortcut: ["P"],
    },
    {
      id: "theme-studio",
      icon: Palette,
      title: "Theme Studio",
      subtitle: "Customize your IDE appearance",
      action: () => navigate("/theme-studio"),
    },
    {
      id: "explore",
      icon: Zap,
      title: "Explore",
      subtitle: "Discover trending projects",
      action: () => navigate("/explore"),
      shortcut: ["E"],
    },
    {
      id: "communities",
      icon: MessageSquare,
      title: "Communities",
      action: () => navigate("/communities"),
      shortcut: ["D"],
    },
    {
      id: "settings",
      icon: Settings,
      title: "Settings",
      action: () => navigate("/settings"),
      shortcut: [","],
    },
    {
      id: "docs",
      icon: Book,
      title: "Documentation",
      action: () => navigate("/docs"),
    },
  ];

  const filteredCommands = query
    ? commands.filter((cmd) => cmd.title.toLowerCase().includes(query.toLowerCase()) || cmd.subtitle?.toLowerCase().includes(query.toLowerCase()))
    : commands;

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filteredCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          setOpen(false);
        }
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, filteredCommands, selectedIndex]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed top-[15vh] left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-[9999] bg-[#0a0c10] border border-white/10 rounded-2xl shadow-[0_0_80px_rgba(59,130,246,0.15)] overflow-hidden max-h-[90vh] overflow-y-auto flex flex-col"
          >
            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
              <Search className="w-5 h-5 text-blue-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder:text-white/30"
              />
              <div className="flex gap-1">
                <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/40 text-xs font-mono">ESC</kbd>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 no-scrollbar">
              {filteredCommands.length === 0 ? (
                <div className="py-12 text-center text-white/40 text-sm">
                  No results found for "{query}"
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {filteredCommands.map((cmd, idx) => {
                    const isSelected = idx === selectedIndex;
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.id}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => {
                          cmd.action();
                          setOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-colors",
                          isSelected ? "bg-blue-600/20" : "hover:bg-white/5"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "p-2 rounded-lg transition-colors",
                            isSelected ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-white/50"
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className={cn("font-medium transition-colors", isSelected ? "text-blue-100" : "text-white/80")}>
                              {cmd.title}
                            </p>
                            {cmd.subtitle && (
                              <p className="text-xs text-white/40 mt-0.5">{cmd.subtitle}</p>
                            )}
                          </div>
                        </div>
                        {cmd.shortcut && (
                          <div className="flex gap-1">
                            <kbd className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 text-[10px] font-mono">CTRL</kbd>
                            {cmd.shortcut.map((s) => (
                              <kbd key={s} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 text-[10px] font-mono">{s}</kbd>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
