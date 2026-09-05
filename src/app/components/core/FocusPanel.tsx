"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "../ui/Icon";
import { useToast } from "../ui/Toast";

type Task = { id: string; title: string; name?: string; priority: string; status: string; stage?: { name: string; goal: { title: string; name?: string } } | null; [key: string]: unknown };
type Focus = { id: string; taskId: string; task: Task; [key: string]: unknown };

export function FocusPanel({ focus, available }: { focus: Focus[]; available: Task[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState("");

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

  async function add() {
    if (!selected) return;
    try {
      await request("/api/today/focus", "POST", { taskId: selected });
      setSelected("");
      toast("Ditambahkan ke fokus hari ini.", "success");
    } catch {
      toast("Gagal menambahkan task itu.", "error");
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

      <div className="mt-5 flex flex-col gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          aria-label="Tambahkan task ke fokus hari ini"
          className="w-full rounded-xl border border-surface-200 bg-surface-0 px-3 py-2.5 text-sm text-surface-800 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        >
          <option value="">Tambahkan task ke fokus…</option>
          {available
            .filter((task) => !focus.some((item) => item.taskId === task.id))
            .map((task) => (
              <option key={task.id} value={task.id}>
                {task.title} · {task.stage?.goal.title}
              </option>
            ))}
        </select>
        <button
          onClick={add}
          disabled={!selected}
          className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-40"
        >
          <Icon name="plus" size={16} /> Tambah ke fokus
        </button>
      </div>
    </section>
  );
}