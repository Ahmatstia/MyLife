"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface NextActionProps {
  action: {
    id: string;
    title: string;
    description: string;
    priority: string;
    estimatedMinutes: number;
    dueDateLabel: string;
  } | null;
}

export function NextActionSpotlightCard({ action }: NextActionProps) {
  const router = useRouter();

  // Keyboard shortcut 'S' to start session
  useEffect(() => {
    if (!action) return;
    function handleKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        router.push(action ? `/focus?taskId=${action.id}` : "/focus");
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [action, router]);

  if (!action) {
    return (
      <div className="rounded-xl bg-[#131825] p-4 sm:p-5 border border-white/[0.07] shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#4edea3]/10 text-[#4edea3] flex items-center justify-center shrink-0 border border-[#4edea3]/20 text-lg">
            ✓
          </div>
          <div>
            <h3 className="font-['Hanken_Grotesk',sans-serif] text-base text-[#e2e2eb] font-bold">
              Semua Tugas Utama Telah Selesai!
            </h3>
            <p className="font-mono text-xs text-[#958ea0] mt-0.5">
              Bagus! Tidak ada tugas mendesak yang tertunda saat ini. Anda dapat membuat tugas baru atau meninjau target proyek.
            </p>
          </div>
        </div>
        <Link
          href="/tasks"
          className="px-3.5 py-2 rounded-lg bg-[#282a30] hover:bg-[#1A2133] text-[#cbc3d7] font-mono text-xs border border-white/[0.06] transition-colors shrink-0"
        >
          + Tambah Tugas
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#131825] p-4 sm:p-5 border border-white/[0.07] shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        {/* Priority Icon Box */}
        <div className="w-10 h-10 rounded-lg bg-[#93000a]/30 text-[#F43F5E] flex items-center justify-center shrink-0 border border-[#F43F5E]/20 text-lg">
          🚩
        </div>

        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-[#F43F5E]/15 text-[#F43F5E] font-mono text-[10px] font-bold uppercase tracking-wider">
              {action.priority}
            </span>
            <span className="font-mono text-xs text-[#958ea0]">
              ⏱ {action.estimatedMinutes} Menit
            </span>
            <span className="font-mono text-xs text-[#F59E0B]">
              {action.dueDateLabel}
            </span>
          </div>

          <h3 className="font-['Hanken_Grotesk',sans-serif] text-base sm:text-lg text-[#e2e2eb] font-bold mt-1">
            {action.title}
          </h3>

          <p className="font-mono text-xs text-[#cbc3d7] mt-0.5 leading-relaxed">
            {action.description}
          </p>
        </div>
      </div>

      <Link
        href={`/focus?taskId=${action.id}`}
        className="self-stretch sm:self-auto px-4 py-2.5 rounded-lg bg-[#33343b] hover:bg-[#1A2133] hover:border-[#d0bcff]/30 text-[#d0bcff] font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all shrink-0 border border-white/[0.06]"
      >
        <span>🚀 Mulai Fokus</span>
        <kbd className="px-1.5 py-0.5 rounded bg-[#0b0d13] text-[#958ea0] font-mono text-[10px]">
          S
        </kbd>
      </Link>
    </div>
  );
}
