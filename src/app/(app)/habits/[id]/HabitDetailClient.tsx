"use client";

import { useState, useCallback, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/ui/Icon";
import { useToast } from "@/app/components/ui/Toast";
import { HabitFormModal } from "@/app/(app)/habits/HabitFormModal";
import { CheckInModal } from "@/app/(app)/habits/CheckInModal";
import type { HabitWithRelations } from "@/app/(app)/habits/HabitCard";

type Area = { id: string; name: string; color: string };

type HabitTaskItem = {
  id: string;
  habitId?: string;
  title: string;
  description: string | null;
  isCompleted: boolean;
  category: string; // ACTION, BARRIER, REPLACEMENT, PROTOCOL
  order: number;
};

type HabitPhaseItem = {
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
    habit: HabitWithRelations & {
      checkInTime?: string;
      targetDays?: number | null;
      tasks?: HabitTaskItem[];
    };
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

const TASK_CATEGORIES: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  BARRIER: { label: "Penghalang / Barrier", icon: "🛡️", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  REPLACEMENT: { label: "Kebiasaan Pengganti", icon: "🔄", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  PROTOCOL: { label: "Protokol Darurat", icon: "🚨", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
  ACTION: { label: "Tindakan Aksi", icon: "⚡", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
};

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
  const [activeTab, setActiveTab] = useState<"tasks" | "phases" | "analytics">("tasks");

  // Modals
  const [showEdit, setShowEdit] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);

  // Time edit state
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [customTime, setCustomTime] = useState(stats.habit.checkInTime || "06:00");

  // Task form state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskCategory, setTaskCategory] = useState<string>("ACTION");
  const [taskFilter, setTaskFilter] = useState<string>("ALL");
  const [loadingTask, setLoadingTask] = useState(false);

  // Phase form state
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [phaseTitle, setPhaseTitle] = useState("");
  const [phaseDays, setPhaseDays] = useState(7);
  const [phaseTip, setPhaseTip] = useState("");
  const [loadingPhase, setLoadingPhase] = useState(false);
  const [editingPhase, setEditingPhase] = useState<HabitPhaseItem | null>(null);

  // Breathing state for SOS
  const [breathPhase, setBreathPhase] = useState<"Inhale" | "Hold" | "Exhale">("Inhale");
  const [breathSeconds, setBreathSeconds] = useState(4);

  const { habit, currentStreak, longestStreak, totalDays, successDays, completionRate, todayLog, logs } = stats;
  const isBad = habit.type === "BAD";
  const tasks = stats.habit.tasks ?? [];
  const phases = [...(stats.habit.phases ?? [])].sort((a, b) => a.order - b.order);

  // Breathing timer when SOS modal is open
  useEffect(() => {
    if (!showSosModal) return;
    const interval = setInterval(() => {
      setBreathSeconds((prev) => {
        if (prev <= 1) {
          setBreathPhase((current) => {
            if (current === "Inhale") return "Hold";
            if (current === "Hold") return "Exhale";
            return "Inhale";
          });
          return breathPhase === "Inhale" ? 7 : breathPhase === "Hold" ? 8 : 4;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showSosModal, breathPhase]);

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  const refetchStats = useCallback(async () => {
    try {
      const statsRes = await fetch(`/api/habits/${habit.id}?stats=true`);
      const statsJson = await statsRes.json();
      if (statsJson.success) {
        setStats(statsJson.data);
      }
    } catch {
      // ignore
    }
  }, [habit.id]);

  // Habit Update
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
        setIsEditingTime(false);
        await refetchStats();
        refresh();
      } catch (e) {
        toast((e as Error).message || "Gagal mengupdate kebiasaan.", "error");
      }
    },
    [habit.id, toast, refetchStats, refresh],
  );

  // Quick save evaluation time
  const handleSaveEvaluationTime = async () => {
    if (!customTime) return;
    await handleUpdate({ checkInTime: customTime });
  };

  // Delete Habit
  const handleDelete = useCallback(async () => {
    if (!confirm("Hapus kebiasaan ini? Semua data statistik dan riwayat akan dihapus.")) return;
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

  // Check-In
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
        toast(json.message || "Evaluasi check-out berhasil dicatat!", "success");
        setShowCheckIn(false);
        await refetchStats();
        refresh();
      } catch (e) {
        toast((e as Error).message || "Gagal mencatat evaluasi.", "error");
      }
    },
    [habit.id, toast, refetchStats, refresh],
  );

  // ─── TASK ACTIONS (Similar to Goals & Projects) ───
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setLoadingTask(true);
    try {
      const res = await fetch(`/api/habits/${habit.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDesc.trim() || undefined,
          category: taskCategory,
          order: tasks.length,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast("Task aksi berhasil ditambahkan!", "success");
      setTaskTitle("");
      setTaskDesc("");
      setIsAddingTask(false);
      await refetchStats();
      refresh();
    } catch (err) {
      toast((err as Error).message || "Gagal menambah task.", "error");
    } finally {
      setLoadingTask(false);
    }
  };

  const handleToggleTask = async (task: HabitTaskItem) => {
    const nextCompleted = !task.isCompleted;
    // Optimistic update
    setStats((prev) => ({
      ...prev,
      habit: {
        ...prev.habit,
        tasks: (prev.habit.tasks ?? []).map((t) => (t.id === task.id ? { ...t, isCompleted: nextCompleted } : t)),
      },
    }));

    try {
      const res = await fetch(`/api/habits/${habit.id}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: nextCompleted }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast(nextCompleted ? "Task diselesaikan! 🎉" : "Status task diubah.", "info");
    } catch {
      toast("Gagal mengubah status task.", "error");
      await refetchStats();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Hapus task aksi ini?")) return;
    try {
      const res = await fetch(`/api/habits/${habit.id}/tasks/${taskId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast("Task dihapus.", "info");
      await refetchStats();
      refresh();
    } catch (err) {
      toast((err as Error).message || "Gagal menghapus task.", "error");
    }
  };

  // ─── PHASE ACTIONS (Customizable Target Days) ───
  const handleCreateOrEditPhase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phaseTitle.trim()) return;
    setLoadingPhase(true);
    try {
      if (editingPhase) {
        const res = await fetch(`/api/habits/${habit.id}/phases/${editingPhase.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: phaseTitle.trim(),
            targetDays: Number(phaseDays),
            psychTip: phaseTip.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        toast("Tahapan target berhasil diperbarui!", "success");
        setEditingPhase(null);
      } else {
        const res = await fetch(`/api/habits/${habit.id}/phases`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: phaseTitle.trim(),
            targetDays: Number(phaseDays),
            psychTip: phaseTip.trim() || undefined,
            order: phases.length,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        toast("Tahapan target berhasil ditambahkan!", "success");
        setShowAddPhase(false);
      }
      setPhaseTitle("");
      setPhaseDays(7);
      setPhaseTip("");
      await refetchStats();
      refresh();
    } catch (err) {
      toast((err as Error).message || "Gagal menyimpan tahapan.", "error");
    } finally {
      setLoadingPhase(false);
    }
  };

  const handleDeletePhase = async (phaseId: string) => {
    if (!confirm("Hapus tahapan target ini?")) return;
    try {
      const res = await fetch(`/api/habits/${habit.id}/phases/${phaseId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast("Tahapan dihapus.", "info");
      await refetchStats();
      refresh();
    } catch (err) {
      toast((err as Error).message || "Gagal menghapus tahapan.", "error");
    }
  };

  // Add Recommended Scientific Templates if user wants quick start
  const handleLoadRecommendedPhases = async () => {
    if (!confirm("Tambahkan 4 tahapan target bertahap (7 hari, 14 hari, 30 hari, 90 hari)? Anda tetap bisa mengubah durasinya nanti.")) return;
    const templates = [
      { title: "Fase 1: Detoks Awal", targetDays: 7, psychTip: "7 hari pertama adalah adaptasi dopamin terberat. Lewati fase ini untuk menstabilkan neurotransmitter." },
      { title: "Fase 2: Stabilisasi Dopamin", targetDays: 14, psychTip: "Dopamin reseptor mulai sensitif kembali. Energi dan kejernihan pikiran mulai terasa." },
      { title: "Fase 3: Neural Rewiring", targetDays: 30, psychTip: "30 hari adalah pembentukan sirkuit saraf kebiasaan baru di prefrontal cortex." },
      { title: "Fase 4: Transformasi Permanen", targetDays: 90, psychTip: "Threshold psikologi perubahan permanen. Identitas baru telah terbentuk." },
    ];
    for (const t of templates) {
      await fetch(`/api/habits/${habit.id}/phases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(t),
      });
    }
    toast("Tahapan target berhasil dibuat! Silakan sesuaikan bila perlu.", "success");
    await refetchStats();
    refresh();
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => taskFilter === "ALL" || t.category === taskFilter);
  const completedTasksCount = tasks.filter((t) => t.isCompleted).length;

  // 30 days grid
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
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* ─── BREADCRUMB & TOP ACTIONS ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/habits"
          className="inline-flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors group"
        >
          <span className="p-1 rounded-lg bg-white/[0.04] border border-white/[0.08] group-hover:border-white/20 transition-all">
            <Icon name="arrowLeft" size={14} />
          </span>
          Kembali ke Daftar Kebiasaan
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          {isBad && (
            <button
              onClick={() => setShowSosModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 text-xs font-bold text-rose-300 hover:bg-rose-500/25 transition-all shadow-lg shadow-rose-500/10 animate-pulse"
            >
              <span>🚨</span>
              Dorongan Kuat (SOS)
            </button>
          )}
          <button
            onClick={() => setShowEdit(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-[#cbd5e1] hover:bg-white/[0.08] hover:text-white transition-all"
          >
            <Icon name="edit" size={13} />
            Edit Info
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
            Check-Out Hari Ini
          </button>
        </div>
      </div>

      {/* ─── HERO HEADER ─── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#121622]/90 to-[#0e111a]/90 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-xl border border-white/10 ${
                isBad ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
              }`}
            >
              <span className="text-2xl">{isBad ? "🛡️" : "✨"}</span>
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
                  {isBad ? "Ubah Kebiasaan Buruk" : "Bangun Kebiasaan Baik"}
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

          {/* Quick Streak Box */}
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
              <span className="text-[#94a3b8] block">Rekor Terbaik:</span>
              <span className="font-bold text-amber-300">{longestStreak} Hari</span>
            </div>
          </div>
        </div>

        {/* Evaluation Time Banner */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8B5CF6]/15 text-[#a78bfa] border border-[#8B5CF6]/25">
              <Icon name="clock" size={18} />
            </span>
            <div>
              <div className="text-xs text-[#94a3b8]">Jadwal Jam Evaluasi / Check-Out:</div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Pukul {habit.checkInTime || "06:00"} WIB Setiap Hari</span>
                <button
                  onClick={() => setIsEditingTime(!isEditingTime)}
                  className="text-xs text-[#a78bfa] hover:underline font-normal"
                >
                  (Ubah Jam)
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {todayLog ? (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 flex items-center gap-1.5">
                <Icon name="check" size={13} />
                Sudah Check-Out Hari Ini ({todayLog.isSuccess ? "Bersih ✓" : "Relapse Terdata"})
              </span>
            ) : (
              <button
                onClick={() => setShowCheckIn(true)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition-all flex items-center gap-1.5"
              >
                <span>⚡</span>
                Belum Check-Out — Evaluasi Sekarang
              </button>
            )}
          </div>
        </div>

        {/* Inline Time Editor */}
        {isEditingTime && (
          <div className="mt-3 p-4 rounded-2xl border border-[#8B5CF6]/30 bg-[#141829] flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold text-white block mb-1">Tentukan Jam Check-Out Harian Baru:</label>
              <p className="text-[11px] text-[#94a3b8]">
                Misal: jam 06:00 pagi setiap hari agar kamu bisa mengecek apakah malam kemarin berhasil menahan diri.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-xs focus:outline-none focus:border-[#8B5CF6]"
              />
              <button
                onClick={handleSaveEvaluationTime}
                className="px-3 py-1.5 rounded-xl bg-[#8B5CF6] text-white text-xs font-bold hover:bg-[#7c3aed] transition-all"
              >
                Simpan Jam
              </button>
              <button
                onClick={() => setIsEditingTime(false)}
                className="px-2 py-1.5 text-xs text-[#94a3b8] hover:text-white"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Why Quote Banner */}
        {habit.whyQuit && (
          <div className="mt-4 rounded-2xl bg-amber-500/[0.08] border border-amber-500/20 p-4">
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

      {/* ─── NAVIGATION TABS (Similar to Goals & Projects) ─── */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "tasks"
              ? "bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/20"
              : "text-[#94a3b8] hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <span>📋</span>
          <span>Daftar Task & Protokol</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {completedTasksCount}/{tasks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("phases")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "phases"
              ? "bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/20"
              : "text-[#94a3b8] hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <span>🎯</span>
          <span>Tahapan Target Fleksibel</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {phases.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "analytics"
              ? "bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/20"
              : "text-[#94a3b8] hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <span>📈</span>
          <span>Statistik & Refleksi 30 Hari</span>
        </button>
      </div>

      {/* ─── TAB 1: TASKS & ACTION PROTOCOLS (Fleksibel mirip Target/Proyek) ─── */}
      {activeTab === "tasks" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/[0.08] bg-[#121622]/60 p-6 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>⚡</span>
                  <span>Action Plan & Protokol Pendukung Kebiasaan</span>
                </h2>
                <p className="text-xs text-[#94a3b8] mt-0.5">
                  Buat subtask perlindungan lingkungan, kebiasaan pengganti, dan protokol aksi kustom sendiri.
                </p>
              </div>
              <button
                onClick={() => setIsAddingTask(!isAddingTask)}
                className="text-xs font-bold text-white px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] hover:opacity-90 transition-all flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Icon name="plus" size={14} />
                Tambah Task Baru
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 text-xs">
              <button
                onClick={() => setTaskFilter("ALL")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  taskFilter === "ALL"
                    ? "bg-white text-slate-900"
                    : "bg-white/[0.04] text-[#94a3b8] hover:text-white"
                }`}
              >
                Semua ({tasks.length})
              </button>
              {Object.entries(TASK_CATEGORIES).map(([key, cat]) => {
                const count = tasks.filter((t) => t.category === key).length;
                return (
                  <button
                    key={key}
                    onClick={() => setTaskFilter(key)}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                      taskFilter === key
                        ? "bg-white text-slate-900"
                        : "bg-white/[0.04] text-[#94a3b8] hover:text-white"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label} ({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Add Task Form */}
            {isAddingTask && (
              <form onSubmit={handleCreateTask} className="mb-6 p-4 rounded-2xl border border-[#8B5CF6]/30 bg-[#161a2b] space-y-3">
                <div className="text-xs font-bold text-white">Buat Task / Protokol Aksi Baru:</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-[#94a3b8] block mb-1">Judul Task / Tindakan *</label>
                    <input
                      type="text"
                      placeholder="Misal: Pasang website blocker di PC, Push up 15x saat urge muncul..."
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#8B5CF6]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#94a3b8] block mb-1">Kategori Task</label>
                    <select
                      value={taskCategory}
                      onChange={(e) => setTaskCategory(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-[#141824] border border-white/10 text-white focus:outline-none focus:border-[#8B5CF6]"
                    >
                      <option value="BARRIER">🛡️ Barrier (Penghalang Godaan)</option>
                      <option value="REPLACEMENT">🔄 Replacement (Pengganti Dopamin)</option>
                      <option value="PROTOCOL">🚨 Protokol Darurat Craving</option>
                      <option value="ACTION">⚡ Tindakan Aksi Umum</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-[#94a3b8] block mb-1">Catatan Tambahan (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Instruksi spesifik atau aturan pelaksanaannya..."
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="text-xs px-3 py-1.5 text-[#94a3b8] hover:text-white"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loadingTask}
                    className="text-xs px-4 py-1.5 rounded-xl bg-[#8B5CF6] text-white font-bold hover:bg-[#7c3aed] transition-all disabled:opacity-50"
                  >
                    {loadingTask ? "Menyimpan..." : "Simpan Task"}
                  </button>
                </div>
              </form>
            )}

            {/* Task List */}
            <div className="space-y-2.5">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-10 rounded-2xl border border-dashed border-white/10 p-6">
                  <span className="text-3xl block mb-2">📋</span>
                  <p className="text-xs text-[#94a3b8]">Belum ada task aksi dalam kategori ini.</p>
                  <button
                    onClick={() => setIsAddingTask(true)}
                    className="mt-3 text-xs font-bold text-[#a78bfa] hover:underline"
                  >
                    + Buat Task Pertama Kamu
                  </button>
                </div>
              ) : (
                filteredTasks.map((t) => {
                  const cat = TASK_CATEGORIES[t.category] ?? TASK_CATEGORIES.ACTION;
                  return (
                    <div
                      key={t.id}
                      className={`group p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        t.isCompleted
                          ? "border-emerald-500/20 bg-emerald-500/[0.03] opacity-75"
                          : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(t)}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all ${
                            t.isCompleted
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-white/20 hover:border-[#8B5CF6] text-transparent"
                          }`}
                        >
                          <Icon name="check" size={12} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cat.bg} ${cat.color}`}
                            >
                              {cat.icon} {cat.label}
                            </span>
                            <span
                              className={`text-xs font-semibold ${
                                t.isCompleted ? "line-through text-[#64748b]" : "text-white"
                              }`}
                            >
                              {t.title}
                            </span>
                          </div>
                          {t.description && (
                            <p className="text-[11px] text-[#94a3b8] mt-1 pl-0.5">{t.description}</p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#64748b] hover:text-rose-400 p-1 rounded-lg transition-all"
                        title="Hapus Task"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: TAHAPAN TARGET FLEKSIBEL (User yang menentukan durasi hari) ─── */}
      {activeTab === "phases" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/[0.08] bg-[#121622]/60 p-6 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🎯</span>
                  <span>Tahapan Target Rentang Hari (Milestones Kustom)</span>
                </h2>
                <p className="text-xs text-[#94a3b8] mt-0.5">
                  Kamu yang menentukan sendiri berapa hari target di setiap tahapan. Kamu memegang kendali penuh.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {phases.length === 0 && (
                  <button
                    onClick={handleLoadRecommendedPhases}
                    className="text-xs font-semibold text-[#cbd5e1] hover:text-white px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                  >
                    Gunakan Rekomendasi Sains
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingPhase(null);
                    setPhaseTitle("");
                    setPhaseDays(7);
                    setPhaseTip("");
                    setShowAddPhase(!showAddPhase);
                  }}
                  className="text-xs font-bold text-white px-3.5 py-1.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7c3aed] transition-all flex items-center gap-1.5"
                >
                  <Icon name="plus" size={13} />
                  Tambah Tahap Baru
                </button>
              </div>
            </div>

            {/* Add or Edit Phase Form */}
            {(showAddPhase || editingPhase) && (
              <form onSubmit={handleCreateOrEditPhase} className="mb-6 p-5 rounded-2xl border border-[#8B5CF6]/30 bg-[#161a2b] space-y-3">
                <div className="text-xs font-bold text-white">
                  {editingPhase ? "Edit Tahapan Target:" : "Buat Tahapan Target Baru (Kamu yang Menentukan Hari):"}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#94a3b8] block mb-1">Judul Tahapan *</label>
                    <input
                      type="text"
                      placeholder="Misal: Tahap 1 — 3 Hari Pertama, atau 1 Minggu Bebas..."
                      value={phaseTitle}
                      onChange={(e) => setPhaseTitle(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#8B5CF6]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#94a3b8] block mb-1">Target Berapa Hari? *</label>
                    <input
                      type="number"
                      min="1"
                      max="3650"
                      value={phaseDays}
                      onChange={(e) => setPhaseDays(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#8B5CF6]"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-[#94a3b8] block mb-1">Tips Psikologi / Catatan Pribadi (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Catatan motivasi atau aturan khusus untuk tahapan ini..."
                    value={phaseTip}
                    onChange={(e) => setPhaseTip(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowAddPhase(false); setEditingPhase(null); }}
                    className="text-xs px-3 py-1.5 text-[#94a3b8] hover:text-white"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loadingPhase}
                    className="text-xs px-4 py-1.5 rounded-xl bg-[#8B5CF6] text-white font-bold hover:bg-[#7c3aed] transition-all disabled:opacity-50"
                  >
                    {loadingPhase ? "Menyimpan..." : "Simpan Tahapan"}
                  </button>
                </div>
              </form>
            )}

            {/* Phase List */}
            <div className="space-y-4">
              {phases.length === 0 ? (
                <div className="text-center py-10 rounded-2xl border border-dashed border-white/10 p-6">
                  <span className="text-3xl block mb-2">🎯</span>
                  <p className="text-xs text-[#94a3b8]">Belum ada tahapan target yang dibuat.</p>
                  <p className="text-[11px] text-[#64748b] mt-1">
                    Buat tahapan target bertahap sendiri (misal: 3 hari, lalu 7 hari, lalu 1 bulan) agar perubahan tidak memberatkan mental.
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-4">
                    <button
                      onClick={() => setShowAddPhase(true)}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#8B5CF6] text-white hover:bg-[#7c3aed]"
                    >
                      + Buat Tahap Pertama
                    </button>
                    <button
                      onClick={handleLoadRecommendedPhases}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-[#cbd5e1] hover:bg-white/10"
                    >
                      Gunakan Template Sains
                    </button>
                  </div>
                </div>
              ) : (
                phases.map((phase, idx) => {
                  const isCompleted = phase.isCompleted;
                  const currentStreakNum = currentStreak;
                  const progressPct = isCompleted
                    ? 100
                    : Math.min(100, Math.round((currentStreakNum / phase.targetDays) * 100));

                  return (
                    <div
                      key={phase.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCompleted
                          ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                          : progressPct > 0
                          ? "border-[#8B5CF6]/50 bg-[#8B5CF6]/[0.06] shadow-lg shadow-[#8B5CF6]/5"
                          : "border-white/[0.05] bg-white/[0.01]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                              isCompleted
                                ? "bg-emerald-500/20 text-emerald-400"
                                : progressPct > 0
                                ? "bg-[#8B5CF6]/20 text-[#a78bfa]"
                                : "bg-white/5 text-[#64748b]"
                            }`}
                          >
                            {isCompleted ? "✓" : idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white">{phase.title}</h3>
                              {isCompleted && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                                  Tuntas
                                </span>
                              )}
                              {!isCompleted && progressPct > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8B5CF6] text-white">
                                  Sedang Berjalan
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#94a3b8] mt-0.5">
                              Target Kustom: <strong className="text-white">{phase.targetDays} Hari</strong>
                              {!isCompleted && ` • Progres: ${currentStreakNum} hari (${phase.targetDays - currentStreakNum > 0 ? `${phase.targetDays - currentStreakNum} hari lagi` : "Target tercapai!"})`}
                            </p>
                            {phase.psychTip && (
                              <p className="text-xs text-[#c4b5fd] mt-2 italic bg-[#8B5CF6]/10 p-2.5 rounded-xl border border-[#8B5CF6]/20">
                                🧠 <strong>Catatan:</strong> {phase.psychTip}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{progressPct}%</span>
                          <button
                            onClick={() => {
                              setEditingPhase(phase);
                              setPhaseTitle(phase.title);
                              setPhaseDays(phase.targetDays);
                              setPhaseTip(phase.psychTip || "");
                            }}
                            className="p-1 rounded-lg text-[#94a3b8] hover:text-white hover:bg-white/10"
                            title="Edit Tahapan"
                          >
                            <Icon name="edit" size={13} />
                          </button>
                          <button
                            onClick={() => handleDeletePhase(phase.id)}
                            className="p-1 rounded-lg text-[#94a3b8] hover:text-rose-400 hover:bg-rose-500/10"
                            title="Hapus Tahapan"
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3 h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted
                              ? "bg-emerald-500"
                              : "bg-gradient-to-r from-[#8B5CF6] to-[#a78bfa]"
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
        </div>
      )}

      {/* ─── TAB 3: STATISTIK & KALENDER REFLEKSI ─── */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* 4 Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#121622]/60 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between text-[#94a3b8] mb-2">
                <span className="text-xs font-semibold">Streak Saat Ini</span>
                <span className="text-rose-400">🔥</span>
              </div>
              <div className="text-2xl font-black text-white">{currentStreak} <span className="text-xs text-[#94a3b8] font-normal">hari</span></div>
              <p className="text-[11px] text-[#94a3b8] mt-1">Konsistensi aktif</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#121622]/60 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between text-[#94a3b8] mb-2">
                <span className="text-xs font-semibold">Rekor Terpanjang</span>
                <span className="text-amber-400">🏆</span>
              </div>
              <div className="text-2xl font-black text-amber-300">{longestStreak} <span className="text-xs text-[#94a3b8] font-normal">hari</span></div>
              <p className="text-[11px] text-[#94a3b8] mt-1">Rekor terbaik</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#121622]/60 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between text-[#94a3b8] mb-2">
                <span className="text-xs font-semibold">Tingkat Keberhasilan</span>
                <span className="text-emerald-400">📈</span>
              </div>
              <div className="text-2xl font-black text-emerald-400">{completionRate}%</div>
              <p className="text-[11px] text-[#94a3b8] mt-1">{successDays} dari {totalDays} check-out</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#121622]/60 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between text-[#94a3b8] mb-2">
                <span className="text-xs font-semibold">Total Evaluasi</span>
                <span className="text-indigo-400">📅</span>
              </div>
              <div className="text-2xl font-black text-white">{totalDays} <span className="text-xs text-[#94a3b8] font-normal">kali</span></div>
              <p className="text-[11px] text-[#94a3b8] mt-1">Konsistensi mencatat</p>
            </div>
          </div>

          {/* 30-Day Grid */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#121622]/60 p-6 backdrop-blur-xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📊</span>
                <span>Kalender Evaluasi 30 Hari Terakhir</span>
              </h2>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Hijau = Bersih/Tuntas, Merah = Relapse (data pembelajaran evaluasi).
              </p>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-2">
              {last30Grid.map((item, idx) => {
                const hasLog = !!item.log;
                const isSuccess = item.log?.isSuccess;
                return (
                  <div
                    key={idx}
                    title={`${item.date}: ${hasLog ? (isSuccess ? "Berhasil/Clean" : "Relapse") : "Belum evaluasi"}`}
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

            {/* Recent Logs */}
            <div className="pt-4 border-t border-white/[0.06]">
              <h3 className="text-sm font-bold text-white mb-3">Catatan Evaluasi Terakhir</h3>
              {logs.length === 0 ? (
                <p className="text-xs text-[#94a3b8] italic">Belum ada evaluasi tersimpan.</p>
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
                            {log.isSuccess ? "✓ Bersih" : "✗ Relapse"}
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
        </div>
      )}

      {/* ─── SOS CRAVING SURFING MODAL (Tool Darurat Saat Dorongan Muncul) ─── */}
      {showSosModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowSosModal(false); }}
        >
          <div className="w-full max-w-lg rounded-3xl border border-rose-500/40 bg-[#0e101c] p-6 shadow-2xl text-center space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
                🚨 Emergency Urge Protocol
              </span>
              <button
                onClick={() => setShowSosModal(false)}
                className="text-white/60 hover:text-white"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Tenang. Tarik Napas. Urge Ini Hanya Sementara.</h2>
              <p className="text-xs text-[#94a3b8] mt-1">
                Riset neurosains membuktikan gelombang craving dopamin rata-rata hanya berlangsung 10-15 menit. Kamu tidak harus bertindak.
              </p>
            </div>

            {/* Breathing Animation Circle */}
            <div className="flex flex-col items-center justify-center py-4">
              <div
                className={`flex h-36 w-36 items-center justify-center rounded-full border-4 transition-all duration-1000 ${
                  breathPhase === "Inhale"
                    ? "border-emerald-400 bg-emerald-500/20 scale-110 shadow-lg shadow-emerald-500/30"
                    : breathPhase === "Hold"
                    ? "border-amber-400 bg-amber-500/20 scale-100 shadow-lg shadow-amber-500/30"
                    : "border-indigo-400 bg-indigo-500/10 scale-90 shadow-lg shadow-indigo-500/20"
                }`}
              >
                <div className="text-center">
                  <div className="text-xs font-semibold uppercase tracking-wider text-white/80">{breathPhase}</div>
                  <div className="text-3xl font-black text-white">{breathSeconds}s</div>
                </div>
              </div>
              <p className="text-[11px] text-[#94a3b8] mt-3">
                Teknik 4-7-8 untuk menenangkan sistem saraf simpatik (fight-or-flight).
              </p>
            </div>

            {/* Why Reminder */}
            {habit.whyQuit && (
              <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] text-left">
                <div className="text-xs font-bold text-amber-300 mb-1">💡 Ingat Mengapa Kamu Memulai:</div>
                <div className="text-xs text-[#fde68a] italic">&quot;{habit.whyQuit}&quot;</div>
              </div>
            )}

            {/* Quick Actions Pick */}
            <div className="text-left">
              <div className="text-xs font-bold text-white mb-2">⚡ Lakukan Salah Satu Aksi Pengalih Sekarang:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-white flex items-center gap-2">
                  <span>💪</span> Push-up 15x Cepat
                </div>
                <div className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-white flex items-center gap-2">
                  <span>💧</span> Cuci Muka Air Dingin
                </div>
                <div className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-white flex items-center gap-2">
                  <span>🚶</span> Keluar Ruangan 5 Menit
                </div>
                <div className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-white flex items-center gap-2">
                  <span>📵</span> Taruh HP di Meja Jauh
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSosModal(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 text-xs font-bold text-white hover:opacity-95 transition-all"
            >
              Saya Siap Menahan Diri &amp; Kembali Bertarung
            </button>
          </div>
        </div>
      )}

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
