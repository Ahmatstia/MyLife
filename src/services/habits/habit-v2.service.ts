import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import type { HabitStatus, Prisma } from "@/generated/prisma/client";
import { SystemClock, type Clock } from "@/lib/habits/clock";
import { nextCheckinAfter } from "@/lib/habits/window";
import {
  createTrackedHabitSchema,
  updateTrackedHabitSchema,
  switchHabitModeSchema,
  type CreateTrackedHabitInput,
  type UpdateTrackedHabitInput,
  type SwitchHabitModeInput,
} from "@/schemas/habits/tracked-habit.schema";
import {
  findTrackedHabitById,
  findTrackedHabitsByUser,
  acquireHabitAdvisoryLock,
} from "@/repositories/habits/tracked-habit.repository";
import { recomputeHabitStats } from "./stats.service";
import { encryptText, decryptText } from "@/lib/habits/safety/crypto";

export class HabitsError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "NOT_SUPPORTED_YET"
      | "VALIDATION_ERROR"
      | "CONFLICT"
      | "SAFETY_ACK_REQUIRED",
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "HabitsError";
  }
}

export async function createTrackedHabitService(
  userId: string,
  rawInput: CreateTrackedHabitInput,
  clock: Clock = new SystemClock(),
) {
  const parsed = createTrackedHabitSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new HabitsError(
      parsed.error.issues.map((i) => i.message).join(", "),
      "VALIDATION_ERROR",
      400,
    );
  }

  const input = parsed.data;

  // Validasi jenis kebiasaan:
  // - BREAK: mode ABSTAIN atau REDUCE
  // - BUILD: mode harus null
  if (input.kind === "BREAK" && !input.mode) {
    throw new HabitsError(
      "Mode kebiasaan BREAK wajib ditentukan (ABSTAIN atau REDUCE).",
      "VALIDATION_ERROR",
      400,
    );
  }

  if (input.kind === "BUILD" && input.mode != null) {
    throw new HabitsError(
      "Kebiasaan BUILD tidak memerlukan mode (mode harus bernilai null).",
      "VALIDATION_ERROR",
      400,
    );
  }

  const startedAt = input.startedAt ?? clock.now();
  const currentWindowStart = startedAt;
  const nextCheckinAt = nextCheckinAfter(
    startedAt,
    input.timezone,
    input.checkinLocalTime,
  );

  return prisma.$transaction(async (tx) => {
    // 1. Buat TrackedHabit
    const habit = await tx.trackedHabit.create({
      data: {
        userId,
        name: input.name,
        displayAlias: input.displayAlias,
        category: input.category,
        kind: input.kind,
        mode: input.kind === "BUILD" ? null : input.mode,
        status: "ACTIVE",
        stage: "PREPARATION",
        timezone: input.timezone,
        checkinLocalTime: input.checkinLocalTime,
        startedAt,
        currentWindowStart,
        nextCheckinAt,
        privacyLevel: input.privacyLevel,
        areaId: input.areaId,
        goalId: input.goalId,
        identityStatement: input.identityStatement,
      },
    });

    let breakProfile = null;
    let buildProfile = null;

    if (input.kind === "BREAK") {
      // Validasi T-19: Kategori berisiko tinggi wajib mengakui layar keselamatan
      if (input.highRiskCategory && !input.safetyAck && !input.safetyAckAt) {
        throw new HabitsError(
          "Kebiasaan dengan kategori berisiko tinggi memerlukan konfirmasi layar keselamatan sebelum dapat diaktifkan.",
          "SAFETY_ACK_REQUIRED",
          400,
        );
      }

      const safetyAckAt = input.highRiskCategory
        ? (input.safetyAckAt ?? (input.safetyAck ? clock.now() : null))
        : null;

      breakProfile = await tx.habitBreakProfile.create({
        data: {
          habitId: habit.id,
          whyReasons: input.whyReasons ?? [],
          futureSelfNote: encryptText(input.futureSelfNote),
          baselinePerDay: input.baselinePerDay,
          costPerOccurrence: input.costPerOccurrence,
          currency: input.currency ?? "IDR",
          minutesPerOccurrence: input.minutesPerOccurrence,
          reduceDailyLimit: input.reduceDailyLimit,
          reduceStepPercent: input.reduceStepPercent,
          reduceStepEveryDays: input.reduceStepEveryDays,
          relapseLapseCount: input.relapseLapseCount ?? 3,
          relapseWindowDays: input.relapseWindowDays ?? 7,
          highRiskCategory: input.highRiskCategory ?? false,
          safetyAckAt,
          environmentChecklist: input.environmentChecklist ?? [],
        },
      });
    } else {
      // BUILD
      if (input.replacesHabitId) {
        const targetBreakHabit = await tx.trackedHabit.findFirst({
          where: { id: input.replacesHabitId, userId, kind: "BREAK" },
        });
        if (!targetBreakHabit) {
          throw new HabitsError(
            "Kebiasaan yang digantikan tidak ditemukan atau bukan kebiasaan Break.",
            "VALIDATION_ERROR",
            400,
          );
        }
      }

      buildProfile = await tx.habitBuildProfile.create({
        data: {
          habitId: habit.id,
          anchorText: input.anchorText,
          tinyBehavior: input.tinyBehavior!,
          celebrationText: input.celebrationText,
          versions: input.versions ?? {},
          scheduleType: input.scheduleType ?? "DAILY",
          daysOfWeek: input.daysOfWeek ?? [],
          timesPerWeek: input.timesPerWeek,
          restDays: input.restDays ?? [],
          replacesHabitId: input.replacesHabitId,
        },
      });
    }

    // 3. Buat HabitStats awal
    const stats = await tx.habitStats.create({
      data: {
        habitId: habit.id,
        currentStreakDays: 0,
        longestStreakDays: 0,
        confirmedCleanDays: 0,
        totalLapses: 0,
        urgesResisted: 0,
        cleanRate30d: null,
        consistency30d: null,
        resilientStreak: 0,
        relapsePattern: false,
      },
    });

    return {
      ...habit,
      breakProfile,
      buildProfile,
      stats,
    };
  });
}

