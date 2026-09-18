import { z } from "zod";

export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const taskStatusSchema = z.enum([
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
  "NOT_STARTED", // Backwards compatibility for legacy tests/clients
  "PENDING",     // Backwards compatibility for pending tasks
]);
export const taskTypeSchema = z.enum(["TASK", "LEARNING", "BUG", "IMPROVEMENT"]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Judul task wajib diisi.").optional(),
  name: z.string().trim().min(1, "Nama task wajib diisi.").optional(),
  stageId: z.string().trim().min(1).optional().nullable(),
  milestoneId: z.string().trim().min(1).optional().nullable(),
  projectId: z.string().trim().min(1).optional().nullable(),
  areaId: z.string().trim().min(1).optional().nullable(),
  goalId: z.string().trim().min(1).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  type: z.string().trim().min(1).default("TASK"),
  priority: taskPrioritySchema.default("MEDIUM"),
  estimatedHours: z.number().finite().min(0).default(0),
  dueDate: z.string().datetime().optional().nullable().or(z.date().optional().nullable()),
  scheduledDate: z.string().datetime().optional().nullable().or(z.date().optional().nullable()),
  notes: z.string().trim().max(5000).optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, "Judul task wajib diisi.").optional(),
  name: z.string().trim().min(1, "Nama task wajib diisi.").optional(),
  stageId: z.string().trim().min(1).optional().nullable(),
  milestoneId: z.string().trim().min(1).optional().nullable(),
  projectId: z.string().trim().min(1).optional().nullable(),
  areaId: z.string().trim().min(1).optional().nullable(),
  goalId: z.string().trim().min(1).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  type: z.string().trim().min(1).optional(),
  priority: taskPrioritySchema.optional(),
  estimatedHours: z.number().finite().min(0).optional(),
  dueDate: z.string().datetime().optional().nullable().or(z.date().optional().nullable()),
  scheduledDate: z.string().datetime().optional().nullable().or(z.date().optional().nullable()),
  notes: z.string().trim().max(5000).optional().nullable(),
  status: taskStatusSchema.optional(),
});

export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;
