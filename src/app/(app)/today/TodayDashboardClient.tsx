"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/components/ui/Toast";
import { parseAmbientTask } from "@/ai/ambient/ambient-nlp";
import { VoiceInputButton } from "@/app/components/ai/VoiceInputButton";
import { RecentActivityFeed, type ActivityFeedItem } from "@/app/components/dashboard/RecentActivityFeed";

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
  status: "COMPLETED" | "RUNNING" | "PENDING" | "TODO";
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
  isCompleted?: boolean;
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
  initialActivities?: ActivityFeedItem[];
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
  initialActivities = [],
  alertIssues,
  stats,
}: TodayDashboardClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Live Clock & Dynamic Greeting
  const [clock, setClock] = useState("12:00");
  const [greeting, setGreeting] = useState("Selamat Beraktivitas");

  useEffect(() => {
    function updateTimeAndGreeting() {
      const now = new Date();
      const h = now.getHours();
      const m = String(now.getMinutes()).padStart(2, "0");
      setClock(`${String(h).padStart(2, "0")}:${m}`);

      if (h >= 4 && h < 11) setGreeting("Selamat Pagi");
      else if (h >= 11 && h < 15) setGreeting("Selamat Siang");
      else if (h >= 15 && h < 18) setGreeting("Selamat Sore");
      else setGreeting("Selamat Malam");
    }

    updateTimeAndGreeting();
    const timer = setInterval(updateTimeAndGreeting, 30000);
    return () => clearInterval(timer);
  }, []);

  // Proactive Alert Ticker
  const [alertDismissed, setAlertDismissed] = useState(false);

  // Quick Capture State
  const [captureText, setCaptureText] = useState("");
  const [captureFilter, setCaptureFilter] = useState("Semua");
  const [captures, setCaptures] = useState<CaptureData[]>(() => initialCaptures || []);
  const [isSubmittingCapture, setIsSubmittingCapture] = useState(false);

  // Tasks Queue State
  const [taskQueue, setTaskQueue] = useState<TaskItemData[]>(() => initialTasks || []);

  // Timeblocks State
  const [timeblocks, setTimeblocks] = useState<TimeblockData[]>(() => initialTimeblocks || []);

  // Modal State for Timeblock
  const [isCreatingTimeblock, setIsCreatingTimeblock] = useState(false);
  const [tbTitle, setTbTitle] = useState("");
  const [tbStartTime, setTbStartTime] = useState("09:00");
  const [tbEndTime, setTbEndTime] = useState("10:30");
  const [tbType, setTbType] = useState<"BLOCKED" | "WORK" | "PERSONAL">("BLOCKED");
  const [tbReminderMinutes, setTbReminderMinutes] = useState<number | null>(null);
  const [tbRecurrence, setTbRecurrence] = useState<"NONE" | "DAILY" | "WEEKLY" | "MONTHLY">("NONE");
  const [tbIgnoreQuietHours, setTbIgnoreQuietHours] = useState(false);
  const [isSubmittingTb, setIsSubmittingTb] = useState(false);

  // Default Category for Quick Task
  const defaultCategory =
    projects.length > 0
      ? `📁 ${projects[0].title}`
      : areas.length > 0
      ? `📁 ${areas[0].name}`
      : "📁 Tugas";

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const selectedDuration = "⏱ 30m";
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Queue Tabs & Progressive Disclosure
  const [queueTab, setQueueTab] = useState<"ACTIVE" | "COMPLETED" | "ALL">("ACTIVE");
  const [isQueueExpanded, setIsQueueExpanded] = useState(false);

  // Optimistic ID sequence
  const [seqId, setSeqId] = useState(100);

  // Recent Activities Feed State
  const [activities, setActivities] = useState<ActivityFeedItem[]>(initialActivities);

  // Task Completion Toggle
  async function toggleTask(id: string) {
    const task = taskQueue.find((t) => t.id === id);
    if (!task) return;

    const isCurrentlyCompleted = task.status === "COMPLETED";
    const nextStatus: "COMPLETED" | "PENDING" = isCurrentlyCompleted ? "PENDING" : "COMPLETED";

    // Optimistic UI update
    setTaskQueue((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t))
    );

    if (nextStatus === "COMPLETED") {
      setActivities((prev) => [
        {
          id: `act-task-${id}-${Date.now()}`,
          type: "TASK_COMPLETED",
          title: task.title,
          category: task.categoryName || "Tugas Selesai",
          timestamp: new Date().toISOString(),
          xp: "+50 XP",
          linkUrl: `/tasks/${id}`,
        },
        ...prev,
      ]);
    }

    toast(
      nextStatus === "COMPLETED"
        ? `Tugas "${task.title}" berhasil diselesaikan! +50 XP 🎉`
        : `Tugas "${task.title}" dikembalikan ke antrean aktif`,
      "success"
    );

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: isCurrentlyCompleted ? "TODO" : "COMPLETED",
        }),
      });
      if (!res.ok) throw new Error("Gagal memperbarui status tugas");
      router.refresh();
    } catch {
      // Revert if error
      setTaskQueue((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: task.status } : t))
      );
      toast("Gagal memperbarui status tugas", "error");
    }
  }

  // Quick Capture Submission
  async function handleAddCapture(e: React.FormEvent) {
    e.preventDefault();
    if (!captureText.trim()) return;

    setIsSubmittingCapture(true);
    const content = captureText.trim();
    const nextNumber = seqId + 1;
    setSeqId(nextNumber);

    const newCap: CaptureData = {
      id: `cap-${nextNumber}`,
      content,
      tag: "Baru saja • Inbox",
      category: captureFilter === "Semua" ? "Catatan" : captureFilter,
    };

    setCaptures((prev) => [newCap, ...prev]);
    setActivities((prev) => [
      {
        id: `act-cap-${Date.now()}`,
        type: "CAPTURE",
        title: content,
        category: "Catatan Cepat",
        timestamp: new Date().toISOString(),
        linkUrl: "/capture",
      },
      ...prev,
    ]);
    setCaptureText("");
    toast("Catatan kilat tersimpan ke Inbox!", "success");

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
    } finally {
      setIsSubmittingCapture(false);
    }
  }

  // Convert Capture to Task
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
    toast("Catatan berhasil dikonversi menjadi tugas resmi!", "success");

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

  // Inline Quick Task Submission
  async function handleAddInlineTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsAddingTask(true);
    const title = newTaskTitle.trim();
    const nextNumber = seqId + 1;
    setSeqId(nextNumber);

    const ambient = parseAmbientTask(title);
    const taskPriority = ambient.detectedPriority?.level ?? "MEDIUM";
    const estimatedHours =
      ambient.detectedDuration?.hours ??
      (selectedDuration.includes("1h")
        ? 1
        : selectedDuration.includes("2h")
        ? 2
        : selectedDuration.includes("45m")
        ? 0.75
        : 0.5);

    const displayTitle = ambient.cleanTitle || title;

    const newTask: TaskItemData = {
      id: `task-${nextNumber}`,
      title: displayTitle,
      subtitle: `${selectedCategory} • ${ambient.detectedDuration?.label ?? selectedDuration.replace("⏱ ", "")}${
        ambient.detectedDate ? ` • 📅 ${ambient.detectedDate.label}` : ""
      }`,
      status: "PENDING",
      priority: taskPriority,
      badge: ambient.detectedPriority?.label ?? (taskPriority === "URGENT" ? "Mendesak" : "Antrean"),
      badgeType: taskPriority === "URGENT" ? "warning" : "neutral",
    };

    setTaskQueue((prev) => [...prev, newTask]);
    setNewTaskTitle("");
    toast(`Tugas "${displayTitle}" berhasil dijadwalkan ke hari ini!`, "success");

    try {
      const area = areas.find((a) => selectedCategory.includes(a.name));
      const project = projects.find((p) => selectedCategory.includes(p.title));

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: displayTitle,
          estimatedHours,
          priority: taskPriority,
          areaId: area?.id,
          projectId: project?.id,
          dueDate: ambient.detectedDate?.isoDate,
        }),
      });

      const json = await res.json();
      if (json.success && json.data?.id) {
        setTaskQueue((prev) =>
          prev.map((t) => (t.id === newTask.id ? { ...t, id: json.data.id } : t))
        );
      }
    } catch {
      // offline fallback
    } finally {
      setIsAddingTask(false);
    }
  }

  // Timeblock Handlers
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
          recurrence: tbRecurrence,
          ...(tbReminderMinutes !== null && { reminderMinutes: tbReminderMinutes }),
          ignoreQuietHours: tbIgnoreQuietHours,
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
      setTbStartTime("09:00");
      setTbEndTime("10:30");
      setTbType("BLOCKED");
      setTbReminderMinutes(null);
      setTbRecurrence("NONE");
      setTbIgnoreQuietHours(false);
      setIsCreatingTimeblock(false);
      toast(
        tbRecurrence !== "NONE"
          ? `Jadwal berulang "${tbTitle.trim()}" berhasil dibuat!`
          : "Blok waktu berhasil dijadwalkan!",
        "success"
      );
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
      toast("Blok waktu berhasil dihapus", "info");
      router.refresh();
    } catch {
      toast("Gagal menghapus blok waktu", "error");
    }
  }

  async function handleToggleTimeblockComplete(id: string, currentCompleted: boolean) {
    const nextCompleted = !currentCompleted;
    setTimeblocks((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              isCompleted: nextCompleted,
              status: nextCompleted ? "SELESAI" : "TERJADWAL",
            }
          : b
      )
    );

    try {
      const res = await fetch(`/api/calendar-events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: nextCompleted }),
      });
      if (!res.ok) throw new Error();
      toast(
        nextCompleted ? "To-do selesai! Luar biasa 🎉" : "To-do dikembalikan ke aktif.",
        "success"
      );
      router.refresh();
    } catch {
      setTimeblocks((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                isCompleted: currentCompleted,
                status: currentCompleted ? "SELESAI" : "TERJADWAL",
              }
            : b
        )
      );
      toast("Gagal memperbarui status to-do.", "error");
    }
  }

  // Derived Task Calculations
  const activeTasksList = useMemo(() => taskQueue.filter((t) => t.status !== "COMPLETED"), [taskQueue]);
  const completedTasksList = useMemo(() => taskQueue.filter((t) => t.status === "COMPLETED"), [taskQueue]);

  const activeCount = activeTasksList.length;
  const completedCount = completedTasksList.length;
  const totalCount = taskQueue.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const currentTabTasks =
    queueTab === "ACTIVE"
      ? activeTasksList
      : queueTab === "COMPLETED"
      ? completedTasksList
      : [...activeTasksList, ...completedTasksList];

  const QUEUE_VISIBLE_LIMIT = 6;
  const hasQueueOverflow = currentTabTasks.length > QUEUE_VISIBLE_LIMIT;
  const displayedQueueTasks =
    isQueueExpanded || !hasQueueOverflow
      ? currentTabTasks
      : currentTabTasks.slice(0, QUEUE_VISIBLE_LIMIT);
  const hiddenQueueCount = currentTabTasks.length - QUEUE_VISIBLE_LIMIT;

  // Filtered Captures
  const filteredCaptures = useMemo(() => {
    if (captureFilter === "Semua") return captures;
    return captures.filter((c) => c.category === captureFilter || c.category.includes(captureFilter));
  }, [captures, captureFilter]);

  // Spotlight active task
  const topPendingTask = activeTasksList[0];
  const activeSpotlight = nextAction
    ? {
        taskId: nextAction.taskId,
        taskName: nextAction.taskName,
        goalName: nextAction.goalName || nextAction.stageName || "Target Utama",
        reason: nextAction.reason || "Prioritas utama berdasarkan sasaran aktif Anda",
        estimatedMinutes: nextAction.estimatedMinutes || 45,
        priority: nextAction.priority || "HIGH",
      }
    : topPendingTask
    ? {
        taskId: topPendingTask.id,
        taskName: topPendingTask.title,
        goalName: topPendingTask.subtitle || "Antrean Prioritas",
        reason: "Tugas prioritas teratas dari antrean kerja hari ini.",
        estimatedMinutes: 30,
        priority: topPendingTask.priority || "MEDIUM",
      }
    : null;

  // Focus time display
  const focusTimeDisplay = `${Math.floor(stats.totalMinutes / 60)}j ${stats.totalMinutes % 60}m`;

  return (
    <div className="flex flex-col w-full gap-6 text-slate-800 dark:text-[#e2e2eb]">
      {/* ==================================================================== */}
      {/* 1. TOP HEADER HERO (MEWAH, BERSIH, RAMAH, TANPA SHORTCUT)            */}
      {/* ==================================================================== */}
      <header className="relative overflow-hidden rounded-3xl bg-white/85 dark:bg-[#131825]/90 border border-slate-200/80 dark:border-white/10 p-6 lg:p-7 shadow-sm dark:shadow-2xl backdrop-blur-xl transition-all">
        {/* Subtle Ambient Radial Glows */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-gradient-to-br from-[#8B5CF6]/15 via-[#38bdf8]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-gradient-to-tr from-[#4edea3]/10 via-transparent to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left Greeting & Date */}
          <div className="flex flex-col gap-1.5 max-w-xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8B5CF6]/10 text-[#7c3aed] dark:text-[#d0bcff] border border-[#8B5CF6]/20 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
                <span>{greeting}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#94a3b8] text-xs font-medium border border-slate-200/60 dark:border-white/[0.06]">
                <span className="material-symbols-outlined text-[15px] text-[#38bdf8]">schedule</span>
                <span>{clock} WIB</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-black text-slate-900 dark:text-white tracking-tight leading-snug mt-1">
              {initialDateStr || "Hari Ini"}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94a3b8] leading-relaxed">
              Ruang kerja harian Anda. Selesaikan prioritas utama dengan konsentrasi tenang tanpa distraksi.
            </p>
          </div>

          {/* Center/Right: Visual Progress Ring & Action Pills */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
            {/* Progress Circular Badge */}
            <div className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-slate-50/80 dark:bg-[#1a2133]/60 border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
              <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200 dark:text-white/[0.08]"
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
                <span className="absolute font-bold text-xs text-slate-900 dark:text-white">
                  {progressPercent}%
                </span>
              </div>
              <div className="flex flex-col min-w-[110px]">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {completedCount} dari {totalCount} Tugas
                </span>
                <span className="text-[11px] text-[#4edea3] font-semibold mt-0.5">
                  {completedCount === totalCount && totalCount > 0 ? "Selesai Sempurna! 🎉" : "Selesai Hari Ini"}
                </span>
              </div>
            </div>

            {/* Quick Action Navigation Buttons (Clean, without shortcut badges) */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Link
                href={activeSpotlight ? `/focus?taskId=${activeSpotlight.taskId}` : "/focus"}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] hover:from-[#7c3aed] hover:to-[#4f46e5] text-white text-xs font-bold shadow-md shadow-[#8B5CF6]/25 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[17px]">timer</span>
                <span>Mode Fokus</span>
              </Link>

              <Link
                href="/capture"
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-slate-700 dark:text-[#d0bcff] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                <span>Inbox</span>
              </Link>

              <Link
                href="/calendar"
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-slate-700 dark:text-[#38bdf8] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                <span>Kalender</span>
              </Link>

              <Link
                href="/progress"
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-slate-700 dark:text-[#4edea3] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">monitoring</span>
                <span>Progress</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. PROACTIVE ALERT TICKER (JIKA ADA TENGGAT ATAU KONFLIK)           */}
      {/* ==================================================================== */}
      {!alertDismissed && alertIssues.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 relative overflow-hidden shadow-xs animate-in fade-in duration-300">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">warning</span>
            </div>
            <div>
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                {alertIssues.length} Hal Membutuhkan Penanganan Segera:
              </span>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
                {alertIssues.map((issue) => (
                  <span key={issue.id} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <strong>{issue.title}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Link
              href="/calendar"
              className="px-3 py-1.5 rounded-xl bg-amber-500 text-white font-semibold text-xs hover:bg-amber-600 transition-colors shadow-xs"
            >
              Selesaikan di Kalender →
            </Link>
            <button
              type="button"
              onClick={() => setAlertDismissed(true)}
              className="p-1 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
              title="Abaikan peringatan"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. MAIN BENTO GRID (8 COLS KIRI + 4 COLS KANAN)                     */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================================================================== */}
        {/* LEFT COLUMN: SPOTLIGHT TASK + TASK QUEUE + TIME-BLOCKING           */}
        {/* ================================================================== */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* ── SPOTLIGHT HERO CARD (FOKUS UTAMA HARI INI) ── */}
          {activeSpotlight ? (
            <section className="relative overflow-hidden rounded-3xl bg-white/90 dark:bg-[#131825]/90 border border-purple-500/30 dark:border-[#8B5CF6]/35 p-6 sm:p-7 shadow-sm dark:shadow-[0_0_40px_-10px_rgba(139,92,246,0.15)] group transition-all">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#8B5CF6]/15 rounded-full blur-3xl pointer-events-none group-hover:bg-[#8B5CF6]/20 transition-all" />

              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8B5CF6]/15 text-[#7c3aed] dark:text-[#d0bcff] border border-[#8B5CF6]/30 text-xs font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[15px] text-[#f59e0b]">local_fire_department</span>
                    <span>Prioritas Tertinggi Hari Ini</span>
                  </span>

                  <span className="text-xs font-medium text-slate-500 dark:text-[#94a3b8] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-[#4edea3]">bolt</span>
                    <span>Fokus Utama</span>
                  </span>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                    {activeSpotlight.taskName}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-[#cbd5e1] mt-1.5 leading-relaxed">
                    {activeSpotlight.reason}
                  </p>
                </div>

                {/* Metadata Tags */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-800 dark:text-white">
                    <span className="material-symbols-outlined text-[15px] text-[#8B5CF6]">timer</span>
                    <span>Estimasi: {activeSpotlight.estimatedMinutes} Menit</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-xs font-semibold text-purple-700 dark:text-[#d0bcff]">
                    <span className="material-symbols-outlined text-[15px]">flag</span>
                    <span>{activeSpotlight.goalName}</span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs font-semibold text-amber-700 dark:text-[#f59e0b]">
                    <span className="material-symbols-outlined text-[15px]">priority_high</span>
                    <span>Prioritas: {activeSpotlight.priority}</span>
                  </span>
                </div>

                {/* Actions Bar (Clean, no shortcuts) */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href={`/focus?taskId=${activeSpotlight.taskId}`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] hover:from-[#7c3aed] hover:to-[#4f46e5] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#8B5CF6]/30 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[19px]">play_arrow</span>
                    <span>Mulai Sesi Fokus Sekarang</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => toggleTask(activeSpotlight.taskId)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-slate-800 dark:text-white border border-slate-200 dark:border-white/[0.08] text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#4edea3]">check_circle</span>
                    <span>Tandai Selesai</span>
                  </button>

                  <Link
                    href={`/tasks/${activeSpotlight.taskId}`}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/[0.08] transition-colors ml-auto"
                    title="Lihat rincian lengkap tugas"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            <section className="p-6 sm:p-7 rounded-3xl bg-white/90 dark:bg-[#131825]/90 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl relative overflow-hidden">
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-[#4edea3] text-xs font-bold">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Semua Tugas Selesai</span>
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Tidak Ada Tugas Tertunda Hari Ini! 🎉
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94a3b8] leading-relaxed">
                  Luar biasa! Seluruh target harian Anda telah tuntas. Anda dapat beristirahat dengan tenang, mencatat ide baru di Inbox, atau merencanakan sasaran berikutnya.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href="/goals"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7c3aed] text-white text-xs font-bold transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">flag</span>
                    <span>Buka Target &amp; Proyek</span>
                  </Link>
                  <Link
                    href="/capture"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-white text-xs font-semibold hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit_note</span>
                    <span>Catat Ide Baru</span>
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* ── ANTREAN FOKUS HARI INI (TASK QUEUE) ── */}
          <section className="flex flex-col p-6 sm:p-7 rounded-3xl bg-white/90 dark:bg-[#131825]/90 border border-slate-200/80 dark:border-white/10 shadow-sm dark:shadow-xl">
            {/* Header: Title, Counts, Progress, and Tabs */}
            <div className="flex flex-col gap-4 pb-4 border-b border-slate-200/70 dark:border-white/[0.08]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[20px]">checklist</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                      Antrean Fokus Hari Ini
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-[#94a3b8]">
                      {activeCount} tugas aktif · {completedCount} selesai
                    </p>
                  </div>
                </div>

                {/* Segmented Filter Tabs */}
                <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#0c0e14]/60 border border-slate-200 dark:border-white/[0.06] text-xs">
                  <button
                    type="button"
                    onClick={() => setQueueTab("ACTIVE")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      queueTab === "ACTIVE"
                        ? "bg-white dark:bg-[#8B5CF6]/25 text-[#6d28d9] dark:text-[#d0bcff] shadow-xs"
                        : "text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>Fokus Aktif</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#8B5CF6]/20 text-[#6d28d9] dark:text-white">
                      {activeCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQueueTab("COMPLETED")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      queueTab === "COMPLETED"
                        ? "bg-white dark:bg-[#4edea3]/25 text-emerald-700 dark:text-[#4edea3] shadow-xs"
                        : "text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>Selesai</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#4edea3]/20 text-emerald-800 dark:text-[#4edea3]">
                      {completedCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQueueTab("ALL")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      queueTab === "ALL"
                        ? "bg-white dark:bg-white/[0.15] text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>Semua</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-[#94a3b8]">
                      {totalCount}
                    </span>
                  </button>
                </div>
              </div>

              {/* Nudge if queue is crowded */}
              {queueTab === "ACTIVE" && activeCount > 5 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                  <span className="text-sm">💡</span>
                  <span>
                    Antrean cukup padat ({activeCount} tugas). Fokuskan energi pada 3 prioritas teratas agar tidak mudah lelah.
                  </span>
                </div>
              )}
            </div>

            {/* Task Rows List */}
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/[0.05] mt-2 max-h-[460px] overflow-y-auto pr-1">
              {currentTabTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-[#8B5CF6] mb-3">
                    <span className="material-symbols-outlined text-[26px]">
                      {queueTab === "COMPLETED" ? "task_alt" : "fact_check"}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {queueTab === "COMPLETED"
                      ? "Belum ada tugas selesai"
                      : queueTab === "ACTIVE" && completedCount > 0
                      ? "Semua tugas aktif sudah beres!"
                      : "Belum ada antrean tugas"}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-[#94a3b8] max-w-sm mt-1">
                    {queueTab === "COMPLETED"
                      ? "Centang tugas di tab Fokus Aktif saat selesai untuk memantau kemajuan Anda."
                      : queueTab === "ACTIVE" && completedCount > 0
                      ? `Hebat! Anda telah menuntaskan ${completedCount} tugas hari ini.`
                      : "Gunakan form cepat di bawah untuk menambahkan tugas baru ke meja kerja hari ini."}
                  </p>
                </div>
              ) : (
                displayedQueueTasks.map((task) => {
                  const isDone = task.status === "COMPLETED";
                  const isRunning = task.status === "RUNNING";

                  return (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between py-3.5 px-3 rounded-2xl transition-all my-0.5 ${
                        isRunning
                          ? "bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 shadow-xs"
                          : isDone
                          ? "opacity-60 hover:opacity-100 hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                          : "hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Interactive Checkmark */}
                        <button
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                            isDone
                              ? "bg-[#4edea3] text-[#0b0d13] shadow-xs"
                              : isRunning
                              ? "border-2 border-[#8B5CF6] text-transparent hover:border-[#7c3aed]"
                              : "border-2 border-slate-300 dark:border-white/30 text-transparent hover:border-[#8B5CF6] dark:hover:border-[#d0bcff]"
                          }`}
                          title={isDone ? "Batal Selesai" : "Tandai Selesai"}
                        >
                          {isDone ? (
                            <span className="material-symbols-outlined text-[16px] font-black">check</span>
                          ) : isRunning ? (
                            <span className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
                          ) : null}
                        </button>

                        <div className="flex flex-col min-w-0 flex-1">
                          <Link
                            href={`/tasks/${task.id}`}
                            className={`text-sm font-semibold truncate hover:text-[#8B5CF6] dark:hover:text-[#d0bcff] transition-colors ${
                              isDone ? "line-through text-slate-400 dark:text-[#94a3b8]" : "text-slate-900 dark:text-white"
                            }`}
                            title="Buka detail tugas"
                          >
                            {task.title}
                          </Link>

                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-[#94a3b8] truncate">
                            {task.projectId ? (
                              <Link
                                href={`/goals?tab=projects`}
                                className="hover:underline hover:text-[#8B5CF6] transition-colors truncate"
                              >
                                {task.subtitle}
                              </Link>
                            ) : (
                              <span className="truncate">{task.subtitle}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Tag / Focus Launcher */}
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {isDone ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-[#4edea3] text-xs font-bold border border-[#4edea3]/20">
                            Selesai ✓
                          </span>
                        ) : isRunning ? (
                          <Link
                            href={`/focus?taskId=${task.id}`}
                            className="px-3 py-1 rounded-xl bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/30 text-[#8B5CF6] dark:text-[#d0bcff] text-xs font-bold border border-[#8B5CF6]/30 flex items-center gap-1 transition-all"
                          >
                            <span>Sedang Fokus</span>
                            <span>🍅</span>
                          </Link>
                        ) : (
                          <>
                            {task.badge && (
                              <span
                                className={`hidden sm:inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                  task.badgeType === "warning"
                                    ? "bg-amber-500/15 text-amber-700 dark:text-[#f59e0b] border border-amber-500/30"
                                    : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#94a3b8]"
                                }`}
                              >
                                {task.badge}
                              </span>
                            )}

                            <Link
                              href={`/focus?taskId=${task.id}`}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#8B5CF6] hover:text-white dark:bg-white/[0.06] dark:hover:bg-[#8B5CF6] text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                              title="Mulai sesi fokus untuk tugas ini"
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

            {/* Overflow Accordion */}
            {hasQueueOverflow && (
              <button
                type="button"
                onClick={() => setIsQueueExpanded(!isQueueExpanded)}
                className="w-full py-2.5 mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.06] text-xs font-semibold text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isQueueExpanded ? "expand_less" : "expand_more"}
                </span>
                <span>
                  {isQueueExpanded
                    ? "Tampilkan 6 Tugas Teratas Saja"
                    : `Lihat ${hiddenQueueCount} Tugas Lainnya dalam Antrean`}
                </span>
              </button>
            )}

            {/* Quick Inline Task Bar */}
            {(() => {
              const ambient = parseAmbientTask(newTaskTitle);
              return (
                <div className="mt-5 pt-4 border-t border-slate-200/70 dark:border-white/[0.08] space-y-2">
                  <form
                    onSubmit={handleAddInlineTask}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                  >
                    <div className="relative flex-1">
                      <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-[18px] text-slate-400 dark:text-[#94a3b8]">
                        add_task
                      </span>
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Tambah tugas cepat... (mis. Review proposal besok penting)"
                        className="w-full bg-slate-50 dark:bg-[#1a2133]/70 pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#94a3b8]/60 text-xs focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-all"
                      />
                      <div className="absolute right-2 top-1.5 flex items-center">
                        <VoiceInputButton
                          onTranscript={(text) => setNewTaskTitle(text)}
                          className="scale-90"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1a2133]/70 text-slate-700 dark:text-[#d0bcff] border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-none cursor-pointer max-w-[170px] truncate"
                      >
                        {projects.map((p) => (
                          <option key={p.id} value={`📁 ${p.title}`}>
                            📁 {p.title}
                          </option>
                        ))}
                        {areas.map((a) => (
                          <option key={a.id} value={`📁 ${a.name}`}>
                            📁 {a.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="submit"
                        disabled={isAddingTask || !newTaskTitle.trim()}
                        className="px-4 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7c3aed] text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-all shrink-0 active:scale-95"
                      >
                        {isAddingTask ? "Menyimpan..." : "Tambah"}
                      </button>
                    </div>
                  </form>

                  {/* Smart Ambient NLP Detection Pills */}
                  {newTaskTitle.trim() && (ambient.detectedPriority || ambient.detectedDuration || ambient.detectedDate) && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#8B5CF6] dark:text-[#d0bcff] pl-1 animate-in fade-in">
                      <span className="font-semibold">Terdeteksi:</span>
                      {ambient.detectedPriority && (
                        <span className="px-2 py-0.5 rounded-md bg-[#8B5CF6]/15 border border-[#8B5CF6]/30">
                          {ambient.detectedPriority.label}
                        </span>
                      )}
                      {ambient.detectedDuration && (
                        <span className="px-2 py-0.5 rounded-md bg-[#38bdf8]/15 border border-[#38bdf8]/30 text-[#38bdf8]">
                          {ambient.detectedDuration.label}
                        </span>
                      )}
                      {ambient.detectedDate && (
                        <span className="px-2 py-0.5 rounded-md bg-[#4edea3]/15 border border-[#4edea3]/30 text-[#4edea3]">
                          {ambient.detectedDate.label}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </section>

          {/* ── TIME-BLOCKING & JADWAL KALENDER HARI INI ── */}
          <section className="p-6 sm:p-7 rounded-3xl bg-white/90 dark:bg-[#131825]/90 border border-slate-200/80 dark:border-white/10 shadow-sm dark:shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#38bdf8]/15 text-[#38bdf8] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Time-blocking Terjadwal (Hari Ini)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#94a3b8]">
                    Alokasi waktu tenang dan komitmen agenda harian
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingTimeblock(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 text-[#8B5CF6] dark:text-[#d0bcff] border border-[#8B5CF6]/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Blok Waktu</span>
                </button>

                <Link
                  href="/calendar"
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                >
                  Kalender →
                </Link>
              </div>
            </div>

            {timeblocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-200/70 dark:border-white/[0.06]">
                <span className="material-symbols-outlined text-[28px] text-slate-400 dark:text-[#94a3b8] mb-2">
                  event_available
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Belum Ada Jadwal Khusus Hari Ini
                </h4>
                <p className="text-xs text-slate-500 dark:text-[#94a3b8] max-w-sm mt-0.5 mb-3">
                  Atur blok waktu fokus agar ritme kerja Anda terhindar dari jadwal yang bertabrakan.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreatingTimeblock(true)}
                  className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7c3aed] text-white text-xs font-bold transition-all shadow-xs"
                >
                  Jadwalkan Blok Waktu
                </button>
              </div>
            ) : (
              <div className="relative flex flex-col gap-3 pl-4 border-l-2 border-slate-200 dark:border-white/10 ml-2">
                {timeblocks.map((block) => {
                  const isCurrent = block.status === "BERJALAN_SEKARANG";
                  const isDone = block.isCompleted || block.status === "SELESAI";

                  return (
                    <div
                      key={block.id}
                      className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? "bg-[#8B5CF6]/10 border-[#8B5CF6]/35 shadow-xs"
                          : isDone
                          ? "bg-slate-50/70 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] opacity-75"
                          : "bg-white dark:bg-[#1a2133]/40 border-slate-200/80 dark:border-white/[0.08]"
                      }`}
                    >
                      {/* Status timeline bead */}
                      <div
                        className={`absolute -left-[23px] top-5 w-3 h-3 rounded-full ring-4 ring-white dark:ring-[#131825] ${
                          isDone
                            ? "bg-[#4edea3]"
                            : isCurrent
                            ? "bg-[#8B5CF6] animate-pulse"
                            : "bg-[#38bdf8]"
                        }`}
                      />

                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => handleToggleTimeblockComplete(block.id, !!block.isCompleted)}
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                            isDone
                              ? "bg-[#4edea3] border-[#4edea3] text-[#0b0d13]"
                              : "border-slate-300 dark:border-white/30 text-transparent hover:border-[#4edea3]"
                          }`}
                          title={isDone ? "Tandai belum selesai" : "Tandai selesai"}
                        >
                          <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                        </button>

                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-semibold text-slate-500 dark:text-[#94a3b8]">
                            {block.time}
                          </span>
                          <span
                            className={`text-sm font-bold truncate mt-0.5 ${
                              isDone
                                ? "line-through text-slate-400 dark:text-[#94a3b8]"
                                : isCurrent
                                ? "text-[#8B5CF6] dark:text-white"
                                : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {block.title}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isCurrent
                              ? "bg-[#8B5CF6]/20 text-[#8B5CF6] dark:text-[#d0bcff]"
                              : isDone
                              ? "bg-[#4edea3]/20 text-[#4edea3]"
                              : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#94a3b8]"
                          }`}
                        >
                          {isCurrent ? "Sedang Berjalan" : isDone ? "Selesai" : "Terjadwal"}
                        </span>

                        <Link
                          href="/focus"
                          className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-[#8B5CF6] hover:text-white text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <span>Fokus</span>
                          <span>🍅</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleDeleteTimeblock(block.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Hapus blok waktu"
                        >
                          <span className="material-symbols-outlined text-[17px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ================================================================== */}
        {/* RIGHT COLUMN: RANGKUMAN METRIK + QUICK CAPTURE + WALL OF WINS       */}
        {/* ================================================================== */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* ── 1. RANGKUMAN HARI INI (METRICS BENTO) ── */}
          <section className="p-6 rounded-3xl bg-white/90 dark:bg-[#131825]/90 border border-slate-200/80 dark:border-white/10 shadow-sm dark:shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Rangkuman Hari Ini
              </h3>
              <span className="material-symbols-outlined text-[20px] text-[#8B5CF6]">
                monitoring
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Card 1: Waktu Fokus */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-[#94a3b8] uppercase tracking-wider">
                    Total Waktu Fokus
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {focusTimeDisplay}
                  </span>
                  <span className="text-xs text-[#4edea3] font-semibold flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[14px]">trending_up</span>
                    <span>Sesi deep work harian</span>
                  </span>
                </div>

                <div className="w-14 h-8 flex items-end justify-between gap-1 pb-1">
                  <div className="w-2 bg-[#4edea3]/20 h-3 rounded-t" />
                  <div className="w-2 bg-[#4edea3]/40 h-5 rounded-t" />
                  <div className="w-2 bg-[#4edea3]/60 h-4 rounded-t" />
                  <div className="w-2 bg-[#4edea3]/80 h-7 rounded-t" />
                  <div className="w-2 bg-[#4edea3] h-8 rounded-t" />
                </div>
              </div>

              {/* Card 2: Penyelesaian Tugas */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-[#94a3b8] uppercase tracking-wider">
                    Penyelesaian Tugas
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {completedCount} / {totalCount}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-[#94a3b8] mt-1">
                    {activeCount} masih dalam antrean
                  </span>
                </div>

                <div className="w-11 h-11 rounded-2xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center font-bold text-xs text-[#8B5CF6] dark:text-[#d0bcff]">
                  {progressPercent}%
                </div>
              </div>

              {/* Card 3: Momentum & XP */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-[#94a3b8] uppercase tracking-wider">
                    Momentum &amp; XP
                  </span>
                  <span className="text-2xl font-black text-[#8B5CF6] dark:text-[#d0bcff] mt-1">
                    +{completedCount * 50} XP
                  </span>
                  <span className="text-xs text-[#f59e0b] font-semibold mt-1">
                    {completedCount > 0 ? "🔥 Rantai fokus menyala" : "⚡ Siap memulai hari"}
                  </span>
                </div>

                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-[#f59e0b] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">military_tech</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── 2. KOTAK CATATAN CEPAT (INBOX CAPTURE) ── */}
          <section className="p-6 rounded-3xl bg-white/90 dark:bg-[#131825]/90 border border-slate-200/80 dark:border-white/10 shadow-sm dark:shadow-xl flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8B5CF6] text-[20px]">bolt</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Kotak Catatan Cepat
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#94a3b8] text-xs font-semibold">
                {captures.length} Draf
              </span>
            </div>

            <form onSubmit={handleAddCapture} className="flex flex-col gap-2.5">
              <textarea
                value={captureText}
                onChange={(e) => setCaptureText(e.target.value)}
                rows={2}
                placeholder="Catat ide spontan, pengingat kilat, atau memo mendadak..."
                className="w-full bg-slate-50 dark:bg-[#1a2133]/70 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#94a3b8]/60 text-xs focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] resize-none transition-all"
              />

              {/* Category Filter Chips */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                  {["Semua", "💡 Ide", "✅ Tugas", "📝 Catatan"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setCaptureFilter(f)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        captureFilter === f
                          ? "bg-[#8B5CF6] text-white shadow-xs"
                          : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingCapture || !captureText.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7c3aed] text-white text-xs font-bold disabled:opacity-50 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  {isSubmittingCapture ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>

            {/* List of Recent Quick Captures */}
            <div className="flex flex-col gap-2 divide-y divide-slate-100 dark:divide-white/[0.06] mt-1">
              {filteredCaptures.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 dark:text-[#94a3b8] bg-slate-50 dark:bg-white/[0.02] rounded-2xl">
                  Kotak catatan bersih. Tuliskan ide kilat di atas untuk mengosongkan pikiran.
                </div>
              ) : (
                filteredCaptures.slice(0, 4).map((item) => (
                  <div key={item.id} className="pt-2.5 flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                        {item.content}
                      </span>
                      <button
                        type="button"
                        onClick={() => convertCaptureToTask(item.id)}
                        className="text-[#8B5CF6] hover:text-[#7c3aed] dark:text-[#d0bcff] dark:hover:text-white text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                      >
                        Jadi Tugas
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-[#94a3b8]">{item.tag}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ── 3. AKTIVITAS TERBARU (LIVE ACTIVITY TIMELINE FEED) ── */}
          <RecentActivityFeed
            activities={activities}
            areas={areas}
            projects={projects}
            onActivityAdded={(newAct) => setActivities((prev) => [newAct, ...prev])}
          />
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. MODAL DIALOG: TAMBAH BLOK WAKTU BARU                              */}
      {/* ==================================================================== */}
      {isCreatingTimeblock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#131825] border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col gap-5 text-slate-800 dark:text-[#e2e2eb]">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#8B5CF6] text-[22px]">calendar_add_on</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Jadwalkan Blok Waktu Hari Ini
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingTimeblock(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTimeblock} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-[#d0bcff]">
                  Nama Aktivitas / Blok Fokus
                </label>
                <input
                  type="text"
                  required
                  value={tbTitle}
                  onChange={(e) => setTbTitle(e.target.value)}
                  placeholder="Misal: Deep work laporan, Olahraga sore, Belajar Next.js"
                  className="w-full bg-slate-50 dark:bg-[#1a2133] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#94a3b8]/60 text-xs focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#d0bcff]">Jam Mulai</label>
                  <input
                    type="time"
                    required
                    value={tbStartTime}
                    onChange={(e) => setTbStartTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1a2133] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#d0bcff]">Jam Selesai</label>
                  <input
                    type="time"
                    required
                    value={tbEndTime}
                    onChange={(e) => setTbEndTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1a2133] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-[#d0bcff]">Kategori</label>
                <select
                  value={tbType}
                  onChange={(e) => setTbType(e.target.value as "BLOCKED" | "WORK" | "PERSONAL")}
                  className="w-full bg-slate-50 dark:bg-[#1a2133] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="BLOCKED">🎯 Fokus Penuh (Deep Work)</option>
                  <option value="WORK">💼 Pekerjaan / Kuliah</option>
                  <option value="PERSONAL">🌱 Pribadi &amp; Kesehatan</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#d0bcff]">Pengulangan</label>
                  <select
                    value={tbRecurrence}
                    onChange={(e) => setTbRecurrence(e.target.value as "NONE" | "DAILY" | "WEEKLY" | "MONTHLY")}
                    className="w-full bg-slate-50 dark:bg-[#1a2133] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="NONE">Hanya hari ini</option>
                    <option value="DAILY">🔁 Setiap hari</option>
                    <option value="WEEKLY">📅 Setiap minggu</option>
                    <option value="MONTHLY">🗓 Setiap bulan</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#d0bcff]">Pengingat</label>
                  <select
                    value={tbReminderMinutes === null ? "" : String(tbReminderMinutes)}
                    onChange={(e) =>
                      setTbReminderMinutes(e.target.value === "" ? null : Number(e.target.value))
                    }
                    className="w-full bg-slate-50 dark:bg-[#1a2133] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="">🔔 Pengaturan Default</option>
                    <option value="5">5 menit sebelum</option>
                    <option value="10">10 menit sebelum</option>
                    <option value="15">15 menit sebelum</option>
                    <option value="30">30 menit sebelum</option>
                    <option value="60">60 menit sebelum</option>
                  </select>
                </div>
              </div>

              <label
                htmlFor="tb-ignore-quiet"
                className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#1a2133]/50 border border-slate-200/80 dark:border-white/10 cursor-pointer"
              >
                <input
                  id="tb-ignore-quiet"
                  type="checkbox"
                  checked={tbIgnoreQuietHours}
                  onChange={(e) => setTbIgnoreQuietHours(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#8B5CF6] cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Abaikan Jam Tenang</span>
                  <span className="text-[11px] text-slate-500 dark:text-[#94a3b8]">
                    Kirim pengingat Telegram meskipun pada jam istirahat malam
                  </span>
                </div>
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsCreatingTimeblock(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-[#94a3b8] hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTb || !tbTitle.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7c3aed] text-white text-xs font-bold shadow-md shadow-[#8B5CF6]/25 disabled:opacity-50 transition-all cursor-pointer active:scale-95"
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
