"use client";

import React, { useState } from "react";

interface CreateHabitWizardProps {
  onSuccess: (habitId: string) => void;
  onCancel: () => void;
  defaultTimezone?: string;
}

export function CreateHabitWizard({
  onSuccess,
  onCancel,
  defaultTimezone = "Asia/Jakarta",
}: CreateHabitWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [displayAlias, setDisplayAlias] = useState("");
  const [category, setCategory] = useState("HEALTH");
  const [privacyLevel, setPrivacyLevel] = useState<number>(1);

  const [checkinLocalTime, setCheckinLocalTime] = useState("20:00");
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [startedAt, setStartedAt] = useState(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });

  const [whyReasons, setWhyReasons] = useState<string[]>([""]);
  const [futureSelfNote, setFutureSelfNote] = useState("");
  const [costPerOccurrence, setCostPerOccurrence] = useState<number | "">("");

  const handleAddReason = () => {
    setWhyReasons([...whyReasons, ""]);
  };

  const handleReasonChange = (index: number, val: string) => {
    const updated = [...whyReasons];
    updated[index] = val;
    setWhyReasons(updated);
  };

  const handleRemoveReason = (index: number) => {
    if (whyReasons.length > 1) {
      setWhyReasons(whyReasons.filter((_, i) => i !== index));
    }
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!name.trim()) {
        setError("Nama kebiasaan wajib diisi.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(checkinLocalTime)) {
        setError("Jam check-in harus berformat HH:mm (contoh: 20:00).");
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validReasons = whyReasons.map((r) => r.trim()).filter(Boolean);
    if (validReasons.length === 0) {
      setError("Sertakan minimal 1 alasan kuat mengapa ingin berhenti.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        displayAlias: displayAlias.trim() || undefined,
        category: category.trim() || undefined,
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone,
        checkinLocalTime,
        startedAt: new Date(startedAt).toISOString(),
        privacyLevel,
        whyReasons: validReasons,
        futureSelfNote: futureSelfNote.trim() || undefined,
        costPerOccurrence: costPerOccurrence === "" ? undefined : Number(costPerOccurrence),
      };

      const res = await fetch("/api/tracked-habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat membuat kebiasaan.");
      }

      onSuccess(json.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-[#151522] p-6 sm:p-8 shadow-2xl">
      {/* Wizard Header & Steps Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Langkah {step} dari 3
          </span>
          <span className="text-xs text-slate-400">
            {step === 1 && "Identitas & Privasi"}
            {step === 2 && "Jadwal & Waktu"}
            {step === 3 && "Alasan & Komitmen"}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
          {error}
        </div>
      )}

      <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
        {/* STEP 1: IDENTITAS */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-white mb-1.5">
                Nama Kebiasaan yang Ingin Dihentikan *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Merokok, Doomscrolling larut malam, Pornografi..."
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="category" className="block text-xs font-semibold text-white mb-1.5">
                  Kategori
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#20202e] px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="HEALTH">Kesehatan & Fisik</option>
                  <option value="DIGITAL">Digital & Gadget</option>
                  <option value="PRODUCTIVITY">Produktivitas & Fokus</option>
                  <option value="FINANCIAL">Keuangan & Belanja</option>
                  <option value="EMOTIONAL">Emosional & Hubungan</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </div>

              <div>
                <label htmlFor="displayAlias" className="block text-xs font-semibold text-white mb-1.5">
                  Nama Samaran / Alias (Opsional)
                </label>
                <input
                  id="displayAlias"
                  type="text"
                  value={displayAlias}
                  onChange={(e) => setDisplayAlias(e.target.value)}
                  placeholder="Contoh: Udara Bersih, Istirahat Tenang"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Privacy Level Radio */}
            <div>
              <span className="block text-xs font-semibold text-white mb-2">
                Tingkat Privasi Notifikasi
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {[
                  { level: 0, label: "Normal", desc: "Tampilkan nama kebiasaan asli" },
                  { level: 1, label: "Netral (Disarankan)", desc: "Hanya teks umum tanpa nama" },
                  { level: 2, label: "Samaran Penuh", desc: "Pakai alias di seluruh layar" },
                ].map((item) => (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => setPrivacyLevel(item.level)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      privacyLevel === item.level
                        ? "bg-indigo-600/30 border-indigo-500 text-white"
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-semibold text-sm mb-1">{item.label}</div>
                    <div className="text-[11px] opacity-80">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: JADWAL & WAKTU */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="checkinLocalTime" className="block text-xs font-semibold text-white mb-1.5">
                  Jam Check-in Harian (HH:mm) *
                </label>
                <input
                  id="checkinLocalTime"
                  type="text"
                  value={checkinLocalTime}
                  onChange={(e) => setCheckinLocalTime(e.target.value)}
                  placeholder="20:00"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Waktu harian saat kamu mengevaluasi apakah hari ini bersih.
                </p>
              </div>

              <div>
                <label htmlFor="timezone" className="block text-xs font-semibold text-white mb-1.5">
                  Zona Waktu (IANA) *
                </label>
                <input
                  id="timezone"
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="startedAt" className="block text-xs font-semibold text-white mb-1.5">
                Kapan Kamu Mulai Berhenti?
              </label>
              <input
                id="startedAt"
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Waktu ini menjadi titik awal timer &quot;Bersih Sejak&quot;.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: ALASAN & KOMITMEN */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                Mengapa Kamu Ingin Berhenti? (Minimal 1) *
              </label>
              <div className="space-y-2">
                {whyReasons.map((reason, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => handleReasonChange(idx, e.target.value)}
                      placeholder={`Alasan ${idx + 1} (contoh: Tubuh lebih bugar, hemat uang)...`}
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {whyReasons.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveReason(idx)}
                        className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/5"
                        title="Hapus alasan"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddReason}
                className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                + Tambah Alasan Lain
              </button>
            </div>

            <div>
              <label htmlFor="futureSelfNote" className="block text-xs font-semibold text-white mb-1.5">
                Pesan untuk Dirimu Saat Dorongan Datang (Opsional)
              </label>
              <textarea
                id="futureSelfNote"
                rows={2}
                value={futureSelfNote}
                onChange={(e) => setFutureSelfNote(e.target.value)}
                placeholder="Ingatkan dirimu apa yang paling berharga saat godaan muncul..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="costPerOccurrence" className="block text-xs font-semibold text-white mb-1.5">
                Estimasi Pengeluaran per Kejadian (Rp, Opsional)
              </label>
              <input
                id="costPerOccurrence"
                type="number"
                min="0"
                value={costPerOccurrence}
                onChange={(e) =>
                  setCostPerOccurrence(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="Contoh: 35000"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/10">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2)}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
            >
              ← Sebelumnya
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
            >
              Batal
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 text-xs font-semibold text-white shadow-lg transition-colors"
            >
              Lanjut →
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 px-7 py-2.5 text-xs font-semibold text-white shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Mulai Kebiasaan Baru"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
