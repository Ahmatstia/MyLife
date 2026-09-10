/**
 * AI Chat Service — Life Copilot Hub
 *
 * Powers the /assistant conversational interface with:
 * - Conversational Life Coach Persona (warm, empathetic, concise, human-like in Indonesian)
 * - Strict Domain Guardrails (Only MyLife: productivity, goals, tasks, focus, routines)
 * - Polite refusal and redirection for out-of-scope questions (trivia, news, recipes, etc.)
 * - Multi-turn conversational awareness (recent chat history)
 * - Zero Rogue Mutations (Write actions produce structured HMAC proposals)
 * - IDOR-safe sanitized context isolation
 */

import { buildSafeContext } from "../ai/llm/safe-context-builder";
import { getGeminiAvailability } from "../ai/llm/gemini-bridge";
import { interpretInputHybrid } from "./ai.service";
import { executeAICommand } from "./ai-command.service";
import { requireUserId } from "@/lib/ownership";
import type { AICommandInput } from "@/schemas/ai-command.schema";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type ChatResponse = {
  success: boolean;
  message: string;
  /** If the assistant detected an actionable intent, a command proposal is attached */
  commandProposal?: {
    intent: string;
    description: string;
    /** Populated from ai-command.service — not executed yet */
    requiresConfirmation: boolean;
    confirmationToken?: string;
    ambiguityCandidates?: Array<{ id: string; name: string; type: string; parentName?: string }>;
    plan?: Array<{ step: number; tool: string; description: string; arguments: Record<string, unknown> }>;
  };
  /** Raw command result if executed */
  commandResult?: Awaited<ReturnType<typeof executeAICommand>>;
  source: "tier1" | "gemini" | "unavailable";
};

/** Intents that represent direct data mutations — require proposals */
const COMMAND_INTENTS = new Set([
  "GOAL_CREATE", "GOAL_UPDATE", "GOAL_DELETE",
  "STAGE_CREATE", "STAGE_UPDATE", "STAGE_DELETE", "STAGE_REORDER",
  "TASK_CREATE", "TASK_UPDATE", "TASK_DELETE",
  "TASK_COMPLETE", "TASK_REOPEN", "TASK_BULK_DELETE", "TASK_BULK_COMPLETE", "TASK_REORDER",
  "SESSION_START", "SESSION_END", "FOCUS", "MULTI_STEP",
]);

/** Pure data-retrieval intents that have explicit answer formats */
const READ_INTENTS = new Set([
  "TODAY", "NEXT_ACTION", "GOAL_STATUS", "GOAL_GET", "TASK_STATUS", "TASK_SEARCH",
  "PROGRESS", "ANALYTICS", "STREAK", "TIME_SPENT", "COMPLETION", "BOTTLENECK",
  "REVIEW", "REFLECTION", "OVERDUE", "STAGE_STATUS",
]);

/**
 * System Prompt with Strict Domain Guardrails & Life Copilot Persona.
 */
const COPILOT_SYSTEM_PROMPT = `
Kamu adalah MyLife Copilot — sahabat produktivitas pribadi, perencana hidup, dan life coach personal bagi pengguna di aplikasi MyLife.

PERAN & KARAKTER:
- Berbicaralah dalam Bahasa Indonesia yang alami, hangat, ramah, cerdas, dan empatik layaknya seorang sahabat atau mentor produktivitas yang bijak.
- Jawablah secara ringkas, solutif, dan membumi (maksimal 2-4 kalimat). Hindari respon bertele-tele atau membuat daftar terlalu panjang kecuali pengguna memintanya secara eksplisit.
- Gunakan konteks data pengguna (target impian, tugas hari ini, fokus kerja) untuk memberikan respon yang terasa personal dan relevan.
- JANGAN menyebutkan istilah teknis internal software (seperti "Prisma", "Zod", "IDOR", "endpoint", "database schema", "HMAC token").

PAGAR KONTEKS & ATURAN DOMAIN KETAT (GUARDRAIL - SANGAT PENTING):
1. TOPIK YANG DIIZINKAN (HANYA INI YANG BOLEH DIBAHAS):
   - Produktivitas, manajemen waktu, fokus kerja/belajar, kebiasaan positif (habits), dan rutinitas harian.
   - Perencanaan target hidup (Goals), tahapan kemajuan (Stages), dan daftar tugas (Tasks) di aplikasi MyLife.
   - Evaluasi harian/mingguan (Review), refleksi, mengatasi rasa malas, prokrastinasi, kelelahan mental (burnout), atau stres kerja.
   - Bantuan & panduan penggunaan fitur MyLife (Hari Ini, Mode Fokus Pomodoro, Kotak Masuk/Capture, Jadwal, Refleksi).
   - Sapaan santai, perkenalan diri, dan obrolan suportif seputar aktivitas pengguna.

2. TOPIK DILARANG / DI LUAR DOMAIN (WAJIB DITOLAK SECARA SOPAN):
   - Pertanyaan pengetahuan umum/trivia/fakta dunia (misal: "siapa presiden...", "ibu kota negara...", "sejarah dunia").
   - Resep masakan/kuliner, dunia hiburan/selebriti, lagu, film, gosip, atau politik.
   - Konsultasi medis/obat-obatan atau hukum formal.
   - Pemrograman atau coding teknis umum yang tidak berkaitan dengan MyLife (misal: "buatkan script scraping", "tulis kode C++").
   - Tugas sekolah/kuliah umum yang bukan tentang manajemen waktu/produktivitas.

3. CARA MENOLAK TOPIK DI LUAR DOMAIN:
   Jika pengguna menanyakan hal di luar domain di atas, TOLAK DENGAN SANTUN DAN SINGKAT, lalu tawarkan bantuan seputar target/tugas MyLife.
   Contoh respon penolakan:
   "Maaf, sebagai asisten pribadi MyLife, saya hanya fokus mendampingi produktivitas, target (goals), dan tugas harianmu. Ada rencana atau tugas hari ini yang ingin kita diskusikan bersama?"
`.trim();

