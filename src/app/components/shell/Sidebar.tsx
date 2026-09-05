"use client";

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
      { href: "/", label: "Beranda", verb: "Orientasi", icon: "compass", color: "text-primary-600" },
      { href: "/today", label: "Hari Ini", verb: "Tugas", icon: "sun", color: "text-warning-600" },
      { href: "/focus", label: "Fokus Harian", verb: "Pomodoro", icon: "target", color: "text-warning-600" },
    ],
  },
  {
    title: "Arah & Fondasi",
    items: [
      { href: "/areas", label: "Areas (Pilar)", verb: "Pilar", icon: "compass", color: "text-ai-600" },
      { href: "/goals", label: "Goals (Target)", verb: "Target", icon: "flag", color: "text-ai-600" },
      { href: "/projects", label: "Projects", verb: "Proyek", icon: "layers", color: "text-primary-600" },
    ],
  },
  {
    title: "Pencatatan & Waktu",
    items: [
      { href: "/capture", label: "Inbox Catatan", verb: "Inbox", icon: "inbox", color: "text-primary-600" },
      { href: "/calendar", label: "Kalender", verb: "Jadwal", icon: "calendar", color: "text-warning-600" },
      { href: "/activity", label: "Aktivitas", verb: "Log Waktu", icon: "clock", color: "text-success-600" },
    ],
  },
  {
    title: "Evaluasi & Panduan",
    items: [
      { href: "/insights", label: "Insights", verb: "Kesehatan", icon: "sparkles", color: "text-primary-600" },
      { href: "/dashboard", label: "Analitik", verb: "Grafik", icon: "chart", color: "text-success-600" },
      { href: "/review", label: "Refleksi", verb: "Evaluasi", icon: "capture", color: "text-info-500" },
      { href: "/notifications", label: "Notifikasi", verb: "Info", icon: "bell", color: "text-danger-600" },
      { href: "/tutorial", label: "Panduan Tutorial", verb: "Panduan", icon: "bookOpen", color: "text-amber-500" },
    ],
  },
];

const navItemActiveBg: Record<string, string> = {
  "/": "from-primary-50/80 to-primary-100/50 border-primary-200/60",
  "/today": "from-warning-50/80 to-warning-100/50 border-warning-200/60",
  "/focus": "from-warning-50/80 to-warning-100/50 border-warning-200/60",
  "/capture": "from-primary-50/80 to-primary-100/50 border-primary-200/60",
  "/insights": "from-primary-50/80 to-primary-100/50 border-primary-200/60",
  "/notifications": "from-danger-50/80 to-danger-100/50 border-danger-200/60",
  "/goals": "from-ai-50/80 to-ai-100/50 border-ai-200/60",
  "/dashboard": "from-success-50/80 to-success-100/50 border-success-200/60",
  "/review": "from-info-50/80 to-info-100/50 border-info-200/60",
  "/projects": "from-primary-50/80 to-primary-100/50 border-primary-200/60",
  "/areas": "from-ai-50/80 to-ai-100/50 border-ai-200/60",
  "/calendar": "from-warning-50/80 to-warning-100/50 border-warning-200/60",
  "/activity": "from-success-50/80 to-success-100/50 border-success-200/60",
  "/tutorial": "from-amber-50/80 to-amber-100/50 border-amber-200/60",
};

const navItemActiveText: Record<string, string> = {
  "/": "text-primary-700",
  "/today": "text-warning-700",
  "/focus": "text-warning-700",
  "/capture": "text-primary-700",
  "/insights": "text-primary-700",
  "/notifications": "text-danger-700",
  "/goals": "text-ai-700",
  "/dashboard": "text-success-700",
  "/review": "text-info-600",
  "/projects": "text-primary-700",
  "/areas": "text-ai-700",
  "/calendar": "text-warning-700",
  "/activity": "text-success-700",
  "/tutorial": "text-amber-700",
};

export function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

import { useState, useEffect } from "react";

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

  useEffect(() => {
    fetch("/api/notifications/unread-count")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && typeof json.data?.unreadCount === "number") {
          setUnreadCount(json.data.unreadCount);
        }
      })
      .catch(() => {});
  }, [pathname]);

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
    <div className="flex h-full flex-col">
      {/* Brand */}
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-3 py-1 group"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-ai-600 text-white shadow-sm transition-transform group-hover:scale-105">
          <Icon name="sparkles" size={16} />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[14px] font-bold tracking-tight text-surface-900">
            My<span className="gradient-text">Life</span>
          </span>
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-surface-400">
            Personal Life OS
          </span>
        </span>
      </Link>

      {/* Grouped Navigation */}
      <nav aria-label="Navigasi utama" className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1">
        {navigationGroups.map((group) => (
          <div key={group.title} className="space-y-0.5">
            <p className="px-3 pb-1 text-[9.5px] font-bold uppercase tracking-[0.16em] text-surface-400">
              {group.title}
            </p>
            {group.items.map((item) => {
              const active = isActive(item.href, pathname);
              const activeBg = navItemActiveBg[item.href] ?? navItemActiveBg["/"];
              const activeText = navItemActiveText[item.href] ?? "text-primary-700";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
                    active
                      ? `bg-gradient-to-r ${activeBg} border ${activeText}`
                      : "text-surface-600 hover:bg-surface-100 hover:text-surface-900 border border-transparent"
                  }`}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-current opacity-60"
                    />
                  )}
                  <span className={`${active ? item.color : "text-surface-400 group-hover:text-surface-600"} transition-colors`}>
                    <Icon name={item.icon} size={16} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.href === "/notifications" && unreadCount > 0 ? (
                    <span className="rounded-full bg-danger-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white animate-pulse">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : (
                    <span
                      className={`chip transition-all ${
                        active
                          ? "bg-current/10 text-current"
                          : "bg-surface-100 text-surface-400 group-hover:bg-surface-150"
                      }`}
                    >
                      {item.verb}
                    </span>
                  )}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="waypoint-pulse absolute -right-0.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-current"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="mt-4 space-y-1 border-t border-surface-100 pt-4">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all border ${
            isActive("/settings", pathname)
              ? "bg-gradient-to-r from-surface-50 to-surface-100 border-surface-200 text-surface-800"
              : "text-surface-500 hover:bg-surface-100 hover:text-surface-800 border-transparent"
          }`}
        >
          <Icon name="settings" size={15} className="text-surface-400 group-hover:text-surface-600 transition-colors" />
          <span className="min-w-0 flex-1 truncate">Pengaturan</span>
          <span className="chip bg-surface-100 text-surface-400">System</span>
        </Link>

        {/* User card */}
        <div className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-surface-50 to-surface-100 border border-surface-150 px-3 py-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-ai-600 text-[11px] font-bold text-white">
            {initials}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-surface-800">
            {user.name || "Akun"}
          </span>
          <button
            onClick={logout}
            aria-label="Keluar"
            title="Keluar"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-surface-400 transition-all hover:bg-danger-50 hover:text-danger-600"
          >
            <Icon name="logout" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}