import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { SystemClock, type Clock } from "@/lib/habits/clock";
import { HabitsError } from "./habit-v2.service";
import { acquireHabitAdvisoryLock } from "@/repositories/habits/tracked-habit.repository";
import { resetPlanSchema, type ResetPlanInput } from "@/schemas/habits/relapse.schema";

export async function acknowledgeRelapsePromptService(
  userId: string,
  habitId: string,
  clock: Clock = new SystemClock(),
) {
  const habit = await prisma.trackedHabit.findFirst({
    where: { id: habitId, userId },
    include: { breakProfile: true },
  });

  if (!habit) {
    throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
  }

  const ackTime = clock.now();

  await prisma.habitBreakProfile.upsert({
    where: { habitId },
    update: { relapseAckAt: ackTime },
    create: {
      habitId,
      relapseAckAt: ackTime,
    },
  });

  return { success: true, relapseAckAt: ackTime };
}

export async function resetHabitPlanService(
  userId: string,
  habitId: string,
  rawInput: ResetPlanInput,
  clock: Clock = new SystemClock(),
) {
  const parsed = resetPlanSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new HabitsError(
      parsed.error.issues.map((i) => i.message).join(", "),
      "VALIDATION_ERROR",
      400,
    );
  }

  const input = parsed.data;

  return prisma.$transaction(async (tx) => {
    await acquireHabitAdvisoryLock(habitId, tx);

    const habit = await tx.trackedHabit.findFirst({
      where: { id: habitId, userId },
      include: { breakProfile: true },
    });

    if (!habit) {
      throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
    }

    const now = clock.now();

    // 1. Transisi kembali ke tahap Persiapan (desain §8.7)
    await tx.trackedHabit.update({
      where: { id: habitId },
      data: {
        stage: "PREPARATION",
      },
    });

    // 2. Perbarui komitmen/profil penghentian & tandai relapseAckAt
    const breakData: Prisma.HabitBreakProfileUpdateInput = {
      relapseAckAt: now,
    };
    if (input.whyReasons && input.whyReasons.length > 0) {
      breakData.whyReasons = input.whyReasons;
    }
    if (input.futureSelfNote !== undefined) {
      breakData.futureSelfNote = input.futureSelfNote;
    }

    await tx.habitBreakProfile.upsert({
      where: { habitId },
      update: breakData,
      create: {
        habitId,
        whyReasons: input.whyReasons ?? [],
        futureSelfNote: input.futureSelfNote,
        relapseAckAt: now,
      },
    });

    // 3. Tambahkan rencana jika-maka baru bila disertakan
    let createdCopingPlan = null;
    if (input.newCopingPlan) {
      if (input.newCopingPlan.habitTriggerId) {
        const trigger = await tx.habitTrigger.findFirst({
          where: { id: input.newCopingPlan.habitTriggerId, habitId },
        });
        if (!trigger) {
          throw new HabitsError(
            "Pemicu kebiasaan tidak valid atau tidak terkait dengan kebiasaan ini.",
            "VALIDATION_ERROR",
            400,
          );
        }
      }

      createdCopingPlan = await tx.copingPlan.create({
        data: {
          habitId,
          ifCondition: input.newCopingPlan.ifCondition,
          thenAction: input.newCopingPlan.thenAction,
          habitTriggerId: input.newCopingPlan.habitTriggerId ?? null,
        },
      });
    }

    return {
      success: true,
      stage: "PREPARATION",
      relapseAckAt: now,
      createdCopingPlan,
    };
  });
}
