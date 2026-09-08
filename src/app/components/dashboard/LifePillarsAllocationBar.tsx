"use client";

interface Pillar {
  name: string;
  pct: number;
  hoursLogged: number;
  colorClass: string;
}

interface AllocationProps {
  totalHoursLogged: number;
  pillars: Pillar[];
}

export function LifePillarsAllocationBar({
  totalHoursLogged,
  pillars,
}: AllocationProps) {
  function getSwatchColor(name: string) {
    if (name.toLowerCase().includes("akademik") || name.toLowerCase().includes("kuliah")) {
      return "bg-[#c0c1ff]";
    }
    if (name.toLowerCase().includes("soft") || name.toLowerCase().includes("saas") || name.toLowerCase().includes("dev")) {
      return "bg-[#a078ff]";
    }
    return "bg-[#4edea3]";
  }

  return (
    <div className="rounded-xl bg-[#131825] p-4 sm:p-5 border border-white/[0.07] shadow-md flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[#c0c1ff] text-base">📊</span>
          <h4 className="font-['Hanken_Grotesk',sans-serif] text-base font-bold text-[#e2e2eb]">
            Alokasi Waktu Bidang Kehidupan Mingguan
          </h4>
        </div>
        <span className="font-mono text-xs text-[#958ea0]">
          {totalHoursLogged} Jam Total Tercatat
        </span>
      </div>

      {/* Multi-Color Segmented Bar */}
      <div className="w-full h-3 rounded-full bg-[#0c0e14] overflow-hidden flex border border-white/[0.05]">
        {pillars.map((pillar, i) => (
          <div
            key={i}
            className={`h-full ${getSwatchColor(pillar.name)}`}
            style={{ width: `${pillar.pct}%` }}
            title={`${pillar.name}: ${pillar.pct}%`}
          ></div>
        ))}
      </div>

      {/* Segment Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        {pillars.map((pillar, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 p-2 rounded bg-[#0c0e14] border border-white/[0.03]"
          >
            <span
              className={`w-3 h-3 rounded-sm shrink-0 ${getSwatchColor(pillar.name)}`}
            ></span>
            <div className="flex flex-col min-w-0">
              <span className="font-mono text-xs text-[#e2e2eb] font-medium truncate">
                {pillar.name}
              </span>
              <span className="font-mono text-[10px] text-[#958ea0]">
                {pillar.pct}% • {pillar.hoursLogged} jam tercatat
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
