import { z } from "zod";

export const respondCheckinSchema = z.object({
  response: z.enum(["CLEAN", "LAPSED"], {
    error: () => ({ message: "Respon check-in harus CLEAN atau LAPSED" }),
  }),
  quantity: z.number().positive().optional().nullable(),
  mood: z.number().int().min(1).max(5).optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
});

export type RespondCheckinInput = z.infer<typeof respondCheckinSchema>;
