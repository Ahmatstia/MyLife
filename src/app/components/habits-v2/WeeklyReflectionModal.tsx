"use client";

import React, { useState, useEffect } from "react";

interface ReflectionItem {
  id: string;
  weekStart: string;
  question: string;
  answer?: string | null;
  submittedAt?: string | null;
  summary?: {
    currentStreakDays?: number;
    resilientStreak?: number;
    longestStreakDays?: number;
    weekNumber?: number;
  } | null;
}

interface WeeklyReflectionModalProps {
  habitId: string;
  habitName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function WeeklyReflectionModal({
  habitId,
  habitName,
  isOpen,
  onClose,
}: WeeklyReflectionModalProps) {
  const [currentReflection, setCurrentReflection] = useState<ReflectionItem | null>(null);
  const [pastReflections, setPastReflections] = useState<ReflectionItem[]>([]);
  const [reengagement, setReengagement] = useState<{
    isInactiveFor3Days: boolean;
    reengagementMessage?: { title: string; text: string } | null;
  } | null>(null);

  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/tracked-habits/${habitId}/reflections`);
        const json = await res.json();
        if (ignore) return;
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Tidak dapat memuat refleksi.");
        }
        setCurrentReflection(json.data?.currentReflection || null);
        setPastReflections(json.data?.pastReflections || []);
        setReengagement(json.data?.reengagement || null);
        if (json.data?.currentReflection?.answer) {
          setAnswer(json.data.currentReflection.answer);
        }
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
  }, [isOpen, habitId, reloadKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentReflection) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tracked-habits/${habitId}/reflections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reflectionId: currentReflection.id,
          answer,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat menyimpan refleksi.");
      }
      setSuccessToast("Refleksi mingguan berhasil disimpan! Terima kasih telah meluangkan waktu untuk dirimu.");
      setTimeout(() => setSuccessToast(null), 5000);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isAlreadyAnswered = Boolean(currentReflection?.submittedAt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#12131d] p-6 sm:p-8 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">📑</span>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Refleksi Mingguan
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Momen kontemplasi tanpa rasa bersalah untuk{" "}
              <strong className="text-slate-200">{habitName}</strong>.
            </p>
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

        {/* Re-engagement Warm Callout (Bila Tidak Ada Aktivitas >= 3 Hari) */}
        {reengagement?.isInactiveFor3Days && reengagement.reengagementMessage && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 mb-6 text-xs text-emerald-100 flex items-start gap-3.5 shadow-sm animate-in fade-in">
            <span className="text-2xl mt-0.5">🌱</span>
            <div className="space-y-1">
              <strong className="text-white font-bold text-sm block">
                {reengagement.reengagementMessage.title}
              </strong>
              <p className="text-emerald-200/90 leading-relaxed text-xs">
                {reengagement.reengagementMessage.text}
              </p>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {successToast && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-200 mb-6 flex items-center gap-2 shadow-lg">
            <span>✨</span>
            <span>{successToast}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200 mb-6 flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-rose-400 font-bold ml-2">
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span className="text-xs">Memuat refleksi minggu ini...</span>
          </div>
        ) : !currentReflection ? (
          <div className="p-8 text-center text-slate-400">
            <p className="text-xs">Tidak ada sesi refleksi aktif saat ini.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stat Card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-around text-center">
              <div>
                <span className="text-2xl font-black text-white">
                  {currentReflection.summary?.currentStreakDays ?? 0}
                </span>
                <span className="block text-[10px] text-slate-400 uppercase mt-0.5">
                  Hari Streak Saat Ini
                </span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <span className="text-2xl font-black text-emerald-400">
                  {currentReflection.summary?.longestStreakDays ?? 0}
                </span>
                <span className="block text-[10px] text-slate-400 uppercase mt-0.5">
                  Rekor Terpanjang
                </span>
              </div>
            </div>

            {/* Reflection Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-5 space-y-3">
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                  <span>💭</span>
                  <span>Pertanyaan Refleksi Minggu Ini</span>
                </div>
                <p className="text-sm font-semibold text-white leading-relaxed">
                  &quot;{currentReflection.question}&quot;
                </p>

                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Tuliskan pemikiran atau perasaanmu di sini dengan jujur tanpa menghakimi diri..."
                  rows={4}
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#161726] p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 leading-relaxed resize-none"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    {isAlreadyAnswered
                      ? `Telah dijawab pada ${new Date(
                          currentReflection.submittedAt!
                        ).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}`
                      : "Refleksi bersifat pribadi dan aman tersimpan."}
                  </span>

                  <button
                    type="submit"
                    disabled={submitting || !answer.trim()}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50"
                  >
                    {submitting ? "Menyimpan..." : isAlreadyAnswered ? "Perbarui Refleksi" : "Simpan Refleksi"}
                  </button>
                </div>
              </div>
            </form>

            {/* Riwayat Refleksi Lampau */}
            {pastReflections.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-white/10">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Riwayat Refleksi Sebelumnya
                </h3>
                <div className="space-y-2.5">
                  {pastReflections.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <strong className="text-indigo-300">
                          Minggu {new Date(r.weekStart).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </strong>
                        <span>
                          {r.submittedAt
                            ? new Date(r.submittedAt).toLocaleDateString("id-ID")
                            : ""}
                        </span>
                      </div>
                      <p className="text-slate-300 italic text-[11px]">&quot;{r.question}&quot;</p>
                      {r.answer && (
                        <p className="text-white text-xs bg-white/5 p-2.5 rounded-xl border border-white/5">
                          {r.answer}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-white/10 flex justify-end">
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
