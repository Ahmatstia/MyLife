"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/ui/Icon";
import { useToast } from "@/app/components/ui/Toast";

type ObjectiveItem = {
  id: string;
  title: string;
  description?: string | null;
  targetValue: number;
  currentValue: number;
  unit: string;
  status: string;
  dueDate?: string | Date | null;
};

const PRESETS = [
  { label: "🎯 40 Latihan Soal", title: "Latihan Soal Selesai", target: "40", unit: "soal", current: "0" },
  { label: "📚 5 Modul / Bab", title: "Modul Materi Selesai", target: "5", unit: "modul", current: "0" },
  { label: "⏱️ 50 Jam Belajar", title: "Total Jam Belajar", target: "50", unit: "jam", current: "0" },
  { label: "💯 100% Pemahaman", title: "Tingkat Penguasaan Materi", target: "100", unit: "%", current: "0" },
];

export function ObjectivesSection({
  goalId,
  initialObjectives,
}: {
  goalId: string;
  initialObjectives: ObjectiveItem[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [targetValue, setTargetValue] = useState("40");
  const [currentValue, setCurrentValue] = useState("0");
  const [unit, setUnit] = useState("soal");
  const [loading, setLoading] = useState(false);

  function applyPreset(preset: typeof PRESETS[0]) {
    setTitle(preset.title);
    setTargetValue(preset.target);
    setUnit(preset.unit);
    setCurrentValue(preset.current);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId,
          title: title.trim(),
          targetValue: Number(targetValue) || 100,
          currentValue: Number(currentValue) || 0,
          unit: unit.trim() || "unit",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal membuat indikator target");
      toast("Indikator target angka berhasil dibuat!", "success");
      setTitle("");
      setIsAdding(false);
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal membuat target", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleIncrement(obj: ObjectiveItem, delta: number) {
    const nextVal = Math.max(0, obj.currentValue + delta);
    try {
      const res = await fetch(`/api/objectives/${obj.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentValue: nextVal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal memperbarui nilai");
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal memperbarui nilai", "error");
    }
  }

  async function handleDelete(obj: ObjectiveItem) {
    if (!confirm(`Hapus indikator "${obj.title}"?`)) return;
    try {
      const res = await fetch(`/api/objectives/${obj.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menghapus");
      toast("Indikator target angka telah dihapus", "success");
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal menghapus", "error");
    }
  }

  // Calculate preview values
  const previewCurrent = Number(currentValue) || 0;
  const previewTarget = Math.max(1, Number(targetValue) || 1);
  const previewPct = Math.min(100, Math.round((previewCurrent / previewTarget) * 100));

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <span className="material-symbols-outlined text-[18px]">trending_up</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Indikator Target Angka
              </h3>
              <span className="font-mono text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                Key Results
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Penghitung angka nyata untuk mengukur hasil konkret (misal: jumlah latihan soal, buku, jam belajar, tabungan).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-mono font-semibold transition-colors cursor-pointer ${
            isAdding
              ? "bg-white/[0.08] text-gray-300 hover:bg-white/[0.14]"
              : "bg-purple-600 text-white hover:bg-purple-500 shadow-sm"
          }`}
        >
          <Icon name={isAdding ? "x" : "plus"} size={14} />
          {isAdding ? "Tutup Form" : "+ Buat Target Angka"}
        </button>
      </div>

      {/* Adding Form with Presets and Live Preview */}
      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="rounded-xl border border-purple-500/30 bg-[#0B0D13] p-5 space-y-4 shadow-lg animate-in fade-in-50 duration-150"
        >
          {/* Quick Presets Bar */}
          <div>
            <span className="block text-[11px] font-mono text-gray-400 mb-1.5">
              💡 Pilih Template Cepat (1-Klik untuk Mengisi Otomatis):
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-2.5 py-1 rounded-md bg-[#131825] hover:bg-[#1A2133] border border-white/[0.08] hover:border-purple-400/40 text-xs font-mono text-gray-300 hover:text-white transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3 pt-1 border-t border-white/[0.06]">
            <div>
              <label className="block text-xs font-mono font-medium text-gray-300 mb-1">
                1. Apa yang ingin Anda hitung? <span className="text-purple-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Latihan Soal Python, Selesaikan Bab Materi, atau Jam Coding"
                required
                className="w-full rounded-lg border border-white/[0.1] bg-[#131825] px-3.5 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-400 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-mono font-medium text-gray-300 mb-1">
                  2. Nilai Sekarang
                </label>
                <input
                  type="number"
                  min="0"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-white/[0.1] bg-[#131825] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-400 transition-colors font-mono"
                />
                <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">
                  Capaian awal saat ini
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-gray-300 mb-1">
                  3. Target Akhir <span className="text-purple-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  required
                  placeholder="40"
                  className="w-full rounded-lg border border-white/[0.1] bg-[#131825] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-400 transition-colors font-mono"
                />
                <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">
                  Jumlah total target
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-gray-300 mb-1">
                  4. Satuan Ukuran <span className="text-purple-400">*</span>
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="soal, modul, jam, %"
                  required
                  className="w-full rounded-lg border border-white/[0.1] bg-[#131825] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-400 transition-colors font-mono"
                />
                <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">
                  Misal: soal, bab, jam, %
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Live Preview Box */}
          <div className="p-3 rounded-lg bg-[#131825]/90 border border-purple-500/20 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-purple-300">
              <span className="flex items-center gap-1.5 font-bold">
                <span className="material-symbols-outlined text-[14px]">visibility</span>
                Pratinjau Kartu Hasil:
              </span>
              <span>Setelah disimpan, Anda bisa klik tombol [+1] atau [+5]</span>
            </div>

            <div className="rounded-lg border border-white/[0.08] bg-[#0B0D13] p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white">
                    {title.trim() || "Nama Target Ukuran Anda"}
                  </span>
                  <div className="font-mono text-[11px] text-gray-400">
                    {previewCurrent} / {previewTarget} {unit.trim() || "unit"} ({previewPct}%)
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-70">
                  <span className="px-2 py-0.5 rounded bg-white/[0.06] text-gray-300 text-xs font-mono font-bold">
                    +1
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.06] text-gray-300 text-xs font-mono font-bold">
                    +5
                  </span>
                </div>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-[#4edea3] transition-all"
                  style={{ width: `${previewPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="rounded-lg bg-purple-600 px-5 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
            >
              {loading ? "Menyimpan..." : "Simpan Indikator"}
            </button>
          </div>
        </form>
      )}

      {/* Grid of Existing Objectives */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {initialObjectives.map((obj) => {
          const pct = Math.min(100, Math.round((obj.currentValue / (obj.targetValue || 1)) * 100));
          const isDone = obj.status === "COMPLETED" || pct >= 100;
          return (
            <div
              key={obj.id}
              className={`rounded-xl border p-4 shadow-sm flex flex-col justify-between gap-3 transition-colors ${
                isDone
                  ? "bg-[#131825] border-emerald-500/30"
                  : "bg-[#0B0D13]/70 border-white/[0.08] hover:border-white/[0.14]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                      INDIKATOR
                    </span>
                    {isDone ? (
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        ✓ TERCAPAI
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                        BERJALAN
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-white line-clamp-2">
                    {obj.title}
                  </h4>
                  <span className="text-xs font-mono text-gray-400 mt-1 block">
                    <strong className="text-white">{obj.currentValue}</strong> dari {obj.targetValue} {obj.unit} ({pct}%)
                  </span>
                </div>

                {/* Counter Quick Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleIncrement(obj, -1)}
                    disabled={obj.currentValue <= 0}
                    className="rounded bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-30 px-2 py-0.5 text-xs font-mono font-bold text-gray-300 transition-colors cursor-pointer"
                    title="Kurangi 1 (-1)"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleIncrement(obj, 1)}
                    className="rounded bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 px-2 py-0.5 text-xs font-mono font-bold text-purple-200 transition-colors cursor-pointer"
                    title="Tambah 1 (+1)"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleIncrement(obj, 5)}
                    className="rounded bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 px-2 py-0.5 text-xs font-mono font-bold text-purple-200 transition-colors cursor-pointer"
                    title="Tambah 5 (+5)"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(obj)}
                    className="rounded p-1 text-gray-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors ml-1 cursor-pointer"
                    title="Hapus Indikator Ini"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isDone
                        ? "bg-emerald-400"
                        : "bg-gradient-to-r from-purple-500 to-[#4edea3]"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Friendly Empty State */}
        {initialObjectives.length === 0 && !isAdding && (
          <div className="py-6 px-4 rounded-xl border border-dashed border-white/[0.08] bg-[#0B0D13]/50 text-center flex flex-col items-center justify-center gap-1.5 col-span-full">
            <span className="text-2xl">🎯</span>
            <p className="text-xs font-semibold text-gray-300">
              Belum Ada Indikator Target Angka
            </p>
            <p className="text-[11px] text-gray-500 max-w-md">
              Ingin mengukur pencapaian dengan angka pasti (seperti menyelesaikan 40 latihan soal atau 5 modul)? Klik tombol <strong className="text-purple-300 font-mono">+ Buat Target Angka</strong> di atas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
