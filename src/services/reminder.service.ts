import { prisma } from "@/lib/prisma";
import { findExistingNotification, createNotification } from "@/repositories/notification.repository";
import { getUserPreference } from "@/services/user-preference.service";
import { requireUserId } from "@/lib/ownership";
import type { NotificationType, NotificationSeverity } from "@/generated/prisma/client";
import { dispatchExternalNotification } from "./external-notification.service";

export interface ReminderCycleOptions {
  now?: Date;
  forceIgnoreQuietHours?: boolean;
}

export interface ReminderCycleResult {
  evaluated: number;
  createdCount: number;
  suppressedCount: number;
  notifications: Array<{
    id: string;
    type: NotificationType;
    title: string;
    severity: NotificationSeverity;
  }>;
}

/**
 * Pure function: Checks if the current time falls within user's quiet hours in their local timezone.
 * Handles overnight ranges (e.g. 22:00 to 07:00).
 */
export function isQuietHours(
  now: Date,
  timezone: string,
  quietStart = "22:00",
  quietEnd = "07:00"
): boolean {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    const currentMinutes = hour * 60 + minute;

    const [startH, startM] = quietStart.split(":").map(Number);
    const [endH, endM] = quietEnd.split(":").map(Number);
    const startMinutes = (startH ?? 22) * 60 + (startM ?? 0);
    const endMinutes = (endH ?? 7) * 60 + (endM ?? 0);

    if (startMinutes < endMinutes) {
      // Standard daytime/evening range e.g. 13:00 - 15:00
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Overnight range e.g. 22:00 - 07:00
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  } catch {
    // Fallback if timezone string is invalid
    return false;
  }
}

/**
 * Pure function: Formats a local date string (YYYY-MM-DD) in user timezone.
 */
