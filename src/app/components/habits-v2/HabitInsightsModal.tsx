"use client";

import React, { useState, useEffect } from "react";
import type { HabitInsight, InsightsResult } from "@/lib/habits/insights";

interface HabitInsightsModalProps {
  habitId: string;
  habitName: string;
  isOpen: boolean;
  onClose: () => void;
}

const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function HabitInsightsModal({
  habitId,
  habitName,
  isOpen,
  onClose,
}: HabitInsightsModalProps) {
  const [range, setRange] = useState<"30d" | "60d" | "90d">("60d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InsightsResult | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/tracked-habits/${habitId}/insights?range=${range}`);
        const json = await res.json();
        if (ignore) return;
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Tidak dapat memuat analisis wawasan.");
        }
        setData(json.data);
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [isOpen, habitId, range, reloadKey]);

  const handleRangeChange = (r: "30d" | "60d" | "90d") => {
    setLoading(true);
    setError(null);
    setRange(r);
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#12131d] p-6 sm:p-8 shadow-2xl text-white">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">📊</span>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Analisis &amp; Pola Wawasan
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Mengenali waktu rawan, pemicu dominan, dan efektivitas rencana untuk{" "}
              <strong className="text-slate-200">{habitName}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Range Selector */}
            <div className="flex items-center rounded-xl bg-white/5 border border-white/10 p-1">
              {(["30d", "60d", "90d"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRangeChange(r)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    range === r
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {r === "30d" ? "30 Hari" : r === "60d" ? "60 Hari" : "90 Hari"}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span className="text-xs">Menganalisis data pola kebiasaan...</span>
          </div>
        ) : error ? (
          <div className="py-10 text-center">
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200 max-w-md mx-auto mb-4">
              {error}
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-semibold text-white transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        ) : !data ? null : (
          <div className="space-y-8">
            {/* Gate: Ambang Batas Minimum */}
            {!data.hasSufficientData ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-100">
                <div className="flex items-start gap-3.5 mb-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-xl border border-amber-500/40">
                    ⏳
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      Pola Masih Sedang Dipelajari
                    </h3>
                    <p className="text-xs text-amber-200/90 leading-relaxed">
                      Sistem kami sengaja tidak membuat kesimpulan pola yang terburu-buru. Untuk
                      menghasilkan wawasan yang akurat dan bisa dijelaskan secara ilmiah,
                      diperlukan minimal{" "}
                      <strong>{data.threshold.requiredDays} hari pelacakan</strong> dan{" "}
                      <strong>{data.threshold.requiredEvents} catatan dorongan/kejadian</strong>.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-amber-500/20">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-300">Hari Pelacakan:</span>
                      <strong className="text-white">
                        {data.threshold.actualDays} dari {data.threshold.requiredDays} hari
                      </strong>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            (data.threshold.actualDays / data.threshold.requiredDays) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-300">Catatan Dorongan / Kejadian:</span>
                      <strong className="text-white">
                        {data.threshold.actualEvents} dari {data.threshold.requiredEvents} catatan
                      </strong>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            (data.threshold.actualEvents / data.threshold.requiredEvents) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Heatmap Distribusi Jam x Hari */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🗓️</span> Distribusi Waktu Munculnya Dorongan (Heatmap 7x24)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Menampilkan frekuensi dorongan berdasarkan hari dan jam dalam zona waktu lokal
                    Anda.
                  </p>
                </div>

                {/* Heatmap Legend */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span>Jarang</span>
                  <div className="flex gap-0.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-white/5 border border-white/10" />
                    <span className="h-2.5 w-2.5 rounded-sm bg-indigo-900/60" />
                    <span className="h-2.5 w-2.5 rounded-sm bg-indigo-700" />
                    <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />
                    <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
                  </div>
                  <span>Sering</span>
                </div>
              </div>

              {/* Heatmap Grid Container */}
              <div className="overflow-x-auto pb-2">
                <div className="min-w-[650px]">
                  {/* Hours Header (0 .. 23) */}
                  <div className="grid grid-cols-[40px_repeat(24,_1fr)] gap-1 text-[9px] text-slate-400 mb-1 font-mono text-center">
                    <span />
                    {Array.from({ length: 24 }, (_, h) => (
                      <span key={h} className={h % 3 === 0 ? "font-bold text-slate-300" : "opacity-60"}>
                        {h}
                      </span>
                    ))}
                  </div>

                  {/* 7 Days Rows */}
                  {data.heatmap.grid.map((row, dayIdx) => (
                    <div
                      key={dayIdx}
                      className="grid grid-cols-[40px_repeat(24,_1fr)] gap-1 items-center mb-1 text-center"
                    >
                      <span className="text-[10px] font-semibold text-slate-300 text-left">
                        {DAY_LABELS[dayIdx]}
                      </span>
                      {row.map((count, hour) => {
                        const max = data.heatmap.maxCount || 1;
                        const ratio = count / max;
                        let bgClass = "bg-white/5 border-white/5";
                        if (count > 0) {
                          if (ratio >= 0.8) bgClass = "bg-amber-400 text-black font-bold";
                          else if (ratio >= 0.5) bgClass = "bg-indigo-500 text-white";
                          else if (ratio >= 0.25) bgClass = "bg-indigo-700 text-white";
                          else bgClass = "bg-indigo-900/70 text-indigo-200";
                        }

                        return (
                          <div
                            key={hour}
                            title={`${DAY_LABELS[dayIdx]}, ${hour.toString().padStart(2, "0")}:00 - ${((hour + 1) % 24).toString().padStart(2, "0")}:00: ${count} dorongan`}
                            className={`h-5 rounded-sm flex items-center justify-center text-[8px] transition-all cursor-default border ${bgClass}`}
                          >
                            {count > 0 ? count : ""}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Insight Cards (Bila Memenuhi Ambang Batas) */}
            {data.hasSufficientData && data.insights.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>💡</span> Temuan Pola &amp; Rekomendasi
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.insights.map((insight, idx) => (
                    <InsightCard key={idx} insight={insight} />
                  ))}
                </div>
              </div>
            ) : null}

            {/* Disclaimer & Catatan Metodologi */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2.5">
              <span className="text-base shrink-0">🔬</span>
              <div>
                <strong className="text-slate-300 block mb-0.5">Catatan Metodologi &amp; Non-Kausalitas:</strong>
                Seluruh pola yang disajikan merupakan analisis korelasi statistik murni dari catatan riil
                Anda. Kami tidak membuat klaim sebab-akibat langsung. Gunakan wawasan ini untuk
                mempersiapkan strategi pencegahan dan pengingat dini dengan penuh rasa empati.
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 hover:bg-white/20 px-5 py-2.5 text-xs font-bold text-white transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: HabitInsight }) {
  let badgeColor = "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
  let icon = "💡";

  if (insight.kind === "RISK_WINDOWS") {
    badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/30";
    icon = "⏰";
  } else if (insight.kind === "RISK_DAYS") {
    badgeColor = "bg-rose-500/20 text-rose-300 border-rose-500/30";
    icon = "📅";
  } else if (insight.kind === "TOP_TRIGGERS") {
    badgeColor = "bg-purple-500/20 text-purple-300 border-purple-500/30";
    icon = "⚡";
  } else if (insight.kind === "HALT_SHARE") {
    badgeColor = "bg-blue-500/20 text-blue-300 border-blue-500/30";
    icon = "🔋";
  } else if (insight.kind === "MOOD_CORRELATION") {
    badgeColor = "bg-teal-500/20 text-teal-300 border-teal-500/30";
    icon = "🎭";
  } else if (insight.kind === "URGE_DURATION") {
    badgeColor = "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
    icon = "🌊";
  } else if (insight.kind === "PLAN_EFFECTIVENESS") {
    badgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    icon = "🛡️";
  } else if (insight.kind === "EARLY_BURST_EDUCATION") {
    badgeColor = "bg-amber-500/20 text-amber-200 border-amber-500/30";
    icon = "🧠";
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#161726] p-4 flex flex-col justify-between shadow-sm hover:border-white/20 transition-all">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">{icon}</span>
            <h4 className="text-xs font-bold text-white">{insight.title}</h4>
          </div>
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}
          >
            {insight.kind}
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-3">{insight.text}</p>
      </div>

      <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
        <span>
          Dasar data: <strong>{insight.evidence.sampleSize}</strong> kejadian relevan
        </span>
        <span className="text-slate-400">
          {insight.evidence.daysTracked} hari pelacakan
        </span>
      </div>
    </div>
  );
}
