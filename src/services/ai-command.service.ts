import { completeTask, createTask, findMatchingTasks, findTask, getTaskDetail, reopenTask, deleteTask } from "@/services/task.service";
import { createGoal, deleteGoal, findGoal } from "@/services/goal.service";
import { endSession, getAnyActiveSession, startSession } from "@/services/session.service";
import { addTodayFocus, getToday } from "@/services/today.service";
import { getDashboardAnalytics, getGoalAnalytics } from "@/services/analytics.service";
import { getGoalReviewPageData } from "@/services/review.service";
import { interpretInput, interpretInputHybrid } from "@/services/ai.service";
import { routeIntent } from "../ai/router";
import { canRead, canWrite, createConfirmationToken, verifyConfirmationToken } from "../ai/safety";
import { requireUserId } from "@/lib/ownership";
import { aiCommandSchema, type AICommandInput } from "../schemas/ai-command.schema";
import { formatDuration } from "../lib/format";
import { resolveGoalEntity, resolveStageEntity, resolveTaskEntity } from "../ai/resolver/entity-resolver";
import { addConversationTurn, getConversationContext, updateConversationContext } from "../ai/context/conversation-state";
import { resolveContextReferences } from "../ai/context/context-resolver";
import { buildExecutionPlan, executePlan } from "../ai/planner/decision-engine";
import { executeTool } from "../ai/tools/registry";
import { prisma } from "@/lib/prisma";
import { buildSafeContext } from "../ai/llm/safe-context-builder";

