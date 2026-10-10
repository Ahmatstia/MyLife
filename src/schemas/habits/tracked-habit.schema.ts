import { z } from "zod";
import { IANAZone } from "luxon";
import { HabitKind, HabitMode } from "../../generated/prisma/client";

// Regex jam format HH:mm (00:00 s.d. 23:59)
const TIME_REGEX = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export const createTrackedHabitSchema = z.object({
  name: z.string().trim().min(1, "Nama kebiasaan wajib diisi").max(100, "Nama kebiasaan maksimal 100 karakter"),
  displayAlias: z.string().trim().max(100).optional().nullable(),
  category: z.string().trim().max(50).optional().nullable(),
  kind: z.nativeEnum(HabitKind, {
    error: () => ({ message: "Tipe kebiasaan wajib ditentukan (BREAK atau BUILD)" }),
  }),
  mode: z.nativeEnum(HabitMode).optional().nullable(),
  timezone: z.string().refine((tz) => IANAZone.isValidZone(tz), {
    message: "Zona waktu harus berupa zona waktu IANA yang valid (mis. Asia/Jakarta)",
  }),
  checkinLocalTime: z.string().regex(TIME_REGEX, {
    message: "Jam check-in harus berformat HH:mm (contoh: 20:00)",
  }),
  startedAt: z
    .union([z.string().datetime(), z.date()])
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  privacyLevel: z.number().int().min(0).max(2).default(1),
  areaId: z.string().cuid().optional().nullable(),

  // Profile data untuk kebiasaan BREAK
  whyReasons: z.array(z.string().trim().min(1)).min(1, "Minimal sertakan 1 alasan berhenti"),
  futureSelfNote: z.string().trim().max(1000).optional().nullable(),
  baselinePerDay: z.number().positive().optional().nullable(),
  costPerOccurrence: z.number().nonnegative().optional().nullable(),
  currency: z.string().trim().default("IDR"),
  minutesPerOccurrence: z.number().int().positive().optional().nullable(),
  relapseLapseCount: z.number().int().positive().default(3),
  relapseWindowDays: z.number().int().positive().default(7),
  highRiskCategory: z.boolean().default(false),
  safetyAck: z.boolean().optional(),
  safetyAckAt: z
    .union([z.string().datetime(), z.date()])
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  environmentChecklist: z.array(z.string()).default([]),
});

export const updateTrackedHabitSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  displayAlias: z.string().trim().max(100).optional().nullable(),
  category: z.string().trim().max(50).optional().nullable(),
  checkinLocalTime: z.string().regex(TIME_REGEX).optional(),
  timezone: z.string().refine((tz) => IANAZone.isValidZone(tz)).optional(),
  privacyLevel: z.number().int().min(0).max(2).optional(),
  areaId: z.string().cuid().optional().nullable(),
  identityStatement: z.string().trim().max(500).optional().nullable(),
});

export type CreateTrackedHabitInput = z.input<typeof createTrackedHabitSchema>;
export type UpdateTrackedHabitInput = z.input<typeof updateTrackedHabitSchema>;
