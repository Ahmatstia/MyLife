"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/components/ui/Toast";
import { BackButton } from "@/app/components/ui/BackButton";

// ── Types ──────────────────────────────────────────────────────────
export interface TaskItem {
  id: string;
  title: string;
  notes?: string | null;
  status: string;
  priority: string;
  dueDate?: string | Date | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  stage?: { name: string; goal: { title: string } } | null;
  project?: { title: string; goal?: { title: string } | null } | null;
  area?: { name: string; color?: string | null } | null;
  sessions?: Array<{ id: string; durationMinutes?: number | null }> | null;
}

export interface FocusItem {
  id: string;
  order: number;
  date: Date | string;
  task: TaskItem;
}

export interface ActiveSessionProp {
  id: string;
  startedAt: string;
  taskId: string;
  taskTitle: string;
}

export interface TodaySessionItem {
  id: string;
  taskId: string;
  taskTitle: string;
  startedAt: string;
  endedAt: string | null;
  timeRange: string;
  durationMinutes: number;
  project: string;
  sprintLabel: string;
}

interface Props {
  initialFocus: FocusItem[];
  initialHistory: FocusItem[];
  availableTasks: TaskItem[];
  activeSession?: ActiveSessionProp | null;
  initialTodaySessions?: TodaySessionItem[];
  streakDays?: number;
  targetTaskId?: string | null;
}

// ── Soundscape Presets ──────────────────────────────────────────────
const SOUNDSCAPES = [
  { id: "obsidian", label: "Obsidian Dark", type: "brown", desc: "Deep soothing brown noise (65dB)" },
  { id: "rain", label: "Rain Ambience", type: "pink", desc: "Gentle rain & water frequencies" },
  { id: "cosmic", label: "Cosmic Stream", type: "white", desc: "Soft white noise stream" },
];

