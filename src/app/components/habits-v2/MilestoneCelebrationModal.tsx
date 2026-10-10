"use client";

import React, { useState } from "react";

interface MilestoneData {
  id: string;
  code: string;
  title: string;
  description?: string | null;
}

interface MilestoneCelebrationModalProps {
  isOpen: boolean;
  habitId: string;
  milestone: MilestoneData | null;
  onClose: () => void;
}

export function MilestoneCelebrationModal({
  isOpen,
  habitId,
  milestone,
  onClose,
}: MilestoneCelebrationModalProps) {
  const [celebrating, setCelebrating] = useState(false);

  if (!isOpen || !milestone) return null;

  const handleDismiss = async () => {
    setCelebrating(true);
    try {
      await fetch(
        `/api/tracked-habits/${habitId}/milestones/${milestone.id}/celebrate`,
        { method: "POST" },
      );
    } catch {
      // silent fallback
    } finally {
      setCelebrating(false);
      onClose();
    }
  };

  return (
    <div
      id="milestone-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="milestone-title"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-amber-400/40 bg-[#161524] p-6 text-white text-center shadow-2xl shadow-amber-950/50 my-8 space-y-5 animate-scale-up">
        {/* Lencana Emas */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-500/20 via-amber-400/30 to-yellow-300/20 border-2 border-amber-400/50 shadow-xl shadow-amber-500/20">
          <span className="text-4xl animate-bounce">🏆</span>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">
            Tonggak Ketahanan Tercapai
          </span>
          <h2 id="milestone-title" className="text-xl font-black text-white tracking-tight">
            {milestone.title}
          </h2>
          {milestone.description && (
            <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
              {milestone.description}
            </p>
          )}
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
          Setiap langkah kecil membuktikan kapasitasmu untuk memimpin hidupmu sendiri. Terus jaga komitmen ini dengan tenang.
        </div>

        <button
          id="milestone-celebrate-btn"
          type="button"
          disabled={celebrating}
          onClick={handleDismiss}
          className="w-full rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/30 transition-all active:scale-95 disabled:opacity-50"
        >
          {celebrating ? "Menyimpan..." : "Lanjutkan Perjalanan →"}
        </button>
      </div>
    </div>
  );
}
