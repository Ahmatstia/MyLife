"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "./ThemeProvider";

const emptySubscribe = () => () => {};

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { effectiveTheme, toggleTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Avoid hydration mismatch by rendering placeholder with same layout
  if (!mounted) {
    return (
      <div
        className={`w-8 h-8 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = effectiveTheme === "DARK";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex h-8 w-8 items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer ${
        isDark
          ? "border-white/[0.1] bg-[#131825] text-[#d0bcff] hover:bg-[#1A2133] hover:text-white hover:border-[#8B5CF6]/50 shadow-sm"
          : "border-slate-200 bg-white text-amber-500 hover:bg-slate-100 hover:text-amber-600 hover:border-amber-300 shadow-sm"
      } ${className}`}
      title={isDark ? "Ganti ke Tema Terang ☀️" : "Ganti ke Tema Gelap (Obsidian) 🌙"}
      aria-label={isDark ? "Aktifkan tema terang" : "Aktifkan tema gelap"}
    >
      {isDark ? (
        <svg
          className="w-4 h-4 transition-transform duration-300 hover:-rotate-12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg
          className="w-4 h-4 transition-transform duration-300 hover:rotate-45"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
    </button>
  );
}
