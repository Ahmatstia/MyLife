"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Calendar90Days } from "./Calendar90Days";
import { AutomaticitySurveyModal } from "./AutomaticitySurveyModal";
import { MilestoneCelebrationModal } from "./MilestoneCelebrationModal";

interface BuildDashboardData {
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
    identityStatement?: string | null;
    buildProfile?: {
      anchorText?: string | null;
      tinyBehavior: string;
      celebrationText?: string | null;
      versions?: {
        tiny?: string;
        standard?: string;
        stretch?: string;
      } | null;
      scheduleType: "DAILY" | "DAYS_OF_WEEK" | "TIMES_PER_WEEK";
      daysOfWeek?: number[];
      timesPerWeek?: number | null;
      restDays?: number[];
    } | null;
  };
  stats?: {
    currentStreakDays: number;
    longestStreakDays: number;
    confirmedCleanDays: number;
    consistency30d?: number | null;
    resilientStreak?: number;
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

interface BuildDashboardProps {
  habitId: string;
  onBack: () => void;
}

const CELEBRATION_MESSAGES = [
  "Luar biasa! Satu langkah kecil yang konsisten bernilai ribuan niat.",
  "Hebat! Anda menjaga momentum tetap menyala hari ini.",
  "Mantap! Tubuh dan pikiran Anda semakin akrab dengan kebiasaan ini.",
  "Keren! Konsistensi adalah kunci pembentukan identitas baru.",
];

export function BuildDashboard({ habitId, onBack }: BuildDashboardProps) {
  const [data, setData] = useState<BuildDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [celebrationToast, setCelebrationToast] = useState<string | null>(null);

  // Modals
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveyInfo, setSurveyInfo] = useState<{
    surveys: Array<{ id: string; score: number; answeredAt: string }>;
    latestSurvey: { score: number; answeredAt: string } | null;
    isPromptDue: boolean;
  } | null>(null);

  const [uncelebratedMilestone, setUncelebratedMilestone] = useState<{
    id: string;
    code: string;
    title: string;
    description?: string | null;
  } | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/tracked-habits/${habitId}/dashboard`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat memuat dashboard.");
      }
      setData(json.data);

      // Fetch survei otomatisitas
      try {
        const surveyRes = await fetch(`/api/tracked-habits/${habitId}/automaticity-surveys`);
        const surveyJson = await surveyRes.json();
        if (surveyRes.ok && surveyJson.success) {
          setSurveyInfo(surveyJson.data);
        }
      } catch {
        // silent fallback
      }

      // Fetch milestones uncelebrated
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
    } finally {
      setLoading(false);
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
        }

        try {
          const surveyRes = await fetch(`/api/tracked-habits/${habitId}/automaticity-surveys`);
          const surveyJson = await surveyRes.json();
          if (!ignore && surveyRes.ok && surveyJson.success) {
            setSurveyInfo(surveyJson.data);
          }
        } catch {
          // silent fallback
        }

        try {
          const msRes = await fetch(`/api/tracked-habits/${habitId}/milestones`);
          const msJson = await msRes.json();
          if (!ignore && msRes.ok && msJson.success && msJson.data?.uncelebrated?.length > 0) {
            setUncelebratedMilestone(msJson.data.uncelebrated[0]);
          }
        } catch {
          // silent fallback
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
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
  }, [habitId]);

  const handleLogCompletion = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tracked-habits/${habitId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "COMPLETION",
          quantity: 1,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat mencatat penyelesaian.");
      }

      // Ambil pesan perayaan acak
      const msg = CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)];
      setCelebrationToast(msg);
      setTimeout(() => setCelebrationToast(null), 5000);

      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogSkip = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tracked-habits/${habitId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SKIP",
          note: "Hari istirahat terencana",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat mencatat hari istirahat.");
      }
      setCelebrationToast("Hari istirahat tercatat. Streak tahan banting Anda tetap aman!");
      setTimeout(() => setCelebrationToast(null), 4000);

      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-xs text-slate-400">Memuat dashboard kebiasaan...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center space-y-3">
        <p className="text-sm font-semibold text-rose-300">{error || "Data tidak ditemukan."}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
        >
          ← Kembali ke Daftar
        </button>
      </div>
    );
  }

  const habit = data.habit;
  const stats = data.stats;
  const build = habit.buildProfile;
  const versions = build?.versions || {};

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Toast Perayaan Cepat */}
      {celebrationToast && (
        <div className="fixed top-5 right-5 z-50 max-w-md rounded-2xl border border-emerald-500/40 bg-[#162920] p-4 text-emerald-200 text-xs font-semibold shadow-2xl animate-fade-in flex items-center gap-3">
          <span className="text-xl">✨</span>
          <p className="flex-1">{celebrationToast}</p>
          <button
            onClick={() => setCelebrationToast(null)}
            className="text-slate-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onBack}
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              ← Kembali
            </button>
            <span className="text-slate-600">•</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
              BUILD • Tiny Habits
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
              {habit.category || "UMUM"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {habit.name}
          </h1>
          {habit.identityStatement && (
            <p className="text-xs text-emerald-300 font-medium italic">
              &quot;{habit.identityStatement}&quot;
            </p>
          )}
        </div>

        {/* Waktu Checkin */}
        <div className="flex items-center gap-3 text-xs text-slate-400 bg-white/5 px-3 py-2 rounded-xl border border-white/10 self-start sm:self-auto">
          <span>⏰ Evaluasi harian: <strong className="text-white">{habit.checkinLocalTime}</strong></span>
        </div>
      </div>

      {/* Action Banner: Lakukan Aksi Hari Ini */}
      <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-[#141d1a] to-[#12121e] p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
              Target Perilaku Hari Ini
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {build?.tinyBehavior || habit.name}
            </h2>
            {build?.anchorText && (
              <p className="text-xs text-slate-300">
                Pemicu Alami: <strong className="text-emerald-300">{build.anchorText}</strong>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleLogCompletion}
              disabled={actionLoading}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span>✓</span>
              <span>{actionLoading ? "Mencatat..." : "Tandai Selesai Hari Ini"}</span>
            </button>
            <button
              onClick={handleLogSkip}
              disabled={actionLoading}
              className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all disabled:opacity-50"
              title="Hari istirahat tidak memutus streak tahan banting"
            >
              ⏸ Lewati (Istirahat)
            </button>
          </div>
        </div>

        {/* Metode ABC Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-white/10">
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3.5 space-y-1">
            <div className="text-[10px] font-bold text-amber-400 uppercase">A — Anchor (Jangkar)</div>
            <p className="text-xs text-slate-200">
              {build?.anchorText || "Setelah rutinitas harian Anda"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3.5 space-y-1">
            <div className="text-[10px] font-bold text-emerald-400 uppercase">B — Tiny Behavior</div>
            <p className="text-xs text-slate-200">
              {build?.tinyBehavior || habit.name}
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3.5 space-y-1">
            <div className="text-[10px] font-bold text-teal-400 uppercase">C — Celebration (Perayaan)</div>
            <p className="text-xs text-slate-200">
              {build?.celebrationText || "Tersenyum dan rayakan kemajuan Anda!"}
            </p>
          </div>
        </div>
      </div>

      {/* Grid Statistik Utama */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Resilient Streak */}
        <div className="rounded-2xl border border-emerald-500/20 bg-[#161f1c] p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              Streak Tahan Banting
            </span>
            <span className="text-xs" title="Hanya putus bila 2 hari terjadwal berturut-turut terlewat">
              🛡️
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {stats?.resilientStreak ?? 0}
            <span className="text-xs font-normal text-slate-400 ml-1">hari</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Aman jika terlewat 1 hari (never miss twice)
          </p>
        </div>

        {/* Strict Streak */}
        <div className="rounded-2xl border border-white/10 bg-[#161622] p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Streak Ketat
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {stats?.currentStreakDays ?? 0}
            <span className="text-xs font-normal text-slate-400 ml-1">hari</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Terbaik: {stats?.longestStreakDays ?? 0} hari
          </p>
        </div>

        {/* Consistency 30d */}
        <div className="rounded-2xl border border-white/10 bg-[#161622] p-4 space-y-1">
          <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">
            Konsistensi 30d
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {stats?.consistency30d != null ? `${Number(stats.consistency30d)}%` : "—"}
          </div>
          <p className="text-[10px] text-slate-400">
            Penyelesaian hari terjadwal
          </p>
        </div>

        {/* Total Completed */}
        <div className="rounded-2xl border border-white/10 bg-[#161622] p-4 space-y-1">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
            Total Selesai
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {stats?.confirmedCleanDays ?? 0}
            <span className="text-xs font-normal text-slate-400 ml-1">kali</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Sejak kebiasaan dimulai
          </p>
        </div>
      </div>

      {/* Versi Bertingkat (Tiny, Standard, Stretch) */}
      {(versions.tiny || versions.standard || versions.stretch) && (
        <div className="rounded-3xl border border-white/10 bg-[#161622] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Tingkatan Versi Perilaku</h3>
              <p className="text-xs text-slate-400">
                Pilih versi sesuai kapasitas energi Anda hari ini. Yang terpenting adalah tidak berhenti sama sekali.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                🌱 Versi Tiny (Energi Rendah)
              </span>
              <p className="text-xs text-white font-medium">{versions.tiny || build?.tinyBehavior}</p>
            </div>
            <div className="rounded-2xl border border-teal-500/30 bg-teal-950/20 p-4 space-y-1">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">
                🌿 Versi Standar (Hari Normal)
              </span>
              <p className="text-xs text-white font-medium">{versions.standard || "—"}</p>
            </div>
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-1">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                🌳 Versi Stretch (Energi Penuh)
              </span>
              <p className="text-xs text-white font-medium">{versions.stretch || "—"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Banner Survei Otomatisitas (SRHI) */}
      <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 to-[#161622] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
              Evaluasi Otomatisitas
            </span>
            {surveyInfo?.latestSurvey && (
              <span className="text-xs font-bold text-white">
                Skor Saat Ini: <strong className="text-emerald-400">{surveyInfo.latestSurvey.score} / 7</strong>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300">
            Ukur seberapa alami dan refleks kebiasaan ini tanpa usaha sadar berlebih.
          </p>
        </div>

        <button
          onClick={() => setShowSurveyModal(true)}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            surveyInfo?.isPromptDue
              ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/30 animate-pulse"
              : "bg-white/10 hover:bg-white/20 text-white"
          }`}
        >
          {surveyInfo?.isPromptDue ? "📝 Isi Evaluasi Sekarang" : "Lihat / Isi Evaluasi"}
        </button>
      </div>

      {/* Kalender Konsistensi 90 Hari */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Riwayat Konsistensi 90 Hari</h3>
          <span className="text-xs text-slate-400">
            Hijau = Selesai, Biru = Istirahat Terencana
          </span>
        </div>
        <Calendar90Days checkins={data.calendar} timezone={habit.timezone} />
      </div>

      {/* Modals */}
      {showSurveyModal && (
        <AutomaticitySurveyModal
          habitId={habit.id}
          habitName={habit.name}
          surveys={surveyInfo?.surveys}
          onClose={() => setShowSurveyModal(false)}
          onSuccess={() => {
            fetchDashboard();
          }}
        />
      )}

      {uncelebratedMilestone && (
        <MilestoneCelebrationModal
          isOpen={Boolean(uncelebratedMilestone)}
          habitId={habit.id}
          milestone={uncelebratedMilestone}
          onClose={() => setUncelebratedMilestone(null)}
        />
      )}
    </div>
  );
}
