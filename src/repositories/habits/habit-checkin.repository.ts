import { prisma } from "@/lib/prisma";
import type { Prisma, HabitCheckin, HabitCheckinStatus } from "@/generated/prisma/client";
import type { DbClient } from "./tracked-habit.repository";

export async function createHabitCheckin(
  data: Prisma.HabitCheckinUncheckedCreateInput,
  client: DbClient = prisma,
): Promise<HabitCheckin> {
  return client.habitCheckin.create({
    data,
  });
}

export async function findHabitCheckinById(
  id: string,
  habitId: string,
  client: DbClient = prisma,
) {
  return client.habitCheckin.findFirst({
    where: { id, habitId },
  });
}

export async function findHabitCheckinByPeriod(
  habitId: string,
  periodDate: Date,
  client: DbClient = prisma,
) {
  return client.habitCheckin.findUnique({
    where: {
      habitId_periodDate: {
        habitId,
        periodDate,
      },
    },
  });
}

export async function findPendingCheckinsByHabit(
  habitId: string,
  client: DbClient = prisma,
) {
  return client.habitCheckin.findMany({
    where: {
      habitId,
      status: "PENDING",
    },
    orderBy: { windowEnd: "desc" },
  });
}

export async function findPendingCheckinsByUser(
  userId: string,
  client: DbClient = prisma,
) {
  return client.habitCheckin.findMany({
    where: {
      status: "PENDING",
      habit: {
        userId,
        status: "ACTIVE",
      },
    },
    include: {
      habit: {
        select: {
          id: true,
          name: true,
          displayAlias: true,
          timezone: true,
          checkinLocalTime: true,
        },
      },
    },
    orderBy: { windowEnd: "asc" },
  });
}

export async function findCheckinsByHabit(
  habitId: string,
  options: {
    since?: Date;
    until?: Date;
    limit?: number;
  } = {},
  client: DbClient = prisma,
) {
  return client.habitCheckin.findMany({
    where: {
      habitId,
      ...(options.since ? { periodDate: { gte: options.since } } : {}),
      ...(options.until ? { periodDate: { lte: options.until } } : {}),
    },
    orderBy: { periodDate: "asc" },
    ...(options.limit ? { take: options.limit } : {}),
  });
}

export async function updateHabitCheckin(
  id: string,
  data: Prisma.HabitCheckinUpdateInput,
  client: DbClient = prisma,
) {
  return client.habitCheckin.update({
    where: { id },
    data,
  });
}

export async function updateCheckinStatusByWindow(
  habitId: string,
  windowStart: Date,
  windowEnd: Date,
  newStatus: HabitCheckinStatus,
  client: DbClient = prisma,
) {
  return client.habitCheckin.updateMany({
    where: {
      habitId,
      windowStart,
      windowEnd,
    },
    data: {
      status: newStatus,
    },
  });
}
