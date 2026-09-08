"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "../ui/Icon";
import { AICommandPanel } from "../AICommandPanel";
import { Sidebar, isActive } from "./Sidebar";

type GlobalAIDrawerProps = {
  open: boolean;
  onClose: () => void;
  context?: { taskId?: string; taskName?: string; goalId?: string; goalName?: string; stageId?: string };
};

export function GlobalAIDrawer({ open, onClose, context }: GlobalAIDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-surface-950/30 p-4 pt-16 backdrop-blur-sm sm:pt-24"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Asisten AI"
    >
      <div className="animate-in-scale w-full max-w-xl rounded-2xl border border-surface-200 bg-white p-5 shadow-pop">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-ai-600 to-primary-600 text-white">
              <Icon name="sparkles" size={14} />
            </span>
            <span className="text-sm font-bold gradient-text">Asisten AI</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup asisten"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-all"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
        <AICommandPanel initialContext={context} className="border-0 bg-transparent p-0 shadow-none" />
      </div>
    </div>
  );
}

const mobileNav: { href: string; label: string; icon: IconName }[] = [
  { href: "/today", label: "Hari Ini", icon: "sun" },
  { href: "/focus", label: "Fokus", icon: "target" },
  { href: "/goals", label: "Target", icon: "flag" },
  { href: "/capture", label: "Catat", icon: "inbox" },
  { href: "/review", label: "Refleksi", icon: "capture" },
];

export function AppShell({
  user,
  context,
  children,
}: {
  user: { name?: string | null };
  context?: { taskId?: string; taskName?: string; goalId?: string; goalName?: string; stageId?: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [aiOpen, setAiOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Desktop sidebar collapse & lock state (default true for server & client hydration consistency)
  const [isPinned, setIsPinned] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Read client-side preference asynchronously after hydration to avoid SSR mismatch
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem("mylife_sidebar_pinned");
        if (saved !== null) {
          setIsPinned(saved === "true");
        }
      } catch {
        // ignore
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const togglePin = () => {
    setIsPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mylife_sidebar_pinned", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const isExpanded = isPinned || isHovered;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setAiOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0D13] text-[#e2e2eb] w-full max-w-full overflow-x-hidden">
      {/* Desktop sidebar with minimize, auto-hover expand, and lock pin */}
      <aside
        onMouseEnter={() => {
          if (!isPinned) setIsHovered(true);
        }}
        onMouseLeave={() => {
          if (!isPinned) setIsHovered(false);
        }}
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-white/[0.08] bg-[#0c0e14]/95 backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width] lg:block px-2.5 py-4 ${
          isExpanded
            ? "w-60 shadow-[0_10px_35px_rgba(0,0,0,0.7)]"
            : "w-[4.5rem] shadow-md"
        }`}
      >
        <Sidebar
          user={user}
          isExpanded={isExpanded}
          isPinned={isPinned}
          onTogglePin={togglePin}
        />
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSidebarOpen(false);
          }}
        >
          <div className="h-full w-64 bg-[#0c0e14] p-4 shadow-2xl border-r border-white/[0.08]">
            <Sidebar
              user={user}
              onNavigate={() => setSidebarOpen(false)}
              isExpanded={true}
              isPinned={true}
            />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className={`transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isPinned ? "lg:pl-60" : "lg:pl-[4.5rem]"}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0B0D13]/85 backdrop-blur-xl text-[#e2e2eb] transition-all duration-300">
          <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94a3b8] hover:bg-white/10 hover:text-white lg:hidden transition-all"
              aria-label="Buka menu"
            >
              <Icon name="menu" size={18} />
            </button>

            {/* Logo mobile */}
            <Link href="/today" className="flex items-center gap-2 lg:hidden">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-white">
                <Icon name="sparkles" size={14} />
              </span>
              <span className="text-sm font-bold tracking-tight text-white">
                My<span className="text-[#a078ff]">Life</span>
              </span>
            </Link>

            <div className="flex-1" />

            {/* AI trigger — contextual search bar */}
            <button
              onClick={() => setAiOpen(true)}
              aria-label="Buka asisten AI"
              title="Tanya apa saja (⌘K)"
              className="group inline-flex h-8 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#131825] px-3 text-[13px] font-medium text-[#94a3b8] transition-all hover:border-[#8B5CF6]/50 hover:bg-[#1A2133] hover:text-white hover:shadow-[0_0_15px_-3px_rgba(139,92,246,0.3)] lg:min-w-[240px]"
            >
              <span className="flex h-4.5 w-4.5 items-center justify-center rounded-md bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-white">
                <Icon name="sparkles" size={10} />
              </span>
              <span className="hidden lg:inline text-[#94a3b8] group-hover:text-white">
                Tanya apa saja…
              </span>
              <span className="ml-auto hidden rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-[#94a3b8] lg:inline font-mono">
                ⌘K
              </span>
            </button>

            {/* Quick capture */}
            <Link
              href="/today"
              className="hidden h-8 w-8 items-center justify-center rounded-lg text-[#94a3b8] hover:bg-white/10 hover:text-white lg:flex transition-all"
              aria-label="Catat cepat"
              title="Catat cepat"
            >
              <Icon name="capture" size={16} />
            </Link>
            <Link
              href="/settings"
              className={`hidden h-8 w-8 items-center justify-center rounded-lg lg:flex transition-all ${
                isActive("/settings", pathname)
                  ? "bg-white/10 text-white"
                  : "text-[#94a3b8] hover:bg-white/10 hover:text-white"
              }`}
              aria-label="Pengaturan"
            >
              <Icon name="settings" size={16} />
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-5 sm:px-6 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav — floating pill */}
      <nav
        className="fixed inset-x-4 bottom-4 z-40 rounded-2xl border border-white/10 bg-[#131825]/95 shadow-2xl pb-[max(0px,env(safe-area-inset-bottom))] backdrop-blur-xl transition-all duration-300 lg:hidden"
        aria-label="Navigasi utama"
      >
        <div className="flex items-stretch justify-around px-1 py-1">
          {mobileNav.map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold transition-all ${
                  active
                    ? "bg-[#8B5CF6]/20 text-[#d0bcff]"
                    : "text-[#94a3b8] hover:text-white"
                }`}
              >
                <Icon name={item.icon} size={19} />
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#8B5CF6]"
                  />
                )}
              </Link>
            );
          })}
          <button
            onClick={() => setAiOpen(true)}
            className="flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold text-[#a078ff] hover:bg-white/5 transition-all"
          >
            <Icon name="sparkles" size={19} />
            Asisten
          </button>
        </div>
      </nav>

      <GlobalAIDrawer open={aiOpen} onClose={() => setAiOpen(false)} context={context} />
    </div>
  );
}