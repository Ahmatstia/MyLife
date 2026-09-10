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
        return "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30";
      case "IDEA":
        return "text-purple-300 bg-purple-500/10 border-purple-500/30";
      case "NOTE":
        return "text-indigo-300 bg-indigo-500/10 border-indigo-500/30";
      case "REMINDER":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      default:
        return "text-gray-400 bg-white/[0.05] border-white/[0.08]";
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
    <div className="flex flex-col w-full pb-16 gap-6 text-gray-200">
      {/* 1. Header Layar */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 text-purple-400 font-mono text-xs tracking-wider uppercase">
            <span className="material-symbols-outlined text-[15px]">bolt</span>
            <span>PUSAT PENANGKAPAN IDE &amp; GTD INBOX {"//"} PEMROSESAN CEPAT</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
            Inbox Catatan Cepat
          </h1>
          <p className="text-sm text-gray-400 max-w-3xl leading-relaxed">
            Tangkap ide, pemikiran, dan calon tugas seketika tanpa distraksi — proses dan konversikan menjadi Tugas, Target, atau Proyek terstruktur.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#131825] border border-white/[0.08] text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
            <span className="text-gray-200 font-medium">Status Inbox: {pendingCount} Menunggu</span>
          </div>
        </div>
      </section>

      {/* 2. Quick Capture Station */}
        {/* Quick Capture Station */}
        {(() => {
          const ambient = parseAmbientCapture(newContent);
          const showSuggestion = newContent.trim().length >= 4 && ambient.suggestedCategory !== newCategory;

          return (
            <section className="relative rounded-2xl bg-[#131825] border border-white/[0.08] p-5 shadow-xl overflow-hidden focus-within:border-purple-500/50 transition-all">
              <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 text-purple-300 font-mono text-xs font-semibold tracking-wider">
                  <span className="material-symbols-outlined text-[16px] text-purple-400 animate-pulse">flash_on</span>
                  <span>TANGKAP CEPAT SEKARANG</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5 text-gray-400 font-mono text-[11px] hidden sm:flex">
                    <span>Tekan</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-[#0B0D13] border border-white/[0.1] text-gray-200">Ctrl</kbd>
                    <span>+</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-[#0B0D13] border border-white/[0.1] text-gray-200">Enter</kbd>
                    <span>untuk simpan</span>
                  </div>
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
                  className="w-full bg-[#0B0D13]/80 rounded-xl p-3.5 font-sans text-sm text-white placeholder:text-gray-500 border border-white/[0.08] focus:outline-none focus:border-purple-500/50 transition-all resize-none"
                />
              </div>

              {/* Ambient Category Recommendation */}
              {showSuggestion && (
                <div className="flex items-center justify-between gap-2 px-3 py-1.5 mt-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs">
                  <span className="text-purple-300 flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold">✦ Saran AI:</span>
                    <span>Terdeteksi cocok sebagai <strong>{ambient.label}</strong></span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setNewCategory(ambient.suggestedCategory)}
                    className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 text-[11px] font-mono transition-colors cursor-pointer"
                  >
                    Terapkan
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3">
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
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs transition-all cursor-pointer ${
                          active
                            ? "bg-purple-600/20 text-purple-300 border border-purple-500/40 font-semibold shadow-xs"
                            : "bg-[#0B0D13] text-gray-400 border border-white/[0.06] hover:text-white"
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
                  className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-mono text-xs font-semibold shadow-[0_0_20px_rgba(168,85,247,0.35)] hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">add_task</span>
                  <span>{creating ? "Menyimpan…" : "Simpan ke Inbox"}</span>
                  <kbd className="ml-1 px-1.5 py-0.5 rounded bg-black/30 text-[10px]">Ctrl+↵</kbd>
                </button>
              </div>
            </section>
          );
        })()}

      {/* 3. Toolbar Filter & Pemrosesan */}
      <section className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Status Segmented Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-[#131825] border border-white/[0.08] self-start">
          {[
            { id: "PENDING", label: `Menunggu (${pendingCount})`, dot: "bg-amber-400" },
            { id: "PROCESSED", label: `Terproses (${processedCount})`, dot: "bg-emerald-400" },
            { id: "ARCHIVED", label: `Arsip (${archivedCount})`, dot: "bg-gray-500" },
            { id: "ALL", label: `Semua (${captures.length})`, dot: "" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs transition-all ${
                statusFilter === tab.id
                  ? "bg-purple-600 text-white font-semibold shadow-xs"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
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
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[16px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari isi catatan..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#131825] border border-white/[0.08] text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-400"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[#131825] border border-white/[0.08] text-xs font-mono text-gray-200 focus:outline-none focus:border-purple-400"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="TASK_CANDIDATE">Calon Tugas</option>
            <option value="IDEA">Ide &amp; Inovasi</option>
            <option value="NOTE">Catatan Bebas</option>
            <option value="REMINDER">Pengingat</option>
          </select>
        </div>
      </section>

      {/* 4. Grid Bento Kartu Catatan */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.1] p-10 text-center bg-[#131825]/40">
          <span className="material-symbols-outlined text-4xl text-gray-500 mb-2">inbox</span>
          <p className="text-sm font-semibold text-white">Inbox Kosong</p>
          <p className="mt-1 text-xs font-mono text-gray-400">
            Tidak ada catatan yang cocok dengan filter saat ini.
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
                    ? "bg-[#131825]/40 border-emerald-500/20"
                    : isArchived
                    ? "bg-[#131825]/30 border-white/[0.04] opacity-70"
                    : "bg-[#131825] border-white/[0.08] hover:border-purple-500/40 hover:bg-[#1A2133]/60"
                }`}
              >
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold uppercase border ${getCategoryColor(item.category)}`}>
                      {getCategoryLabel(item.category)}
                    </span>
                    <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1.5 border ${
                      isProcessed
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : isArchived
                        ? "text-gray-400 bg-white/[0.04] border-white/[0.08]"
                        : "text-purple-300 bg-purple-500/10 border-purple-500/20"
                    }`}>
                      {!isProcessed && !isArchived && (
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                      )}
                      <span>{isProcessed ? "TERPROSES" : isArchived ? "ARSIP" : "INBOX"}</span>
                    </span>
                  </div>

                  <p className="text-sm font-sans text-gray-100 leading-relaxed whitespace-pre-wrap">
                    {item.content}
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-3 mt-4 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between text-gray-400 font-mono text-[10px]">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">schedule</span>
                      <span>{new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {!isArchived && !isProcessed && (
                        <button
                          type="button"
                          onClick={() => handleArchive(item.id)}
                          className="p-1 rounded hover:bg-white/[0.08] text-gray-400 hover:text-white transition-colors"
                          title="Arsipkan"
                        >
                          <span className="material-symbols-outlined text-[15px]">archive</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1 rounded hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 transition-colors"
                        title="Hapus"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                      </button>
                    </div>
                  </div>

                  {item.status === "PENDING" && (
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => openConvertToTask(item)}
                        className="flex items-center justify-center gap-1 py-1 px-1 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-purple-500/15 hover:border-purple-500/40 text-purple-300 font-mono text-[10.5px] transition-all"
                      >
                        <span className="material-symbols-outlined text-[13px]">check_box</span>
                        <span>+ Tugas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openConvertToGoal(item)}
                        className="flex items-center justify-center gap-1 py-1 px-1 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-indigo-500/15 hover:border-indigo-500/40 text-indigo-300 font-mono text-[10.5px] transition-all"
                      >
                        <span className="material-symbols-outlined text-[13px]">target</span>
                        <span>+ Target</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openConvertToProject(item)}
                        className="flex items-center justify-center gap-1 py-1 px-1 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-amber-500/15 hover:border-amber-500/40 text-amber-300 font-mono text-[10.5px] transition-all"
                      >
                        <span className="material-symbols-outlined text-[13px]">folder</span>
                        <span>+ Proyek</span>
                      </button>
                    </div>
                  )}

                  {item.status === "PROCESSED" && (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                      <span className="material-symbols-outlined text-[15px]">task_alt</span>
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
                <label className="block text-xs font-mono text-gray-400 mb-1">Judul Tugas</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Kaitkan ke:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTaskParentType("project")}
                    className={`py-1 text-xs font-mono rounded-lg border ${
                      taskParentType === "project"
                        ? "bg-purple-600 text-white border-purple-500"
                        : "bg-[#0B0D13] text-gray-400 border-white/[0.1]"
                    }`}
                  >
                    Proyek
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskParentType("stage")}
                    className={`py-1 text-xs font-mono rounded-lg border ${
                      taskParentType === "stage"
                        ? "bg-purple-600 text-white border-purple-500"
                        : "bg-[#0B0D13] text-gray-400 border-white/[0.1]"
                    }`}
                  >
                    Goal / Stage
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskParentType("area")}
                    className={`py-1 text-xs font-mono rounded-lg border ${
                      taskParentType === "area"
                        ? "bg-purple-600 text-white border-purple-500"
                        : "bg-[#0B0D13] text-gray-400 border-white/[0.1]"
                    }`}
                  >
                    Bidang Hidup
                  </button>
                </div>
              </div>

              {taskParentType === "project" && projects.length > 0 && (
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Pilih Proyek</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
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
                    <label className="block text-xs font-mono text-gray-400 mb-1">Pilih Goal</label>
                    <select
                      value={selectedGoalId}
                      onChange={(e) => {
                        setSelectedGoalId(e.target.value);
                        setSelectedStageId("");
                      }}
                      className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                    >
                      {goals.map((g) => (
                        <option key={g.id} value={g.id}>{g.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Pilih Stage</label>
                    <select
                      value={selectedStageId}
                      onChange={(e) => setSelectedStageId(e.target.value)}
                      className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
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
                  <label className="block text-xs font-mono text-gray-400 mb-1">Pilih Bidang Hidup</label>
                  <select
                    value={selectedAreaId}
                    onChange={(e) => setSelectedAreaId(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Prioritas</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "URGENT")}
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="LOW">Rendah</option>
                    <option value="MEDIUM">Sedang</option>
                    <option value="HIGH">Tinggi</option>
                    <option value="URGENT">Mendesak</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Tenggat Waktu</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>
            </>
          )}

          {convertType === "GOAL" && (
            <>
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Judul Target Utama</label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  required
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Bidang Hidup</label>
                  <select
                    value={goalAreaId}
                    onChange={(e) => setGoalAreaId(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Tipe Target</label>
                  <select
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value as "LEARNING" | "ACHIEVEMENT" | "HABIT" | "MAINTENANCE")}
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
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
                <label className="block text-xs font-mono text-gray-400 mb-1">Judul Proyek</label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  required
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Bidang Hidup</label>
                  <select
                    value={projectAreaId}
                    onChange={(e) => setProjectAreaId(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Tenggat Waktu</label>
                  <input
                    type="date"
                    value={projectTargetDate}
                    onChange={(e) => setProjectTargetDate(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D13] px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
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
              className="rounded-lg px-4 py-2 text-xs font-mono text-gray-400 hover:bg-white/[0.05]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={converting}
              className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-mono font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-sm"
            >
              {converting ? "Memproses..." : "Konversi Sekarang"}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
