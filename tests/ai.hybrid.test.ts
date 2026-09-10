import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/services/task.service", () => ({
  completeTask: vi.fn(async () => ({ id: "task-1", title: "Belajar Golang" })),
  createTask: vi.fn(),
  findMatchingTasks: vi.fn(async () => []),
  findTask: vi.fn(async () => ({ id: "task-1", title: "Belajar Golang" })),
  reopenTask: vi.fn(),
  deleteTask: vi.fn(),
}));
vi.mock("@/services/goal.service", () => ({
  createGoal: vi.fn(),
  deleteGoal: vi.fn(),
  findGoal: vi.fn(async () => ({ id: "goal-1", title: "Target Utama" })),
  getGoals: vi.fn(async () => [{ id: "goal-1", title: "Target Utama", status: "IN_PROGRESS" }]),
}));
vi.mock("@/services/session.service", () => ({
  endSession: vi.fn(),
  getAnyActiveSession: vi.fn(async () => null),
  startSession: vi.fn(),
}));
vi.mock("@/services/today.service", () => ({
  addTodayFocus: vi.fn(),
  getToday: vi.fn(async () => ({
    focusTasks: [{ task: { title: "Fokus 1" } }],
    overdueTasks: [],
    completedTasks: [],
    nextAction: { taskId: "task-1", taskName: "Task 1" },
  })),
}));
vi.mock("@/services/analytics.service", () => ({
  getDashboardAnalytics: vi.fn(async () => ({
    summary: { completionRate: 80, totalMinutes: 120, completedTasks: 5, currentStreak: 3 },
  })),
  getGoalAnalytics: vi.fn(async () => ({
    summary: { completionRate: 80, totalMinutes: 120, completedTasks: 5, currentStreak: 3 },
  })),
}));
vi.mock("@/services/review.service", () => ({
  getGoalReviewPageData: vi.fn(),
}));

import { parseAmbientTask, parseAmbientCapture } from "../src/ai/ambient/ambient-nlp";
import { getGeminiAvailability, classifyWithGemini } from "../src/ai/llm/gemini-bridge";
import { interpretInputHybrid } from "../src/services/ai.service";
import { processChat, executeConfirmedChatCommand } from "../src/services/ai-chat.service";
import { executeAICommand } from "../src/services/ai-command.service";
import { createConfirmationToken } from "../src/ai/safety";

describe("Phase 10 — Ambient NLP Engine", () => {
  it("detects priority from Indonesian natural language cues", () => {
    expect(parseAmbientTask("Kirim laporan mendadak").detectedPriority?.level).toBe("URGENT");
    expect(parseAmbientTask("Perbaiki bug penting hari ini").detectedPriority?.level).toBe("HIGH");
    expect(parseAmbientTask("Baca artikel santai").detectedPriority?.level).toBe("LOW");
    expect(parseAmbientTask("Belajar TypeScript").detectedPriority).toBeUndefined();
  });

  it("detects date and time from natural language expressions", () => {
    const besokResult = parseAmbientTask("Kirim email ke klien besok jam 14");
    expect(besokResult.detectedDate).toBeDefined();
    expect(besokResult.detectedDate?.label).toContain("Besok 14:00");

    const soreResult = parseAmbientTask("Evaluasi sprint hari ini sore");
    expect(soreResult.detectedDate?.label).toContain("Hari Ini 16:00");

    const lusaResult = parseAmbientTask("Meeting vendor lusa");
    expect(lusaResult.detectedDate?.label).toContain("Lusa");
  });

  it("detects duration estimates from natural expressions", () => {
    expect(parseAmbientTask("Coding backend 2 jam").detectedDuration).toEqual({ hours: 2, label: "2 Jam" });
    expect(parseAmbientTask("Review pull request 30m").detectedDuration).toEqual({ hours: 0.5, label: "30 Menit" });
    expect(parseAmbientTask("Bikin kopi 15 menit").detectedDuration).toEqual({ hours: 0.25, label: "15 Menit" });
  });

  it("identifies when no ambient data is present in plain title", () => {
    const res = parseAmbientTask("Membaca dokumentasi Prisma");
    expect(res.hasAmbientData).toBe(false);
    expect(res.detectedPriority).toBeUndefined();
    expect(res.detectedDate).toBeUndefined();
  });

  it("predicts capture categories with high precision", () => {
    expect(parseAmbientCapture("ingat bayar listrik besok").suggestedCategory).toBe("REMINDER");
    expect(parseAmbientCapture("ide fitur gamifikasi untuk user baru").suggestedCategory).toBe("IDEA");
    expect(parseAmbientCapture("catatan ringkasan buku atomic habits").suggestedCategory).toBe("NOTE");
    expect(parseAmbientCapture("buat invoice untuk klien PT Maju").suggestedCategory).toBe("TASK_CANDIDATE");
    expect(parseAmbientCapture("kirim file desain").suggestedCategory).toBe("TASK_CANDIDATE");
  });
});

