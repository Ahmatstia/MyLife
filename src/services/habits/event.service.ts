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

    // 5. Simpan event baru dengan logika khusus URGE & LAPSE
    const metaRecord = (input.meta ?? {}) as Record<string, unknown>;
    const copingPlanId = metaRecord.copingPlanId as string | undefined;

    let event;

    if (input.type === "URGE" && input.outcome === "GAVE_IN") {
      // 5a. URGE dengan hasil GAVE_IN: server membuat URGE dan LAPSE dalam satu transaksi
      const urgeEvent = await tx.habitEvent.create({
        data: {
          habitId,
          userId,
          type: "URGE",
          occurredAt,
          quantity: input.quantity,
          intensityBefore: input.intensityBefore,
          intensityAfter: input.intensityAfter,
          outcome: "GAVE_IN",
          severity: input.severity,
          mood: input.mood,
          halt: input.halt,
          locationLabel: input.locationLabel,
          withWhom: input.withWhom,
          note: input.note,
          meta: metaRecord as Prisma.InputJsonValue,
          source: input.source,
          idempotencyKey: idempotencyKey ?? null,
        },
      });

      const lapseEvent = await tx.habitEvent.create({
        data: {
          habitId,
          userId,
          type: "LAPSE",
          occurredAt,
          quantity: input.quantity,
          severity: input.severity ?? "SLIP",
          mood: input.mood,
          halt: input.halt,
          locationLabel: input.locationLabel,
          withWhom: input.withWhom,
          note: input.note,
          meta: {
            ...metaRecord,
            relatedEventId: urgeEvent.id,
            cause: "URGE_GAVE_IN",
          } as Prisma.InputJsonValue,
          source: input.source,
        },
      });

      // Tautkan relatedEventId balik ke URGE
      event = await tx.habitEvent.update({
        where: { id: urgeEvent.id },
        data: {
          meta: {
            ...metaRecord,
            relatedEventId: lapseEvent.id,
          } as Prisma.InputJsonValue,
        },
      });

      // Sinkronkan status jendela check-in yang mencakup occurredAt ke LAPSED
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

      // Catat penggunaan rencana jika-maka (dipakai tapi tidak membantu)
      if (copingPlanId) {
        await tx.copingPlan.updateMany({
          where: { id: copingPlanId, habitId },
          data: {
            timesUsed: { increment: 1 },
          },
        });
      }
    } else {
      // 5b. Event URGE (RESISTED atau tanpa outcome), LAPSE biasa, atau event lainnya
      event = await tx.habitEvent.create({
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
          meta: metaRecord as Prisma.InputJsonValue,
          source: input.source,
          idempotencyKey: idempotencyKey ?? null,
        },
      });

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

      // Jika URGE berhasil dilawan dan ada coping plan yang dipakai
      if (input.type === "URGE" && input.outcome === "RESISTED" && copingPlanId) {
        await tx.copingPlan.updateMany({
          where: { id: copingPlanId, habitId },
          data: {
            timesUsed: { increment: 1 },
            timesHelped: { increment: 1 },
          },
        });
      }
    }

    // 6. Hitung ulang statistik kebiasaan
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
