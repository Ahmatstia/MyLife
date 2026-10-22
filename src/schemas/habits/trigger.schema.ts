import { z } from "zod";
import { TriggerCategory } from "../../generated/prisma/client";

export const triggerCategorySchema = z.nativeEnum(TriggerCategory, {
  error: () => ({ message: "Kategori pemicu tidak valid." }),
});

export const createCustomTriggerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama pemicu wajib diisi.")
    .max(100, "Nama pemicu maksimal 100 karakter."),
  category: triggerCategorySchema,
  description: z.string().trim().max(500, "Deskripsi maksimal 500 karakter.").optional().nullable(),
});

export const attachHabitTriggerSchema = z
  .object({
    triggerId: z.string().trim().min(1).optional(),
    custom: createCustomTriggerSchema.optional(),
    intensity: z
      .number()
      .int("Tingkat intensitas harus berupa bilangan bulat.")
      .min(1, "Intensitas minimal 1.")
      .max(5, "Intensitas maksimal 5.")
      .default(3),
    note: z.string().trim().max(500, "Catatan maksimal 500 karakter.").optional().nullable(),
  })
  .refine((data) => Boolean(data.triggerId || data.custom), {
    message: "Harus menyertakan triggerId atau data pemicu kustom baru.",
  });

export const updateHabitTriggerSchema = z.object({
  intensity: z
    .number()
    .int("Tingkat intensitas harus berupa bilangan bulat.")
    .min(1, "Intensitas minimal 1.")
    .max(5, "Intensitas maksimal 5.")
    .optional(),
  note: z.string().trim().max(500, "Catatan maksimal 500 karakter.").optional().nullable(),
});

export type CreateCustomTriggerInput = z.input<typeof createCustomTriggerSchema>;
export type AttachHabitTriggerInput = z.input<typeof attachHabitTriggerSchema>;
export type UpdateHabitTriggerInput = z.input<typeof updateHabitTriggerSchema>;
