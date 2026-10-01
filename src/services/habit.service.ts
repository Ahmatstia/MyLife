import {
  createHabit as createHabitRecord,
  findHabit as findHabitRecord,
  findHabits as findHabitsRecord,
  updateHabit as updateHabitRecord,
  deleteHabit as deleteHabitRecord,
  createHabitPhase as createHabitPhaseRecord,
  updateHabitPhase as updateHabitPhaseRecord,
  deleteHabitPhase as deleteHabitPhaseRecord,
  findHabitPhases,
  upsertHabitLog,
  findHabitLogs,
  findTodayLog,
  findCurrentStreak,
  findAllStreaks,
  incrementStreak,
  breakStreak,
  upsertCurrentStreak,
} from "@/repositories/habit.repository";
import {
  createHabitSchema,
  updateHabitSchema,
  createHabitPhaseSchema,
  updateHabitPhaseSchema,
  createHabitLogSchema,
  type CreateHabitInput,
  type UpdateHabitInput,
  type CreateHabitPhaseInput,
  type UpdateHabitPhaseInput,
  type CreateHabitLogInput,
} from "@/schemas/habit.schema";
import { requireUserId } from "@/lib/ownership";
import { prisma } from "@/lib/prisma";
import type { HabitStreak, HabitLog, HabitPhase, HabitType } from "@/generated/prisma/client";


export class HabitServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string = "HABIT_ERROR",
  ) {
    super(message);
    this.name = "HabitServiceError";
  }
}

