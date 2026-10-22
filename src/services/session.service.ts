/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createSession,
  endSession as endSessionRecord,
  findActiveSessionByTaskId,
  findAnyActiveSession,
  findSessionById,
  findSessionsByTaskId,
  findTaskForSession,
  markTaskInProgress,
  recomputeTaskActualHours,
  deleteSessionById,
} from "@/repositories/session.repository";
import { createActivity as createActivityRecord } from "@/repositories/activity.repository";
import type { EndSessionInput } from "@/schemas/session.schema";
import { requireUserId } from "../lib/ownership";
import { prisma } from "@/lib/prisma";

export class SessionServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "TASK_NOT_FOUND" | "ACTIVE_SESSION_EXISTS" | "SESSION_NOT_FOUND" | "SESSION_ALREADY_ENDED",
  ) {
    super(message);
    this.name = "SessionServiceError";
  }
}

export function calculateDuration(startedAt: Date, endedAt: Date = new Date()) {
  return Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));
}

export async function startSession(taskId: string, userId?: string) {
  const owner = requireUserId(userId);
  const task = await findTaskForSession(taskId, owner);
  if (!task) {
    throw new SessionServiceError("Task tidak ditemukan.", "TASK_NOT_FOUND");
  }

  // Pre-check for friendly validation error
  if (await findActiveSessionByTaskId(taskId, owner)) {
    throw new SessionServiceError(
      "Task ini sudah memiliki session aktif.",
      "ACTIVE_SESSION_EXISTS",
    );
  }

  const otherActive = await findAnyActiveSession(owner);
  if (otherActive) {
    throw new SessionServiceError(
      otherActive.taskId === taskId
        ? "Task ini sudah memiliki session aktif."
        : "Masih ada sesi lain yang sedang berjalan. Akhiri sesi tersebut terlebih dahulu.",
      "ACTIVE_SESSION_EXISTS",
    );
  }

  try {
    const session = await createSession(taskId, owner);
    const taskStatus = task.status as string;
    if (taskStatus === "TODO" || taskStatus === "NOT_STARTED") {
      await markTaskInProgress(owner, taskId, task.startedAt ?? session.startedAt);
    }
    return session;
  } catch (err: any) {
    // Database-level constraint catch for concurrency protection
    if (err?.code === "P2002" || err?.message?.includes("idx_unique_active_session_per_user")) {
      throw new SessionServiceError(
        "Masih ada sesi lain yang sedang berjalan. Akhiri sesi tersebut terlebih dahulu.",
        "ACTIVE_SESSION_EXISTS",
      );
    }
    throw err;
  }
}

export function getActiveSession(taskId: string, userId?: string) {
  return findActiveSessionByTaskId(taskId, requireUserId(userId));
}

export function getAnyActiveSession(userId?: string) {
  return findAnyActiveSession(requireUserId(userId));
}

export function getSession(sessionId: string, userId?: string) {
  return findSessionById(sessionId, requireUserId(userId));
}

export function getSessionHistory(taskId: string, userId?: string) {
  return findSessionsByTaskId(taskId, requireUserId(userId));
}

export async function updateTaskActualHours(taskId: string, userId?: string) {
  return recomputeTaskActualHours(taskId, requireUserId(userId));
}

export async function endSession(sessionId: string, data: EndSessionInput, userId?: string) {
  const owner = requireUserId(userId);
  const session = await findSessionById(sessionId, owner);
  if (!session) {
    throw new SessionServiceError("Session tidak ditemukan.", "SESSION_NOT_FOUND");
  }
  if (session.endedAt) {
    throw new SessionServiceError(
      "Session ini sudah selesai.",
      "SESSION_ALREADY_ENDED",
    );
  }

  const endedAt = new Date();
  const endData = {
    endedAt,
    durationMinutes: calculateDuration(session.startedAt, endedAt),
    activity: data.activity || undefined,
    understanding: data.understanding,
    obstacle: data.obstacle || undefined,
    nextAction: data.nextAction || undefined,
  };

  const updated = await endSessionRecord(owner, sessionId, endData);
  await recomputeTaskActualHours(session.taskId, owner);

  if (endData.durationMinutes >= 1) {
    try {
      await createActivityRecord(owner, {
        title: session.task?.title ? `Sesi Fokus: ${session.task.title}` : "Sesi Fokus",
        category: "WORK",
        startTime: session.startedAt,
        endTime: endedAt,
        durationMinutes: endData.durationMinutes,
        notes: data.activity || data.obstacle ? `Aktivitas: ${data.activity || "-"}. Hambatan: ${data.obstacle || "-"}` : null,
        taskId: session.taskId,
        projectId: session.task?.projectId ?? null,
        areaId: session.task?.areaId ?? null,
      });
    } catch {
      // Non-blocking activity logging
    }
  }

  return updated;
}

export async function deleteSession(sessionId: string, userId?: string) {
  const owner = requireUserId(userId);
  const session = await findSessionById(sessionId, owner);
  if (!session) {
    throw new SessionServiceError("Session tidak ditemukan.", "SESSION_NOT_FOUND");
  }
  const deleted = await deleteSessionById(owner, sessionId);
  if (session.taskId) {
    await recomputeTaskActualHours(session.taskId, owner);
  }
  return deleted;
}

export async function getRecentSessionsWithTasks(userId: string, take: number = 5) {
  return prisma.session.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take,
    include: {
      task: {
        include: {
          stage: {
            include: { goal: true },
          },
        },
      },
    },
  });
}

export async function getTodaySessionDuration(userId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const agg = await prisma.session.aggregate({
    where: { userId, endedAt: { gte: startOfToday } },
    _sum: { durationMinutes: true },
  });
  return agg._sum.durationMinutes ?? 0;
}