"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/ui/Icon";
import { useToast } from "@/app/components/ui/Toast";

type ObjectiveItem = {
  id: string;
  title: string;
  description?: string | null;
  targetValue: number;
  currentValue: number;
  unit: string;
  status: string;
  dueDate?: string | Date | null;
};

export function ObjectivesSection({
  goalId,
  initialObjectives,
}: {
  goalId: string;
  initialObjectives: ObjectiveItem[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [targetValue, setTargetValue] = useState("100");
  const [currentValue, setCurrentValue] = useState("0");
  const [unit, setUnit] = useState("%");
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId,
          title: title.trim(),
          targetValue: Number(targetValue) || 100,
          currentValue: Number(currentValue) || 0,
          unit: unit.trim() || "%",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal membuat objective");
      toast("Objective berhasil ditambahkan", "success");
      setTitle("");
      setIsAdding(false);
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal membuat objective", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleIncrement(obj: ObjectiveItem, delta: number) {
    const nextVal = Math.max(0, obj.currentValue + delta);
    try {
      const res = await fetch(`/api/objectives/${obj.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentValue: nextVal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal memperbarui nilai");
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal memperbarui nilai", "error");
    }
  }

  async function handleDelete(obj: ObjectiveItem) {
    if (!confirm(`Hapus objective "${obj.title}"?`)) return;
    try {
      const res = await fetch(`/api/objectives/${obj.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menghapus objective");
      toast("Objective dihapus", "success");
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal menghapus objective", "error");
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-purple-400 text-[20px]">flag</span>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Sasaran Terukur (Key Results)</h3>
            <p className="text-xs text-gray-400">Hasil kuantitatif yang membuktikan pencapaian sasaran ini.</p>
          </div>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 text-xs font-mono font-semibold text-purple-300 hover:bg-purple-500/20 transition-all"
        >
          <Icon name={isAdding ? "x" : "plus"} size={14} />
          {isAdding ? "Batal" : "Tambah Target"}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="rounded-xl border border-white/[0.08] bg-[#0B0D13] p-4 space-y-3">
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">Hasil Terukur</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: 100 Pengguna Terdaftar di Private Beta"
              required
              className="w-full rounded-lg border border-white/[0.1] bg-[#131825] px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-400"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Nilai Saat Ini</label>
              <input
                type="number"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#131825] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Target</label>
              <input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                required
                className="w-full rounded-lg border border-white/[0.1] bg-[#131825] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Satuan</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="%, akun, ms"
                className="w-full rounded-lg border border-white/[0.1] bg-[#131825] px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-white/[0.05]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-[0_0_12px_rgba(168,85,247,0.4)]"
            >
              {loading ? "Menyimpan..." : "Simpan Target"}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {initialObjectives.map((obj) => {
          const pct = Math.min(100, Math.round((obj.currentValue / (obj.targetValue || 1)) * 100));
          const isDone = obj.status === "COMPLETED" || pct >= 100;
          return (
            <div
              key={obj.id}
              className={`rounded-xl border p-4 shadow-sm flex flex-col justify-between gap-3 ${
                isDone
                  ? "bg-[#131825] border-emerald-500/30"
                  : "bg-[#0B0D13]/70 border-white/[0.08]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                      KR // TERUKUR
                    </span>
                    {isDone ? (
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        TERLAMPAUI
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                        BERJALAN
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-white line-clamp-2">
                    {obj.title}
                  </h4>
                  <span className="text-xs font-mono text-gray-400 mt-1 block">
                    {obj.currentValue} / {obj.targetValue} {obj.unit} ({pct}%)
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleIncrement(obj, 1)}
                    className="rounded bg-white/[0.06] hover:bg-white/[0.12] px-2 py-0.5 text-xs font-mono font-bold text-gray-200 transition-colors"
                    title="+1"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => handleIncrement(obj, 5)}
                    className="rounded bg-white/[0.06] hover:bg-white/[0.12] px-2 py-0.5 text-xs font-mono font-bold text-gray-200 transition-colors"
                    title="+5"
                  >
                    +5
                  </button>
                  <button
                    onClick={() => handleDelete(obj)}
                    className="rounded p-1 text-gray-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                    title="Hapus"
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isDone
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(78,222,163,0.5)]"
                        : "bg-gradient-to-r from-purple-500 to-indigo-400 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {initialObjectives.length === 0 && !isAdding && (
          <p className="text-xs font-mono text-gray-500 py-2 col-span-full">
            Belum ada target terukur (Objectives) untuk goal ini. Klik &apos;Tambah Target&apos; untuk mendefinisikan Key Results.
          </p>
        )}
      </div>
    </div>
  );
}
