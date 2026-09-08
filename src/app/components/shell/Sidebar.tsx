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
}: {
  user: { name?: string | null };
  onNavigate?: () => void;
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
    <div className="flex h-full flex-col select-none text-[#e2e2eb]">
      {/* Brand */}
      <Link
        href="/today"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-3 py-1 group"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-white shadow-[0_0_12px_rgba(139,92,246,0.35)] transition-transform group-hover:scale-105">
          <Icon name="sparkles" size={16} />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[15px] font-bold tracking-tight text-white">
            My<span className="text-[#a078ff]">Life</span>
          </span>
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[#94a3b8]">
            Personal Life OS
          </span>
        </span>
      </Link>

      {/* Grouped Navigation */}
      <nav aria-label="Navigasi utama" className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1">
        {navigationGroups.map((group) => (
          <div key={group.title} className="space-y-0.5">
            <p className="px-3 pb-1 text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#64748b]">
              {group.title}
            </p>
            {group.items.map((item) => {
              const active = isActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
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
                    className={`${
                      active ? item.color : "text-[#94a3b8] group-hover:text-white"
                    } transition-colors`}
                  >
                    <Icon name={item.icon} size={16} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.href === "/notifications" && unreadCount > 0 ? (
                    <span className="rounded-full bg-[#F43F5E] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white animate-pulse">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : (
                    <span
                      className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded transition-all ${
                        active
                          ? "bg-white/10 text-white"
                          : "bg-white/[0.04] text-[#64748b] group-hover:bg-white/[0.08] group-hover:text-[#94a3b8]"
                      }`}
                    >
                      {item.verb}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="mt-4 space-y-1 border-t border-white/[0.08] pt-3">
        <Link
          href="/tutorial"
          onClick={onNavigate}
          className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all border ${
            isActive("/tutorial", pathname)
              ? "bg-[#8B5CF6]/15 border-[#8B5CF6]/35 text-white"
              : "text-[#94a3b8] hover:bg-white/[0.06] hover:text-white border-transparent"
          }`}
        >
          <Icon name="bookOpen" size={15} className="text-[#F59E0B]" />
          <span className="min-w-0 flex-1 truncate">Panduan Tutorial</span>
          <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-white/[0.04] text-[#64748b]">
            Bantuan
          </span>
        </Link>

        <Link
          href="/settings"
          onClick={onNavigate}
          className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all border ${
            isActive("/settings", pathname)
              ? "bg-[#8B5CF6]/15 border-[#8B5CF6]/35 text-white"
              : "text-[#94a3b8] hover:bg-white/[0.06] hover:text-white border-transparent"
          }`}
        >
          <Icon name="settings" size={15} className="text-[#94a3b8] group-hover:text-white transition-colors" />
          <span className="min-w-0 flex-1 truncate">Pengaturan</span>
          <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-white/[0.04] text-[#64748b]">
            Sistem
          </span>
        </Link>

        {/* User card */}
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-[11px] font-bold text-white shadow-sm">
            {initials}
          </span>
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[#e2e2eb]">
            {user.name || "Akun"}
          </span>
          <button
            onClick={logout}
            aria-label="Keluar"
            title="Keluar / Logout"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#94a3b8] transition-all hover:bg-[#F43F5E]/20 hover:text-[#F43F5E]"
          >
            <Icon name="logout" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}