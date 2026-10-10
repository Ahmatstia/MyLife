"use client";

import React, { useEffect, useState, useCallback } from "react";
import { HabitCardV2, type TrackedHabitItem } from "./HabitCardV2";
import { BreakDashboard } from "./BreakDashboard";
import { BuildDashboard } from "./BuildDashboard";
import { CreateHabitWizard } from "./CreateHabitWizard";

interface PendingCheckinItem {
  id: string;
  habitId: string;
  periodDate: string;
  windowEnd: string;
  habit: {
    id: string;
    name: string;
    kind?: "BREAK" | "BUILD";
    displayAlias?: string | null;
  };
}

interface HabitsV2AppProps {
  userTimezone?: string;
  initialHabitId?: string;
}

export function HabitsV2App({
  userTimezone = "Asia/Jakarta",
  initialHabitId,
}: HabitsV2AppProps) {
  const [view, setView] = useState<"LIST" | "DASHBOARD" | "WIZARD">(() =>
    initialHabitId ? "DASHBOARD" : "LIST",
  );
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(
    () => initialHabitId || null,
  );
  const [habits, setHabits] = useState<TrackedHabitItem[]>([]);
  const [pendingCheckins, setPendingCheckins] = useState<PendingCheckinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [habitsRes, pendingRes] = await Promise.all([
        fetch("/api/tracked-habits"),
        fetch("/api/tracked-habits/pending-checkins"),
      ]);

      const habitsJson = await habitsRes.json();
      const pendingJson = await pendingRes.json();

      if (!habitsRes.ok || !habitsJson.success) {
        throw new Error(habitsJson.error?.message || "Tidak dapat memuat kebiasaan.");
      }

      const pendingList: PendingCheckinItem[] = pendingJson.success ? pendingJson.data : [];
      setPendingCheckins(pendingList);

      const pendingHabitIds = new Set(pendingList.map((p) => p.habitId));

      const enrichedHabits: TrackedHabitItem[] = (habitsJson.data || []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (h: any) => ({
          ...h,
          hasPendingCheckin: pendingHabitIds.has(h.id),
        }),
      );

      setHabits(enrichedHabits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const [habitsRes, pendingRes] = await Promise.all([
          fetch("/api/tracked-habits"),
          fetch("/api/tracked-habits/pending-checkins"),
        ]);
        const habitsJson = await habitsRes.json();
        const pendingJson = await pendingRes.json();
        if (!ignore) {
          if (habitsRes.ok && habitsJson.success) {
            const pendingList: PendingCheckinItem[] = pendingJson.success ? pendingJson.data : [];
            setPendingCheckins(pendingList);
            const pendingHabitIds = new Set(pendingList.map((p: PendingCheckinItem) => p.habitId));
            setHabits(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (habitsJson.data || []).map((h: any) => ({
                ...h,
                hasPendingCheckin: pendingHabitIds.has(h.id),
              })),
            );
          } else {
            setError(habitsJson.error?.message || "Tidak dapat memuat kebiasaan.");
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Terjadi kesalahan memuat data.");
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const selectedHabit = habits.find((h) => h.id === selectedHabitId);

  if (view === "WIZARD") {
    return (
      <div className="py-6">
        <CreateHabitWizard
          defaultTimezone={userTimezone}
          onSuccess={(newHabitId) => {
            setSelectedHabitId(newHabitId);
            setView("DASHBOARD");
            loadData();
          }}
          onCancel={() => setView("LIST")}
        />
      </div>
    );
  }

  if (view === "DASHBOARD" && selectedHabitId) {
    return (
      <div className="py-6">
        {selectedHabit?.kind === "BUILD" ? (
          <BuildDashboard
            habitId={selectedHabitId}
            onBack={() => {
              setView("LIST");
              setSelectedHabitId(null);
              loadData();
            }}
          />
        ) : (
          <BreakDashboard
            habitId={selectedHabitId}
            onBack={() => {
              setView("LIST");
              setSelectedHabitId(null);
              loadData();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl">
              Habits Tracker
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300">
              v2 • Build &amp; Break
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Bangun kebiasaan positif dengan metode Tiny Habits atau hentikan kebiasaan lama tanpa rasa bersalah.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setView("WIZARD")}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          + Buat Kebiasaan Baru
        </button>
      </div>

      {/* Global Pending Check-ins Alert */}
      {pendingCheckins.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-amber-200">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span>
              Ada <strong className="text-white">{pendingCheckins.length} check-in</strong> menunggu evaluasimu hari ini.
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {pendingCheckins.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedHabitId(p.habitId);
                  setView("DASHBOARD");
                }}
                className="rounded-lg border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/30 transition-colors"
              >
                {p.habit.displayAlias || p.habit.name} →
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center text-slate-400">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <span className="text-xs">Memuat daftar kebiasaan...</span>
          </div>
        </div>
      ) : habits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#161622] p-12 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-2xl">
            🌱
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            Belum Ada Kebiasaan yang Dilacak
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">
            Mulai langkah perbaikan dirimu dengan membangun kebiasaan baru yang mudah atau menghentikan kebiasaan lama.
          </p>
          <button
            type="button"
            onClick={() => setView("WIZARD")}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-colors"
          >
            Mulai Buat Kebiasaan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {habits.map((habit) => (
            <HabitCardV2
              key={habit.id}
              habit={habit}
              onSelect={(id) => {
                setSelectedHabitId(id);
                setView("DASHBOARD");
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
