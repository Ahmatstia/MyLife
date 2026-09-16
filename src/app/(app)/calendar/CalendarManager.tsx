"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/app/components/ui/Toast";

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
const CATEGORY_MAP: Record<
  string,
  { label: string; dot: string; bg: string; border: string; text: string; glow: string }
> = {
  BLOCKED: {
    label: "Fokus",
    dot: "#d0bcff",
    bg: "bg-purple-50 dark:bg-[#340080]/25",
    border: "border-purple-200 dark:border-[#d0bcff]/40",
    text: "text-purple-700 dark:text-[#d0bcff]",
    glow: "shadow-[0_0_20px_rgba(208,188,255,0.25)]",
  },
  WORK: {
    label: "Pekerjaan",
    dot: "#c0c1ff",
    bg: "bg-indigo-50 dark:bg-[#3131c0]/25",
    border: "border-indigo-200 dark:border-[#c0c1ff]/40",
    text: "text-indigo-700 dark:text-[#c0c1ff]",
    glow: "",
  },
  PERSONAL: {
    label: "Pribadi",
    dot: "#4edea3",
    bg: "bg-emerald-50 dark:bg-[#00311f]/40",
    border: "border-emerald-200 dark:border-[#4edea3]/40",
    text: "text-emerald-700 dark:text-[#4edea3]",
    glow: "",
  },
  TASK_DEADLINE: {
    label: "Tenggat",
    dot: "#F43F5E",
    bg: "bg-rose-50 dark:bg-[#93000a]/35",
    border: "border-rose-200 dark:border-[#F43F5E]/40",
    text: "text-rose-700 dark:text-[#F43F5E]",
    glow: "",
  },
  REMINDER: {
    label: "Pengingat",
    dot: "#F59E0B",
    bg: "bg-amber-50 dark:bg-[#F59E0B]/15",
    border: "border-amber-200 dark:border-[#F59E0B]/40",
    text: "text-amber-700 dark:text-[#F59E0B]",
    glow: "",
  },
};

const CATEGORIES = [
  { id: "ALL", label: "Semua" },
  ...Object.entries(CATEGORY_MAP).map(([id, v]) => ({ id, label: v.label })),
];

