"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/ui/Icon";
import { useToast } from "@/app/components/ui/Toast";

type ProjectItem = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  targetDate?: string | Date | null;
  goal?: { id: string; title: string } | null;
  area?: { id: string; name: string; color: string } | null;
  _count?: {
    milestones: number;
    tasks: number;
  };
};

type OptionItem = { id: string; title?: string; name?: string };

export function ProjectsManager({
  initialProjects,
  goals,
  areas,
}: {
  initialProjects: ProjectItem[];
  goals: OptionItem[];
  areas: OptionItem[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalId, setGoalId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [targetDate, setTargetDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          goalId: goalId || null,
          areaId: areaId || null,
          priority,
          targetDate: targetDate ? new Date(targetDate).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal membuat project");
      toast("Proyek berhasil dibuat", "success");
      setTitle("");
      setDescription("");
      setGoalId("");
      setAreaId("");
      setTargetDate("");
      setIsCreating(false);
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal membuat project", "error");
    } finally {
      setLoading(false);
    }
  }

  const priorityColor = (p: string) => {
    switch (p) {
      case "URGENT":
        return "text-[#F43F5E] bg-[#F43F5E]/15 border-[#F43F5E]/30";
      case "HIGH":
        return "text-[#F59E0B] bg-[#F59E0B]/15 border-[#F59E0B]/30";
      case "LOW":
        return "text-gray-400 bg-white/[0.05] border-white/[0.08]";
      default:
        return "text-[#c0c1ff] bg-[#c0c1ff]/15 border-[#c0c1ff]/30";
    }
  };

  return (
    <div className="space-y-6 text-gray-200">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-xs font-mono text-gray-400">
            INISIATIF EKSEKUSI // TONGGAK CAPAIAN &amp; TUGAS TERSTRUKTUR
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-mono font-semibold text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] hover:brightness-110 transition-all"
        >
          <Icon name={isCreating ? "x" : "plus"} size={14} />
          {isCreating ? "Batal" : "Proyek Baru"}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-white/[0.08] bg-[#131825] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2 font-mono">
              <span className="material-symbols-outlined text-purple-400 text-[18px]">add_box</span>
              BUAT PROYEK STRATEGIS BARU
            </h3>
            <span className="text-[11px] font-mono text-gray-500">PARAMETER INSIATIF</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono text-gray-400 mb-1">Judul Proyek</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Revamp Landing Page & Optimasi Konversi V2"
                required
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Prioritas</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
              >
                <option value="LOW">Rendah (LOW)</option>
                <option value="MEDIUM">Sedang (MEDIUM)</option>
                <option value="HIGH">Tinggi (HIGH)</option>
                <option value="URGENT">Mendesak (URGENT)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Target Selesai (Opsional)</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Hubungkan ke Goal (Opsional)</label>
              <select
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
              >
                <option value="">-- Tanpa Goal Khusus --</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title || g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Hubungkan ke Bidang Hidup (Opsional)</label>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
              >
                <option value="">-- Tanpa Bidang Khusus --</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono text-gray-400 mb-1">Deskripsi &amp; Lingkup Kerja (Opsional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Rincian lingkup kerja, hasil akhir yang diharapkan, dan dependensi..."
                rows={2}
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="rounded-lg px-4 py-2 text-xs font-mono text-gray-400 hover:bg-white/[0.05]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-mono font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            >
              {loading ? "Menyimpan..." : "Simpan Proyek"}
            </button>
          </div>
        </form>
      )}

      {/* Grid of Projects */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {initialProjects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="group rounded-2xl border border-white/[0.08] bg-[#131825] p-5 shadow-sm hover:border-purple-500/40 hover:bg-[#1A2133]/60 transition-all flex flex-col justify-between relative overflow-hidden"
          >
            {/* Ambient top right glow */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-md bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-[10px] font-mono font-bold tracking-wide text-gray-300 uppercase">
                  {p.status === "ACTIVE" || p.status === "IN_PROGRESS" ? "SEDANG BERJALAN" : p.status}
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${priorityColor(p.priority)}`}>
                  {p.priority}
                </span>
              </div>
              <h4 className="mt-3 text-base font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2 leading-tight">
                {p.title}
              </h4>
              {p.description && (
                <p className="mt-1.5 text-xs text-gray-400 line-clamp-2 leading-relaxed">
                  {p.description}
                </p>
              )}
            </div>

            <div className="mt-5 pt-3.5 border-t border-white/[0.06] space-y-2.5 text-xs">
              <div className="flex items-center justify-between font-mono text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-purple-400">alt_route</span>
                  {p._count?.milestones ?? 0} Tonggak
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-emerald-400">task_alt</span>
                  {p._count?.tasks ?? 0} Tugas
                </span>
              </div>

              {(p.goal || p.area) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {p.area && (
                    <span
                      className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono"
                      style={{
                        backgroundColor: `${p.area.color}15`,
                        color: p.area.color,
                        border: `1px solid ${p.area.color}30`,
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.area.color }} />
                      {p.area.name}
                    </span>
                  )}
                  {p.goal && (
                    <span className="rounded px-2 py-0.5 text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20 truncate max-w-[180px]">
                      🎯 {p.goal.title}
                    </span>
                  )}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {initialProjects.length === 0 && !isCreating && (
        <div className="rounded-2xl border border-dashed border-white/[0.1] p-10 text-center bg-[#131825]/40">
          <span className="material-symbols-outlined text-4xl text-gray-500 mb-2">biotech</span>
          <p className="text-sm font-semibold text-white">Belum ada Proyek terdaftar</p>
          <p className="mt-1 text-xs font-mono text-gray-400">
            Buat inisiatif proyek untuk memecah target strategis menjadi tahapan tonggak capaian yang konkret.
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-mono font-semibold text-white shadow-sm hover:bg-purple-500 transition-colors"
          >
            <Icon name="plus" size={14} />
            Buat Proyek Pertama
          </button>
        </div>
      )}
    </div>
  );
}
