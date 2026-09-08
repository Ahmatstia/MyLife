import { getToday } from "@/services/today.service";
import { requirePageUser } from "@/lib/auth";
import { getAreas } from "@/services/area.service";
import { getProjects } from "@/services/project.service";
import { getCaptures } from "@/services/capture.service";
import { TodayDashboardClient } from "./TodayDashboardClient";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

export default async function TodayPage() {
  const user = await requirePageUser();
  const [today, areas, allProjects, dbCaptures] = await Promise.all([
    getToday(new Date(), user.id),
    getAreas(user.id, { isActive: true }),
    getProjects(user.id),
    getCaptures({ status: "PENDING", limit: 10 }, user.id).catch(() => []),
  ]);

  const projects = allProjects
    .filter((p) => p.status !== "COMPLETED")
    .map((p) => ({ id: p.id, title: p.title }));

  const dateStr = formatDate(today.date);

  // Map real tasks
  const initialTasks = [
    ...today.availableTasks.map((t) => {
      const taskObj = t as Record<string, unknown>;
      const project = taskObj.project as { id?: string; title?: string } | undefined;
      const area = taskObj.area as { id?: string; name?: string } | undefined;
      const stage = taskObj.stage as { id?: string; goalId?: string; goal?: { id?: string; title?: string } } | undefined;

      const categoryTitle =
        project?.title ||
        stage?.goal?.title ||
        area?.name ||
        "Tugas";

      const projectId = (taskObj.projectId as string) || project?.id || null;
      const goalId = (taskObj.goalId as string) || stage?.goalId || stage?.goal?.id || null;

      return {
        id: t.id,
        title: t.title,
        subtitle: `📁 ${categoryTitle} • Est: ${t.estimatedHours || 1}h`,
        status: (today.currentSession?.taskId === t.id ? "RUNNING" : "PENDING") as "RUNNING" | "PENDING",
        priority: t.priority,
        categoryName: categoryTitle,
        badge: t.priority === "URGENT" ? "⚠️ Mendesak" : t.priority === "HIGH" ? "Prioritas Tinggi" : undefined,
        badgeType: (t.priority === "URGENT" ? "warning" : "neutral") as "warning" | "neutral",
        projectId,
        goalId,
      };
    }),
    ...today.completedTasks.map((t) => {
      const taskObj = t as Record<string, unknown>;
      const project = taskObj.project as { id?: string; title?: string } | undefined;
      const area = taskObj.area as { id?: string; name?: string } | undefined;
      const stage = taskObj.stage as { id?: string; goalId?: string; goal?: { id?: string; title?: string } } | undefined;

      const categoryTitle =
        project?.title ||
        stage?.goal?.title ||
        area?.name ||
        "Tugas";

      const projectId = (taskObj.projectId as string) || project?.id || null;
      const goalId = (taskObj.goalId as string) || stage?.goalId || stage?.goal?.id || null;

      return {
        id: t.id,
        title: t.title,
        subtitle: `📁 ${categoryTitle} • Selesai`,
        status: "COMPLETED" as const,
        priority: t.priority,
        categoryName: categoryTitle,
        xp: "+50 XP",
        projectId,
        goalId,
      };
    }),
  ];

  // Map real calendar events
  const initialTimeblocks = today.calendarEvents.map((evt) => {
    const startStr = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(evt.startTime));
    const endStr = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(evt.endTime));
    const isNow = new Date() >= new Date(evt.startTime) && new Date() <= new Date(evt.endTime);
    const isPast = new Date() > new Date(evt.endTime);
    return {
      id: evt.id,
      time: `${startStr} – ${endStr} WIB`,
      title: evt.title,
      status: (isPast ? "SELESAI" : isNow ? "BERJALAN_SEKARANG" : "TERJADWAL") as "SELESAI" | "BERJALAN_SEKARANG" | "TERJADWAL",
    };
  });

  // Map real captures
  const initialCaptures = dbCaptures.map((c) => ({
    id: c.id,
    content: c.content,
    category: c.category || "Catatan",
    tag: `${new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(c.createdAt))} • Inbox`,
  }));

  // Real next action
  const nextActionObj = today.nextAction as Record<string, unknown> | null;
  const nextAction = today.nextAction
    ? {
        taskId: today.nextAction.taskId,
        taskName: today.nextAction.taskName,
        goalName: today.nextAction.goalName,
        stageName: today.nextAction.stageName,
        priority: today.nextAction.priority,
        estimatedMinutes: today.nextAction.estimatedMinutes || 45,
        reason: (nextActionObj?.reason as string) || "Fokus prioritas tertinggi berdasarkan roadmap aktif",
      }
    : null;

  // Real overdue or alert items
  const alertIssues = today.overdueTasks.map((t) => ({
    id: t.id,
    type: "DEADLINE" as const,
    title: `Tenggat Terlewat: '${t.title}'`,
  }));

  return (
    <div className="w-full pb-16">
      <TodayDashboardClient
        initialDateStr={dateStr}
        areas={areas.map((a) => ({ id: a.id, name: a.name, color: a.color }))}
        projects={projects}
        nextAction={nextAction}
        initialTasks={initialTasks}
        initialTimeblocks={initialTimeblocks}
        initialCaptures={initialCaptures}
        alertIssues={alertIssues}
        stats={{
          totalMinutes: today.stats.totalMinutes,
          completedTasks: today.stats.completedTasks,
          activeTasks: today.stats.activeTasks,
        }}
      />
    </div>
  );
}