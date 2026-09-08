"use client";

interface DiagnosticItem {
  id: string;
  type: "warning" | "momentum" | "schedule";
  emoji: string;
  title: string;
  description: string;
}

interface AIDiagnosticsProps {
  items: DiagnosticItem[];
}

export function AIDiagnosticsCard({ items }: AIDiagnosticsProps) {
  return (
    <div className="rounded-xl bg-[#131825] p-4 sm:p-5 border border-white/[0.07] shadow-md flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#d0bcff] text-base">🧠</span>
          <h4 className="font-['Hanken_Grotesk',sans-serif] text-base font-bold text-[#e2e2eb]">
            Analisis Pintar &amp; Rekomendasi AI
          </h4>
        </div>
        <span className="font-mono text-[11px] text-[#d0bcff] animate-pulse">
          Wawasan Terkini
        </span>
      </div>

      {/* Diagnostic Items */}
      <div className="flex flex-col gap-2">
        {items.map((diag) => (
          <div
            key={diag.id}
            className="p-2.5 rounded-lg bg-[#0c0e14] flex items-start gap-2.5 border border-white/[0.04]"
          >
            <span className="text-base shrink-0 mt-0.5">{diag.emoji}</span>
            <div className="flex flex-col">
              <span className="font-mono text-xs text-[#e2e2eb] font-bold">
                {diag.title}
              </span>
              <p className="font-mono text-[11px] text-[#cbc3d7] mt-0.5 leading-relaxed">
                {diag.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