/**
 * Process a chat message from the user.
 *
 * 1. Action Commands (Write ops): returns proposal card with confirmation token.
 * 2. Explicit Data Lookups (Read ops with high confidence): executes and returns data.
 * 3. Conversational Life Copilot: generates human-like empathetic advice with domain guardrails.
 */
export async function processChat(
  text: string,
  userId?: string,
  context?: AICommandInput["context"],
  currentPage?: string,
  history?: ChatHistoryItem[]
): Promise<ChatResponse> {
  const owner = requireUserId(userId);

  // Build sanitized context for Gemini (no raw DB data, no secrets)
  const safeCtx = await buildSafeContext(owner, currentPage);

  // Interpret intent with hybrid Tier 1 + Tier 2
  const interpretation = await interpretInputHybrid(text, safeCtx);
  const { intent, confidence } = interpretation;

  // ── TRACK 1: EXPLICIT MUTATION COMMANDS ─────────────────────────────────
  // If the user is specifically giving a command to create/modify/delete items
  if (COMMAND_INTENTS.has(intent) && confidence >= 0.65) {
    const commandInput: AICommandInput = {
      text,
      confirmed: false,
      context,
    };

    const result = await executeAICommand(commandInput, owner);
    const source = interpretation.source === "gemini-llm" ? "gemini" : "tier1";

    return {
      success: true,
      message: result.message,
      commandProposal: {
        intent: result.interpretation.intent,
        description: result.message,
        requiresConfirmation: !!result.requiresConfirmation,
        confirmationToken: result.confirmationToken,
        ambiguityCandidates: result.ambiguityCandidates,
        plan: result.plan,
      },
      commandResult: result,
      source,
    };
  }

  // ── TRACK 2: EXPLICIT DATA LOOKUPS ─────────────────────────────────────
  // High-confidence specific queries for progress, streak, or today's task list
  if (READ_INTENTS.has(intent) && confidence >= 0.80) {
    const commandInput: AICommandInput = {
      text,
      confirmed: false,
      context,
    };

    const result = await executeAICommand(commandInput, owner);
    const source = interpretation.source === "gemini-llm" ? "gemini" : "tier1";

    return {
      success: result.success,
      message: result.message,
      commandResult: result,
      source,
    };
  }

  // ── TRACK 3: CONVERSATIONAL COPILOT WITH DOMAIN GUARDRAILS ──────────────
  // For chat, coaching, open questions, feelings, reflections, or out-of-scope queries
  const availability = getGeminiAvailability();
  if (availability === "available") {
    const conversationalReply = await generateCopilotChatReply(text, history, safeCtx);
    if (conversationalReply) {
      return {
        success: true,
        message: conversationalReply,
        source: "gemini",
      };
    }
  }

  // Deterministic local fallback with domain guardrails
  const fallbackReply = getLocalFallbackReply(text, safeCtx);
  return {
    success: true,
    message: fallbackReply,
    source: availability === "no-key" ? "unavailable" : "tier1",
  };
}

/**
 * Execute a confirmed command from the chat interface.
 * Routes through the exact same confirmation mechanism as the main AI panel.
 */