export function FocusManager({
  initialFocus,
  initialHistory,
  availableTasks,
  activeSession,
  initialTodaySessions = [],
  streakDays = 14,
  targetTaskId,
}: Props) {
  const { toast } = useToast();
  const router = useRouter();

  // Navigation & Mode
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");
  const [modePreset, setModePreset] = useState<"pomodoro" | "flow">("pomodoro");

  // Focus queue & backlog
  const [focusList, setFocusList] = useState<FocusItem[]>(() => {
    if (targetTaskId && !initialFocus.some((f) => f.task.id === targetTaskId)) {
      const matchInAvailable = availableTasks.find((t) => t.id === targetTaskId);
      if (matchInAvailable) {
        const syntheticItem: FocusItem = {
          id: `focus-param-${matchInAvailable.id}`,
          date: new Date(),
          order: 0,
          task: matchInAvailable,
        };
        return [syntheticItem, ...initialFocus];
      }
    }
    return initialFocus;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

  // Active target task
  const [activePomodoroTask, setActivePomodoroTask] = useState<FocusItem["task"] | null>(() => {
    if (activeSession) {
      const match = initialFocus.find((f) => f.task.id === activeSession.taskId);
      if (match) return match.task;
      return {
        id: activeSession.taskId,
        title: activeSession.taskTitle,
        status: "IN_PROGRESS",
        priority: "HIGH",
      };
    }
    if (targetTaskId) {
      const inFocus = initialFocus.find((f) => f.task.id === targetTaskId);
      if (inFocus) return inFocus.task;
      const inAvailable = availableTasks.find((t) => t.id === targetTaskId);
      if (inAvailable) return inAvailable;
    }
    // Default 1: First pending task in focus list
    const firstPending = initialFocus.find((f) => f.task.status !== "COMPLETED")?.task;
    if (firstPending) return firstPending;
    if (initialFocus[0]?.task) return initialFocus[0].task;

    // Default 2: First available task from backlog
    if (availableTasks.length > 0) {
      return availableTasks[0];
    }
    return null;
  });

  // Pomodoro Timer States
  const presetMinutes = modePreset === "pomodoro" ? 25 : 90;
  const [targetDurationSeconds, setTargetDurationSeconds] = useState(presetMinutes * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(presetMinutes * 60);
  const [timerStatus, setTimerStatus] = useState<"idle" | "running" | "paused">(() =>
    activeSession ? "running" : "idle"
  );
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => activeSession?.id ?? null);
  const [currentInterval, setCurrentInterval] = useState(1);
  const targetIntervals = modePreset === "pomodoro" ? 4 : 2;

  // Real-time Scratchpad Quick Capture (initialized lazily from localStorage without effect)
  const [scratchpadNote, setScratchpadNote] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("mylife_focus_scratchpad") || "";
      } catch {
        return "";
      }
    }
    return "";
  });

  // Today's completed sessions log
  const [todaySessions, setTodaySessions] = useState<TodaySessionItem[]>(initialTodaySessions);

  // Audio Ambience
  const [soundscapeIdx, setSoundscapeIdx] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);

  // Direct handler for mode preset switch (avoids cascading renders in useEffect)
  const handleSelectModePreset = (preset: "pomodoro" | "flow") => {
    setModePreset(preset);
    if (timerStatus === "idle") {
      const newSec = (preset === "pomodoro" ? 25 : 90) * 60;
      setTargetDurationSeconds(newSec);
      setRemainingSeconds(newSec);
    }
  };

  const saveScratchpad = (val: string) => {
    setScratchpadNote(val);
    try {
      localStorage.setItem("mylife_focus_scratchpad", val);
    } catch {
      // Ignore
    }
  };

  // ── Web Audio Soundscape Generator ──────────────────────────────
  const startAudio = useCallback((type: string) => {
    try {
      if (noiseNodeRef.current) {
        noiseNodeRef.current.disconnect();
        noiseNodeRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      let lastOut = 0.0;
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === "brown") {
          // Brown noise (1/f^2)
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 2.6;
        } else if (type === "pink") {
          // Pink noise (1/f)
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        } else {
          // White noise
          output[i] = white * 0.15;
        }
      }

      const sourceNode = ctx.createBufferSource();
      sourceNode.buffer = noiseBuffer;
      sourceNode.loop = true;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);

      sourceNode.connect(gainNode);
      gainNode.connect(ctx.destination);
      sourceNode.start(0);

      noiseNodeRef.current = gainNode;
      setIsAudioPlaying(true);
    } catch {
      toast("Audio tidak didukung pada peramban ini.", "error");
    }
  }, [toast]);

  const stopAudio = useCallback(() => {
    if (noiseNodeRef.current) {
      noiseNodeRef.current.disconnect();
      noiseNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsAudioPlaying(false);
  }, []);

  const toggleAudio = () => {
    if (isAudioPlaying) {
      stopAudio();
      toast("Soundscape dihentikan.", "info");
    } else {
      startAudio(SOUNDSCAPES[soundscapeIdx].type);
      toast(`${SOUNDSCAPES[soundscapeIdx].label} aktif.`, "info");
    }
  };

  const cycleSoundscape = () => {
    const nextIdx = (soundscapeIdx + 1) % SOUNDSCAPES.length;
    setSoundscapeIdx(nextIdx);
    if (isAudioPlaying) {
      startAudio(SOUNDSCAPES[nextIdx].type);
    }
    toast(`Soundscape diubah ke: ${SOUNDSCAPES[nextIdx].label}`, "info");
  };

  useEffect(() => {
    return () => stopAudio();
  }, [stopAudio]);

  // ── Timer Ticker & Completion Bell ────────────────────────────────
  const playBell = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.6);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (timerStatus !== "running") return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          playBell();
          setTimerStatus("paused");
          setCurrentInterval((cur) => Math.min(targetIntervals, cur + 1));
          toast("Sesi fokus selesai! Waktunya istirahat sejenak ☕", "success");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerStatus, playBell, targetIntervals, toast]);

  // ── Session API Actions ───────────────────────────────────────────
  const handleToggleTimer = async () => {
    if (timerStatus === "running") {
      setTimerStatus("paused");
      toast("Sesi dijeda.", "info");
      return;
    }

    if (timerStatus === "paused") {
      setTimerStatus("running");
      toast("Sesi dilanjutkan.", "info");
      return;
    }

    // Timer is idle -> Start new session
    let taskToRun = activePomodoroTask;
    if (!taskToRun) {
      const candidateFocus = focusList.find((f) => f.task.status !== "COMPLETED")?.task || focusList[0]?.task;
      if (candidateFocus) {
        taskToRun = candidateFocus;
        setActivePomodoroTask(candidateFocus);
      } else if (availableTasks.length > 0) {
        taskToRun = availableTasks[0];
        setActivePomodoroTask(availableTasks[0]);
        handleAddBacklogToFocus(availableTasks[0].id, availableTasks[0].title);
      }
    }

    if (!taskToRun) {
      toast("Belum ada tugas yang tersedia untuk difokuskan. Buat atau pilih tugas terlebih dahulu dari antrean.", "error");
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskToRun.id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setCurrentSessionId(json.data.id);
      }
      setTimerStatus("running");
      toast(`Sesi fokus dimulai: "${taskToRun.title}". Selamat berkonsentrasi!`, "success");
    } catch {
      setTimerStatus("running");
    }
  };

  const handleCompleteSprint = async () => {
    if (!activePomodoroTask) return;

    const durationDoneMinutes = Math.max(
      1,
      Math.round((targetDurationSeconds - remainingSeconds) / 60)
    );

    try {
      // 1. End session if open
      if (currentSessionId) {
        await fetch(`/api/sessions/${currentSessionId}/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activity: scratchpadNote || "Sesi fokus terselesaikan dengan sukses",
            obstacle: "",
            durationMinutes: durationDoneMinutes,
          }),
        });
      }

      // 2. Mark task completed
      await fetch(`/api/tasks/${activePomodoroTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });

      // 3. Update local state
      setFocusList((prev) =>
        prev.map((item) =>
          item.task.id === activePomodoroTask.id
            ? { ...item, task: { ...item.task, status: "COMPLETED" } }
            : item
        )
      );

      // Add to today's completed session logs
      const now = new Date();
      const startTime = new Date(now.getTime() - durationDoneMinutes * 60000);
      const timeRangeStr = `${new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).format(startTime)} – ${new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).format(now)}`;

      const newLogItem: TodaySessionItem = {
        id: currentSessionId || `local-${Date.now()}`,
        taskId: activePomodoroTask.id,
        taskTitle: activePomodoroTask.title,
        startedAt: startTime.toISOString(),
        endedAt: now.toISOString(),
        timeRange: timeRangeStr,
        durationMinutes: durationDoneMinutes,
        project: getParentLabel(activePomodoroTask),
        sprintLabel: `SPRINT #${String(todaySessions.length + 1).padStart(2, "0")}`,
      };

      setTodaySessions((prev) => [newLogItem, ...prev]);

      // Reset timer
      setCurrentSessionId(null);
      setTimerStatus("idle");
      setRemainingSeconds(targetDurationSeconds);
      setCurrentInterval((cur) => Math.min(targetIntervals, cur + 1));

      // Advance to next pending task if available
      const nextPending = focusList.find(
        (f) => f.task.id !== activePomodoroTask.id && f.task.status !== "COMPLETED"
      );
      if (nextPending) {
        setActivePomodoroTask(nextPending.task);
      }

      playBell();
      toast("Sprint & Tugas selesai! 🎉 +150 XP tercatat.", "success");
      router.refresh();
    } catch {
      toast("Gagal menyelesaikan sprint.", "error");
    }
  };

  const handleAddFiveMinutes = () => {
    setRemainingSeconds((prev) => prev + 300);
    setTargetDurationSeconds((prev) => prev + 300);
    toast("+5 Menit ditambahkan ke timer.", "info");
  };

  const handleStopSession = async () => {
    if (timerStatus === "idle") return;

    if (currentSessionId) {
      try {
        const durationDone = Math.max(1, Math.round((targetDurationSeconds - remainingSeconds) / 60));
        await fetch(`/api/sessions/${currentSessionId}/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activity: "Dihentikan manual",
            durationMinutes: durationDone,
          }),
        });
      } catch {
        // Ignore
      }
    }

    setTimerStatus("idle");
    setCurrentSessionId(null);
    setRemainingSeconds((modePreset === "pomodoro" ? 25 : 90) * 60);
    setTargetDurationSeconds((modePreset === "pomodoro" ? 25 : 90) * 60);
    toast("Sesi fokus dihentikan.", "info");
    router.refresh();
  };

  // Keyboard shortcut listener: Space to toggle, Cmd/Ctrl+Enter to finish
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      if (e.code === "Space") {
        e.preventDefault();
        handleToggleTimer();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleCompleteSprint();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // ── Queue & Backlog Operations ───────────────────────────────────
  const focusedTaskIds = useMemo(() => new Set(focusList.map((f) => f.task.id)), [focusList]);
  const unselectedTasks = useMemo(
    () => availableTasks.filter((t) => !focusedTaskIds.has(t.id)),
    [availableTasks, focusedTaskIds]
  );

  const filteredBacklog = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return unselectedTasks;
    return unselectedTasks.filter((t) => {
      const titleMatch = t.title.toLowerCase().includes(q);
      const parentMatch = getParentLabelForBacklog(t).toLowerCase().includes(q);
      return titleMatch || parentMatch;
    });
  }, [unselectedTasks, searchQuery]);

  async function handleAddBacklogToFocus(taskId: string, title?: string) {
    if (!taskId || loadingTaskId) return;

    setLoadingTaskId(taskId);
    try {
      const res = await fetch("/api/daily-focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menambahkan tugas.");

      setFocusList((prev) => [...prev, data.data]);
      if (!activePomodoroTask) {
        setActivePomodoroTask(data.data.task);
      }
      setSearchQuery("");
      toast(`"${title || "Tugas"}" ditambahkan ke fokus harian.`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      toast(msg, "error");
    } finally {
      setLoadingTaskId(null);
    }
  }

  // Instant 0ms Optimistic UI Reorder
  async function handleReorder(id: string, direction: "up" | "down") {
    const currentIndex = focusList.findIndex((f) => f.id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= focusList.length) return;

    // 1. Optimistic UI update INSTANTLY (0ms)
    const prevList = [...focusList];
    const nextList = [...focusList];
    const [movedItem] = nextList.splice(currentIndex, 1);
    nextList.splice(targetIndex, 0, movedItem);

    setFocusList(nextList);

    try {
      const res = await fetch(`/api/daily-focus/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert if server fails
      setFocusList(prevList);
      toast("Gagal mengubah urutan tugas.", "error");
    }
  }

  // Instant 0ms Optimistic Task Status Toggle
  async function handleToggleFocusTaskStatus(taskId: string, currentStatus: string) {
    const nextStatus = currentStatus === "COMPLETED" ? "IN_PROGRESS" : "COMPLETED";

    // 1. Optimistic UI update INSTANTLY (0ms)
    const prevList = [...focusList];
    setFocusList((prev) =>
      prev.map((item) =>
        item.task.id === taskId
          ? { ...item, task: { ...item.task, status: nextStatus } }
          : item
      )
    );

    if (nextStatus === "COMPLETED") {
      playBell();
      toast("Tugas selesai! 🎉 +50 XP tercatat.", "success");
      // If currently active task was completed, switch to next pending
      if (activePomodoroTask?.id === taskId) {
        const nextPending = focusList.find(
          (f) => f.task.id !== taskId && f.task.status !== "COMPLETED"
        );
        if (nextPending) {
          setActivePomodoroTask(nextPending.task);
        }
      }
    } else {
      toast("Tugas dikembalikan ke antrean aktif.", "info");
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert if failed
      setFocusList(prevList);
      toast("Gagal memperbarui status tugas.", "error");
    }
  }

  async function handleClearCompleted() {
    const completedItems = focusList.filter((f) => f.task.status === "COMPLETED");
    if (completedItems.length === 0) {
      toast("Tidak ada tugas selesai yang perlu dibersihkan.", "info");
      return;
    }

    const prevList = [...focusList];
    // Optimistic clean
    setFocusList((prev) => prev.filter((f) => f.task.status !== "COMPLETED"));
    toast("Tugas selesai telah dibersihkan dari antrean fokus.", "success");

    try {
      await Promise.all(
        completedItems.map((item) =>
          fetch(`/api/daily-focus/${item.id}`, { method: "DELETE" })
        )
      );
    } catch {
      setFocusList(prevList);
      toast("Gagal membersihkan tugas selesai.", "error");
    }
  }

  function handleAutoSortByEstimate() {
    const priorityWeight: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const sorted = [...focusList].sort((a, b) => {
      const pA = priorityWeight[a.task.priority] || 0;
      const pB = priorityWeight[b.task.priority] || 0;
      if (pB !== pA) return pB - pA;
      const estA = a.task.estimatedHours || 1;
      const estB = b.task.estimatedHours || 1;
      return estA - estB;
    });
    setFocusList(sorted);
    toast("Antrean ditata otomatis berdasarkan bobot prioritas & estimasi.", "success");
  }

  // ── CSV Export ───────────────────────────────────────────────────
  const exportSessionCSV = () => {
    if (todaySessions.length === 0) {
      toast("Belum ada data sesi untuk diekspor.", "info");
      return;
    }

    const headers = ["ID", "Waktu", "Sprint", "Judul Tugas", "Durasi (Menit)", "Proyek/Konteks"];
    const rows = todaySessions.map((s) => [
      `"${s.id}"`,
      `"${s.timeRange}"`,
      `"${s.sprintLabel}"`,
      `"${s.taskTitle.replace(/"/g, '""')}"`,
      s.durationMinutes,
      `"${s.project.replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mylife-focus-sessions-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast("CSV riwayat sesi berhasil diunduh.", "success");
  };

  // ── Label Helpers ────────────────────────────────────────────────
  function getParentLabel(task: FocusItem["task"]) {
    if (task.stage?.goal?.title) return task.stage.goal.title;
    if (task.project?.title) return task.project.title;
    if (task.area?.name) return task.area.name;
    return "Mandiri";
  }

  function getParentLabelForBacklog(task: TaskItem) {
    if (task.stage?.goal?.title) return task.stage.goal.title;
    if (task.project?.title) return task.project.title;
    if (task.area?.name) return task.area.name;
    return "Mandiri";
  }

  function formatMinutesDisplay(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // Circular SVG progress math (Radius = 86, Circumference ≈ 540)
  const circleRadius = 86;
  const circumference = 2 * Math.PI * circleRadius;
  const progressRatio = targetDurationSeconds > 0 ? remainingSeconds / targetDurationSeconds : 0;
  const strokeDashoffset = circumference * (1 - progressRatio);

  // Completed metrics
  const completedFocusCount = focusList.filter((f) => f.task.status === "COMPLETED").length;
  const focusRatioPercent = focusList.length > 0 ? Math.round((completedFocusCount / focusList.length) * 100) : 0;

  const totalFocusMinutes = todaySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const totalFocusHoursDisplay = `${Math.floor(totalFocusMinutes / 60)}j ${totalFocusMinutes % 60}m`;

  // History grouped by formatted date
  const historyByDate: Record<string, FocusItem[]> = {};
  initialHistory.forEach((item) => {
    const key = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(item.date));
    if (!historyByDate[key]) historyByDate[key] = [];
    historyByDate[key].push(item);
  });

  return (
    <div className="flex flex-col w-full pb-16 gap-6 selection:bg-[#d0bcff] selection:text-[#340080]">
      {/* ── Top Navigation & Header Region ────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <BackButton fallbackUrl="/today" label="Kembali" />
              <div className="flex items-center gap-2 text-[#d0bcff]">
                <span className="font-mono text-xs uppercase tracking-widest text-[#d0bcff] font-bold">
                  SISTEM EKSEKUSI // MESIN DEEP WORK
                </span>
                <span className="text-[#494454]">•</span>
                <span className="font-mono text-xs text-[#4edea3] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
                  AKTIF
                </span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl text-[#e2e2eb] font-semibold tracking-tight">
              Fokus Harian{" "}
              <span className="text-[#958ea0] font-normal text-lg">
                (Daily Focus &amp; Deep Work Engine)
              </span>
            </h1>
            <p className="text-sm text-[#958ea0] max-w-2xl">
              Pilih 3–5 tugas terpenting hari ini dan jalankan sesi fokus mendalam bebas distraksi berkecepatan tinggi.
            </p>
          </div>

          {/* Quick Mode Presets Switcher */}
          <div className="flex items-center gap-1 bg-[#131825] p-1 rounded-lg border border-white/[0.07] shadow-sm">
            <button
              onClick={() => handleSelectModePreset("pomodoro")}
              className={`px-3 py-1.5 rounded font-mono text-xs font-semibold transition-all flex items-center gap-1.5 ${
                modePreset === "pomodoro"
                  ? "bg-[#340080] text-[#d0bcff] border border-[#d0bcff]/30 shadow-md"
                  : "text-[#958ea0] hover:text-[#e2e2eb] hover:bg-[#1A2133]"
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm0-18a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z" />
              </svg>
              Mode Pomodoro (25/5)
            </button>
            <button
              onClick={() => handleSelectModePreset("flow")}
              className={`px-3 py-1.5 rounded font-mono text-xs font-semibold transition-all flex items-center gap-1.5 ${
                modePreset === "flow"
                  ? "bg-[#340080] text-[#d0bcff] border border-[#d0bcff]/30 shadow-md"
                  : "text-[#958ea0] hover:text-[#e2e2eb] hover:bg-[#1A2133]"
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.267-8-12.362-8-5.096 0-5.096 8 0 8 5.095 0 7.267-8 12.362-8z" />
              </svg>
              Flow Tak Terbatas (90m)
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("today")}
              className={`flex items-center gap-2 pb-2 text-sm font-semibold transition-colors relative ${
                activeTab === "today"
                  ? "text-[#d0bcff] border-b-2 border-[#d0bcff]"
                  : "text-[#958ea0] hover:text-[#e2e2eb]"
              }`}
            >
              <span>Fokus Hari Ini</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[#340080]/40 text-[#d0bcff] border border-[#d0bcff]/30">
                {focusList.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 pb-2 text-sm font-semibold transition-colors ${
                activeTab === "history"
                  ? "text-[#d0bcff] border-b-2 border-[#d0bcff]"
                  : "text-[#958ea0] hover:text-[#e2e2eb]"
              }`}
            >
              <span>Riwayat Sesi Fokus</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#1e1f26] text-[#958ea0]">
                {initialHistory.length} Log
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2 text-[#958ea0] font-mono text-[11px]">
            <span className="px-1.5 py-0.5 rounded bg-[#131825] border border-white/[0.08] text-[#d0bcff]">⌘K</span>
            <span>PALET KONTROL</span>
          </div>
        </div>
      </div>

      {/* ── Tab 1: Fokus Hari Ini Bento Grid ──────────────────────── */}
      {activeTab === "today" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Main Focus Station (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* CARD A: Active Pomodoro Engine Hero Card */}
            <div className="relative overflow-hidden rounded-xl bg-[#131825] border border-white/[0.07] shadow-xl p-6 sm:p-7 flex flex-col gap-6">
              {/* Radial Glow Lighting Behind Timer */}
              <div className="absolute -right-16 -top-16 w-80 h-80 bg-[#F59E0B]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute left-1/4 -bottom-20 w-96 h-96 bg-[#340080]/20 rounded-full blur-3xl pointer-events-none" />

              {/* Hero Top Meta Row */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-bold tracking-wider uppercase ${
                      timerStatus === "running"
                        ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30"
                        : "bg-[#1e1f26] text-[#958ea0] border border-white/[0.06]"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        timerStatus === "running"
                          ? "bg-[#F59E0B] animate-ping"
                          : "bg-[#958ea0]"
                      }`}
                    />
                    {timerStatus === "running"
                      ? `🍅 SESI FOKUS BERJALAN // SPRINT ${String(currentInterval).padStart(2, "0")}`
                      : "🍅 STANDBY // SIAP EKSEKUSI"}
                  </span>
                  {activePomodoroTask && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#282a30] text-[#e2e2eb] font-mono text-xs border border-white/[0.06]">
                      <svg className="w-3.5 h-3.5 text-[#d0bcff]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                      </svg>
                      {getParentLabel(activePomodoroTask)}
                    </span>
                  )}
                </div>

                {/* Brown Noise Ambience Switch */}
                <button
                  type="button"
                  onClick={toggleAudio}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                    isAudioPlaying
                      ? "bg-[#00311f]/60 text-[#4edea3] border-[#4edea3]/40 shadow-sm"
                      : "bg-[#191b22] text-[#958ea0] hover:text-[#e2e2eb] hover:bg-[#282a30] border-white/[0.06]"
                  }`}
                >
                  <svg className="w-4 h-4 text-[#4edea3]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                  <span>{SOUNDSCAPES[soundscapeIdx].label} (65dB)</span>
                  <span className={`w-2 h-2 rounded-full ${isAudioPlaying ? "bg-[#4edea3] animate-pulse" : "bg-[#494454]"}`} />
                </button>
              </div>

              {/* Active Task Header & Description */}
              <div className="relative z-10 flex flex-col gap-1">
                {activePomodoroTask ? (
                  <>
                    <div className="flex items-center gap-2 text-[#958ea0] font-mono text-xs uppercase tracking-wider">
                      <span>TARGET AKTIF UTAMA #{String(focusList.findIndex((f) => f.task.id === activePomodoroTask.id) + 1 || 1).padStart(2, "0")}</span>
                      <span>•</span>
                      <span className="text-[#4edea3] font-bold">
                        EST: {activePomodoroTask.estimatedHours ? `${activePomodoroTask.estimatedHours * 60} MENIT` : `${presetMinutes} MENIT`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <h2 className="text-xl sm:text-2xl text-[#e2e2eb] font-semibold tracking-tight">
                        <Link
                          href={`/tasks/${activePomodoroTask.id}`}
                          className="hover:underline hover:text-[#d0bcff] transition-colors"
                          title="Lihat rincian tugas lengkap"
                        >
                          {activePomodoroTask.title}
                        </Link>
                      </h2>
                      <Link
                        href={`/tasks/${activePomodoroTask.id}`}
                        className="text-xs font-mono text-[#d0bcff] hover:underline flex items-center gap-1 shrink-0 bg-[#282a30] hover:bg-[#343640] px-2.5 py-1 rounded-md border border-white/[0.08] transition-colors"
                      >
                        <span>Rincian Tugas</span>
                        <span>→</span>
                      </Link>
                    </div>
                    <p className="text-sm text-[#958ea0] max-w-xl line-clamp-2">
                      {activePomodoroTask.notes ||
                        `Fokus mendalam untuk menyelesaikan tugas ${activePomodoroTask.title} tanpa distraksi berkecepatan tinggi.`}
                    </p>
                  </>
                ) : (
                  <div className="p-5 rounded-lg bg-[#191b22] border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-3">
                    <div>
                      <p className="text-sm text-[#e2e2eb] font-medium">Belum ada tugas fokus yang dipilih</p>
                      <p className="text-xs text-[#958ea0] mt-1">Pilih salah satu tugas dari antrean prioritas di bawah atau ambil dari backlog untuk mulai fokus.</p>
                    </div>
                    {availableTasks.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          const topTask = availableTasks[0];
                          setActivePomodoroTask(topTask);
                          handleAddBacklogToFocus(topTask.id, topTask.title);
                          toast(`Tugas "${topTask.title}" siap difokuskan. Klik Mulai Sesi untuk mulai!`, "success");
                        }}
                        className="px-4 py-2 rounded-lg bg-[#340080] hover:bg-[#a078ff] text-[#d0bcff] hover:text-[#23005c] font-semibold text-xs transition-all flex items-center gap-2 border border-[#d0bcff]/30 shadow-md"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span>⚡ Pilih Tugas Teratas Backlog: &quot;{availableTasks[0].title}&quot;</span>
                      </button>
                    ) : (
                      <Link
                        href="/today"
                        className="px-4 py-2 rounded-lg bg-[#282a30] hover:bg-[#343640] text-[#d0bcff] font-medium text-xs transition-all flex items-center gap-1.5 border border-white/[0.08]"
                      >
                        <span>+ Tambah Tugas di Halaman Hari Ini</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Center Pomodoro Circular Countdown Display */}
              <div className="relative z-10 flex flex-col items-center justify-center my-2">
                <div className="relative w-56 h-56 flex items-center justify-center">
                  {/* Glowing Ambient Circle */}
                  <div className="absolute inset-0 rounded-full bg-[#F59E0B]/5 blur-xl" />
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                    {/* Track Circle */}
                    <circle cx="100" cy="100" fill="transparent" r={circleRadius} stroke="#1e1f26" strokeWidth="8" />
                    {/* Active Progress Arc */}
                    <circle
                      className="transition-all duration-1000 ease-out"
                      cx="100"
                      cy="100"
                      fill="transparent"
                      r={circleRadius}
                      stroke="#F59E0B"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      strokeWidth="8"
                    />
                  </svg>

                  {/* Digits & Telemetry Inside Ring */}
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-4xl font-bold tracking-tighter text-[#e2e2eb] drop-shadow-md font-mono">
                      {formatMinutesDisplay(remainingSeconds)}
                    </span>
                    <span className="font-mono text-xs text-[#F59E0B] font-semibold uppercase tracking-wider mt-1">
                      TARGET {presetMinutes}:00 // INTERVAL {currentInterval} DARI {targetIntervals}
                    </span>
                    {/* Interval dot indicators */}
                    <div className="flex items-center gap-1.5 mt-2">
                      {Array.from({ length: targetIntervals }).map((_, idx) => {
                        const isDone = idx < currentInterval - 1;
                        const isCurrent = idx === currentInterval - 1;
                        return (
                          <span
                            key={idx}
                            className={`w-2 h-2 rounded-full transition-all ${
                              isDone
                                ? "bg-[#4edea3]"
                                : isCurrent
                                ? timerStatus === "running"
                                  ? "bg-[#F59E0B] animate-pulse scale-110"
                                  : "bg-[#F59E0B]"
                                : "bg-[#33343b]"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Scratchpad Quick Capture */}
              <div className="relative z-10 flex flex-col gap-1.5 bg-[#0c0e14] p-3.5 rounded-lg border border-white/[0.05] shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-[#958ea0] uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-[#d0bcff]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                    </svg>
                    Catatan Kendala Saat Ini (Scratchpad Quick Capture):
                  </span>
                  <span className="font-mono text-[10px] text-[#4edea3]">AUTO-SAVED</span>
                </div>
                <input
                  type="text"
                  value={scratchpadNote}
                  onChange={(e) => saveScratchpad(e.target.value)}
                  placeholder="Tulis interupsi atau kendala cepat di sini agar tidak memecah fokus..."
                  className="w-full bg-transparent font-mono text-xs text-[#e2e2eb] focus:outline-none placeholder-[#494454]"
                />
              </div>

              {/* Focus Controls Toolbar */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Primary Play/Pause button */}
                  <button
                    type="button"
                    onClick={handleToggleTimer}
                    className="px-4 py-2 rounded-lg bg-[#d0bcff] hover:bg-[#b098f0] text-[#23005c] font-mono text-xs font-bold shadow-lg transition-all flex items-center gap-2"
                  >
                    {timerStatus === "running" ? (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                        <span>Jeda</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span>{timerStatus === "paused" ? "Lanjutkan" : "Mulai Sesi"}</span>
                      </>
                    )}
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#23005c]/20 text-[#23005c] ml-1">
                      Spasi
                    </span>
                  </button>

                  {/* Complete Sprint Button */}
                  <button
                    type="button"
                    onClick={handleCompleteSprint}
                    className="px-3.5 py-2 rounded-lg bg-[#282a30] hover:bg-[#00311f]/60 text-[#4edea3] hover:border-[#4edea3]/40 border border-white/[0.06] font-mono text-xs font-semibold transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-[#4edea3]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    <span>Tandai Selesai</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#1e1f26] text-[#4edea3] border border-[#4edea3]/20 ml-1">
                      ⌘↵
                    </span>
                  </button>

                  {/* Extend 5 Min Button */}
                  <button
                    type="button"
                    onClick={handleAddFiveMinutes}
                    className="px-3 py-2 rounded-lg bg-[#1e1f26] hover:bg-[#282a30] text-[#e2e2eb] border border-white/[0.06] font-mono text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5 text-[#d0bcff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    <span>+5 Menit</span>
                  </button>
                </div>

                {/* Reset / Stop Button */}
                <button
                  type="button"
                  onClick={handleStopSession}
                  className="px-2.5 py-2 rounded-lg text-[#958ea0] hover:text-[#F43F5E] hover:bg-[#93000a]/20 border border-transparent hover:border-[#F43F5E]/30 transition-colors flex items-center gap-1.5 font-mono text-xs"
                  title="Hentikan Sesi"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4 13H8V9h8v6z" />
                  </svg>
                  <span className="hidden sm:inline">Hentikan</span>
                </button>
              </div>

              {/* Bottom Banner XP & Streak */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded bg-[#1e1f26]/60 border border-white/[0.05]">
                <div className="flex items-center gap-2.5 font-mono text-xs">
                  <span className="flex items-center gap-1 text-[#F59E0B] font-bold">
                    🔥 Streak: {streakDays} Hari
                  </span>
                  <span className="text-[#494454]">•</span>
                  <span className="text-[#d0bcff] font-medium">⚡ Bonus Konsistensi: +150 XP</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-xs text-[#4edea3]">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 2 16h20a9.97 9.97 0 0 0-1.62-7.43zM10.59 15.41a2 2 0 1 1 2.83-2.83l5.66-5.66-2.83-2.83-5.66 5.66a2 2 0 0 1 0 2.83z" />
                  </svg>
                  <span>Efisiensi Deep Work: 96%</span>
                </div>
              </div>
            </div>

            {/* CARD B: Antrean Prioritas Hari Ini (Today's Focus Queue) */}
            <div className="flex flex-col bg-[#131825] rounded-xl border border-white/[0.07] p-5 sm:p-6 gap-4 shadow-md">
              {/* Queue Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                <div className="flex items-center gap-2.5">
                  <svg className="w-5 h-5 text-[#d0bcff]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 14l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-[#e2e2eb]">
                    Antrean Prioritas Hari Ini
                  </h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[#1e1f26] text-[#958ea0] border border-white/[0.06]">
                    {focusList.length} Tugas Terpilih
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs text-[#4edea3]">
                  <span>
                    {completedFocusCount} dari {focusList.length} Selesai ({focusRatioPercent}%)
                  </span>
                  <div className="w-16 h-1.5 rounded-full bg-[#1e1f26] overflow-hidden">
                    <div
                      className="h-full bg-[#4edea3] rounded-full transition-all duration-500"
                      style={{ width: `${focusRatioPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Priority Items List */}
              {focusList.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 bg-[#191b22]/50 p-8 text-center">
                  <p className="text-sm font-semibold text-[#e2e2eb]">Belum ada tugas di antrean fokus hari ini.</p>
                  <p className="text-xs text-[#958ea0] mt-1">Pilih dari kandidat backlog proyek di bawah untuk memulai.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {focusList.map((item, idx) => {
                    const isDone = item.task.status === "COMPLETED";
                    const isCurrent = activePomodoroTask?.id === item.task.id;
                    const isUpNext = !isDone && !isCurrent && idx === focusList.findIndex((f) => f.task.status !== "COMPLETED" && f.task.id !== activePomodoroTask?.id);

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3.5 rounded-lg transition-all group ${
                          isDone
                            ? "bg-[#0c0e14]/70 border border-white/[0.04] opacity-75 hover:opacity-100"
                            : isCurrent
                            ? "bg-[#1A2133] border border-[#d0bcff]/30 shadow-sm"
                            : "bg-[#191b22] border border-white/[0.06] hover:bg-[#1e1f26]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => handleToggleFocusTaskStatus(item.task.id, item.task.status)}
                            className={`w-5 h-5 rounded flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              isDone
                                ? "bg-[#4edea3] text-[#003824] shadow-xs"
                                : "bg-[#1e1f26] border border-white/20 hover:border-[#4edea3] text-transparent hover:text-[#4edea3]"
                            }`}
                            title={isDone ? "Tandai belum selesai" : "Tandai selesai"}
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          </button>

                          <span
                            className={`font-mono text-xs font-bold px-2 py-1 rounded shrink-0 ${
                              isDone
                                ? "bg-[#4edea3]/10 text-[#4edea3]"
                                : isCurrent
                                ? "bg-[#F59E0B]/20 text-[#F59E0B]"
                                : "bg-[#340080]/30 text-[#d0bcff]"
                            }`}
                          >
                            {String(idx + 1).padStart(2, "0")}
                          </span>

                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={`/tasks/${item.task.id}`}
                                className={`text-sm font-medium truncate hover:underline hover:text-[#d0bcff] transition-colors ${
                                  isDone ? "text-[#958ea0] line-through" : "text-[#e2e2eb]"
                                }`}
                                title="Lihat rincian tugas"
                              >
                                {item.task.title}
                              </Link>

                              {isCurrent && timerStatus === "running" && (
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] font-bold border border-[#F59E0B]/30">
                                  🍅 SEDANG BERJALAN
                                </span>
                              )}
                              {isUpNext && (
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#33343b] text-[#cbc3d7]">
                                  Antrean Berikutnya
                                </span>
                              )}
                              {isDone && (
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#00311f]/50 text-[#4edea3] font-semibold flex items-center gap-1 border border-[#4edea3]/20">
                                  ✓ Selesai
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[#958ea0] font-mono text-xs mt-0.5 flex-wrap">
                              <span className="text-[#d0bcff] flex items-center gap-1">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                                </svg>
                                {getParentLabel(item.task)}
                              </span>
                              <span>•</span>
                              <span>
                                Est: {item.task.estimatedHours ? `${item.task.estimatedHours * 60}m` : "45m"}
                                {item.task.actualHours ? ` / Tercatat: ${Math.round(item.task.actualHours * 60)}m` : ""}
                              </span>
                              <span>•</span>
                              <span
                                className={
                                  item.task.priority === "HIGH" || item.task.priority === "URGENT"
                                    ? "text-[#F43F5E]"
                                    : item.task.priority === "MEDIUM"
                                    ? "text-[#F59E0B]"
                                    : "text-[#958ea0]"
                                }
                              >
                                Prioritas {item.task.priority}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Item Control Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleReorder(item.id, "up")}
                            className="p-1.5 rounded text-[#958ea0] hover:text-[#e2e2eb] hover:bg-[#282a30] transition-all disabled:opacity-20 active:scale-90"
                            title="Naikkan Urutan (Respon Instan)"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 15l-6-6-6 6" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            disabled={idx === focusList.length - 1}
                            onClick={() => handleReorder(item.id, "down")}
                            className="p-1.5 rounded text-[#958ea0] hover:text-[#e2e2eb] hover:bg-[#282a30] transition-all disabled:opacity-20 active:scale-90"
                            title="Turunkan Urutan (Respon Instan)"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>

                          {isCurrent && timerStatus === "running" ? (
                            <span className="p-1.5 rounded text-[#F59E0B] bg-[#F59E0B]/10" title="Sesi Sedang Berjalan">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4z" />
                              </svg>
                            </span>
                          ) : isDone ? (
                            <button
                              type="button"
                              onClick={() => handleToggleFocusTaskStatus(item.task.id, item.task.status)}
                              className="p-1.5 rounded text-[#4edea3] hover:bg-[#4edea3]/10 transition-colors"
                              title="Tugas Selesai (Klik untuk kembalikan ke antrean)"
                            >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setActivePomodoroTask(item.task);
                                toast(`Target fokus dialihkan ke: ${item.task.title}`, "info");
                              }}
                              className="px-2.5 py-1 rounded bg-[#282a30] hover:bg-[#d0bcff] hover:text-[#23005c] text-[#d0bcff] font-mono text-xs font-semibold transition-all flex items-center gap-1 active:scale-95"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                              <span>Mulai Fokus</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Inline Secondary Action Bar */}
              <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-xs font-mono">
                <button
                  type="button"
                  onClick={handleAutoSortByEstimate}
                  className="text-[#958ea0] hover:text-[#e2e2eb] flex items-center gap-1.5 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-[#d0bcff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  <span>Tukar Urutan Otomatis Berdasarkan Estimasi</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearCompleted}
                  className="text-[#d0bcff] hover:underline flex items-center gap-1 transition-colors"
                >
                  <span>Bersihkan Tugas Selesai</span>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* CARD C: Kandidat Tugas dari Backlog Proyek */}
            <div className="flex flex-col bg-[#131825] rounded-xl border border-white/[0.07] p-5 sm:p-6 gap-4 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#4edea3]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-[#e2e2eb]">
                    Kandidat Tugas dari Backlog Proyek
                  </h3>
                </div>
                <span className="font-mono text-xs text-[#958ea0] uppercase">
                  {unselectedTasks.length} TUGAS SIAP DIEKSEKUSI
                </span>
              </div>

              {/* Search Input Filter */}
              <div className="relative w-full flex items-center">
                <svg className="w-4 h-4 absolute left-3 text-[#958ea0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari tugas dari Proyek, Target, atau Bidang Hidup... [Enter]"
                  className="w-full bg-[#0c0e14] text-[#e2e2eb] font-mono text-xs pl-9 pr-16 py-2.5 rounded-lg border border-white/[0.06] placeholder-[#494454] focus:outline-none focus:border-[#d0bcff]/40 shadow-inner"
                />
                <span className="absolute right-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#1e1f26] text-[#958ea0] border border-white/[0.06]">
                  FILTER
                </span>
              </div>

              {/* Backlog Candidate Items List */}
              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                {filteredBacklog.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#958ea0]">
                    {searchQuery
                      ? "Tidak ada tugas yang cocok dengan pencarian."
                      : "Semua tugas aktif sudah dimasukkan ke fokus hari ini."}
                  </div>
                ) : (
                  filteredBacklog.slice(0, 10).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#191b22] border border-white/[0.05] hover:bg-[#1A2133] transition-all"
                    >
                      <div className="flex flex-col min-w-0 pr-3">
                        <span className="text-sm text-[#e2e2eb] font-medium truncate">
                          {task.title}
                        </span>
                        <div className="flex items-center gap-2 text-[#958ea0] font-mono text-xs mt-1 flex-wrap">
                          <span className="text-[#c0c1ff] flex items-center gap-1">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
                            </svg>
                            {getParentLabelForBacklog(task)}
                          </span>
                          <span>•</span>
                          <span>Est: {task.estimatedHours ? `${task.estimatedHours} Jam` : "45m"}</span>
                          <span>•</span>
                          <span
                            className={
                              task.priority === "HIGH" || task.priority === "URGENT"
                                ? "text-[#F43F5E] flex items-center gap-1"
                                : task.priority === "MEDIUM"
                                ? "text-[#F59E0B]"
                                : "text-[#cbc3d7]"
                            }
                          >
                            Prioritas {task.priority}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={loadingTaskId === task.id}
                        onClick={() => handleAddBacklogToFocus(task.id, task.title)}
                        className="shrink-0 px-3 py-1.5 rounded bg-[#1e1f26] hover:bg-[#d0bcff] hover:text-[#23005c] text-[#e2e2eb] font-mono text-xs font-semibold transition-all flex items-center gap-1.5 border border-white/[0.06] disabled:opacity-50"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>{loadingTaskId === task.id ? "..." : "+ Fokus"}</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Focus Vitals & Momentum (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* CARD 1: Statistik Fokus Hari Ini */}
            <div className="flex flex-col bg-[#131825] rounded-xl border border-white/[0.07] p-5 sm:p-6 gap-4 shadow-md">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#958ea0] uppercase tracking-wider flex items-center gap-1.5 font-bold">
                  <svg className="w-4 h-4 text-[#d0bcff]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 3v18h18v-2H5V3H3zm4 14h2v-5H7v5zm4 0h2V7h-2v10zm4 0h2v-8h-2v8zm4 0h2V4h-2v13z" />
                  </svg>
                  Statistik Fokus Hari Ini
                </span>
                <span className="font-mono text-xs text-[#4edea3] font-bold">LIVE</span>
              </div>

              {/* 3 Micro Metric Cards */}
              <div className="grid grid-cols-1 gap-3">
                {/* Metric 1: Total Time */}
                <div className="flex flex-col p-3.5 rounded-lg bg-[#191b22] border border-white/[0.05] gap-1">
                  <div className="flex items-center justify-between text-[#958ea0] font-mono text-xs uppercase">
                    <span>Total Waktu Fokus</span>
                    <span className="text-[#4edea3] font-bold">+28% vs Kemarin</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl text-[#e2e2eb] font-bold tracking-tight font-mono">
                      {totalFocusHoursDisplay}
                    </span>
                    {/* Mini SVG Sparkline Bars */}
                    <div className="flex items-end gap-1 h-7">
                      <div className="w-1.5 h-3 bg-[#33343b] rounded-t" />
                      <div className="w-1.5 h-4 bg-[#33343b] rounded-t" />
                      <div className="w-1.5 h-5 bg-[#d0bcff]/60 rounded-t" />
                      <div className="w-1.5 h-7 bg-[#d0bcff] rounded-t" />
                      <div className="w-1.5 h-6 bg-[#4edea3] rounded-t" />
                    </div>
                  </div>
                </div>

                {/* Metric 2: Pomodoro Sprints */}
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#191b22] border border-white/[0.05]">
                  <div className="flex flex-col">
                    <span className="text-[#958ea0] font-mono text-xs uppercase">Sesi Pomodoro</span>
                    <span className="text-xl text-[#e2e2eb] font-bold font-mono mt-0.5">
                      {todaySessions.length} Sesi
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-xs text-[#F59E0B]">Target: 6 Sesi</span>
                    <div className="flex items-center gap-1 mt-1.5">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <span
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < todaySessions.length ? "bg-[#F59E0B]" : "bg-[#33343b]"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Metric 3: Target Completion Ratio */}
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#191b22] border border-white/[0.05]">
                  <div className="flex flex-col">
                    <span className="text-[#958ea0] font-mono text-xs uppercase">Rasio Tugas Hari Ini</span>
                    <span className="text-xl text-[#e2e2eb] font-bold font-mono mt-0.5">
                      {completedFocusCount} / {focusList.length} Tugas
                    </span>
                  </div>
                  {/* Mini SVG Circular Dial */}
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
                        className="text-[#4edea3]"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeDasharray={`${focusRatioPercent}, 100`}
                        strokeLinecap="round"
                        strokeWidth="3.5"
                      />
                    </svg>
                    <span className="absolute font-mono text-[10px] text-[#4edea3] font-bold">
                      {focusRatioPercent}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: Momentum & Konsistensi */}
            <div className="relative overflow-hidden flex flex-col bg-[#131825] rounded-xl border border-white/[0.07] p-5 sm:p-6 gap-4 shadow-md">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#F59E0B]/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#958ea0] uppercase tracking-wider flex items-center gap-1.5 font-bold">
                  <svg className="w-4 h-4 text-[#F59E0B]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 23c-4.97 0-9-4.03-9-9 0-3.53 2.04-6.58 5-8.03V4c0-.55.45-1 1-1s1 .45 1 1v1.14C11.32 5.05 11.65 5 12 5c.35 0 .68.05 1 .14V4c0-.55.45-1 1-1s1 .45 1 1v1.97c2.96 1.45 5 4.5 5 8.03 0 4.97-4.03 9-9 9z" />
                  </svg>
                  Momentum &amp; Konsistensi
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] font-bold flex items-center gap-1">
                  🔥 {streakDays} Hari
                </span>
              </div>

              {/* Mental State Pill */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#191b22] border border-white/[0.05]">
                <div className="w-8 h-8 rounded-lg bg-[#00311f] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-[#4edea3]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] text-[#958ea0] uppercase">Kondisi Mental Kognitif</span>
                  <span className="text-xs text-[#4edea3] font-medium">Deep Flow Optimal (Alpha Wave)</span>
                </div>
              </div>

              {/* Context Quote Trigger */}
              <div className="p-3.5 rounded-lg bg-[#0c0e14]/80 text-[#cbc3d7] font-mono text-xs flex flex-col gap-1.5 border-l-2 border-[#d0bcff]">
                <span className="font-mono text-[10px] text-[#d0bcff] uppercase font-bold">
                  PRINSIP EKSEKUSI HARI INI
                </span>
                <p className="italic text-[#e2e2eb] leading-relaxed text-[11px]">
                  &quot;Fokus adalah eliminasi distraksi secara radikal. Selesaikan satu blok sebelum beralih konteks mental.&quot;
                </p>
                <span className="text-[10px] text-[#958ea0] self-end">— Cal Newport, Deep Work</span>
              </div>

              {/* Audio Soundscape Preset Widget */}
              <div className="flex items-center justify-between pt-1 font-mono text-xs">
                <span className="text-[#958ea0] flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[#c0c1ff]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                  Soundscape: {SOUNDSCAPES[soundscapeIdx].label}
                </span>
                <button
                  type="button"
                  onClick={cycleSoundscape}
                  className="text-[#d0bcff] hover:underline"
                >
                  Ganti Suara ⚙
                </button>
              </div>
            </div>

            {/* CARD 3: Log Sesi Hari Ini */}
            <div className="flex flex-col bg-[#131825] rounded-xl border border-white/[0.07] p-5 sm:p-6 gap-4 shadow-md">
              <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                <span className="font-mono text-xs text-[#958ea0] uppercase tracking-wider flex items-center gap-1.5 font-bold">
                  <svg className="w-4 h-4 text-[#d0bcff]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                  </svg>
                  Log Sesi Hari Ini
                </span>
                <span className="font-mono text-xs text-[#958ea0]">
                  {todaySessions.length} BLOK
                </span>
              </div>

              {/* Log Feed Items */}
              <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
                {todaySessions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#958ea0]">
                    Belum ada sesi fokus selesai hari ini. Tekan &quot;Mulai Sesi&quot; untuk mencatat blok pertama!
                  </div>
                ) : (
                  todaySessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#191b22] border border-white/[0.05] hover:bg-[#1A2133] transition-colors"
                    >
                      <div className="w-5 h-5 rounded-full bg-[#00311f] flex items-center justify-center text-[#4edea3] shrink-0 mt-0.5">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-[#4edea3] font-bold">
                            {session.timeRange}
                          </span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#1e1f26] text-[#958ea0]">
                            {session.sprintLabel}
                          </span>
                        </div>
                        <span className="text-xs text-[#e2e2eb] font-medium truncate mt-1">
                          {session.taskTitle}
                        </span>
                        <span className="font-mono text-[10px] text-[#958ea0] mt-0.5">
                          {session.durationMinutes} Menit • 100% Selesai
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Export / View all link */}
              <button
                type="button"
                onClick={exportSessionCSV}
                className="pt-1 text-[#d0bcff] hover:text-white font-mono text-xs font-medium flex items-center justify-between group transition-colors"
              >
                <span>Lihat Semua Riwayat Sesi &amp; Log CSV</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Riwayat Sesi Fokus (30-day History) ────────────── */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#e2e2eb]">
                Riwayat Sesi &amp; Fokus Harian (30 Hari Terakhir)
              </h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#1e1f26] text-[#d0bcff]">
                {initialHistory.length} Log Total
              </span>
            </div>
            <button
              type="button"
              onClick={exportSessionCSV}
              className="px-3 py-1.5 rounded bg-[#1e1f26] hover:bg-[#d0bcff] hover:text-[#23005c] text-[#d0bcff] font-mono text-xs font-semibold transition-all flex items-center gap-1.5 border border-white/[0.06]"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Unduh CSV</span>
            </button>
          </div>

          {Object.keys(historyByDate).length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-[#131825] p-12 text-center">
              <p className="text-base font-bold text-[#e2e2eb]">Belum Ada Riwayat Sesi</p>
              <p className="text-xs text-[#958ea0] mt-1">
                Riwayat fokus harian akan tercatat otomatis setiap kamu menetapkan dan menyelesaikan fokus harian.
              </p>
            </div>
          ) : (
            Object.entries(historyByDate).map(([dateLabel, items]) => {
              const completedCount = items.filter((i) => i.task.status === "COMPLETED").length;
              return (
                <div
                  key={dateLabel}
                  className="rounded-xl border border-white/[0.07] bg-[#131825] p-5 shadow-lg space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                    <p className="text-sm font-bold text-[#e2e2eb]">{dateLabel}</p>
                    <span className="font-mono text-xs text-[#4edea3]">
                      {completedCount}/{items.length} selesai
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {items.map((item) => {
                      const isDone = item.task.status === "COMPLETED";
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-[#191b22] border border-white/[0.04]"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                                isDone ? "bg-[#00311f] text-[#4edea3]" : "bg-[#1e1f26] text-[#958ea0]"
                              }`}
                            >
                              {isDone ? "✓" : "○"}
                            </span>
                            <Link
                              href={`/tasks/${item.task.id}`}
                              className={`truncate ${
                                isDone ? "line-through text-[#958ea0]" : "text-[#e2e2eb] hover:text-[#d0bcff]"
                              }`}
                            >
                              {item.task.title}
                            </Link>
                          </div>
                          <span className="text-[#958ea0] font-mono text-[11px] shrink-0 ml-2">
                            {item.task.project?.title || item.task.stage?.goal?.title || item.task.area?.name || "Mandiri"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
