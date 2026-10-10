import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { SystemClock, type Clock } from "@/lib/habits/clock";
import { DEFAULT_GRACE_HOURS, MS_PER_HOUR } from "@/lib/habits/constants";
import {
  buildWindows,
  nextWindowEnd,
  periodDate as calculatePeriodDate,
} from "@/lib/habits/window";
import { initialStatus, type HabitEventLike } from "@/lib/habits/status";
import { recomputeHabitStats } from "./stats.service";
import { getUserPreference } from "@/services/user-preference.service";
import { isQuietHours } from "@/services/reminder.service";
import { createNotification } from "@/services/notification.service";
import { dispatchExternalNotification } from "@/services/external-notification.service";

export interface HabitSchedulerResult {
  dueHabitsCount: number;
  windowsCreatedCount: number;
  outboxQueuedCount: number;
  outboxSentCount: number;
  expiredPendingCount: number;
  maxLagSeconds: number;
}

export interface OutboxNotificationPayload {
  title: string;
  message: string;
  linkUrl: string;
  habitId: string;
  periodDate: string;
  privacyLevel: number;
}

/**
 * Membangun payload notifikasi berdasarkan privacyLevel (desain §12.2, §13.2, T-20).
 * - Level 0: Normal (mencantumkan nama asli kebiasaan).
 * - Level 1: Netral (tidak memuat nama kebiasaan sama sekali).
 * - Level 2: Samaran (memakai displayAlias di seluruh kanal).
 */
export function buildCheckinNotificationPayload(
  habit: {
    id: string;
    name: string;
    displayAlias?: string | null;
    privacyLevel: number;
  },
  periodDateStr: string,
): OutboxNotificationPayload {
  let title = `Check-in Kebiasaan: ${habit.name}`;
  let message = `Saatnya melakukan evaluasi check-in harian untuk kebiasaan "${habit.name}".`;

  if (habit.privacyLevel === 1) {
    // Mode netral (T-20)
    title = "Waktunya Check-in Harian";
    message = "Saatnya melakukan evaluasi check-in harian untuk kebiasaan Anda.";
  } else if (habit.privacyLevel === 2) {
    // Mode nama samaran
    const alias = habit.displayAlias?.trim() || "Kebiasaan Anda";
    title = `Check-in: ${alias}`;
    message = `Saatnya melakukan evaluasi check-in harian untuk "${alias}".`;
  }

  return {
    title,
    message,
    linkUrl: "/habits",
    habitId: habit.id,
    periodDate: periodDateStr,
    privacyLevel: habit.privacyLevel,
  };
}

/**
 * Transisi check-in PENDING yang melewati masa tenggang 72 jam -> UNCONFIRMED.
 */
async function expireOverduePendingCheckins(
  tx: Prisma.TransactionClient,
  now: Date,
  clock: Clock,
): Promise<number> {
  const cutoff = new Date(now.getTime() - DEFAULT_GRACE_HOURS * MS_PER_HOUR);

  const overdue = await tx.habitCheckin.findMany({
    where: {
      status: "PENDING",
      windowEnd: { lt: cutoff },
    },
    select: { id: true, habitId: true },
  });

  if (overdue.length === 0) return 0;

  await tx.habitCheckin.updateMany({
    where: { id: { in: overdue.map((o) => o.id) } },
    data: { status: "UNCONFIRMED" },
  });

  const habitIds = [...new Set(overdue.map((o) => o.habitId))];
  for (const hId of habitIds) {
    await recomputeHabitStats(hId, tx, clock);
  }

  return overdue.length;
}

/**
 * Memproses pengiriman notifikasi dari tabel HabitNotificationOutbox.
 */
