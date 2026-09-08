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
import { BackButton } from "@/app/components/ui/BackButton";
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
    <div className="space-y-6 pb-16">
      {/* ── Breadcrumb & Top Bar ───────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
        <div className="flex flex-wrap items-center gap-3 text-[13px]">
          <BackButton fallbackUrl="/today" label="Kembali" />

          <div className="hidden sm:block text-white/20">|</div>

          {task.stage ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/goals/${task.stage.goalId}`}
                className="inline-flex items-center gap-1.5 font-medium text-[#94a3b8] transition hover:text-white"
                title="Buka sasaran (goal)"
              >
                <span className="truncate max-w-[160px] sm:max-w-none">{task.stage.goal.title}</span>
              </Link>
              <span className="text-white/20">/</span>
              <span className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-xs font-mono font-medium text-[#d0bcff]">
                {task.stage.name}
              </span>
            </div>
          ) : task.project ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/projects/${task.project.id}`}
                className="inline-flex items-center gap-1.5 font-medium text-[#94a3b8] transition hover:text-white"
                title="Buka proyek"
              >
                <span className="truncate max-w-[160px] sm:max-w-none">{task.project.title}</span>
              </Link>
              {task.milestone && (
                <>
                  <span className="text-white/20">/</span>
                  <span className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-xs font-mono font-medium text-[#d0bcff]">
                    {task.milestone.title}
                  </span>
                </>
              )}
            </div>
          ) : (
            <span className="text-xs font-mono text-[#94a3b8]">Tugas Mandiri</span>
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
      <div className="lg:grid lg:grid-cols-[1fr_340px] lg:items-start lg:gap-6 space-y-6 lg:space-y-0">
        
        {/* Left Column: Task Overview, Status, Stats, Notes & History */}
        <div className="space-y-6 min-w-0">
          
          {/* Main Card: Title, Status Picker & Description */}
          <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#131825] p-6 sm:p-7 shadow-xl">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#8B5CF6]/10 blur-3xl" />
            
            <div className="relative z-10 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-[#8B5CF6]/30 bg-[#8B5CF6]/15 px-2.5 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#d0bcff]">
                  Task
                </span>
                <PriorityBadge priority={task.priority} />
                {task.type && (
                  <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10.5px] font-medium text-[#94a3b8]">
                    {task.type}
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                  {task.title}
                </h1>
                {task.description && (
                  <div className="mt-3 rounded-2xl border border-white/[0.06] bg-[#0B0D13]/70 p-4 text-[13.5px] leading-relaxed text-[#CBC3D7]">
                    {task.description}
                  </div>
                )}
              </div>

              {/* Visual Interactive Status Picker */}
              <div className="pt-4 border-t border-white/[0.08]">
                <TaskStatusPicker taskId={task.id} status={task.status as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"} />
              </div>
            </div>
          </section>

          {/* Bento Stats Row */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Estimasi */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-4 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94a3b8]">
                  Estimasi
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8B5CF6]/15 text-[#d0bcff]">
                  <Icon name="target" size={14} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold font-mono text-white">
                {formatHours(task.estimatedHours)}
              </p>
            </div>

            {/* Waktu Aktual */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-4 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94a3b8]">
                  Aktual
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4edea3]/15 text-[#4edea3]">
                  <Icon name="clock" size={14} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold font-mono text-white">
                {formatHours(task.actualHours)}
              </p>
              {task.actualHours > task.estimatedHours && task.estimatedHours > 0 && (
                <span className="text-[10.5px] font-mono text-rose-400 font-semibold block mt-1">
                  +{(task.actualHours - task.estimatedHours).toFixed(1)}j lebih
                </span>
              )}
            </div>

            {/* Jumlah Sesi */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-4 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94a3b8]">
                  Sesi Fokus
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                  <Icon name="layers" size={14} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold font-mono text-white">
                {task.sessions.length}
              </p>
              <span className="text-[11px] font-mono text-[#64748b]">kali fokus</span>
            </div>

            {/* Total Menit */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-4 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94a3b8]">
                  Total Waktu
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                  <Icon name="flame" size={14} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold font-mono text-white">
                {totalFocusMinutes} <span className="text-xs font-normal text-[#94a3b8]">mnt</span>
              </p>
            </div>
          </section>

          {/* Sticky Notes Card (If task has notes) */}
          {task.notes && (
            <section className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#131825] to-amber-500/[0.06] p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2 text-amber-400 font-mono text-[11px] font-bold uppercase tracking-wider">
                <Icon name="pen" size={14} />
                <span>Catatan Task & Referensi</span>
              </div>
              <p className="text-[13.5px] leading-relaxed text-[#f1f5f9] whitespace-pre-wrap font-medium">
                {task.notes}
              </p>
            </section>
          )}

          {/* Learning Notes & Session History */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-[#8B5CF6] to-indigo-500 text-white">
                  <Icon name="bookOpen" size={12} />
                </span>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Riwayat & Catatan Sesi
                </h2>
              </div>
              <span className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs font-mono text-[#94a3b8]">
                {task.sessions.length} Sesi
              </span>
            </div>

            {task.sessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.08] bg-[#131825]/40 p-8 text-center">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-[#8B5CF6]/15 text-[#d0bcff]">
                  <Icon name="pomodoro" size={22} />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-white">
                  Belum ada sesi fokus
                </h3>
                <p className="mt-1 text-xs text-[#94a3b8] max-w-sm mx-auto leading-relaxed">
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
          <div className="rounded-3xl border border-white/[0.08] bg-[#131825] p-5 sm:p-6 shadow-xl relative overflow-hidden">
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