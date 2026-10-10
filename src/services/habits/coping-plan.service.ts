import { HabitsError } from "./habit-v2.service";
import { findTrackedHabitById } from "@/repositories/habits/tracked-habit.repository";
import { findHabitTriggerById } from "@/repositories/habits/trigger.repository";
import {
  findCopingPlansByHabit,
  findCopingPlanById,
  createCopingPlan,
  updateCopingPlan as repoUpdateCopingPlan,
  deleteCopingPlan as repoDeleteCopingPlan,
  recordCopingPlanOutcome as repoRecordCopingPlanOutcome,
} from "@/repositories/habits/coping-plan.repository";
import {
  createCopingPlanSchema,
  updateCopingPlanSchema,
  recordCopingPlanOutcomeSchema,
  type CreateCopingPlanInput,
  type UpdateCopingPlanInput,
  type RecordCopingPlanOutcomeInput,
} from "@/schemas/habits/coping-plan.schema";

export async function getCopingPlansService(userId: string, habitId: string) {
  const habit = await findTrackedHabitById(habitId, userId);
  if (!habit) {
    throw new HabitsError("Kebiasaan tidak ditemukan.", "NOT_FOUND", 404);
  }

  return findCopingPlansByHabit(habitId);
}

export async function createCopingPlanService(
  userId: string,
  habitId: string,
  rawInput: CreateCopingPlanInput,
) {
  const parsed = createCopingPlanSchema.safeParse(rawInput);
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

  // Validasi: CopingPlan hanya boleh merujuk HabitTrigger milik habit yang sama
  if (input.habitTriggerId) {
    const habitTrigger = await findHabitTriggerById(input.habitTriggerId);
    if (!habitTrigger || habitTrigger.habitId !== habitId) {
      throw new HabitsError(
        "Pemicu kebiasaan tidak valid atau tidak terkait dengan kebiasaan ini.",
        "VALIDATION_ERROR",
        400,
      );
    }
  }

  return createCopingPlan({
    habitId,
    habitTriggerId: input.habitTriggerId,
    ifCondition: input.ifCondition,
    thenAction: input.thenAction,
    replacementHabitId: input.replacementHabitId,
    order: input.order,
    isActive: input.isActive,
  });
}

export async function updateCopingPlanService(
  userId: string,
  habitId: string,
  planId: string,
  rawInput: UpdateCopingPlanInput,
) {
  const parsed = updateCopingPlanSchema.safeParse(rawInput);
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

  const plan = await findCopingPlanById(planId);
  if (!plan || plan.habitId !== habitId) {
    throw new HabitsError("Rencana jika-maka tidak ditemukan.", "NOT_FOUND", 404);
  }

  const input = parsed.data;

  // Jika habitTriggerId diubah, pastikan merujuk ke habit yang sama
  if (input.habitTriggerId) {
    const habitTrigger = await findHabitTriggerById(input.habitTriggerId);
    if (!habitTrigger || habitTrigger.habitId !== habitId) {
      throw new HabitsError(
        "Pemicu kebiasaan tidak valid atau tidak terkait dengan kebiasaan ini.",
        "VALIDATION_ERROR",
        400,
      );
    }
  }

  return repoUpdateCopingPlan(planId, input);
}

export async function deleteCopingPlanService(
  userId: string,
  habitId: string,
  planId: string,
) {
  const habit = await findTrackedHabitById(habitId, userId);
  if (!habit) {
    throw new HabitsError("Kebiasaan tidak ditemukan.", "NOT_FOUND", 404);
  }

  const plan = await findCopingPlanById(planId);
  if (!plan || plan.habitId !== habitId) {
    throw new HabitsError("Rencana jika-maka tidak ditemukan.", "NOT_FOUND", 404);
  }

  return repoDeleteCopingPlan(planId);
}

export async function recordCopingPlanOutcomeService(
  userId: string,
  habitId: string,
  planId: string,
  rawInput: RecordCopingPlanOutcomeInput,
) {
  const parsed = recordCopingPlanOutcomeSchema.safeParse(rawInput);
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

  const plan = await findCopingPlanById(planId);
  if (!plan || plan.habitId !== habitId) {
    throw new HabitsError("Rencana jika-maka tidak ditemukan.", "NOT_FOUND", 404);
  }

  return repoRecordCopingPlanOutcome(planId, parsed.data.helped);
}
