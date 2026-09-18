"use client";

import { useState } from "react";
import Link from "next/link";
import { formatRelativeTime, formatDuration } from "@/lib/format";
import { useToast } from "@/app/components/ui/Toast";

export type ActivityFeedType = "TASK_COMPLETED" | "FOCUS_SESSION" | "ACTIVITY" | "CAPTURE";

export type ActivityFeedItem = {
  id: string;
  type: ActivityFeedType;
  title: string;
  category?: string;
  timestamp: string; // ISO string
  durationMinutes?: number;
  xp?: string;
  notes?: string | null;
  linkUrl?: string;
};

interface AreaOption {
  id: string;
  name: string;
  color?: string;
}

interface ProjectOption {
  id: string;
  title: string;
}

interface RecentActivityFeedProps {
  activities: ActivityFeedItem[];
  areas?: AreaOption[];
  projects?: ProjectOption[];
  onActivityAdded?: (newActivity: ActivityFeedItem) => void;
  className?: string;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  WORK: { bg: "bg-[#8B5CF6]/15", text: "text-[#d0bcff]", border: "border-[#8B5CF6]/30", icon: "laptop_mac" },
  LEARNING: { bg: "bg-sky-500/15", text: "text-sky-300", border: "border-sky-500/30", icon: "menu_book" },
  HEALTH_FITNESS: { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/30", icon: "fitness_center" },
  PERSONAL: { bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/30", icon: "favorite" },
  REST: { bg: "bg-teal-500/15", text: "text-teal-300", border: "border-teal-500/30", icon: "self_improvement" },
  CHORE: { bg: "bg-slate-500/15", text: "text-slate-300", border: "border-slate-500/30", icon: "task_alt" },
};

export function RecentActivityFeed({
  activities: initialActivities,
  areas = [],
  projects = [],
  onActivityAdded,
  className = "",
}: RecentActivityFeedProps) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"ALL" | "TASK" | "FOCUS" | "ACTIVITY" | "CAPTURE">("ALL");
  const [activitiesList, setActivitiesList] = useState<ActivityFeedItem[]>(initialActivities);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for quick logging
  const [actTitle, setActTitle] = useState("");
  const [actCategory, setActCategory] = useState<"WORK" | "LEARNING" | "HEALTH_FITNESS" | "PERSONAL" | "REST" | "CHORE">("WORK");
  const [actDuration, setActDuration] = useState<number>(30);
  const [actAreaId, setActAreaId] = useState<string>("");
  const [actProjectId, setActProjectId] = useState<string>("");
  const [actNotes, setActNotes] = useState<string>("");

  // Sync if prop updates
  if (initialActivities.length > activitiesList.length) {
    setActivitiesList(initialActivities);
  }

  const filtered = activitiesList.filter((item) => {
    if (filter === "ALL") return true;
    if (filter === "TASK") return item.type === "TASK_COMPLETED";
    if (filter === "FOCUS") return item.type === "FOCUS_SESSION";
    if (filter === "ACTIVITY") return item.type === "ACTIVITY";
    if (filter === "CAPTURE") return item.type === "CAPTURE";
    return true;
  });

  async function handleQuickLog(e: React.FormEvent) {
    e.preventDefault();
    if (!actTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - actDuration * 60000).toISOString();
      const endTime = now.toISOString();

      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: actTitle.trim(),
          category: actCategory,
          startTime,
          endTime,
          durationMinutes: actDuration,
          areaId: actAreaId || null,
          projectId: actProjectId || null,
          notes: actNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Gagal mencatat aktivitas");
      }

      const newItem: ActivityFeedItem = {
        id: `act-${data.data.id}`,
        type: "ACTIVITY",
        title: actTitle.trim(),
        category: actCategory,
        timestamp: endTime,
        durationMinutes: actDuration,
        xp: `+${Math.round(actDuration * 1.5)} XP`,
        notes: actNotes.trim() || undefined,
        linkUrl: actProjectId ? `/projects/${actProjectId}` : undefined,
      };

      setActivitiesList((prev) => [newItem, ...prev]);
      if (onActivityAdded) onActivityAdded(newItem);

      toast("Aktivitas berhasil dicatat!", "success");
      setActTitle("");
      setActNotes("");
      setIsModalOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menyimpan aktivitas", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  function getIconAndBadge(item: ActivityFeedItem) {
    switch (item.type) {
      case "TASK_COMPLETED":
        return {
          icon: "check_circle",
          nodeBg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
          tagBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          typeLabel: "Tugas Selesai",
        };
      case "FOCUS_SESSION":
        return {
          icon: "timer",
          nodeBg: "bg-purple-500/20 text-purple-300 border-purple-500/30",
          tagBg: "bg-purple-500/10 text-purple-300 border-purple-500/20",
          typeLabel: "Sesi Fokus",
        };
      case "CAPTURE":
        return {
          icon: "bolt",
          nodeBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
          tagBg: "bg-amber-500/10 text-amber-300 border-amber-500/20",
          typeLabel: "Catatan Cepat",
        };
      case "ACTIVITY":
      default: {
        const cat = CATEGORY_STYLES[item.category || "WORK"] || CATEGORY_STYLES.WORK;
        return {
          icon: cat.icon,
          nodeBg: `${cat.bg} ${cat.text} ${cat.border}`,
          tagBg: `${cat.bg} ${cat.text} ${cat.border}`,
          typeLabel: item.category ? item.category.replace("_", " ") : "Aktivitas",
        };
      }
    }
  }

