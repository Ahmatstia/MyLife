"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/ui/Icon";
import { Dialog } from "@/app/components/ui/Dialog";
import { Button } from "@/app/components/ui/Button";
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

interface BerandaClientProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  identity: LifeIdentity | null;
  vision: LifeVision | null;
  activeChapter: ActiveChapterWithDetails | null;
  allChapters: ChapterWithFocus[];
  allReflections: (LifeReflection & {
    chapter: { id: string; title: string; themeColor: string } | null;
  })[];
  availableAreas: Area[];
  todayTasks: { id: string; title: string; status: string }[];
  activeGoals: { id: string; title: string; status: string; progress: number; areaName: string; areaColor: string }[];
}

function getValueIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("belajar") || lower.includes("pembelajaran")) return "📚";
  if (lower.includes("mandiri") || lower.includes("kemandirian")) return "🧭";
  if (lower.includes("tanggung") || lower.includes("jawab")) return "🛡️";
  if (lower.includes("integritas")) return "💎";
  if (lower.includes("tumbuh") || lower.includes("pertumbuhan")) return "🌱";
  if (lower.includes("kreatif") || lower.includes("kreativitas")) return "🎨";
  if (lower.includes("bebas") || lower.includes("kebebasan")) return "🕊️";
  if (lower.includes("tekun") || lower.includes("ketekunan")) return "⚡";
  if (lower.includes("manfaat") || lower.includes("kebermanfaatan")) return "🌟";
  if (lower.includes("jujur") || lower.includes("kejujuran")) return "⚖️";
  if (lower.includes("disiplin")) return "⏱️";
  if (lower.includes("empati") || lower.includes("kasih")) return "❤️";
  if (lower.includes("syukur") || lower.includes("bersyukur")) return "🙏";
  if (lower.includes("kesehatan") || lower.includes("sehat")) return "🌿";
  if (lower.includes("spiritual") || lower.includes("doa")) return "✨";
  return "✨";
}

