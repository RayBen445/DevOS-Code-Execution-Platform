import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe, Users, Activity, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";

interface Collaborator {
  id: string;
  name: string;
  avatar: string;
  project: string;
  location: [number, number]; // [x, y] percentages 0-100
  ping: number;
}

// Simulated live collaborators across the globe
const generateCollaborators = (): Collaborator[] => [
  { id: "1", name: "Alex R.", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=3b82f6", project: "React Router v7", location: [25, 35], ping: 24 },
  { id: "2", name: "Sarah J.", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=10b981", project: "AI Chat Interface", location: [70, 25], ping: 12 },
  { id: "3", name: "Mikko", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mikko&backgroundColor=8b5cf6", project: "DevOS Core", location: [50, 20], ping: 45 },
  { id: "4", name: "Elena", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena&backgroundColor=f43f5e", project: "Landing Page V2", location: [85, 60], ping: 8 },
  { id: "5", name: "David", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David&backgroundColor=f59e0b", project: "Web3 Wallet", location: [15, 65], ping: 120 },
];

export default function LiveMap({ className }: { className?: string }) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Initial load
    setCollaborators(generateCollaborators());

    // Simulate occasional movement/pings
    const interval = setInterval(() => {
      setCollaborators(prev => prev.map(c => ({
        ...c,
        ping: Math.max(5, c.ping + (Math.random() * 20 - 10))
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("relative w-full rounded-3xl border border-border-base bg-surface overflow-hidden group", className)}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-5 z-20 flex justify-between items-start pointer-events-none">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Globe className="w-5 h-5 text-accent" />
            Live Network Map
          </h3>
          <p className="text-xs text-secondary mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {collaborators.length} developers online now
          </p>
        </div>
        <button 
          onClick={() => navigate("/communities")}
          className="pointer-events-auto flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-secondary hover:text-primary transition-colors border border-border-base"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* Abstract Map Background */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08)_0%,transparent_70%)] opacity-50" />
      
      {/* SVG Map (Abstract Dotted Grid) */}
      <div className="absolute inset-0 z-10 opacity-[0.15] mix-blend-screen pointer-events-none"
           style={{
             backgroundImage: 'radial-gradient(var(--text-primary) 1px, transparent 1px)',
             backgroundSize: '24px 24px',
             backgroundPosition: 'center center'
           }} 
      />

      {/* Map Content Area */}
      <div className="relative w-full h-[400px] z-20 overflow-hidden">
        {/* Connecting Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
          {collaborators.map((c, i) => {
            // Draw lines to next 2 collaborators
            const next1 = collaborators[(i + 1) % collaborators.length];
            return (
              <motion.line
                key={`line-${c.id}`}
                x1={`${c.location[0]}%`}
                y1={`${c.location[1]}%`}
                x2={`${next1.location[0]}%`}
                y2={`${next1.location[1]}%`}
                stroke="var(--accent)"
                strokeWidth="1"
                strokeDasharray="4 4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.5 }}
                transition={{ duration: 2, delay: i * 0.2, repeat: Infinity, repeatType: "reverse" }}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {collaborators.map((c, i) => (
          <motion.div
            key={c.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group/node cursor-pointer"
            style={{ left: `${c.location[0]}%`, top: `${c.location[1]}%` }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", delay: i * 0.15 }}
            whileHover={{ scale: 1.1, zIndex: 50 }}
          >
            {/* Ping effect */}
            <div className="absolute inset-0 w-full h-full bg-accent/40 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
            
            {/* Avatar */}
            <div className="relative w-8 h-8 rounded-full border-2 border-surface shadow-xl bg-surface overflow-hidden">
              <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
            </div>

            {/* Tooltip */}
            <div className="absolute top-full mt-2 w-max bg-surface border border-border-base rounded-lg p-2 opacity-0 group-hover/node:opacity-100 transition-opacity shadow-2xl pointer-events-none z-50">
              <div className="font-bold text-xs">{c.name}</div>
              <div className="text-[10px] text-secondary flex items-center gap-1 mt-0.5">
                <Activity className="w-3 h-3 text-accent" />
                Working on {c.project}
              </div>
              <div className="text-[9px] text-secondary/50 mt-1 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {Math.round(c.ping)}ms latency
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer stats */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border-base bg-surface/50 backdrop-blur-md z-20 flex justify-between text-xs text-secondary">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>Global Collaboration Active</span>
        </div>
        <div>Server: us-east-1</div>
      </div>
    </div>
  );
}
