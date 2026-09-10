import type { Intent, IntentResult } from "../intents";
import { normalizeText } from "../normalization";
import type { IntentClassifier } from "../types";
import { extractEntitiesV2 } from "./entity-extractor";

type PhraseConfig = {
  intent: Intent;
  phrases: string[];
  weight?: number;
};

const intentPhraseConfigs: PhraseConfig[] = [
  // ── Multi-step / Multi-action ───────────────────────────
  {
    intent: "MULTI_STEP",
    phrases: ["lalu buat", "kemudian buat", "setelah itu buat", "lalu tambahkan", "kemudian buatkan", "lalu buatkan"],
    weight: 2.5,
  },

  // ── Bulk operations ─────────────────────────────────────
  {
    intent: "TASK_BULK_DELETE",
    phrases: [
      "hapus semua task",
      "hapus seluruh task",
      "buang semua task",
      "hapus task yang selesai",
      "hapus semua yang selesai",
      "delete all task",
    ],
    weight: 2.0,
  },
  {
    intent: "TASK_BULK_COMPLETE",
    phrases: [
      "selesaikan semua task",
      "selesaikan seluruh task",
      "tandai semua selesai",
      "centang semua task",
      "complete all task",
    ],
    weight: 2.0,
  },

  // ── Goal CRUD ───────────────────────────────────────────
  {
    intent: "GOAL_DELETE",
    phrases: ["hapus goal", "delete goal", "buang goal", "hilangkan goal", "batal goal"],
    weight: 1.5,
  },
  {
    intent: "GOAL_UPDATE",
    phrases: ["ubah goal", "edit goal", "ganti nama goal", "update goal", "perbarui goal"],
    weight: 1.2,
  },
  {
    intent: "GOAL_CREATE",
    phrases: [
      "buat goal",
      "buatkan goal",
      "bikin goal",
      "bikinin goal",
      "tambah goal",
      "tambahkan goal",
      "goal baru",
      "membuat target",
      "membuat goal",
      "mau bikin goal",
      "tolong buatkan goal",
      "buat target baru",
    ],
    weight: 1.2,
  },
  {
    intent: "GOAL_STATUS",
    phrases: ["status goal", "status tujuan", "progres goal", "kondisi goal", "bagaimana goal", "lihat goal"],
    weight: 1.0,
  },

  // ── Stage CRUD ──────────────────────────────────────────
  {
    intent: "STAGE_STATUS",
    phrases: ["status stage", "lihat stage", "progres stage", "kondisi stage", "info stage", "status tahap"],
    weight: 1.3,
  },
  {
    intent: "STAGE_DELETE",
    phrases: ["hapus stage", "delete stage", "buang stage", "hapus tahap", "delete tahap"],
    weight: 1.5,
  },
  {
    intent: "STAGE_REORDER",
    phrases: ["naikkan stage", "turunkan stage", "pindahkan stage", "ubah urutan stage", "reorder stage"],
    weight: 1.2,
  },
  {
    intent: "STAGE_UPDATE",
    phrases: ["ubah stage", "edit stage", "ganti nama stage", "update stage", "perbarui stage"],
    weight: 1.2,
  },
  {
    intent: "STAGE_CREATE",
    phrases: [
      "buat stage",
      "buatkan stage",
      "bikin stage",
      "tambah stage",
      "tambahkan stage",
      "stage baru",
      "tahap baru",
      "buat tahap",
      "tambah tahap",
    ],
    weight: 1.2,
  },

  // ── Task CRUD ───────────────────────────────────────────
  {
    intent: "TASK_DELETE",
    phrases: [
      "hapus task",
      "delete task",
      "buang task",
      "nggak jadi task",
      "tidak jadi task",
      "hapus tugas",
      "delete tugas",
      "buang tugas",
    ],
    weight: 1.5,
  },
  {
    intent: "TASK_UPDATE",
    phrases: ["ubah task", "edit task", "update task", "perbarui task", "ganti prioritas task"],
    weight: 1.2,
  },
  {
    intent: "TASK_REORDER",
    phrases: ["ubah urutan task", "pindahkan task", "urutan tugas", "reorder task", "naikkan task", "turunkan task"],
    weight: 1.3,
  },
  {
    intent: "TASK_CREATE",
    phrases: [
      "buat task",
      "buatkan task",
      "bikin task",
      "bikinin task",
      "tambah task",
      "tambahkan task",
      "tugas baru",
      "task baru",
      "membuat pekerjaan",
      "mau bikin task",
      "tolong buatkan task",
      "tambahkan tugas",
      "buat tugas",
    ],
    weight: 1.2,
  },
  {
    intent: "TASK_COMPLETE",
    phrases: [
      "selesaikan task",
      "tandai selesai",
      "selesaikan tugas",
      "centang tugas",
      "task ini selesai",
      "tugas ini selesai",
      "tandai task selesai",
      "tugas selesai",
      "bereskan task",
    ],
    weight: 1.2,
  },
  {
    intent: "TASK_REOPEN",
    phrases: ["buka kembali", "reopen task", "aktifkan lagi", "tugas yang dibuka", "belum selesai task"],
    weight: 1.2,
  },
  {
    intent: "TASK_STATUS",
    phrases: ["status task", "status tugas", "tugas ini bagaimana", "task ini bagaimana", "bagaimana task"],
    weight: 1.0,
  },
  {
    intent: "TASK_SEARCH",
    phrases: ["cari task", "cari tugas", "temukan tugas", "ada tugas", "temukan task", "search task"],
    weight: 1.0,
  },

  // ── Session ─────────────────────────────────────────────
  {
    intent: "SESSION_START",
    phrases: ["mulai sesi", "start session", "mulai bekerja", "mulai belajar", "mulai fokus", "fokus sekarang"],
    weight: 1.2,
  },
  {
    intent: "SESSION_END",
    phrases: ["akhiri sesi", "selesaikan sesi", "stop sesi", "berhenti bekerja", "berhenti belajar", "end session"],
    weight: 1.2,
  },

  // ── Focus & Today ───────────────────────────────────────
  {
    intent: "FOCUS",
    phrases: ["fokus", "tambahkan ke fokus", "prioritas hari ini", "focus task", "masukkan ke fokus"],
    weight: 1.0,
  },
  {
    intent: "TODAY",
    phrases: ["hari ini", "fokus hari", "sekarang harus", "hari ini saya", "agenda hari ini", "apa hari ini"],
    weight: 1.0,
  },
  {
    intent: "NEXT_ACTION",
    phrases: ["selanjutnya", "next action", "harus saya kerjakan", "langkah berikut", "apa selanjutnya"],
    weight: 1.0,
  },
  {
    intent: "OVERDUE",
    phrases: ["terlambat", "overdue", "jatuh tempo", "melewati tenggat", "lewat deadline"],
    weight: 1.0,
  },

  // ── Analytics & Reviews ─────────────────────────────────
  {
    intent: "PROGRESS",
    phrases: ["progres", "kemajuan", "perkembangan", "sudah sampai", "seberapa jauh"],
    weight: 1.0,
  },
  {
    intent: "ANALYTICS",
    phrases: ["analitik", "analytics", "statistik", "data aktivitas", "ringkasan aktivitas"],
    weight: 1.0,
  },
  {
    intent: "STREAK",
    phrases: ["streak", "hari berturut", "konsisten", "beruntun"],
    weight: 1.0,
  },
  {
    intent: "TIME_SPENT",
    phrases: ["berapa lama", "waktu yang dipakai", "jam kerja", "waktu belajar", "total waktu"],
    weight: 1.0,
  },
  {
    intent: "COMPLETION",
    phrases: ["berapa yang selesai", "tingkat penyelesaian", "completion", "tugas selesai"],
    weight: 1.0,
  },
  {
    intent: "BOTTLENECK",
    phrases: ["bottleneck", "hambatan utama", "yang menghambat", "tersendat", "kendala"],
    weight: 1.0,
  },
  {
    intent: "REVIEW",
    phrases: ["review", "tinjau minggu", "ulasan", "evaluasi minggu", "review mingguan"],
    weight: 1.0,
  },
  {
    intent: "REFLECTION",
    phrases: ["refleksi", "apa yang sulit", "apa yang berjalan baik", "renungkan"],
    weight: 1.0,
  },

  // ── Help & Motivation ───────────────────────────────────
  {
    intent: "MOTIVATION",
    phrases: ["motivasi", "semangat", "dorongan", "menyerah", "capek"],
    weight: 1.0,
  },
  {
    intent: "HELP",
    phrases: ["bantuan", "help", "cara memakai", "apa saja yang bisa", "bisa apa"],
    weight: 1.0,
  },
];

