"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  DEFAULT_CITY,
  getCityById,
  IndonesianCity,
} from "@/lib/prayer/cities";
import {
  calculatePrayerSchedule,
  getNextPrayerInfo,
  DailyPrayerSchedule,
} from "@/lib/prayer/calculator";
import { playPrayerChime, playTestChime } from "@/lib/prayer/audio";
import { CitySelectorModal } from "./CitySelectorModal";

const STORAGE_CITY_KEY = "mylife_prayer_city_id";
const STORAGE_SOUND_KEY = "mylife_prayer_sound_enabled";

export function PrayerTimesWidget() {
  const [selectedCity, setSelectedCity] = useState<IndonesianCity>(() => {
    if (typeof window === "undefined") return DEFAULT_CITY;
    try {
      const savedCityId = localStorage.getItem(STORAGE_CITY_KEY);
      if (savedCityId) return getCityById(savedCityId);
    } catch {
      // Fallback
    }
    return DEFAULT_CITY;
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const savedSound = localStorage.getItem(STORAGE_SOUND_KEY);
      if (savedSound !== null) return savedSound === "true";
    } catch {
      // Fallback
    }
    return true;
  });

  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const lastAlertPrayerRef = useRef<string | null>(null);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Persist city change
  const handleSelectCity = (city: IndonesianCity) => {
    setSelectedCity(city);
    try {
      localStorage.setItem(STORAGE_CITY_KEY, city.id);
    } catch {
      // LocalStorage fallback
    }
  };

  // Persist sound toggle
  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    try {
      localStorage.setItem(STORAGE_SOUND_KEY, String(nextVal));
    } catch {
      // LocalStorage fallback
    }
    if (nextVal) {
      playTestChime();
    }
  };

  // Compute schedule & countdown
  const schedule: DailyPrayerSchedule = useMemo(() => {
    return calculatePrayerSchedule(now || new Date(), selectedCity);
  }, [now, selectedCity]);

  const prayerInfo = useMemo(() => {
    return getNextPrayerInfo(now || new Date(), schedule);
  }, [now, schedule]);

  // Handle chime notification when prayer arrives
  useEffect(() => {
    if (!soundEnabled) return;

    // If within 2 seconds of prayer arrival and not already triggered
    if (prayerInfo.diffSeconds <= 2 && prayerInfo.nextPrayer.isFardhu) {
      const prayerKey = `${prayerInfo.nextPrayer.id}-${now.toDateString()}`;
      if (lastAlertPrayerRef.current !== prayerKey) {
        lastAlertPrayerRef.current = prayerKey;
        playPrayerChime();
      }
    }
  }, [now, soundEnabled, prayerInfo]);

  const { nextPrayer, currentPrayer, countdownStr, isImminent, progressPercent } = prayerInfo;

  // Primary fardhu cards + Sunnah
  const mainCards = [
    { item: schedule.subuh, label: "Subuh" },
    { item: schedule.terbit, label: "Terbit" },
    { item: schedule.dzuhur, label: "Dzuhur" },
    { item: schedule.ashar, label: "Ashar" },
    { item: schedule.maghrib, label: "Maghrib" },
    { item: schedule.isya, label: "Isya" },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl bg-white/90 dark:bg-[#131825]/90 border border-slate-200/90 dark:border-white/10 p-5 lg:p-6 shadow-sm dark:shadow-2xl backdrop-blur-xl transition-all">
      {/* Dynamic ambient background glow */}
      <div className="absolute -right-20 -bottom-20 w-72 h-72 bg-gradient-to-tl from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -top-20 w-72 h-72 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-5">
        {/* Top bar: Title, City badge, and Audio toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 dark:from-emerald-500/30 dark:to-teal-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-xs">
              <span className="material-symbols-outlined text-[22px]">mosque</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Jadwal Sholat & Adzan
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                  Kemenag RI
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#94a3b8]">
                Imsak: <strong className="text-slate-700 dark:text-[#cbd5e1]">{schedule.imsak.timeStr}</strong> • Dhuha: <strong className="text-slate-700 dark:text-[#cbd5e1]">{schedule.dhuha.timeStr}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* City Selector Button */}
            <button
              type="button"
              onClick={() => setIsCityModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-slate-800 dark:text-white border border-slate-200/80 dark:border-white/[0.08] text-xs font-semibold transition-all active:scale-95 group shadow-xs"
              title="Klik untuk memilih kota di Indonesia"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-500 group-hover:scale-110 transition-transform">
                location_on
              </span>
              <span>
                {selectedCity.name} ({selectedCity.tzLabel})
              </span>
              <span className="material-symbols-outlined text-[14px] text-slate-400 dark:text-[#94a3b8]">
                expand_more
              </span>
            </button>

            {/* Sound Toggle Button */}
            <button
              type="button"
              onClick={toggleSound}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                soundEnabled
                  ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.10] text-slate-500 dark:text-[#94a3b8] border-slate-200 dark:border-white/[0.08]"
              }`}
              title={soundEnabled ? "Notifikasi nada adzan aktif" : "Notifikasi suara dibisukan"}
            >
              <span className="material-symbols-outlined text-[16px]">
                {soundEnabled ? "notifications_active" : "notifications_off"}
              </span>
              <span className="hidden sm:inline">{soundEnabled ? "Adzan On" : "Mute"}</span>
            </button>

            {/* Test Audio Chime */}
            {soundEnabled && (
              <button
                type="button"
                onClick={playTestChime}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
                title="Uji coba nada lonceng adzan"
              >
                <span className="material-symbols-outlined text-[16px]">volume_up</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Countdown Highlight Bar */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-indigo-950/40 border border-emerald-500/20 dark:border-emerald-500/30 p-4 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isImminent
                    ? "bg-rose-500/20 text-rose-500 border border-rose-500/30 animate-pulse"
                    : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {nextPrayer.icon}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    Menuju Waktu {nextPrayer.name}
                  </span>
                  {isImminent && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold animate-pulse">
                      Segera Tiba
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-[#94a3b8]">
                  Pukul <strong>{nextPrayer.timeStr} {selectedCity.tzLabel}</strong>{" "}
                  {currentPrayer && (
                    <span>(Saat ini: {currentPrayer.name})</span>
                  )}
                </div>
              </div>
            </div>

            {/* Countdown Clock Display */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <span className="material-symbols-outlined text-[18px] text-emerald-500">
                timer
              </span>
              <span className="font-mono text-xl sm:text-2xl font-black tracking-wider text-emerald-700 dark:text-emerald-400">
                {countdownStr}
              </span>
            </div>
          </div>

          {/* Progress bar towards next prayer */}
          <div className="w-full h-1.5 bg-slate-200/60 dark:bg-white/10 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Prayer Time Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {mainCards.map(({ item, label }) => {
            const isNext = nextPrayer.id === item.id;
            const isCurrent = currentPrayer?.id === item.id;

            return (
              <div
                key={item.id}
                className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center ${
                  isNext
                    ? "bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/40 text-emerald-900 dark:text-emerald-200 shadow-md ring-2 ring-emerald-500/30 scale-[1.02]"
                    : isCurrent
                    ? "bg-slate-100/90 dark:bg-white/[0.08] border-slate-300 dark:border-white/20 text-slate-900 dark:text-white"
                    : "bg-slate-50/60 dark:bg-white/[0.03] border-slate-200/60 dark:border-white/[0.05] text-slate-600 dark:text-[#94a3b8] hover:border-slate-300 dark:hover:border-white/10"
                }`}
              >
                {/* Badge if Next */}
                {isNext && (
                  <span className="absolute -top-2 px-2 py-0.2 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                    Berikutnya
                  </span>
                )}

                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`material-symbols-outlined text-[16px] ${
                      isNext
                        ? "text-emerald-500 dark:text-emerald-400"
                        : "text-slate-400 dark:text-[#94a3b8]"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="text-xs font-semibold">{label}</span>
                </div>

                <div
                  className={`font-mono text-base font-extrabold ${
                    isNext
                      ? "text-emerald-700 dark:text-emerald-300 font-black"
                      : "text-slate-800 dark:text-[#e2e2eb]"
                  }`}
                >
                  {item.timeStr}
                </div>

                <span className="text-[10px] text-slate-400 dark:text-[#94a3b8]/70 mt-0.5">
                  {selectedCity.tzLabel}
                </span>
              </div>
            );
          })}
        </div>

        {/* Subtle Footer Note */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-[#94a3b8]/80 pt-1 border-t border-slate-100 dark:border-white/[0.05]">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-emerald-500">verified</span>
            <span>Metode Hisab MABIMS / Kemenag RI (+2 mnt Ihtiyath)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">offline_bolt</span>
            <span>100% Offline & Tanpa Kuota API</span>
          </span>
        </div>
      </div>

      {/* City Selection Modal */}
      <CitySelectorModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        selectedCity={selectedCity}
        onSelectCity={handleSelectCity}
      />
    </section>
  );
}
