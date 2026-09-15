import { z } from "zod";

export const eventTypeEnum = z.enum(["PERSONAL", "WORK", "BLOCKED", "REMINDER", "TASK_DEADLINE"]);
export const recurrenceTypeEnum = z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]);

export const createCalendarEventSchema = z
  .object({
    title: z.string().trim().min(1, "Judul event wajib diisi").max(200, "Judul event maksimal 200 karakter"),
    description: z.string().trim().max(2000, "Deskripsi maksimal 2000 karakter").optional().nullable(),
    startTime: z.string().datetime({ offset: true }),
    endTime: z.string().datetime({ offset: true }).optional().nullable(),
    isAllDay: z.boolean().default(false),
    eventType: eventTypeEnum.default("PERSONAL"),
    recurrence: recurrenceTypeEnum.default("NONE"),
    location: z.string().trim().max(255).optional().nullable(),
    taskId: z.string().trim().cuid().optional().nullable(),
    projectId: z.string().trim().cuid().optional().nullable(),
    reminderMinutes: z.number().int().min(1).max(120).optional().nullable(),
    ignoreQuietHours: z.boolean().default(false),
    isCompleted: z.boolean().default(false),
    completedAt: z.string().datetime({ offset: true }).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        const start = new Date(data.startTime).getTime();
        const end = new Date(data.endTime).getTime();
        return end >= start;
      }
      return true;
    },
    {
      message: "Waktu selesai (endTime) tidak boleh mendahului waktu mulai (startTime)",
      path: ["endTime"],
    }
  );

export const updateCalendarEventSchema = z
  .object({
    title: z.string().trim().min(1, "Judul event wajib diisi").max(200).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    startTime: z.string().datetime({ offset: true }).optional(),
    endTime: z.string().datetime({ offset: true }).optional().nullable(),
    isAllDay: z.boolean().optional(),
    eventType: eventTypeEnum.optional(),
    recurrence: recurrenceTypeEnum.optional(),
    location: z.string().trim().max(255).optional().nullable(),
    taskId: z.string().trim().cuid().optional().nullable(),
    projectId: z.string().trim().cuid().optional().nullable(),
    reminderMinutes: z.number().int().min(1).max(120).optional().nullable(),
    ignoreQuietHours: z.boolean().optional(),
    isCompleted: z.boolean().optional(),
    completedAt: z.string().datetime({ offset: true }).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return new Date(data.endTime).getTime() >= new Date(data.startTime).getTime();
      }
      return true;
    },
    {
      message: "Waktu selesai (endTime) tidak boleh mendahului waktu mulai (startTime)",
      path: ["endTime"],
    }
  );

export type CreateCalendarEventInput = z.input<typeof createCalendarEventSchema>;
export type UpdateCalendarEventInput = z.input<typeof updateCalendarEventSchema>;
