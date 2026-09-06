import Link from "next/link";
import { FocusPanel } from "@/app/components/core/FocusPanel";
import { DailyQuickStart } from "@/app/components/core/DailyQuickStart";
import { SessionFocusMode } from "@/app/components/core/SessionFocusMode";
import { NextActionSpotlight } from "@/app/components/core/NextActionSpotlight";
import { FocusOrb } from "@/app/components/core/FocusOrb";
import QuickCapture from "@/app/components/QuickCapture";
import { getToday } from "@/services/today.service";
import { getRecentCaptures } from "@/services/capture.service";
import { getTodayInsightsSummary } from "@/services/insights/insights.service";
import { requirePageUser } from "@/lib/auth";
import { Icon } from "@/app/components/ui/Icon";
import { StatRow } from "@/app/components/ui/StatRow";
import { HistoryDeleteButton } from "@/app/components/ui/HistoryDeleteButton";
import { NeedsAttentionCard, type NeedsAttentionItem } from "@/app/components/core/NeedsAttentionCard";
import { findNotifications } from "@/repositories/notification.repository";
import { formatDuration } from "@/lib/format";
import { getAreas } from "@/services/area.service";
import { getProjects } from "@/services/project.service";
import { TodayTaskCreator } from "@/app/components/today/TodayTaskCreator";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(value);
}

