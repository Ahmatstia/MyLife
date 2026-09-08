import { requirePageUser } from "@/lib/auth";
import { getDailyFocus, getDailyFocusHistoryList } from "@/services/daily-focus.service";
import { findTodayTasks, findTodaySessions } from "@/repositories/today.repository";
import { findAnyActiveSession } from "@/repositories/session.repository";
import { FocusManager } from "./FocusManager";

export const dynamic = "force-dynamic";

interface FocusPageProps {
  searchParams?: Promise<{ taskId?: string }>;
}

export default async function FocusPage(props: FocusPageProps) {
  const user = await requirePageUser();
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const targetTaskId = searchParams?.taskId;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [todayFocus, history, tasks, activeSession, todaySessions] = await Promise.all([
    getDailyFocus(undefined, user.id),
    getDailyFocusHistoryList(user.id, 30),
    findTodayTasks(user.id),
    findAnyActiveSession(user.id),
    findTodaySessions(user.id, startOfDay, endOfDay),
  ]);

  let availableTasks = tasks.filter((t) => t.status !== "COMPLETED");

  // If a specific taskId was targeted in the URL but not yet in availableTasks (e.g. edge cases), find it
  if (targetTaskId && !availableTasks.some((t) => t.id === targetTaskId)) {
    const { findTaskForFocus } = await import("@/repositories/today.repository");
    const extraTask = await findTaskForFocus(user.id, targetTaskId);
    if (extraTask) {
      availableTasks = [extraTask as unknown as typeof availableTasks[0], ...availableTasks];
    }
  }

  const formattedSession = activeSession
    ? {
        id: activeSession.id,
        startedAt: activeSession.startedAt.toISOString(),
        taskId: activeSession.taskId,
        taskTitle: activeSession.task?.title ?? "",
      }
    : null;

  const formattedTodaySessions = todaySessions.map((s, idx) => {
    const started = new Date(s.startedAt);
    const ended = s.endedAt ? new Date(s.endedAt) : null;
    const dur = s.durationMinutes ?? (ended ? Math.max(1, Math.round((ended.getTime() - started.getTime()) / 60000)) : 0);
    const startTimeStr = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).format(started);
    const endTimeStr = ended ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).format(ended) : "Sekarang";

    return {
      id: s.id,
      taskId: s.taskId,
      taskTitle: s.task?.title ?? "Sesi Tanpa Judul",
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt ? s.endedAt.toISOString() : null,
      timeRange: `${startTimeStr} – ${endTimeStr}`,
      durationMinutes: dur,
      project: s.task?.project?.title ?? s.task?.stage?.goal.title ?? s.task?.area?.name ?? "Fokus Mandiri",
      sprintLabel: `SPRINT #${String(todaySessions.length - idx).padStart(2, "0")}`,
    };
  });

  return (
    <FocusManager
      initialFocus={todayFocus}
      initialHistory={history}
      availableTasks={availableTasks}
      activeSession={formattedSession}
      initialTodaySessions={formattedTodaySessions}
      streakDays={14}
      targetTaskId={targetTaskId}
    />
  );
}

