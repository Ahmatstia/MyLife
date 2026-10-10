"use client";

import React, { useEffect, useState } from "react";

export interface TrackedHabitItem {
  id: string;
  name: string;
  kind?: "BREAK" | "BUILD";
  displayAlias?: string | null;
  category?: string | null;
  privacyLevel: number;
  checkinLocalTime: string;
  startedAt: string | Date;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  buildProfile?: {
    tinyBehavior?: string;
    scheduleType?: "DAILY" | "DAYS_OF_WEEK" | "TIMES_PER_WEEK";
  } | null;
  stats?: {
    currentStreakDays: number;
    longestStreakDays: number;
    confirmedCleanDays: number;
    cleanRate30d?: number | null;
    consistency30d?: number | null;
    resilientStreak?: number;
    lastLapseAt?: string | Date | null;
  } | null;
  hasPendingCheckin?: boolean;
}

interface HabitCardV2Props {
  habit: TrackedHabitItem;
  onSelect: (habitId: string) => void;
  onEdit?: (habit: TrackedHabitItem) => void;
  onDelete?: (habit: TrackedHabitItem) => void;
}

export function HabitCardV2({ habit, onSelect, onEdit, onDelete }: HabitCardV2Props) {
  const isBuild = habit.kind === "BUILD";

  // Hitung live timer dari lastLapseAt atau startedAt (hanya untuk BREAK)
  const baselineTime = habit.stats?.lastLapseAt ?? habit.startedAt;
  const [elapsed, setElapsed] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (isBuild) return;

    const calc = () => {
      const base = new Date(baselineTime).getTime();
      const diff = Math.max(0, Date.now() - base);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setElapsed({ days, hours, minutes, seconds });
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [baselineTime, isBuild]);

  const displayName =
    habit.privacyLevel === 2 && habit.displayAlias
      ? habit.displayAlias
      : habit.name;

  return (
    <div
      onClick={() => onSelect(habit.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(habit.id);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Buka dashboard kebiasaan ${displayName}`}
      className={`group relative rounded-2xl border p-5 shadow-xl transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 ${
        isBuild
          ? "border-emerald-500/20 bg-[#141b18] hover:border-emerald-500/50 hover:bg-[#18231e] focus:ring-emerald-400"
          : "border-white/10 bg-[#161622] hover:border-indigo-500/40 hover:bg-[#1a1a28] focus:ring-indigo-400"
      }`}
    >
      {/* Top Banner & Status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isBuild
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
              }`}
            >
              {isBuild ? "🌱 BANGUN" : "🛡️ HENTIKAN"}
            </span>

            <h3 className={`text-base font-bold text-white transition-colors ${
              isBuild ? "group-hover:text-emerald-300" : "group-hover:text-indigo-300"
            }`}>
              {displayName}
            </h3>

            {habit.privacyLevel === 2 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30">
                Mode Samaran
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-semibold text-slate-300">
              {habit.category || "UMUM"}
            </span>
            <span>⏰ Check-in {habit.checkinLocalTime}</span>
          </div>

          {isBuild && habit.buildProfile?.tinyBehavior && (
            <div className="mt-2 text-xs text-emerald-300/90 font-medium">
              ⚡ Tiny: &ldquo;{habit.buildProfile.tinyBehavior}&rdquo;
            </div>
          )}
        </div>

        {/* Action Buttons & Pending Badge */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(habit);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Ubah Kebiasaan"
                aria-label={`Ubah kebiasaan ${displayName}`}
              >
                <span className="material-symbols-outlined text-base">edit</span>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(habit);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Kelola / Hapus Kebiasaan"
                aria-label={`Hapus kebiasaan ${displayName}`}
              >
                <span className="material-symbols-outlined text-base">delete</span>
              </button>
            )}
          </div>

          {habit.hasPendingCheckin && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold animate-pulse">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Check-in Menunggu
            </span>
          )}
        </div>
      </div>

      {/* Hero Section */}
      {isBuild ? (
        <div className="mb-4 rounded-xl bg-black/40 border border-emerald-500/10 p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-semibold text-emerald-400/80 tracking-wider block mb-0.5">
              Resilient Streak
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {habit.stats?.resilientStreak ?? habit.stats?.currentStreakDays ?? 0}
              </span>
              <span className="text-xs font-medium text-emerald-200">hari aktif</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Tahan banting • Absorb 1 jeda
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-0.5">
              Konsistensi 30h
            </span>
            <span className="text-xl font-black text-teal-300 font-mono">
              {habit.stats?.consistency30d != null
                ? `${Math.round(habit.stats.consistency30d)}%`
                : habit.stats?.cleanRate30d != null
                ? `${Math.round(habit.stats.cleanRate30d)}%`
                : "-"}
            </span>
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-xl bg-black/30 border border-white/5 p-3.5">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">
            Bersih Sejak
          </span>
          <div className="flex items-baseline gap-2 text-white font-mono">
            <span className="text-2xl font-black text-emerald-400">
              {elapsed.days}
              <span className="text-xs font-sans font-normal text-slate-400 ml-0.5">h</span>
            </span>
            <span className="text-lg font-bold text-slate-200">
              {elapsed.hours}
              <span className="text-xs font-sans font-normal text-slate-400 ml-0.5">j</span>
            </span>
            <span className="text-base font-semibold text-slate-300">
              {elapsed.minutes}
              <span className="text-xs font-sans font-normal text-slate-400 ml-0.5">m</span>
            </span>
            <span className="text-sm text-slate-400">
              {elapsed.seconds}
              <span className="text-xs font-sans font-normal text-slate-500 ml-0.5">d</span>
            </span>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-white/5 pt-3">
        <div className="p-2 rounded-lg bg-white/5">
          <span className="text-[10px] text-slate-400 block mb-0.5">
            {isBuild ? "Streak Ketat" : "Streak"}
          </span>
          <span className="font-bold text-amber-300">
            🔥 {habit.stats?.currentStreakDays ?? 0} hari
          </span>
        </div>

        <div className="p-2 rounded-lg bg-white/5">
          <span className="text-[10px] text-slate-400 block mb-0.5">Terbaik</span>
          <span className="font-bold text-indigo-300">
            🏆 {habit.stats?.longestStreakDays ?? 0} hari
          </span>
        </div>

        <div className="p-2 rounded-lg bg-white/5">
          <span className="text-[10px] text-slate-400 block mb-0.5">
            {isBuild ? "Total Selesai" : "Clean Rate"}
          </span>
          <span className="font-bold text-emerald-300">
            {isBuild
              ? `🎯 ${habit.stats?.confirmedCleanDays ?? 0} hari`
              : `📈 ${habit.stats?.cleanRate30d != null ? `${habit.stats.cleanRate30d}%` : "-"}`}
          </span>
        </div>
      </div>
    </div>
  );
}
