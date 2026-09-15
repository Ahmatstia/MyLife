import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { createArea } from "../src/services/area.service";
import { createGoal } from "../src/services/goal.service";
import { createProject } from "../src/services/project.service";
import { createTask, completeTask } from "../src/services/task.service";
import { startSession, endSession } from "../src/services/session.service";
import { addDailyFocus } from "../src/services/daily-focus.service";
import { createCapture } from "../src/services/capture.service";
import { createReview, getWeekPeriod } from "../src/services/review.service";
import { createCalendarEvent } from "../src/services/calendar-event.service";

// Engines and Services under test
import { calculateTaskPriority, rankTasks } from "../src/services/insights/smart-priority.engine";
import { detectConflicts } from "../src/services/insights/conflict-detection.engine";
import { calculateLifeHealth } from "../src/services/insights/life-health.engine";
import {
  getInsightsAnalytics,
  getPrioritizedTasks,
  getInsightsDailyPlan,
  getInsightsConflicts,
  getInsightsUnifiedInbox,
  getInsightsLifeHealth,
  getTodayInsightsSummary,
} from "../src/services/insights/insights.service";
import { getInsightDateRange } from "../src/services/insights/analytics-insights.service";

// API Handlers
import { GET as getAnalyticsApi } from "../src/app/api/insights/analytics/route";
import { GET as getPriorityApi } from "../src/app/api/insights/priority/route";
import { GET as getDailyPlanApi } from "../src/app/api/insights/daily-plan/route";
import { GET as getConflictsApi } from "../src/app/api/insights/conflicts/route";
import { GET as getInboxApi } from "../src/app/api/insights/inbox/route";
import { GET as getLifeHealthApi } from "../src/app/api/insights/life-health/route";

import { createSessionToken, SESSION_COOKIE } from "../src/lib/auth";

const USER_A = "phase6_user_a";
const USER_B = "phase6_user_b";

