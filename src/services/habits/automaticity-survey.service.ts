import { SystemClock, type Clock } from "@/lib/habits/clock";
import {
  findTrackedHabitById,
} from "@/repositories/habits/tracked-habit.repository";
import {
  createAutomaticitySurvey,
  findAutomaticitySurveysByHabit,
} from "@/repositories/habits/automaticity-survey.repository";
import {
  createAutomaticitySurveySchema,
  AUTOMATICITY_EDUCATION_TEXT,
  type CreateAutomaticitySurveyInput,
} from "@/schemas/habits/automaticity-survey.schema";
import { HabitsError } from "./habit-v2.service";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export async function getAutomaticitySurveysService(
  userId: string,
  habitId: string,
  clock: Clock = new SystemClock(),
) {
  const habit = await findTrackedHabitById(habitId, userId);
  if (!habit) {
    throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
  }

  if (habit.kind !== "BUILD") {
    throw new HabitsError(
      "Survei otomatisitas hanya tersedia untuk kebiasaan BUILD.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const surveys = await findAutomaticitySurveysByHabit(habitId);
  const now = clock.now();

  const latestSurvey = surveys.length > 0 ? surveys[surveys.length - 1] : null;
  const referenceTime = latestSurvey
    ? latestSurvey.answeredAt.getTime()
    : habit.startedAt.getTime();

  const daysSinceLastSurvey = Math.floor(
    (now.getTime() - referenceTime) / (24 * 60 * 60 * 1000),
  );

  const isPromptDue = now.getTime() - referenceTime >= FOURTEEN_DAYS_MS;

  return {
    habitId,
    surveys,
    latestSurvey,
    daysSinceLastSurvey,
    isPromptDue,
    educationText: AUTOMATICITY_EDUCATION_TEXT,
  };
}

export async function recordAutomaticitySurveyService(
  userId: string,
  habitId: string,
  rawInput: CreateAutomaticitySurveyInput,
  clock: Clock = new SystemClock(),
) {
  const parsed = createAutomaticitySurveySchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new HabitsError(
      parsed.error.issues.map((i) => i.message).join(", "),
      "VALIDATION_ERROR",
      400,
    );
  }

  const habit = await findTrackedHabitById(habitId, userId);
  if (!habit) {
    throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
  }

  if (habit.kind !== "BUILD") {
    throw new HabitsError(
      "Survei otomatisitas hanya dapat dicatat untuk kebiasaan BUILD.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const input = parsed.data;
  const answeredAt = input.answeredAt ?? clock.now();

  return createAutomaticitySurvey(habitId, {
    score: input.score,
    answeredAt,
  });
}

export const submitAutomaticitySurveyService = recordAutomaticitySurveyService;
