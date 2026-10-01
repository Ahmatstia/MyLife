"use client";

import { useState } from "react";
import { Icon } from "@/app/components/ui/Icon";
import type { HabitWithRelations } from "@/app/(app)/habits/HabitCard";

type Area = { id: string; name: string; color: string };

interface HabitFormModalProps {
  type: "good" | "bad";
  areas: Area[];
  habit?: HabitWithRelations | null;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
}

const ICONS = [
  { key: "zap", emoji: "⚡", label: "Energi" },
  { key: "brain", emoji: "🧠", label: "Belajar" },
  { key: "gym", emoji: "💪", label: "Olahraga" },
  { key: "run", emoji: "🏃", label: "Lari" },
  { key: "book", emoji: "📚", label: "Membaca" },
  { key: "journal", emoji: "📝", label: "Jurnal" },
  { key: "meditate", emoji: "🧘", label: "Meditasi" },
  { key: "water", emoji: "💧", label: "Air" },
  { key: "sleep", emoji: "😴", label: "Tidur" },
  { key: "code", emoji: "💻", label: "Coding" },
  { key: "music", emoji: "🎵", label: "Musik" },
  { key: "coffee", emoji: "☕", label: "Kopi" },
  { key: "phone", emoji: "📱", label: "HP" },
  { key: "food", emoji: "🍔", label: "Makan" },
  { key: "pmo", emoji: "🔒", label: "PMO" },
  { key: "smoke", emoji: "🚭", label: "Rokok" },
  { key: "flame", emoji: "🔥", label: "Kecanduan" },
  { key: "heart", emoji: "❤️", label: "Kesehatan" },
];

const COLORS = [
  "#8B5CF6", "#6366F1", "#3B82F6", "#0EA5E9",
  "#10B981", "#22C55E", "#EAB308", "#F59E0B",
  "#F97316", "#EF4444", "#F43F5E", "#EC4899",
];

const DEFAULT_BAD_PHASES = [
  { title: "Minggu 1 — Fondasi", targetDays: 7, afterRelapseDays: 1, psychTip: "7 hari pertama adalah yang terberat. Otak sedang rebalancing dopamin. Rasa tidak nyaman adalah tanda bahwa kamu sedang berubah — itu normal!", order: 0 },
  { title: "2 Minggu — Momentum", targetDays: 14, afterRelapseDays: 1, psychTip: "Kamu sudah buktikan bisa 7 hari! Sekarang targetkan 2 minggu. Setiap hari yang kamu tahan, neuron baru terbentuk di otakmu.", order: 1 },
  { title: "1 Bulan — Rewiring", targetDays: 30, afterRelapseDays: 2, psychTip: "30 hari! Ini titik kritis — otak sedang aktif membentuk jalur neural baru. Kortisol mulai stabil. Kamu semakin kuat!", order: 2 },
  { title: "3 Bulan — Kebebasan", targetDays: 90, afterRelapseDays: 3, psychTip: "90 hari = threshold perubahan kebiasaan permanen menurut riset neurosains. Kamu sedang menulis ulang identitasmu!", order: 3 },
  { title: "6 Bulan — Transformasi", targetDays: 180, afterRelapseDays: null, psychTip: "6 bulan. Kamu bukan lagi orang yang sama seperti 6 bulan lalu. Ini bukan hanya soal kebiasaan — ini soal siapa kamu sekarang.", order: 4 },
];

