"use client";

import React, { useState, useEffect } from "react";

interface ReminderItem {
  id: string;
  kind: "CHECKIN" | "EVENING_REFLECTION" | "RISK_WINDOW" | "WEEKLY_REVIEW" | "ANCHOR";
  localTime: string;
  daysOfWeek: number[];
  isActive: boolean;
  nextFireAt?: string | null;
}

interface HabitRemindersModalProps {
  habitId: string;
  habitName: string;
  isOpen: boolean;
  onClose: () => void;
}

const KIND_LABELS: Record<string, { label: string; icon: string; desc: string }> = {
  CHECKIN: {
    label: "Evaluasi Harian (Check-in)",
    icon: "⏰",
    desc: "Mengingatkan untuk mencatat progres harian pada jam pilihan Anda.",
  },
  RISK_WINDOW: {
    label: "Jendela Rawan (Deteksi Pola)",
    icon: "🛡️",
    desc: "Mengingatkan 15-30 menit sebelum jam dorongan biasanya muncul.",
  },
  EVENING_REFLECTION: {
    label: "Refleksi Malam Hari",
    icon: "🌙",
    desc: "Momen tenang di akhir hari untuk mengapresiasi usaha Anda.",
  },
  ANCHOR: {
    label: "Pemicu Jangkar (Tiny Habits)",
    icon: "⚓",
    desc: "Mengingatkan untuk melakukan perilaku mini setelah aktivitas jangkar.",
  },
  WEEKLY_REVIEW: {
    label: "Tinjauan Akhir Pekan",
    icon: "📑",
    desc: "Refleksi satu layar setiap akhir pekan.",
  },
};

const DAY_LABELS = [
  { day: 1, label: "Sen" },
  { day: 2, label: "Sel" },
  { day: 3, label: "Rab" },
  { day: 4, label: "Kam" },
  { day: 5, label: "Jum" },
  { day: 6, label: "Sab" },
  { day: 7, label: "Min" },
];

