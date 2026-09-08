"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/ui/Icon";
import { useToast } from "@/app/components/ui/Toast";

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
}

export function AreaDetailClient({ tasks: initialTasks }: { tasks: TaskItem[] }) {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const { toast } = useToast();
  const router = useRouter();

  async function toggleComplete(taskId: string, currentStatus: string) {
    try {
      const nextStatus = currentStatus === "COMPLETED" ? "TODO" : "COMPLETED";
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error();

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
      );
      toast(nextStatus === "COMPLETED" ? "Tugas selesai! 🎉" : "Tugas dibuka kembali.", "success");
      router.refresh();
    } catch {
      toast("Gagal memperbarui status tugas.", "error");
    }
  }

  return (
    <section className="flex flex-col gap-4 mt-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="h-4 w-1.5 rounded-full bg-emerald-500" />
            Tugas Terkini ({tasks.length})
          </h2>
          <p className="text-xs text-surface-400 mt-0.5">
            Eksekusi tugas operasional harian yang terkait dengan pilar ini.
          </p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#131825]/90 p-8 text-center">
          <p className="text-sm font-semibold text-white">Belum ada tugas di pilar ini.</p>
          <p className="text-xs text-surface-400 mt-1">Buat tugas baru melalui Goal atau Proyek terkait.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-[#131825]/90 p-4 shadow-xl backdrop-blur-md">
          <div className="divide-y divide-white/[0.06]">
            {tasks.map((task) => {
              const isDone = task.status === "COMPLETED";

              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-3 py-3 px-2 rounded-xl hover:bg-[#1A2133] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleComplete(task.id, task.status)}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                        isDone
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                          : "border-white/20 bg-white/5 text-transparent hover:border-emerald-500 hover:text-emerald-400"
                      }`}
                    >
                      <Icon name="check" size={12} strokeWidth={3} />
                    </button>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/tasks/${task.id}`}
                        className={`block truncate text-sm font-medium transition ${
                          isDone
                            ? "line-through text-surface-500"
                            : "text-white hover:text-violet-300"
                        }`}
                      >
                        {task.title}
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 font-mono text-[11px]">
                    {task.dueDate && (
                      <span className="text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        📅 {new Date(task.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    <span
                      className={`font-semibold px-2 py-0.5 rounded border ${
                        task.priority === "HIGH" || task.priority === "URGENT"
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                          : "border-white/10 bg-white/5 text-surface-400"
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
