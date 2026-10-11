"use client";

import React from "react";

export interface CheckinCalendarItem {
  id: string;
  periodDate: string | Date;
  status: "CLEAN" | "LAPSED" | "UNCONFIRMED" | "PENDING" | string;
}

interface Calendar90DaysProps {
  checkins: CheckinCalendarItem[];
  timezone?: string;
}

export function Calendar90Days({ checkins }: Calendar90DaysProps) {
  // Format map status per YYYY-MM-DD
  const statusMap = new Map<string, string>();
  for (const c of checkins) {
    const dStr =
      typeof c.periodDate === "string"
        ? c.periodDate.slice(0, 10)
        : c.periodDate.toISOString().slice(0, 10);
    statusMap.set(dStr, c.status);
  }

  // Buat 90 hari terakhir hingga hari ini
  const days: { dateStr: string; label: string; status: string }[] = [];
  const today = new Date();

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    const status = statusMap.get(dateStr) ?? "NONE";
    days.push({
      dateStr,
      label: d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      status,
    });
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CLEAN":
        return "bg-emerald-500 hover:bg-emerald-400 border-emerald-400/40 text-emerald-100";
      case "LAPSED":
        // Mengikuti §13.2: Warna hangat netral (amber/soft orange), BUKAN merah mencolok
        return "bg-amber-600/70 hover:bg-amber-500 border-amber-500/40 text-amber-100";
      case "UNCONFIRMED":
        return "bg-slate-700 hover:bg-slate-600 border-slate-600/40 text-slate-300";
      case "PENDING":
        return "bg-indigo-600/60 hover:bg-indigo-500 border-indigo-400/50 text-indigo-200 animate-pulse";
      default:
        return "bg-white/5 hover:bg-white/10 border-white/5 text-slate-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "CLEAN":
        return "Bersih";
      case "LAPSED":
        return "Terpeleset";
      case "UNCONFIRMED":
        return "Belum Dikonfirmasi";
      case "PENDING":
        return "Menunggu Evaluasi";
      default:
        return "Belum Tercatat";
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#161622] p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">Kalender 90 Hari</h3>
          <p className="text-xs text-slate-400">
            Riwayat harian evaluasi kebiasaan tanpa menghakimi.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-emerald-500 border border-emerald-400/40" />
            <span>Bersih</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-amber-600/70 border border-amber-500/40" />
            <span>Terpeleset</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-indigo-600/60 border border-indigo-400/50" />
            <span>Menunggu</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-slate-700 border border-slate-600/40" />
            <span>Terlewat</span>
          </div>
        </div>
      </div>

      {/* Grid 90 Days */}
      <div
        className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-18 gap-1.5 p-3 rounded-xl bg-black/20 border border-white/5"
        role="grid"
        aria-label="Kalender 90 hari check-in"
      >
        {days.map((day) => (
          <div
            key={day.dateStr}
            tabIndex={0}
            role="gridcell"
            aria-label={`${day.label}: ${getStatusText(day.status)}`}
            className={`group relative aspect-square rounded-md border transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 ${getStatusColor(
              day.status,
            )}`}
          >
            {/* Tooltip */}
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex group-focus:flex flex-col items-center z-30">
              <div className="whitespace-nowrap rounded-lg bg-[#0f0f17] border border-white/20 px-2.5 py-1 text-[11px] font-medium text-white shadow-xl">
                <div>{day.label}</div>
                <div className="text-[10px] text-slate-300 font-normal">
                  Status: {getStatusText(day.status)}
                </div>
              </div>
              <div className="h-1 w-2 -mt-0.5 border-t-4 border-l-4 border-r-4 border-transparent border-t-[#0f0f17]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