  return (
    <>
      <section
        className={`p-6 rounded-3xl bg-white/90 dark:bg-[#131825]/90 border border-slate-200/80 dark:border-white/10 shadow-sm dark:shadow-xl flex flex-col gap-4 relative overflow-hidden ${className}`}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between gap-3 pb-1 border-b border-slate-200/70 dark:border-white/[0.06] relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-[#8B5CF6] dark:text-[#d0bcff] flex items-center justify-center border border-purple-500/20">
              <span className="material-symbols-outlined text-[18px]">history</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Aktivitas Terbaru
                </h3>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-[#8B5CF6] dark:text-[#d0bcff] border border-purple-500/30 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
              title="Catat aktivitas manual"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              <span>Catat</span>
            </button>

            <Link
              href="/progress?tab=log"
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/[0.12] transition-colors"
              title="Buka riwayat aktivitas lengkap"
              aria-label="Buka riwayat aktivitas lengkap"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            </Link>
          </div>
        </div>

        {/* ── FILTER CHIPS ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: "ALL", label: "Semua" },
            { id: "TASK", label: "Tugas" },
            { id: "FOCUS", label: "Fokus" },
            { id: "ACTIVITY", label: "Aktivitas" },
            { id: "CAPTURE", label: "Catatan" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as typeof filter)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                filter === tab.id
                  ? "bg-[#8B5CF6] text-white shadow-xs"
                  : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TIMELINE LIST ── */}
        <div className="relative flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
          {filtered.length > 0 ? (
            filtered.slice(0, 10).map((item, idx) => {
              const style = getIconAndBadge(item);
              const isLast = idx === Math.min(filtered.length, 10) - 1;

              return (
                <div key={item.id} className="relative flex items-start gap-3 group">
                  {/* Vertical connecting line */}
                  {!isLast && (
                    <span className="absolute left-3.5 top-7 bottom-0 w-[1.5px] bg-slate-200 dark:bg-white/[0.08]" />
                  )}

                  {/* Icon Node */}
                  <div
                    className={`relative z-10 w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border text-[14px] shadow-xs transition-transform group-hover:scale-105 ${style.nodeBg}`}
                  >
                    <span className="material-symbols-outlined text-[14px]">{style.icon}</span>
                  </div>

                  {/* Content Container */}
                  <div className="flex-1 min-w-0 p-2.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05] group-hover:border-purple-500/25 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      {item.linkUrl ? (
                        <Link
                          href={item.linkUrl}
                          className="text-xs font-semibold text-slate-800 dark:text-zinc-200 hover:text-[#8B5CF6] dark:hover:text-[#d0bcff] truncate transition-colors"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
                          {item.title}
                        </span>
                      )}

                      <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-400 shrink-0 whitespace-nowrap">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>

                    {/* Meta details & chips */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px]">
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${style.tagBg}`}>
                        {style.typeLabel}
                      </span>

                      {item.durationMinutes && item.durationMinutes > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-white/[0.06] text-slate-700 dark:text-zinc-300 font-mono text-[10px]">
                          ⏱ {formatDuration(item.durationMinutes)}
                        </span>
                      )}

                      {item.xp && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                          {item.xp}
                        </span>
                      )}

                      {item.category && item.category !== style.typeLabel && (
                        <span className="text-slate-500 dark:text-zinc-400 text-[10px] truncate max-w-[120px]">
                          📁 {item.category}
                        </span>
                      )}
                    </div>

                    {item.notes && (
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400 italic line-clamp-2">
                        &ldquo;{item.notes}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 px-4 text-center flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.01]">
              <span className="w-10 h-10 rounded-2xl bg-purple-500/10 text-[#8B5CF6] dark:text-[#d0bcff] flex items-center justify-center text-lg">
                🌱
              </span>
              <p className="text-xs font-bold text-slate-800 dark:text-white">
                Belum ada aktivitas terekam
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 max-w-xs leading-relaxed">
                Selesaikan tugas, mulai sesi fokus, atau catat aktivitas untuk mengabadikan jejak langkah Anda.
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-1 px-3 py-1.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7c3aed] text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
              >
                Catat Aktivitas Sekarang
              </button>
            </div>
          )}
        </div>

        {/* Footer Link to /progress?tab=log */}
        <div className="pt-2 border-t border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
          <span>Total {activitiesList.length} aktivitas terdaftar</span>
          <Link
            href="/progress?tab=log"
            className="font-semibold text-[#8B5CF6] dark:text-[#d0bcff] hover:underline flex items-center gap-1"
          >
            Semua Riwayat →
          </Link>
        </div>
      </section>

      {/* ── MODAL: CATAT AKTIVITAS CEPAT ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#131825] border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col gap-4 text-slate-800 dark:text-[#e2e2eb]">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8B5CF6] text-[22px]">history_edu</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Catat Aktivitas Cepat
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleQuickLog} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700 dark:text-[#d0bcff]">
                  Nama Aktivitas
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  placeholder="Contoh: Belajar Next.js, Olahraga Pagi, Rapat Tim..."
                  className="w-full bg-slate-50 dark:bg-[#1a2133] p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#d0bcff]">
                    Kategori
                  </label>
                  <select
                    value={actCategory}
                    onChange={(e) => setActCategory(e.target.value as typeof actCategory)}
                    className="w-full bg-slate-50 dark:bg-[#1a2133] p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#8B5CF6] cursor-pointer"
                  >
                    <option value="WORK">💼 Pekerjaan</option>
                    <option value="LEARNING">📚 Pembelajaran</option>
                    <option value="HEALTH_FITNESS">🏃 Kebugaran</option>
                    <option value="PERSONAL">🌟 Pribadi</option>
                    <option value="REST">☕ Istirahat</option>
                    <option value="CHORE">🧹 Tugas Rumah</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#d0bcff]">
                    Durasi
                  </label>
                  <select
                    value={actDuration}
                    onChange={(e) => setActDuration(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-[#1a2133] p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#8B5CF6] cursor-pointer"
                  >
                    <option value={15}>15 menit</option>
                    <option value={25}>25 menit (Pomodoro)</option>
                    <option value={30}>30 menit</option>
                    <option value={45}>45 menit</option>
                    <option value={60}>1 jam (60 mnt)</option>
                    <option value={90}>1.5 jam (90 mnt)</option>
                    <option value={120}>2 jam (120 mnt)</option>
                  </select>
                </div>
              </div>

              {/* Area & Project Selection (Optional) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                    Pilar / Area (Opsional)
                  </label>
                  <select
                    value={actAreaId}
                    onChange={(e) => setActAreaId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1a2133] p-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#8B5CF6] cursor-pointer"
                  >
                    <option value="">-- Umum --</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                    Proyek (Opsional)
                  </label>
                  <select
                    value={actProjectId}
                    onChange={(e) => setActProjectId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1a2133] p-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#8B5CF6] cursor-pointer"
                  >
                    <option value="">-- Tanpa Proyek --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  Catatan Singkat (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={actNotes}
                  onChange={(e) => setActNotes(e.target.value)}
                  placeholder="Apa hasil atau wawasan yang didapatkan?"
                  className="w-full bg-slate-50 dark:bg-[#1a2133] p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#8B5CF6] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !actTitle.trim()}
                  className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7c3aed] text-white text-xs font-bold shadow-md shadow-purple-500/20 disabled:opacity-50 transition-all cursor-pointer active:scale-95"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Aktivitas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