export function HabitRemindersModal({
  habitId,
  habitName,
  isOpen,
  onClose,
}: HabitRemindersModalProps) {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Tambah Baru
  const [showAddForm, setShowAddForm] = useState(false);
  const [kind, setKind] = useState<ReminderItem["kind"]>("CHECKIN");
  const [localTime, setLocalTime] = useState("19:00");
  const [selectedDays, setSelectedDays] = useState<number[]>([]); // kosong = tiap hari

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/tracked-habits/${habitId}/reminders`);
        const json = await res.json();
        if (ignore) return;
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Tidak dapat memuat pengingat.");
        }
        setReminders(json.data?.reminders || []);
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

  const handleToggle = async (reminderId: string, currentActive: boolean) => {
    try {
      setError(null);
      const res = await fetch(`/api/tracked-habits/${habitId}/reminders/${reminderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat memperbarui pengingat.");
      }
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    }
  };

  const handleDelete = async (reminderId: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/tracked-habits/${habitId}/reminders/${reminderId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat menghapus pengingat.");
      }
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/tracked-habits/${habitId}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          localTime,
          daysOfWeek: selectedDays,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat membuat pengingat.");
      }
      setShowAddForm(false);
      setSuccessMsg("Pengingat baru berhasil dibuat.");
      setTimeout(() => setSuccessMsg(null), 4000);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAutoRiskWindow = async () => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/tracked-habits/${habitId}/reminders/risk-window`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat memasang pengingat jendela rawan.");
      }
      setSuccessMsg(json.data?.explanation || "Pengingat jendela rawan berhasil dipasang!");
      setTimeout(() => setSuccessMsg(null), 5000);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  if (!isOpen) return null;

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
              <span className="text-xl">🔔</span>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Kelola Pengingat
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Atur waktu pengingat penuh empati untuk{" "}
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

        {/* Quiet Hours Policy Callout */}
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 mb-6 text-xs text-indigo-200 flex items-start gap-3">
          <span className="text-base mt-0.5">🌙</span>
          <div className="space-y-1">
            <strong className="text-white block font-semibold">Kebijakan Jam Tenang (22:00 - 06:00)</strong>
            <p className="text-indigo-200/90 leading-relaxed text-[11px]">
              Sistem menghormati waktu istirahat Anda. Notifikasi tidak akan dikirimkan pada jam tenang
              dan dibatasi maksimal 4 pengingat per hari di seluruh kebiasaan agar Anda tetap merasa nyaman.
            </p>
          </div>
        </div>

        {/* Error / Success Alerts */}
        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200 mb-4 flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-rose-400 font-bold ml-2">
              ✕
            </button>
          </div>
        )}

        {successMsg && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200 mb-4 flex items-center gap-2">
            <span>✨</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Action Buttons: Auto Risk Window & + Tambah Pengingat */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <button
            type="button"
            disabled={actionLoading}
            onClick={handleAutoRiskWindow}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2.5 text-xs font-bold text-amber-300 transition-colors shadow-sm disabled:opacity-50"
            title="Deteksi waktu rawan dari data catatan dan pasang alarm pencegahan 30 menit sebelumnya"
          >
            <span>⚡</span>
            <span>Pasang Pengingat Jendela Rawan Otomatis</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white transition-colors shadow-sm"
          >
            {showAddForm ? "✕ Batal" : "+ Tambah Pengingat"}
          </button>
        </div>

        {/* Form Tambah Pengingat */}
        {showAddForm && (
          <form
            onSubmit={handleCreate}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-6 space-y-4 animate-in fade-in"
          >
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Buat Pengingat Baru
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Jenis Pengingat
                </label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as ReminderItem["kind"])}
                  className="w-full rounded-xl border border-white/10 bg-[#161726] px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="CHECKIN">⏰ Evaluasi Harian (Check-in)</option>
                  <option value="ANCHOR">⚓ Pemicu Jangkar (Tiny Habits)</option>
                  <option value="EVENING_REFLECTION">🌙 Refleksi Malam Hari</option>
                  <option value="WEEKLY_REVIEW">📑 Tinjauan Akhir Pekan</option>
                  <option value="RISK_WINDOW">🛡️ Jendela Rawan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Waktu Lokal (HH:mm)
                </label>
                <input
                  type="time"
                  value={localTime}
                  onChange={(e) => setLocalTime(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#161726] px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                />
              </div>
            </div>

            {/* Pilihan Hari */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Hari Berulang (Kosongkan jika setiap hari)
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {DAY_LABELS.map((d) => {
                  const isSelected = selectedDays.includes(d.day);
                  return (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => toggleDay(d.day)}
                      className={`h-8 w-10 rounded-lg text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50"
              >
                {actionLoading ? "Menyimpan..." : "Simpan Pengingat"}
              </button>
            </div>
          </form>
        )}

        {/* List of Reminders */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span className="text-xs">Memuat daftar pengingat...</span>
          </div>
        ) : reminders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-slate-400">
            <span className="text-2xl block mb-2">🔕</span>
            <p className="text-xs">Belum ada pengingat terjadwal untuk kebiasaan ini.</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Tambahkan pengingat manual atau gunakan tombol pasang otomatis di atas.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((r) => {
              const meta = KIND_LABELS[r.kind] || {
                label: r.kind,
                icon: "🔔",
                desc: "",
              };
              const daysStr =
                r.daysOfWeek.length === 0 || r.daysOfWeek.length === 7
                  ? "Setiap Hari"
                  : r.daysOfWeek.map((d) => DAY_LABELS[d - 1]?.label).join(", ");

              return (
                <div
                  key={r.id}
                  className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                    r.isActive
                      ? "border-white/10 bg-[#161726]"
                      : "border-white/5 bg-white/[0.01] opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{meta.icon}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{meta.label}</span>
                        <span className="font-mono text-xs font-extrabold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-md border border-indigo-500/30">
                          {r.localTime}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
                          {daysStr}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{meta.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleToggle(r.id, r.isActive)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        r.isActive
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                          : "bg-white/5 text-slate-400 hover:text-white"
                      }`}
                    >
                      {r.isActive ? "Aktif" : "Nonaktif"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Hapus Pengingat"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
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
