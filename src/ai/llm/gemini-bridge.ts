/**
 * Gemini LLM Bridge — Tier 2 AI
 *
 * This module is the ONLY place where Gemini API is called.
 * It receives sanitized text input and returns a structured IntentResult.
 *
 * SECURITY RULES (NON-NEGOTIABLE):
 * - GEMINI_API_KEY never leaves server
 * - No raw DB data or IDs are sent to Gemini
 * - All Gemini output is schema-validated before use
 * - Gemini-generated IDs are NEVER trusted directly
 * - If Gemini is unavailable, caller falls back to SAFE_FALLBACK
 */

import type { IntentResult } from "../intents";
import { allIntents } from "../intents";
import { normalizeText } from "../normalization";

/** Configuration — read from environment, never hardcoded */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS ?? "5000");

/** The confidence threshold below which Tier 2 is invoked */
export const LLM_CONFIDENCE_THRESHOLD = 0.6;

export type GeminiAvailability = "available" | "no-key" | "unavailable";

/** Complete sanitized context passed to Gemini — no DB IDs, no secrets */
export type SafeAIContext = {
  currentPage?: string;
  activeGoalTitles?: string[];
  recentTaskTitles?: string[];
  todayStats?: {
    focusTaskCount: number;
    overdueCount: number;
    completedToday: number;
  };
  // Holistic Life OS context
  areas?: Array<{
    name: string;
    description?: string;
    activeGoals?: string[];
  }> | string[];
  goals?: Array<{
    title: string;
    type?: string;
    priority?: string;
    areaName?: string;
    stages?: string[];
  }>;
  projects?: Array<{
    title: string;
    status?: string;
    areaName?: string;
    goalTitle?: string;
    milestones?: string[];
  }>;
  tasks?: {
    focus: string[];
    overdue: string[];
    todo: Array<{ title: string; priority: string; dueDate?: string; goalTitle?: string; areaName?: string }>;
    completedToday: string[];
  };
  calendarEvents?: Array<{
    title: string;
    startTime: string;
    endTime: string;
    isToday: boolean;
  }>;
  inbox?: {
    pendingCount: number;
    items: Array<{ content: string; category: string }>;
  };
  streak?: number;
};

/**
 * Raw shape expected from Gemini JSON response.
 * We validate this strictly — any deviation falls back gracefully.
 */
type GeminiIntentResponse = {
  intent: string;
  confidence: number;
  entityHints?: {
    goalName?: string;
    stageName?: string;
    taskTitle?: string;
    date?: string;
    priority?: string;
    direction?: string;
  };
};

const GEMINI_SYSTEM_PROMPT = `
You are an intent classifier for MyLife, a personal productivity app.
The app is used in Indonesian language (Bahasa Indonesia) but also accepts English.

Your ONLY job is to classify the user's text into one of these intents and return structured JSON.

VALID INTENTS (use EXACTLY these names):
TODAY, NEXT_ACTION, GOAL_STATUS, GOAL_GET, GOAL_CREATE, GOAL_UPDATE, GOAL_DELETE,
STAGE_CREATE, STAGE_UPDATE, STAGE_DELETE, STAGE_REORDER, STAGE_STATUS,
TASK_STATUS, TASK_SEARCH, TASK_CREATE, TASK_UPDATE, TASK_DELETE,
TASK_COMPLETE, TASK_REOPEN, TASK_BULK_DELETE, TASK_BULK_COMPLETE, TASK_REORDER,
PROGRESS, ANALYTICS, STREAK, TIME_SPENT, COMPLETION, BOTTLENECK,
REVIEW, REFLECTION, SESSION_START, SESSION_END, FOCUS,
OVERDUE, MULTI_STEP, MOTIVATION, HELP, UNKNOWN

Return ONLY valid JSON in this exact format:
{
  "intent": "<INTENT_NAME>",
  "confidence": <number between 0.0 and 1.0>,
  "entityHints": {
    "goalName": "<goal name if mentioned, omit if none>",
    "stageName": "<stage name if mentioned, omit if none>",
    "taskTitle": "<task title if mentioned, omit if none>",
    "date": "<date if mentioned like 'besok', 'tomorrow', or ISO date, omit if none>",
    "priority": "<LOW|MEDIUM|HIGH if mentioned, omit if none>",
    "direction": "<up|down if mentioned for reorder, omit if none>"
  }
}

IMPORTANT RULES:
- Do NOT invent entity IDs. Only return names/titles mentioned by the user.
- If uncertain, use intent "UNKNOWN" with low confidence.
- Return ONLY the JSON, no explanation.
`.trim();

