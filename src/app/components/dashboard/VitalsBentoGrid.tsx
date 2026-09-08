"use client";

interface VitalsProps {
  vitals: {
    focusHoursTodayLabel: string;
    focusDiffPercent: number;
    sparklinePoints: number[];
    tasksDoneLabel: string;
    dayVelocityPct: number;
    streakDays: number;
    personalBestStreak: number;
    alignmentPct: number;
  };
}

export function VitalsBentoGrid({ vitals }: VitalsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Stat 1: Focus Hours */}
      <div className="rounded-xl bg-[#131825] p-4 flex flex-col justify-between shadow-sm hover:bg-[#1A2133] transition-colors group border border-white/[0.07]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-[#958ea0] uppercase font-semibold tracking-wider">
            Waktu Fokus Hari Ini
          </span>
          <span className="text-[#d0bcff] text-sm">⏱</span>
        </div>

        <div className="my-2">
          <div className="font-['Hanken_Grotesk',sans-serif] text-xl sm:text-2xl font-bold text-[#e2e2eb]">
            {vitals.focusHoursTodayLabel}
          </div>
          <div className="flex items-center gap-1 mt-1 text-[#4edea3] font-mono text-[11px]">
            <span>↗</span>
            <span>+{vitals.focusDiffPercent}% dibanding kemarin</span>
          </div>
        </div>

        {/* Mini SVG Sparkline */}
        <div className="w-full h-6 pt-1">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 24">
            <path
              className="text-[#4edea3]"
              d="M0,18 L15,14 L30,19 L45,10 L60,12 L75,4 L100,2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            ></path>
          </svg>
        </div>
      </div>

      {/* Stat 2: Tasks Done */}
      <div className="rounded-xl bg-[#131825] p-4 flex flex-col justify-between shadow-sm hover:bg-[#1A2133] transition-colors group border border-white/[0.07]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-[#958ea0] uppercase font-semibold tracking-wider">
            Tugas Selesai
          </span>
          <span className="text-[#c0c1ff] text-sm">✓</span>
        </div>

        <div className="my-2">
          <div className="font-['Hanken_Grotesk',sans-serif] text-xl sm:text-2xl font-bold text-[#e2e2eb]">
            {vitals.tasksDoneLabel}
          </div>
          <div className="flex items-center gap-1 mt-1 text-[#c0c1ff] font-mono text-[11px]">
            <span>{vitals.dayVelocityPct}% Laju Harian</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-[#0c0e14] overflow-hidden mt-1 border border-white/[0.05]">
          <div
            className="h-full bg-[#c0c1ff] rounded-full transition-all duration-500"
            style={{ width: `${vitals.dayVelocityPct}%` }}
          ></div>
        </div>
      </div>

      {/* Stat 3: Deep Streak */}
      <div className="rounded-xl bg-[#131825] p-4 flex flex-col justify-between shadow-sm hover:bg-[#1A2133] transition-colors group border border-white/[0.07]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-[#958ea0] uppercase font-semibold tracking-wider">
            Konsistensi Fokus
          </span>
          <span className="text-sm">🔥</span>
        </div>

        <div className="my-2">
          <div className="font-['Hanken_Grotesk',sans-serif] text-xl sm:text-2xl font-bold text-[#F59E0B] flex items-baseline gap-1">
            {vitals.streakDays} <span className="text-[#e2e2eb] text-xs font-normal">Hari</span>
          </div>
          <div className="flex items-center gap-1 mt-1 text-[#958ea0] font-mono text-[11px]">
            <span>Rekor Terbaik: <strong>{vitals.personalBestStreak} hari</strong></span>
          </div>
        </div>

        <span className="inline-block px-1.5 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] font-mono text-[10px] font-bold self-start">
          Sedang Aktif
        </span>
      </div>

      {/* Stat 4: System Alignment */}
      <div className="rounded-xl bg-[#131825] p-4 flex flex-col justify-between shadow-sm hover:bg-[#1A2133] transition-colors group border border-white/[0.07]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-[#958ea0] uppercase font-semibold tracking-wider">
            Kesesuaian Target
          </span>
          <span className="text-[#4edea3] text-sm">⚡</span>
        </div>

        <div className="my-2">
          <div className="font-['Hanken_Grotesk',sans-serif] text-xl sm:text-2xl font-bold text-[#e2e2eb]">
            {vitals.alignmentPct}%
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[#4edea3] font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]"></span>
            <span>Kondisi Optimal</span>
          </div>
        </div>

        <span className="inline-block px-1.5 py-0.5 rounded bg-[#4edea3]/15 text-[#4edea3] font-mono text-[10px] font-bold self-start">
          Target Terpenuhi
        </span>
      </div>
    </div>
  );
}