// ─── Normalize date to midnight UTC ──────────────────────────────────────────
function normalizeDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function todayNormalized(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

// ─── Habit CRUD ───────────────────────────────────────────────────────────────

export async function createHabit(input: CreateHabitInput, userId?: string) {
  const owner = requireUserId(userId);
  const parsed = createHabitSchema.parse(input);

  if (parsed.areaId) {
    const area = await prisma.area.findFirst({ where: { id: parsed.areaId, userId: owner } });
    if (!area) throw new HabitServiceError("Area tidak ditemukan.", "AREA_NOT_FOUND");
  }

  return createHabitRecord(owner, parsed);
}

export async function getHabits(userId?: string, filters?: { type?: HabitType | string; isActive?: boolean }) {
  const owner = requireUserId(userId);
  return findHabitsRecord(owner, filters as { type?: HabitType; isActive?: boolean } | undefined);
}

export async function getHabit(id: string, userId?: string) {
  const owner = requireUserId(userId);
  const habit = await findHabitRecord(owner, id);
  if (!habit) throw new HabitServiceError("Kebiasaan tidak ditemukan.", "HABIT_NOT_FOUND");
  return habit;
}

export async function updateHabit(id: string, input: UpdateHabitInput, userId?: string) {
  const owner = requireUserId(userId);
  const existing = await findHabitRecord(owner, id);
  if (!existing) throw new HabitServiceError("Kebiasaan tidak ditemukan.", "HABIT_NOT_FOUND");

  const parsed = updateHabitSchema.parse(input);

  if (parsed.areaId) {
    const area = await prisma.area.findFirst({ where: { id: parsed.areaId, userId: owner } });
    if (!area) throw new HabitServiceError("Area tidak ditemukan.", "AREA_NOT_FOUND");
  }

  return updateHabitRecord(owner, id, parsed);
}

export async function deleteHabit(id: string, userId?: string) {
  const owner = requireUserId(userId);
  const existing = await findHabitRecord(owner, id);
  if (!existing) throw new HabitServiceError("Kebiasaan tidak ditemukan.", "HABIT_NOT_FOUND");
  return deleteHabitRecord(owner, id);
}

// ─── HabitPhase Management ────────────────────────────────────────────────────

export async function addHabitPhase(habitId: string, input: CreateHabitPhaseInput, userId?: string) {
  const owner = requireUserId(userId);
  const habit = await findHabitRecord(owner, habitId);
  if (!habit) throw new HabitServiceError("Kebiasaan tidak ditemukan.", "HABIT_NOT_FOUND");

  const parsed = createHabitPhaseSchema.parse(input);
  return createHabitPhaseRecord(habitId, parsed);
}

export async function editHabitPhase(
  phaseId: string,
  habitId: string,
  input: UpdateHabitPhaseInput,
  userId?: string,
) {
  const owner = requireUserId(userId);
  const habit = await findHabitRecord(owner, habitId);
  if (!habit) throw new HabitServiceError("Kebiasaan tidak ditemukan.", "HABIT_NOT_FOUND");

  const parsed = updateHabitPhaseSchema.parse(input);
  const now = new Date();

  // Auto-set completedAt when marking complete
  const completedAt =
    parsed.isCompleted === true ? (parsed as Record<string, unknown>).completedAt as Date | null | undefined ?? now
    : parsed.isCompleted === false ? null
    : undefined;

  return updateHabitPhaseRecord(phaseId, habitId, { ...parsed, completedAt });
}

export async function removeHabitPhase(phaseId: string, habitId: string, userId?: string) {
  const owner = requireUserId(userId);
  const habit = await findHabitRecord(owner, habitId);
  if (!habit) throw new HabitServiceError("Kebiasaan tidak ditemukan.", "HABIT_NOT_FOUND");
  return deleteHabitPhaseRecord(phaseId, habitId);
}

export async function getHabitPhases(habitId: string, userId?: string) {
  const owner = requireUserId(userId);
  const habit = await findHabitRecord(owner, habitId);
  if (!habit) throw new HabitServiceError("Kebiasaan tidak ditemukan.", "HABIT_NOT_FOUND");
  return findHabitPhases(habitId);
}

// ─── Daily Check-In (Core Logic) ─────────────────────────────────────────────

export async function checkInHabit(habitId: string, input: CreateHabitLogInput, userId?: string) {
  const owner = requireUserId(userId);
  const habit = await findHabitRecord(owner, habitId);
  if (!habit) throw new HabitServiceError("Kebiasaan tidak ditemukan.", "HABIT_NOT_FOUND");

  const parsed = createHabitLogSchema.parse(input);
  const logDate = normalizeDate(parsed.date);

  // Save the log
  const log = await upsertHabitLog(owner, habitId, {
    date: logDate,
    isSuccess: parsed.isSuccess,
    mood: parsed.mood ?? null,
    energyLevel: parsed.energyLevel ?? null,
    notes: parsed.notes ?? null,
    relapseTrigger: parsed.relapseTrigger ?? null,
  });

  // Update streak logic
  const streakResult = await updateStreakAfterCheckIn(owner, habitId, logDate, parsed.isSuccess);

  // Update phase progress for BAD habits
  let phaseUpdate = null;
  if (habit.type === "BAD" && habit.phases.length > 0) {
    phaseUpdate = await updatePhaseProgress(habitId, owner, streakResult.currentStreak);
  }

  // Build motivational message
  const message = buildMotivationalMessage(
    habit.type,
    parsed.isSuccess,
    streakResult.currentStreak,
    streakResult.isNewRecord,
    phaseUpdate,
  );

  return { log, streak: streakResult, phaseUpdate, message };
}

async function updateStreakAfterCheckIn(
  userId: string,
  habitId: string,
  logDate: Date,
  isSuccess: boolean,
): Promise<{ currentStreak: number; longestStreak: number; isNewRecord: boolean }> {
  const currentStreakRecord = await findCurrentStreak(userId, habitId);

  if (!isSuccess) {
    // Relapse / failed day — break the streak
    if (currentStreakRecord && currentStreakRecord.days > 0) {
      await breakStreak(userId, habitId);
    }
    // Start new streak at 0
    await upsertCurrentStreak(userId, habitId, 0, logDate);

    const allStreaks = await findAllStreaks(userId, habitId);
    const longestStreak = allStreaks.reduce((max: number, s: HabitStreak) => Math.max(max, s.days), 0);
    return { currentStreak: 0, longestStreak, isNewRecord: false };
  }

  // Success day
  if (!currentStreakRecord) {
    // First ever log
    await upsertCurrentStreak(userId, habitId, 1, logDate);
    return { currentStreak: 1, longestStreak: 1, isNewRecord: true };
  }

  // Check if yesterday was logged (consecutive day)
  const yesterday = new Date(logDate);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const yesterdayLog = await findTodayLog(userId, habitId, yesterday);

  if (yesterdayLog && yesterdayLog.isSuccess) {
    // Consecutive — increment
    await incrementStreak(userId, habitId);
    const newDays = currentStreakRecord.days + 1;
    const allStreaks = await findAllStreaks(userId, habitId);
    const longestStreak = Math.max(...allStreaks.map((s: HabitStreak) => s.days), newDays);
    const isNewRecord = newDays >= longestStreak;
    return { currentStreak: newDays, longestStreak, isNewRecord };
  } else {
    // Gap in days — start new streak
    await upsertCurrentStreak(userId, habitId, 1, logDate);
    const allStreaks = await findAllStreaks(userId, habitId);
    const longestStreak = allStreaks.reduce((max: number, s: HabitStreak) => Math.max(max, s.days), 1);
    return { currentStreak: 1, longestStreak, isNewRecord: false };
  }
}

async function updatePhaseProgress(
  habitId: string,
  userId: string,
  currentStreak: number,
): Promise<{ phaseCompleted: boolean; currentPhase: number | null; nextPhase: number | null } | null> {
  const phases = await findHabitPhases(habitId);
  if (!phases.length) return null;

  // Find the first incomplete phase
  const incompletePhaseIdx = phases.findIndex((p: HabitPhase) => !p.isCompleted);
  if (incompletePhaseIdx === -1) return { phaseCompleted: false, currentPhase: null, nextPhase: null };

  const currentPhase = phases[incompletePhaseIdx];

  // Check if streak has reached this phase's target
  if (currentStreak >= currentPhase.targetDays) {
    await updateHabitPhaseRecord(currentPhase.id, habitId, {
      isCompleted: true,
      completedAt: new Date(),
    });

    const nextPhase = phases[incompletePhaseIdx + 1] ?? null;
    if (nextPhase) {
      await updateHabitPhaseRecord(nextPhase.id, habitId, {
        startedAt: new Date(),
      });
    }

    return {
      phaseCompleted: true,
      currentPhase: currentPhase.order,
      nextPhase: nextPhase?.order ?? null,
    };
  }

  // Ensure current phase has startedAt set
  if (!currentPhase.startedAt) {
    await updateHabitPhaseRecord(currentPhase.id, habitId, { startedAt: new Date() });
  }

  return { phaseCompleted: false, currentPhase: currentPhase.order, nextPhase: null };
}

function buildMotivationalMessage(
  type: string,
  isSuccess: boolean,
  streak: number,
  isNewRecord: boolean,
  phaseUpdate: { phaseCompleted: boolean; currentPhase: number | null } | null | undefined,
): string {
  if (phaseUpdate?.phaseCompleted) {
    return `🎉 LUAR BIASA! Kamu berhasil menyelesaikan fase ini! ${streak} hari tanpa kebiasaan buruk — otak kamu sedang rewiring menuju kebebasan sejati!`;
  }

  if (!isSuccess) {
    if (streak === 0 && type === "BAD") {
      return `💙 Relapse adalah bagian dari proses, bukan kegagalan. Kamu sudah tahu tubuhmu bisa menahan. Mulai lagi dari hari ini — setiap hari baru adalah kesempatan baru.`;
    }
    return `💙 Hari ini tidak sempurna, tapi kamu masih di sini. Itu sudah luar biasa. Coba lagi besok!`;
  }

  if (type === "BAD") {
    if (isNewRecord) return `🏆 REKOR BARU! ${streak} hari! Dopamin otak kamu sedang rebalancing — semakin hari semakin mudah!`;
    if (streak === 1) return `✅ Hari pertama dimulai! Setiap perjalanan dimulai dari satu langkah.`;
    if (streak === 3) return `🔥 3 hari! Penelitian menunjukkan withdrawal terberat terjadi di 72 jam pertama. Kamu sudah melewatinya!`;
    if (streak === 7) return `⚡ 1 MINGGU! Kortisol mulai stabil. Otak kamu sudah mulai memperbaiki sirkuit reward-nya!`;
    if (streak === 14) return `🌟 2 MINGGU! Neuroplastisitas sedang bekerja keras. Kamu sedang membangun versi terbaik dirimu!`;
    if (streak === 30) return `🚀 30 HARI! Ini titik kritis — neural pathways baru sudah mulai kuat. Jangan berhenti sekarang!`;
    if (streak === 90) return `👑 90 HARI! Keajaiban terjadi! Kamu sudah melewati threshold perubahan kebiasaan permanen!`;
    return `✅ Hari ${streak} berhasil! Tetap kuat — setiap hari yang kamu tahan memperkuat sirkuit baru di otakmu!`;
  }

  // GOOD habit
  if (isNewRecord) return `🏆 Rekor baru: ${streak} hari berturut-turut! Konsistensimu luar biasa!`;
  if (streak % 7 === 0) return `🌟 ${streak} hari (${streak / 7} minggu)! Kebiasaan ini sudah menjadi bagian dari hidupmu!`;
  return `✅ Hari ${streak}! Terus pertahankan momentum-mu!`;
}

// ─── Analytics & Stats ────────────────────────────────────────────────────────

export async function getHabitStats(habitId: string, userId?: string) {
  const owner = requireUserId(userId);
  const habit = await findHabitRecord(owner, habitId);
  if (!habit) throw new HabitServiceError("Kebiasaan tidak ditemukan.", "HABIT_NOT_FOUND");

  const logs = await findHabitLogs(owner, habitId, 365);
  const streaks = await findAllStreaks(owner, habitId);
  const currentStreak = streaks.find((s) => s.isCurrent)?.days ?? 0;
  const longestStreak = streaks.reduce((max, s) => Math.max(max, s.days), 0);

  const today = todayNormalized();
  const last30Days = logs.filter((l: HabitLog) => {
    const diff = (today.getTime() - l.date.getTime()) / (1000 * 60 * 60 * 24);
    return diff < 30;
  });
  const successLast30 = last30Days.filter((l: HabitLog) => l.isSuccess).length;

  // Completion rate
  const totalDays = logs.length;
  const successDays = logs.filter((l: HabitLog) => l.isSuccess).length;
  const completionRate = totalDays > 0 ? Math.round((successDays / totalDays) * 100) : 0;

  // Today's log
  const todayLog = logs.find((l: HabitLog) => l.date.getTime() === today.getTime()) ?? null;

  return {
    habit,
    currentStreak,
    longestStreak,
    totalDays,
    successDays,
    completionRate,
    last30Days: { total: last30Days.length, success: successLast30 },
    todayLog,
    logs: logs.slice(0, 90), // Last 90 for heatmap
    streaks,
  };
}

export { findHabitLogs, findTodayLog };