/** Check if Gemini can be used */
export function getGeminiAvailability(): GeminiAvailability {
  const key = process.env.GEMINI_API_KEY ?? "";
  if (!key) return "no-key";
  return "available";
}

/**
 * Call Gemini Tier 2.
 * Returns null on ANY failure — caller must handle gracefully.
 */
export async function classifyWithGemini(
  text: string,
  safeContext?: SafeAIContext
): Promise<IntentResult | null> {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) return null;

  const primaryModel = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
  const candidateModels = Array.from(
    new Set([primaryModel, "gemini-3.5-flash-lite", "gemini-flash-latest"])
  );
  const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS ?? "5000");

  const normalizedText = normalizeText(text);
  const contextNote = safeContext
    ? `\nUser context: page="${safeContext.currentPage ?? "unknown"}", active goals=${JSON.stringify(safeContext.activeGoalTitles ?? [])}`
    : "";

  const userMessage = `${normalizedText}${contextNote}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: GEMINI_SYSTEM_PROMPT },
          { text: `User input: "${userMessage}"` },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  };

  for (const model of candidateModels) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        console.warn(`[GeminiBridge] Model ${model} returned ${response.status}, trying next model...`);
        continue;
      }

      const json = await response.json() as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };

      const parts = json?.candidates?.[0]?.content?.parts ?? [];
      const textPart = parts.find((p) => typeof p.text === "string" && p.text.trim().length > 0) ?? parts[0];
      const rawText = textPart?.text;
      if (!rawText) {
        console.warn(`[GeminiBridge] Empty response from Gemini model ${model}`);
        continue;
      }

      const parsed = parseGeminiResponse(rawText, normalizedText);
      if (parsed) return parsed;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.warn(`[GeminiBridge] Request to ${model} timed out after ${timeoutMs}ms`);
      } else {
        console.warn(`[GeminiBridge] Error with ${model}:`, err instanceof Error ? err.message : String(err));
      }
      continue;
    }
  }

  return null;
}

/**
 * Parse and validate Gemini's JSON response.
 * Returns null if invalid — never throws.
 */
export function parseGeminiResponse(
  rawText: string,
  normalizedText: string
): IntentResult | null {
  let parsed: GeminiIntentResponse;
  try {
    // Strip markdown code fences if present, extract JSON block
    let cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    parsed = JSON.parse(cleaned) as GeminiIntentResponse;
  } catch {
    console.warn("[GeminiBridge] Failed to parse JSON from Gemini:", rawText.slice(0, 200));
    return null;
  }

  // Validate intent is one of the known intents
  if (!parsed.intent || !allIntents.includes(parsed.intent as (typeof allIntents)[number])) {
    console.warn("[GeminiBridge] Unknown intent from Gemini:", parsed.intent);
    return null;
  }

  const confidence = typeof parsed.confidence === "number"
    ? Math.max(0, Math.min(1, parsed.confidence))
    : 0.6;

  // Build entities from entityHints (semantic names only — no DB IDs)
  const entities: IntentResult["entities"] = [];
  const hints = parsed.entityHints ?? {};

  if (hints.goalName) entities.push({ value: hints.goalName, type: "GOAL" });
  if (hints.stageName) entities.push({ value: hints.stageName, type: "STAGE" });
  if (hints.taskTitle) entities.push({ value: hints.taskTitle, type: "TASK" });
  if (hints.date) entities.push({ value: hints.date, type: "DATE" });
  if (hints.priority) entities.push({ value: hints.priority, type: "PRIORITY" });
  if (hints.direction) entities.push({ value: hints.direction, type: "DIRECTION" });

  return {
    intent: parsed.intent as (typeof allIntents)[number],
    confidence,
    normalizedText,
    entities,
    source: "gemini-llm",
  };
}