export function HabitFormModal({ type, areas, habit, onClose, onSubmit }: HabitFormModalProps) {
  const isEditing = !!habit;
  const isBad = type === "bad";

  const [title, setTitle] = useState(habit?.title ?? "");
  const [description, setDescription] = useState(habit?.description ?? "");
  const [difficulty, setDifficulty] = useState(habit?.difficulty ?? "MEDIUM");
  const [color, setColor] = useState(habit?.color ?? "#8B5CF6");
  const [icon, setIcon] = useState(habit?.icon ?? "zap");
  const [areaId, setAreaId] = useState(habit?.areaId ?? "");

  // BAD habit specific
  const [triggerNotes, setTriggerNotes] = useState(habit?.triggerNotes ?? "");
  const [replacementHabit, setReplacementHabit] = useState(habit?.replacementHabit ?? "");
  const [whyQuit, setWhyQuit] = useState(habit?.whyQuit ?? "");
  const [useDefaultPhases, setUseDefaultPhases] = useState(!isEditing);

  // GOOD habit specific
  const [cue, setCue] = useState(habit?.cue ?? "");
  const [reward, setReward] = useState(habit?.reward ?? "");

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      const data: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        difficulty,
        color,
        icon,
        areaId: areaId || null,
      };

      if (isBad) {
        data.triggerNotes = triggerNotes.trim() || null;
        data.replacementHabit = replacementHabit.trim() || null;
        data.whyQuit = whyQuit.trim() || null;
        if (!isEditing && useDefaultPhases) {
          data._defaultPhases = DEFAULT_BAD_PHASES;
        }
      } else {
        data.cue = cue.trim() || null;
        data.reward = reward.trim() || null;
      }

      onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  }

  const gradFrom = isBad ? "from-rose-600" : "from-emerald-600";
  const gradTo = isBad ? "to-orange-600" : "to-teal-600";
  const accentBorder = isBad ? "border-rose-500/50" : "border-emerald-500/50";
  const accentText = isBad ? "text-rose-300" : "text-emerald-300";
  const accentBg = isBad ? "bg-rose-500/10" : "bg-emerald-500/10";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#0f1120] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${gradFrom} ${gradTo} px-5 py-4 relative overflow-hidden shrink-0`}>
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
          </div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                {isEditing ? "Edit" : "Tambah"} Kebiasaan
              </p>
              <h2 className="text-base font-bold text-white mt-0.5">
                {isBad ? "🚫 Kebiasaan Buruk yang Ingin Diubah" : "✨ Kebiasaan Baru yang Ingin Dibangun"}
              </h2>
            </div>
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all">
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Name */}
          <div>
            <label className="text-xs font-bold text-[#94a3b8] uppercase tracking-wide block mb-1.5">
              {isBad ? "Nama Kebiasaan Buruk *" : "Nama Kebiasaan *"}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isBad ? "contoh: Berhenti PMO, Stop Rokok, Kurangi HP..." : "contoh: Olahraga 30 menit, Baca 20 halaman..."}
              required
              className="w-full rounded-xl bg-white/[0.06] border border-white/[0.1] px-3.5 py-2.5 text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-purple-500/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-[#94a3b8] uppercase tracking-wide block mb-1.5">Deskripsi (opsional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsikan kebiasaan ini lebih detail..."
              rows={2}
              className="w-full rounded-xl bg-white/[0.06] border border-white/[0.1] px-3.5 py-2.5 text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-purple-500/50 resize-none"
            />
          </div>

          {/* Difficulty + Area */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#94a3b8] uppercase tracking-wide block mb-1.5">Tingkat Kesulitan</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as "EASY" | "MEDIUM" | "HARD" | "EXTREME")}
                className="w-full rounded-xl bg-white/[0.06] border border-white/[0.1] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="EASY">😊 Mudah</option>
                <option value="MEDIUM">😐 Sedang</option>
                <option value="HARD">😤 Sulit</option>
                <option value="EXTREME">💀 Ekstrem</option>
              </select>
            </div>
            {areas.length > 0 && (
              <div>
                <label className="text-xs font-bold text-[#94a3b8] uppercase tracking-wide block mb-1.5">Pilar Hidup</label>
                <select
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.06] border border-white/[0.1] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
                >
                  <option value="">— Pilih Area —</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Icon Picker */}
          <div>
            <label className="text-xs font-bold text-[#94a3b8] uppercase tracking-wide block mb-1.5">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((ic) => (
                <button
                  key={ic.key}
                  type="button"
                  onClick={() => setIcon(ic.key)}
                  title={ic.label}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border transition-all text-xs ${
                    icon === ic.key
                      ? `${accentBorder} ${accentBg} ${accentText}`
                      : "border-white/[0.08] hover:border-white/20 text-[#94a3b8]"
                  }`}
                >
                  <span className="text-lg">{ic.emoji}</span>
                  <span className="text-[9px]">{ic.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="text-xs font-bold text-[#94a3b8] uppercase tracking-wide block mb-1.5">Warna</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-all ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#0f1120] scale-110" : "hover:scale-105"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* ─── BAD HABIT SPECIFIC ─── */}
          {isBad && (
            <>
              <div className={`p-4 rounded-xl ${accentBg} border border-rose-500/20 space-y-4`}>
                <p className="text-xs font-bold text-rose-300 uppercase tracking-wide">🧠 Psikologi Perubahan</p>

                <div>
                  <label className="text-xs font-semibold text-[#94a3b8] block mb-1.5">
                    Mengapa kamu ingin berhenti? (WHY — Motivasi Terkuat)
                  </label>
                  <textarea
                    value={whyQuit}
                    onChange={(e) => setWhyQuit(e.target.value)}
                    placeholder="Tulis alasan terkuatmu. Ini akan muncul ketika kamu hampir menyerah. Contoh: 'Saya ingin energi lebih, fokus lebih baik, dan tidak merasa bersalah lagi...'"
                    rows={3}
                    className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-rose-500/50 resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#94a3b8] block mb-1.5">
                    Apa pemicunya? (Trigger)
                  </label>
                  <input
                    type="text"
                    value={triggerNotes}
                    onChange={(e) => setTriggerNotes(e.target.value)}
                    placeholder="Contoh: Malam sendiri, setelah stres, scrolling HP sebelum tidur..."
                    className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-rose-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#94a3b8] block mb-1.5">
                    Ganti dengan apa? (Replacement Habit)
                  </label>
                  <input
                    type="text"
                    value={replacementHabit}
                    onChange={(e) => setReplacementHabit(e.target.value)}
                    placeholder="Contoh: Push-up 20x, meditasi 5 menit, minum air dingin, jalan-jalan..."
                    className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-rose-500/50"
                  />
                  <p className="text-[10px] text-[#64748b] mt-1">
                    💡 Riset CBT: mengganti rutinitas adalah cara paling efektif mengubah kebiasaan buruk
                  </p>
                </div>
              </div>

              {/* Default Phases */}
              {!isEditing && (
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setUseDefaultPhases((v) => !v)}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                        useDefaultPhases ? "bg-purple-600 border-purple-600" : "border-white/30 bg-transparent"
                      }`}
                    >
                      {useDefaultPhases && <Icon name="check" size={11} className="text-white" />}
                    </button>
                    <div>
                      <p className="text-sm font-bold text-purple-300 mb-1">Gunakan Fase Bertahap Otomatis</p>
                      <p className="text-xs text-[#94a3b8] leading-relaxed">
                        Sistem akan membuat 5 fase bertahap (7 hari → 2 minggu → 1 bulan → 3 bulan → 6 bulan) yang dirancang secara psikologis untuk membantu perubahan bertahap dan realistis.
                      </p>
                      {useDefaultPhases && (
                        <div className="mt-2 space-y-1">
                          {DEFAULT_BAD_PHASES.map((p) => (
                            <div key={p.order} className="flex items-center gap-2 text-[11px] text-purple-200/80">
                              <span className="text-purple-400">→</span>
                              <span><strong>Fase {p.order + 1}:</strong> {p.title} ({p.targetDays} hari)</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── GOOD HABIT SPECIFIC ─── */}
          {!isBad && (
            <div className={`p-4 rounded-xl ${accentBg} border border-emerald-500/20 space-y-4`}>
              <p className="text-xs font-bold text-emerald-300 uppercase tracking-wide">⚡ Cue → Routine → Reward</p>

              <div>
                <label className="text-xs font-semibold text-[#94a3b8] block mb-1.5">
                  Pemicu (Cue) — Kapan / Apa yang memicunya?
                </label>
                <input
                  type="text"
                  value={cue}
                  onChange={(e) => setCue(e.target.value)}
                  placeholder="Contoh: Setelah bangun tidur, setelah makan siang, setiap Senin pagi..."
                  className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#94a3b8] block mb-1.5">
                  Hadiah (Reward) — Apa yang kamu dapat setelahnya?
                </label>
                <input
                  type="text"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  placeholder="Contoh: Kopi favorit, 30 menit main game, nonton 1 episode..."
                  className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-emerald-500/50"
                />
                <p className="text-[10px] text-[#64748b] mt-1">
                  💡 Atomic Habits: reward yang jelas mempercepat pembentukan kebiasaan hingga 3x lebih cepat
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex gap-3 p-5 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/[0.1] text-[#94a3b8] text-sm font-semibold hover:text-white hover:bg-white/[0.05] transition-all"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={!title.trim() || isSubmitting}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${gradFrom} ${gradTo} hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg`}
          >
            {isSubmitting ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Tambah Kebiasaan"}
          </button>
        </div>
      </form>
    </div>
  );
}
