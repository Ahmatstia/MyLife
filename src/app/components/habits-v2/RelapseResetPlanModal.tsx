"use client";

import React, { useState } from "react";

interface RelapseResetPlanModalProps {
  isOpen: boolean;
  habitId: string;
  habitName: string;
  isHighRisk?: boolean;
  currentWhyReasons?: string[];
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 1 | 2 | 3;

export function RelapseResetPlanModal({
  isOpen,
  habitId,
  habitName,
  isHighRisk = false,
  currentWhyReasons = [],
  onClose,
  onSuccess,
}: RelapseResetPlanModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [whyReasons, setWhyReasons] = useState<string[]>(
    currentWhyReasons.length > 0 ? currentWhyReasons : [""],
  );
  const [ifCondition, setIfCondition] = useState("");
  const [thenAction, setThenAction] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Acknowledge & lewati tanpa reset
  const handleAcknowledgeOnly = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tracked-habits/${habitId}/relapse/acknowledge`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat memperbarui status.");
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit reset plan workflow (F-B9)
  const handleResetPlanSubmit = async () => {
    setSubmitting(true);
    setError(null);

    const filteredReasons = whyReasons.map((r) => r.trim()).filter((r) => r.length > 0);

    const payload: {
      whyReasons?: string[];
      newCopingPlan?: {
        ifCondition: string;
        thenAction: string;
      };
    } = {};

    if (filteredReasons.length > 0) {
      payload.whyReasons = filteredReasons;
    }

    if (ifCondition.trim() && thenAction.trim()) {
      payload.newCopingPlan = {
        ifCondition: ifCondition.trim(),
        thenAction: thenAction.trim(),
      };
    }

    try {
      const res = await fetch(`/api/tracked-habits/${habitId}/relapse/reset-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat mengatur ulang rencana.");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReason = () => {
    setWhyReasons((prev) => [...prev, ""]);
  };

