"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./ui/Icon";
import { useToast } from "./ui/Toast";
import { useConfirm } from "./ui/Confirm";

export default function StageActions({
  id,
  name,
  description,
  canMoveUp,
  canMoveDown,
}: {
  id: string;
  name: string;
  description: string | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { askConfirm, confirmDialog } = useConfirm();
  const [editing, setEditing] = useState(false);
  const [stageName, setStageName] = useState(name);
  const [stageDescription, setStageDescription] = useState(description ?? "");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function patchRequest(body: object) {
    setError("");
    const response = await fetch(`/api/stages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message ?? "Gagal memperbarui stage.");
    startTransition(() => {
      router.refresh();
    });
  }

  async function run(body: object, success = "Stage diperbarui.") {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await patchRequest(body);
      setEditing(false);
      toast(success, "success");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Gagal memperbarui stage.");
    } finally {
      setIsBusy(false);
    }
  }

  async function remove() {
    const confirmed = await askConfirm({
      title: "Hapus stage",
      description: `Hapus stage "${name}"? Semua task di dalamnya ikut terhapus.`,
      confirmLabel: "Hapus",
      danger: true,
    });
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/stages/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Gagal menghapus stage.");
      toast("Stage dihapus.", "info");
      router.refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Gagal menghapus stage.");
    }
  }

  if (editing) {
    return (
      <div className="mt-3 space-y-2 rounded-xl border border-surface-200 bg-surface-0 p-3">
        <input
          value={stageName}
          onChange={(e) => setStageName(e.target.value)}
          className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-primary-400"
        />
        <textarea
          value={stageDescription}
          onChange={(e) => setStageDescription(e.target.value)}
          rows={2}
          className="w-full resize-none rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none focus:border-primary-400"
        />
        <div className="flex gap-2">
          <button
            onClick={() => run({ name: stageName, description: stageDescription })}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
          >
            Simpan
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg border border-surface-200 px-3 py-1.5 text-xs text-surface-600 hover:bg-surface-100"
          >
            Batal
          </button>
        </div>
        {error && <p className="text-xs text-danger-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-0.5">
      <button
        disabled={!canMoveUp || isBusy}
        onClick={() => run({ order: "up" })}
        aria-label="Naikkan stage"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-500 hover:bg-surface-100 disabled:opacity-30 active:scale-90 transition-transform"
      >
        <Icon name="chevronUp" size={15} />
      </button>
      <button
        disabled={!canMoveDown || isBusy}
        onClick={() => run({ order: "down" })}
        aria-label="Turunkan stage"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-500 hover:bg-surface-100 disabled:opacity-30 active:scale-90 transition-transform"
      >
        <Icon name="chevronDown" size={15} />
      </button>
      <button
        onClick={() => setEditing(true)}
        aria-label="Edit stage"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-500 hover:bg-surface-100 hover:text-surface-800"
      >
        <Icon name="edit" size={14} />
      </button>
      <button
        onClick={() => void remove()}
        aria-label="Hapus stage"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-500 hover:bg-danger-50 hover:text-danger-600"
      >
        <Icon name="trash" size={14} />
      </button>
      {error && <p className="w-full text-xs text-danger-600">{error}</p>}
      {confirmDialog}
    </div>
  );
}
