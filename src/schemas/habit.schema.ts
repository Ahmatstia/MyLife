import { z } from "zod";

export const habitTypeSchema = z.enum(["GOOD", "BAD"]);
export const habitDifficultySchema = z.enum(["EASY", "MEDIUM", "HARD", "EXTREME"]);

// ─── Habit ───────────────────────────────────────────────────────────────────

export const createHabitSchema = z.object({
  title: z.string().trim().min(1, "Nama kebiasaan wajib diisi").max(200),
  description: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().trim().max(2000).optional().nullable(),
  ),
  type: habitTypeSchema.default("GOOD"),
  difficulty: habitDifficultySchema.default("MEDIUM"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#8B5CF6"),
  icon: z.string().trim().max(50).default("zap"),
  areaId: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().trim().min(1).optional().nullable(),
  ),

  // Evaluation & Target
  checkInTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam harus HH:mm").default("06:00"),
  targetDays: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
    z.number().int().min(1).max(3650).optional().nullable(),
  ),

  // BAD habit fields
  triggerNotes: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().trim().max(1000).optional().nullable(),
  ),
  replacementHabit: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().trim().max(500).optional().nullable(),
  ),
  whyQuit: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().trim().max(1000).optional().nullable(),
  ),

  // GOOD habit fields
  cue: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().trim().max(500).optional().nullable(),
  ),
  reward: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().trim().max(500).optional().nullable(),
  ),
});

export const updateHabitSchema = createHabitSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;

// ─── HabitPhase ───────────────────────────────────────────────────────────────

export const createHabitPhaseSchema = z.object({
  title: z.string().trim().min(1, "Judul fase wajib diisi").max(200),
  description: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().trim().max(2000).optional().nullable(),
  ),
  targetDays: z.number().int().min(1, "Target hari minimal 1").max(3650),
  afterRelapseDays: z.number().int().min(0).max(365).optional().nullable(),
  order: z.number().int().min(0).default(0),
  psychTip: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().trim().max(2000).optional().nullable(),
  ),
});

export const updateHabitPhaseSchema = createHabitPhaseSchema.partial().extend({
  isCompleted: z.boolean().optional(),
});

export type CreateHabitPhaseInput = z.infer<typeof createHabitPhaseSchema>;
export type UpdateHabitPhaseInput = z.infer<typeof updateHabitPhaseSchema>;

// ─── HabitLog ─────────────────────────────────────────────────────────────────

export const createHabitLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  isSuccess: z.boolean().default(true),
  mood: z.number().int().min(1).max(5).optional().nullable(),
  energyLevel: z.number().int().min(1).max(5).optional().nullable(),
  notes: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().trim().max(2000).optional().nullable(),
  ),
  relapseTrigger: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().trim().max(500).optional().nullable(),
  ),
});

export type CreateHabitLogInput = z.infer<typeof createHabitLogSchema>;

// ─── HabitTask ────────────────────────────────────────────────────────────────

export const habitTaskCategorySchema = z.enum(["ACTION", "BARRIER", "REPLACEMENT", "PROTOCOL"]);

export const createHabitTaskSchema = z.object({
  title: z.string().trim().min(1, "Judul tugas / aksi wajib diisi").max(200),
  description: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().trim().max(1000).optional().nullable(),
  ),
  category: habitTaskCategorySchema.default("ACTION"),
  isCompleted: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
});

export const updateHabitTaskSchema = createHabitTaskSchema.partial();

export type CreateHabitTaskInput = z.infer<typeof createHabitTaskSchema>;
export type UpdateHabitTaskInput = z.infer<typeof updateHabitTaskSchema>;
