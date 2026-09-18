"use client";

import { useState, useRef, useEffect, useCallback, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/components/ui/Toast";
import { BackButton } from "@/app/components/ui/BackButton";
import {
  getActiveFocusState,
  createActiveFocusSession,
  updateFocusSessionPause,
  updateFocusSessionTick,
  clearActiveFocusState,
  computeCurrentTimer,
  subscribeFocusSession,
} from "@/lib/focus-session-sync";

const emptySubscribe = () => () => {};

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
  { id: "obsidian", label: "Obsidian Brown", type: "brown", desc: "Suara derau cokelat dalam untuk fokus mendalam" },
  { id: "rain", label: "Rain Ambience", type: "pink", desc: "Frekuensi pink noise lembut seperti gemercik hujan" },
  { id: "cosmic", label: "Cosmic Stream", type: "white", desc: "Aliran white noise halus penghalau distraksi sekitar" },
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

  // Client mount status to eliminate SSR/hydration mismatches
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Sync state from shared focus storage
  const syncState = useMemo(() => {
    if (!activeSession) return null;
    return getActiveFocusState(activeSession.id);
  }, [activeSession]);

  // Navigation & Mode
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");
  const [modePreset, setModePreset] = useState<"pomodoro" | "flow">(() => {
    if (syncState?.modePreset) return syncState.modePreset;
    return "pomodoro";
  });
  const presetMinutes = modePreset === "pomodoro" ? 25 : 90;

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
    const firstPending = initialFocus.find((f) => f.task.status !== "COMPLETED")?.task;
    if (firstPending) return firstPending;
    if (initialFocus[0]?.task) return initialFocus[0].task;
    if (availableTasks.length > 0) return availableTasks[0];
    return null;
  });

  // Pomodoro Timer States
  const [timerStatus, setTimerStatus] = useState<"idle" | "running" | "paused">(() => {
    if (!activeSession) return "idle";
    if (syncState) {
      return syncState.isPaused ? "paused" : "running";
    }
    return "running";
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => activeSession?.id ?? null);
  const [currentInterval, setCurrentInterval] = useState(1);
  const targetIntervals = modePreset === "pomodoro" ? 4 : 2;

  const [targetDurationSeconds, setTargetDurationSeconds] = useState(() => {
    if (syncState?.targetSeconds) return syncState.targetSeconds;
    return (modePreset === "pomodoro" ? 25 : 90) * 60;
  });

  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    if (!activeSession) return (modePreset === "pomodoro" ? 25 : 90) * 60;
    if (syncState) {
      if (syncState.isPaused) return Math.max(0, syncState.remainingSeconds);
      return computeCurrentTimer(syncState).remainingSeconds;
    }
    return (modePreset === "pomodoro" ? 25 : 90) * 60;
  });

  // Real-time Scratchpad Quick Capture (initialized lazily from localStorage)
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

  // Direct handler for mode preset switch
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
    toast(`Soundscape: ${SOUNDSCAPES[nextIdx].label}`, "info");
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
          if (currentSessionId) {
            updateFocusSessionPause(currentSessionId, true, 0);
          }
          toast("Sesi fokus selesai! Waktunya istirahat sejenak ☕", "success");
          return 0;
        }
        const next = prev - 1;
        if (currentSessionId) {
          updateFocusSessionTick(currentSessionId, next);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerStatus, playBell, targetIntervals, toast, currentSessionId]);

  // ── Multi-tab & cross-page synchronization ───────────────────────
  useEffect(() => {
    const unsubscribe = subscribeFocusSession((state) => {
      if (!state) {
        if (currentSessionId) {
          setCurrentSessionId(null);
          setTimerStatus("idle");
          const resetSec = (modePreset === "pomodoro" ? 25 : 90) * 60;
          setRemainingSeconds(resetSec);
          setTargetDurationSeconds(resetSec);
        }
        return;
      }
      if (state.sessionId === currentSessionId || (!currentSessionId && activeSession?.id === state.sessionId)) {
        if (state.sessionId !== currentSessionId) {
          setCurrentSessionId(state.sessionId);
        }
        setTimerStatus(state.isPaused ? "paused" : "running");
        if (state.isPaused) {
          setRemainingSeconds(Math.max(0, state.remainingSeconds));
        } else {
          setRemainingSeconds(computeCurrentTimer(state).remainingSeconds);
        }
        if (state.targetSeconds) {
          setTargetDurationSeconds(state.targetSeconds);
        }
        if (state.modePreset) {
          setModePreset(state.modePreset);
        }
      }
    });
    return unsubscribe;
  }, [currentSessionId, activeSession, modePreset]);

  // ── Session API Actions ───────────────────────────────────────────
  const handleToggleTimer = async () => {
    if (timerStatus === "running") {
      setTimerStatus("paused");
      if (currentSessionId) {
        updateFocusSessionPause(currentSessionId, true, remainingSeconds);
      }
      toast("Sesi dijeda.", "info");
      return;
    }

    if (timerStatus === "paused") {
      setTimerStatus("running");
      if (currentSessionId) {
        updateFocusSessionPause(currentSessionId, false, remainingSeconds);
      }
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
      toast("Belum ada tugas yang tersedia untuk difokuskan. Pilih atau buat tugas terlebih dahulu.", "error");
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
        createActiveFocusSession({
          sessionId: json.data.id,
          taskId: taskToRun.id,
          taskTitle: taskToRun.title,
          startedAt: json.data.startedAt,
          targetSeconds: targetDurationSeconds,
          remainingSeconds: targetDurationSeconds,
          modePreset,
        });
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
        id: currentSessionId || `local-${startTime.getTime()}`,
        taskId: activePomodoroTask.id,
        taskTitle: activePomodoroTask.title,
        startedAt: startTime.toISOString(),
        endedAt: now.toISOString(),
        timeRange: timeRangeStr,
        durationMinutes: durationDoneMinutes,
        project: getParentLabel(activePomodoroTask),
        sprintLabel: `Sprint #${String(todaySessions.length + 1).padStart(2, "0")}`,
      };

      setTodaySessions((prev) => [newLogItem, ...prev]);

      // Reset timer
      if (currentSessionId) {
        clearActiveFocusState(currentSessionId);
      }
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
      toast("Sprint & Tugas selesai! +150 XP tercatat 🎉", "success");
      router.refresh();
    } catch {
      toast("Gagal menyelesaikan sprint.", "error");
    }
  };

  const handleAddFiveMinutes = () => {
    setRemainingSeconds((prev) => prev + 300);
    setTargetDurationSeconds((prev) => prev + 300);
    if (currentSessionId) {
      updateFocusSessionTick(currentSessionId, remainingSeconds + 300);
    }
    toast("+5 Menit ditambahkan ke timer.", "info");
  };

  // Cancel session without recording (discards active session if user misclicked)
  const handleCancelSession = async () => {
    if (timerStatus === "idle") return;

    if (!currentSessionId) {
      setTimerStatus("idle");
      const resetSec = (modePreset === "pomodoro" ? 25 : 90) * 60;
      setRemainingSeconds(resetSec);
      setTargetDurationSeconds(resetSec);
      clearActiveFocusState();
      toast("Sesi fokus dibatalkan.", "info");
      return;
    }

    try {
      const res = await fetch(`/api/sessions/${currentSessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      clearActiveFocusState(currentSessionId);
      setCurrentSessionId(null);
      setTimerStatus("idle");
      const resetSec = (modePreset === "pomodoro" ? 25 : 90) * 60;
      setRemainingSeconds(resetSec);
      setTargetDurationSeconds(resetSec);
      toast("Sesi fokus berhasil dibatalkan tanpa dicatat ke riwayat.", "info");
      router.refresh();
    } catch {
      toast("Gagal membatalkan sesi.", "error");
    }
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
        clearActiveFocusState(currentSessionId);
      } catch {
        // Ignore
      }
    }

    setTimerStatus("idle");
    setCurrentSessionId(null);
    setRemainingSeconds((modePreset === "pomodoro" ? 25 : 90) * 60);
    setTargetDurationSeconds((modePreset === "pomodoro" ? 25 : 90) * 60);
    toast("Sesi fokus dihentikan dan waktu tercatat.", "info");
    router.refresh();
  };

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
      setFocusList(prevList);
      toast("Gagal mengubah urutan tugas.", "error");
    }
  }

  // Instant 0ms Optimistic Task Status Toggle
  async function handleToggleFocusTaskStatus(taskId: string, currentStatus: string) {
    const nextStatus = currentStatus === "COMPLETED" ? "IN_PROGRESS" : "COMPLETED";

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
      toast("Tugas selesai! +50 XP tercatat 🎉", "success");
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
    toast("Antrean ditata berdasarkan prioritas & estimasi waktu.", "success");
  }

  // ── CSV Export ───────────────────────────────────────────────────
  const exportSessionCSV = () => {
    if (todaySessions.length === 0) {
      toast("Belum ada data sesi untuk diekspor.", "info");
      return;
    }

    const headers = ["ID", "Waktu", "Sprint", "Judul Tugas", "Durasi (Menit)", "Konteks/Proyek"];
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

  // SSR hydration-safe display variables:
  // On the first render pass (SSR & initial hydration), use deterministic initial values that match SSR.
  // Immediately post-mount, isMounted flips to true and renders the live timer/progress.
  const displayRemaining = isMounted ? remainingSeconds : (modePreset === "pomodoro" ? 25 : 90) * 60;
  const displayTimerStatus = isMounted ? timerStatus : (activeSession ? "running" : "idle");
  const displayModePreset = isMounted ? modePreset : "pomodoro";
  const displayInterval = isMounted ? currentInterval : 1;
  const displayScratchpad = isMounted ? scratchpadNote : "";

  // Circular SVG progress math (Radius = 90, Circumference ≈ 565.48)
  const circleRadius = 90;
  const circumference = 2 * Math.PI * circleRadius;
  const progressRatio = targetDurationSeconds > 0 ? remainingSeconds / targetDurationSeconds : 0;
  const strokeDashoffset = circumference * (1 - progressRatio);
  const displayDashoffset = isMounted ? strokeDashoffset : 0;

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
    <div className="flex flex-col w-full pb-20 gap-8 selection:bg-purple-500/20 selection:text-purple-300">
      {/* ── Top Navigation & Header Region ────────────────────────── */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <BackButton fallbackUrl="/today" label="Kembali" />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span>Mode Fokus Mendalam</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Fokus Harian
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Pilih 3–5 prioritas utama hari ini dan eksekusi dalam sesi kerja mendalam bebas distraksi.
            </p>
          </div>

          {/* Quick Mode Switcher */}
          <div className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-900/90 border border-white/[0.08] backdrop-blur-md shadow-xl self-start md:self-auto">
            <button
              type="button"
              onClick={() => handleSelectModePreset("pomodoro")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                displayModePreset === "pomodoro"
                  ? "bg-purple-600/30 text-purple-200 border border-purple-400/40 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Pomodoro (25m)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectModePreset("flow")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                displayModePreset === "flow"
                  ? "bg-purple-600/30 text-purple-200 border border-purple-400/40 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Flow State (90m)</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-6 border-b border-white/[0.08] pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("today")}
            className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
              activeTab === "today"
                ? "text-purple-300 border-b-2 border-purple-400"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Fokus Hari Ini</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 font-medium">
              {focusList.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
              activeTab === "history"
                ? "text-purple-300 border-b-2 border-purple-400"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Riwayat Sesi Fokus</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium">
              {initialHistory.length} Sesi
            </span>
          </button>
        </div>
      </div>

      {/* ── Tab 1: Fokus Hari Ini Bento Grid ──────────────────────── */}
      {activeTab === "today" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Main Focus Station (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* CARD A: Active Pomodoro Engine Hero Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-white/[0.08] shadow-2xl p-6 sm:p-8 flex flex-col gap-6 backdrop-blur-xl">
              {/* Dynamic Radial Ambient Glows */}
              <div
                className={`absolute -right-16 -top-16 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
                  displayTimerStatus === "running"
                    ? "bg-amber-500/15"
                    : displayTimerStatus === "paused"
                    ? "bg-blue-500/15"
                    : "bg-purple-600/15"
                }`}
              />
              <div className="absolute left-1/4 -bottom-24 w-96 h-96 bg-purple-900/15 rounded-full blur-3xl pointer-events-none" />

              {/* Top Meta Bar */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    suppressHydrationWarning
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                      displayTimerStatus === "running"
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        : displayTimerStatus === "paused"
                        ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                        : "bg-zinc-800/80 text-zinc-300 border border-white/[0.06]"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        displayTimerStatus === "running"
                          ? "bg-amber-400 animate-ping"
                          : displayTimerStatus === "paused"
                          ? "bg-blue-400"
                          : "bg-zinc-500"
                      }`}
                    />
                    {displayTimerStatus === "running"
                      ? `Sesi Berjalan • Interval ${displayInterval} dari ${targetIntervals}`
                      : displayTimerStatus === "paused"
                      ? "Sesi Dijeda"
                      : "Standby • Siap Fokus"}
                  </span>

                  {activePomodoroTask && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/60 text-zinc-300 text-xs border border-white/[0.06]">
                      <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                      </svg>
                      <span>{getParentLabel(activePomodoroTask)}</span>
                    </span>
                  )}
                </div>

                {/* Soundscape Control Pill */}
                <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={toggleAudio}
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      isAudioPlaying
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-end gap-0.5 h-3 w-3">
                      <span className={`w-0.5 rounded-full bg-emerald-400 transition-all ${isAudioPlaying ? "h-2.5 animate-pulse" : "h-1"}`} />
                      <span className={`w-0.5 rounded-full bg-emerald-400 transition-all ${isAudioPlaying ? "h-3 animate-pulse delay-75" : "h-2"}`} />
                      <span className={`w-0.5 rounded-full bg-emerald-400 transition-all ${isAudioPlaying ? "h-2 animate-pulse delay-150" : "h-1"}`} />
                    </div>
                    <span>{SOUNDSCAPES[soundscapeIdx].label}</span>
                  </button>
                  <button
                    type="button"
                    onClick={cycleSoundscape}
                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
                    title="Ganti Suara Latar"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Active Task Hero Block */}
              <div className="relative z-10 flex flex-col gap-2">
                {activePomodoroTask ? (
                  <>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
                      <span>Target Prioritas #{String(focusList.findIndex((f) => f.task.id === activePomodoroTask.id) + 1 || 1).padStart(2, "0")}</span>
                      <span>•</span>
                      <span className="text-purple-300 font-semibold">
                        Estimasi {activePomodoroTask.estimatedHours ? `${activePomodoroTask.estimatedHours * 60} Menit` : `${presetMinutes} Menit`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        <Link
                          href={`/tasks/${activePomodoroTask.id}`}
                          className="hover:underline hover:text-purple-300 transition-colors"
                          title="Lihat rincian tugas"
                        >
                          {activePomodoroTask.title}
                        </Link>
                      </h2>
                      <Link
                        href={`/tasks/${activePomodoroTask.id}`}
                        className="text-xs text-purple-300 hover:text-purple-200 flex items-center gap-1 shrink-0 bg-zinc-800/80 hover:bg-zinc-700/80 px-3 py-1.5 rounded-lg border border-white/[0.06] transition-colors font-medium"
                      >
                        <span>Rincian Tugas</span>
                        <span>→</span>
                      </Link>
                    </div>
                    <p className="text-sm text-zinc-400 max-w-xl leading-relaxed line-clamp-2">
                      {activePomodoroTask.notes ||
                        `Fokus mendalam untuk menyelesaikan tugas ${activePomodoroTask.title} tanpa distraksi berkecepatan tinggi.`}
                    </p>
                  </>
                ) : (
                  <div className="p-6 rounded-2xl bg-zinc-800/40 border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-3">
                    <div>
                      <p className="text-sm text-zinc-200 font-semibold">Belum ada tugas fokus yang dipilih</p>
                      <p className="text-xs text-zinc-400 mt-1">Pilih salah satu tugas dari antrean prioritas di bawah untuk mulai sesi kerja mendalam.</p>
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
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span>Pilih Tugas: &quot;{availableTasks[0].title}&quot;</span>
                      </button>
                    ) : (
                      <Link
                        href="/today"
                        className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-purple-300 font-medium text-xs transition-all flex items-center gap-1.5 border border-white/[0.08]"
                      >
                        <span>Tambah Tugas di Halaman Hari Ini</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Center Circular Countdown Gauge */}
              <div className="relative z-10 flex flex-col items-center justify-center my-2">
                <div className="relative w-64 h-64 flex items-center justify-center">
                  {/* Subtle pulsing ambient halo */}
                  <div
                    className={`absolute inset-0 rounded-full blur-2xl transition-all duration-700 ${
                      displayTimerStatus === "running"
                        ? "bg-amber-500/10 scale-105"
                        : "bg-purple-600/10"
                    }`}
                  />
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 220 220">
                    <defs>
                      <linearGradient id="focusTimerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#A855F7" />
                        <stop offset="100%" stopColor="#8B5CF6" />
                      </linearGradient>
                      <linearGradient id="focusTimerRunning" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#F97316" />
                      </linearGradient>
                    </defs>

                    {/* Background Track Circle */}
                    <circle
                      cx="110"
                      cy="110"
                      fill="transparent"
                      r={circleRadius}
                      stroke="#1c2130"
                      strokeWidth="9"
                    />

                    {/* Progress Arc */}
                    <circle
                      suppressHydrationWarning
                      className="transition-all duration-1000 ease-out"
                      cx="110"
                      cy="110"
                      fill="transparent"
                      r={circleRadius}
                      stroke={displayTimerStatus === "running" ? "url(#focusTimerRunning)" : "url(#focusTimerGradient)"}
                      strokeDasharray={circumference}
                      strokeDashoffset={displayDashoffset}
                      strokeLinecap="round"
                      strokeWidth="9"
                    />
                  </svg>

                  {/* Digits & Interval Inside Ring */}
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span
                      suppressHydrationWarning
                      className="text-5xl font-extrabold tracking-tight text-white font-mono drop-shadow-md"
                    >
                      {formatMinutesDisplay(displayRemaining)}
                    </span>
                    <span suppressHydrationWarning className="text-xs font-semibold text-zinc-400 mt-1.5">
                      {displayModePreset === "pomodoro"
                        ? `Sprint ${displayInterval} dari ${targetIntervals}`
                        : "Flow State Mendalam"}
                    </span>

                    {/* Interval Dot Indicators */}
                    <div suppressHydrationWarning className="flex items-center gap-1.5 mt-3">
                      {Array.from({ length: targetIntervals }).map((_, idx) => {
                        const isDone = idx < displayInterval - 1;
                        const isCurrent = idx === displayInterval - 1;
                        return (
                          <span
                            key={idx}
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isDone
                                ? "w-4 bg-emerald-400"
                                : isCurrent
                                ? displayTimerStatus === "running"
                                  ? "w-5 bg-amber-400 animate-pulse shadow-sm shadow-amber-400/50"
                                  : "w-4 bg-amber-400"
                                : "w-2 bg-zinc-700"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Scratchpad Quick Capture */}
              <div className="relative z-10 flex flex-col gap-2 bg-zinc-950/60 p-4 rounded-2xl border border-white/[0.06] shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-medium flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                    </svg>
                    <span>Catatan Cepat &amp; Interupsi</span>
                  </span>
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Tersimpan Otomatis
                  </span>
                </div>
                <input
                  suppressHydrationWarning
                  type="text"
                  value={displayScratchpad}
                  onChange={(e) => saveScratchpad(e.target.value)}
                  placeholder="Ketik pikiran sekilas atau interupsi cepat di sini agar tidak memecah fokus..."
                  className="w-full bg-transparent text-sm text-zinc-200 focus:outline-none placeholder-zinc-500 font-normal"
                />
              </div>

              {/* Focus Controls Toolbar */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Primary Play / Pause Button */}
                  <button
                    suppressHydrationWarning
                    type="button"
                    onClick={handleToggleTimer}
                    className={`px-5 py-2.5 rounded-xl font-semibold text-xs shadow-lg transition-all flex items-center gap-2 active:scale-95 ${
                      displayTimerStatus === "running"
                        ? "bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20"
                        : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30"
                    }`}
                  >
                    {displayTimerStatus === "running" ? (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                        <span>Jeda Sesi</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span>{displayTimerStatus === "paused" ? "Lanjutkan Sesi" : "Mulai Sesi Fokus"}</span>
                      </>
                    )}
                  </button>

                  {/* Complete Sprint Button */}
                  <button
                    type="button"
                    onClick={handleCompleteSprint}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all flex items-center gap-2 active:scale-95"
                  >
                    <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Tandai Selesai (+150 XP)</span>
                  </button>

                  {/* +5 Minutes Button */}
                  <button
                    type="button"
                    onClick={handleAddFiveMinutes}
                    className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] text-xs font-medium transition-all flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    <span>+5 Menit</span>
                  </button>
                </div>

                {/* Stop / Cancel Action Group */}
                {displayTimerStatus !== "idle" && (
                  <div className="flex items-center gap-2">
                    {/* Batalkan Sesi (Tanpa Simpan) */}
                    <button
                      type="button"
                      onClick={handleCancelSession}
                      className="px-3.5 py-2.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95"
                      title="Batalkan sesi ini tanpa mencatat ke riwayat (berguna jika salah pencet)"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      <span>Batalkan Sesi</span>
                    </button>

                    {/* Hentikan & Simpan */}
                    <button
                      type="button"
                      onClick={handleStopSession}
                      className="px-3 py-2.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 border border-white/[0.08] text-xs font-medium transition-colors flex items-center gap-1.5"
                      title="Hentikan sesi lebih awal dan simpan menit yang sudah berjalan"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 6h12v12H6z" />
                      </svg>
                      <span className="hidden sm:inline">Hentikan &amp; Simpan</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Momentum Strip */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-zinc-950/40 border border-white/[0.05]">
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                    🔥 Streak: {streakDays} Hari
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-purple-300 font-medium">⚡ Bonus: +150 XP per Sesi</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 2 16h20a9.97 9.97 0 0 0-1.62-7.43zM10.59 15.41a2 2 0 1 1 2.83-2.83l5.66-5.66-2.83-2.83-5.66 5.66a2 2 0 0 1 0 2.83z" />
                  </svg>
                  <span>Fokus Terjaga: 96%</span>
                </div>
              </div>
            </div>

            {/* CARD B: Antrean Prioritas Hari Ini (Today's Focus Queue) */}
            <div className="flex flex-col bg-zinc-900/70 rounded-3xl border border-white/[0.08] p-6 sm:p-7 gap-5 shadow-xl backdrop-blur-sm">
              {/* Queue Header */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 14l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Antrean Prioritas Hari Ini
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {focusList.length} tugas terpilih untuk hari ini
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-emerald-400 font-medium">
                  <span>
                    {completedFocusCount} dari {focusList.length} Selesai ({focusRatioPercent}%)
                  </span>
                  <div className="w-20 h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${focusRatioPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Secondary Action Bar */}
              <div className="flex items-center justify-between pt-1 border-b border-white/[0.06] pb-3 text-xs">
                <button
                  type="button"
                  onClick={handleAutoSortByEstimate}
                  className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors font-medium"
                >
                  <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  <span>Urutkan Otomatis (Prioritas &amp; Estimasi)</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearCompleted}
                  className="text-purple-300 hover:text-purple-200 hover:underline flex items-center gap-1 transition-colors font-medium"
                >
                  <span>Bersihkan Tugas Selesai</span>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              </div>

              {/* Priority Items List */}
              {focusList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-950/40 p-10 text-center flex flex-col items-center justify-center gap-2">
                  <p className="text-sm font-semibold text-zinc-200">Belum ada tugas di antrean fokus hari ini.</p>
                  <p className="text-xs text-zinc-400">Pilih dari kandidat backlog proyek di bawah untuk memulai.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {focusList.map((item, idx) => {
                    const isDone = item.task.status === "COMPLETED";
                    const isCurrent = activePomodoroTask?.id === item.task.id;

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                          isDone
                            ? "bg-zinc-950/50 border border-white/[0.04] opacity-75 hover:opacity-100"
                            : isCurrent
                            ? "bg-purple-950/20 border border-purple-500/30 shadow-sm"
                            : "bg-zinc-800/40 border border-white/[0.06] hover:bg-zinc-800/70"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={() => handleToggleFocusTaskStatus(item.task.id, item.task.status)}
                            className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              isDone
                                ? "bg-emerald-400 text-zinc-950"
                                : "bg-zinc-800 border border-white/20 hover:border-emerald-400 text-transparent hover:text-emerald-400"
                            }`}
                            title={isDone ? "Tandai belum selesai" : "Tandai selesai"}
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          </button>

                          {/* Index Badge */}
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                              isDone
                                ? "bg-emerald-500/10 text-emerald-400"
                                : isCurrent
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-purple-500/20 text-purple-300"
                            }`}
                          >
                            {String(idx + 1).padStart(2, "0")}
                          </span>

                          {/* Task Content */}
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={`/tasks/${item.task.id}`}
                                className={`text-sm font-semibold truncate hover:underline hover:text-purple-300 transition-colors ${
                                  isDone ? "text-zinc-500 line-through" : "text-white"
                                }`}
                                title="Lihat rincian tugas"
                              >
                                {item.task.title}
                              </Link>

                              {isCurrent && displayTimerStatus === "running" && (
                                <span
                                  suppressHydrationWarning
                                  className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-medium border border-amber-500/30 flex items-center gap-1"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                  Sedang Berjalan
                                </span>
                              )}
                              {isDone && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium flex items-center gap-1 border border-emerald-500/20">
                                  ✓ Selesai
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1 flex-wrap">
                              <span className="text-purple-300 flex items-center gap-1">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                                </svg>
                                <span>{getParentLabel(item.task)}</span>
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
                                    ? "text-rose-400 font-medium"
                                    : item.task.priority === "MEDIUM"
                                    ? "text-amber-400"
                                    : "text-zinc-400"
                                }
                              >
                                Prioritas {item.task.priority}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Item Reorder & Action Controls */}
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleReorder(item.id, "up")}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700/60 transition-all disabled:opacity-20 active:scale-95"
                            title="Naikkan Urutan"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 15l-6-6-6 6" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            disabled={idx === focusList.length - 1}
                            onClick={() => handleReorder(item.id, "down")}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700/60 transition-all disabled:opacity-20 active:scale-95"
                            title="Turunkan Urutan"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>

                          {isCurrent && timerStatus === "running" ? (
                            <span className="p-1.5 rounded-lg text-amber-400 bg-amber-500/10" title="Sesi Sedang Berjalan">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4z" />
                              </svg>
                            </span>
                          ) : isDone ? (
                            <button
                              type="button"
                              onClick={() => handleToggleFocusTaskStatus(item.task.id, item.task.status)}
                              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
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
                                toast(`Target fokus dialihkan ke: "${item.task.title}"`, "info");
                              }}
                              className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 border border-purple-500/30 active:scale-95"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                              <span>Fokuskan</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CARD C: Kandidat Tugas dari Backlog Proyek */}
            <div className="flex flex-col bg-zinc-900/70 rounded-3xl border border-white/[0.08] p-6 sm:p-7 gap-5 shadow-xl backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Kandidat Tugas dari Backlog Proyek
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Pilih tugas untuk ditambahkan ke fokus harian
                    </p>
                  </div>
                </div>
                <span className="text-xs text-zinc-400 font-medium">
                  {unselectedTasks.length} Tugas Siap
                </span>
              </div>

              {/* Search Input Filter */}
              <div className="relative w-full flex items-center">
                <svg className="w-4 h-4 absolute left-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari tugas dari Proyek, Target, atau Bidang Hidup..."
                  className="w-full bg-zinc-950/60 text-zinc-200 text-xs pl-10 pr-10 py-3 rounded-xl border border-white/[0.08] placeholder-zinc-500 focus:outline-none focus:border-purple-400/50 shadow-inner"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 text-zinc-500 hover:text-zinc-300 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Backlog Candidate Items List */}
              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                {filteredBacklog.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-400">
                    {searchQuery
                      ? "Tidak ada tugas yang cocok dengan pencarian."
                      : "Semua tugas aktif sudah dimasukkan ke antrean fokus hari ini."}
                  </div>
                ) : (
                  filteredBacklog.slice(0, 10).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-800/40 border border-white/[0.05] hover:bg-zinc-800/70 transition-all"
                    >
                      <div className="flex flex-col min-w-0 pr-3">
                        <span className="text-sm text-zinc-200 font-semibold truncate">
                          {task.title}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1 flex-wrap">
                          <span className="text-purple-300 flex items-center gap-1">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
                            </svg>
                            <span>{getParentLabelForBacklog(task)}</span>
                          </span>
                          <span>•</span>
                          <span>Est: {task.estimatedHours ? `${task.estimatedHours} Jam` : "45m"}</span>
                          <span>•</span>
                          <span
                            className={
                              task.priority === "HIGH" || task.priority === "URGENT"
                                ? "text-rose-400 font-medium"
                                : task.priority === "MEDIUM"
                                ? "text-amber-400"
                                : "text-zinc-400"
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
                        className="shrink-0 px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-purple-600 text-purple-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 border border-white/[0.08] disabled:opacity-50 active:scale-95"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>{loadingTaskId === task.id ? "..." : "Fokus"}</span>
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
            <div className="flex flex-col bg-zinc-900/70 rounded-3xl border border-white/[0.08] p-6 gap-5 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 3v18h18v-2H5V3H3zm4 14h2v-5H7v5zm4 0h2V7h-2v10zm4 0h2v-8h-2v8zm4 0h2V4h-2v13z" />
                  </svg>
                  <span>Statistik Fokus Hari Ini</span>
                </span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>

              {/* 3 Metric Bento Boxes */}
              <div className="grid grid-cols-1 gap-3">
                {/* Metric 1: Total Time */}
                <div className="flex flex-col p-4 rounded-2xl bg-zinc-950/50 border border-white/[0.05] gap-1">
                  <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                    <span>Total Waktu Fokus</span>
                    <span className="text-emerald-400 font-semibold">+28% vs Kemarin</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl text-white font-bold tracking-tight font-mono">
                      {totalFocusHoursDisplay}
                    </span>
                    {/* Mini Sparkline Bars */}
                    <div className="flex items-end gap-1 h-7">
                      <div className="w-1.5 h-3 bg-zinc-700 rounded-t" />
                      <div className="w-1.5 h-4 bg-zinc-700 rounded-t" />
                      <div className="w-1.5 h-5 bg-purple-500/60 rounded-t" />
                      <div className="w-1.5 h-7 bg-purple-400 rounded-t" />
                      <div className="w-1.5 h-6 bg-emerald-400 rounded-t" />
                    </div>
                  </div>
                </div>

                {/* Metric 2: Pomodoro Sprints */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950/50 border border-white/[0.05]">
                  <div className="flex flex-col">
                    <span className="text-zinc-400 text-xs font-medium">Sesi Pomodoro Selesai</span>
                    <span className="text-xl text-white font-bold font-mono mt-0.5">
                      {todaySessions.length} Sesi
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-amber-400 font-medium">Target: 6 Sesi</span>
                    <div className="flex items-center gap-1 mt-1.5">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <span
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < todaySessions.length ? "bg-amber-400" : "bg-zinc-700"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Metric 3: Target Completion Ratio */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950/50 border border-white/[0.05]">
                  <div className="flex flex-col">
                    <span className="text-zinc-400 text-xs font-medium">Rasio Tugas Hari Ini</span>
                    <span className="text-xl text-white font-bold font-mono mt-0.5">
                      {completedFocusCount} / {focusList.length} Tugas
                    </span>
                  </div>
                  {/* Mini Circular Dial */}
                  <div className="relative w-11 h-11 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-zinc-800"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                      />
                      <path
                        className="text-emerald-400"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeDasharray={`${focusRatioPercent}, 100`}
                        strokeLinecap="round"
                        strokeWidth="3.5"
                      />
                    </svg>
                    <span className="absolute font-mono text-[10px] text-emerald-400 font-bold">
                      {focusRatioPercent}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: Momentum & Mindset */}
            <div className="relative overflow-hidden flex flex-col bg-zinc-900/70 rounded-3xl border border-white/[0.08] p-6 gap-5 shadow-xl backdrop-blur-sm">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 23c-4.97 0-9-4.03-9-9 0-3.53 2.04-6.58 5-8.03V4c0-.55.45-1 1-1s1 .45 1 1v1.14C11.32 5.05 11.65 5 12 5c.35 0 .68.05 1 .14V4c0-.55.45-1 1-1s1 .45 1 1v1.97c2.96 1.45 5 4.5 5 8.03 0 4.97-4.03 9-9 9z" />
                  </svg>
                  <span>Momentum &amp; Konsistensi</span>
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center gap-1">
                  🔥 {streakDays} Hari
                </span>
              </div>

              {/* Mental Flow State Pill */}
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-zinc-950/50 border border-white/[0.05]">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-400 font-semibold uppercase">Kondisi Kognitif</span>
                  <span className="text-xs text-emerald-400 font-semibold">Alpha Flow Optimal (Bebas Distraksi)</span>
                </div>
              </div>

              {/* Deep Work Principle Quote */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 text-zinc-300 text-xs flex flex-col gap-2 border-l-2 border-purple-400">
                <span className="text-[11px] text-purple-300 font-bold uppercase tracking-wider">
                  Prinsip Eksekusi Hari Ini
                </span>
                <p className="italic text-zinc-200 leading-relaxed text-xs">
                  &quot;Fokus adalah eliminasi distraksi secara radikal. Selesaikan satu blok sebelum beralih konteks mental.&quot;
                </p>
                <span className="text-[11px] text-zinc-400 self-end">— Cal Newport, Deep Work</span>
              </div>

              {/* Soundscape Quick Switcher */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                  <span>{SOUNDSCAPES[soundscapeIdx].label}</span>
                </span>
                <button
                  type="button"
                  onClick={cycleSoundscape}
                  className="text-purple-300 hover:text-purple-200 hover:underline font-medium"
                >
                  Ganti Suara ⚙
                </button>
              </div>
            </div>

            {/* CARD 3: Log Sesi Hari Ini */}
            <div className="flex flex-col bg-zinc-900/70 rounded-3xl border border-white/[0.08] p-6 gap-5 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                  </svg>
                  <span>Log Sesi Hari Ini</span>
                </span>
                <span className="text-xs text-zinc-400 font-semibold">
                  {todaySessions.length} Blok
                </span>
              </div>

              {/* Sprints List */}
              <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
                {todaySessions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-400">
                    Belum ada sesi fokus selesai hari ini. Tekan &quot;Mulai Sesi Fokus&quot; untuk mencatat blok pertamamu!
                  </div>
                ) : (
                  todaySessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-950/50 border border-white/[0.05] hover:bg-zinc-800/60 transition-colors"
                    >
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-emerald-400 font-bold font-mono">
                            {session.timeRange}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium">
                            {session.sprintLabel}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-200 font-semibold truncate mt-1">
                          {session.taskTitle}
                        </span>
                        <span className="text-[11px] text-zinc-400 mt-0.5">
                          {session.durationMinutes} Menit • 100% Selesai
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Export Button */}
              <button
                type="button"
                onClick={exportSessionCSV}
                className="pt-2 text-purple-300 hover:text-purple-200 text-xs font-semibold flex items-center justify-between group transition-colors"
              >
                <span>Unduh Riwayat Sesi (CSV)</span>
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
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white">
                Riwayat Sesi &amp; Fokus Harian (30 Hari Terakhir)
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold">
                {initialHistory.length} Log Total
              </span>
            </div>
            <button
              type="button"
              onClick={exportSessionCSV}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-purple-600 text-purple-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-2 border border-white/[0.08]"
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
            <div className="rounded-3xl border border-dashed border-white/10 bg-zinc-900/50 p-16 text-center flex flex-col items-center justify-center gap-2">
              <p className="text-base font-bold text-white">Belum Ada Riwayat Sesi</p>
              <p className="text-xs text-zinc-400 max-w-md">
                Riwayat fokus harian akan tercatat otomatis setiap kamu menetapkan dan menyelesaikan fokus harian.
              </p>
            </div>
          ) : (
            Object.entries(historyByDate).map(([dateLabel, items]) => {
              const completedCount = items.filter((i) => i.task.status === "COMPLETED").length;
              return (
                <div
                  key={dateLabel}
                  className="rounded-3xl border border-white/[0.08] bg-zinc-900/70 p-6 shadow-xl space-y-4 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <p className="text-sm font-bold text-white">{dateLabel}</p>
                    <span className="text-xs text-emerald-400 font-semibold">
                      {completedCount}/{items.length} selesai
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const isDone = item.task.status === "COMPLETED";
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs py-3 px-4 rounded-2xl bg-zinc-950/40 border border-white/[0.04]"
                        >
                          <div className="flex items-center gap-3 truncate">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                                isDone ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                              }`}
                            >
                              {isDone ? "✓" : "○"}
                            </span>
                            <Link
                              href={`/tasks/${item.task.id}`}
                              className={`font-medium truncate ${
                                isDone ? "line-through text-zinc-500" : "text-zinc-200 hover:text-purple-300"
                              }`}
                            >
                              {item.task.title}
                            </Link>
                          </div>
                          <span className="text-zinc-400 text-xs shrink-0 ml-3">
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
