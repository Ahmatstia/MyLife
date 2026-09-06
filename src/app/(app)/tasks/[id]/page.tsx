import Link from "next/link";
import { notFound } from "next/navigation";
import TaskActions from "@/app/components/TaskActions";
import { PomodoroPanel } from "@/app/components/core/PomodoroPanel";
import { TaskStatusPicker } from "@/app/components/core/TaskStatusPicker";
import { LearningNoteCard } from "@/app/components/core/LearningNotesForm";
import { getTaskDetail } from "@/services/task.service";
import { requirePageUser } from "@/lib/auth";
import { PriorityBadge } from "@/app/components/ui/Badge";
import { Icon } from "@/app/components/ui/Icon";
import { formatHours } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser();
  const detail = await getTaskDetail(id, user.id);
  if (!detail) notFound();

  const { task, activeSession } = detail;

  // Calculate total focus minutes from completed sessions
  const totalFocusMinutes = task.sessions.reduce(
    (acc: number, s: { durationMinutes: number | null }) => acc + (s.durationMinutes ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb & Top Bar ───────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px]">
          {task.stage ? (
            <>
              <Link
                href={`/goals/${task.stage.goalId}`}
                className="inline-flex items-center gap-1.5 font-medium text-surface-500 transition hover:text-primary-700"
              >
                <Icon name="arrowLeft" size={14} />
                <span className="truncate max-w-[160px] sm:max-w-none">{task.stage.goal.title}</span>
              </Link>
              <span className="text-surface-300">/</span>
              <span className="chip bg-surface-100 text-surface-600 font-semibold">{task.stage.name}</span>
            </>
          ) : task.project ? (
            <>
              <Link
                href={`/projects/${task.project.id}`}
                className="inline-flex items-center gap-1.5 font-medium text-surface-500 transition hover:text-primary-700"
              >
                <Icon name="arrowLeft" size={14} />
                <span className="truncate max-w-[160px] sm:max-w-none">{task.project.title}</span>
              </Link>
              {task.milestone && (
                <>
                  <span className="text-surface-300">/</span>
                  <span className="chip bg-surface-100 text-surface-600 font-semibold">{task.milestone.title}</span>
                </>
              )}
            </>
          ) : (
            <Link
              href="/today"
              className="inline-flex items-center gap-1.5 font-medium text-surface-500 transition hover:text-primary-700"
            >
              <Icon name="arrowLeft" size={14} />
              <span>Hari Ini</span>
            </Link>
          )}
        </div>

        <TaskActions
          id={task.id}
          name={task.title}
          description={task.description}
          priority={task.priority}
          estimatedHours={task.estimatedHours}
          dueDate={task.dueDate}
          notes={task.notes}
        />
      </nav>

      {/* ── Main Layout: 2-Column Bento Grid ────────────────────── */}
      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-6 space-y-6 lg:space-y-0">
        
        {/* Left Column: Task Overview, Status, Stats, Notes & History */}
        <div className="space-y-5 min-w-0">
          
          {/* Main Card: Title, Status Picker & Description */}
          <section className="bento-tile p-5 sm:p-6 space-y-5 bg-white">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip bg-primary-50 text-primary-700 border border-primary-100 font-bold uppercase tracking-wider text-[10px]">
                Task
              </span>
              <PriorityBadge priority={task.priority} />
              {task.type && (
                <span className="chip bg-surface-100 text-surface-600">
                  {task.type}
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-surface-900 leading-tight">
                {task.title}
              </h1>
              {task.description && (
                <p className="mt-2.5 text-[14px] leading-relaxed text-surface-600 bg-surface-50/60 rounded-xl p-3.5 border border-surface-100">
                  {task.description}
                </p>
              )}
            </div>

            {/* Visual Interactive Status Picker */}
            <div className="pt-2 border-t border-surface-100">
              <TaskStatusPicker taskId={task.id} status={task.status as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"} />
            </div>
          </section>

          {/* Bento Stats Row */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Estimasi */}
            <div className="bento-tile p-3.5 stat-bg-primary">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-primary-600">
                  Estimasi
                </span>
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                  <Icon name="target" size={13} />
                </span>
              </div>
              <p className="mt-2 text-xl font-bold text-surface-900">
                {formatHours(task.estimatedHours)}
              </p>
            </div>

            {/* Waktu Aktual */}
            <div className="bento-tile p-3.5 stat-bg-success">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-success-600">
                  Aktual
                </span>
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-success-100 text-success-700">
                  <Icon name="clock" size={13} />
                </span>
              </div>
              <p className="mt-2 text-xl font-bold text-surface-900">
                {formatHours(task.actualHours)}
              </p>
              {task.actualHours > task.estimatedHours && task.estimatedHours > 0 && (
                <span className="text-[10px] text-danger-600 font-semibold">
                  +{(task.actualHours - task.estimatedHours).toFixed(1)}j lebih
                </span>
              )}
            </div>

            {/* Jumlah Sesi */}
            <div className="bento-tile p-3.5 stat-bg-ai">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-ai-600">
                  Sesi Fokus
                </span>
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-ai-100 text-ai-700">
                  <Icon name="layers" size={13} />
                </span>
              </div>
              <p className="mt-2 text-xl font-bold text-surface-900">
                {task.sessions.length}
              </p>
              <span className="text-[10px] text-surface-400">kali fokus</span>
            </div>

            {/* Total Menit */}
            <div className="bento-tile p-3.5 stat-bg-warning">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-warning-600">
                  Total Waktu
                </span>
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-warning-100 text-warning-700">
                  <Icon name="flame" size={13} />
                </span>
              </div>
              <p className="mt-2 text-xl font-bold text-surface-900">
                {totalFocusMinutes} <span className="text-xs font-normal text-surface-500">mnt</span>
              </p>
            </div>
          </section>

          {/* Sticky Notes Card (If task has notes) */}
          {task.notes && (
            <section className="sticky-note rounded-2xl p-5 shadow-soft">
              <div className="flex items-center gap-2 mb-2 text-warning-800">
                <Icon name="pen" size={14} />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Catatan Task & Referensi
                </span>
              </div>
              <p className="text-[13.5px] leading-relaxed text-surface-800 whitespace-pre-wrap font-medium">
                {task.notes}
              </p>
            </section>
          )}

          {/* Learning Notes & Session History */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-ai-500 text-white">
                  <Icon name="bookOpen" size={12} />
                </span>
                <h2 className="text-[15px] font-bold text-surface-900">
                  Riwayat & Catatan Sesi
                </h2>
              </div>
              <span className="chip bg-surface-100 text-surface-500 font-semibold">
                {task.sessions.length} Sesi
              </span>
            </div>

            {task.sessions.length === 0 ? (
              <div className="bento-tile p-8 text-center bg-white/70">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 text-primary-600 float-gentle">
                  <Icon name="pomodoro" size={22} />
                </div>
                <h3 className="mt-3 text-[14px] font-semibold text-surface-800">
                  Belum ada sesi fokus
                </h3>
                <p className="mt-1 text-[12.5px] text-surface-400 max-w-sm mx-auto">
                  Mulai Pomodoro atau sesi bebas di panel kanan untuk mencatat waktu dan refleksi belajar Anda.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {task.sessions.map((session: {
                  id: string;
                  activity: string | null;
                  startedAt: Date;
                  durationMinutes: number | null;
                  understanding: number | null;
                  obstacle: string | null;
                  nextAction: string | null;
                }) => (
                  <LearningNoteCard
                    key={session.id}
                    activity={session.activity}
                    startedAt={session.startedAt}
                    durationMinutes={session.durationMinutes}
                    understanding={session.understanding}
                    confusedPoints={session.obstacle}
                    nextAction={session.nextAction}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Pomodoro & Focus Station */}
        <aside className="lg:sticky lg:top-20 space-y-4">
          <div className="bento-tile p-5 bg-white shadow-soft">
            <PomodoroPanel
              key={activeSession?.id ?? "idle-timer"}
              taskId={task.id}
              taskName={task.title}
              goalName={task.stage?.goal?.title ?? task.project?.title}
              stageName={task.stage?.name ?? task.milestone?.title}
              activeSession={
                activeSession
                  ? { id: activeSession.id, startedAt: activeSession.startedAt.toISOString() }
                  : null
              }
            />
          </div>
        </aside>
      </div>
    </div>
  );
}