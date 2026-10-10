import { z } from "zod";

export const respondCheckinSchema = z
  .object({
    response: z.enum(["CLEAN", "LAPSED"]).optional(),
    answer: z.enum(["CLEAN", "LAPSED"]).optional(),
    quantity: z.number().positive().optional().nullable(),
    mood: z.number().int().min(1).max(5).optional().nullable(),
    note: z.string().trim().max(1000).optional().nullable(),
  })
  .refine((data) => data.response !== undefined || data.answer !== undefined, {
    message: "Respon check-in harus CLEAN atau LAPSED",
    path: ["response"],
  })
  .transform((data) => ({
    response: (data.response ?? data.answer)!,
    quantity: data.quantity,
    mood: data.mood,
    note: data.note,
  }));

export type RespondCheckinInput = z.input<typeof respondCheckinSchema>;
export type RespondCheckinOutput = z.output<typeof respondCheckinSchema>;

