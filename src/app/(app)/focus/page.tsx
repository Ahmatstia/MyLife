import { requirePageUser } from "@/lib/auth";
import { getDailyFocus, getDailyFocusHistoryList } from "@/services/daily-focus.service";
import { findTodayTasks } from "@/repositories/today.repository";
import { findAnyActiveSession } from "@/repositories/session.repository";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { FocusManager } from "./FocusManager";

export const dynamic = "force-dynamic";

export default async function FocusPage() {
  const user = await requirePageUser();

  const [todayFocus, history, tasks, activeSession] = await Promise.all([
    getDailyFocus(undefined, user.id),
    getDailyFocusHistoryList(user.id, 30),
    findTodayTasks(user.id),
    findAnyActiveSession(user.id),
  ]);

  const availableTasks = tasks.filter((t) => t.status !== "COMPLETED");

  const formattedSession = activeSession
    ? {
        id: activeSession.id,
        startedAt: activeSession.startedAt.toISOString(),
        taskId: activeSession.taskId,
        taskTitle: activeSession.task?.title ?? "",
      }
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fokus Harian (Daily Focus)"
        description="Pilih 3–5 task prioritas utama untuk diselesaikan hari ini. Jalankan sesi Pomodoro langsung untuk menjaga momentum eksekusi."
      />
      <FocusManager
        initialFocus={todayFocus}
        initialHistory={history}
        availableTasks={availableTasks}
        activeSession={formattedSession}
      />
    </div>
  );
}
