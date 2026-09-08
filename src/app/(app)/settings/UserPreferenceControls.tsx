"use client";

import { useState } from "react";
import { useToast } from "@/app/components/ui/Toast";
import { Icon } from "@/app/components/ui/Icon";

type PreferenceData = {
  theme: "LIGHT" | "DARK" | "SYSTEM";
  weekStartDay: number;
  dailyFocusLimit: number;
  enableNotifications: boolean;
  enableAiAssistance: boolean;
  timezone: string;
};

export function UserPreferenceControls({ initialPref }: { initialPref: PreferenceData }) {
  const { toast } = useToast();
  const [theme, setTheme] = useState(initialPref.theme);
  const [weekStartDay, setWeekStartDay] = useState(initialPref.weekStartDay);
  const [dailyFocusLimit, setDailyFocusLimit] = useState(initialPref.dailyFocusLimit);
  const [enableNotifications, setEnableNotifications] = useState(initialPref.enableNotifications);
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

  return (
    <div className="space-y-8">
      {/* 1. Preferensi Tampilan & Ritme Produktivitas */}
      <section className="space-y-3">
        <div className="flex flex-col">
          <h2 className="text-base font-bold text-white tracking-tight">Preferensi Tampilan & Ritme Kerja</h2>
          <p className="text-xs text-[#94A3B8]">Konfigurasi cara MyLife OS beroperasi dan menyesuaikan diri dengan pola fokus Anda.</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#131825] divide-y divide-white/[0.06] overflow-hidden shadow-xl">
          {/* Baris 1: Tema Tampilan */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#1A2133]/40 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[#8B5CF6]/15 text-[#d0bcff] mt-0.5 border border-[#8B5CF6]/30">
                <Icon name="sparkles" size={18} />
              </div>
              <div>
                <span className="block text-sm font-semibold text-white">Tema Tampilan</span>
                <span className="block text-xs text-[#94A3B8]">Pilih skema visual antarmuka sistem MyLife OS.</span>
              </div>
            </div>
            <div className="flex items-center self-end sm:self-center">
              <select
                value={theme}
                disabled={saving}
                onChange={(e) => {
                  const val = e.target.value as "LIGHT" | "DARK" | "SYSTEM";
                  setTheme(val);
                  updatePref({ theme: val });
                }}
                className="rounded-xl border border-white/[0.1] bg-[#0B0D13] px-3.5 py-2 font-mono text-xs font-semibold text-[#d0bcff] focus:border-[#8B5CF6] focus:outline-none transition-colors cursor-pointer"
              >
                <option value="DARK">Gelap (Obsidian Dark)</option>
                <option value="LIGHT">Terang (Clean Light)</option>
                <option value="SYSTEM">Otomatis (Sistem OS)</option>
              </select>
            </div>
          </div>

          {/* Baris 2: Mulai Hari Mingguan */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#1A2133]/40 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[#c0c1ff]/15 text-[#c0c1ff] mt-0.5 border border-[#c0c1ff]/30">
                <Icon name="calendar" size={18} />
              </div>
              <div>
                <span className="block text-sm font-semibold text-white">Mulai Hari Mingguan</span>
                <span className="block text-xs text-[#94A3B8]">Hari awal dalam kalkulasi kalender, sprint, dan review mingguan.</span>
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
                className="rounded-xl border border-white/[0.1] bg-[#0B0D13] px-3.5 py-2 font-mono text-xs font-semibold text-white focus:border-[#8B5CF6] focus:outline-none transition-colors cursor-pointer"
              >
                <option value={1}>Senin (ISO Standard)</option>
                <option value={0}>Minggu (US Standard)</option>
                <option value={6}>Sabtu</option>
              </select>
            </div>
          </div>

          {/* Baris 3: Batas Tugas Fokus Harian */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#1A2133]/40 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[#4edea3]/15 text-[#4edea3] mt-0.5 border border-[#4edea3]/30">
                <Icon name="target" size={18} />
              </div>
              <div>
                <span className="block text-sm font-semibold text-white">Batas Tugas Fokus Harian</span>
                <span className="block text-xs text-[#94A3B8]">Maksimal tugas prioritas harian untuk mencegah kelelahan (burnout).</span>
              </div>
            </div>
            <div className="flex items-center self-end sm:self-center gap-2 rounded-xl border border-white/[0.08] bg-[#0B0D13] p-1">
              <button
                type="button"
                disabled={saving || dailyFocusLimit <= 1}
                onClick={() => handleLimitChange(-1)}
                className="h-7 w-7 rounded-lg bg-[#131825] hover:bg-[#1A2133] text-white flex items-center justify-center font-mono font-bold text-sm transition-colors disabled:opacity-40"
              >
                -
              </button>
              <span className="font-mono text-sm font-bold text-white px-2 min-w-[28px] text-center">
                {dailyFocusLimit}
              </span>
              <button
                type="button"
                disabled={saving || dailyFocusLimit >= 20}
                onClick={() => handleLimitChange(1)}
                className="h-7 w-7 rounded-lg bg-[#131825] hover:bg-[#1A2133] text-white flex items-center justify-center font-mono font-bold text-sm transition-colors disabled:opacity-40"
              >
                +
              </button>
              <span className="font-mono text-[10px] uppercase text-[#64748B] pr-2">TASK/HARI</span>
            </div>
          </div>

          {/* Baris 4: Notifikasi Proaktif Sistem */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#1A2133]/40 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] mt-0.5 border border-[#F59E0B]/30">
                <Icon name="bell" size={18} />
              </div>
              <div>
                <span className="block text-sm font-semibold text-white">Notifikasi Proaktif Sistem</span>
                <span className="block text-xs text-[#94A3B8]">Aktifkan pengingat cerdas otomatis untuk deadline, event kalender, dan evaluasi berkala.</span>
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
                <div className="w-11 h-6 bg-white/[0.1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4edea3]"></div>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Saluran Notifikasi Eksternal (Telegram) */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight">Saluran Notifikasi Eksternal</h2>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/30">
              100% Gratis & Open Protocol
            </span>
          </div>
          <p className="text-xs text-[#94A3B8]">Kirim pengingat real-time langsung ke smartphone Anda via Telegram Bot API.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Telegram Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0088cc]/20 text-[#38bdf8] flex items-center justify-center border border-[#0088cc]/30">
                    <span className="text-lg">✈️</span>
                  </div>
                  <div>
                    <span className="block text-base font-bold text-white leading-tight">Telegram Bot API</span>
                    <span className="font-mono text-[10px] text-[#94A3B8] uppercase">Bot Protocol Push</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-[#4edea3]/10 px-2.5 py-0.5 text-[#4edea3] border border-[#4edea3]/30 font-mono text-[10px] font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
                  <span>AKTIF</span>
                </div>
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Terima peringatan instan, notifikasi tugas jatuh tempo hari ini, dan pengingat waktu fokus di aplikasi Telegram Anda via Bot API tanpa biaya langganan.
              </p>
              <div className="rounded-xl border border-white/[0.06] bg-[#0B0D13] p-2.5 font-mono text-[11px] text-[#64748B] flex items-center justify-between">
                <span className="truncate">Bot: @MyLifeOS_Bot • Chat Protocol</span>
                <span className="text-[#4edea3]">✓</span>
              </div>
            </div>

            <div className="shrink-0">
              <button
                type="button"
                disabled={testingChannel !== null}
                onClick={() => testChannel("telegram")}
                className="w-full md:w-auto py-2.5 px-5 text-xs font-bold rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white transition-all shadow-md active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>⚡</span>
                <span>{testingChannel === "telegram" ? "Mengirim Tes..." : "Tes Notifikasi Telegram"}</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
