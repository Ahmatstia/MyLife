"use client";

import React, { useState, useEffect, useRef } from "react";

interface CopingPlanItem {
  id: string;
  ifCondition: string;
  thenAction: string;
  timesUsed: number;
  timesHelped: number;
}

interface SosUrgeSurfingModalProps {
  isOpen: boolean;
  habitId: string;
  habitName: string;
  onClose: () => void;
  onSuccess: (result: { outcome: "RESISTED" | "GAVE_IN"; urgesResistedDelta: number }) => void;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

function SosUrgeSurfingModalContent({
  habitId,
  habitName,
  onClose,
  onSuccess,
}: Omit<SosUrgeSurfingModalProps, "isOpen">) {
  // Alur 7 langkah F-B3
  const [step, setStep] = useState<Step>(1);

  // Data dorongan
  const [intensityBefore, setIntensityBefore] = useState<number>(7);
  const [intensityAfter, setIntensityAfter] = useState<number>(3);
  const [outcome, setOutcome] = useState<"RESISTED" | "GAVE_IN">("RESISTED");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedHalt, setSelectedHalt] = useState<string[]>([]);
  const [selectedCopingPlanId, setSelectedCopingPlanId] = useState<string | null>(null);

  // Coping plans dari API
  const [copingPlans, setCopingPlans] = useState<CopingPlanItem[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Timer penundaan (default 10 menit = 600 detik)
  const [delaySeconds, setDelaySeconds] = useState<number>(600);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [timerElapsed, setTimerElapsed] = useState<number>(0);

  // Pacer napas (Box Breathing: 4-4-4-4)
  const [breathPhase, setBreathPhase] = useState<"Tarik" | "Tahan" | "Hembus" | "Jeda">("Tarik");
  const [breathCounter, setBreathCounter] = useState<number>(4);
  const [isBreathingActive, setIsBreathingActive] = useState<boolean>(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = Date.now();
    fetch(`/api/tracked-habits/${habitId}/coping-plans`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setCopingPlans(json.data);
        }
      })
      .catch(() => {
        // Abaikan error fetch agar modal tetap dapat digunakan
      })
      .finally(() => setLoadingPlans(false));
  }, [habitId]);

  // Efek timer penundaan
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning && delaySeconds > 0) {
      interval = setInterval(() => {
        setDelaySeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
        setTimerElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, delaySeconds]);

  // Efek panduan napas teratur
  useEffect(() => {
    let breathInterval: NodeJS.Timeout | null = null;
    if (isBreathingActive) {
      breathInterval = setInterval(() => {
        setBreathCounter((prev) => {
          if (prev <= 1) {
            setBreathPhase((current) => {
              switch (current) {
                case "Tarik":
                  return "Tahan";
                case "Tahan":
                  return "Hembus";
                case "Hembus":
                  return "Jeda";
                case "Jeda":
                  return "Tarik";
              }
            });
            return 4;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (breathInterval) clearInterval(breathInterval);
    };
  }, [isBreathingActive]);

  const toggleTool = (tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool],
    );
  };

  const toggleHalt = (item: string) => {
    setSelectedHalt((prev) =>
      prev.includes(item) ? prev.filter((h) => h !== item) : [...prev, item],
    );
  };

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Kirim satu panggilan API di akhir (F-B3)
  const handleSubmitFinal = async () => {
    setSubmitting(true);
    setSubmitError(null);

    const start = startTimeRef.current ?? Date.now();
    const totalDurationSec = Math.max(1, Math.round((Date.now() - start) / 1000));

    try {
      const res = await fetch(`/api/tracked-habits/${habitId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "URGE",
          intensityBefore,
          intensityAfter,
          outcome,
          severity: outcome === "GAVE_IN" ? "SLIP" : undefined,
          halt: selectedHalt,
          meta: {
            durationSec: totalDurationSec,
            tools: selectedTools,
            copingPlanId: selectedCopingPlanId || undefined,
            timerElapsedSec: timerElapsed,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat mencatat respon dorongan.");
      }

      onSuccess({
        outcome,
        urgesResistedDelta: outcome === "RESISTED" ? 1 : 0,
      });
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="sos-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-fade-in"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-rose-500/30 bg-[#12131e] p-6 text-white shadow-2xl shadow-rose-950/40 my-8">
        {/* Header dengan indikator langkah */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 font-bold text-sm">
              SOS
            </span>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Urge Surfing: Berselancar Dorongan
              </h2>
              <p className="text-[11px] text-slate-400">
                {habitName} • Langkah {step} dari 7
              </p>
            </div>
          </div>
          <button
            id="sos-close-btn"
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Progress Bar 7 Langkah */}
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `${(step / 7) * 100}%` }}
          />
        </div>

        {/* ----------------- LANGKAH 1: INTENSITAS AWAL (0-10) ----------------- */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <span className="text-4xl font-black text-rose-400 block mb-1">
                {intensityBefore}
                <span className="text-base text-slate-400 font-normal"> / 10</span>
              </span>
              <h3 className="text-lg font-bold text-white">
                Seberapa kuat dorongan ini sekarang?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                Beri nilai secara jujur tanpa menghakimi dirimu sendiri. Mengakui intensitas adalah langkah pertama untuk melepaskan kuasanya.
              </p>
            </div>

            <div className="px-2">
              <input
                id="intensity-before-slider"
                type="range"
                min="0"
                max="10"
                value={intensityBefore}
                onChange={(e) => setIntensityBefore(parseInt(e.target.value, 10))}
                className="w-full accent-rose-500 h-2 bg-white/10 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-medium">
                <span>0 (Tenang)</span>
                <span>5 (Sedang)</span>
                <span>10 (Sangat Kuat)</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                id="sos-step1-next-btn"
                type="button"
                onClick={() => setStep(2)}
                className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition-all"
              >
                Lanjut: Sadari & Namai →
              </button>
            </div>
          </div>
        )}

        {/* ----------------- LANGKAH 2: NAMAI DORONGAN ----------------- */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/30 text-center space-y-4">
              <span className="text-3xl block">🌊</span>
              <blockquote className="text-lg font-extrabold text-indigo-200 tracking-tight leading-snug">
                &ldquo;Ini hanyalah sebuah dorongan, bukan perintah.&rdquo;
              </blockquote>
              <p className="text-xs text-slate-300 leading-relaxed">
                Dorongan otakmu bekerja persis seperti <strong>ombak di lautan</strong>: ia datang, naik menuju puncaknya, lalu secara alami akan pecah dan mereda dengan sendirinya tanpa harus kamu turuti.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-semibold">
                <span>💡</span>
                <span>Kebenaran yang menenangkan:</span>
              </div>
              <p>
                Rasa tidak nyaman ini bersifat sementara. Tubuhmu tidak dalam bahaya, dan kamu memiliki kendali penuh atas tindakanmu saat ini.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                ← Kembali
              </button>
              <button
                id="sos-step2-next-btn"
                type="button"
                onClick={() => {
                  setStep(3);
                  setTimerRunning(true);
                }}
                className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-500 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all"
              >
                Mulai Urge Surfing (10 Menit) →
              </button>
            </div>
          </div>
        )}

        {/* ----------------- LANGKAH 3: AMATI & TIMER PENUNDAAN ----------------- */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                Timer Penundaan (Delay Tactic)
              </div>
              <div className="text-5xl font-mono font-black text-white tracking-tight py-2">
                {formatTimer(delaySeconds)}
              </div>
              <p className="text-xs text-slate-400">
                Tunda tindakan selama beberapa menit. Sebagian besar dorongan mereda dalam 10-15 menit.
              </p>
            </div>

            {/* Kontrol Timer */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setTimerRunning(!timerRunning)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  timerRunning
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                    : "bg-emerald-600 text-white hover:bg-emerald-500"
                }`}
              >
                {timerRunning ? "⏸ Jeda Timer" : "▶ Lanjutkan Timer"}
              </button>
              <button
                type="button"
                onClick={() => setDelaySeconds((s) => s + 300)}
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10"
              >
                +5 Menit
              </button>
            </div>

            {/* Panduan Pemindaian Tubuh */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <span>🧘</span>
                <span>Panduan Tubuh (60 Detik):</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Di bagian tubuh mana kamu merasakan dorongan ini paling kuat? Apakah di dada, perut, tenggorokan, atau telapak tangan?
              </p>
              <p className="text-xs text-slate-400 italic">
                Cukup rasakan tanpa melawan atau menyalahkan diri. Bayangkan kamu sedang duduk di tepi pantai melihat ombak naik lalu kembali ke laut.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                ← Kembali
              </button>
              <button
                id="sos-step3-next-btn"
                type="button"
                onClick={() => setStep(4)}
                className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-500 py-3 text-sm font-bold text-white shadow-lg transition-all"
              >
                Pilih Alat Bantuan →
              </button>
            </div>
          </div>
        )}

        {/* ----------------- LANGKAH 4: PILIH ALAT BANTUAN ----------------- */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">
                Pilih Alat untuk Membantu Meredakan Dorongan
              </h3>
              <p className="text-xs text-slate-400">
                Gunakan strategi fisik, emosional, atau aksi pengganti yang sudah kamu rencanakan.
              </p>
            </div>

            {/* Box Breathing Tool */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                  <span>🫁</span>
                  <span>Latihan Napas Terpandu (Box Breathing 4-4-4-4)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsBreathingActive(!isBreathingActive);
                    if (!selectedTools.includes("breathing")) {
                      toggleTool("breathing");
                    }
                  }}
                  className={`text-xs px-3 py-1 rounded-xl font-bold transition-all ${
                    isBreathingActive
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-indigo-600 text-white hover:bg-indigo-500"
                  }`}
                >
                  {isBreathingActive ? "Hentikan" : "Mulai Napas"}
                </button>
              </div>

              {isBreathingActive && (
                <div className="text-center p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-1 animate-fade-in">
                  <span className="text-xl font-black text-indigo-300 uppercase tracking-wider block">
                    {breathPhase} ({breathCounter})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Fokuskan seluruh perhatianmu pada hembusan dan tarikan udara.
                  </span>
                </div>
              )}
            </div>

            {/* HALT+B Quick Check */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">
                Cek Kebutuhan Dasar (HALT+B):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { key: "HUNGRY", label: "Lapar / Haus", icon: "💧" },
                  { key: "ANGRY", label: "Marah / Kesal", icon: "⚡" },
                  { key: "LONELY", label: "Kesepian", icon: "🤝" },
                  { key: "TIRED", label: "Lelah / Ngantuk", icon: "🌙" },
                  { key: "BORED", label: "Bosan / Melamun", icon: "🎯" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      toggleHalt(item.key);
                      if (!selectedTools.includes("halt_check")) toggleTool("halt_check");
                    }}
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

            {/* Rencana Jika-Maka Terdaftar (Coping Plans) */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">
                Rencana Jika–Maka Tersedia:
              </span>
              {loadingPlans ? (
                <p className="text-xs text-slate-400 italic">Memuat rencana...</p>
              ) : copingPlans.length === 0 ? (
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-400 italic">
                  Belum ada rencana jika-maka khusus. Coba pindah ruangan atau minum segelas air dingin.
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {copingPlans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => {
                        setSelectedCopingPlanId(
                          selectedCopingPlanId === plan.id ? null : plan.id,
                        );
                        if (!selectedTools.includes("coping_plan")) toggleTool("coping_plan");
                      }}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                        selectedCopingPlanId === plan.id
                          ? "bg-indigo-600/30 border-indigo-400 text-white"
                          : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <div className="font-semibold text-indigo-300 mb-0.5">
                        {plan.ifCondition}
                      </div>
                      <div className="text-slate-200">
                        ➔ {plan.thenAction}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Aksi Tambahan Lainnya */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { key: "walk", label: "🚶 Pindah Lokasi / Jalan Kaki" },
                { key: "call_friend", label: "📞 Hubungi Teman / Keluarga" },
                { key: "cold_water", label: "🧊 Cuci Muka Air Dingin" },
              ].map((act) => (
                <button
                  key={act.key}
                  type="button"
                  onClick={() => toggleTool(act.key)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    selectedTools.includes(act.key)
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {act.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                ← Kembali
              </button>
              <button
                id="sos-step4-next-btn"
                type="button"
                onClick={() => {
                  setIsBreathingActive(false);
                  setStep(5);
                }}
                className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-500 py-3 text-sm font-bold text-white shadow-lg transition-all"
              >
                Evaluasi Intensitas Sekarang →
              </button>
            </div>
          </div>
        )}

        {/* ----------------- LANGKAH 5: EVALUASI INTENSITAS AKHIR (0-10) ----------------- */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <span className="text-4xl font-black text-indigo-400 block mb-1">
                {intensityAfter}
                <span className="text-base text-slate-400 font-normal"> / 10</span>
              </span>
              <h3 className="text-lg font-bold text-white">
                Bagaimana intensitas dorongan sekarang?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                Sebelumnya berada di level <strong>{intensityBefore}/10</strong>. Berapa intensitasnya setelah kamu menunda dan bernapas?
              </p>
            </div>

            <div className="px-2">
              <input
                id="intensity-after-slider"
                type="range"
                min="0"
                max="10"
                value={intensityAfter}
                onChange={(e) => setIntensityAfter(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500 h-2 bg-white/10 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-medium">
                <span>0 (Hilang)</span>
                <span>5 (Mereda)</span>
                <span>10 (Masih Kuat)</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                ← Kembali
              </button>
              <button
                id="sos-step5-next-btn"
                type="button"
                onClick={() => setStep(6)}
                className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-500 py-3 text-sm font-bold text-white shadow-lg transition-all"
              >
                Tentukan Hasil Akhir →
              </button>
            </div>
          </div>
        )}

        {/* ----------------- LANGKAH 6: TENTUKAN HASIL ----------------- */}
        {step === 6 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-white mb-1">
                Bagaimana hasilnya?
              </h3>
              <p className="text-xs text-slate-400">
                Pilih status yang paling menggambarkan apa yang terjadi:
              </p>
            </div>

            <div className="space-y-3">
              {/* Opsi 1: Mereda & Berhasil Dilawan */}
              <button
                type="button"
                onClick={() => {
                  setOutcome("RESISTED");
                  setStep(7);
                }}
                className={`w-full p-4 rounded-2xl border text-left transition-all ${
                  outcome === "RESISTED"
                    ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛡️</span>
                  <div>
                    <div className="font-bold text-sm text-emerald-300">
                      Dorongan Mereda (Berhasil Dilawan)
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      Dorongan sudah lewat atau intensitasnya turun ke tingkat aman.
                    </div>
                  </div>
                </div>
              </button>

              {/* Opsi 2: Masih Ada Tapi Tetap Bertahan */}
              <button
                type="button"
                onClick={() => {
                  setOutcome("RESISTED");
                  setStep(7);
                }}
                className="w-full p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-left transition-all text-slate-300"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⏳</span>
                  <div>
                    <div className="font-bold text-sm text-indigo-300">
                      Masih Terasa tapi Saya Tetap Bertahan
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      Dorongan masih ada, namun saya memilih untuk tidak menurutinya.
                    </div>
                  </div>
                </div>
              </button>

              {/* Opsi 3: Terpeleset */}
              <button
                type="button"
                onClick={() => {
                  setOutcome("GAVE_IN");
                  setStep(7);
                }}
                className={`w-full p-4 rounded-2xl border text-left transition-all ${
                  outcome === "GAVE_IN"
                    ? "bg-amber-950/30 border-amber-500/40 text-amber-200"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🌱</span>
                  <div>
                    <div className="font-bold text-sm text-amber-300">
                      Saya Terpeleset Kali Ini
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      Tidak apa-apa. Ini data berharga untuk belajar dan memulihkan diri.
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setStep(5)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                ← Kembali
              </button>
            </div>
          </div>
        )}

        {/* ----------------- LANGKAH 7: PERAYAAN / PEMULIHAN & SATU PANGGILAN API ----------------- */}
        {step === 7 && (
          <div className="space-y-6">
            {outcome === "RESISTED" ? (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 text-center space-y-3 animate-fade-in">
                <span className="text-4xl block animate-bounce">🎉</span>
                <h3 className="text-lg font-black text-emerald-300">
                  Luar Biasa! Kamu Berhasil Berselancar
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Kamu baru saja melatih sirkuit baru di otakmu bahwa dorongan tidak harus diikuti.
                  Hitungan <strong>Dorongan Dilawan</strong> akan bertambah!
                </p>
                <div className="pt-2 flex justify-center gap-4 text-[11px] text-slate-400">
                  <span>Intensitas: {intensityBefore} ➔ {intensityAfter}</span>
                  <span>•</span>
                  <span>Waktu: ±{Math.max(1, Math.round(timerElapsed / 60))} menit</span>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/30 text-center space-y-3 animate-fade-in">
                <span className="text-4xl block">🌱</span>
                <h3 className="text-lg font-black text-amber-300">
                  Satu Kejadian Tidak Menghapus Progresmu
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Perjalanan perubahan kebiasaan bukanlah garis lurus tanpa gelombang.
                  Keluarlah dari rasa bersalah, tarik napas, dan mari kita rawat langkah berikutnya.
                </p>
              </div>
            )}

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {submitError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setStep(6)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-50"
              >
                ← Ubah Hasil
              </button>
              <button
                id="sos-submit-final-btn"
                type="button"
                disabled={submitting}
                onClick={handleSubmitFinal}
                className={`flex-1 rounded-2xl py-3 text-sm font-bold text-white shadow-lg transition-all disabled:opacity-50 ${
                  outcome === "RESISTED"
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                    : "bg-amber-600 hover:bg-amber-500 shadow-amber-600/30"
                }`}
              >
                {submitting ? "Menyimpan Catatan..." : "Simpan & Selesaikan SOS ✓"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SosUrgeSurfingModal(props: SosUrgeSurfingModalProps) {
  if (!props.isOpen) return null;
  return <SosUrgeSurfingModalContent {...props} />;
}
