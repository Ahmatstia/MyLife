"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/components/ui/Toast";

interface AreaOption {
  id: string;
  name: string;
  color: string;
}

interface ProjectOption {
  id: string;
  title: string;
}

interface TaskItemData {
  id: string;
  title: string;
  subtitle: string;
  status: "COMPLETED" | "RUNNING" | "PENDING";
  priority?: string;
  categoryName?: string;
  badge?: string;
  badgeType?: string;
  xp?: string;
  projectId?: string | null;
  goalId?: string | null;
}

interface TimeblockData {
  id: string;
  time: string;
  title: string;
  status: "SELESAI" | "BERJALAN_SEKARANG" | "TERJADWAL";
}

interface CaptureData {
  id: string;
  content: string;
  category: string;
  tag: string;
}

interface AlertIssueData {
  id: string;
  type: "DEADLINE" | "CONFLICT";
  title: string;
}

interface NextActionData {
  taskId: string;
  taskName: string;
  goalName?: string;
  stageName?: string;
  priority: string;
  estimatedMinutes: number;
  reason?: string;
}

interface TodayDashboardClientProps {
  initialDateStr: string;
  areas: AreaOption[];
  projects: ProjectOption[];
  nextAction: NextActionData | null;
  initialTasks: TaskItemData[];
  initialTimeblocks: TimeblockData[];
  initialCaptures: CaptureData[];
  alertIssues: AlertIssueData[];
  stats: {
    totalMinutes: number;
    completedTasks: number;
    activeTasks: number;
  };
}

