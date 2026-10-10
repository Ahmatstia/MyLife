"use client";

import React, { useState } from "react";

interface LogLapseModalProps {
  isOpen: boolean;
  habitId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function LogLapseModal({
  isOpen,
  habitId,
  onClose,
  onSuccess,
}: LogLapseModalProps) {
  const [occurredAt, setOccurredAt] = useState(() => {
    const now = new Date();
    // format YYYY-MM-DDTHH:mm
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });
  const [quantity, setQuantity] = useState(1);
  const [severity, setSeverity] = useState<"SLIP" | "RELAPSE">("SLIP");
  const [mood, setMood] = useState<number>(3);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tracked-habits/${habitId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "LAPSE",
          occurredAt: new Date(occurredAt).toISOString(),
          quantity: Number(quantity) || 1,
          severity,
          mood: Number(mood) || 3,
          note: note.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat mencatat kejadian.");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-lapse-title"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#161622] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div>
            <h2 id="log-lapse-title" className="text-lg font-bold text-white">
              Catat Terpeleset
            </h2>
            <p className="text-xs text-slate-400">
              Evaluasi jujur adalah fondasi terkuat untuk bangkit kembali.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Tutup modal"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Waktu Terjadi */}
          <div>
            <label
              htmlFor="occurredAt"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Kapan ini terjadi?
            </label>
            <input
              id="occurredAt"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Severity & Kuantitas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="severity"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Tingkat Kejadian
              </label>
              <select
                id="severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as "SLIP" | "RELAPSE")}
                className="w-full rounded-xl border border-white/10 bg-[#212130] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="SLIP">Terpeleset Sejenak (Slip)</option>
                <option value="RELAPSE">Kambuh Penuh (Relapse)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="quantity"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Kuantitas / Kali
              </label>
              <input
                id="quantity"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Mood Slider / Indicator */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Bagaimana perasaanmu saat itu? (1 = Sangat Tertekan, 5 = Tenang)
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setMood(lvl)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    mood === lvl
                      ? "bg-amber-600/40 border-amber-400 text-amber-200"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {lvl === 1 ? "1 😔" : lvl === 3 ? "3 😐" : lvl === 5 ? "5 🙂" : lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Catatan Refleksi Opsional */}
          <div>
            <label
              htmlFor="lapseNote"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Catatan / Pemicu Kejadian (Opsional)
            </label>
            <textarea
              id="lapseNote"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Terlalu larut malam, merasa bosan dan lelah..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Tombol Aksi */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-amber-600 hover:bg-amber-500 px-5 py-2 text-xs font-semibold text-white shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 transition-colors disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Catatan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
