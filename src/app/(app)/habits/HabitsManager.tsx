"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/ui/Icon";
import { useToast } from "@/app/components/ui/Toast";
import { HabitCard, type HabitWithRelations } from "@/app/(app)/habits/HabitCard";
import { HabitFormModal } from "@/app/(app)/habits/HabitFormModal";
import { CheckInModal } from "@/app/(app)/habits/CheckInModal";

type Area = { id: string; name: string; color: string };

interface HabitsManagerProps {
  initialHabits: HabitWithRelations[];
  areas: Area[];
}

type Tab = "good" | "bad";

export function HabitsManager({ initialHabits, areas }: HabitsManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [habits, setHabits] = useState<HabitWithRelations[]>(initialHabits);
  const [activeTab, setActiveTab] = useState<Tab>("bad");
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithRelations | null>(null);
  const [checkInHabit, setCheckInHabit] = useState<HabitWithRelations | null>(null);
  const [formType, setFormType] = useState<Tab>("good");

  const goodHabits = habits.filter((h) => h.type === "GOOD");
  const badHabits = habits.filter((h) => h.type === "BAD");
  const displayed = activeTab === "good" ? goodHabits : badHabits;

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  const handleCreate = useCallback(
    async (data: Record<string, unknown>) => {
      try {
        const res = await fetch("/api/habits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        toast("Kebiasaan berhasil ditambahkan! 🎉", "success");
        setHabits((prev) => [...prev, json.data]);
        setShowForm(false);
        refresh();
      } catch (e) {
        toast((e as Error).message || "Gagal membuat kebiasaan.", "error");
      }
    },
    [toast, refresh],
  );

  const handleUpdate = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      try {
        const res = await fetch(`/api/habits/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        toast("Kebiasaan berhasil diperbarui!", "success");
        setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...data } : h)));
        setEditingHabit(null);
        refresh();
      } catch (e) {
        toast((e as Error).message || "Gagal mengupdate kebiasaan.", "error");
      }
    },
    [toast, refresh],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Hapus kebiasaan ini? Semua data log akan ikut terhapus.")) return;
      try {
        const res = await fetch(`/api/habits/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        toast("Kebiasaan dihapus.", "info");
        setHabits((prev) => prev.filter((h) => h.id !== id));
      } catch (e) {
        toast((e as Error).message || "Gagal menghapus.", "error");
      }
    },
    [toast],
  );

  const handleCheckIn = useCallback(
    async (habitId: string, data: Record<string, unknown>) => {
      try {
        const res = await fetch(`/api/habits/${habitId}/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        const result = json.data;
        // Update local habit streak
        setHabits((prev) =>
          prev.map((h) => {
            if (h.id !== habitId) return h;
            const updatedStreaks = [
              { id: "current", userId: h.userId, habitId: h.id, startDate: new Date().toISOString(), endDate: null, days: result.streak.currentStreak, isCurrent: true },
            ];
            return { ...h, streaks: updatedStreaks };
          }),
        );

        toast(result.message, result.streak.currentStreak > 0 ? "success" : "info");
        setCheckInHabit(null);
        refresh();
        return result;
      } catch (e) {
        toast((e as Error).message || "Gagal check-in.", "error");
        throw e;
      }
    },
    [toast, refresh],
  );

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* ─── HERO HEADER ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1729] via-[#131825] to-[#1a1040] border border-white/[0.08] p-6 sm:p-8">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-rose-600/15 rounded-full blur-3xl" />
        </div>

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-rose-500 shadow-[0_0_20px_rgba(139,92,246,0.4)]">
                <Icon name="flame" size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Habit Tracker</h1>
                <p className="text-xs text-[#94a3b8]">Ubah hidupmu, satu hari dalam satu waktu</p>
              </div>
            </div>
            <p className="text-sm text-[#94a3b8] max-w-lg mt-3 leading-relaxed">
              Setiap kebiasaan besar dimulai dari satu langkah kecil. Sistem ini dirancang secara psikologis untuk membantumu membangun kebiasaan baik dan melepaskan kebiasaan buruk secara bertahap — tanpa rasa bersalah.
            </p>
          </div>

          {/* Stats badges */}
          <div className="hidden sm:flex flex-col gap-2 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Icon name="trendingUp" size={13} className="text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-300">{goodHabits.length} Kebiasaan Baik</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <Icon name="flame" size={13} className="text-rose-400" />
              <span className="text-xs font-semibold text-rose-300">{badHabits.length} Kebiasaan Buruk</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── TABS + ADD BUTTON ─── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#131825]/90 border border-white/[0.08]">
          <button
            onClick={() => setActiveTab("bad")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-semibold ${
              activeTab === "bad"
                ? "bg-rose-500/20 text-rose-200 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-transparent"
            }`}
          >
            <Icon name="flame" size={14} className={activeTab === "bad" ? "text-rose-400" : ""} />
            Ubah Kebiasaan Buruk
            {badHabits.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/30 text-rose-200">
                {badHabits.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("good")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-semibold ${
              activeTab === "good"
                ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-transparent"
            }`}
          >
            <Icon name="trendingUp" size={14} className={activeTab === "good" ? "text-emerald-400" : ""} />
            Kebiasaan Baru
            {goodHabits.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/30 text-emerald-200">
                {goodHabits.length}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={() => {
            setFormType(activeTab);
            setEditingHabit(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold hover:from-purple-500 hover:to-indigo-500 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.4)]"
        >
          <Icon name="plus" size={15} />
          Tambah Kebiasaan
        </button>
      </div>

      {/* ─── PSYCHOLOGICAL TIP BANNER ─── */}
      {activeTab === "bad" && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="shrink-0 mt-0.5">
            <Icon name="brain" size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-300 mb-0.5">💡 Tips Psikologi</p>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              Kebiasaan buruk tidak bisa langsung dihapus — otak tidak bekerja seperti itu. Yang bisa kita lakukan adalah{" "}
              <strong className="text-amber-300">mengganti rutinnya</strong> dengan yang positif, dan{" "}
              <strong className="text-amber-300">memperpanjang rentang waktu bebas</strong> secara bertahap. Relapse adalah bagian normal dari proses — yang penting adalah bangkit lagi.
            </p>
          </div>
        </div>
      )}

      {activeTab === "good" && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="shrink-0 mt-0.5">
            <Icon name="lightbulb" size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-300 mb-0.5">🌱 Membangun Kebiasaan Baru</p>
            <p className="text-xs text-emerald-200/80 leading-relaxed">
              Riset James Clear (Atomic Habits) menunjukkan kebiasaan terbentuk melalui <strong className="text-emerald-300">Cue → Routine → Reward</strong>. Tambahkan pemicu (cue) dan hadiah kecil (reward) agar otak lebih mudah memprogram kebiasaan baru. Rata-rata dibutuhkan <strong className="text-emerald-300">66 hari</strong> untuk kebiasaan menjadi otomatis.
            </p>
          </div>
        </div>
      )}

      {/* ─── HABIT CARDS ─── */}
      {displayed.length === 0 ? (
        <EmptyState
          type={activeTab}
          onAdd={() => {
            setFormType(activeTab);
            setEditingHabit(null);
            setShowForm(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayed.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onCheckIn={() => setCheckInHabit(habit)}
              onEdit={() => {
                setEditingHabit(habit);
                setFormType(habit.type === "GOOD" ? "good" : "bad");
                setShowForm(true);
              }}
              onDelete={() => handleDelete(habit.id)}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      {/* ─── FORM MODAL ─── */}
      {showForm && (
        <HabitFormModal
          type={formType}
          areas={areas}
          habit={editingHabit}
          onClose={() => { setShowForm(false); setEditingHabit(null); }}
          onSubmit={(data: Record<string, unknown>) => {
            if (editingHabit) {
              handleUpdate(editingHabit.id, data);
            } else {
              handleCreate({ ...data, type: formType === "good" ? "GOOD" : "BAD" });
            }
          }}
        />
      )}

      {/* ─── CHECK-IN MODAL ─── */}
      {checkInHabit && (
        <CheckInModal
          habit={checkInHabit}
          onClose={() => setCheckInHabit(null)}
          onSubmit={(data: Record<string, unknown>) => handleCheckIn(checkInHabit.id, data)}
        />
      )}
    </div>
  );
}

function EmptyState({ type, onAdd }: { type: Tab; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-2xl mb-5 ${
          type === "bad"
            ? "bg-rose-500/10 border border-rose-500/20"
            : "bg-emerald-500/10 border border-emerald-500/20"
        }`}
      >
        <Icon
          name={type === "bad" ? "flame" : "trendingUp"}
          size={36}
          className={type === "bad" ? "text-rose-400" : "text-emerald-400"}
        />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">
        {type === "bad" ? "Belum ada kebiasaan buruk yang dilacak" : "Belum ada kebiasaan baru"}
      </h3>
      <p className="text-sm text-[#94a3b8] max-w-sm mb-6 leading-relaxed">
        {type === "bad"
          ? "Tambahkan kebiasaan yang ingin kamu ubah. Sistem akan membantumu melewatinya step by step secara psikologis."
          : "Tambahkan kebiasaan positif yang ingin kamu bangun. Konsistensi kecil menghasilkan perubahan besar."}
      </p>
      <button
        onClick={onAdd}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
          type === "bad"
            ? "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]"
            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]"
        }`}
      >
        <Icon name="plus" size={15} />
        {type === "bad" ? "Tambah Kebiasaan Buruk" : "Tambah Kebiasaan Baru"}
      </button>
    </div>
  );
}
