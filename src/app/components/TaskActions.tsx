"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { useToast } from "./ui/Toast";
import { useConfirm } from "./ui/Confirm";

type Props = {
  id: string;
  name: string;
  description: string | null;
  priority: string;
  estimatedHours: number;
  dueDate?: string | Date | null;
  notes: string | null;
};

export default function TaskActions({ id, name, description, priority, estimatedHours, dueDate, notes }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const { askConfirm, confirmDialog } = useConfirm();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({
    name,
    description: description ?? "",
    priority,
    estimatedHours: String(estimatedHours),
    dueDate: dueDate ? new Date(dueDate).toISOString().slice(0, 10) : "",
    notes: notes ?? "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function patch(body: object, success = "Task diperbarui.") {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Gagal memperbarui task.");
      setEditing(false);
      toast(success, "success");
      router.refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Gagal memperbarui task.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    const confirmed = await askConfirm({
      title: "Hapus task",
      description: `Yakin ingin menghapus task "${name}"? Seluruh riwayat sesi pada task ini juga akan terhapus.`,
      confirmLabel: "Hapus task",
      danger: true,
    });
    if (!confirmed) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Task berhasil dihapus.", "info");
      router.back();
    } catch {
      toast("Gagal menghapus task.", "error");
    } finally {
      setLoading(false);
    }
  }

  function startEditing() {
    setValues({
      name,
      description: description ?? "",
      priority,
      estimatedHours: String(estimatedHours ?? 0),
      dueDate: dueDate ? new Date(dueDate).toISOString().slice(0, 10) : "",
      notes: notes ?? "",
    });
    setError("");
    setEditing(true);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        icon="edit"
        size="sm"
        onClick={startEditing}
        disabled={loading}
      >
        Edit detail
      </Button>

      <Button
        variant="ghost"
        icon="trash"
        size="sm"
        onClick={handleDelete}
        disabled={loading}
        className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
      >
        Hapus
      </Button>

      {error && <p className="w-full text-xs text-danger-600">{error}</p>}

      <Dialog
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit detail task"
        description="Perbarui informasi dan estimasi task ini."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-mono font-semibold text-[#94A3B8] mb-1">
              Nama Task
            </label>
            <input
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              placeholder="Nama task"
              className="w-full rounded-xl border border-white/[0.08] bg-[#0B0D13] px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748B] outline-none transition focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] font-mono font-semibold text-[#94A3B8] mb-1">
                Prioritas
              </label>
              <select
                value={values.priority}
                onChange={(e) => setValues({ ...values, priority: e.target.value })}
                className="w-full rounded-xl border border-white/[0.08] bg-[#0B0D13] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]"
              >
                <option value="LOW">Rendah</option>
                <option value="MEDIUM">Sedang</option>
                <option value="HIGH">Tinggi</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-mono font-semibold text-[#94A3B8] mb-1">
                Estimasi (Jam)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={values.estimatedHours}
                onChange={(e) => setValues({ ...values, estimatedHours: e.target.value })}
                placeholder="0.5, 1, 2..."
                className="w-full rounded-xl border border-white/[0.08] bg-[#0B0D13] px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748B] outline-none transition focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-mono font-semibold text-[#94A3B8] mb-1">
              Deskripsi
            </label>
            <textarea
              value={values.description}
              onChange={(e) => setValues({ ...values, description: e.target.value })}
              placeholder="Rincian yang perlu dikerjakan..."
              rows={3}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#0B0D13] px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748B] outline-none transition focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] font-mono font-semibold text-[#94A3B8] mb-1">
                Tenggat Waktu / Deadline
              </label>
              <input
                type="date"
                value={values.dueDate}
                onChange={(e) => setValues({ ...values, dueDate: e.target.value })}
                className="w-full rounded-xl border border-white/[0.08] bg-[#0B0D13] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-mono font-semibold text-[#94A3B8] mb-1">
                Catatan / Sticky Notes
              </label>
              <input
                type="text"
                value={values.notes}
                onChange={(e) => setValues({ ...values, notes: e.target.value })}
                placeholder="Tips, link, atau referensi..."
                className="w-full rounded-xl border border-white/[0.08] bg-[#0B0D13] px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748B] outline-none transition focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]"
              />
            </div>
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
            <Button variant="secondary" onClick={() => setEditing(false)} type="button">
              Batal
            </Button>
            <Button
              loading={loading}
              disabled={!values.name.trim()}
              onClick={() =>
                patch({
                  title: values.name.trim(),
                  description: values.description.trim() || null,
                  priority: values.priority,
                  estimatedHours: Number(values.estimatedHours),
                  dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
                  scheduledDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
                  notes: values.notes.trim() || null,
                })
              }
            >
              Simpan perubahan
            </Button>
          </div>
        </div>
      </Dialog>
      {confirmDialog}
    </div>
  );
}
