"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/ui/Icon";
import { Dialog } from "@/app/components/ui/Dialog";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Badge";
import type {
  LifeIdentity,
  LifeVision,
  LifeChapter,
  ChapterFocusArea,
  LifeReflection,
  Area,
} from "@/generated/prisma/client";
import type {
  CoreValueItem,
  LifePrincipleItem,
  ImportantRoleItem,
} from "@/services/direction.service";

type ActiveChapterWithDetails = LifeChapter & {
  focusAreas: (ChapterFocusArea & {
    area: { id: string; name: string; color: string; icon: string } | null;
  })[];
  goals: { id: string; title: string; status: string; priority?: string; targetDate?: Date | null }[];
};

type ChapterWithFocus = LifeChapter & {
  focusAreas: (ChapterFocusArea & {
    area: { id: string; name: string; color: string; icon: string } | null;
  })[];
  goals: { id: string; title: string; status: string }[];
};

interface DirectionManagerProps {
  identity: LifeIdentity | null;
  vision: LifeVision | null;
  activeChapter: ActiveChapterWithDetails | null;
  allChapters: ChapterWithFocus[];
  allReflections: (LifeReflection & {
    chapter: { id: string; title: string; themeColor: string } | null;
  })[];
  availableAreas: Area[];
}

export function DirectionManager({
  identity: initialIdentity,
  vision: initialVision,
  activeChapter: initialActiveChapter,
  allChapters: initialChapters,
  allReflections: initialReflections,
  availableAreas,
}: DirectionManagerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"compass" | "vision" | "identity" | "reflections">("compass");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [isCloseChapterModalOpen, setIsCloseChapterModalOpen] = useState(false);
  const [isFocusAreaModalOpen, setIsFocusAreaModalOpen] = useState(false);
  const [isVisionModalOpen, setIsVisionModalOpen] = useState(false);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [isReflectionModalOpen, setIsReflectionModalOpen] = useState(false);

  // Form states
  const [chapterForm, setChapterForm] = useState({
    title: "",
    description: "",
    themeColor: "#8B5CF6",
    mainIntent: "",
    targetEndDate: "",
  });

  const [closeChapterNotes, setCloseChapterNotes] = useState("");

  const [focusAreaForm, setFocusAreaForm] = useState({
    title: "",
    intention: "",
    areaId: "",
  });

  const [visionForm, setVisionForm] = useState({
    statement: initialVision?.statement || "",
    desiredIdentity: initialVision?.desiredIdentity || "",
    desiredLifestyle: initialVision?.desiredLifestyle || "",
    targetSkills: (initialVision?.targetSkills || []).join(", "),
    purposeReason: initialVision?.purposeReason || "",
    timeHorizonYears: initialVision?.timeHorizonYears || 5,
  });

  const [identityForm, setIdentityForm] = useState({
    bio: initialIdentity?.bio || "",
    currentSituation: initialIdentity?.currentSituation || "",
    coreValues: ((initialIdentity?.coreValues as unknown as CoreValueItem[]) || []).map((v) => v.name).join(", "),
    principles: ((initialIdentity?.principles as unknown as LifePrincipleItem[]) || []).map((p) => p.statement).join("\n"),
    strengths: (initialIdentity?.strengths || []).join(", "),
    growthAreas: (initialIdentity?.growthAreas || []).join(", "),
    importantRoles: ((initialIdentity?.importantRoles as unknown as ImportantRoleItem[]) || []).map((r) => r.role).join(", "),
    aspirations: initialIdentity?.aspirations || "",
  });

  const [reflectionForm, setReflectionForm] = useState({
    title: "Refleksi Arah Hidup",
    recentFocusNotes: "",
    meaningfulActivities: "",
    progressNotes: "",
    lifeChanges: "",
    alignmentAssessment: "",
    adjustmentsNeeded: "",
    nextFocus: "",
  });

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  // Chapter Handlers
  async function handleCreateChapter(e: React.FormEvent) {
    e.preventDefault();
    if (!chapterForm.title.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/direction/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chapterForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Babak kehidupan berhasil dibuat!");
        setIsChapterModalOpen(false);
        setChapterForm({ title: "", description: "", themeColor: "#8B5CF6", mainIntent: "", targetEndDate: "" });
        router.refresh();
      } else {
        alert(data.error?.message || "Gagal membuat babak.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCloseChapter(e: React.FormEvent) {
    e.preventDefault();
    if (!initialActiveChapter) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/direction/chapters/${initialActiveChapter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: false,
          actualEndDate: new Date().toISOString(),
          reflectionNotes: closeChapterNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Babak kehidupan berhasil diselesaikan & diarsipkan.");
        setIsCloseChapterModalOpen(false);
        setCloseChapterNotes("");
        router.refresh();
      } else {
        alert(data.error?.message || "Gagal menutup babak kehidupan.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddFocusArea(e: React.FormEvent) {
    e.preventDefault();
    if (!initialActiveChapter || !focusAreaForm.title.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/direction/chapters/${initialActiveChapter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_focus_area",
          data: {
            title: focusAreaForm.title,
            intention: focusAreaForm.intention || null,
            areaId: focusAreaForm.areaId || null,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Fokus babak berhasil ditambahkan!");
        setIsFocusAreaModalOpen(false);
        setFocusAreaForm({ title: "", intention: "", areaId: "" });
        router.refresh();
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteFocusArea(focusId: string) {
    if (!initialActiveChapter || !confirm("Hapus fokus babak ini?")) return;

    try {
      const res = await fetch(`/api/direction/chapters/${initialActiveChapter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_focus_area",
          focusAreaId: focusId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Fokus babak dihapus.");
        router.refresh();
      }
    } catch {
      alert("Gagal menghapus fokus.");
    }
  }

  // Vision Handler
  async function handleSaveVision(e: React.FormEvent) {
    e.preventDefault();
    if (!visionForm.statement.trim()) return;

    setIsSubmitting(true);
    try {
      const targetSkills = visionForm.targetSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/direction/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statement: visionForm.statement,
          desiredIdentity: visionForm.desiredIdentity || null,
          desiredLifestyle: visionForm.desiredLifestyle || null,
          purposeReason: visionForm.purposeReason || null,
          targetSkills,
          timeHorizonYears: Number(visionForm.timeHorizonYears) || 5,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Visi hidup berhasil diperbarui!");
        setIsVisionModalOpen(false);
        router.refresh();
      }
    } catch {
      alert("Gagal menyimpan visi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Identity Handler
  async function handleSaveIdentity(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const coreValues: CoreValueItem[] = identityForm.coreValues
        .split(",")
        .map((s, idx) => ({ id: `val-${idx}`, name: s.trim() }))
        .filter((v) => v.name.length > 0);

      const principles: LifePrincipleItem[] = identityForm.principles
        .split("\n")
        .map((s, idx) => ({ id: `prin-${idx}`, statement: s.trim() }))
        .filter((p) => p.statement.length > 0);

      const strengths = identityForm.strengths.split(",").map((s) => s.trim()).filter(Boolean);
      const growthAreas = identityForm.growthAreas.split(",").map((s) => s.trim()).filter(Boolean);
      const importantRoles: ImportantRoleItem[] = identityForm.importantRoles
        .split(",")
        .map((s, idx) => ({ id: `role-${idx}`, role: s.trim() }))
        .filter((r) => r.role.length > 0);

      const res = await fetch("/api/direction/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: identityForm.bio || null,
          currentSituation: identityForm.currentSituation || null,
          coreValues,
          principles,
          strengths,
          growthAreas,
          importantRoles,
          aspirations: identityForm.aspirations || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Profil identitas berhasil disimpan!");
        setIsIdentityModalOpen(false);
        router.refresh();
      }
    } catch {
      alert("Gagal menyimpan identitas.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Reflection Handler
  async function handleSaveReflection(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/direction/reflections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...reflectionForm,
          chapterId: initialActiveChapter?.id || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Jurnal refleksi berhasil disimpan!");
        setIsReflectionModalOpen(false);
        setReflectionForm({
          title: "Refleksi Arah Hidup",
          recentFocusNotes: "",
          meaningfulActivities: "",
          progressNotes: "",
          lifeChanges: "",
          alignmentAssessment: "",
          adjustmentsNeeded: "",
          nextFocus: "",
        });
        router.refresh();
      }
    } catch {
      alert("Gagal menyimpan refleksi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteReflection(id: string) {
    if (!confirm("Hapus catatan refleksi ini?")) return;
    try {
      const res = await fetch(`/api/direction/reflections/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("Refleksi dihapus.");
        router.refresh();
      }
    } catch {
      alert("Gagal menghapus refleksi.");
    }
  }

  // Parse values for display
  const parsedValues = (initialIdentity?.coreValues as unknown as CoreValueItem[]) || [];
  const parsedPrinciples = (initialIdentity?.principles as unknown as LifePrincipleItem[]) || [];
  const parsedRoles = (initialIdentity?.importantRoles as unknown as ImportantRoleItem[]) || [];

  return (
    <div className="space-y-8">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-3 shadow-xl border border-white/10 dark:border-slate-800 text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
          <Icon name="check" size={16} className="text-emerald-400 dark:text-emerald-600" />
          {toastMessage}
        </div>
      )}

      {/* Top Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] backdrop-blur-md">
        <button
          type="button"
          onClick={() => setActiveTab("compass")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
            activeTab === "compass"
              ? "bg-white dark:bg-[#1e2333] text-slate-900 dark:text-white shadow-sm border border-slate-200/60 dark:border-white/10"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.02]"
          }`}
        >
          <Icon name="compass" size={16} className={activeTab === "compass" ? "text-sky-500" : ""} />
          Babak & Fokus
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("vision")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
            activeTab === "vision"
              ? "bg-white dark:bg-[#1e2333] text-slate-900 dark:text-white shadow-sm border border-slate-200/60 dark:border-white/10"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.02]"
          }`}
        >
          <Icon name="star" size={16} className={activeTab === "vision" ? "text-amber-500" : ""} />
          Visi & Aspirasi
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("identity")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
            activeTab === "identity"
              ? "bg-white dark:bg-[#1e2333] text-slate-900 dark:text-white shadow-sm border border-slate-200/60 dark:border-white/10"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.02]"
          }`}
        >
          <Icon name="user" size={16} className={activeTab === "identity" ? "text-purple-500" : ""} />
          Identitas Diri
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reflections")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
            activeTab === "reflections"
              ? "bg-white dark:bg-[#1e2333] text-slate-900 dark:text-white shadow-sm border border-slate-200/60 dark:border-white/10"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.02]"
          }`}
        >
          <Icon name="bookOpen" size={16} className={activeTab === "reflections" ? "text-emerald-500" : ""} />
          Jurnal Refleksi
          {initialReflections.length > 0 && (
            <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
              {initialReflections.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: COMPASS & CURRENT CHAPTER */}
      {activeTab === "compass" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {initialActiveChapter ? (
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-gradient-to-br from-white via-slate-50/50 to-purple-50/30 dark:from-[#131825] dark:via-[#111522] dark:to-[#171228] p-7 md:p-9 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-[#8B5CF6]/15 text-[#7c3aed] dark:text-[#d0bcff] border border-[#8B5CF6]/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse" />
                      Babak Aktif Saat Ini
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Dimulai sejak {new Date(initialActiveChapter.startDate).toLocaleDateString("id-ID", { month: "short", year: "numeric", day: "numeric" })}
                    </span>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {initialActiveChapter.title}
                  </h2>

                  {initialActiveChapter.mainIntent && (
                    <div className="flex items-start gap-2 p-3.5 rounded-xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/20 text-purple-950 dark:text-purple-200 text-sm">
                      <Icon name="sparkles" size={17} className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="font-semibold">Niat Sentral:</strong> {initialActiveChapter.mainIntent}
                      </span>
                    </div>
                  )}

                  {initialActiveChapter.description && (
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-3xl">
                      {initialActiveChapter.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start">
                  <Button
                    variant="secondary"
                    onClick={() => setIsFocusAreaModalOpen(true)}
                    className="text-xs font-semibold gap-1.5"
                  >
                    <Icon name="plus" size={14} />
                    Tambah Fokus
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setIsCloseChapterModalOpen(true)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white gap-1.5"
                  >
                    <Icon name="check" size={14} />
                    Selesaikan Babak
                  </Button>
                </div>
              </div>

              {/* Focus Areas Section */}
              <div className="mt-8 pt-7 border-t border-slate-200/80 dark:border-white/[0.08]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Icon name="target" size={18} className="text-[#38bdf8]" />
                      Fokus Utama Musim Ini
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Area yang layak mendapatkan perhatian dan energi terbaik Anda selama babak ini.
                    </p>
                  </div>
                </div>

                {initialActiveChapter.focusAreas.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {initialActiveChapter.focusAreas.map((focus) => (
                      <div
                        key={focus.id}
                        className="group relative flex flex-col justify-between p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] hover:border-[#8B5CF6]/40 transition-all shadow-sm"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                              {focus.title}
                            </h4>
                            <button
                              type="button"
                              onClick={() => handleDeleteFocusArea(focus.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity"
                              title="Hapus fokus"
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </div>

                          {focus.intention && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                              {focus.intention}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-xs">
                          {focus.area ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium text-[11px]"
                              style={{
                                backgroundColor: `${focus.area.color}15`,
                                color: focus.area.color,
                                border: `1px solid ${focus.area.color}35`,
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: focus.area.color }}
                              />
                              {focus.area.name}
                            </span>
                          ) : (
                            <span className="text-slate-600 dark:text-slate-300 font-medium">Fokus Mandiri</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Belum ada fokus prioritas yang didefinisikan untuk babak ini.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsFocusAreaModalOpen(true)}
                      className="mt-3 text-xs"
                    >
                      + Tambah Fokus Pertama
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center p-12 rounded-3xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B5CF6]/20 to-[#38bdf8]/20 text-[#8B5CF6]">
                <Icon name="compass" size={28} />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Tentukan Babak Kehidupan Anda Saat Ini
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Hidup berjalan dalam musim-musim yang berbeda. Babak apa yang sedang Anda jalani saat ini? (Contoh: *Membangun Fondasi Karir*, *Menyelesaikan Studi*, dsb.)
                </p>
              </div>
              <Button onClick={() => setIsChapterModalOpen(true)} className="gap-2">
                <Icon name="plus" size={16} />
                Mulai Babak Kehidupan Baru
              </Button>
            </div>
          )}

          {/* Past Chapters History */}
          {initialChapters.filter((c) => !c.isActive).length > 0 && (
            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Arsip Babak Kehidupan Masa Lalu ({initialChapters.filter((c) => !c.isActive).length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {initialChapters
                  .filter((c) => !c.isActive)
                  .map((chap) => (
                    <div
                      key={chap.id}
                      className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] space-y-2 opacity-85 hover:opacity-100 transition-opacity"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                        <span>
                          {new Date(chap.startDate).toLocaleDateString("id-ID", { month: "short", year: "numeric" })} —{" "}
                          {chap.actualEndDate
                            ? new Date(chap.actualEndDate).toLocaleDateString("id-ID", { month: "short", year: "numeric" })
                            : "Selesai"}
                        </span>
                        <Badge tone="neutral">Selesai</Badge>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">{chap.title}</h4>
                      {chap.reflectionNotes && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 italic border-l-2 border-slate-300 dark:border-slate-700 pl-3">
                          &ldquo;{chap.reflectionNotes}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: VISION & ASPIRATIONS */}
      {activeTab === "vision" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Visi & Aspirasi Masa Depan</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Orang seperti apa yang ingin Anda bangun, dan kehidupan seperti apa yang sedang Anda tuju?
              </p>
            </div>
            <Button onClick={() => setIsVisionModalOpen(true)} className="text-xs font-semibold gap-1.5">
              <Icon name="edit" size={14} />
              {initialVision ? "Perbarui Visi" : "Rumuskan Visi"}
            </Button>
          </div>

          {initialVision ? (
            <div className="space-y-6">
              {/* North Star Card */}
              <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-7 md:p-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    <Icon name="star" size={16} />
                    Pernyataan Visi Utama (North Star)
                  </div>
                  <p className="text-xl md:text-2xl font-serif italic text-slate-900 dark:text-white leading-relaxed">
                    &ldquo;{initialVision.statement}&rdquo;
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Cakupan Horizon: {initialVision.timeHorizonYears || 5} Tahun ke depan
                  </p>
                </div>
              </div>

              {/* Vision Pillars Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Desired Identity */}
                <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8B5CF6]">
                    <Icon name="user" size={16} />
                    Identitas Masa Depan
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {initialVision.desiredIdentity || "Belum dirumuskan secara spesifik."}
                  </p>
                </div>

                {/* Desired Lifestyle */}
                <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#38bdf8]">
                    <Icon name="sun" size={16} />
                    Gaya Hidup & Ritme Ideal
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {initialVision.desiredLifestyle || "Belum dirumuskan secara spesifik."}
                  </p>
                </div>

                {/* Target Skills */}
                <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4edea3]">
                    <Icon name="award" size={16} />
                    Keahlian Kunci yang Ingin Dikuasai
                  </div>
                  {initialVision.targetSkills && initialVision.targetSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {initialVision.targetSkills.map((skill, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 dark:text-slate-300">Belum ada daftar keahlian kunci.</p>
                  )}
                </div>

                {/* Purpose Reason */}
                <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F43F5E]">
                    <Icon name="sparkles" size={16} />
                    Alasan Mengapa (&ldquo;The Why&rdquo;)
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {initialVision.purposeReason || "Belum ada catatan alasan personal."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-12 rounded-3xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
                <Icon name="star" size={28} />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Belum Ada Visi yang Dirumuskan
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Tuliskan pernyataan bintang kejora Anda untuk memberikan kejelasan arah ke mana langkah Anda berlabuh.
                </p>
              </div>
              <Button onClick={() => setIsVisionModalOpen(true)} className="gap-2">
                <Icon name="plus" size={16} />
                Rumuskan Visi Pertama
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SELF IDENTITY */}
      {activeTab === "identity" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Identitas Diri (Who Am I?)</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Ruang eksplorasi dan pemahaman diri: nilai hidup, prinsip, peran, serta potensi.
              </p>
            </div>
            <Button onClick={() => setIsIdentityModalOpen(true)} className="text-xs font-semibold gap-1.5">
              <Icon name="edit" size={14} />
              {initialIdentity ? "Perbarui Identitas" : "Definisikan Identitas"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bio & Current Situation */}
            <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-4 md:col-span-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Gambaran Diri Singkat
                </h3>
                <p className="text-sm text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                  {initialIdentity?.bio || "Belum ada gambaran diri yang ditulis."}
                </p>
              </div>

              {initialIdentity?.currentSituation && (
                <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Situasi Hidup Saat Ini
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                    {initialIdentity.currentSituation}
                  </p>
                </div>
              )}
            </div>

            {/* Core Values */}
            <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                <Icon name="tag" size={16} />
                Nilai-Nilai Inti (Core Values)
              </div>
              {parsedValues.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {parsedValues.map((v, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-xl text-xs font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                    >
                      {v.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-300">Belum ada nilai inti yang dimasukkan.</p>
              )}
            </div>

            {/* Important Roles */}
            <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                <Icon name="user" size={16} />
                Peran Penting dalam Hidup
              </div>
              {parsedRoles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {parsedRoles.map((r, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-xl text-xs font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/20"
                    >
                      {r.role}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-300">Belum ada peran penting yang didefinisikan.</p>
              )}
            </div>

            {/* Principles */}
            <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-3 md:col-span-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <Icon name="award" size={16} />
                Prinsip Hidup (Life Principles)
              </div>
              {parsedPrinciples.length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  {parsedPrinciples.map((p, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                      <span>{p.statement}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-300">Belum ada prinsip yang dicatat.</p>
              )}
            </div>

            {/* Strengths & Growth Areas */}
            <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Kekuatan Diri yang Disadari
              </h3>
              {initialIdentity?.strengths && initialIdentity.strengths.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {initialIdentity.strengths.map((s, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200">
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-300">Belum diisi.</p>
              )}
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Area yang Ingin Dikembangkan
              </h3>
              {initialIdentity?.growthAreas && initialIdentity.growthAreas.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {initialIdentity.growthAreas.map((g, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200">
                      {g}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-300">Belum diisi.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REFLECTIONS */}
      {activeTab === "reflections" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Jurnal Refleksi Arah</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Apakah Anda masih melangkah ke arah yang tepat? Luangkan waktu berkala untuk mengevaluasi diri secara damai.
              </p>
            </div>
            <Button onClick={() => setIsReflectionModalOpen(true)} className="text-xs font-semibold gap-1.5">
              <Icon name="pen" size={14} />
              Tulis Refleksi Baru
            </Button>
          </div>

          {initialReflections.length > 0 ? (
            <div className="space-y-4">
              {initialReflections.map((ref) => (
                <div
                  key={ref.id}
                  className="group p-6 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-4 hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {ref.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {new Date(ref.date).toLocaleDateString("id-ID", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteReflection(ref.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 transition-opacity"
                      title="Hapus refleksi"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                    {ref.meaningfulActivities && (
                      <div>
                        <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                          Aktivitas yang Paling Bermakna
                        </h4>
                        <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                          {ref.meaningfulActivities}
                        </p>
                      </div>
                    )}

                    {ref.alignmentAssessment && (
                      <div>
                        <h4 className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                          Kesesuaian dengan Arah Hidup
                        </h4>
                        <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                          {ref.alignmentAssessment}
                        </p>
                      </div>
                    )}

                    {ref.adjustmentsNeeded && (
                      <div>
                        <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                          Hal yang Ingin Disesuaikan
                        </h4>
                        <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                          {ref.adjustmentsNeeded}
                        </p>
                      </div>
                    )}

                    {ref.nextFocus && (
                      <div>
                        <h4 className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wide">
                          Fokus untuk Periode Berikutnya
                        </h4>
                        <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                          {ref.nextFocus}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-12 rounded-3xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
                <Icon name="bookOpen" size={28} />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Belum Ada Jurnal Refleksi
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Refleksi adalah cara lembut untuk melihat kembali langkah Anda tanpa tekanan atau rasa bersalah.
                </p>
              </div>
              <Button onClick={() => setIsReflectionModalOpen(true)} className="gap-2">
                <Icon name="pen" size={16} />
                Tulis Refleksi Pertama
              </Button>
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE LIFE CHAPTER */}
      <Dialog
        open={isChapterModalOpen}
        onClose={() => setIsChapterModalOpen(false)}
        title="Mulai Babak Kehidupan Baru"
        description="Babak kehidupan mewakili konteks atau fase yang sedang Anda jalani. Babak ini akan menjadi kompas bagi target dan aktivitas Anda."
      >
        <form onSubmit={handleCreateChapter} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Babak <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Membangun Fondasi & Kemandirian"
              value={chapterForm.title}
              onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Niat Sentral / Tema Utama
            </label>
            <input
              type="text"
              placeholder="Contoh: Fokus memperkuat keahlian teknis dan stabilitas finansial"
              value={chapterForm.mainIntent}
              onChange={(e) => setChapterForm({ ...chapterForm, mainIntent: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Keterangan / Cerita Babak Ini
            </label>
            <textarea
              rows={3}
              placeholder="Jelaskan konteks yang sedang Anda alami di fase ini..."
              value={chapterForm.description}
              onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsChapterModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Mulai Babak"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL: ADD FOCUS AREA */}
      <Dialog
        open={isFocusAreaModalOpen}
        onClose={() => setIsFocusAreaModalOpen(false)}
        title="Tambah Fokus Musim Ini"
        description="Tentukan hal spesifik yang ingin Anda prioritaskan selama babak kehidupan ini."
      >
        <form onSubmit={handleAddFocusArea} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Judul Fokus <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Pendalaman Software Engineering"
              value={focusAreaForm.title}
              onChange={(e) => setFocusAreaForm({ ...focusAreaForm, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Hubungkan ke Pilar Hidup (Opsional)
            </label>
            <select
              value={focusAreaForm.areaId}
              onChange={(e) => setFocusAreaForm({ ...focusAreaForm, areaId: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
            >
              <option value="">-- Fokus Mandiri (Tanpa Pilar) --</option>
              {availableAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Intensi / Apa yang ingin dicapai
            </label>
            <input
              type="text"
              placeholder="Contoh: Membangun portfolio solid dan memahami arsitektur web modern"
              value={focusAreaForm.intention}
              onChange={(e) => setFocusAreaForm({ ...focusAreaForm, intention: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsFocusAreaModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Tambah Fokus"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL: CLOSE CHAPTER */}
      <Dialog
        open={isCloseChapterModalOpen}
        onClose={() => setIsCloseChapterModalOpen(false)}
        title="Selesaikan & Tutup Babak Ini"
        description="Menutup babak adalah perayaan transisi hidup. Anda dapat menuliskan catatan refleksi atau pencapaian dari musim ini sebelum mengarsipkannya."
      >
        <form onSubmit={handleCloseChapter} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Penutupan Babak (Opsional)
            </label>
            <textarea
              rows={4}
              placeholder="Pelajaran apa yang Anda dapatkan dari babak ini? Apa yang telah Anda bangun?..."
              value={closeChapterNotes}
              onChange={(e) => setCloseChapterNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsCloseChapterModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Memproses..." : "Tutup & Arsipkan Babak"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL: EDIT/CREATE VISION */}
      <Dialog
        open={isVisionModalOpen}
        onClose={() => setIsVisionModalOpen(false)}
        title="Rumuskan Visi Hidup (North Star)"
        description="Visi adalah kompas jangka panjang yang memandu ke mana Anda ingin melangkah."
      >
        <form onSubmit={handleSaveVision} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pernyataan Visi Utama <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Contoh: Menjadi profesional teknologi yang kompeten, berintegritas, mandiri secara finansial, dan memberi manfaat bagi sesama."
              value={visionForm.statement}
              onChange={(e) => setVisionForm({ ...visionForm, statement: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Identitas yang Dicita-citakan
              </label>
              <input
                type="text"
                placeholder="Contoh: Software Architect & Pembelajar Sejati"
                value={visionForm.desiredIdentity}
                onChange={(e) => setVisionForm({ ...visionForm, desiredIdentity: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Horizon Waktu (Tahun)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={visionForm.timeHorizonYears}
                onChange={(e) => setVisionForm({ ...visionForm, timeHorizonYears: Number(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Gaya Hidup & Ritme Ideal
            </label>
            <input
              type="text"
              placeholder="Contoh: Rutinitas pagi yang tenang, jam kerja produktif tanpa distraksi, akhir pekan bersama keluarga"
              value={visionForm.desiredLifestyle}
              onChange={(e) => setVisionForm({ ...visionForm, desiredLifestyle: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Keahlian Kunci (Pisahkan dengan koma)
            </label>
            <input
              type="text"
              placeholder="Contoh: Arsitektur Sistem, Public Speaking, Manajemen Keuangan"
              value={visionForm.targetSkills}
              onChange={(e) => setVisionForm({ ...visionForm, targetSkills: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alasan Mengapa (&ldquo;The Why&rdquo;)
            </label>
            <textarea
              rows={2}
              placeholder="Mengapa visi ini sangat bermakna bagi Anda?..."
              value={visionForm.purposeReason}
              onChange={(e) => setVisionForm({ ...visionForm, purposeReason: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsVisionModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Visi"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL: EDIT IDENTITY */}
      <Dialog
        open={isIdentityModalOpen}
        onClose={() => setIsIdentityModalOpen(false)}
        title="Definisikan Identitas Diri"
        description="Eksplorasi siapa diri Anda secara mandiri tanpa label atau penilaian psikologis."
      >
        <form onSubmit={handleSaveIdentity} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ringkasan Deskripsi Diri
            </label>
            <textarea
              rows={2}
              placeholder="Bagaimana Anda menggambarkan diri Anda saat ini?..."
              value={identityForm.bio}
              onChange={(e) => setIdentityForm({ ...identityForm, bio: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Situasi Hidup Saat Ini
            </label>
            <input
              type="text"
              placeholder="Contoh: Sedang dalam masa transisi karir dan fokus belajar mandiri"
              value={identityForm.currentSituation}
              onChange={(e) => setIdentityForm({ ...identityForm, currentSituation: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nilai-Nilai Inti (Pisahkan dengan koma)
            </label>
            <input
              type="text"
              placeholder="Contoh: Kejujuran, Kebebasan, Pembelajaran, Tanggung Jawab"
              value={identityForm.coreValues}
              onChange={(e) => setIdentityForm({ ...identityForm, coreValues: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Prinsip Hidup (1 baris per prinsip)
            </label>
            <textarea
              rows={3}
              placeholder="Contoh: Selalu mengutamakan kualitas daripada kecepatan&#10;Disiplin kecil setiap hari mengalahkan motivasi sesaat"
              value={identityForm.principles}
              onChange={(e) => setIdentityForm({ ...identityForm, principles: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kekuatan Diri (Pisahkan dengan koma)
              </label>
              <input
                type="text"
                placeholder="Contoh: Rasa ingin tahu tinggi, Gigih"
                value={identityForm.strengths}
                onChange={(e) => setIdentityForm({ ...identityForm, strengths: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Area Pengembangan (Pisahkan dengan koma)
              </label>
              <input
                type="text"
                placeholder="Contoh: Manajemen energi, Kesabaran"
                value={identityForm.growthAreas}
                onChange={(e) => setIdentityForm({ ...identityForm, growthAreas: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Peran Penting (Pisahkan dengan koma)
            </label>
            <input
              type="text"
              placeholder="Contoh: Anak, Pengembang Perangkat Lunak, Sahabat"
              value={identityForm.importantRoles}
              onChange={(e) => setIdentityForm({ ...identityForm, importantRoles: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsIdentityModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Identitas"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL: CREATE REFLECTION */}
      <Dialog
        open={isReflectionModalOpen}
        onClose={() => setIsReflectionModalOpen(false)}
        title="Tulis Jurnal Refleksi Arah"
        description="Jawab pertanyaan-pertanyaan ini secara jujur untuk memeriksa apakah langkah Anda masih selaras."
      >
        <form onSubmit={handleSaveReflection} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Judul Refleksi
            </label>
            <input
              type="text"
              required
              value={reflectionForm.title}
              onChange={(e) => setReflectionForm({ ...reflectionForm, title: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Aktivitas apa yang terasa paling bermakna belakangan ini?
            </label>
            <textarea
              rows={2}
              value={reflectionForm.meaningfulActivities}
              onChange={(e) => setReflectionForm({ ...reflectionForm, meaningfulActivities: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Apakah arah saat ini masih terasa selaras dan relevan?
            </label>
            <textarea
              rows={2}
              value={reflectionForm.alignmentAssessment}
              onChange={(e) => setReflectionForm({ ...reflectionForm, alignmentAssessment: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Hal yang ingin disesuaikan/dilepaskan
              </label>
              <textarea
                rows={2}
                value={reflectionForm.adjustmentsNeeded}
                onChange={(e) => setReflectionForm({ ...reflectionForm, adjustmentsNeeded: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fokus utama untuk ke depan
              </label>
              <textarea
                rows={2}
                value={reflectionForm.nextFocus}
                onChange={(e) => setReflectionForm({ ...reflectionForm, nextFocus: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsReflectionModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Refleksi"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
