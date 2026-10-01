"use client";

import { useState, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/ui/Icon";
import { useToast } from "@/app/components/ui/Toast";
import { HabitFormModal } from "@/app/(app)/habits/HabitFormModal";
import { CheckInModal } from "@/app/(app)/habits/CheckInModal";
import type { HabitWithRelations } from "@/app/(app)/habits/HabitCard";

type Area = { id: string; name: string; color: string };

type LogItem = {
  id: string;
  date: string | Date;
  isSuccess: boolean;
  mood: number | null;
  energyLevel: number | null;
  notes: string | null;
  relapseTrigger: string | null;
  createdAt: string | Date;
};

type StreakItem = {
  id: string;
  days: number;
  startDate: string | Date;
  endDate: string | Date | null;
  isCurrent: boolean;
};

interface HabitDetailClientProps {
  stats: {
    habit: HabitWithRelations;
    currentStreak: number;
    longestStreak: number;
    totalDays: number;
    successDays: number;
    completionRate: number;
    last30Days: { total: number; success: number };
    todayLog: LogItem | null;
    logs: LogItem[];
    streaks: StreakItem[];
  };
  areas: Area[];
}

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  EASY: { label: "Mudah", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  MEDIUM: { label: "Sedang", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  HARD: { label: "Sulit", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  EXTREME: { label: "Ekstrem", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
};

const MOOD_EMOJIS: Record<number, string> = {
  1: "😔",
  2: "😕",
  3: "😐",
  4: "😊",
  5: "😄",
};

export function HabitDetailClient({ stats: initialStats, areas }: HabitDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [stats, setStats] = useState(initialStats);
  const [showEdit, setShowEdit] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [newPhaseTitle, setNewPhaseTitle] = useState("");
  const [newPhaseDays, setNewPhaseDays] = useState(30);
  const [newPhaseTip, setNewPhaseTip] = useState("");
  const [isAddingPhase, setIsAddingPhase] = useState(false);

  const { habit, currentStreak, longestStreak, totalDays, successDays, completionRate, logs } = stats;
  const isBad = habit.type === "BAD";

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  const handleUpdate = useCallback(
    async (data: Record<string, unknown>) => {
      try {
        const res = await fetch(`/api/habits/${habit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        toast("Kebiasaan berhasil diperbarui!", "success");
        setShowEdit(false);
        refresh();
      } catch (e) {
        toast((e as Error).message || "Gagal mengupdate kebiasaan.", "error");
      }
    },
    [habit.id, toast, refresh],
  );

  const handleDelete = useCallback(async () => {
    if (!confirm("Hapus kebiasaan ini? Semua data statistik dan log akan ikut terhapus.")) return;
    try {
      const res = await fetch(`/api/habits/${habit.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast("Kebiasaan berhasil dihapus.", "info");
      router.push("/habits");
    } catch (e) {
      toast((e as Error).message || "Gagal menghapus.", "error");
    }
  }, [habit.id, toast, router]);

  const handleCheckIn = useCallback(
    async (data: Record<string, unknown>) => {
      try {
        const res = await fetch(`/api/habits/${habit.id}/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        toast(json.message || "Check-in berhasil dicatat!", "success");
        setShowCheckIn(false);

        // Refetch stats
        const statsRes = await fetch(`/api/habits/${habit.id}?stats=true`);
        const statsJson = await statsRes.json();
        if (statsJson.success) {
          setStats(statsJson.data);
        }
        refresh();
      } catch (e) {
        toast((e as Error).message || "Gagal mencatat check-in.", "error");
      }
    },
    [habit.id, toast, refresh],
  );

  const handleCreatePhase = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newPhaseTitle.trim()) return;
      setIsAddingPhase(true);
      try {
        const res = await fetch(`/api/habits/${habit.id}/phases`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newPhaseTitle.trim(),
            targetDays: Number(newPhaseDays),
            psychTip: newPhaseTip.trim() || undefined,
            order: (habit.phases?.length ?? 0),
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        toast("Fase baru berhasil ditambahkan!", "success");
        setShowAddPhase(false);
        setNewPhaseTitle("");
        setNewPhaseTip("");

        // Refetch stats
        const statsRes = await fetch(`/api/habits/${habit.id}?stats=true`);
        const statsJson = await statsRes.json();
        if (statsJson.success) {
          setStats(statsJson.data);
        }
        refresh();
      } catch (err) {
        toast((err as Error).message || "Gagal menambah fase.", "error");
      } finally {
        setIsAddingPhase(false);
      }
    },
    [habit.id, habit.phases, newPhaseTitle, newPhaseDays, newPhaseTip, toast, refresh],
  );

  // Phases calculation
  const phases = [...(habit.phases ?? [])].sort((a, b) => a.order - b.order);
  const currentPhaseIdx = phases.findIndex((p) => !p.isCompleted);
  const currentPhase = currentPhaseIdx === -1 ? null : phases[currentPhaseIdx];

  // 30 days grid data
  const last30Grid = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().split("T")[0];
    const matchingLog = logs.find((l) => {
      const lDate = typeof l.date === "string" ? l.date.split("T")[0] : new Date(l.date).toISOString().split("T")[0];
      return lDate === dateStr;
    });
    return {
      date: dateStr,
      dayNum: d.getDate(),
      month: d.toLocaleString("id-ID", { month: "short" }),
      log: matchingLog,
    };
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* ─── BREADCRUMB & TOP ACTIONS ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/habits"
          className="inline-flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors group"
        >
          <span className="p-1 rounded-lg bg-white/[0.04] border border-white/[0.08] group-hover:border-white/20 transition-all">
            <Icon name="arrowLeft" size={14} />
          </span>
          Kembali ke Habit Tracker
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-[#cbd5e1] hover:bg-white/[0.08] hover:text-white transition-all"
          >
            <Icon name="edit" size={13} />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-all"
          >
            <Icon name="trash" size={13} />
            Hapus
          </button>
          <button
            onClick={() => setShowCheckIn(true)}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] text-xs font-bold text-white shadow-lg shadow-[#8B5CF6]/20 hover:opacity-95 transition-all"
          >
            <Icon name="check" size={14} />
            Check-In Hari Ini
          </button>
        </div>
      </div>

      {/* ─── HERO HEADER CARD ─── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#121622]/90 to-[#0e111a]/90 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-xl border border-white/10"
              style={{ backgroundColor: `${habit.color}25` }}
            >
              <span className="text-2xl">{habit.icon === "zap" ? "⚡" : habit.icon === "pmo" ? "🔒" : habit.icon === "flame" ? "🔥" : "🎯"}</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isBad
                      ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                      : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  }`}
                >
                  {isBad ? "🛡️ Harm Reduction (Ubah Kebiasaan Buruk)" : "✨ Kebiasaan Baik"}
                </span>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    DIFFICULTY_LABELS[habit.difficulty]?.color ?? ""
                  }`}
                >
                  {DIFFICULTY_LABELS[habit.difficulty]?.label ?? habit.difficulty}
                </span>
                {habit.area && (
                  <span
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border"
                    style={{
                      color: habit.area.color,
                      borderColor: `${habit.area.color}30`,
                      backgroundColor: `${habit.area.color}15`,
                    }}
                  >
                    {habit.area.name}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{habit.title}</h1>
              {habit.description && <p className="text-sm text-[#94a3b8] mt-1 max-w-xl">{habit.description}</p>}
            </div>
          </div>

          {/* Quick Streak Highlight */}
          <div className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 self-start md:self-auto">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-white">{currentStreak}</span>
              <div className="leading-tight">
                <span className="text-xs font-bold text-white block">Hari Bersih</span>
                <span className="text-[10px] text-[#94a3b8]">Streak Aktif</span>
              </div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-xs">
              <span className="text-[#94a3b8] block">Rekor Terlama:</span>
              <span className="font-bold text-amber-300">{longestStreak} Hari</span>
            </div>
          </div>
        </div>

        {/* Why banner if present */}
        {habit.whyQuit && (
          <div className="mt-6 rounded-2xl bg-amber-500/[0.08] border border-amber-500/20 p-4">
            <div className="flex items-start gap-3">
              <span className="text-amber-400 text-lg">💡</span>
              <div>
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">Alasan Kuat Kamu:</span>
                <p className="text-sm text-[#fde68a] mt-0.5 italic">&quot;{habit.whyQuit}&quot;</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── 4 STATS CARDS ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/[0.08] bg-[#121622]/60 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-[#94a3b8] mb-2">
            <span className="text-xs font-semibold">Streak Saat Ini</span>
            <span className="text-rose-400">🔥</span>
          </div>
          <div className="text-2xl font-black text-white">{currentStreak} <span className="text-xs text-[#94a3b8] font-normal">hari</span></div>
          <p className="text-[11px] text-[#94a3b8] mt-1">
            {currentStreak >= 90 ? "👑 Kebiasaan permanen" : currentStreak >= 30 ? "🚀 Jalur neural terbentuk" : currentStreak >= 7 ? "⚡ Fase adaptasi awal" : "🌱 Langkah pertama"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#121622]/60 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-[#94a3b8] mb-2">
            <span className="text-xs font-semibold">Rekor Terpanjang</span>
            <span className="text-amber-400">🏆</span>
          </div>
          <div className="text-2xl font-black text-amber-300">{longestStreak} <span className="text-xs text-[#94a3b8] font-normal">hari</span></div>
          <p className="text-[11px] text-[#94a3b8] mt-1">Pencapaian terbaik</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#121622]/60 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-[#94a3b8] mb-2">
            <span className="text-xs font-semibold">Tingkat Keberhasilan</span>
            <span className="text-emerald-400">📈</span>
          </div>
          <div className="text-2xl font-black text-emerald-400">{completionRate}%</div>
          <p className="text-[11px] text-[#94a3b8] mt-1">{successDays} dari {totalDays} check-in</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#121622]/60 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-[#94a3b8] mb-2">
            <span className="text-xs font-semibold">Total Check-In</span>
            <span className="text-indigo-400">📅</span>
          </div>
          <div className="text-2xl font-black text-white">{totalDays} <span className="text-xs text-[#94a3b8] font-normal">kali</span></div>
          <p className="text-[11px] text-[#94a3b8] mt-1">Konsistensi evaluasi</p>
        </div>
      </div>

      {/* ─── HARM REDUCTION ROADMAP (PHASES) ─── */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#121622]/60 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🗺️</span>
              <span>Roadmap Tahapan Harm Reduction</span>
            </h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Pendekatan bertahap memperpanjang rentang clean days demi pemulihan neurokimia otak.
            </p>
          </div>
          <button
            onClick={() => setShowAddPhase(!showAddPhase)}
            className="text-xs font-semibold text-[#a78bfa] hover:text-white px-3 py-1.5 rounded-xl border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 transition-all flex items-center gap-1.5"
          >
            <Icon name="plus" size={13} />
            Tambah Fase
          </button>
        </div>

        {/* Add Phase Inline Form */}
        {showAddPhase && (
          <form onSubmit={handleCreatePhase} className="mb-6 p-4 rounded-2xl border border-[#8B5CF6]/30 bg-[#161a2b] space-y-3">
            <div className="text-xs font-bold text-white">Tambah Fase Lanjutan Baru:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[#94a3b8] block mb-1">Judul Fase</label>
                <input
                  type="text"
                  placeholder="Misal: Bulan 3 — Pemantapan Gaya Hidup"
                  value={newPhaseTitle}
                  onChange={(e) => setNewPhaseTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#8B5CF6]"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-[#94a3b8] block mb-1">Target Bertahan (Hari)</label>
                <input
                  type="number"
                  min="1"
                  value={newPhaseDays}
                  onChange={(e) => setNewPhaseDays(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#8B5CF6]"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-[#94a3b8] block mb-1">Tips Psikologi / Catatan Motivasi</label>
              <input
                type="text"
                placeholder="Tips sains atau kata penyemangat saat fase ini dijalani..."
                value={newPhaseTip}
                onChange={(e) => setNewPhaseTip(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddPhase(false)}
                className="text-xs px-3 py-1.5 text-[#94a3b8] hover:text-white"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isAddingPhase}
                className="text-xs px-4 py-1.5 rounded-xl bg-[#8B5CF6] text-white font-bold hover:bg-[#7c3aed] transition-all disabled:opacity-50"
              >
                {isAddingPhase ? "Menyimpan..." : "Simpan Fase"}
              </button>
            </div>
          </form>
        )}

        {/* Phase List */}
        <div className="space-y-4">
          {phases.length === 0 ? (
            <p className="text-xs text-[#94a3b8] italic text-center py-6">Belum ada tahapan fase yang dikonfigurasi.</p>
          ) : (
            phases.map((phase, idx) => {
              const isCompleted = phase.isCompleted;
              const isCurrent = currentPhase?.id === phase.id;
              const progressPct = isCompleted ? 100 : isCurrent ? Math.min(100, Math.round((currentStreak / phase.targetDays) * 100)) : 0;

              return (
                <div
                  key={phase.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCompleted
                      ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                      : isCurrent
                      ? "border-[#8B5CF6]/50 bg-[#8B5CF6]/[0.06] shadow-lg shadow-[#8B5CF6]/5"
                      : "border-white/[0.05] bg-white/[0.01] opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                          isCompleted
                            ? "bg-emerald-500/20 text-emerald-400"
                            : isCurrent
                            ? "bg-[#8B5CF6]/20 text-[#a78bfa]"
                            : "bg-white/5 text-[#64748b]"
                        }`}
                      >
                        {isCompleted ? "✓" : idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">{phase.title}</h3>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8B5CF6] text-white">
                              Fase Aktif
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                              Tuntas
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#94a3b8] mt-0.5">
                          Target: <strong className="text-white">{phase.targetDays} Hari</strong>
                          {isCurrent && ` • Berjalan ${currentStreak} hari (${phase.targetDays - currentStreak > 0 ? `${phase.targetDays - currentStreak} hari lagi` : "Target tercapai!"})`}
                        </p>
                        {phase.psychTip && (
                          <p className="text-xs text-[#c4b5fd] mt-2 italic bg-[#8B5CF6]/10 p-2.5 rounded-xl border border-[#8B5CF6]/20">
                            🧠 <strong>Wawasan Sains:</strong> {phase.psychTip}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs shrink-0">
                      <span className="font-bold text-white">{progressPct}%</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? "bg-emerald-500"
                          : isCurrent
                          ? "bg-gradient-to-r from-[#8B5CF6] to-[#a78bfa]"
                          : "bg-transparent"
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── BEHAVIORAL PSYCHOLOGY (THE HABIT LOOP) ─── */}
      {(habit.cue || habit.replacementHabit || habit.reward) && (
        <div className="rounded-3xl border border-white/[0.08] bg-[#121622]/60 p-6 backdrop-blur-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <span>🧬</span>
            <span>Strategi Behavioral Habit Loop (Pemicu & Rutinitas)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {habit.cue && (
              <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/[0.04]">
                <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5 mb-1">
                  <span>🎯</span> Pemicu Utama (Cue/Trigger)
                </div>
                <p className="text-xs text-[#cbd5e1] leading-relaxed">{habit.cue}</p>
              </div>
            )}
            {habit.replacementHabit && (
              <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04]">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                  <span>🔄</span> Rutinitas Pengganti (Replacement)
                </div>
                <p className="text-xs text-[#cbd5e1] leading-relaxed">{habit.replacementHabit}</p>
              </div>
            )}
            {habit.reward && (
              <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04]">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                  <span>🎁</span> Hadiah / Self-Reward
                </div>
                <p className="text-xs text-[#cbd5e1] leading-relaxed">{habit.reward}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 30-DAY VISUAL LOG & RECENT HISTORY ─── */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#121622]/60 p-6 backdrop-blur-xl space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📊</span>
            <span>Kalender Evaluasi 30 Hari Terakhir</span>
          </h2>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Setiap titik merepresentasikan hari check-in. Hijau = Bersih/Tercapai, Merah = Relapse (data pembelajaran).
          </p>
        </div>

        {/* 30-Day Grid */}
        <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-2">
          {last30Grid.map((item, idx) => {
            const hasLog = !!item.log;
            const isSuccess = item.log?.isSuccess;
            return (
              <div
                key={idx}
                title={`${item.date}: ${hasLog ? (isSuccess ? "Berhasil/Clean" : "Relapse") : "Belum check-in"}`}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                  !hasLog
                    ? "border-white/[0.05] bg-white/[0.02] text-[#64748b]"
                    : isSuccess
                    ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400 font-bold"
                    : "border-rose-500/30 bg-rose-500/15 text-rose-400 font-bold"
                }`}
              >
                <span className="text-[10px] text-[#94a3b8]">{item.month}</span>
                <span className="text-xs">{item.dayNum}</span>
                <span className="text-[10px] mt-0.5">
                  {!hasLog ? "—" : isSuccess ? "✓" : "✗"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Recent Logs List */}
        <div className="pt-4 border-t border-white/[0.06]">
          <h3 className="text-sm font-bold text-white mb-3">Catatan & Refleksi Terakhir</h3>
          {logs.length === 0 ? (
            <p className="text-xs text-[#94a3b8] italic">Belum ada catatan check-in. Tekan &quot;Check-In Hari Ini&quot; untuk mencatat progres pertamamu!</p>
          ) : (
            <div className="space-y-3">
              {logs.slice(0, 10).map((log) => {
                const dateFormatted = new Date(log.date).toLocaleDateString("id-ID", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                });
                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.isSuccess
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {log.isSuccess ? "✓ Clean" : "✗ Relapse"}
                      </span>
                      <span className="font-semibold text-white">{dateFormatted}</span>
                      {log.mood && <span title="Mood">{MOOD_EMOJIS[log.mood] ?? "😐"}</span>}
                      {log.energyLevel && (
                        <span className="text-[#94a3b8]">Energi: {log.energyLevel}/5</span>
                      )}
                    </div>
                    {(log.notes || log.relapseTrigger) && (
                      <div className="text-[#cbd5e1] text-xs">
                        {log.relapseTrigger && (
                          <span className="text-rose-300 font-semibold mr-2">
                            Pemicu: {log.relapseTrigger}
                          </span>
                        )}
                        {log.notes && <span>&quot;{log.notes}&quot;</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── EDIT MODAL ─── */}
      {showEdit && (
        <HabitFormModal
          type={isBad ? "bad" : "good"}
          areas={areas}
          habit={habit}
          onClose={() => setShowEdit(false)}
          onSubmit={handleUpdate}
        />
      )}

      {/* ─── CHECK-IN MODAL ─── */}
      {showCheckIn && (
        <CheckInModal
          habit={habit}
          onClose={() => setShowCheckIn(false)}
          onSubmit={handleCheckIn}
        />
      )}
    </div>
  );
}
