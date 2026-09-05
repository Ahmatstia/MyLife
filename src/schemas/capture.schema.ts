import { z } from "zod";

export const captureStatusEnum = z.enum(["PENDING", "PROCESSED", "ARCHIVED"]);
export const captureCategoryEnum = z.enum([
  "IDEA",
  "TASK_CANDIDATE",
  "NOTE",
  "REMINDER",
]);

export const createCaptureSchema = z.object({
  content: z.string().trim().min(1, "Catatan tidak boleh kosong").max(5000, "Catatan maksimal 5000 karakter"),
  category: captureCategoryEnum.default("TASK_CANDIDATE"),
});

export const updateCaptureSchema = z.object({
  content: z.string().trim().min(1).max(5000).optional(),
  category: captureCategoryEnum.optional(),
  status: captureStatusEnum.optional(),
});

export const convertToTaskSchema = z.object({
  title: z.string().trim().min(1, "Judul task wajib diisi").max(200).optional(),
  stageId: z.string().trim().cuid().optional().nullable(),
  projectId: z.string().trim().cuid().optional().nullable(),
  milestoneId: z.string().trim().cuid().optional().nullable(),
  areaId: z.string().trim().cuid().optional().nullable(),
  goalId: z.string().trim().cuid().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  estimatedHours: z.number().min(0).default(1.0),
});

export const convertToGoalSchema = z.object({
  title: z.string().trim().min(1, "Judul goal wajib diisi").max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  areaId: z.string().trim().cuid().optional().nullable(),
  type: z.enum(["LEARNING", "ACHIEVEMENT", "HABIT", "MAINTENANCE"]).default("LEARNING"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  targetDate: z.string().datetime({ offset: true }).or(z.string().date()).optional().nullable(),
});

export const convertToProjectSchema = z.object({
  title: z.string().trim().min(1, "Judul project wajib diisi").max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  areaId: z.string().trim().cuid().optional().nullable(),
  goalId: z.string().trim().cuid().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  targetDate: z.string().datetime({ offset: true }).or(z.string().date()).optional().nullable(),
});

export type CreateCaptureInput = z.input<typeof createCaptureSchema>;
export type UpdateCaptureInput = z.input<typeof updateCaptureSchema>;
export type ConvertToTaskInput = z.input<typeof convertToTaskSchema>;
export type ConvertToGoalInput = z.input<typeof convertToGoalSchema>;
export type ConvertToProjectInput = z.input<typeof convertToProjectSchema>;
