import {
  createReview as createReviewRecord,
  deleteReview as deleteReviewRecord,
  findGoalForReview,
  findGoalReviewContext,
  findReviewByGoalAndPeriod,
  findReviewById,
  findReviewMetrics,
  findReviewsByGoalId,
  findUserReviews,
  findWeeklyReviewDashboardData,
  findBatchReviewData,
  updateReview as updateReviewRecord,
} from "@/repositories/review.repository";
import type { ReviewInput } from "@/schemas/review.schema";
import { requireUserId } from "../lib/ownership";

export class ReviewServiceError extends Error {
  constructor(message: string, public readonly code: "GOAL_NOT_FOUND" | "REVIEW_NOT_FOUND") { super(message); }
}

async function derivedMetrics(userId: string, goalId: string, periodStart: Date, periodEnd: Date) {
  const [sessions, understanding, tasksCompleted] = await findReviewMetrics(userId, goalId, periodStart, periodEnd);
  return {
    learningMinutes: sessions._sum.durationMinutes ?? 0,
    learningHours: (sessions._sum.durationMinutes ?? 0) / 60,
    tasksCompleted,
    understanding: understanding._avg.understanding,
  };
}

export async function createReview(goalId: string, input: ReviewInput, userId?: string) {
  const owner = requireUserId(userId);
  if (!(await findGoalForReview(owner, goalId))) throw new ReviewServiceError("Goal tidak ditemukan.", "GOAL_NOT_FOUND");
  const metrics = await derivedMetrics(owner, goalId, input.periodStart, input.periodEnd);
  const existing = await findReviewByGoalAndPeriod(owner, goalId, input.periodStart, input.periodEnd);
  const dbData = {
    goalId,
    userId: owner,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    learningHours: metrics.learningHours,
    tasksCompleted: metrics.tasksCompleted,
    understanding: metrics.understanding ?? input.understanding,
    wentWell: input.wentWell,
    difficulties: input.difficulties,
    improvements: input.improvements,
    nextFocus: input.nextFocus,
  };
  if (existing) {
    const updateData = {
      learningHours: metrics.learningHours,
      tasksCompleted: metrics.tasksCompleted,
      understanding: metrics.understanding ?? input.understanding,
      wentWell: input.wentWell,
      difficulties: input.difficulties,
      improvements: input.improvements,
      nextFocus: input.nextFocus,
    };
    return updateReviewRecord(owner, existing.id, updateData);
  }
  return createReviewRecord(owner, dbData);
}

export function getReview(id: string, userId?: string) { return findReviewById(requireUserId(userId), id); }
export function getGoalReviews(goalId: string, userId?: string) { return findReviewsByGoalId(requireUserId(userId), goalId); }
export function getPeriodReview(goalId: string, periodStart: Date, periodEnd: Date, userId?: string) {
  return findReviewByGoalAndPeriod(requireUserId(userId), goalId, periodStart, periodEnd);
}

export async function getPeriodMetrics(goalId: string, periodStart: Date, periodEnd: Date, userId?: string) {
  return derivedMetrics(requireUserId(userId), goalId, periodStart, periodEnd);
}

export async function getGoalReviewPageData(goalId: string, userId?: string) {
  const owner = requireUserId(userId);
  const [goal, reviews] = await Promise.all([findGoalReviewContext(owner, goalId), findReviewsByGoalId(owner, goalId)]);
  if (!goal) return null;
  const period = getWeekPeriod();
  const [review, metrics] = await Promise.all([
    findReviewByGoalAndPeriod(owner, goalId, period.periodStart, period.periodEnd),
    derivedMetrics(owner, goalId, period.periodStart, period.periodEnd),
  ]);
  return { goal, reviews, period, review, metrics };
}

export async function updateReview(id: string, input: ReviewInput, userId?: string) {
  const owner = requireUserId(userId);
  const review = await findReviewById(owner, id);
  if (!review) throw new ReviewServiceError("Review tidak ditemukan.", "REVIEW_NOT_FOUND");
  const metrics = await derivedMetrics(owner, review.goalId, input.periodStart, input.periodEnd);
  const updateData = {
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    learningHours: metrics.learningHours,
    tasksCompleted: metrics.tasksCompleted,
    understanding: metrics.understanding ?? input.understanding,
    wentWell: input.wentWell,
    difficulties: input.difficulties,
    improvements: input.improvements,
    nextFocus: input.nextFocus,
  };
  return updateReviewRecord(owner, id, updateData);
}

export function getWeekPeriod(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay();
  const distanceFromMonday = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - distanceFromMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { periodStart: start, periodEnd: end };
}

export function getAllReviews(userId?: string, limit = 50) {
  return findUserReviews(requireUserId(userId), limit);
}

export async function deleteReviewItem(id: string, userId?: string) {
  const owner = requireUserId(userId);
  const existing = await findReviewById(owner, id);
  if (!existing) {
    throw new ReviewServiceError("Review tidak ditemukan.", "REVIEW_NOT_FOUND");
  }
  return deleteReviewRecord(owner, id);
}

export async function getWeeklyReviewOverview(userId?: string) {
  const owner = requireUserId(userId);
  const period = getWeekPeriod(new Date());
  return findWeeklyReviewDashboardData(owner, period.periodStart);
}

export async function getBatchPeriodReviewData(userId: string, periodStart: Date, periodEnd: Date) {
  const owner = requireUserId(userId);
  const { reviews, sessions, completedTasks } = await findBatchReviewData(owner, periodStart, periodEnd);

  const reviewMap = new Map<string, (typeof reviews)[0]>();
  for (const r of reviews) {
    reviewMap.set(r.goalId, r);
  }

  // Group sessions by goalId
  const sessionsByGoal = new Map<string, { duration: number; understandings: number[] }>();
  for (const s of sessions) {
    const goalId = s.task?.stage?.goalId;
    if (!goalId) continue;
    const current = sessionsByGoal.get(goalId) || { duration: 0, understandings: [] };
    current.duration += s.durationMinutes ?? 0;
    if (s.understanding !== null) current.understandings.push(s.understanding);
    sessionsByGoal.set(goalId, current);
  }

  // Group completed tasks by goalId
  const completedCountByGoal = new Map<string, number>();
  for (const t of completedTasks) {
    const goalId = t.stage?.goalId;
    if (!goalId) continue;
    completedCountByGoal.set(goalId, (completedCountByGoal.get(goalId) || 0) + 1);
  }

  return {
    getMetrics(goalId: string) {
      const sess = sessionsByGoal.get(goalId);
      const learningMinutes = sess?.duration ?? 0;
      const tasksCompleted = completedCountByGoal.get(goalId) ?? 0;
      const understanding = sess && sess.understandings.length > 0
        ? sess.understandings.reduce((a, b) => a + b, 0) / sess.understandings.length
        : null;

      return {
        learningMinutes,
        learningHours: learningMinutes / 60,
        tasksCompleted,
        understanding,
      };
    },
    getReview(goalId: string) {
      return reviewMap.get(goalId) ?? null;
    },
  };
}
