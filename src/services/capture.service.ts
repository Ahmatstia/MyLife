import {
  createCapture as createCaptureRecord,
  deleteCapture as deleteCaptureRecord,
  findCapture as findCaptureRecord,
  findCaptures as findCapturesRecord,
  updateCapture as updateCaptureRecord,
} from "@/repositories/capture.repository";
import { createTask } from "@/services/task.service";
import { createGoal } from "@/services/goal.service";
import { createProject } from "@/services/project.service";
import { requireUserId } from "@/lib/ownership";
import {
  createCaptureSchema,
  updateCaptureSchema,
  convertToTaskSchema,
  convertToGoalSchema,
  convertToProjectSchema,
  type CreateCaptureInput,
  type UpdateCaptureInput,
  type ConvertToTaskInput,
  type ConvertToGoalInput,
  type ConvertToProjectInput,
} from "@/schemas/capture.schema";
import type { CaptureCategory, CaptureStatus } from "@/generated/prisma/client";

export class CaptureServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "CAPTURE_NOT_FOUND"
      | "ALREADY_PROCESSED"
      | "INVALID_INPUT" = "CAPTURE_NOT_FOUND"
  ) {
    super(message);
    this.name = "CaptureServiceError";
  }
}

// Backward-compatible signature
export async function saveCapture(content: string, userId?: string, category?: CaptureCategory) {
  const owner = requireUserId(userId);
  return createCaptureRecord(owner, {
    content: content.trim(),
    category: category ?? "TASK_CANDIDATE",
  });
}

// Backward-compatible signature
export async function getRecentCaptures(userId?: string, limit = 10) {
  const owner = requireUserId(userId);
  return findCapturesRecord(owner, { limit: Math.max(1, Math.min(limit, 50)) });
}

// Backward-compatible signature
export async function deleteCapture(id: string, userId?: string) {
  const owner = requireUserId(userId);
  const existing = await findCaptureRecord(owner, id);
  if (!existing) {
    throw new CaptureServiceError("Capture tidak ditemukan.", "CAPTURE_NOT_FOUND");
  }
  return deleteCaptureRecord(owner, id);
}

export async function createCapture(input: CreateCaptureInput, userId?: string) {
  const owner = requireUserId(userId);
  const parsed = createCaptureSchema.parse(input);
  return createCaptureRecord(owner, {
    content: parsed.content,
    category: parsed.category,
  });
}

export async function getCaptures(
  filter?: { status?: CaptureStatus; category?: CaptureCategory; limit?: number },
  userId?: string
) {
  const owner = requireUserId(userId);
  return findCapturesRecord(owner, filter);
}

export async function getCapture(id: string, userId?: string) {
  const owner = requireUserId(userId);
  const capture = await findCaptureRecord(owner, id);
  if (!capture) {
    throw new CaptureServiceError("Capture tidak ditemukan.", "CAPTURE_NOT_FOUND");
  }
  return capture;
}

export async function updateCapture(id: string, input: UpdateCaptureInput, userId?: string) {
  const owner = requireUserId(userId);
  const existing = await findCaptureRecord(owner, id);
  if (!existing) {
    throw new CaptureServiceError("Capture tidak ditemukan.", "CAPTURE_NOT_FOUND");
  }
  const parsed = updateCaptureSchema.parse(input);
  return updateCaptureRecord(owner, id, parsed);
}

export async function archiveCapture(id: string, userId?: string) {
  const owner = requireUserId(userId);
  const existing = await findCaptureRecord(owner, id);
  if (!existing) {
    throw new CaptureServiceError("Capture tidak ditemukan.", "CAPTURE_NOT_FOUND");
  }
  return updateCaptureRecord(owner, id, { status: "ARCHIVED" });
}

export async function convertToTask(id: string, input: ConvertToTaskInput, userId?: string) {
  const owner = requireUserId(userId);
  const capture = await findCaptureRecord(owner, id);
  if (!capture) {
    throw new CaptureServiceError("Capture tidak ditemukan.", "CAPTURE_NOT_FOUND");
  }
  if (capture.status === "PROCESSED") {
    throw new CaptureServiceError("Catatan ini sudah pernah dikonversi.", "ALREADY_PROCESSED");
  }

  const parsed = convertToTaskSchema.parse(input);
  const title = parsed.title || capture.content.slice(0, 150);

  const task = await createTask(
    {
      title,
      stageId: parsed.stageId ?? undefined,
      projectId: parsed.projectId ?? undefined,
      milestoneId: parsed.milestoneId ?? undefined,
      areaId: parsed.areaId ?? undefined,
      goalId: parsed.goalId ?? undefined,
      priority: parsed.priority,
      estimatedHours: parsed.estimatedHours,
      notes: capture.content !== title ? capture.content : undefined,
    },
    owner
  );

  const updatedCapture = await updateCaptureRecord(owner, id, {
    status: "PROCESSED",
    convertedTaskId: task.id,
    processedAt: new Date(),
  });

  return { capture: updatedCapture, task };
}

export async function convertToGoal(id: string, input: ConvertToGoalInput, userId?: string) {
  const owner = requireUserId(userId);
  const capture = await findCaptureRecord(owner, id);
  if (!capture) {
    throw new CaptureServiceError("Capture tidak ditemukan.", "CAPTURE_NOT_FOUND");
  }
  if (capture.status === "PROCESSED") {
    throw new CaptureServiceError("Catatan ini sudah pernah dikonversi.", "ALREADY_PROCESSED");
  }

  const parsed = convertToGoalSchema.parse(input);
  const title = parsed.title || capture.content.slice(0, 150);

  const goal = await createGoal(
    {
      title,
      description: parsed.description ?? (capture.content !== title ? capture.content : undefined),
      areaId: parsed.areaId ?? undefined,
      type: parsed.type,
      priority: parsed.priority,
      targetDate: parsed.targetDate ?? undefined,
    },
    owner
  );

  const updatedCapture = await updateCaptureRecord(owner, id, {
    status: "PROCESSED",
    convertedGoalId: goal.id,
    processedAt: new Date(),
  });

  return { capture: updatedCapture, goal };
}

export async function convertToProject(id: string, input: ConvertToProjectInput, userId?: string) {
  const owner = requireUserId(userId);
  const capture = await findCaptureRecord(owner, id);
  if (!capture) {
    throw new CaptureServiceError("Capture tidak ditemukan.", "CAPTURE_NOT_FOUND");
  }
  if (capture.status === "PROCESSED") {
    throw new CaptureServiceError("Catatan ini sudah pernah dikonversi.", "ALREADY_PROCESSED");
  }

  const parsed = convertToProjectSchema.parse(input);
  const title = parsed.title || capture.content.slice(0, 150);

  const project = await createProject(
    {
      title,
      description: parsed.description ?? (capture.content !== title ? capture.content : undefined),
      areaId: parsed.areaId ?? undefined,
      goalId: parsed.goalId ?? undefined,
      priority: parsed.priority,
      targetDate: parsed.targetDate ?? undefined,
    },
    owner
  );

  const updatedCapture = await updateCaptureRecord(owner, id, {
    status: "PROCESSED",
    processedAt: new Date(),
  });

  return { capture: updatedCapture, project };
}