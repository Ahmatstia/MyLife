import { z } from "zod";

export const resetPlanSchema = z.object({
  whyReasons: z.array(z.string().trim().min(1)).optional(),
  futureSelfNote: z.string().trim().max(1000).optional().nullable(),
  newCopingPlan: z
    .object({
      ifCondition: z.string().trim().min(3, "Kondisi 'Jika' minimal 3 karakter"),
      thenAction: z.string().trim().min(3, "Aksi 'Maka' minimal 3 karakter"),
      habitTriggerId: z.string().trim().optional().nullable(),
    })
    .optional(),
  reduceTargetIdea: z.string().trim().max(500).optional(),
});

export type ResetPlanInput = z.infer<typeof resetPlanSchema>;
