import Link from "next/link";
import AnalyticsBars from "@/app/components/AnalyticsBars";
import { AICommandPanel } from "@/app/components/AICommandPanel";
import { BottleneckInsight } from "@/app/components/core/BottleneckInsight";
import { FocusOrb } from "@/app/components/core/FocusOrb";
import { ActivityHeatmap } from "@/app/components/core/ActivityHeatmap";
import { getDashboardAnalytics } from "@/services/analytics.service";
import { getDashboardData } from "@/services/dashboard.service";
import { requirePageUser } from "@/lib/auth";
import { StatRow } from "@/app/components/ui/StatRow";
import { Icon } from "@/app/components/ui/Icon";
import { HistoryDeleteButton } from "@/app/components/ui/HistoryDeleteButton";
import { formatDuration } from "@/lib/format";

export const dynamic = "force-dynamic";

function formatActivityTime(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ goalId?: string }>;
}) {
  const user = await requirePageUser();
  const { goalId } = await searchParams;
  const [analytics, dashboard] = await Promise.all([
    getDashboardAnalytics({ days: 90, goalId }, user.id),
    getDashboardData(user.id),
  ]);
  const { summary, bottlenecks } = analytics;

  return (
    <div className="flex flex-col w-full space-y-6 pb-16 text-gray-200">
      {/* Tab Navigasi Evaluasi: Jurnal Refleksi vs Grafik Analitik */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#131825] border border-white/[0.08] w-fit font-mono text-xs">
        <Link
          href="/review"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">edit_note</span>
          <span>Jurnal Refleksi</span>
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600/20 text-purple-300 font-semibold border border-purple-500/30 shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">bar_chart</span>
          <span>Grafik &amp; Analitik</span>
        </Link>
      </div>

      {/* 1. Header Layar & Ringkasan Performa */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#94A3B8]">
            <span>MODUL // GRAFIK &amp; ANALITIK</span>
            <span className="text-white/20">{"//"}</span>
            <span className="text-[#d0bcff]">TREN PERFORMA</span>
            <span className="text-white/20">{"//"}</span>
            <div className="flex items-center gap-1.5 rounded-full bg-[#4edea3]/10 px-2 py-0.5 text-[#4edea3]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
              <span className="font-semibold">DATA AKTIF</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Analitik & Performa Perjalanan
          </h1>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Evaluasi komprehensif 30–90 hari terakhir — konsistensi deep work, eliminasi bottleneck, dan laju eksekusi nyata.
          </p>
        </div>

        {goalId && (
          <div className="shrink-0">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1e1f26] border border-white/[0.08] text-xs font-mono text-[#c0c1ff] hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              <Icon name="x" size={13} />
              <span>Hapus Filter Target</span>
            </Link>
          </div>
        )}
      </section>

      {/* 2. Top Bento Telemetry Metrics Cards (4 Metrik Utama) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Konsistensi */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-5 shadow-lg relative overflow-hidden flex flex-col justify-between group hover:border-[#c0c1ff]/30 transition-all">
          <div className="flex items-center justify-between text-[#d0bcff] mb-2">
            <span className="p-2 rounded-xl bg-[#c0c1ff]/10 text-[#d0bcff] border border-[#c0c1ff]/20">
              <Icon name="trendingUp" size={18} />
            </span>
            <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">KONSISTENSI</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{summary.consistency}%</div>
            <p className="text-xs text-gray-400 mt-1 font-mono">
              {summary.activeDays}/{summary.daysInPeriod} hari aktif tercatat
            </p>
          </div>
        </div>

        {/* Metric 2: Waktu Fokus */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-5 shadow-lg relative overflow-hidden flex flex-col justify-between group hover:border-[#4edea3]/30 transition-all">
          <div className="flex items-center justify-between text-[#4edea3] mb-2">
            <span className="p-2 rounded-xl bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20">
              <Icon name="clock" size={18} />
            </span>
            <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">WAKTU FOKUS</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {formatDuration(summary.totalMinutes)}
            </div>
            <p className="text-xs text-gray-400 mt-1 font-mono">
              {summary.sessions} sesi deep work (30 hari)
            </p>
          </div>
        </div>

        {/* Metric 3: Task Selesai */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-5 shadow-lg relative overflow-hidden flex flex-col justify-between group hover:border-[#F59E0B]/30 transition-all">
          <div className="flex items-center justify-between text-[#F59E0B] mb-2">
            <span className="p-2 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">
              <Icon name="check" size={18} />
            </span>
            <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">TUGAS SELESAI</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {summary.completedTasks} <span className="text-sm font-normal text-gray-400">Tugas</span>
            </div>
            <p className="text-xs text-gray-400 mt-1 font-mono">
              Rasio eksekusi {summary.completionRate}%
            </p>
          </div>
        </div>

        {/* Metric 4: Streak Saat Ini */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-5 shadow-lg relative overflow-hidden flex flex-col justify-between group hover:border-[#38bdf8]/30 transition-all">
          <div className="flex items-center justify-between text-[#38bdf8] mb-2">
            <span className="p-2 rounded-xl bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20">
              <Icon name="flame" size={18} />
            </span>
            <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">STREAK AKTIF</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {summary.currentStreak} <span className="text-sm font-normal text-gray-400">Hari</span>
            </div>
            <p className="text-xs text-gray-400 mt-1 font-mono">
              Rekor terbaik: {summary.longestStreak} hari
            </p>
          </div>
        </div>
      </section>

      {/* 3. Layout Grid 2 Kolom (Bento Studio Grid) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ==================================================== */}
        {/* KOLOM KIRI (7 cols / ~60%): HEATMAP, TREN & LOG AKTIVITAS */}
        {/* ==================================================== */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          {/* Bottleneck Alert */}
          <BottleneckInsight bottlenecks={bottlenecks} />

          {/* Activity Heatmap 90 Hari (GitHub Matrix Style) */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#131825] p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-white/[0.06]">
              <div>
                <span className="font-mono text-[10px] text-[#c0c1ff] uppercase tracking-wider font-semibold">
                  KONSISTENSI & RITME HARIAN
                </span>
                <h2 className="text-base font-bold text-white mt-0.5">Matriks Aktivitas 90 Hari</h2>
              </div>
              <span className="font-mono text-[10px] text-gray-500 bg-[#0c0e14] px-2.5 py-1 rounded-full border border-white/[0.06]">
                1 Kotak = 1 Hari Sesi
              </span>
            </div>
            <ActivityHeatmap trends={analytics.trends} days={90} />
          </section>

          {/* Activity Trend Chart */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#131825] p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-white/[0.06]">
              <div>
                <span className="font-mono text-[10px] text-[#c0c1ff] uppercase tracking-wider font-semibold">
                  VISUALISASI LAJU KERJA
                </span>
                <h2 className="text-base font-bold text-white mt-0.5">Tren Aktivitas 14 Hari Terakhir</h2>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] text-gray-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-[#818cf8] to-[#c0c1ff]" />
                  <span>Jam Fokus</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-[#34d399] to-[#4edea3]" />
                  <span>Task Selesai</span>
                </span>
              </div>
            </div>
            <AnalyticsBars trends={analytics.trends} />
          </section>

          {/* Log Aktivitas Terbaru */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#131825] p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-white/[0.06]">
              <div>
                <span className="font-mono text-[10px] text-[#4edea3] uppercase tracking-wider font-semibold">
                  Jejak Eksekusi Terkini
                </span>
                <h2 className="text-base font-bold text-white mt-0.5">Riwayat Sesi & Tugas</h2>
              </div>
              <span className="font-mono text-[10px] text-gray-400">
                {dashboard.recentActivity.length} Entri Terakhir
              </span>
            </div>

            {dashboard.recentActivity.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center bg-[#0c0e14]/50">
                <p className="text-xs font-mono text-gray-400">Belum ada aktivitas tercatat.</p>
              </div>
            ) : (
              <ol className="divide-y divide-white/[0.06]">
                {dashboard.recentActivity.slice(0, 6).map((activity) => (
                  <li key={activity.id} className="flex items-center gap-3.5 py-3 group">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                        activity.kind === "session"
                          ? "bg-[#8B5CF6]/15 text-[#d0bcff] border-[#8B5CF6]/30"
                          : activity.kind === "capture"
                          ? "bg-[#0088cc]/15 text-[#38bdf8] border-[#0088cc]/30"
                          : "bg-[#00a572]/15 text-[#4edea3] border-[#00a572]/30"
                      }`}
                    >
                      <Icon
                        name={
                          activity.kind === "session"
                            ? "clock"
                            : activity.kind === "capture"
                            ? "inbox"
                            : "check"
                        }
                        size={14}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-white group-hover:text-[#d0bcff] transition-colors">
                        {activity.label}
                      </p>
                      <p className="truncate text-[11px] text-gray-400 font-mono mt-0.5">
                        {activity.detail}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-gray-500">
                      {formatActivityTime(activity.timestamp)}
                    </span>
                    {activity.kind !== "task" && (
                      <HistoryDeleteButton
                        path={
                          activity.kind === "session"
                            ? `/api/sessions/${activity.entityId}`
                            : `/api/captures/${activity.entityId}`
                        }
                        message={
                          activity.kind === "session"
                            ? "Hapus sesi ini?"
                            : "Hapus catatan ini?"
                        }
                        toastMessage={
                          activity.kind === "session"
                            ? "Sesi dihapus."
                            : "Catatan dihapus."
                        }
                        aria-label="Hapus dari riwayat"
                      />
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* ==================================================== */}
        {/* KOLOM KANAN (5 cols / ~40%): STREAK, SUMMARY & AI     */}
        {/* ==================================================== */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          {/* 1. Streak Hero Card */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#131825] p-6 shadow-xl relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#F59E0B]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#F59E0B] font-bold">
                MOMENTUM & RITME HARIAN
              </span>
              <span className="flex items-center gap-1 font-mono text-[10px] text-[#4edea3]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
                <span>AKTIF</span>
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-6xl font-bold tracking-tight leading-none text-[#F59E0B] font-mono">
                {summary.currentStreak}
              </span>
              <div>
                <p className="text-sm font-bold text-white">Hari Berturut-Turut</p>
                <p className="text-xs font-mono text-gray-400 mt-0.5">
                  Rekor terpanjang: {summary.longestStreak} hari
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-2 pt-3 border-t border-white/[0.06]">
              <div className="flex gap-1.5">
                {Array.from({ length: 7 }).map((_, i) => {
                  const active = i < Math.min(summary.currentStreak, 7);
                  return (
                    <span
                      key={i}
                      className={`h-2.5 w-2.5 rounded-full transition-colors ${
                        active ? "bg-[#F59E0B] shadow-xs shadow-amber-500/50" : "bg-[#1e1f26]"
                      }`}
                      title={`Hari ke-${i + 1}`}
                    />
                  );
                })}
              </div>
              <span className="font-mono text-[11px] text-gray-400">
                {summary.activeDays}/{summary.daysInPeriod} hari aktif (30 hari)
              </span>
            </div>
          </section>

          {/* 2. Ringkasan 30 Hari & Focus Orb */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#131825] p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between gap-4 mb-5 pb-3 border-b border-white/[0.06]">
              <div>
                <span className="font-mono text-[10px] text-[#c0c1ff] uppercase tracking-wider font-semibold">
                  RINGKASAN PERFORMA
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">30 Hari Terakhir</h3>
                <p className="text-xs font-mono text-gray-400 mt-1">
                  {summary.completedTasks} task · {formatDuration(summary.totalMinutes)} fokus
                </p>
              </div>

              <FocusOrb
                value={summary.completionRate}
                size={60}
                stroke={5}
                tone="success"
                label={`Penyelesaian ${summary.completionRate} persen`}
              >
                <div className="flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-bold font-mono text-[#4edea3]">
                    {summary.completionRate}%
                  </span>
                  <span className="text-[7px] uppercase tracking-wider font-mono text-gray-400">
                    selesai
                  </span>
                </div>
              </FocusOrb>
            </div>

            <dl className="space-y-0">
              <StatRow
                icon="clock"
                tone="primary"
                label="Waktu fokus"
                value={formatDuration(summary.totalMinutes)}
                hint="dalam 30 hari"
              />
              <StatRow
                icon="check"
                tone="success"
                label="Task selesai"
                value={String(summary.completedTasks)}
                hint="tuntas"
              />
              <StatRow
                icon="trendingUp"
                tone="primary"
                label="Konsistensi"
                value={`${summary.consistency}%`}
                hint={`${summary.activeDays}/${summary.daysInPeriod} hari aktif`}
              />
              <StatRow
                icon="gauge"
                tone="warning"
                label="Rata-rata sesi"
                value={`${summary.averageSessionMinutes} mnt`}
              />
              {summary.averageUnderstanding !== null && (
                <StatRow
                  icon="sparkles"
                  tone="ai"
                  label="Pemahaman rata-rata"
                  value={`${summary.averageUnderstanding}/5`}
                />
              )}
            </dl>
          </section>

          {/* 3. Sesi Deep Work Terbaru */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#131825] p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-white/[0.06]">
              <div>
                <span className="font-mono text-[10px] text-[#d0bcff] uppercase tracking-wider font-semibold">
                  DEEP WORK LOGS
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">Sesi Fokus Terkini</h3>
              </div>
              <span className="font-mono text-[10px] text-[#F59E0B]">
                {formatDuration(dashboard.studyMinutesToday)} hari ini
              </span>
            </div>

            {dashboard.recentSessions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/[0.08] p-6 text-center bg-[#0c0e14]/50">
                <p className="text-xs font-mono text-gray-400">Belum ada sesi fokus tercatat.</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {dashboard.recentSessions.slice(0, 5).map((session) => (
                  <li
                    key={session.id}
                    className="flex items-start justify-between gap-3 py-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/tasks/${session.task.id}`}
                        className="block truncate text-xs font-bold text-white group-hover:text-[#d0bcff] transition-colors"
                      >
                        {session.task.title}
                      </Link>
                      <p className="mt-1 text-[11px] text-gray-400 font-mono truncate">
                        {session.task.stage?.goal.title} ·{" "}
                        <span className="text-[#F59E0B]">
                          {session.durationMinutes === null
                            ? "Sedang Aktif"
                            : formatDuration(session.durationMinutes)}
                        </span>
                      </p>
                    </div>
                    <HistoryDeleteButton
                      path={`/api/sessions/${session.id}`}
                      message="Hapus sesi ini dari riwayat?"
                      toastMessage="Sesi dihapus."
                      aria-label="Hapus sesi"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 4. AI Command Panel (Asisten Cybernetic) */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#131825] p-5 shadow-xl relative overflow-hidden">
            <div className="mb-3 flex items-center gap-2.5 pb-2 border-b border-white/[0.06]">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-sm">
                <Icon name="sparkles" size={15} />
              </span>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-wider text-[#d0bcff]">
                  SISTEM ASISTEN
                </p>
                <p className="text-xs font-bold text-white">Kendalikan dengan Bahasa Alami</p>
              </div>
            </div>
            <AICommandPanel initialContext={{ goalId }} />
          </section>
        </div>
      </div>
    </div>
  );
}
