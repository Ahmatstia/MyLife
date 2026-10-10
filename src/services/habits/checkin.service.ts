import { prisma } from "@/lib/prisma";
import { SystemClock, type Clock } from "@/lib/habits/clock";
import {
  DEFAULT_GRACE_HOURS,
  LIVE_RESPONSE_MAX_HOURS,
  MS_PER_HOUR,
} from "@/lib/habits/constants";
import {
  respondCheckinSchema,
  type RespondCheckinInput,
} from "@/schemas/habits/habit-checkin.schema";
import { acquireHabitAdvisoryLock } from "@/repositories/habits/tracked-habit.repository";
import { recomputeHabitStats } from "./stats.service";
import { HabitsError } from "./habit-v2.service";

export async function respondCheckinService(
  userId: string,
  habitId: string,
  checkinId: string,
  rawInput: RespondCheckinInput,
  clock: Clock = new SystemClock(),
) {
  const parsed = respondCheckinSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new HabitsError(
      parsed.error.issues.map((i) => i.message).join(", "),
      "VALIDATION_ERROR",
      400,
    );
  }

  const input = parsed.data;
  const now = clock.now();

  return prisma.$transaction(async (tx) => {
    // 1. Kunci habit dengan advisory lock
    await acquireHabitAdvisoryLock(habitId, tx);

    // 2. Verifikasi kepemilikan habit
    const habit = await tx.trackedHabit.findFirst({
      where: { id: habitId, userId },
    });
    if (!habit) {
      throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
    }

    // 3. Ambil data checkin
    const checkin = await tx.habitCheckin.findFirst({
      where: { id: checkinId, habitId },
    });
    if (!checkin) {
      throw new HabitsError("Check-in tidak ditemukan", "NOT_FOUND", 404);
    }

    // 4. Verifikasi bahwa jendela sudah berakhir
    if (now.getTime() < checkin.windowEnd.getTime()) {
      throw new HabitsError(
        "Jendela evaluasi belum berakhir. Belum waktunya melakukan check-in.",
        "VALIDATION_ERROR",
        400,
      );
    }

    // 5. Verifikasi batas masa tenggang (72 jam)
    const gracePeriodMs = DEFAULT_GRACE_HOURS * MS_PER_HOUR;
    const elapsedSinceWindowEnd = now.getTime() - checkin.windowEnd.getTime();
    if (elapsedSinceWindowEnd > gracePeriodMs) {
      throw new HabitsError(
        "Masa tenggang respon check-in (72 jam) telah berakhir.",
        "VALIDATION_ERROR",
        400,
      );
    }

    // 6. Invarian 4: Jika ada LAPSE di jendela, jawaban "CLEAN" wajib ditolak!
    if (input.response === "CLEAN") {
      const lapseCount = await tx.habitEvent.count({
        where: {
          habitId,
          type: "LAPSE",
          deletedAt: null,
          occurredAt: {
            gte: checkin.windowStart,
            lt: checkin.windowEnd,
          },
        },
      });

      if (lapseCount > 0) {
        throw new HabitsError(
          "Terdapat lapse/terpeleset tercatat di dalam rentang jendela ini. Status check-in tidak dapat bersih (CLEAN).",
          "CONFLICT",
          409,
        );
      }
    }

    // 7. Tentukan label kualitas data: LIVE (< 12 jam) vs BACKFILL (> 12 jam)
    const liveThresholdMs = LIVE_RESPONSE_MAX_HOURS * MS_PER_HOUR;
    const responseSource = elapsedSinceWindowEnd <= liveThresholdMs ? "LIVE" : "BACKFILL";

    // 8. Perbarui checkin
    const updatedCheckin = await tx.habitCheckin.update({
      where: { id: checkinId },
      data: {
        status: input.response,
        respondedAt: now,
        responseSource,
        quantity: input.quantity,
        mood: input.mood,
        note: input.note,
      },
    });

    // 9. Hitung ulang statistik
    const stats = await recomputeHabitStats(habitId, tx, clock);

    return {
      checkin: updatedCheckin,
      stats,
    };
  });
}

export async function listPendingCheckinsForUserService(userId: string) {
  return prisma.habitCheckin.findMany({
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
