import {
  findInsightsPendingCaptures,
  findInsightsTasks,
  findInsightsReviews,
  findInsightsCalendarEvents,
  findInsightsActiveSession,
  findInsightsUnreadNotifications,
} from "@/repositories/insights.repository";
import { detectConflicts } from "./conflict-detection.engine";
import type { UnifiedInboxItem, UnifiedInboxSummary, InboxSource } from "./insights-types";
import { requireUserId } from "@/lib/ownership";

export async function getUnifiedInbox(
  userId?: string,
  filterSource: InboxSource | "ALL" = "ALL",
  limit = 50
): Promise<UnifiedInboxSummary> {
  const owner = requireUserId(userId);
  const now = new Date();

  // Week boundaries for review check
  const day = now.getDay();
  const distanceFromMonday = day === 0 ? 6 : day - 1;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - distanceFromMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const [pendingCaptures, allTasks, reviewsThisWeek, calendarEvents, activeSession, unreadNotifications] =
    await Promise.all([
      findInsightsPendingCaptures(owner),
      findInsightsTasks(owner),
      findInsightsReviews(owner, startOfWeek),
      findInsightsCalendarEvents(owner, new Date(now.getTime() - 24 * 3600000), new Date(now.getTime() + 48 * 3600000)),
      findInsightsActiveSession(owner),
      findInsightsUnreadNotifications(owner),
    ]);

  const items: UnifiedInboxItem[] = [];

  // 1. Pending Captures
  for (const cap of pendingCaptures) {
    items.push({
      id: `inbox-capture-${cap.id}`,
      source: "CAPTURE",
      type: "CAPTURE_PENDING",
      title: cap.content,
      description: `Kategori: ${cap.category}. Masuk inbox belum diproses.`,
      priority: "MEDIUM",
      timestamp: cap.createdAt,
      actionUrl: "/capture",
      actionLabel: "Proses Capture",
      metadata: { captureId: cap.id, category: cap.category },
    });
  }

  // 2. Overdue Tasks
  const overdueTasks = allTasks.filter(
    (t) => t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate) < now
  );
  for (const task of overdueTasks) {
    const overdueDays = Math.max(1, Math.floor((now.getTime() - new Date(task.dueDate!).getTime()) / 86400000));
    items.push({
      id: `inbox-task-${task.id}`,
      source: "TASK",
      type: "TASK_OVERDUE",
      title: task.title,
      description: `Telah terlambat ${overdueDays} hari. Prioritas: ${task.priority}.`,
      priority: task.priority === "URGENT" || overdueDays >= 3 ? "URGENT" : "HIGH",
      timestamp: task.dueDate!,
      actionUrl: "/today",
      actionLabel: "Buka di Today",
      metadata: { taskId: task.id, overdueDays },
    });
  }

  // 3. Review Prompt (if mid/end of week and user has tasks and no review has been completed yet)
  const isWeekendOrThursday = day === 0 || day >= 4;
  if (isWeekendOrThursday && allTasks.length > 0 && reviewsThisWeek.length === 0) {
    items.push({
      id: "inbox-review-weekly",
      source: "REVIEW",
      type: "REVIEW_NEEDED",
      title: "Evaluasi Mingguan Belum Dilakukan",
      description: "Lakukan refleksi kemajuan dan hambatan belajar Anda minggu ini.",
      priority: "MEDIUM",
      timestamp: now,
      actionUrl: "/review",
      actionLabel: "Mulai Review",
      metadata: { weekStart: startOfWeek },
    });
  }

  // 4. Conflicts
  const conflicts = detectConflicts(calendarEvents, activeSession, now);
  for (const conf of conflicts) {
    items.push({
      id: `inbox-${conf.id}`,
      source: "CONFLICT",
      type: conf.conflictType,
      title: `Konflik Waktu: ${conf.entities.map((e) => e.title).join(" vs ")}`,
      description: conf.explanation,
      priority: conf.severity === "HIGH" ? "URGENT" : "HIGH",
      timestamp: conf.startTime,
      actionUrl: "/today",
      actionLabel: "Selesaikan Konflik",
      metadata: { conflictId: conf.id },
    });
  }

  // 5. Unread Notifications
  for (const notif of unreadNotifications) {
    items.push({
      id: `inbox-notif-${notif.id}`,
      source: "NOTIFICATION",
      type: notif.type,
      title: notif.title,
      description: notif.message,
      priority: notif.severity === "URGENT" ? "URGENT" : notif.severity === "WARNING" ? "HIGH" : "LOW",
      timestamp: notif.createdAt,
      actionUrl: notif.linkUrl || "/today",
      actionLabel: "Buka",
      metadata: { notificationId: notif.id },
    });
  }

  // Calculate counts before filter
  const counts = {
    total: items.length,
    captures: items.filter((i) => i.source === "CAPTURE").length,
    overdueTasks: items.filter((i) => i.source === "TASK").length,
    pendingReviews: items.filter((i) => i.source === "REVIEW").length,
    conflicts: items.filter((i) => i.source === "CONFLICT").length,
    notifications: items.filter((i) => i.source === "NOTIFICATION").length,
  };

  // Filter if requested
  let filtered = items;
  if (filterSource !== "ALL") {
    filtered = items.filter((item) => item.source === filterSource);
  }

  // Sort: URGENT -> HIGH -> MEDIUM -> LOW, then timestamp DESC
  const prioWeight: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  filtered.sort((a, b) => {
    if (prioWeight[b.priority] !== prioWeight[a.priority]) {
      return prioWeight[b.priority] - prioWeight[a.priority];
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return {
    items: filtered.slice(0, limit),
    counts,
  };
}
