import { prisma } from "@/lib/prisma";
import type { EventType, RecurrenceType } from "@/generated/prisma/client";

export function createCalendarEvent(
  userId: string,
  data: {
    title: string;
    description?: string | null;
    startTime: Date;
    endTime: Date;
    isAllDay?: boolean;
    eventType?: EventType;
    recurrence?: RecurrenceType;
    location?: string | null;
    taskId?: string | null;
    projectId?: string | null;
    reminderMinutes?: number | null;
    ignoreQuietHours?: boolean;
  }
) {
  return prisma.calendarEvent.create({
    data: {
      userId,
      title: data.title,
      description: data.description ?? null,
      startTime: data.startTime,
      endTime: data.endTime,
      isAllDay: data.isAllDay ?? false,
      eventType: data.eventType ?? "PERSONAL",
      recurrence: data.recurrence ?? "NONE",
      location: data.location ?? null,
      taskId: data.taskId ?? null,
      projectId: data.projectId ?? null,
      reminderMinutes: data.reminderMinutes ?? null,
      ignoreQuietHours: data.ignoreQuietHours ?? false,
    },
    include: {
      task: { select: { id: true, title: true } },
      project: { select: { id: true, title: true } },
    },
  });
}

export function findCalendarEvent(userId: string, id: string) {
  return prisma.calendarEvent.findFirst({
    where: { id, userId },
    include: {
      task: { select: { id: true, title: true } },
      project: { select: { id: true, title: true } },
    },
  });
}

export function findCalendarEvents(
  userId: string,
  filter?: {
    startFrom?: Date;
    startTo?: Date;
    eventType?: EventType;
    projectId?: string;
    taskId?: string;
  }
) {
  return prisma.calendarEvent.findMany({
    where: {
      userId,
      ...(filter?.startFrom && { startTime: { gte: filter.startFrom } }),
      ...(filter?.startTo && { startTime: { lte: filter.startTo } }),
      ...(filter?.eventType && { eventType: filter.eventType }),
      ...(filter?.projectId && { projectId: filter.projectId }),
      ...(filter?.taskId && { taskId: filter.taskId }),
    },
    orderBy: [{ startTime: "asc" }],
    include: {
      task: { select: { id: true, title: true } },
      project: { select: { id: true, title: true } },
    },
  });
}

export function updateCalendarEvent(
  userId: string,
  id: string,
  data: {
    title?: string;
    description?: string | null;
    startTime?: Date;
    endTime?: Date;
    isAllDay?: boolean;
    eventType?: EventType;
    recurrence?: RecurrenceType;
    location?: string | null;
    taskId?: string | null;
    projectId?: string | null;
    reminderMinutes?: number | null;
    ignoreQuietHours?: boolean;
  }
) {
  return prisma.calendarEvent.updateMany({
    where: { id, userId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.startTime !== undefined && { startTime: data.startTime }),
      ...(data.endTime !== undefined && { endTime: data.endTime }),
      ...(data.isAllDay !== undefined && { isAllDay: data.isAllDay }),
      ...(data.eventType !== undefined && { eventType: data.eventType }),
      ...(data.recurrence !== undefined && { recurrence: data.recurrence }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.taskId !== undefined && { taskId: data.taskId }),
      ...(data.projectId !== undefined && { projectId: data.projectId }),
      ...(data.reminderMinutes !== undefined && { reminderMinutes: data.reminderMinutes }),
      ...(data.ignoreQuietHours !== undefined && { ignoreQuietHours: data.ignoreQuietHours }),
    },
  });
}

export function deleteCalendarEvent(userId: string, id: string) {
  return prisma.calendarEvent.deleteMany({
    where: { id, userId },
  });
}
