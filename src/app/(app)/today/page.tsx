import { getToday } from "@/services/today.service";
import { requirePageUser } from "@/lib/auth";
import { getAreas } from "@/services/area.service";
import { getProjects } from "@/services/project.service";
import { getCaptures } from "@/services/capture.service";
import { getActiveChapter } from "@/services/direction.service";
import { getActivities } from "@/services/activity.service";
import { TodayDashboardClient } from "./TodayDashboardClient";
import { DirectionCompassCard } from "@/app/components/direction/DirectionCompassCard";
import type { ActivityFeedItem } from "@/app/components/dashboard/RecentActivityFeed";

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
  const [today, areas, allProjects, dbCaptures, activeChapter, dbActivities] = await Promise.all([
    getToday(new Date(), user.id),
    getAreas(user.id, { isActive: true }),
    getProjects(user.id),
    getCaptures({ status: "PENDING", limit: 10 }, user.id).catch(() => []),
    getActiveChapter(user.id).catch(() => null),
    getActivities(user.id, { limit: 15 }).catch(() => []),
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
    const isDone = !!evt.isCompleted;
    return {
      id: evt.id,
      time: `${startStr} – ${endStr} WIB`,
      title: evt.title,
      isCompleted: isDone,
      status: (isDone ? "SELESAI" : isNow ? "BERJALAN_SEKARANG" : "TERJADWAL") as "SELESAI" | "BERJALAN_SEKARANG" | "TERJADWAL",
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

  // Build unified recent activities feed
  const rawActivities: ActivityFeedItem[] = [
    ...dbActivities.map((act) => ({
      id: `act-${act.id}`,
      type: "ACTIVITY" as const,
      title: act.title,
      category: act.category,
      timestamp: new Date(act.endTime || act.startTime || act.createdAt).toISOString(),
      durationMinutes: act.durationMinutes,
      xp: `+${Math.round(act.durationMinutes * 1.5)} XP`,
      notes: act.notes,
      linkUrl: act.taskId ? `/tasks/${act.taskId}` : act.projectId ? `/projects/${act.projectId}` : undefined,
    })),
    ...today.completedTasks.map((t) => {
      const taskObj = t as Record<string, unknown>;
      const project = taskObj.project as { id?: string; title?: string } | undefined;
      return {
        id: `task-${t.id}`,
        type: "TASK_COMPLETED" as const,
        title: t.title,
        category: project?.title || "Tugas Selesai",
        timestamp: new Date(t.completedAt || new Date()).toISOString(),
        xp: "+50 XP",
        linkUrl: `/tasks/${t.id}`,
      };
    }),
    ...today.momentumSessions.map((s) => ({
      id: `ses-${s.id}`,
      type: "FOCUS_SESSION" as const,
      title: `Sesi Fokus: ${s.task.title}`,
      category: "Fokus Mendalam",
      timestamp: new Date(s.endedAt || s.startedAt).toISOString(),
      durationMinutes: s.durationMinutes || 25,
      xp: "+35 XP",
      linkUrl: `/tasks/${s.taskId}`,
    })),
    ...dbCaptures.map((c) => ({
      id: `cap-${c.id}`,
      type: "CAPTURE" as const,
      title: c.content,
      category: c.category || "Catatan Cepat",
      timestamp: new Date(c.createdAt).toISOString(),
      linkUrl: "/capture",
    })),
  ];

  const recentActivities: ActivityFeedItem[] = rawActivities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 15);

  return (
    <div className="w-full pb-16 space-y-5">
      <DirectionCompassCard chapter={activeChapter} />
      <TodayDashboardClient
        initialDateStr={dateStr}
        areas={areas.map((a) => ({ id: a.id, name: a.name, color: a.color }))}
        projects={projects}
        nextAction={nextAction}
        initialTasks={initialTasks}
        initialTimeblocks={initialTimeblocks}
        initialCaptures={initialCaptures}
        initialActivities={recentActivities}
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