export function BerandaClient({
  user,
  identity: initialIdentity,
  vision: initialVision,
  activeChapter: initialActiveChapter,
  allChapters,
  allReflections,
  availableAreas,
  todayTasks: initialTodayTasks,
  activeGoals,
}: BerandaClientProps) {
  const router = useRouter();

  // Tab State
  const [activeTab, setActiveTab] = useState<"identity" | "vision" | "principles" | "reflections">("identity");

  // User state & Mood
  const [userMood, setUserMood] = useState<string>("Semangat");
  const [isMoodDropdownOpen, setIsMoodDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hero Sticky Note Checkbox State (Connected to real today tasks!)
  const [tasksState, setTasksState] = useState<{ id: string; text: string; done: boolean }[]>(() => {
    if (initialTodayTasks && initialTodayTasks.length > 0) {
      return initialTodayTasks.map((t) => ({
        id: t.id,
        text: t.title,
        done: t.status === "COMPLETED",
      }));
    }
    return [
      { id: "starter-1", text: "Fokus pada prioritas utama hari ini", done: false },
      { id: "starter-2", text: "Sesi deep work 25 menit", done: false },
    ];
  });

  // Sync tasksState when initialTodayTasks prop updates (e.g. from router.refresh())
  const [prevInitialTasks, setPrevInitialTasks] = useState(initialTodayTasks);
  if (prevInitialTasks !== initialTodayTasks) {
    setPrevInitialTasks(initialTodayTasks);
    if (initialTodayTasks && initialTodayTasks.length > 0) {
      setTasksState(
        initialTodayTasks.map((t) => ({
          id: t.id,
          text: t.title,
          done: t.status === "COMPLETED",
        }))
      );
    }
  }

  // Edit Modals State
  const [isEditIdentityOpen, setIsEditIdentityOpen] = useState(false);
  const [isEditBioFullOpen, setIsEditBioFullOpen] = useState(false);
  const [isEditPrinciplesOpen, setIsEditPrinciplesOpen] = useState(false);
  const [isEditValuesOpen, setIsEditValuesOpen] = useState(false);
  const [isEditStrengthsOpen, setIsEditStrengthsOpen] = useState(false);
  const [isEditRolesOpen, setIsEditRolesOpen] = useState(false);
  const [isVisionModalOpen, setIsVisionModalOpen] = useState(false);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [isCloseChapterModalOpen, setIsCloseChapterModalOpen] = useState(false);
  const [isFocusAreaModalOpen, setIsFocusAreaModalOpen] = useState(false);
  const [isReflectionModalOpen, setIsReflectionModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Avatar upload / selection
  const [customAvatar, setCustomAvatar] = useState<string>(user.image || "/images/avatar-anime-boy.jpg");

  // Name formatting
  const rawName = user.name || "Sobat MyLife";
  const firstName = rawName.split(" ")[0] || "Sobat";

  // Parse REAL Identity Data from Database
  const bioText = initialIdentity?.bio || "";
  const currentSituationText = initialIdentity?.currentSituation || "";

  const parsedValues = (initialIdentity?.coreValues as unknown as CoreValueItem[]) || [];
  const parsedPrinciples = (initialIdentity?.principles as unknown as LifePrincipleItem[]) || [];
  const parsedStrengths = initialIdentity?.strengths || [];
  const parsedGrowthAreas = initialIdentity?.growthAreas || [];
  const parsedRoles = (initialIdentity?.importantRoles as unknown as ImportantRoleItem[]) || [];

  // Form States
  const [identityForm, setIdentityForm] = useState({
    bio: bioText,
    currentSituation: currentSituationText,
    aspirations: initialIdentity?.aspirations || "",
  });

  const [principlesInput, setPrinciplesInput] = useState(
    parsedPrinciples.map((p) => p.statement).join("\n")
  );

  const [valuesInput, setValuesInput] = useState(
    parsedValues.map((v) => v.name).join(", ")
  );

  const [strengthsForm, setStrengthsForm] = useState({
    strengths: parsedStrengths.join(", "),
    growthAreas: parsedGrowthAreas.join(", "),
  });

  const [rolesInput, setRolesInput] = useState(
    parsedRoles.map((r) => r.role).join(", ")
  );

  const [visionForm, setVisionForm] = useState({
    statement: initialVision?.statement || "",
    desiredIdentity: initialVision?.desiredIdentity || "",
    desiredLifestyle: initialVision?.desiredLifestyle || "",
    targetSkills: (initialVision?.targetSkills || []).join(", "),
    purposeReason: initialVision?.purposeReason || "",
    timeHorizonYears: initialVision?.timeHorizonYears || 5,
  });

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

  // Toggle Task via API
  async function handleToggleTask(id: string, currentDone: boolean) {
    const nextDone = !currentDone;
    setTasksState((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: nextDone } : t))
    );

    if (id.startsWith("starter-")) return;

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextDone ? "COMPLETED" : "TODO" }),
      });
      if (!res.ok) {
        throw new Error("Gagal memperbarui status tugas.");
      }
      showToast(nextDone ? "Tugas ditandai selesai! 🎉" : "Status tugas dikembalikan.");
      router.refresh();
    } catch {
      // Revert if error
      setTasksState((prev) =>
        prev.map((t) => (t.id === id ? { ...t, done: currentDone } : t))
      );
      showToast("Gagal memperbarui status tugas.");
    }
  }

  const completedCount = tasksState.filter((t) => t.done).length;

  // Save Identity Bio & Situation
  async function handleSaveIdentity(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/direction/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: identityForm.bio || null,
          currentSituation: identityForm.currentSituation || null,
          aspirations: identityForm.aspirations || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Identitas diri berhasil diperbarui!");
        setIsEditIdentityOpen(false);
        setIsEditBioFullOpen(false);
        router.refresh();
      } else {
        alert(data.error?.message || "Gagal memperbarui identitas.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Save Principles
  async function handleSavePrinciples(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const principles: LifePrincipleItem[] = principlesInput
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((statement, idx) => ({ id: `p-${idx + 1}`, statement }));

      const res = await fetch("/api/direction/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ principles }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Prinsip hidup berhasil disimpan!");
        setIsEditPrinciplesOpen(false);
        router.refresh();
      } else {
        alert(data.error?.message || "Gagal menyimpan prinsip.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Save Values
  async function handleSaveValues(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const coreValues: CoreValueItem[] = valuesInput
        .split(",")
        .map((s, idx) => ({ id: `val-${idx + 1}`, name: s.trim() }))
        .filter((v) => v.name.length > 0);

      const res = await fetch("/api/direction/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coreValues }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Nilai-nilai inti berhasil disimpan!");
        setIsEditValuesOpen(false);
        router.refresh();
      } else {
        alert(data.error?.message || "Gagal menyimpan nilai inti.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Save Strengths & Growth Areas
  async function handleSaveStrengths(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const strengths = strengthsForm.strengths
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const growthAreas = strengthsForm.growthAreas
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/direction/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strengths, growthAreas }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Kekuatan & area pengembangan diperbarui!");
        setIsEditStrengthsOpen(false);
        router.refresh();
      } else {
        alert(data.error?.message || "Gagal menyimpan kekuatan.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Save Roles
  async function handleSaveRoles(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const importantRoles: ImportantRoleItem[] = rolesInput
        .split(",")
        .map((r, idx) => ({ id: `role-${idx + 1}`, role: r.trim() }))
        .filter((r) => r.role.length > 0);

      const res = await fetch("/api/direction/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importantRoles }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Peran penting berhasil disimpan!");
        setIsEditRolesOpen(false);
        router.refresh();
      } else {
        alert(data.error?.message || "Gagal menyimpan peran.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Save Vision
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

  // Create Chapter
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
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Close Chapter
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
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Add Focus Area to Active Chapter
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

  // Delete Focus Area
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

  // Save Reflection
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

  // Delete Reflection
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

  // Avatar file upload simulation
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomAvatar(url);
      showToast("Avatar berhasil diperbarui!");
    }
  }

  const moodOptions = [
    { label: "Semangat", emoji: "😊", quote: `Semangat, ${firstName}! Kamu sudah melangkah dan melakukan banyak hal baik hari ini. 💪` },
    { label: "Produktif", emoji: "⚡", quote: "Momentum kognitif prima! Manfaatkan energi tinggi ini untuk menyelesaikan fokus utama." },
    { label: "Tenang", emoji: "🧘", quote: "Pikiran hening dan tenang melahirkan kejernihan arah serta keputusan terbaik." },
    { label: "Fokus", emoji: "🔥", quote: "Singkirkan distraksi, nikmati alur pengerjaan satu tugas mendalam saat ini." },
    { label: "Lelah", emoji: "😴", quote: "Istirahat juga bagian dari produktivitas. Pulihkan fisik dan energimu." },
  ];

  const currentMoodObj = moodOptions.find((m) => m.label === userMood) || moodOptions[0];

  // Calculate Real Overall Progress from active goals
  const totalGoalProgress = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((acc, g) => acc + g.progress, 0) / activeGoals.length)
    : 0;

  // Real Area Progress Breakdown
  const areaBreakdown = availableAreas.map((area) => {
    const goalsInArea = activeGoals.filter((g) => g.areaName === area.name);
    const avgProg = goalsInArea.length > 0
      ? Math.round(goalsInArea.reduce((acc, g) => acc + g.progress, 0) / goalsInArea.length)
      : 0;
    return {
      name: area.name,
      color: area.color,
      progress: avgProg,
    };
  });

  return (
    <div className="space-y-6 pb-20 text-slate-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-zinc-900/95 border border-indigo-500/40 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <Icon name="check" size={14} />
          </span>
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HERO BANNER (Centerpiece Anime Sunset Study Room)                      */}
      {/* ========================================================================= */}
      <section className="relative w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl min-h-[380px] md:min-h-[420px] flex flex-col justify-between p-6 md:p-8 bg-zinc-950">
        {/* Background Image with Ambient Glow */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero-study-sunset.jpg"
            alt="Study Room Anime Sunset"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center scale-[1.01]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/85 via-zinc-950/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent" />
        </div>

        {/* Hero Top Content (Greeting & Subtitle) */}
        <div className="relative z-10 max-w-xl space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white drop-shadow-md">
            Halo, {rawName}! 👋
          </h1>
          <p className="text-sm md:text-[15px] font-normal text-zinc-200/90 leading-relaxed drop-shadow">
            Setiap langkah kecil yang kamu ambil hari ini, adalah bagian dari masa depan besar yang kamu bangun.
          </p>
        </div>

        {/* Hero Bottom Row: Left Quote Card, Right Floating Sticky Notes */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pt-6">
          {/* Floating Glass Quote Card */}
          <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-zinc-950/60 p-3.5 backdrop-blur-md shadow-xl max-w-md">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/25 text-amber-300 shadow-inner">
              <span className="text-xs font-serif font-black">“</span>
            </span>
            <div className="space-y-1">
              <p className="text-xs italic text-zinc-200 font-serif leading-relaxed">
                &ldquo;Proses mungkin tidak selalu mudah, tapi kamu sudah sejauh ini, dan itu luar biasa.&rdquo;
              </p>
              <p className="text-[10.5px] font-semibold tracking-wider text-zinc-400">
                — MyLife
              </p>
            </div>
          </div>

          {/* Right Floating Elements: Sticky Note 1 ("Fokus hari ini") & Sticky Note 2 ("Better Version of Me") */}
          <div className="flex items-end gap-3 self-end md:self-auto">
            {/* Sticky Note 1: Fokus Hari Ini Checklist (REAL DATA) */}
            <div className="relative w-64 md:w-72 rounded-xl bg-[#FFFDF8]/95 p-3.5 text-zinc-800 shadow-2xl border border-amber-200/60 backdrop-blur-md transform hover:-translate-y-0.5 transition-transform">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-3.5 rounded-xs bg-amber-200/70 border border-amber-300/40 shadow-xs backdrop-blur-xs" />

              <div className="flex items-center justify-between pb-2 border-b border-zinc-200/70">
                <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 tracking-tight">
                  <Icon name="check" size={13} />
                  Fokus hari ini
                </span>
                <span className="text-[10px] font-semibold text-zinc-500">
                  {completedCount}/{tasksState.length}
                </span>
              </div>

              {/* Tasks Checklist */}
              <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-0.5 scrollbar-thin">
                {tasksState.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => handleToggleTask(task.id, task.done)}
                    className="flex w-full items-center gap-2 text-left group cursor-pointer"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                        task.done
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                          : "border-zinc-400 bg-white group-hover:border-indigo-400"
                      }`}
                    >
                      {task.done && <Icon name="check" size={11} />}
                    </span>
                    <span
                      className={`text-xs truncate transition-colors ${
                        task.done
                          ? "line-through text-zinc-400"
                          : "text-zinc-700 group-hover:text-zinc-900 font-medium"
                      }`}
                    >
                      {task.text}
                    </span>
                  </button>
                ))}
              </div>

              {/* Progress bar */}
              <div className="mt-2.5 pt-1.5">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                    style={{ width: `${tasksState.length > 0 ? (completedCount / tasksState.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Sticky Note 2: "Better Version of Me" */}
            <div className="hidden lg:flex flex-col items-center justify-center rounded-lg bg-[#FFF7C2] px-3 py-3 text-center shadow-lg border border-amber-300/60 rotate-2 select-none w-20 shrink-0">
              <span className="text-[11px] font-serif italic font-bold text-zinc-800 leading-tight">
                Better
              </span>
              <span className="text-[11px] font-serif italic font-bold text-zinc-800 leading-tight">
                Version
              </span>
              <span className="text-[10px] font-serif italic font-medium text-zinc-600 leading-tight mt-0.5">
                of Me
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. SEGMENTED NAVIGATION TABS (Below Hero)                                */}
      {/* ========================================================================= */}
      <nav aria-label="Tab navigasi beranda" className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("identity")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer shrink-0 ${
            activeTab === "identity"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/40"
              : "border border-white/10 bg-zinc-900/80 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
          }`}
        >
          <Icon name="user" size={14} />
          Identitas Diri
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("vision")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer shrink-0 ${
            activeTab === "vision"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/40"
              : "border border-white/10 bg-zinc-900/80 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
          }`}
        >
          <span>⭐</span>
          Visi & Aspirasi
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("principles")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer shrink-0 ${
            activeTab === "principles"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/40"
              : "border border-white/10 bg-zinc-900/80 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
          }`}
        >
          <span>🛡️</span>
          Nilai & Prinsip
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reflections")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer shrink-0 ${
            activeTab === "reflections"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/40"
              : "border border-white/10 bg-zinc-900/80 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
          }`}
        >
          <span>📖</span>
          Jurnal Refleksi
          {allReflections.length > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {allReflections.length}
            </span>
          )}
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* 3. MAIN CONTENT: TAB 1 (IDENTITAS DIRI)                                  */}
      {/* ========================================================================= */}
      {activeTab === "identity" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ================= LEFT & CENTER COLUMN (8 COLS) ===================== */}
          <div className="lg:col-span-8 space-y-6">
            {/* ROW 1: Identitas Diri & Ringkasan Hidup */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Card 1: Identitas Diri (7 cols) */}
              <div className="md:col-span-7 rounded-2xl border border-white/10 bg-zinc-900/85 p-5 shadow-xl backdrop-blur-md flex flex-col justify-between relative group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 ring-2 ring-amber-400/30 text-amber-300">
                        <Icon name="user" size={15} />
                      </span>
                      <h2 className="text-base font-bold text-white tracking-tight">
                        Identitas Diri
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditIdentityOpen(true)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                      title="Edit Identitas"
                    >
                      <Icon name="edit" size={13} />
                    </button>
                  </div>

                  {bioText ? (
                    <p className="text-xs text-zinc-300 leading-relaxed line-clamp-5">
                      {bioText}
                    </p>
                  ) : (
                    <div className="py-2 space-y-1.5 text-zinc-400 text-xs">
                      <p>Belum ada ringkasan bio identitas diri.</p>
                      <button
                        type="button"
                        onClick={() => setIsEditIdentityOpen(true)}
                        className="text-indigo-400 font-semibold hover:underline"
                      >
                        + Tuliskan profil dan identitas Anda →
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-white/[0.06] mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsEditBioFullOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Selengkapnya <Icon name="arrowRight" size={12} />
                  </button>
                  {currentSituationText && (
                    <span className="text-[11px] text-zinc-400 truncate max-w-[200px]">
                      {currentSituationText}
                    </span>
                  )}
                </div>
              </div>

              {/* Card 2: Ringkasan Hidup (5 cols) (REAL DATA) */}
              <div className="md:col-span-5 rounded-2xl border border-white/10 bg-zinc-900/85 p-5 shadow-xl backdrop-blur-md space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                      <Icon name="flag" size={14} />
                    </span>
                    <h2 className="text-sm font-bold text-white tracking-tight">
                      Ringkasan Hidup
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditIdentityOpen(true)}
                    className="text-[11px] text-zinc-400 hover:text-white"
                  >
                    Edit
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Situasi Saat Ini */}
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 mt-0.5">
                      🎓
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">Situasi Saat Ini</p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {currentSituationText || "Belum diisi"}
                      </p>
                    </div>
                  </div>

                  {/* Fokus Utama (Babak Aktif) */}
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-pink-500/20 text-pink-400 mt-0.5">
                      🎯
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">Fokus Utama</p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {initialActiveChapter ? initialActiveChapter.title : "Belum ada babak aktif"}
                      </p>
                    </div>
                  </div>

                  {/* Target Jangka Pendek */}
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5">
                      📱
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">Target Jangka Pendek</p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {activeGoals.length > 0
                          ? activeGoals.slice(0, 2).map((g) => g.title).join(", ")
                          : "Belum ada target aktif"}
                      </p>
                    </div>
                  </div>

                  {/* Target Jangka Panjang / Visi */}
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
                      🏛️
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">Target Jangka Panjang</p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {initialVision?.desiredIdentity || initialVision?.statement || "Belum ditentukan"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 2: Nilai-Nilai Inti (Cream), Prinsip Hidup (01-09), Kekuatan & Area */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
              {/* Card 3: Nilai-Nilai Inti (The Warm Cream Card) - 4 cols */}
              <div className="md:col-span-4 rounded-2xl border border-[#EADBBD] bg-[#FFFBF0] text-zinc-900 p-4 shadow-lg relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🌱</span>
                      <h2 className="text-sm font-bold text-zinc-900 tracking-tight">
                        Nilai-Nilai Inti
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditValuesOpen(true)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E8DFC8] text-zinc-600 hover:bg-black/5 hover:text-zinc-900 transition-colors cursor-pointer"
                      title="Edit Nilai-Nilai Inti"
                      aria-label="Edit Nilai-Nilai Inti"
                    >
                      <Icon name="edit" size={13} />
                    </button>
                  </div>

                  {/* Pills Grid (2 Columns, neat and compact like mockup) */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {parsedValues.length > 0 ? (
                      parsedValues.map((val) => (
                        <div
                          key={val.id}
                          className="flex items-center gap-1.5 rounded-xl border border-[#E8DFC8] bg-white/90 px-2.5 py-1 text-[11px] font-medium text-zinc-800 shadow-xs hover:border-amber-400 hover:bg-white transition-all"
                        >
                          <span className="text-xs shrink-0">{getValueIcon(val.name)}</span>
                          <span className="truncate" title={val.name}>{val.name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 py-2 text-xs text-zinc-500">
                        <p>Belum ada nilai inti.</p>
                        <button
                          type="button"
                          onClick={() => setIsEditValuesOpen(true)}
                          className="text-amber-800 font-semibold hover:underline"
                        >
                          Tambah Nilai Inti →
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Mountain & Sun Hand-Drawn Doodle */}
                <div className="self-end pt-1.5 text-zinc-500 opacity-60 flex items-center justify-end">
                  <svg
                    className="w-10 h-6 text-amber-800/70"
                    viewBox="0 0 52 28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 25L18 8L28 20L36 12L48 25" />
                    <path d="M14 13L18 8L22 13" fill="currentColor" fillOpacity="0.15" />
                    <path d="M32 17L36 12L40 17" fill="currentColor" fillOpacity="0.15" />
                    <circle cx="38" cy="6" r="3" fill="currentColor" fillOpacity="0.3" stroke="none" />
                    <path d="M7 25H45" strokeWidth="1" strokeDasharray="2 2" />
                  </svg>
                </div>
              </div>

              {/* Card 4: Prinsip Hidup (Compact with ultra-sleek scrollbar) - 4 cols */}
              <div className="md:col-span-4 rounded-2xl border border-white/10 bg-zinc-900/85 p-4 shadow-xl backdrop-blur-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 text-sm">💡</span>
                      <h2 className="text-sm font-bold text-white tracking-tight">
                        Prinsip Hidup
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditPrinciplesOpen(true)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                      title="Edit Prinsip Hidup"
                      aria-label="Edit Prinsip Hidup"
                    >
                      <Icon name="edit" size={13} />
                    </button>
                  </div>

                  {/* Scrollable list with custom sleek scrollbar */}
                  <div className="space-y-2 max-h-[195px] overflow-y-auto pr-1.5 custom-scrollbar-sleek">
                    {parsedPrinciples.length > 0 ? (
                      parsedPrinciples.map((item, idx) => (
                        <div key={item.id || idx} className="flex items-start gap-2.5 group">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-950/80 border border-indigo-500/30 text-[10px] font-bold text-indigo-300 mt-0.5 shadow-xs group-hover:border-indigo-400 group-hover:text-indigo-200 transition-colors">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <p className="text-[11.5px] text-zinc-300 leading-snug group-hover:text-white transition-colors">
                            {item.statement}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="py-4 text-center space-y-1 text-zinc-400 text-xs">
                        <p>Belum ada prinsip hidup tersimpan.</p>
                        <button
                          type="button"
                          onClick={() => setIsEditPrinciplesOpen(true)}
                          className="text-indigo-400 font-semibold hover:underline"
                        >
                          Tambah Prinsip Hidup →
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 mt-1 border-t border-white/[0.05] flex items-center justify-between text-[10px] text-zinc-500">
                  <span>Scroll untuk prinsip lainnya</span>
                  <span className="font-semibold text-indigo-400/80">{parsedPrinciples.length} Prinsip</span>
                </div>
              </div>

              {/* Card 5: Kekuatan Diri & Area Pengembangan - 4 cols */}
              <div className="md:col-span-4 flex flex-col justify-between space-y-3">
                {/* Subcard A: Kekuatan Diri */}
                <div className="rounded-2xl border border-white/10 bg-zinc-900/85 p-3.5 shadow-md flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-400 text-xs">⚡</span>
                      <h2 className="text-xs font-bold text-white tracking-tight">
                        Kekuatan Diri
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditStrengthsOpen(true)}
                      className="text-[10.5px] text-zinc-400 hover:text-white"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {parsedStrengths.length > 0 ? (
                      parsedStrengths.map((st, i) => (
                        <span
                          key={i}
                          className="rounded-lg bg-zinc-800/90 border border-white/[0.06] px-2 py-0.5 text-[10.5px] text-zinc-300"
                        >
                          {st}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-zinc-500">Belum diisi</span>
                    )}
                  </div>
                </div>

                {/* Subcard B: Area Pengembangan */}
                <div className="rounded-2xl border border-white/10 bg-zinc-900/85 p-3.5 shadow-md flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-400 text-xs">🌱</span>
                      <h2 className="text-xs font-bold text-white tracking-tight">
                        Area Pengembangan
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditStrengthsOpen(true)}
                      className="text-[10.5px] text-zinc-400 hover:text-white"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {parsedGrowthAreas.length > 0 ? (
                      parsedGrowthAreas.map((ga, i) => (
                        <span
                          key={i}
                          className="rounded-lg bg-zinc-800/90 border border-white/[0.06] px-2 py-0.5 text-[10.5px] text-zinc-300"
                        >
                          {ga}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-zinc-500">Belum diisi</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 3: Peran Penting (8 cols) & Sunset Quote Banner (4 cols) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
              <div className="md:col-span-8 rounded-2xl border border-white/10 bg-zinc-900/85 p-4 shadow-xl backdrop-blur-md flex flex-col justify-between space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                      <Icon name="user" size={13} />
                    </span>
                    <h2 className="text-xs font-bold text-white tracking-tight">
                      Peran Penting
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditRolesOpen(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                    title="Edit Peran Penting"
                    aria-label="Edit Peran Penting"
                  >
                    <Icon name="edit" size={13} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {parsedRoles.length > 0 ? (
                    parsedRoles.map((r, idx) => (
                      <span
                        key={r.id || idx}
                        className="rounded-xl border border-white/10 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-200"
                      >
                        {r.role}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-400">
                      Belum ada peran tersimpan. Klik Edit untuk menambah peran hidup Anda.
                    </span>
                  )}
                </div>
              </div>

              {/* Sunset Quote Banner (Right side of Peran Penting) */}
              <div className="md:col-span-4 relative rounded-2xl overflow-hidden border border-white/10 shadow-lg min-h-[96px] flex items-center p-4 bg-zinc-950 group">
                <Image
                  src="/images/sunset-quote-banner.jpg"
                  alt="Sunset Paper Airplane Banner"
                  fill
                  sizes="(max-width: 768px) 100vw, 350px"
                  className="object-cover object-center opacity-75 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/60 to-transparent" />
                <p className="relative z-10 text-[11px] font-serif italic text-amber-200/90 leading-snug max-w-[210px]">
                  &ldquo;Bukan hanya tentang siapa aku sekarang, tapi siapa aku yang ingin menjadi nanti.&rdquo;
                </p>
              </div>
            </div>


          </div>

          {/* ================= RIGHT SIDEBAR WIDGETS (4 COLS) ===================== */}
          <div className="lg:col-span-4 space-y-6">
            {/* Widget 1: Avatar & Mood */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/85 p-5 shadow-xl backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-sm">👑</span>
                  <h2 className="text-sm font-bold text-white tracking-tight">
                    Avatar & Mood
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-indigo-400">Level 2</p>
                  <p className="text-[10px] text-zinc-400">Dalam Proses 35%</p>
                </div>
              </div>

              {/* Progress bar Level */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full w-[35%] rounded-full bg-indigo-500 shadow-sm" />
              </div>

              {/* Avatar Portrait & Speech Bubble */}
              <div className="flex items-center gap-3.5 pt-1">
                {/* Circular Glowing Avatar */}
                <div className="relative h-20 w-20 shrink-0 rounded-full ring-4 ring-indigo-500/30 overflow-hidden shadow-xl bg-zinc-950">
                  <Image
                    src={customAvatar}
                    alt="User Avatar"
                    fill
                    sizes="80px"
                    className="object-cover object-top"
                  />
                </div>

                {/* Speech Bubble */}
                <div className="relative flex-1 rounded-2xl border border-amber-200/40 bg-[#FFF7D6] p-3 text-zinc-800 shadow-md">
                  <div className="absolute -left-2 top-6 h-3 w-3 bg-[#FFF7D6] border-l border-b border-amber-200/40 transform rotate-45" />
                  <p className="text-[11px] font-medium leading-relaxed">
                    {currentMoodObj.quote}
                  </p>
                </div>
              </div>

              {/* Mood Selector & Avatar Change Button */}
              <div className="pt-2 space-y-2">
                <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Mood Hari Ini
                </p>

                <div className="flex items-center gap-2">
                  {/* Mood Selector Button */}
                  <div className="relative flex-1">
                    <button
                      type="button"
                      onClick={() => setIsMoodDropdownOpen(!isMoodDropdownOpen)}
                      className="flex h-9 w-full items-center justify-between rounded-xl border border-white/10 bg-zinc-800/80 px-3 text-xs text-white hover:bg-zinc-800 transition-colors"
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        <span>{currentMoodObj.emoji}</span>
                        <span>{currentMoodObj.label}</span>
                      </span>
                      <Icon name="chevronDown" size={12} />
                    </button>

                    {/* Mood Dropdown Popover */}
                    {isMoodDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1.5 z-30 w-full rounded-xl border border-white/15 bg-zinc-900 p-1.5 shadow-2xl backdrop-blur-xl">
                        {moodOptions.map((m) => (
                          <button
                            key={m.label}
                            type="button"
                            onClick={() => {
                              setUserMood(m.label);
                              setIsMoodDropdownOpen(false);
                              showToast(`Mood diubah ke ${m.label}!`);
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                              userMood === m.label
                                ? "bg-indigo-600/30 text-indigo-300 font-bold"
                                : "text-zinc-300 hover:bg-white/10"
                            }`}
                          >
                            <span>{m.emoji}</span>
                            <span>{m.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ubah Avatar Button */}
                  <label className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer shrink-0">
                    <span>Ubah Avatar</span>
                    <span>🪄</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Widget 2: Progress Keseluruhan (REAL CALCULATION) */}
            <div className="rounded-2xl border border-white/10 bg-zinc-900/85 p-5 shadow-xl backdrop-blur-md space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">📈</span>
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Progress Keseluruhan
                </h2>
              </div>

              {/* Donut Gauge & Encouragement */}
              <div className="flex items-center gap-4">
                {/* SVG Donut Circle Gauge */}
                <div className="relative h-20 w-20 shrink-0">
                  <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-zinc-800"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-indigo-500 transition-all duration-1000 ease-out"
                      strokeDasharray={`${totalGoalProgress}, 100`}
                      strokeLinecap="round"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-base font-black text-white">{totalGoalProgress}%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-serif italic text-zinc-200">
                    &ldquo;Kamu sudah melangkah jauh!&rdquo;
                  </p>
                  <p className="text-[10.5px] text-zinc-400 leading-snug">
                    {activeGoals.length} target aktif sedang berjalan di sistem hidupmu.
                  </p>
                </div>
              </div>

              {/* Progress Breakdown Bars (REAL AREA DATA) */}
              <div className="space-y-2 pt-1">
                {areaBreakdown.length > 0 ? (
                  areaBreakdown.slice(0, 5).map((ab) => (
                    <div key={ab.name} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-300 font-medium">{ab.name}</span>
                        <span className="font-bold text-indigo-400">{ab.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${ab.progress}%`,
                            backgroundColor: ab.color || "#8B5CF6",
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-zinc-500 py-2">
                    Belum ada area kehidupan. Buka Target & Proyek untuk mulai membuat target.
                  </div>
                )}
              </div>
            </div>

            {/* Widget 3: Bottom Motivation Card */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-950/40 p-4 shadow-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
                  🌱
                </span>
                <p className="text-xs text-zinc-200 font-medium leading-snug">
                  Masa depan yang kamu impikan sedang kamu bangun, hari ini.
                </p>
              </div>

              <Link
                href="/goals"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                title="Lihat Target & Proyek"
              >
                <Icon name="arrowRight" size={13} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB 2: VISI & BABAK KEHIDUPAN (FULL SYSTEM)                           */}
      {/* ========================================================================= */}
      {activeTab === "vision" && (
        <div className="space-y-6">
          {/* Vision Statement Banner */}
          <div className="rounded-3xl border border-white/10 bg-zinc-900/85 p-6 shadow-2xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-lg">⭐</span>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Visi Jangka Panjang ({initialVision?.timeHorizonYears || 5} Tahun)
                </h2>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon="edit"
                onClick={() => setIsVisionModalOpen(true)}
                title="Edit Visi"
                aria-label="Edit Visi"
              />
            </div>

            <p className="text-sm md:text-base font-serif italic text-zinc-200 leading-relaxed bg-zinc-950/40 p-4 rounded-2xl border border-white/5">
              &ldquo;{initialVision?.statement || "Belum ada pernyataan visi. Tuliskan kompas masa depan Anda."}&rdquo;
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="rounded-xl border border-white/5 bg-zinc-800/40 p-3.5 space-y-1">
                <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Identitas Yang Dituju</p>
                <p className="text-xs text-zinc-300">{initialVision?.desiredIdentity || "Belum ditentukan"}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-zinc-800/40 p-3.5 space-y-1">
                <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Gaya Hidup Yang Dituju</p>
                <p className="text-xs text-zinc-300">{initialVision?.desiredLifestyle || "Belum ditentukan"}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-zinc-800/40 p-3.5 space-y-1">
                <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Alasan & Purpose</p>
                <p className="text-xs text-zinc-300">{initialVision?.purposeReason || "Belum ditentukan"}</p>
              </div>
            </div>
          </div>

          {/* Active Chapter Card */}
          <div className="rounded-3xl border border-white/10 bg-zinc-900/85 p-6 shadow-2xl backdrop-blur-md space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Babak Kehidupan Aktif</span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  {initialActiveChapter ? initialActiveChapter.title : "Belum ada babak kehidupan aktif"}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {initialActiveChapter ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsFocusAreaModalOpen(true)}
                    >
                      <Icon name="plus" size={13} /> Tambah Fokus
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setIsCloseChapterModalOpen(true)}
                    >
                      Selesaikan Babak
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsChapterModalOpen(true)}
                  >
                    <Icon name="plus" size={13} /> Buat Babak Baru
                  </Button>
                )}
              </div>
            </div>

            {initialActiveChapter && (
              <>
                {initialActiveChapter.description && (
                  <p className="text-xs text-zinc-300 leading-relaxed max-w-3xl">
                    {initialActiveChapter.description}
                  </p>
                )}

                {/* Focus Areas */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Area Fokus Babak Ini</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {initialActiveChapter.focusAreas.map((fa) => (
                      <div key={fa.id} className="rounded-xl border border-white/10 bg-zinc-800/60 p-3.5 space-y-1 relative group">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-white">{fa.title}</p>
                          <button
                            type="button"
                            onClick={() => handleDeleteFocusArea(fa.id)}
                            className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 transition-opacity"
                            title="Hapus fokus"
                          >
                            <Icon name="trash" size={12} />
                          </button>
                        </div>
                        {fa.intention && <p className="text-[11px] text-zinc-400">{fa.intention}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Archived Chapters */}
          {allChapters.length > 1 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Riwayat Babak Sebelumnya</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allChapters.filter((c) => !c.isActive).map((chap) => (
                  <div key={chap.id} className="rounded-xl border border-white/5 bg-zinc-900/60 p-4 space-y-1">
                    <p className="text-xs font-bold text-zinc-300">{chap.title}</p>
                    {chap.description && <p className="text-[11px] text-zinc-500 line-clamp-2">{chap.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB 3: NILAI & PRINSIP (FULL MANAGEMENT)                               */}
      {/* ========================================================================= */}
      {activeTab === "principles" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Prinsip Hidup Detail */}
          <div className="md:col-span-7 rounded-3xl border border-white/10 bg-zinc-900/85 p-6 shadow-2xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-base">💡</span>
                <h3 className="text-base font-bold text-white">Prinsip Hidup Pegangan</h3>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon="edit"
                onClick={() => setIsEditPrinciplesOpen(true)}
                title="Edit Prinsip"
                aria-label="Edit Prinsip"
              />
            </div>

            <div className="space-y-2.5">
              {parsedPrinciples.length > 0 ? (
                parsedPrinciples.map((st, i) => (
                  <div key={st.id || i} className="flex items-start gap-3 rounded-xl border border-white/5 bg-zinc-800/40 p-3.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <p className="text-xs text-zinc-200 font-medium leading-relaxed">{st.statement}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 py-4">Belum ada prinsip hidup tersimpan.</p>
              )}
            </div>
          </div>

          {/* Nilai Fundamental Detail */}
          <div className="md:col-span-5 rounded-3xl border border-[#EADBBD] bg-[#FFFBF0] text-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🌱</span>
                <h3 className="text-base font-bold text-zinc-900">Nilai Fundamental</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditValuesOpen(true)}
                className="text-xs font-semibold text-zinc-700 hover:text-zinc-900"
              >
                Edit Nilai
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {parsedValues.map((val) => (
                <div key={val.id} className="rounded-xl border border-zinc-300/80 bg-white/90 p-3 shadow-xs">
                  <p className="text-xs font-bold text-zinc-900">{val.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB 4: JURNAL REFLEKSI (FULL SYSTEM)                                   */}
      {/* ========================================================================= */}
      {activeTab === "reflections" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Jurnal Refleksi Diri</h2>
              <p className="text-xs text-zinc-400">Evaluasi berkala perjalanan babak hidup dan keselarasan diri.</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setIsReflectionModalOpen(true)}>
              <Icon name="plus" size={13} /> Tulis Refleksi Baru
            </Button>
          </div>

          {allReflections.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-12 text-center space-y-3">
              <span className="text-3xl">📖</span>
              <p className="text-sm text-zinc-300 font-semibold">Belum ada catatan refleksi yang tersimpan.</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Tuliskan refleksi berkala untuk mengevaluasi apakah langkah harian Anda masih selaras dengan tujuan babak hidup Anda.
              </p>
              <Button variant="secondary" size="sm" onClick={() => setIsReflectionModalOpen(true)}>
                Mulai Tulis Refleksi
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {allReflections.map((ref) => (
                <div key={ref.id} className="rounded-2xl border border-white/10 bg-zinc-900/85 p-5 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">{ref.title}</h3>
                      <p className="text-[10.5px] text-zinc-500">
                        {new Date(ref.createdAt).toLocaleDateString("id-ID", { dateStyle: "long" })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteReflection(ref.id)}
                      className="text-zinc-500 hover:text-rose-400 transition-colors"
                      title="Hapus refleksi"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>

                  {ref.recentFocusNotes && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-indigo-400">Fokus Terakhir:</p>
                      <p className="text-xs text-zinc-300 leading-relaxed">{ref.recentFocusNotes}</p>
                    </div>
                  )}

                  {ref.progressNotes && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-emerald-400">Kemajuan / Hambatan:</p>
                      <p className="text-xs text-zinc-300 leading-relaxed">{ref.progressNotes}</p>
                    </div>
                  )}

                  {ref.nextFocus && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-amber-400">Fokus Babak Selanjutnya:</p>
                      <p className="text-xs text-zinc-300 leading-relaxed">{ref.nextFocus}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. ALL INTERACTIVE MODALS                                                 */}
      {/* ========================================================================= */}

      {/* Modal: Edit Identitas Diri */}
      <Dialog
        open={isEditIdentityOpen}
        onClose={() => setIsEditIdentityOpen(false)}
        title="Edit Identitas Diri"
      >
        <form onSubmit={handleSaveIdentity} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Deskripsi / Bio Diri</label>
            <textarea
              value={identityForm.bio}
              onChange={(e) => setIdentityForm({ ...identityForm, bio: e.target.value })}
              rows={5}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
              placeholder="Tulis narasi tentang siapa diri Anda, apa yang Anda perjuangkan..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Situasi / Status Saat Ini</label>
            <input
              type="text"
              value={identityForm.currentSituation}
              onChange={(e) => setIdentityForm({ ...identityForm, currentSituation: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              placeholder="Contoh: Mahasiswa Aktif Teknik Informatika • UPI YPTK Padang"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={() => setIsEditIdentityOpen(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Baca Selengkapnya Bio */}
      <Dialog open={isEditBioFullOpen} onClose={() => setIsEditBioFullOpen(false)} title="Identitas Diri Lengkap">
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 ring-2 ring-amber-400/30">
              <Icon name="user" size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-white">{rawName}</p>
              <p className="text-xs text-zinc-400">{identityForm.currentSituation}</p>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/90 p-4 text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
            {bioText || "Belum ada bio identitas yang disimpan."}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsEditBioFullOpen(false);
                setIsEditIdentityOpen(true);
              }}
            >
              Edit Narasi
            </Button>
            <Button type="button" onClick={() => setIsEditBioFullOpen(false)}>
              Tutup
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal: Edit Prinsip Hidup */}
      <Dialog open={isEditPrinciplesOpen} onClose={() => setIsEditPrinciplesOpen(false)} title="Edit Prinsip Hidup">
        <form onSubmit={handleSavePrinciples} className="space-y-4 pt-2">
          <p className="text-xs text-zinc-400">
            Tuliskan prinsip hidup Anda (satu prinsip per baris). Sistem akan otomatis menampilkannya bernomor 01, 02, dst.
          </p>
          <textarea
            value={principlesInput}
            onChange={(e) => setPrinciplesInput(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
            placeholder="01. Terus belajar dan berkembang..."
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={() => setIsEditPrinciplesOpen(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Prinsip"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Edit Nilai Inti */}
      <Dialog open={isEditValuesOpen} onClose={() => setIsEditValuesOpen(false)} title="Edit Nilai-Nilai Inti">
        <form onSubmit={handleSaveValues} className="space-y-4 pt-2">
          <p className="text-xs text-zinc-400">
            Tuliskan nilai-nilai inti pegangan hidup Anda (pisahkan dengan koma).
          </p>
          <textarea
            value={valuesInput}
            onChange={(e) => setValuesInput(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
            placeholder="Pembelajaran, Kemandirian, Tanggung Jawab, Integritas..."
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={() => setIsEditValuesOpen(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Nilai Inti"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Edit Kekuatan & Area Pengembangan */}
      <Dialog open={isEditStrengthsOpen} onClose={() => setIsEditStrengthsOpen(false)} title="Edit Kekuatan & Area Pengembangan">
        <form onSubmit={handleSaveStrengths} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Kekuatan Diri (Pisahkan koma)</label>
            <input
              type="text"
              value={strengthsForm.strengths}
              onChange={(e) => setStrengthsForm({ ...strengthsForm, strengths: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              placeholder="Rasa ingin tahu, Kemauan belajar, Kreativitas..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Area Pengembangan (Pisahkan koma)</label>
            <input
              type="text"
              value={strengthsForm.growthAreas}
              onChange={(e) => setStrengthsForm({ ...strengthsForm, growthAreas: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              placeholder="Disiplin diri, Manajemen waktu, Logika & algoritma..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={() => setIsEditStrengthsOpen(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Edit Peran Penting */}
      <Dialog open={isEditRolesOpen} onClose={() => setIsEditRolesOpen(false)} title="Edit Peran Penting">
        <form onSubmit={handleSaveRoles} className="space-y-4 pt-2">
          <p className="text-xs text-zinc-400">
            Tuliskan peran penting yang Anda jalani dalam hidup (pisahkan dengan koma).
          </p>
          <textarea
            value={rolesInput}
            onChange={(e) => setRolesInput(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
            placeholder="Anak, Mahasiswa, Calon Software Engineer, Pembelajar..."
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={() => setIsEditRolesOpen(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Peran"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Edit Visi */}
      <Dialog open={isVisionModalOpen} onClose={() => setIsVisionModalOpen(false)} title="Edit Visi Jangka Panjang">
        <form onSubmit={handleSaveVision} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Pernyataan Visi Utama</label>
            <textarea
              value={visionForm.statement}
              onChange={(e) => setVisionForm({ ...visionForm, statement: e.target.value })}
              rows={4}
              required
              className="w-full rounded-xl border border-white/10 bg-zinc-900 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
              placeholder="Visi hidup Anda..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Identitas Yang Dituju</label>
              <input
                type="text"
                value={visionForm.desiredIdentity}
                onChange={(e) => setVisionForm({ ...visionForm, desiredIdentity: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 p-2 text-xs text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Gaya Hidup Yang Dituju</label>
              <input
                type="text"
                value={visionForm.desiredLifestyle}
                onChange={(e) => setVisionForm({ ...visionForm, desiredLifestyle: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 p-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={() => setIsVisionModalOpen(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Visi"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Buat Babak Baru */}
      <Dialog open={isChapterModalOpen} onClose={() => setIsChapterModalOpen(false)} title="Buat Babak Kehidupan Baru">
        <form onSubmit={handleCreateChapter} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Judul Babak</label>
            <input
              type="text"
              value={chapterForm.title}
              onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
              required
              className="w-full rounded-xl border border-white/10 bg-zinc-900 p-2.5 text-xs text-white"
              placeholder="Contoh: Menyelesaikan Skripsi & Membangun Portofolio"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Deskripsi & Tujuan Babak</label>
            <textarea
              value={chapterForm.description}
              onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 p-2.5 text-xs text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={() => setIsChapterModalOpen(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Membuat..." : "Buat Babak"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Tutup Babak */}
      <Dialog open={isCloseChapterModalOpen} onClose={() => setIsCloseChapterModalOpen(false)} title="Selesaikan & Tutup Babak">
        <form onSubmit={handleCloseChapter} className="space-y-4 pt-2">
          <p className="text-xs text-zinc-400">
            Apakah Anda yakin ingin menyelesaikan dan mengarsipkan babak ini?
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Catatan Refleksi Penutupan Babak</label>
            <textarea
              value={closeChapterNotes}
              onChange={(e) => setCloseChapterNotes(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 p-2.5 text-xs text-white"
              placeholder="Pelajaran apa yang Anda petik dari babak ini..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={() => setIsCloseChapterModalOpen(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" variant="danger" disabled={isSubmitting}>
              {isSubmitting ? "Menutup..." : "Selesaikan Babak"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Tambah Fokus Babak */}
      <Dialog open={isFocusAreaModalOpen} onClose={() => setIsFocusAreaModalOpen(false)} title="Tambah Fokus Babak">
        <form onSubmit={handleAddFocusArea} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Judul Fokus</label>
            <input
              type="text"
              value={focusAreaForm.title}
              onChange={(e) => setFocusAreaForm({ ...focusAreaForm, title: e.target.value })}
              required
              className="w-full rounded-xl border border-white/10 bg-zinc-900 p-2.5 text-xs text-white"
              placeholder="Contoh: Fokus Skripsi Bab 1-3"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Intensi / Harapan</label>
            <input
              type="text"
              value={focusAreaForm.intention}
              onChange={(e) => setFocusAreaForm({ ...focusAreaForm, intention: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 p-2.5 text-xs text-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Tautkan ke Area (Opsional)</label>
            <select
              value={focusAreaForm.areaId}
              onChange={(e) => setFocusAreaForm({ ...focusAreaForm, areaId: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 p-2.5 text-xs text-white"
            >
              <option value="">-- Tanpa Area Khusus --</option>
              {availableAreas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={() => setIsFocusAreaModalOpen(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menambahkan..." : "Tambah Fokus"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Tulis Refleksi Baru */}
      <Dialog open={isReflectionModalOpen} onClose={() => setIsReflectionModalOpen(false)} title="Tulis Jurnal Refleksi Baru">
        <form onSubmit={handleSaveReflection} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Judul Refleksi</label>
            <input
              type="text"
              value={reflectionForm.title}
              onChange={(e) => setReflectionForm({ ...reflectionForm, title: e.target.value })}
              required
              className="w-full rounded-xl border border-white/10 bg-zinc-900 p-2.5 text-xs text-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Apa yang paling menyita fokus akhir-akhir ini?</label>
            <textarea
              value={reflectionForm.recentFocusNotes}
              onChange={(e) => setReflectionForm({ ...reflectionForm, recentFocusNotes: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 p-2.5 text-xs text-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Perkembangan atau kendala utama?</label>
            <textarea
              value={reflectionForm.progressNotes}
              onChange={(e) => setReflectionForm({ ...reflectionForm, progressNotes: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 p-2.5 text-xs text-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Fokus babak selanjutnya yang perlu diprioritaskan?</label>
            <input
              type="text"
              value={reflectionForm.nextFocus}
              onChange={(e) => setReflectionForm({ ...reflectionForm, nextFocus: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 p-2.5 text-xs text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={() => setIsReflectionModalOpen(false)} disabled={isSubmitting}>
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
