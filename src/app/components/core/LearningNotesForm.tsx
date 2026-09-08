"use client";

import { useState, KeyboardEvent } from "react";
import { Icon } from "@/app/components/ui/Icon";

export type LearningNotesData = {
  activity: string;
  keyLearnings: string;
  confusedPoints: string;
  nextAction: string;
  concepts: string[];
  understanding: number;
};

const UNDERSTANDING_LABELS = ["😕 Bingung", "🤔 Sedikit paham", "😐 Cukup", "😊 Paham", "🤩 Sangat paham!"];
const UNDERSTANDING_COLORS = [
  "border-rose-500/30 bg-rose-500/15 text-rose-300",
  "border-amber-500/30 bg-amber-500/15 text-amber-300",
  "border-white/[0.15] bg-white/[0.08] text-white",
  "border-[#8B5CF6]/30 bg-[#8B5CF6]/15 text-[#d0bcff]",
  "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
];

export function LearningNotesForm({
  taskName,
  onSubmit,
  onCancel,
  loading,
}: {
  taskName: string;
  onSubmit: (data: LearningNotesData) => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const [activity, setActivity] = useState("");
  const [keyLearnings, setKeyLearnings] = useState("");
  const [confusedPoints, setConfusedPoints] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [concepts, setConcepts] = useState<string[]>([]);
  const [conceptInput, setConceptInput] = useState("");
  const [understanding, setUnderstanding] = useState(3);

  function addConcept() {
    const trimmed = conceptInput.trim();
    if (!trimmed || concepts.length >= 6 || concepts.includes(trimmed)) return;
    setConcepts([...concepts, trimmed]);
    setConceptInput("");
  }

  function removeConcept(concept: string) {
    setConcepts(concepts.filter((c) => c !== concept));
  }

  function onConceptKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addConcept();
    }
    if (e.key === "Backspace" && !conceptInput && concepts.length > 0) {
      setConcepts(concepts.slice(0, -1));
    }
  }

  function handleSubmit() {
    onSubmit({ activity, keyLearnings, confusedPoints, nextAction, concepts, understanding });
  }

  const inputBase =
    "w-full resize-none rounded-xl border border-white/[0.08] bg-[#0B0D13] px-3.5 py-2.5 text-[13px] text-white placeholder:text-zinc-500 outline-none transition-all focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]";

  return (
    <div className="note-card-in space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6] to-indigo-500 text-white shadow-lg">
          <Icon name="brain" size={18} />
        </span>
        <div>
          <h3 className="text-[15px] font-bold text-white">
            Apa yang Anda pelajari?
          </h3>
          <p className="mt-0.5 text-[12px] text-[#94a3b8]">
            Dari sesi: <span className="font-medium text-[#d0bcff]">{taskName}</span>
          </p>
        </div>
      </div>

      {/* ── Section 1: Aktivitas ─────────────────────── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-4 shadow-lg">
        <label className="mb-2 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#8B5CF6]/15 text-[#d0bcff]">
            <Icon name="pen" size={12} />
          </span>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#94a3b8]">
            Aktivitas sesi
          </span>
        </label>
        <textarea
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          placeholder="Apa yang Anda kerjakan dalam sesi ini?"
          rows={2}
          className={inputBase}
        />
      </div>

      {/* ── Section 2: Key Learnings ─────────────────── */}
      <div className="rounded-2xl border border-[#8B5CF6]/30 bg-gradient-to-br from-[#131825] to-[#8B5CF6]/[0.05] p-4 shadow-lg">
        <label className="mb-2 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#8B5CF6]/20 text-[#d0bcff]">
            <Icon name="lightbulb" size={12} />
          </span>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#d0bcff]">
            Pelajaran utama ✨
          </span>
        </label>
        <textarea
          value={keyLearnings}
          onChange={(e) => setKeyLearnings(e.target.value)}
          placeholder="Insight atau konsep terpenting yang Anda dapatkan hari ini..."
          rows={3}
          className={inputBase}
        />

        {/* Concept chips / keyword tags */}
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-mono font-semibold text-[#94a3b8]">
            Kata kunci / konsep penting <span className="text-zinc-500">(maks 6)</span>
          </p>
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/[0.08] bg-[#0B0D13] px-3 py-2.5 focus-within:border-[#8B5CF6] focus-within:ring-1 focus-within:ring-[#8B5CF6] transition-all min-h-[42px]">
            {concepts.map((concept) => (
              <span
                key={concept}
                className="tag-pop inline-flex items-center gap-1 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 px-2.5 py-0.5 text-[11px] font-mono font-semibold text-[#d0bcff]"
              >
                {concept}
                <button
                  type="button"
                  onClick={() => removeConcept(concept)}
                  aria-label={`Hapus ${concept}`}
                  className="ml-0.5 text-[#d0bcff]/70 hover:text-white transition-colors"
                >
                  <Icon name="x" size={10} />
                </button>
              </span>
            ))}
            {concepts.length < 6 && (
              <input
                type="text"
                value={conceptInput}
                onChange={(e) => setConceptInput(e.target.value)}
                onKeyDown={onConceptKeyDown}
                onBlur={addConcept}
                placeholder={concepts.length === 0 ? "Ketik konsep, tekan Enter…" : "+ Tambah"}
                className="min-w-0 flex-1 bg-transparent text-[12px] text-white placeholder:text-zinc-500 outline-none"
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Section 3: Masih bingung? ─────────────────── */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#131825] to-amber-500/[0.05] p-4 shadow-lg">
        <label className="mb-2 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
            <Icon name="alert" size={12} />
          </span>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-300">
            Masih bingung?
          </span>
        </label>
        <textarea
          value={confusedPoints}
          onChange={(e) => setConfusedPoints(e.target.value)}
          placeholder="Apa yang belum dipahami? Pertanyaan yang perlu dijawab berikutnya..."
          rows={2}
          className={inputBase}
        />
      </div>

      {/* ── Section 4: Next Action ───────────────────── */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#131825] to-emerald-500/[0.05] p-4 shadow-lg">
        <label className="mb-2 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
            <Icon name="arrowRight" size={12} />
          </span>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-300">
            Langkah berikutnya
          </span>
        </label>
        <textarea
          value={nextAction}
          onChange={(e) => setNextAction(e.target.value)}
          placeholder="Apa yang akan Anda lakukan pertama kali di sesi berikutnya?"
          rows={2}
          className={inputBase}
        />
      </div>

      {/* ── Section 5: Understanding meter ──────────── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-4 shadow-lg">
        <p className="mb-3 text-[11px] font-mono font-bold uppercase tracking-wider text-[#94a3b8]">
          Seberapa paham Anda setelah sesi ini?
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {UNDERSTANDING_LABELS.map((label, idx) => {
            const val = idx + 1;
            const isSelected = understanding === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => setUnderstanding(val)}
                aria-pressed={isSelected}
                aria-label={label}
                className={`group flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[10px] font-semibold transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? `${UNDERSTANDING_COLORS[idx]} scale-105 shadow-lg`
                    : "border-white/[0.06] bg-[#0B0D13] text-[#94a3b8] hover:border-white/[0.15] hover:text-white"
                }`}
              >
                <span className="text-lg leading-none">
                  {label.split(" ")[0]}
                </span>
                <span className="hidden text-center leading-tight sm:block">
                  {label.split(" ").slice(1).join(" ")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#1e1f26] px-4 text-[13px] font-medium text-white transition-all hover:bg-[#282a36] disabled:opacity-50"
        >
          Kembali
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="relative inline-flex h-9 items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#8B5CF6] to-indigo-600 px-5 text-[13px] font-semibold text-white shadow-lg transition-all hover:opacity-95 disabled:opacity-50 active:scale-[0.97]"
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Icon name="check" size={15} strokeWidth={2.5} />
          )}
          Selesaikan & Simpan
        </button>
      </div>
    </div>
  );
}

/* ─── Display Card: shows saved learning notes in session history ─── */
export function LearningNoteCard({
  activity,
  keyLearnings,
  confusedPoints,
  nextAction,
  understanding,
  durationMinutes,
  startedAt,
}: {
  activity?: string | null;
  keyLearnings?: string | null;
  confusedPoints?: string | null;
  nextAction?: string | null;
  understanding?: number | null;
  durationMinutes?: number | null;
  startedAt: Date;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasNotes = !!(keyLearnings || confusedPoints || nextAction);
  const label = understanding ? UNDERSTANDING_LABELS[understanding - 1] : null;

  function formatDuration(min: number | null | undefined) {
    if (!min) return "—";
    if (min < 60) return `${min} mnt`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h} jam` : `${h}j ${m}m`;
  }

  function formatTime(d: Date) {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
  }

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
        hasNotes
          ? "border-white/[0.1] bg-[#131825] shadow-lg"
          : "border-white/[0.08] bg-[#131825]"
      }`}
    >
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
            durationMinutes
              ? "bg-[#8B5CF6]/15 text-[#d0bcff] border-[#8B5CF6]/30"
              : "bg-white/[0.06] text-[#94a3b8] border-white/[0.08]"
          }`}
        >
          <Icon name="clock" size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white">
            {activity || "Sesi fokus"}
          </p>
          <p className="text-[11px] font-mono text-[#94a3b8]">
            {formatTime(startedAt)} · {formatDuration(durationMinutes)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {label && (
            <span className="rounded-md border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 text-[11px] font-mono font-semibold text-white">
              {label.split(" ")[0]}
            </span>
          )}
          {hasNotes && (
            <span className="rounded-md border border-[#8B5CF6]/30 bg-[#8B5CF6]/15 px-2 py-0.5 text-[11px] font-mono font-semibold text-[#d0bcff] flex items-center gap-1">
              <Icon name="bookOpen" size={10} />
              Catatan
            </span>
          )}
          <Icon
            name={expanded ? "chevronUp" : "chevronDown"}
            size={14}
            className="text-[#94a3b8]"
          />
        </div>
      </button>

      {/* Expanded notes */}
      {expanded && hasNotes && (
        <div className="animate-in-soft border-t border-white/[0.08] bg-[#0B0D13]/60 px-4 pb-4 pt-3 space-y-3">
          {keyLearnings && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#d0bcff]">
                <Icon name="lightbulb" size={11} /> Pelajaran utama
              </p>
              <p className="text-[13px] leading-relaxed text-[#e2e2eb]">{keyLearnings}</p>
            </div>
          )}
          {confusedPoints && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                <Icon name="alert" size={11} /> Masih bingung
              </p>
              <p className="text-[13px] leading-relaxed text-amber-200/90">{confusedPoints}</p>
            </div>
          )}
          {nextAction && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#4edea3]">
                <Icon name="arrowRight" size={11} /> Langkah berikutnya
              </p>
              <p className="text-[13px] leading-relaxed text-[#4edea3]">{nextAction}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
