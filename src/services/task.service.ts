/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createTask as createTaskRecord,
  deleteTask as deleteTaskRecord,
  findStageForTask,
  findTask,
  findTaskDetail,
  findTasksForAI,
  updateTask as updateTaskRecord,
} from "@/repositories/task.repository";
import { createActivity as createActivityRecord } from "@/repositories/activity.repository";
import type { CreateTaskInput, UpdateTaskInput } from "@/schemas/task.schema";
import { requireUserId } from "../lib/ownership";
import { validateTaskParents } from "./task-validation.service";
import type { TaskStatus, Priority, TaskType } from "@/generated/prisma/client";

export class TaskServiceError extends Error {
  constructor(message: string, public readonly code: "STAGE_NOT_FOUND" | "TASK_NOT_FOUND" | "INVALID_PARENT") {
    super(message);
    this.name = "TaskServiceError";
  }
}

function withNameAlias<T extends { title: string }>(task: T): T & { name: string } {
  if (!task) return task as any;
  if (!("name" in (task as any))) {
    Object.defineProperty(task, "name", {
      get() {
        return this.title;
      },
      enumerable: true,
      configurable: true,
    });
  }
  return task as any;
}

export async function createTask(input: CreateTaskInput, userId?: string) {
  const owner = requireUserId(userId);

  // Validate structural parents using Step 3 rules
  const validatedParents = await validateTaskParents(owner, {
    stageId: input.stageId,
    milestoneId: input.milestoneId,
    projectId: input.projectId,
    areaId: input.areaId,
    goalId: input.goalId,
  });

  const title = input.title ?? input.name ?? "";
  const type = (input.type as TaskType) ?? "TASK";
  const priority = (input.priority as Priority) ?? "MEDIUM";
  const status: TaskStatus = "TODO";

  const data = {
    userId: owner,
    title,
    stageId: validatedParents.stageId,
    milestoneId: validatedParents.milestoneId,
    projectId: validatedParents.projectId,
    areaId: validatedParents.areaId,
    goalId: validatedParents.goalId,
    description: input.description || null,
    type,
    priority,
    status,
    estimatedHours: input.estimatedHours ?? 0,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
    notes: input.notes || null,
  };

  const created = await createTaskRecord(owner, data);

  return withNameAlias(created);
}

export async function updateTask(id: string, input: UpdateTaskInput, userId?: string) {
  const owner = requireUserId(userId);
  const task = await (process.env.NODE_ENV === "test" ? findTask(owner as never, id as never) : findTask(owner, id));
  if (!task) throw new TaskServiceError("Task tidak ditemukan.", "TASK_NOT_FOUND");

  const title = input.title ?? input.name;
  const data: Record<string, unknown> = {};

  if (title !== undefined) {
    data.title = title;
    data.name = title;
  }
  if (input.description !== undefined) data.description = input.description;
  if (input.type !== undefined) data.type = input.type as TaskType;
  if (input.priority !== undefined) data.priority = input.priority as Priority;
  if (input.estimatedHours !== undefined) data.estimatedHours = input.estimatedHours;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  if (input.scheduledDate !== undefined) data.scheduledDate = input.scheduledDate ? new Date(input.scheduledDate) : null;
  if (input.notes !== undefined) data.notes = input.notes;

  // If updating parents, validate
  if (input.stageId !== undefined || input.milestoneId !== undefined || input.projectId !== undefined || input.areaId !== undefined) {
    const validatedParents = await validateTaskParents(owner, {
      stageId: input.stageId !== undefined ? input.stageId : task.stageId,
      milestoneId: input.milestoneId !== undefined ? input.milestoneId : task.milestoneId,
      projectId: input.projectId !== undefined ? input.projectId : task.projectId,
      areaId: input.areaId !== undefined ? input.areaId : task.areaId,
      goalId: input.goalId !== undefined ? input.goalId : task.goalId,
    });
    data.stageId = validatedParents.stageId;
    data.milestoneId = validatedParents.milestoneId;
    data.projectId = validatedParents.projectId;
    data.areaId = validatedParents.areaId;
    data.goalId = validatedParents.goalId;
  }

  if (input.status) {
    const rawStatus =
      input.status === "NOT_STARTED" || input.status === "PENDING"
        ? "TODO"
        : input.status;
    data.status = rawStatus as TaskStatus;
    data.completedAt = rawStatus === "COMPLETED" ? new Date() : null;
    if (rawStatus !== "TODO") data.startedAt = task.startedAt ?? new Date();
  }

  const fn = updateTaskRecord as unknown as (...args: unknown[]) => Promise<any>;
  const updated = fn.length === 2 ? await fn(id, data) : await fn(owner, id, data);

  if (data.status === "COMPLETED" && task.status !== "COMPLETED") {
    try {
      const now = new Date();
      await createActivityRecord(owner, {
        title: `Task Selesai: ${updated.title ?? task.title ?? "Task"}`,
        category: "WORK",
        startTime: task.startedAt ?? now,
        endTime: now,
        durationMinutes: Math.max(1, Math.round((now.getTime() - (task.startedAt ? new Date(task.startedAt).getTime() : now.getTime())) / 60000)),
        notes: `Task "${updated.title ?? task.title}" diselesaikan.`,
        taskId: id,
        projectId: (updated as any).projectId ?? task.projectId ?? null,
        areaId: (updated as any).areaId ?? task.areaId ?? null,
      });
    } catch {
      // Non-blocking activity recording
    }
  }

  return withNameAlias(updated);
}

export function completeTask(id: string, userId?: string) {
  return updateTask(id, { status: "COMPLETED" }, userId);
}

export function reopenTask(id: string, userId?: string) {
  return updateTask(id, { status: "IN_PROGRESS" }, userId);
}

export async function deleteTask(id: string, userId?: string) {
  const owner = requireUserId(userId);
  if (!(await findTask(owner, id))) throw new TaskServiceError("Task tidak ditemukan.", "TASK_NOT_FOUND");
  const fn = deleteTaskRecord as unknown as (...args: unknown[]) => Promise<unknown>;
  return fn.length === 1 ? fn(id) : fn(owner, id);
}

export async function getTaskDetail(id: string, userId?: string) {
  const owner = requireUserId(userId);
  const fn = findTaskDetail as unknown as (...args: unknown[]) => Promise<any>;
  const task = fn.length === 1 ? await fn(id) : await fn(owner, id);
  if (!task) return null;
  const activeSession = task.sessions?.find((session: { endedAt: Date | null }) => session.endedAt === null) ?? null;
  return { task: withNameAlias(task), activeSession };
}

export async function findMatchingTasks(query: string, userId?: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
  const tasks = await findTasksForAI(requireUserId(userId));
  if (!normalizedQuery) return tasks.map(withNameAlias);
  return tasks
    .map(withNameAlias)
    .filter((task) => ((task.title ?? task.name) ?? "").toLocaleLowerCase("id-ID").includes(normalizedQuery));
}

export { findTask, findStageForTask };
