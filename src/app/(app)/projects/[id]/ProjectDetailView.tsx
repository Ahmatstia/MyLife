"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/ui/Icon";
import { useToast } from "@/app/components/ui/Toast";

type TaskItem = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | Date | null;
  milestone?: { id: string; title: string } | null;
  milestoneId?: string | null;
};

type MilestoneItem = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  order: number;
  dueDate?: string | Date | null;
  tasks?: Array<{ id: string; title: string; status: string }>;
  _count?: { tasks: number };
};

type ProjectDetail = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  startDate?: string | Date | null;
  targetDate?: string | Date | null;
  goal?: { id: string; title: string } | null;
  area?: { id: string; name: string; color: string } | null;
  milestones: MilestoneItem[];
  tasks?: TaskItem[];
};

export function ProjectDetailView({ project }: { project: ProjectDetail }) {
  const router = useRouter();
  const { toast } = useToast();

  // Milestone State
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDesc, setMilestoneDesc] = useState("");
  const [milestoneDue, setMilestoneDue] = useState("");
  const [loadingMilestone, setLoadingMilestone] = useState(false);

  // Task State
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskMilestoneId, setTaskMilestoneId] = useState("");
  const [loadingTask, setLoadingTask] = useState(false);

  async function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!milestoneTitle.trim()) return;
    setLoadingMilestone(true);
    try {
      const res = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title: milestoneTitle.trim(),
          description: milestoneDesc.trim() || null,
          dueDate: milestoneDue ? new Date(milestoneDue).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal membuat milestone");
      toast("Milestone berhasil ditambahkan", "success");
      setMilestoneTitle("");
      setMilestoneDesc("");
      setMilestoneDue("");
      setIsAddingMilestone(false);
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal membuat milestone", "error");
    } finally {
      setLoadingMilestone(false);
    }
  }

  async function handleToggleMilestone(m: MilestoneItem) {
    const nextStatus = m.status === "COMPLETED" ? "PENDING" : "COMPLETED";
    try {
      const res = await fetch(`/api/milestones/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal memperbarui status");
      toast(nextStatus === "COMPLETED" ? "Milestone diselesaikan!" : "Milestone dibuka kembali", "info");
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal memperbarui status", "error");
    }
  }

  async function handleDeleteMilestone(m: MilestoneItem) {
    if (!confirm(`Hapus milestone "${m.title}"? Tasks terkait akan tetap tersimpan.`)) return;
    try {
      const res = await fetch(`/api/milestones/${m.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menghapus milestone");
      toast("Milestone dihapus", "success");
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal menghapus milestone", "error");
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setLoadingTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title: taskTitle.trim(),
          priority: taskPriority,
          milestoneId: taskMilestoneId || null,
          dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : null,
          scheduledDate: taskDueDate ? new Date(taskDueDate).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal membuat task");
      toast("Task berhasil ditambahkan ke project", "success");
      setTaskTitle("");
      setTaskMilestoneId("");
      setTaskDueDate("");
      setIsAddingTask(false);
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal membuat task", "error");
    } finally {
      setLoadingTask(false);
    }
  }

  async function handleToggleTask(taskId: string, currentStatus: string) {
    const nextStatus = currentStatus === "COMPLETED" ? "TODO" : "COMPLETED";
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal memperbarui status task");
      toast(nextStatus === "COMPLETED" ? "Task selesai! Bagus." : "Task dibuka kembali.", "info");
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal memperbarui task", "error");
    }
  }

  const tasks = project.tasks || [];
  const completedTasksCount = tasks.filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-xs text-surface-500">
        <Link href="/projects" className="hover:text-primary-600 transition-colors">
          ← Kembali ke Projects
        </Link>
      </div>

      {/* Project Header Card */}
      <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-subtle space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-surface-100 px-2 py-0.5 text-[10px] font-bold text-surface-600 uppercase">
                {project.status}
              </span>
              <span className={`text-[11px] font-semibold ${project.priority === "URGENT" ? "text-rose-600" : "text-surface-500"}`}>
                Prioritas: {project.priority}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-surface-900">{project.title}</h1>
            {project.description && <p className="mt-1 text-sm text-surface-600">{project.description}</p>}
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {project.area && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium"
                style={{ backgroundColor: `${project.area.color}15`, color: project.area.color }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: project.area.color }} />
                Area: {project.area.name}
              </span>
            )}
            {project.goal && (
              <span className="rounded-full bg-ai-50 px-3 py-1 font-medium text-ai-700">
                🎯 Goal: {project.goal.title}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 pt-3 border-t border-surface-100 text-xs text-surface-500">
          <span>{project.milestones.length} Milestones</span>
          <span>•</span>
          <span>{completedTasksCount}/{tasks.length} Tasks Selesai</span>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-surface-900">Tasks Project</h2>
            <p className="text-xs text-surface-500">Pekerjaan nyata yang harus dieksekusi dalam project ini.</p>
          </div>
          <button
            onClick={() => setIsAddingTask(!isAddingTask)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 transition-all"
          >
            <Icon name={isAddingTask ? "x" : "plus"} size={14} />
            {isAddingTask ? "Batal" : "Tambah Task"}
          </button>
        </div>

        {isAddingTask && (
          <form onSubmit={handleAddTask} className="rounded-2xl border border-surface-200 bg-white p-5 shadow-subtle space-y-3">
            <h3 className="text-sm font-bold text-surface-900">Task Baru untuk Project</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-surface-600 mb-1">Judul Task</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Contoh: Buat wireframe mockup halaman dashboard"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-surface-200 px-3 py-1.5 text-xs focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1">Prioritas</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "URGENT")}
                  className="w-full rounded-lg border border-surface-200 px-3 py-1.5 text-xs focus:outline-none focus:border-primary-500"
                >
                  <option value="LOW">Rendah (LOW)</option>
                  <option value="MEDIUM">Sedang (MEDIUM)</option>
                  <option value="HIGH">Tinggi (HIGH)</option>
                  <option value="URGENT">Mendesak (URGENT)</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1">Tenggat Waktu / Deadline (Opsional)</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full rounded-lg border border-surface-200 px-3 py-1.5 text-xs focus:outline-none focus:border-primary-500"
                />
              </div>

              {project.milestones.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-surface-600 mb-1">Tautkan ke Milestone (Opsional)</label>
                  <select
                    value={taskMilestoneId}
                    onChange={(e) => setTaskMilestoneId(e.target.value)}
                    className="w-full rounded-lg border border-surface-200 px-3 py-1.5 text-xs focus:outline-none focus:border-primary-500"
                  >
                    <option value="">-- Tanpa Milestone Khusus --</option>
                    {project.milestones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="rounded-lg px-3 py-1 text-xs font-semibold text-surface-600 hover:bg-surface-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loadingTask || !taskTitle.trim()}
                className="rounded-lg bg-primary-600 px-3.5 py-1 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {loadingTask ? "Menyimpan..." : "Simpan Task"}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {tasks.map((t) => {
            const isDone = t.status === "COMPLETED";
            return (
              <div
                key={t.id}
                className={`group flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 shadow-xs transition-all ${
                  isDone ? "bg-surface-50/70 border-surface-200 opacity-75" : "bg-white border-surface-200 hover:border-primary-200"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => handleToggleTask(t.id, t.status)}
                    className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-all ${
                      isDone ? "border-success-500 bg-success-500 text-white" : "border-surface-300 hover:border-success-500"
                    }`}
                    title={isDone ? "Tandai belum selesai" : "Selesaikan task"}
                  >
                    {isDone && <Icon name="check" size={10} strokeWidth={3} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/tasks/${t.id}`}
                      className={`text-xs font-medium hover:text-primary-700 transition-colors truncate block ${
                        isDone ? "line-through text-surface-400" : "text-surface-900"
                      }`}
                    >
                      {t.title}
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {t.dueDate && (
                    <span className="rounded-md bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                      📅 {new Date(t.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </span>
                  )}
                  {t.milestone && (
                    <span className="rounded-md bg-surface-100 px-2 py-0.5 text-[10px] font-medium text-surface-600">
                      🎯 {t.milestone.title}
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold ${t.priority === "URGENT" || t.priority === "HIGH" ? "text-rose-600" : "text-surface-400"}`}>
                    {t.priority}
                  </span>
                </div>
              </div>
            );
          })}

          {tasks.length === 0 && !isAddingTask && (
            <div className="rounded-xl border border-dashed border-surface-300 p-6 text-center bg-surface-50/50">
              <p className="text-xs text-surface-500">Belum ada task di project ini.</p>
              <button
                onClick={() => setIsAddingTask(true)}
                className="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                + Tambah Task Pertama
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Milestones Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-surface-900">Milestones</h2>
            <p className="text-xs text-surface-500">Tahapan pencapaian penting dalam project ini.</p>
          </div>
          <button
            onClick={() => setIsAddingMilestone(!isAddingMilestone)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-surface-100 px-3.5 py-1.5 text-xs font-semibold text-surface-700 hover:bg-surface-200 transition-all"
          >
            <Icon name={isAddingMilestone ? "x" : "plus"} size={14} />
            {isAddingMilestone ? "Batal" : "Tambah Milestone"}
          </button>
        </div>

        {isAddingMilestone && (
          <form onSubmit={handleAddMilestone} className="rounded-2xl border border-surface-200 bg-white p-5 shadow-subtle space-y-3">
            <h3 className="text-sm font-bold text-surface-900">Milestone Baru</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1">Judul Milestone</label>
                <input
                  type="text"
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  placeholder="Contoh: Desain Sistem & Arsitektur Selesai"
                  required
                  className="w-full rounded-lg border border-surface-200 px-3 py-1.5 text-xs focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1">Batas Waktu (Opsional)</label>
                <input
                  type="date"
                  value={milestoneDue}
                  onChange={(e) => setMilestoneDue(e.target.value)}
                  className="w-full rounded-lg border border-surface-200 px-3 py-1.5 text-xs focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1">Deskripsi (Opsional)</label>
              <textarea
                value={milestoneDesc}
                onChange={(e) => setMilestoneDesc(e.target.value)}
                placeholder="Rincian checkpoint ini..."
                rows={2}
                className="w-full rounded-lg border border-surface-200 px-3 py-1.5 text-xs focus:outline-none focus:border-primary-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingMilestone(false)}
                className="rounded-lg px-3 py-1 text-xs font-semibold text-surface-600 hover:bg-surface-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loadingMilestone || !milestoneTitle.trim()}
                className="rounded-lg bg-primary-600 px-3.5 py-1 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {loadingMilestone ? "Menyimpan..." : "Simpan Milestone"}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {project.milestones.map((m, idx) => (
            <div
              key={m.id}
              className={`rounded-xl border p-4 shadow-subtle transition-all flex items-start justify-between ${
                m.status === "COMPLETED" ? "bg-surface-50/70 border-surface-200 opacity-80" : "bg-white border-surface-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handleToggleMilestone(m)}
                  className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
                    m.status === "COMPLETED"
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-surface-300 hover:border-emerald-500"
                  }`}
                >
                  {m.status === "COMPLETED" && <Icon name="check" size={12} />}
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-surface-400">#{idx + 1}</span>
                    <h4 className={`text-sm font-bold ${m.status === "COMPLETED" ? "line-through text-surface-400" : "text-surface-900"}`}>
                      {m.title}
                    </h4>
                  </div>
                  {m.description && <p className="mt-0.5 text-xs text-surface-500">{m.description}</p>}
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-surface-400">
                    <span>{m._count?.tasks ?? m.tasks?.length ?? 0} Tasks terhubung</span>
                    {m.dueDate && <span>Target: {new Date(m.dueDate).toLocaleDateString("id-ID")}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDeleteMilestone(m)}
                  className="rounded p-1 text-surface-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                  title="Hapus milestone"
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          ))}

          {project.milestones.length === 0 && !isAddingMilestone && (
            <div className="rounded-2xl border border-dashed border-surface-300 p-6 text-center bg-surface-50/50">
              <p className="text-xs text-surface-500">Belum ada milestone di project ini.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
