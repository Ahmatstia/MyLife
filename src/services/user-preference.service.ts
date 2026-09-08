import {
  findUserPreference as findUserPreferenceRecord,
  upsertUserPreference as upsertUserPreferenceRecord,
} from "@/repositories/user-preference.repository";
import {
  updateUserPreferenceSchema,
  type UpdateUserPreferenceInput,
} from "@/schemas/user-preference.schema";
import { requireUserId } from "@/lib/ownership";
import type { Theme } from "@/generated/prisma/client";

export class UserPreferenceServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "PREFERENCE_NOT_FOUND" | "INVALID_INPUT" = "INVALID_INPUT"
  ) {
    super(message);
    this.name = "UserPreferenceServiceError";
  }
}

export async function getUserPreference(userId?: string) {
  const owner = requireUserId(userId);
  let pref = await findUserPreferenceRecord(owner);
  if (!pref) {
    // Lazy initialize default user preference
    try {
      pref = await upsertUserPreferenceRecord(owner, {});
    } catch {
      pref = await findUserPreferenceRecord(owner);
    }
  }
  if (!pref) {
    return {
      id: "default",
      userId: owner,
      theme: "SYSTEM" as Theme,
      weekStartDay: 1,
      dailyFocusLimit: 5,
      enableNotifications: true,
      enableAiAssistance: true,
      timezone: "Asia/Jakarta",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  return pref;
}

export async function updateUserPreference(input: UpdateUserPreferenceInput, userId?: string) {
  const owner = requireUserId(userId);
  const parsed = updateUserPreferenceSchema.parse(input);

  return upsertUserPreferenceRecord(owner, {
    ...(parsed.theme !== undefined && { theme: parsed.theme as Theme }),
    ...(parsed.weekStartDay !== undefined && { weekStartDay: parsed.weekStartDay }),
    ...(parsed.dailyFocusLimit !== undefined && { dailyFocusLimit: parsed.dailyFocusLimit }),
    ...(parsed.enableNotifications !== undefined && { enableNotifications: parsed.enableNotifications }),
    ...(parsed.enableAiAssistance !== undefined && { enableAiAssistance: parsed.enableAiAssistance }),
    ...(parsed.timezone !== undefined && { timezone: parsed.timezone }),
  });
}
