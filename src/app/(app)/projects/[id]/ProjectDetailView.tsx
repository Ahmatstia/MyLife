"use client";

import { useState, startTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/ui/Icon";
import { useToast } from "@/app/components/ui/Toast";
import { Dialog } from "@/app/components/ui/Dialog";
import { BackButton } from "@/app/components/ui/BackButton";

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

  // Edit Project State
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editProjTitle, setEditProjTitle] = useState(project.title);
  const [editProjDesc, setEditProjDesc] = useState(project.description || "");
  const [editProjPriority, setEditProjPriority] = useState(project.priority);
  const [editProjStatus, setEditProjStatus] = useState(project.status);
  const [editProjTargetDate, setEditProjTargetDate] = useState(() =>
    project.targetDate ? new Date(project.targetDate).toISOString().slice(0, 10) : ""
  );
  const [loadingEditProject, setLoadingEditProject] = useState(false);

  // Edit Task State
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [editTaskDueDate, setEditTaskDueDate] = useState("");
  const [editTaskMilestoneId, setEditTaskMilestoneId] = useState("");
  const [loadingEditTask, setLoadingEditTask] = useState(false);

  // Edit Milestone State
  const [editingMilestone, setEditingMilestone] = useState<MilestoneItem | null>(null);
  const [editMilestoneTitle, setEditMilestoneTitle] = useState("");
  const [editMilestoneDesc, setEditMilestoneDesc] = useState("");
  const [editMilestoneDue, setEditMilestoneDue] = useState("");
  const [editMilestoneStatus, setEditMilestoneStatus] = useState("PENDING");
  const [loadingEditMilestone, setLoadingEditMilestone] = useState(false);

  // Optimistic Tasks State for 0ms instant UI responses
  const [optimisticTasks, setOptimisticTasks] = useState<TaskItem[] | null>(null);
  const [prevProjectTasks, setPrevProjectTasks] = useState(project.tasks);

  if (prevProjectTasks !== project.tasks) {
    setPrevProjectTasks(project.tasks);
    setOptimisticTasks(null);
  }

  function openEditMilestone(m: MilestoneItem) {
    setEditingMilestone(m);
    setEditMilestoneTitle(m.title);
    setEditMilestoneDesc(m.description || "");
    setEditMilestoneDue(m.dueDate ? new Date(m.dueDate).toISOString().slice(0, 10) : "");
    setEditMilestoneStatus(m.status);
  }

  async function handleSaveEditMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMilestone || !editMilestoneTitle.trim()) return;
    setLoadingEditMilestone(true);
    try {
      const res = await fetch(`/api/milestones/${editingMilestone.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editMilestoneTitle.trim(),
          description: editMilestoneDesc.trim() || null,
          dueDate: editMilestoneDue ? new Date(editMilestoneDue).toISOString() : null,
          status: editMilestoneStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal memperbarui tonggak");
      toast("Tonggak capaian diperbarui", "success");
      setEditingMilestone(null);
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal memperbarui tonggak", "error");
    } finally {
      setLoadingEditMilestone(false);
    }
  }

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
      toast("Tonggak capaian berhasil ditambahkan", "success");
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
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal memperbarui status", "error");
    }
  }

  async function handleDeleteMilestone(m: MilestoneItem) {
    if (!confirm(`Hapus tonggak capaian "${m.title}"?`)) return;
    try {
      const res = await fetch(`/api/milestones/${m.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menghapus");
      toast("Tonggak capaian dihapus", "success");
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal menghapus", "error");
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
          title: taskTitle.trim(),
          projectId: project.id,
          priority: taskPriority,
          dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : null,
          milestoneId: taskMilestoneId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal membuat task");
      toast("Tugas berhasil ditambahkan", "success");
      setTaskTitle("");
      setTaskDueDate("");
      setTaskMilestoneId("");
      setIsAddingTask(false);
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal membuat task", "error");
    } finally {
      setLoadingTask(false);
    }
  }

  async function handleToggleTask(taskId: string, currentStatus: string) {
    const nextStatus = currentStatus === "COMPLETED" ? "IN_PROGRESS" : "COMPLETED";

    // 1. Instant 0ms Optimistic Update
    setOptimisticTasks((current) => {
      const base = current ?? (project.tasks || []);
      return base.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t));
    });
    toast(nextStatus === "COMPLETED" ? "Tugas selesai! ✓" : "Tugas dibuka kembali.", "success");

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal memperbarui task");
      startTransition(() => {
        router.refresh();
      });
    } catch (err: unknown) {
      setOptimisticTasks(null);
      toast(err instanceof Error ? err.message : "Gagal memperbarui task", "error");
    }
  }

  async function handleDeleteTask(t: TaskItem) {
    if (!confirm(`Hapus task "${t.title}"?`)) return;
    try {
      const res = await fetch(`/api/tasks/${t.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menghapus task");
      toast("Tugas dihapus", "success");
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal menghapus task", "error");
    }
  }

  function openEditTask(t: TaskItem) {
    setEditingTask(t);
    setEditTaskTitle(t.title);
    setEditTaskPriority((t.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT") || "MEDIUM");
    setEditTaskDueDate(t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : "");
    setEditTaskMilestoneId(t.milestoneId || "");
  }

  async function handleSaveEditTask(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTask || !editTaskTitle.trim()) return;
    setLoadingEditTask(true);
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTaskTitle.trim(),
          priority: editTaskPriority,
          dueDate: editTaskDueDate ? new Date(editTaskDueDate).toISOString() : null,
          milestoneId: editTaskMilestoneId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal memperbarui task");
      toast("Tugas diperbarui", "success");
      setEditingTask(null);
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal memperbarui task", "error");
    } finally {
      setLoadingEditTask(false);
    }
  }

  async function handleUpdateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!editProjTitle.trim()) return;
    setLoadingEditProject(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editProjTitle.trim(),
          description: editProjDesc.trim() || null,
          priority: editProjPriority,
          status: editProjStatus,
          targetDate: editProjTargetDate ? new Date(editProjTargetDate).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal memperbarui project");
      toast("Proyek diperbarui", "success");
      setIsEditingProject(false);
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal memperbarui project", "error");
    } finally {
      setLoadingEditProject(false);
    }
  }

  const tasks = optimisticTasks ?? (project.tasks || []);
  const completedTasksCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  return (
    <div className="flex flex-col w-full pb-16 gap-6 text-gray-200">
      {/* 1. Navigasi & Jalur Kembali */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <Link
          href="/projects"
          className="group inline-flex items-center gap-2 text-gray-400 hover:text-[#c0c1ff] transition-colors text-xs font-mono"
        >
          <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-0.5 transition-transform">
            arrow_back
          </span>
          <span className="font-medium text-sm">Kembali ke Daftar Proyek</span>
        </Link>
        <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-ping" />
          <span>MODUL SINKRONISASI AKTIF</span>
          <span className="text-gray-700">/</span>
          <span className="text-[#c0c1ff]">PROYEK_ID: PRJ-{project.id.slice(-6).toUpperCase()}</span>
        </div>
      </div>

      {/* 2. Kartu Komando Proyek Utama */}
      <section className="rounded-2xl bg-[#131825] p-6 md:p-8 border border-white/[0.08] shadow-xl relative overflow-hidden">
        {/* Ambient Radial Glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/3 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-4">
          {/* Top navigation row */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
            <BackButton fallbackUrl="/projects" label="Kembali" />
            <span className="text-xs font-mono text-[#958ea0]">PROYEK #{project.id.slice(0, 6).toUpperCase()}</span>
          </div>

          {/* Baris Status & Hubungan Entitas */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1e1f26] border border-white/[0.08] text-[#c0c1ff] text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse" />
                <span className="uppercase tracking-wider font-semibold">
                  {project.status === "ACTIVE" || project.status === "IN_PROGRESS"
                    ? "Sedang Berjalan"
                    : project.status === "COMPLETED"
                    ? "Selesai"
                    : project.status}
                </span>
              </div>
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border ${
                  project.priority === "URGENT"
                    ? "bg-rose-500/20 text-[#F43F5E] border-rose-500/30 font-semibold"
                    : project.priority === "HIGH"
                    ? "bg-amber-500/20 text-[#F59E0B] border-amber-500/30 font-semibold"
                    : "bg-white/[0.06] text-gray-300 border-white/[0.08]"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">warning</span>
                <span className="uppercase">
                  Prioritas:{" "}
                  {project.priority === "URGENT"
                    ? "Mendesak"
                    : project.priority === "HIGH"
                    ? "Tinggi"
                    : project.priority === "LOW"
                    ? "Rendah"
                    : "Sedang"}
                </span>
              </div>
            </div>

            {/* Tag Keterhubungan */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#191b22] text-[#c0c1ff] text-xs font-mono border border-white/[0.04]">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: project.area?.color || "#c0c1ff" }}
                />
                <span>{project.area?.name || "Karier & Profesional"}</span>
              </div>
              {project.goal && (
                <Link
                  href={`/goals/${project.goal.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#1e1f26] hover:bg-[#282a30] text-[#d0bcff] text-xs font-mono border border-purple-500/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">flag</span>
                  <span>Target: {project.goal.title}</span>
                </Link>
              )}
            </div>
          </div>

          {/* Judul & Deskripsi Proyek */}
          <div className="flex flex-col gap-2 max-w-4xl mt-1">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
              {project.title}
            </h1>
            {project.description && (
              <p className="text-sm md:text-base text-gray-300 leading-relaxed max-w-4xl">
                {project.description}
              </p>
            )}
          </div>

          {/* Baris Metrik & Aksi Cepat */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 mt-2 bg-[#0B0D13]/70 p-4 rounded-xl border border-white/[0.05]">
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-300">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#c0c1ff]">alt_route</span>
                <span>{project.milestones.length} Tonggak Terdaftar</span>
              </div>
              <span className="text-gray-600">•</span>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#4edea3]">task_alt</span>
                <span className="text-[#4edea3] font-semibold">
                  {completedTasksCount}/{tasks.length} Tugas Selesai
                </span>
              </div>
              <span className="text-gray-600">•</span>
              <div className="flex items-center gap-1.5 text-[#F59E0B]">
                <span className="material-symbols-outlined text-[18px]">calendar_clock</span>
                <span>
                  Tenggat:{" "}
                  {project.targetDate
                    ? new Date(project.targetDate).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "28 Sep 2026"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Progress bar */}
              <div className="flex items-center gap-3 min-w-[200px]">
                <div className="flex-1 h-2 bg-[#1e1f26] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#c0c1ff] via-[#d0bcff] to-[#4edea3] rounded-full transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-bold text-[#4edea3]">{progressPercent}%</span>
              </div>

              {/* Edit Detail Proyek Button */}
              <button
                type="button"
                onClick={() => setIsEditingProject(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#282a30] hover:bg-[#1A2133] text-white font-medium text-xs transition-all shadow-sm border border-white/[0.08] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] text-[#d0bcff]">edit</span>
                <span>Edit Detail Proyek</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Layout Konten 2 Kolom (Bento Studio Grid) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-2">
        {/* ============================================== */}
        {/* KOLOM KIRI (7 cols / 60%): PUSAT TUGAS PROYEK   */}
        {/* ============================================== */}
        <section className="xl:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white">Tugas-Tugas Proyek</h2>
              <p className="text-xs text-gray-400">Pekerjaan nyata yang harus dieksekusi dalam inisiatif proyek ini.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingTask(!isAddingTask)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#d0bcff] via-[#a078ff] to-[#7c3aed] text-white font-semibold text-xs shadow-md shadow-purple-500/20 hover:opacity-95 transition-all cursor-pointer"
            >
              <Icon name={isAddingTask ? "x" : "plus"} size={14} />
              <span>{isAddingTask ? "Batal" : "Tambah Tugas"}</span>
            </button>
          </div>

          {/* Quick Task Form (Inline Expandable Card) */}
          {isAddingTask && (
            <form
              onSubmit={handleAddTask}
              className="rounded-xl bg-[#131825] border border-white/[0.08] p-4 shadow-md flex flex-col gap-3 relative"
            >
              <div className="flex items-center gap-1.5 font-mono text-xs text-[#c0c1ff] uppercase tracking-wider font-semibold">
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                <span>Perekaman Tugas Baru</span>
              </div>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Ketik judul tugas baru di sini..."
                required
                autoFocus
                className="w-full bg-[#0c0e14] text-white placeholder:text-gray-500 text-sm px-3.5 py-2.5 rounded-lg border border-white/[0.08] focus:outline-none focus:border-[#d0bcff] transition-all"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">PRIORITAS</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "URGENT")}
                    className="bg-[#0c0e14] text-white text-xs font-mono px-3 py-2 rounded-lg border border-white/[0.08] focus:outline-none focus:border-[#d0bcff]"
                  >
                    <option value="URGENT">Mendesak</option>
                    <option value="HIGH">Tinggi</option>
                    <option value="MEDIUM">Sedang</option>
                    <option value="LOW">Rendah</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">TENGGAT WAKTU</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="bg-[#0c0e14] text-white text-xs font-mono px-3 py-2 rounded-lg border border-white/[0.08] focus:outline-none focus:border-[#d0bcff]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">TONGGAK CAPAIAN</label>
                  <select
                    value={taskMilestoneId}
                    onChange={(e) => setTaskMilestoneId(e.target.value)}
                    className="bg-[#0c0e14] text-white text-xs font-mono px-3 py-2 rounded-lg border border-white/[0.08] focus:outline-none focus:border-[#d0bcff] truncate"
                  >
                    <option value="">-- Tanpa Tonggak --</option>
                    {project.milestones.map((m, idx) => (
                      <option key={m.id} value={m.id}>
                        #{idx + 1} {m.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-mono text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loadingTask || !taskTitle.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#a078ff] text-white font-mono text-xs font-semibold hover:brightness-110 disabled:opacity-50 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[15px]">check</span>
                  <span>{loadingTask ? "Menyimpan..." : "Simpan Tugas"}</span>
                </button>
              </div>
            </form>
          )}

          {/* Interactive Task List */}
          <div className="flex flex-col gap-2">
            {tasks.map((t) => {
              const isDone = t.status === "COMPLETED";
              const milestoneIndex = project.milestones.findIndex((m) => m.id === t.milestoneId);

              return (
                <div
                  key={t.id}
                  className={`group flex items-start gap-3 p-3.5 rounded-xl transition-all ${
                    isDone
                      ? "bg-[#131825]/60 border border-white/[0.04]"
                      : "bg-[#131825] border border-white/[0.08] hover:border-purple-500/30 hover:bg-[#1A2133] shadow-sm"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleTask(t.id, t.status)}
                    className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center transition-all cursor-pointer ${
                      isDone
                        ? "bg-[#00a572] text-[#003824] font-bold shadow-xs"
                        : "bg-[#1e1f26] border border-white/20 hover:border-[#d0bcff] text-transparent hover:text-[#d0bcff]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  </button>

                  <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                    <span
                      className={`text-sm font-medium tracking-tight block transition-colors ${
                        isDone ? "line-through text-gray-500" : "text-white group-hover:text-[#d0bcff]"
                      }`}
                    >
                      {t.title}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      {t.dueDate && (
                        <span className="font-mono text-[11px] text-[#F59E0B] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">schedule</span>
                          <span>
                            {new Date(t.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                          </span>
                        </span>
                      )}

                      {milestoneIndex >= 0 && (
                        <span className="font-mono text-[11px] text-[#c0c1ff] bg-[#191b22] px-2 py-0.5 rounded border border-white/[0.04] truncate max-w-[180px]">
                          🎯 Tonggak #{milestoneIndex + 1}
                        </span>
                      )}

                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          t.priority === "URGENT"
                            ? "bg-rose-500/20 text-[#F43F5E] border border-rose-500/30"
                            : t.priority === "HIGH"
                            ? "bg-amber-500/20 text-[#F59E0B] border border-amber-500/30"
                            : t.priority === "LOW"
                            ? "bg-white/[0.06] text-gray-400"
                            : "bg-[#1e1f26] text-[#c0c1ff] border border-white/[0.04]"
                        }`}
                      >
                        {t.priority === "URGENT"
                          ? "MENDESAK"
                          : t.priority === "HIGH"
                          ? "TINGGI"
                          : t.priority === "LOW"
                          ? "RENDAH"
                          : "SEDANG"}
                      </span>
                    </div>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button
                      type="button"
                      onClick={() => openEditTask(t)}
                      className="p-1 text-gray-400 hover:text-[#c0c1ff] hover:bg-white/[0.08] rounded transition-colors cursor-pointer"
                      title="Sunting tugas"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(t)}
                      className="p-1 text-gray-400 hover:text-[#F43F5E] hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                      title="Hapus tugas"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {tasks.length === 0 && !isAddingTask && (
              <div className="rounded-xl border border-dashed border-white/[0.1] p-8 text-center bg-[#131825]/40">
                <p className="text-xs font-mono text-gray-400">Belum ada tugas di proyek ini.</p>
                <button
                  type="button"
                  onClick={() => setIsAddingTask(true)}
                  className="mt-2 text-xs font-mono font-semibold text-[#d0bcff] hover:underline"
                >
                  + Tambah Tugas Pertama
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ============================================== */}
        {/* KOLOM KANAN (5 cols / 40%): TONGGAK CAPAIAN     */}
        {/* ============================================== */}
        <section className="xl:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white">Tonggak Capaian</h2>
              <p className="text-xs text-gray-400">Tahapan keberhasilan penting untuk mengukur laju proyek.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingMilestone(!isAddingMilestone)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#282a30] hover:bg-[#1A2133] text-[#c0c1ff] font-medium text-xs border border-white/[0.08] transition-all cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>{isAddingMilestone ? "Batal" : "Tambah Tonggak"}</span>
            </button>
          </div>

          {/* Form Tambah Tonggak Baru */}
          {isAddingMilestone && (
            <form
              onSubmit={handleAddMilestone}
              className="rounded-xl bg-[#131825] border border-white/[0.08] p-4 shadow-md flex flex-col gap-3"
            >
              <h3 className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#c0c1ff]">add_circle</span>
                <span>Tonggak Capaian Baru</span>
              </h3>
              <input
                type="text"
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                placeholder="Contoh: Desain Wireframe & Riset Pengguna Tuntas"
                required
                className="w-full bg-[#0c0e14] text-white text-xs px-3 py-2 rounded-lg border border-white/[0.1] focus:outline-none focus:border-[#d0bcff]"
              />
              <div className="grid grid-cols-1 gap-2">
                <input
                  type="date"
                  value={milestoneDue}
                  onChange={(e) => setMilestoneDue(e.target.value)}
                  className="bg-[#0c0e14] text-white text-xs font-mono px-3 py-2 rounded-lg border border-white/[0.1] focus:outline-none focus:border-[#d0bcff]"
                />
                <textarea
                  value={milestoneDesc}
                  onChange={(e) => setMilestoneDesc(e.target.value)}
                  placeholder="Deskripsi ringkas checkpoint ini (opsional)..."
                  rows={2}
                  className="w-full bg-[#0c0e14] text-white text-xs px-3 py-2 rounded-lg border border-white/[0.1] focus:outline-none focus:border-[#d0bcff]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsAddingMilestone(false)}
                  className="px-3 py-1 text-xs font-mono text-gray-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loadingMilestone || !milestoneTitle.trim()}
                  className="px-3.5 py-1.5 bg-[#a078ff] text-white font-mono text-xs font-semibold rounded-lg hover:brightness-110 disabled:opacity-50 transition-all shadow-sm"
                >
                  {loadingMilestone ? "Menyimpan..." : "Simpan Tonggak"}
                </button>
              </div>
            </form>
          )}

          {/* Milestone List */}
          <div className="flex flex-col gap-3">
            {project.milestones.map((m, idx) => {
              const isCompleted = m.status === "COMPLETED";
              const mTasks = tasks.filter((t) => t.milestoneId === m.id);
              const mDone = mTasks.filter((t) => t.status === "COMPLETED").length;
              const mPct =
                mTasks.length > 0
                  ? Math.round((mDone / mTasks.length) * 100)
                  : isCompleted
                  ? 100
                  : 0;

              const isActive = !isCompleted && (m.status === "IN_PROGRESS" || mPct > 0);
              const isScheduled = !isCompleted && !isActive;

              if (isCompleted) {
                // Completed milestone
                return (
                  <div
                    key={m.id}
                    className="rounded-xl bg-[#131825] p-4 flex flex-col gap-2.5 shadow-sm border border-white/[0.06] relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleMilestone(m)}
                          className="w-6 h-6 rounded-full bg-[#00a572] flex items-center justify-center text-[#003824] cursor-pointer"
                          title="Tandai belum selesai"
                        >
                          <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                        </button>
                        <span className="font-mono text-[10px] text-[#00a572] bg-[#00a572]/10 border border-[#00a572]/20 px-2 py-0.5 rounded font-bold">
                          #{idx + 1} TUNTAS
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditMilestone(m)}
                          className="text-gray-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                          title="Sunting tonggak"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMilestone(m)}
                          className="text-gray-400 hover:text-[#F43F5E] p-1 rounded transition-colors cursor-pointer"
                          title="Hapus tonggak"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                        <span className="font-mono text-xs font-bold text-[#00a572]">100%</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm text-white">{m.title}</h3>
                      {m.description && (
                        <p className="font-mono text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                          {m.description}
                        </p>
                      )}
                    </div>

                    <div className="w-full h-1.5 bg-[#1e1f26] rounded-full overflow-hidden">
                      <div className="h-full bg-[#4edea3] rounded-full w-full" />
                    </div>

                    <div className="flex items-center justify-between font-mono text-[10px] text-gray-400 pt-1">
                      <span>
                        {mDone}/{mTasks.length} Tugas Selesai
                      </span>
                      <span>
                        Target:{" "}
                        {m.dueDate
                          ? new Date(m.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                          : "Belum ditentukan"}
                      </span>
                    </div>
                  </div>
                );
              }

              if (isActive) {
                // Active milestone
                return (
                  <div
                    key={m.id}
                    className="rounded-xl bg-[#131825] p-4 flex flex-col gap-2.5 shadow-md border border-white/[0.08] relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#c0c1ff]/20 flex items-center justify-center text-[#c0c1ff]">
                          <span className="w-2 h-2 rounded-full bg-[#c0c1ff] animate-ping" />
                        </div>
                        <span className="font-mono text-[10px] text-[#c0c1ff] bg-[#191b22] px-2 py-0.5 rounded font-bold">
                          #{idx + 1} TAHAPAN AKTIF
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditMilestone(m)}
                          className="text-gray-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                          title="Sunting tonggak"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMilestone(m)}
                          className="text-gray-400 hover:text-[#F43F5E] p-1 rounded transition-colors cursor-pointer"
                          title="Hapus tonggak"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                        <span className="font-mono text-xs font-bold text-[#c0c1ff]">{mPct}%</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm text-white">{m.title}</h3>
                      {m.description && (
                        <p className="font-mono text-xs text-gray-300 mt-1 line-clamp-2 leading-relaxed">
                          {m.description}
                        </p>
                      )}
                    </div>

                    <div className="w-full h-1.5 bg-[#1e1f26] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#c0c1ff] to-[#a078ff] rounded-full"
                        style={{ width: `${mPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between font-mono text-[10px] text-gray-400 pt-1">
                      <span>
                        {mDone}/{mTasks.length} Tugas Selesai
                      </span>
                      <span className="text-[#F59E0B]">
                        Target:{" "}
                        {m.dueDate
                          ? new Date(m.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                          : "Belum ditentukan"}
                      </span>
                    </div>
                  </div>
                );
              }

              if (isScheduled) {
                // Scheduled milestone
                return (
                  <div
                    key={m.id}
                    className="rounded-xl bg-[#131825]/50 p-4 flex flex-col gap-2 shadow-sm border border-white/[0.04]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#0c0e14] flex items-center justify-center text-gray-400">
                          <span className="material-symbols-outlined text-[14px]">event_repeat</span>
                        </div>
                        <span className="font-mono text-[10px] text-gray-400 bg-[#0c0e14] px-2 py-0.5 rounded font-bold">
                          #{idx + 1} TERJADWAL
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-gray-400">
                        {mDone}/{mTasks.length} Tugas
                      </span>
                    </div>

                    <h3 className="font-semibold text-sm text-gray-300">{m.title}</h3>

                    <div className="flex items-center justify-between font-mono text-[10px] text-gray-400 pt-1">
                      <span>
                        Target:{" "}
                        {m.dueDate
                          ? new Date(m.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                          : "Belum ditentukan"}
                      </span>
                      <span className="text-[#4edea3] font-semibold">SIAP EVALUASI</span>
                    </div>
                  </div>
                );
              }

              // Default / Upcoming milestone
              return (
                <div
                  key={m.id}
                  className="rounded-xl bg-[#131825]/70 p-4 flex flex-col gap-2 shadow-sm border border-white/[0.05]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#1e1f26] flex items-center justify-center text-gray-400">
                        <span className="material-symbols-outlined text-[14px]">lock_clock</span>
                      </div>
                      <span className="font-mono text-[10px] text-gray-400 bg-[#0c0e14] px-2 py-0.5 rounded font-bold">
                        #{idx + 1} MENDATANG
                      </span>
                    </div>
                    <span className="font-mono text-xs text-gray-400">0% SELESAI</span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-white">{m.title}</h3>
                    {m.description && (
                      <p className="font-mono text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    )}
                  </div>

                  <div className="w-full h-1.5 bg-[#1e1f26] rounded-full overflow-hidden">
                    <div className="h-full bg-white/[0.08] rounded-full w-0" />
                  </div>

                  <div className="flex items-center justify-between font-mono text-[10px] text-gray-400 pt-1">
                    <span>{mTasks.length} Tugas Terhubung</span>
                    <span>
                      Target:{" "}
                      {m.dueDate
                        ? new Date(m.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                        : "Belum ditentukan"}
                    </span>
                  </div>
                </div>
              );
            })}

            {project.milestones.length === 0 && !isAddingMilestone && (
              <div className="rounded-xl border border-dashed border-white/[0.1] p-6 text-center bg-[#131825]/40">
                <p className="text-xs font-mono text-gray-400">Belum ada tonggak capaian.</p>
                <button
                  type="button"
                  onClick={() => setIsAddingMilestone(true)}
                  className="mt-2 text-xs font-mono font-semibold text-[#c0c1ff] hover:underline cursor-pointer"
                >
                  + Tambah Tonggak Pertama
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 4. Edit Project Modal (Matching Stitch command dialog) */}
      <Dialog
        open={isEditingProject}
        onClose={() => setIsEditingProject(false)}
        title="Edit Detail Proyek"
        description="Sesuaikan parameter dasar, prioritas, dan tenggat inisiatif."
      >
        <form onSubmit={handleUpdateProject} className="space-y-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
              Judul Proyek
            </label>
            <input
              type="text"
              value={editProjTitle}
              onChange={(e) => setEditProjTitle(e.target.value)}
              required
              className="w-full bg-[#0c0e14] text-white text-sm px-3.5 py-2.5 rounded-lg border border-white/[0.1] focus:outline-none focus:border-[#d0bcff]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                Status Operasi
              </label>
              <select
                value={editProjStatus}
                onChange={(e) => setEditProjStatus(e.target.value)}
                className="w-full bg-[#0c0e14] text-white text-xs font-mono px-3 py-2 rounded-lg border border-white/[0.1] focus:outline-none focus:border-[#d0bcff]"
              >
                <option value="PLANNING">Perencanaan</option>
                <option value="ACTIVE">Aktif (Sedang Berjalan)</option>
                <option value="ON_HOLD">Ditunda</option>
                <option value="COMPLETED">Selesai</option>
                <option value="CANCELLED">Dibatalkan</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                Tingkat Prioritas
              </label>
              <div className="grid grid-cols-4 gap-1">
                {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((p) => {
                  const isSelected = editProjPriority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditProjPriority(p)}
                      className={`py-1.5 text-center rounded font-mono text-[10px] font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? p === "URGENT"
                            ? "bg-rose-500/80 text-white shadow-inner"
                            : p === "HIGH"
                            ? "bg-amber-500/80 text-white shadow-inner"
                            : "bg-[#7c3aed] text-white shadow-inner"
                          : "bg-[#1e1f26] text-gray-400 hover:bg-[#282a30]"
                      }`}
                    >
                      {p === "URGENT" ? "MENDESAK" : p === "HIGH" ? "TINGGI" : p === "LOW" ? "RENDAH" : "SEDANG"}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
              Target Tanggal Selesai
            </label>
            <input
              type="date"
              value={editProjTargetDate}
              onChange={(e) => setEditProjTargetDate(e.target.value)}
              className="w-full bg-[#0c0e14] text-white text-xs font-mono px-3.5 py-2.5 rounded-lg border border-white/[0.1] focus:outline-none focus:border-[#d0bcff]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
              Deskripsi Proyek
            </label>
            <textarea
              value={editProjDesc}
              onChange={(e) => setEditProjDesc(e.target.value)}
              rows={3}
              className="w-full bg-[#0c0e14] text-white text-xs px-3.5 py-2.5 rounded-lg border border-white/[0.1] focus:outline-none focus:border-[#d0bcff] leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setIsEditingProject(false)}
              className="px-4 py-2 rounded-lg text-xs font-mono text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loadingEditProject || !editProjTitle.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gradient-to-r from-[#7c3aed] via-[#a078ff] to-[#00a572] text-white font-mono text-xs font-semibold shadow-md hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>{loadingEditProject ? "Menyimpan..." : "Simpan Perubahan"}</span>
            </button>
          </div>
        </form>
      </Dialog>

      {/* 5. Edit Milestone Dialog */}
      <Dialog
        open={Boolean(editingMilestone)}
        onClose={() => setEditingMilestone(null)}
        title="Sunting Tonggak Capaian"
        description="Perbarui parameter tonggak capaian inisiatif ini."
      >
        <form onSubmit={handleSaveEditMilestone} className="space-y-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] text-gray-400 uppercase">Judul Tonggak</label>
            <input
              type="text"
              value={editMilestoneTitle}
              onChange={(e) => setEditMilestoneTitle(e.target.value)}
              required
              className="w-full bg-[#0c0e14] text-white text-xs px-3.5 py-2.5 rounded-lg border border-white/[0.1] focus:outline-none focus:border-[#d0bcff]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] text-gray-400 uppercase">Status</label>
              <select
                value={editMilestoneStatus}
                onChange={(e) => setEditMilestoneStatus(e.target.value)}
                className="w-full bg-[#0c0e14] text-white text-xs font-mono px-3 py-2 rounded-lg border border-white/[0.1] focus:outline-none focus:border-[#d0bcff]"
              >
                <option value="PENDING">Menunggu (PENDING)</option>
                <option value="IN_PROGRESS">Tahapan Aktif (IN_PROGRESS)</option>
                <option value="COMPLETED">Tuntas (COMPLETED)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] text-gray-400 uppercase">Target Tanggal</label>
              <input
                type="date"
                value={editMilestoneDue}
                onChange={(e) => setEditMilestoneDue(e.target.value)}
                className="w-full bg-[#0c0e14] text-white text-xs font-mono px-3 py-2 rounded-lg border border-white/[0.1] focus:outline-none focus:border-[#d0bcff]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] text-gray-400 uppercase">Deskripsi</label>
            <textarea
              value={editMilestoneDesc}
              onChange={(e) => setEditMilestoneDesc(e.target.value)}
              rows={2}
              className="w-full bg-[#0c0e14] text-white text-xs px-3.5 py-2 rounded-lg border border-white/[0.1] focus:outline-none focus:border-[#d0bcff]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setEditingMilestone(null)}
              className="px-4 py-2 rounded-lg text-xs font-mono text-gray-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loadingEditMilestone || !editMilestoneTitle.trim()}
              className="px-4 py-2 rounded-lg bg-[#a078ff] text-white font-mono text-xs font-semibold hover:brightness-110 disabled:opacity-50"
            >
              {loadingEditMilestone ? "Menyimpan..." : "Simpan Tonggak"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* 6. Edit Task Dialog */}
      <Dialog
        open={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        title="Sunting Tugas"
        description="Perbarui informasi tugas proyek ini."
      >
        <form onSubmit={handleSaveEditTask} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">Judul Tugas</label>
            <input
              type="text"
              value={editTaskTitle}
              onChange={(e) => setEditTaskTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-white/[0.1] bg-[#0c0e14] px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Prioritas</label>
              <select
                value={editTaskPriority}
                onChange={(e) => setEditTaskPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "URGENT")}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0c0e14] px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
              >
                <option value="LOW">Rendah (LOW)</option>
                <option value="MEDIUM">Sedang (MEDIUM)</option>
                <option value="HIGH">Tinggi (HIGH)</option>
                <option value="URGENT">Mendesak (URGENT)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Tenggat Waktu</label>
              <input
                type="date"
                value={editTaskDueDate}
                onChange={(e) => setEditTaskDueDate(e.target.value)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0c0e14] px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          {project.milestones.length > 0 && (
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Tonggak Capaian</label>
              <select
                value={editTaskMilestoneId}
                onChange={(e) => setEditTaskMilestoneId(e.target.value)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0c0e14] px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
              >
                <option value="">-- Tanpa Tonggak --</option>
                {project.milestones.map((m, idx) => (
                  <option key={m.id} value={m.id}>
                    #{idx + 1} {m.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setEditingTask(null)}
              className="rounded-lg px-4 py-2 text-xs font-mono text-gray-400 hover:bg-white/[0.05]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loadingEditTask || !editTaskTitle.trim()}
              className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-mono font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loadingEditTask ? "Menyimpan..." : "Simpan Tugas"}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
