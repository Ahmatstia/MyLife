import Link from "next/link";
import { notFound } from "next/navigation";
import ReviewForm from "@/app/components/ReviewForm";
import { getGoalReviewPageData } from "@/services/review.service";
import { calculateGoalProgress } from "@/services/progress.service";
import { buildInsights } from "@/services/insight.service";
import { requirePageUser } from "@/lib/auth";
import { ProgressBar } from "@/app/components/ui/Progress";
import { Icon } from "@/app/components/ui/Icon";
import { formatHours } from "@/lib/format";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", { month: "long", day: "numeric" }).format(value);
}

export default async function ReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const data = await getGoalReviewPageData((await params).id, user.id);
  if (!data) notFound();
  const { goal, reviews, period, review, metrics } = data;
  const previous = reviews.find((item) => item.periodEnd < period.periodStart);
  const insights = buildInsights(
    metrics,
    previous ? { learningHours: previous.learningHours, tasksCompleted: previous.tasksCompleted, understanding: previous.understanding } : null,
  );
  const progress = calculateGoalProgress(goal.stages);

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      <div className="flex items-center gap-2">
        <Link
          href={`/goals/${goal.id}`}
          className="inline-flex items-center gap-2 text-xs font-mono text-[#94A3B8] transition-colors hover:text-white"
        >
          <Icon name="arrowLeft" size={14} /> Kembali ke {goal.title}
        </Link>
      </div>

      <section className="rounded-3xl border border-white/[0.08] bg-[#131825] p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#8B5CF6]/10 blur-3xl pointer-events-none" />
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#94A3B8]">
          <span>EVALUASI MINGGUAN</span>
          <span className="text-white/20">{"//"}</span>
          <span className="text-[#d0bcff]">REFLEKSI TARGET</span>
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Renungkan dan Mulai Siklus Baru
        </h1>
        <p className="mt-1 font-mono text-xs text-[#94A3B8]">
          Periode: {formatDate(period.periodStart)} – {formatDate(period.periodEnd)}
        </p>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex-1">
            <ProgressBar value={progress} />
          </div>
          <span className="font-mono text-lg font-bold text-[#d0bcff]">{progress}%</span>
        </div>
        <p className="mt-2 text-xs text-[#64748B] font-mono">Progres target kumulatif di seluruh stage dan task</p>
      </section>

      <div className="mt-6">
        <ReviewForm
          goalId={goal.id}
          periodStart={period.periodStart.toISOString()}
          periodEnd={period.periodEnd.toISOString()}
          metrics={metrics}
          review={review ? { ...review, periodStart: review.periodStart.toISOString(), periodEnd: review.periodEnd.toISOString() } : null}
        />
      </div>

      {insights.length > 0 && (
        <section className="rounded-2xl border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 p-5">
          <div className="flex items-center gap-2 text-[#d0bcff]">
            <Icon name="sparkles" size={16} />
            <h2 className="font-bold text-sm font-mono uppercase tracking-wider">Insight Analisis</h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-[#CBC3D7]">
            {insights.map((insight) => (
              <li key={insight} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B5CF6]" />
                {insight}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white tracking-tight">Riwayat Review Sebelumnya</h2>
        {reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.08] bg-[#131825]/40 p-5 text-xs text-[#94A3B8] font-mono">
            Belum ada catatan review sebelumnya. Review mingguan membantu Anda memahami efektivitas metode kerja Anda.
          </div>
        ) : (
          <div className="space-y-2">
            {reviews.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/[0.08] bg-[#131825] p-4 shadow-sm flex flex-wrap justify-between items-center gap-3">
                <span className="text-sm font-medium text-white">
                  {formatDate(item.periodStart)} – {formatDate(item.periodEnd)}
                </span>
                <span className="font-mono text-xs text-[#94A3B8]">
                  {formatHours(item.learningHours)} · {item.tasksCompleted} task
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
