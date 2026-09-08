"use client";

interface HeatmapDay {
  date: string;
  minutes: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

interface HeatmapWeek {
  days: HeatmapDay[];
}

interface HeatmapProps {
  heatmap: {
    totalQuarterHours: number;
    avgDailyHours: number;
    weeks: HeatmapWeek[];
  };
}

export function FocusHeatmapCard({ heatmap }: HeatmapProps) {
  function getCellBg(intensity: number) {
    switch (intensity) {
      case 1:
        return "bg-[#d0bcff]/25 hover:bg-[#d0bcff]/40";
      case 2:
        return "bg-[#d0bcff]/60 hover:bg-[#d0bcff]/75";
      case 3:
        return "bg-[#d0bcff] hover:bg-[#e9ddff]";
      case 4:
        return "bg-[#4edea3] hover:bg-[#6ffbbe] shadow-xs shadow-[#4edea3]/30";
      case 0:
      default:
        return "bg-[#0c0e14] hover:bg-[#1A2133]";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Section Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#4edea3] text-lg">▦</span>
          <h3 className="font-['Hanken_Grotesk',sans-serif] text-base sm:text-lg text-[#e2e2eb] font-bold tracking-tight">
            Peta Intensitas Fokus
          </h3>
        </div>
        <span className="font-mono text-xs text-[#958ea0]">12 Pekan Terakhir</span>
      </div>

      {/* 90-Day GitHub/Linear Style Heatmap */}
      <div className="rounded-xl bg-[#131825] p-4 sm:p-5 border border-white/[0.07] shadow-md flex flex-col gap-3">
        {/* Heatmap Sub-Header & Legend */}
        <div className="flex items-center justify-between">
          <div className="font-mono text-xs text-[#958ea0]">Periode Berjalan</div>
          <div className="flex items-center gap-1 font-mono text-[10px] text-[#958ea0]">
            <span>Sedikit</span>
            <span className="w-2.5 h-2.5 rounded-xs bg-[#0c0e14] border border-white/[0.05]"></span>
            <span className="w-2.5 h-2.5 rounded-xs bg-[#d0bcff]/25"></span>
            <span className="w-2.5 h-2.5 rounded-xs bg-[#d0bcff]/60"></span>
            <span className="w-2.5 h-2.5 rounded-xs bg-[#d0bcff]"></span>
            <span className="w-2.5 h-2.5 rounded-xs bg-[#4edea3]"></span>
            <span>Banyak</span>
          </div>
        </div>

        {/* Grid Cells (12 cols x 7 rows) */}
        <div className="grid grid-flow-col grid-rows-7 gap-1.5 py-1 justify-between overflow-x-auto">
          {heatmap.weeks.map((week, wIndex) =>
            week.days.map((day, dIndex) => (
              <div
                key={`${wIndex}-${dIndex}`}
                className={`w-3.5 h-3.5 rounded-xs border border-white/[0.03] transition-colors cursor-pointer ${getCellBg(
                  day.intensity
                )}`}
                title={`${day.date}: ${day.minutes} menit fokus`}
              ></div>
            ))
          )}
        </div>

        {/* Heatmap Footer Stats */}
        <div className="flex items-center justify-between pt-1 font-mono text-xs text-[#e2e2eb] border-t border-white/[0.04]">
          <span>
            Total: <strong className="text-[#4edea3] font-semibold">{heatmap.totalQuarterHours} Jam</strong> periode ini
          </span>
          <span className="text-[#958ea0]">Rata-rata: {heatmap.avgDailyHours} Jam / hari</span>
        </div>
      </div>
    </div>
  );
}
