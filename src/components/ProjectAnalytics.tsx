import React from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Eye, Users, Zap, Terminal } from "lucide-react";
import { motion } from "framer-motion";

const mockTrafficData = [
  { name: "1st", views: 400, visitors: 240 },
  { name: "5th", views: 300, visitors: 139 },
  { name: "10th", views: 800, visitors: 600 },
  { name: "15th", views: 1200, visitors: 980 },
  { name: "20th", views: 1890, visitors: 1400 },
  { name: "25th", views: 2390, visitors: 1800 },
  { name: "30th", views: 3490, visitors: 2300 },
];

const mockComputeData = [
  { name: "Mon", compute: 45 },
  { name: "Tue", compute: 80 },
  { name: "Wed", compute: 120 },
  { name: "Thu", compute: 90 },
  { name: "Fri", compute: 210 },
  { name: "Sat", compute: 300 },
  { name: "Sun", compute: 150 },
];

function StatCard({ title, value, icon: Icon, trend }: { title: string; value: string; icon: React.ElementType; trend: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-4 relative overflow-hidden group">
      <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-center justify-between relative z-10">
        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
        <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
          {trend}
        </span>
      </div>
      <div className="relative z-10">
        <h3 className="text-white/50 text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
}

export default function ProjectAnalytics() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-8"
    >
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Project Analytics</h2>
          <p className="text-white/50 text-sm">Traffic and compute metrics over the last 30 days.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Views" value="10.4K" icon={Eye} trend="+24.5%" />
        <StatCard title="Unique Visitors" value="7.1K" icon={Users} trend="+18.2%" />
        <StatCard title="Total Deployments" value="142" icon={Terminal} trend="+5.4%" />
        <StatCard title="Compute Hours" value="84h" icon={Zap} trend="+42.1%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white/[0.02] border border-white/5">
          <h3 className="text-white/80 font-semibold mb-6">Traffic Over Time</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockTrafficData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f1117', border: '1px solid #ffffff20', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                <Area type="monotone" dataKey="visitors" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorVisitors)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
          <h3 className="text-white/80 font-semibold mb-6">Compute Usage (Mins)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockComputeData}>
                <defs>
                  <linearGradient id="colorCompute" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f1117', border: '1px solid #ffffff20', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ fill: '#ffffff05' }}
                />
                <Bar dataKey="compute" fill="url(#colorCompute)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
