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

export function HabitFormModal({ type, areas, habit, onClose, onSubmit }: HabitFormModalProps) {
  const isEditing = !!habit;
  const isBad = type === "bad";

  const [title, setTitle] = useState(habit?.title ?? "");
  const [description, setDescription] = useState(habit?.description ?? "");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD" | "EXTREME">(habit?.difficulty ?? "MEDIUM");
  const [areaId, setAreaId] = useState(habit?.areaId ?? "");
  const [checkInTime, setCheckInTime] = useState(habit?.checkInTime ?? "06:00");
  const [targetDays, setTargetDays] = useState<string>(habit?.targetDays ? String(habit.targetDays) : "");

  // Optional psychological strategy fields
  const [whyQuit, setWhyQuit] = useState(habit?.whyQuit ?? "");
  const [triggerNotes, setTriggerNotes] = useState(habit?.triggerNotes ?? "");
  const [replacementHabit, setReplacementHabit] = useState(habit?.replacementHabit ?? "");
  const [showAdvanced, setShowAdvanced] = useState(false);

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
        areaId: areaId || null,
        checkInTime: checkInTime || "06:00",
        targetDays: targetDays.trim() ? Number(targetDays) : null,
        color: isBad ? "#f43f5e" : "#10b981",
        icon: isBad ? "flame" : "zap",
      };

      if (isBad) {
        data.whyQuit = whyQuit.trim() || null;
        data.triggerNotes = triggerNotes.trim() || null;
        data.replacementHabit = replacementHabit.trim() || null;
      }

      onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  }

  const gradFrom = isBad ? "from-rose-600" : "from-emerald-600";
  const gradTo = isBad ? "to-orange-600" : "to-teal-600";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-3xl border border-white/[0.1] bg-[#0c0e18] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in-scale"
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${gradFrom} ${gradTo} px-6 py-5 relative overflow-hidden shrink-0`}>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                {isEditing ? "Edit Kebiasaan" : "Buat Kebiasaan Baru"}
              </p>
              <h2 className="text-lg font-bold text-white mt-0.5">
                {isBad ? "🛡️ Ubah Kebiasaan Buruk (Harm Reduction)" : "✨ Bangun Kebiasaan Baik"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="text-xs font-bold text-[#cbd5e1] block mb-1.5">
              {isBad ? "Nama Kebiasaan Buruk yang Ingin Dihentikan *" : "Nama Kebiasaan yang Ingin Dibangun *"}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isBad ? "contoh: Berhenti PMO, Stop Merokok, Kurangi Doom-scrolling..." : "contoh: Olahraga 30 Menit, Membaca Buku, Meditasi..."}
              required
              className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#8B5CF6] transition-all"
            />
          </div>

          {/* Jam Check-Out Harian & Target Hari */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#cbd5e1] block mb-1.5 flex items-center gap-1.5">
                <span>⏰</span> Jam Evaluasi / Check-Out
              </label>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                required
                className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#8B5CF6] transition-all"
              />
              <p className="text-[11px] text-[#94a3b8] mt-1">
                Contoh: <strong className="text-[#cbd5e1]">06:00 pagi</strong> untuk mengevaluasi apakah semalam berhasil bebas dari godaan.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-[#cbd5e1] block mb-1.5 flex items-center gap-1.5">
                <span>🎯</span> Target Hari (Opsional)
              </label>
              <input
                type="number"
                min="1"
                max="3650"
                value={targetDays}
                onChange={(e) => setTargetDays(e.target.value)}
                placeholder="Misal: 30 (bisa diatur nanti)"
                className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2.5 text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#8B5CF6] transition-all"
              />
              <p className="text-[11px] text-[#94a3b8] mt-1">
                Bebas ditentukan, atau biarkan kosong untuk tanpa batas waktu.
              </p>
            </div>
          </div>

          {/* Area & Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#cbd5e1] block mb-1.5">
                Pilar Hidup (Area)
              </label>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="w-full rounded-xl bg-[#141824] border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#8B5CF6] transition-all"
              >
                <option value="">— Tidak terikat area —</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#cbd5e1] block mb-1.5">
                Tingkat Kesulitan
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as "EASY" | "MEDIUM" | "HARD" | "EXTREME")}
                className="w-full rounded-xl bg-[#141824] border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#8B5CF6] transition-all"
              >
                <option value="EASY">Mudah (Easy)</option>
                <option value="MEDIUM">Sedang (Medium)</option>
                <option value="HARD">Sulit (Hard)</option>
                <option value="EXTREME">Ekstrem (Extreme Adiksi)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-[#cbd5e1] block mb-1.5">
              Deskripsi Singkat (Opsional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Catatan tambahan mengenai komitmen ini..."
              rows={2}
              className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#8B5CF6] transition-all resize-none"
            />
          </div>

          {/* Advanced toggle for Why / Triggers */}
          {isBad && (
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs font-semibold text-[#a78bfa] hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <span>{showAdvanced ? "▼" : "▶"}</span>
                <span>{showAdvanced ? "Sembunyikan" : "Tampilkan"} Strategi Psikologis Awal (Pemicu & Alasan)</span>
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-3.5 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                  <div>
                    <label className="text-xs font-bold text-amber-300 block mb-1 flex items-center gap-1">
                      <span>💡</span> Alasan Kuat Berhenti (Why)
                    </label>
                    <input
                      type="text"
                      value={whyQuit}
                      onChange={(e) => setWhyQuit(e.target.value)}
                      placeholder="Misal: Saya ingin energi pulih, tidak lemas, dan fokus masa depan..."
                      className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-rose-300 block mb-1 flex items-center gap-1">
                      <span>🎯</span> Pemicu yang Sering Muncul (Trigger)
                    </label>
                    <input
                      type="text"
                      value={triggerNotes}
                      onChange={(e) => setTriggerNotes(e.target.value)}
                      placeholder="Misal: Sendirian di kamar malam hari, stres skripsi/kerjaan..."
                      className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-emerald-300 block mb-1 flex items-center gap-1">
                      <span>🔄</span> Pengganti Instan (Replacement Habit)
                    </label>
                    <input
                      type="text"
                      value={replacementHabit}
                      onChange={(e) => setReplacementHabit(e.target.value)}
                      placeholder="Misal: Push up 10x, jalan keluar ruangan, minum air es..."
                      className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-[#94a3b8] flex items-start gap-2.5">
            <span className="text-base">💡</span>
            <p>
              Setelah disimpan, kamu bisa masuk ke <strong className="text-white">Detail Kebiasaan</strong> untuk membuat <strong className="text-[#a78bfa]">Task / Protokol aksi kustom</strong> dan mengatur tahapan target hari sebebas yang kamu inginkan (persis seperti di Proyek & Target).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.08] px-6 py-4 flex items-center justify-end gap-3 bg-[#080a12] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#94a3b8] hover:text-white transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 bg-gradient-to-r ${gradFrom} ${gradTo} hover:opacity-95`}
          >
            <Icon name="check" size={14} />
            {isSubmitting ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Simpan Kebiasaan"}
          </button>
        </div>
      </form>
    </div>
  );
}
