import { prisma } from "@/lib/prisma";
import type { Theme } from "@/generated/prisma/client";

export function findUserPreference(userId: string) {
  return prisma.userPreference.findUnique({
    where: { userId },
  });
}

export function upsertUserPreference(
  userId: string,
  data: {
    theme?: Theme;
    weekStartDay?: number;
    dailyFocusLimit?: number;
    enableNotifications?: boolean;
    enableAiAssistance?: boolean;
    timezone?: string;
    defaultReminderMinutes?: number;
  }
) {
  return prisma.userPreference.upsert({
    where: { userId },
    create: {
      userId,
      theme: data.theme ?? "SYSTEM",
      weekStartDay: data.weekStartDay ?? 1,
      dailyFocusLimit: data.dailyFocusLimit ?? 5,
      enableNotifications: data.enableNotifications ?? true,
      enableAiAssistance: data.enableAiAssistance ?? true,
      timezone: data.timezone ?? "Asia/Jakarta",
      defaultReminderMinutes: data.defaultReminderMinutes ?? 15,
    },
    update: {
      ...(data.theme !== undefined && { theme: data.theme }),
      ...(data.weekStartDay !== undefined && { weekStartDay: data.weekStartDay }),
      ...(data.dailyFocusLimit !== undefined && { dailyFocusLimit: data.dailyFocusLimit }),
      ...(data.enableNotifications !== undefined && { enableNotifications: data.enableNotifications }),
      ...(data.enableAiAssistance !== undefined && { enableAiAssistance: data.enableAiAssistance }),
      ...(data.timezone !== undefined && { timezone: data.timezone }),
      ...(data.defaultReminderMinutes !== undefined && { defaultReminderMinutes: data.defaultReminderMinutes }),
    },
  });
}
