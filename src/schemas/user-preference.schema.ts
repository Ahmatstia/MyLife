import { z } from "zod";

export const themeEnum = z.enum(["LIGHT", "DARK", "SYSTEM"]);

export const updateUserPreferenceSchema = z.object({
  theme: themeEnum.optional(),
  weekStartDay: z.number().int().min(0, "Hari mulai minggu antara 0 (Minggu) dan 6 (Sabtu)").max(6).optional(),
  dailyFocusLimit: z.number().int().min(1, "Batas fokus minimal 1").max(20, "Batas fokus maksimal 20").optional(),
  enableNotifications: z.boolean().optional(),
  enableAiAssistance: z.boolean().optional(),
  timezone: z.string().trim().min(1).optional(),
  defaultReminderMinutes: z.number().int().min(1, "Minimal 1 menit").max(120, "Maksimal 120 menit").optional(),
});

export type UpdateUserPreferenceInput = z.infer<typeof updateUserPreferenceSchema>;