  const handleUpdateReason = (index: number, val: string) => {
    setWhyReasons((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleRemoveReason = (index: number) => {
    setWhyReasons((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      id="relapse-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="relapse-modal-title"
    >
      <div className="relative w-full max-w-xl rounded-3xl border border-purple-500/30 bg-[#151424] p-6 text-white shadow-2xl shadow-purple-950/40 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-lg">
              🔄
            </span>
            <div>
              <h2 id="relapse-modal-title" className="text-base font-bold text-white tracking-tight">
                Penyesuaian Strategi & Reset Rencana
              </h2>
              <p className="text-[11px] text-slate-400">
                {habitName} • Langkah {step} dari 3
              </p>
            </div>
          </div>
          <button
            id="relapse-dismiss-btn"
            type="button"
            onClick={handleAcknowledgeOnly}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors"
          >
            Nanti Saja
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Notifikasi Empati Pola Berulang */}
        <div className="mb-5 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4 text-xs text-purple-200 leading-relaxed">
          <p className="font-semibold mb-1 text-purple-100">
            Pola frekuensi terpeleset terdeteksi belakangan ini.
          </p>
          <p className="text-slate-300">
            Ini bukan pertanda akhir perjuangan, melainkan sinyal alami bahwa strategi atau situasi lingkunganmu saat ini butuh penyesuaian yang lebih realistis dan bersahabat.
          </p>
        </div>

        {/* Anjuran Dukungan Profesional untuk Kategori Berisiko Tinggi (§14.3 / F-B9) */}
        {isHighRisk && (
          <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-amber-100 mb-1">
              <span>⚠️</span>
              <span>Dukungan Tambahan Dianjurkan</span>
            </div>
            <p className="text-slate-300">
              Kebiasaan dengan risiko fisik atau ketergantungan kuat memerlukan pendampingan aman. Pertimbangkan untuk berdiskusi dengan dokter, konselor, atau layanan bantuan profesional tepercaya.
            </p>
          </div>
        )}

        {/* ----------------- LANGKAH 1: TINJAU KOMITMEN & ALASAN (F-B9) ----------------- */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-1">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                Langkah 1 dari 3: Tinjau Fondasi
              </span>
              <h3 className="text-base font-bold text-white">
                Alasan & Komitmen Terkuatmu
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ingatkan dirimu mengapa perubahan ini sangat berarti bagi masa depanmu. Kamu bisa menambah atau menyempurnakan alasan di bawah.
              </p>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {whyReasons.map((reason, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => handleUpdateReason(idx, e.target.value)}
                    placeholder={`Alasan ${idx + 1}...`}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-400 focus:outline-none"
                  />
                  {whyReasons.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveReason(idx)}
                      className="p-2 text-slate-500 hover:text-rose-400 text-xs"
                      title="Hapus alasan"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddReason}
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 pt-1"
              >
                + Tambah Alasan Baru
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                id="relapse-step1-next-btn"
                type="button"
                onClick={() => setStep(2)}
                className="rounded-2xl bg-purple-600 hover:bg-purple-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition-all"
              >
                Lanjut ke Rencana Jika-Maka →
              </button>
            </div>
          </div>
        )}

        {/* ----------------- LANGKAH 2: RENCANA JIKA-MAKA BARU (F-B9) ----------------- */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-1">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                Langkah 2 dari 3: Strategi Baru
              </span>
              <h3 className="text-base font-bold text-white">
                Siapkan Rencana Jika–Maka Pengganti
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tentukan respon pengganti spesifik untuk situasi tersulit yang paling sering memicu dorongan belakangan ini.
              </p>
            </div>

            <div className="space-y-3 p-4 rounded-2xl bg-purple-950/30 border border-purple-500/20">
              <div className="space-y-1">
                <label htmlFor="relapse-if" className="text-xs font-bold text-purple-300">
                  Jika (Situasi Pemicu Tersulit):
                </label>
                <input
                  id="relapse-if"
                  type="text"
                  value={ifCondition}
                  onChange={(e) => setIfCondition(e.target.value)}
                  placeholder="Contoh: Jika saya merasa sangat lelah dan stres sendirian di malam hari..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="relapse-then" className="text-xs font-bold text-emerald-300">
                  Maka (Aksi Perlindungan Pengganti):
                </label>
                <input
                  id="relapse-then"
                  type="text"
                  value={thenAction}
                  onChange={(e) => setThenAction(e.target.value)}
                  placeholder="Contoh: Maka saya akan langsung menelepon teman dekat atau mematikan ponsel..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                ← Kembali
              </button>
              <button
                id="relapse-step2-next-btn"
                type="button"
                onClick={() => setStep(3)}
                className="rounded-2xl bg-purple-600 hover:bg-purple-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition-all"
              >
                Lanjut ke Penyesuaian Tahap →
              </button>
            </div>
          </div>
        )}

        {/* ----------------- LANGKAH 3: OPSI RESET TAHAP & PENURUNAN TARGET (F-B9) ----------------- */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-1">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                Langkah 3 dari 3: Opsi Penyesuaian
              </span>
              <h3 className="text-base font-bold text-white">
                Pilih Arah Langkah Selanjutnya
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Menata ulang langkah bukan kemunduran, melainkan kecerdasan dalam beradaptasi demi keberlanjutan jangka panjang.
              </p>
            </div>

            {/* Pilihan 1: Kembali ke Tahap Persiapan */}
            <div className="p-4 rounded-2xl bg-white/5 border border-purple-500/30 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🛡️</span>
                <span className="text-xs font-bold text-purple-200">
                  Kembali ke Tahap Persiapan (Disarankan)
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Mengambil jeda sejenak untuk menata ulang lingkungan, memperkuat rencana jika–maka, dan mempersiapkan diri tanpa tekanan streak harian.
              </p>
            </div>

            {/* Pilihan 2: Opsi Pengurangan Bertahap (Abstain -> Reduce) */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 opacity-85">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">📉</span>
                  <span className="text-xs font-bold text-slate-200">
                    Turunkan Target (Pengurangan Bertahap)
                  </span>
                </div>
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Fase 3 Segera Hadir
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Bila berhenti total terasa terlalu berat saat ini, mode kuota bertahap (Reduce) akan memberikan batas harian yang diturunkan perlahan.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                ← Kembali
              </button>
              <button
                id="relapse-confirm-reset-btn"
                type="button"
                disabled={submitting}
                onClick={handleResetPlanSubmit}
                className="rounded-2xl bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg transition-all disabled:opacity-50"
              >
                {submitting ? "Memproses..." : "Terapkan & Kembali ke Persiapan ✓"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
