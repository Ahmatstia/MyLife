import { z } from "zod";

export const createCopingPlanSchema = z.object({
  habitTriggerId: z.string().trim().min(1).optional().nullable(),
  ifCondition: z
    .string()
    .trim()
    .min(1, "Kondisi 'Jika' wajib diisi.")
    .max(300, "Kondisi 'Jika' maksimal 300 karakter."),
  thenAction: z
    .string()
    .trim()
    .min(1, "Aksi 'Maka' wajib diisi.")
    .max(300, "Aksi 'Maka' maksimal 300 karakter."),
  replacementHabitId: z.string().trim().min(1).optional().nullable(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateCopingPlanSchema = z.object({
  habitTriggerId: z.string().trim().min(1).optional().nullable(),
  ifCondition: z
    .string()
    .trim()
    .min(1, "Kondisi 'Jika' wajib diisi.")
    .max(300, "Kondisi 'Jika' maksimal 300 karakter.")
    .optional(),
  thenAction: z
    .string()
    .trim()
    .min(1, "Aksi 'Maka' wajib diisi.")
    .max(300, "Aksi 'Maka' maksimal 300 karakter.")
    .optional(),
  replacementHabitId: z.string().cuid().optional().nullable(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const recordCopingPlanOutcomeSchema = z.object({
  helped: z.boolean({
    error: () => ({ message: "Nilai helped wajib berupa boolean (true/false)." }),
  }),
});

export type CreateCopingPlanInput = z.input<typeof createCopingPlanSchema>;
export type UpdateCopingPlanInput = z.input<typeof updateCopingPlanSchema>;
export type RecordCopingPlanOutcomeInput = z.input<typeof recordCopingPlanOutcomeSchema>;
