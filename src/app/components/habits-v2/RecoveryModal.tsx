"use client";

import React from "react";

interface RecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats?: {
    confirmedCleanDays?: number;
    longestStreakDays?: number;
  } | null;
}

export function RecoveryModal({
  isOpen,
  onClose,
  stats,
}: RecoveryModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#171725] p-6 shadow-2xl text-center">
        {/* Warm Icon / Badge */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/30 text-2xl text-amber-300">
          🌱
        </div>

        {/* Title */}
        <h2
          id="recovery-modal-title"
          className="text-xl font-bold text-white mb-2 leading-snug"
        >
          Hari ini terpeleset. Progresmu yang lain tetap ada.
        </h2>

        {/* Supportive Message (Desain §13.2) */}
        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          Situasi tadi berat, dan itu manusiawi. Terpeleset adalah proses untuk lebih memahami pemicumu. Mulai hitungan baru, bawa pelajaran yang sama.
        </p>

        {/* Side-by-side Recovery Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-6 p-3.5 rounded-xl bg-white/5 border border-white/10 text-left">
          <div className="border-r border-white/10 pr-2">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Total Hari Bersih
            </span>
            <span className="text-2xl font-extrabold text-emerald-400">
              {stats?.confirmedCleanDays ?? 0}{" "}
              <span className="text-xs font-normal text-slate-400">hari</span>
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Hari-hari ini tidak hilang.
            </p>
          </div>

          <div className="pl-2">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Streak Terbaik
            </span>
            <span className="text-2xl font-extrabold text-amber-300">
              {stats?.longestStreakDays ?? 0}{" "}
              <span className="text-xs font-normal text-slate-400">hari</span>
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Bukti kemampuanmu bertahan.
            </p>
          </div>
        </div>

        {/* Call to action button */}
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:from-amber-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#171725] transition-all"
        >
          Lanjutkan Perjalanan dengan Tegak
        </button>
      </div>
    </div>
  );
}
