import { prisma } from "@/lib/prisma";
import type { Prisma, HabitStats } from "@/generated/prisma/client";
import type { DbClient } from "./tracked-habit.repository";

export async function findHabitStats(
  habitId: string,
  client: DbClient = prisma,
): Promise<HabitStats | null> {
  return client.habitStats.findUnique({
    where: { habitId },
  });
}

export async function upsertHabitStats(
  habitId: string,
  data: {
    lastLapseAt?: Date | null;
    currentStreakDays: number;
    longestStreakDays: number;
    confirmedCleanDays: number;
    totalLapses: number;
    urgesResisted: number;
    cleanRate30d?: number | Prisma.Decimal | null;
    consistency30d?: number | Prisma.Decimal | null;
    resilientStreak?: number;
    moneySavedEst?: Prisma.Decimal | null;
    minutesSavedEst?: number | null;
    relapsePattern: boolean;
  },
  client: DbClient = prisma,
): Promise<HabitStats> {
  return client.habitStats.upsert({
    where: { habitId },
    create: {
      habitId,
      ...data,
      recomputedAt: new Date(),
    },
    update: {
      ...data,
      recomputedAt: new Date(),
    },
  });
}