export function TodayDashboardClient({
  initialDateStr,
  areas,
  projects,
  nextAction,
  initialTasks,
  initialTimeblocks,
  initialCaptures,
  alertIssues,
  stats,
}: TodayDashboardClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Clock state
  const [clock, setClock] = useState("21:49");
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      setClock(`${h}:${m}`);
    }
    updateClock();
    const timer = setInterval(updateClock, 1000 * 30);
    return () => clearInterval(timer);
  }, []);

  // Alert ticker dismissal
  const [alertDismissed, setAlertDismissed] = useState(false);

  // Quick capture note state connected to backend
  const [captureText, setCaptureText] = useState("");
  const [captureFilter, setCaptureFilter] = useState("Semua");
  const [captures, setCaptures] = useState<CaptureData[]>(() => initialCaptures || []);

  // Task queue state connected to backend
  const [taskQueue, setTaskQueue] = useState<TaskItemData[]>(() => initialTasks || []);

  // Timeblocks state connected to backend
  const [timeblocks, setTimeblocks] = useState<TimeblockData[]>(() => initialTimeblocks || []);

  // Timeblock creation modal state
  const [isCreatingTimeblock, setIsCreatingTimeblock] = useState(false);
  const [tbTitle, setTbTitle] = useState("");
  const [tbStartTime, setTbStartTime] = useState("09:00");
  const [tbEndTime, setTbEndTime] = useState("10:30");
  const [tbType, setTbType] = useState<"BLOCKED" | "WORK" | "PERSONAL">("BLOCKED");
  const [isSubmittingTb, setIsSubmittingTb] = useState(false);

  async function handleCreateTimeblock(e: React.FormEvent) {
    e.preventDefault();
    if (!tbTitle.trim() || !tbStartTime || !tbEndTime) return;

    setIsSubmittingTb(true);
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const datePrefix = `${y}-${m}-${d}`;

      const startIso = new Date(`${datePrefix}T${tbStartTime}:00`).toISOString();
      const endIso = new Date(`${datePrefix}T${tbEndTime}:00`).toISOString();

      const res = await fetch("/api/calendar-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: tbTitle.trim(),
          startTime: startIso,
          endTime: endIso,
          eventType: tbType,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Gagal membuat blok waktu");
      }

      const newBlock: TimeblockData = {
        id: json.data?.id || `tb-${Date.now()}`,
        time: `${tbStartTime} – ${tbEndTime} WIB`,
        title: tbTitle.trim(),
        status: "TERJADWAL",
      };

      setTimeblocks((prev) => [...prev, newBlock]);
      setTbTitle("");
      setIsCreatingTimeblock(false);
      toast("Blok waktu berhasil dijadwalkan ke sistem!", "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menjadwalkan blok waktu", "error");
    } finally {
      setIsSubmittingTb(false);
    }
  }

  async function handleDeleteTimeblock(id: string) {
    try {
      const res = await fetch(`/api/calendar-events/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus blok waktu");
      setTimeblocks((prev) => prev.filter((b) => b.id !== id));
      toast("Blok waktu dihapus", "info");
      router.refresh();
    } catch {
      toast("Gagal menghapus blok waktu", "error");
    }
  }

  // Default category from real projects or areas
  const defaultCategory =
    projects.length > 0
      ? `📁 ${projects[0].title}`
      : areas.length > 0
      ? `📁 ${areas[0].name}`
      : "📁 Tugas";

  // Inline task addition state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const [selectedDuration, setSelectedDuration] = useState("⏱ 30m");
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Focus Queue UX Progressive Disclosure States
  const [queueTab, setQueueTab] = useState<"ACTIVE" | "COMPLETED" | "ALL">("ACTIVE");
  const [isQueueExpanded, setIsQueueExpanded] = useState(false);
  const [showCompletedAccordion, setShowCompletedAccordion] = useState(false);

  // Keyboard navigation shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        router.push(nextAction ? `/focus?taskId=${nextAction.taskId}` : "/focus");
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        router.push("/capture");
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        router.push("/calendar");
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        router.push("/review");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, nextAction]);

  // Toggle task status via backend API
  async function toggleTask(id: string) {
    const task = taskQueue.find((t) => t.id === id);
    if (!task) return;

    const nextStatus = task.status === "COMPLETED" ? "PENDING" : "COMPLETED";

    // Optimistic update
    setTaskQueue((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t))
    );

    toast(
      nextStatus === "COMPLETED"
        ? `Tugas "${task.title}" tuntas! +50 XP`
        : `Tugas "${task.title}" dikembalikan ke antrean`,
      "success"
    );

    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
        }),
      });
    } catch {
      // Offline fallback
    }
  }

  // Counter for local optimistic IDs
  const [seqId, setSeqId] = useState(100);

  // Handle Quick Capture Submit to backend
  async function handleAddCapture(e: React.FormEvent) {
    e.preventDefault();
    if (!captureText.trim()) return;

    const content = captureText.trim();
    const nextNumber = seqId + 1;
    setSeqId(nextNumber);

    const newCap: CaptureData = {
      id: `cap-${nextNumber}`,
      content,
      tag: "Baru saja • Inbox",
      category: captureFilter === "Semua" ? "Catatan" : captureFilter,
    };
    setCaptures([newCap, ...captures]);
    setCaptureText("");
    toast("Catatan tersimpan ke Inbox!", "success");

    try {
      const res = await fetch("/api/captures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          category: captureFilter === "Semua" ? undefined : captureFilter,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.id) {
        setCaptures((prev) =>
          prev.map((c) => (c.id === newCap.id ? { ...c, id: data.data.id } : c))
        );
      }
    } catch {
      // offline fallback
    }
  }

  // Convert capture to task via backend
  async function convertCaptureToTask(capId: string) {
    const cap = captures.find((c) => c.id === capId);
    if (!cap) return;

    const nextNumber = seqId + 1;
    setSeqId(nextNumber);

    const newTask: TaskItemData = {
      id: `task-${nextNumber}`,
      title: cap.content,
      subtitle: `📁 Dari Quick Capture • Est: 30m`,
      status: "PENDING",
      badge: "Antrean",
      badgeType: "neutral",
    };
    setTaskQueue((prev) => [...prev, newTask]);
    setCaptures((prev) => prev.filter((c) => c.id !== capId));
    toast("Catatan berhasil dikonversi menjadi Tugas!", "success");

    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cap.content,
          estimatedHours: 0.5,
          priority: "MEDIUM",
        }),
      });
    } catch {
      // offline fallback
    }
  }

  // Handle inline quick task submit to backend
  async function handleAddInlineTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsAddingTask(true);
    const title = newTaskTitle.trim();
    const nextNumber = seqId + 1;
    setSeqId(nextNumber);

    const newTask: TaskItemData = {
      id: `task-${nextNumber}`,
      title,
      subtitle: `${selectedCategory} • ${selectedDuration.replace("⏱ ", "")}`,
      status: "PENDING",
      badge: "Antrean",
      badgeType: "neutral",
    };
    setTaskQueue((prev) => [...prev, newTask]);
    setNewTaskTitle("");
    toast(`Tugas "${title}" ditambahkan ke antrean!`, "success");

    try {
      const area = areas.find((a) => selectedCategory.includes(a.name));
      const project = projects.find((p) => selectedCategory.includes(p.title));

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          estimatedHours: selectedDuration.includes("1h") ? 1 : selectedDuration.includes("2h") ? 2 : 0.5,
          priority: "MEDIUM",
          areaId: area?.id,
          projectId: project?.id,
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.id) {
        setTaskQueue((prev) =>
          prev.map((t) => (t.id === newTask.id ? { ...t, id: json.data.id } : t))
        );
      }
    } catch {
      // graceful fallback
    } finally {
      setIsAddingTask(false);
    }
  }

  // Calculate dynamic stats from real backend data and state
  const completedCount = taskQueue.filter((t) => t.status === "COMPLETED").length;
  const activeCount = taskQueue.filter((t) => t.status !== "COMPLETED").length;
  const totalCount = taskQueue.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Real focus hours formatting
  const totalFocusMinutes = stats.totalMinutes;
  const focusTimeDisplay =
    totalFocusMinutes > 0
      ? `${Math.floor(totalFocusMinutes / 60)} Jam ${totalFocusMinutes % 60} Menit`
      : "0 Menit";

  // Filtered captures list
  const filteredCaptures =
    captureFilter === "Semua"
      ? captures
      : captures.filter((c) => c.category?.toLowerCase().includes(captureFilter.toLowerCase().replace(/[^a-z]/g, "")));

  // Completed tasks for momentum wall
  const completedTasksList = taskQueue.filter((t) => t.status === "COMPLETED");

  // Focus Queue Computed & Filtered Lists (RUNNING first, then pending)
  const runningTasks = taskQueue.filter((t) => t.status === "RUNNING");
  const pendingTasks = taskQueue.filter((t) => t.status !== "COMPLETED" && t.status !== "RUNNING");
  const activeTasksList = [...runningTasks, ...pendingTasks];

  const currentTabTasks =
    queueTab === "ACTIVE"
      ? activeTasksList
      : queueTab === "COMPLETED"
      ? completedTasksList
      : [...activeTasksList, ...completedTasksList];

  const QUEUE_VISIBLE_LIMIT = 5;
  const hasQueueOverflow = currentTabTasks.length > QUEUE_VISIBLE_LIMIT;
  const displayedQueueTasks =
    isQueueExpanded || !hasQueueOverflow
      ? currentTabTasks
      : currentTabTasks.slice(0, QUEUE_VISIBLE_LIMIT);
  const hiddenQueueCount = currentTabTasks.length - QUEUE_VISIBLE_LIMIT;

  // Spotlight active task computation from real backend nextAction or top pending task
  const topPendingTask = taskQueue.find((t) => t.status !== "COMPLETED");
  const activeSpotlight = nextAction
    ? {
        taskId: nextAction.taskId,
        taskName: nextAction.taskName,
        goalName: nextAction.goalName || nextAction.stageName || "Target Utama",
        reason: nextAction.reason || "Fokus prioritas tertinggi berdasarkan roadmap aktif",
        estimatedMinutes: nextAction.estimatedMinutes || 45,
        priority: nextAction.priority || "HIGH",
      }
    : topPendingTask
    ? {
        taskId: topPendingTask.id,
        taskName: topPendingTask.title,
        goalName: topPendingTask.subtitle || "Antrean Prioritas",
        reason: "Tugas prioritas teratas dari antrean harian Anda.",
        estimatedMinutes: 45,
        priority: topPendingTask.priority || "MEDIUM",
      }
    : null;

  return (
    <div className="flex flex-col w-full gap-6 text-[#e2e2eb]">
      {/* ── 1. TOP HEADER AREA ── */}
      <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 p-6 rounded-xl bg-[#131825] shadow-xl border border-white/[0.07] relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#d0bcff]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col gap-1 z-10">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-[#cbc3d7] uppercase tracking-wider font-semibold">
              EKSEKUSI HARIAN // RUANG KERJA
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#4edea3]/10 text-[#4edea3] font-mono text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
              SESI AKTIF
            </span>
          </div>

          <h1 className="text-3xl lg:text-[40px] font-bold text-white tracking-tight leading-tight">
            {initialDateStr || "Minggu, 6 September 2026"}
          </h1>

          <p className="text-xs text-[#cbc3d7] flex items-center gap-1.5 font-mono">
            <span className="material-symbols-outlined text-[16px] text-[#d0bcff]">schedule</span>
            <span>Waktu Indonesia Barat (WIB) • </span>
            <span className="text-white font-medium">{clock}</span>
          </p>
        </div>

        {/* Center & Right Controls */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-6 w-full lg:w-auto z-10">
          {/* SVG Circular Progress Indicator */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#1e1f26]/60 border border-white/[0.07]">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#33343b]"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                />
                <path
                  className="text-[#4edea3] transition-all duration-700 ease-out"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={`${progressPercent}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                />
              </svg>
              <span className="absolute font-mono text-[11px] font-bold text-white">
                {progressPercent}%
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-white font-semibold">
                {completedCount} dari {totalCount} Tugas
              </span>
              <span className="font-mono text-[10px] text-[#4edea3] font-medium">
                Selesai Hari Ini
              </span>
            </div>
          </div>

          {/* Quick Actions Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={activeSpotlight ? `/focus?taskId=${activeSpotlight.taskId}` : "/focus"}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#a078ff] text-[#340080] hover:bg-[#d0bcff] text-xs font-semibold transition-all shadow-[0_0_20px_-4px_rgba(160,120,255,0.4)] active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">timer</span>
              <span>Mulai Fokus</span>
              <kbd className="px-1.5 py-0.5 rounded bg-[#0c0e14]/30 text-[#340080] font-mono text-[10px]">
                Spasi
              </kbd>
            </Link>

            <Link
              href="/capture"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#282a30]/60 hover:bg-[#1A2133] text-white border border-white/[0.07] text-xs font-medium transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px] text-[#d0bcff]">
                edit_note
              </span>
              <span>Inbox</span>
              <kbd className="px-1.5 py-0.5 rounded bg-[#33343b] text-[#cbc3d7] font-mono text-[10px]">
                I
              </kbd>
            </Link>

            <Link
              href="/calendar"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#282a30]/60 hover:bg-[#1A2133] text-white border border-white/[0.07] text-xs font-medium transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px] text-[#c0c1ff]">
                calendar_month
              </span>
              <span>Jadwal</span>
              <kbd className="px-1.5 py-0.5 rounded bg-[#33343b] text-[#cbc3d7] font-mono text-[10px]">
                C
              </kbd>
            </Link>

            <Link
              href="/review"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#282a30]/60 hover:bg-[#1A2133] text-white border border-white/[0.07] text-xs font-medium transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px] text-[#4edea3]">
                psychology
              </span>
              <span>Refleksi</span>
              <kbd className="px-1.5 py-0.5 rounded bg-[#33343b] text-[#cbc3d7] font-mono text-[10px]">
                R
              </kbd>
            </Link>
          </div>
        </div>
      </header>

      {/* ── 2. PROACTIVE ALERT TICKER ── */}
      {!alertDismissed && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3.5 rounded-xl bg-[#131825] border border-[#F59E0B]/20 relative overflow-hidden shadow-lg">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#F43F5E] via-[#F59E0B] to-[#F59E0B]" />

          <div className="flex items-start sm:items-center gap-3 pl-1">
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center shrink-0 text-[#F59E0B]">
              <span className="material-symbols-outlined text-[20px]">warning</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#F59E0B]">
                {alertIssues.length > 0
                  ? `${alertIssues.length} Hal Membutuhkan Penanganan Segera:`
                  : "Status Hari Ini Terkendali:"}
              </span>
              <div className="flex flex-col md:flex-row md:items-center gap-x-4 gap-y-1 text-xs text-[#cbc3d7] mt-0.5">
                {alertIssues.length > 0 ? (
                  alertIssues.map((issue) => (
                    <span key={issue.id} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E]" />
                      <strong className="text-white">{issue.title}</strong>
                    </span>
                  ))
                ) : (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]" />
                      <strong className="text-white">Jadwal Selaras:</strong> Tidak ada konflik waktu atau tenggat terlewat hari ini
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Link
              href="/calendar"
              className="px-3 py-1.5 rounded-lg bg-[#282a30] hover:bg-[#1A2133] text-[#d0bcff] font-mono text-xs border border-white/[0.07] transition-colors"
            >
              {alertIssues.length > 0 ? "Selesaikan Konflik →" : "Buka Kalender →"}
            </Link>
            <button
              type="button"
              onClick={() => setAlertDismissed(true)}
              className="p-1 rounded-lg text-[#cbc3d7] hover:text-white hover:bg-[#1e1f26] transition-colors"
              title="Abaikan"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 3. 12-COLUMN MAIN BENTO GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (8 COLUMNS) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Spotlight Hero Card */}
          {activeSpotlight ? (
            <section className="p-6 rounded-xl bg-[#131825] border border-[#d0bcff]/40 relative overflow-hidden shadow-[0_0_35px_-10px_rgba(208,188,255,0.15)] group">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#d0bcff]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#d0bcff]/15 transition-all" />

              <div className="relative z-10 flex flex-col gap-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d0bcff]/15 border border-[#d0bcff]/30 text-[#d0bcff] font-mono text-[10.5px] uppercase tracking-wider font-semibold">
                    <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                    Prioritas Tertinggi Hari Ini • {activeSpotlight.goalName}
                  </span>
                  <div className="flex items-center gap-1 font-mono text-xs text-[#cbc3d7]">
                    <span className="material-symbols-outlined text-[16px] text-[#4edea3]">bolt</span>
                    BLOK AKTIF #01
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight leading-snug">
                    {activeSpotlight.taskName}
                  </h2>
                  <p className="text-sm text-[#cbc3d7] mt-1.5 leading-relaxed font-mono">
                    {activeSpotlight.reason}
                  </p>
                </div>

                {/* Meta Pill Tags */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1e1f26] border border-white/[0.07] font-mono text-xs text-white">
                    <span className="material-symbols-outlined text-[16px] text-[#d0bcff]">timer</span>
                    Estimasi: {activeSpotlight.estimatedMinutes} Menit
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1e1f26] border border-white/[0.07] font-mono text-xs text-[#F59E0B]">
                    <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
                    Tenggat: Hari Ini
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1e1f26] border border-[#F43F5E]/20 font-mono text-xs text-[#F43F5E]">
                    <span className="material-symbols-outlined text-[16px]">priority_high</span>
                    Dampak: {activeSpotlight.priority}
                  </span>
                </div>

                {/* Spotlight Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href={`/focus?taskId=${activeSpotlight.taskId}`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#a078ff] text-[#340080] hover:bg-[#d0bcff] text-sm font-semibold shadow-[0_0_24px_-4px_rgba(160,120,255,0.5)] transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                    <span>Mulai Fokus</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-[#0c0e14]/30 text-[#340080] font-mono text-[10px]">
                      Spasi
                    </kbd>
                  </Link>

                  <button
                    type="button"
                    onClick={() => toggleTask(activeSpotlight.taskId)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1e1f26] hover:bg-[#1A2133] text-white border border-white/[0.07] text-xs font-medium transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span>Tandai Selesai</span>
                  </button>

                  <Link
                    href={`/focus?taskId=${activeSpotlight.taskId}`}
                    className="p-2 rounded-lg bg-[#1e1f26] hover:bg-[#1A2133] text-[#cbc3d7] hover:text-white border border-white/[0.07] transition-colors ml-auto"
                    title="Masuk Mode Fokus Penuh"
                  >
                    <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            <section className="p-6 rounded-xl bg-[#131825] border border-white/[0.07] relative overflow-hidden shadow-xl">
              <div className="relative z-10 flex flex-col gap-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4edea3]/10 border border-[#4edea3]/30 text-[#4edea3] font-mono text-[10.5px] uppercase tracking-wider font-semibold">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Sistem Siap • Eksekusi Harian
                  </span>
                  <div className="flex items-center gap-1 font-mono text-xs text-[#cbc3d7]">
                    <span className="material-symbols-outlined text-[16px] text-[#4edea3]">bolt</span>
                    STANDBY
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight leading-snug">
                    Semua Tugas Selesai atau Belum Ada Antrean
                  </h2>
                  <p className="text-sm text-[#cbc3d7] mt-1.5 leading-relaxed font-mono">
                    Tidak ada tugas aktif yang tertunda saat ini. Tambahkan tugas cepat pada kolom di bawah atau jadwalkan target baru dari roadmap Anda.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href="/goals"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#a078ff] text-[#340080] hover:bg-[#d0bcff] text-sm font-semibold shadow-[0_0_24px_-4px_rgba(160,120,255,0.5)] transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[20px]">flag</span>
                    <span>Buka Target &amp; Roadmap</span>
                  </Link>

                  <Link
                    href="/capture"
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1e1f26] hover:bg-[#1A2133] text-white border border-white/[0.07] text-xs font-medium transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit_note</span>
                    <span>Catat Cepat</span>
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* Antrean Fokus Hari Ini */}
          <section className="flex flex-col p-6 rounded-xl bg-[#131825] border border-white/[0.07] shadow-xl">
            {/* Header: Title, Counts, Progress, and Tabs */}
            <div className="flex flex-col gap-3.5 pb-4 border-b border-white/[0.07]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#d0bcff]/10 border border-[#d0bcff]/20 flex items-center justify-center text-[#d0bcff]">
                    <span className="material-symbols-outlined text-[18px]">target</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Antrean Fokus Hari Ini</h3>
                    <p className="text-[11px] text-[#cbc3d7]/70 font-mono">
                      {activeCount} tugas aktif • {completedCount} selesai
                    </p>
                  </div>
                </div>

                {/* Progress Bar & Stat */}
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-[#cbc3d7]">Kemajuan:</span>
                  <div className="w-24 h-2 rounded-full bg-[#282a30] overflow-hidden">
                    <div
                      className="h-full bg-[#4edea3] rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-[#4edea3] font-medium">
                    {progressPercent}%
                  </span>
                </div>
              </div>

              {/* Segmented Filter Tabs & Capacity Nudge */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <div className="inline-flex p-1 rounded-lg bg-[#0c0e14]/60 border border-white/[0.06] text-xs">
                  <button
                    type="button"
                    onClick={() => setQueueTab("ACTIVE")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-xs transition-all cursor-pointer ${
                      queueTab === "ACTIVE"
                        ? "bg-[#d0bcff]/20 text-[#d0bcff] font-semibold border border-[#d0bcff]/30 shadow-sm"
                        : "text-[#cbc3d7] hover:text-white"
                    }`}
                  >
                    <span>Fokus Aktif</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        queueTab === "ACTIVE"
                          ? "bg-[#d0bcff]/30 text-white"
                          : "bg-white/[0.06] text-[#cbc3d7]"
                      }`}
                    >
                      {activeCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQueueTab("COMPLETED")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-xs transition-all cursor-pointer ${
                      queueTab === "COMPLETED"
                        ? "bg-[#4edea3]/20 text-[#4edea3] font-semibold border border-[#4edea3]/30 shadow-sm"
                        : "text-[#cbc3d7] hover:text-white"
                    }`}
                  >
                    <span>Selesai</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        queueTab === "COMPLETED"
                          ? "bg-[#4edea3]/30 text-[#4edea3]"
                          : "bg-white/[0.06] text-[#cbc3d7]"
                      }`}
                    >
                      {completedCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQueueTab("ALL")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-xs transition-all cursor-pointer ${
                      queueTab === "ALL"
                        ? "bg-white/[0.12] text-white font-semibold border border-white/[0.15] shadow-sm"
                        : "text-[#cbc3d7] hover:text-white"
                    }`}
                  >
                    <span>Semua</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-white/[0.06] text-[#cbc3d7] text-[10px]">
                      {totalCount}
                    </span>
                  </button>
                </div>

                {/* Subtle Nudge if active tasks > 5 */}
                {queueTab === "ACTIVE" && activeCount > 5 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[11px] text-[#F59E0B] font-mono">
                    <span>⚡</span>
                    <span>Antrean padat ({activeCount} tugas). Prioritaskan 3–5 esensial.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Task Rows Container with bounded max-height */}
            <div className="flex flex-col divide-y divide-white/[0.05] max-h-[420px] overflow-y-auto pr-1">
              {currentTabTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#1e1f26] border border-white/[0.07] flex items-center justify-center text-[#d0bcff] mb-3">
                    <span className="material-symbols-outlined text-[24px]">
                      {queueTab === "COMPLETED" ? "task_alt" : "verified"}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {queueTab === "COMPLETED"
                      ? "Belum Ada Tugas yang Diselesaikan"
                      : queueTab === "ACTIVE" && completedCount > 0
                      ? "Semua Tugas Aktif Telah Tuntas! 🎉"
                      : "Belum Ada Antrean Tugas Hari Ini"}
                  </span>
                  <p className="text-xs text-[#cbc3d7] max-w-sm mt-1">
                    {queueTab === "COMPLETED"
                      ? "Tandai tugas yang telah selesai di tab Fokus Aktif untuk memantau kemajuan Anda."
                      : queueTab === "ACTIVE" && completedCount > 0
                      ? `Luar biasa! Anda telah menyelesaikan ${completedCount} tugas hari ini.`
                      : "Ketik tugas baru pada kolom di bawah lalu tekan Enter untuk menjadwalkan ke antrean fokus hari ini."}
                  </p>
                </div>
              ) : (
                displayedQueueTasks.map((task) => {
                  const isDone = task.status === "COMPLETED";
                  const isRunning = task.status === "RUNNING";

                  return (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between py-3 px-2 rounded-lg transition-colors ${
                        isRunning
                          ? "bg-[#d0bcff]/10 border border-[#d0bcff]/30 my-1 shadow-[0_0_15px_rgba(208,188,255,0.08)]"
                          : isDone
                          ? "opacity-60 hover:opacity-90 hover:bg-[#1A2133]/30"
                          : "hover:bg-[#1A2133]/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            isDone
                              ? "bg-[#4edea3]/20 text-[#4edea3] hover:bg-[#4edea3]/30"
                              : isRunning
                              ? "w-5 h-5 rounded-full border-2 border-[#d0bcff] text-transparent hover:border-white"
                              : "border border-[#958ea0] hover:border-[#d0bcff]"
                          }`}
                          title={isDone ? "Batal Selesai (Kembalikan ke Aktif)" : "Tandai Selesai"}
                        >
                          {isDone ? (
                            <span className="material-symbols-outlined text-[16px]">check</span>
                          ) : isRunning ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-[#d0bcff] animate-ping" />
                          ) : null}
                        </button>

                        <div className="flex flex-col min-w-0">
                          <Link
                            href={`/tasks/${task.id}`}
                            className={`text-sm leading-snug truncate hover:underline hover:text-[#d0bcff] transition-colors cursor-pointer ${
                              isDone
                                ? "text-[#cbc3d7] line-through"
                                : isRunning
                                ? "text-white font-semibold"
                                : "text-white font-medium"
                            }`}
                            title="Buka rincian tugas"
                          >
                            {task.title}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5">
                            {task.projectId ? (
                              <Link
                                href={`/projects/${task.projectId}`}
                                className="font-mono text-[11px] text-[#cbc3d7]/80 hover:text-[#d0bcff] hover:underline transition-colors truncate"
                                title="Buka proyek terkait"
                              >
                                {task.subtitle}
                              </Link>
                            ) : task.goalId ? (
                              <Link
                                href={`/goals/${task.goalId}`}
                                className="font-mono text-[11px] text-[#cbc3d7]/80 hover:text-[#d0bcff] hover:underline transition-colors truncate"
                                title="Buka sasaran (goal) terkait"
                              >
                                {task.subtitle}
                              </Link>
                            ) : (
                              <span
                                className={`font-mono text-[11px] truncate ${
                                  isRunning ? "text-[#d0bcff] font-semibold" : "text-[#cbc3d7]/80"
                                }`}
                              >
                                {task.subtitle}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 ml-3">
                        {isDone ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#4edea3]/10 text-[#4edea3] font-mono text-[11px] font-medium border border-[#4edea3]/20">
                            Selesai
                          </span>
                        ) : isRunning ? (
                          <Link
                            href={`/focus?taskId=${task.id}`}
                            className="px-2.5 py-0.5 rounded-full bg-[#a078ff]/20 text-[#d0bcff] hover:bg-[#a078ff]/30 font-mono text-[11px] font-semibold border border-[#d0bcff]/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(208,188,255,0.2)] transition-colors cursor-pointer"
                            title="Lanjutkan fokus di Mode Pomodoro"
                          >
                            <span>Sedang Berjalan</span>
                            <span>🍅</span>
                          </Link>
                        ) : (
                          <>
                            {task.badge && (
                              <span
                                className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium border ${
                                  task.badgeType === "warning"
                                    ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20"
                                    : "bg-[#1e1f26] text-[#cbc3d7] border-white/[0.07]"
                                }`}
                              >
                                {task.badge}
                              </span>
                            )}
                            <Link
                              href={`/focus?taskId=${task.id}`}
                              className="px-2.5 py-0.5 rounded bg-[#1e1f26] hover:bg-[#d0bcff] hover:text-[#23005c] text-white font-mono text-xs border border-white/[0.07] transition-all font-medium flex items-center gap-1 cursor-pointer"
                              title="Fokuskan tugas ini di Mode Pomodoro"
                            >
                              <span>Fokus</span>
                              <span>🍅</span>
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Progressive Disclosure Toggle Button */}
            {hasQueueOverflow && (
              <button
                type="button"
                onClick={() => setIsQueueExpanded(!isQueueExpanded)}
                className="w-full py-2 mt-2.5 flex items-center justify-center gap-2 rounded-lg bg-[#191b22]/70 hover:bg-[#1e1f26] border border-white/[0.06] hover:border-white/[0.12] text-xs text-[#cbc3d7] hover:text-white transition-all font-mono group cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] transition-transform duration-200 group-hover:text-[#d0bcff]">
                  {isQueueExpanded ? "expand_less" : "expand_more"}
                </span>
                <span>
                  {isQueueExpanded
                    ? "Ciutkan Antrean (Tampilkan 5 Utama Saja)"
                    : `Lihat ${hiddenQueueCount} Tugas Lainnya dalam Antrean`}
                </span>
                {!isQueueExpanded && (
                  <span className="px-1.5 py-0.2 rounded bg-white/[0.08] text-[10px] text-[#d0bcff] font-bold">
                    +{hiddenQueueCount}
                  </span>
                )}
              </button>
            )}

            {/* In-tab Collapsible Completed Drawer (When in ACTIVE tab and has completed items) */}
            {queueTab === "ACTIVE" && completedCount > 0 && (
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowCompletedAccordion(!showCompletedAccordion)}
                  className="flex items-center justify-between w-full py-1.5 px-2 rounded-lg hover:bg-[#1e1f26]/60 text-xs text-[#cbc3d7] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#4edea3]">
                      check_circle
                    </span>
                    <span className="font-medium text-white/90">
                      {completedCount} Tugas Selesai Hari Ini
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[11px] text-[#cbc3d7]/70">
                    <span>{showCompletedAccordion ? "Sembunyikan" : "Tampilkan"}</span>
                    <span className="material-symbols-outlined text-[16px]">
                      {showCompletedAccordion ? "expand_less" : "expand_more"}
                    </span>
                  </div>
                </button>

                {showCompletedAccordion && (
                  <div className="mt-2 flex flex-col divide-y divide-white/[0.04] bg-[#0c0e14]/50 rounded-lg p-2 border border-white/[0.04] max-h-48 overflow-y-auto">
                    {completedTasksList.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between py-2 px-1 text-xs opacity-75 hover:opacity-100 transition-opacity"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleTask(task.id)}
                            className="w-4 h-4 rounded bg-[#4edea3]/20 text-[#4edea3] flex items-center justify-center shrink-0 cursor-pointer hover:bg-[#4edea3]/30"
                            title="Batal Selesai (Kembalikan ke antrean)"
                          >
                            <span className="material-symbols-outlined text-[13px]">check</span>
                          </button>
                          <span className="line-through text-[#cbc3d7] truncate">{task.title}</span>
                        </div>
                        <span className="font-mono text-[10px] text-[#4edea3] shrink-0 ml-2">
                          Selesai
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Inline Quick Task Add Bar */}
            <form
              onSubmit={handleAddInlineTask}
              className="mt-4 pt-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
            >
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#cbc3d7]">
                  add_circle
                </span>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Tambah tugas cepat ke antrean hari ini... [Enter]"
                  className="w-full bg-[#191b22] pl-10 pr-3 py-2 rounded-lg border border-white/[0.07] text-white placeholder:text-[#cbc3d7]/60 text-xs focus:outline-none focus:border-[#d0bcff] transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2.5 py-2 rounded-lg bg-[#1e1f26] text-[#cbc3d7] hover:text-white border border-white/[0.07] font-mono text-xs focus:outline-none cursor-pointer max-w-[160px] truncate"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={`📁 ${p.title}`}>
                      📁 {p.title} ▼
                    </option>
                  ))}
                  {areas.map((a) => (
                    <option key={a.id} value={`📁 ${a.name}`}>
                      📁 {a.name} ▼
                    </option>
                  ))}
                  {projects.length === 0 && areas.length === 0 && (
                    <option value="📁 Tugas">📁 Tugas ▼</option>
                  )}
                </select>

                <select
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(e.target.value)}
                  className="px-2.5 py-2 rounded-lg bg-[#1e1f26] text-[#cbc3d7] hover:text-white border border-white/[0.07] font-mono text-xs focus:outline-none cursor-pointer"
                >
                  <option value="⏱ 30m">⏱ 30m</option>
                  <option value="⏱ 45m">⏱ 45m</option>
                  <option value="⏱ 1h">⏱ 1h</option>
                  <option value="⏱ 2h">⏱ 2h</option>
                </select>

                <button
                  type="submit"
                  disabled={isAddingTask || !newTaskTitle.trim()}
                  className="px-4 py-2 rounded-lg bg-[#d0bcff]/20 hover:bg-[#d0bcff]/30 text-[#d0bcff] border border-[#d0bcff]/30 font-mono text-xs font-semibold flex items-center gap-1 whitespace-nowrap transition-colors disabled:opacity-40"
                >
                  + Tambah
                </button>
              </div>
            </form>
          </section>

          {/* AGENDA KALENDER & TIME-BLOCKING HARI INI */}
          <section className="p-6 rounded-xl bg-[#131825] border border-white/[0.07] shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#d0bcff] text-[20px]">
                  calendar_today
                </span>
                <h3 className="text-lg font-bold text-white">Time-blocking Terjadwal (Hari Ini)</h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline font-mono text-xs text-[#cbc3d7]">Zona: WIB (UTC+7)</span>
                <button
                  type="button"
                  onClick={() => setIsCreatingTimeblock(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#d0bcff]/20 hover:bg-[#d0bcff]/30 text-[#d0bcff] border border-[#d0bcff]/30 font-mono text-xs font-semibold flex items-center gap-1 transition-colors active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>+ Blok Waktu</span>
                </button>
                <Link
                  href="/calendar"
                  className="px-2.5 py-1.5 rounded-lg bg-[#1e1f26] hover:bg-[#282a30] text-[#cbc3d7] hover:text-white border border-white/[0.07] font-mono text-xs transition-colors"
                  title="Buka Kalender Mingguan"
                >
                  Kalender →
                </Link>
              </div>
            </div>

            {timeblocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center bg-[#1e1f26]/30 rounded-lg border border-white/[0.07]">
                <span className="material-symbols-outlined text-[24px] text-[#cbc3d7] mb-2">event_available</span>
                <span className="text-xs font-semibold text-white">Tidak Ada Jadwal Kalender Hari Ini</span>
                <p className="text-[11px] text-[#cbc3d7] mt-0.5 mb-3">
                  Susun blok waktu fokus Anda untuk menyelaraskan ritme kerja hari ini.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreatingTimeblock(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#a078ff] text-[#340080] hover:bg-[#d0bcff] font-mono text-xs font-semibold transition-colors"
                >
                  + Jadwalkan Blok Pertama
                </button>
              </div>
            ) : (
              <div className="relative flex flex-col gap-3.5 pl-4 border-l-2 border-[#282a30] ml-2">
                {timeblocks.map((block) => (
                  <div
                    key={block.id}
                    className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-lg border transition-colors ${
                      block.status === "BERJALAN_SEKARANG"
                        ? "bg-[#d0bcff]/10 border-[#d0bcff]/30 shadow-[0_0_15px_-3px_rgba(208,188,255,0.2)]"
                        : block.status === "SELESAI"
                        ? "bg-[#1e1f26]/50 border-white/[0.07]"
                        : "bg-[#1e1f26]/30 border-white/[0.07]"
                    }`}
                  >
                    <div
                      className={`absolute -left-[23px] top-4 w-3 h-3 rounded-full ring-4 ring-[#0B0D13] ${
                        block.status === "BERJALAN_SEKARANG"
                          ? "bg-[#d0bcff] ring-[#d0bcff]/20 animate-pulse"
                          : block.status === "SELESAI"
                          ? "bg-[#4edea3]"
                          : "bg-[#3131c0]"
                      }`}
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span
                        className={`font-mono text-xs ${
                          block.status === "BERJALAN_SEKARANG" ? "text-[#d0bcff] font-semibold" : "text-[#cbc3d7]"
                        }`}
                      >
                        {block.time}
                      </span>
                      <span
                        className={`text-sm font-semibold mt-0.5 truncate ${
                          block.status === "BERJALAN_SEKARANG" ? "text-white font-bold" : "text-white"
                        }`}
                      >
                        {block.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 font-mono text-xs uppercase ${
                          block.status === "BERJALAN_SEKARANG"
                            ? "px-2 py-1 rounded bg-[#d0bcff]/20 text-[#d0bcff]"
                            : block.status === "SELESAI"
                            ? "text-[#4edea3]"
                            : "text-[#c0c1ff]"
                        }`}
                      >
                        {block.status === "SELESAI" && <span className="w-2 h-2 rounded-full bg-[#4edea3]" />}
                        {block.status === "BERJALAN_SEKARANG"
                          ? "Berjalan Sekarang"
                          : block.status === "SELESAI"
                          ? "Selesai"
                          : "Terjadwal"}
                      </span>

                      <Link
                        href="/focus"
                        className="px-2.5 py-1 rounded bg-[#1e1f26] hover:bg-[#282a30] text-white font-mono text-xs border border-white/[0.07] transition-colors"
                      >
                        Fokus 🍅
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDeleteTimeblock(block.id)}
                        className="p-1 rounded text-[#cbc3d7] hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors"
                        title="Hapus blok waktu"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN (4 COLUMNS) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* RANGKUMAN HARI INI (METRICS BENTO) */}
          <section className="p-6 rounded-xl bg-[#131825] border border-white/[0.07] shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Rangkuman Hari Ini</h3>
              <span className="material-symbols-outlined text-[18px] text-[#cbc3d7]">
                query_stats
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Metric Card 1: Total Waktu Fokus */}
              <div className="p-3.5 rounded-lg bg-[#1e1f26]/70 border border-white/[0.07] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#cbc3d7]">
                    TOTAL WAKTU FOKUS
                  </span>
                  <span className="font-mono text-lg font-bold text-white mt-1">
                    {focusTimeDisplay}
                  </span>
                  <span className="font-mono text-[11px] text-[#4edea3] flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[14px]">trending_up</span>
                    +22% vs kemarin
                  </span>
                </div>
                <div className="w-16 h-8 flex items-end justify-between gap-1 pb-1">
                  <div className="w-2 bg-[#4edea3]/20 h-3 rounded-t" />
                  <div className="w-2 bg-[#4edea3]/40 h-5 rounded-t" />
                  <div className="w-2 bg-[#4edea3]/60 h-4 rounded-t" />
                  <div className="w-2 bg-[#4edea3]/80 h-7 rounded-t" />
                  <div className="w-2 bg-[#4edea3] h-8 rounded-t" />
                </div>
              </div>

              {/* Metric Card 2: Penyelesaian Tugas */}
              <div className="p-3.5 rounded-lg bg-[#1e1f26]/70 border border-white/[0.07] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#cbc3d7]">
                    PENYELESAIAN TUGAS
                  </span>
                  <span className="font-mono text-lg font-bold text-white mt-1">
                    {completedCount} / {totalCount} Tugas
                  </span>
                  <span className="font-mono text-[11px] text-[#cbc3d7] mt-1">
                    {activeCount} Dalam Proses
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-white/[0.07] flex items-center justify-center font-mono text-xs text-[#4edea3] font-bold">
                  {progressPercent}%
                </div>
              </div>

              {/* Metric Card 3: Produktivitas & XP */}
              <div className="p-3.5 rounded-lg bg-[#1e1f26]/70 border border-white/[0.07] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#cbc3d7]">
                    PRODUKTIVITAS &amp; XP
                  </span>
                  <span className="font-mono text-lg font-bold text-[#d0bcff] mt-1">
                    +{completedCount * 50} XP
                  </span>
                  <span className="font-mono text-[11px] text-[#F59E0B] flex items-center gap-1 mt-1 font-semibold">
                    {completedCount > 0 ? "🔥 Fokus Aktif Hari Ini" : "⚡ Siap Memulai Hari"}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">military_tech</span>
                </div>
              </div>
            </div>
          </section>

          {/* KOTAK CATATAN CEPAT (QUICK CAPTURE) */}
          <section className="p-6 rounded-xl bg-[#131825] border border-white/[0.07] shadow-xl flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#d0bcff] text-[18px]">bolt</span>
                <h3 className="text-lg font-bold text-white">Kotak Catatan Cepat</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#282a30] text-[#cbc3d7] font-mono text-[10px] border border-white/[0.07]">
                {captures.length} Draf Tersimpan
              </span>
            </div>

            <form onSubmit={handleAddCapture} className="flex flex-col gap-2">
              <div className="relative">
                <textarea
                  value={captureText}
                  onChange={(e) => setCaptureText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleAddCapture(e);
                    }
                  }}
                  rows={2}
                  placeholder="Tuliskan ide liar, temuan bug, atau catatan cepat... [⌘I]"
                  className="w-full bg-[#191b22] p-3 rounded-lg border border-white/[0.07] text-white placeholder:text-[#cbc3d7]/60 text-xs focus:outline-none focus:border-[#d0bcff] resize-none transition-colors"
                />
              </div>

              {/* Filter Tags */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                {["Semua", "💡 Ide", "✅ Tugas", "📝 Catatan", "⚡ Bug"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setCaptureFilter(f)}
                    className={`px-2 py-0.5 rounded font-mono text-[11px] whitespace-nowrap transition-colors ${
                      captureFilter === f
                        ? "bg-[#d0bcff]/20 text-[#d0bcff]"
                        : "text-[#cbc3d7] hover:bg-[#1e1f26]"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </form>

            {/* Pending Quick Captures */}
            <div className="flex flex-col gap-2 divide-y divide-white/[0.07]">
              {filteredCaptures.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#cbc3d7] font-mono bg-[#1e1f26]/30 rounded-lg border border-white/[0.07]">
                  Kotak catatan bersih. Tuliskan ide atau memo kilat di atas lalu tekan Ctrl+Enter!
                </div>
              ) : (
                filteredCaptures.map((item) => (
                  <div key={item.id} className="pt-2 flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs text-white font-medium leading-snug">
                        {item.content}
                      </span>
                      <button
                        type="button"
                        onClick={() => convertCaptureToTask(item.id)}
                        className="text-[#d0bcff] hover:text-white font-mono text-[11px] whitespace-nowrap shrink-0 transition-colors"
                      >
                        + Jadikan Tugas
                      </button>
                    </div>
                    <span className="font-mono text-[10px] text-[#cbc3d7]">{item.tag}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* MOMENTUM COMPLETED WALL */}
          <section className="p-6 rounded-xl bg-[#131825] border border-white/[0.07] shadow-xl flex flex-col gap-3.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <h3 className="text-lg font-bold text-white">Yang Sudah Beres Hari Ini</h3>
            </div>

            <div className="flex flex-col gap-2">
              {completedTasksList.length > 0 ? (
                completedTasksList.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#1e1f26]/50 border border-white/[0.07]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="material-symbols-outlined text-[#4edea3] text-[18px]">
                        check_circle
                      </span>
                      <span className="text-xs text-white truncate">{task.title}</span>
                    </div>
                    <span className="font-mono text-[11px] text-[#4edea3] shrink-0 font-medium">
                      {task.xp || "+50 XP"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-[#cbc3d7] font-mono bg-[#1e1f26]/30 rounded-lg border border-white/[0.07]">
                  Belum ada tugas selesai hari ini.
                </div>
              )}
            </div>

            {/* Quote Pill */}
            <div className="p-3.5 rounded-lg bg-[#282a30]/60 border border-white/[0.07] flex items-start gap-2.5 mt-1">
              <span className="material-symbols-outlined text-[#d0bcff] text-[18px] shrink-0">
                format_quote
              </span>
              <p className="text-xs text-[#cbc3d7] italic leading-relaxed">
                &ldquo;Fokus konsisten mengalahkan motivasi sesaat. Pertahankan momentum deep work!&rdquo;
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* ── Dialog Tambah Blok Waktu ── */}
      {isCreatingTimeblock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#131825] border border-white/[0.1] shadow-2xl flex flex-col gap-4 text-[#e2e2eb]">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#d0bcff] text-[20px]">calendar_add_on</span>
                <h3 className="text-base font-bold text-white">Jadwalkan Blok Waktu Hari Ini</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingTimeblock(false)}
                className="p-1 rounded-lg text-[#cbc3d7] hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTimeblock} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#cbc3d7]">Judul Aktivitas / Fokus</label>
                <input
                  type="text"
                  required
                  value={tbTitle}
                  onChange={(e) => setTbTitle(e.target.value)}
                  placeholder="Misal: Sesi Deep Work Bab 2 Skripsi"
                  className="w-full bg-[#191b22] px-3 py-2 rounded-lg border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#d0bcff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#cbc3d7]">Jam Mulai</label>
                  <input
                    type="time"
                    required
                    value={tbStartTime}
                    onChange={(e) => setTbStartTime(e.target.value)}
                    className="w-full bg-[#191b22] px-3 py-2 rounded-lg border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:border-[#d0bcff]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#cbc3d7]">Jam Selesai</label>
                  <input
                    type="time"
                    required
                    value={tbEndTime}
                    onChange={(e) => setTbEndTime(e.target.value)}
                    className="w-full bg-[#191b22] px-3 py-2 rounded-lg border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:border-[#d0bcff]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#cbc3d7]">Kategori Blok</label>
                <select
                  value={tbType}
                  onChange={(e) => setTbType(e.target.value as "BLOCKED" | "WORK" | "PERSONAL")}
                  className="w-full bg-[#191b22] px-3 py-2 rounded-lg border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:border-[#d0bcff]"
                >
                  <option value="BLOCKED">🎯 Fokus (Deep Work)</option>
                  <option value="WORK">💼 Pekerjaan / Kuliah</option>
                  <option value="PERSONAL">🌱 Pribadi &amp; Kesehatan</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsCreatingTimeblock(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs text-[#cbc3d7] hover:bg-white/[0.06] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTb || !tbTitle.trim()}
                  className="px-4 py-2 rounded-lg bg-[#a078ff] text-[#340080] hover:bg-[#d0bcff] text-xs font-bold transition-all shadow-md disabled:opacity-50"
                >
                  {isSubmittingTb ? "Menyimpan..." : "Simpan Jadwal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
