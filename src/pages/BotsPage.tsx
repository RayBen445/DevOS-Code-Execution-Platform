import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Bot, BotMessageSquare } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import { getBotsForUI, getBotLogsForUI, setBotEnabledForUI } from "../lib/botEngine";

export default function BotsPage() {
  const [bots, setBots] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const refresh = useCallback(() => {
    setBots(getBotsForUI());
    setLogs(getBotLogsForUI());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
            <Bot className="w-4 h-4" />
            Bots Control Center
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {bots.map((bot: any) => (
            <div key={bot.name} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{bot.name}</h2>
                  <p className="text-xs text-white/50">{bot.type} • events: {bot.events.join(", ")}</p>
                </div>
                <button
                  onClick={() => { setBotEnabledForUI(bot.name, !bot.enabled); refresh(); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium ${bot.enabled ? "bg-green-500/20 text-green-300" : "bg-white/10 text-white/60"}`}
                >
                  {bot.enabled ? "Enabled" : "Disabled"}
                </button>
              </div>
              <p className="text-xs text-white/40">Permissions R:{bot.permissions?.read?.join("|") || "none"} W:{bot.permissions?.write?.join("|") || "none"}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0b0b0b] p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><BotMessageSquare className="w-4 h-4" /> Bot Logs</h2>
          <div className="space-y-2 max-h-72 overflow-auto pr-1">
            {logs.length === 0 && <p className="text-sm text-white/40">No logs yet.</p>}
            {logs.map((log: any) => (
              <div key={log.id} className="text-xs border border-white/10 rounded-md p-2 text-white/70">
                <div className="text-white/40">{new Date(log.createdAt).toLocaleString()}</div>
                <div>{log.message}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