async function processOutbox(
  now: Date,
  maxBatchSize: number = 100,
): Promise<number> {
  // Ambil baris PENDING dengan locking agar aman terhadap worker paralel
  const outboxRows = await prisma.$transaction(async (tx) => {
    return tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "HabitNotificationOutbox"
      WHERE status = 'PENDING' AND "scheduledAt" <= ${now}
      ORDER BY "scheduledAt" ASC
      LIMIT ${maxBatchSize}
      FOR UPDATE SKIP LOCKED
    `;
  });

  if (outboxRows.length === 0) return 0;

  let sentCount = 0;

  for (const row of outboxRows) {
    const item = await prisma.habitNotificationOutbox.findUnique({
      where: { id: row.id },
    });
    if (!item || item.status !== "PENDING") continue;

    const payload = item.payload as unknown as OutboxNotificationPayload;

    try {
      // 1. Cek preferensi notifikasi user
      const pref = await getUserPreference(item.userId);
      if (!pref.enableNotifications) {
        await prisma.habitNotificationOutbox.update({
          where: { id: item.id },
          data: { status: "CANCELLED" },
        });
        continue;
      }

      // 2. Kirim notifikasi in-app
      await createNotification(
        {
          title: payload.title,
          message: payload.message,
          type: "HABIT_CHECKIN",
          severity: "INFO",
          linkUrl: payload.linkUrl ?? "/habits",
          entityType: "TRACKED_HABIT",
          entityId: item.habitId ?? undefined,
        },
        item.userId,
      );

      // 3. Cek jam tenang untuk kanal eksternal (Telegram / Email)
      const inQuiet = isQuietHours(now, pref.timezone || "Asia/Jakarta");
      if (!inQuiet) {
        await dispatchExternalNotification({
          title: payload.title,
          message: payload.message,
          severity: "INFO",
          type: "HABIT_CHECKIN",
          linkUrl: payload.linkUrl ?? "/habits",
          linkLabel: "Buka Habit Tracker →",
        });
      }

      // 4. Tandai sebagai terkirim
      await prisma.habitNotificationOutbox.update({
        where: { id: item.id },
        data: {
          status: "SENT",
          attempts: item.attempts + 1,
        },
      });

      sentCount++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await prisma.habitNotificationOutbox.update({
        where: { id: item.id },
        data: {
          attempts: item.attempts + 1,
          status: item.attempts >= 3 ? "FAILED" : "PENDING",
          lastError: errMsg,
        },
      });
    }
  }

  return sentCount;
}

/**
 * Siklus utama penjadwal habit (Habit Scheduler Tick).
 * Rujukan: desain §9.3, §12.2, habits-implementation-plan.md Langkah 1.5.
 */
export async function tickHabitsScheduler(
  clock: Clock = new SystemClock(),
): Promise<HabitSchedulerResult> {
  const now = clock.now();

  let dueHabitsCount = 0;
  let windowsCreatedCount = 0;
  let outboxQueuedCount = 0;
  let expiredPendingCount = 0;
  let maxLagSeconds = 0;

  // Jalankan evaluasi check-in dan catch-up dalam transaksi
  await prisma.$transaction(
    async (tx) => {
      // 1. Kadaluarsakan check-in PENDING > 72 jam
      expiredPendingCount = await expireOverduePendingCheckins(tx, now, clock);

      // 2. Ambil habit yang jatuh tempo (nextCheckinAt <= now) dengan FOR UPDATE SKIP LOCKED
      const dueRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "TrackedHabit"
        WHERE status = 'ACTIVE' AND "nextCheckinAt" <= ${now}
        ORDER BY "nextCheckinAt" ASC
        LIMIT 200
        FOR UPDATE SKIP LOCKED
      `;

      dueHabitsCount = dueRows.length;
      if (dueRows.length === 0) return;

      const habitIds = dueRows.map((r) => r.id);
      const dueHabits = await tx.trackedHabit.findMany({
        where: { id: { in: habitIds } },
        include: {
          breakProfile: true,
        },
      });

      // Hitung lag maksimum untuk metrik (tanpa data sensitif)
      const lags = dueHabits
        .filter((h) => h.nextCheckinAt != null)
        .map((h) =>
          Math.max(0, Math.floor((now.getTime() - h.nextCheckinAt!.getTime()) / 1000)),
        );
      maxLagSeconds = lags.length > 0 ? Math.max(...lags) : 0;

      // 3. Loop catch-up per habit (maksimal 14 jendela)
      for (const habit of dueHabits) {
        // Ambil periodDate jendela terakhir yang ada
        const latestCheckin = await tx.habitCheckin.findFirst({
          where: { habitId: habit.id },
          orderBy: { periodDate: "desc" },
          select: { periodDate: true },
        });

        const lastPeriodDate = latestCheckin
          ? calculatePeriodDate(latestCheckin.periodDate, habit.timezone)
          : null;

        const windows = buildWindows(
          {
            timezone: habit.timezone,
            checkinLocalTime: habit.checkinLocalTime,
            nextCheckinAt: habit.nextCheckinAt,
            lastPeriodDate,
          },
          habit.currentWindowStart,
          now,
          14,
        );

        if (windows.length === 0) {
          // Jika tidak ada jendela yang terbentuk tetapi nextCheckinAt <= now, majukan nextCheckinAt
          const fallbackNext = nextWindowEnd(
            habit.currentWindowStart,
            habit.timezone,
            habit.checkinLocalTime,
            lastPeriodDate,
          );
          await tx.trackedHabit.update({
            where: { id: habit.id },
            data: { nextCheckinAt: fallbackNext },
          });
          continue;
        }

        // Ambil semua event aktif habit
        const events = await tx.habitEvent.findMany({
          where: {
            habitId: habit.id,
            deletedAt: null,
            occurredAt: {
              gte: windows[0].windowStart,
              lt: windows[windows.length - 1].windowEnd,
            },
          },
          select: {
            type: true,
            occurredAt: true,
            outcome: true,
            deletedAt: true,
          },
        });

        const activeEventLikes: HabitEventLike[] = events.map((e) => ({
          type: e.type,
          occurredAt: e.occurredAt,
          outcome: e.outcome as "RESISTED" | "GAVE_IN" | null,
          deletedAt: e.deletedAt,
        }));

        // Buat check-in untuk setiap jendela
        for (const w of windows) {
          const windowEvents = activeEventLikes.filter(
            (ev) =>
              ev.occurredAt.getTime() >= w.windowStart.getTime() &&
              ev.occurredAt.getTime() < w.windowEnd.getTime(),
          );

          const status = initialStatus(windowEvents);

          // Masukkan ke HabitCheckin dengan skipDuplicates (ON CONFLICT DO NOTHING)
          const inserted = await tx.habitCheckin.createMany({
            data: [
              {
                habitId: habit.id,
                windowStart: w.windowStart,
                windowEnd: w.windowEnd,
                periodDate: new Date(w.periodDate),
                status,
              },
            ],
            skipDuplicates: true,
          });

          windowsCreatedCount += inserted.count;
        }

        // 4. Hanya jendela TERBARU yang dinotifikasi (desain §12.2)
        const latestWindow = windows[windows.length - 1];
        const payload = buildCheckinNotificationPayload(
          habit,
          latestWindow.periodDate,
        );

        const dedupeKey = `habit:CHECKIN:${habit.id}:${latestWindow.periodDate}`;
        const outboxInsert = await tx.habitNotificationOutbox.createMany({
          data: [
            {
              userId: habit.userId,
              habitId: habit.id,
              kind: "HABIT_CHECKIN",
              payload: payload as unknown as Prisma.InputJsonValue,
              scheduledAt: latestWindow.windowEnd,
              status: "PENDING",
              dedupeKey,
            },
          ],
          skipDuplicates: true,
        });

        outboxQueuedCount += outboxInsert.count;

        // 5. Majukan currentWindowStart dan nextCheckinAt pada habit
        const nextCheckin = nextWindowEnd(
          latestWindow.windowEnd,
          habit.timezone,
          habit.checkinLocalTime,
          latestWindow.periodDate,
        );

        await tx.trackedHabit.update({
          where: { id: habit.id },
          data: {
            currentWindowStart: latestWindow.windowEnd,
            nextCheckinAt: nextCheckin,
          },
        });

        // 6. Hitung ulang statistik habit
        await recomputeHabitStats(habit.id, tx, clock);
      }
    },
    { timeout: 30000 },
  );

  // 7. Proses pengiriman outbox
  const outboxSentCount = await processOutbox(now);

  // 8. Log metrik ringkas (tanpa data sensitif)
  console.log(
    `[habits/scheduler] tick: due=${dueHabitsCount}, windowsCreated=${windowsCreatedCount}, outboxQueued=${outboxQueuedCount}, outboxSent=${outboxSentCount}, expired=${expiredPendingCount}, maxLag=${maxLagSeconds}s`,
  );

  return {
    dueHabitsCount,
    windowsCreatedCount,
    outboxQueuedCount,
    outboxSentCount,
    expiredPendingCount,
    maxLagSeconds,
  };
}
