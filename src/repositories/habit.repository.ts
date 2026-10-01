import { prisma } from "@/lib/prisma";
import type { HabitType, HabitDifficulty } from "@/generated/prisma/client";

// ─── Habit CRUD ──────────────────────────────────────────────────────────────

export function createHabit(
  userId: string,
  data: {
    title: string;
    description?: string | null;
    type?: HabitType;
    difficulty?: HabitDifficulty;
    color?: string;
    icon?: string;
    areaId?: string | null;
    triggerNotes?: string | null;
    replacementHabit?: string | null;
    whyQuit?: string | null;
    cue?: string | null;
    reward?: string | null;
  },
) {
  return prisma.habit.create({
    data: {
      userId,
      title: data.title,
      description: data.description ?? null,
      type: data.type ?? "GOOD",
      difficulty: data.difficulty ?? "MEDIUM",
      color: data.color ?? "#8B5CF6",
      icon: data.icon ?? "zap",
      areaId: data.areaId ?? null,
      triggerNotes: data.triggerNotes ?? null,
      replacementHabit: data.replacementHabit ?? null,
      whyQuit: data.whyQuit ?? null,
      cue: data.cue ?? null,
      reward: data.reward ?? null,
    },
  });
}

export function findHabit(userId: string, id: string) {
  return prisma.habit.findFirst({
    where: { id, userId },
    include: {
      area: { select: { id: true, name: true, color: true } },
      phases: { orderBy: { order: "asc" } },
      streaks: { where: { isCurrent: true }, take: 1 },
      logs: {
        orderBy: { date: "desc" },
        take: 90,
      },
    },
  });
}

export function findHabits(userId: string, filters?: { type?: HabitType; isActive?: boolean }) {
  return prisma.habit.findMany({
    where: {
      userId,
      ...(filters?.type !== undefined && { type: filters.type }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
    },
    include: {
      area: { select: { id: true, name: true, color: true } },
      phases: { orderBy: { order: "asc" } },
      streaks: { where: { isCurrent: true }, take: 1 },
      logs: {
        orderBy: { date: "desc" },
        take: 90, // Last 90 days for heatmap
      },
    },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
  });
}

export function updateHabit(
  userId: string,
  id: string,
  data: {
    title?: string;
    description?: string | null;
    type?: HabitType;
    difficulty?: HabitDifficulty;
    color?: string;
    icon?: string;
    areaId?: string | null;
    isActive?: boolean;
    triggerNotes?: string | null;
    replacementHabit?: string | null;
    whyQuit?: string | null;
    cue?: string | null;
    reward?: string | null;
  },
) {
  return prisma.habit.updateMany({
    where: { id, userId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.difficulty !== undefined && { difficulty: data.difficulty }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.areaId !== undefined && { areaId: data.areaId }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.triggerNotes !== undefined && { triggerNotes: data.triggerNotes }),
      ...(data.replacementHabit !== undefined && { replacementHabit: data.replacementHabit }),
      ...(data.whyQuit !== undefined && { whyQuit: data.whyQuit }),
      ...(data.cue !== undefined && { cue: data.cue }),
      ...(data.reward !== undefined && { reward: data.reward }),
    },
  });
}

export function deleteHabit(userId: string, id: string) {
  return prisma.habit.deleteMany({ where: { id, userId } });
}

// ─── HabitPhase CRUD ─────────────────────────────────────────────────────────

export function createHabitPhase(
  habitId: string,
  data: {
    title: string;
    description?: string | null;
    targetDays: number;
    afterRelapseDays?: number | null;
    order: number;
    psychTip?: string | null;
  },
) {
  return prisma.habitPhase.create({
    data: {
      habitId,
      title: data.title,
      description: data.description ?? null,
      targetDays: data.targetDays,
      afterRelapseDays: data.afterRelapseDays ?? null,
      order: data.order,
      psychTip: data.psychTip ?? null,
    },
  });
}

