"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Calendar90Days } from "./Calendar90Days";
import { LogLapseModal } from "./LogLapseModal";
import { RecoveryModal } from "./RecoveryModal";
import { SosUrgeSurfingModal } from "./SosUrgeSurfingModal";
import { DebriefModal } from "./DebriefModal";

interface DashboardData {
  habit: {
    id: string;
    name: string;
    displayAlias?: string | null;
    category?: string | null;
    privacyLevel: number;
    status: "ACTIVE" | "PAUSED" | "ARCHIVED";
    startedAt: string;
    timezone: string;
    checkinLocalTime: string;
    breakProfile?: {
      whyReasons?: string[];
      futureSelfNote?: string | null;
      costPerOccurrence?: number | null;
    } | null;
  };
  stats?: {
    currentStreakDays: number;
    longestStreakDays: number;
    confirmedCleanDays: number;
    cleanRate30d?: number | null;
    lastLapseAt?: string | null;
    totalLapses: number;
    urgesResisted: number;
  } | null;
  pendingCheckins: Array<{
    id: string;
    periodDate: string;
    windowStart: string;
    windowEnd: string;
    status: string;
  }>;
  calendar: Array<{
    id: string;
    periodDate: string;
    status: string;
  }>;
}

interface BreakDashboardProps {
  habitId: string;
  onBack: () => void;
}

