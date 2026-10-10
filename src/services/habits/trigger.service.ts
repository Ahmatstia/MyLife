import type { TriggerCategory } from "@/generated/prisma/client";
import { HabitsError } from "./habit-v2.service";
import { findTrackedHabitById } from "@/repositories/habits/tracked-habit.repository";
import {
  findBuiltinTriggers,
  findTriggerById,
  createCustomTrigger,
  findHabitTriggers,
  findHabitTriggerById,
  findHabitTriggerByHabitAndTrigger,
  createHabitTrigger,
  updateHabitTrigger as repoUpdateHabitTrigger,
  deleteHabitTrigger,
} from "@/repositories/habits/trigger.repository";
import {
  attachHabitTriggerSchema,
  updateHabitTriggerSchema,
  type AttachHabitTriggerInput,
  type UpdateHabitTriggerInput,
} from "@/schemas/habits/trigger.schema";

export async function getBuiltinTriggersLibraryService(category?: TriggerCategory) {
  return findBuiltinTriggers(category);
}

export async function getHabitTriggersService(userId: string, habitId: string) {
  const habit = await findTrackedHabitById(habitId, userId);
  if (!habit) {
    throw new HabitsError("Kebiasaan tidak ditemukan.", "NOT_FOUND", 404);
  }

  return findHabitTriggers(habitId);
}

export async function attachHabitTriggerService(
  userId: string,
  habitId: string,
  rawInput: AttachHabitTriggerInput,
) {
  const parsed = attachHabitTriggerSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new HabitsError(
      parsed.error.issues.map((i) => i.message).join(", "),
      "VALIDATION_ERROR",
      400,
    );
  }

  const habit = await findTrackedHabitById(habitId, userId);
  if (!habit) {
    throw new HabitsError("Kebiasaan tidak ditemukan.", "NOT_FOUND", 404);
  }

  const input = parsed.data;
  let targetTriggerId: string;

  if (input.triggerId) {
    const trigger = await findTriggerById(input.triggerId);
    if (!trigger) {
      throw new HabitsError("Pemicu tidak ditemukan.", "NOT_FOUND", 404);
    }
    // IDOR check: trigger must be builtin (userId === null) or owned by the user
    if (trigger.userId !== null && trigger.userId !== userId) {
      throw new HabitsError("Pemicu tidak ditemukan.", "NOT_FOUND", 404);
    }
    targetTriggerId = trigger.id;
  } else if (input.custom) {
    const newTrigger = await createCustomTrigger(userId, input.custom);
    targetTriggerId = newTrigger.id;
  } else {
    throw new HabitsError(
      "Harus menyertakan triggerId atau data pemicu kustom baru.",
      "VALIDATION_ERROR",
      400,
    );
  }

  // Cek apakah sudah pernah terhubung
  const existing = await findHabitTriggerByHabitAndTrigger(habitId, targetTriggerId);
  if (existing) {
    throw new HabitsError(
      "Pemicu sudah terhubung ke kebiasaan ini.",
      "CONFLICT",
      409,
    );
  }

  return createHabitTrigger({
    habitId,
    triggerId: targetTriggerId,
    intensity: input.intensity,
    note: input.note,
  });
}

export async function updateHabitTriggerService(
  userId: string,
  habitId: string,
  habitTriggerId: string,
  rawInput: UpdateHabitTriggerInput,
) {
  const parsed = updateHabitTriggerSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new HabitsError(
      parsed.error.issues.map((i) => i.message).join(", "),
      "VALIDATION_ERROR",
      400,
    );
  }

  const habit = await findTrackedHabitById(habitId, userId);
  if (!habit) {
    throw new HabitsError("Kebiasaan tidak ditemukan.", "NOT_FOUND", 404);
  }

  const habitTrigger = await findHabitTriggerById(habitTriggerId);
  if (!habitTrigger || habitTrigger.habitId !== habitId) {
    throw new HabitsError("Pemicu kebiasaan tidak ditemukan.", "NOT_FOUND", 404);
  }

  return repoUpdateHabitTrigger(habitTriggerId, parsed.data);
}

export async function removeHabitTriggerService(
  userId: string,
  habitId: string,
  habitTriggerId: string,
) {
  const habit = await findTrackedHabitById(habitId, userId);
  if (!habit) {
    throw new HabitsError("Kebiasaan tidak ditemukan.", "NOT_FOUND", 404);
  }

  const habitTrigger = await findHabitTriggerById(habitTriggerId);
  if (!habitTrigger || habitTrigger.habitId !== habitId) {
    throw new HabitsError("Pemicu kebiasaan tidak ditemukan.", "NOT_FOUND", 404);
  }

  return deleteHabitTrigger(habitTriggerId);
}
