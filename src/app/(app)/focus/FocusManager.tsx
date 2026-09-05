"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/ui/Icon";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { useToast } from "@/app/components/ui/Toast";
import { PomodoroPanel } from "@/app/components/core/PomodoroPanel";

interface FocusItem {
  id: string;
  order: number;
  date: Date | string;
  task: {
    id: string;
    title: string;
    status: string;
    priority: string;
    stage?: { name: string; goal: { title: string } } | null;
    project?: { title: string; goal?: { title: string } | null } | null;
    area?: { name: string; color: string } | null;
  };
}

interface TaskItem {
  id: string;
  title: string;
  priority: string;
  stage?: { name: string; goal: { title: string } } | null;
  project?: { title: string } | null;
  area?: { name: string } | null;
}

interface ActiveSessionProp {
  id: string;
  startedAt: string;
  taskId: string;
  taskTitle: string;
}

interface Props {
  initialFocus: FocusItem[];
  initialHistory: FocusItem[];
  availableTasks: TaskItem[];
  activeSession?: ActiveSessionProp | null;
}

export function FocusManager({
  initialFocus,
  initialHistory,
  availableTasks,
  activeSession,
}: Props) {
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");
  const [focusList, setFocusList] = useState<FocusItem[]>(initialFocus);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [loading, setLoading] = useState(false);
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
    return initialFocus[0]?.task ?? null;
  });

  const { toast } = useToast();
  const router = useRouter();

  const focusedTaskIds = new Set(focusList.map((f) => f.task.id));
  const unselectedTasks = availableTasks.filter((t) => !focusedTaskIds.has(t.id));

  async function handleAddFocus(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTaskId) return;

    setLoading(true);
    try {
      const res = await fetch("/api/daily-focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedTaskId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menambahkan task.");

      setFocusList((prev) => [...prev, data.data]);
      setSelectedTaskId("");
      toast("Task ditambahkan ke fokus hari ini.", "success");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    try {
      const res = await fetch(`/api/daily-focus/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      if (!res.ok) throw new Error();

      // Refresh focus items
      const updatedRes = await fetch("/api/daily-focus");
      const updated = await updatedRes.json();
      if (updated.success) {
        setFocusList(updated.data);
      }
      toast("Urutan fokus diperbarui.", "success");
      router.refresh();
    } catch {
      toast("Gagal mengubah urutan.", "error");
    }
  }

  async function handleRemove(id: string) {
    try {
      const res = await fetch(`/api/daily-focus/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();

      setFocusList((prev) => prev.filter((f) => f.id !== id));
      toast("Dikeluarkan dari fokus harian.", "success");
      router.refresh();
    } catch {
      toast("Gagal menghapus fokus.", "error");
    }
  }

  function getParentLabel(task: FocusItem["task"]) {
    if (task.stage) return `${task.stage.goal.title} › ${task.stage.name}`;
    if (task.project) return `Proyek: ${task.project.title}`;
    if (task.area) return `Area: ${task.area.name}`;
    return "Mandiri";
  }

  // Group history by formatted date
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
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-surface-200 pb-3">
        <button
          onClick={() => setActiveTab("today")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "today"
              ? "bg-primary-600 text-white shadow-xs"
              : "bg-surface-100 text-surface-600 hover:bg-surface-200"
          }`}
        >
          Fokus Hari Ini ({focusList.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "history"
              ? "bg-primary-600 text-white shadow-xs"
              : "bg-surface-100 text-surface-600 hover:bg-surface-200"
          }`}
        >
          Riwayat Fokus Harian
        </button>
      </div>

      {activeTab === "today" && (
        <div className="space-y-6">
          {/* Add Task to Focus */}
          <form
            onSubmit={handleAddFocus}
            className="rounded-2xl border border-surface-200 bg-white p-4 shadow-soft flex flex-wrap items-center gap-3"
          >
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-semibold text-surface-600 mb-1">
                Pilih Task untuk Ditambahkan ke Fokus
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full rounded-xl border border-surface-200 bg-white p-2.5 text-sm"
              >
                <option value="">-- Pilih dari Task Aktif --</option>
                {unselectedTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.priority}] {t.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="self-end">
              <Button type="submit" variant="primary" disabled={loading || !selectedTaskId}>
                {loading ? "Menambahkan…" : "Tambah ke Fokus"}
              </Button>
            </div>
          </form>

          {/* Active Pomodoro Timer Section */}
          {activePomodoroTask && (
            <section className="rounded-2xl border-2 border-warning-300 bg-gradient-to-b from-warning-50/50 via-white to-white p-5 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-warning-500 text-white font-bold text-base shadow-sm">
                    🍅
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-surface-900">
                        Sesi Pomodoro: {activePomodoroTask.title}
                      </h3>
                      <span className="chip bg-warning-100 text-warning-800 font-semibold">
                        Fokus Aktif
                      </span>
                    </div>
                    <p className="text-xs text-surface-500">
                      Jalankan timer fokus 25 menit. Satu task, satu tujuan, tanpa distraksi.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActivePomodoroTask(null)}
                  className="rounded-lg border border-surface-200 bg-white px-2.5 py-1 text-xs font-semibold text-surface-500 hover:text-surface-800 hover:bg-surface-50 transition"
                >
                  Tutup Panel Timer
                </button>
              </div>

              <PomodoroPanel
                key={activePomodoroTask.id}
                taskId={activePomodoroTask.id}
                taskName={activePomodoroTask.title}
                goalName={activePomodoroTask.stage?.goal?.title || activePomodoroTask.project?.goal?.title}
                stageName={activePomodoroTask.stage?.name}
                activeSession={
                  activeSession && activeSession.taskId === activePomodoroTask.id
                    ? { id: activeSession.id, startedAt: activeSession.startedAt }
                    : null
                }
              />
            </section>
          )}

          {/* Current Focus List */}
          {focusList.length === 0 ? (
            <EmptyState
              title="Belum Ada Fokus Hari Ini"
              description="Pilih 3–5 task terpenting untuk memandu energimu hari ini."
            />
          ) : (
            <div className="space-y-3">
              {focusList.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 rounded-2xl border border-surface-200 bg-white p-4 shadow-soft"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/tasks/${item.task.id}`}
                          className="truncate text-sm font-semibold text-surface-900 hover:text-primary-700 transition"
                        >
                          {item.task.title}
                        </Link>
                        <Badge
                          tone={
                            item.task.status === "COMPLETED"
                              ? "success"
                              : item.task.status === "IN_PROGRESS"
                              ? "primary"
                              : "neutral"
                          }
                        >
                          {item.task.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-surface-400 truncate">
                        {getParentLabel(item.task)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActivePomodoroTask(item.task)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                        activePomodoroTask?.id === item.task.id
                          ? "border-warning-400 bg-warning-50 text-warning-800 shadow-xs ring-2 ring-warning-200"
                          : "border-surface-200 bg-white text-surface-700 hover:border-warning-300 hover:bg-warning-50/50"
                      }`}
                      title="Mulai sesi fokus pomodoro untuk task ini"
                    >
                      <span className="text-xs">🍅</span>
                      {activePomodoroTask?.id === item.task.id ? "Sedang Fokus" : "Mulai Fokus"}
                    </button>

                    <div className="flex items-center gap-0.5 border-l border-surface-200 pl-2">
                      <button
                        disabled={idx === 0}
                        onClick={() => handleReorder(item.id, "up")}
                        className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 disabled:opacity-30"
                        title="Pindah Naik"
                      >
                        <Icon name="chevronUp" size={14} />
                      </button>
                      <button
                        disabled={idx === focusList.length - 1}
                        onClick={() => handleReorder(item.id, "down")}
                        className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 disabled:opacity-30"
                        title="Pindah Turun"
                      >
                        <Icon name="chevronDown" size={14} />
                      </button>
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="rounded-lg p-1.5 text-danger-400 hover:bg-danger-50 hover:text-danger-600 transition"
                        title="Hapus dari Fokus"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-6">
          {Object.keys(historyByDate).length === 0 ? (
            <EmptyState
              title="Belum Ada Riwayat"
              description="Riwayat fokus harian akan tercatat seiring kamu menetapkan fokus setiap hari."
            />
          ) : (
            Object.entries(historyByDate).map(([dateLabel, items]) => (
              <div
                key={dateLabel}
                className="rounded-2xl border border-surface-200 bg-white p-5 shadow-soft space-y-3"
              >
                <div className="flex items-center justify-between border-b border-surface-150 pb-2">
                  <p className="text-sm font-bold text-surface-900">{dateLabel}</p>
                  <span className="text-xs text-surface-400">
                    {items.filter((i) => i.task.status === "COMPLETED").length}/{items.length} selesai
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs py-1"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon
                          name={item.task.status === "COMPLETED" ? "check" : "target"}
                          size={14}
                          className={item.task.status === "COMPLETED" ? "text-success-600" : "text-surface-400"}
                        />
                        <span className={`truncate ${item.task.status === "COMPLETED" ? "line-through text-surface-400" : "text-surface-700"}`}>
                          {item.task.title}
                        </span>
                      </div>
                      <span className="text-surface-400 shrink-0">
                        {item.task.project?.title || item.task.stage?.goal.title || item.task.area?.name || "Task"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
