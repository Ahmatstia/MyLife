"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/ui/Icon";
import { useToast } from "@/app/components/ui/Toast";
import { Dialog } from "@/app/components/ui/Dialog";

type ActivityItem = {
  id: string;
  title: string;
  category: string;
  startTime: string | Date;
  endTime: string | Date;
  durationMinutes: number;
  productivityRating?: number | null;
  energyLevel?: number | null;
  notes?: string | null;
  task?: { id: string; title: string } | null;
  project?: { id: string; title: string } | null;
  area?: { id: string; name: string; color: string } | null;
};

type AreaItem = {
  id: string;
  name: string;
  color: string;
};

type ProjectItem = {
  id: string;
  title: string;
};

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: string; bg: string; border: string; text: string }
> = {
  WORK: {
    label: "Kerja",
    icon: "laptop_mac",
    bg: "bg-[#8B5CF6]/15",
    border: "border-[#8B5CF6]/30",
    text: "text-[#d0bcff]",
  },
  LEARNING: {
    label: "Belajar",
    icon: "menu_book",
    bg: "bg-[#0088cc]/15",
    border: "border-[#0088cc]/30",
    text: "text-[#38bdf8]",
  },
  HEALTH_FITNESS: {
    label: "Kebugaran",
    icon: "fitness_center",
    bg: "bg-[#10b981]/15",
    border: "border-[#10b981]/30",
    text: "text-[#4edea3]",
  },
  PERSONAL: {
    label: "Pribadi",
    icon: "person",
    bg: "bg-[#ec4899]/15",
    border: "border-[#ec4899]/30",
    text: "text-[#f472b6]",
  },
  REST: {
    label: "Istirahat",
    icon: "bedtime",
    bg: "bg-[#F59E0B]/15",
    border: "border-[#F59E0B]/30",
    text: "text-[#F59E0B]",
  },
  CHORE: {
    label: "Pekerjaan Rumah",
    icon: "home_repair_service",
    bg: "bg-[#64748b]/15",
    border: "border-[#64748b]/30",
    text: "text-[#94a3b8]",
  },
};

function getLocalDatetimeString(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} Menit`;
  const hrs = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hrs} Jam ${rem} Mnt` : `${hrs} Jam`;
}