export function getLocalDateString(date: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Pure function: Get local day-of-week (0=Sunday, 5=Friday, 6=Saturday) and local hour in user timezone.
 */
export function getLocalTimeParts(date: Date, timezone: string): { dayOfWeek: number; hour: number } {
  try {
    const hourFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    const hour = Number(hourFormatter.format(date));
    const dayOfWeek = date.getDay(); // Approximate standard
    return { dayOfWeek, hour };
  } catch {
    return { dayOfWeek: date.getDay(), hour: date.getHours() };
  }
}

/**
 * Main proactive reminder cycle for a user.
 * 100% deterministic, idempotent, and testable.
 */
export async function runReminderCycle(
  userId?: string,
  options: ReminderCycleOptions = {}
): Promise<ReminderCycleResult> {
  const owner = requireUserId(userId);
  const now = options.now ?? new Date();

  const pref = await getUserPreference(owner);
  if (!pref.enableNotifications) {
    return { evaluated: 0, createdCount: 0, suppressedCount: 0, notifications: [] };
  }

  const timezone = pref.timezone || "Asia/Jakarta";
  const inQuiet = isQuietHours(now, timezone) && !options.forceIgnoreQuietHours;

  const todayStr = getLocalDateString(now, timezone);
  const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

  let evaluated = 0;
  let createdCount = 0;
  let suppressedCount = 0;
  const createdNotifications: Array<{
    id: string;
    type: NotificationType;
    title: string;
    severity: NotificationSeverity;
  }> = [];
  const externalDispatchQueue: Array<{
    title: string;
    message: string;
    severity: NotificationSeverity;
    type: string;
    linkUrl?: string | null;
  }> = [];

  // ==========================================
  // 1. TASK REMINDERS (DUE TODAY & OVERDUE)
  // ==========================================
  const openTasks = await prisma.task.findMany({
    where: {
      userId: owner,
      status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] },
      dueDate: { not: null },
    },
    select: {
      id: true,
      title: true,
      priority: true,
      dueDate: true,
    },
  });

  evaluated += openTasks.length;

  for (const task of openTasks) {
    if (!task.dueDate) continue;

    const isOverdue = task.dueDate < startOfDay;
    const isDueToday = task.dueDate >= startOfDay && task.dueDate <= endOfDay;

    if (!isOverdue && !isDueToday) continue;

    // Severity mapping
    let severity: NotificationSeverity = "INFO";
    let title = "";
    let message = "";

    if (isOverdue) {
      severity = task.priority === "URGENT" ? "URGENT" : "WARNING";
      title = `Tenggat Terlewat: ${task.title}`;
      message = `Task "${task.title}" telah melewati batas waktu (${task.dueDate.toISOString().slice(0, 10)}). Segera selesaikan atau jadwalkan ulang.`;
    } else {
      severity = task.priority === "HIGH" || task.priority === "URGENT" ? "WARNING" : "INFO";
      title = `Jatuh Tempo Hari Ini: ${task.title}`;
      message = `Task "${task.title}" jatuh tempo hari ini. Prioritaskan eksekusinya sekarang.`;
    }

    // Suppress INFO notifications during quiet hours
    if (inQuiet && severity === "INFO") {
      suppressedCount++;
      continue;
    }

    // Idempotency check: only 1 reminder per task per calendar day
    const alreadyNotified = await findExistingNotification(
      owner,
      "TASK_DUE",
      task.id,
      startOfDay
    );

    if (!alreadyNotified) {
      const notif = await createNotification({
        userId: owner,
        title,
        message,
        type: "TASK_DUE",
        severity,
        entityType: "TASK",
        entityId: task.id,
        linkUrl: `/tasks/${task.id}`,
      });

      createdCount++;
      createdNotifications.push({
        id: notif.id,
        type: notif.type,
        title: notif.title,
        severity: notif.severity,
      });
      externalDispatchQueue.push({
        title: notif.title,
        message: notif.message,
        severity: notif.severity,
        type: notif.type,
        linkUrl: notif.linkUrl,
      });
    }
  }

  // ==========================================
  // 2. CALENDAR EVENT REMINDERS (STARTING SOON)
  // ==========================================
  const windowEnd = new Date(now.getTime() + 15 * 60 * 1000); // next 15 mins
  const upcomingEvents = await prisma.calendarEvent.findMany({
    where: {
      userId: owner,
      startTime: {
        gte: now,
        lte: windowEnd,
      },
    },
  });

  evaluated += upcomingEvents.length;

  for (const event of upcomingEvents) {
    if (inQuiet) {
      suppressedCount++;
      continue;
    }

    // Idempotency check for event
    const alreadyNotified = await findExistingNotification(
      owner,
      "CALENDAR_EVENT",
      event.id
    );

    if (!alreadyNotified) {
      const notif = await createNotification({
        userId: owner,
        title: `Jadwal Segera Dimulai: ${event.title}`,
        message: `Acara "${event.title}" akan dimulai dalam kurang dari 15 menit.`,
        type: "CALENDAR_EVENT",
        severity: "INFO",
        entityType: "CALENDAR_EVENT",
        entityId: event.id,
        linkUrl: `/calendar`,
      });

      createdCount++;
      createdNotifications.push({
        id: notif.id,
        type: notif.type,
        title: notif.title,
        severity: notif.severity,
      });
      externalDispatchQueue.push({
        title: notif.title,
        message: notif.message,
        severity: notif.severity,
        type: notif.type,
        linkUrl: notif.linkUrl,
      });
    }
  }

  // ==========================================
  // 3. DAILY FOCUS REMINDER (AFTERNOON CHECK)
  // ==========================================
  const { hour: currentHour } = getLocalTimeParts(now, timezone);

  // Check Daily Focus in afternoon (14:00 or later)
  if (currentHour >= 14) {
    const focusItems = await prisma.dailyFocus.findMany({
      where: {
        userId: owner,
        date: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        task: true,
      },
    });

    evaluated += focusItems.length;

    const hasIncompleteFocus = focusItems.some((f) => f.task.status !== "COMPLETED");
    if (hasIncompleteFocus && !inQuiet) {
      const alreadyNotified = await findExistingNotification(
        owner,
        "DAILY_FOCUS_REMINDER",
        todayStr
      );

      if (!alreadyNotified) {
        const notif = await createNotification({
          userId: owner,
          title: "Pengingat Fokus Harian",
          message: "Anda masih memiliki task fokus yang belum selesai untuk hari ini. Luangkan waktu untuk menyelesaikannya.",
          type: "DAILY_FOCUS_REMINDER",
          severity: "INFO",
          entityType: "DAILY_FOCUS",
          entityId: todayStr,
          linkUrl: `/focus`,
        });

        createdCount++;
        createdNotifications.push({
          id: notif.id,
          type: notif.type,
          title: notif.title,
          severity: notif.severity,
        });
        externalDispatchQueue.push({
          title: notif.title,
          message: notif.message,
          severity: notif.severity,
          type: notif.type,
          linkUrl: notif.linkUrl,
        });
      }
    }
  }

  // ==========================================
  // 4. WEEKLY REVIEW REMINDER (WEEKEND CHECK)
  // ==========================================
  const { dayOfWeek } = getLocalTimeParts(now, timezone);

  // Friday, Saturday, Sunday (5, 6, 0)
  if (dayOfWeek === 0 || dayOfWeek >= 5) {
    const currentWeekYear = `${now.getFullYear()}-W${Math.ceil((now.getDate() + 6 - dayOfWeek) / 7)}`;
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const reviewCount = await prisma.review.count({
      where: {
        userId: owner,
        createdAt: { gte: weekAgo },
      },
    });

    evaluated += 1;

    if (reviewCount === 0 && !inQuiet) {
      const alreadyNotified = await findExistingNotification(
        owner,
        "WEEKLY_REVIEW_REMINDER",
        currentWeekYear
      );

      if (!alreadyNotified) {
        const notif = await createNotification({
          userId: owner,
          title: "Waktunya Refleksi Mingguan",
          message: "Anda belum mencatat refleksi mingguan untuk minggu ini. Tinjau progres dan evaluasi pencapaian Anda.",
          type: "WEEKLY_REVIEW_REMINDER",
          severity: "INFO",
          entityType: "REVIEW",
          entityId: currentWeekYear,
          linkUrl: `/review`,
        });

        createdCount++;
        createdNotifications.push({
          id: notif.id,
          type: notif.type,
          title: notif.title,
          severity: notif.severity,
        });
        externalDispatchQueue.push({
          title: notif.title,
          message: notif.message,
          severity: notif.severity,
          type: notif.type,
          linkUrl: notif.linkUrl,
        });
      }
    }
  }

  // Dispatch notifications to external channels (Telegram & Email)
  for (const item of externalDispatchQueue) {
    await dispatchExternalNotification({
      title: item.title,
      message: item.message,
      severity: item.severity as "INFO" | "WARNING" | "CRITICAL",
      type: item.type,
      linkUrl: item.linkUrl || undefined,
    });
  }

  return {
    evaluated,
    createdCount,
    suppressedCount,
    notifications: createdNotifications,
  };
}
