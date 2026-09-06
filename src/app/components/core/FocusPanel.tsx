"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "../ui/Icon";
import { useToast } from "../ui/Toast";

type Task = {
  id: string;
  title: string;
  name?: string;
  priority: string;
  status: string;
  dueDate?: string | Date | null;
  stage?: { name: string; goal: { title: string; name?: string } } | null;
  project?: { title: string } | null;
  area?: { name: string } | null;
  [key: string]: unknown;
};
type Focus = { id: string; taskId: string; task: Task; [key: string]: unknown };

export function FocusPanel({ focus, available }: { focus: Focus[]; available: Task[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

  function getParentLabel(task: Task) {
    if (task.stage?.goal?.title) return `🎯 ${task.stage.goal.title}`;
    if (task.project?.title) return `📁 ${task.project.title}`;
    if (task.area?.name) return `📍 ${task.area.name}`;
    return "Mandiri";
  }

  async function request(url: string, method: string, body?: object) {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message ?? "Gagal memperbarui fokus.");
    router.refresh();
  }

  async function add(taskId: string, taskTitle?: string) {
    if (!taskId || loadingTaskId) return;
    setLoadingTaskId(taskId);
    try {
      await request("/api/today/focus", "POST", { taskId });
      toast(`"${taskTitle || "Task"}" ditambahkan ke fokus hari ini.`, "success");
      setSearchQuery("");
    } catch {
      toast("Gagal menambahkan task itu ke fokus.", "error");
    } finally {
      setLoadingTaskId(null);
    }
  }

  async function change(id: string, direction: "up" | "down") {
    try {
      await request(`/api/today/focus/${id}`, "PATCH", { direction });
    } catch {
      toast("Gagal mengubah urutan.", "error");
    }
  }

  async function remove(id: string) {
    try {
      await request(`/api/today/focus/${id}`, "DELETE");
      toast("Dihapus dari fokus.", "info");
    } catch {
      toast("Gagal menghapus.", "error");
    }
  }

  async function toggleComplete(taskId: string, currentStatus: string) {
    try {
      const nextStatus = currentStatus === "COMPLETED" ? "TODO" : "COMPLETED";
      await request(`/api/tasks/${taskId}`, "PATCH", { status: nextStatus });
      toast(nextStatus === "COMPLETED" ? "Tugas selesai! 🎉" : "Tugas dibuka kembali.", "success");
    } catch {
      toast("Gagal mengubah status tugas.", "error");
    }
  }

  return (
    <section>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-surface-400">Fokus hari ini</p>
          <h2 className="mt-1 text-xl font-bold text-surface-900">Yang penting sekarang</h2>
          <p className="mt-1 text-sm text-surface-500">Urutkan task yang harus diselesaikan hari ini.</p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-100 px-3 py-1 text-xs font-medium text-surface-600">
          {focus.length} task
        </span>
      </div>

      <div className="mt-5">
        {focus.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-300 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-surface-700">Belum ada fokus hari ini.</p>
            <p className="mt-1 text-xs text-surface-500">Tambahkan task di bawah — yang penting saja.</p>
          </div>
        ) : (
          <ol className="divide-y divide-surface-150">
            {focus.map((item, index) => {
              const isDone = item.task.status === "COMPLETED";
              return (
                <li key={item.id} className="flex items-center gap-3 py-3.5">
                  <button
                    onClick={() => toggleComplete(item.task.id, item.task.status)}
                    aria-label={isDone ? "Buka kembali" : "Tandai selesai"}
                    title={isDone ? "Buka kembali tugas" : "Tandai selesai"}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                      isDone
                        ? "border-success-500 bg-success-500 text-white shadow-xs"
                        : "border-surface-300 bg-white text-transparent hover:border-success-500 hover:text-success-600 hover:bg-success-50"
                    }`}
                  >
                    <Icon name="check" size={12} strokeWidth={3} />
                  </button>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[11px] font-bold text-primary-600">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/tasks/${item.task.id}`}
                      className={`block truncate text-sm font-semibold transition ${
                        isDone
                          ? "line-through text-surface-400"
                          : "text-surface-800 hover:text-primary-700"
                      }`}
                    >
                      {item.task.title}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-surface-500">
                      {item.task.stage?.goal.title} · {item.task.stage?.name} · {item.task.priority}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    onClick={() => change(item.id, "up")}
                    disabled={index === 0}
                    aria-label="Naik"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 disabled:opacity-25"
                  >
                    <Icon name="chevronUp" size={16} />
                  </button>
                  <button
                    onClick={() => change(item.id, "down")}
                    disabled={index === focus.length - 1}
                    aria-label="Turun"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 disabled:opacity-25"
                  >
                    <Icon name="chevronDown" size={16} />
                  </button>
                  <button
                    onClick={() => remove(item.id)}
                    aria-label={`Hapus ${item.task.title}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 hover:bg-danger-50 hover:text-danger-600"
                  >
                    <Icon name="x" size={16} />
                  </button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Searchable Task Picker for Focus */}
      <div className="mt-5 rounded-2xl border border-surface-200 bg-surface-50/60 p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold text-surface-800 flex items-center gap-1.5">
            <Icon name="search" size={14} className="text-primary-600" />
            Cari & Tambah Task ke Fokus
          </span>
          <span className="text-[11px] text-surface-400">
            {available.filter((t) => !focus.some((f) => f.taskId === t.id)).length} task tersedia
          </span>
        </div>

        <div className="relative mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ketik untuk mencari task (mis. Tugas kuliah, Desain, Proposal)..."
            className="w-full rounded-xl border border-surface-200 bg-white px-3.5 py-2 text-xs text-surface-900 placeholder:text-surface-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2 text-xs text-surface-400 hover:text-surface-700"
            >
              ✕
            </button>
          )}
        </div>

        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
          {available
            .filter((task) => !focus.some((item) => item.taskId === task.id))
            .filter((task) => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              const matchTitle = (task.title || task.name || "").toLowerCase().includes(q);
              const matchSource = getParentLabel(task).toLowerCase().includes(q);
              return matchTitle || matchSource;
            })
            .slice(0, 20)
            .map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-surface-150 bg-white px-3 py-2 text-xs shadow-xs hover:border-primary-300 transition"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-surface-900 truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-surface-500">
                    <span className="truncate max-w-[140px] text-surface-600 font-medium">
                      {getParentLabel(task)}
                    </span>
                    {task.dueDate && (
                      <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                        📅 {new Date(task.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    <span className={`font-semibold ${task.priority === "URGENT" || task.priority === "HIGH" ? "text-rose-600" : "text-surface-400"}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={loadingTaskId === task.id}
                  onClick={() => add(task.id, task.title)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-600 hover:text-white transition disabled:opacity-50"
                >
                  <Icon name="plus" size={12} />
                  {loadingTaskId === task.id ? "..." : "+ Fokus"}
                </button>
              </div>
            ))}

          {available.filter((task) => !focus.some((item) => item.taskId === task.id)).length === 0 && (
            <p className="text-center py-4 text-xs text-surface-400">
              Semua task aktif sudah dimasukkan ke fokus hari ini.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}