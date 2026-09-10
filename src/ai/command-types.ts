import type { Intent, ConfidenceLevel, Entity } from "./intents";

export type AICommandResponse = {
  success: boolean;
  code: string;
  message: string;
  interpretation: {
    input: string;
    normalizedText: string;
    intent: Intent;
    confidence: number;
    confidenceLevel: ConfidenceLevel;
    entities: Entity[];
    source: "rule" | "baseline" | "enhanced" | "v2-classifier" | "future-llm" | "gemini-llm";
  };
  data?: unknown;
  requiresConfirmation?: boolean;
  confirmationToken?: string;
  plan?: Array<{
    step: number;
    tool: string;
    description: string;
    arguments: Record<string, unknown>;
    status?: "pending" | "executed" | "failed" | "skipped";
    result?: unknown;
  }>;
  ambiguityCandidates?: Array<{
    id: string;
    name: string;
    type: string;
    parentName?: string;
  }>;
};

export type AIPanelState =
  | "idle"
  | "loading"
  | "success"
  | "confirmation_required"
  | "ambiguous"
  | "not_found"
  | "low_confidence"
  | "unknown"
  | "error";

export type AIHistoryEntry = {
  id: string;
  input: string;
  state: AIPanelState;
  response: AICommandResponse | null;
  timestamp: Date;
};

export const CONFIRMATION_INTENTS = new Set<Intent>([
  "GOAL_CREATE",
  "GOAL_DELETE",
  "GOAL_UPDATE",
  "STAGE_CREATE",
  "STAGE_DELETE",
  "STAGE_UPDATE",
  "STAGE_REORDER",
  "TASK_CREATE",
  "TASK_COMPLETE",
  "TASK_REOPEN",
  "TASK_DELETE",
  "TASK_UPDATE",
  "TASK_BULK_DELETE",
  "TASK_BULK_COMPLETE",
  "TASK_REORDER",
  "SESSION_START",
  "SESSION_END",
  "FOCUS",
  "MULTI_STEP",
]);

export function resolvePanelState(response: AICommandResponse): AIPanelState {
  if (!response.success) {
    if (response.code === "SAFE_FALLBACK") return "low_confidence";
    if (response.code === "AMBIGUOUS_TASK" || response.code === "AMBIGUOUS_ENTITY") return "ambiguous";
    if (
      response.code === "TASK_NOT_FOUND" ||
      response.code === "GOAL_NOT_FOUND" ||
      response.code === "STAGE_NOT_FOUND" ||
      response.code === "MISSING_GOAL_NAME" ||
      response.code === "MISSING_TASK_CONTEXT" ||
      response.code === "MISSING_STAGE_CONTEXT"
    )
      return "not_found";
    if (response.code === "NO_ACTIVE_SESSION") return "not_found";
    if (response.code === "UNSUPPORTED_INTENT") return "unknown";
    if (response.code === "CONFIRMATION_REQUIRED") return "confirmation_required";
    return "error";
  }

  if (response.requiresConfirmation || CONFIRMATION_INTENTS.has(response.interpretation.intent)) {
    if (response.code === "CONFIRMATION_REQUIRED") return "confirmation_required";
  }

  if (response.interpretation.intent === "UNKNOWN") return "unknown";
  if (response.interpretation.confidenceLevel === "LOW") return "low_confidence";

  return "success";
}

export function panelStateToMessage(state: AIPanelState): string {
  switch (state) {
    case "idle":
      return "";
    case "loading":
      return "Memproses...";
    case "success":
      return "";
    case "confirmation_required":
      return "Perintah ini membutuhkan konfirmasi.";
    case "ambiguous":
      return "Ditemukan beberapa pilihan. Pilih satu target:";
    case "not_found":
      return "Data yang kamu minta tidak ditemukan.";
    case "low_confidence":
      return "Saya belum cukup yakin dengan maksudmu.";
    case "unknown":
      return "Saya belum cukup yakin dengan maksudmu.";
    case "error":
      return "Terjadi kesalahan. Coba lagi.";
  }
}

export function intentToReadable(intent: Intent): string {
  const map: Record<Intent, string> = {
    TODAY: "Lihat hari ini",
    NEXT_ACTION: "Aksi berikutnya",
    GOAL_STATUS: "Status goal",
    GOAL_GET: "Detail goal",
    GOAL_CREATE: "Buat goal baru",
    GOAL_UPDATE: "Perbarui goal",
    GOAL_DELETE: "Hapus goal",
    STAGE_CREATE: "Buat stage baru",
    STAGE_UPDATE: "Perbarui stage",
    STAGE_DELETE: "Hapus stage",
    STAGE_REORDER: "Ubah urutan stage",
    STAGE_STATUS: "Status stage",
    TASK_STATUS: "Status task",
    TASK_SEARCH: "Cari task",
    TASK_CREATE: "Buat task baru",
    TASK_UPDATE: "Perbarui task",
    TASK_DELETE: "Hapus task",
    TASK_COMPLETE: "Selesaikan task",
    TASK_REOPEN: "Buka kembali task",
    TASK_BULK_DELETE: "Hapus beberapa task",
    TASK_BULK_COMPLETE: "Selesaikan beberapa task",
    TASK_REORDER: "Ubah urutan task",
    PROGRESS: "Lihat progress",
    ANALYTICS: "Lihat analytics",
    STREAK: "Lihat streak",
    TIME_SPENT: "Waktu belajar",
    COMPLETION: "Tingkat penyelesaian",
    BOTTLENECK: "Hambatan",
    REVIEW: "Review mingguan",
    REFLECTION: "Refleksi",
    SESSION_START: "Mulai sesi",
    SESSION_END: "Akhiri sesi",
    FOCUS: "Fokus hari ini",
    OVERDUE: "Task overdue",
    MULTI_STEP: "Rencana multi-langkah",
    MOTIVATION: "Motivasi",
    HELP: "Bantuan",
    UNKNOWN: "Tidak diketahui",
  };
  return map[intent] ?? intent;
}

export const EXAMPLE_COMMANDS = [
  "apa yang harus saya kerjakan hari ini?",
  "buat goal belajar Python",
  "buat stage dasar di goal Python",
  "buat task belajar function di stage dasar",
  "selesaikan task belajar function",
  "hapus task latihan function",
  "hapus semua task yang selesai di goal Python",
  "berapa progress goal saya?",
  "mulai sesi fokus",
  "bantuan",
] as const;
