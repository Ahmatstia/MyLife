import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  listNotifications,
  getUnreadNotificationCount,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  NotificationServiceError,
} from "@/services/notification.service";
import {
  runReminderCycle,
  isQuietHours,
  getLocalDateString,
  getLocalTimeParts,
} from "@/services/reminder.service";
import { onTaskStatusChanged } from "@/services/automation.service";
import { exportUserData } from "@/services/data-export.service";
import { upsertUserPreference } from "@/repositories/user-preference.repository";

describe("Phase 7: Proactive Life OS — Notifications, Reminders, Automation & Data Sovereignty", { timeout: 90000 }, () => {
  const userA = "phase7_user_a";
  const userB = "phase7_user_b";

  beforeAll(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: { id: { in: [userA, userB] } },
    });

    // Create User A and User B
    await prisma.user.create({
      data: {
        id: userA,
        email: "phase7_a@mylife.test",
        name: "User A Proactive",
        passwordHash: "super_secret_hash_a",
      },
    });

    await prisma.user.create({
      data: {
        id: userB,
        email: "phase7_b@mylife.test",
        name: "User B Proactive",
        passwordHash: "super_secret_hash_b",
      },
    });

    // Setup initial preferences
    await upsertUserPreference(userA, {
      enableNotifications: true,
      timezone: "Asia/Jakarta",
    });

    await upsertUserPreference(userB, {
      enableNotifications: true,
      timezone: "Asia/Jakarta",
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [userA, userB] } },
    });
  });

  // =========================================================================
  // 1. Notification Foundation & CRUD
  // =========================================================================
  describe("1. Notification Foundation & Service", () => {
    let notifAId: string;

    it("1.1 Creates and retrieves notifications for User A", async () => {
      const notif = await createNotification(
        {
          title: "Test Notification A",
          message: "Ini pesan pengingat untuk User A.",
          type: "SYSTEM",
          severity: "INFO",
        },
        userA
      );

      expect(notif.id).toBeDefined();
      expect(notif.userId).toBe(userA);
      expect(notif.isRead).toBe(false);
      notifAId = notif.id;

      const list = await listNotifications({}, userA);
      expect(list.items.length).toBeGreaterThanOrEqual(1);
      expect(list.items.some((n) => n.id === notifAId)).toBe(true);

      const unread = await getUnreadNotificationCount(userA);
      expect(unread).toBeGreaterThanOrEqual(1);
    });

    it("1.2 Marks notification as read", async () => {
      const updated = await markAsRead(notifAId, userA);
      expect(updated.isRead).toBe(true);
      expect(updated.readAt).toBeInstanceOf(Date);
    });

    it("1.3 Marks all notifications as read", async () => {
      await createNotification(
        { title: "Notif 2", message: "Pesan 2", type: "TASK_DUE", severity: "WARNING" },
        userA
      );
      await createNotification(
        { title: "Notif 3", message: "Pesan 3", type: "CALENDAR_EVENT", severity: "INFO" },
        userA
      );

      let unread = await getUnreadNotificationCount(userA);
      expect(unread).toBe(2);

      const markResult = await markAllAsRead(userA);
      expect(markResult.updatedCount).toBe(2);

      unread = await getUnreadNotificationCount(userA);
      expect(unread).toBe(0);
    });

    it("1.4 Deletes a notification", async () => {
      const toDelete = await createNotification(
        { title: "Temporary", message: "To be deleted", type: "SYSTEM", severity: "INFO" },
        userA
      );

      const res = await deleteNotification(toDelete.id, userA);
      expect(res.success).toBe(true);

      await expect(deleteNotification(toDelete.id, userA)).rejects.toThrow(
        NotificationServiceError
      );
    });
  });

  // =========================================================================
  // 2. Pure Functions & Reminder Engine Logic
  // =========================================================================
  describe("2. Reminder Engine: Pure Functions & Rules", () => {
    it("2.1 isQuietHours correctly identifies overnight quiet window", () => {
      // Overnight: 22:00 to 07:00
      // 23:30 should be quiet
      const dateQuietNight = new Date("2026-09-04T23:30:00.000Z");
      expect(isQuietHours(dateQuietNight, "UTC", "22:00", "07:00")).toBe(true);

      // 03:00 should be quiet
      const dateQuietMorning = new Date("2026-09-04T03:00:00.000Z");
      expect(isQuietHours(dateQuietMorning, "UTC", "22:00", "07:00")).toBe(true);

      // 14:00 should NOT be quiet
      const dateActiveDay = new Date("2026-09-04T14:00:00.000Z");
      expect(isQuietHours(dateActiveDay, "UTC", "22:00", "07:00")).toBe(false);
    });

    it("2.2 getLocalDateString & getLocalTimeParts operate timezone-safely", () => {
      const d = new Date("2026-09-04T15:00:00.000Z");
      // In Asia/Jakarta (UTC+7), 15:00Z on Sep 4 is 22:00 on Sep 4
      const dateStr = getLocalDateString(d, "Asia/Jakarta");
      expect(dateStr).toBe("2026-09-04");

      const parts = getLocalTimeParts(d, "Asia/Jakarta");
      expect(parts.hour).toBe(22);
    });
  });

  // =========================================================================
  // 3. Proactive Reminder Cycle & Idempotency
  // =========================================================================
  describe("3. Proactive Reminder Cycle & Idempotency", () => {
    it("3.1 Generates reminder for task due today and overdue task", async () => {
      // Clear User A notifications first
      await prisma.notification.deleteMany({ where: { userId: userA } });

      // Create Goal & Stage
      const goal = await prisma.goal.create({
        data: {
          title: "Goal Proactive A",
          userId: userA,
        },
      });
      const stage = await prisma.stage.create({
        data: {
          name: "Stage 1",
          order: 1,
          goalId: goal.id,
          userId: userA,
        },
      });

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Task 1: Due today
      await prisma.task.create({
        data: {
          title: "Task Jatuh Tempo Hari Ini",
          userId: userA,
          stageId: stage.id,
          status: "TODO",
          priority: "HIGH",
          dueDate: today,
        },
      });

      // Task 2: Overdue
      await prisma.task.create({
        data: {
          title: "Task Sudah Terlewat",
          userId: userA,
          stageId: stage.id,
          status: "TODO",
          priority: "URGENT",
          dueDate: yesterday,
        },
      });

      // Run reminder cycle
      const result = await runReminderCycle(userA, { forceIgnoreQuietHours: true });
      expect(result.createdCount).toBeGreaterThanOrEqual(2);
      expect(result.notifications.some((n) => n.title.includes("Jatuh Tempo Hari Ini"))).toBe(true);
      expect(result.notifications.some((n) => n.title.includes("Tenggat Terlewat"))).toBe(true);

      // IDEMPOTENCY TEST: Running cycle immediately again must produce 0 duplicate notifications!
      const retryResult = await runReminderCycle(userA, { forceIgnoreQuietHours: true });
      expect(retryResult.createdCount).toBe(0);

      const totalNotifs = await prisma.notification.count({ where: { userId: userA } });
      expect(totalNotifs).toBe(result.createdCount);

      // Cleanup tasks created in 3.1
      await prisma.task.deleteMany({ where: { userId: userA } });
    });

    it("3.2 Generates reminder for CalendarEvent starting within 15 minutes", async () => {
      const now = new Date();
      const in10Minutes = new Date(now.getTime() + 10 * 60 * 1000);
      const in40Minutes = new Date(now.getTime() + 40 * 60 * 1000);

      const event = await prisma.calendarEvent.create({
        data: {
          userId: userA,
          title: "Sync Meeting Mendatang",
          startTime: in10Minutes,
          endTime: in40Minutes,
          eventType: "WORK",
        },
      });

      const cycle = await runReminderCycle(userA, { now, forceIgnoreQuietHours: true });
      expect(cycle.createdCount).toBeGreaterThanOrEqual(1);
      expect(cycle.notifications.some((n) => n.title.includes("Sync Meeting Mendatang"))).toBe(true);

      // Idempotency: running again should not duplicate calendar reminder
      const retry = await runReminderCycle(userA, { now, forceIgnoreQuietHours: true });
      expect(retry.createdCount).toBe(0);

      // Cleanup event
      await prisma.calendarEvent.delete({ where: { id: event.id } });
    });

    it("3.3 Master toggle enableNotifications = false suppresses all proactive generation", async () => {
      await upsertUserPreference(userA, { enableNotifications: false });

      const cycle = await runReminderCycle(userA, { forceIgnoreQuietHours: true });
      expect(cycle.createdCount).toBe(0);
      expect(cycle.evaluated).toBe(0);

      // Re-enable
      await upsertUserPreference(userA, { enableNotifications: true });
    });
  });

  // =========================================================================
  // 4. Automation Layer
  // =========================================================================
  describe("4. Lightweight Automation Hooks", () => {
    it("4.1 onTaskStatusChanged triggers celebration notification when all daily focus completed", async () => {
      const goal = await prisma.goal.findFirst({ where: { userId: userA }, include: { stages: true } });
      const stage = goal!.stages[0]!;

      const task = await prisma.task.create({
        data: {
          title: "Daily Focus Automate Task",
          userId: userA,
          stageId: stage.id,
          status: "TODO",
        },
      });

      const today = new Date();
      await prisma.dailyFocus.create({
        data: {
          userId: userA,
          taskId: task.id,
          date: today,
        },
      });

      // Complete the task and trigger hook
      await prisma.task.update({
        where: { id: task.id },
        data: { status: "COMPLETED" },
      });

      const hookRes = await onTaskStatusChanged(task.id, "COMPLETED", userA);
      expect(hookRes.triggered).toBe(true);
      expect(hookRes.action).toBe("ALL_DAILY_FOCUS_COMPLETED");

      // Verify congratulatory notification exists
      const celebration = await prisma.notification.findFirst({
        where: { userId: userA, title: { contains: "Semua Fokus Harian Tercapai" } },
      });
      expect(celebration).toBeDefined();
    });
  });

  // =========================================================================
  // 5. Data Sovereignty & Export
  // =========================================================================
  describe("5. Data Sovereignty & Export", () => {
    it("5.1 Exports comprehensive, sanitized user data", async () => {
      const exported = await exportUserData(userA);

      expect(exported.version).toBe("1.0.0");
      expect(exported.user.id).toBe(userA);
      expect(exported.user.email).toBe("phase7_a@mylife.test");

      // STRICT SECURITY: passwordHash MUST NOT be exposed
      expect((exported.user as unknown as { passwordHash?: string }).passwordHash).toBeUndefined();

      expect(Array.isArray(exported.goals)).toBe(true);
      expect(Array.isArray(exported.tasks)).toBe(true);
      expect(Array.isArray(exported.notifications)).toBe(true);
      expect(exported.notifications.length).toBeGreaterThan(0);
    });

    it("5.2 User B export is strictly isolated from User A data", async () => {
      const exportedB = await exportUserData(userB);

      expect(exportedB.user.id).toBe(userB);
      expect(exportedB.goals.length).toBe(0);
      expect(exportedB.tasks.length).toBe(0);
      expect(exportedB.notifications.length).toBe(0);
    });
  });

  // =========================================================================
  // 6. Security, Tenant Isolation & IDOR
  // =========================================================================
  describe("6. Security, Tenant Isolation & IDOR", () => {
    let targetNotifId: string;

    beforeAll(async () => {
      const notif = await createNotification(
        { title: "User A Secret Notif", message: "Private", type: "SYSTEM", severity: "INFO" },
        userA
      );
      targetNotifId = notif.id;
    });

    it("6.1 User B cannot read User A's notifications via list", async () => {
      const listB = await listNotifications({}, userB);
      expect(listB.items.some((n) => n.id === targetNotifId)).toBe(false);
    });

    it("6.2 User B cannot mark User A's notification as read (fail-closed NOT_FOUND)", async () => {
      await expect(markAsRead(targetNotifId, userB)).rejects.toThrow(
        NotificationServiceError
      );
    });

    it("6.3 User B cannot delete User A's notification (fail-closed NOT_FOUND)", async () => {
      await expect(deleteNotification(targetNotifId, userB)).rejects.toThrow(
        NotificationServiceError
      );

      // Verify User A's notification still exists intact
      const notifA = await prisma.notification.findUnique({
        where: { id: targetNotifId },
      });
      expect(notifA).not.toBeNull();
    });
  });
});
