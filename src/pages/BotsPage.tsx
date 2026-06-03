import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft, Bot, BotMessageSquare, Zap, ToggleRight, ToggleLeft,
  Terminal, RefreshCw, Play, CheckCircle2, Clock, AlertCircle, Info,
  Cpu, Shield, Code2, Rocket, MessageSquare,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { getBotsForUI, getBotLogsForUI, setBotEnabledForUI, initializeDefaultBots, runBotTestFlow } from "../lib/botEngine";
import { useSEO } from "../hooks/useSEO";
import { cn } from "../lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";

const BOT_COMMANDS: Array<{ cmd: string; desc: string; icon: LucideIcon }> = [
  { cmd: "/help", desc: "List all available bot commands", icon: Info },
  { cmd: "/deploy", desc: "Trigger a deploy for the current project", icon: Rocket },
  { cmd: "/run", desc: "Run the project in the terminal", icon: Play },
  { cmd: "/ai", desc: "Ask the AI assistant a question", icon: Cpu },
];

const LOG_LEVEL_STYLES: Record<string, string> = {
  info: "text-blue-400 border-blue-500/20 bg-blue-500/5",
  warning: "text-yellow-400 border-yellow-500/20 bg-yellow-500/5",
  error: "text-red-400 border-red-500/20 bg-red-500/5",
  success: "text-green-400 border-green-500/20 bg-green-500/5",
};

const LOG_LEVEL_ICON: Record<string, LucideIcon> = {
  info: Info, warning: AlertCircle, error: AlertCircle, success: CheckCircle2,
};

function getBotTypeIcon(type: string): LucideIcon {
  if (type === "automation") return Cpu;
  if (type === "moderation") return Shield;
  if (type === "chat") return MessageSquare;
  if (type === "code") return Code2;
  return Bot;
}

export default function BotsPage() {
  useSEO({ title: "Bots — DevOS", description: "Manage and monitor DevOS automation bots." });

  const [bots, setBots] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);

  const refresh = useCallback(() => {
    initializeDefaultBots();
    setBots(getBotsForUI());
    setLogs(getBotLogsForUI());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleTest = async () => {
    setTesting(true);
    try {
      await runBotTestFlow();
      refresh();
      toast.success("Bot test flow complete — check logs below.");
    } catch {
      toast.error("Test flow failed.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-base text-white flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-10 pb-24 md:pb-10 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <Bot className="w-8 h-8 text-blue-400" />
              Bots Control Center
            </h1>
            <p className="text-white/40 text-sm mt-1">Manage automation, chat, and moderation bots</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
            >
              {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Run Test Flow
            </button>
          </div>
        </div>

        {/* Commands reference */}
        <div className="bg-white/[0.03] border border-border-base rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-400" />
            Bot Commands (Terminal)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BOT_COMMANDS.map(({ cmd, desc, icon: Icon }) => (
              <div key={cmd} className="bg-white/5 border border-border-base rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="w-4 h-4 text-blue-400 shrink-0" />
                  <code className="text-xs font-mono font-bold text-white">{cmd}</code>
                </div>
                <p className="text-[11px] text-white/40 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Registered bots */}
        <div>
          <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Registered Bots
          </h2>
          {bots.length === 0 ? (
            <div className="bg-white/[0.03] border border-border-base rounded-2xl p-10 text-center text-white/30">
              <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No bots registered yet. Click "Run Test Flow" to initialize.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {bots.map((bot: any, i: number) => {
                const TypeIcon = getBotTypeIcon(bot.type);
                return (
                  <motion.div
                    key={bot.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white/[0.03] border border-border-base hover:border-border-base rounded-2xl p-5 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600/15 flex items-center justify-center shrink-0">
                          <TypeIcon className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{bot.name}</h3>
                          <p className="text-xs text-white/40 capitalize">{bot.type || "automation"} bot</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setBotEnabledForUI(bot.name, !bot.enabled); refresh(); }}
                        className="shrink-0"
                        title={bot.enabled ? "Disable bot" : "Enable bot"}
                      >
                        {bot.enabled
                          ? <ToggleRight className="w-8 h-8 text-green-400" />
                          : <ToggleLeft className="w-8 h-8 text-white/25" />}
                      </button>
                    </div>

                    {/* Events */}
                    {bot.events?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {bot.events.map((ev: string) => (
                          <span key={ev} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-border-base text-white/50">
                            {ev}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Permissions */}
                    <div className="flex items-center gap-4 text-[11px] text-white/30">
                      <span>Read: {bot.permissions?.read?.join(", ") || "none"}</span>
                      <span>Write: {bot.permissions?.write?.join(", ") || "none"}</span>
                    </div>

                    {/* Status */}
                    <div className={cn(
                      "mt-3 flex items-center gap-1.5 text-xs font-medium",
                      bot.enabled ? "text-green-400" : "text-white/30"
                    )}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", bot.enabled ? "bg-green-400 animate-pulse" : "bg-white/20")} />
                      {bot.enabled ? "Active" : "Inactive"}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Logs */}
        <div>
          <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest mb-4 flex items-center gap-2">
            <BotMessageSquare className="w-4 h-4 text-purple-400" />
            Activity Logs
          </h2>
          <div className="bg-base border border-border-base rounded-2xl p-4">
            <div className="space-y-2 max-h-80 overflow-auto pr-1">
              {logs.length === 0 ? (
                <p className="text-sm text-white/30 py-4 text-center">No activity yet. Run the test flow to generate logs.</p>
              ) : (
                [...logs].reverse().map((log: any) => {
                  const level = log.level || "info";
                  const Icon = LOG_LEVEL_ICON[level] || Info;
                  return (
                    <div key={log.id} className={cn("flex items-start gap-3 p-3 rounded-xl border text-xs", LOG_LEVEL_STYLES[level] || LOG_LEVEL_STYLES.info)}>
                      <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p>{log.message}</p>
                        <p className="text-white/30 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
