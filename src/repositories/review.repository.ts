import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export function createReview(userId: string, data: Prisma.ReviewUncheckedCreateInput) {
  return prisma.review.create({ data: { ...data, userId } });
}

export function findReviewById(userId: string, id: string) {
  return prisma.review.findFirst({ where: { id, userId }, include: { goal: true } });
}

export function findReviewsByGoalId(userId: string, goalId: string) {
  return prisma.review.findMany({ where: { goalId, userId }, orderBy: { periodStart: "desc" } });
}

export function findReviewByGoalAndPeriod(userId: string, goalId: string, periodStart: Date, periodEnd: Date) {
  return prisma.review.findFirst({ where: { goalId, userId, periodStart, periodEnd } });
}

export function updateReview(userId: string, id: string, data: Prisma.ReviewUpdateInput) {
  return prisma.review.updateMany({ where: { id, userId }, data }).then(() => prisma.review.findFirstOrThrow({ where: { id, userId } }));
}

export function findGoalForReview(userId: string, goalId: string) {
  return prisma.goal.findFirst({ where: { id: goalId, userId } });
}

export function findGoalReviewContext(userId: string, goalId: string) {
  return prisma.goal.findUnique({
    where: { id: goalId, userId },
    include: { stages: { include: { tasks: true } } },
  });
}

export function findReviewMetrics(userId: string, goalId: string, periodStart: Date, periodEnd: Date) {
  return Promise.all([
    prisma.session.aggregate({
      where: { userId, task: { stage: { goalId } }, endedAt: { gte: periodStart, lte: periodEnd } },
      _sum: { durationMinutes: true },
    }),
    prisma.session.aggregate({
      where: { userId, task: { stage: { goalId } }, endedAt: { gte: periodStart, lte: periodEnd }, understanding: { not: null } },
      _avg: { understanding: true },
    }),
    prisma.task.count({ where: { userId, stage: { goalId }, status: "COMPLETED", completedAt: { gte: periodStart, lte: periodEnd } } }),
  ]);
}

export function findUserReviews(userId: string, limit = 50) {
  return prisma.review.findMany({
    where: { userId },
    orderBy: { periodStart: "desc" },
    take: limit,
    include: { goal: { select: { id: true, title: true, status: true } } },
  });
}

export const findAllReviews = findUserReviews;

export function deleteReview(userId: string, id: string) {
  return prisma.review.deleteMany({
    where: { id, userId },
  });
}

export async function findWeeklyReviewDashboardData(userId: string, periodStart: Date) {
  const [goals, reviewedList, captures, sessionReflections] = await Promise.all([
    prisma.goal.findMany({
      where: { userId, status: { not: "COMPLETED" } },
      orderBy: { updatedAt: "desc" },
      include: {
        stages: {
          orderBy: { order: "asc" },
          include: { tasks: true },
        },
      },
    }),
    prisma.review.findMany({
      where: { userId, periodStart },
      select: { goalId: true },
    }),
    prisma.capture.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.session.findMany({
      where: {
        userId,
        OR: [{ obstacle: { not: null } }, { understanding: { not: null } }],
      },
      orderBy: { startedAt: "desc" },
      take: 20,
      include: {
        task: {
          include: {
            stage: {
              include: {
                goal: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    goals,
    reviewedGoalIds: new Set(reviewedList.map((r) => r.goalId)),
    captures,
    sessionReflections,
  };
}

export async function findBatchReviewData(userId: string, periodStart: Date, periodEnd: Date) {
  const [reviews, sessions, completedTasks] = await Promise.all([
    prisma.review.findMany({
      where: { userId, periodStart, periodEnd },
    }),
    prisma.session.findMany({
      where: {
        userId,
        endedAt: { gte: periodStart, lte: periodEnd },
      },
      select: {
        durationMinutes: true,
        understanding: true,
        task: {
          select: {
            stage: {
              select: { goalId: true },
            },
          },
        },
      },
    }),
    prisma.task.findMany({
      where: {
        userId,
        status: "COMPLETED",
        completedAt: { gte: periodStart, lte: periodEnd },
      },
      select: {
        stage: {
          select: { goalId: true },
        },
      },
    }),
  ]);

  return { reviews, sessions, completedTasks };
}
