"use client";

import { useState } from "react";
import { useToast } from "@/app/components/ui/Toast";
import { Icon } from "@/app/components/ui/Icon";
import { useTheme } from "@/app/components/theme/ThemeProvider";
import { IndonesianCity } from "@/lib/prayer/cities";
import { CitySelectorModal } from "@/app/components/prayer/CitySelectorModal";
import { playTestChime } from "@/lib/prayer/audio";
import { usePrayerSettings } from "@/lib/prayer/usePrayerSettings";

type PreferenceData = {
  theme: "LIGHT" | "DARK" | "SYSTEM";
  weekStartDay: number;
  dailyFocusLimit: number;
  enableNotifications: boolean;
  enableAiAssistance: boolean;
  timezone: string;
  defaultReminderMinutes: number;
};

export function UserPreferenceControls({ initialPref }: { initialPref: PreferenceData }) {
  const { toast } = useToast();
  const { theme: appTheme, setTheme: setAppTheme } = useTheme();
  const [theme, setTheme] = useState(appTheme || initialPref.theme);
  const [weekStartDay, setWeekStartDay] = useState(initialPref.weekStartDay);
  const [dailyFocusLimit, setDailyFocusLimit] = useState(initialPref.dailyFocusLimit);
  const [enableNotifications, setEnableNotifications] = useState(initialPref.enableNotifications);
  const [defaultReminderMinutes, setDefaultReminderMinutes] = useState(initialPref.defaultReminderMinutes ?? 15);
  const [saving, setSaving] = useState(false);
  const [testingChannel, setTestingChannel] = useState<"telegram" | null>(null);

  async function testChannel(channel: "telegram") {
    setTestingChannel(channel);
    try {
      const res = await fetch("/api/notifications/test-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast(`Notifikasi uji coba Telegram berhasil dikirim!`, "success");
      } else {
        const reason = data.details?.reason || data.error || "Gagal mengirimkan notifikasi uji coba";
        if (reason === "TELEGRAM_NOT_CONFIGURED") {
          toast("TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum diatur di .env", "error");
        } else {
          toast(`Gagal: ${reason}`, "error");
        }
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Terjadi kesalahan jaringan", "error");
    } finally {
      setTestingChannel(null);
    }
  }

  async function updatePref(patch: Partial<PreferenceData>) {
    setSaving(true);
    try {
      const res = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal memperbarui preferensi");
      toast("Preferensi berhasil disimpan", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal memperbarui preferensi", "error");
    } finally {
      setSaving(false);
    }
  }

  function handleLimitChange(delta: number) {
    const nextVal = Math.max(1, Math.min(20, dailyFocusLimit + delta));
    setDailyFocusLimit(nextVal);
    updatePref({ dailyFocusLimit: nextVal });
  }

  // Prayer & Agenda Settings State via unified hook
  const {
    city: prayerCity,
    showInCalendar: showPrayerInCalendar,
    soundEnabled: prayerSound,
    showSunnah: showSunnahInCalendar,
    setCity: setPrayerCity,
    setShowInCalendar: setShowPrayerInCalendar,
    setSoundEnabled: setPrayerSound,
    setShowSunnah: setShowSunnahInCalendar,
  } = usePrayerSettings();

  const [isCityModalOpen, setIsCityModalOpen] = useState(false);

  function handleTogglePrayerInCalendar() {
    const nextVal = !showPrayerInCalendar;
    setShowPrayerInCalendar(nextVal);
    toast(
      nextVal
        ? "Waktu Sholat & Adzan diaktifkan pada To-Do List Agenda! 🕌"
        : "Waktu Sholat disembunyikan dari Agenda",
      "success"
    );
  }

  function handleTogglePrayerSound() {
    const nextVal = !prayerSound;
    setPrayerSound(nextVal);
    if (nextVal) playTestChime();
    toast(nextVal ? "Nada notifikasi adzan diaktifkan 🔔" : "Nada notifikasi adzan dibisukan 🔕", "info");
  }

  function handleToggleSunnah() {
    const nextVal = !showSunnahInCalendar;
    setShowSunnahInCalendar(nextVal);
    toast(
      nextVal
        ? "Waktu Imsak & Dhuha diikutsertakan di Agenda"
        : "Hanya sholat 5 waktu wajib yang ditampilkan",
      "info"
    );
  }

  function handleSelectPrayerCity(city: IndonesianCity) {
    setPrayerCity(city);
    toast(`Kota jadwal sholat diubah ke ${city.name} (${city.tzLabel}) 📍`, "success");
  }

  return (
    <div className="space-y-8">
      {/* 1. Preferensi Tampilan & Ritme Produktivitas */}
      <section className="space-y-3">
        <div className="flex flex-col">
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Preferensi Tampilan &amp; Ritme Kerja</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">Konfigurasi cara MyLife beroperasi dan menyesuaikan diri dengan pola fokus Anda.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-teal-500/15 bg-white dark:bg-[#0d1b20]/90 divide-y divide-slate-200 dark:divide-teal-500/10 overflow-hidden shadow-sm dark:shadow-xl backdrop-blur-sm">
          {/* Baris 1: Tema Tampilan */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-teal-900/10 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300 mt-0.5 border border-teal-200 dark:border-teal-500/30">
                <Icon name="sparkles" size={18} />
              </div>
              <div>
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">Tema Tampilan</span>
                <span className="block text-xs text-slate-500 dark:text-zinc-400">Pilih skema visual antarmuka sistem MyLife.</span>
              </div>
            </div>
            <div className="flex items-center self-end sm:self-center">
              <select
                value={theme}
                disabled={saving}
                onChange={(e) => {
                  const val = e.target.value as "LIGHT" | "DARK" | "SYSTEM";
                  setTheme(val);
                  setAppTheme(val);
                  updatePref({ theme: val });
                }}
                className="rounded-xl border border-slate-200 dark:border-teal-500/20 bg-slate-50 dark:bg-[#081013] px-3.5 py-2 font-mono text-xs font-semibold text-slate-800 dark:text-teal-200 focus:border-teal-500 dark:focus:border-teal-400 focus:outline-none transition-colors cursor-pointer shadow-xs"
              >
                <option value="LIGHT">Terang (Clean Light)</option>
                <option value="DARK">Gelap (Calm Teal Obsidian) — Default</option>
                <option value="SYSTEM">Otomatis (Sistem OS)</option>
              </select>
            </div>
          </div>

          {/* Baris 2: Mulai Hari Mingguan */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-teal-900/10 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300 mt-0.5 border border-teal-200 dark:border-teal-500/30">
                <Icon name="calendar" size={18} />
              </div>
              <div>
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">Mulai Hari Mingguan</span>
                <span className="block text-xs text-slate-500 dark:text-zinc-400">Hari awal dalam kalkulasi kalender, sprint, dan review mingguan.</span>
              </div>
            </div>
            <div className="flex items-center self-end sm:self-center">
              <select
                value={weekStartDay}
                disabled={saving}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setWeekStartDay(val);
                  updatePref({ weekStartDay: val });
                }}
                className="rounded-xl border border-slate-200 dark:border-teal-500/20 bg-slate-50 dark:bg-[#081013] px-3.5 py-2 font-mono text-xs font-semibold text-slate-800 dark:text-zinc-200 focus:border-teal-500 dark:focus:border-teal-400 focus:outline-none transition-colors cursor-pointer"
              >
                <option value={1}>Senin (ISO Standard)</option>
                <option value={0}>Minggu (US Standard)</option>
                <option value={6}>Sabtu</option>
              </select>
            </div>
          </div>

          {/* Baris 3: Batas Tugas Fokus Harian */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-teal-900/10 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300 mt-0.5 border border-teal-200 dark:border-teal-500/30">
                <Icon name="target" size={18} />
              </div>
              <div>
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">Batas Tugas Fokus Harian</span>
                <span className="block text-xs text-slate-500 dark:text-zinc-400">Maksimal tugas prioritas harian untuk mencegah kelelahan (burnout).</span>
              </div>
            </div>
            <div className="flex items-center self-end sm:self-center gap-2 rounded-xl border border-slate-200 dark:border-teal-500/20 bg-slate-100 dark:bg-[#081013] p-1">
              <button
                type="button"
                disabled={saving || dailyFocusLimit <= 1}
                onClick={() => handleLimitChange(-1)}
                className="h-7 w-7 rounded-lg bg-white dark:bg-[#0d1b20] hover:bg-slate-200 dark:hover:bg-teal-900/30 text-slate-800 dark:text-zinc-200 flex items-center justify-center font-mono font-bold text-sm transition-colors disabled:opacity-40 shadow-xs cursor-pointer"
              >
                -
              </button>
              <span className="font-mono text-sm font-bold text-slate-900 dark:text-white px-2 min-w-[28px] text-center">
                {dailyFocusLimit}
              </span>
              <button
                type="button"
                disabled={saving || dailyFocusLimit >= 20}
                onClick={() => handleLimitChange(1)}
                className="h-7 w-7 rounded-lg bg-white dark:bg-[#0d1b20] hover:bg-slate-200 dark:hover:bg-teal-900/30 text-slate-800 dark:text-zinc-200 flex items-center justify-center font-mono font-bold text-sm transition-colors disabled:opacity-40 shadow-xs cursor-pointer"
              >
                +
              </button>
              <span className="font-mono text-[10px] uppercase text-slate-500 dark:text-zinc-500 pr-2">TASK/HARI</span>
            </div>
          </div>

          {/* Baris 4: Notifikasi Proaktif Sistem */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-teal-900/10 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300 mt-0.5 border border-teal-200 dark:border-teal-500/30">
                <Icon name="bell" size={18} />
              </div>
              <div>
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">Notifikasi Proaktif Sistem</span>
                <span className="block text-xs text-slate-500 dark:text-zinc-400">Aktifkan pengingat cerdas otomatis untuk deadline, agenda kegiatan, dan evaluasi berkala.</span>
              </div>
            </div>
            <div className="flex items-center self-end sm:self-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableNotifications}
                  disabled={saving}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setEnableNotifications(val);
                    updatePref({ enableNotifications: val });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-white/[0.1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500 dark:peer-checked:bg-teal-500"></div>
              </label>
            </div>
          </div>

          {/* Baris 5: Default Reminder Minutes */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-teal-900/10 transition-colors border-t border-slate-200 dark:border-teal-500/10">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300 mt-0.5 border border-teal-200 dark:border-teal-500/30">
                <Icon name="bell" size={18} />
              </div>
              <div>
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">Waktu Default Reminder</span>
                <span className="block text-xs text-slate-500 dark:text-zinc-400">
                  Berapa menit sebelum jadwal, Telegram reminder dikirim. Bisa diatur khusus per jadwal di Agenda.
                </span>
              </div>
            </div>
            <div className="flex items-center self-end sm:self-center">
              <select
                id="default-reminder-minutes"
                value={defaultReminderMinutes}
                disabled={saving}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDefaultReminderMinutes(val);
                  updatePref({ defaultReminderMinutes: val } as Partial<PreferenceData>);
                }}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#081013] text-slate-900 dark:text-zinc-200 border border-slate-200 dark:border-teal-500/20 font-mono text-xs focus:outline-none focus:border-teal-500 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <option value={5}>5 menit</option>
                <option value={10}>10 menit</option>
                <option value={15}>15 menit (default)</option>
                <option value={30}>30 menit</option>
                <option value={60}>60 menit</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Saluran Notifikasi Eksternal (Telegram) */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Saluran Notifikasi Eksternal</h2>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
              Open Protocol
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">Kirim pengingat real-time langsung ke smartphone Anda via Telegram Bot API.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Telegram Card */}
          <div className="rounded-3xl border border-slate-200 dark:border-teal-500/15 bg-white dark:bg-[#0d1b20]/90 p-6 shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 backdrop-blur-sm">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center border border-sky-500/20">
                    <span className="text-lg">✈️</span>
                  </div>
                  <div>
                    <span className="block text-base font-bold text-slate-900 dark:text-white leading-tight">Telegram Bot API</span>
                    <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-500 uppercase">Bot Push Notification</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-teal-500/10 px-2.5 py-0.5 text-teal-300 border border-teal-500/30 font-mono text-[10px] font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                  <span>AKTIF</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Terima peringatan instan, notifikasi tugas jatuh tempo hari ini, dan pengingat waktu fokus di aplikasi Telegram Anda via Bot API tanpa biaya langganan.
              </p>
              <div className="rounded-xl border border-slate-200 dark:border-teal-500/15 bg-slate-50 dark:bg-[#081013] p-2.5 font-mono text-[11px] text-slate-600 dark:text-zinc-400 flex items-center justify-between">
                <span className="truncate">Bot: @MyLifeOS_Bot • Chat Protocol</span>
                <span className="text-teal-400">✓ Terhubung</span>
              </div>
            </div>

            <div className="shrink-0">
              <button
                type="button"
                disabled={testingChannel !== null}
                onClick={() => testChannel("telegram")}
                className="w-full md:w-auto py-2.5 px-5 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>⚡</span>
                <span>{testingChannel === "telegram" ? "Mengirim Tes..." : "Tes Notifikasi Telegram"}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Integrasi Jadwal Sholat & Adzan di Agenda & To-Do List */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Jadwal Sholat &amp; Integrasi Agenda
            </h2>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
              Kemenag RI • MABIMS
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Sinkronkan waktu sholat otomatis dengan daftar to-do dan timeline agenda harian Anda.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-teal-500/15 bg-white dark:bg-[#0d1b20]/90 divide-y divide-slate-200 dark:divide-teal-500/10 overflow-hidden shadow-sm dark:shadow-xl backdrop-blur-sm">
          {/* Baris 1: Masukkan waktu sholat ke To-Do List Agenda */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-teal-900/10 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 mt-0.5 border border-teal-500/20">
                <span className="text-lg">🕌</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                    Tampilkan di Agenda &amp; To-Do
                  </span>
                  {showPrayerInCalendar && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
                      Aktif
                    </span>
                  )}
                </div>
                <span className="block text-xs text-slate-500 dark:text-zinc-400 max-w-xl">
                  Memasukkan waktu sholat (Subuh, Dzuhur, Ashar, Maghrib, Isya) ke dalam alur to-do harian di Agenda secara kronologis, lengkap dengan kotak ceklis ibadah harian.
                </span>
              </div>
            </div>
            <div className="flex items-center self-end sm:self-center">
              <button
                type="button"
                onClick={handleTogglePrayerInCalendar}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  showPrayerInCalendar ? "bg-teal-500" : "bg-slate-300 dark:bg-white/20"
                }`}
                role="switch"
                aria-checked={showPrayerInCalendar}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    showPrayerInCalendar ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Baris 2: Pemilihan Kota & Wilayah */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-teal-900/10 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 mt-0.5 border border-teal-500/20">
                <span className="text-lg">📍</span>
              </div>
              <div>
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                  Wilayah / Kota Jadwal Sholat
                </span>
                <span className="block text-xs text-slate-500 dark:text-zinc-400">
                  Saat ini: <strong className="text-slate-800 dark:text-teal-200 font-semibold">{prayerCity.name}</strong>, {prayerCity.province} ({prayerCity.tzLabel})
                </span>
              </div>
            </div>
            <div className="flex items-center self-end sm:self-center gap-2">
              <button
                type="button"
                onClick={() => setIsCityModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-[#14272e] dark:hover:bg-teal-900/30 text-slate-800 dark:text-teal-200 border border-slate-200 dark:border-teal-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Pilih / Cari Kota</span>
                <span className="text-teal-400">→</span>
              </button>
            </div>
          </div>

          {/* Baris 3: Notifikasi Suara Adzan */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-teal-900/10 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 mt-0.5 border border-teal-500/20">
                <span className="text-lg">🔔</span>
              </div>
              <div>
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                  Nada Pengingat Suara Waktu Sholat
                </span>
                <span className="block text-xs text-slate-500 dark:text-zinc-400">
                  Bunyikan lonceng adzan harmonis secara otomatis saat memasuki waktu sholat di perangkat ini.
                </span>
              </div>
            </div>
            <div className="flex items-center self-end sm:self-center gap-3">
              <button
                type="button"
                onClick={playTestChime}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-[#14272e] dark:hover:bg-teal-900/30 text-slate-700 dark:text-teal-200 border border-slate-200 dark:border-teal-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Dengarkan contoh nada lonceng adzan"
              >
                <span>🔊</span>
                <span>Tes Suara</span>
              </button>

              <button
                type="button"
                onClick={handleTogglePrayerSound}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  prayerSound ? "bg-teal-500" : "bg-slate-300 dark:bg-white/20"
                }`}
                role="switch"
                aria-checked={prayerSound}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    prayerSound ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Baris 4: Sertakan Waktu Sunnah (Imsak & Dhuha) */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-teal-900/10 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 mt-0.5 border border-teal-500/20">
                <span className="text-lg">☀️</span>
              </div>
              <div>
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                  Sertakan Waktu Imsak &amp; Dhuha
                </span>
                <span className="block text-xs text-slate-500 dark:text-zinc-400">
                  Tambahkan juga penanda waktu Imsak dan Sholat Dhuha ke dalam to-do list agenda harian.
                </span>
              </div>
            </div>
            <div className="flex items-center self-end sm:self-center">
              <button
                type="button"
                onClick={handleToggleSunnah}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  showSunnahInCalendar ? "bg-teal-500" : "bg-slate-300 dark:bg-white/20"
                }`}
                role="switch"
                aria-checked={showSunnahInCalendar}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    showSunnahInCalendar ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <CitySelectorModal
          isOpen={isCityModalOpen}
          onClose={() => setIsCityModalOpen(false)}
          selectedCity={prayerCity}
          onSelectCity={handleSelectPrayerCity}
        />
      </section>
    </div>
  );
}
