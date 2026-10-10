import { prisma } from "@/lib/prisma";
import type { Prisma, HabitEvent } from "@/generated/prisma/client";
import type { DbClient } from "./tracked-habit.repository";

export async function createHabitEvent(
  data: Prisma.HabitEventUncheckedCreateInput,
  client: DbClient = prisma,
): Promise<HabitEvent> {
  return client.habitEvent.create({
    data,
  });
}

export async function findHabitEventById(
  id: string,
  userId: string,
  client: DbClient = prisma,
) {
  return client.habitEvent.findFirst({
    where: {
      id,
      userId,
      deletedAt: null,
    },
  });
}

export async function findHabitEventByIdempotencyKey(
  userId: string,
  idempotencyKey: string,
  client: DbClient = prisma,
) {
  return client.habitEvent.findUnique({
    where: {
      userId_idempotencyKey: {
        userId,
        idempotencyKey,
      },
    },
  });
}

export async function findHabitEventsByHabit(
  habitId: string,
  userId: string,
  options: {
    since?: Date;
    until?: Date;
    limit?: number;
    includeDeleted?: boolean;
  } = {},
  client: DbClient = prisma,
) {
  return client.habitEvent.findMany({
    where: {
      habitId,
      userId,
      ...(options.includeDeleted ? {} : { deletedAt: null }),
      ...(options.since ? { occurredAt: { gte: options.since } } : {}),
      ...(options.until ? { occurredAt: { lte: options.until } } : {}),
    },
    orderBy: { occurredAt: "asc" },
    ...(options.limit ? { take: options.limit } : {}),
  });
}

export async function softDeleteHabitEvent(
  id: string,
  userId: string,
  client: DbClient = prisma,
) {
  return client.habitEvent.updateMany({
    where: {
      id,
      userId,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });
}
