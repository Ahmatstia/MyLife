"use client";

import { useEffect, useState } from "react";

interface TickerProps {
  focusLoadPct?: number;
}

export function LiveVitalsTicker({ focusLoadPct = 78.4 }: TickerProps) {
  const [timeString, setTimeString] = useState("14:28:44");

  useEffect(() => {
    function tick() {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      const s = String(d.getSeconds()).padStart(2, "0");
      setTimeString(`${h}:${m}:${s}`);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#0c0e14]/80 backdrop-blur-md rounded-xl p-2 sm:p-3 border border-white/[0.07] flex flex-wrap items-center justify-between gap-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Live Dot & Node */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#131825] text-[#e2e2eb] border border-white/[0.05]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4edea3] opacity-80"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4edea3]"></span>
          </span>
          <span className="font-mono text-[10px] text-[#4edea3] font-bold uppercase tracking-wider">STATUS SISTEM</span>
          <span className="text-[#494454] font-mono text-[11px]">{"//"}</span>
          <span className="font-mono text-xs text-[#e2e2eb]">Ruang Kerja &amp; Studi</span>
        </div>

        {/* Telemetry Pill: Focus Load */}
        <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-[#cbc3d7]">
          <span className="text-[#d0bcff]">⚡</span>
          <span>BEBAN FOKUS:</span>
          <span className="text-[#4edea3] font-semibold">{focusLoadPct}%</span>
          <div className="w-16 h-1.5 rounded-full bg-[#33343b] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#d0bcff] to-[#4edea3] rounded-full"
              style={{ width: `${Math.min(100, Math.max(10, focusLoadPct))}%` }}
            ></div>
          </div>
        </div>

        {/* Sync Status */}
        <div className="hidden md:flex items-center gap-1.5 font-mono text-xs text-[#958ea0]">
          <span className="text-[#4edea3]">🔄</span>
          <span className="text-[#cbc3d7]">Database:</span>
          <span className="text-[#e2e2eb]">Tersinkronisasi</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Jakarta Clock */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131825] font-mono text-xs text-[#e2e2eb] border border-white/[0.05]">
          <span className="text-[#958ea0]">🌐</span>
          <span>{timeString} <span className="text-[#494454] font-normal">WIB</span></span>
        </div>

        {/* Keyboard Shortcut Hints */}
        <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded bg-[#282a30] font-mono text-[10px] text-[#cbc3d7]">
          <kbd className="px-1 py-0.5 rounded bg-[#0b0d13] text-[#d0bcff] border border-white/[0.08]">⌘K</kbd>
          <span>Cari</span>
          <kbd className="ml-1 px-1 py-0.5 rounded bg-[#0b0d13] text-[#d0bcff] border border-white/[0.08]">Spasi</kbd>
          <span>Fokus</span>
        </div>
      </div>
    </div>
  );
}
