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
    goalId: z.string().cuid().optional().nullable(),
    identityStatement: z.string().trim().max(500).optional().nullable(),

    // Profile data untuk kebiasaan BREAK
    whyReasons: z.array(z.string().trim().min(1)).optional().default([]),
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

    // Profile data untuk kebiasaan BREAK mode REDUCE
    reduceDailyLimit: z.number().int().nonnegative().optional().nullable(),
    reduceStepPercent: z.number().int().min(1).max(100).optional().nullable(),
    reduceStepEveryDays: z.number().int().positive().optional().nullable(),

    // Profile data untuk kebiasaan BUILD (Metode ABC - Tiny Habits)
    tinyBehavior: z.string().trim().max(255).optional().nullable(),
    anchorText: z.string().trim().max(255).optional().nullable(),
    celebrationText: z.string().trim().max(255).optional().nullable(),
    versions: z
      .object({
        tiny: z.string().trim().optional(),
        standard: z.string().trim().optional(),
        stretch: z.string().trim().optional(),
      })
      .optional()
      .default({}),
    scheduleType: z.enum(["DAILY", "DAYS_OF_WEEK", "TIMES_PER_WEEK"]).default("DAILY"),
    daysOfWeek: z.array(z.number().int().min(1).max(7)).default([]),
    timesPerWeek: z.number().int().min(1).max(7).optional().nullable(),
    restDays: z.array(z.number().int().min(1).max(7)).default([]),
    replacesHabitId: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "BREAK") {
      if (!data.whyReasons || data.whyReasons.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Minimal sertakan 1 alasan berhenti untuk kebiasaan Break.",
          path: ["whyReasons"],
        });
      }
      if (data.mode === "REDUCE") {
        const hasLimit =
          (data.reduceDailyLimit != null && data.reduceDailyLimit >= 0) ||
          (data.baselinePerDay != null && data.baselinePerDay > 0);
        if (!hasLimit) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Batas harian (reduceDailyLimit atau baselinePerDay) wajib diisi untuk mode Reduce.",
            path: ["reduceDailyLimit"],
          });
        }
      } else if (data.mode === "ABSTAIN" && data.reduceDailyLimit != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Batas harian tidak diperbolehkan untuk mode Abstain.",
          path: ["reduceDailyLimit"],
        });
      }
    } else if (data.kind === "BUILD") {
      if (!data.tinyBehavior || data.tinyBehavior.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Perilaku tiny wajib diisi untuk kebiasaan Build.",
          path: ["tinyBehavior"],
        });
      }
    }
  });

export const updateTrackedHabitSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  displayAlias: z.string().trim().max(100).optional().nullable(),
  category: z.string().trim().max(50).optional().nullable(),
  checkinLocalTime: z.string().regex(TIME_REGEX).optional(),
  timezone: z.string().refine((tz) => IANAZone.isValidZone(tz)).optional(),
  privacyLevel: z.number().int().min(0).max(2).optional(),
  areaId: z.string().cuid().optional().nullable(),
  goalId: z.string().cuid().optional().nullable(),
  identityStatement: z.string().trim().max(500).optional().nullable(),
  reduceDailyLimit: z.number().int().nonnegative().optional().nullable(),
  reduceStepPercent: z.number().int().min(1).max(100).optional().nullable(),
  reduceStepEveryDays: z.number().int().positive().optional().nullable(),
});

export const switchHabitModeSchema = z.object({
  targetMode: z.nativeEnum(HabitMode),
  reduceDailyLimit: z.number().int().nonnegative().optional().nullable(),
  newReduceLimit: z.number().int().nonnegative().optional().nullable(),
  reduceStepPercent: z.number().int().min(1).max(100).optional().nullable(),
  reduceStepEveryDays: z.number().int().positive().optional().nullable(),
}).transform((data) => ({
  ...data,
  reduceDailyLimit: data.reduceDailyLimit ?? data.newReduceLimit ?? null,
})).superRefine((data, ctx) => {
  if (data.targetMode === "REDUCE" && data.reduceDailyLimit == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Batas harian (reduceDailyLimit) wajib diisi saat beralih ke mode REDUCE.",
      path: ["reduceDailyLimit"],
    });
  }
});

export type SwitchHabitModeInput = z.input<typeof switchHabitModeSchema>;

export type CreateTrackedHabitInput = z.input<typeof createTrackedHabitSchema>;
export type UpdateTrackedHabitInput = z.input<typeof updateTrackedHabitSchema>;
