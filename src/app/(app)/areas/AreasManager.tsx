"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/ui/Icon";
import { useToast } from "@/app/components/ui/Toast";
import NewGoalButton from "@/app/components/NewGoalButton";

type AreaItem = {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  icon: string;
  order: number;
  isActive: boolean;
  _count?: {
    goals: number;
    projects: number;
    tasks: number;
  };
  goals?: Array<{ id: string; title: string; status: string }>;
  projects?: Array<{ id: string; title: string; status: string }>;
};

export function AreasManager({ initialAreas }: { initialAreas: AreaItem[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, color }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal membuat area");
      toast("Area berhasil dibuat", "success");
      setName("");
      setDescription("");
      setIsCreating(false);
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal membuat area", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(area: AreaItem) {
    try {
      const res = await fetch(`/api/areas/${area.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !area.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal memperbarui status");
      toast(area.isActive ? "Area diarsipkan" : "Area diaktifkan", "info");
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal memperbarui status", "error");
    }
  }

  async function handleDelete(area: AreaItem) {
    if (!confirm(`Hapus area "${area.name}"?`)) return;
    try {
      const res = await fetch(`/api/areas/${area.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menghapus area");
      toast("Area berhasil dihapus", "success");
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal menghapus area", "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-surface-500">
          Area mewakili domain kehidupan Anda (contoh: Karier, Kesehatan, Finansial, Belajar).
        </p>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-all"
        >
          <Icon name={isCreating ? "x" : "plus"} size={16} />
          {isCreating ? "Batal" : "Tambah Area"}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-surface-200 bg-white p-5 shadow-subtle space-y-4">
          <h3 className="text-base font-bold text-surface-900">Area Baru</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1">Nama Area</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Karier & Profesional"
                required
                className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1">Warna Badge</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-surface-200 p-1"
                />
                <span className="text-xs text-surface-500 font-mono">{color}</span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Deskripsi (Opsional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi fokus domain ini..."
              rows={2}
              className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-surface-600 hover:bg-surface-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Area"}
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {initialAreas.map((area) => (
          <div
            key={area.id}
            className={`rounded-2xl border p-5 shadow-subtle transition-all ${
              area.isActive ? "border-surface-200 bg-white" : "border-surface-150 bg-surface-50/60 opacity-70"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3.5 w-3.5 rounded-full ring-2 ring-white shadow-sm"
                  style={{ backgroundColor: area.color }}
                />
                <h4 className="font-bold text-surface-900">{area.name}</h4>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleActive(area)}
                  title={area.isActive ? "Arsipkan" : "Aktifkan"}
                  className="rounded p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-all"
                >
                  <Icon name={area.isActive ? "stop" : "play"} size={14} />
                </button>
                <button
                  onClick={() => handleDelete(area)}
                  title="Hapus"
                  className="rounded p-1 text-surface-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>

            {area.description && <p className="mt-2 text-xs text-surface-600 line-clamp-2">{area.description}</p>}

            {/* Linked Goals & Projects */}
            {((area.goals && area.goals.length > 0) || (area.projects && area.projects.length > 0)) && (
              <div className="mt-3 space-y-2 pt-2.5 border-t border-surface-100">
                {area.goals && area.goals.length > 0 && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">Goals Terhubung:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {area.goals.map((g) => (
                        <Link
                          key={g.id}
                          href={`/goals/${g.id}`}
                          className="inline-flex items-center gap-1 rounded-md bg-surface-100 hover:bg-primary-50 hover:text-primary-700 px-2 py-0.5 text-[11px] font-medium text-surface-700 transition"
                        >
                          <span className="text-[10px]">🎯</span>
                          <span className="truncate max-w-[130px]">{g.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {area.projects && area.projects.length > 0 && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">Proyek Terhubung:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {area.projects.map((p) => (
                        <Link
                          key={p.id}
                          href={`/projects/${p.id}`}
                          className="inline-flex items-center gap-1 rounded-md bg-surface-100 hover:bg-primary-50 hover:text-primary-700 px-2 py-0.5 text-[11px] font-medium text-surface-700 transition"
                        >
                          <span className="text-[10px]">📁</span>
                          <span className="truncate max-w-[130px]">{p.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between text-xs text-surface-400 border-t border-surface-100 pt-3">
              <span className="font-semibold text-surface-600">{area._count?.goals ?? 0} Goals</span>
              <span>•</span>
              <span className="font-semibold text-surface-600">{area._count?.projects ?? 0} Proyek</span>
              <span>•</span>
              <span className="font-semibold text-surface-600">{area._count?.tasks ?? 0} Tasks</span>
            </div>

            {/* Quick Actions */}
            <div className="mt-3 flex items-center gap-2 pt-2.5 border-t border-surface-100">
              <NewGoalButton
                areas={initialAreas.map((a) => ({ id: a.id, name: a.name, color: a.color }))}
                defaultAreaId={area.id}
                buttonLabel="+ Goal"
                buttonVariant="secondary"
                buttonSize="sm"
              />
              <Link
                href={`/projects?new=true&areaId=${area.id}`}
                className="inline-flex h-8 items-center gap-1 rounded-xl border border-surface-200 bg-white px-3 text-xs font-semibold text-surface-700 shadow-soft hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 transition"
              >
                <Icon name="plus" size={13} />
                + Proyek
              </Link>
            </div>
          </div>
        ))}
      </div>

      {initialAreas.length === 0 && !isCreating && (
        <div className="rounded-2xl border border-dashed border-surface-300 p-8 text-center bg-surface-50/50">
          <p className="text-sm font-semibold text-surface-700">Belum ada Area terdaftar.</p>
          <p className="mt-1 text-xs text-surface-500">Mulai kelompokkan aktivitas dan tujuan Anda ke dalam domain kehidupan.</p>
          <button
            onClick={() => setIsCreating(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            <Icon name="plus" size={14} />
            Buat Area Pertama
          </button>
        </div>
      )}
    </div>
  );
}