export async function executeConfirmedChatCommand(
  text: string,
  confirmationToken: string,
  context?: AICommandInput["context"],
  userId?: string
): Promise<Awaited<ReturnType<typeof executeAICommand>>> {
  const owner = requireUserId(userId);
  return executeAICommand({ text, confirmed: true, confirmationToken, context }, owner);
}

/**
 * Generate a conversational reply using Gemini with strict domain guardrails & history.
 */
async function generateCopilotChatReply(
  text: string,
  history: ChatHistoryItem[] | undefined,
  safeCtx: Awaited<ReturnType<typeof buildSafeContext>>
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
  const timeout = Number(process.env.GEMINI_TIMEOUT_MS ?? "5000");
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contextBlock = `
KONTEKS DATA PENGGUNA SAAT INI (Gunakan untuk relevansi):
- Halaman saat ini: ${safeCtx.currentPage ?? "assistant"}
- Target aktif pengguna: ${JSON.stringify(safeCtx.activeGoalTitles ?? [])}
- Tugas fokus hari ini: ${JSON.stringify(safeCtx.recentTaskTitles ?? [])}
- Ringkasan statistik hari ini: ${JSON.stringify(safeCtx.todayStats ?? {})}
`.trim();

  const historyBlock =
    history && history.length > 0
      ? `\nRIWAYAT PERCAKAPAN SEBELUMNYA:\n${history
          .slice(-6)
          .map((h) => `${h.role === "user" ? "Pengguna" : "Asisten"}: ${h.content}`)
          .join("\n")}\n`
      : "";

  const fullPrompt = `${COPILOT_SYSTEM_PROMPT}\n\n${contextBlock}${historyBlock}\nPengguna: ${text}\nAsisten:`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    let response: Response;
    try {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 350,
          },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) return null;
    const json = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

/**
 * Intelligent deterministic local fallback when Gemini is offline or unavailable.
 * Strictly enforces domain boundaries and provides warm productivity assistance.
 */
function getLocalFallbackReply(
  text: string,
  safeCtx: Awaited<ReturnType<typeof buildSafeContext>>
): string {
  const lower = text.toLowerCase();

  // Guardrail check: Refuse common out-of-scope topics
  const outOfScopePatterns = [
    /\b(resep|masak|bumbu|makanan|kuliner)\b/,
    /\b(presiden|menteri|politik|pemilu|partai|dpr)\b/,
    /\b(siapa\s+penemu|ibu\s+kota|sejarah\s+dunia|luas\s+negara)\b/,
    /\b(film|aktor|artis|selebriti|sinetron|gosip)\b/,
    /\b(cuaca\s+hari\s+ini|ramalan\s+zodiak)\b/,
    /\b(script|koding|coding|python\s+scraping|sql\s+query|c\+\+|java\s+code)\b/,
  ];

  if (outOfScopePatterns.some((pattern) => pattern.test(lower))) {
    return "Maaf, sebagai asisten pribadi MyLife, saya khusus diprogram untuk mendampingi produktivitas, pencapaian target (goals), dan tugas harianmu. Ada target atau rencana tugas yang ingin kita bahas bersama hari ini?";
  }

  // Warm greetings
  if (/^(halo|hai|selamat\s+(pagi|siang|sore|malam)|hey|hi|assalamualaikum)/i.test(lower)) {
    const activeGoal = safeCtx.activeGoalTitles?.[0];
    if (activeGoal) {
      return `Halo! Senang bisa mendampingimu hari ini. Saat ini kamu punya target "${activeGoal}". Ada yang ingin kita rencanakan atau selesaikan sekarang?`;
    }
    return "Halo! Saya Life Copilot, sahabat produktivitasmu di MyLife. Apa rencana atau fokus utama yang ingin kita kerjakan hari ini?";
  }

  // Overcoming fatigue / burnout / procrastination
  if (/(capek|lelah|mager|malas|burnout|mumet|pusing|berat)/i.test(lower)) {
    const focusTask = safeCtx.recentTaskTitles?.[0];
    if (focusTask) {
      return `Saya paham, ada kalanya energi kita sedang turun. Jangan paksakan semuanya sekaligus. Kalau masih memungkinkan, coba selesaikan 1 tugas paling ringan seperti "${focusTask}", atau istirahatlah sejenak untuk mengisi ulang energimu.`;
    }
    return "Saya paham, wajar sekali merasa lelah atau kehilangan motivasi di tengah kesibukan. Tarik napas sejenak, istirahatlah sebentar. Ketika sudah siap, kita bisa mulai lagi dari langkah paling kecil.";
  }

  // Default helpful productivity guidance
  return "Saya di sini untuk membantumu mengelola target hidup, tugas harian, dan fokus. Kamu bisa minta saya merencanakan hari ini, memeriksa progres target, atau membuat tugas baru.";
}