export function updateHabitPhase(
  id: string,
  habitId: string,
  data: {
    title?: string;
    description?: string | null;
    targetDays?: number;
    afterRelapseDays?: number | null;
    order?: number;
    psychTip?: string | null;
    isCompleted?: boolean;
    completedAt?: Date | null;
    startedAt?: Date | null;
  },
) {
  return prisma.habitPhase.updateMany({
    where: { id, habitId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.targetDays !== undefined && { targetDays: data.targetDays }),
      ...(data.afterRelapseDays !== undefined && { afterRelapseDays: data.afterRelapseDays }),
      ...(data.order !== undefined && { order: data.order }),
      ...(data.psychTip !== undefined && { psychTip: data.psychTip }),
      ...(data.isCompleted !== undefined && { isCompleted: data.isCompleted }),
      ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
      ...(data.startedAt !== undefined && { startedAt: data.startedAt }),
    },
  });
}

export function deleteHabitPhase(id: string, habitId: string) {
  return prisma.habitPhase.deleteMany({ where: { id, habitId } });
}

export function findHabitPhases(habitId: string) {
  return prisma.habitPhase.findMany({
    where: { habitId },
    orderBy: { order: "asc" },
  });
}

// ─── HabitLog CRUD ───────────────────────────────────────────────────────────

export function upsertHabitLog(
  userId: string,
  habitId: string,
  data: {
    date: Date;
    isSuccess: boolean;
    mood?: number | null;
    energyLevel?: number | null;
    notes?: string | null;
    relapseTrigger?: string | null;
  },
) {
  return prisma.habitLog.upsert({
    where: { userId_habitId_date: { userId, habitId, date: data.date } },
    create: {
      userId,
      habitId,
      date: data.date,
      isSuccess: data.isSuccess,
      mood: data.mood ?? null,
      energyLevel: data.energyLevel ?? null,
      notes: data.notes ?? null,
      relapseTrigger: data.relapseTrigger ?? null,
    },
    update: {
      isSuccess: data.isSuccess,
      mood: data.mood ?? null,
      energyLevel: data.energyLevel ?? null,
      notes: data.notes ?? null,
      relapseTrigger: data.relapseTrigger ?? null,
    },
  });
}

export function findHabitLogs(userId: string, habitId: string, limit = 365) {
  return prisma.habitLog.findMany({
    where: { userId, habitId },
    orderBy: { date: "desc" },
    take: limit,
  });
}

export function findTodayLog(userId: string, habitId: string, today: Date) {
  return prisma.habitLog.findUnique({
    where: { userId_habitId_date: { userId, habitId, date: today } },
  });
}

// ─── HabitStreak ─────────────────────────────────────────────────────────────

export function findCurrentStreak(userId: string, habitId: string) {
  return prisma.habitStreak.findFirst({
    where: { userId, habitId, isCurrent: true },
  });
}

export function findAllStreaks(userId: string, habitId: string) {
  return prisma.habitStreak.findMany({
    where: { userId, habitId },
    orderBy: { days: "desc" },
  });
}

export function upsertCurrentStreak(
  userId: string,
  habitId: string,
  days: number,
  startDate: Date,
) {
  return prisma.$transaction(async (tx) => {
    // Mark all existing streaks for this habit as not current
    await tx.habitStreak.updateMany({
      where: { userId, habitId, isCurrent: true },
      data: { isCurrent: false, endDate: new Date() },
    });

    // Create a new current streak
    return tx.habitStreak.create({
      data: { userId, habitId, startDate, days, isCurrent: true },
    });
  });
}

export function incrementStreak(userId: string, habitId: string) {
  return prisma.habitStreak.updateMany({
    where: { userId, habitId, isCurrent: true },
    data: { days: { increment: 1 } },
  });
}

export function breakStreak(userId: string, habitId: string) {
  return prisma.habitStreak.updateMany({
    where: { userId, habitId, isCurrent: true },
    data: { isCurrent: false, endDate: new Date() },
  });
}
