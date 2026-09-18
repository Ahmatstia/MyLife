import { requirePageUser } from "@/lib/auth";
import {
  getCompassSummary,
  getAllChapters,
  getReflections,
} from "@/services/direction.service";
import { getAreas } from "@/services/area.service";
import { getToday } from "@/services/today.service";
import { prisma } from "@/lib/prisma";
import { BerandaClient } from "./BerandaClient";

export const dynamic = "force-dynamic";

export default async function DirectionPage() {
  const user = await requirePageUser();

  const [summary, allChapters, allReflections, areas, todayData, userGoals] = await Promise.all([
    getCompassSummary(user.id),
    getAllChapters(user.id),
    getReflections(user.id),
    getAreas(user.id),
    getToday(new Date(), user.id),
    prisma.goal.findMany({
      where: { userId: user.id },
      include: { area: true, tasks: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const rawTasks = [
    ...todayData.focusTasks.map((ft) => ({ id: ft.task.id, title: ft.task.title, status: ft.task.status })),
    ...todayData.availableTasks.slice(0, 4).map((t) => ({ id: t.id, title: t.title, status: t.status })),
    ...todayData.completedTasks.slice(0, 2).map((t) => ({ id: t.id, title: t.title, status: t.status })),
  ];

  const uniqueTasksMap = new Map<string, { id: string; title: string; status: string }>();
  for (const t of rawTasks) {
    if (!uniqueTasksMap.has(t.id)) {
      uniqueTasksMap.set(t.id, t);
    }
  }

  const recentSessionsList = todayData.momentumSessions.map((s) => ({
    id: s.id,
    title: s.task.title,
    durationMinutes: s.durationMinutes || 25,
    endedAt: s.endedAt ? s.endedAt.toISOString() : null,
  }));

  const activeGoalsList = userGoals.map((g) => {
    const total = g.tasks.length;
    const completed = g.tasks.filter((t) => t.status === "COMPLETED").length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : (g.status === "COMPLETED" ? 100 : 0);
    return {
      id: g.id,
      title: g.title,
      status: g.status,
      progress,
      areaName: g.area?.name || "Umum",
      areaColor: g.area?.color || "#8B5CF6",
    };
  });

  return (
    <BerandaClient
      user={user}
      identity={summary.identity}
      vision={summary.vision}
      activeChapter={summary.activeChapter}
      allChapters={allChapters}
      allReflections={allReflections}
      availableAreas={areas}
      todayTasks={Array.from(uniqueTasksMap.values())}
      activeGoals={activeGoalsList}
      recentActivities={recentSessionsList}
    />
  );
}