export function BreakDashboard({ habitId, onBack }: BreakDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showLogLapse, setShowLogLapse] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showSos, setShowSos] = useState(false);
  const [showDebrief, setShowDebrief] = useState(false);
  const [debriefEventId, setDebriefEventId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/tracked-habits/${habitId}/dashboard`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat memuat dashboard.");
      }
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    }
  }, [habitId]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/tracked-habits/${habitId}/dashboard`);
        const json = await res.json();
        if (!ignore) {
          if (res.ok && json.success) {
            setData(json.data);
          } else {
            setError(json.error?.message || "Tidak dapat memuat dashboard.");
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [habitId]);

  // Live Clean Ticker
  const baselineTime = data?.stats?.lastLapseAt ?? data?.habit.startedAt;
  const [elapsed, setElapsed] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!baselineTime) return;
    const calc = () => {
      const base = new Date(baselineTime).getTime();
      const diff = Math.max(0, Date.now() - base);
      setElapsed({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [baselineTime]);

  const handleRespondCheckin = async (checkinId: string, answer: "CLEAN" | "LAPSED") => {
    if (answer === "LAPSED") {
      setShowLogLapse(true);
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/tracked-habits/${habitId}/checkins/${checkinId}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answer: "CLEAN" }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat mencatat respons check-in.");
      }
      await fetchDashboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Tidak dapat mencatat respons check-in.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="text-xs">Memuat dashboard...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center rounded-2xl border border-white/10 bg-[#161622]">
        <p className="text-amber-400 text-sm mb-4">{error || "Data tidak ditemukan."}</p>
        <button
          onClick={onBack}
          className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
        >
          ← Kembali
        </button>
      </div>
    );
  }

  const { habit, stats, pendingCheckins, calendar } = data;
  const displayName =
    habit.privacyLevel === 2 && habit.displayAlias
      ? habit.displayAlias
      : habit.name;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          ← Kembali ke Daftar
        </button>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            {habit.status}
          </span>
          {habit.privacyLevel === 2 && (
            <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              Mode Samaran
            </span>
          )}
        </div>
      </div>

      {/* Hero Header */}
      <div>
        <h1 className="text-2xl font-black text-white sm:text-3xl tracking-tight">
          {displayName}
        </h1>
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
          <span>Kategori: {habit.category || "UMUM"}</span>
          <span>•</span>
          <span>Check-in: {habit.checkinLocalTime} ({habit.timezone})</span>
        </div>
      </div>

      {/* PENDING CHECK-IN BANNER */}
      {pendingCheckins && pendingCheckins.length > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 shadow-xl animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm mb-1">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
                Check-in Menunggu Evaluasi
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Jendela evaluasi untuk tanggal{" "}
                <strong className="text-white">
                  {new Date(pendingCheckins[0].periodDate).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </strong>{" "}
                telah selesai. Bagaimana harimu?
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRespondCheckin(pendingCheckins[0].id, "CLEAN")}
                className="flex-1 sm:flex-initial rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors disabled:opacity-50"
              >
                ✓ Bersih
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setShowLogLapse(true)}
                className="flex-1 sm:flex-initial rounded-xl bg-amber-600/80 hover:bg-amber-600 border border-amber-500/40 px-4 py-2 text-xs font-bold text-amber-100 shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 transition-colors disabled:opacity-50"
              >
                Terpeleset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Timer Card */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#181829] to-[#12121e] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 block mb-2">
              Waktu Bersih Berjalan
            </span>
            <div className="flex items-baseline gap-3 text-white font-mono">
              <div className="text-center">
                <span className="text-4xl sm:text-5xl font-black text-white">
                  {elapsed.days}
                </span>
                <span className="block text-[11px] font-sans font-medium text-slate-400 uppercase mt-1">
                  Hari
                </span>
              </div>
              <span className="text-2xl text-slate-500">:</span>
              <div className="text-center">
                <span className="text-3xl sm:text-4xl font-bold text-slate-200">
                  {elapsed.hours}
                </span>
                <span className="block text-[11px] font-sans font-medium text-slate-400 uppercase mt-1">
                  Jam
                </span>
              </div>
              <span className="text-2xl text-slate-500">:</span>
              <div className="text-center">
                <span className="text-3xl sm:text-4xl font-bold text-slate-200">
                  {elapsed.minutes}
                </span>
                <span className="block text-[11px] font-sans font-medium text-slate-400 uppercase mt-1">
                  Menit
                </span>
              </div>
              <span className="text-2xl text-slate-500">:</span>
              <div className="text-center">
                <span className="text-2xl sm:text-3xl font-semibold text-slate-400">
                  {elapsed.seconds}
                </span>
                <span className="block text-[11px] font-sans font-medium text-slate-500 uppercase mt-1">
                  Detik
                </span>
              </div>
            </div>

            {baselineTime && (
              <p className="text-xs text-slate-400 mt-4">
                Bersih sejak:{" "}
                {new Date(baselineTime).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>

          {/* Action Buttons: SOS Urge Surfing & Catat Terpeleset */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-end">
            <button
              id="dashboard-sos-btn"
              type="button"
              onClick={() => setShowSos(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 hover:from-rose-600 hover:to-amber-600 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-rose-950/40 border border-rose-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>🆘</span>
              <span>Bantuan SOS (Urge Surfing)</span>
            </button>

            <button
              id="dashboard-log-lapse-btn"
              type="button"
              onClick={() => setShowLogLapse(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-600/30 hover:bg-amber-600/50 px-5 py-3 text-sm font-semibold text-amber-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
            >
              📝 Catat Terpeleset
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-white/10 bg-[#161622] p-4 text-center">
          <span className="text-xs text-slate-400 block mb-1">Streak Saat Ini</span>
          <span className="text-2xl font-black text-amber-300">
            🔥 {stats?.currentStreakDays ?? 0}
            <span className="text-xs font-normal text-slate-400 ml-1">hari</span>
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#161622] p-4 text-center">
          <span className="text-xs text-slate-400 block mb-1">Streak Terbaik</span>
          <span className="text-2xl font-black text-indigo-300">
            🏆 {stats?.longestStreakDays ?? 0}
            <span className="text-xs font-normal text-slate-400 ml-1">hari</span>
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#161622] p-4 text-center">
          <span className="text-xs text-slate-400 block mb-1">Total Hari Bersih</span>
          <span className="text-2xl font-black text-emerald-400">
            ✨ {stats?.confirmedCleanDays ?? 0}
            <span className="text-xs font-normal text-slate-400 ml-1">hari</span>
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#161622] p-4 text-center">
          <span className="text-xs text-slate-400 block mb-1">Clean Rate 30d</span>
          <span className="text-2xl font-black text-emerald-300">
            📈 {stats?.cleanRate30d != null ? `${stats.cleanRate30d}%` : "-"}
          </span>
        </div>
      </div>

      {/* Calendar 90 Days */}
      <Calendar90Days checkins={calendar || []} timezone={habit.timezone} />

      {/* Why Reasons & Commitments Section */}
      {habit.breakProfile?.whyReasons && habit.breakProfile.whyReasons.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#161622] p-6 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-3">
            Komitmen & Alasan Berhenti
          </h3>
          <ul className="space-y-2">
            {habit.breakProfile.whyReasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>

          {habit.breakProfile.futureSelfNote && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Pesan untuk Dirimu
              </span>
              <p className="text-xs text-amber-200/90 italic bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                &ldquo;{habit.breakProfile.futureSelfNote}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Log Lapse */}
      <LogLapseModal
        isOpen={showLogLapse}
        habitId={habit.id}
        onClose={() => setShowLogLapse(false)}
        onSuccess={(event) => {
          setShowLogLapse(false);
          fetchDashboard();
          if (event?.id) {
            setDebriefEventId(event.id);
            setShowDebrief(true);
          } else {
            setShowRecovery(true);
          }
        }}
      />

      {/* MODAL: Debrief Refleksi Situasi */}
      <DebriefModal
        isOpen={showDebrief}
        habitId={habit.id}
        eventId={debriefEventId}
        habitName={displayName}
        onClose={() => {
          setShowDebrief(false);
          setDebriefEventId(null);
          setShowRecovery(true);
        }}
        onSuccess={() => {
          setShowDebrief(false);
          setDebriefEventId(null);
          setShowRecovery(true);
          fetchDashboard();
        }}
      />

      {/* MODAL: Recovery (Setelah catat terpeleset) */}
      <RecoveryModal
        isOpen={showRecovery}
        stats={stats}
        onClose={() => {
          setShowRecovery(false);
          fetchDashboard();
        }}
      />

      {/* Floating Quick Action SOS Button (<= 2 ketukan) */}
      <button
        id="floating-sos-btn"
        type="button"
        onClick={() => setShowSos(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 px-5 py-3.5 shadow-2xl shadow-rose-950/70 text-white font-extrabold text-sm border border-white/20 hover:scale-105 active:scale-95 transition-all"
        title="Butuh Bantuan Segera (SOS Urge Surfing)"
      >
        <span className="text-xl">🆘</span>
        <span className="tracking-wide">SOS Dorongan</span>
      </button>

      {/* MODAL: SOS Urge Surfing */}
      <SosUrgeSurfingModal
        isOpen={showSos}
        habitId={habit.id}
        habitName={displayName}
        onClose={() => setShowSos(false)}
        onSuccess={(result) => {
          fetchDashboard();
          if (result.outcome === "GAVE_IN") {
            const targetId = result.lapseEventId || result.eventId;
            if (targetId) {
              setDebriefEventId(targetId);
              setShowDebrief(true);
            } else {
              setShowRecovery(true);
            }
          }
        }}
      />
    </div>
  );
}
