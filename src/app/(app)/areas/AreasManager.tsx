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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-violet-400 font-mono text-xs uppercase tracking-widest font-bold">
            <span>DOMAIN KEHIDUPAN // PILAR UTAMA</span>
            <span className="text-white/20">•</span>
            <span className="text-emerald-400">AKTIF</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
            Bidang Hidup <span className="text-surface-400 font-normal text-lg">(Life Areas)</span>
          </h1>
          <p className="text-sm text-surface-400 mt-0.5">
            Kelola pilar utama kehidupan Anda untuk menyelaraskan Goals, Projects, dan Tasks.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:bg-violet-500 transition-all self-start sm:self-auto"
        >
          <Icon name={isCreating ? "x" : "plus"} size={16} />
          {isCreating ? "Batal" : "+ Tambah Bidang"}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-white/10 bg-[#131825]/95 p-5 shadow-2xl backdrop-blur-md space-y-4">
          <h3 className="text-base font-bold text-white">Bidang Hidup Baru</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-surface-300 mb-1">Nama Bidang</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Karier & Profesional"
                required
                className="w-full rounded-xl border border-white/10 bg-[#0E131F] px-3.5 py-2 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-300 mb-1">Warna Badge</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-[#0E131F] p-1"
                />
                <span className="text-xs text-surface-400 font-mono">{color}</span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-300 mb-1">Deskripsi (Opsional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi fokus dan misi domain ini..."
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-[#0E131F] px-3.5 py-2 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-surface-400 hover:bg-white/5 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-violet-500 disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Bidang"}
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {initialAreas.map((area) => (
          <div
            key={area.id}
            className={`rounded-2xl border p-5 shadow-xl transition-all ${
              area.isActive
                ? "border-white/[0.08] bg-[#131825]/90 hover:border-violet-500/30"
                : "border-white/5 bg-[#0E131F]/60 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white/20 shadow-sm"
                  style={{ backgroundColor: area.color }}
                />
                <Link
                  href={`/areas/${area.id}`}
                  className="font-bold text-white hover:text-violet-300 truncate text-base transition"
                >
                  {area.name}
                </Link>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={() => handleToggleActive(area)}
                  title={area.isActive ? "Arsipkan" : "Aktifkan"}
                  className="rounded-lg p-1.5 text-surface-400 hover:bg-white/5 hover:text-white transition-all"
                >
                  <Icon name={area.isActive ? "stop" : "play"} size={14} />
                </button>
                <button
                  onClick={() => handleDelete(area)}
                  title="Hapus"
                  className="rounded-lg p-1.5 text-surface-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>

            {area.description && (
              <p className="mt-2 text-xs text-surface-400 line-clamp-2 leading-relaxed">
                {area.description}
              </p>
            )}

            {/* Linked Goals & Projects */}
            {((area.goals && area.goals.length > 0) || (area.projects && area.projects.length > 0)) && (
              <div className="mt-3.5 space-y-2 pt-3 border-t border-white/[0.06]">
                {area.goals && area.goals.length > 0 && (
                  <div>
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-surface-400">
                      Target Terhubung:
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {area.goals.map((g) => (
                        <Link
                          key={g.id}
                          href={`/goals/${g.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-white/5 bg-[#0E131F] hover:border-violet-500/30 hover:text-violet-300 px-2 py-0.5 text-[11px] font-medium text-surface-300 transition"
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
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-surface-400">
                      Proyek Terhubung:
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {area.projects.map((p) => (
                        <Link
                          key={p.id}
                          href={`/projects/${p.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-white/5 bg-[#0E131F] hover:border-violet-500/30 hover:text-violet-300 px-2 py-0.5 text-[11px] font-medium text-surface-300 transition"
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

            <div className="mt-4 flex items-center justify-between text-xs text-surface-400 border-t border-white/[0.06] pt-3 font-mono">
              <span className="text-violet-300 font-semibold">{area._count?.goals ?? 0} Goals</span>
              <span>•</span>
              <span className="text-surface-300 font-semibold">{area._count?.projects ?? 0} Proyek</span>
              <span>•</span>
              <span className="text-surface-300 font-semibold">{area._count?.tasks ?? 0} Tasks</span>
            </div>

            {/* Quick Actions */}
            <div className="mt-3 flex items-center justify-between gap-2 pt-2.5 border-t border-white/[0.06]">
              <div className="flex items-center gap-2">
                <NewGoalButton
                  areas={initialAreas.map((a) => ({ id: a.id, name: a.name, color: a.color }))}
                  defaultAreaId={area.id}
                  buttonLabel="+ Goal"
                  buttonVariant="secondary"
                  buttonSize="sm"
                />
                <Link
                  href={`/projects?new=true&areaId=${area.id}`}
                  className="inline-flex h-8 items-center gap-1 rounded-xl border border-white/10 bg-[#0E131F] px-3 text-xs font-semibold text-surface-300 hover:border-violet-500/30 hover:text-white transition"
                >
                  <Icon name="plus" size={12} />
                  + Proyek
                </Link>
              </div>

              <Link
                href={`/areas/${area.id}`}
                className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1"
              >
                Detail →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {initialAreas.length === 0 && !isCreating && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#131825]/90 p-12 text-center">
          <p className="text-base font-bold text-white">Belum ada Bidang Hidup terdaftar.</p>
          <p className="mt-1 text-xs text-surface-400">
            Mulai kelompokkan aktivitas dan tujuan Anda ke dalam domain kehidupan (mis. Karier, Belajar, Finansial).
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-500/25 hover:bg-violet-500"
          >
            <Icon name="plus" size={14} />
            Buat Bidang Pertama
          </button>
        </div>
      )}
    </div>
  );
}
