import { CheckCircle2, AlertTriangle, XCircle, Activity } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useSEO } from "../hooks/useSEO";

type ServiceStatus = "operational" | "degraded" | "down";

interface Service {
  name: string;
  status: ServiceStatus;
  uptime: string;
}

const SERVICES: Service[] = [
  { name: "Code Editor", status: "operational", uptime: "99.98%" },
  { name: "Deploy System", status: "operational", uptime: "99.95%" },
  { name: "Live Preview", status: "operational", uptime: "99.97%" },
  { name: "Authentication", status: "operational", uptime: "99.99%" },
  { name: "Database", status: "operational", uptime: "99.99%" },
];

function StatusBadge({ status }: { status: ServiceStatus }) {
  if (status === "operational") {
    return (
      <span className="flex items-center gap-1.5 text-green-400 text-sm font-medium">
        <CheckCircle2 className="w-4 h-4" />
        Operational
      </span>
    );
  }
  if (status === "degraded") {
    return (
      <span className="flex items-center gap-1.5 text-yellow-400 text-sm font-medium">
        <AlertTriangle className="w-4 h-4" />
        Degraded
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-red-400 text-sm font-medium">
      <XCircle className="w-4 h-4" />
      Down
    </span>
  );
}

function overallStatus(services: Service[]): ServiceStatus {
  if (services.some((s) => s.status === "down")) return "down";
  if (services.some((s) => s.status === "degraded")) return "degraded";
  return "operational";
}

export default function StatusPage() {
  useSEO({ title: "Status — DevOS" });

  const overall = overallStatus(SERVICES);

  const headerBg =
    overall === "operational"
      ? "bg-green-500/10 border-green-500/20"
      : overall === "degraded"
      ? "bg-yellow-500/10 border-yellow-500/20"
      : "bg-red-500/10 border-red-500/20";

  const headerText =
    overall === "operational"
      ? "text-green-400"
      : overall === "degraded"
      ? "text-yellow-400"
      : "text-red-400";

  const headerMsg =
    overall === "operational"
      ? "All systems operational"
      : overall === "degraded"
      ? "Some systems degraded"
      : "Service disruption detected";

  const HeaderIcon =
    overall === "operational"
      ? CheckCircle2
      : overall === "degraded"
      ? AlertTriangle
      : XCircle;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-6 py-20 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-10"
        >
          {/* Header */}
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">DevOS Status</h1>
            <p className="text-white/40 text-sm">Real-time platform health information</p>
          </div>

          {/* Overall status banner */}
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl border ${headerBg}`}>
            <HeaderIcon className={`w-6 h-6 ${headerText} flex-shrink-0`} />
            <span className={`font-bold text-lg ${headerText}`}>{headerMsg}</span>
          </div>

          {/* Services */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-white/30 mb-4">
              Services
            </h2>
            <div className="divide-y divide-white/5 rounded-2xl border border-white/5 overflow-hidden">
              {SERVICES.map((service) => (
                <div
                  key={service.name}
                  className="flex items-center justify-between px-6 py-4 bg-[#111] hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-white/20" />
                    <span className="font-medium text-white/80">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-xs text-white/30 font-mono hidden sm:block">
                      {service.uptime} uptime
                    </span>
                    <StatusBadge status={service.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Incidents */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-white/30 mb-4">
              Incidents
            </h2>
            <div className="rounded-2xl border border-white/5 bg-[#111] px-6 py-8 flex flex-col items-center gap-3 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-500/50" />
              <p className="text-white/40 text-sm">No active incidents. Everything is running smoothly.</p>
              <p className="text-white/20 text-xs">Last checked: {new Date().toUTCString()}</p>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
