"use client";

import { useState } from "react";
import { Icon } from "@/app/components/ui/Icon";
import type { HabitWithRelations } from "@/app/(app)/habits/HabitCard";

interface CheckInModalProps {
  habit: HabitWithRelations;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<unknown>;
}

const MOOD_OPTIONS = [
  { value: 1, emoji: "😔", label: "Sangat Buruk" },
  { value: 2, emoji: "😕", label: "Kurang Baik" },
  { value: 3, emoji: "😐", label: "Biasa Saja" },
  { value: 4, emoji: "😊", label: "Baik" },
  { value: 5, emoji: "😄", label: "Sangat Baik" },
];

const ENERGY_OPTIONS = [
  { value: 1, label: "🪫 Sangat Lelah" },
  { value: 2, label: "😴 Lelah" },
  { value: 3, label: "😐 Netral" },
  { value: 4, label: "⚡ Berenergi" },
  { value: 5, label: "🚀 Sangat Berenergi" },
];

const RELAPSE_TRIGGERS = [
  "Stres kerja / kuliah",
  "Kebosanan",
  "Malam sendirian",
  "Setelah makan besar",
  "Setelah begadang",
  "Scrolling sosial media",
  "Perasaan kesepian",
  "Frustasi / marah",
  "Lainnya...",
];