const recurrenceLabel: Record<string, string> = {
  DAILY: "🔁 Setiap hari",
  WEEKLY: "📅 Setiap minggu",
  MONTHLY: "🗓 Setiap bulan",
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

  // Split into:
  // 1. Scheduled (has time, not all-day)
  // 2. Anytime (isAllDay)
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
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* ── QUICK ADD BAR ── */}
      <div className="bg-white dark:bg-[#191b22] p-4 rounded-xl border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col gap-3">
        <form onSubmit={handleFormSubmit} className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-[#4edea3] font-bold text-sm">
              +
            </span>
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Tulis to-do baru... (cth: Bangun subuh, Sarapan, Beli buku)"
              className="w-full bg-slate-50 dark:bg-[#0c0e14] pl-8 pr-3.5 py-2.5 rounded-lg font-mono text-xs text-slate-900 dark:text-[#e2e2eb] border border-slate-200 dark:border-white/[0.06] placeholder:text-slate-400 dark:placeholder-[#6b6675] focus:outline-none focus:border-emerald-500 dark:focus:border-[#4edea3]/60 shadow-inner"
            />
          </div>

          {/* Quick time picker */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-slate-100 dark:bg-[#0c0e14] rounded-lg border border-slate-200 dark:border-white/[0.06] p-0.5">
              <button
                type="button"
                onClick={() => setQuickMode("START_ONLY")}
                className={`px-2.5 py-1.5 rounded font-mono text-xs transition-all ${
                  quickMode === "START_ONLY"
                    ? "bg-purple-100 text-purple-700 dark:bg-[#340080] dark:text-[#d0bcff] font-semibold"
                    : "text-slate-500 dark:text-[#958ea0] hover:text-slate-900 dark:hover:text-[#e2e2eb]"
                }`}
              >
                ⏰ Jam
              </button>
              <button
                type="button"
                onClick={() => setQuickMode("ALL_DAY")}
                className={`px-2.5 py-1.5 rounded font-mono text-xs transition-all ${
                  quickMode === "ALL_DAY"
                    ? "bg-purple-100 text-purple-700 dark:bg-[#340080] dark:text-[#d0bcff] font-semibold"
                    : "text-slate-500 dark:text-[#958ea0] hover:text-slate-900 dark:hover:text-[#e2e2eb]"
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
                className="bg-slate-50 dark:bg-[#0c0e14] px-2.5 py-2 rounded-lg font-mono text-xs text-emerald-600 dark:text-[#4edea3] border border-slate-200 dark:border-white/[0.06] focus:outline-none focus:border-emerald-500 dark:focus:border-[#4edea3]/60 cursor-pointer"
              />
            )}

            <select
              value={quickCategory}
              onChange={(e) => setQuickCategory(e.target.value)}
              className="bg-slate-50 dark:bg-[#0c0e14] px-2.5 py-2 rounded-lg font-mono text-xs text-purple-700 dark:text-[#d0bcff] border border-slate-200 dark:border-white/[0.06] focus:outline-none focus:border-purple-500 dark:focus:border-[#d0bcff]/60 cursor-pointer"
            >
              <option value="PERSONAL">🌱 Pribadi</option>
              <option value="BLOCKED">🎯 Fokus</option>
              <option value="WORK">💼 Pekerjaan</option>
              <option value="REMINDER">🔔 Pengingat</option>
            </select>

            <button
              type="submit"
              disabled={submitting || !quickTitle.trim()}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-[#4edea3] dark:hover:bg-[#3ec48e] disabled:opacity-40 text-white dark:text-[#00311f] font-mono text-xs font-bold rounded-lg transition-all shadow-sm dark:shadow-[0_2px_12px_rgba(78,222,163,0.3)] active:scale-95 shrink-0"
            >
              {submitting ? "..." : "+ Tambah"}
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#958ea0] pt-1">
          <span>
            💡 <strong>Tips:</strong> To-do jam tidak mewajibkan jam selesai. Cukup tentukan jam mulai lalu ceklis saat selesai!
          </span>
          <button
            type="button"
            onClick={onOpenModal}
            className="text-purple-600 dark:text-[#d0bcff] hover:underline font-mono text-xs"
          >
            Form Lengkap &amp; Rutinitas ↗
          </button>
        </div>
      </div>

      {/* ── PROGRESS BAR & STATS ── */}
      <div className="bg-white dark:bg-[#191b22]/70 p-4 rounded-xl border border-slate-200 dark:border-white/[0.06] flex flex-col gap-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-800 dark:text-[#e2e2eb]">
            <span className="font-bold text-sm text-emerald-600 dark:text-[#4edea3]">{completedCount}</span>
            <span className="text-slate-500 dark:text-[#958ea0]">dari {totalCount} To-Do Selesai</span>
            {totalCount > 0 && progressPct === 100 && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-[#4edea3]/20 dark:text-[#4edea3] rounded-full text-[10px] font-bold animate-pulse">
                Semua Beres! 🎉
              </span>
            )}
          </div>

          {/* Filter status */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0c0e14] p-0.5 rounded-lg border border-slate-200 dark:border-white/[0.06]">
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
                className={`px-2.5 py-1 rounded font-mono text-[11px] transition-all ${
                  statusFilter === s.id
                    ? "bg-purple-100 text-purple-700 dark:bg-[#340080] dark:text-[#d0bcff] font-semibold shadow-xs"
                    : "text-slate-500 dark:text-[#958ea0] hover:text-slate-900 dark:hover:text-[#e2e2eb]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full h-2 bg-slate-100 dark:bg-[#0c0e14] rounded-full overflow-hidden border border-slate-200 dark:border-white/[0.04]">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-purple-500 dark:from-[#4edea3] dark:to-[#a078ff] rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ── TO-DO LIST CONTENT ── */}
      {totalCount === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-[#191b22]/30 rounded-xl border border-dashed border-slate-300 dark:border-white/[0.08]">
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-[#340080]/30 border border-purple-200 dark:border-[#d0bcff]/20 flex items-center justify-center text-xl">
            📋
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-[#e2e2eb]">
            Belum ada to-do untuk hari ini
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#958ea0] max-w-sm">
            Mulai susun harimu dari bangun pagi, sarapan, belajar, hingga tidur malam. Tulis di kotak tambah to-do di atas!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* 1. SCHEDULED TO-DOS */}
          {scheduledEvents.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-purple-700 dark:text-[#d0bcff] tracking-wider uppercase">
                <span>⏰ TO-DO BERJADWAL</span>
                <span className="text-slate-500 dark:text-[#958ea0]">({scheduledEvents.length})</span>
              </div>

              <div className="flex flex-col gap-2">
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
                        className={`group flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border transition-all ${
                          isDone
                            ? "bg-slate-50 dark:bg-[#0c0e14]/60 border-slate-200 dark:border-white/[0.04] opacity-60"
                            : `${cat.bg} ${cat.border} hover:border-emerald-500/50 dark:hover:border-[#4edea3]/50 shadow-xs`
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Interactive Checkbox */}
                          <button
                            type="button"
                            onClick={() => onToggleComplete(ev.id, isDone)}
                            className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                              isDone
                                ? "bg-emerald-500 border-emerald-500 text-white dark:bg-[#4edea3] dark:border-[#4edea3] dark:text-[#00311f] shadow-[0_0_10px_rgba(78,222,163,0.5)]"
                                : "border-slate-300 dark:border-white/30 bg-white dark:bg-[#0c0e14] hover:border-emerald-500 dark:hover:border-[#4edea3] text-transparent hover:text-emerald-500/50"
                            }`}
                            title={isDone ? "Klik untuk tandai belum selesai" : "Klik untuk tandai selesai"}
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>

                          {/* Time badge */}
                          <div className="flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] text-emerald-700 dark:text-[#4edea3] font-semibold shrink-0 shadow-xs">
                            <span>{formatTimeStr(evStart)}</span>
                            {isRange && (
                              <span className="text-slate-400 dark:text-[#958ea0] font-normal">
                                –{formatTimeStr(evEnd)}
                              </span>
                            )}
                          </div>

                          {/* Title & tags */}
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium truncate ${
                                  isDone
                                    ? "line-through text-slate-400 dark:text-[#958ea0]"
                                    : "text-slate-900 dark:text-[#e2e2eb]"
                                }`}
                              >
                                {ev.title}
                              </span>
                              {ev.recurrence && ev.recurrence !== "NONE" && (
                                <span className="font-mono text-[9px] bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-[#cbc3d7] px-1 rounded shrink-0 border border-slate-200 dark:border-transparent" title={recurrenceLabel[ev.recurrence]}>
                                  🔁 {ev.recurrence === "DAILY" ? "Harian" : ev.recurrence === "WEEKLY" ? "Mingguan" : "Bulanan"}
                                </span>
                              )}
                            </div>
                            {ev.description && (
                              <span className="text-xs text-slate-500 dark:text-[#958ea0] truncate">
                                {ev.description}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right side actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${cat.text} bg-white dark:bg-black/30 border border-slate-200 dark:border-white/[0.06] hidden sm:inline-block shadow-xs`}
                          >
                            {cat.label}
                          </span>

                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                            <button
                              type="button"
                              onClick={() => onSelectEvent(ev)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.08] rounded text-slate-500 dark:text-[#958ea0] hover:text-slate-900 dark:hover:text-[#e2e2eb] transition-colors"
                              title="Edit / Detail"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteEvent(ev.id)}
                              className="p-1.5 hover:bg-red-500/20 rounded text-slate-500 dark:text-[#958ea0] hover:text-red-500 transition-colors"
                              title="Hapus"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-emerald-600 dark:text-[#4edea3] tracking-wider uppercase">
                <span>📌 TO-DO FLEKSIBEL (KAPAN SAJA HARI INI)</span>
                <span className="text-slate-500 dark:text-[#958ea0]">({allDayEvents.length})</span>
              </div>

              <div className="flex flex-col gap-2">
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
                        className={`group flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border transition-all ${
                          isDone
                            ? "bg-slate-50 dark:bg-[#0c0e14]/60 border-slate-200 dark:border-white/[0.04] opacity-60"
                            : "bg-white dark:bg-[#191b22] border-slate-200 dark:border-white/[0.08] hover:border-emerald-500/50 dark:hover:border-[#4edea3]/50 shadow-xs"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Interactive Checkbox */}
                          <button
                            type="button"
                            onClick={() => onToggleComplete(ev.id, isDone)}
                            className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                              isDone
                                ? "bg-emerald-500 border-emerald-500 text-white dark:bg-[#4edea3] dark:border-[#4edea3] dark:text-[#00311f] shadow-[0_0_10px_rgba(78,222,163,0.5)]"
                                : "border-slate-300 dark:border-white/30 bg-white dark:bg-[#0c0e14] hover:border-emerald-500 dark:hover:border-[#4edea3] text-transparent hover:text-emerald-500/50"
                            }`}
                            title={isDone ? "Klik untuk tandai belum selesai" : "Klik untuk tandai selesai"}
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>

                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#cbc3d7] shrink-0 border border-slate-200 dark:border-transparent">
                            Bebas Jam
                          </span>

                          <div className="flex flex-col min-w-0">
                            <span
                              className={`text-sm font-medium truncate ${
                                isDone
                                  ? "line-through text-slate-400 dark:text-[#958ea0]"
                                  : "text-slate-900 dark:text-[#e2e2eb]"
                              }`}
                            >
                              {ev.title}
                            </span>
                            {ev.description && (
                              <span className="text-xs text-slate-500 dark:text-[#958ea0] truncate">
                                {ev.description}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${cat.text} bg-white dark:bg-black/30 border border-slate-200 dark:border-white/[0.06] hidden sm:inline-block shadow-xs`}
                          >
                            {cat.label}
                          </span>

                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                            <button
                              type="button"
                              onClick={() => onSelectEvent(ev)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.08] rounded text-slate-500 dark:text-[#958ea0] hover:text-slate-900 dark:hover:text-[#e2e2eb] transition-colors"
                              title="Edit / Detail"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteEvent(ev.id)}
                              className="p-1.5 hover:bg-red-500/20 rounded text-slate-500 dark:text-[#958ea0] hover:text-red-500 transition-colors"
                              title="Hapus"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      <div className="bg-white dark:bg-[#191b22] px-4 py-3 border-b border-slate-200 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {active ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#4edea3] animate-ping" />
              <span className="font-mono text-xs text-slate-500 dark:text-[#958ea0]">SEKARANG:</span>
              <span className="font-semibold text-xs text-slate-900 dark:text-[#e2e2eb]">
                {active.title}
              </span>
              <span className="font-mono text-[10px] text-emerald-700 dark:text-[#4edea3] bg-emerald-50 dark:bg-[#4edea3]/10 border border-emerald-200 dark:border-[#4edea3]/30 px-1.5 py-0.2 rounded font-semibold">
                {formatTimeStr(new Date(active.startTime))}–{formatTimeStr(new Date(active.endTime))}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-[#958ea0]" />
              <span className="font-mono text-xs text-slate-500 dark:text-[#958ea0]">
                Tidak ada aktivitas terjadwal saat ini
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 font-mono text-xs font-semibold">
          <span className="text-emerald-700 dark:text-[#4edea3]">✓ {done} Selesai</span>
          <span className="text-slate-600 dark:text-[#cbc3d7]">⏳ {upcoming} Mendatang</span>
          <span className="text-purple-700 dark:text-[#d0bcff]">⚡ {productiveHStr} Produktif</span>
        </div>
      </div>

      {/* Timeline container */}
      <div className="relative overflow-y-auto max-h-[75vh] bg-slate-50/50 dark:bg-[#0c0e14]/40 select-none">
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
                <div className="w-16 pr-2 flex items-center justify-end">
                  <span className="font-mono text-[10px] text-rose-600 dark:text-[#F43F5E] font-bold bg-white dark:bg-[#131825] px-1 rounded shadow-sm border border-rose-200 dark:border-[#F43F5E]/30">
                    {formatTimeStr(now)}
                  </span>
                </div>
                <div className="flex-1 relative flex items-center">
                  <div className="h-[2px] w-full bg-rose-500 dark:bg-[#F43F5E] shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                  <div className="absolute left-3 -top-2 flex items-center gap-1 bg-rose-500 dark:bg-[#F43F5E] text-white text-[9px] font-mono px-1.5 py-0.5 rounded-full shadow-sm">
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
                className={`absolute left-0 right-0 border-b border-slate-200/60 dark:border-white/[0.04] flex items-start ${
                  isCurrent ? "bg-purple-50/70 dark:bg-[#340080]/10" : ""
                }`}
                style={{
                  top: `${i * PX_PER_HOUR}px`,
                  height: `${PX_PER_HOUR}px`,
                }}
              >
                <div className="w-16 pt-1 pr-3 text-right font-mono text-[11px] text-slate-500 dark:text-[#958ea0] select-none border-r border-slate-200/60 dark:border-white/[0.04] shrink-0">
                  {String(h).padStart(2, "0")}:00
                </div>

                {/* Quick add click area */}
                <button
                  type="button"
                  onClick={() => onAddAtHour(h)}
                  className="absolute left-16 right-0 top-0 bottom-0 group flex items-center hover:bg-slate-100/60 dark:hover:bg-white/[0.02] transition-colors"
                  title={`Tambah jadwal pukul ${String(h).padStart(2, "0")}:00`}
                >
                  <span className="opacity-0 group-hover:opacity-100 ml-3 text-[10px] text-slate-400 dark:text-[#494454] font-mono transition-opacity flex items-center gap-1">
                    <span className="text-purple-600 dark:text-[#d0bcff]/60 font-bold">+</span> Tambah di{" "}
                    {String(h).padStart(2, "0")}:00
                  </span>
                </button>
              </div>
            );
          })}

          {/* Event cards */}
          <div className="absolute left-16 right-2 top-0 bottom-0 pointer-events-none">
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
                  className={`pointer-events-auto absolute left-0 right-0 rounded-lg px-3 py-1.5 cursor-pointer transition-all hover:scale-[1.01] hover:z-20 flex flex-col justify-between overflow-hidden border ${cat.bg} ${cat.border} ${isOngoing ? cat.glow : ""} ${isDone ? "opacity-50" : ""}`}
                  style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Direct checklist button on card */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleComplete(ev.id, isDone);
                        }}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                          isDone
                            ? "bg-emerald-500 border-emerald-500 text-white dark:bg-[#4edea3] dark:border-[#4edea3] dark:text-[#00311f] shadow-xs"
                            : "border-slate-300 dark:border-white/30 bg-white dark:bg-[#0c0e14] hover:border-emerald-500 dark:hover:border-[#4edea3] text-transparent hover:text-emerald-500"
                        }`}
                        title={isDone ? "Tandai belum selesai" : "Tandai selesai"}
                      >
                        ✓
                      </button>

                      {isOngoing && (
                        <span className="shrink-0 flex items-center gap-1 font-mono text-[9px] font-bold text-emerald-600 dark:text-[#4edea3]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#4edea3] animate-pulse" />
                          BERJALAN
                        </span>
                      )}
                      <span className={`text-xs font-semibold truncate ${cat.text} ${isDone ? "line-through text-slate-400 dark:text-[#958ea0]" : ""}`}>
                        {ev.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasRecurrence && (
                        <span
                          className="font-mono text-[9px] bg-white/60 dark:bg-white/[0.08] text-slate-600 dark:text-[#cbc3d7] px-1 rounded border border-slate-200/50 dark:border-transparent"
                          title={recurrenceLabel[ev.recurrence!]}
                        >
                          🔁
                        </span>
                      )}
                      <span className={`font-mono text-[9px] ${cat.text} opacity-70`}>
                        {formatTimeStr(evStart)}
                        {evEnd.getTime() !== evStart.getTime() && `–${formatTimeStr(evEnd)}`}
                      </span>
                    </div>
                  </div>

                  {isOngoing && heightPx >= 60 && (
                    <div className="flex items-center gap-2 mt-1">
                      <Link
                        href="/focus"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-[#d0bcff] dark:text-[#23005c] font-mono text-[9px] font-bold dark:hover:bg-[#b098f0] transition-colors shadow-xs"
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        openCreateModal();
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setSelectedDay(today);
        setWeekOffset(0);
        toast("Kembali ke hari ini.", "info");
      } else if (e.key === "Escape") {
        setIsModalOpen(false);
        setEditingEventId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openCreateModal, toast]);

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
          ev.id === eventId
            ? { ...ev, isCompleted: currentCompleted }
            : ev
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
        ignoreQuietHours = true; // Alarm bangun pagi harus abaikan jam hening
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
        router.refresh();
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
        toast(
          formRecurrence !== "NONE"
            ? `Rutinitas "${formTitle.trim()}" berhasil dibuat! 🔁`
            : "Jadwal/To-do berhasil disimpan! 📋",
          "success"
        );
        router.refresh();
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Terjadi kesalahan.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteEvent(id: string) {
    try {
      const res = await fetch(`/api/calendar-events/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setEvents((prev) => prev.filter((item) => item.id !== id));
      if (editingEventId === id) {
        setIsModalOpen(false);
        setEditingEventId(null);
      }
      toast("Berhasil dihapus.", "info");
      router.refresh();
    } catch {
      toast("Gagal menghapus.", "error");
    }
  }

  const filteredEvents = useMemo(() => {
    if (typeFilter === "ALL") return events;
    return events.filter((e) => e.eventType === typeFilter);
  }, [events, typeFilter]);

  const WEEK_START_HOUR = 5;
  const WEEK_END_HOUR = 23;
  const WEEK_PX_PER_HOUR = 60;
  const isCurrentWeek = weekOffset === 0;
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentMinutesFromStart = (currentHour - WEEK_START_HOUR) * 60 + currentMinute;
  const redLineTopPx = Math.max(
    0,
    Math.min(
      (WEEK_END_HOUR - WEEK_START_HOUR) * WEEK_PX_PER_HOUR,
      (currentMinutesFromStart / 60) * WEEK_PX_PER_HOUR
    )
  );

  const selectedDayLabel = getDayLabel(selectedDay);

  function shiftDay(delta: number) {
    setSelectedDay((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta);
      return d;
    });
  }

  return (
    <div className="flex flex-col w-full pb-16 gap-6 selection:bg-[#d0bcff] selection:text-[#340080]">
      {/* ── HEADER ── */}
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 pb-2 border-b border-slate-200 dark:border-white/[0.06]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-xs text-purple-600 dark:text-[#d0bcff] tracking-widest uppercase font-bold">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-500 dark:bg-[#d0bcff] animate-ping" />
            <span>JADWAL &amp; TO-DO HARIAN</span>
            <span className="text-slate-400 dark:text-[#494454]">•</span>
            <span className="text-emerald-600 dark:text-[#4edea3]">AKTIF</span>
          </div>
          <h1 className="text-2xl sm:text-3xl text-slate-900 dark:text-[#e2e2eb] font-semibold tracking-tight flex items-center gap-3">
            To-Do &amp; Jadwal
            {(viewMode === "TODO" || viewMode === "DAILY") && (
              <span className="font-mono text-xs text-emerald-700 dark:text-[#4edea3] bg-emerald-50 dark:bg-[#4edea3]/10 border border-emerald-200 dark:border-[#4edea3]/30 px-2 py-0.5 rounded">
                {selectedDayLabel.toUpperCase()}
              </span>
            )}
            {viewMode === "WEEKLY" && (
              <span className="font-mono text-xs text-emerald-700 dark:text-[#4edea3] bg-emerald-50 dark:bg-[#4edea3]/10 border border-emerald-200 dark:border-[#4edea3]/30 px-2 py-0.5 rounded">
                PEKAN {weekNumber}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 dark:text-[#958ea0] max-w-2xl">
            {viewMode === "TODO"
              ? "Daftar to-do harian interaktif — ceklis aktivitas saat selesai, input praktis tanpa wajib jam selesai."
              : viewMode === "DAILY"
              ? "Timeline alur waktu harian — lihat urutan jadwal visual dari subuh hingga malam."
              : "Gambaran besar kalender mingguan — klik hari mana saja untuk melihat detail to-do."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center bg-slate-100 dark:bg-[#0c0e14] p-1 rounded-lg border border-slate-200 dark:border-white/[0.06] shadow-inner">
            {(
              [
                { id: "TODO", label: "📋 To-Do Hari Ini" },
                { id: "DAILY", label: "⏱️ Timeline Jam" },
                { id: "WEEKLY", label: "📅 Mingguan" },
                { id: "AGENDA", label: "≡ Semua" },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewMode(v.id)}
                className={`px-3 py-1.5 rounded font-mono text-xs font-semibold transition-all ${
                  viewMode === v.id
                    ? "bg-purple-100 text-purple-700 dark:bg-[#340080] dark:text-[#d0bcff] border border-purple-200 dark:border-[#d0bcff]/30 shadow-xs"
                    : "text-slate-500 dark:text-[#958ea0] hover:text-slate-900 dark:hover:text-[#e2e2eb]"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => openCreateModal()}
            className="group flex items-center gap-2 bg-gradient-to-r from-[#a078ff] to-[#6d3bd7] text-white px-4 py-2 rounded-lg font-mono text-xs font-semibold shadow-[0_4px_20px_rgba(160,120,255,0.25)] hover:shadow-[0_0_24px_rgba(160,120,255,0.45)] transition-all transform hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
            </svg>
            <span>+ Buat Baru</span>
            <kbd className="font-mono text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded group-hover:bg-white/30">
              N
            </kbd>
          </button>
        </div>
      </header>

      {/* ── NAV BAR (day nav for TODO/DAILY, week nav for WEEKLY) ── */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#131825]/70 backdrop-blur-md p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-white/[0.07] shadow-sm">
        {viewMode === "TODO" || viewMode === "DAILY" ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 dark:bg-[#0c0e14] rounded-lg p-1 border border-slate-200 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => shiftDay(-1)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-[#1A2133] rounded text-slate-500 dark:text-[#958ea0] hover:text-slate-900 dark:hover:text-[#e2e2eb] transition-colors"
                title="Hari Sebelumnya"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                className="px-2.5 py-1 font-mono text-xs text-slate-600 dark:text-[#958ea0] hover:text-slate-900 dark:hover:text-[#e2e2eb] hover:bg-slate-200 dark:hover:bg-[#1A2133] rounded transition-colors"
              >
                Hari Ini <kbd className="text-[9px] bg-slate-200 dark:bg-[#0c0e14] text-slate-600 dark:text-[#cbc3d7] px-1 rounded">T</kbd>
              </button>
              <button
                type="button"
                onClick={() => shiftDay(1)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-[#1A2133] rounded text-slate-500 dark:text-[#958ea0] hover:text-slate-900 dark:hover:text-[#e2e2eb] transition-colors"
                title="Hari Berikutnya"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-[#e2e2eb]">
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
            <div className="flex items-center bg-slate-100 dark:bg-[#0c0e14] rounded-lg p-1 border border-slate-200 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setWeekOffset((o) => o - 1)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-[#1A2133] rounded text-slate-500 dark:text-[#958ea0] hover:text-slate-900 dark:hover:text-[#e2e2eb] transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="px-2.5 py-1 font-mono text-xs text-slate-600 dark:text-[#958ea0] hover:text-slate-900 dark:hover:text-[#e2e2eb] hover:bg-slate-200 dark:hover:bg-[#1A2133] rounded transition-colors"
              >
                Pekan Ini <kbd className="text-[9px] bg-slate-200 dark:bg-[#0c0e14] text-slate-600 dark:text-[#cbc3d7] px-1 rounded">T</kbd>
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset((o) => o + 1)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-[#1A2133] rounded text-slate-500 dark:text-[#958ea0] hover:text-slate-900 dark:hover:text-[#e2e2eb] transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-[#e2e2eb]">
              {weekDays[0].toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
              })}
              <span className="font-mono text-xs text-slate-500 dark:text-[#958ea0] ml-2">
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
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs whitespace-nowrap transition-all border ${
                typeFilter === cat.id
                  ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-[#340080] dark:text-[#d0bcff] dark:border-[#d0bcff]/40 shadow-xs"
                  : "bg-slate-100 dark:bg-[#191b22] text-slate-600 dark:text-[#958ea0] hover:text-slate-900 dark:hover:text-[#e2e2eb] border-slate-200/60 dark:border-transparent hover:bg-slate-200 dark:hover:bg-[#282a30]"
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

      {/* ── MAIN CONTENT ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Main Area */}
        <main className="xl:col-span-8 bg-white dark:bg-[#131825] rounded-xl border border-slate-200 dark:border-white/[0.07] shadow-sm dark:shadow-xl overflow-hidden flex flex-col">
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
            <>
              {/* Day headers */}
              <div className="grid grid-cols-8 bg-white/95 dark:bg-[#191b22]/90 backdrop-blur border-b border-slate-200 dark:border-white/[0.06] sticky top-0 z-20 text-center">
                <div className="p-3 flex flex-col items-center justify-center font-mono text-xs text-slate-500 dark:text-[#958ea0] border-r border-slate-200/80 dark:border-white/[0.04]">
                  <svg className="w-4 h-4 mb-0.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                  </svg>
                  <span>WIB</span>
                </div>
                {weekDays.map((day, idx) => {
                  const now = new Date();
                  const isToday = sameDay(day, now);
                  const isWeekend = idx >= 5;
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 sm:p-3 flex flex-col items-center justify-center gap-1 border-r border-slate-200/80 dark:border-white/[0.04] last:border-r-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors relative ${
                        isToday
                          ? "bg-purple-50/80 dark:bg-[#340080]/15"
                          : isWeekend
                          ? "bg-slate-50/50 dark:bg-[#0c0e14]/40"
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedDay(day);
                        setViewMode("TODO");
                      }}
                      title={`Buka To-Do: ${day.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}`}
                    >
                      {isToday && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-500 dark:bg-[#4edea3] shadow-sm" />
                      )}
                      {isToday ? (
                        <span className="font-mono text-[9px] bg-purple-100 text-purple-700 dark:bg-[#4edea3] dark:text-[#003824] px-1.5 py-0.2 rounded-full font-bold shadow-xs">
                          HARI INI
                        </span>
                      ) : null}
                      <span
                        className={`font-mono text-[10px] tracking-wider uppercase ${
                          isToday ? "text-purple-700 dark:text-[#4edea3] font-bold" : "text-slate-500 dark:text-[#958ea0]"
                        }`}
                      >
                        {["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"][idx]}
                      </span>
                      <span
                        className={`text-base font-semibold ${
                          isToday ? "text-purple-700 dark:text-white font-bold" : "text-slate-800 dark:text-[#e2e2eb]"
                        }`}
                      >
                        {String(day.getDate()).padStart(2, "0")}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 dark:text-[#958ea0]">
                        {day.toLocaleDateString("id-ID", { month: "short" })}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Grid Body */}
              <div className="relative overflow-x-auto select-none min-w-[720px] bg-white dark:bg-[#0c0e14]/30">
                {/* Real-time line */}
                {isCurrentWeek &&
                  currentHour >= WEEK_START_HOUR &&
                  currentHour <= WEEK_END_HOUR && (
                    <div
                      className="absolute left-0 right-0 z-30 pointer-events-none flex items-center transition-all duration-1000"
                      style={{ top: `${redLineTopPx}px` }}
                    >
                      <div className="w-[12.5%] pl-2 flex items-center justify-end pr-2">
                        <span className="font-mono text-[10px] text-rose-600 dark:text-[#F43F5E] bg-white dark:bg-[#131825] px-1 rounded shadow-sm border border-rose-200 dark:border-[#F43F5E]/30">
                          {String(currentHour).padStart(2, "0")}:
                          {String(currentMinute).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="flex-1 relative flex items-center">
                        <div className="h-[2px] w-full bg-rose-500 dark:bg-[#F43F5E] shadow-sm" />
                      </div>
                    </div>
                  )}

                <div className="relative grid grid-cols-8 divide-x divide-slate-200/60 dark:divide-white/[0.04]">
                  {/* Time labels */}
                  <div className="flex flex-col select-none">
                    {Array.from(
                      { length: WEEK_END_HOUR - WEEK_START_HOUR + 1 },
                      (_, i) => WEEK_START_HOUR + i
                    ).map((hour) => (
                      <div
                        key={hour}
                        className="h-[60px] border-b border-slate-200/60 dark:border-white/[0.04] p-1 text-right font-mono text-[10px] text-slate-400 dark:text-[#958ea0]"
                      >
                        {String(hour).padStart(2, "0")}:00
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {weekDays.map((day, dIdx) => {
                    const dayEvts = projectRecurringEvents(filteredEvents, day);

                    return (
                      <div
                        key={dIdx}
                        className="relative flex flex-col hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors"
                      >
                        {Array.from(
                          { length: WEEK_END_HOUR - WEEK_START_HOUR + 1 },
                          (_, i) => WEEK_START_HOUR + i
                        ).map((h) => (
                          <div
                            key={h}
                            onClick={() => openCreateModal(day, h)}
                            className="h-[60px] border-b border-slate-200/60 dark:border-white/[0.04] hover:bg-slate-100/60 dark:hover:bg-white/[0.02] cursor-pointer"
                            title={`+ Buat di ${day.toLocaleDateString("id-ID", { weekday: "short" })} jam ${String(h).padStart(2, "0")}:00`}
                          />
                        ))}

                        {/* Events overlay */}
                        <div className="absolute inset-0 pointer-events-none p-1">
                          {dayEvts.map((ev) => {
                            const evStart = new Date(ev.startTime);
                            const evEnd = new Date(ev.endTime);
                            const sH = evStart.getHours();
                            const sM = evStart.getMinutes();
                            const eH = evEnd.getHours();
                            const eM = evEnd.getMinutes();

                            const startOffsetMin = (sH - WEEK_START_HOUR) * 60 + sM;
                            if (startOffsetMin < 0) return null;
                            const topPx = (startOffsetMin / 60) * WEEK_PX_PER_HOUR;
                            const durationMin = Math.max(
                              20,
                              eH * 60 + eM - (sH * 60 + sM)
                            );
                            const heightPx = Math.max(
                              22,
                              (durationMin / 60) * WEEK_PX_PER_HOUR - 2
                            );
                            const cat =
                              CATEGORY_MAP[ev.eventType] ||
                              CATEGORY_MAP["BLOCKED"];
                            const isDone = !!ev.isCompleted;

                            return (
                              <div
                                key={ev.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(ev);
                                }}
                                className={`pointer-events-auto absolute left-1 right-1 rounded p-1 border cursor-pointer hover:z-20 transition-all ${cat.bg} ${cat.border} ${isDone ? "opacity-40" : ""}`}
                                style={{
                                  top: `${topPx}px`,
                                  height: `${heightPx}px`,
                                }}
                                title={`${ev.title} (${formatTimeStr(evStart)})`}
                              >
                                <div className="flex items-center gap-1">
                                  {isDone && <span className="text-[#4edea3] text-[9px]">✓</span>}
                                  <span
                                    className={`text-[10px] font-semibold truncate ${cat.text} ${isDone ? "line-through" : ""}`}
                                  >
                                    {ev.title}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* TAB 4: AGENDA VIEW */}
          {viewMode === "AGENDA" && (
            <div className="p-6 flex flex-col gap-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-[#e2e2eb]">
                Semua Jadwal &amp; To-Do
              </h3>
              <div className="flex flex-col gap-2">
                {events.map((ev) => {
                  const cat = CATEGORY_MAP[ev.eventType] || CATEGORY_MAP["PERSONAL"];
                  const st = new Date(ev.startTime);
                  const isDone = !!ev.isCompleted;

                  return (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-[#191b22] border border-slate-200 dark:border-white/[0.06]"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(ev.id, isDone)}
                          className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${
                            isDone
                              ? "bg-emerald-500 border-emerald-500 text-white dark:bg-[#4edea3] dark:border-[#4edea3] dark:text-[#00311f] shadow-xs"
                              : "border-slate-300 dark:border-white/30 bg-white dark:bg-[#0c0e14] text-transparent hover:text-emerald-500"
                          }`}
                        >
                          ✓
                        </button>
                        <div className="flex flex-col">
                          <span
                            className={`text-sm font-semibold ${cat.text} ${isDone ? "line-through text-slate-400 dark:text-[#958ea0]" : ""}`}
                          >
                            {ev.title}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500 dark:text-[#958ea0]">
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
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(ev)}
                          className="px-2.5 py-1 rounded bg-slate-100 dark:bg-[#282a30] text-xs text-slate-700 dark:text-[#e2e2eb] hover:bg-purple-100 dark:hover:bg-[#340080] border border-slate-200/60 dark:border-transparent transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="p-1 rounded text-slate-400 dark:text-[#958ea0] hover:text-rose-600 transition-colors"
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

        {/* Sidebar */}
        <aside className="xl:col-span-4 flex flex-col gap-6">
          {/* Quick info card */}
          <div className="bg-white dark:bg-[#131825] rounded-xl border border-slate-200 dark:border-white/[0.07] p-5 shadow-sm dark:shadow-xl flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-[#e2e2eb]">
              <span>💡 Panduan To-Do &amp; Jadwal</span>
            </div>
            <ul className="flex flex-col gap-2 font-mono text-xs text-slate-600 dark:text-[#958ea0]">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 dark:text-[#4edea3]">✓</span>
                <span>Ceklis to-do langsung dari daftar ataupun timeline jam.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 dark:text-[#4edea3]">⏰</span>
                <span>To-do dengan jam tidak wajib punya jam selesai. Praktis untuk bangun subuh, minum obat, atau jadwal kelas.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 dark:text-[#4edea3]">🔁</span>
                <span>Gunakan pengulangan <strong>Setiap Hari</strong> untuk rutinitas yang ingin Anda lakukan konsisten.</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {/* ── MODAL BUAT JADWAL / TO-DO BARU ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-[#0B0D13]/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white dark:bg-[#131825] rounded-xl shadow-2xl p-6 flex flex-col gap-4 border border-slate-200 dark:border-white/[0.08] relative animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600 dark:text-[#4edea3]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z" />
                </svg>
                <h2 className="text-base font-semibold text-slate-900 dark:text-[#e2e2eb]">
                  {editingEventId ? "Edit To-Do / Jadwal ✏️" : "Tambah To-Do / Jadwal Baru"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingEventId(null);
                }}
                className="text-slate-400 dark:text-[#958ea0] hover:text-slate-900 dark:hover:text-[#e2e2eb] p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2133] transition-colors"
              >
                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#282a30] text-slate-600 dark:text-[#cbc3d7]">
                  ESC
                </span>
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="flex flex-col gap-4">
              {/* Title */}
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] uppercase text-slate-700 dark:text-[#958ea0] font-semibold">
                  JUDUL TO-DO / AKTIVITAS
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="cth: Bangun Pagi Jam 5, Kuliah Basis Data, Beli vitamin..."
                  autoFocus
                  className="w-full bg-slate-50 dark:bg-[#0c0e14] px-3.5 py-2.5 rounded-lg font-mono text-xs text-slate-900 dark:text-[#e2e2eb] border border-slate-200 dark:border-white/[0.06] placeholder:text-slate-400 dark:placeholder-[#494454] focus:outline-none focus:border-emerald-500 dark:focus:border-[#4edea3]/50 shadow-inner"
                />
              </div>

              {/* Time Mode Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] uppercase text-slate-700 dark:text-[#958ea0] font-semibold">
                  PILIHAN WAKTU
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormTimeMode("START_ONLY")}
                    className={`p-2.5 rounded-lg border font-mono text-xs flex flex-col items-center gap-1 transition-all ${
                      formTimeMode === "START_ONLY"
                        ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-[#340080] dark:text-[#d0bcff] dark:border-[#d0bcff]/50 shadow-xs font-semibold"
                        : "bg-slate-50 dark:bg-[#0c0e14] text-slate-600 dark:text-[#958ea0] border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 hover:text-slate-900 dark:hover:text-[#e2e2eb]"
                    }`}
                  >
                    <span>⏰ Jam Mulai Saja</span>
                    <span className="text-[9px] opacity-70">Tanpa jam selesai</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTimeMode("RANGE")}
                    className={`p-2.5 rounded-lg border font-mono text-xs flex flex-col items-center gap-1 transition-all ${
                      formTimeMode === "RANGE"
                        ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-[#340080] dark:text-[#d0bcff] dark:border-[#d0bcff]/50 shadow-xs font-semibold"
                        : "bg-slate-50 dark:bg-[#0c0e14] text-slate-600 dark:text-[#958ea0] border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 hover:text-slate-900 dark:hover:text-[#e2e2eb]"
                    }`}
                  >
                    <span>⏳ Rentang Waktu</span>
                    <span className="text-[9px] opacity-70">Ada jam selesai</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTimeMode("ALL_DAY")}
                    className={`p-2.5 rounded-lg border font-mono text-xs flex flex-col items-center gap-1 transition-all ${
                      formTimeMode === "ALL_DAY"
                        ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-[#340080] dark:text-[#d0bcff] dark:border-[#d0bcff]/50 shadow-xs font-semibold"
                        : "bg-slate-50 dark:bg-[#0c0e14] text-slate-600 dark:text-[#958ea0] border-slate-200 dark:border-white/[0.06] hover:bg-slate-100 hover:text-slate-900 dark:hover:text-[#e2e2eb]"
                    }`}
                  >
                    <span>📝 Bebas Jam</span>
                    <span className="text-[9px] opacity-70">Kapan saja hari ini</span>
                  </button>
                </div>
              </div>

              {/* Date & Time inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[10px] uppercase text-slate-700 dark:text-[#958ea0] font-semibold">
                    TANGGAL
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0c0e14] px-3 py-2.5 rounded-lg font-mono text-xs text-slate-900 dark:text-[#e2e2eb] border border-slate-200 dark:border-white/[0.06] focus:outline-none focus:border-emerald-500 dark:focus:border-[#4edea3]/50"
                  />
                </div>

                {formTimeMode !== "ALL_DAY" && (
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[10px] uppercase text-slate-700 dark:text-[#958ea0] font-semibold">
                      {formTimeMode === "START_ONLY" ? "JAM TO-DO" : "JAM MULAI"}
                    </label>
                    <input
                      type="time"
                      required
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#0c0e14] px-3 py-2.5 rounded-lg font-mono text-xs text-emerald-700 dark:text-[#4edea3] border border-slate-200 dark:border-white/[0.06] focus:outline-none focus:border-emerald-500 dark:focus:border-[#4edea3]/50"
                    />
                  </div>
                )}

                {formTimeMode === "RANGE" && (
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="font-mono text-[10px] uppercase text-slate-700 dark:text-[#958ea0] font-semibold">
                      JAM SELESAI
                    </label>
                    <input
                      type="time"
                      required
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#0c0e14] px-3 py-2.5 rounded-lg font-mono text-xs text-emerald-700 dark:text-[#4edea3] border border-slate-200 dark:border-white/[0.06] focus:outline-none focus:border-emerald-500 dark:focus:border-[#4edea3]/50"
                    />
                  </div>
                )}
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] uppercase text-slate-700 dark:text-[#958ea0] font-semibold">
                  KATEGORI
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0c0e14] px-3.5 py-2.5 rounded-lg font-mono text-xs text-purple-700 dark:text-[#d0bcff] border border-slate-200 dark:border-white/[0.06] focus:outline-none focus:border-purple-500 dark:focus:border-[#d0bcff]/50 cursor-pointer"
                >
                  <option value="PERSONAL">🌱 Pribadi &amp; Kebiasaan (Bangun tidur, Sarapan, Ibadah, Olahraga)</option>
                  <option value="BLOCKED">🎯 Sesi Fokus / Deep Work (Belajar, Skripsi, Tugas Penting)</option>
                  <option value="WORK">💼 Pekerjaan &amp; Kuliah (Kelas, Meeting, Kerja)</option>
                  <option value="REMINDER">🔔 Pengingat &amp; Tugas Ringan (Beli barang, Telepon)</option>
                  <option value="TASK_DEADLINE">🔴 Tenggat Waktu</option>
                </select>
              </div>

              {/* Recurrence */}
              <div className="flex flex-col gap-1 bg-purple-50/50 dark:bg-[#0c0e14]/60 p-3 rounded-lg border border-purple-100 dark:border-white/[0.04]">
                <label className="font-mono text-[10px] uppercase text-purple-700 dark:text-[#d0bcff] font-semibold flex items-center gap-1.5">
                  <span>🔁 PENGULANGAN RUTINITAS</span>
                </label>
                <select
                  value={formRecurrence}
                  onChange={(e) => setFormRecurrence(e.target.value)}
                  className="w-full bg-white dark:bg-[#191b22] px-3 py-2 rounded-lg font-mono text-xs text-slate-900 dark:text-[#e2e2eb] border border-slate-200 dark:border-white/[0.06] focus:outline-none focus:border-purple-500 dark:focus:border-[#d0bcff]/50 cursor-pointer mt-1"
                >
                  <option value="NONE">Hanya sekali (hari ini saja)</option>
                  <option value="DAILY">Setiap hari (Rutinitas Harian)</option>
                  <option value="WEEKLY">Setiap minggu di hari yang sama</option>
                  <option value="MONTHLY">Setiap bulan di tanggal yang sama</option>
                </select>
              </div>

              {/* Reminders */}
              <div className="flex flex-col gap-2 bg-amber-50/50 dark:bg-[#0c0e14]/40 p-3 rounded-lg border border-amber-100 dark:border-white/[0.04]">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[10px] uppercase text-amber-700 dark:text-[#F59E0B] font-semibold">
                    🔔 NOTIFIKASI TELEGRAM
                  </label>
                  <span className="font-mono text-[10px] text-slate-500 dark:text-[#958ea0]">
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
                    className="w-full bg-white dark:bg-[#191b22] px-3 py-2 rounded-lg font-mono text-xs text-slate-900 dark:text-[#e2e2eb] border border-slate-200 dark:border-white/[0.06] focus:outline-none focus:border-amber-500 dark:focus:border-[#F59E0B]/50 cursor-pointer"
                  >
                    <option value="">Ikuti Preferensi ({defaultReminderMinutes} mnt)</option>
                    <option value="5">5 menit sebelum</option>
                    <option value="15">15 menit sebelum</option>
                    <option value="30">30 menit sebelum</option>
                    <option value="60">1 jam sebelum</option>
                  </select>

                  <label className="flex items-center gap-2 font-mono text-xs text-slate-800 dark:text-[#e2e2eb] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIgnoreQuietHours}
                      onChange={(e) => setFormIgnoreQuietHours(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 dark:accent-[#4edea3] rounded"
                    />
                    <span>Alarm Bangun (Abaikan Jam Hening)</span>
                  </label>
                </div>
              </div>

              {/* Submit & Delete */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/[0.06]">
                {editingEventId ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(editingEventId)}
                    className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-red-500/15 dark:hover:bg-red-500/25 dark:text-red-400 font-mono text-xs transition-colors cursor-pointer flex items-center gap-1.5 border border-rose-200 dark:border-transparent"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span>Hapus To-Do</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingEventId(null);
                    }}
                    className="px-4 py-2 font-mono text-xs text-slate-600 dark:text-[#958ea0] hover:text-slate-900 dark:hover:text-[#e2e2eb] hover:bg-slate-100 dark:hover:bg-transparent rounded-lg transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white dark:bg-[#4edea3] dark:hover:bg-[#3ec48e] dark:text-[#00311f] font-mono text-xs font-bold transition-all shadow-sm dark:shadow-[0_0_16px_rgba(78,222,163,0.3)] disabled:opacity-50 active:scale-98 cursor-pointer"
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
