"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/app/components/ui/Dialog";
import { useToast } from "@/app/components/ui/Toast";
import { parseAmbientCapture } from "@/ai/ambient/ambient-nlp";
import { VoiceInputButton } from "@/app/components/ai/VoiceInputButton";

interface CaptureItem {
  id: string;
  content: string;
  status: "PENDING" | "PROCESSED" | "ARCHIVED";
  category: "IDEA" | "TASK_CANDIDATE" | "NOTE" | "REMINDER";
  convertedTaskId?: string | null;
  convertedGoalId?: string | null;
  processedAt?: Date | string | null;
  createdAt: Date | string;
}

interface AreaItem {
  id: string;
  name: string;
  color: string;
}

interface ProjectItem {
  id: string;
  title: string;
}

interface GoalItem {
  id: string;
  title: string;
  stages?: { id: string; name: string }[];
}

interface Props {
  initialCaptures: CaptureItem[];
  areas: AreaItem[];
  projects: ProjectItem[];
  goals: GoalItem[];
}

export function CaptureInboxManager({
  initialCaptures,
  areas,
  projects,
  goals,
}: Props) {
  const [captures, setCaptures] = useState<CaptureItem[]>(initialCaptures);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Quick Create State
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<CaptureItem["category"]>("TASK_CANDIDATE");
  const [creating, setCreating] = useState(false);

  // Convert Modal State
  const [activeCapture, setActiveCapture] = useState<CaptureItem | null>(null);
  const [convertType, setConvertType] = useState<"TASK" | "GOAL" | "PROJECT" | null>(null);
  const [converting, setConverting] = useState(false);

  // Convert to Task Form State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskParentType, setTaskParentType] = useState<"project" | "stage" | "area">("project");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || "");
  const [selectedGoalId, setSelectedGoalId] = useState<string>(goals[0]?.id || "");
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [selectedAreaId, setSelectedAreaId] = useState<string>(areas[0]?.id || "");
  const [taskPriority, setTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const taskEstimatedHours = 1;
  const [taskDueDate, setTaskDueDate] = useState("");

  // Convert to Goal Form State
  const [goalTitle, setGoalTitle] = useState("");
  const [goalAreaId, setGoalAreaId] = useState<string>(areas[0]?.id || "");
  const [goalType, setGoalType] = useState<"LEARNING" | "ACHIEVEMENT" | "HABIT" | "MAINTENANCE">("LEARNING");
  const goalPriority = "MEDIUM" as const;

  // Convert to Project Form State
  const [projectTitle, setProjectTitle] = useState("");
  const [projectAreaId, setProjectAreaId] = useState<string>(areas[0]?.id || "");
  const projectGoalId = "";
  const projectPriority = "MEDIUM" as const;
  const [projectTargetDate, setProjectTargetDate] = useState("");

  const { toast } = useToast();
  const router = useRouter();

  const pendingCount = captures.filter((c) => c.status === "PENDING").length;
  const processedCount = captures.filter((c) => c.status === "PROCESSED").length;
  const archivedCount = captures.filter((c) => c.status === "ARCHIVED").length;

  const filtered = captures.filter((item) => {
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
    if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;
    if (searchQuery.trim() && !item.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  async function handleCreate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!newContent.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/captures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newContent.trim(),
          category: newCategory,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal menyimpan ide");
      setCaptures([data.data, ...captures]);
      setNewContent("");
      toast("Berhasil disimpan ke Inbox!", "success");
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal menyimpan", "error");
    } finally {
      setCreating(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    }
  }

  async function handleArchive(id: string) {
    try {
      const res = await fetch(`/api/captures/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      if (!res.ok) throw new Error("Gagal mengarsipkan");
      setCaptures(captures.map((c) => (c.id === id ? { ...c, status: "ARCHIVED" } : c)));
      toast("Catatan diarsipkan", "info");
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal mengarsipkan", "error");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus item catatan ini?")) return;
    try {
      const res = await fetch(`/api/captures/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      setCaptures(captures.filter((c) => c.id !== id));
      toast("Catatan dihapus", "info");
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal menghapus", "error");
    }
  }

  function openConvertToTask(item: CaptureItem) {
    setActiveCapture(item);
    setConvertType("TASK");
    setTaskTitle(item.content.slice(0, 100));
  }

  function openConvertToGoal(item: CaptureItem) {
    setActiveCapture(item);
    setConvertType("GOAL");
    setGoalTitle(item.content.slice(0, 100));
  }

  function openConvertToProject(item: CaptureItem) {
    setActiveCapture(item);
    setConvertType("PROJECT");
    setProjectTitle(item.content.slice(0, 100));
  }

  async function handleConvertSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCapture || !convertType) return;
    setConverting(true);
    try {
      let body: Record<string, unknown> = { convertType };
      if (convertType === "TASK") {
        body = {
          ...body,
          taskTitle: taskTitle.trim(),
          taskPriority,
          taskEstimatedHours: Number(taskEstimatedHours) || 1,
          taskDueDate: taskDueDate ? new Date(taskDueDate).toISOString() : null,
          ...(taskParentType === "project" && selectedProjectId ? { projectId: selectedProjectId } : {}),
          ...(taskParentType === "stage" && selectedStageId ? { stageId: selectedStageId } : {}),
          ...(taskParentType === "area" && selectedAreaId ? { areaId: selectedAreaId } : {}),
        };
      } else if (convertType === "GOAL") {
        body = {
          ...body,
          goalTitle: goalTitle.trim(),
          goalAreaId: goalAreaId || null,
          goalType,
          goalPriority,
        };
      } else if (convertType === "PROJECT") {
        body = {
          ...body,
          projectTitle: projectTitle.trim(),
          projectAreaId: projectAreaId || null,
          projectGoalId: projectGoalId || null,
          projectPriority,
          projectTargetDate: projectTargetDate ? new Date(projectTargetDate).toISOString() : null,
        };
      }

      const res = await fetch(`/api/captures/${activeCapture.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gagal mengonversi");

      setCaptures(captures.map((c) => (c.id === activeCapture.id ? { ...c, status: "PROCESSED" } : c)));
      toast(
        convertType === "TASK"
          ? "Berhasil dikonversi menjadi Tugas!"
          : convertType === "GOAL"
          ? "Berhasil dikonversi menjadi Target Utama!"
          : "Berhasil dikonversi menjadi Proyek!",
        "success"
      );
      setActiveCapture(null);
      setConvertType(null);
      router.refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Gagal mengonversi", "error");
    } finally {
      setConverting(false);
    }
  }

  const selectedGoal = goals.find((g) => g.id === selectedGoalId);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "TASK_CANDIDATE":
        return "text-amber-400 bg-amber-500/10 border-amber-500/25";
      case "IDEA":
        return "text-purple-300 bg-purple-500/10 border-purple-500/25";
      case "NOTE":
        return "text-indigo-300 bg-indigo-500/10 border-indigo-500/25";
      case "REMINDER":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/25";
      default:
        return "text-zinc-400 bg-white/[0.05] border-white/[0.08]";
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "TASK_CANDIDATE":
        return "Calon Tugas";
      case "IDEA":
        return "Ide & Inovasi";
      case "NOTE":
        return "Catatan Bebas";
      case "REMINDER":
        return "Pengingat";
      default:
        return cat;
    }
  };

  return (
    <div className="flex flex-col w-full pb-16 gap-6 text-zinc-200 max-w-7xl mx-auto">
      {/* 1. Header Layar */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2 text-purple-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>Pusat Ide &amp; Tangkap Cepat</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
            Inbox Catatan Cepat
          </h1>
          <p className="text-sm text-zinc-400 max-w-3xl leading-relaxed">
            Tangkap ide, pemikiran, dan calon tugas seketika tanpa distraksi — proses dan konversikan menjadi Tugas, Target, atau Proyek terstruktur.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#131825] border border-white/[0.08] text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
            <span className="text-zinc-200 font-medium">Status Inbox: {pendingCount} Menunggu</span>
          </div>
        </div>
      </section>

      {/* 2. Quick Capture Station */}
      {(() => {
        const ambient = parseAmbientCapture(newContent);
        const showSuggestion = newContent.trim().length >= 4 && ambient.suggestedCategory !== newCategory;

        return (
          <section className="relative rounded-2xl bg-[#131825]/90 border border-white/[0.08] p-5 sm:p-6 shadow-xl overflow-hidden focus-within:border-purple-500/50 transition-all">
            <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold">
                <svg className="w-4 h-4 text-purple-400 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                </svg>
                <span>TANGKAP CEPAT</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-zinc-500 text-[11px] hidden sm:inline">
                  Tekan <span className="text-zinc-400">Ctrl + Enter</span> untuk simpan
                </span>
                <VoiceInputButton
                  onTranscript={(text) => setNewContent((prev) => (prev ? `${prev} ${text}` : text))}
                  className="scale-90"
                />
              </div>
            </div>

            <div className="relative w-full">
              <textarea
                rows={3}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik apa saja yang terlintas di pikiran… ide inovasi, draft tugas mendadak, catatan rapat, atau pengingat penting…"
                className="w-full bg-[#0B0D13]/80 rounded-xl p-3.5 font-sans text-sm text-white placeholder:text-zinc-500 border border-white/[0.08] focus:outline-none focus:border-purple-500/50 transition-all resize-none"
              />
            </div>

            {/* Ambient Category Recommendation */}
            {showSuggestion && (
              <div className="flex items-center justify-between gap-2 px-3.5 py-2 mt-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
                <span className="text-purple-300 flex items-center gap-1.5">
                  <span className="font-semibold text-purple-400">✦ Saran AI:</span>
                  <span>Terdeteksi cocok sebagai <strong>{ambient.label}</strong></span>
                </span>
                <button
                  type="button"
                  onClick={() => setNewCategory(ambient.suggestedCategory)}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 text-xs font-medium transition-colors cursor-pointer"
                >
                  Terapkan
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3.5">
              {/* Selector Kategori Cepat */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: "TASK_CANDIDATE", label: "Calon Tugas", dot: "bg-amber-400" },
                  { id: "IDEA", label: "Ide & Inovasi", dot: "bg-purple-400" },
                  { id: "NOTE", label: "Catatan Bebas", dot: "bg-indigo-400" },
                  { id: "REMINDER", label: "Pengingat", dot: "bg-emerald-400" },
                ].map((cat) => {
                  const active = newCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewCategory(cat.id as CaptureItem["category"])}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                        active
                          ? "bg-purple-600/20 text-purple-200 border border-purple-500/40 font-semibold shadow-xs"
                          : "bg-[#0B0D13] text-zinc-400 border border-white/[0.06] hover:text-white"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => handleCreate()}
                disabled={creating || !newContent.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold shadow-[0_0_20px_rgba(168,85,247,0.35)] hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer active:scale-[0.98]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>{creating ? "Menyimpan…" : "Simpan ke Inbox"}</span>
              </button>
            </div>
          </section>
        );
      })()}

      {/* 3. Toolbar Filter & Pemrosesan */}
      <section className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Status Segmented Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-[#0B0D13] border border-white/[0.06] self-start">
          {[
            { id: "PENDING", label: `Menunggu (${pendingCount})`, dot: "bg-amber-400" },
            { id: "PROCESSED", label: `Terproses (${processedCount})`, dot: "bg-emerald-400" },
            { id: "ARCHIVED", label: `Arsip (${archivedCount})`, dot: "bg-zinc-500" },
            { id: "ALL", label: `Semua (${captures.length})`, dot: "" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-purple-600/25 text-purple-200 border border-purple-500/30 font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari isi catatan..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0B0D13] border border-white/[0.08] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#0B0D13] border border-white/[0.08] text-xs text-zinc-300 focus:outline-none focus:border-purple-500/50 cursor-pointer"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="TASK_CANDIDATE">Calon Tugas</option>
            <option value="IDEA">Ide &amp; Inovasi</option>
            <option value="NOTE">Catatan Bebas</option>
            <option value="REMINDER">Pengingat</option>
          </select>
        </div>
      </section>

      {/* 4. Grid Kartu Catatan */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.1] p-12 text-center bg-[#131825]/40 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
              <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-white">Inbox Kosong</p>
          <p className="mt-1 text-xs text-zinc-400 max-w-sm">
            Tidak ada catatan yang cocok dengan filter saat ini. Ketikkan ide atau rencana baru pada stasiun tangkap cepat di atas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const isProcessed = item.status === "PROCESSED";
            const isArchived = item.status === "ARCHIVED";

            return (
              <article
                key={item.id}
                className={`flex flex-col justify-between rounded-2xl border p-5 transition-all shadow-sm group ${
                  isProcessed
                    ? "bg-[#131825]/50 border-emerald-500/20"
                    : isArchived
                    ? "bg-[#131825]/30 border-white/[0.04] opacity-70"
                    : "bg-[#131825]/90 border-white/[0.08] hover:border-purple-500/40 hover:bg-[#1A2133]/80"
                }`}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-semibold border ${getCategoryColor(item.category)}`}>
                      {getCategoryLabel(item.category)}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1.5 border ${
                        isProcessed
                          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25 font-medium"
                          : isArchived
                          ? "text-zinc-400 bg-white/[0.04] border-white/[0.08]"
                          : "text-purple-300 bg-purple-500/10 border-purple-500/25 font-medium"
                      }`}
                    >
                      {!isProcessed && !isArchived && (
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                      )}
                      <span>{isProcessed ? "TERPROSES" : isArchived ? "ARSIP" : "INBOX"}</span>
                    </span>
                  </div>

                  <p className="text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap">
                    {item.content}
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-3.5 mt-4 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between text-zinc-400 text-xs">
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>
                        {new Date(item.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {!isArchived && !isProcessed && (
                        <button
                          type="button"
                          onClick={() => handleArchive(item.id)}
                          className="p-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          title="Arsipkan"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="21 8 21 21 3 21 3 8" />
                            <rect x="1" y="3" width="22" height="5" />
                            <line x1="10" y1="12" x2="14" y2="12" />
                          </svg>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Hapus"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {item.status === "PENDING" && (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => openConvertToTask(item)}
                        className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-purple-500/10 border border-purple-500/25 hover:bg-purple-500/20 text-purple-300 text-xs font-medium transition-all cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 11 12 14 22 4" />
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                        <span>Tugas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openConvertToGoal(item)}
                        className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 text-indigo-300 text-xs font-medium transition-all cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="6" />
                          <circle cx="12" cy="12" r="2" />
                        </svg>
                        <span>Target</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openConvertToProject(item)}
                        className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 text-amber-300 text-xs font-medium transition-all cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="12 2 2 7 12 12 22 7 12 2" />
                          <polyline points="2 17 12 22 22 17" />
                          <polyline points="2 12 12 17 22 12" />
                        </svg>
                        <span>Proyek</span>
                      </button>
                    </div>
                  )}

                  {item.status === "PROCESSED" && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <span>Selesai dikonversi ke sistem</span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 5. Convert Modals */}
      <Dialog
        open={Boolean(convertType)}
        onClose={() => {
          setActiveCapture(null);
          setConvertType(null);
        }}
        title={
          convertType === "TASK"
            ? "Konversi ke Tugas"
            : convertType === "GOAL"
            ? "Konversi ke Target Utama"
            : "Konversi ke Proyek"
        }
        description={`Konversikan catatan inbox "${activeCapture?.content.slice(0, 50)}..." menjadi entitas terstruktur.`}
      >
        <form onSubmit={handleConvertSubmit} className="space-y-4 pt-2">
          {convertType === "TASK" && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Judul Tugas</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/[0.1] bg-[#0B0D13] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Kaitkan ke:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTaskParentType("project")}
                    className={`py-1.5 text-xs rounded-xl border transition-all cursor-pointer ${
                      taskParentType === "project"
                        ? "bg-purple-600 text-white border-purple-500 font-semibold shadow-xs"
                        : "bg-[#0B0D13] text-zinc-400 border-white/[0.08] hover:text-white"
                    }`}
                  >
                    Proyek
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskParentType("stage")}
                    className={`py-1.5 text-xs rounded-xl border transition-all cursor-pointer ${
                      taskParentType === "stage"
                        ? "bg-purple-600 text-white border-purple-500 font-semibold shadow-xs"
                        : "bg-[#0B0D13] text-zinc-400 border-white/[0.08] hover:text-white"
                    }`}
                  >
                    Goal / Stage
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskParentType("area")}
                    className={`py-1.5 text-xs rounded-xl border transition-all cursor-pointer ${
                      taskParentType === "area"
                        ? "bg-purple-600 text-white border-purple-500 font-semibold shadow-xs"
                        : "bg-[#0B0D13] text-zinc-400 border-white/[0.08] hover:text-white"
                    }`}
                  >
                    Bidang Hidup
                  </button>
                </div>
              </div>

              {taskParentType === "project" && projects.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Pilih Proyek</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {taskParentType === "stage" && goals.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Pilih Goal</label>
                    <select
                      value={selectedGoalId}
                      onChange={(e) => {
                        setSelectedGoalId(e.target.value);
                        setSelectedStageId("");
                      }}
                      className="w-full rounded-xl border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                    >
                      {goals.map((g) => (
                        <option key={g.id} value={g.id}>{g.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Pilih Stage</label>
                    <select
                      value={selectedStageId}
                      onChange={(e) => setSelectedStageId(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                    >
                      <option value="">-- Tanpa Stage --</option>
                      {selectedGoal?.stages?.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {taskParentType === "area" && areas.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Pilih Bidang Hidup</label>
                  <select
                    value={selectedAreaId}
                    onChange={(e) => setSelectedAreaId(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Prioritas</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "URGENT")}
                    className="w-full rounded-xl border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                  >
                    <option value="LOW">Rendah</option>
                    <option value="MEDIUM">Sedang</option>
                    <option value="HIGH">Tinggi</option>
                    <option value="URGENT">Mendesak</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Tenggat Waktu</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              </div>
            </>
          )}

          {convertType === "GOAL" && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Judul Target Utama</label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/[0.1] bg-[#0B0D13] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Bidang Hidup</label>
                  <select
                    value={goalAreaId}
                    onChange={(e) => setGoalAreaId(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Tipe Target</label>
                  <select
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value as "LEARNING" | "ACHIEVEMENT" | "HABIT" | "MAINTENANCE")}
                    className="w-full rounded-xl border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                  >
                    <option value="ACHIEVEMENT">Pencapaian (ACHIEVEMENT)</option>
                    <option value="LEARNING">Pembelajaran (LEARNING)</option>
                    <option value="HABIT">Kebiasaan (HABIT)</option>
                    <option value="MAINTENANCE">Pemeliharaan (MAINTENANCE)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {convertType === "PROJECT" && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Judul Proyek</label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/[0.1] bg-[#0B0D13] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Bidang Hidup</label>
                  <select
                    value={projectAreaId}
                    onChange={(e) => setProjectAreaId(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Tenggat Waktu</label>
                  <input
                    type="date"
                    value={projectTargetDate}
                    onChange={(e) => setProjectTargetDate(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => {
                setActiveCapture(null);
                setConvertType(null);
              }}
              className="rounded-xl px-4 py-2 text-xs text-zinc-400 hover:bg-white/[0.05] hover:text-white transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={converting}
              className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
            >
              {converting ? "Memproses..." : "Konversi Sekarang"}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
