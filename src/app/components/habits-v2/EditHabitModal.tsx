"use client";

import React, { useEffect, useState } from "react";

export interface EditHabitModalProps {
  habitId: string;
  onSuccess: () => void;
  onClose: () => void;
}

interface LoadedHabitData {
  id: string;
  name: string;
  kind: "BREAK" | "BUILD";
  mode?: "ABSTAIN" | "REDUCE" | null;
  displayAlias?: string | null;
  category?: string | null;
  privacyLevel: number;
  checkinLocalTime: string;
  timezone: string;
  identityStatement?: string | null;
  breakProfile?: {
    whyReasons?: string[];
    futureSelfNote?: string | null;
    reduceDailyLimit?: number | null;
    reduceStepPercent?: number | null;
    reduceStepEveryDays?: number | null;
    costPerOccurrence?: number | string | null;
    minutesPerOccurrence?: number | null;
  } | null;
  buildProfile?: {
    tinyBehavior?: string | null;
    anchorText?: string | null;
    celebrationText?: string | null;
  } | null;
}

export function EditHabitModal({
  habitId,
  onSuccess,
  onClose,
}: EditHabitModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [kind, setKind] = useState<"BREAK" | "BUILD">("BREAK");
  const [mode, setMode] = useState<"ABSTAIN" | "REDUCE">("ABSTAIN");
  const [name, setName] = useState("");
  const [displayAlias, setDisplayAlias] = useState("");
  const [category, setCategory] = useState("KESEHATAN");
  const [checkinLocalTime, setCheckinLocalTime] = useState("20:00");
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const [privacyLevel, setPrivacyLevel] = useState(1);
  const [identityStatement, setIdentityStatement] = useState("");

  // Break states
  const [whyReasons, setWhyReasons] = useState<string[]>([""]);
  const [futureSelfNote, setFutureSelfNote] = useState("");
  const [reduceDailyLimit, setReduceDailyLimit] = useState<number | string>("");
  const [costPerOccurrence, setCostPerOccurrence] = useState<number | string>("");
  const [minutesPerOccurrence, setMinutesPerOccurrence] = useState<number | string>("");

  // Build states
  const [tinyBehavior, setTinyBehavior] = useState("");
  const [anchorText, setAnchorText] = useState("");
  const [celebrationText, setCelebrationText] = useState("");

  useEffect(() => {
    let ignore = false;
    async function fetchHabit() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/tracked-habits/${habitId}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Tidak dapat memuat rincian kebiasaan.");
        }
        if (ignore) return;

        const data: LoadedHabitData = json.data;
        setKind(data.kind);
        setMode(data.mode === "REDUCE" ? "REDUCE" : "ABSTAIN");
        setName(data.name || "");
        setDisplayAlias(data.displayAlias || "");
        setCategory(data.category || "UMUM");
        setCheckinLocalTime(data.checkinLocalTime || "20:00");
        setTimezone(data.timezone || "Asia/Jakarta");
        setPrivacyLevel(data.privacyLevel ?? 1);
        setIdentityStatement(data.identityStatement || "");

        if (data.kind === "BREAK" && data.breakProfile) {
          const bp = data.breakProfile;
          const reasons = Array.isArray(bp.whyReasons) && bp.whyReasons.length > 0
            ? bp.whyReasons
            : [""];
          setWhyReasons(reasons);
          setFutureSelfNote(bp.futureSelfNote || "");
          setReduceDailyLimit(bp.reduceDailyLimit ?? "");
          setCostPerOccurrence(bp.costPerOccurrence != null ? Number(bp.costPerOccurrence) : "");
          setMinutesPerOccurrence(bp.minutesPerOccurrence ?? "");
        }

        if (data.kind === "BUILD" && data.buildProfile) {
          const bp = data.buildProfile;
          setTinyBehavior(bp.tinyBehavior || "");
          setAnchorText(bp.anchorText || "");
          setCelebrationText(bp.celebrationText || "");
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Terjadi kendala saat memuat data.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchHabit();
    return () => {
      ignore = true;
    };
  }, [habitId]);

  const handleAddReason = () => {
    setWhyReasons([...whyReasons, ""]);
  };

  const handleRemoveReason = (index: number) => {
    if (whyReasons.length <= 1) return;
    setWhyReasons(whyReasons.filter((_, i) => i !== index));
  };

  const handleReasonChange = (index: number, val: string) => {
    const updated = [...whyReasons];
    updated[index] = val;
    setWhyReasons(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama kebiasaan wajib diisi.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        displayAlias: displayAlias.trim() || null,
        category: category.trim() || null,
        checkinLocalTime,
        timezone,
        privacyLevel,
        identityStatement: identityStatement.trim() || null,
      };

      if (kind === "BREAK") {
        const cleanedReasons = whyReasons
          .map((r) => r.trim())
          .filter((r) => r.length > 0);

        if (cleanedReasons.length === 0) {
          throw new Error("Sertakan minimal 1 alasan kuat untuk perubahan ini.");
        }

        payload.whyReasons = cleanedReasons;
        payload.futureSelfNote = futureSelfNote.trim() || null;
        if (costPerOccurrence !== "") {
          payload.costPerOccurrence = Number(costPerOccurrence);
        }
        if (minutesPerOccurrence !== "") {
          payload.minutesPerOccurrence = Number(minutesPerOccurrence);
        }
        if (mode === "REDUCE") {
          payload.reduceDailyLimit = reduceDailyLimit !== "" ? Number(reduceDailyLimit) : 0;
        }
      } else if (kind === "BUILD") {
        if (!tinyBehavior.trim()) {
          throw new Error("Perilaku tiny wajib diisi (mis. 2 kali push-up).");
        }
        payload.tinyBehavior = tinyBehavior.trim();
        payload.anchorText = anchorText.trim() || null;
        payload.celebrationText = celebrationText.trim() || null;
      }

      const res = await fetch(`/api/tracked-habits/${habitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat memperbarui kebiasaan.");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kendala saat menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] rounded-3xl bg-[#131825] border border-white/10 p-6 sm:p-7 shadow-2xl flex flex-col gap-5 text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-indigo-400 text-2xl">
              edit_note
            </span>
            <div>
              <h3 className="text-base font-bold text-white">
                Ubah Informasi Kebiasaan
              </h3>
              <p className="text-[11px] text-slate-400">
                Sesuaikan target, jadwal, atau pengingat kapan saja sesuai ritme hidupmu.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <span className="text-xs text-slate-400">Memuat data kebiasaan...</span>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs"
          >
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            {/* Nama Kebiasaan */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">
                Nama Kebiasaan <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Membaca Buku, Mengurangi Gula..."
                className="w-full bg-[#1a2133] px-3.5 py-2.5 rounded-xl border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
                required
              />
            </div>

            {/* Nama Samaran & Kategori */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">
                  Nama Samaran (Display Alias)
                </label>
                <input
                  type="text"
                  value={displayAlias}
                  onChange={(e) => setDisplayAlias(e.target.value)}
                  placeholder="Nama samaran di layar publik"
                  className="w-full bg-[#1a2133] px-3.5 py-2.5 rounded-xl border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Kategori</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="KESEHATAN, PRODUKTIVITAS..."
                  className="w-full bg-[#1a2133] px-3.5 py-2.5 rounded-xl border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
                />
              </div>
            </div>

            {/* Jam Checkin & Zona Waktu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">
                  Jam Evaluasi Harian (HH:mm)
                </label>
                <input
                  type="text"
                  value={checkinLocalTime}
                  onChange={(e) => setCheckinLocalTime(e.target.value)}
                  placeholder="20:00"
                  pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$"
                  title="Format jam 24 jam HH:mm (contoh 20:00)"
                  className="w-full bg-[#1a2133] px-3.5 py-2.5 rounded-xl border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 font-mono transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">
                  Tingkat Privasi
                </label>
                <select
                  value={privacyLevel}
                  onChange={(e) => setPrivacyLevel(Number(e.target.value))}
                  className="w-full bg-[#1a2133] px-3.5 py-2.5 rounded-xl border border-white/10 text-white focus:outline-none focus:border-indigo-400 transition-colors"
                >
                  <option value={0}>0 • Publik (Terbuka)</option>
                  <option value={1}>1 • Privat (Standar)</option>
                  <option value={2}>2 • Samaran (Pakai Alias)</option>
                </select>
              </div>
            </div>

            {/* Pernyataan Identitas */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">
                Pernyataan Identitas Baru
              </label>
              <input
                type="text"
                value={identityStatement}
                onChange={(e) => setIdentityStatement(e.target.value)}
                placeholder="Contoh: Saya adalah pribadi yang menghargai ketenangan pikiran dan tubuh segar."
                className="w-full bg-[#1a2133] px-3.5 py-2.5 rounded-xl border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
              />
            </div>

            {/* Khusus BUILD */}
            {kind === "BUILD" && (
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <span>🌱</span>
                  <span>Parameter Tiny Habits (Metode ABC)</span>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">
                    B - Perilaku Tiny <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={tinyBehavior}
                    onChange={(e) => setTinyBehavior(e.target.value)}
                    placeholder="Contoh: Baca 1 halaman buku, 2x push-up..."
                    className="w-full bg-[#1a2133] px-3.5 py-2 rounded-xl border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">
                    A - Pemicu / Anchor
                  </label>
                  <input
                    type="text"
                    value={anchorText}
                    onChange={(e) => setAnchorText(e.target.value)}
                    placeholder="Contoh: Setelah menyeduh kopi pagi..."
                    className="w-full bg-[#1a2133] px-3.5 py-2 rounded-xl border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">
                    C - Perayaan Instan
                  </label>
                  <input
                    type="text"
                    value={celebrationText}
                    onChange={(e) => setCelebrationText(e.target.value)}
                    placeholder="Contoh: Tersenyum dan berkata 'Bagus!'..."
                    className="w-full bg-[#1a2133] px-3.5 py-2 rounded-xl border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            )}

            {/* Khusus BREAK */}
            {kind === "BREAK" && (
              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-3">
                <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs">
                  <span>🛡️</span>
                  <span>Rencana Penguatan &amp; Alasan Berhenti</span>
                </div>

                {/* Alasan Berhenti */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-300">
                      Alasan Kuat Berhenti ({whyReasons.length})
                    </label>
                    <button
                      type="button"
                      onClick={handleAddReason}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      + Tambah Alasan
                    </button>
                  </div>

                  {whyReasons.map((reason, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => handleReasonChange(idx, e.target.value)}
                        placeholder={`Alasan ${idx + 1}`}
                        className="flex-1 bg-[#1a2133] px-3 py-2 rounded-xl border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
                      />
                      {whyReasons.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveReason(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Catatan untuk Diri Masa Depan */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">
                    Catatan untuk Diri di Masa Depan
                  </label>
                  <textarea
                    rows={2}
                    value={futureSelfNote}
                    onChange={(e) => setFutureSelfNote(e.target.value)}
                    placeholder="Pesan pengingat pribadi saat dorongan muncul..."
                    className="w-full bg-[#1a2133] px-3.5 py-2 rounded-xl border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 resize-none"
                  />
                </div>

                {/* Mode Kurangi Bertahap */}
                {mode === "REDUCE" && (
                  <div className="space-y-1.5 pt-1">
                    <label className="font-semibold text-slate-300">
                      Batas Harian Saat Ini
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={reduceDailyLimit}
                      onChange={(e) => setReduceDailyLimit(e.target.value)}
                      placeholder="Contoh: 3"
                      className="w-full bg-[#1a2133] px-3.5 py-2 rounded-xl border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 font-mono"
                    />
                  </div>
                )}

                {/* Estimasi Penghematan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-300">
                      Biaya per Kejadian (Rp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={costPerOccurrence}
                      onChange={(e) => setCostPerOccurrence(e.target.value)}
                      placeholder="Contoh: 25000"
                      className="w-full bg-[#1a2133] px-3.5 py-2 rounded-xl border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-300">
                      Waktu per Kejadian (Menit)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={minutesPerOccurrence}
                      onChange={(e) => setMinutesPerOccurrence(e.target.value)}
                      placeholder="Contoh: 30"
                      className="w-full bg-[#1a2133] px-3.5 py-2 rounded-xl border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tombol Simpan */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all disabled:opacity-40"
              >
                {saving ? "Menyimpan Perubahan..." : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
