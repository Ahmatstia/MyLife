import {
  findInsightsGoals,
  findInsightsTasks,
  findInsightsSessions,
  findInsightsActivities,
  findInsightsAreas,
} from "@/repositories/insights.repository";
import type { AnalyticsSummary, InsightPeriod, InsightDateRange } from "./insights-types";
import { requireUserId } from "@/lib/ownership";

export function getInsightDateRange(
  period: InsightPeriod = "this_week",
  customStart?: Date,
  customEnd?: Date,
  referenceDate: Date = new Date()
): InsightDateRange {
  const ref = new Date(referenceDate);

  if (period === "custom" && customStart && customEnd) {
    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    return { start, end, period: "custom" };
  }

  if (period === "today") {
    const start = new Date(ref);
    start.setHours(0, 0, 0, 0);
    const end = new Date(ref);
    end.setHours(23, 59, 59, 999);
    return { start, end, period: "today" };
  }

  if (period === "this_month") {
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end, period: "this_month" };
  }

  // Default: this_week (Monday to Sunday)
  const day = ref.getDay();
  const distanceFromMonday = day === 0 ? 6 : day - 1;
  const start = new Date(ref);
  start.setDate(ref.getDate() - distanceFromMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end, period: "this_week" };
}

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function computeComprehensiveAnalytics(
  userId?: string,
  period: InsightPeriod = "this_week",
  customStart?: Date,
  customEnd?: Date
): Promise<AnalyticsSummary> {
  const owner = requireUserId(userId);
  const dateRange = getInsightDateRange(period, customStart, customEnd);
  const { start, end } = dateRange;

  const [allTasks, allGoals, allAreas, sessions, activities] = await Promise.all([
    findInsightsTasks(owner),
    findInsightsGoals(owner),
    findInsightsAreas(owner),
    findInsightsSessions(owner, start, end),
    findInsightsActivities(owner, start, end),
  ]);

  // 1. Goal Metrics
  const activeGoals = allGoals.filter((g) => g.status === "ACTIVE").length;
  const completedGoals = allGoals.filter((g) => g.status === "COMPLETED").length;
  const totalGoals = allGoals.length;
  const goalCompletionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  // 2. Task Metrics (Multi-track)
  const now = new Date();
  const pendingTasks = allTasks.filter((t) => t.status === "TODO").length;
  const inProgressTasks = allTasks.filter((t) => t.status === "IN_PROGRESS").length;
  const completedTasks = allTasks.filter((t) => t.status === "COMPLETED").length;
  const overdueTasks = allTasks.filter((t) => t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate) < now).length;
  const totalTasks = allTasks.length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 3. Session Metrics
  const totalSessionMinutes = sessions.reduce((acc, s) => acc + (s.durationMinutes ?? 0), 0);
  const totalSessionHours = Math.round((totalSessionMinutes / 60) * 10) / 10;
  const averageSessionMinutes = sessions.length > 0 ? Math.round(totalSessionMinutes / sessions.length) : 0;
  const understandings = sessions.map((s) => s.understanding).filter((u): u is number => u !== null);
  const averageUnderstanding = understandings.length > 0 ? Math.round((understandings.reduce((a, b) => a + b, 0) / understandings.length) * 10) / 10 : null;

  // 4. Activity Telemetry Metrics
  const totalActivityMinutes = activities.reduce((acc, a) => acc + a.durationMinutes, 0);
  const totalActivityHours = Math.round((totalActivityMinutes / 60) * 10) / 10;
  const byCategory: Record<string, { count: number; minutes: number }> = {};
  for (const act of activities) {
    if (!byCategory[act.category]) {
      byCategory[act.category] = { count: 0, minutes: 0 };
    }
    byCategory[act.category].count += 1;
    byCategory[act.category].minutes += act.durationMinutes;
  }

  // 5. Daily Trends
  const trendMap = new Map<string, { focusMinutes: number; tasksCompleted: number; sessionsCount: number }>();
  const cursor = new Date(start);
  while (cursor <= end) {
    trendMap.set(dateKey(cursor), { focusMinutes: 0, tasksCompleted: 0, sessionsCount: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const s of sessions) {
    if (s.endedAt) {
      const key = dateKey(new Date(s.endedAt));
      const entry = trendMap.get(key);
      if (entry) {
        entry.focusMinutes += s.durationMinutes ?? 0;
        entry.sessionsCount += 1;
      }
    }
  }

  for (const t of allTasks) {
    if (t.completedAt) {
      const key = dateKey(new Date(t.completedAt));
      const entry = trendMap.get(key);
      if (entry) {
        entry.tasksCompleted += 1;
      }
    }
  }

  const trends = Array.from(trendMap.entries()).map(([date, data]) => ({
    date,
    focusMinutes: data.focusMinutes,
    focusHours: Math.round((data.focusMinutes / 60) * 10) / 10,
    tasksCompleted: data.tasksCompleted,
    sessionsCount: data.sessionsCount,
  }));

  // 6. Goal Progress breakdown
  const goalProgress = allGoals.map((goal) => {
    const goalTasks = allTasks.filter((t) => t.goalId === goal.id);
    const gCompleted = goalTasks.filter((t) => t.status === "COMPLETED").length;
    const gTotal = goalTasks.length;
    return {
      goalId: goal.id,
      title: goal.title,
      status: goal.status,
      totalTasks: gTotal,
      completedTasks: gCompleted,
      completionPercentage: gTotal > 0 ? Math.round((gCompleted / gTotal) * 100) : 0,
      areaName: goal.area?.name ?? null,
    };
  });

  // 7. Area Distribution breakdown (Distribusi Energi & Alokasi Waktu Antar Pilar)
  const rawAreaDistribution = allAreas.map((area) => {
    const areaTasks = allTasks.filter((t) => t.areaId === area.id || t.goal?.areaId === area.id || t.project?.areaId === area.id);
    const areaTaskIds = new Set(areaTasks.map((t) => t.id));
    const areaSessions = sessions.filter((s) => s.taskId && areaTaskIds.has(s.taskId));
    const areaActivities = activities.filter((a) => a.areaId === area.id || (a.taskId && areaTaskIds.has(a.taskId)));
    const focusMinutes =
      areaSessions.reduce((acc, s) => acc + (s.durationMinutes ?? 0), 0) +
      areaActivities.reduce((acc, a) => acc + (a.durationMinutes ?? 0), 0);
    const focusHours = Math.round((focusMinutes / 60) * 10) / 10;
    const areaCompleted = areaTasks.filter((t) => t.status === "COMPLETED").length;

    return {
      areaId: area.id,
      name: area.name,
      color: area.color,
      goalCount: area.goals.length,
      taskCount: areaTasks.length,
      completedTaskCount: areaCompleted,
      focusMinutes,
      focusHours,
    };
  });

  const totalAreaFocusMinutes = rawAreaDistribution.reduce((acc, a) => acc + a.focusMinutes, 0);
  const totalTasksAcrossAreas = rawAreaDistribution.reduce((acc, a) => acc + a.taskCount, 0);

  const areaDistribution = rawAreaDistribution.map((a) => {
    let percentage = 0;
    if (totalAreaFocusMinutes > 0) {
      percentage = Math.round((a.focusMinutes / totalAreaFocusMinutes) * 100);
    } else if (totalTasksAcrossAreas > 0) {
      percentage = Math.round((a.taskCount / totalTasksAcrossAreas) * 100);
    }
    return {
      ...a,
      percentage,
    };
  });

  return {
    period: {
      type: period,
      start,
      end,
    },
    goals: {
      total: totalGoals,
      active: activeGoals,
      completed: completedGoals,
      completionRate: goalCompletionRate,
    },
    tasks: {
      total: totalTasks,
      pending: pendingTasks,
      inProgress: inProgressTasks,
      completed: completedTasks,
      overdue: overdueTasks,
      completionRate: taskCompletionRate,
    },
    sessions: {
      totalCount: sessions.length,
      totalMinutes: totalSessionMinutes,
      totalHours: totalSessionHours,
      averageSessionMinutes,
      averageUnderstanding,
    },
    activities: {
      totalCount: activities.length,
      totalMinutes: totalActivityMinutes,
      totalHours: totalActivityHours,
      byCategory,
    },
    trends,
    goalProgress,
    areaDistribution,
  };
}
