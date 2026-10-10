"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/app/components/ui/Icon";

export type HabitPhase = {
  id: string;
  habitId: string;
  order: number;
  title: string;
  description: string | null;
  targetDays: number;
  afterRelapseDays: number | null;
  isCompleted: boolean;
  completedAt: string | Date | null;
  startedAt: string | Date | null;
  psychTip: string | null;
};

export type HabitStreak = {
  id: string;
  userId: string;
  habitId: string;
  startDate: string | Date;
  endDate: string | Date | null;
  days: number;
  isCurrent: boolean;
};

export type HabitLog = {
  id: string;
  habitId: string;
  date: string | Date;
  isSuccess: boolean;
  mood: number | null;
  energyLevel: number | null;
  notes: string | null;
  relapseTrigger: string | null;
  createdAt: string | Date;
};

export type HabitWithRelations = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  type: "GOOD" | "BAD";
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXTREME";
  color: string;
  icon: string;
  areaId: string | null;
  isActive: boolean;
  triggerNotes: string | null;
  replacementHabit: string | null;
  whyQuit: string | null;
  cue: string | null;
  reward: string | null;
  startDate: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  checkInTime: string;
  targetDays: number | null;
  area: { id: string; name: string; color: string } | null;
  phases: HabitPhase[];
  tasks: Array<{
    id: string;
    habitId?: string;
    title: string;
    description: string | null;
    isCompleted: boolean;
    category: string;
    order: number;
  }>;
  streaks: HabitStreak[];
  logs: HabitLog[];
};

