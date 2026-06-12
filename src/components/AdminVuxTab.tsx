import React, { useState, useEffect, useCallback } from "react";
import { Activity, Server, Clock, HardDrive, Mail, Database, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminVuxTab() {
  const [latency, setLatency] = useState<number | null>(null);
  const [speedData, setSpeedData] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const VUX_API_URL = import.meta.env.VITE_VUX_API_URL || "https://events.kontyra.name.ng";

  const fetchStatus = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      // 1. Ping (Latency)
      const startPing = Date.now();
      await fetch(`${VUX_API_URL.replace(/\/+$/, "")}/ping`).then((res) => {
        if (!res.ok) throw new Error("Ping failed");
        return res.text();
      });
      setLatency(Date.now() - startPing);

      // 2. Speed
      const speedRes = await fetch(`${VUX_API_URL.replace(/\/+$/, "")}/speed`);
      if (speedRes.ok) {
        setSpeedData(await speedRes.json());
      } else {
        throw new Error("Speed check failed");
      }

      // 3. Health
      const healthRes = await fetch(`${VUX_API_URL.replace(/\/+$/, "")}/health`);
      if (healthRes.ok) {
        setHealthData(await healthRes.json());
      } else {
        throw new Error("Health check failed");
      }
    } catch (err: any) {
      console.error("VUX Monitoring Error:", err);
      setError(err.message || "Failed to fetch VUX status");
    } finally {
      setIsRefreshing(false);
    }
  }, [VUX_API_URL]);

  useEffect(() => {
    fetchStatus();
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const StatCard = ({ title, value, icon, statusColor, subtext }: any) => (
    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white/60 font-medium text-sm">{title}</h3>
        <div className={`p-2 rounded-xl bg-white/[0.04] ${statusColor}`}>{icon}</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        {subtext && <div className="text-xs text-white/40">{subtext}</div>}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400" />
            VUX Infrastructure Status
          </h2>
          <p className="text-sm text-white/60">
            Real-time monitoring for the VUX Events engine ({VUX_API_URL})
          </p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={isRefreshing}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-400" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* Latency & Network */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Network Latency"
          value={latency !== null ? `${latency} ms` : "--"}
          icon={<Server className="w-4 h-4" />}
          statusColor={latency !== null && latency < 200 ? "text-emerald-400" : "text-amber-400"}
          subtext="Round-trip time to /ping"
        />
        <StatCard
          title="Event Loop Delay"
          value={speedData ? `${speedData.eventLoopDelayMs?.toFixed(2)} ms` : "--"}
          icon={<Activity className="w-4 h-4" />}
          statusColor={speedData?.eventLoopDelayMs < 50 ? "text-emerald-400" : "text-amber-400"}
          subtext="Node.js main thread latency"
        />
        <StatCard
          title="Memory Usage"
          value={speedData ? `${speedData.memoryUsageMb?.toFixed(1)} MB` : "--"}
          icon={<HardDrive className="w-4 h-4" />}
          statusColor="text-blue-400"
          subtext="Heap usage on VUX backend"
        />
      </div>

      {/* Integration Health */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Integration Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
            <div className={`p-3 rounded-full ${healthData?.status === 'ok' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {healthData?.status === 'ok' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-sm font-medium text-white/60 mb-0.5">Overall System</div>
              <div className="text-lg font-bold text-white capitalize">{healthData?.status || "Unknown"}</div>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
            <div className={`p-3 rounded-full ${healthData?.firebaseAdminStatus === 'initialized' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-white/60 mb-0.5">Firebase Admin</div>
              <div className="text-lg font-bold text-white capitalize">{healthData?.firebaseAdminStatus || "Unknown"}</div>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
            <div className={`p-3 rounded-full ${healthData?.smtpConfigured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-white/60 mb-0.5">SMTP Mailer</div>
              <div className="text-lg font-bold text-white">{healthData?.smtpConfigured ? "Configured" : "Missing"}</div>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500/20 text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-white/60 mb-0.5">Uptime</div>
              <div className="text-lg font-bold text-white">
                {speedData?.uptimeSeconds 
                  ? `${Math.floor(speedData.uptimeSeconds / 3600)}h ${Math.floor((speedData.uptimeSeconds % 3600) / 60)}m`
                  : "--"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
