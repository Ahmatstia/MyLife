import { prisma } from "@/lib/prisma";
import { SystemClock, type Clock } from "@/lib/habits/clock";
import { HabitsError } from "./habit-v2.service";
import { findTrackedHabitById } from "@/repositories/habits/tracked-habit.repository";
import { MILESTONE_DEFINITIONS } from "@/lib/habits/milestones/definitions";

export async function getHabitMilestonesService(
  userId: string,
  habitId: string,
) {
  const habit = await findTrackedHabitById(habitId, userId);
  if (!habit) {
    throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
  }

  const achieved = await prisma.habitMilestone.findMany({
    where: { habitId },
    orderBy: { achievedAt: "desc" },
  });

  const achievedMap = new Map(achieved.map((m) => [m.code, m]));

  const allMilestones = MILESTONE_DEFINITIONS.map((def) => {
    const ach = achievedMap.get(def.code);
    return {
      code: def.code,
      title: def.title,
      description: def.description,
      category: def.category,
      isAchieved: Boolean(ach),
      achievedAt: ach?.achievedAt ?? null,
      celebratedAt: ach?.celebratedAt ?? null,
      id: ach?.id ?? null,
    };
  });

  return {
    achieved,
    allMilestones,
    uncelebrated: achieved.filter((m) => !m.celebratedAt),
  };
}

export async function celebrateMilestoneService(
  userId: string,
  habitId: string,
  milestoneId: string,
  clock: Clock = new SystemClock(),
) {
  const habit = await findTrackedHabitById(habitId, userId);
  if (!habit) {
    throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
  }

  const milestone = await prisma.habitMilestone.findFirst({
    where: { id: milestoneId, habitId },
  });

  if (!milestone) {
    throw new HabitsError("Milestone tidak ditemukan", "NOT_FOUND", 404);
  }

  const now = clock.now();

  const updated = await prisma.habitMilestone.update({
    where: { id: milestoneId },
    data: { celebratedAt: now },
  });

  return {
    success: true,
    milestone: updated,
  };
}
