import React, { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { Socket } from "socket.io-client";

interface TerminalPanelProps {
  socket: Socket | null;
  terminalId: string;
  cwd?: string;
  onResize?: () => void;
}

export default function TerminalPanel({ socket, terminalId, cwd }: TerminalPanelProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!terminalRef.current || !socket || initializedRef.current) return;
    initializedRef.current = true;

    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#0a0a0a",
        foreground: "#f8fafc",
        cursor: "#3b82f6",
        selectionBackground: "rgba(59, 130, 246, 0.3)",
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      lineHeight: 1.2,
      convertEol: true, // Crucial for PTY environments
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Spawn the backend PTY
    socket.emit("terminal-spawn", { terminalId, cwd });

    // Handle incoming data
    const handleData = (data: string) => {
      term.write(data);
    };
    socket.on(`terminal-data-${terminalId}`, handleData);

    const handleExit = () => {
      term.write("\r\n\x1b[31m[Process Exited]\x1b[0m\r\n");
    };
    socket.on(`terminal-exit-${terminalId}`, handleExit);

    // Send keystrokes
    term.onData((data) => {
      socket.emit("terminal-input", { terminalId, input: data });
    });

    // Handle resizing
    const handleResize = () => {
      try {
        fitAddon.fit();
        socket.emit("terminal-resize", {
          terminalId,
          cols: term.cols,
          rows: term.rows,
        });
      } catch (e) {}
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(terminalRef.current);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      socket.off(`terminal-data-${terminalId}`, handleData);
      socket.off(`terminal-exit-${terminalId}`, handleExit);
      socket.emit("terminal-kill", { terminalId });
      term.dispose();
      initializedRef.current = false;
    };
  }, [socket, terminalId, cwd]);

  return (
    <div className="w-full h-full bg-[#0a0a0a] p-2 overflow-hidden">
      <div ref={terminalRef} className="w-full h-full" />
    </div>
  );
}
