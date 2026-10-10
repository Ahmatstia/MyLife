import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { SystemClock, type Clock } from "@/lib/habits/clock";
import {
  logHabitEventSchema,
  type LogHabitEventInput,
} from "@/schemas/habits/habit-event.schema";
import { acquireHabitAdvisoryLock } from "@/repositories/habits/tracked-habit.repository";
import { recomputeHabitStats } from "./stats.service";
import { HabitsError } from "./habit-v2.service";

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function logHabitEventService(
  userId: string,
  habitId: string,
  rawInput: LogHabitEventInput,
  idempotencyKey?: string | null,
  clock: Clock = new SystemClock(),
) {
  const parsed = logHabitEventSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new HabitsError(
      parsed.error.issues.map((i) => i.message).join(", "),
      "VALIDATION_ERROR",
      400,
    );
  }

  const input = parsed.data;
  const now = clock.now();
  const occurredAt = input.occurredAt ?? now;

  return prisma.$transaction(async (tx) => {
    // 1. Ambil advisory lock untuk mencegah race condition pada habit ini
    await acquireHabitAdvisoryLock(habitId, tx);

    // 2. Verifikasi kepemilikan habit (IDOR protection)
    const habit = await tx.trackedHabit.findFirst({
      where: { id: habitId, userId },
    });
    if (!habit) {
      throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
    }

    // 3. Validasi aturan waktu §8.6
    if (occurredAt.getTime() > now.getTime() + FIVE_MINUTES_MS) {
      throw new HabitsError(
        "Waktu kejadian tidak boleh di masa depan (toleransi maksimal 5 menit).",
        "VALIDATION_ERROR",
        400,
      );
    }

    if (occurredAt.getTime() < habit.startedAt.getTime()) {
      throw new HabitsError(
        "Waktu kejadian tidak boleh mendahului waktu kebiasaan dimulai.",
        "VALIDATION_ERROR",
        400,
      );
    }

    if (occurredAt.getTime() < now.getTime() - SEVEN_DAYS_MS) {
      throw new HabitsError(
        "Pencatatan mundur (backfill) maksimal 7 hari ke belakang.",
        "VALIDATION_ERROR",
        400,
      );
    }

    // 4. Pemeriksaan Idempotensi
    if (idempotencyKey) {
      const existing = await tx.habitEvent.findUnique({
        where: {
          userId_idempotencyKey: {
            userId,
            idempotencyKey,
          },
        },
      });
      if (existing) {
        // Idempoten: kembalikan event yang sudah ada tanpa menduplikasi
        return existing;
      }
    }

    // 5. Simpan event baru
    const event = await tx.habitEvent.create({
      data: {
        habitId,
        userId,
        type: input.type,
        occurredAt,
        quantity: input.quantity,
        intensityBefore: input.intensityBefore,
        intensityAfter: input.intensityAfter,
        outcome: input.outcome,
        severity: input.severity,
        mood: input.mood,
        halt: input.halt,
        locationLabel: input.locationLabel,
        withWhom: input.withWhom,
        note: input.note,
        meta: input.meta as Prisma.InputJsonValue,
        source: input.source,
        idempotencyKey: idempotencyKey ?? null,
      },
    });

    // 6. Jika event bertipe LAPSE, sinkronkan status jendela check-in yang mencakup occurredAt ke LAPSED
    if (input.type === "LAPSE") {
      await tx.habitCheckin.updateMany({
        where: {
          habitId,
          windowStart: { lte: occurredAt },
          windowEnd: { gt: occurredAt },
        },
        data: {
          status: "LAPSED",
        },
      });
    }

    // 7. Hitung ulang statistik kebiasaan
    await recomputeHabitStats(habitId, tx, clock);

    return event;
  });
}

export async function deleteHabitEventService(
  userId: string,
  habitId: string,
  eventId: string,
  clock: Clock = new SystemClock(),
) {
  return prisma.$transaction(async (tx) => {
    await acquireHabitAdvisoryLock(habitId, tx);

    const event = await tx.habitEvent.findFirst({
      where: { id: eventId, habitId, userId, deletedAt: null },
    });
    if (!event) {
      throw new HabitsError("Event tidak ditemukan", "NOT_FOUND", 404);
    }

    // Soft delete
    await tx.habitEvent.update({
      where: { id: eventId },
      data: { deletedAt: clock.now() },
    });

    // Hitung ulang statistik setelah penghapusan
    await recomputeHabitStats(habitId, tx, clock);

    return { success: true, deletedEventId: eventId };
  });
}
