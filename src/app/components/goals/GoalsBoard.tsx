"use client";

import { useState, useMemo, useEffect } from "react";
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

  // Keyboard shortcut ⌘F / Ctrl+F for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        const el = document.getElementById("goals-search-input");
        if (el) el.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Compute 4 Top Mini Bento Metrics
  const allGoals = useMemo(() => [...activeGoals, ...completedGoals], [activeGoals, completedGoals]);
  const activeCount = activeGoals.length;
  const completedCount = completedGoals.length;

  const approachingDeadlineCount = useMemo(() => {
    return activeGoals.filter((g) => g.daysRemaining !== null && g.daysRemaining !== undefined && g.daysRemaining <= 30).length;
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
    <div className="flex flex-col gap-6 selection:bg-[#d0bcff] selection:text-[#340080]">
      {/* ── Area Header Halaman ────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
        <div className="flex flex-col gap-1.5 max-w-3xl">
          <div className="flex items-center gap-2 font-mono text-xs text-[#cbc3d7]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#d0bcff] animate-pulse" />
            <span>TARGET STRATEGIS // ARAH &amp; PENCAPAIAN UTAMA</span>
          </div>
          <h1 className="text-3xl sm:text-4xl text-[#e2e2eb] font-semibold tracking-tight">
            Target Utama
          </h1>
          <p className="text-sm text-[#958ea0] max-w-2xl">
            Kelola target besar Anda secara terarah: dibagi menjadi tahapan yang jelas hingga tuntas tercapai.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setDenseView((v) => !v)}
            className="px-3.5 py-2 rounded-lg bg-[#282a30] text-[#e2e2eb] hover:bg-[#1A2133] border border-white/[0.06] transition-all flex items-center gap-2 text-xs font-mono shadow-sm"
          >
            <svg className="w-4 h-4 text-[#958ea0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            <span>{denseView ? "Tampilan Lengkap" : "Kustomisasi View"}</span>
          </button>

          <NewGoalButton
            areas={areas}
            customTrigger={(openModal) => (
              <button
                type="button"
                onClick={openModal}
                className="px-4 py-2 rounded-lg bg-[#d0bcff] hover:bg-[#b098f0] text-[#23005c] text-xs font-semibold flex items-center gap-2 transition-all shadow-[0_0_24px_-4px_rgba(208,188,255,0.4)] active:scale-[0.98]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                </svg>
                <span>+ Buat Target Baru</span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#23005c]/20 text-[#23005c] ml-1">
                  N
                </span>
              </button>
            )}
          />
        </div>
      </div>

      {/* ── Bar Statistik Pencapaian (4 Kartu Mini Bento) ─────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Kartu 1: Target Aktif */}
        <div className="bg-[#131825]/90 rounded-xl border border-white/[0.07] p-4 flex flex-col justify-between relative overflow-hidden group hover:bg-[#1A2133] transition-colors shadow-sm">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#d0bcff]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-[#958ea0] uppercase tracking-wider">
              Status Portofolio
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#340080]/40 border border-[#d0bcff]/20 flex items-center justify-center text-[#d0bcff]">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-[#d0bcff]">{activeCount}</span>
              <span className="text-sm text-[#e2e2eb] font-medium">Target Aktif</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 font-mono text-xs text-[#F43F5E]">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
              </svg>
              <span>{approachingDeadlineCount} Mendekati Tenggat</span>
            </div>
          </div>
        </div>

        {/* Kartu 2: Rata-rata Progres */}
        <div className="bg-[#131825]/90 rounded-xl border border-white/[0.07] p-4 flex flex-col justify-between relative overflow-hidden group hover:bg-[#1A2133] transition-colors shadow-sm">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#c0c1ff]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-[#958ea0] uppercase tracking-wider">
              Laju Kecepatan
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#3131c0]/30 border border-[#c0c1ff]/20 flex items-center justify-center text-[#c0c1ff]">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 2 16h20a9.97 9.97 0 0 0-1.62-7.43zM10.59 15.41a2 2 0 1 1 2.83-2.83l5.66-5.66-2.83-2.83-5.66 5.66a2 2 0 0 1 0 2.83z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-[#c0c1ff]">{avgProgress}%</span>
              <span className="text-sm text-[#cbc3d7] font-medium">Rata-rata Progres</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 font-mono text-xs text-[#4edea3]">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
              </svg>
              <span>+12% Bulan Ini</span>
            </div>
          </div>
        </div>

        {/* Kartu 3: Tugas Tuntas */}
        <div className="bg-[#131825]/90 rounded-xl border border-white/[0.07] p-4 flex flex-col justify-between relative overflow-hidden group hover:bg-[#1A2133] transition-colors shadow-sm">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#4edea3]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-[#958ea0] uppercase tracking-wider">
              Throughput Tugas
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#00311f] border border-[#4edea3]/20 flex items-center justify-center text-[#4edea3]">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-[#4edea3]">{completedTasks}</span>
              <span className="text-sm text-[#958ea0] font-medium">/ {totalTasks} Tugas</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 font-mono text-xs text-[#4edea3]">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span>Rasio Sukses {taskSuccessRatio}%</span>
            </div>
          </div>
        </div>

        {/* Kartu 4: Target Berhasil */}
        <div className="bg-[#131825]/90 rounded-xl border border-white/[0.07] p-4 flex flex-col justify-between relative overflow-hidden group hover:bg-[#1A2133] transition-colors shadow-sm">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#F59E0B]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-[#958ea0] uppercase tracking-wider">
              Hall of Fame
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B]">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1c1.78-.34 3.23-1.63 3.61-3.96C19.08 11.63 21 9.55 21 7V5h-2zm-14 3V7h2v3.8c-1.21-.41-2-1.52-2-2.8zM17 10.8V7h2v1c0 1.28-.79 2.39-2 2.8z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-[#F59E0B]">{completedCount}</span>
              <span className="text-sm text-[#e2e2eb] font-medium">Target Berhasil</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 font-mono text-xs text-[#958ea0]">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z" />
              </svg>
              <span>Riwayat Terarsip</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bar Filter & Navigasi Pilar Kehidupan ─────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#131825]/70 backdrop-blur-md p-2 sm:p-2.5 rounded-xl border border-white/[0.07]">
        {/* Sisi Kiri: Segmented Control & Pillar Tags */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-[#0c0e14] p-1 rounded-lg flex items-center border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setTab("active")}
              className={`px-3 py-1.5 rounded-md font-mono text-xs font-semibold transition-all ${
                tab === "active"
                  ? "bg-[#340080] text-[#d0bcff] shadow-sm border border-[#d0bcff]/30"
                  : "text-[#958ea0] hover:text-[#e2e2eb]"
              }`}
            >
              Aktif ({activeGoals.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("completed")}
              className={`px-3 py-1.5 rounded-md font-mono text-xs font-semibold transition-all ${
                tab === "completed"
                  ? "bg-[#00311f] text-[#4edea3] shadow-sm border border-[#4edea3]/30"
                  : "text-[#958ea0] hover:text-[#e2e2eb]"
              }`}
            >
              Tuntas ({completedGoals.length})
            </button>
          </div>

          <div className="h-5 w-px bg-white/[0.1] hidden sm:block" />

          {/* Filter Pilar */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
            <button
              type="button"
              onClick={() => setSelectedAreaId("ALL")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                selectedAreaId === "ALL"
                  ? "bg-[#282a30] text-[#e2e2eb] border border-white/[0.1]"
                  : "bg-[#191b22] hover:bg-[#1A2133] text-[#958ea0] hover:text-[#e2e2eb] border border-transparent"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#d0bcff]" />
              <span>Semua</span>
            </button>

            {areas.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => setSelectedAreaId(area.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  selectedAreaId === area.id
                    ? "bg-[#282a30] text-[#e2e2eb] border border-white/[0.1]"
                    : "bg-[#191b22] hover:bg-[#1A2133] text-[#958ea0] hover:text-[#e2e2eb] border border-transparent"
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: area.color || "#c0c1ff" }}
                />
                <span>{area.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sisi Kanan: Search & Sorter */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 sm:w-64">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#958ea0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="goals-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari target atau rute milestone..."
              className="w-full bg-[#0c0e14] text-[#e2e2eb] placeholder-[#494454] font-mono text-xs pl-9 pr-10 py-1.5 rounded-lg border border-white/[0.06] focus:outline-none focus:border-[#d0bcff]/40 shadow-inner"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] px-1 py-0.5 bg-[#1e1f26] rounded text-[#958ea0]">
              ⌘F
            </span>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-2.5 py-1.5 rounded-lg bg-[#282a30] text-[#e2e2eb] border border-white/[0.06] font-mono text-xs focus:outline-none cursor-pointer"
          >
            <option value="progress">Urutkan: Progres Tertinggi</option>
            <option value="deadline">Urutkan: Tenggat Terdekat</option>
            <option value="priority">Urutkan: Prioritas</option>
            <option value="newest">Urutkan: Terbaru</option>
          </select>
        </div>
      </div>

      {/* ── Grid 2 Kolom Kartu Target Utama ───────────────────────── */}
      {filteredGoals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-[#131825]/90 p-12 text-center">
          <p className="text-base font-semibold text-[#e2e2eb]">
            {searchQuery
              ? "Tidak ada target yang sesuai dengan pencarian."
              : selectedAreaId !== "ALL"
              ? "Belum ada target pada pilar ini."
              : tab === "active"
              ? "Belum ada target aktif. Buat target baru untuk memulai jalur ekspedisi."
              : "Belum ada target tuntas pada riwayat."}
          </p>
          <p className="text-xs text-[#958ea0] mt-1">
            Gunakan tombol &quot;+ Buat Target Baru&quot; di atas untuk merancang visi hidup baru.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredGoals.map((goal, gIdx) => {
            const circleRadius = 26;
            const circumference = 2 * Math.PI * circleRadius; // ≈ 163.36
            const progressRatio = Math.min(100, Math.max(0, goal.progress)) / 100;
            const strokeOffset = circumference * (1 - progressRatio);
            const isDone = goal.progress === 100 || goal.status === "COMPLETED";

            // Stage waypoints
            const stageWaypoints = goal.waypoints;
            const completedWaypoints = stageWaypoints.filter((w) => w.status === "COMPLETED").length;
            const waypointProgressPercent =
              stageWaypoints.length > 0
                ? Math.round((completedWaypoints / stageWaypoints.length) * 100)
                : 0;

            const areaColor = goal.area?.color || "#d0bcff";

            return (
              <div
                key={goal.id}
                className="bg-[#131825] rounded-xl border border-white/[0.07] p-5 sm:p-6 flex flex-col justify-between relative group hover:shadow-[0_0_35px_-8px_rgba(208,188,255,0.25)] transition-all shadow-md"
              >
                <div className="flex flex-col gap-4">
                  {/* Top Row: Kategori & Focus Orb Ring */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 border"
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
                          {goal.area?.name || "Target Mandiri"}
                        </span>
                        <span className="text-[#958ea0] font-mono text-xs">
                          {goal.routeCode || `#ROUTE-${String(gIdx + 1).padStart(2, "0")}`}
                        </span>
                      </div>

                      <Link href={`/goals/${goal.id}`}>
                        <h2 className="text-lg sm:text-xl text-[#e2e2eb] font-semibold tracking-tight group-hover:text-[#d0bcff] transition-colors line-clamp-2 mt-0.5">
                          {goal.title}
                        </h2>
                      </Link>

                      <div className="text-xs text-[#958ea0] flex items-center gap-1.5 mt-0.5 font-mono flex-wrap">
                        <svg className="w-3.5 h-3.5 text-[#F43F5E]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
                        </svg>
                        <span>Target: {goal.targetDateLabel || "Berkelanjutan"}</span>
                        {goal.daysRemaining !== null && goal.daysRemaining !== undefined && (
                          <>
                            <span className="text-[#33343b]">•</span>
                            <span
                              className={`font-semibold ${
                                goal.daysRemaining <= 7
                                  ? "text-[#F43F5E]"
                                  : goal.daysRemaining <= 30
                                  ? "text-[#F59E0B]"
                                  : "text-[#4edea3]"
                              }`}
                            >
                              {goal.daysRemaining < 0
                                ? "Tenggat Lewat"
                                : goal.daysRemaining === 0
                                ? "Hari Ini"
                                : `Sisa ${goal.daysRemaining} Hari`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* SVG Focus Orb */}
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" fill="none" r={circleRadius} stroke="#1e1f26" strokeWidth="5" />
                        <circle
                          cx="32"
                          cy="32"
                          fill="none"
                          r={circleRadius}
                          stroke={isDone ? "#4edea3" : "#d0bcff"}
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
                            isDone ? "text-[#4edea3]" : "text-[#d0bcff]"
                          }`}
                        >
                          {goal.progress}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-[#0c0e14] h-2 rounded-full overflow-hidden p-[1px] border border-white/[0.04]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDone
                          ? "bg-[#4edea3] shadow-[0_0_12px_rgba(78,222,163,0.6)]"
                          : "bg-gradient-to-r from-[#c0c1ff] via-[#a078ff] to-[#4edea3] shadow-[0_0_12px_rgba(192,193,255,0.5)]"
                      }`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>

                  {!denseView && (
                    <>
                      {/* Peta Rute Tahapan */}
                      <div className="bg-[#0c0e14]/80 rounded-lg p-3.5 flex flex-col gap-2 border border-white/[0.04]">
                        <span className="font-mono text-[10px] text-[#958ea0] uppercase tracking-wider font-semibold">
                          Langkah Tahapan Target
                        </span>

                        {stageWaypoints.length === 0 ? (
                          <div className="text-xs text-[#958ea0] py-2 text-center">
                            Belum ada tahapan/stage yang ditentukan.
                          </div>
                        ) : (
                          <div className="relative flex items-center justify-between mt-2 px-1">
                            {/* Connector Line Background */}
                            <div className="absolute top-3.5 left-4 right-4 h-[2px] bg-[#282a30] -z-0" />
                            {/* Active Progress Connector Line */}
                            <div
                              className="absolute top-3.5 left-4 h-[2px] bg-[#4edea3] -z-0 shadow-[0_0_8px_rgba(78,222,163,0.5)] transition-all duration-500"
                              style={{ width: `${Math.min(100, waypointProgressPercent)}%` }}
                            />

                            {/* Waypoint Nodes */}
                            {stageWaypoints.slice(0, 4).map((wp, wIdx) => {
                              const isWpDone = wp.status === "COMPLETED";
                              const isWpCurrent = wp.status === "CURRENT";

                              return (
                                <div key={wp.id || wIdx} className="flex flex-col items-center text-center gap-1 z-10">
                                  {isWpDone ? (
                                    <div className="w-7 h-7 rounded-full bg-[#4edea3] text-[#003824] flex items-center justify-center shadow-[0_0_10px_rgba(78,222,163,0.6)]">
                                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                      </svg>
                                    </div>
                                  ) : isWpCurrent ? (
                                    <div className="w-7 h-7 rounded-full bg-[#340080] text-[#d0bcff] border border-[#d0bcff]/40 flex items-center justify-center shadow-[0_0_12px_rgba(208,188,255,0.8)] animate-pulse">
                                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                                      </svg>
                                    </div>
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-[#282a30] text-[#958ea0] flex items-center justify-center">
                                      <span className="w-2 h-2 rounded-full bg-[#494454]" />
                                    </div>
                                  )}

                                  <span className="font-mono text-[10px] text-[#e2e2eb] max-w-[80px] truncate mt-0.5">
                                    {wp.label}
                                  </span>
                                  <span
                                    className={`font-mono text-[9px] ${
                                      isWpDone
                                        ? "text-[#4edea3]"
                                        : isWpCurrent
                                        ? "text-[#d0bcff] font-bold"
                                        : "text-[#958ea0]"
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

                      {/* Panel Fokus Tahap Saat Ini */}
                      <div className="bg-[#191b22] hover:bg-[#1A2133] rounded-lg p-3.5 flex flex-col gap-1.5 border border-white/[0.04] transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-[#d0bcff] uppercase font-semibold flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-[#d0bcff]" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
                            </svg>
                            {isDone
                              ? "Target Tercapai Penuh 🎉"
                              : `Fokus Tahap ${goal.currentStageIndex + 1}: ${goal.currentStageName || "Eksekusi"}`}
                          </span>
                          <span className="font-mono text-[10px] text-[#958ea0]">
                            {isDone ? "Selesai" : "Prio 1"}
                          </span>
                        </div>

                        <p className="text-xs text-[#e2e2eb] font-medium truncate">
                          {isDone
                            ? "Seluruh milestone dan tahapan telah diselesaikan dengan sukses!"
                            : goal.nextTaskName
                            ? `Tugas Berikutnya: ${goal.nextTaskName}`
                            : "Belum ada tugas berikutnya pada tahap ini."}
                        </p>

                        <div className="flex items-center gap-2 mt-1">
                          {!isDone && (
                            <Link
                              href={goal.nextTaskId ? `/focus?taskId=${goal.nextTaskId}` : "/focus"}
                              className="px-3 py-1 rounded bg-[#d0bcff] hover:bg-[#b098f0] text-[#23005c] font-mono text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                            >
                              <span>Lanjut Eksekusi 🍅</span>
                            </Link>
                          )}
                          <Link
                            href={`/goals/${goal.id}`}
                            className="px-2.5 py-1 rounded bg-[#282a30] hover:bg-[#33343b] text-[#cbc3d7] hover:text-[#e2e2eb] text-xs font-mono transition-colors"
                          >
                            Lihat {goal.currentStageTasksCount || goal.totalTasks} Sub-tugas
                          </Link>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer Kartu */}
                <div className="mt-4 pt-3 flex items-center justify-between border-t border-white/[0.06] font-mono text-xs text-[#958ea0]">
                  <span>
                    {goal.totalStages} Tahap • {goal.completedTasks}/{goal.totalTasks} Tugas Selesai • Est:{" "}
                    {goal.totalEstimatedHours || Math.round(goal.totalTasks * 1.5)} Jam
                  </span>
                  <Link
                    href={`/goals/${goal.id}`}
                    className="text-[#d0bcff] hover:underline flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                  >
                    <span>Buka Peta Perjalanan</span>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
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
