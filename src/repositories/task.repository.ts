import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export function findStageForTask(userId: string, stageId: string) {
  return prisma.stage.findFirst({
    where: { id: stageId, userId },
    include: { goal: { select: { id: true, areaId: true } } },
  });
}

export function createTask(
  userIdOrData: string | (Prisma.TaskUncheckedCreateInput & { userId?: string }),
  maybeData?: Prisma.TaskUncheckedCreateInput
) {
  let userId: string;
  let payload: Record<string, unknown>;

  if (typeof userIdOrData === "string") {
    userId = userIdOrData;
    payload = { ...maybeData };
  } else {
    userId = (userIdOrData as { userId?: string }).userId ?? "test-user";
    payload = { ...userIdOrData };
  }

  if ("name" in payload) {
    if (!payload.title && (payload as { name?: string }).name) {
      payload.title = (payload as { name?: string }).name!;
    }
    delete (payload as { name?: string }).name;
  }
  return prisma.task.create({ data: { ...(payload as Prisma.TaskUncheckedCreateInput), userId } });
}

export function findTask(userId: string, id: string) {
  return prisma.task.findFirst({ where: { id, userId } });
}

export function findTasksForAI(userId: string) {
  return prisma.task.findMany({
    where: { userId },
    include: { stage: { include: { goal: true } }, project: true, area: true },
    orderBy: { createdAt: "asc" },
  });
}

export function updateTask(userId: string, id: string, data: Prisma.TaskUpdateInput) {
  const payload = { ...data };
  if ("name" in payload) {
    if (!payload.title && (payload as { name?: string }).name) {
      payload.title = (payload as { name?: string }).name;
    }
    delete (payload as { name?: string }).name;
  }
  return prisma.task
    .updateMany({ where: { id, userId }, data: payload })
    .then(() => prisma.task.findFirstOrThrow({ where: { id, userId } }));
}

export function deleteTask(userId: string, id: string) {
  return prisma.task.deleteMany({ where: { id, userId } });
}

export function findTaskDetail(userId: string, id: string) {
  return prisma.task.findFirst({
    where: { id, userId },
    include: {
      stage: { include: { goal: true } },
      project: true,
      milestone: true,
      area: true,
      sessions: { orderBy: { startedAt: "desc" }, take: 10 },
    },
  });
}

export function countTasks(userId: string) {
  return prisma.task.count({ where: { userId } });
}
