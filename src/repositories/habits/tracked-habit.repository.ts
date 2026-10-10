import { prisma } from "@/lib/prisma";
import type { Prisma, TrackedHabit, HabitStatus } from "@/generated/prisma/client";

export type DbClient = Prisma.TransactionClient | typeof prisma;

/**
 * Mengambil advisory lock berbasis hash teks habitId dalam transaksi PostgreSQL.
 * Mencegah eksekusi konkruen/race condition saat pembaruan event/check-in/stats.
 */
export async function acquireHabitAdvisoryLock(
  habitId: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  await tx.$executeRawUnsafe(
    `SELECT pg_advisory_xact_lock(hashtext($1))`,
    habitId,
  );
}

export async function findTrackedHabitById(
  id: string,
  userId: string,
  client: DbClient = prisma,
) {
  return client.trackedHabit.findFirst({
    where: { id, userId },
    include: {
      breakProfile: true,
      buildProfile: true,
      stats: true,
    },
  });
}

export async function findTrackedHabitsByUser(
  userId: string,
  filter?: { status?: HabitStatus },
  client: DbClient = prisma,
) {
  return client.trackedHabit.findMany({
    where: {
      userId,
      ...(filter?.status ? { status: filter.status } : {}),
    },
    include: {
      breakProfile: true,
      buildProfile: true,
      stats: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTrackedHabit(
  data: Prisma.TrackedHabitCreateInput,
  client: DbClient = prisma,
): Promise<TrackedHabit> {
  return client.trackedHabit.create({
    data,
  });
}

export async function updateTrackedHabit(
  id: string,
  userId: string,
  data: Prisma.TrackedHabitUpdateInput,
  client: DbClient = prisma,
) {
  return client.trackedHabit.update({
    where: { id },
    data,
    include: {
      breakProfile: true,
      stats: true,
    },
  });
}

export async function setTrackedHabitStatus(
  id: string,
  userId: string,
  status: HabitStatus,
  client: DbClient = prisma,
) {
  return client.trackedHabit.update({
    where: { id },
    data: {
      status,
      archivedAt: status === "ARCHIVED" ? new Date() : null,
    },
  });
}
