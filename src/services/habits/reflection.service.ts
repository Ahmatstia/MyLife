import { prisma } from "@/lib/prisma";
import { SystemClock, type Clock } from "@/lib/habits/clock";
import { HabitsError } from "./habit-v2.service";
import { DateTime } from "luxon";

const REFLECTION_QUESTIONS = [
  "Apa hal kecil yang paling membantumu menjaga ketenangan atau konsistensi minggu ini?",
  "Saat dorongan atau rasa jenuh muncul minggu ini, respons apa yang terasa paling efektif bagimu?",
  "Pelajaran positif apa yang kamu dapatkan tentang dirimu sendiri selama 7 hari terakhir?",
  "Jika ada satu penyesuaian sederhana untuk membuat minggu depan terasa lebih ringan, apa itu?",
];

export function getMondayOfWeek(date: Date, timezone = "Asia/Jakarta"): Date {
  const dt = DateTime.fromJSDate(date, { zone: timezone }).startOf("week"); // Luxon startOf('week') adalah Senin
  return dt.toJSDate();
}

/**
 * Mendapatkan atau menyiapkan form refleksi mingguan untuk habit
 */
export async function getWeeklyReflectionPromptService(
  userId: string,
  habitId: string,
  client = prisma,
  clock: Clock = new SystemClock()
) {
  const habit = await client.trackedHabit.findFirst({
    where: { id: habitId, userId },
    include: { stats: true, buildProfile: true, breakProfile: true },
  });

  if (!habit) {
    throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
  }

  const now = clock.now();
  const weekStart = getMondayOfWeek(now, habit.timezone);

  // Cek apakah refleksi minggu ini sudah ada
  let reflection = await client.habitReflection.findUnique({
    where: {
      habitId_weekStart: {
        habitId,
        weekStart,
      },
    },
  });

  if (!reflection) {
    // Pilih pertanyaan refleksi berdasarkan nomor minggu
    const weekNumber = DateTime.fromJSDate(now, { zone: habit.timezone }).weekNumber;
    const question = REFLECTION_QUESTIONS[weekNumber % REFLECTION_QUESTIONS.length];

    const summary = {
      currentStreakDays: habit.stats?.currentStreakDays ?? 0,
      resilientStreak: habit.stats?.resilientStreak ?? 0,
      longestStreakDays: habit.stats?.longestStreakDays ?? 0,
      weekNumber,
    };

    reflection = await client.habitReflection.create({
      data: {
        habitId,
        weekStart,
        question,
        summary,
      },
    });
  }

  // Riwayat refleksi lampau
  const pastReflections = await client.habitReflection.findMany({
    where: { habitId, submittedAt: { not: null } },
    orderBy: { weekStart: "desc" },
    take: 5,
  });

  return { habit, currentReflection: reflection, pastReflections };
}

/**
 * Menyimpan jawaban refleksi mingguan
 */
export async function submitWeeklyReflectionService(
  userId: string,
  habitId: string,
  reflectionId: string,
  answer: string,
  client = prisma,
  clock: Clock = new SystemClock()
) {
  const reflection = await client.habitReflection.findFirst({
    where: { id: reflectionId, habitId, habit: { userId } },
  });

  if (!reflection) {
    throw new HabitsError("Refleksi mingguan tidak ditemukan", "NOT_FOUND", 404);
  }

  if (!answer || answer.trim().length === 0) {
    throw new HabitsError("Tuliskan setidaknya satu kalimat refleksi.", "VALIDATION_ERROR", 400);
  }

  const now = clock.now();

  return client.habitReflection.update({
    where: { id: reflectionId },
    data: {
      answer: answer.trim(),
      submittedAt: now,
    },
  });
}

/**
 * Cek status pesan pengembalian hangat (Re-engagement)
 * Jika tidak ada aktivitas >= 3 hari, siapkan pesan hangat (maksimal 1/minggu, tanpa rasa bersalah)
 */
export async function getReengagementStatusService(
  userId: string,
  habitId: string,
  client = prisma,
  clock: Clock = new SystemClock()
) {
  const habit = await client.trackedHabit.findFirst({
    where: { id: habitId, userId },
  });

  if (!habit) {
    throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
  }

  const now = clock.now();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  // Ambil event terakhir
  const lastEvent = await client.habitEvent.findFirst({
    where: { habitId, deletedAt: null },
    orderBy: { occurredAt: "desc" },
  });

  // Ambil checkin terakhir yang direspons
  const lastCheckin = await client.habitCheckin.findFirst({
    where: { habitId, respondedAt: { not: null } },
    orderBy: { respondedAt: "desc" },
  });

  const lastActivityTime = Math.max(
    lastEvent ? new Date(lastEvent.occurredAt).getTime() : 0,
    lastCheckin?.respondedAt ? new Date(lastCheckin.respondedAt).getTime() : 0,
    new Date(habit.startedAt).getTime()
  );

  const isInactiveFor3Days = lastActivityTime < threeDaysAgo.getTime();

  return {
    isInactiveFor3Days,
    lastActivityAt: new Date(lastActivityTime),
    reengagementMessage: isInactiveFor3Days
      ? {
          title: "Langkah Kecil Selalu Menunggumu",
          text: "Halo, perjalanan membangun kebiasaan ini selalu menyambut kehadiranmu kapan pun kamu siap melangkah. Tidak ada yang terlambat atau tertinggal—setiap hari adalah kesempatan baru untuk memulai dari hal yang paling mudah.",
        }
      : null,
  };
}
