"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { useToast } from "./ui/Toast";

const goalTypes = [
  { value: "LEARNING", label: "Pembelajaran (Belajar Hal Baru)" },
  { value: "ACHIEVEMENT", label: "Pencapaian (Target Tertentu)" },
  { value: "HABIT", label: "Kebiasaan (Membangun Rutinitas)" },
  { value: "MAINTENANCE", label: "Pemeliharaan (Menjaga Standar)" },
];

export type AreaOption = {
  id: string;
  name: string;
  color?: string;
};

type NewGoalButtonProps = {
  areas?: AreaOption[];
  defaultAreaId?: string;
  buttonLabel?: string;
  buttonVariant?: "primary" | "secondary" | "ghost";
  buttonSize?: "sm" | "md" | "lg";
  customTrigger?: (openModal: () => void) => React.ReactNode;
};

export default function NewGoalButton({
  areas: initialAreas,
  defaultAreaId = "",
  buttonLabel = "Goal baru",
  buttonVariant = "primary",
  buttonSize = "md",
  customTrigger,
}: NewGoalButtonProps = {}) {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("LEARNING");
  const [areaId, setAreaId] = useState(defaultAreaId);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchedAreas, setFetchedAreas] = useState<AreaOption[]>([]);

  const activeAreas = initialAreas && initialAreas.length > 0 ? initialAreas : fetchedAreas;

  // Global shortcut 'n' to open modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "n" || e.key === "N") {
        const tag = (document.activeElement?.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        e.preventDefault();
        setAreaId(defaultAreaId);
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [defaultAreaId]);

  useEffect(() => {
    if (open && (!initialAreas || initialAreas.length === 0) && fetchedAreas.length === 0) {
      fetch("/api/areas")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            setFetchedAreas(data.data);
          }
        })
        .catch(() => {});
    }
  }, [open, initialAreas, fetchedAreas.length]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) {
      toast("Beri nama untuk goal Anda.", "error");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          description: description.trim() || null,
          areaId: areaId || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? data.error ?? "Gagal membuat goal.");
      setName("");
      setDescription("");
      setType("LEARNING");
      setAreaId("");
      setOpen(false);
      toast("Goal dibuat.", "success");
      router.push(`/goals/${data.id}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal membuat goal.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {customTrigger ? (
        customTrigger(() => {
          setAreaId(defaultAreaId);
          setOpen(true);
        })
      ) : (
        <Button
          icon="plus"
          variant={buttonVariant}
          size={buttonSize}
          onClick={() => {
            setAreaId(defaultAreaId);
            setOpen(true);
          }}
        >
          {buttonLabel}
        </Button>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Buat goal baru"
        description="Ubah hal penting menjadi jalur yang jelas terarah."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-surface-700">Nama goal</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mis. Belajar Next.js, Tabungan Dana Darurat, Lari 10k"
              required
              className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3.5 py-2.5 text-sm text-surface-900 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-surface-700">Area Kehidupan (Pilar)</span>
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3.5 py-2.5 text-sm text-surface-900 outline-none focus:border-primary-400"
            >
              <option value="">-- Umum / Tanpa Area --</option>
              {activeAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-surface-400">
              Hubungkan ke domain kehidupan Anda (mis. Karir, Kesehatan, Keuangan, Belajar).
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-surface-700">Tipe Goal</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3.5 py-2.5 text-sm text-surface-900 outline-none focus:border-primary-400"
            >
              {goalTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-surface-700">Deskripsi</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Apa hasil akhir yang ingin Anda capai?"
              rows={3}
              className="w-full resize-none rounded-xl border border-surface-200 bg-surface-50 px-3.5 py-2.5 text-sm text-surface-900 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setOpen(false)} type="button">
              Batal
            </Button>
            <Button type="submit" icon="check" loading={loading}>
              Buat goal
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
