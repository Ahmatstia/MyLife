"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
    title: "Pusat",
    items: [
      { href: "/", label: "Beranda", verb: "Utama", icon: "home", color: "text-[#8B5CF6]" },
    ],
  },
  {
    title: "Eksekusi Harian",
    items: [
      { href: "/today", label: "Hari Ini", verb: "Harian", icon: "sun", color: "text-[#F59E0B]" },
      { href: "/focus", label: "Mode Fokus", verb: "Pomodoro", icon: "target", color: "text-[#d0bcff]" },
      { href: "/calendar", label: "Kalender", verb: "Jadwal", icon: "calendar", color: "text-[#38bdf8]" },
    ],
  },
  {
    title: "Perencanaan",
    items: [
      { href: "/goals", label: "Target & Proyek", verb: "Sasaran", icon: "flag", color: "text-[#a078ff]" },
      { href: "/capture", label: "Inbox", verb: "Catat", icon: "inbox", color: "text-[#F59E0B]" },
    ],
  },
  {
    title: "Evaluasi & AI",
    items: [
      { href: "/progress", label: "Progress & Refleksi", verb: "Evaluasi", icon: "chart", color: "text-[#4edea3]" },
      { href: "/assistant", label: "Life Copilot AI", verb: "Asisten", icon: "sparkles", color: "text-[#a078ff]" },
      { href: "/notifications", label: "Notifikasi", verb: "Info", icon: "bell", color: "text-[#F43F5E]" },
    ],
  },
];


export function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/" || pathname === "/beranda" || pathname === "/direction" || pathname === "/home";
  if (href === "/today") return pathname === "/today";
  // /progress is active for all merged evaluation pages
  if (href === "/progress") {
    return ["/progress", "/dashboard", "/review", "/insights", "/activity"].some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
  }
  // /goals is active for projects and areas too
  if (href === "/goals") {
    return ["/goals", "/projects", "/areas"].some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
  }
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
          href="/"
          prefetch={true}
          onMouseEnter={() => router.prefetch("/")}
          onClick={onNavigate}
          className="flex items-center gap-2.5 group min-w-0"
          title="MyLife - Personal Life OS"
        >
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-[0_0_12px_rgba(99,102,241,0.35)] transition-transform group-hover:scale-105">
            <Image
              src="/logo.png"
              alt="MyLife Logo"
              width={32}
              height={32}
              priority
              className="object-cover w-full h-full"
            />
          </div>
          <div
            className={`flex flex-col leading-tight whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isExpanded
                ? "opacity-100 max-w-[140px] translate-x-0 ml-0"
                : "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
            }`}
          >
            <span className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">
              My<span className="gradient-text">Life</span>
            </span>
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-[#94a3b8]">
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
                : "text-slate-500 dark:text-[#94a3b8] hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-300 ${isPinned ? "text-[#d0bcff] rotate-45" : "text-slate-500 dark:text-[#94a3b8]"}`}
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
                <p className="px-3 text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-[#64748b] whitespace-nowrap">
                  {group.title}
                </p>
              </div>
              <div
                className={`mx-auto w-6 bg-slate-200/80 dark:bg-white/[0.08] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
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
                      ? "bg-[#8B5CF6]/15 text-[#6d28d9] dark:text-white border border-[#8B5CF6]/35 shadow-sm"
                      : "text-slate-600 dark:text-[#94a3b8] hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white border border-transparent"
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
                      active ? item.color : "text-slate-400 dark:text-[#94a3b8] group-hover:text-slate-700 dark:group-hover:text-white"
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
                            ? "bg-white/40 dark:bg-white/10 text-[#6d28d9] dark:text-white"
                            : "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-[#64748b] group-hover:bg-slate-200 dark:group-hover:bg-white/[0.08] group-hover:text-slate-700 dark:group-hover:text-[#94a3b8]"
                        }`}
                      >
                        {item.verb}
                      </span>
                    )}
                  </div>

                  {/* Collapsed unread dot indicator */}
                  {item.href === "/notifications" && unreadCount > 0 && (
                    <span
                      className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#F43F5E] ring-2 ring-white dark:ring-[#0c0e14] animate-pulse transition-opacity duration-300 ${
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
      <div className="mt-4 space-y-1 border-t border-slate-200/80 dark:border-white/[0.08] pt-3 overflow-hidden shrink-0">
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
              ? "bg-[#8B5CF6]/15 border-[#8B5CF6]/35 text-[#6d28d9] dark:text-white"
              : "text-slate-600 dark:text-[#94a3b8] hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white border-transparent"
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
            <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-[#64748b] shrink-0">
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
              ? "bg-[#8B5CF6]/15 border-[#8B5CF6]/35 text-[#6d28d9] dark:text-white"
              : "text-slate-600 dark:text-[#94a3b8] hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white border-transparent"
          }`}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-400 dark:text-[#94a3b8] group-hover:text-slate-700 dark:group-hover:text-white transition-colors">
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
            <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-[#64748b] shrink-0">
              Sistem
            </span>
          </div>
        </Link>

        {/* User Card */}
        <div
          className={`flex items-center h-10 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
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
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-slate-800 dark:text-[#e2e2eb] mr-1">
              {user.name || "Akun"}
            </span>
            <button
              onClick={logout}
              aria-label="Keluar"
              title="Keluar / Logout"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 dark:text-[#94a3b8] transition-all hover:bg-[#F43F5E]/20 hover:text-[#F43F5E] cursor-pointer"
            >
              <Icon name="logout" size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}