import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const taskInclude = {
  stage: { include: { goal: true } },
  project: { include: { goal: true } },
  area: true,
  goal: true,
  milestone: true,
  sessions: true,
} as const satisfies Prisma.TaskInclude;

export function findTodayFocus(userId: string, date: Date) {
  return prisma.dailyFocus.findMany({ where: { userId, date }, orderBy: { order: "asc" }, include: { task: { include: taskInclude } } });
}

export function findFocusById(userId: string, id: string) {
  return prisma.dailyFocus.findFirst({ where: { id, userId }, include: { task: { include: taskInclude } } });
}

export function findTaskForFocus(userId: string, taskId: string) {
  return prisma.task.findFirst({ where: { id: taskId, userId }, include: taskInclude });
}

export function createFocus(userId: string, date: Date, taskId: string, order: number) {
  return prisma.dailyFocus.create({ data: { userId, date, taskId, order }, include: { task: { include: taskInclude } } });
}

export function deleteFocus(userId: string, id: string) { return prisma.dailyFocus.deleteMany({ where: { id, userId } }); }
export function updateFocus(userId: string, id: string, order: number) { return prisma.dailyFocus.updateMany({ where: { id, userId }, data: { order } }); }

export function findTodayContext(userId: string) {
  return prisma.goal.findMany({
    where: { status: { not: "COMPLETED" }, userId },
    include: { stages: { include: { tasks: { include: { stage: { include: { goal: true } }, sessions: true } } } } },
  });
}

export function findTodayTasks(userId: string) {
  return prisma.task.findMany({
    where: {
      userId,
      status: { notIn: ["ARCHIVED", "CANCELLED"] },
    },
    include: {
      stage: { include: { goal: true } },
      project: { include: { goal: true } },
      milestone: true,
      area: true,
      goal: true,
      sessions: true,
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
}

export async function findTodayCalendarEvents(userId: string, start: Date, end: Date) {
  const events = await prisma.calendarEvent.findMany({
    where: {
      userId,
      OR: [
        {
          startTime: { lte: end },
          endTime: { gte: start },
        },
        {
          recurrence: { not: "NONE" },
          startTime: { lte: end },
        },
      ],
    },
    orderBy: { startTime: "asc" },
    include: {
      task: { select: { id: true, title: true, status: true } },
      project: { select: { id: true, title: true } },
    },
  });

  const targetDay = start.getDay();
  const targetDate = start.getDate();

  const projected = events.flatMap((event) => {
    if (event.recurrence === "NONE") {
      return [event];
    }

    const isDirect = event.startTime <= end && event.endTime >= start;
    let matchesRecurrence = false;
    if (event.recurrence === "DAILY") {
      matchesRecurrence = true;
    } else if (event.recurrence === "WEEKLY") {
      matchesRecurrence = event.startTime.getDay() === targetDay;
    } else if (event.recurrence === "MONTHLY") {
      matchesRecurrence = event.startTime.getDate() === targetDate;
    }

    if (!matchesRecurrence) return [];
    if (isDirect) return [event];

    const durationMs = event.endTime.getTime() - event.startTime.getTime();
    const projectedStart = new Date(start);
    projectedStart.setHours(
      event.startTime.getHours(),
      event.startTime.getMinutes(),
      event.startTime.getSeconds(),
      0
    );
    const projectedEnd = new Date(projectedStart.getTime() + durationMs);

    return [
      {
        ...event,
        startTime: projectedStart,
        endTime: projectedEnd,
      },
    ];
  });

  return projected.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

export function findTodaySessions(userId: string, start: Date, end: Date) {
  return prisma.session.findMany({
    where: { userId, OR: [{ endedAt: { gte: start, lte: end } }, { endedAt: null, startedAt: { lte: end } }] },
    orderBy: { startedAt: "desc" },
    include: {
      task: {
        include: {
          stage: { include: { goal: true } },
          project: { include: { goal: true } },
          area: true,
          goal: true,
        },
      },
    },
  });
}

export function createCapture(userId: string, content: string) { return prisma.capture.create({ data: { userId, content } }); }

export function findRecentCaptures(userId: string, limit: number) {
  return prisma.capture.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: limit });
}

export function findCapture(userId: string, id: string) {
  return prisma.capture.findFirst({ where: { id, userId } });
}

export function deleteCaptureById(userId: string, id: string) {
  return prisma.capture.deleteMany({ where: { id, userId } });
}
