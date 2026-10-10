"use client";

import React, { useState } from "react";

interface CreateHabitWizardProps {
  onSuccess: (habitId: string) => void;
  onCancel: () => void;
  defaultTimezone?: string;
}

const DAY_LABELS = [
  { day: 1, label: "Sen", full: "Senin" },
  { day: 2, label: "Sel", full: "Selasa" },
  { day: 3, label: "Rab", full: "Rabu" },
  { day: 4, label: "Kam", full: "Kamis" },
  { day: 5, label: "Jum", full: "Jumat" },
  { day: 6, label: "Sab", full: "Sabtu" },
  { day: 7, label: "Min", full: "Minggu" },
];

export function CreateHabitWizard({
  onSuccess,
  onCancel,
  defaultTimezone = "Asia/Jakarta",
}: CreateHabitWizardProps) {
  const [kind, setKind] = useState<"BREAK" | "BUILD">("BUILD");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common Form State
  const [name, setName] = useState("");
  const [displayAlias, setDisplayAlias] = useState("");
  const [category, setCategory] = useState("HEALTH");
  const [privacyLevel, setPrivacyLevel] = useState<number>(1);
  const [identityStatement, setIdentityStatement] = useState("");

  const [checkinLocalTime, setCheckinLocalTime] = useState("20:00");
  const [timezone, setTimezone] = useState(defaultTimezone);

  // BREAK State
  const [breakMode, setBreakMode] = useState<"ABSTAIN" | "REDUCE">("ABSTAIN");
  const [reduceDailyLimit, setReduceDailyLimit] = useState<number | "">(5);
  const [reduceStepPercent, setReduceStepPercent] = useState<number | "">(10);
  const [reduceStepEveryDays, setReduceStepEveryDays] = useState<number | "">(7);

  const [startedAt, setStartedAt] = useState(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });
  const [whyReasons, setWhyReasons] = useState<string[]>([""]);
  const [futureSelfNote, setFutureSelfNote] = useState("");
  const [costPerOccurrence, setCostPerOccurrence] = useState<number | "">("");

  // BUILD State (Metode ABC)
  const [scheduleType, setScheduleType] = useState<"DAILY" | "DAYS_OF_WEEK" | "TIMES_PER_WEEK">("DAILY");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [timesPerWeek, setTimesPerWeek] = useState<number>(3);
  const [restDays, setRestDays] = useState<number[]>([]);

  const [anchorText, setAnchorText] = useState("");
  const [tinyBehavior, setTinyBehavior] = useState("");
  const [celebrationText, setCelebrationText] = useState("");
  const [tinyVersion, setTinyVersion] = useState("");
  const [standardVersion, setStandardVersion] = useState("");
  const [stretchVersion, setStretchVersion] = useState("");

  const handleAddReason = () => {
    setWhyReasons([...whyReasons, ""]);
  };

  const handleReasonChange = (index: number, val: string) => {
    const updated = [...whyReasons];
    updated[index] = val;
    setWhyReasons(updated);
  };

  const handleRemoveReason = (index: number) => {
    if (whyReasons.length > 1) {
      setWhyReasons(whyReasons.filter((_, i) => i !== index));
    }
  };

  const toggleDayOfWeek = (day: number) => {
    if (daysOfWeek.includes(day)) {
      if (daysOfWeek.length > 1) {
        setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
      }
    } else {
      setDaysOfWeek([...daysOfWeek, day].sort());
    }
  };

  const toggleRestDay = (day: number) => {
    if (restDays.includes(day)) {
      setRestDays(restDays.filter((d) => d !== day));
    } else {
      setRestDays([...restDays, day].sort());
    }
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!name.trim()) {
        setError("Nama kebiasaan wajib diisi.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(checkinLocalTime)) {
        setError("Jam check-in harus berformat HH:mm (contoh: 20:00).");
        return;
      }
      if (kind === "BUILD" && scheduleType === "DAYS_OF_WEEK" && daysOfWeek.length === 0) {
        setError("Pilih minimal 1 hari aktif per minggu.");
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (kind === "BREAK") {
      const validReasons = whyReasons.map((r) => r.trim()).filter(Boolean);
      if (validReasons.length === 0) {
        setError("Sertakan minimal 1 alasan kuat mengapa ingin berhenti.");
        return;
      }
    } else {
      if (!tinyBehavior.trim()) {
        setError("Perilaku mini (Tiny Behavior) wajib diisi untuk kebiasaan Build.");
        return;
      }
    }

    setLoading(true);

    try {
      let payload: Record<string, unknown>;

      if (kind === "BREAK") {
        const validReasons = whyReasons.map((r) => r.trim()).filter(Boolean);
        payload = {
          name: name.trim(),
          displayAlias: displayAlias.trim() || undefined,
          category: category.trim() || undefined,
          kind: "BREAK",
          mode: breakMode,
          timezone,
          checkinLocalTime,
          startedAt: new Date(startedAt).toISOString(),
          privacyLevel,
          identityStatement: identityStatement.trim() || undefined,
          whyReasons: validReasons,
          futureSelfNote: futureSelfNote.trim() || undefined,
          costPerOccurrence: costPerOccurrence === "" ? undefined : Number(costPerOccurrence),
          reduceDailyLimit: breakMode === "REDUCE" ? (reduceDailyLimit === "" ? 0 : Number(reduceDailyLimit)) : undefined,
          reduceStepPercent: breakMode === "REDUCE" && reduceStepPercent !== "" ? Number(reduceStepPercent) : undefined,
          reduceStepEveryDays: breakMode === "REDUCE" && reduceStepEveryDays !== "" ? Number(reduceStepEveryDays) : undefined,
        };
      } else {
        payload = {
          name: name.trim(),
          displayAlias: displayAlias.trim() || undefined,
          category: category.trim() || undefined,
          kind: "BUILD",
          timezone,
          checkinLocalTime,
          startedAt: new Date().toISOString(),
          privacyLevel,
          identityStatement: identityStatement.trim() || undefined,
          scheduleType,
          daysOfWeek: scheduleType === "DAYS_OF_WEEK" ? daysOfWeek : [],
          timesPerWeek: scheduleType === "TIMES_PER_WEEK" ? timesPerWeek : undefined,
          restDays,
          anchorText: anchorText.trim() || undefined,
          tinyBehavior: tinyBehavior.trim(),
          celebrationText: celebrationText.trim() || undefined,
          versions: {
            tiny: tinyVersion.trim() || undefined,
            standard: standardVersion.trim() || undefined,
            stretch: stretchVersion.trim() || undefined,
          },
        };
      }

      const res = await fetch("/api/tracked-habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tidak dapat membuat kebiasaan.");
      }

      onSuccess(json.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-[#151522] p-6 sm:p-8 shadow-2xl">
      {/* Tab Pilihan Jenis Habit (Langkah 1) */}
      <div className="mb-6">
        <div className="grid grid-cols-2 p-1 rounded-xl bg-white/5 border border-white/10 mb-4">
          <button
            type="button"
            onClick={() => setKind("BUILD")}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              kind === "BUILD"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🌱 Bangun Kebiasaan (Build)
          </button>
          <button
            type="button"
            onClick={() => setKind("BREAK")}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              kind === "BREAK"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🛡️ Hentikan Kebiasaan (Break)
          </button>
        </div>

        {/* Wizard Header & Steps Progress */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Langkah {step} dari 3
          </span>
          <span className="text-xs text-slate-400">
            {step === 1 && "Identitas & Privasi"}
            {step === 2 && (kind === "BUILD" ? "Jadwal & Frekuensi" : "Jadwal & Waktu Mulai")}
            {step === 3 && (kind === "BUILD" ? "Metode ABC (Tiny Habits)" : "Alasan & Komitmen")}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              kind === "BUILD" ? "bg-emerald-500" : "bg-indigo-500"
            }`}
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
          {error}
        </div>
      )}

      <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
        {/* STEP 1: IDENTITAS */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-white mb-1.5">
                {kind === "BUILD"
                  ? "Nama Kebiasaan yang Ingin Dibangun *"
                  : "Nama Kebiasaan yang Ingin Dihentikan *"}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  kind === "BUILD"
                    ? "Contoh: Membaca Buku, Push-up Pagi, Meditasi, Minum Air Putih..."
                    : "Contoh: Merokok, Doomscrolling larut malam, Pornografi..."
                }
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="identityStatement" className="block text-xs font-semibold text-white mb-1.5">
                Pernyataan Identitas (Identity Statement)
              </label>
              <input
                id="identityStatement"
                type="text"
                value={identityStatement}
                onChange={(e) => setIdentityStatement(e.target.value)}
                placeholder="Contoh: Saya adalah orang yang menjaga kebugaran tubuh setiap hari"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Fokus pada siapa yang Anda inginkan, bukan hanya apa yang ingin Anda capai (James Clear).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="category" className="block text-xs font-semibold text-white mb-1.5">
                  Kategori
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#20202e] px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="HEALTH">Kesehatan & Fisik</option>
                  <option value="PRODUCTIVITY">Produktivitas & Fokus</option>
                  <option value="LEARNING">Belajar & Keterampilan</option>
                  <option value="MINDFULNESS">Ketenangan & Emosi</option>
                  <option value="DIGITAL">Digital & Gadget</option>
                  <option value="FINANCIAL">Keuangan & Belanja</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </div>

              <div>
                <label htmlFor="displayAlias" className="block text-xs font-semibold text-white mb-1.5">
                  Nama Samaran / Alias (Opsional)
                </label>
                <input
                  id="displayAlias"
                  type="text"
                  value={displayAlias}
                  onChange={(e) => setDisplayAlias(e.target.value)}
                  placeholder="Contoh: Rutinitas Emas, Langkah Pertama"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Jika BREAK: Pilihan Mode Abstain vs Reduce */}
            {kind === "BREAK" && (
              <div>
                <span className="block text-xs font-semibold text-white mb-2">
                  Metode Pendekatan
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setBreakMode("ABSTAIN")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      breakMode === "ABSTAIN"
                        ? "bg-indigo-600/30 border-indigo-500 text-white"
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-semibold text-sm mb-1">🛡️ Berhenti Total (Abstain)</div>
                    <div className="text-[11px] opacity-80">
                      Target nol kejadian. Timer presisi waktu bersih.
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBreakMode("REDUCE")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      breakMode === "REDUCE"
                        ? "bg-teal-600/30 border-teal-500 text-white"
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-semibold text-sm mb-1">📉 Kurangi Bertahap (Reduce)</div>
                    <div className="text-[11px] opacity-80">
                      Batas kuota harian yang turun berkala hingga nol.
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Privacy Level Radio */}
            <div>
              <span className="block text-xs font-semibold text-white mb-2">
                Tingkat Privasi Notifikasi
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {[
                  { level: 0, label: "Normal", desc: "Tampilkan nama kebiasaan asli" },
                  { level: 1, label: "Netral (Disarankan)", desc: "Hanya teks umum tanpa nama" },
                  { level: 2, label: "Samaran Penuh", desc: "Pakai alias di seluruh layar" },
                ].map((item) => (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => setPrivacyLevel(item.level)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      privacyLevel === item.level
                        ? "bg-emerald-600/30 border-emerald-500 text-white"
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-semibold text-sm mb-1">{item.label}</div>
                    <div className="text-[11px] opacity-80">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: JADWAL & FREKUENSI */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="checkinLocalTime" className="block text-xs font-semibold text-white mb-1.5">
                  Jam Check-in Harian (HH:mm) *
                </label>
                <input
                  id="checkinLocalTime"
                  type="text"
                  value={checkinLocalTime}
                  onChange={(e) => setCheckinLocalTime(e.target.value)}
                  placeholder="20:00"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Waktu evaluasi harian saat jendela check-in dibuka.
                </p>
              </div>

              <div>
                <label htmlFor="timezone" className="block text-xs font-semibold text-white mb-1.5">
                  Zona Waktu (IANA) *
                </label>
                <input
                  id="timezone"
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {kind === "BREAK" ? (
              <div className="space-y-4">
                {breakMode === "ABSTAIN" ? (
                  <div>
                    <label htmlFor="startedAt" className="block text-xs font-semibold text-white mb-1.5">
                      Kapan Kamu Mulai Berhenti?
                    </label>
                    <input
                      id="startedAt"
                      type="datetime-local"
                      value={startedAt}
                      onChange={(e) => setStartedAt(e.target.value)}
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Waktu ini menjadi titik awal timer &quot;Bersih Sejak&quot;.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-4 space-y-3">
                    <span className="block text-xs font-bold text-teal-300">
                      Pengaturan Kuota &amp; Penurunan Bertahap
                    </span>
                    <div>
                      <label htmlFor="reduceDailyLimit" className="block text-xs font-semibold text-white mb-1">
                        Batas Kuota Harian Awal (kejadian/hari) *
                      </label>
                      <input
                        id="reduceDailyLimit"
                        type="number"
                        min="0"
                        value={reduceDailyLimit}
                        onChange={(e) =>
                          setReduceDailyLimit(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        placeholder="Contoh: 5"
                        required
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Jumlah maksimum kejadian yang ditoleransi dalam 1 hari saat ini.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label htmlFor="reduceStepPercent" className="block text-xs font-semibold text-white mb-1">
                          Persentase Penurunan (%)
                        </label>
                        <input
                          id="reduceStepPercent"
                          type="number"
                          min="1"
                          max="100"
                          value={reduceStepPercent}
                          onChange={(e) =>
                            setReduceStepPercent(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          placeholder="10"
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="reduceStepEveryDays" className="block text-xs font-semibold text-white mb-1">
                          Setiap Interval (Hari)
                        </label>
                        <input
                          id="reduceStepEveryDays"
                          type="number"
                          min="1"
                          value={reduceStepEveryDays}
                          onChange={(e) =>
                            setReduceStepEveryDays(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          placeholder="7"
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Tipe Jadwal */}
                <div>
                  <label className="block text-xs font-semibold text-white mb-2">
                    Jadwal Pelaksanaan
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: "DAILY", label: "Setiap Hari", desc: "Konsistensi harian penuh" },
                      { type: "DAYS_OF_WEEK", label: "Hari Tertentu", desc: "Pilih hari aktif" },
                      { type: "TIMES_PER_WEEK", label: "Frekuensi Mingguan", desc: "Fleksibel X hari/minggu" },
                    ].map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setScheduleType(item.type as typeof scheduleType)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          scheduleType === item.type
                            ? "bg-emerald-600/30 border-emerald-500 text-white"
                            : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                        }`}
                      >
                        <div className="font-semibold text-xs mb-1">{item.label}</div>
                        <div className="text-[10px] opacity-75">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pemilih Hari jika DAYS_OF_WEEK */}
                {scheduleType === "DAYS_OF_WEEK" && (
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Pilih Hari Aktif
                    </label>
                    <div className="grid grid-cols-7 gap-1.5">
                      {DAY_LABELS.map((item) => {
                        const active = daysOfWeek.includes(item.day);
                        return (
                          <button
                            key={item.day}
                            type="button"
                            onClick={() => toggleDayOfWeek(item.day)}
                            className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                              active
                                ? "bg-emerald-600 border-emerald-500 text-white"
                                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pemilih Frekuensi jika TIMES_PER_WEEK */}
                {scheduleType === "TIMES_PER_WEEK" && (
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Target Frekuensi: <span className="text-emerald-400">{timesPerWeek} hari per minggu</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={6}
                      value={timesPerWeek}
                      onChange={(e) => setTimesPerWeek(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                      <span>1 hari</span>
                      <span>3 hari (disarankan)</span>
                      <span>6 hari</span>
                    </div>
                  </div>
                )}

                {/* Rest Days (Hari Istirahat Terencana) */}
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Hari Istirahat Terencana (Rest Days - Opsional)
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Hari istirahat terencana tidak mereset resilient streak Anda.
                  </p>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAY_LABELS.map((item) => {
                      const active = restDays.includes(item.day);
                      return (
                        <button
                          key={item.day}
                          type="button"
                          onClick={() => toggleRestDay(item.day)}
                          className={`py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            active
                              ? "bg-sky-600/40 border-sky-500 text-sky-200"
                              : "bg-white/5 border-white/10 text-slate-500 hover:bg-white/10"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: ALASAN (BREAK) ATAU METODE ABC (BUILD) */}
        {step === 3 && (
          <div className="space-y-4">
            {kind === "BREAK" ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Mengapa Kamu Ingin Berhenti? (Minimal 1) *
                  </label>
                  <div className="space-y-2">
                    {whyReasons.map((reason, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={reason}
                          onChange={(e) => handleReasonChange(idx, e.target.value)}
                          placeholder={`Alasan ${idx + 1} (contoh: Tubuh lebih bugar, hemat uang)...`}
                          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {whyReasons.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveReason(idx)}
                            className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/5"
                            title="Hapus alasan"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddReason}
                    className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    + Tambah Alasan Lain
                  </button>
                </div>

                <div>
                  <label htmlFor="futureSelfNote" className="block text-xs font-semibold text-white mb-1.5">
                    Pesan untuk Dirimu Saat Dorongan Datang (Opsional)
                  </label>
                  <textarea
                    id="futureSelfNote"
                    rows={2}
                    value={futureSelfNote}
                    onChange={(e) => setFutureSelfNote(e.target.value)}
                    placeholder="Ingatkan dirimu apa yang paling berharga saat godaan muncul..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="costPerOccurrence" className="block text-xs font-semibold text-white mb-1.5">
                    Estimasi Pengeluaran per Kejadian (Rp, Opsional)
                  </label>
                  <input
                    id="costPerOccurrence"
                    type="number"
                    min="0"
                    value={costPerOccurrence}
                    onChange={(e) =>
                      setCostPerOccurrence(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="Contoh: 35000"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-200 leading-relaxed">
                  <strong>Metode ABC (Tiny Habits by BJ Fogg):</strong> Buat kebiasaan begitu mudah sehingga Anda tidak memerlukan motivasi ekstra untuk memulainya.
                </div>

                {/* A: Anchor Text */}
                <div>
                  <label htmlFor="anchorText" className="block text-xs font-semibold text-white mb-1">
                    ⚓ A - Anchor (Jangkar Pemicu)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-medium">
                      Setelah saya...
                    </span>
                    <input
                      id="anchorText"
                      type="text"
                      value={anchorText}
                      onChange={(e) => setAnchorText(e.target.value)}
                      placeholder="menyeduh kopi pagi / tiba di meja kerja / menyikat gigi"
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-28 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Pilih rutinitas harian yang sudah pasti Anda lakukan sebagai penanda waktu.
                  </p>
                </div>

                {/* B: Tiny Behavior */}
                <div>
                  <label htmlFor="tinyBehavior" className="block text-xs font-semibold text-white mb-1">
                    ⚡ B - Behavior (Perilaku Mini) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-medium">
                      Saya akan...
                    </span>
                    <input
                      id="tinyBehavior"
                      type="text"
                      value={tinyBehavior}
                      onChange={(e) => setTinyBehavior(e.target.value)}
                      placeholder="membaca 1 halaman / melakukan 2 push-up / menarik 3 napas dalam"
                      required
                      className="w-full rounded-xl border border-emerald-500/40 bg-white/5 pl-24 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Kecilkan sampai membutuhkan waktu kurang dari 30 detik untuk diselesaikan.
                  </p>
                </div>

                {/* C: Celebration */}
                <div>
                  <label htmlFor="celebrationText" className="block text-xs font-semibold text-white mb-1">
                    🎉 C - Celebration (Perayaan Emosional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-medium">
                      Lalu saya...
                    </span>
                    <input
                      id="celebrationText"
                      type="text"
                      value={celebrationText}
                      onChange={(e) => setCelebrationText(e.target.value)}
                      placeholder="tersenyum lebar dan berkata 'Mantap!' / tepuk dada sendiri"
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-24 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Emosi positif langsung mengunci jalur saraf kebiasaan (Neuroplasticity).
                  </p>
                </div>

                {/* Versi Bertahap (Elastic Habits) */}
                <div className="pt-2 border-t border-white/10">
                  <span className="block text-xs font-semibold text-white mb-2">
                    Versi Bertahap (Elastic Habits - Opsional)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-emerald-400 font-semibold block mb-1">
                        Mini (Tiny)
                      </label>
                      <input
                        type="text"
                        value={tinyVersion}
                        onChange={(e) => setTinyVersion(e.target.value)}
                        placeholder="1 halaman"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-slate-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-indigo-400 font-semibold block mb-1">
                        Standar (Standard)
                      </label>
                      <input
                        type="text"
                        value={standardVersion}
                        onChange={(e) => setStandardVersion(e.target.value)}
                        placeholder="1 bab"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-slate-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-amber-400 font-semibold block mb-1">
                        Ekstra (Stretch)
                      </label>
                      <input
                        type="text"
                        value={stretchVersion}
                        onChange={(e) => setStretchVersion(e.target.value)}
                        placeholder="3 bab"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-slate-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/10">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2)}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
            >
              ← Sebelumnya
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
            >
              Batal
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 text-xs font-semibold text-white shadow-lg transition-colors"
            >
              Lanjut →
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className={`rounded-xl px-7 py-2.5 text-xs font-semibold text-white shadow-lg transition-all disabled:opacity-50 ${
                kind === "BUILD"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                  : "bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500"
              }`}
            >
              {loading ? "Menyimpan..." : kind === "BUILD" ? "Mulai Bangun Kebiasaan" : "Mulai Kebiasaan Baru"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
