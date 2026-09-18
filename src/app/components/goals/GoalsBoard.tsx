"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import NewGoalButton, { type AreaOption } from "@/app/components/NewGoalButton";

export type WaypointStatus = "COMPLETED" | "CURRENT" | "UPCOMING";

export type GoalCard = {
  id: string;
  title: string;
  type: string;
  status: string;
  priority?: string;
  routeCode?: string;
  area?: { id: string; name: string; color: string } | null;
  targetDate?: string | null;
  targetDateLabel: string | null;
  daysRemaining?: number | null;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  totalStages: number;
  currentStageIndex: number;
  currentStageName: string | null;
  currentStageTasksCount?: number;
  nextTaskId?: string | null;
  nextTaskName: string | null;
  totalEstimatedHours?: number;
  waypoints: {
    id: string;
    label: string;
    status: WaypointStatus;
  }[];
};

interface GoalsBoardProps {
  activeGoals: GoalCard[];
  completedGoals: GoalCard[];
  areas: AreaOption[];
}

export function GoalsBoard({
  activeGoals,
  completedGoals,
  areas,
}: GoalsBoardProps) {
  const [tab, setTab] = useState<"active" | "completed">("active");
  const [selectedAreaId, setSelectedAreaId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"progress" | "deadline" | "priority" | "newest">("progress");
  const [denseView, setDenseView] = useState(false);

  // Compute 4 Top Mini Bento Metrics
  const allGoals = useMemo(() => [...activeGoals, ...completedGoals], [activeGoals, completedGoals]);
  const activeCount = activeGoals.length;
  const completedCount = completedGoals.length;

  const approachingDeadlineCount = useMemo(() => {
    return activeGoals.filter(
      (g) => g.daysRemaining !== null && g.daysRemaining !== undefined && g.daysRemaining <= 30 && g.daysRemaining >= 0
    ).length;
  }, [activeGoals]);

  const overdueCount = useMemo(() => {
    return activeGoals.filter(
      (g) => g.daysRemaining !== null && g.daysRemaining !== undefined && g.daysRemaining < 0
    ).length;
  }, [activeGoals]);

  const avgProgress = useMemo(() => {
    if (activeGoals.length === 0) return 0;
    return Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length);
  }, [activeGoals]);

  const totalTasks = useMemo(() => allGoals.reduce((sum, g) => sum + g.totalTasks, 0), [allGoals]);
  const completedTasks = useMemo(() => allGoals.reduce((sum, g) => sum + g.completedTasks, 0), [allGoals]);
  const taskSuccessRatio = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filter and sort
  const currentList = tab === "active" ? activeGoals : completedGoals;

  const filteredGoals = useMemo(() => {
    let list = currentList;

    if (selectedAreaId !== "ALL") {
      list = list.filter((g) => g.area?.id === selectedAreaId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.area?.name.toLowerCase().includes(q) ||
          g.waypoints.some((w) => w.label.toLowerCase().includes(q))
      );
    }

    // Sorting
    return [...list].sort((a, b) => {
      if (sortBy === "progress") {
        return b.progress - a.progress;
      }
      if (sortBy === "deadline") {
        const da = a.daysRemaining ?? 9999;
        const db = b.daysRemaining ?? 9999;
        return da - db;
      }
      if (sortBy === "priority") {
        const pOrder: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (pOrder[b.priority || "MEDIUM"] || 0) - (pOrder[a.priority || "MEDIUM"] || 0);
      }
      return b.id.localeCompare(a.id);
    });
  }, [currentList, selectedAreaId, searchQuery, sortBy]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header Halaman ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
        <div className="flex flex-col gap-1.5 max-w-3xl">
          <div className="flex items-center gap-2 text-purple-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>Arah &amp; Pencapaian Utama</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Target &amp; Rencana Hidup
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl">
            Pantau target jangka panjang Anda secara terarah, terukur, dan terbagi ke dalam tahapan yang jelas hingga tuntas tercapai.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setDenseView((v) => !v)}
            className={`px-3.5 py-2 rounded-xl border transition-all flex items-center gap-2 text-xs font-medium ${
              denseView
                ? "bg-purple-600/20 text-purple-300 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                : "bg-[#131825] text-zinc-300 hover:bg-[#1A2133] border-white/[0.08]"
            }`}
          >
            <svg className="w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            <span>{denseView ? "Tampilan Rinci" : "Tampilan Ringkas"}</span>
          </button>

          <NewGoalButton
            areas={areas}
            customTrigger={(openModal) => (
              <button
                type="button"
                onClick={openModal}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(168,85,247,0.35)] active:scale-[0.98]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>+ Buat Target Baru</span>
              </button>
            )}
          />
        </div>
      </div>

      {/* ── Bento Stats Metrics ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Kartu 1: Target Aktif */}
        <div className="bg-[#131825]/90 rounded-2xl border border-white/[0.08] p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group hover:border-purple-500/30 hover:bg-[#1A2133]/80 transition-all shadow-sm">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              Status Target
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-purple-300">{activeCount}</span>
              <span className="text-xs text-zinc-300 font-medium">Target Aktif</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs font-medium">
              {overdueCount > 0 ? (
                <span className="text-rose-400 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {overdueCount} Melewati Tenggat
                </span>
              ) : approachingDeadlineCount > 0 ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {approachingDeadlineCount} Mendekati Tenggat (≤30 hari)
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Tenggat waktu aman
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Kartu 2: Rata-rata Progres */}
        <div className="bg-[#131825]/90 rounded-2xl border border-white/[0.08] p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/30 hover:bg-[#1A2133]/80 transition-all shadow-sm">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              Rata-rata Kemajuan
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-indigo-300">{avgProgress}%</span>
              <span className="text-xs text-zinc-300 font-medium">Rata-rata Progres</span>
            </div>
            <div className="w-full bg-[#0B0D13] h-1.5 rounded-full mt-2.5 overflow-hidden border border-white/[0.04]">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${avgProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Kartu 3: Tugas Terhubung */}
        <div className="bg-[#131825]/90 rounded-2xl border border-white/[0.08] p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 hover:bg-[#1A2133]/80 transition-all shadow-sm">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              Tugas Terhubung
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-emerald-300">{completedTasks}</span>
              <span className="text-xs text-zinc-400 font-medium">/ {totalTasks} Selesai</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-emerald-400 font-medium">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Tingkat Penyelesaian {taskSuccessRatio}%</span>
            </div>
          </div>
        </div>

        {/* Kartu 4: Target Selesai */}
        <div className="bg-[#131825]/90 rounded-2xl border border-white/[0.08] p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/30 hover:bg-[#1A2133]/80 transition-all shadow-sm">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              Target Berhasil
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="7" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-amber-300">{completedCount}</span>
              <span className="text-xs text-zinc-300 font-medium">Target Tuntas</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-zinc-400">
              <span>Total {allGoals.length} sasaran terdaftar</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter & Search Bar ────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#131825]/70 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-white/[0.08]">
        {/* Left: Tab Switcher & Area Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-[#0B0D13] p-1 rounded-xl flex items-center border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setTab("active")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === "active"
                  ? "bg-purple-600/25 text-purple-200 shadow-sm border border-purple-500/30 font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Aktif ({activeGoals.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("completed")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === "completed"
                  ? "bg-emerald-600/25 text-emerald-200 shadow-sm border border-emerald-500/30 font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Selesai ({completedGoals.length})
            </button>
          </div>

          <div className="h-5 w-px bg-white/[0.1] hidden sm:block" />

          {/* Area Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedAreaId("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                selectedAreaId === "ALL"
                  ? "bg-[#1F2433] text-white border border-white/[0.12] font-semibold"
                  : "bg-[#131825] hover:bg-[#1A2133] text-zinc-400 hover:text-zinc-200 border border-transparent"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Semua</span>
            </button>

            {areas.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => setSelectedAreaId(area.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  selectedAreaId === area.id
                    ? "bg-[#1F2433] text-white border border-white/[0.12] font-semibold"
                    : "bg-[#131825] hover:bg-[#1A2133] text-zinc-400 hover:text-zinc-200 border border-transparent"
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: area.color || "#a855f7" }}
                />
                <span>{area.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Search & Sort */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 sm:w-64">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="goals-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari target atau tahapan..."
              className="w-full bg-[#0B0D13] text-white placeholder-zinc-500 text-xs pl-9 pr-3 py-2 rounded-xl border border-white/[0.08] focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 rounded-xl bg-[#0B0D13] text-zinc-300 border border-white/[0.08] text-xs focus:outline-none focus:border-purple-500/50 cursor-pointer"
          >
            <option value="progress">Progres Tertinggi</option>
            <option value="deadline">Tenggat Terdekat</option>
            <option value="priority">Prioritas Tertinggi</option>
            <option value="newest">Terbaru</option>
          </select>
        </div>
      </div>

      {/* ── Grid Kartu Target ──────────────────────────────────────── */}
      {filteredGoals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.1] bg-[#131825]/60 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
          </div>
          <p className="text-base font-semibold text-white">
            {searchQuery
              ? "Tidak ada target yang sesuai pencarian"
              : selectedAreaId !== "ALL"
              ? "Belum ada target pada pilar hidup ini"
              : tab === "active"
              ? "Belum ada target aktif yang dibuat"
              : "Belum ada target yang diselesaikan"}
          </p>
          <p className="text-xs text-zinc-400 mt-1 max-w-md">
            Rancang sasaran hidup Anda sekarang untuk mempermudah pemecahan tahapan dan rincian aktivitas harian.
          </p>
          <div className="mt-4">
            <NewGoalButton
              areas={areas}
              defaultAreaId={selectedAreaId !== "ALL" ? selectedAreaId : ""}
              customTrigger={(openModal) => (
                <button
                  type="button"
                  onClick={openModal}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold flex items-center gap-2 hover:brightness-110 transition-all shadow-md active:scale-[0.98]"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Buat Target Baru</span>
                </button>
              )}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredGoals.map((goal) => {
            const circleRadius = 26;
            const circumference = 2 * Math.PI * circleRadius; // ≈ 163.36
            const progressRatio = Math.min(100, Math.max(0, goal.progress)) / 100;
            const strokeOffset = circumference * (1 - progressRatio);
            const isDone = goal.progress === 100 || goal.status === "COMPLETED";

            const stageWaypoints = goal.waypoints;
            const completedWaypoints = stageWaypoints.filter((w) => w.status === "COMPLETED").length;
            const waypointProgressPercent =
              stageWaypoints.length > 0
                ? Math.round((completedWaypoints / stageWaypoints.length) * 100)
                : 0;

            const areaColor = goal.area?.color || "#a855f7";

            return (
              <div
                key={goal.id}
                className="bg-[#131825]/90 rounded-2xl border border-white/[0.08] hover:border-purple-500/40 p-5 sm:p-6 flex flex-col justify-between relative group transition-all shadow-md hover:shadow-[0_0_30px_rgba(168,85,247,0.12)]"
              >
                <div className="flex flex-col gap-4">
                  {/* Top Row: Area Tag, Priority & Circular Progress Ring */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1.5 border"
                          style={{
                            backgroundColor: `${areaColor}15`,
                            color: areaColor,
                            borderColor: `${areaColor}35`,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: areaColor }}
                          />
                          {goal.area?.name || "Target Umum"}
                        </span>

                        {goal.priority && goal.priority !== "MEDIUM" && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                              goal.priority === "URGENT"
                                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                : goal.priority === "HIGH"
                                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                            }`}
                          >
                            {goal.priority}
                          </span>
                        )}
                      </div>

                      <Link href={`/goals/${goal.id}`}>
                        <h2 className="text-lg sm:text-xl text-white font-semibold tracking-tight group-hover:text-purple-300 transition-colors line-clamp-2 mt-0.5">
                          {goal.title}
                        </h2>
                      </Link>

                      <div className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <span>Tenggat: {goal.targetDateLabel || "Berkelanjutan"}</span>
                        </span>

                        {goal.daysRemaining !== null && goal.daysRemaining !== undefined && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span
                              className={`font-semibold ${
                                goal.daysRemaining < 0
                                  ? "text-rose-400"
                                  : goal.daysRemaining <= 7
                                  ? "text-rose-400"
                                  : goal.daysRemaining <= 30
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {goal.daysRemaining < 0
                                ? "Tenggat Terlewat"
                                : goal.daysRemaining === 0
                                ? "Hari Ini"
                                : `Sisa ${goal.daysRemaining} Hari`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* SVG Circular Progress Ring */}
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shrink-0">
                      <svg className="w-14 h-14 sm:w-16 sm:h-16 transform -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" fill="none" r={circleRadius} stroke="#1f2433" strokeWidth="5" />
                        <circle
                          cx="32"
                          cy="32"
                          fill="none"
                          r={circleRadius}
                          stroke={isDone ? "#10b981" : "#a855f7"}
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeOffset}
                          strokeLinecap="round"
                          strokeWidth="5"
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span
                          className={`font-mono text-xs font-bold leading-none ${
                            isDone ? "text-emerald-400" : "text-purple-300"
                          }`}
                        >
                          {goal.progress}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Progress Bar */}
                  <div className="w-full bg-[#0B0D13] h-2 rounded-full overflow-hidden p-[1px] border border-white/[0.04]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDone
                          ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]"
                          : "bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                      }`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>

                  {!denseView && (
                    <>
                      {/* Waypoint Roadmap Timeline */}
                      <div className="bg-[#0B0D13]/70 rounded-xl p-3.5 flex flex-col gap-2 border border-white/[0.05]">
                        <span className="text-[11px] text-zinc-400 font-medium">
                          Tahapan Sasaran
                        </span>

                        {stageWaypoints.length === 0 ? (
                          <div className="text-xs text-zinc-500 py-1.5 text-center">
                            Belum ada tahapan yang ditentukan.
                          </div>
                        ) : (
                          <div className="relative flex items-center justify-between mt-2 px-1">
                            {/* Connector Line Background */}
                            <div className="absolute top-3.5 left-4 right-4 h-[2px] bg-[#1F2433] -z-0" />
                            {/* Active Progress Connector Line */}
                            <div
                              className="absolute top-3.5 left-4 h-[2px] bg-emerald-400 -z-0 shadow-[0_0_8px_rgba(52,211,153,0.5)] transition-all duration-500"
                              style={{ width: `${Math.min(100, waypointProgressPercent)}%` }}
                            />

                            {/* Waypoint Nodes */}
                            {stageWaypoints.slice(0, 4).map((wp, wIdx) => {
                              const isWpDone = wp.status === "COMPLETED";
                              const isWpCurrent = wp.status === "CURRENT";

                              return (
                                <div key={wp.id || wIdx} className="flex flex-col items-center text-center gap-1 z-10">
                                  {isWpDone ? (
                                    <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    </div>
                                  ) : isWpCurrent ? (
                                    <div className="w-7 h-7 rounded-full bg-purple-600 text-white border border-purple-400/50 flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.7)] animate-pulse">
                                      <span className="w-2 h-2 rounded-full bg-white" />
                                    </div>
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-[#1F2433] text-zinc-500 flex items-center justify-center border border-white/[0.05]">
                                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                                    </div>
                                  )}

                                  <span className="text-[10px] text-zinc-300 font-medium max-w-[80px] truncate mt-0.5">
                                    {wp.label}
                                  </span>
                                  <span
                                    className={`text-[9px] ${
                                      isWpDone
                                        ? "text-emerald-400 font-medium"
                                        : isWpCurrent
                                        ? "text-purple-300 font-semibold"
                                        : "text-zinc-500"
                                    }`}
                                  >
                                    {isWpDone ? "Selesai" : isWpCurrent ? "Berjalan" : "Mendatang"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Next Action Box (Fokus Tahap Saat Ini) */}
                      <div className="bg-[#0E131F] hover:bg-[#151C2C] rounded-xl p-3.5 flex flex-col gap-2 border border-white/[0.06] transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-purple-300 font-semibold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                            {isDone
                              ? "Target Selesai Tercapai 🎉"
                              : `Fokus Tahap ${goal.currentStageIndex + 1}: ${goal.currentStageName || "Eksekusi"}`}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium">
                            {isDone ? "Tuntas" : "Prioritas"}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-200 font-medium truncate">
                          {isDone
                            ? "Semua tahapan target telah berhasil diselesaikan!"
                            : goal.nextTaskName
                            ? `Tugas Berikutnya: ${goal.nextTaskName}`
                            : "Belum ada tugas berikutnya yang aktif pada tahap ini."}
                        </p>

                        <div className="flex items-center gap-2 mt-1">
                          {!isDone && (
                            <Link
                              href={goal.nextTaskId ? `/focus?taskId=${goal.nextTaskId}` : "/focus"}
                              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                            >
                              <span>Fokus Tugas Ini 🍅</span>
                            </Link>
                          )}
                          <Link
                            href={`/goals/${goal.id}`}
                            className="px-3 py-1.5 rounded-lg bg-[#1F2433] hover:bg-[#282F42] text-zinc-300 hover:text-white text-xs font-medium transition-colors border border-white/[0.05]"
                          >
                            Lihat {goal.currentStageTasksCount || goal.totalTasks} Tugas
                          </Link>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3 flex items-center justify-between border-t border-white/[0.06] text-xs text-zinc-400">
                  <span>
                    {goal.totalStages} Tahap • {goal.completedTasks}/{goal.totalTasks} Tugas
                  </span>
                  <Link
                    href={`/goals/${goal.id}`}
                    className="text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                  >
                    <span>Buka Rincian Target</span>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
