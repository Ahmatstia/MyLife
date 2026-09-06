"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { useToast } from "./ui/Toast";

type TaskFormProps = {
  stageId: string;
  label?: string;
};

export default function TaskForm({ stageId, label = "Tambah task" }: TaskFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) {
      toast("Nama task wajib diisi.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageId,
          name,
          description,
          type: "TASK",
          priority,
          estimatedHours: estimatedHours === "" ? 0 : Number(estimatedHours),
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          scheduledDate: dueDate ? new Date(dueDate).toISOString() : null,
          notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || data.error || "Gagal membuat task.");
      setName("");
      setDescription("");
      setPriority("MEDIUM");
      setEstimatedHours("");
      setDueDate("");
      setNotes("");
      setOpen(false);
      toast("Task ditambahkan.", "success");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal membuat task.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-surface-300 bg-surface-0 px-4 py-3 text-sm font-medium text-surface-500 transition hover:border-primary-400 hover:bg-primary-50/40 hover:text-primary-700"
      >
        <span className="text-lg leading-none">+</span> {label}
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Tambah task baru"
        description="Tentukan satu pekerjaan konkret untuk stage ini."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-surface-700">Nama task</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mis. Belajar variabel Python"
              required
              autoFocus
              className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3.5 py-2.5 text-sm text-surface-900 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-surface-700">Deskripsi</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Apa yang harus dipelajari atau dilakukan?"
              rows={2}
              className="w-full resize-none rounded-xl border border-surface-200 bg-surface-50 px-3.5 py-2.5 text-sm text-surface-900 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-surface-700">Prioritas</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3.5 py-2.5 text-sm text-surface-900 outline-none focus:border-primary-400"
              >
                <option value="LOW">Rendah</option>
                <option value="MEDIUM">Sedang</option>
                <option value="HIGH">Tinggi</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-surface-700">Estimasi jam</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="mis. 2"
                className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3.5 py-2.5 text-sm text-surface-900 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-surface-700">Tenggat Waktu / Deadline (Opsional)</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3.5 py-2.5 text-sm text-surface-900 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-surface-700">Catatan</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ada hal lain?"
              rows={2}
              className="w-full resize-none rounded-xl border border-surface-200 bg-surface-50 px-3.5 py-2.5 text-sm text-surface-900 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setOpen(false)} type="button">
              Batal
            </Button>
            <Button type="submit" icon="check" loading={submitting}>
              Buat task
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