export async function getTrackedHabitService(
  userId: string,
  habitId: string,
) {
  const habit = await findTrackedHabitById(habitId, userId);
  if (!habit) {
    throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
  }
  if (habit.breakProfile?.futureSelfNote) {
    habit.breakProfile.futureSelfNote = decryptText(habit.breakProfile.futureSelfNote);
  }
  return habit;
}

export async function listTrackedHabitsService(
  userId: string,
  filters?: { status?: HabitStatus },
) {
  return findTrackedHabitsByUser(userId, filters);
}

export async function updateTrackedHabitService(
  userId: string,
  habitId: string,
  rawInput: UpdateTrackedHabitInput,
  clock: Clock = new SystemClock(),
) {
  const parsed = updateTrackedHabitSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new HabitsError(
      parsed.error.issues.map((i) => i.message).join(", "),
      "VALIDATION_ERROR",
      400,
    );
  }

  const existing = await findTrackedHabitById(habitId, userId);
  if (!existing) {
    throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
  }

  const input = parsed.data;
  let nextCheckinAt = existing.nextCheckinAt;

  // Jika jam check-in atau zona waktu berubah, hitung ulang nextCheckinAt
  if (
    (input.checkinLocalTime && input.checkinLocalTime !== existing.checkinLocalTime) ||
    (input.timezone && input.timezone !== existing.timezone)
  ) {
    const tz = input.timezone ?? existing.timezone;
    const time = input.checkinLocalTime ?? existing.checkinLocalTime;
    const fromTime = clock.now() > existing.currentWindowStart ? clock.now() : existing.currentWindowStart;
    nextCheckinAt = nextCheckinAfter(fromTime, tz, time);
  }

  const {
    reduceDailyLimit,
    reduceStepPercent,
    reduceStepEveryDays,
    whyReasons,
    futureSelfNote,
    costPerOccurrence,
    minutesPerOccurrence,
    currency,
    tinyBehavior,
    anchorText,
    celebrationText,
    ...habitFields
  } = input;

  return prisma.$transaction(async (tx) => {
    if (existing.kind === "BREAK") {
      const breakData: Prisma.HabitBreakProfileUpdateInput = {};
      if (reduceDailyLimit !== undefined) breakData.reduceDailyLimit = reduceDailyLimit;
      if (reduceStepPercent !== undefined) breakData.reduceStepPercent = reduceStepPercent;
      if (reduceStepEveryDays !== undefined) breakData.reduceStepEveryDays = reduceStepEveryDays;
      if (whyReasons !== undefined) breakData.whyReasons = whyReasons;
      if (futureSelfNote !== undefined) {
        breakData.futureSelfNote = futureSelfNote ? encryptText(futureSelfNote) : null;
      }
      if (costPerOccurrence !== undefined) breakData.costPerOccurrence = costPerOccurrence;
      if (minutesPerOccurrence !== undefined) breakData.minutesPerOccurrence = minutesPerOccurrence;
      if (currency !== undefined) breakData.currency = currency;

      if (Object.keys(breakData).length > 0) {
        await tx.habitBreakProfile.update({
          where: { habitId },
          data: breakData,
        });
      }
    } else if (existing.kind === "BUILD") {
      const buildData: Prisma.HabitBuildProfileUpdateInput = {};
      if (tinyBehavior !== undefined && tinyBehavior !== null) buildData.tinyBehavior = tinyBehavior;
      if (anchorText !== undefined) buildData.anchorText = anchorText;
      if (celebrationText !== undefined) buildData.celebrationText = celebrationText;

      if (Object.keys(buildData).length > 0) {
        await tx.habitBuildProfile.update({
          where: { habitId },
          data: buildData,
        });
      }
    }

    const updated = await tx.trackedHabit.update({
      where: { id: habitId },
      data: {
        ...habitFields,
        ...(nextCheckinAt !== existing.nextCheckinAt ? { nextCheckinAt } : {}),
      },
      include: {
        breakProfile: true,
        buildProfile: true,
        stats: true,
      },
    });

    if (updated.breakProfile?.futureSelfNote) {
      updated.breakProfile.futureSelfNote = decryptText(updated.breakProfile.futureSelfNote);
    }

    return updated;
  });
}

