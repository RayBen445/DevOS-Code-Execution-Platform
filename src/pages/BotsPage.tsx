import { useMemo, useState } from "react";
import { Bot, BotMessageSquare } from "lucide-react";
import { getBotsForUI, getBotLogsForUI, setBotEnabledForUI, runBotTestFlow } from "../lib/botEngine";

export default function BotsPage() {
  const [refreshTick, setRefreshTick] = useState(0);
  const bots = useMemo(() => getBotsForUI(), [refreshTick]);
  const logs = useMemo(() => getBotLogsForUI(), [refreshTick]);

  const refresh = () => setRefreshTick((v) => v + 1);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bot className="w-6 h-6 text-blue-400" /> Bots</h1>
          <p className="text-white/60 text-sm">Manage DevOS built-in automation bots and view execution logs.</p>
        </div>
        <button
          onClick={async () => { await runBotTestFlow(); refresh(); }}
          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold"
        >
          Run test flow
        </button>
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
    </div>
  );
}
