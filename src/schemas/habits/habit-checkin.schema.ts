import { z } from "zod";

export const respondCheckinSchema = z
  .object({
    response: z
      .enum(["CLEAN", "LAPSED", "WITHIN_LIMIT", "OVER_LIMIT", "DONE", "SKIPPED"])
      .optional(),
    answer: z
      .enum(["CLEAN", "LAPSED", "WITHIN_LIMIT", "OVER_LIMIT", "DONE", "SKIPPED"])
      .optional(),
    quantity: z.number().nonnegative().optional().nullable(),
    mood: z.number().int().min(1).max(5).optional().nullable(),
    note: z.string().trim().max(1000).optional().nullable(),
  })
  .refine(
    (data) =>
      data.response !== undefined ||
      data.answer !== undefined ||
      data.quantity !== undefined,
    {
      message: "Respon check-in wajib diisi (status atau kuantitas kejadian)",
      path: ["response"],
    },
  )
  .transform((data) => ({
    response: data.response ?? data.answer,
    quantity: data.quantity,
    mood: data.mood,
    note: data.note,
  }));

export type RespondCheckinInput = z.input<typeof respondCheckinSchema>;
export type RespondCheckinOutput = z.output<typeof respondCheckinSchema>;

