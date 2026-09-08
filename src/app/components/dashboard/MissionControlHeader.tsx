"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HeaderProps {
  userName: string;
  userRole: string;
  streakDays: number;
  activeSessionPill?: {
    minutesRemaining: string;
    taskTitle: string;
  } | null;
}

export function MissionControlHeader({
  userName,
  userRole,
  streakDays,
  activeSessionPill,
}: HeaderProps) {
  const router = useRouter();
  useEffect(() => {
    // Component mounted
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full max-w-full bg-[#131825]/90 backdrop-blur-xl border-b border-white/[0.07] shadow-[0_4px_24px_-2px_rgba(0,0,0,0.65)] overflow-hidden">
      {/* Top Main Command Strip */}
      <div className="h-14 w-full max-w-full px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3 min-w-0">
        {/* Left Brand & Status */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-[#282a30] border border-white/[0.08] shadow-[0_0_12px_rgba(208,188,255,0.25)]">
              <span className="text-[#d0bcff] text-[16px] font-bold">⌘</span>
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d0bcff] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d0bcff]"></span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-['Hanken_Grotesk',sans-serif] text-sm text-[#e2e2eb] tracking-tight font-bold leading-none">
                ATLAS <span className="text-[#d0bcff] text-xs font-mono font-normal tracking-widest ml-0.5">{"// OS"}</span>
              </span>
            </div>
          </Link>

          {/* System Active Badge */}
          <div className="hidden 2xl:flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0c0e14]/70 border border-white/[0.07]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
            <span className="font-mono text-[11px] text-[#4edea3] uppercase font-semibold">⚡ Sistem Siap</span>
            <span className="text-[#494454] text-[10px]">•</span>
            <span className="font-mono text-[11px] text-[#cbc3d7]">Mode Fokus Aktif</span>
          </div>

          {/* Streak */}
          <div className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-md bg-[#0c0e14]/70 border border-white/[0.07]">
            <span className="text-[#F59E0B] text-xs leading-none">🔥</span>
            <span className="font-mono text-[11px] text-[#e2e2eb] font-semibold">{streakDays} Hari Konsisten</span>
          </div>
        </div>

        {/* Center: Command Search Input */}
        <div className="flex-1 min-w-[140px] max-w-xl mx-1 sm:mx-2">
          <button
            onClick={() => router.push("/tasks")}
            className="w-full h-9 px-3 rounded-lg bg-[#0c0e14]/90 hover:bg-[#1A2133] border border-white/[0.07] hover:border-[#d0bcff]/40 text-left flex items-center justify-between transition-all group shadow-inner"
            type="button"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-[#d0bcff] text-[15px] group-hover:scale-110 transition-transform">🔍</span>
              <span className="font-mono text-xs text-[#958ea0] group-hover:text-[#cbc3d7] truncate">
                Cari tugas, proyek, atau navigasi cepat...
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              <kbd className="px-1.5 py-0.5 rounded bg-[#33343b]/80 border border-white/[0.07] font-mono text-[10px] text-[#958ea0] group-hover:text-[#e2e2eb]">⌘</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-[#33343b]/80 border border-white/[0.07] font-mono text-[10px] text-[#958ea0] group-hover:text-[#e2e2eb]">K</kbd>
            </div>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Link
            href="/capture"
            className="h-8 px-2.5 rounded-lg bg-[#a078ff] text-[#3c0091] font-mono text-xs flex items-center gap-1.5 hover:bg-[#d0bcff] transition-all shadow-[0_0_15px_-3px_rgba(160,120,255,0.4)] font-semibold"
          >
            <span>+</span>
            <span className="hidden sm:inline">Catat</span>
            <kbd className="hidden sm:inline px-1 rounded bg-[#3c0091]/20 text-white font-mono text-[9px]">N</kbd>
          </Link>

          {/* Deep Focus Audio */}
          <button
            className="hidden 2xl:flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[#0c0e14]/80 hover:bg-[#1A2133] hover:text-[#e2e2eb] border border-white/[0.07] text-[#cbc3d7] transition-all"
            type="button"
            title="Audio Penenang"
          >
            <span className="text-[#c0c1ff] text-xs">🎧</span>
            <span className="font-mono text-[11px]">Audio Fokus</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c0c1ff] animate-ping ml-0.5"></span>
          </button>

          {/* Active Pomodoro Pill in Header */}
          {activeSessionPill && (
            <Link
              href="/focus"
              className="hidden lg:flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[#0c0e14]/80 border border-white/[0.07] hover:border-[#d0bcff]/30 transition-colors"
            >
              <span className="text-xs leading-none">🍅</span>
              <span className="font-mono text-[11px] text-[#e2e2eb] font-semibold">{activeSessionPill.minutesRemaining}</span>
              <span className="font-mono text-[11px] text-[#958ea0] truncate max-w-[80px] hidden xl:inline">{activeSessionPill.taskTitle}</span>
            </Link>
          )}

          {/* Notification Bell */}
          <Link
            href="/notifications"
            className="relative w-8 h-8 rounded-lg bg-[#0c0e14]/80 hover:bg-[#1A2133] border border-white/[0.07] flex items-center justify-center text-[#958ea0] hover:text-[#e2e2eb] transition-colors"
            title="Notifikasi"
          >
            <span className="text-sm">🔔</span>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#F43F5E] ring-2 ring-[#131825]"></span>
          </Link>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-1 border-l border-white/[0.07]">
            <div className="w-8 h-8 rounded-full bg-[#d0bcff] flex items-center justify-center ring-1 ring-[#d0bcff]/40 text-[#3c0091] font-bold text-xs">
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden 2xl:flex flex-col text-left">
              <span className="font-mono text-[11px] text-[#e2e2eb] font-semibold leading-none truncate max-w-[120px]">
                {userName}
              </span>
              <span className="font-mono text-[9px] text-[#4edea3] leading-tight mt-0.5">
                {userRole}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navbar Navigation */}
      <nav className="w-full max-w-full px-3 sm:px-6 flex items-center gap-3 sm:gap-4 border-t border-white/[0.07] bg-[#131825]/60 backdrop-blur-md overflow-x-auto no-scrollbar text-xs font-mono">
        <Link
          href="/"
          className="py-2 px-2.5 font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 sm:gap-2 text-[#d0bcff] border-b-2 border-[#d0bcff] bg-[#282a30]/40"
        >
          <span>🎯</span> Pusat Kendali
        </Link>
        <Link
          href="/dashboard"
          className="text-[#cbc3d7] hover:text-[#e2e2eb] hover:bg-[#1A2133] py-2 px-2.5 whitespace-nowrap transition-colors flex items-center gap-1.5 sm:gap-2"
        >
          <span>📊</span> Analitik &amp; Performa
        </Link>
        <Link
          href="/projects"
          className="text-[#cbc3d7] hover:text-[#e2e2eb] hover:bg-[#1A2133] py-2 px-2.5 whitespace-nowrap transition-colors flex items-center gap-1.5 sm:gap-2"
        >
          <span>📁</span> Proyek &amp; Target
        </Link>
        <Link
          href="/tasks"
          className="text-[#cbc3d7] hover:text-[#e2e2eb] hover:bg-[#1A2133] py-2 px-2.5 whitespace-nowrap transition-colors flex items-center gap-1.5 sm:gap-2"
        >
          <span>⚡</span> Daftar Tugas
        </Link>
        <Link
          href="/focus"
          className="text-[#cbc3d7] hover:text-[#e2e2eb] hover:bg-[#1A2133] py-2 px-2.5 whitespace-nowrap transition-colors flex items-center gap-1.5 sm:gap-2"
        >
          <span>🍅</span> Sesi Fokus
        </Link>
      </nav>
    </header>
  );
}
