import { prisma } from "@/lib/prisma";
import { SystemClock, type Clock } from "@/lib/habits/clock";
import { HabitsError } from "./habit-v2.service";
import { findSupportResources } from "@/repositories/habits/support-resource.repository";
import { acquireHabitAdvisoryLock } from "@/repositories/habits/tracked-habit.repository";

export async function getSupportResourcesService(filter?: {
  country?: string;
  category?: string;
}) {
  return findSupportResources(filter);
}

export async function acknowledgeSafetyNoticeService(
  userId: string,
  habitId: string,
  clock: Clock = new SystemClock(),
) {
  return prisma.$transaction(async (tx) => {
    await acquireHabitAdvisoryLock(habitId, tx);

    const habit = await tx.trackedHabit.findFirst({
      where: { id: habitId, userId },
      include: { breakProfile: true },
    });

    if (!habit) {
      throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
    }

    const now = clock.now();

    await tx.habitBreakProfile.upsert({
      where: { habitId },
      update: { safetyAckAt: now },
      create: {
        habitId,
        highRiskCategory: true,
        safetyAckAt: now,
      },
    });

    // Aktifkan kebiasaan jika sebelumnya masih tertunda
    const updatedHabit = await tx.trackedHabit.update({
      where: { id: habitId },
      data: { status: "ACTIVE" },
      include: { breakProfile: true, stats: true },
    });

    return {
      success: true,
      safetyAckAt: now,
      status: updatedHabit.status,
    };
  });
}