function formatCaptureTime(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function TodayPage() {
  const user = await requirePageUser();
  const [today, recentCaptures, insightsSummary, unreadNotifs, areas, allProjects] = await Promise.all([
    getToday(new Date(), user.id),
    getRecentCaptures(user.id, 6),
    getTodayInsightsSummary(user.id),
    findNotifications({ userId: user.id, isRead: false, limit: 3 }),
    getAreas(user.id, { isActive: true }),
    getProjects(user.id),
  ]);

  const projects = allProjects
    .filter((p) => p.status !== "COMPLETED")
    .map((p) => ({ id: p.id, title: p.title }));

  const primaryFocus = today.focusTasks[0]?.task;
  const ranked = today.nextAction;

  const sessionTask = today.currentSession
    ? {
        id: today.currentSession.taskId,
        name: today.currentSession.task.title,
        goalName: today.currentSession.task.stage?.goal.title,
        stageName: today.currentSession.task.stage?.name,
      }
    : primaryFocus
      ? {
          id: primaryFocus.id,
          name: primaryFocus.title,
          goalName: primaryFocus.stage?.goal.title,
          stageName: primaryFocus.stage?.name,
        }
      : ranked
        ? {
            id: ranked.taskId,
            name: ranked.taskName,
            goalName: ranked.goalName,
            stageName: ranked.stageName,
          }
        : null;

  const nextActionCard = ranked
    ? {
        taskId: ranked.taskId,
        goalId: ranked.goalId,
        goalName: ranked.goalName,
        stageName: ranked.stageName,
        taskName: ranked.taskName,
        priority: ranked.priority,
        estimatedMinutes: ranked.estimatedMinutes,
        startedAt: ranked.startedAt,
      }
    : null;

  const focusPct =
    today.focusTotal === 0
      ? null
      : Math.round((today.focusCompleted / today.focusTotal) * 100);

  const quickStartTasks = today.availableTasks.map((t) => ({
    id: t.id,
    title: t.title,
    name: t.title,
    goalName: t.stage?.goal.title ?? "",
    stageName: t.stage?.name ?? "",
    priority: t.priority,
    estimatedHours: t.estimatedHours,
  }));

  const needsAttentionItems: NeedsAttentionItem[] = [];

  // 1. Overdue tasks
  for (const t of today.overdueTasks.slice(0, 3)) {
    needsAttentionItems.push({
      id: `overdue-${t.id}`,
      type: "OVERDUE_TASK",
      title: t.title,
      subtitle: `Tenggat terlewat${t.dueDate ? ` (${t.dueDate.toISOString().slice(0, 10)})` : ""}`,
      linkUrl: `/tasks/${t.id}`,
      severity: t.priority === "URGENT" ? "URGENT" : "WARNING",
    });
  }

  // 2. Unread notifications
  for (const n of unreadNotifs.slice(0, 2)) {
    needsAttentionItems.push({
      id: `notif-${n.id}`,
      type: "URGENT_NOTIFICATION",
      title: n.title,
      subtitle: n.message,
      linkUrl: n.linkUrl || "/notifications",
      severity: n.severity === "URGENT" ? "URGENT" : n.severity === "WARNING" ? "WARNING" : "INFO",
    });
  }

  // 3. Active session
  if (today.currentSession) {
    needsAttentionItems.push({
      id: `session-${today.currentSession.id}`,
      type: "ACTIVE_SESSION",
      title: `Sesi Berjalan: ${today.currentSession.task.title}`,
      subtitle: "Fokus sedang aktif. Klik untuk kembali ke panel timer.",
      linkUrl: "/focus",
      severity: "INFO",
    });
  }

  // 4. Incomplete Daily Focus
  if (today.focusTotal > 0 && today.focusCompleted < today.focusTotal) {
    needsAttentionItems.push({
      id: "focus-reminder",
      type: "DAILY_FOCUS",
      title: "Fokus Harian Terbuka",
      subtitle: `${today.focusTotal - today.focusCompleted} task fokus belum selesai`,
      linkUrl: "/focus",
      severity: "INFO",
    });
  }

  return (
    <div className="lg:grid lg:grid-cols-[1fr_268px] lg:items-start lg:gap-5">
      {/* Left — main focus zone */}
      <div className="min-w-0 space-y-5">
        {/* Page header */}
        <header className="rounded-2xl border border-warning-100 bg-gradient-to-br from-warning-50 via-white to-white p-5 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow text-warning-600">Hari Ini</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-surface-900 sm:text-3xl">
                {formatDate(today.date)}
              </h1>
            </div>
            {/* Focus progress pill */}
            <div className="flex items-center gap-2">
              {today.focusTotal > 0 ? (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold shadow-sm ${
                    today.focusCompleted === today.focusTotal
                      ? "border-success-200 bg-success-50 text-success-700"
                      : "border-warning-200 bg-white text-warning-700"
                  }`}
                >
                  <Icon
                    name={today.focusCompleted === today.focusTotal ? "check" : "target"}
                    size={12}
                  />
                  {today.focusCompleted}/{today.focusTotal} fokus selesai
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-200 bg-white px-3 py-1.5 text-[12px] font-medium text-surface-500 shadow-sm">
                  <Icon name="target" size={12} />
                  Belum ada fokus dipilih
                </span>
              )}
            </div>
          </div>

          {/* Context message */}
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-surface-500">
            {today.currentSession
              ? `⚡ Sesi aktif sedang berjalan — tetap fokus sampai selesai.`
              : today.focusTasks.length > 0
                ? `Kamu punya ${today.focusTasks.length} task terpilih. Mulai dari yang paling atas.`
                : `Tambahkan task ke daftar fokus untuk mulai hari ini.`}
          </p>
        </header>

        {/* Quick Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/focus"
            className="inline-flex items-center gap-1.5 rounded-xl border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-surface-800 shadow-xs hover:border-warning-300 hover:text-warning-700 transition"
          >
            <Icon name="target" size={13} className="text-warning-500" />
            Fokus Harian
          </Link>
          <Link
            href="/capture"
            className="inline-flex items-center gap-1.5 rounded-xl border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-surface-800 shadow-xs hover:border-primary-300 hover:text-primary-700 transition"
          >
            <Icon name="inbox" size={13} className="text-primary-500" />
            Inbox ({insightsSummary.inboxCount})
          </Link>
          <Link
            href="/insights"
            className="inline-flex items-center gap-1.5 rounded-xl border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-surface-800 shadow-xs hover:border-brand-300 hover:text-brand-700 transition"
          >
            <Icon name="chart" size={13} className="text-brand-500" />
            Insights ({insightsSummary.lifeHealthScore})
          </Link>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 rounded-xl border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-surface-800 shadow-xs hover:border-emerald-300 hover:text-emerald-700 transition"
          >
            <Icon name="calendar" size={13} className="text-emerald-500" />
            Jadwal Kalender
          </Link>
          <Link
            href="/review"
            className="inline-flex items-center gap-1.5 rounded-xl border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-surface-800 shadow-xs hover:border-info-300 hover:text-info-600 transition"
          >
            <Icon name="check" size={13} className="text-info-500" />
            Buka Review
          </Link>
          {insightsSummary.conflicts.length > 0 && (
            <Link
              href="/insights"
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-xs hover:bg-rose-100 transition animate-pulse"
            >
              ⚠️ {insightsSummary.conflicts.length} Konflik Waktu
            </Link>
          )}
        </div>

        {/* Proactive Needs Attention widget */}
        <NeedsAttentionCard items={needsAttentionItems} />

        {/* Quick start suggestion when no focus selected */}
        {today.focusTasks.length === 0 && !today.currentSession && (
          <DailyQuickStart tasks={quickStartTasks} />
        )}

        {/* Session / Next action */}
        {today.currentSession ? (
          <SessionFocusMode
            key={today.currentSession.id}
            taskId={sessionTask?.id ?? ""}
            taskName={sessionTask?.name ?? "task berikutnya Anda"}
            goalName={sessionTask?.goalName}
            stageName={sessionTask?.stageName}
            activeSession={{
              id: today.currentSession.id,
              startedAt: today.currentSession.startedAt.toISOString(),
            }}
          />
        ) : (
          <NextActionSpotlight nextAction={nextActionCard} />
        )}

        {/* Quick Task Creator for Today */}
        <TodayTaskCreator areas={areas} projects={projects} />

        <FocusPanel focus={today.focusTasks} available={today.availableTasks} />

        {/* Scheduled Calendar Events for Today */}
        <section className="rounded-2xl border border-surface-150 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3 mb-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Icon name="calendar" size={13} />
              </span>
              <p className="text-[14px] font-bold text-surface-900">Agenda Kalender Hari Ini</p>
            </div>
            <Link
              href="/calendar"
              className="text-[12px] font-semibold text-primary-600 hover:text-primary-700"
            >
              Buka Kalender →
            </Link>
          </div>
          {today.calendarEvents && today.calendarEvents.length > 0 ? (
            <div className="space-y-2">
              {today.calendarEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-surface-150 bg-surface-50/60 px-3.5 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-semibold text-surface-700 whitespace-nowrap">
                      {new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(evt.startTime))}
                      {" – "}
                      {new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(evt.endTime))}
                    </span>
                    <span className="font-medium text-surface-900 truncate">{evt.title}</span>
                  </div>
                  {evt.project && (
                    <span className="shrink-0 rounded-md bg-surface-150 px-2 py-0.5 text-[10px] text-surface-600 font-medium">
                      {evt.project.title}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12.5px] text-surface-400">
              Tidak ada agenda kalender terjadwal untuk hari ini.
            </p>
          )}
        </section>

        {/* Completed today — Grid */}
        <section className="rounded-2xl border border-surface-150 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3 mb-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-success-50 text-success-600">
                <Icon name="check" size={13} strokeWidth={2.5} />
              </span>
              <p className="text-[14px] font-bold text-surface-900">Yang sudah beres</p>
            </div>
            {today.completedTasks.length > 0 && (
              <span className="chip bg-success-100 text-success-700 font-semibold">
                {today.stats.completedTasks} selesai
              </span>
            )}
          </div>
          {today.completedTasks.length === 0 ? (
            <p className="text-[12.5px] text-surface-400">
              Belum ada yang selesai hari ini — momentum dimulai dari satu task kecil.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {today.completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2.5 rounded-xl border border-success-150 bg-gradient-to-r from-success-50/40 to-white px-3 py-2.5 shadow-xs"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-500 text-white shadow-xs">
                    <Icon name="check" size={10} strokeWidth={3} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="block truncate text-[12.5px] font-semibold text-surface-800 hover:text-primary-700 transition-colors"
                    >
                      {task.title}
                    </Link>
                    <p className="truncate text-[10.5px] text-surface-400">
                      {(task as { stage?: { goal?: { title?: string } } }).stage?.goal?.title ||
                        (task as { project?: { title?: string } }).project?.title ||
                        (task as { area?: { name?: string } }).area?.name ||
                        "Task"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Captures — Grid */}
        <section className="rounded-2xl border border-surface-150 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3 mb-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <Icon name="inbox" size={13} />
              </span>
              <p className="text-[14px] font-bold text-surface-900">Catatan terbaru</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/capture"
                className="text-[12px] font-semibold text-primary-600 hover:text-primary-700"
              >
                Buka Inbox →
              </Link>
              <span className="chip bg-surface-100 text-surface-500">
                {recentCaptures.length}
              </span>
            </div>
          </div>
          {recentCaptures.length === 0 ? (
            <p className="text-[12.5px] text-surface-400">
              Belum ada catatan. Gunakan Catat cepat untuk merekam ide & pemikiran.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {recentCaptures.map((capture) => (
                <div
                  key={capture.id}
                  className="flex flex-col justify-between rounded-xl border border-surface-150 bg-surface-50/60 p-3 shadow-xs hover:border-surface-250 transition-all"
                >
                  <p className="text-[12.5px] leading-relaxed text-surface-800 line-clamp-3">
                    {capture.content}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between border-t border-surface-150/60 pt-1.5 text-[10.5px] text-surface-400">
                    <span>{formatCaptureTime(capture.createdAt)}</span>
                    <HistoryDeleteButton
                      path={`/api/captures/${capture.id}`}
                      message="Hapus catatan ini?"
                      toastMessage="Catatan dihapus."
                      aria-label="Hapus catatan"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Right — sticky context panel */}
      <aside className="mt-5 space-y-4 lg:sticky lg:top-16 lg:mt-0">
        {/* Stats card */}
        <section className="rounded-2xl border border-surface-150 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="eyebrow text-surface-400">Hari ini</p>
              <p className="mt-0.5 text-[15px] font-bold text-surface-900">Rangkuman</p>
            </div>
            <FocusOrb
              value={focusPct ?? undefined}
              size={52}
              stroke={5}
              tone={focusPct !== null && focusPct === 100 ? "success" : "primary"}
              label={
                focusPct === null
                  ? "Belum ada fokus dipilih"
                  : `Fokus selesai ${focusPct} persen`
              }
            >
              <span className="text-[13px] font-bold text-surface-900">
                {focusPct === null ? "—" : `${focusPct}%`}
              </span>
              <span className="text-[8px] uppercase tracking-wider text-surface-400">
                fokus
              </span>
            </FocusOrb>
          </div>
          <dl className="space-y-0">
            <StatRow
              icon="clock"
              label="Waktu fokus"
              value={formatDuration(today.stats.totalMinutes)}
              hint="dalam sesi selesai"
            />
            <StatRow
              icon="check"
              tone="success"
              label="Task selesai"
              value={String(today.stats.completedTasks)}
            />
            <StatRow
              icon="target"
              tone="warning"
              label="Prioritas"
              value={`${today.focusCompleted}/${today.focusTotal}`}
              hint="dari daftar fokus"
            />
          </dl>
        </section>

        <QuickCapture />
      </aside>
    </div>
  );
}