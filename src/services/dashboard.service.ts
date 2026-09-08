import { prisma } from "@/lib/prisma";
import type { Prisma } from "../generated/prisma/client";
import {
  calculateGoalProgress,
  calculateSessionDurationMinutes,
  selectNextAction,
  type NextActionTaskLike,
} from "./progress.service";
import { getPeriodReview, getPeriodMetrics, getWeekPeriod } from "./review.service";
import { getDashboardAnalytics } from "./analytics.service";

type GoalWithStages = Prisma.GoalGetPayload<{
  include: {
    stages: {
      include: {
        tasks: true;
      };
    };
  };
}>;

type SessionWithTask = Prisma.SessionGetPayload<{
  include: {
    task: {
      include: {
        stage: {
          include: {
            goal: true;
          };
        };
      };
    };
  };
}>;

export type DashboardActivity = {
  id: string;
  label: string;
  detail: string;
  timestamp: Date;
  kind: "session" | "task" | "capture";
  entityId: string;
};

export type DashboardData = {
  activeGoals: GoalWithStages[];
  activeGoalCount: number;
  completedTaskCount: number;
  totalTaskCount: number;
  totalProgress: number;
  studyMinutesToday: number;
  recentSessions: SessionWithTask[];
  recentActivity: DashboardActivity[];
  nextAction: ReturnType<typeof selectNextAction>;
  reviewSummary: { goalId: string; periodStart: Date; periodEnd: Date; review: Awaited<ReturnType<typeof getPeriodReview>>; metrics: Awaited<ReturnType<typeof getPeriodMetrics>> } | null;
};

function isSameLocalDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatMinutes(minutes: number) {
  return `${minutes} mnt`;
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const now = new Date();

  const [goals, sessions, recentCaptures] = await Promise.all([
    prisma.goal.findMany({
      where: {
        userId,
        status: {
          not: "COMPLETED",
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        stages: {
          orderBy: {
            order: "asc",
          },
          include: {
            tasks: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
      },
    }),
    prisma.session.findMany({
      where: { userId },
      orderBy: {
        startedAt: "desc",
      },
      take: 10,
      include: {
        task: {
          include: {
            stage: {
              include: {
                goal: true,
              },
            },
          },
        },
      },
    }),
    prisma.capture.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const tasks: NextActionTaskLike[] = goals.flatMap((goal) =>
    goal.stages.flatMap((stage) =>
      stage.tasks.map((task) => ({
        id: task.id,
        goalId: goal.id,
        stageId: stage.id,
        name: task.title,
        status: task.status,
        priority: task.priority,
        estimatedHours: task.estimatedHours,
        goalName: goal.title,
        stageName: stage.name,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
      })),
    ),
  );

  const totalTaskCount = tasks.length;
  const completedTaskCount = tasks.filter(
    (task) => task.status === "COMPLETED",
  ).length;

  const totalProgress =
    goals.length === 0
      ? 0
      : Math.round(
          goals.reduce(
            (sum, goal) => sum + calculateGoalProgress(goal.stages),
            0,
          ) / goals.length,
        );

  const studyMinutesToday = sessions.reduce((sum, session) => {
    const finishedAt = session.endedAt ?? now;

    if (!isSameLocalDay(finishedAt, now)) {
      return sum;
    }

    return (
      sum +
      (session.durationMinutes ??
        calculateSessionDurationMinutes(session.startedAt, finishedAt))
    );
  }, 0);

  const nextAction = selectNextAction(tasks);
  const period = getWeekPeriod(now);
  const reviewGoal = goals[0];
  const reviewSummary = reviewGoal
    ? { goalId: reviewGoal.id, ...period, review: await getPeriodReview(reviewGoal.id, period.periodStart, period.periodEnd, userId), metrics: await getPeriodMetrics(reviewGoal.id, period.periodStart, period.periodEnd, userId) }
    : null;

  const recentActivity: DashboardActivity[] = [
    ...recentCaptures.map((capture) => ({
      id: `capture-${capture.id}`,
      kind: "capture" as const,
      label: capture.content.slice(0, 60) + (capture.content.length > 60 ? "…" : ""),
      detail: "Catat cepat",
      timestamp: capture.createdAt,
      entityId: capture.id,
    })),
    ...sessions.map((session) => ({
      id: `session-${session.id}`,
      kind: "session" as const,
      label: session.task.title,
      detail: formatMinutes(
        session.durationMinutes ??
          calculateSessionDurationMinutes(
            session.startedAt,
            session.endedAt ?? now,
          ),
      ),
      timestamp: session.endedAt ?? session.startedAt,
      entityId: session.id,
    })),
    ...tasks
      .filter((task) => task.status === "COMPLETED" && task.startedAt)
      .slice(0, 5)
      .map((task) => ({
        id: `task-${task.id}`,
        kind: "task" as const,
        label: task.name,
        detail: `${task.goalName} - ${task.stageName}`,
        timestamp: task.startedAt ?? task.createdAt,
        entityId: task.id,
      })),
  ]
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
    .slice(0, 10);

  return {
    activeGoals: goals,
    activeGoalCount: goals.length,
    completedTaskCount,
    totalTaskCount,
    totalProgress,
    studyMinutesToday,
    recentSessions: sessions,
    recentActivity,
    nextAction,
    reviewSummary,
  };
}

export type MissionControlData = {
  user: {
    name: string;
    role: string;
    streakDays: number;
    focusLoadPct: number;
  };
  activeSession: {
    id: string;
    taskId: string;
    taskTitle: string;
    taskDescription: string;
    parentTitle: string;
    startedAt: string;
    elapsedSeconds: number;
    targetSeconds: number;
    obstacleNote: string;
    xpBonus: number;
  } | null;
  nextAction: {
    id: string;
    title: string;
    description: string;
    priority: string;
    estimatedMinutes: number;
    dueDateLabel: string;
  } | null;
  todayQueue: {
    id: string;
    taskId: string;
    title: string;
    status: "COMPLETED" | "IN_PROGRESS" | "TODO";
    priority: string;
    parentTitle: string;
    estimatedHours: number;
    actualHours: number;
    dueDateLabel?: string;
    isDueTomorrow?: boolean;
    isOverdue?: boolean;
  }[];
  todayCompletedCount: number;
  todayTotalCount: number;
  todayProgressPct: number;
  vitals: {
    focusHoursTodayLabel: string;
    focusDiffPercent: number;
    sparklinePoints: number[];
    tasksDoneLabel: string;
    dayVelocityPct: number;
    streakDays: number;
    personalBestStreak: number;
    alignmentPct: number;
  };
  quickCaptures: {
    id: string;
    content: string;
    category: "IDEA" | "TASK_CANDIDATE" | "NOTE" | "REMINDER";
    createdAtLabel: string;
    tagLabel: string;
  }[];
  radar72h: {
    id: string;
    title: string;
    subtitle: string;
    urgencyColor: "coral-rose" | "secondary" | "tertiary";
    badgeText: string;
  }[];
  activeProjects: {
    id: string;
    title: string;
    techStack: string;
    healthStatus: "On Track" | "Needs Review" | "Ahead of Plan";
    healthColor: "tertiary" | "luminous-amber" | "primary";
    targetDateLabel: string;
    activeMilestone: string;
    progressPct: number;
  }[];
  pillarAllocation: {
    totalHoursLogged: number;
    pillars: {
      name: string;
      pct: number;
      hoursLogged: number;
      colorClass: string;
    }[];
  };
  heatmap: {
    totalQuarterHours: number;
    avgDailyHours: number;
    weeks: {
      days: {
        date: string;
        minutes: number;
        intensity: 0 | 1 | 2 | 3 | 4;
      }[];
    }[];
  };
  aiDiagnostics: {
    id: string;
    type: "warning" | "momentum" | "schedule";
    emoji: string;
    title: string;
    description: string;
  }[];
};

function startOfDayDate(d: Date) {
  const res = new Date(d);
  res.setHours(0, 0, 0, 0);
  return res;
}

function endOfDayDate(d: Date) {
  const res = new Date(d);
  res.setHours(23, 59, 59, 999);
  return res;
}

export async function getMissionControlData(userId: string): Promise<MissionControlData> {
  const now = new Date();
  const todayStart = startOfDayDate(now);
  const todayEnd = endOfDayDate(now);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 3600 * 1000);
  const last7DaysStart = new Date(todayStart.getTime() - 7 * 24 * 3600 * 1000);
  const last84DaysStart = new Date(todayStart.getTime() - 84 * 24 * 3600 * 1000);

  const [
    userRecord,
    activeSessionRecord,
    focusList,
    todayPendingTasks,
    allPendingTasks,
    recentCaptures,
    upcomingRadarTasks,
    calendarEvents,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    prisma.session.findFirst({
      where: { userId, endedAt: null },
      include: {
        task: {
          include: {
            stage: { include: { goal: true } },
            project: true,
            area: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
    }),
    prisma.dailyFocus.findMany({
      where: { userId, date: { gte: todayStart, lte: todayEnd } },
      include: {
        task: {
          include: {
            stage: { include: { goal: true } },
            project: true,
            area: true,
          },
        },
      },
      orderBy: { order: "asc" },
    }),
    prisma.task.findMany({
      where: {
        userId,
        status: { notIn: ["COMPLETED", "CANCELLED", "ARCHIVED"] },
        OR: [{ dueDate: { gte: todayStart, lte: todayEnd } }, { status: "IN_PROGRESS" }],
      },
      include: {
        stage: { include: { goal: true } },
        project: true,
        area: true,
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
    prisma.task.findMany({
      where: {
        userId,
        status: { notIn: ["COMPLETED", "CANCELLED", "ARCHIVED"] },
      },
      include: {
        stage: { include: { goal: true } },
        project: true,
        area: true,
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      take: 10,
    }),
    prisma.capture.findMany({
      where: { userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.task.findMany({
      where: {
        userId,
        status: { notIn: ["COMPLETED", "CANCELLED", "ARCHIVED"] },
        dueDate: { gte: now, lte: new Date(now.getTime() + 72 * 3600 * 1000) },
      },
      include: {
        project: true,
        stage: { include: { goal: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 4,
    }),
    prisma.calendarEvent.findMany({
      where: {
        userId,
        startTime: { gte: now, lte: new Date(now.getTime() + 72 * 3600 * 1000) },
      },
      orderBy: { startTime: "asc" },
      take: 4,
    }),
  ]);

  const [
    activeProjectsList,
    activeGoalsList,
    areasList,
    todaySessions,
    yesterdaySessions,
    recent7DaysSessions,
    last84DaysSessions,
    totalTaskCount,
    alignedTaskCount,
    analytics,
  ] = await Promise.all([
    prisma.project.findMany({
      where: {
        userId,
        status: "ACTIVE",
      },
      include: {
        milestones: { orderBy: { order: "asc" } },
        tasks: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
    prisma.goal.findMany({
      where: {
        userId,
        status: "ACTIVE",
      },
      include: {
        stages: {
          include: {
            tasks: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
    prisma.area.findMany({
      where: { userId, isActive: true },
      include: {
        tasks: {
          include: { sessions: true },
        },
      },
      take: 5,
    }),
    prisma.session.findMany({
      where: {
        userId,
        startedAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.session.findMany({
      where: {
        userId,
        startedAt: { gte: yesterdayStart, lt: todayStart },
      },
    }),
    prisma.session.findMany({
      where: {
        userId,
        startedAt: { gte: last7DaysStart },
      },
      orderBy: { startedAt: "asc" },
    }),
    prisma.session.findMany({
      where: {
        userId,
        startedAt: { gte: last84DaysStart },
      },
      select: { startedAt: true, durationMinutes: true },
    }),
    prisma.task.count({ where: { userId } }),
    prisma.task.count({
      where: {
        userId,
        OR: [{ goalId: { not: null } }, { projectId: { not: null } }, { areaId: { not: null } }],
      },
    }),
    getDashboardAnalytics({ days: 30 }, userId).catch(() => null),
  ]);

  // 1. User & Telemetry
  const userName = userRecord?.name || userRecord?.email?.split("@")[0] || "Operator";
  const todayMinutes = todaySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const yesterdayMinutes = yesterdaySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const focusLoadPct = Math.min(100, Math.round((todayMinutes / 240) * 100)) || (todaySessions.length > 0 ? 35 : 0);

  // 2. Active Pomodoro Hero
  let activeSessionData: MissionControlData["activeSession"] = null;
  if (activeSessionRecord && activeSessionRecord.task) {
    const task = activeSessionRecord.task;
    const elapsed = Math.max(
      0,
      Math.floor((now.getTime() - activeSessionRecord.startedAt.getTime()) / 1000),
    );
    const parentTitle = task.project?.title
      ? `📁 ${task.project.title}`
      : task.stage?.goal?.title
        ? `📁 ${task.stage.goal.title}`
        : task.area?.name
          ? `📍 ${task.area.name}`
          : "📁 Task Personal";

    activeSessionData = {
      id: activeSessionRecord.id,
      taskId: task.id,
      taskTitle: task.title,
      taskDescription: task.description || "Sesi fokus sedang berjalan.",
      parentTitle,
      startedAt: activeSessionRecord.startedAt.toISOString(),
      elapsedSeconds: elapsed,
      targetSeconds: 25 * 60,
      obstacleNote: activeSessionRecord.obstacle || "",
      xpBonus: 150,
    };
  }

  // 3. Next Action Spotlight
  const topTask = allPendingTasks[0];
  const nextAction: MissionControlData["nextAction"] = topTask
    ? {
        id: topTask.id,
        title: topTask.title,
        description:
          topTask.description ||
          (topTask.project?.title
            ? `Proyek: ${topTask.project.title}`
            : topTask.stage?.goal?.title
              ? `Target: ${topTask.stage.goal.title}`
              : "Tugas prioritas tinggi untuk diselesaikan hari ini."),
        priority:
          topTask.priority === "URGENT"
            ? "Prioritas Mendesak"
            : topTask.priority === "HIGH"
              ? "Prioritas Tinggi"
              : "Prioritas Normal",
        estimatedMinutes: Math.round((topTask.estimatedHours || 0.5) * 60),
        dueDateLabel: topTask.dueDate
          ? `Tenggat: ${new Intl.DateTimeFormat("id-ID", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(topTask.dueDate))}`
          : "Hari ini",
      }
    : null;

  // 4. Today Focus Queue
  let todayQueue: MissionControlData["todayQueue"] = [];
  if (focusList.length > 0) {
    todayQueue = focusList.map((f) => {
      const t = f.task;
      const isCompleted = t.status === "COMPLETED";
      const isRunning = activeSessionRecord?.taskId === t.id;
      const parentTitle = t.project?.title
        ? `📁 ${t.project.title}`
        : t.stage?.goal?.title
          ? `📁 ${t.stage.goal.title}`
          : t.area?.name
            ? `📍 ${t.area.name}`
            : "📁 Personal";

      return {
        id: f.id,
        taskId: t.id,
        title: t.title,
        status: isCompleted ? "COMPLETED" : isRunning ? "IN_PROGRESS" : "TODO",
        priority: t.priority,
        parentTitle,
        estimatedHours: t.estimatedHours || 1.0,
        actualHours: t.actualHours || 0,
        dueDateLabel: t.dueDate
          ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(t.dueDate))
          : undefined,
      };
    });
  } else if (todayPendingTasks.length > 0) {
    todayQueue = todayPendingTasks.map((t) => {
      const parentTitle = t.project?.title
        ? `📁 ${t.project.title}`
        : t.stage?.goal?.title
          ? `📁 ${t.stage.goal.title}`
          : t.area?.name
            ? `📍 ${t.area.name}`
            : "📁 Personal";

      return {
        id: `today-${t.id}`,
        taskId: t.id,
        title: t.title,
        status: t.status === "IN_PROGRESS" ? "IN_PROGRESS" : "TODO",
        priority: t.priority,
        parentTitle,
        estimatedHours: t.estimatedHours || 1.0,
        actualHours: t.actualHours || 0,
        dueDateLabel: t.dueDate
          ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(t.dueDate))
          : undefined,
      };
    });
  }

  const todayCompletedCount = todayQueue.filter((t) => t.status === "COMPLETED").length;
  const todayTotalCount = todayQueue.length;
  const todayProgressPct =
    todayTotalCount > 0 ? Math.round((todayCompletedCount / todayTotalCount) * 100) : 0;

  // 5. Vitals 2x2 Bento
  const focusDiffPercent =
    yesterdayMinutes > 0
      ? Math.round(((todayMinutes - yesterdayMinutes) / yesterdayMinutes) * 100)
      : todayMinutes > 0
        ? 100
        : 0;

  // Sparkline: 7 points from recent 7 days
  const sparklinePoints = [2, 2, 2, 2, 2, 2, 2];
  if (recent7DaysSessions.length > 0) {
    const dailyMap: Record<number, number> = {};
    recent7DaysSessions.forEach((s) => {
      const dayDiff = Math.floor((now.getTime() - s.startedAt.getTime()) / (24 * 3600 * 1000));
      if (dayDiff >= 0 && dayDiff < 7) {
        dailyMap[dayDiff] = (dailyMap[dayDiff] || 0) + (s.durationMinutes || 25);
      }
    });
    for (let i = 6; i >= 0; i--) {
      if (dailyMap[i] !== undefined) {
        sparklinePoints[6 - i] = Math.min(24, Math.max(2, Math.round(dailyMap[i] / 10)));
      }
    }
  }

  const focusHours = Math.floor(todayMinutes / 60);
  const focusRemMinutes = todayMinutes % 60;
  const streakDays = Math.max(todaySessions.length > 0 ? 1 : 0, recent7DaysSessions.length > 0 ? 3 : 0);
  const alignmentPct = totalTaskCount > 0 ? Math.round((alignedTaskCount / totalTaskCount) * 100) : 100;

  // 6. Quick Capture Inbox
  const quickCaptures: MissionControlData["quickCaptures"] = recentCaptures.map((c) => ({
    id: c.id,
    content: c.content,
    category: c.category as "IDEA" | "TASK_CANDIDATE" | "NOTE" | "REMINDER",
    createdAtLabel: new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    }).format(new Date(c.createdAt)),
    tagLabel:
      c.category === "IDEA"
        ? "Ide Baru"
        : c.category === "NOTE"
          ? "Catatan"
          : c.category === "REMINDER"
            ? "Pengingat"
            : "Kandidat Task",
  }));

  // 7. 72-Hour Radar & Deadlines
  const taskRadarItems = upcomingRadarTasks.map((t) => {
    const hoursLeft = Math.max(1, Math.round((new Date(t.dueDate!).getTime() - now.getTime()) / (3600 * 1000)));
    const urgencyColor = hoursLeft <= 12 ? ("coral-rose" as const) : hoursLeft <= 36 ? ("secondary" as const) : ("tertiary" as const);
    return {
      id: `task-${t.id}`,
      title: t.title,
      subtitle: t.project?.title || t.stage?.goal?.title || "Tugas Mandiri",
      urgencyColor,
      badgeText: hoursLeft <= 24 ? `${hoursLeft} jam lagi` : `${Math.ceil(hoursLeft / 24)} hari lagi`,
    };
  });

  const eventRadarItems = calendarEvents.map((e) => {
    const hoursLeft = Math.max(1, Math.round((new Date(e.startTime).getTime() - now.getTime()) / (3600 * 1000)));
    return {
      id: `event-${e.id}`,
      title: e.title,
      subtitle: e.location || "Agenda Kalender",
      urgencyColor: "secondary" as const,
      badgeText: hoursLeft <= 24 ? `${hoursLeft} jam lagi` : `${Math.ceil(hoursLeft / 24)} hari lagi`,
    };
  });

  const radar72h = [...taskRadarItems, ...eventRadarItems].slice(0, 4);

  // 8. Active Projects Pulse
  const activeProjects: MissionControlData["activeProjects"] = [];

  // Map real projects
  activeProjectsList.forEach((p) => {
    const totalPTasks = p.tasks.length;
    const donePTasks = p.tasks.filter((t) => t.status === "COMPLETED").length;
    const pct = totalPTasks > 0 ? Math.round((donePTasks / totalPTasks) * 100) : 0;
    const activeM = p.milestones.find((m) => m.status !== "COMPLETED")?.title || "Fase Eksekusi";
    const healthStatus = pct >= 75 ? "Ahead of Plan" : pct <= 30 ? "Needs Review" : "On Track";
    const healthColor = healthStatus === "Ahead of Plan" ? "primary" : healthStatus === "Needs Review" ? "luminous-amber" : "tertiary";

    activeProjects.push({
      id: p.id,
      title: p.title,
      techStack: p.description || "Proyek Aktif",
      healthStatus,
      healthColor,
      targetDateLabel: p.targetDate
        ? `Tenggat ${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(p.targetDate))}`
        : "Jangka Panjang",
      activeMilestone: activeM,
      progressPct: pct,
    });
  });

  // If user has active goals and fewer than 3 projects, add active goals to portfolio
  if (activeProjects.length < 3 && activeGoalsList.length > 0) {
    activeGoalsList.slice(0, 3 - activeProjects.length).forEach((g) => {
      const gTasks = g.stages.flatMap((s) => s.tasks);
      const doneGTasks = gTasks.filter((t) => t.status === "COMPLETED").length;
      const pct = gTasks.length > 0 ? Math.round((doneGTasks / gTasks.length) * 100) : 0;
      const currentStage = g.stages.find((s) => s.tasks.some((t) => t.status !== "COMPLETED")) || g.stages[0];

      activeProjects.push({
        id: g.id,
        title: g.title,
        techStack: `Pilar ${g.type}`,
        healthStatus: pct >= 75 ? "Ahead of Plan" : pct <= 30 ? "Needs Review" : "On Track",
        healthColor: pct >= 75 ? "primary" : pct <= 30 ? "luminous-amber" : "tertiary",
        targetDateLabel: g.targetDate
          ? `Tenggat ${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(g.targetDate))}`
          : "Target Berkelanjutan",
        activeMilestone: currentStage?.name || "Tahap Pertama",
        progressPct: pct,
      });
    });
  }

  // 9. Pillar Allocation
  let pillarAllocation: MissionControlData["pillarAllocation"] = {
    totalHoursLogged: 0,
    pillars: [],
  };

  if (areasList.length > 0) {
    const colorClasses = ["bg-secondary", "bg-primary-container", "bg-tertiary", "bg-luminous-amber"];
    const areaHours = areasList.map((a, i) => {
      const minutes = a.tasks.flatMap((t) => t.sessions).reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
      return {
        name: a.name,
        hoursLogged: Math.round((minutes / 60) * 10) / 10,
        colorClass: colorClasses[i % colorClasses.length],
      };
    });
    const totalH = areaHours.reduce((acc, cur) => acc + cur.hoursLogged, 0);
    pillarAllocation = {
      totalHoursLogged: Math.round(totalH * 10) / 10,
      pillars: areaHours.map((ah) => ({
        ...ah,
        pct: totalH > 0 ? Math.round((ah.hoursLogged / totalH) * 100) : Math.round(100 / areaHours.length),
      })),
    };
  }

  // 10. Heatmap (12 weeks x 7 days)
  const heatmapWeeks: MissionControlData["heatmap"]["weeks"] = [];
  const sessionDateMap: Record<string, number> = {};

  last84DaysSessions.forEach((s) => {
    const dayKey = s.startedAt.toISOString().slice(0, 10);
    sessionDateMap[dayKey] = (sessionDateMap[dayKey] || 0) + (s.durationMinutes || 0);
  });

  for (let w = 11; w >= 0; w--) {
    const days = [];
    for (let d = 6; d >= 0; d--) {
      const targetDate = new Date(todayStart.getTime() - (w * 7 + d) * 24 * 3600 * 1000);
      const dateKey = targetDate.toISOString().slice(0, 10);
      const minutes = sessionDateMap[dateKey] || 0;
      const intensity = minutes === 0 ? 0 : minutes <= 30 ? 1 : minutes <= 60 ? 2 : minutes <= 120 ? 3 : 4;

      days.push({
        date: dateKey,
        minutes,
        intensity: intensity as 0 | 1 | 2 | 3 | 4,
      });
    }
    heatmapWeeks.push({ days });
  }

  const quarterlyMinutes = last84DaysSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const totalQuarterHours = Math.round(quarterlyMinutes / 60);
  const avgDailyHours = Math.round((totalQuarterHours / 84) * 10) / 10;

  const heatmap: MissionControlData["heatmap"] = {
    totalQuarterHours,
    avgDailyHours,
    weeks: heatmapWeeks,
  };

  // 11. AI Diagnostics
  const aiDiagnostics: MissionControlData["aiDiagnostics"] = [];

  if (analytics?.bottlenecks && analytics.bottlenecks.length > 0) {
    const highBottleneck = analytics.bottlenecks.find((b) => b.severity === "HIGH") || analytics.bottlenecks[0];
    aiDiagnostics.push({
      id: "diag-bottleneck-1",
      type: "warning",
      emoji: "⚠️",
      title: `Hambatan Terdeteksi: ${highBottleneck.taskName}`,
      description: highBottleneck.reason || "Task ini memerlukan perhatian untuk memperlancar alur progres.",
    });

    if (analytics.bottlenecks.length > 1) {
      const secondBottleneck = analytics.bottlenecks[1];
      aiDiagnostics.push({
        id: "diag-bottleneck-2",
        type: "warning",
        emoji: "⚡",
        title: `Task Tertahan: ${secondBottleneck.taskName}`,
        description: secondBottleneck.reason || "Task berada dalam antrean tanpa progres terkini.",
      });
    }
  }

  if (todaySessions.length >= 2 || todayMinutes >= 60) {
    aiDiagnostics.push({
      id: "diag-momentum",
      type: "momentum",
      emoji: "🔥",
      title: "Fase Momentum Tinggi",
      description: `${todayCompletedCount} task selesai dan ${todayMinutes} menit fokus tercatat untuk hari ini. Pertahankan irama kerja!`,
    });
  } else {
    aiDiagnostics.push({
      id: "diag-start",
      type: "schedule",
      emoji: "🎯",
      title: "Mulai Sesi Fokus Hari Ini",
      description: "Pilih task prioritas di spotlight atau queue untuk memulai sesi kerja pertama Anda.",
    });
  }

  if (aiDiagnostics.length < 3) {
    aiDiagnostics.push({
      id: "diag-system",
      type: "schedule",
      emoji: "📅",
      title: "Siklus Review Mingguan",
      description: "Evaluasi capaian pekan ini dan rencanakan prioritas pekan berikutnya di menu Refleksi.",
    });
  }

  return {
    user: {
      name: userName,
      role: "Pengguna Utama",
      streakDays,
      focusLoadPct,
    },
    activeSession: activeSessionData,
    nextAction,
    todayQueue,
    todayCompletedCount,
    todayTotalCount,
    todayProgressPct,
    vitals: {
      focusHoursTodayLabel: todayMinutes >= 60 ? `${focusHours}h ${focusRemMinutes}m` : `${todayMinutes}m`,
      focusDiffPercent,
      sparklinePoints,
      tasksDoneLabel: `${todayCompletedCount} / ${todayTotalCount}`,
      dayVelocityPct: todayProgressPct,
      streakDays,
      personalBestStreak: Math.max(streakDays, 7),
      alignmentPct,
    },
    quickCaptures,
    radar72h,
    activeProjects,
    pillarAllocation,
    heatmap,
    aiDiagnostics,
  };
}
