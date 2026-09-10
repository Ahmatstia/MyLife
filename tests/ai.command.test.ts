import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/task.service", () => ({ completeTask: vi.fn(), createTask: vi.fn(), findMatchingTasks: vi.fn(async () => []), findTask: vi.fn(), reopenTask: vi.fn() }));
vi.mock("@/services/goal.service", () => ({ createGoal: vi.fn() }));
vi.mock("@/services/session.service", () => ({ endSession: vi.fn(), getAnyActiveSession: vi.fn(), startSession: vi.fn() }));
vi.mock("@/services/today.service", () => ({ addTodayFocus: vi.fn(), getToday: vi.fn() }));
vi.mock("@/services/analytics.service", () => ({ getDashboardAnalytics: vi.fn(), getGoalAnalytics: vi.fn() }));
vi.mock("@/services/review.service", () => ({ getGoalReviewPageData: vi.fn() }));
vi.mock("@/services/ai.service", () => {
  const mockInterpret = (text: string) => ({
    input: text,
    normalizedText: text.toLocaleLowerCase("id-ID"),
    intent: text.includes("random") || text.includes("yang tadi") ? "UNKNOWN" : "TASK_COMPLETE",
    confidence: text.includes("random") ? 0 : 0.74,
    confidenceLevel: text.includes("random") ? "LOW" : "MEDIUM",
    entities: [],
    source: "baseline" as const,
  });
  return {
    interpretInput: vi.fn(mockInterpret),
    interpretInputHybrid: vi.fn(async (text: string) => mockInterpret(text)),
  };
});
import { canRead, canWrite, createConfirmationToken } from "../src/ai/safety";
import { aiCommandSchema } from "../src/schemas/ai-command.schema";
import { executeAICommand, resolveContextInterpretation } from "../src/services/ai-command.service";
import { interpretInput } from "../src/services/ai.service";

describe("AI command safety", () => {
  it("gates reads and writes by confidence and confirmation", () => {
    expect(canRead("LOW")).toBe(false);
    expect(canRead("MEDIUM")).toBe(true);
    expect(canWrite("MEDIUM", false)).toBe(false);
    expect(canWrite("MEDIUM", true)).toBe(true);
  });

  it("validates command payloads at the boundary", () => {
    expect(aiCommandSchema.safeParse({ text: "  lihat hari ini  " }).success).toBe(true);
    expect(aiCommandSchema.safeParse({ text: "" }).success).toBe(false);
    expect(aiCommandSchema.safeParse({ text: "x", context: { taskId: "" } }).success).toBe(false);
  });

  it("falls back safely for unknown and low-confidence input", async () => {
    const result = await executeAICommand({ text: "random nonsense xyz" });
    expect(result).toMatchObject({ success: false, code: "SAFE_FALLBACK", interpretation: { intent: "UNKNOWN" } });
  });

  it("uses explicit task context for an otherwise ambiguous reference", () => {
    const result = resolveContextInterpretation({ text: "yang tadi gimana?", context: { taskId: "task-1" } }, interpretInput("yang tadi gimana?"));
    expect(result.intent).toBe("TASK_STATUS");
  });

  it("requires confirmation before a write command", async () => {
    const result = await executeAICommand({ text: "selesaikan task Belajar Python", context: { taskName: "Belajar Python" } });
    expect(result).toMatchObject({ success: false, code: "CONFIRMATION_REQUIRED", requiresConfirmation: true });
    expect(result.confirmationToken).toBeTruthy();
  });

  it("rejects a confirmed write without a server-issued confirmation token", async () => {
    const result = await executeAICommand({ text: "selesaikan task Belajar Python", confirmed: true, context: { taskName: "Belajar Python" } });
    expect(result).toMatchObject({ success: false, code: "CONFIRMATION_REQUIRED" });
  });

  it("rejects a confirmed write with a confirmation token bound to another intent", async () => {
    const other = createConfirmationToken("FOCUS");
    const result = await executeAICommand({ text: "selesaikan task Belajar Python", confirmed: true, confirmationToken: other.token, context: { taskName: "Belajar Python" } });
    expect(result).toMatchObject({ success: false, code: "CONFIRMATION_REQUIRED" });
  });

  it("executes a confirmed write that carries a valid confirmation token", async () => {
    const issued = await executeAICommand({ text: "selesaikan task Belajar Python", context: { taskName: "Belajar Python" } });
    const result = await executeAICommand({ text: "selesaikan task Belajar Python", confirmed: true, confirmationToken: issued.confirmationToken, context: { taskName: "Belajar Python" } });
    expect(result.code).toBe("TASK_NOT_FOUND");
  });
});