describe("Phase 6: Insights & Life Intelligence Layer Verification", () => {
  let areaA: Awaited<ReturnType<typeof createArea>>;
  let goalA: Awaited<ReturnType<typeof createGoal>>;
  let projectA: Awaited<ReturnType<typeof createProject>>;
  let taskOverdue: Awaited<ReturnType<typeof createTask>>;
  let taskDueToday: Awaited<ReturnType<typeof createTask>>;
  let taskNormal: Awaited<ReturnType<typeof createTask>>;
  let taskCompleted: Awaited<ReturnType<typeof createTask>>;

  let tokenB: string;

  beforeAll(async () => {
    // Clean state
    await prisma.user.deleteMany({ where: { id: { in: [USER_A, USER_B] } } });
    await prisma.user.createMany({
      data: [
        { id: USER_A, email: "p6_user_a@phase6.test", name: "User A" },
        { id: USER_B, email: "p6_user_b@phase6.test", name: "User B" },
      ],
    });

    tokenB = createSessionToken(USER_B);

    // Seed User A rich data structure
    areaA = await createArea({ name: "Karier & Pengembangan Diri", color: "#3B82F6" }, USER_A);
    goalA = await createGoal({ title: "Mastering Next.js & Distributed Systems", areaId: areaA.id }, USER_A);
    projectA = await createProject({ title: "Personal Progress OS Engine", goalId: goalA.id, areaId: areaA.id }, USER_A);

    const now = new Date();

    // 1. Overdue Task (due 3 days ago)
    const overdueDate = new Date(now.getTime() - 3 * 86400000);
    taskOverdue = await createTask(
      {
        title: "Perbaiki Memory Leak Background Task",
        projectId: projectA.id,
        priority: "URGENT",
        dueDate: overdueDate.toISOString(),
      },
      USER_A
    );

    // 2. Due Today Task
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0);
    taskDueToday = await createTask(
      {
        title: "Implementasi Smart Priority Engine",
        projectId: projectA.id,
        priority: "HIGH",
        dueDate: todayDate.toISOString(),
      },
      USER_A
    );

    // 3. Normal Task
    taskNormal = await createTask(
      {
        title: "Dokumentasi Arsitektur Intelligence",
        projectId: projectA.id,
        priority: "MEDIUM",
      },
      USER_A
    );

    // 4. Completed Task
    const createdCompleted = await createTask(
      {
        title: "Audit Pre-Implementation Phase 6",
        projectId: projectA.id,
        priority: "HIGH",
      },
      USER_A
    );
    taskCompleted = await completeTask(createdCompleted.id, USER_A);

    // 5. Daily Focus (add taskDueToday to focus)
    await addDailyFocus({ taskId: taskDueToday.id }, USER_A);

    // 6. Sesi Fokus & Activity
    const sess = await startSession(taskDueToday.id, USER_A);
    // Backdate session to 35 minutes ago
    await prisma.session.update({
      where: { id: sess.id },
      data: { startedAt: new Date(now.getTime() - 35 * 60000) },
    });
    await endSession(sess.id, { sessionId: sess.id, activity: "Coding Intelligence Engine", understanding: 5 }, USER_A);

    // 7. Calendar Events: Event 1 (10:00 - 11:30), Event 2 (11:00 - 12:00) -> Overlap!
    const evStart1 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
    const evEnd1 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30, 0);
    await createCalendarEvent(
      {
        title: "Architecture Sprint Review",
        startTime: evStart1.toISOString(),
        endTime: evEnd1.toISOString(),
        eventType: "WORK",
        projectId: projectA.id,
      },
      USER_A
    );

    const evStart2 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0);
    const evEnd2 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    await createCalendarEvent(
      {
        title: "Weekly Stakeholder Sync",
        startTime: evStart2.toISOString(),
        endTime: evEnd2.toISOString(),
        eventType: "WORK",
      },
      USER_A
    );

    // Touching non-overlapping Event: Event 3 (12:00 - 13:00)
    const evStart3 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    const evEnd3 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 0, 0);
    await createCalendarEvent(
      {
        title: "Lunch & Rest",
        startTime: evStart3.toISOString(),
        endTime: evEnd3.toISOString(),
        eventType: "PERSONAL",
      },
      USER_A
    );

    // 8. Capture
    await createCapture({ content: "Ide modul AI explainability di masa depan", category: "IDEA" }, USER_A);

    // 9. Review
    const weekPeriod = getWeekPeriod(now);
    await createReview(
      goalA.id,
      {
        periodStart: weekPeriod.periodStart,
        periodEnd: weekPeriod.periodEnd,
        wentWell: "Sprint berjalan sesuai rencana",
        difficulties: "Sedikit kelelahan di akhir pekan",
        improvements: "Pertahankan jadwal istirahat",
        nextFocus: "Finalisasi modul insights",
      },
      USER_A
    );
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [USER_A, USER_B] } } });
  });

  // ==========================================================================
  // 1. PURE ENGINES VERIFICATION
  // ==========================================================================
  describe("1. Pure Mathematical Intelligence Engines", () => {
    it("1.1 Smart Priority: scores overdue and due-today tasks higher than standard tasks", () => {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      const context = {
        now,
        todayDateStr: todayStr,
        dailyFocusTaskIds: new Set([taskDueToday.id]),
      };

      const pOverdue = calculateTaskPriority(taskOverdue, context);
      const pDueToday = calculateTaskPriority(taskDueToday, context);
      const pNormal = calculateTaskPriority(taskNormal, context);
      const pCompleted = calculateTaskPriority(taskCompleted, context);

      expect(pOverdue.isOverdue).toBe(true);
      expect(pOverdue.score).toBeGreaterThanOrEqual(80);
      expect(pOverdue.urgency).toBe("CRITICAL");
      expect(pOverdue.reasons.some((r) => r.includes("Terlambat"))).toBe(true);

      expect(pDueToday.isDueToday).toBe(true);
      expect(pDueToday.isFocusedToday).toBe(true);
      expect(pDueToday.score).toBeGreaterThan(pNormal.score);
      expect(pDueToday.reasons.some((r) => r.includes("Jatuh tempo hari ini"))).toBe(true);

      expect(pCompleted.score).toBe(-999);
    });

    it("1.2 Smart Priority: rankTasks produces deterministic ordered list", () => {
      const now = new Date();
      const ranked = rankTasks(
        [taskNormal, taskCompleted, taskOverdue, taskDueToday],
        {
          now,
          todayDateStr: "2026-09-04",
          dailyFocusTaskIds: new Set([taskDueToday.id]),
        },
        { includeCompleted: false }
      );

      expect(ranked.length).toBe(3); // completed excluded
      expect(ranked[0].task.id).toBe(taskOverdue.id); // overdue task ranked 1st
      expect(ranked[1].task.id).toBe(taskDueToday.id);
      expect(ranked[2].task.id).toBe(taskNormal.id);
    });

    it("1.3 Conflict Detection: detects overlap and ignores touching boundaries", () => {
      const base = new Date("2026-09-04T10:00:00Z");
      const ev1 = {
        id: "ev1",
        userId: USER_A,
        title: "Session A",
        description: null,
        startTime: new Date("2026-09-04T10:00:00Z"),
        endTime: new Date("2026-09-04T11:00:00Z"),
        isAllDay: false,
        eventType: "WORK" as const,
        location: null,
        taskId: null,
        projectId: null,
        recurrence: "NONE" as const,
        recurrenceEnd: null,
        reminderMinutes: null,
        ignoreQuietHours: false,
        isCompleted: false,
        completedAt: null,
        createdAt: base,
        updatedAt: base,
      };

      const ev2 = {
        id: "ev2",
        userId: USER_A,
        title: "Session B",
        description: null,
        startTime: new Date("2026-09-04T10:30:00Z"),
        endTime: new Date("2026-09-04T11:30:00Z"),
        isAllDay: false,
        eventType: "WORK" as const,
        location: null,
        taskId: null,
        projectId: null,
        recurrence: "NONE" as const,
        recurrenceEnd: null,
        reminderMinutes: null,
        ignoreQuietHours: false,
        isCompleted: false,
        completedAt: null,
        createdAt: base,
        updatedAt: base,
      };

      const ev3Touching = {
        id: "ev3",
        userId: USER_A,
        title: "Session C (Touching End)",
        description: null,
        startTime: new Date("2026-09-04T11:00:00Z"),
        endTime: new Date("2026-09-04T12:00:00Z"),
        isAllDay: false,
        eventType: "WORK" as const,
        location: null,
        taskId: null,
        projectId: null,
        recurrence: "NONE" as const,
        recurrenceEnd: null,
        reminderMinutes: null,
        ignoreQuietHours: false,
        isCompleted: false,
        completedAt: null,
        createdAt: base,
        updatedAt: base,
      };

      // ev1 vs ev2 overlaps
      const conflicts = detectConflicts([ev1, ev2, ev3Touching]);
      // Should detect ev1 vs ev2 overlap and ev2 vs ev3 overlap, but NOT ev1 vs ev3 (touching at 11:00)
      const ev1ev3Collision = conflicts.some(
        (c) => c.entities.some((e) => e.id === "ev1") && c.entities.some((e) => e.id === "ev3")
      );
      expect(ev1ev3Collision).toBe(false);

      const ev1ev2Collision = conflicts.some(
        (c) => c.entities.some((e) => e.id === "ev1") && c.entities.some((e) => e.id === "ev2")
      );
      expect(ev1ev2Collision).toBe(true);
    });

    it("1.4 Life Health: calculates score and explains components without division by zero", () => {
      // Empty user test
      const emptyHealth = calculateLifeHealth({
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        activeGoals: 0,
        completedGoals: 0,
        totalSessions: 0,
        totalSessionMinutes: 0,
        activeDays: 0,
        daysInPeriod: 30,
        areasCount: 0,
        areasWithActivity: 0,
        currentStreak: 0,
      });

      expect(emptyHealth.overallScore).toBeGreaterThan(0);
      expect(emptyHealth.status).toBeDefined();
      expect(emptyHealth.strengths.length).toBeGreaterThan(0);

      // Healthy user test
      const healthyHealth = calculateLifeHealth({
        totalTasks: 20,
        completedTasks: 16,
        overdueTasks: 0,
        activeGoals: 3,
        completedGoals: 1,
        totalSessions: 12,
        totalSessionMinutes: 400,
        activeDays: 18,
        daysInPeriod: 30,
        areasCount: 3,
        areasWithActivity: 3,
        currentStreak: 5,
      });

      expect(healthyHealth.overallScore).toBeGreaterThanOrEqual(80);
      expect(healthyHealth.status).toBe("EXCELLENT");
      expect(healthyHealth.strengths.some((s) => s.includes("penyelesaian task"))).toBe(true);
      expect(healthyHealth.warnings.length).toBe(0);

      // Overdue-burdened user test
      const burdenedHealth = calculateLifeHealth({
        totalTasks: 20,
        completedTasks: 2,
        overdueTasks: 8,
        activeGoals: 2,
        completedGoals: 0,
        totalSessions: 0,
        totalSessionMinutes: 0,
        activeDays: 1,
        daysInPeriod: 30,
        areasCount: 2,
        areasWithActivity: 0,
        currentStreak: 0,
      });

      expect(burdenedHealth.overallScore).toBeLessThan(50);
      expect(burdenedHealth.status).toBe("CRITICAL");
      expect(burdenedHealth.warnings.some((w) => w.includes("melewati"))).toBe(true);
    });
  });

  // ==========================================================================
  // 2. ANALYTICS & INSIGHTS SERVICES
  // ==========================================================================
  describe("2. Insights Services Integration", () => {
    it("2.1 getInsightsAnalytics computes comprehensive multi-track analytics for User A", async () => {
      const analytics = await getInsightsAnalytics("this_week", undefined, undefined, USER_A);

      expect(analytics.period.type).toBe("this_week");
      expect(analytics.goals.total).toBeGreaterThanOrEqual(1);
      expect(analytics.tasks.total).toBeGreaterThanOrEqual(4);
      expect(analytics.tasks.completed).toBeGreaterThanOrEqual(1);
      expect(analytics.tasks.overdue).toBeGreaterThanOrEqual(1);
      expect(analytics.sessions.totalCount).toBeGreaterThanOrEqual(1);
      expect(analytics.sessions.totalMinutes).toBeGreaterThanOrEqual(30);
      expect(analytics.activities.totalCount).toBeGreaterThanOrEqual(1);
      expect(analytics.goalProgress.some((g) => g.goalId === goalA.id)).toBe(true);
      expect(analytics.areaDistribution.some((a) => a.areaId === areaA.id)).toBe(true);
    });

    it("2.2 getInsightDateRange handles today, this_week, this_month, and custom boundaries", () => {
      const ref = new Date("2026-09-04T12:00:00Z");

      const today = getInsightDateRange("today", undefined, undefined, ref);
      expect(today.start.getHours()).toBe(0);
      expect(today.end.getHours()).toBe(23);

      const week = getInsightDateRange("this_week", undefined, undefined, ref);
      expect(week.start.getDay()).toBe(1); // Monday
      expect(week.end.getDay()).toBe(0); // Sunday

      const month = getInsightDateRange("this_month", undefined, undefined, ref);
      expect(month.start.getDate()).toBe(1);
    });

    it("2.3 getPrioritizedTasks retrieves live ranked tasks with reasons", async () => {
      const tasks = await getPrioritizedTasks({ limit: 10, includeCompleted: false }, USER_A);

      expect(tasks.length).toBeGreaterThanOrEqual(3);
      expect(tasks.slice(0, 2).some((t) => t.task.id === taskOverdue.id)).toBe(true);
      expect(tasks.slice(0, 2).some((t) => t.task.id === taskDueToday.id)).toBe(true);
      expect(tasks[0].reasons.length).toBeGreaterThanOrEqual(1);
    });

    it("2.4 getInsightsDailyPlan composes focus, recommended, scheduled, and conflicts", async () => {
      const plan = await getInsightsDailyPlan(new Date(), USER_A);

      expect(plan.focusTasks.length).toBeGreaterThanOrEqual(1);
      expect(plan.focusTasks.some((f) => f.task.id === taskDueToday.id)).toBe(true);
      expect(plan.scheduledEvents.length).toBeGreaterThanOrEqual(2);
      expect(plan.conflicts.length).toBeGreaterThanOrEqual(1); // Event 1 & Event 2 overlap
      expect(plan.metrics.totalFocusTasks).toBeGreaterThanOrEqual(1);
    });

    it("2.5 getInsightsConflicts returns active overlapping schedule items", async () => {
      const conflicts = await getInsightsConflicts(new Date(), 1, USER_A);

      expect(conflicts.length).toBeGreaterThanOrEqual(1);
      const overlap = conflicts.find((c) => c.conflictType === "EVENT_OVERLAP");
      expect(overlap).toBeDefined();
      expect(overlap?.entities.length).toBe(2);
    });

    it("2.6 getInsightsUnifiedInbox aggregates pending captures, overdue tasks, and conflicts", async () => {
      const inbox = await getInsightsUnifiedInbox("ALL", 50, USER_A);

      expect(inbox.counts.total).toBeGreaterThanOrEqual(3);
      expect(inbox.counts.captures).toBeGreaterThanOrEqual(1);
      expect(inbox.counts.overdueTasks).toBeGreaterThanOrEqual(1);
      expect(inbox.counts.conflicts).toBeGreaterThanOrEqual(1);

      // Verify filtered query
      const captureOnly = await getInsightsUnifiedInbox("CAPTURE", 50, USER_A);
      expect(captureOnly.items.every((i) => i.source === "CAPTURE")).toBe(true);
    });

    it("2.7 getInsightsLifeHealth calculates explainable health report for User A", async () => {
      const health = await getInsightsLifeHealth(30, USER_A);

      expect(health.overallScore).toBeGreaterThanOrEqual(0);
      expect(health.overallScore).toBeLessThanOrEqual(100);
      expect(health.components.taskCompletion).toBeDefined();
      expect(health.components.overdueBurden).toBeDefined();
      expect(health.strengths.length).toBeGreaterThanOrEqual(1);
    });

    it("2.8 getTodayInsightsSummary provides concise status for Today view", async () => {
      const summary = await getTodayInsightsSummary(USER_A);

      expect(summary.topPriorities.length).toBeGreaterThanOrEqual(1);
      expect(summary.inboxCount).toBeGreaterThanOrEqual(1);
      expect(summary.lifeHealthScore).toBeGreaterThanOrEqual(0);
      expect(summary.lifeHealthStatus).toBeDefined();
    });
  });

  // ==========================================================================
  // 3. SECURITY & IDOR ISOLATION (ZERO LEAKAGE)
  // ==========================================================================
  describe("3. Security & Cross-User IDOR Isolation", () => {
    it("3.1 User B gets zero data from User A via Service Layer", async () => {
      const analyticsB = await getInsightsAnalytics("this_week", undefined, undefined, USER_B);
      expect(analyticsB.goals.total).toBe(0);
      expect(analyticsB.tasks.total).toBe(0);
      expect(analyticsB.sessions.totalCount).toBe(0);

      const prioritiesB = await getPrioritizedTasks({}, USER_B);
      expect(prioritiesB.length).toBe(0);

      const planB = await getInsightsDailyPlan(new Date(), USER_B);
      expect(planB.focusTasks.length).toBe(0);
      expect(planB.scheduledEvents.length).toBe(0);
      expect(planB.conflicts.length).toBe(0);

      const inboxB = await getInsightsUnifiedInbox("ALL", 50, USER_B);
      expect(inboxB.items.length).toBe(0);
      expect(inboxB.counts.total).toBe(0);
    });

    it("3.2 HTTP API: User B cannot access User A's insights", async () => {
      // 1. Analytics API
      const reqAnalytics = new Request("http://localhost/api/insights/analytics?period=this_week", {
        headers: { Cookie: `${SESSION_COOKIE}=${tokenB}` },
      });
      const resAnalytics = await getAnalyticsApi(reqAnalytics);
      expect(resAnalytics.status).toBe(200);
      const dataAnalytics = await resAnalytics.json();
      expect(dataAnalytics.data.goals.total).toBe(0);
      expect(dataAnalytics.data.tasks.total).toBe(0);

      // 2. Priority API
      const reqPriority = new Request("http://localhost/api/insights/priority", {
        headers: { Cookie: `${SESSION_COOKIE}=${tokenB}` },
      });
      const resPriority = await getPriorityApi(reqPriority);
      expect(resPriority.status).toBe(200);
      const dataPriority = await resPriority.json();
      expect(dataPriority.data.length).toBe(0);

      // 3. Daily Plan API
      const reqDailyPlan = new Request("http://localhost/api/insights/daily-plan", {
        headers: { Cookie: `${SESSION_COOKIE}=${tokenB}` },
      });
      const resDailyPlan = await getDailyPlanApi(reqDailyPlan);
      expect(resDailyPlan.status).toBe(200);
      const dataDailyPlan = await resDailyPlan.json();
      expect(dataDailyPlan.data.focusTasks.length).toBe(0);

      // 4. Conflicts API
      const reqConflicts = new Request("http://localhost/api/insights/conflicts", {
        headers: { Cookie: `${SESSION_COOKIE}=${tokenB}` },
      });
      const resConflicts = await getConflictsApi(reqConflicts);
      expect(resConflicts.status).toBe(200);
      const dataConflicts = await resConflicts.json();
      expect(dataConflicts.data.length).toBe(0);

      // 5. Inbox API
      const reqInbox = new Request("http://localhost/api/insights/inbox", {
        headers: { Cookie: `${SESSION_COOKIE}=${tokenB}` },
      });
      const resInbox = await getInboxApi(reqInbox);
      expect(resInbox.status).toBe(200);
      const dataInbox = await resInbox.json();
      expect(dataInbox.data.counts.total).toBe(0);

      // 6. Life Health API
      const reqLifeHealth = new Request("http://localhost/api/insights/life-health", {
        headers: { Cookie: `${SESSION_COOKIE}=${tokenB}` },
      });
      const resLifeHealth = await getLifeHealthApi(reqLifeHealth);
      expect(resLifeHealth.status).toBe(200);
      const dataLifeHealth = await resLifeHealth.json();
      expect(dataLifeHealth.data.overallScore).toBeDefined();
    });

    it("3.3 HTTP API: Rejects unauthenticated requests with 401", async () => {
      const unauthReq = new Request("http://localhost/api/insights/analytics");
      const unauthRes = await getAnalyticsApi(unauthReq);
      expect(unauthRes.status).toBe(401);
    });
  });
});
