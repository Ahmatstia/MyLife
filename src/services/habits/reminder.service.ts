import { prisma } from "@/lib/prisma";
import { SystemClock, type Clock } from "@/lib/habits/clock";
import { HabitsError } from "./habit-v2.service";
import { HabitReminderKind } from "@/generated/prisma/client";
import {
  isInQuietHours,
  computeNextReminderFireAt,
  computeRiskWindowReminderTime,
  MAX_DAILY_NOTIFICATIONS_LIMIT,
} from "@/lib/habits/reminders";
import { getHabitInsightsService } from "./insight.service";

export interface CreateHabitReminderInput {
  kind: HabitReminderKind;
  localTime: string; // "HH:mm"
  daysOfWeek?: number[]; // 1=Senin .. 7=Minggu
  isActive?: boolean;
}

/**
 * Memeriksa apakah kuota notifikasi harian pengguna sudah tercapai
 */
export async function checkDailyNotificationQuota(
  userId: string,
  date: Date,
  maxDaily = MAX_DAILY_NOTIFICATIONS_LIMIT,
  client = prisma
): Promise<boolean> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const count = await client.habitNotificationOutbox.count({
    where: {
      userId,
      scheduledAt: { gte: dayStart, lte: dayEnd },
      status: { not: "CANCELLED" },
    },
  });

  return count < maxDaily;
}

/**
 * Membuat pengingat baru untuk suatu kebiasaan
 */
export async function createHabitReminderService(
  userId: string,
  habitId: string,
  input: CreateHabitReminderInput,
  client = prisma,
  clock: Clock = new SystemClock()
) {
  const habit = await client.trackedHabit.findFirst({
    where: { id: habitId, userId },
  });

  if (!habit) {
    throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
  }

  // Validasi format waktu HH:mm
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(input.localTime)) {
    throw new HabitsError("Format jam harus HH:mm (00:00 - 23:59)", "VALIDATION_ERROR", 400);
  }

  // Cek jam tenang: jika pengingat disetel saat jam tenang, berikan peringatan
  if (isInQuietHours(input.localTime)) {
    throw new HabitsError(
      `Waktu ${input.localTime} berada dalam Jam Tenang (22:00 - 06:00). Silakan pilih waktu di luar jam tenang demi kenyamanan istirahat Anda.`,
      "VALIDATION_ERROR",
      400
    );
  }

  const now = clock.now();
  const nextFireAt = computeNextReminderFireAt(
    input.localTime,
    input.daysOfWeek || [],
    habit.timezone,
    now
  );

  const reminder = await client.habitReminder.create({
    data: {
      habitId,
      kind: input.kind,
      localTime: input.localTime,
      daysOfWeek: input.daysOfWeek || [],
      nextFireAt,
      isActive: input.isActive ?? true,
    },
  });

  return reminder;
}

/**
 * Daftar seluruh pengingat untuk suatu kebiasaan
 */
export async function listHabitRemindersService(
  userId: string,
  habitId: string,
  client = prisma
) {
  const habit = await client.trackedHabit.findFirst({
    where: { id: habitId, userId },
  });

  if (!habit) {
    throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
  }

  const reminders = await client.habitReminder.findMany({
    where: { habitId },
    orderBy: { createdAt: "desc" },
  });

  return { habit, reminders };
}

/**
 * Mengubah status aktif / nonaktif pengingat
 */
export async function toggleHabitReminderService(
  userId: string,
  habitId: string,
  reminderId: string,
  isActive: boolean,
  client = prisma,
  clock: Clock = new SystemClock()
) {
  const reminder = await client.habitReminder.findFirst({
    where: { id: reminderId, habitId, habit: { userId } },
    include: { habit: true },
  });

  if (!reminder) {
    throw new HabitsError("Pengingat tidak ditemukan", "NOT_FOUND", 404);
  }

  const now = clock.now();
  const nextFireAt = isActive
    ? computeNextReminderFireAt(
        reminder.localTime,
        reminder.daysOfWeek,
        reminder.habit.timezone,
        now
      )
    : null;

  return client.habitReminder.update({
    where: { id: reminderId },
    data: { isActive, nextFireAt },
  });
}

/**
 * Menghapus pengingat
 */
export async function deleteHabitReminderService(
  userId: string,
  habitId: string,
  reminderId: string,
  client = prisma
) {
  const reminder = await client.habitReminder.findFirst({
    where: { id: reminderId, habitId, habit: { userId } },
  });

  if (!reminder) {
    throw new HabitsError("Pengingat tidak ditemukan", "NOT_FOUND", 404);
  }

  await client.habitReminder.delete({
    where: { id: reminderId },
  });

  return { success: true };
}

/**
 * Memasang pengingat otomatis 15-30 menit sebelum jendela rawan teratas
 */
export async function setupRiskWindowReminderService(
  userId: string,
  habitId: string,
  client = prisma,
  clock: Clock = new SystemClock()
) {
  const insights = await getHabitInsightsService(userId, habitId, 60, client, clock);

  const riskWindowInsight = insights.insights.find((i) => i.kind === "RISK_WINDOWS");
  if (!riskWindowInsight || !riskWindowInsight.metadata?.topWindows) {
    throw new HabitsError(
      "Belum ada jendela rawan yang terdeteksi dengan bukti data yang cukup.",
      "VALIDATION_ERROR",
      400
    );
  }

  const topBins = riskWindowInsight.metadata.topWindows as Array<{
    dayOfWeek: number;
    hour: number;
    dayName: string;
    hourLabel: string;
    rawCount: number;
  }>;

  if (topBins.length === 0) {
    throw new HabitsError("Tidak ada jendela rawan yang memenuhi kriteria.", "NOT_FOUND", 404);
  }

  const topBin = topBins[0];
  const reminderTime = computeRiskWindowReminderTime(topBin.hour, 30); // 30 menit sebelum

  // Validasi jam tenang
  if (isInQuietHours(reminderTime.localTime)) {
    throw new HabitsError(
      `Pengingat untuk jendela rawan pukul ${reminderTime.localTime} berada dalam Jam Tenang (22:00 - 06:00). Sistem tidak menjadwalkan notifikasi pada jam istirahat.`,
      "VALIDATION_ERROR",
      400
    );
  }

  // Hapus pengingat RISK_WINDOW lama jika ada, lalu buat yang baru
  await client.habitReminder.deleteMany({
    where: { habitId, kind: HabitReminderKind.RISK_WINDOW },
  });

  const now = clock.now();
  const nextFireAt = computeNextReminderFireAt(
    reminderTime.localTime,
    [topBin.dayOfWeek],
    insights.habit.timezone,
    now
  );

  const created = await client.habitReminder.create({
    data: {
      habitId,
      kind: HabitReminderKind.RISK_WINDOW,
      localTime: reminderTime.localTime,
      daysOfWeek: [topBin.dayOfWeek],
      nextFireAt,
      isActive: true,
    },
  });

  return {
    reminder: created,
    riskWindow: topBin,
    explanation: `Pengingat berhasil dijadwalkan setiap hari ${topBin.dayName} pukul ${reminderTime.localTime} (30 menit sebelum jam rawan).`,
  };
}
