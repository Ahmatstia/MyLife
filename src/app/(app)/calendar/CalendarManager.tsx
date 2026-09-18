"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/app/components/ui/Toast";
import { BackButton } from "@/app/components/ui/BackButton";

// ── Types ──────────────────────────────────────────────────────────
export interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  startTime: string | Date;
  endTime: string | Date;
  isAllDay: boolean;
  eventType: string;
  recurrence?: string | null;
  reminderMinutes?: number | null;
  ignoreQuietHours?: boolean;
  isCompleted?: boolean;
  completedAt?: string | Date | null;
  location?: string | null;
  taskId?: string | null;
  projectId?: string | null;
  task?: { id: string; title: string } | null;
  project?: { id: string; title: string } | null;
}

export interface ProjectOption {
  id: string;
  title: string;
}

export interface TaskOption {
  id: string;
  title: string;
  dueDate?: string | null;
  priority?: string;
  status?: string;
}

interface Props {
  initialEvents: EventItem[];
  projects?: ProjectOption[];
  tasks?: TaskOption[];
  defaultReminderMinutes?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────
function getWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

function formatTimeStr(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatLocalDateOnly(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function getDayLabel(selectedDay: Date): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (sameDay(selectedDay, now)) return "Hari Ini";
  const tmr = new Date(now);
  tmr.setDate(now.getDate() + 1);
  if (sameDay(selectedDay, tmr)) return "Besok";
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (sameDay(selectedDay, yest)) return "Kemarin";
  return selectedDay.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Project recurring events onto a target day */
function projectRecurringEvents(events: EventItem[], targetDay: Date): EventItem[] {
  const result: EventItem[] = [];
  const dayStart = new Date(targetDay);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDay);
  dayEnd.setHours(23, 59, 59, 999);

  for (const ev of events) {
    const start = new Date(ev.startTime);
    const end = new Date(ev.endTime);

    if (!ev.recurrence || ev.recurrence === "NONE") {
      if (start <= dayEnd && end >= dayStart) result.push(ev);
      continue;
    }

    if (sameDay(start, targetDay)) {
      result.push(ev);
      continue;
    }

    if (start > dayEnd) continue;

    const matches =
      ev.recurrence === "DAILY" ||
      (ev.recurrence === "WEEKLY" && start.getDay() === targetDay.getDay()) ||
      (ev.recurrence === "MONTHLY" && start.getDate() === targetDay.getDate());

    if (!matches) continue;

    const durationMs = Math.max(0, end.getTime() - start.getTime());
    const projStart = new Date(targetDay);
    projStart.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0);
    const projEnd = new Date(projStart.getTime() + durationMs);

    result.push({ ...ev, startTime: projStart, endTime: projEnd });
  }

  return result.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}

// ── Category Config ──────────────────────────────────────────────────
export const CATEGORY_MAP: Record<
  string,
  {
    label: string;
    dot: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    cardBg: string;
    cardBorder: string;
    cardHover: string;
    icon: string;
    glow: string;
  }
> = {
  BLOCKED: {
    label: "Fokus",
    dot: "#c084fc",
    badgeBg: "bg-purple-500/15",
    badgeBorder: "border-purple-500/30",
    badgeText: "text-purple-300",
    cardBg: "bg-purple-950/20",
    cardBorder: "border-purple-500/25",
    cardHover: "hover:border-purple-500/40 hover:bg-purple-950/30",
    icon: "🎯",
    glow: "shadow-[0_0_20px_rgba(192,132,252,0.15)]",
  },
  WORK: {
    label: "Pekerjaan",
    dot: "#818cf8",
    badgeBg: "bg-indigo-500/15",
    badgeBorder: "border-indigo-500/30",
    badgeText: "text-indigo-300",
    cardBg: "bg-indigo-950/20",
    cardBorder: "border-indigo-500/25",
    cardHover: "hover:border-indigo-500/40 hover:bg-indigo-950/30",
    icon: "💼",
    glow: "",
  },
  PERSONAL: {
    label: "Pribadi",
    dot: "#34d399",
    badgeBg: "bg-emerald-500/15",
    badgeBorder: "border-emerald-500/30",
    badgeText: "text-emerald-300",
    cardBg: "bg-emerald-950/20",
    cardBorder: "border-emerald-500/25",
    cardHover: "hover:border-emerald-500/40 hover:bg-emerald-950/30",
    icon: "🌱",
    glow: "",
  },
  TASK_DEADLINE: {
    label: "Tenggat",
    dot: "#fb7185",
    badgeBg: "bg-rose-500/15",
    badgeBorder: "border-rose-500/30",
    badgeText: "text-rose-300",
    cardBg: "bg-rose-950/20",
    cardBorder: "border-rose-500/25",
    cardHover: "hover:border-rose-500/40 hover:bg-rose-950/30",
    icon: "🔴",
    glow: "",
  },
  REMINDER: {
    label: "Pengingat",
    dot: "#fbbf24",
    badgeBg: "bg-amber-500/15",
    badgeBorder: "border-amber-500/30",
    badgeText: "text-amber-300",
    cardBg: "bg-amber-950/20",
    cardBorder: "border-amber-500/25",
    cardHover: "hover:border-amber-500/40 hover:bg-amber-950/30",
    icon: "🔔",
    glow: "",
  },
};

const CATEGORIES = [
  { id: "ALL", label: "Semua", icon: "✨" },
  ...Object.entries(CATEGORY_MAP).map(([id, v]) => ({ id, label: v.label, icon: v.icon })),
];

const recurrenceLabel: Record<string, string> = {
  DAILY: "Setiap hari",
  WEEKLY: "Setiap minggu",
  MONTHLY: "Setiap bulan",
};

// ── TO-DO LIST VIEW ──────────────────────────────────────────────────
function ToDoListView({
  events,
  targetDay,
  onToggleComplete,
  onQuickAdd,
  onSelectEvent,
  onDeleteEvent,
  onOpenModal,
}: {
  events: EventItem[];
  targetDay: Date;
  onToggleComplete: (id: string, currentCompleted: boolean) => Promise<void>;
  onQuickAdd: (
    title: string,
    timeMode: "START_ONLY" | "ALL_DAY",
    timeStr: string,
    category: string
  ) => Promise<void>;
  onSelectEvent: (ev: EventItem) => void;
  onDeleteEvent: (id: string) => Promise<void>;
  onOpenModal: () => void;
}) {
  const [quickTitle, setQuickTitle] = useState("");
  const [quickMode, setQuickMode] = useState<"START_ONLY" | "ALL_DAY">("START_ONLY");
  const [quickTime, setQuickTime] = useState("05:00");
  const [quickCategory, setQuickCategory] = useState("PERSONAL");
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "DONE">("ALL");

  const dayEvents = useMemo(
    () => projectRecurringEvents(events, targetDay),
    [events, targetDay]
  );

  const totalCount = dayEvents.length;
  const completedCount = dayEvents.filter((e) => e.isCompleted).length;
  const pendingCount = totalCount - completedCount;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const scheduledEvents = dayEvents
    .filter((e) => !e.isAllDay)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const allDayEvents = dayEvents.filter((e) => e.isAllDay);

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTitle.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onQuickAdd(quickTitle.trim(), quickMode, quickTime, quickCategory);
      setQuickTitle("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-7">
      {/* ── QUICK ADD BAR ── */}
      <div className="bg-zinc-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-white/[0.08] shadow-xl flex flex-col gap-3.5">
        <form onSubmit={handleFormSubmit} className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400 font-bold text-base">
              +
            </span>
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Tulis to-do atau agenda baru... (cth: Bangun subuh, Baca jurnal, Beli suplemen)"
              className="w-full bg-zinc-950/70 pl-9 pr-3.5 py-3 rounded-2xl text-sm text-zinc-100 border border-white/[0.08] placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-inner"
            />
          </div>

          {/* Quick options */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {/* Mode switch */}
            <div className="flex items-center bg-zinc-950/80 p-1 rounded-2xl border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setQuickMode("START_ONLY")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  quickMode === "START_ONLY"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                ⏰ Jam
              </button>
              <button
                type="button"
                onClick={() => setQuickMode("ALL_DAY")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  quickMode === "ALL_DAY"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                📝 Bebas
              </button>
            </div>

            {quickMode === "START_ONLY" && (
              <input
                type="time"
                value={quickTime}
                onChange={(e) => setQuickTime(e.target.value)}
                className="bg-zinc-950/80 px-3 py-2 rounded-xl text-xs font-semibold text-purple-300 border border-white/[0.08] focus:outline-none focus:border-purple-500 cursor-pointer"
              />
            )}

            <select
              value={quickCategory}
              onChange={(e) => setQuickCategory(e.target.value)}
              className="bg-zinc-950/80 px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 border border-white/[0.08] focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="PERSONAL">🌱 Pribadi</option>
              <option value="BLOCKED">🎯 Fokus</option>
              <option value="WORK">💼 Pekerjaan</option>
              <option value="REMINDER">🔔 Pengingat</option>
            </select>

            <button
              type="submit"
              disabled={submitting || !quickTitle.trim()}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-purple-600/25 active:scale-95 disabled:opacity-40 shrink-0"
            >
              {submitting ? "Menyimpan..." : "+ Tambah"}
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between text-xs text-zinc-400 pt-0.5">
          <span className="flex items-center gap-1.5">
            <span className="text-amber-400">💡</span>
            <span>To-do dengan jam cukup tentukan jam mulai, lalu ceklis saat aktivitas selesai!</span>
          </span>
          <button
            type="button"
            onClick={onOpenModal}
            className="text-purple-400 hover:text-purple-300 hover:underline font-medium text-xs transition-colors shrink-0"
          >
            Form Lengkap &amp; Rutinitas ↗
          </button>
        </div>
      </div>

      {/* ── PROGRESS & STATS BENTO ── */}
      <div className="bg-zinc-900/60 p-4 sm:p-5 rounded-3xl border border-white/[0.06] flex flex-col gap-3 shadow-inner">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <span className="text-sm font-bold text-emerald-400">{completedCount}</span>
            <span className="text-zinc-400">dari {totalCount} To-Do Selesai</span>
            {totalCount > 0 && progressPct === 100 && (
              <span className="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 rounded-full text-[11px] font-semibold animate-pulse">
                Semua Beres! 🎉
              </span>
            )}
          </div>

          {/* Filter status */}
          <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-2xl border border-white/[0.06]">
            {(
              [
                { id: "ALL", label: `Semua (${totalCount})` },
                { id: "PENDING", label: `Belum (${pendingCount})` },
                { id: "DONE", label: `Selesai (${completedCount})` },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatusFilter(s.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === s.id
                    ? "bg-purple-600/30 text-purple-200 border border-purple-500/30 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-white/[0.04]">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ── TO-DO LIST CONTENT ── */}
      {totalCount === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3 bg-zinc-900/30 rounded-3xl border border-dashed border-white/10">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl">
            📋
          </div>
          <h3 className="text-base font-semibold text-white">
            Belum ada to-do untuk hari ini
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
            Mulai susun harimu dari bangun pagi, sarapan, belajar, hingga tidur malam. Tulis di kotak tambah to-do di atas!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* 1. SCHEDULED TO-DOS */}
          {scheduledEvents.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 tracking-wider uppercase">
                <span>⏰ To-Do Berjadwal</span>
                <span className="text-zinc-500">({scheduledEvents.length})</span>
              </div>

              <div className="flex flex-col gap-2.5">
                {scheduledEvents
                  .filter((ev) => {
                    if (statusFilter === "PENDING") return !ev.isCompleted;
                    if (statusFilter === "DONE") return ev.isCompleted;
                    return true;
                  })
                  .map((ev) => {
                    const evStart = new Date(ev.startTime);
                    const evEnd = new Date(ev.endTime);
                    const isRange =
                      evEnd.getTime() - evStart.getTime() > 60000 &&
                      (evEnd.getHours() !== evStart.getHours() ||
                        evEnd.getMinutes() !== evStart.getMinutes());
                    const cat = CATEGORY_MAP[ev.eventType] || CATEGORY_MAP["PERSONAL"];
                    const isDone = !!ev.isCompleted;

                    return (
                      <div
                        key={ev.id}
                        className={`group flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all ${
                          isDone
                            ? "bg-zinc-950/40 border-white/[0.04] opacity-60 hover:opacity-90"
                            : `${cat.cardBg} ${cat.cardBorder} ${cat.cardHover} shadow-sm`
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={() => onToggleComplete(ev.id, isDone)}
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                              isDone
                                ? "bg-emerald-400 border-emerald-400 text-zinc-950 shadow-md shadow-emerald-400/30"
                                : "border-white/20 bg-zinc-900/60 hover:border-emerald-400 text-transparent hover:text-emerald-400"
                            }`}
                            title={isDone ? "Tandai belum selesai" : "Tandai selesai"}
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          </button>

                          {/* Time badge */}
                          <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-xl bg-zinc-950/80 border border-white/[0.06] text-purple-300 font-mono font-semibold shrink-0">
                            <span>{formatTimeStr(evStart)}</span>
                            {isRange && (
                              <span className="text-zinc-500 font-normal">
                                –{formatTimeStr(evEnd)}
                              </span>
                            )}
                          </div>

                          {/* Title & tags */}
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-sm font-semibold truncate ${
                                  isDone ? "line-through text-zinc-500" : "text-white"
                                }`}
                              >
                                {ev.title}
                              </span>
                              {ev.recurrence && ev.recurrence !== "NONE" && (
                                <span
                                  className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 shrink-0 font-medium"
                                  title={recurrenceLabel[ev.recurrence]}
                                >
                                  🔁 {recurrenceLabel[ev.recurrence] || "Rutin"}
                                </span>
                              )}
                            </div>
                            {ev.description && (
                              <span className="text-xs text-zinc-400 truncate mt-0.5">
                                {ev.description}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right side actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full ${cat.badgeBg} ${cat.badgeText} border ${cat.badgeBorder} hidden sm:inline-block font-medium`}
                          >
                            {cat.icon} {cat.label}
                          </span>

                          {/* Link to focus mode if tied to a task or important */}
                          {ev.taskId && (
                            <Link
                              href={`/focus?taskId=${ev.taskId}`}
                              className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all flex items-center gap-1"
                              title="Buka sesi fokus mendalam untuk tugas ini"
                            >
                              <span>Fokus</span>
                              <span>🍅</span>
                            </Link>
                          )}

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => onSelectEvent(ev)}
                              className="p-1.5 hover:bg-white/[0.08] rounded-lg text-zinc-400 hover:text-white transition-colors"
                              title="Edit / Detail"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteEvent(ev.id)}
                              className="p-1.5 hover:bg-rose-500/20 rounded-lg text-zinc-400 hover:text-rose-400 transition-colors"
                              title="Hapus"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 2. ANYTIME / ALL-DAY TO-DOS */}
          {allDayEvents.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 tracking-wider uppercase">
                <span>📌 To-Do Fleksibel (Kapan Saja Hari Ini)</span>
                <span className="text-zinc-500">({allDayEvents.length})</span>
              </div>

              <div className="flex flex-col gap-2.5">
                {allDayEvents
                  .filter((ev) => {
                    if (statusFilter === "PENDING") return !ev.isCompleted;
                    if (statusFilter === "DONE") return ev.isCompleted;
                    return true;
                  })
                  .map((ev) => {
                    const cat = CATEGORY_MAP[ev.eventType] || CATEGORY_MAP["PERSONAL"];
                    const isDone = !!ev.isCompleted;

                    return (
                      <div
                        key={ev.id}
                        className={`group flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all ${
                          isDone
                            ? "bg-zinc-950/40 border-white/[0.04] opacity-60 hover:opacity-90"
                            : "bg-zinc-900/60 border-white/[0.06] hover:border-emerald-500/40 shadow-sm"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={() => onToggleComplete(ev.id, isDone)}
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                              isDone
                                ? "bg-emerald-400 border-emerald-400 text-zinc-950 shadow-md shadow-emerald-400/30"
                                : "border-white/20 bg-zinc-900/60 hover:border-emerald-400 text-transparent hover:text-emerald-400"
                            }`}
                            title={isDone ? "Tandai belum selesai" : "Tandai selesai"}
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          </button>

                          <span className="text-xs px-2.5 py-1 rounded-xl bg-zinc-950/80 text-zinc-400 border border-white/[0.06] shrink-0 font-medium">
                            Bebas Jam
                          </span>

                          <div className="flex flex-col min-w-0">
                            <span
                              className={`text-sm font-semibold truncate ${
                                isDone ? "line-through text-zinc-500" : "text-white"
                              }`}
                            >
                              {ev.title}
                            </span>
                            {ev.description && (
                              <span className="text-xs text-zinc-400 truncate mt-0.5">
                                {ev.description}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full ${cat.badgeBg} ${cat.badgeText} border ${cat.badgeBorder} hidden sm:inline-block font-medium`}
                          >
                            {cat.icon} {cat.label}
                          </span>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => onSelectEvent(ev)}
                              className="p-1.5 hover:bg-white/[0.08] rounded-lg text-zinc-400 hover:text-white transition-colors"
                              title="Edit / Detail"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteEvent(ev.id)}
                              className="p-1.5 hover:bg-rose-500/20 rounded-lg text-zinc-400 hover:text-rose-400 transition-colors"
                              title="Hapus"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── DAILY FLOW VIEW ──────────────────────────────────────────────────
const TIMELINE_START = 4;
const TIMELINE_END = 23;
const PX_PER_HOUR = 72;

function DailyFlowView({
  events,
  now,
  targetDay,
  onAddAtHour,
  onSelectEvent,
  onToggleComplete,
}: {
  events: EventItem[];
  now: Date;
  targetDay: Date;
  onAddAtHour: (h: number) => void;
  onSelectEvent: (ev: EventItem) => void;
  onToggleComplete: (id: string, currentCompleted: boolean) => Promise<void>;
}) {
  const dayEvents = useMemo(
    () => projectRecurringEvents(events, targetDay),
    [events, targetDay]
  );
  const isToday = sameDay(targetDay, now);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTopPx = ((nowMinutes - TIMELINE_START * 60) / 60) * PX_PER_HOUR;

  const done = dayEvents.filter((e) => e.isCompleted || new Date(e.endTime) <= now).length;
  const active = dayEvents.find(
    (e) => !e.isCompleted && new Date(e.startTime) <= now && now <= new Date(e.endTime)
  );
  const upcoming = dayEvents.filter((e) => !e.isCompleted && new Date(e.startTime) > now).length;

  const productiveMs = dayEvents.reduce((sum, e) => {
    const s = new Date(e.startTime);
    const en = new Date(e.endTime);
    if (en <= now) return sum + Math.max(0, en.getTime() - s.getTime());
    if (s <= now && now <= en) return sum + Math.max(0, now.getTime() - s.getTime());
    return sum;
  }, 0);
  const productiveMin = Math.round(productiveMs / 60000);
  const productiveHStr =
    productiveMin >= 60
      ? `${Math.floor(productiveMin / 60)}j ${productiveMin % 60}m`
      : `${productiveMin}m`;

  const hours = Array.from(
    { length: TIMELINE_END - TIMELINE_START + 1 },
    (_, i) => TIMELINE_START + i
  );

  return (
    <div className="flex flex-col w-full">
      {/* Summary strip */}
      <div className="bg-zinc-900/90 px-5 py-3.5 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {active ? (
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-semibold text-zinc-400">SEKARANG:</span>
              <span className="text-xs font-bold text-white">
                {active.title}
              </span>
              <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                {formatTimeStr(new Date(active.startTime))}–{formatTimeStr(new Date(active.endTime))}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-600" />
              <span className="text-xs text-zinc-400">
                Tidak ada aktivitas terjadwal saat ini
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="text-emerald-400">✓ {done} Selesai</span>
          <span className="text-zinc-400">⏳ {upcoming} Mendatang</span>
          <span className="text-purple-300">⚡ {productiveHStr} Produktif</span>
        </div>
      </div>

      {/* Timeline container */}
      <div className="relative overflow-y-auto max-h-[75vh] bg-zinc-950/50 select-none">
        <div
          className="relative"
          style={{ height: `${hours.length * PX_PER_HOUR}px` }}
        >
          {/* Real-time red indicator line */}
          {isToday &&
            now.getHours() >= TIMELINE_START &&
            now.getHours() <= TIMELINE_END && (
              <div
                className="absolute left-0 right-0 z-30 pointer-events-none flex items-center transition-all duration-1000"
                style={{ top: `${nowTopPx}px` }}
              >
                <div className="w-16 pr-2.5 flex items-center justify-end">
                  <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-950/90 px-1.5 py-0.5 rounded border border-rose-500/40 shadow-sm">
                    {formatTimeStr(now)}
                  </span>
                </div>
                <div className="flex-1 relative flex items-center">
                  <div className="h-[2px] w-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                  <div className="absolute left-3 -top-2 flex items-center gap-1 bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    <span>SEKARANG</span>
                  </div>
                </div>
              </div>
            )}

          {/* Hour grid lines */}
          {hours.map((h, i) => {
            const isCurrent = isToday && now.getHours() === h;
            return (
              <div
                key={h}
                className={`absolute left-0 right-0 border-b border-white/[0.04] flex items-start ${
                  isCurrent ? "bg-purple-500/5" : ""
                }`}
                style={{
                  top: `${i * PX_PER_HOUR}px`,
                  height: `${PX_PER_HOUR}px`,
                }}
              >
                <div className="w-16 pt-1.5 pr-3 text-right font-mono text-xs text-zinc-500 select-none border-r border-white/[0.04] shrink-0">
                  {String(h).padStart(2, "0")}:00
                </div>

                {/* Quick add click area */}
                <button
                  type="button"
                  onClick={() => onAddAtHour(h)}
                  className="absolute left-16 right-0 top-0 bottom-0 group flex items-center hover:bg-white/[0.02] transition-colors"
                  title={`Tambah jadwal pukul ${String(h).padStart(2, "0")}:00`}
                >
                  <span className="opacity-0 group-hover:opacity-100 ml-3 text-xs text-zinc-400 font-medium transition-opacity flex items-center gap-1.5">
                    <span className="text-purple-400 font-bold">+</span> Tambah di jam {String(h).padStart(2, "0")}:00
                  </span>
                </button>
              </div>
            );
          })}

          {/* Event cards */}
          <div className="absolute left-16 right-3 top-0 bottom-0 pointer-events-none">
            {dayEvents.map((ev) => {
              const evStart = new Date(ev.startTime);
              const evEnd = new Date(ev.endTime);
              const startH = evStart.getHours();
              const startM = evStart.getMinutes();
              const endH = evEnd.getHours();
              const endM = evEnd.getMinutes();

              const topPx = Math.max(
                0,
                (startH - TIMELINE_START) * PX_PER_HOUR + (startM / 60) * PX_PER_HOUR
              );
              const durationMin = Math.max(
                20,
                endH * 60 + endM - (startH * 60 + startM)
              );
              const heightPx = Math.max(34, (durationMin / 60) * PX_PER_HOUR);

              const isOngoing = !ev.isCompleted && evStart <= now && now <= evEnd;
              const isDone = !!ev.isCompleted;
              const cat = CATEGORY_MAP[ev.eventType] ?? CATEGORY_MAP["BLOCKED"];
              const hasRecurrence = ev.recurrence && ev.recurrence !== "NONE";

              return (
                <div
                  key={ev.id}
                  onClick={() => onSelectEvent(ev)}
                  className={`pointer-events-auto absolute left-0 right-0 rounded-xl px-3.5 py-2 cursor-pointer transition-all hover:scale-[1.008] hover:z-20 flex flex-col justify-between overflow-hidden border ${cat.cardBg} ${cat.cardBorder} ${isOngoing ? cat.glow : ""} ${isDone ? "opacity-50" : ""}`}
                  style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Checkbox button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleComplete(ev.id, isDone);
                        }}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                          isDone
                            ? "bg-emerald-400 border-emerald-400 text-zinc-950 shadow-xs"
                            : "border-white/30 bg-zinc-900/60 hover:border-emerald-400 text-transparent hover:text-emerald-400"
                        }`}
                        title={isDone ? "Tandai belum selesai" : "Tandai selesai"}
                      >
                        ✓
                      </button>

                      {isOngoing && (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          BERJALAN
                        </span>
                      )}
                      <span className={`text-xs font-semibold truncate ${cat.badgeText} ${isDone ? "line-through text-zinc-500" : ""}`}>
                        {ev.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasRecurrence && (
                        <span
                          className="text-[10px] bg-white/[0.08] text-zinc-300 px-1.5 py-0.5 rounded border border-white/[0.06]"
                          title={recurrenceLabel[ev.recurrence!]}
                        >
                          🔁
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-zinc-400">
                        {formatTimeStr(evStart)}
                        {evEnd.getTime() !== evStart.getTime() && `–${formatTimeStr(evEnd)}`}
                      </span>
                    </div>
                  </div>

                  {isOngoing && heightPx >= 58 && (
                    <div className="flex items-center gap-2 mt-1">
                      <Link
                        href="/focus"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-0.5 rounded-lg bg-purple-600/30 text-purple-200 border border-purple-400/30 text-[10px] font-semibold hover:bg-purple-600/40 transition-colors shadow-xs"
                      >
                        Fokus 🍅
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ──────────────────────────────────────────────────
export function CalendarManager({
  initialEvents,
  projects = [],
  tasks = [],
  defaultReminderMinutes = 15,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [viewMode, setViewMode] = useState<"TODO" | "DAILY" | "WEEKLY" | "AGENDA">("TODO");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Form states
  const [formTimeMode, setFormTimeMode] = useState<"START_ONLY" | "RANGE" | "ALL_DAY">("START_ONLY");
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("PERSONAL");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("05:00");
  const [formEndTime, setFormEndTime] = useState("06:30");
  const [formLocation, setFormLocation] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [formTaskId, setFormTaskId] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formRecurrence, setFormRecurrence] = useState("NONE");
  const [formReminderMinutes, setFormReminderMinutes] = useState<number | "">("");
  const [formIgnoreQuietHours, setFormIgnoreQuietHours] = useState(false);
  const [loading, setLoading] = useState(false);

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const openCreateModal = useCallback(
    (prefillDate?: Date, hour = 5) => {
      const baseDate = prefillDate || selectedDay || new Date();
      setEditingEventId(null);
      setFormTitle("");
      setFormCategory("PERSONAL");
      setFormTimeMode("START_ONLY");
      setFormDate(formatLocalDateOnly(baseDate));
      setFormStartTime(`${String(hour).padStart(2, "0")}:00`);
      setFormEndTime(`${String(hour + 1).padStart(2, "0")}:00`);
      setFormLocation("");
      setFormProjectId("");
      setFormTaskId("");
      setFormDescription("");
      setFormRecurrence("NONE");
      setFormReminderMinutes("");
      setFormIgnoreQuietHours(false);
      setIsModalOpen(true);
    },
    [selectedDay]
  );

  const openEditModal = useCallback((ev: EventItem) => {
    const start = new Date(ev.startTime);
    const end = new Date(ev.endTime);

    setEditingEventId(ev.id);
    setFormTitle(ev.title);
    setFormCategory(ev.eventType);

    if (ev.isAllDay) {
      setFormTimeMode("ALL_DAY");
    } else if (
      end.getTime() === start.getTime() ||
      (end.getHours() === start.getHours() && end.getMinutes() === start.getMinutes())
    ) {
      setFormTimeMode("START_ONLY");
    } else {
      setFormTimeMode("RANGE");
    }

    setFormDate(formatLocalDateOnly(start));
    setFormStartTime(formatTimeStr(start));
    setFormEndTime(formatTimeStr(end));
    setFormLocation(ev.location || "");
    setFormProjectId(ev.projectId || "");
    setFormTaskId(ev.taskId || "");
    setFormDescription(ev.description || "");
    setFormRecurrence(ev.recurrence || "NONE");
    setFormReminderMinutes(ev.reminderMinutes ?? "");
    setFormIgnoreQuietHours(!!ev.ignoreQuietHours);
    setIsModalOpen(true);
  }, []);

  const weekDays = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekOffset]);

  const weekNumber = useMemo(() => getWeekNumber(weekDays[0]), [weekDays]);

  // Handle Toggle Complete
  async function handleToggleComplete(eventId: string, currentCompleted: boolean) {
    const nextCompleted = !currentCompleted;
    // Optimistic update
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId
          ? {
              ...ev,
              isCompleted: nextCompleted,
              completedAt: nextCompleted ? new Date().toISOString() : null,
            }
          : ev
      )
    );

    try {
      const res = await fetch(`/api/calendar-events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: nextCompleted }),
      });
      if (!res.ok) throw new Error();
      toast(
        nextCompleted ? "To-do selesai! Mantap 🎉" : "To-do dikembalikan ke belum selesai.",
        "success"
      );
    } catch {
      // Revert
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === eventId ? { ...ev, isCompleted: currentCompleted } : ev
        )
      );
      toast("Gagal memperbarui status to-do.", "error");
    }
  }

  // Handle Quick Add from To-Do tab
  async function handleQuickAdd(
    title: string,
    timeMode: "START_ONLY" | "ALL_DAY",
    timeStr: string,
    category: string
  ) {
    const dateStr = formatLocalDateOnly(selectedDay);
    let startIso: string;
    let endIso: string;
    let isAllDay = false;

    let ignoreQuietHours = false;
    if (timeMode === "ALL_DAY") {
      isAllDay = true;
      startIso = new Date(`${dateStr}T00:00:00`).toISOString();
      endIso = new Date(`${dateStr}T23:59:59`).toISOString();
    } else {
      startIso = new Date(`${dateStr}T${timeStr}:00`).toISOString();
      endIso = new Date(`${dateStr}T${timeStr}:00`).toISOString();
      const hourNum = Number(timeStr.split(":")[0]);
      if (hourNum < 7) {
        ignoreQuietHours = true;
      }
    }

    try {
      const res = await fetch("/api/calendar-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          startTime: startIso,
          endTime: endIso,
          isAllDay,
          eventType: category,
          recurrence: "NONE",
          ignoreQuietHours,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Gagal membuat to-do.");
      setEvents((prev) => [json.data, ...prev]);
      toast(`To-do "${title}" berhasil ditambahkan! 📋`, "success");
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Terjadi kesalahan.", "error");
    }
  }

  // Handle Save (Create or Edit) Event from Modal
  async function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast("Isi judul to-do atau kegiatan.", "error");
      return;
    }

    let startIso: string;
    let endIso: string;
    let isAllDay = false;

    if (formTimeMode === "ALL_DAY") {
      isAllDay = true;
      startIso = new Date(`${formDate}T00:00:00`).toISOString();
      endIso = new Date(`${formDate}T23:59:59`).toISOString();
    } else if (formTimeMode === "START_ONLY") {
      startIso = new Date(`${formDate}T${formStartTime}:00`).toISOString();
      endIso = new Date(`${formDate}T${formStartTime}:00`).toISOString();
    } else {
      startIso = new Date(`${formDate}T${formStartTime}:00`).toISOString();
      endIso = new Date(`${formDate}T${formEndTime}:00`).toISOString();
    }

    setLoading(true);
    try {
      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        startTime: startIso,
        endTime: endIso,
        isAllDay,
        eventType: formCategory,
        recurrence: formRecurrence,
        reminderMinutes:
          formReminderMinutes === "" ? null : Number(formReminderMinutes),
        ignoreQuietHours: formIgnoreQuietHours,
        location: formLocation.trim() || null,
        projectId: formProjectId || null,
        taskId: formTaskId || null,
      };

      if (editingEventId) {
        const res = await fetch(`/api/calendar-events/${editingEventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || "Gagal memperbarui jadwal.");
        setEvents((prev) =>
          prev.map((item) => (item.id === editingEventId ? json.data : item))
        );
        setIsModalOpen(false);
        setEditingEventId(null);
        toast("Jadwal/To-do berhasil diperbarui! 💾", "success");
      } else {
        const res = await fetch("/api/calendar-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || "Gagal menyimpan jadwal.");
        setEvents((prev) => [json.data, ...prev]);
        setIsModalOpen(false);
        toast("Jadwal/To-do berhasil disimpan! 🎉", "success");
      }
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Terjadi kesalahan.", "error");
    } finally {
      setLoading(false);
    }
  }

  // Handle Delete Event
  async function handleDeleteEvent(id: string) {
    if (!confirm("Hapus jadwal/to-do ini?")) return;
    try {
      const res = await fetch(`/api/calendar-events/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
      if (editingEventId === id) {
        setIsModalOpen(false);
        setEditingEventId(null);
      }
      toast("Jadwal/To-do berhasil dihapus.", "info");
      router.refresh();
    } catch {
      toast("Gagal menghapus jadwal.", "error");
    }
  }

  const shiftDay = (days: number) => {
    setSelectedDay((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + days);
      return next;
    });
  };

  const filteredEvents = useMemo(() => {
    if (typeFilter === "ALL") return events;
    return events.filter((e) => e.eventType === typeFilter);
  }, [events, typeFilter]);

  const selectedDayLabel = useMemo(() => getDayLabel(selectedDay), [selectedDay]);

  const isCurrentWeek = weekOffset === 0;
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  const WEEK_START_HOUR = 6;
  const WEEK_END_HOUR = 22;
  const redLineTopPx =
    ((currentHour - WEEK_START_HOUR) * 60 + currentMinute) * (56 / 60) + 40;

  // Compute daily vitals for sidebar
  const todayTargetDayEvents = useMemo(
    () => projectRecurringEvents(events, selectedDay),
    [events, selectedDay]
  );
  const totalToday = todayTargetDayEvents.length;
  const doneToday = todayTargetDayEvents.filter((e) => e.isCompleted).length;
  const todayProgress = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0;

  return (
    <div className="flex flex-col w-full pb-20 gap-8 selection:bg-purple-500/20 selection:text-purple-300">
      {/* ── Top Header & Mode Switcher ────────────────────────────── */}
      <header className="flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <BackButton fallbackUrl="/today" label="Kembali ke Hari Ini" />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span>Jadwal &amp; To-Do Harian</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3 flex-wrap">
              <span>To-Do &amp; Jadwal</span>
              {(viewMode === "TODO" || viewMode === "DAILY") && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-semibold">
                  {selectedDayLabel}
                </span>
              )}
              {viewMode === "WEEKLY" && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25 font-semibold">
                  Pekan {weekNumber}
                </span>
              )}
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              {viewMode === "TODO"
                ? "Daftar to-do harian interaktif — ceklis aktivitas saat selesai, input praktis tanpa wajib jam selesai."
                : viewMode === "DAILY"
                ? "Timeline alur waktu harian — lihat urutan jadwal visual dari subuh hingga malam hari."
                : viewMode === "WEEKLY"
                ? "Gambaran besar kalender mingguan — klik hari mana saja untuk melihat detail jadwal."
                : "Semua agenda dan rutinitas terorganisir rapi dalam satu suapan kronologis."}
            </p>
          </div>

          {/* Mode Switcher & + Buat Baru */}
          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            {/* 4-Tab Segmented Switcher */}
            <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-zinc-900/90 border border-white/[0.08] backdrop-blur-md shadow-xl">
              {(
                [
                  { id: "TODO", label: "📋 To-Do" },
                  { id: "DAILY", label: "⏱️ Alur Jam" },
                  { id: "WEEKLY", label: "📅 Mingguan" },
                  { id: "AGENDA", label: "≡ Semua" },
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setViewMode(v.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    viewMode === v.id
                      ? "bg-purple-600/30 text-purple-200 border border-purple-400/40 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {/* Create Button (No shortcut badges) */}
            <button
              type="button"
              onClick={() => openCreateModal()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
              </svg>
              <span>+ Buat Jadwal</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── NAV BAR (Day nav for TODO/DAILY, Week nav for WEEKLY) ── */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-900/80 backdrop-blur-xl p-3 sm:p-4 rounded-3xl border border-white/[0.08] shadow-lg">
        {viewMode === "TODO" || viewMode === "DAILY" ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-zinc-950/80 rounded-2xl p-1 border border-white/[0.06]">
              <button
                type="button"
                onClick={() => shiftDay(-1)}
                className="p-1.5 hover:bg-white/[0.08] rounded-xl text-zinc-400 hover:text-white transition-colors"
                title="Hari Sebelumnya"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = new Date();
                  t.setHours(0, 0, 0, 0);
                  setSelectedDay(t);
                }}
                className="px-3 py-1 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => shiftDay(1)}
                className="p-1.5 hover:bg-white/[0.08] rounded-xl text-zinc-400 hover:text-white transition-colors"
                title="Hari Berikutnya"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
            <span className="text-sm font-semibold text-white">
              {selectedDay.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-zinc-950/80 rounded-2xl p-1 border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setWeekOffset((o) => o - 1)}
                className="p-1.5 hover:bg-white/[0.08] rounded-xl text-zinc-400 hover:text-white transition-colors"
                title="Pekan Sebelumnya"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="px-3 py-1 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors"
              >
                Pekan Ini
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset((o) => o + 1)}
                className="p-1.5 hover:bg-white/[0.08] rounded-xl text-zinc-400 hover:text-white transition-colors"
                title="Pekan Berikutnya"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
            <span className="text-sm font-semibold text-white">
              {weekDays[0].toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
              })}
              <span className="text-xs text-zinc-400 ml-2 font-mono">
                ({String(weekDays[0].getDate()).padStart(2, "0")} –{" "}
                {String(weekDays[6].getDate()).padStart(2, "0")}{" "}
                {weekDays[6].toLocaleDateString("id-ID", { month: "short" })})
              </span>
            </span>
          </div>
        )}

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setTypeFilter(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                typeFilter === cat.id
                  ? "bg-purple-600/30 text-purple-200 border-purple-400/40 shadow-sm"
                  : "bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 border-white/[0.06] hover:bg-zinc-900"
              }`}
            >
              {cat.id !== "ALL" && CATEGORY_MAP[cat.id] && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: CATEGORY_MAP[cat.id].dot }}
                />
              )}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── MAIN CONTENT ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Main Workspace (8 Cols) */}
        <main className="xl:col-span-8 bg-zinc-900/90 rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl">
          {/* TAB 1: TO-DO VIEW */}
          {viewMode === "TODO" && (
            <ToDoListView
              events={filteredEvents}
              targetDay={selectedDay}
              onToggleComplete={handleToggleComplete}
              onQuickAdd={handleQuickAdd}
              onSelectEvent={openEditModal}
              onDeleteEvent={handleDeleteEvent}
              onOpenModal={() => openCreateModal(selectedDay)}
            />
          )}

          {/* TAB 2: DAILY FLOW VIEW */}
          {viewMode === "DAILY" && (
            <DailyFlowView
              events={filteredEvents}
              now={currentTime}
              targetDay={selectedDay}
              onAddAtHour={(h) => openCreateModal(selectedDay, h)}
              onSelectEvent={openEditModal}
              onToggleComplete={handleToggleComplete}
            />
          )}

          {/* TAB 3: WEEKLY VIEW */}
          {viewMode === "WEEKLY" && (
            <div className="flex flex-col w-full">
              {/* Day headers */}
              <div className="grid grid-cols-8 bg-zinc-900/95 backdrop-blur border-b border-white/[0.08] sticky top-0 z-20 text-center">
                <div className="p-3 flex flex-col items-center justify-center text-xs text-zinc-400 border-r border-white/[0.06]">
                  <svg className="w-4 h-4 mb-1 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                  </svg>
                  <span className="font-mono text-[11px]">WIB</span>
                </div>
                {weekDays.map((day, idx) => {
                  const now = new Date();
                  const isToday = sameDay(day, now);
                  const isWeekend = idx >= 5;
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 sm:p-3 flex flex-col items-center justify-center gap-1 border-r border-white/[0.06] last:border-r-0 cursor-pointer hover:bg-white/[0.03] transition-colors relative ${
                        isToday
                          ? "bg-purple-950/25"
                          : isWeekend
                          ? "bg-zinc-950/30"
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedDay(day);
                        setViewMode("TODO");
                      }}
                      title={`Buka To-Do: ${day.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}`}
                    >
                      {isToday && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 shadow-sm" />
                      )}
                      {isToday ? (
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                          Hari Ini
                        </span>
                      ) : null}
                      <span
                        className={`text-[10px] tracking-wider uppercase font-semibold ${
                          isToday ? "text-purple-300" : "text-zinc-500"
                        }`}
                      >
                        {["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"][idx]}
                      </span>
                      <span
                        className={`text-base font-bold ${
                          isToday ? "text-white" : "text-zinc-200"
                        }`}
                      >
                        {String(day.getDate()).padStart(2, "0")}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {day.toLocaleDateString("id-ID", { month: "short" })}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Grid Body */}
              <div className="relative overflow-x-auto select-none min-w-[720px] bg-zinc-950/40">
                {/* Real-time line */}
                {isCurrentWeek &&
                  currentHour >= WEEK_START_HOUR &&
                  currentHour <= WEEK_END_HOUR && (
                    <div
                      className="absolute left-0 right-0 z-30 pointer-events-none flex items-center transition-all duration-1000"
                      style={{ top: `${redLineTopPx}px` }}
                    >
                      <div className="w-[12.5%] pl-2 flex items-center justify-end pr-2">
                        <span className="text-[10px] font-mono text-rose-300 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-500/40 shadow-sm">
                          {String(currentHour).padStart(2, "0")}:
                          {String(currentMinute).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="flex-1 relative flex items-center">
                        <div className="h-[2px] w-full bg-rose-500 shadow-sm" />
                      </div>
                    </div>
                  )}

                <div className="relative grid grid-cols-8 divide-x divide-white/[0.04]">
                  {/* Time labels */}
                  <div className="flex flex-col select-none">
                    {Array.from(
                      { length: WEEK_END_HOUR - WEEK_START_HOUR + 1 },
                      (_, i) => WEEK_START_HOUR + i
                    ).map((hour) => (
                      <div
                        key={hour}
                        className="h-14 border-b border-white/[0.04] pr-2.5 text-right font-mono text-xs text-zinc-500 flex items-start justify-end pt-1"
                      >
                        {String(hour).padStart(2, "0")}:00
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {weekDays.map((day, colIdx) => {
                    const dayEvs = projectRecurringEvents(filteredEvents, day);

                    return (
                      <div key={colIdx} className="relative h-full">
                        {Array.from(
                          { length: WEEK_END_HOUR - WEEK_START_HOUR + 1 },
                          (_, i) => WEEK_START_HOUR + i
                        ).map((h) => (
                          <div
                            key={h}
                            className="h-14 border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors"
                            onClick={() => openCreateModal(day, h)}
                            title={`Tambah jadwal: ${day.toLocaleDateString("id-ID", { weekday: "short" })} jam ${h}:00`}
                          />
                        ))}

                        {/* Events on this day */}
                        <div className="absolute inset-0 pointer-events-none p-1">
                          {dayEvs.map((ev) => {
                            const start = new Date(ev.startTime);
                            const end = new Date(ev.endTime);
                            const sh = start.getHours();
                            const sm = start.getMinutes();
                            const eh = end.getHours();
                            const em = end.getMinutes();

                            if (sh > WEEK_END_HOUR) return null;
                            if (eh < WEEK_START_HOUR) return null;

                            const top = Math.max(
                              0,
                              (sh - WEEK_START_HOUR) * 56 + (sm / 60) * 56
                            );
                            const durMin = Math.max(
                              20,
                              eh * 60 + em - (sh * 60 + sm)
                            );
                            const height = Math.max(26, (durMin / 60) * 56);
                            const cat = CATEGORY_MAP[ev.eventType] || CATEGORY_MAP["PERSONAL"];

                            return (
                              <div
                                key={ev.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(ev);
                                }}
                                className={`pointer-events-auto absolute left-1 right-1 rounded-lg p-1.5 cursor-pointer transition-all hover:scale-105 hover:z-20 border overflow-hidden ${cat.cardBg} ${cat.cardBorder} ${ev.isCompleted ? "opacity-50" : ""}`}
                                style={{ top: `${top}px`, height: `${height}px` }}
                                title={`${ev.title} (${formatTimeStr(start)}–${formatTimeStr(end)})`}
                              >
                                <p className={`text-[11px] font-semibold truncate ${cat.badgeText}`}>
                                  {ev.title}
                                </p>
                                <p className="text-[10px] font-mono text-zinc-400">
                                  {formatTimeStr(start)}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AGENDA VIEW */}
          {viewMode === "AGENDA" && (
            <div className="p-6 flex flex-col gap-4">
              <h3 className="text-base font-bold text-white">
                Semua Jadwal &amp; To-Do
              </h3>
              <div className="flex flex-col gap-2.5">
                {events.map((ev) => {
                  const cat = CATEGORY_MAP[ev.eventType] || CATEGORY_MAP["PERSONAL"];
                  const st = new Date(ev.startTime);
                  const isDone = !!ev.isCompleted;

                  return (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/60 border border-white/[0.06] hover:border-purple-500/30 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(ev.id, isDone)}
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                            isDone
                              ? "bg-emerald-400 border-emerald-400 text-zinc-950"
                              : "border-white/20 bg-zinc-900 hover:border-emerald-400 text-transparent hover:text-emerald-400"
                          }`}
                        >
                          ✓
                        </button>
                        <div className="flex flex-col min-w-0">
                          <span
                            className={`text-sm font-semibold truncate ${
                              isDone ? "line-through text-zinc-500" : "text-white"
                            }`}
                          >
                            {ev.title}
                          </span>
                          <span className="text-xs text-zinc-400 font-mono mt-0.5">
                            {st.toLocaleDateString("id-ID", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}{" "}
                            • {formatTimeStr(st)}
                            {ev.recurrence && ev.recurrence !== "NONE" && ` • 🔁 ${recurrenceLabel[ev.recurrence]}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full ${cat.badgeBg} ${cat.badgeText} border ${cat.badgeBorder} hidden sm:inline-block font-medium`}
                        >
                          {cat.icon} {cat.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => openEditModal(ev)}
                          className="px-3 py-1 rounded-xl bg-zinc-800 text-xs text-zinc-200 hover:bg-zinc-700 transition-colors font-medium border border-white/[0.06]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        {/* Bento Sidebar (4 Cols) */}
        <aside className="xl:col-span-4 flex flex-col gap-6">
          {/* Card 1: Today Progress Vitals */}
          <div className="bg-zinc-900/90 rounded-3xl border border-white/[0.08] p-6 shadow-xl flex flex-col gap-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Ringkasan {selectedDayLabel}
              </span>
              <span className="text-xs font-bold text-emerald-400">
                {todayProgress}% Selesai
              </span>
            </div>

            <div className="flex items-center gap-4 bg-zinc-950/70 p-4 rounded-2xl border border-white/[0.06]">
              <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="transparent"
                    stroke="#27272a"
                    strokeWidth="3.5"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeDasharray={94.24}
                    strokeDashoffset={94.24 * (1 - todayProgress / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute text-xs font-bold text-white font-mono">
                  {doneToday}/{totalToday}
                </span>
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-bold text-white">To-Do Terselesaikan</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {totalToday - doneToday > 0
                    ? `Masih ada ${totalToday - doneToday} aktivitas pending hari ini.`
                    : totalToday > 0
                    ? "Semua aktivitas hari ini tuntas!"
                    : "Belum ada to-do terjadwal."}
                </p>
              </div>
            </div>

            {/* Quick action jump */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Link
                href="/focus"
                className="p-3 rounded-2xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-purple-300 text-xs font-semibold flex flex-col gap-1 transition-all active:scale-95"
              >
                <span className="text-base">🍅</span>
                <span>Ruang Fokus</span>
                <span className="text-[10px] text-zinc-400 font-normal">Deep work bebas distraksi</span>
              </Link>

              <Link
                href="/today"
                className="p-3 rounded-2xl bg-zinc-950/80 hover:bg-zinc-800/80 border border-white/[0.08] text-zinc-200 text-xs font-semibold flex flex-col gap-1 transition-all active:scale-95"
              >
                <span className="text-base">📋</span>
                <span>Papan Hari Ini</span>
                <span className="text-[10px] text-zinc-400 font-normal">Prioritas &amp; tugas utama</span>
              </Link>
            </div>
          </div>

          {/* Card 2: Productivity Tips & Rhythm */}
          <div className="bg-zinc-900/90 rounded-3xl border border-white/[0.08] p-6 shadow-xl flex flex-col gap-3.5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <span>💡 Panduan To-Do &amp; Jadwal</span>
            </div>
            <ul className="flex flex-col gap-2.5 text-xs text-zinc-300 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-400 font-bold shrink-0">✓</span>
                <span>Ceklis to-do langsung dari daftar ataupun timeline alur jam tanpa reload halaman.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-purple-400 font-bold shrink-0">⏰</span>
                <span>To-do dengan jam tidak wajib punya jam selesai. Praktis untuk bangun subuh, minum obat, atau jadwal kelas.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-amber-400 font-bold shrink-0">🔁</span>
                <span>Gunakan pengulangan <strong>Setiap Hari</strong> untuk kebiasaan rutin yang ingin Anda bangun konsisten.</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {/* ── MODAL BUAT / EDIT JADWAL ──────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-zinc-900 rounded-3xl shadow-2xl p-6 sm:p-7 flex flex-col gap-5 border border-white/[0.08] relative animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center text-sm">
                  {editingEventId ? "✏️" : "📅"}
                </div>
                <h2 className="text-lg font-bold text-white">
                  {editingEventId ? "Edit To-Do / Jadwal" : "Tambah To-Do / Jadwal Baru"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingEventId(null);
                }}
                className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 flex items-center justify-center transition-colors text-sm"
                title="Tutup"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="flex flex-col gap-4">
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Judul To-Do / Aktivitas
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="cth: Bangun Subuh Jam 5, Kuliah Basis Data, Beli vitamin..."
                  autoFocus
                  className="w-full bg-zinc-950 px-4 py-3 rounded-2xl text-sm text-white border border-white/[0.08] placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner"
                />
              </div>

              {/* Time Mode Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-300">
                  Pilihan Waktu
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormTimeMode("START_ONLY")}
                    className={`p-3 rounded-2xl border text-xs flex flex-col items-center gap-1 transition-all ${
                      formTimeMode === "START_ONLY"
                        ? "bg-purple-600/30 text-purple-200 border-purple-500/50 shadow-sm font-semibold"
                        : "bg-zinc-950 text-zinc-400 border-white/[0.06] hover:bg-zinc-800"
                    }`}
                  >
                    <span>⏰ Jam Mulai</span>
                    <span className="text-[10px] text-zinc-500">Tanpa jam selesai</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTimeMode("RANGE")}
                    className={`p-3 rounded-2xl border text-xs flex flex-col items-center gap-1 transition-all ${
                      formTimeMode === "RANGE"
                        ? "bg-purple-600/30 text-purple-200 border-purple-500/50 shadow-sm font-semibold"
                        : "bg-zinc-950 text-zinc-400 border-white/[0.06] hover:bg-zinc-800"
                    }`}
                  >
                    <span>⏳ Rentang Waktu</span>
                    <span className="text-[10px] text-zinc-500">Ada jam selesai</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTimeMode("ALL_DAY")}
                    className={`p-3 rounded-2xl border text-xs flex flex-col items-center gap-1 transition-all ${
                      formTimeMode === "ALL_DAY"
                        ? "bg-purple-600/30 text-purple-200 border-purple-500/50 shadow-sm font-semibold"
                        : "bg-zinc-950 text-zinc-400 border-white/[0.06] hover:bg-zinc-800"
                    }`}
                  >
                    <span>📝 Bebas Jam</span>
                    <span className="text-[10px] text-zinc-500">Kapan saja</span>
                  </button>
                </div>
              </div>

              {/* Date & Time inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-zinc-950 px-3.5 py-2.5 rounded-xl text-xs text-white border border-white/[0.08] focus:outline-none focus:border-purple-500"
                  />
                </div>

                {formTimeMode !== "ALL_DAY" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      {formTimeMode === "START_ONLY" ? "Jam Aktivitas" : "Jam Mulai"}
                    </label>
                    <input
                      type="time"
                      required
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full bg-zinc-950 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-purple-300 border border-white/[0.08] focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}

                {formTimeMode === "RANGE" && (
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-zinc-300">
                      Jam Selesai
                    </label>
                    <input
                      type="time"
                      required
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full bg-zinc-950 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-purple-300 border border-white/[0.08] focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Kategori
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-zinc-950 px-3.5 py-2.5 rounded-xl text-xs text-zinc-200 border border-white/[0.08] focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="PERSONAL">🌱 Pribadi &amp; Kebiasaan (Bangun tidur, Sarapan, Ibadah, Olahraga)</option>
                  <option value="BLOCKED">🎯 Sesi Fokus / Deep Work (Belajar, Skripsi, Tugas Utama)</option>
                  <option value="WORK">💼 Pekerjaan &amp; Kuliah (Kelas, Meeting, Kerja)</option>
                  <option value="REMINDER">🔔 Pengingat &amp; Tugas Ringan (Beli barang, Telepon)</option>
                  <option value="TASK_DEADLINE">🔴 Tenggat Waktu</option>
                </select>
              </div>

              {/* Recurrence */}
              <div className="flex flex-col gap-1.5 bg-zinc-950/60 p-3.5 rounded-2xl border border-white/[0.06]">
                <label className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                  <span>🔁 Pengulangan Rutinitas</span>
                </label>
                <select
                  value={formRecurrence}
                  onChange={(e) => setFormRecurrence(e.target.value)}
                  className="w-full bg-zinc-900 px-3 py-2 rounded-xl text-xs text-white border border-white/[0.08] focus:outline-none focus:border-purple-500 cursor-pointer mt-1"
                >
                  <option value="NONE">Hanya sekali (hari ini saja)</option>
                  <option value="DAILY">Setiap hari (Rutinitas Harian)</option>
                  <option value="WEEKLY">Setiap minggu di hari yang sama</option>
                  <option value="MONTHLY">Setiap bulan di tanggal yang sama</option>
                </select>
              </div>

              {/* Telegram Notifications & Quiet Hours */}
              <div className="flex flex-col gap-2.5 bg-zinc-950/60 p-3.5 rounded-2xl border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-amber-300">
                    🔔 Notifikasi Pengingat
                  </label>
                  <span className="text-[11px] text-zinc-400">
                    Default: {defaultReminderMinutes} menit
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={formReminderMinutes}
                    onChange={(e) =>
                      setFormReminderMinutes(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="w-full bg-zinc-900 px-3 py-2 rounded-xl text-xs text-white border border-white/[0.08] focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">Ikuti Preferensi ({defaultReminderMinutes} mnt)</option>
                    <option value="5">5 menit sebelum</option>
                    <option value="15">15 menit sebelum</option>
                    <option value="30">30 menit sebelum</option>
                    <option value="60">1 jam sebelum</option>
                  </select>

                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIgnoreQuietHours}
                      onChange={(e) => setFormIgnoreQuietHours(e.target.checked)}
                      className="w-4 h-4 accent-purple-500 rounded"
                    />
                    <span>Alarm Bangun (Abaikan Jam Hening)</span>
                  </label>
                </div>
              </div>

              {/* Optional Project or Task Link */}
              {(projects.length > 0 || tasks.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {projects.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-zinc-400">Tautkan ke Proyek (Opsional)</label>
                      <select
                        value={formProjectId}
                        onChange={(e) => setFormProjectId(e.target.value)}
                        className="w-full bg-zinc-950 px-3 py-2 rounded-xl text-xs text-zinc-300 border border-white/[0.08]"
                      >
                        <option value="">Tanpa Proyek</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {tasks.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-zinc-400">Tautkan ke Tugas (Opsional)</label>
                      <select
                        value={formTaskId}
                        onChange={(e) => setFormTaskId(e.target.value)}
                        className="w-full bg-zinc-950 px-3 py-2 rounded-xl text-xs text-zinc-300 border border-white/[0.08]"
                      >
                        <option value="">Tanpa Tugas</option>
                        {tasks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Submit & Delete buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                {editingEventId ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(editingEventId)}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold transition-colors flex items-center gap-1.5 border border-rose-500/30"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span>Hapus</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingEventId(null);
                    }}
                    className="px-4 py-2 text-xs text-zinc-400 hover:text-white rounded-xl transition-colors font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-purple-600/30 active:scale-95 disabled:opacity-50"
                  >
                    {loading
                      ? "Menyimpan..."
                      : editingEventId
                      ? "Simpan Perubahan 💾"
                      : formRecurrence !== "NONE"
                      ? "Simpan Rutinitas 🔁"
                      : "Simpan To-Do 📋"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
