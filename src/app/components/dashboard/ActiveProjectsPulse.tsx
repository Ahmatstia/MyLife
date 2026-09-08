"use client";

import Link from "next/link";

interface ProjectItem {
  id: string;
  title: string;
  techStack: string;
  healthStatus: "On Track" | "Needs Review" | "Ahead of Plan";
  healthColor: "tertiary" | "luminous-amber" | "primary";
  targetDateLabel: string;
  activeMilestone: string;
  progressPct: number;
}

interface ProjectsPulseProps {
  projects: ProjectItem[];
}

export function ActiveProjectsPulse({ projects }: ProjectsPulseProps) {
  function getBadgeClasses(color: ProjectItem["healthColor"]) {
    switch (color) {
      case "luminous-amber":
        return "bg-[#F59E0B]/15 text-[#F59E0B]";
      case "primary":
        return "bg-[#d0bcff]/20 text-[#d0bcff]";
      case "tertiary":
      default:
        return "bg-[#4edea3]/15 text-[#4edea3]";
    }
  }

  function getBarBg(color: ProjectItem["healthColor"]) {
    switch (color) {
      case "luminous-amber":
        return "bg-[#F59E0B]";
      case "primary":
        return "bg-[#d0bcff]";
      case "tertiary":
      default:
        return "bg-[#4edea3]";
    }
  }

  function getStatusLabel(status: string) {
    if (status === "Ahead of Plan" || status === "Mendahului Target") return "Mendahului Target";
    if (status === "Needs Review" || status === "Perlu Evaluasi") return "Perlu Evaluasi";
    if (status === "On Track" || status === "Sesuai Jadwal") return "Sesuai Jadwal";
    return status;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Section Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#d0bcff] text-lg">📁</span>
          <h3 className="font-['Hanken_Grotesk',sans-serif] text-base sm:text-lg text-[#e2e2eb] font-bold tracking-tight">
            Proyek &amp; Pilar Utama yang Aktif
          </h3>
        </div>
        <span className="font-mono text-xs text-[#958ea0]">Rencana Eksekusi</span>
      </div>

      {/* 3-Column Projects Grid or Empty State */}
      {projects.length === 0 ? (
        <div className="rounded-xl bg-[#131825] p-8 border border-dashed border-white/[0.07] text-center flex flex-col items-center justify-center gap-2">
          <span className="text-2xl opacity-60">📁</span>
          <h4 className="font-['Hanken_Grotesk',sans-serif] text-base text-[#e2e2eb] font-bold">
            Belum ada proyek atau pilar aktif
          </h4>
          <p className="font-mono text-xs text-[#958ea0] max-w-md">
            Mulai rancang proyek strategis atau target jangka panjang untuk memantau progres milestone dan kesehatan eksekusi Anda.
          </p>
          <Link
            href="/projects"
            className="mt-2 px-4 py-2 rounded-lg bg-[#282a30] hover:bg-[#d0bcff] hover:text-[#3c0091] text-[#cbc3d7] font-mono text-xs font-semibold transition-colors border border-white/[0.06]"
          >
            + Buat Proyek Pertama
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="rounded-xl bg-[#131825] p-4 flex flex-col justify-between shadow-md hover:bg-[#1A2133] transition-all group border border-white/[0.07]"
            >
              <div>
                {/* Header Status */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold flex items-center gap-1.5 ${getBadgeClasses(
                      p.healthColor
                    )}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${getBarBg(p.healthColor)}`}></span>
                    {getStatusLabel(p.healthStatus)}
                  </span>
                  <span className="font-mono text-[11px] text-[#958ea0]">
                    {p.targetDateLabel}
                  </span>
                </div>

                {/* Title & Description */}
                <h4 className="font-['Hanken_Grotesk',sans-serif] text-sm sm:text-base text-[#e2e2eb] font-bold group-hover:text-[#d0bcff] transition-colors">
                  {p.title}
                </h4>
                <p className="font-mono text-xs text-[#cbc3d7] mt-1 leading-relaxed line-clamp-2">
                  {p.techStack}
                </p>

                {/* Active Milestone */}
                <div className="mt-3 p-2 rounded bg-[#0c0e14] font-mono text-xs text-[#e2e2eb] border border-white/[0.03]">
                  <span className="text-[#958ea0] block text-[10px] uppercase font-semibold">
                    Milestone / Tahap Saat Ini:
                  </span>
                  <span className="truncate block mt-0.5">{p.activeMilestone}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-1 font-mono text-xs">
                  <span className="text-[#958ea0]">Progres</span>
                  <span className="font-bold text-[#e2e2eb]">{p.progressPct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#0c0e14] overflow-hidden border border-white/[0.04]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getBarBg(
                      p.healthColor
                    )}`}
                    style={{ width: `${p.progressPct}%` }}
                  ></div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
