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

export function findTodayCalendarEvents(userId: string, start: Date, end: Date) {
  return prisma.calendarEvent.findMany({
    where: {
      userId,
      startTime: { lte: end },
      endTime: { gte: start },
    },
    orderBy: { startTime: "asc" },
    include: {
      task: { select: { id: true, title: true, status: true } },
      project: { select: { id: true, title: true } },
    },
  });
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