interface HabitCardProps {
  habit: HabitWithRelations;
  onCheckIn: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isPending?: boolean;
}

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  EASY: { label: "Mudah", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  MEDIUM: { label: "Sedang", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  HARD: { label: "Sulit", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  EXTREME: { label: "Ekstrem", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
};

export function HabitCard({ habit, onCheckIn, onEdit, onDelete, isPending }: HabitCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const isBad = habit.type === "BAD";
  const currentStreak = habit.streaks.find((s) => s.isCurrent)?.days ?? 0;

  // Find current phase
  const phases = habit.phases.sort((a, b) => a.order - b.order);
  const currentPhaseIdx = phases.findIndex((p) => !p.isCompleted);
  const currentPhase = currentPhaseIdx === -1 ? null : phases[currentPhaseIdx];
  const completedPhases = phases.filter((p) => p.isCompleted).length;
  const totalPhases = phases.length;

  // Check if checked in today
  const today = new Date().toISOString().split("T")[0];
  const todayLog = habit.logs?.find((l) => {
    const logDate = typeof l.date === "string" ? l.date.split("T")[0] : l.date.toISOString().split("T")[0];
    return logDate === today;
  });
  const checkedInToday = !!todayLog;

  // Progress within current phase
  const phaseProgress = currentPhase
    ? Math.min(100, Math.round((currentStreak / currentPhase.targetDays) * 100))
    : 100;

  // Days since start
  const startDate = new Date(habit.startDate);
  const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Streak fire levels
  const getFireLevel = (days: number) => {
    if (days >= 90) return 3;
    if (days >= 30) return 2;
    if (days >= 7) return 1;
    return 0;
  };
  const fireLevel = getFireLevel(currentStreak);

  const accentColor = isBad
    ? { primary: "#f43f5e", bg: "rgba(244,63,94,0.1)", border: "rgba(244,63,94,0.2)", glow: "rgba(244,63,94,0.3)" }
    : { primary: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)", glow: "rgba(16,185,129,0.3)" };

  const diff = DIFFICULTY_LABELS[habit.difficulty] ?? DIFFICULTY_LABELS.MEDIUM;

  return (
    <div
      className={`relative group rounded-2xl border transition-all duration-300 overflow-hidden ${
        checkedInToday
          ? "border-[#8B5CF6]/40 bg-gradient-to-br from-[#131825] to-[#1a1040]"
          : "border-white/[0.08] bg-[#131825] hover:border-white/[0.15]"
      }`}
      style={checkedInToday ? { boxShadow: `0 0 30px ${accentColor.glow}` } : undefined}
    >
      {/* Top glow strip */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor.primary}, transparent)` }}
      />

      <div className="p-5">
        {/* ─── HEADER ─── */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
              style={{ background: accentColor.bg, border: `1px solid ${accentColor.border}` }}
            >
              {getHabitEmoji(habit.icon, isBad)}
            </div>

            <div className="min-w-0">
              <Link href={`/habits/${habit.id}`} className="block group/link">
                <h3 className="font-bold text-white text-base leading-tight truncate group-hover/link:text-[#a78bfa] transition-colors">{habit.title}</h3>
              </Link>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${diff.color}`}>
                  {diff.label}
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[#cbd5e1] flex items-center gap-1">
                  ⏰ {habit.checkInTime || "06:00"}
                </span>
                {habit.area && (
                  <span className="text-[10px] text-[#94a3b8] flex items-center gap-1">
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: habit.area.color }}
                    />
                    {habit.area.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748b] hover:text-white hover:bg-white/10 transition-all"
            >
              <Icon name="more" size={15} />
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-8 z-20 min-w-[140px] rounded-xl border border-white/[0.08] bg-[#0c0e14] shadow-xl py-1"
                onMouseLeave={() => setShowMenu(false)}
              >
                <button
                  onClick={() => { setShowMenu(false); onEdit(); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[#94a3b8] hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  <Icon name="edit" size={13} /> Edit
                </button>
                <Link
                  href={`/habits/${habit.id}`}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[#94a3b8] hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  <Icon name="chart" size={13} /> Statistik
                </Link>
                <button
                  onClick={() => { setShowMenu(false); onDelete(); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all"
                >
                  <Icon name="trash" size={13} /> Hapus
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── STREAK COUNTER ─── */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span
              className={`text-3xl font-black ${
                currentStreak >= 90 ? "text-amber-300" : currentStreak >= 30 ? "text-orange-300" : currentStreak >= 7 ? "text-rose-300" : "text-white"
              }`}
            >
              {currentStreak}
            </span>
            <div>
              <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide">Hari Streak</p>
              {fireLevel > 0 && (
                <p className="text-xs text-amber-400 font-semibold flex items-center gap-0.5">
                  {"🔥".repeat(fireLevel)}
                  {fireLevel === 3 ? " Legenda!" : fireLevel === 2 ? " Panas!" : " Bagus!"}
                </p>
              )}
            </div>
          </div>

          <div className="flex-1 h-px bg-white/[0.06]" />

          <div className="text-right">
            <p className="text-xs font-semibold text-[#94a3b8]">{daysSinceStart} hari</p>
            <p className="text-[10px] text-[#64748b]">sejak mulai</p>
          </div>
        </div>

        {/* ─── PHASE PROGRESS (BAD HABITS) ─── */}
        {isBad && phases.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-[#94a3b8]">
                {currentPhase
                  ? `Fase ${currentPhaseIdx + 1}: ${currentPhase.title}`
                  : "🏆 Semua Fase Selesai!"}
              </span>
              <span className="text-[11px] text-[#64748b]">
                {completedPhases}/{totalPhases} fase
              </span>
            </div>

            {/* Phase progress bar */}
            {currentPhase && (
              <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${phaseProgress}%`,
                    background: `linear-gradient(90deg, ${accentColor.primary}, #8B5CF6)`,
                    boxShadow: `0 0 8px ${accentColor.glow}`,
                  }}
                />
              </div>
            )}

            {currentPhase && (
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-[#64748b]">{currentStreak}/{currentPhase.targetDays} hari</span>
                <span className="text-[10px] text-[#64748b]">{phaseProgress}%</span>
              </div>
            )}

            {/* Phase dots */}
            <div className="flex items-center gap-1 mt-2">
              {phases.map((phase, idx) => (
                <div
                  key={phase.id}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    phase.isCompleted
                      ? "bg-emerald-500"
                      : idx === currentPhaseIdx
                        ? "bg-purple-500"
                        : "bg-white/[0.08]"
                  }`}
                  title={phase.title}
                />
              ))}
            </div>

            {/* Psych tip */}
            {currentPhase?.psychTip && (
              <p className="mt-2 text-[11px] text-amber-300/80 italic leading-relaxed">
                💡 {currentPhase.psychTip}
              </p>
            )}
          </div>
        )}

        {/* ─── GOOD HABIT CUE/REWARD ─── */}
        {!isBad && (habit.cue || habit.reward) && (
          <div className="mb-4 space-y-1.5">
            {habit.cue && (
              <div className="flex items-center gap-2 text-[11px] text-[#94a3b8]">
                <span className="text-emerald-400">⚡</span>
                <span><strong className="text-emerald-300">Pemicu:</strong> {habit.cue}</span>
              </div>
            )}
            {habit.reward && (
              <div className="flex items-center gap-2 text-[11px] text-[#94a3b8]">
                <span className="text-amber-400">🎁</span>
                <span><strong className="text-amber-300">Reward:</strong> {habit.reward}</span>
              </div>
            )}
          </div>
        )}

        {/* ─── MINI HEATMAP (last 21 days) ─── */}
        <MiniHeatmap logs={habit.logs ?? []} isBad={isBad} />

        {/* ─── CHECK-IN BUTTON ─── */}
        <button
          onClick={onCheckIn}
          disabled={isPending}
          className={`mt-4 w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
            checkedInToday
              ? todayLog?.isSuccess
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 cursor-default"
                : "bg-rose-500/15 text-rose-300 border border-rose-500/30 cursor-default"
              : isBad
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_30px_rgba(244,63,94,0.5)] active:scale-[0.98]"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-[0.98]"
          }`}
        >
          {checkedInToday ? (
            todayLog?.isSuccess ? (
              <>
                <Icon name="check" size={16} />
                {isBad ? "✅ Berhasil Menahan Hari Ini!" : "✅ Sudah Dilakukan Hari Ini!"}
              </>
            ) : (
              <>
                <span>💙</span>
                Relapse Tercatat — Bangkit Lagi Besok
              </>
            )
          ) : (
            <>
              <span className="text-base">{isBad ? "💪" : "⚡"}</span>
              {isBad ? "Check-in: Hari Ini TIDAK Melakukannya" : "Check-in: Hari Ini Dilakukan!"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function MiniHeatmap({ logs, isBad }: { logs: HabitLog[]; isBad: boolean }) {
  const cells = Array.from({ length: 21 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (20 - i));
    const dateStr = d.toISOString().split("T")[0];
    const log = logs.find((l) => {
      const ld = typeof l.date === "string" ? l.date.split("T")[0] : l.date.toISOString().split("T")[0];
      return ld === dateStr;
    });
    return { dateStr, log };
  });

  return (
    <div>
      <p className="text-[10px] text-[#64748b] mb-1.5 font-semibold uppercase tracking-wide">21 Hari Terakhir</p>
      <div className="flex gap-1">
        {cells.map(({ dateStr, log }) => {
          let color = "bg-white/[0.05]";
          if (log) {
            if (log.isSuccess) {
              color = isBad ? "bg-emerald-500" : "bg-emerald-500";
            } else {
              color = "bg-rose-500/60";
            }
          }
          const isToday = dateStr === new Date().toISOString().split("T")[0];
          return (
            <div
              key={dateStr}
              title={`${dateStr}${log ? (log.isSuccess ? " ✅" : " ❌") : " —"}`}
              className={`h-4 flex-1 rounded-sm transition-all ${color} ${isToday ? "ring-1 ring-white/30" : ""}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function getHabitEmoji(icon: string, isBad: boolean): string {
  const map: Record<string, string> = {
    zap: isBad ? "⚡" : "⚡",
    flame: "🔥",
    brain: "🧠",
    heart: "❤️",
    run: "🏃",
    book: "📚",
    water: "💧",
    sleep: "😴",
    phone: "📱",
    food: "🍔",
    smoke: "🚭",
    pmo: "🔒",
    coffee: "☕",
    gym: "💪",
    meditate: "🧘",
    journal: "📝",
    music: "🎵",
    code: "💻",
  };
  return map[icon] ?? (isBad ? "🚫" : "✨");
}
