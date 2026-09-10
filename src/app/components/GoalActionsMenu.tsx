"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";
import { useToast } from "./ui/Toast";

const goalTypes = [
  { value: "LEARNING", label: "Pembelajaran (Belajar Hal Baru)" },
  { value: "ACHIEVEMENT", label: "Pencapaian (Target Tertentu)" },
  { value: "HABIT", label: "Kebiasaan (Membangun Rutinitas)" },
  { value: "MAINTENANCE", label: "Pemeliharaan (Menjaga Standar)" },
];

const goalStatuses = [
  { value: "ACTIVE", label: "Aktif (Sedang Berjalan)" },
  { value: "PAUSED", label: "Ditunda (Paused)" },
  { value: "COMPLETED", label: "Selesai (Completed)" },
  { value: "ARCHIVED", label: "Diarsipkan (Archived)" },
];

function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

export default function GoalActionsMenu({
  goalId,
  goalName,
  initialData,
  areas = [],
}: {
  goalId: string;
  goalName: string;
  initialData?: {
    name: string;
    description?: string | null;
    type?: string;
    status?: string;
    targetDate?: Date | string | null;
    areaId?: string | null;
  };
  areas?: Array<{ id: string; name: string; color?: string }>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // Edit form state
  const [name, setName] = useState(initialData?.name ?? goalName);
  const [type, setType] = useState(initialData?.type ?? "LEARNING");
  const [status, setStatus] = useState(initialData?.status ?? "ACTIVE");
  const [areaId, setAreaId] = useState(initialData?.areaId ?? "");
  const [targetDate, setTargetDate] = useState(formatDateForInput(initialData?.targetDate));
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [fetchedAreas, setFetchedAreas] = useState<Array<{ id: string; name: string; color?: string }>>([]);

  const activeAreas = areas.length > 0 ? areas : fetchedAreas;

  useEffect(() => {
    if (editOpen && areas.length === 0 && fetchedAreas.length === 0) {
      fetch("/api/areas")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            setFetchedAreas(data.data);
          }
        })
        .catch(() => {});
    }
  }, [editOpen, areas.length, fetchedAreas.length]);

  // Sync state if initialData changes
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    if (initialData) {
      setName(initialData.name ?? goalName);
      setType(initialData.type ?? "LEARNING");
      setStatus(initialData.status ?? "ACTIVE");
      setAreaId(initialData.areaId ?? "");
      setTargetDate(formatDateForInput(initialData.targetDate));
      setDescription(initialData.description ?? "");
    }
  }

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Close menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [menuOpen]);

  async function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) {
      toast("Nama goal wajib diisi.", "error");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          status,
          areaId: areaId || null,
          targetDate: targetDate ? targetDate : null,
          description: description.trim() || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Gagal memperbarui goal.");
      toast("Goal berhasil diperbarui.", "success");
      setEditOpen(false);
      router.refresh();
    } catch (val) {
      setError(val instanceof Error ? val.message : "Gagal memperbarui goal.");
      toast(val instanceof Error ? val.message : "Gagal memperbarui goal.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Gagal menghapus goal.");
      toast("Goal dihapus.", "info");
      router.push("/goals");
      router.refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Gagal menghapus goal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Aksi goal"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <Icon name="menu" size={15} />
          <span className="hidden sm:inline ml-1">Aksi</span>
          <Icon name="arrowRight" size={12} className={`transition-transform ${menuOpen ? "rotate-90" : ""}`} />
        </Button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-30 mt-1.5 min-w-[200px] rounded-xl border border-surface-150 bg-white py-1.5 shadow-pop animate-in-soft"
          >
            {/* Edit Goal Action */}
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setEditOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-surface-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
            >
              <Icon name="edit" size={15} className="text-surface-400" />
              Edit Goal
            </button>

            {/* AI Decompose Action */}
            <Link
              role="menuitem"
              href={`/goals/${goalId}?action=ai-breakdown`}
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-ai-600 hover:bg-ai-50 hover:text-ai-700 transition-colors"
            >
              <Icon name="sparkles" size={15} className="text-ai-500" />
              Pecah dengan AI
            </Link>

            {/* Add Review Action */}
            <Link
              role="menuitem"
              href={`/goals/${goalId}/reviews`}
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-surface-700 hover:bg-surface-50 hover:text-surface-900 transition-colors"
            >
              <Icon name="bookOpen" size={15} className="text-surface-400" />
              Review Mingguan
            </Link>

            <div className="my-1 border-t border-surface-100" />

            {/* Delete Goal Action */}
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setDeleteOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-danger-600 hover:bg-danger-50 transition-colors"
            >
              <Icon name="trash" size={15} className="text-danger-500" />
              Hapus Goal
            </button>
          </div>
        )}
      </div>

      {/* ── Edit Goal Dialog ──────────────────────────────────── */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Goal"
        description="Perbarui detail atau kelola pilar kehidupan dari goal ini."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {error && <p className="text-sm text-danger-600">{error}</p>}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-surface-700">Nama Goal</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama goal Anda"
              required
              className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3.5 py-2.5 text-sm text-surface-900 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-surface-700">Area Kehidupan (Pilar)</span>
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3.5 py-2.5 text-sm text-surface-900 outline-none focus:border-primary-400"
            >
              <option value="">-- Umum / Tanpa Area --</option>
              {activeAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-surface-400">
              Hubungkan goal ini ke domain seperti Karir, Kesehatan, Keuangan, atau Belajar.
            </span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-surface-700">Tipe Goal</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3.5 py-2.5 text-sm text-surface-900 outline-none focus:border-primary-400"
              >
                {goalTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-surface-700">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3.5 py-2.5 text-sm text-surface-900 outline-none focus:border-primary-400"
              >
                {goalStatuses.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-surface-700">Target Tanggal Selesai</span>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3.5 py-2.5 text-sm text-surface-900 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-surface-700">Deskripsi Goal</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ceritakan tujuan dan visi dari goal ini..."
              rows={3}
              className="w-full resize-none rounded-xl border border-surface-200 bg-surface-50 px-3.5 py-2.5 text-sm text-surface-900 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)} type="button" disabled={loading}>
              Batal
            </Button>
            <Button type="submit" icon="check" loading={loading}>
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Delete Confirmation Dialog ────────────────────────── */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Hapus goal "${goalName}"?`}
        description="Seluruh stage, task, sesi fokus, dan review di dalamnya akan ikut terhapus."
      >
        {error && <p className="mb-3 text-sm text-danger-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={loading}>
            Batal
          </Button>
          <Button variant="danger" icon="trash" onClick={remove} loading={loading}>
            Hapus goal
          </Button>
        </div>
      </Dialog>
    </>
  );
}
