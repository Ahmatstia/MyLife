"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/app/components/ui/Icon";

export interface DirectionCompassCardProps {
  chapter: {
    id: string;
    title: string;
    mainIntent?: string | null;
    themeColor?: string;
    startDate: Date | string;
    focusAreas: {
      id: string;
      title: string;
      intention?: string | null;
      area?: {
        name: string;
        color: string;
      } | null;
    }[];
  } | null;
}

export function DirectionCompassCard({ chapter }: DirectionCompassCardProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("mylife_compass_collapsed") === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  function toggleCollapse() {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("mylife_compass_collapsed", String(next));
  }

  if (isDismissed) return null;

  if (!chapter) {
    return (
      <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-500/10 via-sky-500/10 to-transparent border border-purple-500/20 text-xs">
        <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-300">
            <Icon name="compass" size={13} />
          </span>
          <span>
            <strong>Kompas Hidup:</strong> Anda belum menentukan babak kehidupan aktif saat ini.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/direction"
            className="font-bold text-purple-600 dark:text-purple-400 hover:underline"
          >
            Tentukan Arah Anda →
          </Link>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title="Sembunyikan"
          >
            <Icon name="x" size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-slate-50/80 to-purple-50/30 dark:from-[#131825] dark:via-[#111522] dark:to-[#171228] border border-slate-200/80 dark:border-white/10 p-4 md:p-5 shadow-sm transition-all duration-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#38bdf8] text-white shadow-[0_0_12px_rgba(139,92,246,0.3)]">
            <Icon name="compass" size={17} />
          </span>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-[#d0bcff]">
                Fase Aktif
              </span>
              <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-white truncate">
                {chapter.title}
              </h3>
            </div>
            {!isCollapsed && chapter.mainIntent && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate max-w-xl">
                {chapter.mainIntent}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href="/direction"
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition-colors"
          >
            Buka Kompas
            <Icon name="arrowRight" size={12} />
          </Link>
          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            title={isCollapsed ? "Perluas kartu arah" : "Kecilkan kartu arah"}
          >
            <Icon name={isCollapsed ? "chevronDown" : "chevronUp"} size={15} />
          </button>
        </div>
      </div>

      {!isCollapsed && chapter.focusAreas && chapter.focusAreas.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Fokus Musim Ini:
          </span>
          {chapter.focusAreas.map((focus) => (
            <span
              key={focus.id}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-lg bg-white dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] text-slate-800 dark:text-slate-200"
            >
              {focus.area && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: focus.area.color }}
                />
              )}
              {focus.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
