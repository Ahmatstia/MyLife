import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import {
  getWeekPeriod,
  getPeriodMetrics,
  getPeriodReview,
  getWeeklyReviewOverview,
  getAllReviews,
} from "@/services/review.service";
import { getDashboardAnalytics } from "@/services/analytics.service";
import { getDashboardData } from "@/services/dashboard.service";
import { calculateGoalProgress } from "@/services/progress.service";
import {
  getInsightsAnalytics,
  getPrioritizedTasks,
  getInsightsDailyPlan,
  getInsightsConflicts,
  getInsightsUnifiedInbox,
  getInsightsLifeHealth,
} from "@/services/insights/insights.service";
import { getActivities } from "@/services/activity.service";
import { getAreas } from "@/services/area.service";
import { getProjects } from "@/services/project.service";
import { Icon } from "@/app/components/ui/Icon";
import { Button } from "@/app/components/ui/Button";
import { ProgressBar } from "@/app/components/ui/Progress";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { StatRow } from "@/app/components/ui/StatRow";
import { FocusOrb } from "@/app/components/core/FocusOrb";
import { ActivityHeatmap } from "@/app/components/core/ActivityHeatmap";
import { BottleneckInsight } from "@/app/components/core/BottleneckInsight";
import { NotesTimeline, type TimelineEntry } from "@/app/components/core/NotesTimeline";
import AnalyticsBars from "@/app/components/AnalyticsBars";
import InsightsDashboard from "@/app/(app)/insights/InsightsDashboard";
import { ActivityManager } from "@/app/(app)/activity/ActivityManager";
import { AICommandPanel } from "@/app/components/AICommandPanel";
import { formatDuration } from "@/lib/format";

export const dynamic = "force-dynamic";

type Tab = "review" | "statistik" | "wawasan" | "log";

const VALID_TABS: Tab[] = ["review", "statistik", "wawasan", "log"];

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "review",    label: "Review Mingguan", icon: "edit_note" },
  { id: "statistik", label: "Statistik",        icon: "bar_chart" },
  { id: "wawasan",   label: "Wawasan AI",       icon: "psychology" },
  { id: "log",       label: "Log Aktivitas",    icon: "history" },
];

function formatRange(start: Date, end: Date) {
  const fmt = new Intl.DateTimeFormat("id-ID", { month: "short", day: "numeric" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requirePageUser();
  const { tab: rawTab } = await searchParams;
  const activeTab: Tab = (VALID_TABS.includes(rawTab as Tab) ? rawTab : "review") as Tab;
  const now = new Date();

  // ── REVIEW ────────────────────────────────────────────────────────────────
  let reviewData: Awaited<ReturnType<typeof buildReviewData>> | null = null;
  if (activeTab === "review") {
    reviewData = await buildReviewData(user.id, now);
  }

  // ── STATISTIK ─────────────────────────────────────────────────────────────
  let statistikData: Awaited<ReturnType<typeof buildStatistikData>> | null = null;
  if (activeTab === "statistik") {
    statistikData = await buildStatistikData(user.id);
  }

  // ── WAWASAN ───────────────────────────────────────────────────────────────
  let wawasanData: Awaited<ReturnType<typeof buildWawasanData>> | null = null;
  if (activeTab === "wawasan") {
    wawasanData = await buildWawasanData(user.id, now);
  }

  // ── LOG ───────────────────────────────────────────────────────────────────
  let logData: Awaited<ReturnType<typeof buildLogData>> | null = null;
  if (activeTab === "log") {
    logData = await buildLogData(user.id);
  }

  return (
    <div className="flex flex-col w-full space-y-6 pb-16 text-gray-200">
      {/* PAGE HEADER */}
      <section className="border-b border-white/[0.08] pb-6">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#94A3B8] mb-2">
          <span>MODUL // EVALUASI & REFLEKSI</span>
          <span className="text-white/20">{"//"}</span>
          <div className="flex items-center gap-1.5 rounded-full bg-[#4edea3]/10 px-2 py-0.5 text-[#4edea3]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4edea3] animate-pulse" />
            <span className="font-semibold">DATA AKTIF</span>
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Progress & Refleksi</h1>
        <p className="text-sm text-[#94A3B8] leading-relaxed mt-2">
          Satu tempat untuk semua — review mingguan, statistik performa, wawasan AI, dan log aktivitasmu.
        </p>
      </section>

      {/* TAB NAVIGATOR */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#131825] border border-white/[0.08] w-fit font-mono text-xs flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/progress?tab=${t.id}`}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? "bg-purple-600/20 text-purple-300 font-semibold border border-purple-500/30 shadow-sm"
                : "text-[#94A3B8] hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
            <span>{t.label}</span>
          </Link>
        ))}
      </div>

      {/* ── TAB: REVIEW MINGGUAN ─────────────────────────────────────────── */}
      {activeTab === "review" && reviewData && <ReviewTab data={reviewData} />}

      {/* ── TAB: STATISTIK ───────────────────────────────────────────────── */}
      {activeTab === "statistik" && statistikData && <StatistikTab data={statistikData} />}

      {/* ── TAB: WAWASAN AI ──────────────────────────────────────────────── */}
      {activeTab === "wawasan" && wawasanData && (
        <InsightsDashboard
          initialAnalytics={wawasanData.analytics}
          initialPriority={wawasanData.priority}
          initialDailyPlan={wawasanData.dailyPlan}
          initialConflicts={wawasanData.conflicts}
          initialInbox={wawasanData.inbox}
          initialHealth={wawasanData.health}
        />
      )}

      {/* ── TAB: LOG AKTIVITAS ───────────────────────────────────────────── */}
      {activeTab === "log" && logData && (
        <ActivityManager
          initialActivities={logData.activities}
          areas={logData.areas}
          projects={logData.projects}
        />
      )}
    </div>
  );
}

