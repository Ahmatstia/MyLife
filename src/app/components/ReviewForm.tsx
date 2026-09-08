"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/Button";
import { useToast } from "./ui/Toast";
import { formatDuration } from "@/lib/format";

type Review = {
  id?: string;
  periodStart: string;
  periodEnd: string;
  understanding: number | null;
  wentWell: string | null;
  difficulties: string | null;
  improvements: string | null;
  nextFocus: string | null;
};

type Props = {
  goalId: string;
  periodStart: string;
  periodEnd: string;
  metrics: { learningMinutes: number; learningHours: number; tasksCompleted: number; understanding: number | null };
  review: Review | null;
};

export default function ReviewForm({ goalId, periodStart, periodEnd, metrics, review }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState({
    wentWell: review?.wentWell ?? "",
    difficulties: review?.difficulties ?? "",
    improvements: review?.improvements ?? "",
    nextFocus: review?.nextFocus ?? "",
    understanding: review?.understanding ?? metrics.understanding ?? 3,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        review?.id ? `/api/reviews/${review.id}` : `/api/goals/${goalId}/reviews`,
        {
          method: review?.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ periodStart, periodEnd, ...values }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Gagal menyimpan review.");
      toast(review?.id ? "Review diperbarui." : "Review disimpan.", "success");
      router.refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Gagal menyimpan review.");
    } finally {
      setSaving(false);
    }
  }

  const field = (key: "wentWell" | "difficulties" | "improvements" | "nextFocus", placeholder: string) => (
    <textarea
      value={values[key]}
      onChange={(event) => setValues({ ...values, [key]: event.target.value })}
      placeholder={placeholder}
      rows={3}
      className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#0B0D13] p-3 text-sm text-white placeholder:text-[#64748B] focus:border-[#8B5CF6] focus:outline-none focus:ring-1 focus:ring-[#8B5CF6] transition-colors"
    />
  );

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#131825] p-6 shadow-xl">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.06] bg-[#0B0D13] p-3.5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#94A3B8]">Waktu Belajar</p>
          <p className="mt-1 text-2xl font-bold font-mono text-white">{formatDuration(metrics.learningMinutes)}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[#0B0D13] p-3.5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#94A3B8]">Task Selesai</p>
          <p className="mt-1 text-2xl font-bold font-mono text-[#4edea3]">{metrics.tasksCompleted}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[#0B0D13] p-3.5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#94A3B8]">Tingkat Pemahaman</p>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setValues({ ...values, understanding: value })}
                aria-pressed={values.understanding === value}
                aria-label={`Pemahaman ${value} dari 5`}
                className={`h-8 flex-1 rounded-lg border text-xs font-bold font-mono transition-all ${
                  values.understanding === value
                    ? "border-[#8B5CF6] bg-[#8B5CF6] text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]"
                    : "border-white/[0.08] bg-[#131825] text-[#94A3B8] hover:bg-[#1A2133] hover:text-white"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block font-mono text-xs font-semibold text-[#d0bcff] flex items-center gap-1.5">
            <span>🏆</span> Apa yang berjalan baik?
          </span>
          {field("wentWell", "Renungkan pencapaian yang berhasil dan strategi yang efektif…")}
        </label>
        <label className="block">
          <span className="mb-1.5 block font-mono text-xs font-semibold text-[#F59E0B] flex items-center gap-1.5">
            <span>⚠️</span> Apa yang sulit / hambatan?
          </span>
          {field("difficulties", "Jujurlah tentang hambatan internal maupun eksternal…")}
        </label>
        <label className="block">
          <span className="mb-1.5 block font-mono text-xs font-semibold text-[#4edea3] flex items-center gap-1.5">
            <span>💡</span> Apa yang harus ditingkatkan?
          </span>
          {field("improvements", "Perubahan kecil yang nyata dan dapat diulang minggu depan…")}
        </label>
        <label className="block">
          <span className="mb-1.5 block font-mono text-xs font-semibold text-white flex items-center gap-1.5">
            <span>🎯</span> Fokus berikutnya
          </span>
          {field("nextFocus", "Ke mana energi fokus utama Anda akan diarahkan berikutnya?")}
        </label>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400 font-mono">
          {error}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={save} disabled={saving} icon="check">
          {saving ? "Menyimpan…" : review?.id ? "Perbarui Review" : "Simpan Review Mingguan"}
        </Button>
      </div>
    </section>
  );
}
