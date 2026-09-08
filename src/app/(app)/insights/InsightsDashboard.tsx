"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type {
  AnalyticsSummary,
  PrioritizedTask,
  DailyPlanRecommendation,
  TimeConflict,
  UnifiedInboxSummary,
  LifeHealthResult,
  InsightPeriod,
} from "@/services/insights/insights-types";

interface InsightsDashboardProps {
  initialAnalytics: AnalyticsSummary;
  initialPriority: PrioritizedTask[];
  initialDailyPlan: DailyPlanRecommendation;
  initialConflicts: TimeConflict[];
  initialInbox: UnifiedInboxSummary;
  initialHealth: LifeHealthResult;
}

export default function InsightsDashboard({
  initialAnalytics,
  initialPriority,
  initialDailyPlan,
  initialConflicts,
  initialInbox,
  initialHealth,
}: InsightsDashboardProps) {
  const [period, setPeriod] = useState<InsightPeriod>("this_week");
  const [analytics, setAnalytics] = useState<AnalyticsSummary>(initialAnalytics);
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "priority" | "radar">("overview");
  const [dismissedConflict, setDismissedConflict] = useState(false);

  async function handlePeriodChange(newPeriod: InsightPeriod) {
    setPeriod(newPeriod);
    setLoadingPeriod(true);
    try {
      const res = await fetch(`/api/insights/analytics?period=${newPeriod}`);
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch {
      // Keep previous state
    } finally {
      setLoadingPeriod(false);
    }
  }

  const handleExportReport = useCallback(() => {
    const reportData = {
      exportedAt: new Date().toISOString(),
      period,
      healthScore: initialHealth.overallScore,
      healthStatus: initialHealth.status,
      metrics: {
        totalFocusHours: analytics.sessions.totalHours,
        totalFocusSessions: analytics.sessions.totalCount,
        taskCompletionRate: analytics.tasks.completionRate,
        tasksCompleted: analytics.tasks.completed,
        activeGoals: analytics.goals.active,
        overdueTasks: analytics.tasks.overdue,
      },
      energyDistribution: analytics.areaDistribution.map((a) => ({
        area: a.name,
        percentage: a.percentage ?? 0,
        focusHours: a.focusHours ?? 0,
        taskCount: a.taskCount,
        completedTaskCount: a.completedTaskCount,
      })),
      topPriorities: initialPriority.slice(0, 10).map((p) => ({
        title: p.task.title,
        score: p.score,
        urgency: p.urgency,
        reasons: p.reasons,
      })),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mylife-insights-report-${period}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [period, analytics, initialHealth, initialPriority]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        handleExportReport();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleExportReport]);

  const healthScore = initialHealth.overallScore;
  const circumference = 2 * Math.PI * 40;
  const strokeOffset = circumference - (circumference * healthScore) / 100;

  return (
    <div className="flex flex-col w-full pb-16 gap-6 text-gray-200">
      {/* 1. Header & Navigation Command Strip */}
      <section className="flex flex-col gap-4 pb-2 border-b border-white/[0.06]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              <span className="font-mono text-xs text-purple-400 uppercase tracking-widest">
                KECERDASAN &amp; DIAGNOSTIK OPERASIONAL {"//"} MESIN ANALISIS TERPADU
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
              Wawasan &amp; Analitik Hidup
            </h1>
            <p className="text-sm text-gray-400 max-w-3xl leading-relaxed">
              Analisis komprehensif atas eksekusi tugas, pembobotan prioritas cerdas, jadwal waktu, dan indeks kesehatan hidup Anda.
            </p>
          </div>

          {/* Period selector & Action Area */}
          <div className="flex items-center gap-2.5 self-start lg:self-auto shrink-0 flex-wrap">
            <div className="relative">
              <select
                value={period}
                onChange={(e) => handlePeriodChange(e.target.value as InsightPeriod)}
                disabled={loadingPeriod}
                className="px-3.5 py-2 rounded-xl bg-[#131825] border border-white/[0.08] text-xs font-mono text-gray-200 focus:outline-none focus:border-purple-400 cursor-pointer shadow-sm hover:bg-[#1A2133] transition-colors"
              >
                <option value="today">Hari Ini</option>
                <option value="this_week">Rentang: 7 Hari Terakhir</option>
                <option value="this_month">Bulan Ini</option>
                <option value="last_30_days">30 Hari Terakhir</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportReport}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-semibold shadow-sm transition-all hover:shadow-[0_0_16px_rgba(168,85,247,0.35)] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">ios_share</span>
              <span>Ekspor Laporan</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 font-bold">⌘E</span>
            </button>
          </div>
        </div>

        {/* Segmented Navigation Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#131825] border border-white/[0.08] max-w-max overflow-x-auto">
          {[
            { id: "overview", label: "Kesehatan & Energi", icon: "monitor_heart", count: null },
            { id: "priority", label: "Prioritas Cerdas", icon: "psychology", count: initialPriority.length },
            { id: "radar", label: "Diagnostik & Hub", icon: "radar", count: initialConflicts.length > 0 ? initialConflicts.length : null },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono text-xs transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-purple-600 text-white font-semibold shadow-xs"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/[0.1] text-[10px]">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* 2. Banner Deteksi Konflik Waktu (jika ada & tidak diabaikan) */}
      {!dismissedConflict && initialConflicts.length > 0 && (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#221017] via-[#131825] to-[#131825] border border-rose-500/30 p-5 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start md:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_16px_rgba(244,63,94,0.25)]">
                <span className="material-symbols-outlined text-[22px]">warning</span>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-rose-400">
                    Terdeteksi {initialConflicts.length} Konflik Waktu Jadwal
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 uppercase font-bold">
                    RESOLUSI DIPERLUKAN
                  </span>
                </div>
                <ul className="text-xs text-gray-300 space-y-0.5 pt-1">
                  {initialConflicts.map((c) => (
                    <li key={c.id}>• {c.explanation}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
              <button
                type="button"
                onClick={() => setDismissedConflict(true)}
                className="px-3.5 py-2 rounded-xl bg-[#0B0D13] hover:bg-[#1A2133] text-gray-300 hover:text-white font-mono text-xs border border-white/[0.08] transition-colors"
              >
                Abaikan
              </button>
              <Link
                href="/calendar"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-mono text-xs font-semibold border border-rose-500/40 transition-all"
              >
                <span>Buka Kalender</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 1: OVERVIEW */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Analytics Strip (Top Telemetry Metrics) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Stat 1 */}
            <div className="p-5 rounded-2xl bg-[#131825] border border-white/[0.08] shadow-sm space-y-3 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-gray-400">TOTAL SESI FOKUS</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-300 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">timer</span>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white tracking-tight">{analytics.sessions.totalHours}</span>
                  <span className="font-mono text-xs text-indigo-300 uppercase font-semibold">Jam</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400 text-xs font-mono mt-1">
                  <span className="material-symbols-outlined text-[15px]">trending_up</span>
                  <span>{analytics.sessions.totalCount} sesi tercatat</span>
                </div>
              </div>
              <div className="w-full bg-[#0B0D13] h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-400 h-full rounded-full w-[78%]" />
              </div>
            </div>

            {/* Stat 2 */}
            <div className="p-5 rounded-2xl bg-[#131825] border border-white/[0.08] shadow-sm space-y-3 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-gray-400">TINGKAT PENYELESAIAN</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white tracking-tight">{analytics.tasks.completionRate}%</span>
                  <span className="font-mono text-xs text-gray-400">Tuntas</span>
                </div>
                <div className="flex items-center gap-1 text-gray-300 text-xs font-mono mt-1">
                  <span className="text-emerald-400 font-bold">{analytics.tasks.completed} tugas</span>
                  <span className="text-gray-500">tuntas</span>
                </div>
              </div>
              <div className="w-full bg-[#0B0D13] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all"
                  style={{ width: `${analytics.tasks.completionRate}%` }}
                />
              </div>
            </div>

            {/* Stat 3 */}
            <div className="p-5 rounded-2xl bg-[#131825] border border-white/[0.08] shadow-sm space-y-3 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-gray-400">TARGET AKTIF BERGERAK</span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-300 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">track_changes</span>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white tracking-tight">{analytics.goals.active}</span>
                  <span className="font-mono text-xs text-purple-300 uppercase font-semibold">Target</span>
                </div>
                <div className="flex items-center gap-1 text-purple-300 text-xs font-mono mt-1">
                  <span className="material-symbols-outlined text-[15px]">flag</span>
                  <span>{analytics.goals.completed} telah selesai</span>
                </div>
              </div>
              <div className="w-full bg-[#0B0D13] h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full w-[65%]" />
              </div>
            </div>

            {/* Stat 4 */}
            <div className="p-5 rounded-2xl bg-[#131825] border border-white/[0.08] shadow-sm space-y-3 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-gray-400">TUGAS TERLAMBAT</span>
                <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">pending_actions</span>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-rose-400 tracking-tight">{analytics.tasks.overdue}</span>
                  <span className="font-mono text-xs text-rose-400 uppercase font-semibold">Overdue</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400 text-xs font-mono mt-1">
                  <span className="material-symbols-outlined text-[15px] text-amber-400">schedule</span>
                  <span>{analytics.tasks.overdue > 0 ? "Perlu penjadwalan ulang" : "Semua aman tepat waktu"}</span>
                </div>
              </div>
              <div className="w-full bg-[#0B0D13] h-1.5 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full w-[15%]" />
              </div>
            </div>
          </section>

          {/* Bento: Indeks Kesehatan & Diagnostik Operasional */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Indeks Kesehatan Hidup (5 cols) */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-[#131825] border border-white/[0.08] shadow-md flex flex-col justify-between space-y-6">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-emerald-400">vital_signs</span>
                    <h2 className="text-base font-bold text-white">Indeks Kesehatan Hidup</h2>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                    {initialHealth.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Indeks operasional kehidupan berdasarkan konsistensi eksekusi, ketepatan waktu, dan keseimbangan pilar.
                </p>
              </div>

              {/* Giant Score + Radial Gauge SVG */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#0B0D13]/70 border border-white/[0.04] gap-4">
                <div className="space-y-1">
                  <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">SKOR AKUMULASI SISTEM</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-emerald-400 tracking-tighter">{healthScore}</span>
                    <span className="font-mono text-xs text-gray-500">/ 100</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400 text-xs font-mono">
                    <span className="material-symbols-outlined text-[15px]">arrow_upward</span>
                    <span>Status Operasional Optimal</span>
                  </div>
                </div>

                {/* Radial Gauge SVG */}
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      className="text-white/[0.06]"
                      cx="50"
                      cy="50"
                      fill="transparent"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                    />
                    <circle
                      className="text-emerald-400 transition-all duration-1000"
                      cx="50"
                      cy="50"
                      fill="transparent"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeOffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-mono text-xs font-bold text-white">P{healthScore}</span>
                    <span className="font-mono text-[9px] text-gray-400">STABIL</span>
                  </div>
                </div>
              </div>

              {/* Sub-Component Breakdown Progress Bars */}
              <div className="space-y-3 pt-1">
                {Object.values(initialHealth.components).map((comp) => {
                  const pct = Math.round((comp.score / comp.maxScore) * 100);
                  return (
                    <div key={comp.key} className="space-y-1">
                      <div className="flex justify-between font-mono text-xs">
                        <span className="text-gray-300">{comp.label}</span>
                        <span className="text-purple-300 font-bold">{comp.score}/{comp.maxScore}</span>
                      </div>
                      <div className="w-full bg-[#0B0D13] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-emerald-400 h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Diagnostik Operasional Sistem (7 cols) */}
            <div className="lg:col-span-7 p-6 rounded-2xl bg-[#131825] border border-white/[0.08] shadow-md flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-purple-400">troubleshoot</span>
                    <h2 className="text-base font-bold text-white">Diagnostik Operasional Sistem</h2>
                  </div>
                  <p className="text-xs text-gray-400">
                    Pemeriksaan menyeluruh deterministik alur kerja dan deteksi anomali performa.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0B0D13] border border-white/[0.06]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-mono text-[10px] text-emerald-400 uppercase font-bold tracking-wider">LIVE AUDIT</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {/* Kekuatan */}
                <div className="p-4 rounded-xl bg-[#0B0D13]/60 border border-white/[0.04] flex flex-col space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-semibold uppercase">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>Kekuatan Teridentifikasi</span>
                  </div>
                  <ul className="space-y-2 text-xs text-gray-300 flex-1">
                    {initialHealth.strengths.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-[#131825]/80 border border-white/[0.04]">
                        <span className="material-symbols-outlined text-emerald-400 text-[14px] shrink-0 mt-0.5">check_circle</span>
                        <span className="leading-relaxed">{s}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-[11px] text-center border border-emerald-500/20">
                    Efisiensi Eksekusi Optimal
                  </div>
                </div>

                {/* Area Perhatian */}
                <div className="p-4 rounded-xl bg-[#0B0D13]/60 border border-white/[0.04] flex flex-col space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-semibold uppercase">
                    <span className="material-symbols-outlined text-[16px]">priority_high</span>
                    <span>Area Perhatian</span>
                  </div>
                  <ul className="space-y-2 text-xs text-gray-300 flex-1">
                    {initialHealth.warnings.length > 0 ? (
                      initialHealth.warnings.map((w, idx) => (
                        <li key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-[#131825]/80 border border-white/[0.04]">
                          <span className="material-symbols-outlined text-amber-400 text-[14px] shrink-0 mt-0.5">error</span>
                          <span className="leading-relaxed">{w}</span>
                        </li>
                      ))
                    ) : (
                      <li className="p-2 text-xs text-gray-500 italic">Tidak ada peringatan kritis saat ini.</li>
                    )}
                  </ul>
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-300 font-mono text-[11px] text-center border border-amber-500/20">
                    Pertahankan Ritme Harian
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Top 5 Smart Priority Tasks */}
          <section className="p-6 rounded-2xl bg-[#131825] border border-white/[0.08] shadow-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400 text-[18px]">auto_awesome</span>
                  Tugas Prioritas Tertinggi Saat Ini
                </h2>
                <p className="text-xs text-gray-400">
                  Dihitung berdasarkan urgensi tenggat, prioritas, dan keselarasan Target Utama.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("priority")}
                className="text-xs font-mono font-semibold text-purple-400 hover:text-purple-300 transition-colors"
              >
                Lihat Semua ({initialPriority.length}) →
              </button>
            </div>

            <div className="space-y-2.5">
              {initialPriority.slice(0, 5).map((pt) => {
                const scoreBg =
                  pt.score >= 90
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : pt.score >= 80
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-purple-500/20 text-purple-300 border border-purple-500/30";

                return (
                  <div
                    key={pt.task.id}
                    className="p-3.5 rounded-xl bg-[#0B0D13]/70 hover:bg-[#1A2133]/60 border border-white/[0.04] flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-start md:items-center gap-3 min-w-0">
                      <div className={`flex flex-col items-center justify-center w-14 h-12 rounded-lg shrink-0 ${scoreBg}`}>
                        <span className="font-mono text-[8px] uppercase tracking-widest font-bold opacity-80">SKOR</span>
                        <span className="font-mono text-sm font-bold">{pt.score}</span>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs md:text-sm font-semibold text-white truncate">
                          {pt.task.title}
                        </p>
                        <div className="flex flex-wrap gap-1 text-[10px] font-mono text-gray-400">
                          {pt.reasons.map((r, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Link
                      href="/today"
                      className="px-3.5 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-mono transition-colors self-end md:self-auto shrink-0"
                    >
                      Buka di Hari Ini →
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 5. Grafik Distribusi Energi & Waktu Antar Pilar Kehidupan */}
          <section className="p-6 rounded-2xl bg-[#131825] border border-white/[0.08] shadow-md space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#c0c1ff]">pie_chart</span>
                  <h2 className="text-base font-bold text-white">Distribusi Energi &amp; Alokasi Waktu Antar Pilar</h2>
                </div>
                <p className="text-xs text-gray-400">
                  Perbandingan proporsi waktu eksekusi riil dan energi kognitif antar pilar kehidupan dalam periode terpilih.
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-gray-400 bg-[#0B0D13] px-3.5 py-1.5 rounded-xl border border-white/[0.06] self-start md:self-auto shadow-inner">
                <span>TOTAL:</span>
                <span className="text-white font-bold tracking-wide">
                  {analytics.sessions.totalHours > 0 ? `${analytics.sessions.totalHours} JAM TERREKOR` : "BELUM ADA SESI"}
                </span>
              </div>
            </div>

            {/* Multi-segment Stacked Bar */}
            {(() => {
              const displayAreas =
                analytics.areaDistribution.length > 0
                  ? analytics.areaDistribution
                  : [
                      { areaId: "default-1", name: "Karier & Bisnis", color: "#c0c1ff", percentage: 40, focusHours: 0, taskCount: 0, completedTaskCount: 0, goalCount: 0 },
                      { areaId: "default-2", name: "Kesehatan & Fisik", color: "#4edea3", percentage: 25, focusHours: 0, taskCount: 0, completedTaskCount: 0, goalCount: 0 },
                      { areaId: "default-3", name: "Finansial & Aset", color: "#F59E0B", percentage: 20, focusHours: 0, taskCount: 0, completedTaskCount: 0, goalCount: 0 },
                      { areaId: "default-4", name: "Pengembangan Diri", color: "#d0bcff", percentage: 15, focusHours: 0, taskCount: 0, completedTaskCount: 0, goalCount: 0 },
                    ];

              return (
                <>
                  <div className="space-y-2">
                    <div className="w-full h-4 rounded-full bg-[#0B0D13] border border-white/[0.08] overflow-hidden flex gap-0.5 p-0.5 shadow-inner">
                      {displayAreas.map((area, idx, arr) => {
                        const pct = area.percentage ?? 0;
                        if (pct <= 0) return null;
                        return (
                          <div
                            key={area.areaId}
                            className={`h-full transition-all duration-700 ${idx === 0 ? "rounded-l-full" : ""} ${idx === arr.length - 1 ? "rounded-r-full" : ""}`}
                            style={{
                              width: `${pct}%`,
                              backgroundColor: area.color || "#d0bcff",
                            }}
                            title={`${area.name} (${pct}%)`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between font-mono text-[10px] text-gray-500 px-1">
                      <span>0%</span>
                      <span>25%</span>
                      <span>50%</span>
                      <span>75%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Pillar Breakdown Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    {displayAreas.map((area) => (
                      <div
                        key={area.areaId}
                        className="p-4 rounded-xl bg-[#0B0D13]/70 border border-white/[0.05] space-y-2.5 relative overflow-hidden transition-all hover:bg-[#1A2133]/60 group"
                        style={{ borderLeft: `3px solid ${area.color || "#d0bcff"}` }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold text-white truncate max-w-[140px]" title={area.name}>
                            {area.name}
                          </span>
                          <span
                            className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-white/[0.06]"
                            style={{ color: area.color || "#d0bcff" }}
                          >
                            {area.percentage ?? 0}%
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between text-xs text-gray-400 font-mono">
                          <span>Waktu Fokus:</span>
                          <span className="text-white font-semibold">
                            {area.focusHours !== undefined && area.focusHours > 0 ? `${area.focusHours} Jam` : "0.0 Jam"}
                          </span>
                        </div>

                        <div className="w-full bg-[#1e1f26] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min(100, Math.max(8, area.percentage ?? 0))}%`,
                              backgroundColor: area.color || "#d0bcff",
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 pt-0.5">
                          <span>{area.taskCount} tugas</span>
                          <span className="text-emerald-400">{area.completedTaskCount} tuntas</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}

            {/* AI / OS Recommendation Callout */}
            {(() => {
              const areas = analytics.areaDistribution;
              const lowest = [...areas].sort((a, b) => (a.percentage ?? 0) - (b.percentage ?? 0))[0];
              const highest = [...areas].sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))[0];

              return (
                <div className="p-4 rounded-xl bg-[#1e1f26]/60 border border-white/[0.06] flex items-start gap-3.5">
                  <span className="material-symbols-outlined text-[22px] text-amber-400 shrink-0 mt-0.5">lightbulb</span>
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-amber-400 uppercase tracking-wider font-bold">
                      REKOMENDASI SISTEM OS
                    </span>
                    <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
                      {lowest ? (
                        <>
                          Tingkatkan alokasi pada pilar <span className="font-semibold text-emerald-400">{lowest.name}</span> sebesar{" "}
                          <span className="font-mono text-purple-300 font-semibold">+1.5 jam</span> untuk mempertahankan skor keseimbangan hidup di atas{" "}
                          <span className="font-mono font-bold text-emerald-400">85</span> pada evaluasi pekan depan.
                          {highest && highest.areaId !== lowest.areaId && (
                            <span className="text-gray-400 ml-1">
                              Saat ini pilar <span className="text-white">{highest.name}</span> mendominasi sebesar{" "}
                              <span className="text-purple-300 font-semibold">{highest.percentage}%</span> dari total alokasi energi kognitif.
                            </span>
                          )}
                        </>
                      ) : (
                        "Pertahankan ritme harian dan jadwal time-blocking untuk menjaga keseimbangan antar pilar kehidupan."
                      )}
                    </p>
                  </div>
                </div>
              );
            })()}
          </section>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 2: SMART PRIORITY */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === "priority" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-6 shadow-sm space-y-4">
          <div className="border-b border-white/[0.06] pb-3">
            <h2 className="text-base font-bold text-white">Urutan Prioritas Kerja Transparan (Deterministic)</h2>
            <p className="text-xs text-gray-400 font-mono">
              Sistem menghitung pembobotan murni matematis tanpa AI untuk memastikan Anda selalu mengerjakan hal paling bernilai.
            </p>
          </div>

          <div className="space-y-3">
            {initialPriority.map((pt, idx) => (
              <div
                key={pt.task.id}
                className="p-4 rounded-xl bg-[#0B0D13]/70 border border-white/[0.05] flex items-start justify-between gap-4 group hover:border-purple-500/30 transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-mono font-bold text-gray-300">
                    {idx + 1}
                  </span>
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-white">{pt.task.title}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                      <span className="rounded bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-purple-300 font-bold text-[11px]">
                        Skor: {pt.score}
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-400">Status: {pt.task.status}</span>
                      {pt.task.goal && (
                        <>
                          <span className="text-gray-500">•</span>
                          <span className="text-purple-300">Goal: {pt.task.goal.title}</span>
                        </>
                      )}
                      {pt.task.project && (
                        <>
                          <span className="text-gray-500">•</span>
                          <span className="text-indigo-300">Project: {pt.task.project.title}</span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {pt.reasons.map((reason, rIdx) => (
                        <span
                          key={rIdx}
                          className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[11px] font-mono text-gray-400"
                        >
                          ✓ {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <Link
                  href="/today"
                  className="rounded-lg bg-white/[0.06] hover:bg-white/[0.12] px-3 py-1.5 text-xs font-mono text-gray-300 hover:text-white transition-colors border border-white/[0.08]"
                >
                  Eksekusi
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 3: DIAGNOSTIK & RADAR HUB */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === "radar" && (
        <div className="space-y-6">
          {/* Diagnostic Status Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                  <span className="font-mono text-[10px] text-indigo-300 uppercase tracking-widest font-bold">
                    RADAR KESEHATAN OPERASIONAL // DETEKSI ANOMALI
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">Diagnostik Konflik &amp; Keseimbangan Jadwal</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  Sistem secara otomatis memantau jadwal kalender, komitmen sesi fokus, dan batas kognitif harian Anda.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border ${
                  initialConflicts.length > 0
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${initialConflicts.length > 0 ? "bg-rose-400 animate-ping" : "bg-emerald-400"}`} />
                  {initialConflicts.length > 0 ? `${initialConflicts.length} Konflik Waktu Terdeteksi` : "Jadwal Selaras 100%"}
                </span>
              </div>
            </div>

            {/* List of conflicts or all clear */}
            {initialConflicts.length > 0 ? (
              <div className="space-y-3">
                {initialConflicts.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-rose-400 text-[22px] shrink-0 mt-0.5">
                        event_busy
                      </span>
                      <div>
                        <span className="font-bold text-sm text-white">{c.explanation}</span>
                        <p className="text-xs text-rose-300/80 font-mono mt-0.5">
                          Tipe Konflik: {c.conflictType} · Resolusi disarankan untuk mencegah burnout.
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/calendar"
                      className="px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-mono font-semibold self-end sm:self-center transition-all shadow-sm"
                    >
                      Buka Kalender &amp; Sesuaikan
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-400 text-[22px]">verified</span>
                <div>
                  <p className="text-sm font-semibold text-white">Tidak ada benturan waktu dalam 24 jam ke depan.</p>
                  <p className="text-xs text-gray-400 font-mono">Seluruh sesi deep work dan agenda eksternal terpisah dengan aman.</p>
                </div>
              </div>
            )}
          </div>

          {/* Intelligent Hub Navigator (Eliminates Feature Duplication) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Hub Navigasi Eksekusi Terpadu</h3>
                <p className="text-xs text-gray-400 font-mono">
                  Akses langsung ke pusat kerja spesifik tanpa menduplikasi data atau antarmuka.
                </p>
              </div>
              <span className="font-mono text-[10px] text-purple-400 uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg font-bold">
                SINGLE SOURCE OF TRUTH
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Hub Card 1: Hari Ini */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-5 shadow-sm space-y-4 hover:border-purple-500/40 transition-all group flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        <span className="material-symbols-outlined text-[20px]">wb_sunny</span>
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white">Stasiun Eksekusi Hari Ini</h4>
                        <span className="font-mono text-[10px] text-gray-400">HUB MIKRO-EKSEKUSI</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {initialDailyPlan.focusTasks.length} Fokus Aktif
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Kelola time-blocking timeline harian (08:00–18:00), eksekusi tugas utama, dan catat kebiasaan (habits) secara real-time.
                  </p>
                </div>
                <Link
                  href="/today"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-mono text-xs font-semibold border border-white/[0.08] transition-all group-hover:bg-purple-600 group-hover:border-purple-500 shadow-sm"
                >
                  <span>Buka Stasiun Hari Ini</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>

              {/* Hub Card 2: Inbox Catatan */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-5 shadow-sm space-y-4 hover:border-purple-500/40 transition-all group flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        <span className="material-symbols-outlined text-[20px]">inbox</span>
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white">Inbox Catatan &amp; Ide Cepat</h4>
                        <span className="font-mono text-[10px] text-gray-400">HUB PENAMPUNGAN IDE</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      {initialInbox.counts.total} Item Perhatian
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Satu tempat terpusat untuk menampung tangkapan ide spontan, link referensi, dan konversi instan menjadi tugas berstruktur.
                  </p>
                </div>
                <Link
                  href="/capture"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-mono text-xs font-semibold border border-white/[0.08] transition-all group-hover:bg-purple-600 group-hover:border-purple-500 shadow-sm"
                >
                  <span>Buka Inbox Catatan</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>

              {/* Hub Card 3: Analitik Lanjutan */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-5 shadow-sm space-y-4 hover:border-purple-500/40 transition-all group flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <span className="material-symbols-outlined text-[20px]">query_stats</span>
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white">Analitik &amp; Telemetri Performa</h4>
                        <span className="font-mono text-[10px] text-gray-400">HUB ANALISIS TEKNIS</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {analytics.tasks.completionRate}% Tuntas
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Visualisasi grafik bar mingguan, heatmap aktivitas 90 hari gaya GitHub, konsistensi ritme, dan deteksi bottleneck.
                  </p>
                </div>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-mono text-xs font-semibold border border-white/[0.08] transition-all group-hover:bg-purple-600 group-hover:border-purple-500 shadow-sm"
                >
                  <span>Buka Analitik Lanjutan</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>

              {/* Hub Card 4: Ruang Refleksi */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-5 shadow-sm space-y-4 hover:border-purple-500/40 transition-all group flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded-xl bg-sky-500/15 text-sky-300 border border-sky-500/30">
                        <span className="material-symbols-outlined text-[20px]">edit_note</span>
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white">Refleksi &amp; Evaluasi Berkala</h4>
                        <span className="font-mono text-[10px] text-gray-400">HUB RETROSPEKTIF</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                      Evaluasi Rutin
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Ruang retrospektif mingguan dan bulanan untuk mengevaluasi kemenangan, hambatan, dan penyesuaian target jangka panjang.
                  </p>
                </div>
                <Link
                  href="/review"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-mono text-xs font-semibold border border-white/[0.08] transition-all group-hover:bg-purple-600 group-hover:border-purple-500 shadow-sm"
                >
                  <span>Buka Ruang Refleksi</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
