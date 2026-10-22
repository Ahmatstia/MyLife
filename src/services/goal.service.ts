/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createGoal as createGoalRecord,
  deleteGoal as deleteGoalRecord,
  findGoal as findGoalRecord,
  findGoalDetail as findGoalDetailRecord,
  findGoals as findGoalsRecord,
  findGoalsWithStages as findGoalsWithStagesRecord,
  updateGoal as updateGoalRecord,
} from "@/repositories/goal.repository";
import {
  createGoalSchema,
  updateGoalSchema,
  type CreateGoalInput,
  type UpdateGoalInput,
} from "@/schemas/goal.schema";
import { requireUserId } from "../lib/ownership";
import { prisma } from "@/lib/prisma";

export class GoalServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "GOAL_NOT_FOUND" = "GOAL_NOT_FOUND",
  ) {
    super(message);
    this.name = "GoalServiceError";
  }
}

function withGoalNameAlias<T extends { title: string }>(goal: T): T & { name: string } {
  if (!goal) return goal as any;
  if (!("name" in (goal as any))) {
    Object.defineProperty(goal, "name", {
      get() {
        return this.title;
      },
      enumerable: true,
      configurable: true,
    });
  }
  return goal as any;
}

export async function createGoal(input: CreateGoalInput, userId?: string) {
  const owner = requireUserId(userId);
  const parsed = createGoalSchema.parse(input);

  if (parsed.areaId) {
    const area = await prisma.area.findFirst({
      where: { id: parsed.areaId, userId: owner },
    });
    if (!area) {
      throw new GoalServiceError("Area tidak ditemukan atau bukan milik Anda.");
    }
  }

  const title = parsed.title ?? parsed.name ?? "";
  const targetDate = parsed.targetDate ? new Date(parsed.targetDate) : null;
  const result = await createGoalRecord(owner, {
    ...parsed,
    title,
    targetDate,
  });
  return withGoalNameAlias(result);
}

export async function updateGoal(id: string, input: UpdateGoalInput, userId?: string) {
  const owner = requireUserId(userId);
  if (!(await findGoalRecord(owner, id))) throw new GoalServiceError("Goal tidak ditemukan.");
  const validated = updateGoalSchema.parse(input);

  if (validated.areaId) {
    const area = await prisma.area.findFirst({
      where: { id: validated.areaId, userId: owner },
    });
    if (!area) {
      throw new GoalServiceError("Area tidak ditemukan atau bukan milik Anda.");
    }
  }

  const title = validated.title ?? validated.name;
  const targetDate = validated.targetDate
    ? new Date(validated.targetDate)
    : validated.targetDate === null
      ? null
      : undefined;

  return updateGoalRecord(owner, id, {
    ...validated,
    title,
    targetDate,
  });
}

export async function deleteGoal(id: string, userId?: string) {
  const owner = requireUserId(userId);
  if (!(await findGoalRecord(owner, id))) throw new GoalServiceError("Goal tidak ditemukan.");
  return deleteGoalRecord(owner, id);
}

export async function findGoal(userId: string, id: string, includeRelations: boolean = false) {
  const goal = await findGoalRecord(userId, id, includeRelations);
  return goal ? withGoalNameAlias(goal) : null;
}

export async function getGoals(userId?: string) {
  const owner = requireUserId(userId);
  const goals = await findGoalsRecord(owner);
  return goals.map(withGoalNameAlias);
}

export async function getGoalsWithStages(userId?: string) {
  const owner = requireUserId(userId);
  const goals = await findGoalsWithStagesRecord(owner);
  return goals.map(withGoalNameAlias);
}

export async function getGoalDetail(userId: string, id: string) {
  const goal = await findGoalDetailRecord(userId, id);
  return goal ? withGoalNameAlias(goal) : null;
}

export async function getGoalsForHome(userId: string) {
  return prisma.goal.findMany({
    where: { userId },
    include: { area: true, tasks: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}