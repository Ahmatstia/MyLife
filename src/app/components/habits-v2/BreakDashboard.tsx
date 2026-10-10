"use client";

import React, { useEffect, useState, useCallback } from "react";
import { dailyLimit } from "@/lib/habits/reduce";
import { Calendar90Days } from "./Calendar90Days";
import { LogLapseModal } from "./LogLapseModal";
import { RecoveryModal } from "./RecoveryModal";
import { SosUrgeSurfingModal } from "./SosUrgeSurfingModal";
import { DebriefModal } from "./DebriefModal";
import { RelapseResetPlanModal } from "./RelapseResetPlanModal";
import { MilestoneCelebrationModal } from "./MilestoneCelebrationModal";

function formatSavingsMoney(val: number | string | null | undefined): string {
  if (val == null) return "Rp 0";
  const num = typeof val === "string" ? parseFloat(val) : Number(val);
  if (isNaN(num)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatSavingsTime(minutes: number | null | undefined): string {
  if (minutes == null || isNaN(minutes) || minutes <= 0) return "0 menit";
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) return `${hours} jam`;
  return `${hours} jam ${remainingMins} mnt`;
}

interface DashboardData {
  habit: {
    id: string;
    name: string;
    displayAlias?: string | null;
    category?: string | null;
    privacyLevel: number;
    status: "ACTIVE" | "PAUSED" | "ARCHIVED";
    mode?: "ABSTAIN" | "REDUCE" | "TARGET" | "BOOLEAN" | null;
    startedAt: string;
    timezone: string;
    checkinLocalTime: string;
    breakProfile?: {
      whyReasons?: string[];
      futureSelfNote?: string | null;
      costPerOccurrence?: number | null;
      highRiskCategory?: boolean;
      relapseAckAt?: string | null;
      reduceDailyLimit?: number | null;
      reduceStepPercent?: number | null;
      reduceStepEveryDays?: number | null;
      baselinePerDay?: number | null;
    } | null;
    replacedByProfiles?: Array<{
      id: string;
      habit: {
        id: string;
        name: string;
        displayAlias?: string | null;
      };
    }>;
  };
  stats?: {
    currentStreakDays: number;
    longestStreakDays: number;
    confirmedCleanDays: number;
    cleanRate30d?: number | null;
    consistency30d?: number | null;
    resilientStreak?: number;
    lastLapseAt?: string | null;
    totalLapses: number;
    urgesResisted: number;
    relapsePattern?: boolean;
    moneySavedEst?: number | string | null;
    minutesSavedEst?: number | null;
  } | null;
  activeRelapsePrompt?: boolean;
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
  recentEvents?: Array<{
    id: string;
    type: string;
    occurredAt: string;
    quantity?: number | null;
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
  const [showRelapseModal, setShowRelapseModal] = useState(false);
  const [uncelebratedMilestone, setUncelebratedMilestone] = useState<{
    id: string;
    code: string;
    title: string;
    description?: string | null;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/tracked-habits/${habitId}/dashboard`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat memuat dashboard.");
      }
      setData(json.data);

      try {
        const msRes = await fetch(`/api/tracked-habits/${habitId}/milestones`);
        const msJson = await msRes.json();
        if (msRes.ok && msJson.success && msJson.data?.uncelebrated?.length > 0) {
          setUncelebratedMilestone(msJson.data.uncelebrated[0]);
        }
      } catch {
        // silent fallback
      }
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

  const [currentTimestamp] = useState(() => Date.now());

  const handleRespondCheckin = async (
    checkinId: string,
    answer: "CLEAN" | "LAPSED" | "WITHIN_LIMIT" | "OVER_LIMIT",
  ) => {
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
          body: JSON.stringify({ answer }),
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

  const handleLogOccurrence = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tracked-habits/${habitId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "OCCURRENCE",
          quantity: 1,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat mencatat kejadian.");
      }
      await fetchDashboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Tidak dapat mencatat kejadian.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSwitchToAbstain = async () => {
    if (!confirm("Beralih ke Mode Bebas Total (Abstain)?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tracked-habits/${habitId}/mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetMode: "ABSTAIN",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat beralih mode.");
      }
      await fetchDashboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Tidak dapat beralih mode.");
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

  const isReduce = habit.mode === "REDUCE";
  const daysSinceStart =
    currentTimestamp && habit.startedAt
      ? Math.max(
          0,
          Math.floor((currentTimestamp - new Date(habit.startedAt).getTime()) / (1000 * 60 * 60 * 24)),
        )
      : 0;
  const currentLimit = isReduce && habit.breakProfile
    ? dailyLimit(habit.breakProfile, daysSinceStart)
    : 0;

  const todayStr = currentTimestamp
    ? new Date(currentTimestamp).toISOString().slice(0, 10)
    : "";
  const todayOccurrences = (data.recentEvents || [])
    .filter((e) => {
      if (e.type !== "OCCURRENCE") return false;
      const dStr = new Date(e.occurredAt).toISOString().slice(0, 10);
      return todayStr ? dStr === todayStr : false;
    })
    .reduce((sum, e) => sum + (Number(e.quantity) || 1), 0);

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
          {isReduce && (
            <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              Mode Kurangi Bertahap
            </span>
          )}
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

      {/* RELAPSE PATTERN BANNER (F-B9) */}
      {data?.activeRelapsePrompt && (
        <div
          id="relapse-pattern-banner"
          className="rounded-2xl border border-purple-500/40 bg-purple-950/20 p-5 shadow-xl animate-fade-in"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">🔄</span>
              <div>
                <div className="flex items-center gap-2 text-purple-300 font-bold text-sm mb-1">
                  <span>Pola Kambuh Terdeteksi</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Frekuensi terpeleset meningkat belakangan ini. Mari tinjau pemicu dan sesuaikan rencana jika–maka agar langkahmu kembali nyaman.
                </p>
              </div>
            </div>
            <button
              id="open-relapse-plan-btn"
              type="button"
              onClick={() => setShowRelapseModal(true)}
              className="rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition-all self-end sm:self-center whitespace-nowrap"
            >
              Tinjau & Reset Rencana →
            </button>
          </div>
        </div>
      )}

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
              {isReduce ? (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleRespondCheckin(pendingCheckins[0].id, "WITHIN_LIMIT")}
                    className="flex-1 sm:flex-initial rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors disabled:opacity-50"
                  >
                    ✓ Dalam Batas
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleRespondCheckin(pendingCheckins[0].id, "OVER_LIMIT")}
                    className="flex-1 sm:flex-initial rounded-xl bg-amber-600/80 hover:bg-amber-600 border border-amber-500/40 px-4 py-2 text-xs font-bold text-amber-100 shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 transition-colors disabled:opacity-50"
                  >
                    Melebihi Batas
                  </button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Focus: Reduce Quota Card OR Live Clean Timer Card */}
      {isReduce ? (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#181829] to-[#12121e] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    Target Kuota Hari Ini
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                      todayOccurrences <= currentLimit
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {todayOccurrences <= currentLimit ? "✓ Dalam Batas" : "Melebihi Target Batas"}
                  </span>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-4xl sm:text-5xl font-black text-white font-mono">
                    {todayOccurrences}
                  </span>
                  <span className="text-2xl text-slate-500 font-mono">/</span>
                  <span className="text-3xl sm:text-4xl font-bold text-slate-300 font-mono">
                    {currentLimit}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">kali tercatat hari ini</span>
                </div>

                <p className="text-xs text-slate-400 mt-2">
                  Target batas hari ini: <strong className="text-white">{currentLimit} kali</strong> (Hari ke-{daysSinceStart + 1})
                  {habit.breakProfile?.reduceStepPercent && habit.breakProfile.reduceStepEveryDays
                    ? ` • Turun ${habit.breakProfile.reduceStepPercent}% tiap ${habit.breakProfile.reduceStepEveryDays} hari`
                    : ""}
                </p>
              </div>

              {/* Action Buttons: SOS & Log Occurrence */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-end">
                <button
                  id="dashboard-sos-btn"
                  type="button"
                  onClick={() => setShowSos(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 hover:from-rose-600 hover:to-amber-600 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-rose-950/40 border border-rose-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>🆘</span>
                  <span>Bantuan SOS</span>
                </button>

                <button
                  id="dashboard-log-occurrence-btn"
                  type="button"
                  disabled={actionLoading}
                  onClick={handleLogOccurrence}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-sm font-bold text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all disabled:opacity-50"
                >
                  ➕ Catat Kejadian (+1)
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    todayOccurrences <= currentLimit ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                  style={{
                    width: `${Math.min(100, Math.round((todayOccurrences / Math.max(1, currentLimit)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Zero Quota celebration or Mode switch banner */}
            {currentLimit === 0 ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-emerald-300 font-bold text-xs mb-0.5">
                    🎉 Target batas telah mencapai 0!
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Kamu berhasil menekan kebiasaan hingga batas nol. Siap melangkah ke Mode Bebas Total (Abstain)?
                  </p>
                </div>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleSwitchToAbstain}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white shadow transition-all whitespace-nowrap"
                >
                  Beralih ke Bebas Total →
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-slate-400">
                <span>Ingin langsung berhenti total?</span>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleSwitchToAbstain}
                  className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
                >
                  Beralih ke Mode Bebas Total (Abstain) →
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
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
      )}

      {/* Key Metrics Row */}
      {isReduce ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-white/10 bg-[#161622] p-4 text-center">
            <span className="text-xs text-slate-400 block mb-1">Streak Batas Aman</span>
            <span className="text-2xl font-black text-amber-300">
              🔥 {stats?.currentStreakDays ?? 0}
              <span className="text-xs font-normal text-slate-400 ml-1">hari</span>
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#161622] p-4 text-center">
            <span className="text-xs text-slate-400 block mb-1">Resilient Streak</span>
            <span className="text-2xl font-black text-indigo-300">
              🛡️ {stats?.resilientStreak ?? stats?.currentStreakDays ?? 0}
              <span className="text-xs font-normal text-slate-400 ml-1">hari</span>
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#161622] p-4 text-center">
            <span className="text-xs text-slate-400 block mb-1">Kepatuhan 30h</span>
            <span className="text-2xl font-black text-emerald-400">
              📈 {stats?.consistency30d != null ? `${stats.consistency30d}%` : stats?.cleanRate30d != null ? `${stats.cleanRate30d}%` : "-"}
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#161622] p-4 text-center">
            <span className="text-xs text-slate-400 block mb-1">Dorongan Dilawan</span>
            <span className="text-2xl font-black text-emerald-300">
              🧘 {stats?.urgesResisted ?? 0}
              <span className="text-xs font-normal text-slate-400 ml-1">kali</span>
            </span>
          </div>
        </div>
      ) : (
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
      )}

      {/* SAVINGS CARD (HEMAT UANG & WAKTU - F-B3 & Langkah 3.6) */}
      {Boolean(habit.breakProfile?.baselinePerDay && habit.breakProfile.baselinePerDay > 0) &&
        (stats?.moneySavedEst != null || stats?.minutesSavedEst != null) && (
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/20 via-[#161622] to-teal-950/20 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">💰</span>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Estimasi Penghematan
                    <span className="text-[11px] font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      (perkiraan)
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Berdasarkan baseline kebiasaan harian dan konsistensi waktu bersihmu.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stats?.moneySavedEst != null && (
                <div className="rounded-xl border border-white/5 bg-white/5 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-0.5">
                      Uang Dihemat <span className="text-emerald-400 font-medium">(perkiraan)</span>
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-400">
                      {formatSavingsMoney(stats.moneySavedEst)}
                    </span>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-lg text-emerald-400">
                    💵
                  </div>
                </div>
              )}

              {stats?.minutesSavedEst != null && (
                <div className="rounded-xl border border-white/5 bg-white/5 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-0.5">
                      Waktu Dihemat <span className="text-teal-400 font-medium">(perkiraan)</span>
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-teal-300">
                      {formatSavingsTime(stats.minutesSavedEst)}
                    </span>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-lg text-teal-400">
                    ⏳
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* REPLACEMENT HABITS LINKED (Langkah 3.5) */}
      {habit.replacedByProfiles && habit.replacedByProfiles.length > 0 && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔄</span>
            <div>
              <div className="text-sm font-bold text-indigo-300">
                Kebiasaan Pengganti Terhubung
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Dorongan kebiasaan ini dialihkan ke kebiasaan positif berikut:
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {habit.replacedByProfiles.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs font-semibold"
              >
                <span>🌱</span>
                <span>{item.habit.displayAlias || item.habit.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

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

      {/* MODAL: Relapse Reset Plan (F-B9) */}
      <RelapseResetPlanModal
        isOpen={showRelapseModal}
        habitId={habit.id}
        habitName={displayName}
        isHighRisk={habit.breakProfile?.highRiskCategory ?? false}
        currentWhyReasons={
          Array.isArray(habit.breakProfile?.whyReasons)
            ? (habit.breakProfile.whyReasons as string[])
            : []
        }
        onClose={() => {
          setShowRelapseModal(false);
          fetchDashboard();
        }}
        onSuccess={() => {
          setShowRelapseModal(false);
          fetchDashboard();
        }}
      />

      {/* MODAL: Milestone Celebration */}
      <MilestoneCelebrationModal
        isOpen={Boolean(uncelebratedMilestone)}
        habitId={habit.id}
        milestone={uncelebratedMilestone}
        onClose={() => {
          setUncelebratedMilestone(null);
          fetchDashboard();
        }}
      />
    </div>
  );
}
