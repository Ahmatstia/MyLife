"use client";

export interface StoredFocusSession {
  sessionId: string;
  taskId: string;
  taskTitle?: string;
  startedAt: string; // ISO string
  targetSeconds: number;
  remainingSeconds: number;
  isPaused: boolean;
  pausedAt: number | null; // Timestamp ms
  lastTickAt: number; // Timestamp ms
  modePreset: "pomodoro" | "flow";
}

const STORAGE_KEY = "mylife_active_focus_session";
const EVENT_NAME = "mylife_focus_session_sync";

export function getActiveFocusState(sessionId?: string | null): StoredFocusSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: StoredFocusSession = JSON.parse(raw);
    if (sessionId && parsed.sessionId !== sessionId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveActiveFocusState(state: StoredFocusSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: state }));
  } catch {
    // Ignore storage quota/private browsing errors
  }
}

export function createActiveFocusSession(data: {
  sessionId: string;
  taskId: string;
  taskTitle?: string;
  startedAt?: string;
  targetSeconds: number;
  remainingSeconds: number;
  modePreset: "pomodoro" | "flow";
}): StoredFocusSession {
  const now = Date.now();
  const session: StoredFocusSession = {
    sessionId: data.sessionId,
    taskId: data.taskId,
    taskTitle: data.taskTitle,
    startedAt: data.startedAt || new Date(now).toISOString(),
    targetSeconds: data.targetSeconds,
    remainingSeconds: data.remainingSeconds,
    isPaused: false,
    pausedAt: null,
    lastTickAt: now,
    modePreset: data.modePreset,
  };
  saveActiveFocusState(session);
  return session;
}

export function updateFocusSessionPause(
  sessionId: string,
  isPaused: boolean,
  remainingSeconds: number
): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getActiveFocusState(sessionId);
    const now = Date.now();
    if (existing) {
      const updated: StoredFocusSession = {
        ...existing,
        isPaused,
        pausedAt: isPaused ? now : null,
        remainingSeconds,
        lastTickAt: now,
      };
      saveActiveFocusState(updated);
    }
  } catch {
    // Ignore
  }
}

export function updateFocusSessionTick(
  sessionId: string,
  remainingSeconds: number
): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getActiveFocusState(sessionId);
    if (existing && !existing.isPaused) {
      const updated: StoredFocusSession = {
        ...existing,
        remainingSeconds,
        lastTickAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {
    // Ignore
  }
}

export function clearActiveFocusState(sessionId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionId) {
      const existing = getActiveFocusState();
      if (existing && existing.sessionId !== sessionId) {
        return;
      }
    }
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: null }));
  } catch {
    // Ignore
  }
}

export function computeCurrentTimer(state: StoredFocusSession): {
  remainingSeconds: number;
  isPaused: boolean;
} {
  if (state.isPaused) {
    return {
      remainingSeconds: Math.max(0, state.remainingSeconds),
      isPaused: true,
    };
  }

  const now = Date.now();
  const elapsedSinceLastTick = Math.max(0, Math.floor((now - state.lastTickAt) / 1000));
  const remaining = Math.max(0, state.remainingSeconds - elapsedSinceLastTick);
  return {
    remainingSeconds: remaining,
    isPaused: false,
  };
}

export function subscribeFocusSession(
  callback: (state: StoredFocusSession | null) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const handleCustom = (e: Event) => {
    const customEvent = e as CustomEvent<StoredFocusSession | null>;
    callback(customEvent.detail ?? null);
  };
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      if (!e.newValue) {
        callback(null);
      } else {
        try {
          callback(JSON.parse(e.newValue));
        } catch {
          callback(null);
        }
      }
    }
  };
  window.addEventListener(EVENT_NAME, handleCustom);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, handleCustom);
    window.removeEventListener("storage", handleStorage);
  };
}