export function ActivityManager({
  initialActivities,
  areas = [],
  projects = [],
}: {
  initialActivities: ActivityItem[];
  areas?: AreaItem[];
  projects?: ProjectItem[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);
  const [isLogging, setIsLogging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Form State (New Activity)
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("WORK");
  const [areaId, setAreaId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [productivityRating, setProductivityRating] = useState("3");
  const [energyLevel, setEnergyLevel] = useState("3");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Edit State
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("WORK");
  const [editAreaId, setEditAreaId] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editProductivity, setEditProductivity] = useState("3");
  const [editEnergy, setEditEnergy] = useState("3");
  const [editNotes, setEditNotes] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);

  // Quick helper to open log form
  const handleOpenLogForm = () => {
    if (!isLogging) {
      const now = new Date();
      const past = new Date(now.getTime() - 30 * 60 * 1000);
      setEndTime(getLocalDatetimeString(now));
      setStartTime(getLocalDatetimeString(past));
    }
    setIsLogging(!isLogging);
  };

  // Open Edit Modal
  const openEditModal = (act: ActivityItem) => {
    setEditingActivity(act);
    setEditTitle(act.title);
    setEditCategory(act.category);
    setEditAreaId(act.area?.id || "");
    setEditProjectId(act.project?.id || "");
    setEditStartTime(getLocalDatetimeString(new Date(act.startTime)));
    setEditEndTime(getLocalDatetimeString(new Date(act.endTime)));
    setEditProductivity(String(act.productivityRating || 3));
    setEditEnergy(String(act.energyLevel || 3));
    setEditNotes(act.notes || "");
  };

  // Create Activity
  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime) return;
    setLoading(true);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          areaId: areaId || undefined,
          projectId: projectId || undefined,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          productivityRating: Number(productivityRating),
          energyLevel: Number(energyLevel),
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal mencatat aktivitas");
      toast("Aktivitas berhasil dicatat!", "success");
      setTitle("");
      setStartTime("");
      setEndTime("");
      setNotes("");
      setAreaId("");
      setProjectId("");
      setIsLogging(false);
      setActivities((prev) => [data.data, ...prev]);
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal mencatat aktivitas", "error");
    } finally {
      setLoading(false);
    }
  }

  // Update Activity
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingActivity || !editTitle.trim() || !editStartTime || !editEndTime) return;
    setLoadingEdit(true);
    try {
      const res = await fetch(`/api/activities/${editingActivity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          category: editCategory,
          areaId: editAreaId || null,
          projectId: editProjectId || null,
          startTime: new Date(editStartTime).toISOString(),
          endTime: new Date(editEndTime).toISOString(),
          productivityRating: Number(editProductivity),
          energyLevel: Number(editEnergy),
          notes: editNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal memperbarui aktivitas");
      toast("Aktivitas berhasil diperbarui!", "success");
      setActivities((prev) => prev.map((a) => (a.id === editingActivity.id ? data.data : a)));
      setEditingActivity(null);
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal memperbarui aktivitas", "error");
    } finally {
      setLoadingEdit(false);
    }
  }

  // Delete Activity
  async function handleDelete(act: ActivityItem) {
    if (!confirm(`Hapus catatan aktivitas "${act.title}"?`)) return;
    try {
      const res = await fetch(`/api/activities/${act.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menghapus aktivitas");
      toast("Aktivitas dihapus", "success");
      setActivities((prev) => prev.filter((a) => a.id !== act.id));
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal menghapus aktivitas", "error");
    }
  }

  // Calculations & Filtering
  const totalMinutes = useMemo(
    () => activities.reduce((acc, a) => acc + (a.durationMinutes || 0), 0),
    [activities]
  );
  const formattedTotalDuration = useMemo(() => formatDuration(totalMinutes), [totalMinutes]);

  const avgProductivity = useMemo(() => {
    const rated = activities.filter((a) => a.productivityRating != null);
    if (rated.length === 0) return "-";
    return (rated.reduce((acc, a) => acc + (a.productivityRating || 0), 0) / rated.length).toFixed(1);
  }, [activities]);

  const avgEnergy = useMemo(() => {
    const rated = activities.filter((a) => a.energyLevel != null);
    if (rated.length === 0) return "-";
    return (rated.reduce((acc, a) => acc + (a.energyLevel || 0), 0) / rated.length).toFixed(1);
  }, [activities]);

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const matchesCategory = selectedCategory === "ALL" || act.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        act.title.toLowerCase().includes(q) ||
        (act.notes && act.notes.toLowerCase().includes(q)) ||
        (act.area?.name && act.area.name.toLowerCase().includes(q)) ||
        (act.project?.title && act.project.title.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [activities, selectedCategory, searchQuery]);

  return (
    <div className="flex flex-col w-full space-y-6 text-gray-200">
      {/* 1. Header & Telemetri Real-Time */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#94A3B8]">
            <span>MODUL // RIWAYAT & TRACKING</span>
            <span className="text-white/20">{"//"}</span>
            <span className="text-[#d0bcff]">SISTEM MYLIFE OS v4.2</span>
            <span className="text-white/20">{"//"}</span>
            <div className="flex items-center gap-1.5 rounded-full bg-[#4edea3]/10 px-2 py-0.5 text-[#4edea3]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
              <span className="font-semibold">LOG WAKTU REAL-TIME</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Aktivitas & Log Waktu
          </h1>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Riwayat telemetri harian untuk merekam alokasi waktu, tingkat energi, dan produktivitas Anda secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleOpenLogForm}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d0bcff] via-[#a078ff] to-[#7c3aed] text-white font-mono text-xs font-semibold shadow-md shadow-purple-500/20 hover:opacity-95 transition-all cursor-pointer"
          >
            <Icon name={isLogging ? "x" : "plus"} size={16} />
            <span>{isLogging ? "Batal" : "Catat Aktivitas"}</span>
          </button>
        </div>
      </section>

      {/* 2. Bento Telemetry Cards (4 Metrik Utama) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Durasi */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-5 shadow-lg relative overflow-hidden flex flex-col justify-between group hover:border-[#c0c1ff]/30 transition-all">
          <div className="flex items-center justify-between text-[#d0bcff] mb-2">
            <span className="p-2 rounded-xl bg-[#c0c1ff]/10 text-[#d0bcff] border border-[#c0c1ff]/20">
              <span className="material-symbols-outlined text-[18px]">pace</span>
            </span>
            <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">TOTAL INVESTASI</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{formattedTotalDuration}</div>
            <p className="text-xs text-gray-400 mt-1">Alokasi Waktu Kumulatif</p>
          </div>
        </div>

        {/* Card 2: Total Entri */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-5 shadow-lg relative overflow-hidden flex flex-col justify-between group hover:border-[#4edea3]/30 transition-all">
          <div className="flex items-center justify-between text-[#4edea3] mb-2">
            <span className="p-2 rounded-xl bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20">
              <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
            </span>
            <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">ENTRI LOG</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">{activities.length} Aktivitas</div>
            <p className="text-xs text-gray-400 mt-1">Sesi & Tugas Tercatat</p>
          </div>
        </div>

        {/* Card 3: Rata-Rata Produktivitas */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-5 shadow-lg relative overflow-hidden flex flex-col justify-between group hover:border-[#F59E0B]/30 transition-all">
          <div className="flex items-center justify-between text-[#F59E0B] mb-2">
            <span className="p-2 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">
              <span className="material-symbols-outlined text-[18px]">hotel_class</span>
            </span>
            <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">PRODUKTIVITAS</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {avgProductivity} <span className="text-sm font-normal text-gray-400">/ 5.0</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Rata-rata Skor Kualitas</p>
          </div>
        </div>

        {/* Card 4: Rata-Rata Energi */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-5 shadow-lg relative overflow-hidden flex flex-col justify-between group hover:border-[#38bdf8]/30 transition-all">
          <div className="flex items-center justify-between text-[#38bdf8] mb-2">
            <span className="p-2 rounded-xl bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20">
              <span className="material-symbols-outlined text-[18px]">bolt</span>
            </span>
            <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">STATUS ENERGI</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {avgEnergy} <span className="text-sm font-normal text-gray-400">/ 5.0</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Tingkat Daya Tahan</p>
          </div>
        </div>
      </section>

      {/* 3. Form Perekaman Aktivitas Baru (Inline Expandable Bento Card) */}
      {isLogging && (
        <section className="rounded-2xl bg-[#131825] border border-white/[0.08] p-6 shadow-2xl relative overflow-hidden transition-all">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-[#c0c1ff] uppercase tracking-wider">
                <span className="material-symbols-outlined text-[18px]">add_task</span>
                <span>Perekaman Aktivitas Baru</span>
              </div>
              <button
                type="button"
                onClick={() => setIsLogging(false)}
                className="text-gray-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleLog} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Judul Aktivitas */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase">
                    Judul Aktivitas *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Sprint Coding Modul Aktivitas / Riset UX"
                    required
                    autoFocus
                    className="w-full bg-[#0c0e14] text-white placeholder:text-gray-600 text-sm px-4 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#d0bcff] transition-all"
                  />
                </div>

                {/* Kategori */}
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#0c0e14] text-white text-xs font-mono px-3.5 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#d0bcff]"
                  >
                    <option value="WORK">Kerja (WORK)</option>
                    <option value="LEARNING">Belajar (LEARNING)</option>
                    <option value="HEALTH_FITNESS">Kebugaran & Kesehatan (HEALTH)</option>
                    <option value="PERSONAL">Pribadi (PERSONAL)</option>
                    <option value="REST">Istirahat & Rekreasi (REST)</option>
                    <option value="CHORE">Pekerjaan Rumah (CHORE)</option>
                  </select>
                </div>

                {/* Pilar Area */}
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase">
                    Pilar Hidup (Area)
                  </label>
                  <select
                    value={areaId}
                    onChange={(e) => setAreaId(e.target.value)}
                    className="w-full bg-[#0c0e14] text-white text-xs font-mono px-3.5 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#d0bcff]"
                  >
                    <option value="">-- Tanpa Pilar Khusus --</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Proyek Terkait */}
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase">
                    Inisiatif Proyek (Opsional)
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full bg-[#0c0e14] text-white text-xs font-mono px-3.5 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#d0bcff] truncate"
                  >
                    <option value="">-- Tidak Terhubung ke Proyek --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Waktu Mulai & Selesai */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase">Waktu Mulai</label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="w-full bg-[#0c0e14] text-white text-xs font-mono px-3 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#d0bcff]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase">Waktu Selesai</label>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="w-full bg-[#0c0e14] text-white text-xs font-mono px-3 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#d0bcff]"
                    />
                  </div>
                </div>

                {/* Rating Produktivitas (1-5) */}
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase">
                    Rating Produktivitas ({productivityRating}/5)
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setProductivityRating(String(val))}
                        className={`flex-1 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer border ${
                          productivityRating === String(val)
                            ? "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/50 shadow-sm"
                            : "bg-[#0c0e14] text-gray-400 border-white/[0.08] hover:border-white/20"
                        }`}
                      >
                        ⭐ {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tingkat Energi (1-5) */}
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase">
                    Tingkat Energi ({energyLevel}/5)
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setEnergyLevel(String(val))}
                        className={`flex-1 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer border ${
                          energyLevel === String(val)
                            ? "bg-[#38bdf8]/20 text-[#38bdf8] border-[#38bdf8]/50 shadow-sm"
                            : "bg-[#0c0e14] text-gray-400 border-white/[0.08] hover:border-white/20"
                        }`}
                      >
                        ⚡ {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Catatan / Refleksi */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase">
                    Catatan & Refleksi (Opsional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan ringkas, pencapaian penting, atau evaluasi fokus..."
                    rows={2}
                    className="w-full bg-[#0c0e14] text-white text-xs px-4 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#d0bcff] transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsLogging(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim() || !startTime || !endTime}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#d0bcff] via-[#a078ff] to-[#7c3aed] text-white font-mono text-xs font-semibold shadow-md shadow-purple-500/20 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>{loading ? "Menyimpan..." : "Simpan Aktivitas"}</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* 4. Filter, Pencarian & Kategori Pills */}
      <section className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 material-symbols-outlined text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari aktivitas, catatan, atau pilar..."
            className="w-full bg-[#131825] text-white placeholder:text-gray-500 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-white/[0.08] focus:outline-none focus:border-[#d0bcff] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <Icon name="x" size={14} />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer shrink-0 border ${
              selectedCategory === "ALL"
                ? "bg-[#c0c1ff]/20 text-[#c0c1ff] border-[#c0c1ff]/40"
                : "bg-[#131825] text-gray-400 border-white/[0.06] hover:text-white hover:border-white/[0.15]"
            }`}
          >
            Semua ({activities.length})
          </button>
          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
            const count = activities.filter((a) => a.category === key).length;
            const isSelected = selectedCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedCategory(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer shrink-0 border flex items-center gap-1.5 ${
                  isSelected
                    ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                    : "bg-[#131825] text-gray-400 border-white/[0.06] hover:text-white hover:border-white/[0.15]"
                }`}
              >
                <span>{cfg.label}</span>
                <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. Daftar Log Aktivitas (Stitch Obsidian Bento Cards) */}
      <section className="space-y-3">
        {filteredActivities.map((act) => {
          const cfg = CATEGORY_CONFIG[act.category] || CATEGORY_CONFIG.WORK;
          const isTaskCompletion = act.title.startsWith("Task Selesai:");
          const startDate = new Date(act.startTime);

          return (
            <div
              key={act.id}
              className="rounded-2xl border border-white/[0.08] bg-[#131825] p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-[#c0c1ff]/30 hover:bg-[#161B2B] transition-all relative overflow-hidden"
            >
              <div className="flex items-start gap-4 min-w-0 flex-1">
                {/* Category / Status Icon */}
                <div
                  className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center border shadow-xs ${
                    isTaskCompletion
                      ? "bg-[#00a572]/15 border-[#00a572]/30 text-[#4edea3]"
                      : `${cfg.bg} ${cfg.border} ${cfg.text}`
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {isTaskCompletion ? "task_alt" : cfg.icon}
                  </span>
                </div>

                <div className="space-y-1.5 min-w-0 flex-1">
                  {/* Category & Project Label */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider border ${
                        isTaskCompletion
                          ? "bg-[#00a572]/15 text-[#4edea3] border-[#00a572]/30"
                          : `${cfg.bg} ${cfg.text} ${cfg.border}`
                      }`}
                    >
                      {act.category}
                    </span>

                    {act.area && (
                      <span
                        className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: `${act.area.color}15`,
                          color: act.area.color,
                          borderColor: `${act.area.color}30`,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: act.area.color }}
                        />
                        <span>{act.area.name}</span>
                      </span>
                    )}

                    {act.project && (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-gray-400 bg-[#0c0e14] px-2 py-0.5 rounded border border-white/[0.06] truncate max-w-[200px]">
                        <span className="material-symbols-outlined text-[12px] text-[#c0c1ff]">folder</span>
                        <span>{act.project.title}</span>
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-white group-hover:text-[#d0bcff] transition-colors truncate">
                    {act.title}
                  </h3>

                  {/* Notes */}
                  {act.notes && (
                    <p className="text-xs text-gray-400 font-mono leading-relaxed line-clamp-2">
                      {act.notes}
                    </p>
                  )}

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono">
                    <span className="inline-flex items-center gap-1 text-[#F59E0B]">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      <span>{formatDuration(act.durationMinutes)}</span>
                    </span>

                    <span className="text-gray-600">•</span>

                    <span className="inline-flex items-center gap-1 text-[#c0c1ff]">
                      <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                      <span>
                        {startDate.toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                        ,{" "}
                        {startDate.toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>

                    {act.productivityRating != null && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span className="text-amber-400 inline-flex items-center gap-1">
                          <span>⭐</span>
                          <span>Produktivitas: {act.productivityRating}/5</span>
                        </span>
                      </>
                    )}

                    {act.energyLevel != null && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span className="text-cyan-400 inline-flex items-center gap-1">
                          <span>⚡</span>
                          <span>Energi: {act.energyLevel}/5</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-1 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/[0.04]">
                <button
                  type="button"
                  onClick={() => openEditModal(act)}
                  className="p-2 text-gray-400 hover:text-[#c0c1ff] hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer"
                  title="Sunting catatan aktivitas"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(act)}
                  className="p-2 text-gray-400 hover:text-[#F43F5E] hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                  title="Hapus aktivitas"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {filteredActivities.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/[0.1] p-12 text-center bg-[#131825]/40 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#1e1f26] flex items-center justify-center text-gray-400">
              <span className="material-symbols-outlined text-[24px]">history_toggle_off</span>
            </div>
            <div className="space-y-1 max-w-sm">
              <p className="text-sm font-semibold text-white">Tidak ada aktivitas ditemukan</p>
              <p className="text-xs font-mono text-gray-400">
                {searchQuery || selectedCategory !== "ALL"
                  ? "Coba sesuaikan kata kunci pencarian atau filter kategori Anda."
                  : "Mulai rekam waktu dan tingkat energi aktivitas harian Anda."}
              </p>
            </div>
            {!isLogging && (
              <button
                type="button"
                onClick={handleOpenLogForm}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#d0bcff] via-[#a078ff] to-[#7c3aed] text-white font-mono text-xs font-semibold shadow-md shadow-purple-500/20 hover:opacity-95 transition-all cursor-pointer"
              >
                <Icon name="plus" size={14} />
                <span>Catat Aktivitas Pertama</span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* 6. Dialog Modal Edit Aktivitas */}
      <Dialog
        open={Boolean(editingActivity)}
        onClose={() => setEditingActivity(null)}
        title="Sunting Log Aktivitas"
        description="Perbarui informasi telemetri alokasi waktu dan energi ini."
      >
        <form onSubmit={handleUpdate} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">Judul Aktivitas</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
              className="w-full bg-[#0c0e14] text-white text-sm px-3.5 py-2 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#d0bcff]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Kategori</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full bg-[#0c0e14] text-white text-xs font-mono px-3 py-2 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#d0bcff]"
              >
                <option value="WORK">Kerja (WORK)</option>
                <option value="LEARNING">Belajar (LEARNING)</option>
                <option value="HEALTH_FITNESS">Kebugaran (HEALTH)</option>
                <option value="PERSONAL">Pribadi (PERSONAL)</option>
                <option value="REST">Istirahat (REST)</option>
                <option value="CHORE">Pekerjaan Rumah (CHORE)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Pilar Area</label>
              <select
                value={editAreaId}
                onChange={(e) => setEditAreaId(e.target.value)}
                className="w-full bg-[#0c0e14] text-white text-xs font-mono px-3 py-2 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#d0bcff]"
              >
                <option value="">-- Tanpa Pilar --</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Waktu Mulai</label>
              <input
                type="datetime-local"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                required
                className="w-full bg-[#0c0e14] text-white text-xs font-mono px-3 py-2 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#d0bcff]"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Waktu Selesai</label>
              <input
                type="datetime-local"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                required
                className="w-full bg-[#0c0e14] text-white text-xs font-mono px-3 py-2 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#d0bcff]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">
                Produktivitas ({editProductivity}/5)
              </label>
              <select
                value={editProductivity}
                onChange={(e) => setEditProductivity(e.target.value)}
                className="w-full bg-[#0c0e14] text-white text-xs font-mono px-3 py-2 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#d0bcff]"
              >
                <option value="1">1 - Sangat Rendah</option>
                <option value="2">2 - Rendah</option>
                <option value="3">3 - Sedang</option>
                <option value="4">4 - Tinggi</option>
                <option value="5">5 - Sangat Produktif</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">
                Tingkat Energi ({editEnergy}/5)
              </label>
              <select
                value={editEnergy}
                onChange={(e) => setEditEnergy(e.target.value)}
                className="w-full bg-[#0c0e14] text-white text-xs font-mono px-3 py-2 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#d0bcff]"
              >
                <option value="1">1 - Lelah / Habis</option>
                <option value="2">2 - Lesu</option>
                <option value="3">3 - Normal</option>
                <option value="4">4 - Berenergi</option>
                <option value="5">5 - Penuh Semangat</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">Catatan</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={2}
              className="w-full bg-[#0c0e14] text-white text-xs px-3.5 py-2 rounded-xl border border-white/[0.1] focus:outline-none focus:border-[#d0bcff]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setEditingActivity(null)}
              className="px-4 py-2 rounded-xl text-xs font-mono text-gray-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loadingEdit || !editTitle.trim()}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white font-mono text-xs font-semibold hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loadingEdit ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
