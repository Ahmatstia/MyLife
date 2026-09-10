/**
 * Safe Context Builder
 *
 * Constructs comprehensive, sanitized Life OS context for Gemini.
 * NEVER exposes raw DB data, user IDs, secrets, or other users' data.
 * Aggregates: Areas, Goals & Stages, Projects & Milestones, Tasks, Calendar Events, Capture Inbox.
 */

import { prisma } from "@/lib/prisma";
import { getToday } from "@/services/today.service";
import type { SafeAIContext } from "./gemini-bridge";

/**
 * Build a holistic sanitized context object safe to pass to Gemini.
 * All data is the authenticated user's own — never another user's (strict IDOR protection).
 */
export async function buildSafeContext(
  userId: string,
  currentPage?: string
): Promise<SafeAIContext> {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const [todayRes, areasRes, goalsRes, projectsRes, tasksRes, calendarRes, inboxRes, inboxCountRes] =
      await Promise.allSettled([
        getToday(now, userId),
        prisma.area.findMany({
          where: { userId, isActive: true },
          select: {
            name: true,
            description: true,
            goals: {
              where: { status: { not: "COMPLETED" } },
              select: { title: true },
              take: 4,
            },
          },
          orderBy: { order: "asc" },
        }),
        prisma.goal.findMany({
          where: { userId, status: { not: "COMPLETED" } },
          select: {
            title: true,
            type: true,
            priority: true,
            area: { select: { name: true } },
            stages: {
              select: { name: true, status: true, order: true },
              orderBy: { order: "asc" },
            },
          },
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          take: 8,
        }),
        prisma.project.findMany({
          where: { userId, status: { not: "COMPLETED" } },
          select: {
            title: true,
            status: true,
            area: { select: { name: true } },
            goal: { select: { title: true } },
            milestones: {
              select: { title: true, status: true },
              take: 3,
            },
          },
          take: 5,
        }),
        prisma.task.findMany({
          where: { userId, status: { in: ["TODO", "IN_PROGRESS"] } },
          select: {
            title: true,
            priority: true,
            dueDate: true,
            area: { select: { name: true } },
            goal: { select: { title: true } },
          },
          orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
          take: 12,
        }),
        prisma.calendarEvent.findMany({
          where: { userId, startTime: { gte: startOfDay, lte: endOfWeek } },
          select: { title: true, startTime: true, endTime: true, eventType: true },
          orderBy: { startTime: "asc" },
          take: 10,
        }),
        prisma.capture.findMany({
          where: { userId, status: "PENDING" },
          select: { content: true, category: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.capture.count({
          where: { userId, status: "PENDING" },
        }),
      ]);

    const today = todayRes.status === "fulfilled" ? todayRes.value : null;
    const areas =
      areasRes.status === "fulfilled"
        ? areasRes.value.map((a) => ({
            name: a.name,
            description: a.description ?? undefined,
            activeGoals: a.goals.map((g) => g.title),
          }))
        : [];
    const rawGoals = goalsRes.status === "fulfilled" ? goalsRes.value : [];
    const rawProjects = projectsRes.status === "fulfilled" ? projectsRes.value : [];
    const rawTasks = tasksRes.status === "fulfilled" ? tasksRes.value : [];
    const rawCalendar = calendarRes.status === "fulfilled" ? calendarRes.value : [];
    const rawInbox = inboxRes.status === "fulfilled" ? inboxRes.value : [];
    const inboxCount = inboxCountRes.status === "fulfilled" ? inboxCountRes.value : 0;

    const activeGoalTitles = rawGoals.map((g) => g.title);
    const goals = rawGoals.map((g) => ({
      title: g.title,
      type: g.type,
      priority: g.priority,
      areaName: g.area?.name,
      stages: g.stages.map((s) => `${s.name} (${s.status})`),
    }));

    const projects = rawProjects.map((p) => ({
      title: p.title,
      status: p.status,
      areaName: p.area?.name,
      goalTitle: p.goal?.title,
      milestones: p.milestones.map((m) => `${m.title} (${m.status})`),
    }));

    const recentTaskTitles = today
      ? [
          ...today.focusTasks.map((ft) => ft.task.title),
          ...(today.nextAction ? [today.nextAction.taskName] : []),
        ].slice(0, 5)
      : [];

    const tasks = {
      focus: today ? today.focusTasks.map((ft) => ft.task.title) : [],
      overdue: today ? today.overdueTasks.map((ot) => ot.title) : [],
      todo: rawTasks.map((t) => ({
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : undefined,
        areaName: t.area?.name,
        goalTitle: t.goal?.title,
      })),
      completedToday: today ? today.completedTasks.map((ct) => ct.title) : [],
    };

    const calendarEvents = rawCalendar.map((e) => ({
      title: e.title,
      startTime: e.startTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      endTime: e.endTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      isToday: e.startTime >= startOfDay && e.startTime < endOfDay,
    }));

    const inbox = {
      pendingCount: inboxCount,
      items: rawInbox.map((i) => ({
        content: i.content,
        category: i.category,
      })),
    };

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
      areas,
      goals,
      projects,
      tasks,
      calendarEvents,
      inbox,
    };
  } catch {
    // If context building fails, return minimal context rather than crashing
    return { currentPage };
  }
}
