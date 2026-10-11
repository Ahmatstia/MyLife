import { z } from "zod";

export const notificationTypeEnum = z.enum([
  "TASK_DUE",
  "DAILY_FOCUS_REMINDER",
  "WEEKLY_REVIEW_REMINDER",
  "CALENDAR_EVENT",
  "MILESTONE_DEADLINE",
  "SYSTEM",
  "HABIT_CHECKIN",
]);

export const notificationSeverityEnum = z.enum(["INFO", "WARNING", "URGENT"]);

export const listNotificationsQuerySchema = z.object({
  isRead: z
    .enum(["true", "false", "all"])
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
  type: notificationTypeEnum.optional(),
  severity: notificationSeverityEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createNotificationSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(1000),
  type: notificationTypeEnum.default("SYSTEM"),
  severity: notificationSeverityEnum.default("INFO"),
  linkUrl: z.string().trim().max(500).optional().nullable(),
  entityType: z.string().trim().max(50).optional().nullable(),
  entityId: z.string().trim().max(100).optional().nullable(),
});

export type NotificationType = z.infer<typeof notificationTypeEnum>;
export type NotificationSeverity = z.infer<typeof notificationSeverityEnum>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
