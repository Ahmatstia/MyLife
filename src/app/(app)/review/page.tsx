import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import {
  getWeekPeriod,
  getPeriodMetrics,
  getPeriodReview,
  getWeeklyReviewOverview,
  getAllReviews,
} from "@/services/review.service";
import { calculateGoalProgress } from "@/services/progress.service";
import { Button } from "@/app/components/ui/Button";
import { ProgressBar } from "@/app/components/ui/Progress";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { Icon } from "@/app/components/ui/Icon";
import { formatDuration } from "@/lib/format";
import { NotesTimeline, type TimelineEntry } from "@/app/components/core/NotesTimeline";

export const dynamic = "force-dynamic";

function formatRange(start: Date, end: Date) {
  const fmt = new Intl.DateTimeFormat("id-ID", { month: "short", day: "numeric" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

export default async function ReviewPage() {
  const user = await requirePageUser();
  const period = getWeekPeriod(new Date());

  const [overview, allPastReviews] = await Promise.all([
    getWeeklyReviewOverview(user.id),
    getAllReviews(user.id, 15),
  ]);

  const { goals, reviewedGoalIds: reviewed, captures, sessionReflections } = overview;

  const rows = await Promise.all(
    goals.map(async (goal) => {
      const metrics = await getPeriodMetrics(goal.id, period.periodStart, period.periodEnd, user.id);
      const review = await getPeriodReview(goal.id, period.periodStart, period.periodEnd, user.id);
      return { goal, metrics, review, progress: calculateGoalProgress(goal.stages) };
    }),
  );

  const totalMinutes = rows.reduce((s, r) => s + r.metrics.learningMinutes, 0);
  const totalTasks = rows.reduce((s, r) => s + r.metrics.tasksCompleted, 0);

  // Compile timeline entries
  const timelineEntries: TimelineEntry[] = [
    ...captures.map((c): TimelineEntry => ({
      id: `capture-${c.id}`,
      kind: "capture",
      title: "Catatan Cepat",
      content: c.content,
      timestamp: c.createdAt.toISOString(),
      entityId: c.id,
    })),
    ...sessionReflections.map((s): TimelineEntry => ({
      id: `session-${s.id}`,
      kind: "session",
      title: s.task.title,
      tag: s.task.stage?.goal.title,
      subtitle: s.understanding !== null ? `Tingkat pemahaman: ${s.understanding}/5` : undefined,
      content: s.obstacle ? `Hambatan: ${s.obstacle}` : "Sesi belajar selesai dengan evaluasi pemahaman.",
      timestamp: (s.endedAt ?? s.startedAt).toISOString(),
      entityId: s.id,
    })),
    ...allPastReviews.map((r): TimelineEntry => ({
      id: `review-${r.id}`,
      kind: "review",
      title: `Refleksi: ${r.goal.title}`,
      tag: `${formatRange(r.periodStart, r.periodEnd)}`,
      content: [
        r.wentWell ? `🏆 Berjalan baik: ${r.wentWell}` : "",
        r.difficulties ? `⚠️ Tantangan: ${r.difficulties}` : "",
        r.improvements ? `💡 Perbaikan: ${r.improvements}` : "",
        r.nextFocus ? `🎯 Fokus Berikutnya: ${r.nextFocus}` : "",
      ].filter(Boolean).join("\n\n") || "Refleksi mingguan selesai tercatat.",
      timestamp: r.createdAt.toISOString(),
      entityId: r.id,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-10 pb-16">
      {/* 1. Telemetri Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#94A3B8]">
            <span>RITUAL MINGGUAN</span>
            <span className="text-white/20">{"//"}</span>
            <span className="text-[#d0bcff]">EVALUASI & REFLEKSI</span>
            <span className="text-white/20">{"//"}</span>
            <div className="flex items-center gap-1.5 rounded-full bg-[#4edea3]/10 px-2 py-0.5 text-[#4edea3]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
              <span className="font-semibold">SIKLUS MINGGUAN AKTIF</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Evaluasi & Refleksi Mingguan
          </h1>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Ritual hening untuk mengamati capaian: pahami apa yang berhasil, evaluasi hambatan, dan arahkan energi fokus Anda ke sasaran berikutnya.
          </p>
        </div>

        {/* Status Chip */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="rounded-xl border border-white/[0.08] bg-[#131825] px-4 py-2.5 shadow-lg">
            <span className="block font-mono text-[10px] text-[#94A3B8]">RENTANG WAKTU</span>
            <span className="font-mono text-xs font-semibold text-[#d0bcff]">
              {formatRange(period.periodStart, period.periodEnd)}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Bento Telemetri Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-4 shadow-lg">
          <div className="flex items-center justify-between text-[#d0bcff] mb-1">
            <span className="font-mono text-[10px] text-[#94A3B8] uppercase">Status Review</span>
            <Icon name="check" size={16} />
          </div>
          <div className="text-2xl font-bold text-white">
            {reviewed.size}/{rows.length}
          </div>
          <div className="text-[11px] font-mono text-[#d0bcff] mt-1">
            {rows.length > 0 && reviewed.size === rows.length
              ? "✓ Semua target telah direview"
              : `${rows.length - reviewed.size} target menunggu review`}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-4 shadow-lg">
          <div className="flex items-center justify-between text-[#4edea3] mb-1">
            <span className="font-mono text-[10px] text-[#94A3B8] uppercase">Waktu Fokus</span>
            <Icon name="clock" size={16} />
          </div>
          <div className="text-2xl font-bold text-white">
            {formatDuration(totalMinutes)}
          </div>
          <div className="text-[11px] font-mono text-[#4edea3] mt-1">
            Sesi deep work tercatat
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-4 shadow-lg">
          <div className="flex items-center justify-between text-[#F59E0B] mb-1">
            <span className="font-mono text-[10px] text-[#94A3B8] uppercase">Tugas Selesai</span>
            <Icon name="layers" size={16} />
          </div>
          <div className="text-2xl font-bold text-white">
            {totalTasks}
          </div>
          <div className="text-[11px] font-mono text-[#F59E0B] mt-1">
            Task tuntas minggu ini
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#131825] p-4 shadow-lg">
          <div className="flex items-center justify-between text-[#F43F5E] mb-1">
            <span className="font-mono text-[10px] text-[#94A3B8] uppercase">Arsip Log</span>
            <Icon name="inbox" size={16} />
          </div>
          <div className="text-2xl font-bold text-white">
            {timelineEntries.length}
          </div>
          <div className="text-[11px] font-mono text-[#F43F5E] mt-1">
            Catatan & sesi terekam
          </div>
        </div>
      </section>

      {/* 3. Grid Kartu Review Target */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight">Target Utama Dalam Siklus</h2>
          <span className="font-mono text-xs text-[#94A3B8]">{rows.length} Target Aktif</span>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.08] bg-[#131825]/40 p-10 text-center">
            <EmptyState
              icon="sparkles"
              title="Belum ada target aktif"
              description="Setelah Anda memiliki target aktif, Anda dapat merefleksikan progres mingguan Anda di sini."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rows.map(({ goal, metrics, review, progress }, index) => {
              const done = !!review;
              return (
                <div
                  key={goal.id}
                  className={`flex flex-col justify-between rounded-2xl border p-5 shadow-lg transition-all hover:border-white/[0.2] ${
                    done
                      ? "border-[#4edea3]/30 bg-gradient-to-br from-[#131825] to-[#4edea3]/[0.06]"
                      : "border-white/[0.08] bg-[#131825]"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold font-mono ${
                            done ? "bg-[#4edea3] text-[#0B0D13]" : "bg-white/[0.08] text-[#94A3B8]"
                          }`}
                        >
                          {done ? <Icon name="check" size={13} strokeWidth={3} /> : index + 1}
                        </span>
                        <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-[#94A3B8]">
                          {goal.type}
                        </span>
                      </div>
                      {done ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#4edea3]/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#4edea3] border border-[#4edea3]/30">
                          ✓ Sudah Direview
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#F59E0B] border border-[#F59E0B]/30">
                          Menunggu Review
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/goals/${goal.id}`}
                      className="block font-bold text-white text-[16px] hover:text-[#d0bcff] transition-colors line-clamp-2"
                    >
                      {goal.title}
                    </Link>

                    <p className="mt-2 font-mono text-[12px] text-[#94A3B8]">
                      {formatDuration(metrics.learningMinutes)} fokus · {metrics.tasksCompleted} task tuntas minggu ini
                    </p>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#94A3B8] mb-1.5">
                        <span>Capaian Kumulatif</span>
                        <span className="font-bold text-white">{progress}%</span>
                      </div>
                      <ProgressBar value={progress} size="sm" tone={done ? "success" : "primary"} />
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="font-mono text-[11px] text-[#64748B]">
                      ID: {goal.id.slice(-6)}
                    </span>
                    <Link href={`/goals/${goal.id}/reviews`}>
                      <Button size="sm" variant={done ? "secondary" : "ai"} icon={done ? "check" : "sparkles"}>
                        {done ? "Sunting review" : "Tulis review"}
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Timeline Catatan & Refleksi */}
      <div className="border-t border-white/[0.08] pt-10">
        <NotesTimeline entries={timelineEntries} />
      </div>

      {/* 5. Filosofi Review */}
      <footer className="rounded-2xl border border-white/[0.08] bg-[#131825]/60 p-6">
        <div className="flex items-center gap-2 text-[#d0bcff] mb-2 font-mono text-xs uppercase tracking-wider font-semibold">
          <Icon name="sparkles" size={15} />
          <span>Prinsip Kerja MyLife OS</span>
        </div>
        <h3 className="font-bold text-white text-base">Mengapa evaluasi mingguan krusial?</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
          Review bukanlah ujian atau rapor. Ini adalah kesempatan introspektif untuk melihat apa yang benar-benar bergerak,
          mengakui apa yang menghambat energi Anda, dan memilih satu fokus yang paling berdampak tinggi untuk minggu ke depan — 
          sehingga progres Anda terus mengakumulasi daya dorong nyata.
        </p>
      </footer>
    </div>
  );
}