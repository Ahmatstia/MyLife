import { z } from "zod";

export const AUTOMATICITY_EDUCATION_TEXT =
  "Rata-rata kebiasaan baru terbentuk dalam ±66 hari dengan rentang lebar 18–254 hari bergantung pada kompleksitas kebiasaan (Lally et al., 2010), bukan mitos 21 hari. Konsistensi harian lebih penting daripada kesempurnaan.";

export const createAutomaticitySurveySchema = z.object({
  score: z
    .number({
      error: () => ({ message: "Skor otomatisitas wajib diisi (angka 1 s.d. 7)" }),
    })
    .int("Skor harus berupa bilangan bulat")
    .min(1, "Skor minimal 1 (sangat butuh usaha sadar)")
    .max(7, "Skor maksimal 7 (sangat otomatis / refleks)"),
  answeredAt: z
    .union([z.string().datetime(), z.date()])
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

export type CreateAutomaticitySurveyInput = z.input<typeof createAutomaticitySurveySchema>;