export class EnhancedClassifier implements IntentClassifier {
  classify(text: string): IntentResult {
    const normalizedText = normalizeText(text);
    if (!normalizedText) {
      return {
        intent: "UNKNOWN",
        confidence: 0,
        normalizedText,
        entities: [],
        source: "baseline",
      };
    }

    const entities = extractEntitiesV2(text);

    // Compound / multi-step check
    if (
      normalizedText.includes(" lalu ") ||
      normalizedText.includes(" kemudian ") ||
      normalizedText.includes(" setelah itu ") ||
      normalizedText.includes(" dan setelahnya ")
    ) {
      return {
        intent: "MULTI_STEP",
        confidence: 0.95,
        normalizedText,
        entities,
        source: "baseline",
      };
    }

    // Score all intents
    const scores: Array<{ intent: Intent; score: number }> = intentPhraseConfigs.map((cfg) => {
      let score = 0;
      for (const phrase of cfg.phrases) {
        if (normalizedText.includes(phrase)) {
          const phraseWords = phrase.split(" ").length;
          score += (phraseWords >= 2 ? 0.45 : 0.25) * (cfg.weight ?? 1.0);
        }
      }
      return { intent: cfg.intent, score };
    });

    scores.sort((a, b) => b.score - a.score);
    const top = scores[0];

    if (!top || top.score === 0) {
      return {
        intent: "UNKNOWN",
        confidence: 0,
        normalizedText,
        entities,
        source: "baseline",
      };
    }

    const confidence = Number(Math.min(0.99, 0.72 + top.score * 0.18).toFixed(2));
    const finalIntent = confidence < 0.55 ? "UNKNOWN" : top.intent;

    return {
      intent: finalIntent,
      confidence,
      normalizedText,
      entities,
      source: "baseline",
    };
  }
}

export const enhancedClassifier = new EnhancedClassifier();
