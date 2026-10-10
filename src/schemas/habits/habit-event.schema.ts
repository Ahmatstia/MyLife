import { z } from "zod";
import { HabitEventType } from "../../generated/prisma/client";

export const logHabitEventSchema = z.object({
  type: z.nativeEnum(HabitEventType, {
    error: () => ({ message: "Tipe event tidak valid" }),
  }),
  occurredAt: z
    .union([z.string().datetime(), z.date()])
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  quantity: z.number().positive("Kuantitas harus lebih dari 0").default(1),
  intensityBefore: z.number().int().min(0).max(10).optional().nullable(),
  intensityAfter: z.number().int().min(0).max(10).optional().nullable(),
  outcome: z.enum(["RESISTED", "GAVE_IN"]).optional().nullable(),
  severity: z.enum(["SLIP", "RELAPSE"]).optional().nullable(),
  mood: z.number().int().min(1).max(5).optional().nullable(),
  halt: z.array(z.string()).default([]),
  locationLabel: z.string().trim().max(100).optional().nullable(),
  withWhom: z.string().trim().max(100).optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
  meta: z.record(z.string(), z.unknown()).default({}),
  source: z.string().trim().default("APP"),
});

export type LogHabitEventInput = z.input<typeof logHabitEventSchema>;
