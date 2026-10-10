"use client";

import React, { useEffect, useState } from "react";

export interface TrackedHabitItem {
  id: string;
  name: string;
  displayAlias?: string | null;
  category?: string | null;
  privacyLevel: number;
  checkinLocalTime: string;
  startedAt: string | Date;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  stats?: {
    currentStreakDays: number;
    longestStreakDays: number;
    confirmedCleanDays: number;
    cleanRate30d?: number | null;
    lastLapseAt?: string | Date | null;
  } | null;
  hasPendingCheckin?: boolean;
}

interface HabitCardV2Props {
  habit: TrackedHabitItem;
  onSelect: (habitId: string) => void;
}

export function HabitCardV2({ habit, onSelect }: HabitCardV2Props) {
  // Hitung live timer dari lastLapseAt atau startedAt
  const baselineTime = habit.stats?.lastLapseAt ?? habit.startedAt;
  const [elapsed, setElapsed] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
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
  }, [baselineTime]);

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
      className="group relative rounded-2xl border border-white/10 bg-[#161622] p-5 shadow-xl hover:border-indigo-500/40 hover:bg-[#1a1a28] transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      {/* Top Banner & Status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
              {displayName}
            </h3>
            {habit.privacyLevel === 2 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
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
        </div>

        {/* Pending Badge */}
        {habit.hasPendingCheckin && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold animate-pulse">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Check-in Menunggu
          </span>
        )}
      </div>

      {/* Live Clean Timer Hero */}
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

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-white/5 pt-3">
        <div className="p-2 rounded-lg bg-white/5">
          <span className="text-[10px] text-slate-400 block mb-0.5">Streak</span>
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
          <span className="text-[10px] text-slate-400 block mb-0.5">Clean Rate 30d</span>
          <span className="font-bold text-emerald-300">
            📈 {habit.stats?.cleanRate30d != null ? `${habit.stats.cleanRate30d}%` : "-"}
          </span>
        </div>
      </div>
    </div>
  );
}