// ── DATA FETCHERS ──────────────────────────────────────────────────────────────

async function buildReviewData(userId: string, now: Date) {
  const period = getWeekPeriod(now);
  const [overview, allPastReviews] = await Promise.all([
    getWeeklyReviewOverview(userId),
    getAllReviews(userId, 15),
  ]);
  const { goals, reviewedGoalIds: reviewed, captures, sessionReflections } = overview;
  const rows = await Promise.all(
    goals.map(async (goal) => {
      const [metrics, review] = await Promise.all([
        getPeriodMetrics(goal.id, period.periodStart, period.periodEnd, userId),
        getPeriodReview(goal.id, period.periodStart, period.periodEnd, userId),
      ]);
      return { goal, metrics, review, progress: calculateGoalProgress(goal.stages) };
    })
  );
  const totalMinutes = rows.reduce((s, r) => s + r.metrics.learningMinutes, 0);
  const totalTasks = rows.reduce((s, r) => s + r.metrics.tasksCompleted, 0);
  const timelineEntries: TimelineEntry[] = [
    ...captures.map((c): TimelineEntry => ({
      id: `capture-${c.id}`, kind: "capture", title: "Catatan Cepat",
      content: c.content, timestamp: c.createdAt.toISOString(), entityId: c.id,
    })),
    ...sessionReflections.map((s): TimelineEntry => ({
      id: `session-${s.id}`, kind: "session", title: s.task.title,
      tag: s.task.stage?.goal.title,
      subtitle: s.understanding !== null ? `Tingkat pemahaman: ${s.understanding}/5` : undefined,
      content: s.obstacle ? `Hambatan: ${s.obstacle}` : "Sesi belajar selesai.",
      timestamp: (s.endedAt ?? s.startedAt).toISOString(), entityId: s.id,
    })),
    ...allPastReviews.map((r): TimelineEntry => ({
      id: `review-${r.id}`, kind: "review", title: `Refleksi: ${r.goal.title}`,
      tag: formatRange(r.periodStart, r.periodEnd),
      content: [
        r.wentWell ? `🏆 Berjalan baik: ${r.wentWell}` : "",
        r.difficulties ? `⚠️ Tantangan: ${r.difficulties}` : "",
        r.improvements ? `💡 Perbaikan: ${r.improvements}` : "",
        r.nextFocus ? `🎯 Fokus Berikutnya: ${r.nextFocus}` : "",
      ].filter(Boolean).join("\n\n") || "Refleksi mingguan selesai tercatat.",
      timestamp: r.createdAt.toISOString(), entityId: r.id,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return { period, rows, reviewed, totalMinutes, totalTasks, timelineEntries };
}

async function buildStatistikData(userId: string) {
  const [analytics, dashboard] = await Promise.all([
    getDashboardAnalytics({ days: 90 }, userId),
    getDashboardData(userId),
  ]);
  return { analytics, dashboard, summary: analytics.summary, bottlenecks: analytics.bottlenecks };
}

async function buildWawasanData(userId: string, now: Date) {
  const [analytics, priority, dailyPlan, conflicts, inbox, health] = await Promise.all([
    getInsightsAnalytics("this_week", undefined, undefined, userId),
    getPrioritizedTasks({ limit: 20, includeCompleted: false }, userId),
    getInsightsDailyPlan(now, userId),
    getInsightsConflicts(now, 1, userId),
    getInsightsUnifiedInbox("ALL", 50, userId),
    getInsightsLifeHealth(30, userId),
  ]);
  return { analytics, priority, dailyPlan, conflicts, inbox, health };
}

async function buildLogData(userId: string) {
  const [activities, areas, projects] = await Promise.all([
    getActivities(userId, { limit: 100 }),
    getAreas(userId, { isActive: true }),
    getProjects(userId),
  ]);
  return { activities, areas, projects };
}

// ── REVIEW TAB COMPONENT ──────────────────────────────────────────────────────

function ReviewTab({ data }: { data: Awaited<ReturnType<typeof buildReviewData>> }) {
  const { rows, reviewed, totalMinutes, totalTasks, timelineEntries } = data;
  return (
    <div className="space-y-6">
      {/* Strategic Direction Bridge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/25 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="text-base shrink-0">🧭</span>
          <div>
            <span className="font-bold text-white">Refleksi Operasional Mingguan:</span>
            <span className="text-[#94A3B8] ml-1.5">Evaluasi fokus & kemajuan target 7 hari terakhir.</span>
          </div>
        </div>
        <Link
          href="/direction"
          className="inline-flex items-center gap-1 text-[#d0bcff] hover:text-white font-semibold transition-colors shrink-0"
        >
          <span>Refleksi Arah & Visi Hidup</span>
          <span>→</span>
        </Link>
      </div>

      {/* Metrics strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Status Review", color: "text-[#d0bcff]", icon: "check",
            value: `${reviewed.size}/${rows.length}`,
            sub: rows.length > 0 && reviewed.size === rows.length
              ? "✓ Semua target telah direview"
              : `${rows.length - reviewed.size} target menunggu review`,
          },
          {
            label: "Waktu Fokus", color: "text-[#4edea3]", icon: "clock",
            value: formatDuration(totalMinutes), sub: "Sesi deep work tercatat",
          },
          {
            label: "Tugas Selesai", color: "text-[#F59E0B]", icon: "layers",
            value: String(totalTasks), sub: "Task tuntas minggu ini",
          },
          {
            label: "Arsip Log", color: "text-[#F43F5E]", icon: "inbox",
            value: String(timelineEntries.length), sub: "Catatan & sesi terekam",
          },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-white/[0.08] bg-[#131825] p-4 shadow-lg">
            <div className={`flex items-center justify-between ${m.color} mb-1`}>
              <span className="font-mono text-[10px] text-[#94A3B8] uppercase">{m.label}</span>
              <Icon name={m.icon as "check"} size={16} />
            </div>
            <div className="text-2xl font-bold text-white">{m.value}</div>
            <div className={`text-[11px] font-mono ${m.color} mt-1`}>{m.sub}</div>
          </div>
        ))}
      </section>

      {/* Goal review cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Target Utama Dalam Siklus</h2>
          <span className="font-mono text-xs text-[#94A3B8]">{rows.length} Target Aktif</span>
        </div>
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.08] bg-[#131825]/40 p-10 text-center">
            <EmptyState icon="sparkles" title="Belum ada target aktif"
              description="Setelah kamu memiliki target aktif, refleksi mingguan akan tampil di sini." />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rows.map(({ goal, metrics, review, progress }, index) => {
              const done = !!review;
              return (
                <div key={goal.id} className={`flex flex-col justify-between rounded-2xl border p-5 shadow-lg transition-all hover:border-white/[0.2] ${
                  done ? "border-[#4edea3]/30 bg-gradient-to-br from-[#131825] to-[#4edea3]/[0.06]" : "border-white/[0.08] bg-[#131825]"
                }`}>
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold font-mono ${
                          done ? "bg-[#4edea3] text-[#0B0D13]" : "bg-white/[0.08] text-[#94A3B8]"
                        }`}>
                          {done ? <Icon name="check" size={13} strokeWidth={3} /> : index + 1}
                        </span>
                        <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-[#94A3B8]">
                          {goal.type}
                        </span>
                      </div>
                      {done ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#4edea3]/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#4edea3] border border-[#4edea3]/30">✓ Sudah Direview</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#F59E0B] border border-[#F59E0B]/30">Menunggu Review</span>
                      )}
                    </div>
                    <Link href={`/goals/${goal.id}`} className="block font-bold text-white text-[16px] hover:text-[#d0bcff] transition-colors line-clamp-2">
                      {goal.title}
                    </Link>
                    <p className="mt-2 font-mono text-[12px] text-[#94A3B8]">
                      {formatDuration(metrics.learningMinutes)} fokus · {metrics.tasksCompleted} task tuntas minggu ini
                    </p>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#94A3B8] mb-1.5">
                        <span>Capaian Kumulatif</span>
                        <span className="font-bold text-white">{progress}%</span>
                      </div>
                      <ProgressBar value={progress} size="sm" tone={done ? "success" : "primary"} />
                    </div>
                  </div>
                  <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="font-mono text-[11px] text-[#64748B]">ID: {goal.id.slice(-6)}</span>
                    <Link href={`/goals/${goal.id}/reviews`}>
                      <Button size="sm" variant={done ? "secondary" : "ai"} icon={done ? "check" : "sparkles"}>
                        {done ? "Sunting review" : "Tulis review"}
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Timeline */}
      <div className="border-t border-white/[0.08] pt-10">
        <NotesTimeline entries={timelineEntries} />
      </div>
    </div>
  );
}

// ── STATISTIK TAB COMPONENT ────────────────────────────────────────────────────

function StatistikTab({ data }: { data: Awaited<ReturnType<typeof buildStatistikData>> }) {
  const { analytics, dashboard, summary, bottlenecks } = data;
  return (
    <div className="space-y-6">
      {/* 4 Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "KONSISTENSI", color: "#c0c1ff", icon: "trendingUp", value: `${summary.consistency}%`, sub: `${summary.activeDays}/${summary.daysInPeriod} hari aktif` },
          { label: "WAKTU FOKUS", color: "#4edea3", icon: "clock", value: formatDuration(summary.totalMinutes), sub: `${summary.sessions} sesi deep work (90 hari)` },
          { label: "TUGAS SELESAI", color: "#F59E0B", icon: "check", value: `${summary.completedTasks} Tugas`, sub: `Rasio eksekusi ${summary.completionRate}%` },
          { label: "STREAK AKTIF", color: "#38bdf8", icon: "flame", value: `${summary.currentStreak} Hari`, sub: `Rekor terbaik: ${summary.longestStreak} hari` },
        ].map((m) => (
          <div key={m.label} className={`rounded-2xl border border-white/[0.08] bg-[#131825] p-5 shadow-lg flex flex-col justify-between group transition-all`} style={{ "--hover-color": m.color } as React.CSSProperties}>
            <div className="flex items-center justify-between mb-2" style={{ color: m.color }}>
              <span className="p-2 rounded-xl border" style={{ backgroundColor: `${m.color}1a`, borderColor: `${m.color}33`, color: m.color }}>
                <Icon name={m.icon as "clock"} size={18} />
              </span>
              <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">{m.label}</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-white font-mono">{m.value}</div>
              <p className="text-xs text-gray-400 mt-1 font-mono">{m.sub}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Charts 2-col grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 flex flex-col gap-6">
          <BottleneckInsight bottlenecks={bottlenecks} />
          <section className="rounded-2xl border border-white/[0.08] bg-[#131825] p-6 shadow-xl">
            <div className="mb-5 pb-3 border-b border-white/[0.06]">
              <span className="font-mono text-[10px] text-[#c0c1ff] uppercase tracking-wider font-semibold">KONSISTENSI & RITME HARIAN</span>
              <h2 className="text-base font-bold text-white mt-0.5">Matriks Aktivitas 90 Hari</h2>
            </div>
            <ActivityHeatmap trends={analytics.trends} days={90} />
          </section>
          <section className="rounded-2xl border border-white/[0.08] bg-[#131825] p-6 shadow-xl">
            <div className="mb-5 pb-3 border-b border-white/[0.06]">
              <span className="font-mono text-[10px] text-[#c0c1ff] uppercase tracking-wider font-semibold">VISUALISASI LAJU KERJA</span>
              <h2 className="text-base font-bold text-white mt-0.5">Tren Aktivitas 14 Hari Terakhir</h2>
            </div>
            <AnalyticsBars trends={analytics.trends} />
          </section>
        </div>

        <div className="xl:col-span-5 flex flex-col gap-6">
          {/* Streak hero */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#131825] p-6 shadow-xl relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#F59E0B]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#F59E0B] font-bold">MOMENTUM & RITME HARIAN</span>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-6xl font-bold tracking-tight leading-none text-[#F59E0B] font-mono">{summary.currentStreak}</span>
              <div>
                <p className="text-sm font-bold text-white">Hari Berturut-Turut</p>
                <p className="text-xs font-mono text-gray-400 mt-0.5">Rekor terpanjang: {summary.longestStreak} hari</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-2 pt-3 border-t border-white/[0.06]">
              <div className="flex gap-1.5">
                {Array.from({ length: 7 }).map((_, i) => (
                  <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < Math.min(summary.currentStreak, 7) ? "bg-[#F59E0B]" : "bg-[#1e1f26]"}`} />
                ))}
              </div>
              <span className="font-mono text-[11px] text-gray-400">{summary.activeDays}/{summary.daysInPeriod} hari aktif</span>
            </div>
          </section>

          {/* Performance summary */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#131825] p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4 mb-5 pb-3 border-b border-white/[0.06]">
              <div>
                <span className="font-mono text-[10px] text-[#c0c1ff] uppercase tracking-wider font-semibold">RINGKASAN PERFORMA</span>
                <h3 className="text-base font-bold text-white mt-0.5">90 Hari Terakhir</h3>
              </div>
              <FocusOrb value={summary.completionRate} size={60} stroke={5} tone="success" label={`${summary.completionRate}% selesai`}>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold font-mono text-[#4edea3]">{summary.completionRate}%</span>
                  <span className="text-[7px] uppercase tracking-wider font-mono text-gray-400">selesai</span>
                </div>
              </FocusOrb>
            </div>
            <dl className="space-y-0">
              <StatRow icon="clock" tone="primary" label="Waktu fokus" value={formatDuration(summary.totalMinutes)} hint="dalam 90 hari" />
              <StatRow icon="check" tone="success" label="Task selesai" value={String(summary.completedTasks)} hint="tuntas" />
              <StatRow icon="trendingUp" tone="primary" label="Konsistensi" value={`${summary.consistency}%`} hint={`${summary.activeDays}/${summary.daysInPeriod} hari aktif`} />
              <StatRow icon="gauge" tone="warning" label="Rata-rata sesi" value={`${summary.averageSessionMinutes} mnt`} />
              {summary.averageUnderstanding !== null && (
                <StatRow icon="sparkles" tone="ai" label="Pemahaman rata-rata" value={`${summary.averageUnderstanding}/5`} />
              )}
            </dl>
          </section>

          {/* Recent sessions */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#131825] p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-white/[0.06]">
              <div>
                <span className="font-mono text-[10px] text-[#d0bcff] uppercase tracking-wider font-semibold">DEEP WORK LOGS</span>
                <h3 className="text-sm font-bold text-white mt-0.5">Sesi Fokus Terkini</h3>
              </div>
              <span className="font-mono text-[10px] text-[#F59E0B]">{formatDuration(dashboard.studyMinutesToday)} hari ini</span>
            </div>
            {dashboard.recentSessions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/[0.08] p-6 text-center bg-[#0c0e14]/50">
                <p className="text-xs font-mono text-gray-400">Belum ada sesi fokus tercatat.</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {dashboard.recentSessions.slice(0, 5).map((session) => (
                  <li key={session.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/tasks/${session.task.id}`} className="block truncate text-xs font-bold text-white hover:text-[#d0bcff] transition-colors">
                        {session.task.title}
                      </Link>
                      <p className="mt-1 text-[11px] text-gray-400 font-mono truncate">
                        {session.task.stage?.goal.title} · <span className="text-[#F59E0B]">{session.durationMinutes === null ? "Sedang Aktif" : formatDuration(session.durationMinutes)}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* AI Command */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#131825] p-5 shadow-xl">
            <div className="mb-3 flex items-center gap-2.5 pb-2 border-b border-white/[0.06]">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
                <Icon name="sparkles" size={15} />
              </span>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-wider text-[#d0bcff]">SISTEM ASISTEN</p>
                <p className="text-xs font-bold text-white">Kendalikan dengan Bahasa Alami</p>
              </div>
            </div>
            <AICommandPanel initialContext={{}} />
          </section>
        </div>
      </div>
    </div>
  );
}