/**
 * Alur peralihan mode untuk kebiasaan jenis BREAK (§8.4, F-B9):
 * - "Abstain → Reduce": dari alur reset rencana kambuh.
 * - "Reduce → Abstain": saat target harian mencapai 0 atau pengguna siap berhenti total.
 */
export async function switchHabitModeService(
  userId: string,
  habitId: string,
  rawInput: SwitchHabitModeInput,
  clock: Clock = new SystemClock(),
) {
  const parsed = switchHabitModeSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new HabitsError(
      parsed.error.issues.map((i) => i.message).join(", "),
      "VALIDATION_ERROR",
      400,
    );
  }

  const existing = await findTrackedHabitById(habitId, userId);
  if (!existing) {
    throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
  }

  if (existing.kind !== "BREAK") {
    throw new HabitsError(
      "Peralihan mode hanya berlaku untuk kebiasaan jenis BREAK.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const input = parsed.data;

  return prisma.$transaction(async (tx) => {
    await acquireHabitAdvisoryLock(habitId, tx);

    await tx.trackedHabit.update({
      where: { id: habitId },
      data: { mode: input.targetMode },
    });

    if (input.targetMode === "REDUCE") {
      await tx.habitBreakProfile.update({
        where: { habitId },
        data: {
          reduceDailyLimit: input.reduceDailyLimit,
          reduceStepPercent: input.reduceStepPercent,
          reduceStepEveryDays: input.reduceStepEveryDays,
        },
      });
    } else {
      // Beralih ke ABSTAIN: reset kolom batas reduce
      await tx.habitBreakProfile.update({
        where: { habitId },
        data: {
          reduceDailyLimit: null,
          reduceStepPercent: null,
          reduceStepEveryDays: null,
        },
      });
    }

    await recomputeHabitStats(habitId, tx, clock);

    return findTrackedHabitById(habitId, userId, tx);
  });
}

export async function setHabitStatusService(
  userId: string,
  habitId: string,
  status: HabitStatus,
) {
  const existing = await findTrackedHabitById(habitId, userId);
  if (!existing) {
    throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
  }

  if (
    status === "ACTIVE" &&
    existing.breakProfile?.highRiskCategory &&
    !existing.breakProfile.safetyAckAt
  ) {
    throw new HabitsError(
      "Kebiasaan dengan kategori berisiko tinggi memerlukan konfirmasi layar keselamatan sebelum dapat diaktifkan.",
      "SAFETY_ACK_REQUIRED",
      400,
    );
  }

  return prisma.trackedHabit.update({
    where: { id: habitId },
    data: {
      status,
      archivedAt: status === "ARCHIVED" ? new Date() : null,
    },
    include: {
      breakProfile: true,
      buildProfile: true,
      stats: true,
    },
  });
}

/**
 * Langkah 5.2: Hapus kebiasaan (soft-delete ARCHIVED atau hard delete permanen)
 */
export async function deleteTrackedHabitService(
  userId: string,
  habitId: string,
  options?: boolean | { hard?: boolean },
  client = prisma,
  clock: Clock = new SystemClock(),
) {
  const isHard = typeof options === "boolean" ? options : (options?.hard ?? false);
  const existing = await client.trackedHabit.findFirst({
    where: { id: habitId, userId },
  });

  if (!existing) {
    throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
  }

  if (isHard) {
    await client.trackedHabit.delete({
      where: { id: habitId },
    });
    return { success: true, hard: true, hardDeleted: true, deletedHabitId: habitId };
  }

  const archived = await client.trackedHabit.update({
    where: { id: habitId },
    data: {
      status: "ARCHIVED",
      archivedAt: clock.now(),
    },
  });

  return { success: true, hard: false, hardDeleted: false, habit: archived };
}

export async function getTrackedHabitDashboardService(
  userId: string,
  habitId: string,
  clock: Clock = new SystemClock(),
) {
  const habit = await findTrackedHabitById(habitId, userId);
  if (!habit) {
    throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
  }

  const now = clock.now();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [pendingCheckins, checkins, recentEvents] = await Promise.all([
    prisma.habitCheckin.findMany({
      where: { habitId, status: "PENDING" },
      orderBy: { windowEnd: "desc" },
    }),
    prisma.habitCheckin.findMany({
      where: { habitId, periodDate: { gte: ninetyDaysAgo } },
      orderBy: { periodDate: "asc" },
    }),
    prisma.habitEvent.findMany({
      where: { habitId, deletedAt: null },
      orderBy: { occurredAt: "desc" },
      take: 10,
    }),
  ]);

  const relapseAckAt = habit.breakProfile?.relapseAckAt
    ? new Date(habit.breakProfile.relapseAckAt).getTime()
    : 0;
  const lastLapseAt = habit.stats?.lastLapseAt
    ? new Date(habit.stats.lastLapseAt).getTime()
    : 0;
  const activeRelapsePrompt = Boolean(
    habit.stats?.relapsePattern && (!relapseAckAt || lastLapseAt > relapseAckAt),
  );

  if (habit.breakProfile?.futureSelfNote) {
    habit.breakProfile.futureSelfNote = decryptText(habit.breakProfile.futureSelfNote);
  }

  return {
    habit,
    stats: habit.stats,
    pendingCheckins,
    calendar: checkins,
    recentEvents,
    activeRelapsePrompt,
  };
}

export async function getTrackedHabitCalendarService(
  userId: string,
  habitId: string,
  monthStr: string,
) {
  const habit = await findTrackedHabitById(habitId, userId);
  if (!habit) {
    throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
  }

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthStr)) {
    throw new HabitsError(
      "Format bulan tidak valid. Gunakan format YYYY-MM (contoh: 2026-10)",
      "VALIDATION_ERROR",
      400,
    );
  }

  const startOfMonth = DateTime.fromFormat(monthStr, "yyyy-MM", {
    zone: habit.timezone,
  }).startOf("month");
  const endOfMonth = startOfMonth.endOf("month");

  const [checkins, events] = await Promise.all([
    prisma.habitCheckin.findMany({
      where: {
        habitId,
        periodDate: {
          gte: startOfMonth.toJSDate(),
          lte: endOfMonth.toJSDate(),
        },
      },
      orderBy: { periodDate: "asc" },
    }),
    prisma.habitEvent.findMany({
      where: {
        habitId,
        deletedAt: null,
        occurredAt: {
          gte: startOfMonth.toJSDate(),
          lte: endOfMonth.toJSDate(),
        },
      },
      orderBy: { occurredAt: "asc" },
    }),
  ]);

  const days: Record<string, string> = {};
  for (const c of checkins) {
    const key = DateTime.fromJSDate(c.periodDate, { zone: habit.timezone }).toFormat("yyyy-MM-dd");
    days[key] = c.status;
  }

  return {
    habitId,
    month: monthStr,
    timezone: habit.timezone,
    days,
    checkins,
    events,
  };
}

