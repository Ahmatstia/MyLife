import { requirePageUser } from "@/lib/auth";
import { listNotifications, getUnreadNotificationCount } from "@/services/notification.service";
import { runReminderCycle } from "@/services/reminder.service";
import { NotificationCenter, type NotificationItem } from "./NotificationCenter";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requirePageUser();

  // Jalankan evaluasi pengingat secara otomatis saat membuka pusat notifikasi
  try {
    await runReminderCycle(user.id);
  } catch {
    // Fail-safe: jangan gagalkan render halaman jika siklus gagal
  }

  const [result, unreadCount] = await Promise.all([
    listNotifications({ limit: 50 }, user.id),
    getUnreadNotificationCount(user.id),
  ]);

  const serializedNotifications: NotificationItem[] = result.items.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    severity: n.severity,
    isRead: n.isRead,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    linkUrl: n.linkUrl,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="w-full">
      <NotificationCenter
        initialNotifications={serializedNotifications}
        initialUnreadCount={unreadCount}
      />
    </div>
  );
}
