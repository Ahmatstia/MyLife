import { prisma } from "@/lib/prisma";
import { Prisma, type HabitStats } from "@/generated/prisma/client";
import { SystemClock, type Clock } from "@/lib/habits/clock";
import { computeStats } from "@/lib/habits/streak";
import { detectRelapsePattern } from "@/lib/habits/relapse";
import { evaluateMilestones } from "@/lib/habits/milestones/evaluator";
import { upsertHabitStats } from "@/repositories/habits/habit-stats.repository";
import type { DbClient } from "@/repositories/habits/tracked-habit.repository";

export async function recomputeHabitStats(
  habitId: string,
  client: DbClient = prisma,
  clock: Clock = new SystemClock(),
): Promise<HabitStats> {
  const habit = await client.trackedHabit.findUnique({
    where: { id: habitId },
    include: { breakProfile: true, buildProfile: true },
  });

  if (!habit) {
    throw new Error(`Kebiasaan dengan ID ${habitId} tidak ditemukan`);
  }

  const [checkins, events] = await Promise.all([
    client.habitCheckin.findMany({
      where: { habitId },
      orderBy: { windowEnd: "asc" },
    }),
    client.habitEvent.findMany({
      where: { habitId, deletedAt: null },
      orderBy: { occurredAt: "asc" },
    }),
  ]);

  const now = clock.now();

  const computed = computeStats(
    checkins.map((c) => ({
      windowStart: c.windowStart,
      windowEnd: c.windowEnd,
      status: c.status,
    })),
    events.map((e) => ({
      type: e.type,
      occurredAt: e.occurredAt,
      deletedAt: e.deletedAt,
      outcome: e.outcome === "RESISTED" || e.outcome === "GAVE_IN" ? e.outcome : null,
      quantity: Number(e.quantity),
    })),
    {
      kind: habit.kind,
      mode: habit.mode,
      buildProfile: habit.buildProfile,
      timezone: habit.timezone,
    },
    now,
  );

  const relapseRule = {
    count: habit.breakProfile?.relapseLapseCount ?? 3,
    days: habit.breakProfile?.relapseWindowDays ?? 7,
  };

  const isRelapsing = detectRelapsePattern(
    checkins.map((c) => ({
      windowEnd: c.windowEnd,
      status: c.status,
    })),
    relapseRule,
    now,
  );

  // Evaluasi dan simpan milestones baru yang tercapai
  const existingMilestones = await client.habitMilestone.findMany({
    where: { habitId },
    select: { code: true },
  });
  const existingCodes = new Set(existingMilestones.map((m) => m.code));

  const hasDebrief = events.some((e) => {
    if (!e.meta || typeof e.meta !== "object") return false;
    return Boolean((e.meta as Record<string, unknown>).debrief);
  });

  const newMilestones = evaluateMilestones({
    currentStreakDays: computed.currentStreakDays,
    longestStreakDays: computed.longestStreakDays,
    urgesResisted: computed.urgesResisted,
    totalLapses: computed.totalLapses,
    hasDebrief,
    existingCodes,
    now,
  });

  if (newMilestones.length > 0) {
    await client.habitMilestone.createMany({
      data: newMilestones.map((nm) => ({
        habitId,
        code: nm.code,
        title: nm.title,
        achievedAt: nm.achievedAt,
      })),
      skipDuplicates: true,
    });
  }

  // Hitung estimasi penghematan uang dan waktu (Langkah 3.6 / §8.3)
  let moneySavedEst: Prisma.Decimal | null = null;
  let minutesSavedEst: number | null = null;

  if (habit.kind === "BREAK" && habit.breakProfile) {
    const baseline = habit.breakProfile.baselinePerDay
      ? Number(habit.breakProfile.baselinePerDay)
      : null;
    const costPerOcc = habit.breakProfile.costPerOccurrence
      ? Number(habit.breakProfile.costPerOccurrence)
      : null;
    const minsPerOcc = habit.breakProfile.minutesPerOccurrence ?? null;

    if (baseline !== null && baseline > 0) {
      let occurrencesAvoided = 0;
      if (habit.mode === "REDUCE") {
        const daysEvaluated = computed.confirmedCleanDays;
        const totalOccurrences = events
          .filter((e) => e.type === "OCCURRENCE" && e.deletedAt == null)
          .reduce((sum, e) => sum + (Number(e.quantity) || 1), 0);
        const expectedTotal = daysEvaluated * baseline;
        occurrencesAvoided = Math.max(0, Math.round(expectedTotal - totalOccurrences));
      } else {
        occurrencesAvoided = Math.round(computed.confirmedCleanDays * baseline);
      }

      if (costPerOcc !== null && costPerOcc > 0) {
        moneySavedEst = new Prisma.Decimal(Math.round(occurrencesAvoided * costPerOcc));
      }
      if (minsPerOcc !== null && minsPerOcc > 0) {
        minutesSavedEst = Math.round(occurrencesAvoided * minsPerOcc);
      }
    }
  }

  return upsertHabitStats(
    habitId,
    {
      lastLapseAt: computed.lastLapseAt,
      currentStreakDays: computed.currentStreakDays,
      longestStreakDays: computed.longestStreakDays,
      confirmedCleanDays: computed.confirmedCleanDays,
      totalLapses: computed.totalLapses,
      urgesResisted: computed.urgesResisted,
      cleanRate30d: computed.cleanRate30d !== null ? new Prisma.Decimal(computed.cleanRate30d) : null,
      consistency30d: computed.consistency30d !== null ? new Prisma.Decimal(computed.consistency30d) : null,
      resilientStreak: computed.resilientStreak,
      moneySavedEst,
      minutesSavedEst,
      relapsePattern: isRelapsing,
    },
    client,
  );
}