export function CheckInModal({ habit, onClose, onSubmit }: CheckInModalProps) {
  const isBad = habit.type === "BAD";
  const today = new Date().toISOString().split("T")[0];

  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [relapseTrigger, setRelapseTrigger] = useState("");
  const [customTrigger, setCustomTrigger] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ message: string; streak: { currentStreak: number } } | null>(null);

  async function handleSubmit() {
    if (isSuccess === null) return;
    setIsSubmitting(true);
    try {
      const res = await onSubmit({
        date: today,
        isSuccess,
        mood: mood ?? undefined,
        energyLevel: energyLevel ?? undefined,
        notes: notes.trim() || undefined,
        relapseTrigger: (!isSuccess && (relapseTrigger || customTrigger)) ? (relapseTrigger === "Lainnya..." ? customTrigger : relapseTrigger) : undefined,
      }) as { message: string; streak: { currentStreak: number } };
      setResult(res);
    } catch {
      // error handled in parent
    } finally {
      setIsSubmitting(false);
    }
  }

  const accentGrad = isBad
    ? "from-rose-600 to-orange-600"
    : "from-emerald-600 to-teal-600";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0f1120] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${accentGrad} px-5 py-4 relative overflow-hidden`}>
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
          </div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">Check-in Hari Ini</p>
              <h2 className="text-base font-bold text-white mt-0.5 truncate max-w-[260px]">{habit.title}</h2>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all">
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>

        {/* Result screen */}
        {result ? (
          <div className="p-6 text-center">
            <div className="text-5xl mb-4">
              {result.streak.currentStreak > 0 ? (result.streak.currentStreak >= 7 ? "🔥" : "✅") : "💙"}
            </div>
            <p className="text-white font-bold text-lg mb-2">
              {result.streak.currentStreak > 0 ? `${result.streak.currentStreak} Hari Streak!` : "Hari Ini Tercatat"}
            </p>
            <p className="text-[#94a3b8] text-sm leading-relaxed mb-6">{result.message}</p>
            <button
              onClick={onClose}
              className={`w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r ${accentGrad} text-white`}
            >
              Tutup
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* ─── Step 1: Success/Fail ─── */}
            <div>
              <p className="text-sm font-bold text-white mb-3">
                {isBad ? "Apakah hari ini kamu BERHASIL menahan?" : "Apakah kamu MELAKUKAN kebiasaan ini hari ini?"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIsSuccess(true)}
                  className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all font-semibold text-sm ${
                    isSuccess === true
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      : "border-white/[0.08] bg-white/[0.03] text-[#94a3b8] hover:border-emerald-500/40 hover:text-white"
                  }`}
                >
                  <span className="text-3xl">{isBad ? "💪" : "✅"}</span>
                  <span>{isBad ? "Ya, Berhasil Menahan!" : "Ya, Sudah Dilakukan!"}</span>
                </button>
                <button
                  onClick={() => setIsSuccess(false)}
                  className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all font-semibold text-sm ${
                    isSuccess === false
                      ? "border-rose-500 bg-rose-500/20 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                      : "border-white/[0.08] bg-white/[0.03] text-[#94a3b8] hover:border-rose-500/40 hover:text-white"
                  }`}
                >
                  <span className="text-3xl">{isBad ? "😔" : "❌"}</span>
                  <span>{isBad ? "Tidak, Terjadi Relapse" : "Belum Dilakukan"}</span>
                </button>
              </div>

              {/* Compassionate relapse message */}
              {isSuccess === false && isBad && (
                <div className="mt-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-300 leading-relaxed">
                    💙 <strong>Relapse bukan kegagalan.</strong> Ini adalah bagian normal dari proses perubahan. Otak butuh waktu untuk rewiring. Yang penting kamu jujur dan mau bangkit lagi. Kamu sudah lebih kuat dari yang kamu sadari.
                  </p>
                </div>
              )}
            </div>

            {/* ─── Relapse Trigger (only when failed + bad habit) ─── */}
            {isSuccess === false && isBad && (
              <div>
                <p className="text-xs font-bold text-[#94a3b8] uppercase tracking-wide mb-2">
                  Apa yang memicunya? (opsional)
                </p>
                <div className="flex flex-wrap gap-2">
                  {RELAPSE_TRIGGERS.map((trigger) => (
                    <button
                      key={trigger}
                      onClick={() => setRelapseTrigger(relapseTrigger === trigger ? "" : trigger)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        relapseTrigger === trigger
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                          : "bg-white/[0.04] border-white/[0.08] text-[#94a3b8] hover:text-white hover:bg-white/[0.08]"
                      }`}
                    >
                      {trigger}
                    </button>
                  ))}
                </div>
                {relapseTrigger === "Lainnya..." && (
                  <input
                    type="text"
                    value={customTrigger}
                    onChange={(e) => setCustomTrigger(e.target.value)}
                    placeholder="Ceritakan pemicunya..."
                    className="mt-2 w-full rounded-lg bg-white/[0.06] border border-white/[0.1] px-3 py-2 text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-amber-500/50"
                  />
                )}
              </div>
            )}

            {isSuccess !== null && (
              <>
                {/* ─── Mood ─── */}
                <div>
                  <p className="text-xs font-bold text-[#94a3b8] uppercase tracking-wide mb-2">Mood hari ini (opsional)</p>
                  <div className="flex gap-2">
                    {MOOD_OPTIONS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setMood(mood === m.value ? null : m.value)}
                        title={m.label}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all border ${
                          mood === m.value
                            ? "bg-purple-500/20 border-purple-500/40 scale-105"
                            : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07]"
                        }`}
                      >
                        <span className="text-xl">{m.emoji}</span>
                        <span className="text-[9px] text-[#64748b] leading-none">{m.value}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ─── Energy ─── */}
                <div>
                  <p className="text-xs font-bold text-[#94a3b8] uppercase tracking-wide mb-2">Level Energi (opsional)</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {ENERGY_OPTIONS.map((e) => (
                      <button
                        key={e.value}
                        onClick={() => setEnergyLevel(energyLevel === e.value ? null : e.value)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          energyLevel === e.value
                            ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                            : "bg-white/[0.04] border-white/[0.08] text-[#94a3b8] hover:text-white"
                        }`}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ─── Notes ─── */}
                <div>
                  <p className="text-xs font-bold text-[#94a3b8] uppercase tracking-wide mb-2">Catatan / Refleksi (opsional)</p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      isSuccess
                        ? "Bagaimana perasaanmu hari ini? Apa yang membantu?"
                        : "Apa yang terjadi? Apa yang bisa dilakukan berbeda?"
                    }
                    rows={3}
                    className="w-full rounded-xl bg-white/[0.06] border border-white/[0.1] px-3 py-2.5 text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-purple-500/50 resize-none"
                  />
                </div>

                {/* ─── Submit ─── */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                    isSubmitting
                      ? "bg-white/10 text-[#94a3b8] cursor-not-allowed"
                      : `bg-gradient-to-r ${accentGrad} text-white hover:opacity-90 shadow-lg active:scale-[0.98]`
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Menyimpan...
                    </span>
                  ) : (
                    "Simpan Check-in"
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
