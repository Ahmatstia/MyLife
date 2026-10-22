import { prisma } from "@/lib/prisma";
import type { CopingPlan } from "@/generated/prisma/client";
import type { DbClient } from "./tracked-habit.repository";

export async function findCopingPlansByHabit(
  habitId: string,
  options?: { isActiveOnly?: boolean },
  client: DbClient = prisma,
) {
  return client.copingPlan.findMany({
    where: {
      habitId,
      ...(options?.isActiveOnly ? { isActive: true } : {}),
    },
    include: {
      habitTrigger: {
        include: {
          trigger: true,
        },
      },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

export async function findCopingPlanById(
  id: string,
  client: DbClient = prisma,
) {
  return client.copingPlan.findUnique({
    where: { id },
    include: {
      habitTrigger: {
        include: {
          trigger: true,
        },
      },
      habit: {
        select: { id: true, userId: true },
      },
    },
  });
}

export async function createCopingPlan(
  data: {
    habitId: string;
    habitTriggerId?: string | null;
    ifCondition: string;
    thenAction: string;
    replacementHabitId?: string | null;
    order?: number;
    isActive?: boolean;
  },
  client: DbClient = prisma,
): Promise<CopingPlan> {
  return client.copingPlan.create({
    data: {
      habitId: data.habitId,
      habitTriggerId: data.habitTriggerId,
      ifCondition: data.ifCondition,
      thenAction: data.thenAction,
      replacementHabitId: data.replacementHabitId,
      order: data.order ?? 0,
      isActive: data.isActive ?? true,
    },
    include: {
      habitTrigger: {
        include: {
          trigger: true,
        },
      },
    },
  });
}

export async function updateCopingPlan(
  id: string,
  data: {
    habitTriggerId?: string | null;
    ifCondition?: string;
    thenAction?: string;
    replacementHabitId?: string | null;
    order?: number;
    isActive?: boolean;
  },
  client: DbClient = prisma,
): Promise<CopingPlan> {
  return client.copingPlan.update({
    where: { id },
    data,
    include: {
      habitTrigger: {
        include: {
          trigger: true,
        },
      },
    },
  });
}

export async function deleteCopingPlan(
  id: string,
  client: DbClient = prisma,
): Promise<CopingPlan> {
  return client.copingPlan.delete({
    where: { id },
  });
}

export async function recordCopingPlanOutcome(
  id: string,
  helped: boolean,
  client: DbClient = prisma,
): Promise<CopingPlan> {
  return client.copingPlan.update({
    where: { id },
    data: {
      timesUsed: { increment: 1 },
      ...(helped ? { timesHelped: { increment: 1 } } : {}),
    },
    include: {
      habitTrigger: {
        include: {
          trigger: true,
        },
      },
    },
  });
}
