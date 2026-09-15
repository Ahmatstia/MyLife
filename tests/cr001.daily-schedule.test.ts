import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getUserPreference,
  updateUserPreference,
} from "@/services/user-preference.service";
import {
  createCalendarEvent,
  deleteCalendarEvent,
} from "@/services/calendar-event.service";
import {
  runReminderCycle,
  runGlobalReminderCycle,
} from "@/services/reminder.service";

describe("CR-001: Daily Routine, Dynamic Reminder Window & Quiet Hours Override", { timeout: 60000 }, () => {
  const testUser = "cr001_schedule_user";

  beforeAll(async () => {
    // Clean up test user
    await prisma.user.deleteMany({
      where: { id: testUser },
    });

    await prisma.user.create({
      data: {
        id: testUser,
        email: "cr001_test@mylife.test",
        name: "CR001 Schedule Tester",
        passwordHash: "hash_cr001",
      },
    });

    // Default preference
    await prisma.userPreference.create({
      data: {
        userId: testUser,
        enableNotifications: true,
        timezone: "Asia/Jakarta",
        defaultReminderMinutes: 15,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: testUser },
    });
  });

  it("1. UserPreference persists and retrieves defaultReminderMinutes correctly", async () => {
    const initialPref = await getUserPreference(testUser);
    expect(initialPref.defaultReminderMinutes).toBe(15);

    const updated = await updateUserPreference(
      { defaultReminderMinutes: 30 },
      testUser
    );
    expect(updated.defaultReminderMinutes).toBe(30);

    const reloaded = await getUserPreference(testUser);
    expect(reloaded.defaultReminderMinutes).toBe(30);

    // Reset back to 15
    await updateUserPreference({ defaultReminderMinutes: 15 }, testUser);
  });

  it("2. Creates calendar events with custom reminderMinutes, ignoreQuietHours, and recurrence", async () => {
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    const end = new Date(now.getTime() + 120 * 60 * 1000);

    const event = await createCalendarEvent(
      {
        title: "Bangun Pagi & Rutinitas",
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        eventType: "PERSONAL",
        recurrence: "DAILY",
        reminderMinutes: 10,
        ignoreQuietHours: true,
      },
      testUser
    );

    expect(event.id).toBeDefined();
    expect(event.title).toBe("Bangun Pagi & Rutinitas");
    expect(event.recurrence).toBe("DAILY");
    expect(event.reminderMinutes).toBe(10);
    expect(event.ignoreQuietHours).toBe(true);

    await deleteCalendarEvent(event.id, testUser);
  });

  it("3. Dynamic reminder window: 30-min window triggers while 15-min default does not", async () => {
    // Current time
    const fakeNow = new Date("2026-09-13T08:00:00.000Z");

    // Event A: starts in 25 minutes, with reminderMinutes = 30
    const in25Min = new Date(fakeNow.getTime() + 25 * 60 * 1000);
    const in55Min = new Date(fakeNow.getTime() + 55 * 60 * 1000);

    const eventA = await createCalendarEvent(
      {
        title: "Kuliah Algoritma (30m Reminder)",
        startTime: in25Min.toISOString(),
        endTime: in55Min.toISOString(),
        eventType: "WORK",
        reminderMinutes: 30,
      },
      testUser
    );

    // Event B: starts in 25 minutes, but default reminder is 15 minutes (reminderMinutes = null)
    const eventB = await createCalendarEvent(
      {
        title: "Sarapan Pagi (Default 15m Reminder)",
        startTime: in25Min.toISOString(),
        endTime: in55Min.toISOString(),
        eventType: "PERSONAL",
        reminderMinutes: null,
      },
      testUser
    );

    // Run reminder cycle evaluated at fakeNow (08:00 UTC = 15:00 WIB, not quiet hours)
    const result = await runReminderCycle(testUser, { now: fakeNow });

    // Event A should be notified (25 min <= 30 min window)
    const notifA = result.notifications.find((n) =>
      n.title.includes("Kuliah Algoritma")
    );
    expect(notifA).toBeDefined();

    // Event B should NOT be notified yet (25 min > 15 min window)
    const notifB = result.notifications.find((n) =>
      n.title.includes("Sarapan Pagi")
    );
    expect(notifB).toBeUndefined();

    // Cleanup
    await deleteCalendarEvent(eventA.id, testUser);
    await deleteCalendarEvent(eventB.id, testUser);
    await prisma.notification.deleteMany({ where: { userId: testUser } });
  });

  it("4. ignoreQuietHours allows alarms/morning reminders during quiet hours", async () => {
    // 23:30 local time in Asia/Jakarta = 16:30 UTC
    const quietTime = new Date("2026-09-13T16:30:00.000Z");

    // Event starting in 10 minutes (16:40 UTC)
    const in10Min = new Date(quietTime.getTime() + 10 * 60 * 1000);
    const in40Min = new Date(quietTime.getTime() + 40 * 60 * 1000);

    // Event 1: Normal event, ignoreQuietHours = false
    const normalEvent = await createCalendarEvent(
      {
        title: "Membaca Buku",
        startTime: in10Min.toISOString(),
        endTime: in40Min.toISOString(),
        eventType: "PERSONAL",
        reminderMinutes: 15,
        ignoreQuietHours: false,
      },
      testUser
    );

    // Event 2: Alarm event, ignoreQuietHours = true
    const alarmEvent = await createCalendarEvent(
      {
        title: "Alarm Bangun Subuh",
        startTime: in10Min.toISOString(),
        endTime: in40Min.toISOString(),
        eventType: "PERSONAL",
        reminderMinutes: 15,
        ignoreQuietHours: true,
      },
      testUser
    );

    const result = await runReminderCycle(testUser, { now: quietTime });

    // normalEvent should be suppressed by quiet hours
    const normalNotif = result.notifications.find((n) =>
      n.title.includes("Membaca Buku")
    );
    expect(normalNotif).toBeUndefined();

    // alarmEvent should bypass quiet hours and produce a notification
    const alarmNotif = result.notifications.find((n) =>
      n.title.includes("Alarm Bangun Subuh")
    );
    expect(alarmNotif).toBeDefined();
    expect(result.suppressedCount).toBeGreaterThanOrEqual(1);

    // Cleanup
    await deleteCalendarEvent(normalEvent.id, testUser);
    await deleteCalendarEvent(alarmEvent.id, testUser);
    await prisma.notification.deleteMany({ where: { userId: testUser } });
  });

  it("5. runGlobalReminderCycle processes all active users and returns summary", async () => {
    const summary = await runGlobalReminderCycle();
    expect(summary.usersProcessed).toBeGreaterThanOrEqual(1);
    expect(typeof summary.totalEvaluated).toBe("number");
    expect(typeof summary.totalCreated).toBe("number");
  });

  it("6. Recurring DAILY calendar event triggers reminders on subsequent days", async () => {
    // Event created with original start time yesterday 09:00 WIB (02:00 UTC)
    const yesterdayStart = new Date("2026-09-12T02:00:00.000Z");
    const yesterdayEnd = new Date("2026-09-12T03:00:00.000Z");

    const dailyRoutine = await createCalendarEvent(
      {
        title: "Rutinitas Olahraga Pagi",
        startTime: yesterdayStart.toISOString(),
        endTime: yesterdayEnd.toISOString(),
        eventType: "PERSONAL",
        recurrence: "DAILY",
        reminderMinutes: 15,
        ignoreQuietHours: false,
      },
      testUser
    );

    // Evaluated TODAY at 08:50 WIB (01:50 UTC) -> 10 minutes before today's 09:00 WIB instance
    const evalNow = new Date("2026-09-13T01:50:00.000Z");
    const result = await runReminderCycle(testUser, { now: evalNow });

    const routineNotif = result.notifications.find((n) =>
      n.title.includes("Rutinitas Olahraga Pagi")
    );
    expect(routineNotif).toBeDefined();

    await deleteCalendarEvent(dailyRoutine.id, testUser);
    await prisma.notification.deleteMany({ where: { userId: testUser } });
  });
});
