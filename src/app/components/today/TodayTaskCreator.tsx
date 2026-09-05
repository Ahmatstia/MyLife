"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/ui/Icon";
import { useToast } from "@/app/components/ui/Toast";

interface AreaOption {
  id: string;
  name: string;
  color: string;
}

interface ProjectOption {
  id: string;
  title: string;
}

interface Props {
  areas: AreaOption[];
  projects: ProjectOption[];
}

export function TodayTaskCreator({ areas, projects }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [estimatedHours, setEstimatedHours] = useState(1);
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [parentType, setParentType] = useState<"area" | "project" | "none">(
    areas.length > 0 ? "area" : projects.length > 0 ? "project" : "none"
  );
  const [selectedAreaId, setSelectedAreaId] = useState<string>(areas[0]?.id || "");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || "");
  const [addToDailyFocus, setAddToDailyFocus] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const todayIso = new Date().toISOString();
      const payload: Record<string, unknown> = {
        title: title.trim(),
        estimatedHours,
        priority,
        dueDate: todayIso,
        scheduledDate: todayIso,
      };

      if (parentType === "area" && selectedAreaId) {
        payload.areaId = selectedAreaId;
      } else if (parentType === "project" && selectedProjectId) {
        payload.projectId = selectedProjectId;
      }

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal membuat task baru.");
      }

      const createdTask = data.data;

      // Automatically add to daily focus if checked
      if (addToDailyFocus && createdTask?.id) {
        try {
          await fetch("/api/today/focus", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId: createdTask.id }),
          });
        } catch {
          // ignore error if focus list full
        }
      }

      toast("Tugas hari ini berhasil dibuat!", "success");
      setTitle("");
      setEstimatedHours(1);
      setIsOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-warning-200/80 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning-100 text-warning-700">
            <Icon name="sun" size={14} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-surface-900">Catat Tugas Hari Ini</h3>
            <p className="text-xs text-surface-500">
              Buat tugas yang harus dieksekusi hari ini lengkap dengan perkiraan waktu.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-warning-200 bg-warning-50 px-3 py-1.5 text-xs font-semibold text-warning-800 hover:bg-warning-100 transition"
        >
          <Icon name={isOpen ? "chevronUp" : "plus"} size={13} />
          {isOpen ? "Tutup" : "Tugas Baru"}
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 border-t border-surface-150 pt-3.5">
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">
              Judul Tugas Hari Ini
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Selesaikan draft proposal untuk klien, review PR tim..."
              className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:border-warning-500 focus:bg-white focus:ring-2 focus:ring-warning-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Estimasi Jam */}
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                Estimasi Waktu
              </label>
              <select
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(Number(e.target.value))}
                className="w-full rounded-xl border border-surface-200 bg-white px-2.5 py-1.5 text-xs text-surface-800"
              >
                <option value={0.5}>30 Menit (0.5 jam)</option>
                <option value={1}>1 Jam</option>
                <option value={1.5}>1.5 Jam</option>
                <option value={2}>2 Jam</option>
                <option value={3}>3 Jam</option>
                <option value={4}>4 Jam</option>
              </select>
            </div>

            {/* Prioritas */}
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                Prioritas
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="w-full rounded-xl border border-surface-200 bg-white px-2.5 py-1.5 text-xs text-surface-800"
              >
                <option value="LOW">Rendah (Low)</option>
                <option value="MEDIUM">Sedang (Medium)</option>
                <option value="HIGH">Tinggi (High)</option>
                <option value="URGENT">Mendesak (Urgent)</option>
              </select>
            </div>

            {/* Kaitkan ke Pilar / Proyek */}
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                Kaitkan ke Pilar / Proyek
              </label>
              <select
                value={parentType === "area" ? `area:${selectedAreaId}` : parentType === "project" ? `project:${selectedProjectId}` : "none"}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "none") {
                    setParentType("none");
                  } else if (val.startsWith("area:")) {
                    setParentType("area");
                    setSelectedAreaId(val.replace("area:", ""));
                  } else if (val.startsWith("project:")) {
                    setParentType("project");
                    setSelectedProjectId(val.replace("project:", ""));
                  }
                }}
                className="w-full rounded-xl border border-surface-200 bg-white px-2.5 py-1.5 text-xs text-surface-800"
              >
                {areas.length > 0 && (
                  <optgroup label="Pilar Area Hidup">
                    {areas.map((a) => (
                      <option key={a.id} value={`area:${a.id}`}>
                        📍 {a.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {projects.length > 0 && (
                  <optgroup label="Proyek Aktif">
                    {projects.map((p) => (
                      <option key={p.id} value={`project:${p.id}`}>
                        📁 {p.title}
                      </option>
                    ))}
                  </optgroup>
                )}
                <option value="none">-- Mandiri (Tanpa Induk) --</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-surface-700 select-none">
              <input
                type="checkbox"
                checked={addToDailyFocus}
                onChange={(e) => setAddToDailyFocus(e.target.checked)}
                className="h-4 w-4 rounded border-surface-300 text-warning-600 focus:ring-warning-500"
              />
              <span>Langsung masukkan ke daftar Fokus Hari Ini</span>
            </label>

            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-warning-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-warning-700 transition disabled:opacity-50"
            >
              {loading ? (
                "Menyimpan…"
              ) : (
                <>
                  <Icon name="plus" size={14} />
                  Simpan Tugas Hari Ini
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
