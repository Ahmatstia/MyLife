"use client";

import React, { useState, useEffect } from "react";

interface HabitTriggerItem {
  id: string;
  intensity: number;
  trigger: {
    id: string;
    name: string;
    category: string;
  };
}

interface DebriefModalProps {
  isOpen: boolean;
  habitId: string;
  eventId?: string | null;
  habitName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function DebriefModal({
  isOpen,
  habitId,
  eventId,
  habitName,
  onClose,
  onSuccess,
}: DebriefModalProps) {
  if (!isOpen || !eventId) return null;

  return (
    <DebriefModalContent
      habitId={habitId}
      eventId={eventId}
      habitName={habitName}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function DebriefModalContent({
  habitId,
  eventId,
  habitName,
  onClose,
  onSuccess,
}: {
  habitId: string;
  eventId: string;
  habitName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  // Pertanyaan 1: Apa yang terjadi tepat sebelumnya?
  const [whatHappened, setWhatHappened] = useState("");
  const [selectedTriggerIds, setSelectedTriggerIds] = useState<string[]>([]);
  const [availableTriggers, setAvailableTriggers] = useState<HabitTriggerItem[]>([]);
  const [loadingTriggers, setLoadingTriggers] = useState(true);

  // Pertanyaan 2: Kondisi tubuh & perasaan?
  const [selectedHalt, setSelectedHalt] = useState<string[]>([]);
  const [mood, setMood] = useState<number>(3);
  const [bodyFeeling, setBodyFeeling] = useState("");

  // Pertanyaan 3: Apa yang berhasil menahan sebelumnya / apa yang bisa diubah?
  const [whatHelpedBefore, setWhatHelpedBefore] = useState("");

  // Pertanyaan 4: Rencana jika-maka baru
  const [ifCondition, setIfCondition] = useState("");
  const [thenAction, setThenAction] = useState("");

  // UI state
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opsi simpan Coping Plan setelah debrief
  const [copingPlanSaved, setCopingPlanSaved] = useState(false);
  const [savingCopingPlan, setSavingCopingPlan] = useState(false);

  useEffect(() => {
    fetch(`/api/tracked-habits/${habitId}/triggers`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setAvailableTriggers(json.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingTriggers(false));
  }, [habitId]);

  const toggleTrigger = (id: string) => {
    setSelectedTriggerIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const toggleHalt = (item: string) => {
    setSelectedHalt((prev) =>
      prev.includes(item) ? prev.filter((h) => h !== item) : [...prev, item],
    );
  };

  // Simpan refleksi debrief
  const handleSaveDebrief = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/tracked-habits/${habitId}/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debrief: {
            whatHappened: whatHappened.trim() || undefined,
            bodyFeeling: bodyFeeling.trim() || undefined,
            whatHelpedBefore: whatHelpedBefore.trim() || undefined,
            newCopingIdea:
              ifCondition.trim() && thenAction.trim()
                ? `Jika ${ifCondition.trim()}, maka ${thenAction.trim()}`
                : undefined,
          },
          habitTriggerIds: selectedTriggerIds,
          mood,
          halt: selectedHalt,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat menyimpan refleksi debrief.");
      }

      // Jika ada ide rencana jika-maka di pertanyaan 4, lanjut ke langkah konfirmasi simpan rencana
      if (ifCondition.trim() && thenAction.trim()) {
        setStep(5);
      } else {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSubmitting(false);
    }
  };

  // Simpan rencana jika-maka baru yang lahir dari debrief
  const handleSaveNewCopingPlan = async () => {
    setSavingCopingPlan(true);
    try {
      const res = await fetch(`/api/tracked-habits/${habitId}/coping-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ifCondition: ifCondition.trim(),
          thenAction: thenAction.trim(),
          habitTriggerId: selectedTriggerIds[0] || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat membuat rencana baru.");
      }
      setCopingPlanSaved(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak dapat menyimpan rencana jika-maka.");
    } finally {
      setSavingCopingPlan(false);
    }
  };

  return (
    <div
      id="debrief-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="debrief-modal-title"
    >
      <div className="relative w-full max-w-xl rounded-3xl border border-indigo-500/30 bg-[#141523] p-6 text-white shadow-2xl shadow-indigo-950/40 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-lg">
              🔍
            </span>
            <div>
              <h2 id="debrief-modal-title" className="text-base font-bold text-white tracking-tight">
                Refleksi Situasi (Debrief)
              </h2>
              <p className="text-[11px] text-slate-400">
                {habitName} • {step <= 4 ? `Pertanyaan ${step} dari 4` : "Pembaruan Rencana"}
              </p>
            </div>
          </div>
          <button
            id="debrief-skip-btn"
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors"
          >
            Lewati Refleksi
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `${(Math.min(step, 4) / 4) * 100}%` }}
          />
        </div>

        {/* ----------------- PERTANYAAN 1: SITUASI TEPAT SEBELUMNYA ----------------- */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-1">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Pertanyaan 1 dari 4
              </span>
              <h3 className="text-base font-bold text-white">
                Apa yang terjadi tepat sebelum kejadian ini?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Fokuskan pada situasi konkret di sekitarmu (tempat, orang yang bersama, atau kejadian pemicu), bukan pada kekurangan diri.
              </p>
            </div>

            {/* Checklist Pemicu Kebiasaan */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Apakah ada pemicu berikut yang terlibat?
              </label>
              {loadingTriggers ? (
                <p className="text-xs text-slate-400 italic">Memuat pemicu...</p>
              ) : availableTriggers.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada pemicu tersimpan di kebiasaan ini.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {availableTriggers.map((ht) => (
                    <button
                      key={ht.id}
                      type="button"
                      onClick={() => toggleTrigger(ht.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition-all ${
                        selectedTriggerIds.includes(ht.id)
                          ? "bg-indigo-600/30 border-indigo-400 text-white"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      <span>{ht.trigger.name}</span>
                      <span className="text-[10px] opacity-75 font-mono">
                        L{ht.intensity}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Catatan Deskripsi Situasi */}
            <div className="space-y-1.5">
              <label htmlFor="debrief-what-happened" className="text-xs font-semibold text-slate-300 block">
                Ceritakan situasinya secara singkat:
              </label>
              <textarea
                id="debrief-what-happened"
                rows={3}
                value={whatHappened}
                onChange={(e) => setWhatHappened(e.target.value)}
                placeholder="Contoh: Sedang menunggu di halte sendirian sepulang kerja setelah rapat panjang..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                id="debrief-step1-next-btn"
                type="button"
                onClick={() => setStep(2)}
                className="rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all"
              >
                Lanjut ke Kondisi Tubuh →
              </button>
            </div>
          </div>
        )}

        {/* ----------------- PERTANYAAN 2: KONDISI TUBUH & PERASAAN ----------------- */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-1">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Pertanyaan 2 dari 4
              </span>
              <h3 className="text-base font-bold text-white">
                Bagaimana kondisi tubuh dan perasaanmu saat itu?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Dorongan sering kali merupakan sinyal dari tubuh yang kelelahan atau emosi yang tertekan.
              </p>
            </div>

            {/* HALT+B Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Tandai kebutuhan fisik/emosi yang aktif (HALT+B):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { key: "HUNGRY", label: "Lapar / Kurang Makan", icon: "🥪" },
                  { key: "ANGRY", label: "Marah / Frustrasi", icon: "⚡" },
                  { key: "LONELY", label: "Kesepian / Sendirian", icon: "🤝" },
                  { key: "TIRED", label: "Lelah / Kurang Tidur", icon: "🌙" },
                  { key: "BORED", label: "Bosan / Melamun", icon: "🎯" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleHalt(item.key)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      selectedHalt.includes(item.key)
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-200"
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mood Scale (1-5) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Suasana hati saat itu (1 = Sangat Down, 5 = Tenang / Baik):
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setMood(val)}
                    className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all ${
                      mood === val
                        ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30"
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    {val === 1 && "😫 1"}
                    {val === 2 && "🙁 2"}
                    {val === 3 && "😐 3"}
                    {val === 4 && "🙂 4"}
                    {val === 5 && "😊 5"}
                  </button>
                ))}
              </div>
            </div>

            {/* Detail sensasi tubuh */}
            <div className="space-y-1.5">
              <label htmlFor="debrief-body-feeling" className="text-xs font-semibold text-slate-300 block">
                Sensasi fisik yang kamu rasakan:
              </label>
              <input
                id="debrief-body-feeling"
                type="text"
                value={bodyFeeling}
                onChange={(e) => setBodyFeeling(e.target.value)}
                placeholder="Contoh: Dada sesak, kepala berdenyut, mata mengantuk..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
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
                id="debrief-step2-next-btn"
                type="button"
                onClick={() => setStep(3)}
                className="rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition-all"
              >
                Lanjut ke Penahan →
              </button>
            </div>
          </div>
        )}

        {/* ----------------- PERTANYAAN 3: STRATEGI YANG PERNAH BERHASIL ----------------- */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-1">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Pertanyaan 3 dari 4
              </span>
              <h3 className="text-base font-bold text-white">
                Apa yang berhasil menahanmu sebelumnya, atau apa yang bisa diubah?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ingat saat kamu pernah berhasil melewati momen serupa. Tindakan kecil apa yang bisa menciptakan jeda 5–10 menit di situasi tadi?
              </p>
            </div>

            <div className="space-y-1.5">
              <textarea
                id="debrief-what-helped"
                rows={4}
                value={whatHelpedBefore}
                onChange={(e) => setWhatHelpedBefore(e.target.value)}
                placeholder="Contoh: Biasanya kalau saya segera bangun dan cuci muka air dingin atau langsung minum air putih, dorongannya berkurang..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                ← Kembali
              </button>
              <button
                id="debrief-step3-next-btn"
                type="button"
                onClick={() => setStep(4)}
                className="rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition-all"
              >
                Lanjut ke Rencana Jika-Maka →
              </button>
            </div>
          </div>
        )}

        {/* ----------------- PERTANYAAN 4: RENCANA JIKA-MAKA BARU ----------------- */}
        {step === 4 && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-1">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Pertanyaan 4 dari 4
              </span>
              <h3 className="text-base font-bold text-white">
                Rencana Jika–Maka apa yang ingin kamu tambahkan?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ubah pelajaran tadi menjadi rencana implementasi spesifik: <em>Jika situasi X terjadi lagi, maka saya akan melakukan Y</em>.
              </p>
            </div>

            <div className="space-y-3 p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20">
              <div className="space-y-1">
                <label htmlFor="debrief-if-condition" className="text-xs font-bold text-indigo-300">
                  Jika (Pemicu / Kondisi):
                </label>
                <input
                  id="debrief-if-condition"
                  type="text"
                  value={ifCondition}
                  onChange={(e) => setIfCondition(e.target.value)}
                  placeholder="Contoh: Jika saya merasa sangat lelah dan sendirian di kamar..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="debrief-then-action" className="text-xs font-bold text-emerald-300">
                  Maka (Aksi Pengganti):
                </label>
                <input
                  id="debrief-then-action"
                  type="text"
                  value={thenAction}
                  onChange={(e) => setThenAction(e.target.value)}
                  placeholder="Contoh: Maka saya akan segera mematikan layar dan mendengarkan podcast santai..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                ← Kembali
              </button>
              <button
                id="debrief-save-btn"
                type="button"
                disabled={submitting}
                onClick={handleSaveDebrief}
                className="rounded-2xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg transition-all disabled:opacity-50"
              >
                {submitting ? "Menyimpan..." : "Simpan Refleksi Debrief ✓"}
              </button>
            </div>
          </div>
        )}

        {/* ----------------- LANGKAH 5: TAWARAN SIMPAN RENCANA JIKA-MAKA ----------------- */}
        {step === 5 && (
          <div className="space-y-6 text-center animate-fade-in py-2">
            <span className="text-4xl block">🌱</span>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-white">
                Refleksi Berhasil Disimpan!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Kamu merumuskan rencana baru:
              </p>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left text-xs space-y-1">
                <div className="text-indigo-300 font-semibold">
                  Jika {ifCondition}
                </div>
                <div className="text-emerald-300">
                  Maka {thenAction}
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Ingin langsung menambahkan rencana ini ke daftar Rencana Jika–Maka aktif kebiasaanmu?
              </p>
            </div>

            {copingPlanSaved ? (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold animate-fade-in">
                ✓ Rencana berhasil ditambahkan ke daftarmu!
              </div>
            ) : (
              <div className="flex gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onSuccess();
                    onClose();
                  }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-slate-300 hover:bg-white/10"
                >
                  Nanti Saja
                </button>
                <button
                  id="debrief-confirm-add-coping-btn"
                  type="button"
                  disabled={savingCopingPlan}
                  onClick={handleSaveNewCopingPlan}
                  className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {savingCopingPlan ? "Menyimpan..." : "Tambahkan ke Rencana Aktif ✓"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
