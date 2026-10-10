import { prisma } from "@/lib/prisma";
import type { Trigger, HabitTrigger, TriggerCategory } from "@/generated/prisma/client";
import type { DbClient } from "./tracked-habit.repository";

export async function findBuiltinTriggers(
  category?: TriggerCategory,
  client: DbClient = prisma,
): Promise<Trigger[]> {
  return client.trigger.findMany({
    where: {
      userId: null,
      ...(category ? { category } : {}),
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function findUserTriggers(
  userId: string,
  category?: TriggerCategory,
  client: DbClient = prisma,
): Promise<Trigger[]> {
  return client.trigger.findMany({
    where: {
      OR: [{ userId: null }, { userId }],
      ...(category ? { category } : {}),
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function findTriggerById(
  id: string,
  client: DbClient = prisma,
): Promise<Trigger | null> {
  return client.trigger.findUnique({
    where: { id },
  });
}

export async function createCustomTrigger(
  userId: string,
  data: {
    name: string;
    category: TriggerCategory;
    description?: string | null;
  },
  client: DbClient = prisma,
): Promise<Trigger> {
  return client.trigger.create({
    data: {
      userId,
      name: data.name,
      category: data.category,
      description: data.description,
    },
  });
}

export async function findHabitTriggers(
  habitId: string,
  client: DbClient = prisma,
) {
  return client.habitTrigger.findMany({
    where: { habitId },
    include: {
      trigger: true,
      _count: {
        select: { copingPlans: true },
      },
    },
    orderBy: [{ intensity: "desc" }, { createdAt: "asc" }],
  });
}

export async function findHabitTriggerById(
  id: string,
  client: DbClient = prisma,
) {
  return client.habitTrigger.findUnique({
    where: { id },
    include: {
      trigger: true,
      habit: {
        select: { id: true, userId: true },
      },
    },
  });
}

export async function findHabitTriggerByHabitAndTrigger(
  habitId: string,
  triggerId: string,
  client: DbClient = prisma,
): Promise<HabitTrigger | null> {
  return client.habitTrigger.findUnique({
    where: {
      habitId_triggerId: {
        habitId,
        triggerId,
      },
    },
  });
}

export async function createHabitTrigger(
  data: {
    habitId: string;
    triggerId: string;
    intensity?: number;
    note?: string | null;
  },
  client: DbClient = prisma,
) {
  return client.habitTrigger.create({
    data: {
      habitId: data.habitId,
      triggerId: data.triggerId,
      intensity: data.intensity ?? 3,
      note: data.note,
    },
    include: {
      trigger: true,
    },
  });
}

export async function updateHabitTrigger(
  id: string,
  data: {
    intensity?: number;
    note?: string | null;
  },
  client: DbClient = prisma,
) {
  return client.habitTrigger.update({
    where: { id },
    data,
    include: {
      trigger: true,
    },
  });
}

export async function deleteHabitTrigger(
  id: string,
  client: DbClient = prisma,
) {
  return client.habitTrigger.delete({
    where: { id },
  });
}