type CommandResult = {
  success: boolean;
  code: string;
  message: string;
  interpretation: ReturnType<typeof interpretInput>;
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

const writeIntents = new Set([
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
  "SESSION_START",
  "SESSION_END",
  "FOCUS",
  "MULTI_STEP",
]);

function entityValue(input: ReturnType<typeof interpretInput>, type: "GOAL" | "TASK" | "STAGE") {
  return input.entities.find((entity) => entity.type === type)?.value;
}

export function resolveContextInterpretation(input: AICommandInput, baseInterpretation: ReturnType<typeof interpretInput>) {
  if (baseInterpretation.intent === "UNKNOWN" && input.context?.taskId && /yang tadi|yang ini|task itu/.test(baseInterpretation.normalizedText)) {
    return {
      ...baseInterpretation,
      intent: "TASK_STATUS" as const,
      confidence: 0.56,
      confidenceLevel: "MEDIUM" as const,
    };
  }
  return baseInterpretation;
}

async function resolveTask(query: string | undefined, taskId: string | undefined, userId?: string) {
  const owner = requireUserId(userId);
  if (taskId) {
    const task = await findTask(owner, taskId);
    return task ? [task] : [];
  }
  if (!query) return [];

  // Use fuzzy resolver first
  const res = await resolveTaskEntity(query, owner);
  if (res.resolvedEntity) {
    const task = await findTask(owner, res.resolvedEntity.id);
    return task ? [task] : [];
  }
  if (res.status === "AMBIGUOUS") {
    const tasks = await Promise.all(res.candidates.map((c) => findTask(owner, c.id)));
    return tasks.filter((t): t is NonNullable<typeof t> => t !== null);
  }

  // Fallback to substring match
  return findMatchingTasks(query, owner);
}

async function resolveWriteTarget(intent: string, input: AICommandInput, interpretation: ReturnType<typeof interpretInput>, userId?: string) {
  const owner = requireUserId(userId);
  const query = input.context?.taskName ?? entityValue(interpretation, "TASK");
  if (query || input.context?.taskId) {
    return resolveTask(query, input.context?.taskId, owner);
  }
  const tasks = await findMatchingTasks("", owner);
  if (intent === "TASK_REOPEN") {
    return tasks.filter((task) => task.status === "COMPLETED");
  }
  return tasks.filter((task) => task.status !== "COMPLETED");
}

function confirmation(
  input: AICommandInput,
  interpretation: ReturnType<typeof interpretInput>,
  userId?: string,
  extraMessage?: string,
  candidates?: Array<{ id: string; name: string; type: string; parentName?: string }>
) {
  const { token } = createConfirmationToken(interpretation.intent, userId);
  return {
    success: false,
    code: "CONFIRMATION_REQUIRED",
    message: extraMessage ?? `Saya memahami perintah ${interpretation.intent}. Anda bisa menjalankannya melalui tombol Konfirmasi.`,
    interpretation,
    requiresConfirmation: true,
    confirmationToken: token,
    ambiguityCandidates: candidates,
  } satisfies CommandResult;
}

export async function executeAICommand(rawInput: AICommandInput, userId?: string): Promise<CommandResult> {
  const input = aiCommandSchema.parse(rawInput);
  const owner = requireUserId(userId);
  const convContext = getConversationContext(owner);

  // Record user turn
  addConversationTurn(owner, {
    role: "user",
    text: input.text,
  });

  const safeCtx = await buildSafeContext(owner, input.context?.goalName ? `Goal: ${input.context.goalName}` : undefined);
  const baseInterpretation = await interpretInputHybrid(input.text, safeCtx);
  const interpretation = resolveContextInterpretation(input, baseInterpretation);
  const { intent, confidenceLevel } = interpretation;

  // Context and reference resolution
  resolveContextReferences(input.text, convContext, input.context);

  if (intent === "UNKNOWN" || !canRead(confidenceLevel)) {
    return {
      success: false,
      code: "SAFE_FALLBACK",
      message: "Saya belum cukup yakin memahami perintah itu. Coba gunakan tujuan yang lebih spesifik.",
      interpretation,
    };
  }

  // Check confirmation for write intents
  if (writeIntents.has(intent)) {
    const approved = canWrite(confidenceLevel, input.confirmed) && verifyConfirmationToken(input.confirmationToken, intent, owner);
    if (!approved) {
      // Build execution preview if planner can decompose
      const previewPlan = await buildExecutionPlan(input.text, intent, interpretation.entities, convContext, input.context);
      if (previewPlan.type === "AMBIGUOUS") {
        return {
          success: false,
          code: "AMBIGUOUS_TASK",
          message: previewPlan.message,
          interpretation,
          requiresConfirmation: false,
          ambiguityCandidates: previewPlan.ambiguityCandidates,
        };
      }
      const taskNamePreview = input.context?.taskName ?? entityValue(interpretation, "TASK");
      const confirmMessage =
        previewPlan.type !== "FALLBACK"
          ? previewPlan.message
          : intent === "TASK_CREATE"
          ? `Buat task baru "${taskNamePreview || input.text}"? Konfirmasi untuk melanjutkan.`
          : undefined;
      return confirmation(input, interpretation, owner, confirmMessage);
    }
  }

  switch (intent) {
    // ── MULTI-STEP / PLANNER ──────────────────────────────
    case "MULTI_STEP": {
      const plan = await buildExecutionPlan(input.text, intent, interpretation.entities, convContext, input.context);
      if (plan.steps.length === 0) {
        return { success: false, code: "PLAN_FAILED", message: "Gagal menyusun rencana multi-langkah.", interpretation };
      }
      const execResult = await executePlan(plan, owner);
      return {
        success: execResult.success,
        code: execResult.success ? "EXECUTED" : "FAILED",
        message: execResult.message,
        interpretation,
        data: execResult.results,
        plan: plan.steps,
      };
    }

    // ── BULK OPERATIONS ───────────────────────────────────
    case "TASK_BULK_DELETE": {
      const goalQuery = entityValue(interpretation, "GOAL") || input.context?.goalName;
      let goalId = input.context?.goalId;
      if (!goalId && goalQuery) {
        const gRes = await resolveGoalEntity(goalQuery, owner);
        if (gRes.resolvedEntity) goalId = gRes.resolvedEntity.id;
      }
      const result = await executeTool("bulk_delete_tasks", { goalId, status: "COMPLETED" }, { userId: owner });
      return {
        success: result.success,
        code: result.success ? "DELETED" : "FAILED",
        message: result.message,
        interpretation,
        data: result.data,
      };
    }

    case "TASK_BULK_COMPLETE": {
      const goalQuery = entityValue(interpretation, "GOAL") || input.context?.goalName;
      let goalId = input.context?.goalId;
      if (!goalId && goalQuery) {
        const gRes = await resolveGoalEntity(goalQuery, owner);
        if (gRes.resolvedEntity) goalId = gRes.resolvedEntity.id;
      }
      const result = await executeTool("bulk_complete_tasks", { goalId }, { userId: owner });
      return {
        success: result.success,
        code: result.success ? "COMPLETED" : "FAILED",
        message: result.message,
        interpretation,
        data: result.data,
      };
    }

    // ── READ INTENTS ──────────────────────────────────────
    case "TODAY": {
      const data = await getToday(new Date(), owner);
      return {
        success: true,
        code: "OK",
        message: data.nextAction ? `Next action: ${data.nextAction.taskName}.` : "Belum ada task aktif untuk hari ini.",
        interpretation,
        data,
      };
    }

    case "NEXT_ACTION": {
      const data = (await getToday(new Date(), owner)).nextAction;
      return {
        success: true,
        code: "OK",
        message: data ? `Aksi berikutnya: ${data.taskName}.` : "Belum ada next action.",
        interpretation,
        data,
      };
    }

    case "PROGRESS":
    case "GOAL_STATUS": {
      const data = input.context?.goalId
        ? await getGoalAnalytics(input.context.goalId, undefined, undefined, owner)
        : await getDashboardAnalytics({ days: 30 }, owner);
      return {
        success: true,
        code: "OK",
        message: `Progress saat ini ${data.summary.completionRate}%.`,
        interpretation,
        data,
      };
    }

    case "ANALYTICS":
    case "STREAK":
    case "TIME_SPENT":
    case "COMPLETION":
    case "BOTTLENECK": {
      const data = await getDashboardAnalytics({ days: 30 }, owner);
      return {
        success: true,
        code: "OK",
        message: `Ringkasan 30 hari: ${formatDuration(data.summary.totalMinutes)} fokus, ${data.summary.completedTasks} task selesai, streak ${data.summary.currentStreak} hari.`,
        interpretation,
        data,
      };
    }

    case "TASK_STATUS": {
      if (input.context?.taskId) {
        const data = await getTaskDetail(input.context.taskId, owner);
        return {
          success: true,
          code: "OK",
          message: data ? `Status task: ${data.task.status}.` : "Task tidak ditemukan.",
          interpretation,
          data,
        };
      }
      const query = input.context?.taskName ?? entityValue(interpretation, "TASK");
      const data = query ? await findMatchingTasks(query, owner) : await findMatchingTasks("", owner);
      return {
        success: true,
        code: "OK",
        message: data.length ? `Ditemukan ${data.length} task: ${data.map((task: { title?: string; name?: string }) => task.title ?? task.name).join(", ")}.` : "Tidak ada task yang cocok.",
        interpretation,
        data,
      };
    }

    case "TASK_SEARCH": {
      const query = input.context?.taskName ?? entityValue(interpretation, "TASK");
      const data = query ? await findMatchingTasks(query, owner) : await findMatchingTasks("", owner);
      return {
        success: true,
        code: "OK",
        message: data.length ? `Ditemukan ${data.length} task: ${data.map((task: { title?: string; name?: string }) => task.title ?? task.name).join(", ")}.` : "Tidak ada task yang cocok.",
        interpretation,
        data,
      };
    }

    case "OVERDUE": {
      const data = (await getToday(new Date(), owner)).overdueTasks;
      return {
        success: true,
        code: "OK",
        message: data.length ? `Ada ${data.length} task yang melewati deadline.` : "Tidak ada task overdue.",
        interpretation,
        data,
      };
    }

    // ── FOCUS INTENT ──────────────────────────────────────
    case "FOCUS": {
      if (input.confirmed) {
        const matches = await resolveWriteTarget("FOCUS", input, interpretation, owner);
        if (matches.length !== 1) {
          return {
            success: false,
            code: matches.length ? "AMBIGUOUS_TASK" : "TASK_NOT_FOUND",
            message: matches.length ? "Pilih satu task untuk fokus." : "Task fokus tidak ditemukan.",
            interpretation,
            data: matches,
            confirmationToken: createConfirmationToken("FOCUS", owner).token,
          };
        }
        const focused = await addTodayFocus(matches[0].id, new Date(), owner);
        return {
          success: true,
          code: "FOCUSED",
          message: `Task ${matches[0].title} ditambahkan ke fokus hari ini.`,
          interpretation,
          data: focused,
        };
      }
      const data = await getToday(new Date(), owner);
      return {
        success: true,
        code: "OK",
        message: data.focusTasks.length ? `Fokus hari ini: ${data.focusTasks.map((item) => item.task.title).join(", ")}.` : "Belum ada fokus hari ini.",
        interpretation,
        data: data.focusTasks,
      };
    }

    // ── REVIEW & REFLECTION ───────────────────────────────
    case "REVIEW":
    case "REFLECTION": {
      if (input.context?.goalId) {
        const data = await getGoalReviewPageData(input.context.goalId, owner);
        return {
          success: true,
          code: "OK",
          message: data ? "Data review goal berhasil ditemukan." : "Goal tidak ditemukan.",
          interpretation,
          data,
        };
      }
      return {
        success: true,
        code: "GUIDANCE",
        message: "Gunakan halaman Review untuk melihat atau menulis refleksi berbasis data sesi.",
        interpretation,
      };
    }

    case "HELP":
    case "MOTIVATION":
      return {
        success: true,
        code: "GUIDANCE",
        message: "Saya dapat membantu melihat hari ini, progress, analytics, task, session, fokus, dan review.",
        interpretation,
      };

    // ── GOAL CRUD ─────────────────────────────────────────
    case "GOAL_CREATE": {
      const name = input.context?.goalName ?? entityValue(interpretation, "GOAL");
      if (!name) {
        return { success: false, code: "MISSING_GOAL_NAME", message: "Sebutkan nama goal yang ingin dibuat.", interpretation };
      }
      const data = await createGoal({ title: name, name, type: "LEARNING", priority: "MEDIUM" }, owner);
      updateConversationContext(owner, () => ({
        currentGoal: { id: data.id, name: data.title },
        lastReferencedEntity: { id: data.id, name: data.title, type: "GOAL" },
      }));
      return { success: true, code: "CREATED", message: `Goal ${data.title} berhasil dibuat.`, interpretation, data };
    }

    case "GOAL_DELETE": {
      const goalQuery = input.context?.goalName ?? entityValue(interpretation, "GOAL");
      const goalId = input.context?.goalId;
      if (!goalId && !goalQuery) {
        return { success: false, code: "MISSING_GOAL_NAME", message: "Sebutkan nama goal yang ingin dihapus.", interpretation };
      }
      let targetId = goalId;
      if (!targetId && goalQuery) {
        const res = await resolveGoalEntity(goalQuery, owner);
        if (res.status === "AMBIGUOUS") {
          return {
            success: false,
            code: "AMBIGUOUS_ENTITY",
            message: `Ditemukan beberapa goal. Pilih satu:`,
            interpretation,
            ambiguityCandidates: res.candidates.map((c) => ({ id: c.id, name: c.name, type: "GOAL" })),
          };
        }
        if (!res.resolvedEntity) {
          return { success: false, code: "GOAL_NOT_FOUND", message: `Goal "${goalQuery}" tidak ditemukan.`, interpretation };
        }
        targetId = res.resolvedEntity.id;
      }
      const deleted = await deleteGoal(targetId!, owner);
      return { success: true, code: "DELETED", message: `Goal berhasil dihapus.`, interpretation, data: deleted };
    }

    // ── STAGE CRUD ────────────────────────────────────────
    case "STAGE_CREATE": {
      const name = entityValue(interpretation, "STAGE");
      const goalId = input.context?.goalId ?? convContext.currentGoal?.id;
      if (!name) {
        return { success: false, code: "MISSING_STAGE_CONTEXT", message: "Sebutkan nama stage yang ingin dibuat.", interpretation };
      }
      if (!goalId) {
        return { success: false, code: "MISSING_GOAL_NAME", message: "Tentukan goal untuk stage ini.", interpretation };
      }
      const stageToolRes = await executeTool("create_stage", { goalId, name }, { userId: owner });
      if (!stageToolRes.success) {
        return { success: false, code: "STAGE_CREATE_FAILED", message: stageToolRes.message, interpretation };
      }
      const data = stageToolRes.data as { id: string; name: string };
      updateConversationContext(owner, () => ({
        currentStage: { id: data.id, name: data.name, goalId },
        lastReferencedEntity: { id: data.id, name: data.name, type: "STAGE" },
      }));
      return { success: true, code: "CREATED", message: stageToolRes.message, interpretation, data };
    }

    case "STAGE_DELETE": {
      const stageQuery = entityValue(interpretation, "STAGE");
      let stageId = input.context?.stageId;
      if (!stageId && stageQuery) {
        const sRes = await resolveStageEntity(stageQuery, owner, input.context?.goalId);
        if (sRes.resolvedEntity) stageId = sRes.resolvedEntity.id;
      }
      if (!stageId) {
        return { success: false, code: "STAGE_NOT_FOUND", message: "Stage yang dimaksud tidak ditemukan.", interpretation };
      }
      const res = await executeTool("delete_stage", { id: stageId }, { userId: owner });
      return { success: res.success, code: res.success ? "DELETED" : "FAILED", message: res.message, interpretation, data: res.data };
    }

    // ── TASK CRUD ─────────────────────────────────────────
    case "TASK_CREATE": {
      let name = input.context?.taskName ?? entityValue(interpretation, "TASK");
      if (!name) {
        const cleaned = input.text
          .replace(/^(?:buat(?:kan)?|bikin|tambah(?:kan)?)\s+(?:task|tugas|pekerjaan)\s+/i, "")
          .replace(/\s+(?:besok|lusa|hari ini|nanti|jam\s+\d+|pukul\s+\d+|selama\s+\d+).*$/i, "")
          .trim();
        if (cleaned.length > 1) {
          name = cleaned;
        }
      }
      let stageId = input.context?.stageId ?? convContext.currentStage?.id;

      if (!stageId) {
        const goalId = input.context?.goalId ?? convContext.currentGoal?.id;
        if (goalId) {
          const stage = await prisma.stage.findFirst({
            where: { goalId, userId: owner },
            orderBy: { order: "asc" },
          });
          if (stage) stageId = stage.id;
        }
      }

      if (!stageId) {
        const stage = await prisma.stage.findFirst({
          where: { userId: owner },
          orderBy: { createdAt: "desc" },
        });
        if (stage) {
          stageId = stage.id;
        } else {
          let goal = await prisma.goal.findFirst({
            where: { userId: owner },
            orderBy: { createdAt: "desc" },
          });
          if (!goal) {
            goal = await prisma.goal.create({
              data: {
                userId: owner,
                title: "General",
                type: "LEARNING",
                priority: "MEDIUM",
              },
            });
          }
          const newStage = await prisma.stage.create({
            data: {
              goalId: goal.id,
              userId: owner,
              name: "To Do",
              order: 0,
            },
          });
          stageId = newStage.id;
        }
      }

      if (!name || !stageId) {
        return {
          success: false,
          code: "MISSING_TASK_CONTEXT",
          message: "Nama task dan stageId diperlukan untuk membuat task.",
          interpretation,
        };
      }

      const rawDue = interpretation.entities.find((e) => e.type === "DATE")?.value;
      let dueDate: Date | undefined;
      if (rawDue) {
        const parsed = new Date(rawDue);
        if (!isNaN(parsed.getTime())) dueDate = parsed;
      }

      const data = (await createTask(
        { stageId, name, type: "TASK", priority: "MEDIUM", estimatedHours: 0, dueDate, description: null, notes: null },
        owner
      )) as { id: string; name: string };
      updateConversationContext(owner, () => ({
        currentTask: { id: data.id, name: data.name, stageId, goalId: "" },
        lastReferencedEntity: { id: data.id, name: data.name, type: "TASK" },
      }));
      return { success: true, code: "CREATED", message: `Task "${data.name}" berhasil dibuat.`, interpretation, data };
    }

    case "TASK_COMPLETE":
    case "TASK_REOPEN": {
      const matches = await resolveWriteTarget(intent, input, interpretation, owner);
      if (matches.length !== 1) {
        return {
          success: false,
          code: matches.length ? "AMBIGUOUS_TASK" : "TASK_NOT_FOUND",
          message: matches.length ? "Saya menemukan beberapa task yang cocok. Pilih satu task terlebih dahulu." : "Task yang dimaksud tidak ditemukan.",
          interpretation,
          data: matches,
          confirmationToken: createConfirmationToken(intent, owner).token,
          ambiguityCandidates: matches.map((m) => ({ id: m.id, name: m.title, type: "TASK" })),
        };
      }
      const data = intent === "TASK_COMPLETE" ? await completeTask(matches[0].id, owner) : await reopenTask(matches[0].id, owner);
      return { success: true, code: "UPDATED", message: `Task ${data.title} berhasil diperbarui.`, interpretation, data };
    }

    case "TASK_DELETE": {
      const matches = await resolveWriteTarget("TASK_DELETE", input, interpretation, owner);
      if (matches.length !== 1) {
        return {
          success: false,
          code: matches.length ? "AMBIGUOUS_TASK" : "TASK_NOT_FOUND",
          message: matches.length ? "Ditemukan beberapa task. Pilih satu task yang ingin dihapus:" : "Task yang ingin dihapus tidak ditemukan.",
          interpretation,
          data: matches,
          confirmationToken: createConfirmationToken("TASK_DELETE", owner).token,
          ambiguityCandidates: matches.map((m) => ({ id: m.id, name: m.title, type: "TASK" })),
        };
      }
      await deleteTask(matches[0].id, owner);
      return { success: true, code: "DELETED", message: `Task "${matches[0].title}" berhasil dihapus.`, interpretation, data: matches[0] };
    }

    // ── SESSION ───────────────────────────────────────────
    case "SESSION_START": {
      const matches = await resolveWriteTarget("SESSION_START", input, interpretation, owner);
      if (matches.length !== 1) {
        return {
          success: false,
          code: matches.length ? "AMBIGUOUS_TASK" : "TASK_NOT_FOUND",
          message: matches.length ? "Pilih satu task untuk memulai session." : "Task untuk session tidak ditemukan.",
          interpretation,
          data: matches,
          confirmationToken: createConfirmationToken("SESSION_START", owner).token,
        };
      }
      const data = await startSession(matches[0].id, owner);
      return { success: true, code: "STARTED", message: `Session untuk ${matches[0].title} dimulai.`, interpretation, data };
    }

    case "SESSION_END": {
      const active = await getAnyActiveSession(owner);
      if (!active) {
        return { success: false, code: "NO_ACTIVE_SESSION", message: "Tidak ada session aktif.", interpretation };
      }
      const data = await endSession(active.id, { sessionId: active.id }, owner);
      return { success: true, code: "ENDED", message: "Session aktif berhasil diakhiri.", interpretation, data };
    }

    // ── GOAL READ ─────────────────────────────────────────
    case "GOAL_GET": {
      const goalQuery = input.context?.goalName ?? entityValue(interpretation, "GOAL");
      const goalId = input.context?.goalId ?? convContext.currentGoal?.id;
      if (goalId) {
        const data = await findGoal(owner, goalId, true);
        if (!data) return { success: false, code: "GOAL_NOT_FOUND", message: "Goal tidak ditemukan.", interpretation };
        return { success: true, code: "OK", message: `Goal "${data.title}" ditemukan.`, interpretation, data };
      }
      if (!goalQuery) {
        return { success: false, code: "MISSING_GOAL_NAME", message: "Sebutkan nama goal yang ingin dilihat.", interpretation };
      }
      const gRes = await resolveGoalEntity(goalQuery, owner);
      if (gRes.status === "AMBIGUOUS") {
        return { success: false, code: "AMBIGUOUS_ENTITY", message: `Ditemukan beberapa goal cocok dengan "${goalQuery}". Pilih satu:`, interpretation, ambiguityCandidates: gRes.candidates.map((c) => ({ id: c.id, name: c.name, type: "GOAL" })) };
      }
      if (!gRes.resolvedEntity) {
        return { success: false, code: "GOAL_NOT_FOUND", message: `Goal "${goalQuery}" tidak ditemukan.`, interpretation };
      }
      const goalData = await findGoal(owner, gRes.resolvedEntity.id, true);
      return { success: true, code: "OK", message: `Goal "${gRes.resolvedEntity.name}" ditemukan.`, interpretation, data: goalData };
    }

    case "GOAL_UPDATE": {
      const goalQuery = input.context?.goalName ?? entityValue(interpretation, "GOAL");
      const goalId = input.context?.goalId ?? convContext.currentGoal?.id;
      let targetGoalId = goalId;
      let targetGoalName = goalQuery ?? "Goal";
      if (!targetGoalId && goalQuery) {
        const gRes = await resolveGoalEntity(goalQuery, owner);
        if (gRes.status === "AMBIGUOUS") {
          return { success: false, code: "AMBIGUOUS_ENTITY", message: `Ditemukan beberapa goal. Pilih satu:`, interpretation, ambiguityCandidates: gRes.candidates.map((c) => ({ id: c.id, name: c.name, type: "GOAL" })) };
        }
        if (!gRes.resolvedEntity) return { success: false, code: "GOAL_NOT_FOUND", message: `Goal "${goalQuery}" tidak ditemukan.`, interpretation };
        targetGoalId = gRes.resolvedEntity.id;
        targetGoalName = gRes.resolvedEntity.name;
      }
      if (!targetGoalId) {
        return { success: false, code: "MISSING_GOAL_NAME", message: "Sebutkan nama goal yang ingin diperbarui.", interpretation };
      }
      // Collect update payload from entities
      const newName = entityValue(interpretation, "GOAL") !== targetGoalName ? entityValue(interpretation, "GOAL") : undefined;
      const res = await executeTool("update_goal", { id: targetGoalId, name: newName }, { userId: owner });
      return { success: res.success, code: res.success ? "UPDATED" : "FAILED", message: res.success ? `Goal "${targetGoalName}" berhasil diperbarui.` : res.message, interpretation, data: res.data };
    }

    // ── STAGE READ ────────────────────────────────────────
    case "STAGE_STATUS": {
      const stageQuery = entityValue(interpretation, "STAGE");
      const stageId = input.context?.stageId ?? convContext.currentStage?.id;
      if (stageId) {
        const res = await executeTool("get_stage", { id: stageId }, { userId: owner });
        if (!res.success) return { success: false, code: "STAGE_NOT_FOUND", message: "Stage tidak ditemukan.", interpretation };
        return { success: true, code: "OK", message: res.message, interpretation, data: res.data };
      }
      if (!stageQuery) {
        return { success: false, code: "MISSING_STAGE_CONTEXT", message: "Sebutkan nama stage yang ingin dilihat.", interpretation };
      }
      const sRes = await resolveStageEntity(stageQuery, owner, input.context?.goalId);
      if (sRes.status === "AMBIGUOUS") {
        return { success: false, code: "AMBIGUOUS_ENTITY", message: `Ditemukan beberapa stage. Pilih satu:`, interpretation, ambiguityCandidates: sRes.candidates.map((c) => ({ id: c.id, name: c.name, type: "STAGE", parentName: c.parentName })) };
      }
      if (!sRes.resolvedEntity) return { success: false, code: "STAGE_NOT_FOUND", message: `Stage "${stageQuery}" tidak ditemukan.`, interpretation };
      const stageRes = await executeTool("get_stage", { id: sRes.resolvedEntity.id }, { userId: owner });
      return { success: stageRes.success, code: stageRes.success ? "OK" : "FAILED", message: stageRes.message, interpretation, data: stageRes.data };
    }

    case "STAGE_UPDATE": {
      const stageQuery = entityValue(interpretation, "STAGE");
      let stageId = input.context?.stageId ?? convContext.currentStage?.id;
      if (!stageId && stageQuery) {
        const sRes = await resolveStageEntity(stageQuery, owner, input.context?.goalId);
        if (sRes.status === "AMBIGUOUS") {
          return { success: false, code: "AMBIGUOUS_ENTITY", message: "Ditemukan beberapa stage. Pilih satu:", interpretation, ambiguityCandidates: sRes.candidates.map((c) => ({ id: c.id, name: c.name, type: "STAGE", parentName: c.parentName })) };
        }
        if (sRes.resolvedEntity) stageId = sRes.resolvedEntity.id;
      }
      if (!stageId) {
        return { success: false, code: "STAGE_NOT_FOUND", message: "Stage yang dimaksud tidak ditemukan.", interpretation };
      }
      const newStageName = stageQuery ?? undefined;
      const res = await executeTool("update_stage", { id: stageId, name: newStageName }, { userId: owner });
      return { success: res.success, code: res.success ? "UPDATED" : "FAILED", message: res.message, interpretation, data: res.data };
    }

    case "STAGE_REORDER": {
      const stageQuery = entityValue(interpretation, "STAGE");
      let stageId = input.context?.stageId ?? convContext.currentStage?.id;
      if (!stageId && stageQuery) {
        const sRes = await resolveStageEntity(stageQuery, owner, input.context?.goalId);
        if (sRes.status === "AMBIGUOUS") {
          return { success: false, code: "AMBIGUOUS_ENTITY", message: "Ditemukan beberapa stage. Pilih satu:", interpretation, ambiguityCandidates: sRes.candidates.map((c) => ({ id: c.id, name: c.name, type: "STAGE", parentName: c.parentName })) };
        }
        if (sRes.resolvedEntity) stageId = sRes.resolvedEntity.id;
      }
      if (!stageId) {
        return { success: false, code: "STAGE_NOT_FOUND", message: "Sebutkan stage yang ingin diubah urutannya.", interpretation };
      }
      const direction = interpretation.entities.find((e) => e.type === "DIRECTION")?.value;
      const dir = direction === "up" || direction === "naik" ? "up" : "down";
      const res = await executeTool("reorder_stage", { id: stageId, direction: dir }, { userId: owner });
      return { success: res.success, code: res.success ? "UPDATED" : "FAILED", message: res.message, interpretation, data: res.data };
    }

    // ── TASK UPDATE / REORDER ─────────────────────────────
    case "TASK_UPDATE": {
      const matches = await resolveWriteTarget("TASK_UPDATE", input, interpretation, owner);
      if (matches.length !== 1) {
        return {
          success: false,
          code: matches.length ? "AMBIGUOUS_TASK" : "TASK_NOT_FOUND",
          message: matches.length ? "Ditemukan beberapa task yang cocok. Pilih satu:" : "Task yang ingin diperbarui tidak ditemukan.",
          interpretation,
          data: matches,
          confirmationToken: createConfirmationToken("TASK_UPDATE", owner).token,
          ambiguityCandidates: matches.map((m) => ({ id: m.id, name: m.title, type: "TASK" })),
        };
      }
      const priorityEntity = interpretation.entities.find((e) => e.type === "PRIORITY");
      const priority = priorityEntity ? (priorityEntity.value as string) : undefined;
      const updatePayload: Record<string, unknown> = { id: matches[0].id };
      if (priority) updatePayload.priority = priority.toUpperCase();
      const res = await executeTool("update_task", updatePayload, { userId: owner });
      return { success: res.success, code: res.success ? "UPDATED" : "FAILED", message: res.success ? `Task "${matches[0].title}" berhasil diperbarui.` : res.message, interpretation, data: res.data };
    }

    case "TASK_REORDER": {
      // TASK_REORDER requires explicit UI; provide guidance
      return {
        success: false,
        code: "UNSUPPORTED_INTENT",
        message: "Untuk mengubah urutan task, gunakan fitur drag-and-drop di halaman Goal.",
        interpretation,
      };
    }

    default:
      return {
        success: false,
        code: "UNSUPPORTED_INTENT",
        message: `Intent ${routeIntent(intent).intent} belum memiliki command handler.`,
        interpretation,
      };
  }
}
