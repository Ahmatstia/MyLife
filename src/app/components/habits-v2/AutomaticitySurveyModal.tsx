"use client";

import React, { useState } from "react";

interface AutomaticitySurveyModalProps {
  habitId: string;
  habitName: string;
  surveys?: Array<{ id: string; score: number; answeredAt: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

export function AutomaticitySurveyModal({
  habitId,
  habitName,
  surveys = [],
  onClose,
  onSuccess,
}: AutomaticitySurveyModalProps) {
  const [score, setScore] = useState<number>(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getScoreDescription = (val: number) => {
    switch (val) {
      case 1:
        return "1 — Sangat Butuh Usaha Sadar (harus dipaksa/diingat keras)";
      case 2:
        return "2 — Masih Cukup Berat (sering lupa tanpa pengingat)";
      case 3:
        return "3 — Mulai Ada Niat Alami (perlu sedikit dorongan awal)";
      case 4:
        return "4 — Cukup Terbiasa (mudah dimulai jika ada jangkar)";
      case 5:
        return "5 — Lancar Mengalir (merasa wajar melakukannya tiap hari)";
      case 6:
        return "6 — Hampir Refleks (merasa kurang lengkap jika terlewat)";
      case 7:
        return "7 — Otomatis Penuh (refleks alami tanpa perlu berpikir)";
      default:
        return "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tracked-habits/${habitId}/automaticity-surveys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat menyimpan survei otomatisitas.");
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="survey-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#141420] p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Evaluasi Berkala (14 Hari)
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1"
            >
              Tutup ✕
            </button>
          </div>
          <h2 id="survey-title" className="text-xl font-black text-white">
            Seberapa Otomatis Kebiasaan Ini?
          </h2>
          <p className="text-xs text-slate-300">
            Kebiasaan: <strong className="text-emerald-300">{habitName}</strong>
          </p>
        </div>

        {/* Teks Edukasi Ilmiah (§13.2 & F-B9: Anti-Mitos 21 Hari) */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-xs text-emerald-200/90 leading-relaxed space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-300">
            <span>💡 Fakta Sains Pembentukan Kebiasaan</span>
          </div>
          <p>
            Rata-rata kebiasaan baru terbentuk dalam <strong>±66 hari</strong> dengan rentang lebar <strong>18–254 hari</strong> bergantung pada kompleksitas kebiasaan (Lally et al., 2010), <strong>bukan mitos 21 hari</strong>.
          </p>
          <p className="text-[11px] text-emerald-300/80">
            Konsistensi harian jauh lebih berpengaruh daripada kesempurnaan. Tidak apa-apa jika skor Anda bertambah secara bertahap!
          </p>
        </div>

        {/* Riwayat Kurva Sebelumnya jika ada */}
        {surveys.length > 0 && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-2">
            <div className="text-[11px] font-semibold text-slate-400">
              Perkembangan Skor Sebelumnya ({surveys.length} kali diisi):
            </div>
            <div className="flex items-end gap-2 h-16 pt-2">
              {surveys.slice(-6).map((s, idx) => {
                const heightPct = Math.max(15, Math.round((s.score / 7) * 100));
                return (
                  <div key={s.id || idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[10px] font-bold text-emerald-300">{s.score}</span>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-teal-400 opacity-80"
                    />
                    <span className="text-[8px] text-slate-500">#{idx + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pertanyaan Reflektif Self-Report Habit Index (SRHI) */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Refleksikan pernyataan berikut pada kebiasaan Anda:
            </label>
            <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
              <li>Saya melakukannya tanpa harus berpikir panjang</li>
              <li>Saya merasa aneh atau kurang lengkap bila tidak melakukannya</li>
              <li>Tindakan ini sudah menjadi bagian dari rutinitas harian saya</li>
            </ul>
          </div>

          {/* Selector Skor 1 s.d. 7 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Pilih Skor Otomatisitas (1–7):</span>
              <span className="text-sm font-black text-emerald-400">Skor {score} / 7</span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setScore(num)}
                  className={`h-11 rounded-xl text-sm font-bold border transition-all ${
                    score === num
                      ? "bg-emerald-500 border-emerald-400 text-black shadow-lg shadow-emerald-500/30 scale-105"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <p className="text-xs font-semibold text-slate-200">
                {getScoreDescription(score)}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-xs font-black text-black shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Evaluasi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
