/**
 * Safe Context Builder
 *
 * Constructs minimal, sanitized context for Gemini.
 * NEVER exposes raw DB data, user IDs, secrets, or other users' data.
 * Only aggregates and semantic titles are sent.
 */

import { getToday } from "@/services/today.service";
import { getGoals } from "@/services/goal.service";
import type { SafeAIContext } from "./gemini-bridge";

/**
 * Build a sanitized context object safe to pass to Gemini.
 * All data is the authenticated user's own — never another user's.
 */
export async function buildSafeContext(
  userId: string,
  currentPage?: string
): Promise<SafeAIContext> {
  try {
    const [todayData, goals] = await Promise.allSettled([
      getToday(new Date(), userId),
      getGoals(userId),
    ]);

    const today = todayData.status === "fulfilled" ? todayData.value : null;
    const goalList = goals.status === "fulfilled" ? goals.value : [];

    const activeGoalTitles = goalList
      .filter((g) => (g as { status?: string }).status !== "COMPLETED")
      .slice(0, 5)
      .map((g) => g.title);

    const recentTaskTitles = today
      ? [
          ...today.focusTasks.map((ft) => ft.task.title),
          ...(today.nextAction ? [today.nextAction.taskName] : []),
        ].slice(0, 5)
      : [];

    return {
      currentPage,
      activeGoalTitles,
      recentTaskTitles,
      todayStats: today
        ? {
            focusTaskCount: today.focusTasks.length,
            overdueCount: today.overdueTasks.length,
            completedToday: today.completedTasks.length,
          }
        : undefined,
    };
  } catch {
    // If context building fails, return minimal context rather than crashing
    return { currentPage };
  }
}
