import {
  countDailyFocusByDate,
  createDailyFocus as createDailyFocusRecord,
  deleteDailyFocus as deleteDailyFocusRecord,
  findDailyFocusByDate,
  findDailyFocusById,
  findDailyFocusHistory,
  findFocusByDateAndTask,
  updateDailyFocusOrder,
} from "@/repositories/daily-focus.repository";
import { findTask } from "@/repositories/task.repository";
import { requireUserId } from "@/lib/ownership";
import {
  createDailyFocusSchema,
  reorderDailyFocusSchema,
  type CreateDailyFocusInput,
  type ReorderDailyFocusInput,
} from "@/schemas/daily-focus.schema";

export class DailyFocusServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "TASK_NOT_FOUND"
      | "FOCUS_NOT_FOUND"
      | "ALREADY_FOCUSED"
      | "COMPLETED_TASK"
      | "INVALID_INPUT" = "FOCUS_NOT_FOUND"
  ) {
    super(message);
    this.name = "DailyFocusServiceError";
  }
}

export function normalizeDate(dateInput?: string | Date): Date {
  const d = dateInput ? new Date(dateInput) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getDailyFocus(dateInput?: string | Date, userId?: string) {
  const owner = requireUserId(userId);
  const date = normalizeDate(dateInput);
  return findDailyFocusByDate(owner, date);
}

export async function addDailyFocus(input: CreateDailyFocusInput, userId?: string) {
  const owner = requireUserId(userId);
  const parsed = createDailyFocusSchema.parse(input);
  const date = normalizeDate(parsed.date);

  const task = await findTask(owner, parsed.taskId);
  if (!task) {
    throw new DailyFocusServiceError("Task tidak ditemukan.", "TASK_NOT_FOUND");
  }
  if (task.status === "COMPLETED") {
    throw new DailyFocusServiceError(
      "Task yang sudah selesai tidak dapat ditambahkan ke fokus aktif.",
      "COMPLETED_TASK"
    );
  }

  const existing = await findFocusByDateAndTask(owner, date, parsed.taskId);
  if (existing) {
    throw new DailyFocusServiceError("Task sudah ada di fokus hari ini.", "ALREADY_FOCUSED");
  }

  const currentCount = await countDailyFocusByDate(owner, date);
  const order = parsed.order ?? currentCount;

  return createDailyFocusRecord(owner, {
    date,
    taskId: parsed.taskId,
    order,
  });
}

export async function removeDailyFocus(id: string, userId?: string) {
  const owner = requireUserId(userId);
  const existing = await findDailyFocusById(owner, id);
  if (!existing) {
    throw new DailyFocusServiceError("Fokus tidak ditemukan.", "FOCUS_NOT_FOUND");
  }
  await deleteDailyFocusRecord(owner, id);
  return { success: true, id };
}

export async function reorderDailyFocus(
  id: string,
  input: ReorderDailyFocusInput,
  userId?: string
) {
  const owner = requireUserId(userId);
  const parsed = reorderDailyFocusSchema.parse(input);
  const focus = await findDailyFocusById(owner, id);
  if (!focus) {
    throw new DailyFocusServiceError("Fokus tidak ditemukan.", "FOCUS_NOT_FOUND");
  }

  const allItems = await findDailyFocusByDate(owner, focus.date);
  const currentIndex = allItems.findIndex((item) => item.id === id);
  if (currentIndex === -1) return focus;

  if (parsed.direction) {
    const targetIndex = parsed.direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= allItems.length) {
      return focus;
    }
    
    // Normalize and swap indices cleanly
    const reordered = [...allItems];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    // Save strictly sequential orders for all items to avoid any duplicate or stale orders
    await Promise.all(
      reordered.map((item, idx) => updateDailyFocusOrder(owner, item.id, idx))
    );

    return findDailyFocusById(owner, id);
  }

  if (typeof parsed.order === "number") {
    await updateDailyFocusOrder(owner, id, parsed.order);
    return findDailyFocusById(owner, id);
  }

  return focus;
}

export async function getDailyFocusHistoryList(userId?: string, limit = 30) {
  const owner = requireUserId(userId);
  return findDailyFocusHistory(owner, limit);
}
