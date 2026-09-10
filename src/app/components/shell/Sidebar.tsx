"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "../ui/Icon";

type NavItem = {
  href: string;
  label: string;
  verb: string;
  icon: IconName;
  color: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navigationGroups: NavGroup[] = [
  {
    title: "Eksekusi Harian",
    items: [
      { href: "/today", label: "Hari Ini", verb: "Harian", icon: "sun", color: "text-[#F59E0B]" },
      { href: "/focus", label: "Mode Fokus", verb: "Pomodoro", icon: "target", color: "text-[#d0bcff]" },
      { href: "/calendar", label: "Jadwal & Kalender", verb: "Waktu", icon: "calendar", color: "text-[#38bdf8]" },
    ],
  },
  {
    title: "Strategi & Target",
    items: [
      { href: "/goals", label: "Target (Goals)", verb: "Sasaran", icon: "flag", color: "text-[#a078ff]" },
      { href: "/projects", label: "Proyek (Projects)", verb: "Eksekusi", icon: "layers", color: "text-[#8B5CF6]" },
      { href: "/areas", label: "Pilar Hidup (Areas)", verb: "Fondasi", icon: "compass", color: "text-[#4edea3]" },
    ],
  },
  {
    title: "Pencatatan & Refleksi",
    items: [
      { href: "/capture", label: "Kotak Masuk (Inbox)", verb: "Catat", icon: "inbox", color: "text-[#F59E0B]" },
      { href: "/review", label: "Refleksi & Evaluasi", verb: "Jurnal", icon: "capture", color: "text-[#38bdf8]" },
      { href: "/insights", label: "Wawasan & AI", verb: "Insights", icon: "sparkles", color: "text-[#d0bcff]" },
      { href: "/assistant", label: "Life Copilot AI", verb: "Asisten", icon: "sparkles", color: "text-[#a078ff]" },
      { href: "/dashboard", label: "Grafik & Analitik", verb: "Statistik", icon: "chart", color: "text-[#4edea3]" },
      { href: "/notifications", label: "Notifikasi", verb: "Info", icon: "bell", color: "text-[#F43F5E]" },
    ],
  },
];

export function isActive(href: string, pathname: string): boolean {
  if (href === "/today") return pathname === "/today" || pathname === "/";
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({
  user,
  onNavigate,
  isExpanded = true,
  isPinned = true,
  onTogglePin,
}: {
  user: { name?: string | null };
  onNavigate?: () => void;
  isExpanded?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const isNotificationsPage = pathname === "/notifications";
  useEffect(() => {
    let mounted = true;
    function fetchUnread() {
      fetch("/api/notifications/unread-count")
        .then((r) => r.json())
        .then((json) => {
          if (mounted && json.success && typeof json.data?.unreadCount === "number") {
            setUnreadCount(json.data.unreadCount);
          }
        })
        .catch(() => {});
    }

    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isNotificationsPage]);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // continue
    }
    router.push("/");
    router.refresh();
  }

  const initials = (user.name || "U")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-full flex-col select-none text-[#e2e2eb] overflow-hidden">
      {/* Brand & Lock Pin Header */}
      <div className="flex items-center justify-between h-9 px-1 shrink-0">
        <Link
          href="/today"
          prefetch={true}
          onMouseEnter={() => router.prefetch("/today")}
          onClick={onNavigate}
          className="flex items-center gap-2.5 group min-w-0"
          title="MyLife - Personal Life OS"
        >
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-white shadow-[0_0_12px_rgba(139,92,246,0.35)] transition-transform group-hover:scale-105">
            <Icon name="sparkles" size={16} />
          </span>
          <div
            className={`flex flex-col leading-tight whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isExpanded
                ? "opacity-100 max-w-[140px] translate-x-0 ml-0"
                : "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
            }`}
          >
            <span className="text-[15px] font-bold tracking-tight text-white">
              My<span className="gradient-text">Life</span>
            </span>
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[#94a3b8]">
              Personal Life OS
            </span>
          </div>
        </Link>

        {onTogglePin && (
          <button
            type="button"
            onClick={onTogglePin}
            aria-label={isPinned ? "Lepaskan Kunci & Minimalkan Sidebar" : "Kunci Sidebar Terbuka"}
            title={isPinned ? "Lepaskan Kunci (Sidebar akan menciut otomatis)" : "Kunci Sidebar Terbuka (Tetap Lebar)"}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-300 cursor-pointer ${
              isExpanded
                ? "opacity-100 scale-100"
                : "opacity-0 scale-75 pointer-events-none w-0 p-0 overflow-hidden"
            } ${
              isPinned
                ? "bg-[#8B5CF6]/20 text-[#d0bcff] hover:bg-[#8B5CF6]/30 border border-[#8B5CF6]/30 shadow-[0_0_8px_rgba(139,92,246,0.2)]"
                : "text-[#94a3b8] hover:bg-white/10 hover:text-white"
            }`}
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-300 ${isPinned ? "text-[#d0bcff] rotate-45" : "text-[#94a3b8]"}`}
              viewBox="0 0 24 24"
              fill={isPinned ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M16 4v4l2 3v2h-6v7l-1 1-1-1v-7H4v-2l2-3V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1z" />
            </svg>
          </button>
        )}
      </div>

      {/* Grouped Navigation */}
      <nav aria-label="Navigasi utama" className="mt-5 flex-1 space-y-3.5 overflow-y-auto overflow-x-hidden pr-0.5">
        {navigationGroups.map((group) => (
          <div key={group.title} className="space-y-0.5">
            {/* Group heading with smooth height collapse */}
            <div className="relative overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
              <div
                className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isExpanded
                    ? "opacity-100 max-h-6 pt-1 pb-1"
                    : "opacity-0 max-h-0 pointer-events-none py-0"
                }`}
              >
                <p className="px-3 text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#64748b] whitespace-nowrap">
                  {group.title}
                </p>
              </div>
              <div
                className={`mx-auto w-6 bg-white/[0.08] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isExpanded ? "h-0 my-0 opacity-0 pointer-events-none" : "h-px my-2 opacity-100"
                }`}
              />
            </div>

            {group.items.map((item) => {
              const active = isActive(item.href, pathname);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onMouseEnter={() => router.prefetch(item.href)}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={!isExpanded ? `${item.label} (${item.verb})` : undefined}
                  className={`group relative flex items-center h-10 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isExpanded ? "px-2.5 gap-2.5 w-full" : "w-10 justify-center mx-auto px-0"
                  } ${
                    active
                      ? "bg-[#8B5CF6]/15 text-white border border-[#8B5CF6]/35 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                      : "text-[#94a3b8] hover:bg-white/[0.06] hover:text-white border border-transparent"
                  }`}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-[#8B5CF6] shadow-[0_0_8px_#8B5CF6]"
                    />
                  )}
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center transition-colors ${
                      active ? item.color : "text-[#94a3b8] group-hover:text-white"
                    }`}
                  >
                    <Icon name={item.icon} size={17} />
                  </span>
                  <div
                    className={`flex items-center justify-between min-w-0 flex-1 whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isExpanded
                        ? "opacity-100 max-w-[170px] translate-x-0"
                        : "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
                    }`}
                  >
                    <span className="text-[13px] font-medium truncate mr-1.5">{item.label}</span>
                    {item.href === "/notifications" && unreadCount > 0 ? (
                      <span className="rounded-full bg-[#F43F5E] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white animate-pulse shrink-0">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    ) : (
                      <span
                        className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded transition-all shrink-0 ${
                          active
                            ? "bg-white/10 text-white"
                            : "bg-white/[0.04] text-[#64748b] group-hover:bg-white/[0.08] group-hover:text-[#94a3b8]"
                        }`}
                      >
                        {item.verb}
                      </span>
                    )}
                  </div>

                  {/* Collapsed unread dot indicator */}
                  {item.href === "/notifications" && unreadCount > 0 && (
                    <span
                      className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#F43F5E] ring-2 ring-[#0c0e14] animate-pulse transition-opacity duration-300 ${
                        isExpanded ? "opacity-0 pointer-events-none" : "opacity-100"
                      }`}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="mt-4 space-y-1 border-t border-white/[0.08] pt-3 overflow-hidden shrink-0">
        {/* Tutorial */}
        <Link
          href="/tutorial"
          prefetch={true}
          onMouseEnter={() => router.prefetch("/tutorial")}
          onClick={onNavigate}
          title={!isExpanded ? "Panduan Tutorial" : undefined}
          className={`group relative flex items-center h-10 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border ${
            isExpanded ? "px-2.5 gap-2.5 w-full" : "w-10 justify-center mx-auto px-0"
          } ${
            isActive("/tutorial", pathname)
              ? "bg-[#8B5CF6]/15 border-[#8B5CF6]/35 text-white"
              : "text-[#94a3b8] hover:bg-white/[0.06] hover:text-white border-transparent"
          }`}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[#F59E0B]">
            <Icon name="bookOpen" size={16} />
          </span>
          <div
            className={`flex items-center justify-between min-w-0 flex-1 whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isExpanded
                ? "opacity-100 max-w-[170px] translate-x-0"
                : "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
            }`}
          >
            <span className="text-[13px] font-medium truncate mr-1.5">Panduan Tutorial</span>
            <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-white/[0.04] text-[#64748b] shrink-0">
              Bantuan
            </span>
          </div>
        </Link>

        {/* Settings */}
        <Link
          href="/settings"
          prefetch={true}
          onMouseEnter={() => router.prefetch("/settings")}
          onClick={onNavigate}
          title={!isExpanded ? "Pengaturan Sistem" : undefined}
          className={`group relative flex items-center h-10 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border ${
            isExpanded ? "px-2.5 gap-2.5 w-full" : "w-10 justify-center mx-auto px-0"
          } ${
            isActive("/settings", pathname)
              ? "bg-[#8B5CF6]/15 border-[#8B5CF6]/35 text-white"
              : "text-[#94a3b8] hover:bg-white/[0.06] hover:text-white border-transparent"
          }`}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[#94a3b8] group-hover:text-white transition-colors">
            <Icon name="settings" size={16} />
          </span>
          <div
            className={`flex items-center justify-between min-w-0 flex-1 whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isExpanded
                ? "opacity-100 max-w-[170px] translate-x-0"
                : "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
            }`}
          >
            <span className="text-[13px] font-medium truncate mr-1.5">Pengaturan</span>
            <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-white/[0.04] text-[#64748b] shrink-0">
              Sistem
            </span>
          </div>
        </Link>

        {/* User Card */}
        <div
          className={`flex items-center h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isExpanded ? "px-2.5 gap-2.5 w-full" : "w-10 justify-center mx-auto px-0"
          }`}
          title={!isExpanded ? user.name || "Akun" : undefined}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-[11px] font-bold text-white shadow-sm">
            {initials}
          </span>
          <div
            className={`flex items-center justify-between min-w-0 flex-1 whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isExpanded
                ? "opacity-100 max-w-[170px] translate-x-0"
                : "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
            }`}
          >
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[#e2e2eb] mr-1">
              {user.name || "Akun"}
            </span>
            <button
              onClick={logout}
              aria-label="Keluar"
              title="Keluar / Logout"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#94a3b8] transition-all hover:bg-[#F43F5E]/20 hover:text-[#F43F5E] cursor-pointer"
            >
              <Icon name="logout" size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}