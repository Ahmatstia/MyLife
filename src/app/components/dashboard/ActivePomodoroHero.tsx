"use client";

import { useEffect, useState } from "react";
import { useToast } from "../ui/Toast";

interface PomodoroHeroProps {
  session: {
    id: string;
    taskId: string;
    taskTitle: string;
    taskDescription: string;
    parentTitle: string;
    startedAt: string;
    elapsedSeconds: number;
    targetSeconds: number;
    obstacleNote: string;
    xpBonus: number;
  } | null;
}

export function ActivePomodoroHero({ session }: PomodoroHeroProps) {
  const { toast } = useToast();
  const targetSec = session?.targetSeconds || 25 * 60;
  const initialRemaining = Math.max(0, targetSec - (session?.elapsedSeconds || 0));

  const [secondsRemaining, setSecondsRemaining] = useState(initialRemaining || 21 * 60 + 42);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [obstacle, setObstacle] = useState(
    session?.obstacleNote ||
      "Fixing cookie httpOnly SameSite=Lax mismatch between Vite dev proxy and Go backend (localhost:8080)."
  );

  useEffect(() => {
    if (isPaused || secondsRemaining <= 0 || isCompleted) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, secondsRemaining, isCompleted]);

  // Spacebar keyboard shortcut to toggle Pause/Resume
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const m = Math.floor(secondsRemaining / 60);
  const s = secondsRemaining % 60;
  const timeFormatted = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  // SVG dash offset calculation (circumference = 2 * PI * 50 = 314.16)
  const circumference = 314.16;
  const progressRatio = secondsRemaining / targetSec;
  const dashoffset = circumference * (1 - progressRatio);

  async function handleComplete() {
    setIsCompleted(true);
    toast("Sesi Pomodoro selesai! +150 XP didapatkan.", "success");
    if (session?.id && session.id !== "active-sprint-mock") {
      try {
        await fetch(`/api/sessions/${session.id}/end`, { method: "POST" });
      } catch {
        // handled
      }
    }
  }

  function handleAdd5m() {
    setSecondsRemaining((prev) => prev + 5 * 60);
    toast("+5 Menit ditambahkan ke timer.", "info");
  }

  if (!session) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-[#131825] p-5 sm:p-6 border border-white/[0.07] shadow-xl group">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#a078ff]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#4edea3]/10 text-[#4edea3] font-mono text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]"></span>
              SESI FOKUS // SIAP DIMULAI
            </span>
            <span className="text-[#958ea0] text-xs font-mono">
              Standar 25 Menit
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#191b22] font-mono text-[11px] text-[#c0c1ff]">
            <span className="text-xs">🎧</span>
            <span>Audio Fokus (Brown Noise)</span>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center my-2">
          <div className="sm:col-span-7 flex flex-col gap-1.5">
            <h2 className="font-['Hanken_Grotesk',sans-serif] text-xl sm:text-2xl text-[#e2e2eb] font-bold tracking-tight">
              Siap Memulai Sesi Fokus Hari Ini?
            </h2>
            <p className="font-mono text-xs text-[#cbc3d7] leading-relaxed">
              Pilih tugas prioritas di bawah untuk memulai sesi kerja mendalam 25 menit. Dapatkan poin XP dan bangun konsistensi harian Anda.
            </p>
          </div>

          <div className="sm:col-span-5 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center w-36 h-36">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  className="text-[#33343b] opacity-40"
                  cx="60"
                  cy="60"
                  fill="none"
                  r="50"
                  stroke="currentColor"
                  strokeWidth="7"
                ></circle>
                <circle
                  className="text-[#d0bcff]"
                  cx="60"
                  cy="60"
                  fill="none"
                  r="50"
                  stroke="currentColor"
                  strokeDasharray="314.16"
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  strokeWidth="7"
                ></circle>
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="font-['Hanken_Grotesk',sans-serif] text-3xl font-bold text-[#e2e2eb] tracking-tight">
                  25:00
                </span>
                <span className="font-mono text-[10px] text-[#958ea0] uppercase tracking-widest mt-0.5">
                  Target 25 Menit
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-3 mt-4 border-t border-white/[0.05]">
          <a
            href="/focus"
            className="px-4 py-2 rounded-lg bg-[#d0bcff] text-[#3c0091] font-mono text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#d0bcff]/20 hover:bg-[#e9ddff] transition-all"
          >
            <span>▶</span>
            <span>Mulai Sesi Fokus [Spasi]</span>
          </a>
          <div className="flex items-center gap-2 font-mono text-xs text-[#958ea0]">
            <span>Bonus Konsistensi: <strong className="text-[#F59E0B]">+150 XP</strong></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#131825] p-5 sm:p-6 border border-white/[0.07] shadow-xl group">
      {/* Ambient subtle violet glow behind countdown */}
      <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#a078ff]/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-[#3131c0]/20 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header Pill & Meta */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-[#d0bcff]/10 text-[#d0bcff] font-mono text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d0bcff] animate-pulse"></span>
            SESI FOKUS BERJALAN
          </span>
          <span className="text-[#958ea0] text-xs font-mono">
            {session.parentTitle}
          </span>
        </div>

        {/* Audio Ambient Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#191b22] font-mono text-[11px] text-[#c0c1ff]">
          <span className="text-xs">🎧</span>
          <span>Audio Fokus (Brown Noise)</span>
        </div>
      </div>

      {/* Title & Countdown Row */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center my-2">
        <div className="sm:col-span-7 flex flex-col gap-1.5">
          <h2 className="font-['Hanken_Grotesk',sans-serif] text-xl sm:text-2xl text-[#e2e2eb] font-bold tracking-tight">
            {session.taskTitle}
          </h2>
          <p className="font-mono text-xs text-[#cbc3d7] leading-relaxed">
            {session.taskDescription}
          </p>
        </div>

        {/* Circular SVG Timer */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center w-36 h-36">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle
                className="text-[#33343b] opacity-40"
                cx="60"
                cy="60"
                fill="none"
                r="50"
                stroke="currentColor"
                strokeWidth="7"
              ></circle>
              <circle
                className="text-[#d0bcff] transition-all duration-700"
                cx="60"
                cy="60"
                fill="none"
                r="50"
                stroke="currentColor"
                strokeDasharray="314.16"
                strokeDashoffset={dashoffset}
                strokeLinecap="round"
                strokeWidth="7"
              ></circle>
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="font-['Hanken_Grotesk',sans-serif] text-3xl font-bold text-[#e2e2eb] tracking-tight">
                {isCompleted ? "SELESAI" : timeFormatted}
              </span>
              <span className="font-mono text-[10px] text-[#958ea0] uppercase tracking-widest mt-0.5">
                Target 25:00
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Friction / Obstacle Scratchpad */}
      <div className="relative z-10 mt-2 mb-4 p-3 rounded-lg bg-[#0c0e14]/80 text-[#e2e2eb] flex items-start gap-2.5 border border-white/[0.05]">
        <span className="text-[#F59E0B] text-base shrink-0 mt-0.5">⚠️</span>
        <div className="flex-1">
          <div className="font-mono text-[10px] text-[#F59E0B] font-bold uppercase tracking-wider">
            Catatan Kendala Saat Ini (Opsional)
          </div>
          <input
            type="text"
            value={obstacle}
            onChange={(e) => setObstacle(e.target.value)}
            className="w-full bg-transparent font-mono text-xs text-[#cbc3d7] leading-snug border-none outline-none focus:text-white p-0 mt-0.5"
            placeholder="Tulis kendala yang dihadapi saat mengerjakan tugas ini..."
          />
        </div>
      </div>

      {/* Focus Controls */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/[0.05]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused((p) => !p)}
            className="px-4 py-2 rounded-lg bg-[#d0bcff] text-[#3c0091] font-mono text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#d0bcff]/20 hover:bg-[#e9ddff] transition-all"
            type="button"
          >
            <span>{isPaused ? "▶" : "⏸"}</span>
            <span>{isPaused ? "Lanjutkan" : "Jeda"}</span>
            <kbd className="px-1 py-0.5 rounded bg-[#3c0091]/20 text-[#3c0091] font-mono text-[10px]">
              Spasi
            </kbd>
          </button>

          <button
            onClick={handleComplete}
            className="px-3 py-2 rounded-lg bg-[#282a30] hover:bg-[#1A2133] text-[#e2e2eb] font-mono text-xs flex items-center gap-1.5 transition-all border border-white/[0.06]"
            type="button"
          >
            <span className="text-[#4edea3]">✓</span>
            <span>Selesai</span>
            <kbd className="px-1 py-0.5 rounded bg-[#0c0e14] text-[#958ea0] font-mono text-[10px]">
              ⌘↵
            </kbd>
          </button>

          <button
            onClick={handleAdd5m}
            className="px-3 py-2 rounded-lg bg-[#282a30] hover:bg-[#1A2133] text-[#cbc3d7] font-mono text-xs flex items-center gap-1 transition-all border border-white/[0.06]"
            type="button"
          >
            <span>+5 Menit</span>
          </button>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-[#958ea0]">
          <span>
            Bonus Konsistensi: <strong className="text-[#F59E0B]">+{session?.xpBonus || 150} XP</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
