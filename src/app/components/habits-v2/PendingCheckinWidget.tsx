"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface PendingCheckinItem {
  id: string;
  habitId: string;
  periodDate: string;
  windowStart: string;
  windowEnd: string;
  status: string;
  habit: {
    id: string;
    name: string;
    displayAlias?: string | null;
    timezone: string;
    checkinLocalTime: string;
    kind?: "BREAK" | "BUILD";
    privacyLevel?: number;
  };
}

export function PendingCheckinWidget() {
  const [items, setItems] = useState<PendingCheckinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [discreteMode, setDiscreteMode] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/tracked-habits/pending-checkins")
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) {
          if (json.success && Array.isArray(json.data)) {
            setItems(json.data);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRespond = async (
    habitId: string,
    checkinId: string,
    response: "CLEAN" | "LAPSED" | "DONE" | "SKIPPED",
  ) => {
    setProcessingId(checkinId);
    setFeedbackMsg(null);

    try {
      const res = await fetch(
        `/api/tracked-habits/${habitId}/checkins/${checkinId}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response }),
        },
      );

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || "Tidak dapat menyimpan respon check-in.");
      }

      setItems((prev) => prev.filter((item) => item.id !== checkinId));
      setFeedbackMsg(
        response === "CLEAN" || response === "DONE"
          ? "Check-in berhasil tercatat! Tetap konsisten."
          : "Catatan berhasil diperbarui. Terus melangkah.",
      );
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      setFeedbackMsg(err instanceof Error ? err.message : "Terjadi kendala.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-5 rounded-3xl bg-white/80 dark:bg-[#131825]/80 border border-slate-200/80 dark:border-white/10 shadow-sm animate-pulse flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl bg-purple-500/20" />
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="h-3 w-32 bg-slate-200 dark:bg-white/10 rounded-full" />
          <div className="h-2.5 w-48 bg-slate-100 dark:bg-white/5 rounded-full" />
        </div>
      </div>
    );
  }

  // Jika tidak ada check-in tertunda
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden p-5 sm:p-6 rounded-3xl bg-white/90 dark:bg-[#131825]/90 border border-purple-500/20 dark:border-[#8B5CF6]/25 shadow-sm dark:shadow-xl transition-all">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-56 h-56 bg-purple-500/10 dark:bg-[#8B5CF6]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-4">
        {/* Header Widget */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-[#8B5CF6] dark:text-[#d0bcff] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[19px]">fact_check</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  Evaluasi Kebiasaan Tertunda
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[#7c3aed] dark:text-[#d0bcff] text-[11px] font-bold">
                  {items.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#94a3b8] mt-0.5">
                Konfirmasi jendela harian untuk menjaga akurasi catatan Anda
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDiscreteMode(!discreteMode)}
              className={`p-1.5 rounded-xl border text-xs transition-colors flex items-center gap-1 ${
                discreteMode
                  ? "bg-purple-500/20 border-purple-500/40 text-purple-700 dark:text-[#d0bcff]"
                  : "bg-slate-100 dark:bg-white/[0.06] border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white"
              }`}
              title={discreteMode ? "Tampilkan nama kebiasaan" : "Mode diskret (sembunyikan nama)"}
            >
              <span className="material-symbols-outlined text-[17px]">
                {discreteMode ? "visibility_off" : "visibility"}
              </span>
              <span className="text-[11px] font-medium hidden sm:inline">
                {discreteMode ? "Diskret Aktif" : "Diskret"}
              </span>
            </button>

            <Link
              href="/habits"
              className="text-xs font-semibold text-[#8B5CF6] hover:text-[#7c3aed] dark:text-[#d0bcff] dark:hover:text-white transition-colors flex items-center gap-0.5"
            >
              <span>Semua</span>
              <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            </Link>
          </div>
        </div>

        {feedbackMsg && (
          <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-[#7c3aed] dark:text-[#d0bcff] text-xs font-medium">
            {feedbackMsg}
          </div>
        )}

        {/* List of Pending Checkins */}
        <div className="grid grid-cols-1 gap-2.5">
          {items.map((item) => {
            const isProcessing = processingId === item.id;
            const habit = item.habit;
            const isSensitive = (habit.privacyLevel ?? 0) >= 2 || discreteMode;
            const displayName = isSensitive
              ? habit.displayAlias || "Kebiasaan Terpantau"
              : habit.name;

            const isBreak = habit.kind !== "BUILD";

            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] transition-all hover:border-purple-500/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isBreak ? "bg-amber-400" : "bg-emerald-400"
                    }`}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {displayName}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-[#94a3b8] flex items-center gap-1.5 mt-0.5">
                      <span>Periode: {item.periodDate}</span>
                      <span>•</span>
                      <span>{isBreak ? "Break" : "Build"}</span>
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {isBreak ? (
                    <>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleRespond(habit.id, item.id, "CLEAN")}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-[#4edea3] border border-emerald-500/30 text-xs font-bold transition-all disabled:opacity-50"
                      >
                        ✓ Bersih
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleRespond(habit.id, item.id, "LAPSED")}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-all disabled:opacity-50"
                      >
                        Terpeleset
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleRespond(habit.id, item.id, "DONE")}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-[#4edea3] border border-emerald-500/30 text-xs font-bold transition-all disabled:opacity-50"
                      >
                        ✓ Selesai
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleRespond(habit.id, item.id, "SKIPPED")}
                        className="px-3 py-1.5 rounded-xl bg-slate-200/70 hover:bg-slate-300/70 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-white/10 text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        Lewati
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
