"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/ui/Icon";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { useToast } from "@/app/components/ui/Toast";

interface CaptureItem {
  id: string;
  content: string;
  status: "PENDING" | "PROCESSED" | "ARCHIVED";
  category: "IDEA" | "TASK_CANDIDATE" | "NOTE" | "REMINDER";
  convertedTaskId?: string | null;
  convertedGoalId?: string | null;
  processedAt?: Date | string | null;
  createdAt: Date | string;
}

interface AreaItem {
  id: string;
  name: string;
  color: string;
}

interface ProjectItem {
  id: string;
  title: string;
}

interface GoalItem {
  id: string;
  title: string;
  stages?: { id: string; name: string }[];
}

interface Props {
  initialCaptures: CaptureItem[];
  areas: AreaItem[];
  projects: ProjectItem[];
  goals: GoalItem[];
}

export function CaptureInboxManager({
  initialCaptures,
  areas,
  projects,
  goals,
}: Props) {
  const [captures, setCaptures] = useState<CaptureItem[]>(initialCaptures);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Quick Create State
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<CaptureItem["category"]>("TASK_CANDIDATE");
  const [creating, setCreating] = useState(false);

  // Convert Modal State
  const [activeCapture, setActiveCapture] = useState<CaptureItem | null>(null);
  const [convertType, setConvertType] = useState<"TASK" | "GOAL" | "PROJECT" | null>(null);
  const [converting, setConverting] = useState(false);

  // Convert to Task Form State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskParentType, setTaskParentType] = useState<"project" | "stage" | "area">("project");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || "");
  const [selectedGoalId, setSelectedGoalId] = useState<string>(goals[0]?.id || "");
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [selectedAreaId, setSelectedAreaId] = useState<string>(areas[0]?.id || "");
  const [taskPriority, setTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [taskEstimatedHours, setTaskEstimatedHours] = useState(1);
  const [taskDueDate, setTaskDueDate] = useState("");

  // Convert to Goal Form State
  const [goalTitle, setGoalTitle] = useState("");
  const [goalAreaId, setGoalAreaId] = useState<string>(areas[0]?.id || "");
  const [goalType, setGoalType] = useState<"LEARNING" | "ACHIEVEMENT" | "HABIT" | "MAINTENANCE">("LEARNING");
  const [goalPriority, setGoalPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");

  // Convert to Project Form State
  const [projectTitle, setProjectTitle] = useState("");
  const [projectAreaId, setProjectAreaId] = useState<string>(areas[0]?.id || "");
  const [projectGoalId, setProjectGoalId] = useState<string>("");
  const [projectPriority, setProjectPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [projectTargetDate, setProjectTargetDate] = useState("");

  const { toast } = useToast();
  const router = useRouter();

  const filtered = captures.filter((item) => {
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
    if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;
    return true;
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newContent.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/captures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent.trim(), category: newCategory }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menyimpan catatan.");

      setCaptures((prev) => [data.data, ...prev]);
      setNewContent("");
      toast("Catatan tersimpan ke Inbox.", "success");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan.";
      toast(message, "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleArchive(id: string) {
    try {
      const res = await fetch(`/api/captures/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal mengarsipkan.");

      setCaptures((prev) => prev.map((c) => (c.id === id ? data.data : c)));
      toast("Catatan diarsipkan.", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal mengarsipkan.";
      toast(message, "error");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus catatan ini?")) return;
    try {
      const res = await fetch(`/api/captures/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus.");
      setCaptures((prev) => prev.filter((c) => c.id !== id));
      toast("Catatan dihapus.", "success");
    } catch {
      toast("Gagal menghapus catatan.", "error");
    }
  }

  function openConvertToTask(item: CaptureItem) {
    setActiveCapture(item);
    setTaskTitle(item.content.slice(0, 100));
    setConvertType("TASK");
  }

  function openConvertToGoal(item: CaptureItem) {
    setActiveCapture(item);
    setGoalTitle(item.content.slice(0, 100));
    setConvertType("GOAL");
  }

  function openConvertToProject(item: CaptureItem) {
    setActiveCapture(item);
    setProjectTitle(item.content.slice(0, 100));
    setProjectAreaId(areas[0]?.id || "");
    setProjectGoalId(goals[0]?.id || "");
    setProjectPriority("MEDIUM");
    setProjectTargetDate("");
    setConvertType("PROJECT");
  }

  async function handleConvertSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCapture) return;

    setConverting(true);
    try {
      let payload: Record<string, unknown>;

      if (convertType === "TASK") {
        let parentData: Record<string, string | undefined> = {};
        if (taskParentType === "project" && selectedProjectId) {
          parentData = { projectId: selectedProjectId };
        } else if (taskParentType === "stage" && selectedStageId) {
          parentData = { stageId: selectedStageId, goalId: selectedGoalId };
        } else if (taskParentType === "area" && selectedAreaId) {
          parentData = { areaId: selectedAreaId };
        } else {
          // Fallback to first available parent
          if (projects[0]?.id) parentData = { projectId: projects[0].id };
          else if (areas[0]?.id) parentData = { areaId: areas[0].id };
        }

        payload = {
          target: "TASK",
          data: {
            title: taskTitle.trim(),
            ...parentData,
            priority: taskPriority,
            estimatedHours: taskEstimatedHours,
            dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
            scheduledDate: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
          },
        };
      } else if (convertType === "GOAL") {
        payload = {
          target: "GOAL",
          data: {
            title: goalTitle.trim(),
            areaId: goalAreaId || undefined,
            type: goalType,
            priority: goalPriority,
          },
        };
      } else {
        payload = {
          target: "PROJECT",
          data: {
            title: projectTitle.trim(),
            areaId: projectAreaId || undefined,
            goalId: projectGoalId || undefined,
            priority: projectPriority,
            targetDate: projectTargetDate ? new Date(projectTargetDate).toISOString() : undefined,
          },
        };
      }

      const res = await fetch(`/api/captures/${activeCapture.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal mengonversi catatan.");

      setCaptures((prev) =>
        prev.map((c) => (c.id === activeCapture.id ? data.data.capture : c))
      );
      toast(
        convertType === "TASK"
          ? "Berhasil dikonversi menjadi Task!"
          : convertType === "GOAL"
          ? "Berhasil dikonversi menjadi Goal!"
          : "Berhasil dikonversi menjadi Proyek!",
        "success"
      );
      setActiveCapture(null);
      setConvertType(null);
      setTaskDueDate("");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal mengonversi.";
      toast(message, "error");
    } finally {
      setConverting(false);
    }
  }

  const selectedGoal = goals.find((g) => g.id === selectedGoalId);

  return (
    <div className="space-y-6">
      {/* Quick Input Bar */}
      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-surface-200 bg-white p-4 shadow-soft"
      >
        <p className="eyebrow text-primary-600 mb-2">Tambah Catatan Instan</p>
        <div className="space-y-3">
          <textarea
            rows={2}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Ketik apa saja yang terlintas di pikiran… ide, draft task, catatan pertemuan, atau pengingat…"
            className="w-full resize-none rounded-xl border border-surface-200 bg-surface-50 p-3 text-sm text-surface-900 placeholder:text-surface-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-surface-500">Kategori:</span>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as CaptureItem["category"])}
                className="rounded-lg border border-surface-200 bg-white px-2.5 py-1 text-xs text-surface-700 focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
              >
                <option value="TASK_CANDIDATE">Calon Task</option>
                <option value="IDEA">Ide & Inovasi</option>
                <option value="NOTE">Catatan Bebas</option>
                <option value="REMINDER">Pengingat</option>
              </select>
            </div>
            <Button
              type="submit"
              disabled={creating || !newContent.trim()}
              variant="primary"
              size="sm"
            >
              {creating ? "Menyimpan…" : "Simpan ke Inbox"}
            </Button>
          </div>
        </div>
      </form>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-200 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(["ALL", "PENDING", "PROCESSED", "ARCHIVED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                statusFilter === s
                  ? "bg-primary-600 text-white shadow-xs"
                  : "bg-surface-100 text-surface-600 hover:bg-surface-200"
              }`}
            >
              {s === "ALL" && "Semua"}
              {s === "PENDING" && "Menunggu"}
              {s === "PROCESSED" && "Terproses"}
              {s === "ARCHIVED" && "Arsip"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-surface-500">Kategori:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-surface-200 bg-white px-2 py-1 text-xs text-surface-700"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="TASK_CANDIDATE">Calon Task</option>
            <option value="IDEA">Ide</option>
            <option value="NOTE">Catatan</option>
            <option value="REMINDER">Pengingat</option>
          </select>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Inbox Kosong"
          description="Tidak ada catatan pada filter ini. Gunakan kotak di atas untuk mencatat cepat."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`flex flex-col justify-between rounded-2xl border p-4 shadow-soft transition ${
                item.status === "PROCESSED"
                  ? "border-success-150 bg-success-50/20"
                  : item.status === "ARCHIVED"
                  ? "border-surface-200 bg-surface-100/50 opacity-70"
                  : "border-surface-200 bg-white"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider">
                    {item.category === "TASK_CANDIDATE" && "Calon Task"}
                    {item.category === "IDEA" && "Ide"}
                    {item.category === "NOTE" && "Catatan"}
                    {item.category === "REMINDER" && "Pengingat"}
                  </span>
                  <Badge
                    tone={
                      item.status === "PROCESSED"
                        ? "success"
                        : item.status === "ARCHIVED"
                        ? "neutral"
                        : "primary"
                    }
                  >
                    {item.status === "PROCESSED" && "Terproses"}
                    {item.status === "ARCHIVED" && "Arsip"}
                    {item.status === "PENDING" && "Inbox"}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-surface-900 whitespace-pre-wrap">
                  {item.content}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-surface-150/70">
                {item.status === "PENDING" && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => openConvertToTask(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-2 py-1 text-[11.5px] font-semibold text-primary-700 hover:bg-primary-100 transition"
                    >
                      <Icon name="check" size={12} /> Ke Task
                    </button>
                    <button
                      onClick={() => openConvertToGoal(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-[11.5px] font-semibold text-violet-700 hover:bg-violet-100 transition"
                    >
                      <Icon name="target" size={12} /> Ke Goal
                    </button>
                    <button
                      onClick={() => openConvertToProject(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11.5px] font-semibold text-amber-700 hover:bg-amber-100 transition"
                    >
                      <Icon name="layers" size={12} /> Ke Proyek
                    </button>
                    <button
                      onClick={() => handleArchive(item.id)}
                      className="ml-auto rounded-lg p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition"
                      title="Arsipkan"
                    >
                      <Icon name="inbox" size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg p-1 text-danger-400 hover:bg-danger-50 hover:text-danger-600 transition"
                      title="Hapus"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                )}

                {item.status === "PROCESSED" && (
                  <div className="flex items-center justify-between text-xs text-success-700">
                    <span className="flex items-center gap-1">
                      <Icon name="check" size={13} /> Selesai dikonversi
                    </span>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg p-1 text-surface-400 hover:text-danger-600 transition"
                      title="Hapus"
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                )}

                {item.status === "ARCHIVED" && (
                  <div className="flex items-center justify-between text-xs text-surface-400">
                    <span>Diarsipkan</span>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg p-1 text-surface-400 hover:text-danger-600 transition"
                      title="Hapus"
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Convert Dialog */}
      <Dialog
        open={Boolean(convertType && activeCapture)}
        onClose={() => {
          setConvertType(null);
          setActiveCapture(null);
        }}
        title={
          convertType === "TASK"
            ? "Konversi Catatan ke Task"
            : convertType === "GOAL"
            ? "Konversi Catatan ke Goal"
            : "Konversi Catatan ke Proyek"
        }
        description={
          convertType === "TASK"
            ? "Tentukan nama task dan induk strukturalnya (Proyek, Tahapan Goal, atau Area)."
            : convertType === "GOAL"
            ? "Buat Goal baru berdasarkan pemikiran ini dan kaitkan ke Area yang relevan."
            : "Buat Proyek baru lengkap dengan pilar Area dan target tanggal selesai."
        }
      >
        <form onSubmit={handleConvertSubmit} className="space-y-4">
          {convertType === "TASK" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Judul Task
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full rounded-xl border border-surface-200 bg-white p-2.5 text-sm text-surface-900 focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Kaitkan Induk Melalui
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTaskParentType("project")}
                    className={`flex-1 rounded-lg border py-1.5 text-xs font-medium ${
                      taskParentType === "project"
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-surface-200 bg-white text-surface-600"
                    }`}
                  >
                    Proyek
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskParentType("stage")}
                    className={`flex-1 rounded-lg border py-1.5 text-xs font-medium ${
                      taskParentType === "stage"
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-surface-200 bg-white text-surface-600"
                    }`}
                  >
                    Goal & Tahapan
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskParentType("area")}
                    className={`flex-1 rounded-lg border py-1.5 text-xs font-medium ${
                      taskParentType === "area"
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-surface-200 bg-white text-surface-600"
                    }`}
                  >
                    Area Langsung
                  </button>
                </div>
              </div>

              {taskParentType === "project" && (
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Pilih Proyek
                  </label>
                  {projects.length === 0 ? (
                    <p className="text-xs text-warning-600">Belum ada proyek. Buat proyek terlebih dahulu atau pilih induk Area.</p>
                  ) : (
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full rounded-xl border border-surface-200 bg-white p-2.5 text-sm"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {taskParentType === "stage" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 mb-1">
                      Pilih Goal
                    </label>
                    <select
                      value={selectedGoalId}
                      onChange={(e) => {
                        setSelectedGoalId(e.target.value);
                        const g = goals.find((item) => item.id === e.target.value);
                        setSelectedStageId(g?.stages?.[0]?.id || "");
                      }}
                      className="w-full rounded-xl border border-surface-200 bg-white p-2.5 text-sm"
                    >
                      {goals.map((g) => (
                        <option key={g.id} value={g.id}>{g.title}</option>
                      ))}
                    </select>
                  </div>
                  {selectedGoal && selectedGoal.stages && selectedGoal.stages.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-surface-700 mb-1">
                        Pilih Tahapan
                      </label>
                      <select
                        value={selectedStageId}
                        onChange={(e) => setSelectedStageId(e.target.value)}
                        className="w-full rounded-xl border border-surface-200 bg-white p-2.5 text-sm"
                      >
                        {selectedGoal.stages.map((st) => (
                          <option key={st.id} value={st.id}>{st.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {taskParentType === "area" && (
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Pilih Area Kehidupan
                  </label>
                  <select
                    value={selectedAreaId}
                    onChange={(e) => setSelectedAreaId(e.target.value)}
                    className="w-full rounded-xl border border-surface-200 bg-white p-2.5 text-sm"
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Prioritas
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as typeof taskPriority)}
                    className="w-full rounded-xl border border-surface-200 bg-white p-2 text-xs"
                  >
                    <option value="LOW">Rendah (Low)</option>
                    <option value="MEDIUM">Sedang (Medium)</option>
                    <option value="HIGH">Tinggi (High)</option>
                    <option value="URGENT">Mendesak (Urgent)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Estimasi Jam
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={taskEstimatedHours}
                    onChange={(e) => setTaskEstimatedHours(Number(e.target.value))}
                    className="w-full rounded-xl border border-surface-200 bg-white p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Tenggat Waktu / Deadline (Opsional)
                </label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full rounded-xl border border-surface-200 bg-white p-2 text-xs"
                />
              </div>
            </>
          )}

          {convertType === "GOAL" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Judul Goal
                </label>
                <input
                  type="text"
                  required
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full rounded-xl border border-surface-200 bg-white p-2.5 text-sm text-surface-900 focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Area Pilar Kehidupan (Opsional)
                </label>
                <select
                  value={goalAreaId}
                  onChange={(e) => setGoalAreaId(e.target.value)}
                  className="w-full rounded-xl border border-surface-200 bg-white p-2.5 text-sm"
                >
                  <option value="">-- Tanpa Area --</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Tipe Goal
                  </label>
                  <select
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value as typeof goalType)}
                    className="w-full rounded-xl border border-surface-200 bg-white p-2 text-xs"
                  >
                    <option value="LEARNING">Pembelajaran</option>
                    <option value="ACHIEVEMENT">Pencapaian</option>
                    <option value="HABIT">Kebiasaan</option>
                    <option value="MAINTENANCE">Pemeliharaan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Prioritas
                  </label>
                  <select
                    value={goalPriority}
                    onChange={(e) => setGoalPriority(e.target.value as typeof goalPriority)}
                    className="w-full rounded-xl border border-surface-200 bg-white p-2 text-xs"
                  >
                    <option value="LOW">Rendah (Low)</option>
                    <option value="MEDIUM">Sedang (Medium)</option>
                    <option value="HIGH">Tinggi (High)</option>
                    <option value="URGENT">Mendesak (Urgent)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {convertType === "PROJECT" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Judul Proyek
                </label>
                <input
                  type="text"
                  required
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="w-full rounded-xl border border-surface-200 bg-white p-2.5 text-sm text-surface-900 focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Pilar Area Kehidupan
                </label>
                <select
                  value={projectAreaId}
                  onChange={(e) => setProjectAreaId(e.target.value)}
                  className="w-full rounded-xl border border-surface-200 bg-white p-2.5 text-sm"
                >
                  <option value="">-- Pilih Area --</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {goals.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Kaitkan ke Goal (Opsional)
                  </label>
                  <select
                    value={projectGoalId}
                    onChange={(e) => setProjectGoalId(e.target.value)}
                    className="w-full rounded-xl border border-surface-200 bg-white p-2.5 text-sm"
                  >
                    <option value="">-- Tanpa Goal --</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Prioritas
                  </label>
                  <select
                    value={projectPriority}
                    onChange={(e) => setProjectPriority(e.target.value as typeof projectPriority)}
                    className="w-full rounded-xl border border-surface-200 bg-white p-2 text-xs"
                  >
                    <option value="LOW">Rendah (Low)</option>
                    <option value="MEDIUM">Sedang (Medium)</option>
                    <option value="HIGH">Tinggi (High)</option>
                    <option value="URGENT">Mendesak (Urgent)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Target Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    value={projectTargetDate}
                    onChange={(e) => setProjectTargetDate(e.target.value)}
                    className="w-full rounded-xl border border-surface-200 bg-white p-2 text-xs"
                  />
                </div>
              </div>
            </>
          )}

          <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-surface-150">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setConvertType(null);
                setActiveCapture(null);
              }}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={converting}>
              {converting ? "Mengonversi…" : "Konversi Sekarang"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
