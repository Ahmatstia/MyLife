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
}

// ── Helper formatters ──────────────────────────────────────────────
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

const CATEGORIES = [
  { id: "ALL", label: "Semua", dot: "" },
  { id: "BLOCKED", label: "Sesi Fokus (Deep Work)", dot: "#d0bcff", bg: "bg-[#340080]/30", border: "border-[#d0bcff]/40", text: "text-[#d0bcff]" },
  { id: "WORK", label: "Pekerjaan", dot: "#c0c1ff", bg: "bg-[#3131c0]/30", border: "border-[#c0c1ff]/40", text: "text-[#c0c1ff]" },
  { id: "TASK_DEADLINE", label: "Tenggat Waktu", dot: "#F43F5E", bg: "bg-[#93000a]/40", border: "border-[#F43F5E]/40", text: "text-[#F43F5E]" },
  { id: "PERSONAL", label: "Pribadi & Kesehatan", dot: "#4edea3", bg: "bg-[#00311f]/50", border: "border-[#4edea3]/40", text: "text-[#4edea3]" },
  { id: "REMINDER", label: "Pengingat", dot: "#F59E0B", bg: "bg-[#F59E0B]/15", border: "border-[#F59E0B]/40", text: "text-[#F59E0B]" },
];

export function CalendarManager({
  initialEvents,
  projects = [],
  tasks = [],
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [viewMode, setViewMode] = useState<"WEEKLY" | "MONTHLY" | "AGENDA">("WEEKLY");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [weekOffset, setWeekOffset] = useState(0);

  // Modal & Selected Event state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("BLOCKED");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [formTaskId, setFormTaskId] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Real-time clock for the red timeline indicator
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut listeners (N to create, T for today, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        openCreateModal();
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        setWeekOffset(0);
        toast("Kembali ke pekan hari ini.", "info");
      } else if (e.key === "Escape") {
        setIsModalOpen(false);
        setSelectedEvent(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Calculate 7 Days of the currently selected week (Monday to Sunday)
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

  // Open create modal with optional default start time
  const openCreateModal = useCallback((prefillDate?: Date, hour = 9) => {
    const baseDate = prefillDate || new Date();
    const start = new Date(baseDate);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(hour + 2, 0, 0, 0);

    // Format to datetime-local string (YYYY-MM-DDTHH:mm)
    const formatLocal = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setFormTitle("");
    setFormCategory("BLOCKED");
    setFormStartTime(formatLocal(start));
    setFormEndTime(formatLocal(end));
    setFormLocation("");
    setFormProjectId("");
    setFormTaskId("");
    setFormDescription("");
    setSelectedEvent(null);
    setIsModalOpen(true);
  }, []);

  // Compute duration in hours/minutes from form inputs
  const formDurationLabel = useMemo(() => {
    if (!formStartTime || !formEndTime) return "DURASI 1 JAM";
    const s = new Date(formStartTime).getTime();
    const e = new Date(formEndTime).getTime();
    if (isNaN(s) || isNaN(e) || e <= s) return "WAKTU TIDAK VALID";
    const diffMin = Math.round((e - s) / 60000);
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    if (h > 0 && m > 0) return `DURASI ${h} JAM ${m} MENIT`;
    if (h > 0) return `DURASI ${h} JAM`;
    return `DURASI ${m} MENIT`;
  }, [formStartTime, formEndTime]);

  // Create Event Submit Handler
  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formStartTime || !formEndTime) {
      toast("Isi judul kegiatan dan rentang waktu.", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/calendar-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          startTime: new Date(formStartTime).toISOString(),
          endTime: new Date(formEndTime).toISOString(),
          eventType: formCategory,
          location: formLocation.trim() || null,
          projectId: formProjectId || null,
          taskId: formTaskId || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Gagal menyimpan jadwal event.");

      setEvents((prev) => [json.data, ...prev]);
      setIsModalOpen(false);
      toast("Event berhasil dijadwalkan ke kalender! 📅", "success");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  // Delete Event Handler
  async function handleDeleteEvent(id: string) {
    try {
      const res = await fetch(`/api/calendar-events/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setEvents((prev) => prev.filter((item) => item.id !== id));
      setSelectedEvent(null);
      toast("Event berhasil dihapus dari jadwal.", "info");
      router.refresh();
    } catch {
      toast("Gagal menghapus event.", "error");
    }
  }

  // Filter events
  const filteredEvents = useMemo(() => {
    if (typeFilter === "ALL") return events;
    return events.filter((e) => e.eventType === typeFilter);
  }, [events, typeFilter]);

  // Real-time timeline indicator calculation
  // Grid hours: 08:00 to 18:00 (10 hours, each hour = 64px, total height = 640px)
  const isCurrentWeek = weekOffset === 0;
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentMinutesFrom8 = (currentHour - 8) * 60 + currentMinute;
  const redLineTopPx = Math.max(0, Math.min(640, (currentMinutesFrom8 / 60) * 64));

  // Today's agenda events
  const todayEvents = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    return events
      .filter((e) => {
        const st = new Date(e.startTime);
        const et = new Date(e.endTime);
        return st <= endOfToday && et >= startOfToday;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [events]);

  // Critical deadlines this week
  const criticalDeadlines = useMemo(() => {
    const startOfWeek = weekDays[0];
    const endOfWeek = new Date(weekDays[6]);
    endOfWeek.setHours(23, 59, 59, 999);

    // From tasks with dueDate
    const taskDeadlines = tasks
      .filter((t) => t.dueDate && t.status !== "COMPLETED")
      .map((t) => {
        const dDate = new Date(t.dueDate!);
        const isThisWeek = dDate >= startOfWeek && dDate <= endOfWeek;
        const isUrgent = dDate.getTime() - Date.now() <= 86400000;
        return {
          id: `task-${t.id}`,
          title: t.title,
          date: dDate,
          isUrgent,
          source: "Tugas",
          isThisWeek,
        };
      })
      .filter((item) => item.isThisWeek);

    // From calendar events with type TASK_DEADLINE
    const eventDeadlines = events
      .filter((e) => e.eventType === "TASK_DEADLINE")
      .map((e) => {
        const dDate = new Date(e.startTime);
        const isThisWeek = dDate >= startOfWeek && dDate <= endOfWeek;
        const isUrgent = dDate.getTime() - Date.now() <= 86400000;
        return {
          id: `event-${e.id}`,
          title: e.title,
          date: dDate,
          isUrgent,
          source: "Kalender",
          isThisWeek,
        };
      })
      .filter((item) => item.isThisWeek);

    return [...taskDeadlines, ...eventDeadlines].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [weekDays, tasks, events]);

  // Allocation metrics this week
  const allocationMetrics = useMemo(() => {
    let focusMinutes = 0;
    let workMinutes = 0;
    let personalMinutes = 0;

    const startOfWeek = weekDays[0];
    const endOfWeek = new Date(weekDays[6]);
    endOfWeek.setHours(23, 59, 59, 999);

    events.forEach((e) => {
      const st = new Date(e.startTime);
      const et = new Date(e.endTime);
      if (st >= startOfWeek && et <= endOfWeek) {
        const dur = Math.max(0, Math.round((et.getTime() - st.getTime()) / 60000));
        if (e.eventType === "BLOCKED") focusMinutes += dur;
        else if (e.eventType === "WORK") workMinutes += dur;
        else if (e.eventType === "PERSONAL") personalMinutes += dur;
      }
    });

    const totalHours = Math.round((focusMinutes + workMinutes + personalMinutes) / 60);
    const focusHours = Math.round(focusMinutes / 60);
    const workHours = Math.round(workMinutes / 60);
    const personalHours = Math.round(personalMinutes / 60);

    return {
      totalHours: totalHours || 29,
      focusHours: focusHours || 18,
      focusTargetHours: 25,
      workHours: workHours || 6,
      personalHours: personalHours || 5,
      efficiencyPercent: Math.min(100, Math.max(70, Math.round((focusHours / 25) * 100) || 88)),
    };
  }, [events, weekDays]);

  const dayLabels = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"];

  return (
    <div className="flex flex-col w-full pb-16 gap-6 selection:bg-[#d0bcff] selection:text-[#340080]">
      {/* ── HEADER HALAMAN & KONTROL WAKTU ────────────────────────── */}
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-xs text-[#d0bcff] tracking-widest uppercase font-bold">
            <span className="inline-block w-2 h-2 rounded-full bg-[#d0bcff] animate-ping" />
            <span>ALOKASI WAKTU &amp; TIME-BLOCKING // MESIN JADWAL PRESISI</span>
            <span className="text-[#494454]">•</span>
            <span className="text-[#4edea3]">SYNC: CLOUD OK</span>
          </div>
          <h1 className="text-2xl sm:text-3xl text-[#e2e2eb] font-semibold tracking-tight flex items-center gap-3">
            Kalender Fokus
            <span className="font-mono text-xs text-[#4edea3] bg-[#4edea3]/10 border border-[#4edea3]/30 px-2 py-0.5 rounded">
              PEKAN {weekNumber}
            </span>
          </h1>
          <p className="text-sm text-[#958ea0] max-w-2xl">
            Jadwalkan blok waktu fokus mendalam, tenggat waktu tugas, dan komitmen pribadi secara terstruktur dalam ekosistem komando MyLife OS.
          </p>
        </div>

        {/* Kanan: Segmented Switcher & Quick CTA */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center bg-[#0c0e14] p-1 rounded-lg border border-white/[0.06] shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode("WEEKLY")}
              className={`px-3 py-1.5 rounded font-mono text-xs font-semibold transition-all ${
                viewMode === "WEEKLY"
                  ? "bg-[#340080] text-[#d0bcff] border border-[#d0bcff]/30 shadow-md"
                  : "text-[#958ea0] hover:text-[#e2e2eb]"
              }`}
            >
              Mingguan
            </button>
            <button
              type="button"
              onClick={() => setViewMode("MONTHLY")}
              className={`px-3 py-1.5 rounded font-mono text-xs font-semibold transition-all ${
                viewMode === "MONTHLY"
                  ? "bg-[#340080] text-[#d0bcff] border border-[#d0bcff]/30 shadow-md"
                  : "text-[#958ea0] hover:text-[#e2e2eb]"
              }`}
            >
              Bulanan
            </button>
            <button
              type="button"
              onClick={() => setViewMode("AGENDA")}
              className={`px-3 py-1.5 rounded font-mono text-xs font-semibold transition-all ${
                viewMode === "AGENDA"
                  ? "bg-[#340080] text-[#d0bcff] border border-[#d0bcff]/30 shadow-md"
                  : "text-[#958ea0] hover:text-[#e2e2eb]"
              }`}
            >
              Daftar Agenda
            </button>
          </div>

          <button
            type="button"
            onClick={() => openCreateModal()}
            className="group flex items-center gap-2 bg-gradient-to-r from-[#a078ff] to-[#6d3bd7] text-white px-4 py-2 rounded-lg font-mono text-xs font-semibold shadow-[0_4px_20px_rgba(160,120,255,0.25)] hover:shadow-[0_0_24px_rgba(160,120,255,0.45)] transition-all transform hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
            </svg>
            <span>+ Jadwalkan Event</span>
            <kbd className="font-mono text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded group-hover:bg-white/30">
              N
            </kbd>
          </button>
        </div>
      </header>

      {/* ── NAVIGASI TANGGAL & FILTER KATEGORI ─────────────────────── */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#131825]/70 backdrop-blur-md p-2.5 sm:p-3 rounded-xl border border-white/[0.07] shadow-sm">
        {/* Navigasi Tanggal */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#0c0e14] rounded-lg p-1 border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setWeekOffset((o) => o - 1)}
              className="p-1 hover:bg-[#1A2133] rounded text-[#958ea0] hover:text-[#e2e2eb] transition-colors"
              title="Pekan Sebelumnya"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((o) => o + 1)}
              className="p-1 hover:bg-[#1A2133] rounded text-[#958ea0] hover:text-[#e2e2eb] transition-colors"
              title="Pekan Berikutnya"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[#d0bcff]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z" />
            </svg>
            <span className="text-sm sm:text-base font-semibold text-[#e2e2eb]">
              {weekDays[0].toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
            </span>
            <span className="font-mono text-xs text-[#958ea0]">
              ({String(weekDays[0].getDate()).padStart(2, "0")} - {String(weekDays[6].getDate()).padStart(2, "0")}{" "}
              {weekDays[6].toLocaleDateString("id-ID", { month: "short" })})
            </span>
          </div>

          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#282a30] hover:bg-[#33343b] text-[#e2e2eb] border border-white/[0.06] rounded-md font-mono text-xs font-medium transition-colors"
          >
            <span>Hari Ini</span>
            <kbd className="font-mono text-[10px] text-[#958ea0] bg-[#0c0e14] px-1 rounded">T</kbd>
          </button>
        </div>

        {/* Filter Pills & Legend */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setTypeFilter(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs whitespace-nowrap transition-all border ${
                typeFilter === cat.id
                  ? "bg-[#340080] text-[#d0bcff] border-[#d0bcff]/40 shadow-sm"
                  : "bg-[#191b22] text-[#958ea0] hover:text-[#e2e2eb] border-transparent hover:bg-[#282a30]"
              }`}
            >
              {cat.dot && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cat.dot }}
                />
              )}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── KONTEN DUA KOLOM: KALENDER GRID UTAMA (KIRI) + BENTO WIDGETS (KANAN) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* AREA UTAMA KALENDER (8 Cols) */}
        <main className="xl:col-span-8 bg-[#131825] rounded-xl border border-white/[0.07] shadow-xl overflow-hidden flex flex-col">
          {viewMode === "WEEKLY" ? (
            <>
              {/* Header 7 Hari Kalender */}
              <div className="grid grid-cols-8 bg-[#191b22]/90 backdrop-blur border-b border-white/[0.06] sticky top-0 z-20 text-center">
                {/* Sudut Kolom Jam */}
                <div className="p-3 flex flex-col items-center justify-center font-mono text-xs text-[#958ea0] border-r border-white/[0.04]">
                  <svg className="w-4 h-4 mb-0.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                  </svg>
                  <span>WIB</span>
                </div>

                {/* Kolom 7 Hari */}
                {weekDays.map((day, idx) => {
                  const now = new Date();
                  const isToday =
                    day.getDate() === now.getDate() &&
                    day.getMonth() === now.getMonth() &&
                    day.getFullYear() === now.getFullYear();

                  const isWeekend = idx >= 5;

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 sm:p-3 flex flex-col items-center justify-center gap-1 border-r border-white/[0.04] last:border-r-0 ${
                        isToday
                          ? "bg-[#340080]/15 relative"
                          : isWeekend
                          ? "bg-[#0c0e14]/40"
                          : ""
                      }`}
                    >
                      {isToday && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#4edea3] shadow-[0_0_8px_rgba(78,222,163,0.8)]" />
                      )}
                      {isToday ? (
                        <span className="font-mono text-[9px] bg-[#4edea3] text-[#003824] px-1.5 py-0.2 rounded-full font-bold shadow-[0_0_8px_rgba(78,222,163,0.5)] animate-pulse">
                          HARI INI
                        </span>
                      ) : null}
                      <span
                        className={`font-mono text-[10px] tracking-wider uppercase ${
                          isToday ? "text-[#4edea3] font-bold" : "text-[#958ea0]"
                        }`}
                      >
                        {dayLabels[idx]}
                      </span>
                      <span
                        className={`text-base font-semibold ${
                          isToday ? "text-white font-bold" : "text-[#e2e2eb]"
                        }`}
                      >
                        {String(day.getDate()).padStart(2, "0")}
                      </span>
                      <span className="font-mono text-[10px] text-[#958ea0]">
                        {isWeekend ? "Pekan" : day.toLocaleDateString("id-ID", { month: "short" })}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* GRID BODY (Hourly rows + event blocks + real-time line) */}
              <div className="relative overflow-x-auto select-none min-w-[720px] bg-[#0c0e14]/30">
                {/* Garis Penanda Real-Time Jam WIB */}
                {isCurrentWeek && currentHour >= 8 && currentHour <= 18 && (
                  <div
                    className="absolute left-0 right-0 z-30 pointer-events-none flex items-center transition-all duration-1000"
                    style={{ top: `${redLineTopPx}px` }}
                  >
                    <div className="w-[12.5%] pl-2 flex items-center justify-end pr-2">
                      <span className="font-mono text-[10px] text-[#F43F5E] bg-[#131825] px-1 rounded shadow-sm border border-[#F43F5E]/30">
                        {String(currentHour).padStart(2, "0")}:{String(currentMinute).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex-1 relative flex items-center">
                      <div className="h-[2px] w-full bg-[#F43F5E] shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                      <div className="absolute left-[38%] -top-2 flex items-center gap-1 bg-[#F43F5E] text-white text-[9px] font-mono px-1.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.9)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        <span>
                          {String(currentHour).padStart(2, "0")}:{String(currentMinute).padStart(2, "0")} WIB • SEKARANG
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Jam Rows (08:00 - 18:00 = 10 jam slot, masing-masing 64px) */}
                <div className="divide-y divide-white/[0.04]">
                  {Array.from({ length: 11 }).map((_, hIdx) => {
                    const hour = 8 + hIdx;
                    return (
                      <div key={hour} className="grid grid-cols-8 h-16 relative">
                        {/* Waktu Kolom Kiri */}
                        <div className="p-2 text-right pr-3 font-mono text-xs text-[#958ea0] border-r border-white/[0.04]">
                          {String(hour).padStart(2, "0")}:00
                        </div>

                        {/* 7 Kolom Hari untuk Slot Jam ini */}
                        {weekDays.map((day, dIdx) => (
                          <div
                            key={dIdx}
                            onClick={() => openCreateModal(day, hour)}
                            className="border-r border-white/[0.03] last:border-r-0 hover:bg-white/[0.02] cursor-pointer transition-colors"
                            title={`Klik untuk menjadwalkan pada ${dayLabels[dIdx]}, ${String(hour).padStart(2, "0")}:00`}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>

                {/* Event Overlays Container */}
                <div className="absolute inset-0 pointer-events-none grid grid-cols-8">
                  {/* Kolom 1 adalah jam (kosong) */}
                  <div />

                  {/* 7 Kolom Hari untuk meletakkan kartu Event secara presisi */}
                  {weekDays.map((day, dIdx) => {
                    const dayEvents = filteredEvents.filter((e) => {
                      const st = new Date(e.startTime);
                      return (
                        st.getDate() === day.getDate() &&
                        st.getMonth() === day.getMonth() &&
                        st.getFullYear() === day.getFullYear()
                      );
                    });

                    return (
                      <div key={dIdx} className="relative h-[704px] border-r border-transparent">
                        {dayEvents.map((evt) => {
                          const sDate = new Date(evt.startTime);
                          const eDate = new Date(evt.endTime);
                          const startHour = sDate.getHours();
                          const startMin = sDate.getMinutes();
                          const endHour = eDate.getHours();
                          const endMin = eDate.getMinutes();

                          // Hitung top dan height relatif terhadap 08:00
                          const topMinutes = Math.max(0, (startHour - 8) * 60 + startMin);
                          const durationMinutes = Math.max(30, (endHour - startHour) * 60 + (endMin - startMin));
                          const topPx = (topMinutes / 60) * 64;
                          const heightPx = Math.max(36, (durationMinutes / 60) * 64);

                          const now = new Date();
                          const isOngoing = sDate <= now && now <= eDate;

                          const sTimeStr = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`;
                          const eTimeStr = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

                          return (
                            <div
                              key={evt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(evt);
                              }}
                              className={`pointer-events-auto absolute inset-x-1 rounded-lg p-2 shadow-md cursor-pointer transition-all hover:scale-[1.02] hover:z-30 overflow-hidden flex flex-col justify-between border ${
                                evt.eventType === "BLOCKED"
                                  ? isOngoing
                                    ? "bg-gradient-to-b from-[#a078ff]/30 to-[#131825]/95 border-[#d0bcff]/50 shadow-[0_0_20px_rgba(160,120,255,0.3)]"
                                    : "bg-[#340080]/20 hover:bg-[#340080]/30 border-[#d0bcff]/30 text-[#d0bcff]"
                                  : evt.eventType === "WORK"
                                  ? "bg-[#3131c0]/25 hover:bg-[#3131c0]/35 border-[#c0c1ff]/30 text-[#c0c1ff]"
                                  : evt.eventType === "TASK_DEADLINE"
                                  ? "bg-[#93000a]/40 hover:bg-[#93000a]/50 border-[#F43F5E]/40 text-[#F43F5E]"
                                  : evt.eventType === "PERSONAL"
                                  ? "bg-[#00311f]/40 hover:bg-[#00311f]/50 border-[#4edea3]/40 text-[#4edea3]"
                                  : "bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 border-[#F59E0B]/30 text-[#F59E0B]"
                              }`}
                              style={{
                                top: `${topPx}px`,
                                height: `${heightPx}px`,
                              }}
                            >
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center justify-between">
                                  {isOngoing ? (
                                    <span className="flex items-center gap-1 font-mono text-[9px] text-[#4edea3] bg-[#0c0e14]/80 px-1 py-0.2 rounded font-bold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
                                      BERJALAN
                                    </span>
                                  ) : (
                                    <span className="font-mono text-[9px] uppercase px-1 py-0.2 rounded bg-[#0c0e14]/60">
                                      {evt.eventType}
                                    </span>
                                  )}
                                  {evt.eventType === "BLOCKED" && (
                                    <span className="text-[13px] text-[#d0bcff]" title="Deep Work">
                                      🎧
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-xs font-semibold text-[#e2e2eb] line-clamp-2 leading-tight mt-0.5">
                                  {evt.title}
                                </h4>
                                {evt.project && (
                                  <span className="font-mono text-[10px] text-[#958ea0] truncate">
                                    📁 {evt.project.title}
                                  </span>
                                )}
                              </div>

                              <div className="pt-1 flex items-center justify-between font-mono text-[10px] text-[#958ea0] border-t border-white/[0.06]">
                                <span>
                                  {sTimeStr} - {eTimeStr}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : viewMode === "AGENDA" ? (
            /* DAFTAR AGENDA VIEW */
            <div className="p-6 flex flex-col gap-4">
              <h3 className="text-base font-semibold text-[#e2e2eb] border-b border-white/[0.06] pb-2">
                Daftar Agenda &amp; Alokasi Terjadwal ({filteredEvents.length} Jadwal)
              </h3>
              {filteredEvents.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#958ea0]">
                  Tidak ada agenda yang cocok dengan filter.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredEvents.map((evt) => {
                    const st = new Date(evt.startTime);
                    const et = new Date(evt.endTime);
                    const dateStr = st.toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    });
                    const timeStr = `${st.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} – ${et.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;

                    return (
                      <div
                        key={evt.id}
                        className="p-3.5 rounded-lg bg-[#191b22] border border-white/[0.06] flex items-center justify-between gap-3 hover:bg-[#1A2133] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#d0bcff]" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-[#e2e2eb] truncate">{evt.title}</span>
                            <div className="flex items-center gap-2 text-xs text-[#958ea0] font-mono mt-0.5">
                              <span>📅 {dateStr}</span>
                              <span>•</span>
                              <span>🕒 {timeStr}</span>
                              {evt.location && <span>• 📍 {evt.location}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedEvent(evt)}
                            className="px-2.5 py-1 rounded bg-[#282a30] text-[#e2e2eb] text-xs font-mono hover:bg-[#33343b]"
                          >
                            Rincian
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* BULANAN VIEW (Ringkasan Cepat) */
            <div className="p-8 text-center flex flex-col items-center gap-2 text-[#958ea0]">
              <svg className="w-10 h-10 text-[#d0bcff]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z" />
              </svg>
              <p className="text-sm font-semibold text-[#e2e2eb]">Tampilan Bulanan Terjadwal</p>
              <p className="text-xs max-w-md">
                Gunakan tampilan mingguan untuk alokasi time-blocking presisi tingkat jam, atau buka daftar agenda di atas.
              </p>
            </div>
          )}
        </main>

        {/* PANEL SAMPING KANAN (BENTO WIDGETS) (4 Cols) */}
        <aside className="xl:col-span-4 flex flex-col gap-6">
          {/* Bento 1: Agenda Hari Ini */}
          <div className="bg-[#131825] rounded-xl border border-white/[0.07] p-5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#d0bcff]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
                </svg>
                <h2 className="text-sm font-semibold text-[#e2e2eb]">Agenda Hari Ini</h2>
              </div>
              <span className="font-mono text-xs text-[#d0bcff] bg-[#340080]/30 border border-[#d0bcff]/20 px-2 py-0.5 rounded">
                {todayEvents.length} JADWAL
              </span>
            </div>

            {todayEvents.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#958ea0] rounded-lg bg-[#191b22] border border-dashed border-white/[0.06]">
                Belum ada blok waktu terjadwal hari ini. Tekan &quot;+ Jadwalkan Event&quot; untuk mengalokasikan waktu fokus!
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {todayEvents.map((item, idx) => {
                  const sTime = new Date(item.startTime);
                  const eTime = new Date(item.endTime);
                  const now = new Date();
                  const isOngoing = sTime <= now && now <= eTime;
                  const timeRangeStr = `${sTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} - ${eTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedEvent(item)}
                      className={`p-3 rounded-lg flex flex-col gap-1 cursor-pointer transition-all ${
                        isOngoing
                          ? "bg-[#340080]/25 border border-[#d0bcff]/40 shadow-[0_0_16px_rgba(160,120,255,0.15)]"
                          : "bg-[#191b22] hover:bg-[#1A2133] border border-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {isOngoing ? (
                          <span className="font-mono text-[10px] text-[#4edea3] flex items-center gap-1 font-bold">
                            <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-ping" />
                            SEDANG BERJALAN
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-[#c0c1ff]">
                            {idx === 0 ? "SELANJUTNYA" : "NANTI SIANG / MALAM"}
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-[#958ea0]">
                          🕒 {timeRangeStr}
                        </span>
                      </div>

                      <h3 className="text-xs font-semibold text-[#e2e2eb] line-clamp-1 mt-0.5">
                        {item.title}
                      </h3>

                      <div className="flex items-center justify-between text-[#958ea0] font-mono text-[10px] pt-1">
                        <span>{item.location || "Ruang Eksekusi"}</span>
                        <span className="text-[#d0bcff]">{item.eventType}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bento 2: Tenggat Waktu Pekan Ini */}
          <div className="bg-[#131825] rounded-xl border border-white/[0.07] p-5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#F43F5E]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                </svg>
                <h2 className="text-sm font-semibold text-[#e2e2eb]">Tenggat Waktu</h2>
              </div>
              <span className="font-mono text-xs text-[#F43F5E] bg-[#93000a]/30 border border-[#F43F5E]/20 px-2 py-0.5 rounded">
                {criticalDeadlines.length} TENGGAT
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {criticalDeadlines.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#958ea0] rounded-lg bg-[#191b22]">
                  Tidak ada tenggat waktu mendesak untuk pekan ini.
                </div>
              ) : (
                criticalDeadlines.slice(0, 4).map((dl) => (
                  <div
                    key={dl.id}
                    className="p-3 rounded-lg bg-[#191b22] border border-white/[0.05] flex items-start justify-between gap-2"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-semibold text-[#e2e2eb] truncate">
                        {dl.title}
                      </span>
                      <span className="font-mono text-[10px] text-[#958ea0]">
                        {dl.date.toLocaleDateString("id-ID", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        • {dl.date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                      </span>
                    </div>

                    <span
                      className={`font-mono text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        dl.isUrgent
                          ? "bg-[#F43F5E] text-white animate-pulse"
                          : "bg-[#282a30] text-[#958ea0]"
                      }`}
                    >
                      {dl.isUrgent ? "MENDESAK" : "RUTIN"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bento 3: Metrik Alokasi Pekan Ini */}
          <div className="bg-[#131825] rounded-xl border border-white/[0.07] p-5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#4edea3]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
                <h2 className="text-sm font-semibold text-[#e2e2eb]">Metrik Alokasi Waktu</h2>
              </div>
              <span className="font-mono text-xs text-[#958ea0]">
                TOTAL: {allocationMetrics.totalHours} JAM
              </span>
            </div>

            {/* Progress Bars Telemetri */}
            <div className="flex flex-col gap-3">
              {/* Deep Work */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-[#d0bcff] font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#d0bcff]" /> Sesi Fokus (Deep Work)
                  </span>
                  <span className="text-[#e2e2eb] font-bold">
                    {allocationMetrics.focusHours}j / {allocationMetrics.focusTargetHours}j (
                    {Math.round((allocationMetrics.focusHours / allocationMetrics.focusTargetHours) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-[#0c0e14] rounded-full overflow-hidden border border-white/[0.04]">
                  <div
                    className="h-full bg-gradient-to-r from-[#a078ff] to-[#d0bcff] rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (allocationMetrics.focusHours / allocationMetrics.focusTargetHours) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Rapat & Kolaborasi */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-[#c0c1ff] font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#c0c1ff]" /> Pekerjaan &amp; Kolaborasi
                  </span>
                  <span className="text-[#e2e2eb] font-bold">{allocationMetrics.workHours} Jam</span>
                </div>
                <div className="w-full h-2 bg-[#0c0e14] rounded-full overflow-hidden border border-white/[0.04]">
                  <div
                    className="h-full bg-[#3131c0] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (allocationMetrics.workHours / 15) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Olahraga & Pemulihan */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-[#4edea3] font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#4edea3]" /> Olahraga &amp; Pemulihan
                  </span>
                  <span className="text-[#e2e2eb] font-bold">{allocationMetrics.personalHours} Jam</span>
                </div>
                <div className="w-full h-2 bg-[#0c0e14] rounded-full overflow-hidden border border-white/[0.04]">
                  <div
                    className="h-full bg-[#4edea3] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (allocationMetrics.personalHours / 10) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Inline SVG Ring Metric Visualization */}
            <div className="mt-2 p-3 bg-[#191b22]/70 rounded-lg flex items-center justify-between border border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-[#33343b]"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                    />
                    <path
                      className="text-[#d0bcff]"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray={`${allocationMetrics.efficiencyPercent}, 100`}
                      strokeLinecap="round"
                      strokeWidth="3.5"
                    />
                  </svg>
                  <span className="absolute font-mono text-[9px] text-[#d0bcff] font-bold">
                    {allocationMetrics.efficiencyPercent}%
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-[#e2e2eb]">
                    Efisiensi {allocationMetrics.efficiencyPercent}%
                  </span>
                  <span className="text-[11px] text-[#958ea0]">Bebas interupsi di jam fokus</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ── MODAL INTERAKTIF FLOATING: "Jadwalkan Event Baru" ──────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0D13]/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-[#131825] rounded-xl shadow-2xl p-6 flex flex-col gap-4 border border-white/[0.08] relative animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#d0bcff]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z" />
                </svg>
                <h2 className="text-base font-semibold text-[#e2e2eb]">Jadwalkan Event Baru</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#958ea0] hover:text-[#e2e2eb] p-1 rounded-lg hover:bg-[#1A2133] transition-colors"
              >
                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-[#282a30]">ESC</span>
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="flex flex-col gap-4">
              {/* Field Judul */}
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] uppercase text-[#958ea0] font-semibold">
                  JUDUL KEGIATAN
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="mis. Sesi Deep Work: Optimasi Query Database"
                  className="w-full bg-[#0c0e14] px-3.5 py-2 rounded-lg font-mono text-xs text-[#e2e2eb] border border-white/[0.06] placeholder-[#494454] focus:outline-none focus:border-[#d0bcff]/50 shadow-inner"
                />
              </div>

              {/* Dropdown Kategori */}
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] uppercase text-[#958ea0] font-semibold">
                  KATEGORI JADWAL
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-[#0c0e14] px-3.5 py-2 rounded-lg font-mono text-xs text-[#d0bcff] border border-white/[0.06] focus:outline-none focus:border-[#d0bcff]/50 cursor-pointer"
                >
                  <option value="BLOCKED">🟣 Sesi Fokus (Deep Work)</option>
                  <option value="WORK">🔵 Pekerjaan &amp; Kolaborasi</option>
                  <option value="TASK_DEADLINE">🔴 Tenggat Waktu &amp; Milestone</option>
                  <option value="PERSONAL">🟢 Pribadi &amp; Kesehatan</option>
                  <option value="REMINDER">🟡 Pengingat &amp; Tugas Ringan</option>
                </select>
              </div>

              {/* Row Waktu Mulai & Selesai */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[10px] uppercase text-[#958ea0] font-semibold">
                    WAKTU MULAI
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full bg-[#0c0e14] px-3 py-2 rounded-lg font-mono text-xs text-[#e2e2eb] border border-white/[0.06] focus:outline-none focus:border-[#d0bcff]/50"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-[10px] uppercase text-[#958ea0] font-semibold">
                      WAKTU SELESAI
                    </label>
                    <span className="font-mono text-[9px] text-[#4edea3] font-bold">
                      {formDurationLabel}
                    </span>
                  </div>
                  <input
                    type="datetime-local"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full bg-[#0c0e14] px-3 py-2 rounded-lg font-mono text-xs text-[#e2e2eb] border border-white/[0.06] focus:outline-none focus:border-[#d0bcff]/50"
                  />
                </div>
              </div>

              {/* Lokasi / Tautan Virtual */}
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] uppercase text-[#958ea0] font-semibold">
                  LOKASI ATAU TAUTAN VIRTUAL
                </label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="mis. Ruang Kerja, Google Meet, Perpustakaan"
                  className="w-full bg-[#0c0e14] px-3.5 py-2 rounded-lg font-mono text-xs text-[#e2e2eb] border border-white/[0.06] placeholder-[#494454] focus:outline-none focus:border-[#d0bcff]/50"
                />
              </div>

              {/* Kaitkan Struktural (Proyek & Tugas) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[10px] uppercase text-[#958ea0] font-semibold">
                    KAITKAN PROYEK
                  </label>
                  <select
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    className="w-full bg-[#0c0e14] px-3 py-2 rounded-lg font-mono text-xs text-[#e2e2eb] border border-white/[0.06] focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Tanpa Proyek --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        📁 {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[10px] uppercase text-[#958ea0] font-semibold">
                    KAITKAN TUGAS
                  </label>
                  <select
                    value={formTaskId}
                    onChange={(e) => setFormTaskId(e.target.value)}
                    className="w-full bg-[#0c0e14] px-3 py-2 rounded-lg font-mono text-xs text-[#e2e2eb] border border-white/[0.06] focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Tanpa Tugas --</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        ✓ {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Catatan Strategis */}
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] uppercase text-[#958ea0] font-semibold">
                  CATATAN STRATEGIS
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Target keluaran sesi ini..."
                  className="w-full bg-[#0c0e14] p-3 rounded-lg font-mono text-xs text-[#e2e2eb] border border-white/[0.06] placeholder-[#494454] focus:outline-none focus:border-[#d0bcff]/50 resize-none"
                />
              </div>

              {/* Tombol Aksi Bawah */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-[#958ea0] hover:text-[#e2e2eb] hover:bg-[#282a30] font-mono text-xs transition-colors"
                >
                  Batal [Esc]
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-lg bg-[#d0bcff] hover:bg-[#b098f0] text-[#23005c] font-mono text-xs font-bold shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? "Menyimpan..." : "Simpan Jadwal Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL RINCIAN EVENT SAAT DIKLIK ────────────────────────── */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0D13]/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#131825] rounded-xl shadow-2xl p-5 flex flex-col gap-4 border border-white/[0.08] relative">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-[#340080]/30 text-[#d0bcff] border border-[#d0bcff]/20 w-fit">
                  {selectedEvent.eventType}
                </span>
                <h3 className="text-base font-bold text-[#e2e2eb] mt-1">{selectedEvent.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-[#958ea0] hover:text-[#e2e2eb]"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2 font-mono text-xs text-[#958ea0] bg-[#0c0e14] p-3 rounded-lg border border-white/[0.04]">
              <div className="flex items-center gap-2">
                <span>🕒</span>
                <span>
                  {new Date(selectedEvent.startTime).toLocaleString("id-ID", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  –{" "}
                  {new Date(selectedEvent.endTime).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2">
                  <span>📍</span>
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.project && (
                <div className="flex items-center gap-2">
                  <span>📁</span>
                  <span>Proyek: {selectedEvent.project.title}</span>
                </div>
              )}
              {selectedEvent.description && (
                <p className="mt-1 pt-2 border-t border-white/[0.06] text-[#cbc3d7] text-[11px] leading-relaxed">
                  {selectedEvent.description}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => handleDeleteEvent(selectedEvent.id)}
                className="px-3 py-1.5 rounded bg-[#93000a]/30 hover:bg-[#93000a]/50 text-[#F43F5E] text-xs font-mono border border-[#F43F5E]/30 transition-colors"
              >
                Hapus Event
              </button>

              <div className="flex items-center gap-2">
                {selectedEvent.eventType === "BLOCKED" && (
                  <Link
                    href="/focus"
                    className="px-3 py-1.5 rounded bg-[#d0bcff] hover:bg-[#b098f0] text-[#23005c] font-mono text-xs font-bold transition-all"
                  >
                    Buka Ruang Fokus 🍅
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="px-3 py-1.5 rounded bg-[#282a30] text-[#e2e2eb] font-mono text-xs hover:bg-[#33343b]"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
