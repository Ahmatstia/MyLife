"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/app/components/ui/Toast";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: "TASK_DUE" | "DAILY_FOCUS_REMINDER" | "WEEKLY_REVIEW_REMINDER" | "CALENDAR_EVENT" | "MILESTONE_DEADLINE" | "SYSTEM";
  severity: "INFO" | "WARNING" | "URGENT";
  isRead: boolean;
  readAt: string | null;
  linkUrl: string | null;
  createdAt: string;
};

export function NotificationCenter({
  initialNotifications,
  initialUnreadCount,
}: {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
}) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "URGENT">("ALL");
  const [loading, setLoading] = useState(false);
  const [cycling, setCycling] = useState(false);

  const urgentCount = notifications.filter((n) => n.severity === "URGENT").length;
  const warningCount = notifications.filter((n) => n.severity === "WARNING").length;

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=50");
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data);
        const unread = (json.data as NotificationItem[]).filter((n) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch {
      toast("Gagal memuat notifikasi", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsRead(id: string) {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        toast("Ditandai telah dibaca", "success");
      }
    } catch {
      toast("Gagal memperbarui notifikasi", "error");
    }
  }

  async function handleMarkAllAsRead() {
    try {
      const res = await fetch("/api/notifications/read-all", { method: "PATCH" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
        toast("Semua notifikasi ditandai dibaca", "success");
      }
    } catch {
      toast("Gagal memperbarui notifikasi", "error");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (res.ok) {
        const deleted = notifications.find((n) => n.id === id);
        if (deleted && !deleted.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        toast("Notifikasi dihapus", "info");
      }
    } catch {
      toast("Gagal menghapus notifikasi", "error");
    }
  }

  async function handleTriggerReminders() {
    setCycling(true);
    try {
      const res = await fetch("/api/notifications/reminders/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceIgnoreQuietHours: true }),
      });
      const json = await res.json();
      if (json.success) {
        toast(`Pemeriksaan selesai: ${json.data.createdCount} pengingat baru dibuat`, "success");
        await fetchNotifications();
      }
    } catch {
      toast("Gagal menjalankan pemeriksaan pengingat", "error");
    } finally {
      setCycling(false);
    }
  }

  const filtered = notifications.filter((n) => {
    if (filter === "UNREAD") return !n.isRead;
    if (filter === "URGENT") return n.severity === "URGENT" || n.severity === "WARNING";
    return true;
  });

  return (
    <div className="flex flex-col w-full pb-16 gap-6 text-gray-200">
      {/* 1. Header & Telemetry Strip */}
      <header className="relative flex flex-col xl:flex-row xl:items-end justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div className="flex flex-col max-w-2xl gap-1">
          <div className="flex items-center gap-2 font-mono text-xs text-purple-400 tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span>PUSAT INFORMASI &amp; PENGINGAT // PROACTIVE TELEMETRY HUB</span>
            <span className="text-gray-600">•</span>
            <span className="text-emerald-400">STATUS: REAL-TIME</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
            Notifikasi &amp; Pengingat Proaktif
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            Pantau tugas jatuh tempo, jadwal kalender yang mendekat, dan pengingat proaktif dari sistem MyLife Anda.
          </p>
        </div>

        {/* Telemetry Pills */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 font-mono text-xs">
          {urgentCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              <span>{urgentCount} Mendesak</span>
            </div>
          )}
          {warningCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>{warningCount} Peringatan</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/15 text-purple-300 rounded-lg border border-purple-500/30 shadow-[0_0_16px_rgba(208,188,255,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span className="font-semibold">{unreadCount} Belum Dibaca</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#131825] text-emerald-400 rounded-lg border border-emerald-500/20">
            <span className="material-symbols-outlined text-[14px]">sync</span>
            <span>Sistem Sinkron</span>
          </div>
        </div>
      </header>

      {/* 2. Control & Filter Bar */}
      <nav className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Filter Segmented Chips */}
        <div className="flex items-center gap-1 p-1 bg-[#131825] rounded-xl border border-white/[0.08] overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all whitespace-nowrap ${
              filter === "ALL"
                ? "bg-purple-600 text-white font-semibold shadow-xs"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Semua ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("UNREAD")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs transition-all whitespace-nowrap ${
              filter === "UNREAD"
                ? "bg-purple-600 text-white font-semibold shadow-xs"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span>Belum Dibaca</span>
            <span className="px-1.5 py-0.2 bg-purple-400/20 text-purple-300 rounded-full text-[10px]">
              {unreadCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("URGENT")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs transition-all whitespace-nowrap ${
              filter === "URGENT"
                ? "bg-purple-600 text-white font-semibold shadow-xs"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Penting / Peringatan</span>
          </button>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <button
            type="button"
            onClick={handleTriggerReminders}
            disabled={cycling}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#131825] hover:bg-[#1A2133] text-purple-300 rounded-lg border border-purple-500/30 transition-all font-mono text-xs disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[16px] text-purple-400 ${cycling ? "animate-spin" : ""}`}>
              bolt
            </span>
            <span>{cycling ? "Memeriksa..." : "Periksa Pengingat"}</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#131825] hover:bg-[#1A2133] text-gray-300 hover:text-white rounded-lg border border-white/[0.08] transition-colors font-mono text-xs"
            >
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              <span>Tandai Semua Dibaca</span>
            </button>
          )}
        </div>
      </nav>

      {/* 3. Notifications List Feed */}
      <section className="flex flex-col gap-3.5">
        {loading ? (
          <div className="py-12 text-center text-xs font-mono text-gray-500">Memuat notifikasi...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.1] bg-[#131825]/40 py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-gray-500 mb-2">notifications_off</span>
            <p className="text-sm font-semibold text-white">Tidak ada notifikasi</p>
            <p className="mt-1 text-xs font-mono text-gray-400">
              {filter === "UNREAD"
                ? "Semua notifikasi telah dibaca. Anda sudah tertata rapi!"
                : "Belum ada pengingat atau peringatan aktif saat ini."}
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isUrgent = item.severity === "URGENT";
            const isWarning = item.severity === "WARNING";

            return (
              <div
                key={item.id}
                className={`relative group p-5 rounded-2xl border transition-all ${
                  isUrgent
                    ? "bg-gradient-to-r from-[#1f1017] via-[#131825] to-[#131825] border-rose-500/30 shadow-[0_0_24px_-4px_rgba(244,63,94,0.15)]"
                    : isWarning
                    ? "bg-gradient-to-r from-[#211a10] via-[#131825] to-[#131825] border-amber-500/30 shadow-[0_0_20px_-4px_rgba(245,158,11,0.12)]"
                    : "bg-[#131825] border-white/[0.08] hover:border-purple-500/30"
                } ${item.isRead ? "opacity-75 hover:opacity-100" : ""}`}
              >
                {/* Accent line on left */}
                <div
                  className={`absolute left-0 top-3 bottom-3 w-1 rounded-r ${
                    isUrgent
                      ? "bg-rose-500 shadow-[0_0_8px_#F43F5E]"
                      : isWarning
                      ? "bg-amber-400 shadow-[0_0_8px_#F59E0B]"
                      : "bg-purple-500 shadow-[0_0_8px_#a078ff]"
                  }`}
                />

                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {/* Icon Capsule */}
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                      isUrgent
                        ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                        : isWarning
                        ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                        : "bg-purple-500/15 border-purple-500/30 text-purple-300"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px]">
                      {isUrgent
                        ? "assignment_late"
                        : isWarning
                        ? "event_upcoming"
                        : "explore"}
                    </span>
                  </div>

                  {/* Main Narrative */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold flex items-center gap-1.5 border ${
                            isUrgent
                              ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                              : isWarning
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              : "bg-purple-500/20 text-purple-300 border-purple-500/30"
                          }`}
                        >
                          {isUrgent && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />}
                          {isWarning && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                          <span>{item.severity}</span>
                        </span>

                        {!item.isRead && (
                          <span className="px-2 py-0.5 bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded font-mono text-[10px]">
                            BELUM DIBACA
                          </span>
                        )}
                      </div>

                      {/* Row Actions */}
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        {!item.isRead && (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(item.id)}
                            className="p-1 rounded hover:bg-white/[0.08] text-gray-400 hover:text-emerald-400 transition-colors"
                            title="Tandai Sudah Dibaca"
                          >
                            <span className="material-symbols-outlined text-[17px]">check_circle</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1 rounded hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 transition-colors"
                          title="Hapus Notifikasi"
                        >
                          <span className="material-symbols-outlined text-[17px]">delete_sweep</span>
                        </button>
                      </div>
                    </div>

                    <h2 className="mt-1 text-sm md:text-base font-semibold text-white">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-xs md:text-sm text-gray-300 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-white/[0.05]">
                      <div className="flex items-center gap-2 font-mono text-[11px] text-gray-400">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        <span>{new Date(item.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span>
                      </div>

                      {item.linkUrl && (
                        <Link
                          href={item.linkUrl}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0B0D13] hover:bg-[#1A2133] text-purple-300 border border-purple-500/30 transition-all font-mono text-xs hover:translate-x-0.5"
                        >
                          <span>Buka Entitas</span>
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
