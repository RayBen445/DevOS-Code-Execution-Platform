import React, { useEffect, useMemo, useState } from "react";
import { getUserActivityHeatmap } from "../lib/activityService";
import { cn } from "../lib/utils";

interface Props {
  userId: string;
}

/** ISO week-day order: Sunday=0 … Saturday=6, displayed Mon-Sun */
const DAY_LABELS = ["Mon", "Wed", "Fri"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Map activity count → Tailwind bg colour class */
function countToColor(count: number): string {
  if (count === 0) return "bg-white/[0.05]";
  if (count === 1) return "bg-green-900/70";
  if (count <= 3) return "bg-green-700/80";
  if (count <= 6) return "bg-green-500/90";
  return "bg-green-400";
}

/** Build the ordered array of ISO date strings for the past 365 days, padded
 *  to start on a Monday so the grid aligns. */
function buildGrid(): string[] {
  const today = new Date();
  // Roll back to the most recent Sunday to start a full week column
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364);
  // Align to nearest Monday (ISO week)
  const dayOfWeek = (startDate.getDay() + 6) % 7; // 0=Mon … 6=Sun
  startDate.setDate(startDate.getDate() - dayOfWeek);

  const dates: string[] = [];
  const cursor = new Date(startDate);
  while (cursor <= today) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export default function ActivityGraph({ userId }: Props) {
  const [heatmap, setHeatmap] = useState<Map<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  useEffect(() => {
    setLoading(true);
    getUserActivityHeatmap(userId)
      .then(setHeatmap)
      .finally(() => setLoading(false));
  }, [userId]);

  const { grid, weeks, monthLabels } = useMemo(() => {
    const dates = buildGrid();
    // Chunk into weeks (columns of 7)
    const weeks: string[][] = [];
    for (let i = 0; i < dates.length; i += 7) {
      weeks.push(dates.slice(i, i + 7));
    }

    // Month label positions: first week that starts in a new month
    const labels: Array<{ col: number; label: string }> = [];
    let lastMonth = -1;
    weeks.forEach((week, col) => {
      const month = new Date(week[0]).getMonth();
      if (month !== lastMonth) {
        labels.push({ col, label: MONTH_NAMES[month] });
        lastMonth = month;
      }
    });

    return { grid: dates, weeks, monthLabels: labels };
  }, []);

  const totalContributions = useMemo(() => {
    if (!heatmap) return 0;
    let sum = 0;
    heatmap.forEach((v) => { sum += v; });
    return sum;
  }, [heatmap]);

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-white/70">
          {loading ? "Loading activity…" : `${totalContributions.toLocaleString()} contributions in the last year`}
        </h3>
        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[11px] text-white/30">
          <span>Less</span>
          {[0, 1, 3, 5, 7].map((n) => (
            <div key={n} className={cn("w-3 h-3 rounded-sm", countToColor(n))} />
          ))}
          <span>More</span>
        </div>
      </div>

      {loading ? (
        <div className="h-24 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-green-500/30 border-t-green-500 animate-spin" />
        </div>
      ) : (
        <div className="relative overflow-x-auto">
          {/* Month labels */}
          <div className="flex gap-[3px] mb-1 ml-8">
            {(() => {
              const nodes: React.ReactNode[] = [];
              let lastPos = 0;
              monthLabels.forEach(({ col, label }) => {
                // fill gap with invisible spacers
                const spacer = col - lastPos;
                if (spacer > 0) {
                  nodes.push(
                    <div key={`sp-${col}`} style={{ width: spacer * 15 }} className="shrink-0" />
                  );
                }
                nodes.push(
                  <span key={`ml-${col}`} className="text-[10px] text-white/30 shrink-0 whitespace-nowrap" style={{ minWidth: 28 }}>
                    {label}
                  </span>
                );
                lastPos = col + 2;
              });
              return nodes;
            })()}
          </div>

          <div className="flex gap-[3px]">
            {/* Day-of-week labels */}
            <div className="flex flex-col gap-[3px] mr-1 justify-between py-[1px]">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
                <span key={d} className={cn("text-[9px] text-white/25 w-6 text-right leading-none", !DAY_LABELS.includes(d) && "opacity-0")}>
                  {d}
                </span>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, colIdx) => (
              <div key={colIdx} className="flex flex-col gap-[3px]">
                {week.map((date) => {
                  const count = heatmap?.get(date) ?? 0;
                  return (
                    <div
                      key={date}
                      className={cn(
                        "w-3 h-3 rounded-sm cursor-default transition-opacity hover:opacity-80",
                        countToColor(count)
                      )}
                      onMouseEnter={(e) => {
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        setTooltip({ date, count, x: rect.left + window.scrollX, y: rect.top + window.scrollY });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="fixed z-50 pointer-events-none bg-[#1a1a2e] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white shadow-xl"
              style={{ left: tooltip.x + 8, top: tooltip.y - 40 }}
            >
              <span className="font-semibold">{tooltip.count} contribution{tooltip.count !== 1 ? "s" : ""}</span>
              <span className="text-white/50 ml-1.5">on {tooltip.date}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