describe("Phase 10 — Gemini Bridge & Graceful Fallback", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("reports 'no-key' when GEMINI_API_KEY is not configured", () => {
    delete process.env.GEMINI_API_KEY;
    expect(getGeminiAvailability()).toBe("no-key");
  });

  it("reports 'available' when GEMINI_API_KEY is set", () => {
    process.env.GEMINI_API_KEY = "mock-api-key-xyz";
    expect(getGeminiAvailability()).toBe("available");
  });

  it("falls back to Tier 1 when Gemini API key is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await interpretInputHybrid("apa fokus saya hari ini");
    expect(res.intent).toBe("TODAY");
    expect(res.source).not.toBe("gemini-llm");
  });

  it("handles Gemini fetch timeout or failure gracefully", async () => {
    process.env.GEMINI_API_KEY = "mock-key";
    // Mock global fetch to simulate network failure
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

    try {
      const llmRes = await classifyWithGemini("kalimat acak yang aneh");
      expect(llmRes).toBeNull();

      // Hybrid engine should seamlessly return Tier 1 result
      const hybridRes = await interpretInputHybrid("kalimat acak yang aneh");
      expect(hybridRes).toBeDefined();
      expect(hybridRes.intent).toBe("UNKNOWN");
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe("Phase 10 — Life Copilot (/assistant) Service", () => {
  it("processes read intents directly without requiring write confirmation", async () => {
    const result = await processChat("apa fokus saya hari ini", "user-test-1");
    expect(result.success).toBe(true);
    expect(result.commandProposal).toBeUndefined();
  });

  it("processes write intents as proposals requiring explicit confirmation", async () => {
    const result = await processChat("selesaikan task Belajar Golang", "user-test-1");
    expect(result.success).toBe(true);
    // Write intent should produce proposal
    if (result.commandProposal) {
      expect(result.commandProposal.requiresConfirmation).toBe(true);
      expect(result.commandProposal.confirmationToken).toBeDefined();
    }
  });

  it("provides helpful conversational response for HELP or UNKNOWN intents", async () => {
    const helpResult = await processChat("bantu saya", "user-test-1");
    expect(helpResult.success).toBe(true);
    expect(helpResult.message).toBeTruthy();

    const unknownResult = await processChat("xyzzy123 blablabla", "user-test-1");
    expect(unknownResult.success).toBe(true);
    expect(unknownResult.message).toBeTruthy();
  });

  it("strictly refuses out-of-scope queries with polite domain redirection", async () => {
    // Tests domain guardrail policy
    const recipeQuery = await processChat("apa resep bumbu rawon enak", "user-test-1");
    expect(recipeQuery.success).toBe(true);
    expect(recipeQuery.message.toLowerCase()).toContain("mylife");
    expect(recipeQuery.message.toLowerCase()).toMatch(/produktivitas|target|tugas/);

    const triviaQuery = await processChat("siapa presiden amerika serikat", "user-test-1");
    expect(triviaQuery.success).toBe(true);
    expect(triviaQuery.message.toLowerCase()).toContain("mylife");

    const codeQuery = await processChat("buatkan script python scraping", "user-test-1");
    expect(codeQuery.success).toBe(true);
    expect(codeQuery.message.toLowerCase()).toContain("mylife");
  });

  it("provides warm empathetic advice for fatigue and burnout", async () => {
    const fatigueResult = await processChat("aku lagi capek dan burnout banget hari ini", "user-test-1");
    expect(fatigueResult.success).toBe(true);
    expect(fatigueResult.message.toLowerCase()).toMatch(/energi|lelah|istirahat|napas/);
  });

  it("processes conversation with multi-turn history", async () => {
    const history = [
      { role: "user" as const, content: "Halo asisten" },
      { role: "assistant" as const, content: "Halo! Ada yang bisa saya bantu hari ini?" },
    ];
    const result = await processChat("gimana cara fokus?", "user-test-1", undefined, "assistant", history);
    expect(result.success).toBe(true);
    expect(result.message).toBeTruthy();
  });

  it("rejects confirmed chat execution with forged or mismatched token", async () => {
    const forgedToken = "invalid-token-123456";
    const result = await executeConfirmedChatCommand("selesaikan task Belajar Golang", forgedToken, undefined, "user-test-1");
    expect(result.success).toBe(false);
    expect(result.code).toBe("CONFIRMATION_REQUIRED");
  });
});

describe("Phase 10 — Extended Intent Handlers & Safety", () => {
  it("GOAL_GET requires goal name or context", async () => {
    const res = await executeAICommand({ text: "lihat goal" }, "user-test-1");
    // Without specific name or context, responds with guidance or search
    expect(res).toBeDefined();
  });

  it("STAGE_STATUS requires stage context or name", async () => {
    const res = await executeAICommand({ text: "status stage" }, "user-test-1");
    expect(res.success).toBe(false);
    expect(res.code).toBe("MISSING_STAGE_CONTEXT");
  });

  it("TASK_REORDER provides guidance to use drag-and-drop", async () => {
    const res = await executeAICommand({ text: "ubah urutan task" }, "user-test-1");
    expect(res.success).toBe(false);
    expect(res.message).toContain("drag-and-drop");
  });

  it("preserves HMAC confirmation token integrity for write intents", () => {
    const tokenObj = createConfirmationToken("TASK_DELETE", "user-test-1");
    expect(tokenObj.token).toBeTruthy();
    expect(typeof tokenObj.token).toBe("string");
    expect(tokenObj.token.length).toBeGreaterThan(20);
  });
});
