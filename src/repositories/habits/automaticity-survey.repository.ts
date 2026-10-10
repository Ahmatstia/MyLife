import { prisma } from "@/lib/prisma";
import type { AutomaticitySurvey } from "@/generated/prisma/client";
import type { DbClient } from "./tracked-habit.repository";

export async function findAutomaticitySurveysByHabit(
  habitId: string,
  client: DbClient = prisma,
): Promise<AutomaticitySurvey[]> {
  return client.automaticitySurvey.findMany({
    where: { habitId },
    orderBy: { answeredAt: "asc" },
  });
}

export async function findLatestAutomaticitySurvey(
  habitId: string,
  client: DbClient = prisma,
): Promise<AutomaticitySurvey | null> {
  return client.automaticitySurvey.findFirst({
    where: { habitId },
    orderBy: { answeredAt: "desc" },
  });
}

export async function createAutomaticitySurvey(
  habitId: string,
  data: { score: number; answeredAt?: Date },
  client: DbClient = prisma,
): Promise<AutomaticitySurvey> {
  return client.automaticitySurvey.create({
    data: {
      habitId,
      score: data.score,
      answeredAt: data.answeredAt ?? new Date(),
    },
  });
}
