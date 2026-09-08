"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "../ui/Toast";

interface QueueTask {
  id: string;
  taskId: string;
  title: string;
  status: "COMPLETED" | "IN_PROGRESS" | "TODO";
  priority: string;
  parentTitle: string;
  estimatedHours: number;
  actualHours: number;
  dueDateLabel?: string;
  isDueTomorrow?: boolean;
}

interface QueueProps {
  tasks: QueueTask[];
  completedCount: number;
  totalCount: number;
  progressPct: number;
}

export function TodayFocusQueue({
  tasks: initialTasks,
  progressPct: initialProgressPct,
}: QueueProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<QueueTask[]>(initialTasks);
  const [newTitle, setNewTitle] = useState("");
  const [selectedParent, setSelectedParent] = useState("📁 Skripsi");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const totalCount = tasks.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : initialProgressPct;

  async function toggleTask(task: QueueTask) {
    const isNowDone = task.status !== "COMPLETED";
    setLoadingId(task.id);

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, status: isNowDone ? "COMPLETED" : "TODO" }
          : t
      )
    );

    try {
      await fetch(`/api/tasks/${task.taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isNowDone ? "COMPLETED" : "TODO" }),
      });
      toast(isNowDone ? `Task "${task.title}" diselesaikan! ✓` : "Status dikembalikan ke To Do", "success");
    } catch {
      // Revert if failed
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
      toast("Gagal mengubah status task.", "error");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const addedTitle = newTitle.trim();
    setNewTitle("");

    const newTask: QueueTask = {
      id: `temp-${Date.now()}`,
      taskId: `task-${Date.now()}`,
      title: addedTitle,
      status: "TODO",
      priority: "HIGH",
      parentTitle: selectedParent,
      estimatedHours: 1.5,
      actualHours: 0,
      dueDateLabel: "Hari Ini",
    };

    setTasks((prev) => [...prev, newTask]);
    toast(`"${addedTitle}" ditambahkan ke fokus hari ini!`, "success");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: addedTitle, priority: "HIGH" }),
      });
      if (res.ok) {
        const json = await res.json();
        const createdTask = json.data;
        if (createdTask?.id) {
          await fetch("/api/daily-focus", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId: createdTask.id, date: new Date().toISOString() }),
          });
          setTasks((prev) =>
            prev.map((t) => (t.id === newTask.id ? { ...t, id: createdTask.id, taskId: createdTask.id } : t))
          );
        }
      }
    } catch {
      // handled
    }
  }

  return (
    <div className="rounded-xl bg-[#131825] p-4 sm:p-5 border border-white/[0.07] shadow-md flex flex-col gap-4">
      {/* Header & Progress Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-base text-[#d0bcff]">☑</span>
          <h3 className="font-['Hanken_Grotesk',sans-serif] text-base sm:text-lg text-[#e2e2eb] font-bold">
            Antrean Fokus Hari Ini
          </h3>
          <span className="px-2 py-0.5 rounded bg-[#282a30] text-[#cbc3d7] font-mono text-[10px] font-medium border border-white/[0.05]">
            {completedCount} dari {totalCount} selesai
          </span>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 w-36">
          <div className="w-full h-2 rounded-full bg-[#0c0e14] overflow-hidden border border-white/[0.05]">
            <div
              className="h-full bg-[#4edea3] rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            ></div>
          </div>
          <span className="font-mono text-xs text-[#4edea3] font-bold">{progressPct}%</span>
        </div>
      </div>

      {/* Task Queue Rows */}
      <div className="flex flex-col gap-1.5 max-h-[360px] overflow-y-auto pr-0.5" id="task-list">
        {tasks.length === 0 && (
          <div className="py-8 px-4 rounded-lg bg-[#0c0e14]/40 border border-dashed border-white/[0.07] text-center flex flex-col items-center justify-center gap-1.5">
            <span className="text-2xl opacity-60">🎯</span>
            <p className="text-xs font-mono text-[#cbc3d7]">Belum ada tugas fokus untuk hari ini.</p>
            <p className="text-[11px] font-mono text-[#958ea0]">Ketik judul tugas di bawah dan tekan Enter untuk menambahkan ke antrean.</p>
          </div>
        )}
        {tasks.map((t) => {
          if (t.status === "COMPLETED") {
            return (
              <div
                key={t.id}
                className="group flex items-center justify-between p-2 rounded-lg bg-[#0c0e14]/50 hover:bg-[#1A2133] transition-colors border border-white/[0.03]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => toggleTask(t)}
                    disabled={loadingId === t.id}
                    className="w-5 h-5 rounded bg-[#4edea3] text-[#002113] flex items-center justify-center shrink-0 cursor-pointer font-bold text-xs"
                    type="button"
                  >
                    ✓
                  </button>
                  <div className="flex flex-col truncate">
                    <span className="font-mono text-xs text-[#958ea0] line-through truncate">
                      {t.title}
                    </span>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-[#958ea0]">
                      <span>{t.parentTitle}</span>
                      <span>•</span>
                      <span>{t.actualHours}j / {t.estimatedHours}j Tercatat</span>
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#282a30] text-[#4edea3] font-mono text-[10px] font-semibold shrink-0">
                  Selesai
                </span>
              </div>
            );
          }

          if (t.status === "IN_PROGRESS") {
            return (
              <div
                key={t.id}
                className="group flex items-center justify-between p-2.5 rounded-lg bg-[#a078ff]/15 hover:bg-[#a078ff]/20 transition-colors border border-[#d0bcff]/30 shadow-[0_0_15px_-4px_rgba(160,120,255,0.2)]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-5 h-5 rounded bg-[#282a30] text-[#d0bcff] flex items-center justify-center shrink-0">
                    <span className="w-2 h-2 rounded-full bg-[#d0bcff] animate-ping"></span>
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="font-mono text-xs text-[#e2e2eb] font-bold truncate">
                      {t.title}
                    </span>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-[#d0bcff]">
                      <span>{t.parentTitle}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">🍅 Sedang Berjalan</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded bg-[#d0bcff]/20 text-[#d0bcff] font-mono text-[10px] font-bold uppercase tracking-wider">
                    Aktif
                  </span>
                </div>
              </div>
            );
          }

          // TODO
          return (
            <div
              key={t.id}
              className="group flex items-center justify-between p-2 rounded-lg bg-[#0c0e14] hover:bg-[#1A2133] transition-colors border border-white/[0.04]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => toggleTask(t)}
                  disabled={loadingId === t.id}
                  className="w-5 h-5 rounded bg-[#282a30] hover:bg-[#d0bcff] hover:text-[#3c0091] text-transparent flex items-center justify-center shrink-0 cursor-pointer transition-colors border border-white/[0.1] text-xs font-bold"
                  type="button"
                >
                  ✓
                </button>
                <div className="flex flex-col truncate">
                  <span className="font-mono text-xs text-[#e2e2eb] truncate">{t.title}</span>
                  <div className="flex items-center gap-2 font-mono text-[10px] text-[#958ea0]">
                    <span>{t.parentTitle}</span>
                    {t.isDueTomorrow && (
                      <>
                        <span>•</span>
                        <span className="text-[#F43F5E] font-medium">⚠️ Jatuh Tempo Besok</span>
                      </>
                    )}
                    <span>•</span>
                    <span>Est: {t.estimatedHours} Jam</span>
                  </div>
                </div>
              </div>
              <Link
                href="/focus"
                className="px-2 py-1 rounded bg-[#282a30] hover:bg-[#1A2133] text-[#958ea0] hover:text-[#e2e2eb] font-mono text-[11px] transition-colors shrink-0 border border-white/[0.05]"
              >
                Fokus 🍅
              </Link>
            </div>
          );
        })}
      </div>

      {/* Inline Quick Add Input */}
      <form onSubmit={handleQuickAdd} className="flex items-center gap-2 pt-1">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#958ea0] text-sm font-bold">
            +
          </span>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Tambah tugas cepat ke antrean hari ini... [Enter]"
            className="w-full h-10 pl-9 pr-14 rounded-lg bg-[#0c0e14] text-[#e2e2eb] placeholder:text-[#958ea0] font-mono text-xs border border-white/[0.07] focus:outline-none focus:border-[#d0bcff]/50 focus:bg-[#191b22] transition-all"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-[#33343b] text-[#958ea0] font-mono text-[10px]">
              ↵
            </kbd>
          </div>
        </div>

        <select
          value={selectedParent}
          onChange={(e) => setSelectedParent(e.target.value)}
          className="h-10 px-3 rounded-lg bg-[#0c0e14] text-[#cbc3d7] font-mono text-xs border border-white/[0.07] focus:outline-none focus:border-[#d0bcff]/50"
        >
          <option value="📁 Skripsi">📁 Skripsi</option>
          <option value="📁 Akademik">📁 Akademik</option>
          <option value="📁 Dev SaaS">📁 Dev SaaS</option>
          <option value="🎯 Skills">🎯 Skills</option>
        </select>
      </form>
    </div>
  );
}
