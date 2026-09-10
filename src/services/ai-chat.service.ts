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

/** Out-of-scope regex patterns for deterministic local guardrail */
export const OUT_OF_SCOPE_PATTERNS = [
  /\b(resep|masak|bumbu|makanan|kuliner)\b/i,
  /\b(presiden|menteri|politik|pemilu|partai|dpr)\b/i,
  /\b(siapa\s+penemu|ibu\s+kota|sejarah\s+dunia|luas\s+negara)\b/i,
  /\b(film|aktor|artis|selebriti|sinetron|gosip)\b/i,
  /\b(cuaca\s+hari\s+ini|ramalan\s+zodiak)\b/i,
  /\b(script|koding|coding|python\s+scraping|sql\s+query|c\+\+|java\s+code)\b/i,
];

export function isOutOfScopeQuery(text: string): boolean {
  return OUT_OF_SCOPE_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * High-Intelligence Executive Life Strategist & Copilot Persona.
 */
const COPILOT_SYSTEM_PROMPT = `
Kamu adalah MyLife Copilot — Chief of Staff pribadi, penasihat hidup strategis (Life Strategist), dan coach produktivitas cerdas bagi pengguna aplikasi MyLife.

PERAN & LEVEL KECERDASAN:
- Kamu berpikir layaknya Executive Life Coach berpengalaman: kamu memandang hidup pengguna secara holistik (keseimbangan antara pilar Karier/Bisnis, Finansial, Kesehatan/Fisik, dan Pengembangan Diri).
- Kamu MAMPU MENGHUBUNGKAN berbagai titik data: tugas mendesak, target besar, proyek aktif, jadwal kalender, dan pilar kehidupan secara tajam dan berbobot.
- Berbicaralah dalam Bahasa Indonesia yang alami, hangat, elegan, percaya diri, dan solutif.
- Format respon dengan markdown yang rapi (gunakan cetak tebal, bullet points terstruktur, dan penomoran) sehingga mudah dipahami dan enak dibaca.

PANDUAN MENJAWAB BERDASARKAN TIPE PERTANYAAN:

1. JIKA PENGGUNA MEMINTA SARAN PRIORITAS, RENCANA HARIAN, ATAU MENANYAKAN PILAR HIDUP:
   (Contoh: "apa langkah prioritas hari ini?", "menurutmu dari semua target dan pilar hidup saya apa yang harus saya lakukan?", "bagaimana prioritasku?")
   - JANGAN PERNAH memberikan jawaban 1-2 kalimat pemalas atau sekadar menyebut satu tugas pertama!
   - Berikan STRATEGIC GAMEPLAN yang terstruktur:
     * **Kondisi Hari Ini**: Catat situasi kalender (misal: kalender luang tanpa rapat, kesempatan emas untuk deep work) dan beban tugas.
     * **Prioritas #1 (The Big Rock / Deep Work)**: Tugas dengan dampak terbesar atau urgensi tertinggi (cek tugas dengan status URGENT / HIGH deadline dekat, misal Pricing Table / SaaS Launch). Jelaskan secara ringkas MENGAPA ini nomor satu.
     * **Prioritas #2 (Skill & Growth / Pengembangan Diri)**: Langkah berikutnya untuk mencicil target jangka panjang (misal: pembelajaran AI Engineer).
     * **Keseimbangan Pilar (Life & Health Balance)**: Ingatkan pentingnya menjaga pilar Kesehatan & Fisik (olahraga ringan, hidrasi, istirahat cukup) agar performa tetap prima dan terhindar dari burnout.
     * **Aksi Konkret Pertama**: Dorong pengguna untuk mengambil satu langkah pertama sekarang (misal: mulai sesi fokus 25 menit).

2. JIKA PENGGUNA BERTANYA TENTANG KALENDER / JADWAL SPESIFIK:
   (Contoh: "dikalender saya ada tugas ga?", "jadwal hari ini apa?")
   - Berikan jawaban langsung, jujur, dan jelas.
   - Bila kalender kosong: sampaikan bahwa kalender hari ini bebas agenda/pertemuan eksternal, sehingga punya blok waktu fokus yang luas, lalu rekomendasikan tugas prioritas yang bisa dieksekusi.
   - Bila kalender ada jadwal: sebutkan jam mulai, selesai, dan nama acaranya.

3. KESADARAN RIWAYAT PERCAKAPAN (MULTI-TURN MEMORY):
   - BACA RIWAYAT PERCAKAPAN! Jangan mengulang pembuka yang sama persis ("Mengingat jadwalmu hari ini...") atau merekomendasikan hal yang sama terus-menerus tanpa nilai tambah.
   - Jika pengguna bertanya lebih mendalam atau menguji ("menurutmu dari SEMUA target dan pilar hidup saya..."), tunjukkan bahwa kamu benar-benar mengerti peta semua pilar mereka dan berikan analisis yang lebih komprehensif!

4. TOPIK DILARANG (DOMAIN GUARDRAIL):
   - Hanya layani topik seputar produktivitas, target hidup, tugas, kalender, manajemen waktu, kebiasaan, dan pencegahan burnout.
   - Tolak secara santun dan singkat jika ditanya topik di luar sistem (resep makanan, trivia umum, gosip artis, politik, coding umum di luar MyLife).
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

  // ── TRACK 0: STRICT DOMAIN GUARDRAIL ──────────────────────────────────
  if (isOutOfScopeQuery(text)) {
    return {
      success: true,
      message:
        "Maaf, sebagai asisten pribadi MyLife, saya khusus diprogram untuk mendampingi produktivitas, pencapaian target (goals), dan tugas harianmu. Ada target atau rencana tugas yang ingin kita bahas bersama hari ini?",
      source: "tier1",
    };
  }

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
    // If lookup succeeded, return the structured data directly
    if (result.success) {
      const source = interpretation.source === "gemini-llm" ? "gemini" : "tier1";
      return {
        success: true,
        message: result.message,
        commandResult: result,
        source,
      };
    }
    // If the entity lookup failed (e.g. user phrased it conversationally),
    // FALL THROUGH to Track 3 so Gemini can answer conversationally and connect with real goals!
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
 * Generate an empathetic, domain-aligned conversational reply using Gemini.
 * Sanitized context is provided so Gemini knows about goals, tasks, and progress.
 */
async function generateCopilotChatReply(
  text: string,
  history: ChatHistoryItem[] | undefined,
  safeCtx: Awaited<ReturnType<typeof buildSafeContext>>
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) return null;

  const primaryModel = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
  const candidateModels = Array.from(
    new Set([primaryModel, "gemini-3.5-flash-lite", "gemini-flash-latest"])
  );
  const timeout = Math.max(Number(process.env.GEMINI_TIMEOUT_MS ?? "10000"), 10000);

  const calendarSummary =
    safeCtx.calendarEvents && safeCtx.calendarEvents.length > 0
      ? safeCtx.calendarEvents
          .map(
            (e) =>
              `- ${e.isToday ? "[HARI INI]" : "[AKAN DATANG]"} "${e.title}" (${e.startTime} - ${e.endTime})`
          )
          .join("\n")
      : "Tidak ada jadwal atau agenda khusus di kalender untuk hari ini (jadwal kosong/luang).";

  const areasSummary =
    safeCtx.areas && safeCtx.areas.length > 0
      ? safeCtx.areas
          .map((a) => {
            if (typeof a === "string") return `- Pilar: "${a}"`;
            const goalsList =
              a.activeGoals && a.activeGoals.length > 0
                ? ` (Target: ${a.activeGoals.join(", ")})`
                : " (Belum ada target khusus)";
            return `- Pilar: "${a.name}"${goalsList}`;
          })
          .join("\n")
      : "Belum ada pilar hidup.";

  const goalsSummary =
    safeCtx.goals && safeCtx.goals.length > 0
      ? safeCtx.goals
          .map(
            (g) =>
              `- Target: "${g.title}" [Pilar: ${g.areaName ?? "Umum"}] (Tipe: ${g.type ?? "GENERAL"}, Prio: ${g.priority ?? "MEDIUM"})${
                g.stages && g.stages.length > 0 ? `, Tahapan: ${g.stages.join(" -> ")}` : ""
              }`
          )
          .join("\n")
      : "Belum ada target aktif.";

  const projectsSummary =
    safeCtx.projects && safeCtx.projects.length > 0
      ? safeCtx.projects
          .map(
            (p) =>
              `- Proyek: "${p.title}" [Pilar: ${p.areaName ?? "Umum"}] (${p.status ?? "ACTIVE"})${
                p.goalTitle ? `, Terkait Target: "${p.goalTitle}"` : ""
              }${
                p.milestones && p.milestones.length > 0 ? `, Milestones: ${p.milestones.join(", ")}` : ""
              }`
          )
          .join("\n")
      : "Belum ada proyek aktif.";

  const tasksSummary = safeCtx.tasks
    ? [
        `Tugas Fokus Hari Ini: ${safeCtx.tasks.focus.length > 0 ? safeCtx.tasks.focus.join(", ") : "Belum memilih tugas fokus"}`,
        `Tugas Terlambat (Overdue): ${safeCtx.tasks.overdue.length > 0 ? safeCtx.tasks.overdue.join(", ") : "Tidak ada yang terlambat"}`,
        `Daftar Tugas Todo (Terurut Prioritas & Urgensi):\n${
          safeCtx.tasks.todo.length > 0
            ? safeCtx.tasks.todo
                .map(
                  (t, idx) =>
                    `  ${idx + 1}. "${t.title}" | Prioritas: ${t.priority}${
                      t.dueDate ? ` | Deadline: ${t.dueDate}` : ""
                    }${t.areaName ? ` | Pilar: ${t.areaName}` : ""}${
                      t.goalTitle ? ` | Target: ${t.goalTitle}` : ""
                    }`
                )
                .join("\n")
            : "  (Tidak ada tugas todo)"
        }`,
        `Tugas Selesai Hari Ini: ${safeCtx.tasks.completedToday.length > 0 ? safeCtx.tasks.completedToday.join(", ") : "Belum ada yang diselesaikan"}`,
      ].join("\n")
    : `Tugas Fokus: ${JSON.stringify(safeCtx.recentTaskTitles ?? [])}`;

  const inboxSummary = safeCtx.inbox
    ? `Jumlah ide/catatan mentah belum diproses: ${safeCtx.inbox.pendingCount}${
        safeCtx.inbox.items.length > 0
          ? `, Catatan terbaru: ${safeCtx.inbox.items.map((i) => `"${i.content}" [${i.category}]`).join(", ")}`
          : ""
      }`
    : "Kotak masuk kosong.";

  const contextBlock = `
DATA LENGKAP SISTEM MYLIFE PENGGUNA SAAT INI (BACA DENGAN TELITI):
1. PILAR HIDUP (AREAS):
${areasSummary}

2. TARGET AKTIF (GOALS & STAGES):
${goalsSummary}

3. PROYEK AKTIF (PROJECTS):
${projectsSummary}

4. STATUS TUGAS (TASKS & PRIORITIES):
${tasksSummary}

5. JADWAL & KALENDER (CALENDAR & SCHEDULE):
${calendarSummary}

6. KOTAK MASUK (CAPTURE INBOX):
${inboxSummary}

7. STATISTIK HARI INI:
   - Selesai hari ini: ${safeCtx.todayStats?.completedToday ?? 0} tugas
   - Sisa fokus: ${safeCtx.todayStats?.focusTaskCount ?? 0} tugas
   - Terlambat: ${safeCtx.todayStats?.overdueCount ?? 0} tugas
`.trim();

  const historyBlock =
    history && history.length > 0
      ? `\nRIWAYAT PERCAKAPAN SEBELUMNYA:\n${history
          .slice(-6)
          .map((h) => `${h.role === "user" ? "Pengguna" : "Asisten"}: ${h.content}`)
          .join("\n")}\n`
      : "";

  const fullPrompt = `${COPILOT_SYSTEM_PROMPT}\n\n${contextBlock}${historyBlock}\nPengguna: ${text}\nAsisten:`;

  for (const model of candidateModels) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
              maxOutputTokens: 1000,
            },
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        console.warn(`[GeminiChat] Model ${model} returned ${response.status}, trying next model...`);
        continue;
      }

      const json = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const textResult = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (textResult) return textResult;
    } catch (err) {
      console.warn(`[GeminiChat] Model ${model} caught exception:`, err);
      // Continue to next candidate model
      continue;
    }
  }

  return null;
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
