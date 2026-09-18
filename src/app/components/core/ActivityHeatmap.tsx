"use client";

import { useMemo, useState } from "react";
import type { AnalyticsTrend } from "@/services/analytics.service";

type Props = {
  trends: AnalyticsTrend[];
  days?: number;
};

function getIntensity(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes === 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

const CELL_BG: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "#1e2235",
  1: "#312e81",
  2: "#4f46e5",
  3: "#7c3aed",
  4: "#a855f7",
};

const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
// Show label on odd-indexed days (Mon=1, Wed=3, Fri=5)
const DAY_SHOW = [false, true, false, true, false, true, false]; // Sun..Sat
const DAYS_ID =  ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function fmtDur(m: number) {
  if (m < 60) return `${m} mnt`;
  const h = Math.floor(m / 60), r = m % 60;
  return r > 0 ? `${h}j ${r}m` : `${h} jam`;
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
}

const CELL = 11; // px – cell size, same as GitHub
const GAP  = 3;  // px – gap between cells
const COL  = CELL + GAP; // 14px per column

export function ActivityHeatmap({ trends, days = 90 }: Props) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const dataMap = useMemo(() => {
    const m = new Map<string, { minutes: number; tasks: number }>();
    for (const t of trends) m.set(t.date, { minutes: t.learningMinutes, tasks: t.completedTasks });
    return m;
  }, [trends]);

  const cells = useMemo(() => {
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const start = new Date(end); start.setDate(start.getDate() - days + 1); start.setHours(0, 0, 0, 0);
    // pad to previous Sunday
    const padStart = new Date(start); padStart.setDate(padStart.getDate() - padStart.getDay());

    const result: { date: string; displayDate: Date; minutes: number; tasks: number; inRange: boolean }[] = [];
    const cur = new Date(padStart);
    while (cur <= end) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,"0")}-${String(cur.getDate()).padStart(2,"0")}`;
      const d = dataMap.get(key) ?? { minutes: 0, tasks: 0 };
      result.push({ date: key, displayDate: new Date(cur), ...d, inRange: cur >= start && cur <= end });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [dataMap, days]);

  // columns = weeks
  const weeks = useMemo(() => {
    const w: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7));
    return w;
  }, [cells]);

  // Month label: show at first week of each new month
  const monthLabels = useMemo(() =>
    weeks.map((week, wi) => {
      const first = week.find(c => c.inRange);
      if (!first) return null;
      const prev = wi > 0 ? weeks[wi - 1].find(c => c.inRange) : null;
      if (!prev || prev.displayDate.getMonth() !== first.displayDate.getMonth()) {
        return MONTHS_ID[first.displayDate.getMonth()];
      }
      return null;
    }),
  [weeks]);

  const DAY_LABEL_W = 28; // px for the day-of-week column
  const gridWidth = DAY_LABEL_W + weeks.length * COL;
  const activeDays = cells.filter(c => c.inRange && c.minutes > 0).length;
  const totalMin   = cells.filter(c => c.inRange).reduce((a, c) => a + c.minutes, 0);

  return (
    <div className="relative">
      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded-lg bg-[#0B0D13] border border-white/[0.15] text-[11px] font-mono text-white shadow-xl whitespace-nowrap"
          style={{ left: tooltip.x + 10, top: tooltip.y - 36 }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Heatmap — overflow-x-auto so it scrolls on small screens */}
      <div className="overflow-x-auto">
        {/* Month label row */}
        <div className="flex" style={{ paddingLeft: DAY_LABEL_W, width: gridWidth, marginBottom: 4 }}>
          {weeks.map((_, wi) => (
            <div
              key={wi}
              className="shrink-0 text-[10px] text-gray-400 font-mono font-medium overflow-visible whitespace-nowrap"
              style={{ width: COL }}
            >
              {monthLabels[wi] ?? ""}
            </div>
          ))}
        </div>

        {/* Day labels + week grid */}
        <div className="flex" style={{ width: gridWidth }}>
          {/* Day-of-week label column */}
          <div className="shrink-0 flex flex-col" style={{ width: DAY_LABEL_W, gap: GAP }}>
            {DAYS_ID.map((d, i) => (
              <div
                key={d}
                className="flex items-center justify-end pr-1.5 text-[10px] text-gray-500 font-mono"
                style={{ height: CELL, opacity: DAY_SHOW[i] ? 1 : 0 }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Week columns */}
          <div className="flex" style={{ gap: GAP }}>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col shrink-0" style={{ gap: GAP, width: CELL }}>
                {week.map((cell, ci) => {
                  const lvl = cell.inRange ? getIntensity(cell.minutes) : -1;
                  return (
                    <div
                      key={ci}
                      className="rounded-[2px] transition-opacity duration-100"
                      style={{
                        width: CELL,
                        height: CELL,
                        backgroundColor: lvl >= 0 ? CELL_BG[lvl as 0|1|2|3|4] : "transparent",
                        cursor: cell.inRange ? "default" : "default",
                      }}
                      onMouseEnter={(e) => {
                        if (!cell.inRange) return;
                        const r = (e.target as HTMLElement).getBoundingClientRect();
                        const text = cell.minutes > 0
                          ? `${fmtDate(cell.displayDate)} · ${fmtDur(cell.minutes)}, ${cell.tasks} task`
                          : `${fmtDate(cell.displayDate)} · tidak ada aktivitas`;
                        setTooltip({ text, x: r.left, y: r.top });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-white/[0.06]">
        <p className="text-xs font-mono text-gray-400">
          <span className="font-bold text-[#4edea3]">{activeDays}</span> hari aktif
          {totalMin > 0 && <> · <span className="font-bold text-[#d0bcff]">{fmtDur(totalMin)}</span> total fokus</>}
          {" "}dalam {days} hari terakhir
        </p>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-gray-500">
          <span>Sedikit</span>
          <div className="flex items-center gap-[3px]">
            {([0,1,2,3,4] as const).map(lvl => (
              <span key={lvl} className="block rounded-[2px]" style={{ width: CELL, height: CELL, backgroundColor: CELL_BG[lvl] }} />
            ))}
          </div>
          <span>Intensif</span>
        </div>
      </div>
    </div>
  );
}
