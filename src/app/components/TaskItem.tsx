"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "./ui/Icon";
import { PriorityBadge, StatusBadge } from "./ui/Badge";
import { useToast } from "./ui/Toast";
import { useConfirm } from "./ui/Confirm";
import { formatHours } from "@/lib/format";

type TaskItemProps = {
  id: string;
  title?: string;
  name?: string;
  description: string | null;
  priority: string;
  status: string;
  estimatedHours?: number;
  actualHours?: number;
  notes?: string | null;
};

export default function TaskItem({
  id,
  title,
  name,
  description,
  priority,
  status,
  estimatedHours = 0,
  actualHours = 0,
  notes = null,
}: TaskItemProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { askConfirm, confirmDialog } = useConfirm();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const displayName = title ?? name ?? "";
  const [editName, setEditName] = useState(displayName);
  const [editDescription, setEditDescription] = useState(description ?? "");
  const [editPriority, setEditPriority] = useState(priority);
  const [editHours, setEditHours] = useState(String(estimatedHours));
  const [editNotes, setEditNotes] = useState(notes ?? "");

  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);
  const [prevStatus, setPrevStatus] = useState(status);

  if (prevStatus !== status) {
    setPrevStatus(status);
    setOptimisticStatus(null);
  }

  const effectiveStatus = optimisticStatus ?? status;
  const completed = effectiveStatus === "COMPLETED";

  async function toggleTask() {
    const nextStatus = completed ? "IN_PROGRESS" : "COMPLETED";
    // 1. Optimistic Update (0ms instant response)
    setOptimisticStatus(nextStatus);
    toast(nextStatus === "COMPLETED" ? "Task selesai. Bagus! 🎉" : "Task dibuka kembali.", "success");

    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || data.error || "Gagal memperbarui task.");
      // Background revalidation without blocking user interaction
      startTransition(() => {
        router.refresh();
      });
    } catch (e) {
      // Revert if error
      setOptimisticStatus(null);
      toast(e instanceof Error ? e.message : "Gagal memperbarui task.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  function startEditing() {
    setEditName(displayName);
    setEditDescription(description ?? "");
    setEditPriority(priority);
    setEditHours(String(estimatedHours ?? 0));
    setEditNotes(notes ?? "");
    setIsEditing(true);
  }

  function cancelEditing() {
    setEditName(displayName);
    setEditDescription(description ?? "");
    setEditPriority(priority);
    setEditHours(String(estimatedHours ?? 0));
    setEditNotes(notes ?? "");
    setIsEditing(false);
  }

  async function saveEdit() {
    if (!editName.trim()) {
      toast("Nama task wajib diisi.", "error");
      return;
    }
    const parsedHours = editHours === "" ? 0 : Number(editHours);
    if (isNaN(parsedHours) || parsedHours < 0) {
      toast("Estimasi jam harus berupa angka valid (>= 0).", "error");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editName,
          name: editName,
          description: editDescription,
          priority: editPriority,
          estimatedHours: parsedHours,
          notes: editNotes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || data.error || "Gagal menyimpan perubahan.");
      setIsEditing(false);
      toast("Task diperbarui.", "success");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menyimpan perubahan.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteTask() {
    const confirmed = await askConfirm({
      title: "Hapus task",
      description: `Hapus task "${displayName}"?`,
      confirmLabel: "Hapus",
      danger: true,
    });
    if (!confirmed) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus task.");
      toast("Task dihapus.", "info");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menghapus task.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  if (isEditing) {
    return (
      <>
        <div className="rounded-2xl border border-surface-200 bg-surface-0 p-4 shadow-soft">
        <div className="space-y-3">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Nama task"
            className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-primary-400"
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Deskripsi"
            rows={2}
            className="w-full resize-none rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-primary-400"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value)}
              className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none"
            >
              <option value="LOW">Rendah</option>
              <option value="MEDIUM">Sedang</option>
              <option value="HIGH">Tinggi</option>
            </select>
            <input
              type="number"
              min="0"
              step="0.5"
              value={editHours}
              onChange={(e) => setEditHours(e.target.value)}
              placeholder="Estimasi jam"
              className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-primary-400"
            />
          </div>
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Catatan"
            rows={2}
            className="w-full resize-none rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-primary-400"
          />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={cancelEditing}
            disabled={isLoading}
            className="rounded-lg border border-surface-200 px-3 py-2 text-xs font-medium text-surface-600 hover:bg-surface-100"
          >
            Batal
          </button>
          <button
            onClick={saveEdit}
            disabled={isLoading}
            className="rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700"
          >
            {isLoading ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
        </div>
        {confirmDialog}
      </>
    );
  }

  return (
    <>
      <div
        className={`group flex flex-col justify-between rounded-xl border p-3.5 transition-all ${
          completed
            ? "border-emerald-500/30 bg-[#0B0D13]/60"
            : "border-white/[0.08] bg-[#131825] hover:border-purple-500/40 hover:bg-[#1A2133]/50 shadow-sm"
        }`}
      >
        <div className="flex items-start gap-2.5">
          <button
            type="button"
            onClick={toggleTask}
            aria-label={completed ? `Buka kembali ${displayName}` : `Ubah status ${displayName}`}
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all cursor-pointer active:scale-90 ${
              completed
                ? "border-emerald-400 bg-emerald-400 text-[#0B0D13] shadow-xs"
                : "border-white/20 bg-white/[0.05] hover:border-purple-400"
            }`}
          >
            {completed && <Icon name="check" size={11} strokeWidth={3} />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <Link
                href={`/tasks/${id}`}
                className={`text-[13px] font-semibold transition-colors line-clamp-2 ${
                  completed
                    ? "text-gray-500 line-through"
                    : "text-gray-200 group-hover:text-purple-300"
                }`}
              >
                {displayName}
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {completed ? (
                <StatusBadge status="COMPLETED" />
              ) : (
                <PriorityBadge priority={priority} />
              )}
              {estimatedHours > 0 && (
                <span className="text-[10.5px] font-mono text-gray-400">
                  ~{estimatedHours}j {actualHours > 0 ? `(${actualHours}j real)` : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card bottom actions */}
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2 text-[11px] text-gray-400">
          <span className="truncate max-w-[140px] font-mono text-[10px]">
            {actualHours > 0 ? `${formatHours(actualHours)} fokus` : "Belum ada sesi"}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={startEditing}
              disabled={isLoading}
              aria-label={`Edit ${displayName}`}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              <Icon name="edit" size={13} />
            </button>
            <button
              onClick={deleteTask}
              disabled={isLoading}
              aria-label={`Hapus ${displayName}`}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
            >
              <Icon name="trash" size={13} />
            </button>
            <Link
              href={`/tasks/${id}`}
              aria-label={`Buka ${displayName}`}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05] text-gray-300 hover:bg-purple-500/20 hover:text-purple-300 transition-colors"
            >
              <Icon name="arrowRight" size={13} />
            </Link>
          </div>
        </div>
      </div>
      {confirmDialog}
    </>
  );
}
