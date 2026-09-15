import {
  createCalendarEvent as createCalendarEventRecord,
  deleteCalendarEvent as deleteCalendarEventRecord,
  findCalendarEvent as findCalendarEventRecord,
  findCalendarEvents as findCalendarEventsRecord,
  updateCalendarEvent as updateCalendarEventRecord,
} from "@/repositories/calendar-event.repository";
import {
  createCalendarEventSchema,
  updateCalendarEventSchema,
  type CreateCalendarEventInput,
  type UpdateCalendarEventInput,
} from "@/schemas/calendar-event.schema";
import { requireUserId } from "@/lib/ownership";
import { prisma } from "@/lib/prisma";
import type { EventType, RecurrenceType } from "@/generated/prisma/client";

export class CalendarEventServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "EVENT_NOT_FOUND" | "INVALID_TIME_RANGE" | "TASK_NOT_FOUND" | "PROJECT_NOT_FOUND" | "INVALID_INPUT" = "EVENT_NOT_FOUND"
  ) {
    super(message);
    this.name = "CalendarEventServiceError";
  }
}

export async function createCalendarEvent(input: CreateCalendarEventInput, userId?: string) {
  const owner = requireUserId(userId);
  const parsed = createCalendarEventSchema.parse(input);

  const start = new Date(parsed.startTime);
  const end = parsed.endTime ? new Date(parsed.endTime) : new Date(start.getTime());
  if (end.getTime() < start.getTime()) {
    throw new CalendarEventServiceError("Waktu selesai tidak boleh mendahului waktu mulai.", "INVALID_TIME_RANGE");
  }

  // Validate task ownership if provided
  if (parsed.taskId) {
    const task = await prisma.task.findFirst({ where: { id: parsed.taskId, userId: owner } });
    if (!task) {
      throw new CalendarEventServiceError("Task tidak ditemukan atau bukan milik Anda.", "TASK_NOT_FOUND");
    }
  }

  // Validate project ownership if provided
  if (parsed.projectId) {
    const project = await prisma.project.findFirst({ where: { id: parsed.projectId, userId: owner } });
    if (!project) {
      throw new CalendarEventServiceError("Project tidak ditemukan atau bukan milik Anda.", "PROJECT_NOT_FOUND");
    }
  }

  return createCalendarEventRecord(owner, {
    title: parsed.title,
    description: parsed.description,
    startTime: start,
    endTime: end,
    isAllDay: parsed.isAllDay,
    eventType: parsed.eventType as EventType,
    recurrence: parsed.recurrence as RecurrenceType,
    location: parsed.location,
    taskId: parsed.taskId,
    projectId: parsed.projectId,
    reminderMinutes: parsed.reminderMinutes,
    ignoreQuietHours: parsed.ignoreQuietHours,
    isCompleted: parsed.isCompleted ?? false,
    completedAt: parsed.isCompleted ? (parsed.completedAt ? new Date(parsed.completedAt) : new Date()) : null,
  });
}

export async function getCalendarEvents(
  userId?: string,
  filter?: {
    startFrom?: string | Date;
    startTo?: string | Date;
    eventType?: EventType;
    projectId?: string;
    taskId?: string;
  }
) {
  const owner = requireUserId(userId);
  return findCalendarEventsRecord(owner, {
    startFrom: filter?.startFrom ? new Date(filter.startFrom) : undefined,
    startTo: filter?.startTo ? new Date(filter.startTo) : undefined,
    eventType: filter?.eventType,
    projectId: filter?.projectId,
    taskId: filter?.taskId,
  });
}

export async function getCalendarEvent(id: string, userId?: string) {
  const owner = requireUserId(userId);
  const event = await findCalendarEventRecord(owner, id);
  if (!event) {
    throw new CalendarEventServiceError("Calendar event tidak ditemukan.", "EVENT_NOT_FOUND");
  }
  return event;
}

export async function updateCalendarEvent(id: string, input: UpdateCalendarEventInput, userId?: string) {
  const owner = requireUserId(userId);
  const existing = await findCalendarEventRecord(owner, id);
  if (!existing) {
    throw new CalendarEventServiceError("Calendar event tidak ditemukan.", "EVENT_NOT_FOUND");
  }

  const parsed = updateCalendarEventSchema.parse(input);

  const start = parsed.startTime ? new Date(parsed.startTime) : existing.startTime;
  const end = parsed.endTime !== undefined
    ? (parsed.endTime ? new Date(parsed.endTime) : new Date(start.getTime()))
    : existing.endTime;
  if (end.getTime() < start.getTime()) {
    throw new CalendarEventServiceError("Waktu selesai tidak boleh mendahului waktu mulai.", "INVALID_TIME_RANGE");
  }

  if (parsed.taskId && parsed.taskId !== existing.taskId) {
    const task = await prisma.task.findFirst({ where: { id: parsed.taskId, userId: owner } });
    if (!task) {
      throw new CalendarEventServiceError("Task tidak ditemukan atau bukan milik Anda.", "TASK_NOT_FOUND");
    }
  }

  if (parsed.projectId && parsed.projectId !== existing.projectId) {
    const project = await prisma.project.findFirst({ where: { id: parsed.projectId, userId: owner } });
    if (!project) {
      throw new CalendarEventServiceError("Project tidak ditemukan atau bukan milik Anda.", "PROJECT_NOT_FOUND");
    }
  }

  let completedAtUpdate: Date | null | undefined = undefined;
  if (parsed.isCompleted !== undefined) {
    if (parsed.isCompleted) {
      completedAtUpdate = parsed.completedAt ? new Date(parsed.completedAt) : new Date();
    } else {
      completedAtUpdate = null;
    }
  } else if (parsed.completedAt !== undefined) {
    completedAtUpdate = parsed.completedAt ? new Date(parsed.completedAt) : null;
  }

  await updateCalendarEventRecord(owner, id, {
    ...(parsed.title !== undefined && { title: parsed.title }),
    ...(parsed.description !== undefined && { description: parsed.description }),
    ...(parsed.startTime !== undefined && { startTime: start }),
    ...(parsed.endTime !== undefined && { endTime: end }),
    ...(parsed.isAllDay !== undefined && { isAllDay: parsed.isAllDay }),
    ...(parsed.eventType !== undefined && { eventType: parsed.eventType as EventType }),
    ...(parsed.recurrence !== undefined && { recurrence: parsed.recurrence as RecurrenceType }),
    ...(parsed.location !== undefined && { location: parsed.location }),
    ...(parsed.taskId !== undefined && { taskId: parsed.taskId }),
    ...(parsed.projectId !== undefined && { projectId: parsed.projectId }),
    ...(parsed.reminderMinutes !== undefined && { reminderMinutes: parsed.reminderMinutes }),
    ...(parsed.ignoreQuietHours !== undefined && { ignoreQuietHours: parsed.ignoreQuietHours }),
    ...(parsed.isCompleted !== undefined && { isCompleted: parsed.isCompleted }),
    ...(completedAtUpdate !== undefined && { completedAt: completedAtUpdate }),
  });

  return findCalendarEventRecord(owner, id);
}

export async function deleteCalendarEvent(id: string, userId?: string) {
  const owner = requireUserId(userId);
  const existing = await findCalendarEventRecord(owner, id);
  if (!existing) {
    throw new CalendarEventServiceError("Calendar event tidak ditemukan.", "EVENT_NOT_FOUND");
  }

  await deleteCalendarEventRecord(owner, id);
  return { success: true, id };
}
