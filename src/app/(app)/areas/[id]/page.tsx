import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth";
import { getAreaDetailPageData } from "@/services/area.service";
import { Icon } from "@/app/components/ui/Icon";
import NewGoalButton from "@/app/components/NewGoalButton";
import { AreaDetailClient } from "./AreaDetailClient";

export const dynamic = "force-dynamic";

export default async function AreaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageUser();
  const { id } = await params;

  const data = await getAreaDetailPageData(id, user.id);
  if (!data) {
    notFound();
  }

  const { area, goals, projects, tasks, allAreas, sessions } = data;

  const totalMinutes = sessions.reduce((acc: number, s: { durationMinutes: number | null }) => acc + (s.durationMinutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  // Compute goal progress percentages
  const formattedGoals = goals.map((g) => {
    const allTasks = g.stages.flatMap((s) => s.tasks);
    const completedTasks = allTasks.filter((t) => t.status === "COMPLETED");
    const progress = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;
    return {
      id: g.id,
      title: g.title,
      description: g.description,
      status: g.status,
      targetDate: g.targetDate ? g.targetDate.toISOString() : null,
      totalTasks: allTasks.length,
      completedTasks: completedTasks.length,
      progress,
    };
  });

  // Compute project progress percentages
  const formattedProjects = projects.map((p) => {
    const completedTasks = p.tasks.filter((t) => t.status === "COMPLETED");
    const progress = p.tasks.length > 0 ? Math.round((completedTasks.length / p.tasks.length) * 100) : 0;
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      status: p.status,
      targetDate: p.targetDate ? p.targetDate.toISOString() : null,
      totalTasks: p.tasks.length,
      completedTasks: completedTasks.length,
      progress,
    };
  });

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/areas"
          className="group inline-flex items-center gap-2 text-surface-400 hover:text-violet-300 transition-all text-xs font-mono font-semibold uppercase tracking-wider"
        >
          <span className="transition-transform group-hover:-translate-x-1">←</span>
          <span>Kembali ke Bidang Hidup</span>
        </Link>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-semibold">PILAR: #{area.name.toUpperCase().slice(0, 10)}</span>
          <span className="text-white/20">{"//"}</span>
          <span className="text-surface-400">TELEMETRI STABIL</span>
        </div>
      </div>

      {/* Hero Card Domain (Pillar Command Header) */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#131825]/95 p-6 shadow-2xl backdrop-blur-md">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: area.color }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-40 -bottom-24 h-72 w-72 rounded-full bg-indigo-600/15 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-3xl">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3.5 w-3.5">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ backgroundColor: area.color }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-3.5 w-3.5 ring-2 ring-white/30 shadow-lg"
                    style={{ backgroundColor: area.color }}
                  />
                </span>
                <span className="font-mono text-xs text-violet-400 font-bold uppercase tracking-widest">
                  {"PILAR UTAMA KEHIDUPAN // DOMAIN OMNI-CONTROL"}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-1">
                {area.name}
              </h1>
              <p className="text-sm text-surface-400 leading-relaxed mt-1">
                {area.description || "Pilar strategis kehidupan untuk menyelaraskan tujuan jangka panjang dan eksekusi harian."}
              </p>
            </div>

            {/* Header Action Controls */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <NewGoalButton
                areas={allAreas}
                defaultAreaId={area.id}
                buttonLabel="+ Target"
                buttonVariant="primary"
                buttonSize="md"
              />
              <Link
                href={`/projects?new=true&areaId=${area.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0E131F] px-4 py-2.5 text-xs font-semibold text-white hover:border-violet-500/40 hover:bg-[#1A2133] shadow-lg transition active:scale-95"
              >
                <Icon name="plus" size={14} className="text-indigo-400" />
                <span>+ Proyek</span>
              </Link>
            </div>
          </div>

          {/* Telemetry Stats Strip */}
          <div className="pt-4 mt-2 border-t border-white/[0.08] flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-violet-400">🎯</span>
              <span className="text-surface-400 uppercase">Target Aktif:</span>
              <span className="text-white font-bold">{goals.length} Sasaran</span>
            </div>
            <span className="text-white/20">•</span>
            <div className="flex items-center gap-2">
              <span className="text-indigo-400">📁</span>
              <span className="text-surface-400 uppercase">Proyek Berjalan:</span>
              <span className="text-white font-bold">{projects.length} Inisiatif</span>
            </div>
            <span className="text-white/20">•</span>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-surface-400 uppercase">Total Tugas:</span>
              <span className="text-white font-bold">{tasks.length} Tercatat</span>
            </div>
            <span className="text-white/20">•</span>
            <div className="flex items-center gap-2">
              <span className="text-amber-400">⏱</span>
              <span className="text-surface-400 uppercase">Fokus Teralokasi:</span>
              <span className="text-amber-300 font-bold">{totalHours} Jam</span>
            </div>
          </div>
        </div>
      </div>

      {/* Seksi 1: Target Utama dalam Domain Ini */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="h-4 w-1.5 rounded-full bg-violet-500" />
              Target Utama Terhubung ({formattedGoals.length})
            </h2>
            <p className="text-xs text-surface-400 mt-0.5">
              Arah dan pencapaian jangka panjang yang dinaungi oleh pilar ini.
            </p>
          </div>
          <NewGoalButton
            areas={allAreas}
            defaultAreaId={area.id}
            buttonLabel="+ Tambah Target"
            buttonVariant="secondary"
            buttonSize="sm"
          />
        </div>

        {formattedGoals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#131825]/90 p-8 text-center">
            <p className="text-sm font-semibold text-white">Belum ada Target Utama di pilar ini.</p>
            <p className="text-xs text-surface-400 mt-1">Buat goal pertama Anda untuk memandu pilar {area.name}.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {formattedGoals.map((g) => (
              <Link
                key={g.id}
                href={`/goals/${g.id}`}
                className="group flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#131825]/90 p-5 shadow-xl hover:border-violet-500/40 hover:bg-[#1A2236] transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 font-mono text-[10px] font-semibold text-violet-300">
                      {g.status}
                    </span>
                    <span className="font-mono text-xs text-emerald-400 font-bold">
                      {g.progress}%
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-2.5 group-hover:text-violet-300 transition">
                    {g.title}
                  </h3>
                  {g.description && (
                    <p className="text-xs text-surface-400 mt-1 line-clamp-2 leading-relaxed">
                      {g.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-2">
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-emerald-400"
                      style={{ width: `${g.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-surface-400">
                    <span>{g.completedTasks}/{g.totalTasks} tugas selesai</span>
                    {g.targetDate && (
                      <span className="text-amber-400">
                        📅 {new Date(g.targetDate).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Seksi 2: Proyek Aktif dalam Pilar Ini */}
      <section className="flex flex-col gap-4 mt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="h-4 w-1.5 rounded-full bg-indigo-500" />
              Proyek Aktif ({formattedProjects.length})
            </h2>
            <p className="text-xs text-surface-400 mt-0.5">
              Inisiatif terstruktur dengan serangkaian milestone dan deadline.
            </p>
          </div>
          <Link
            href={`/projects?new=true&areaId=${area.id}`}
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-[#0E131F] px-3 py-1.5 text-xs font-semibold text-surface-300 hover:border-violet-500/30 hover:text-white transition"
          >
            <Icon name="plus" size={12} />
            + Tambah Proyek
          </Link>
        </div>

        {formattedProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#131825]/90 p-8 text-center">
            <p className="text-sm font-semibold text-white">Belum ada Proyek di pilar ini.</p>
            <p className="text-xs text-surface-400 mt-1">Kelompokkan pekerjaan Anda ke dalam proyek.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {formattedProjects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#131825]/90 p-5 shadow-xl hover:border-indigo-500/40 hover:bg-[#1A2236] transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 font-mono text-[10px] font-semibold text-indigo-300">
                      {p.status}
                    </span>
                    <span className="font-mono text-xs text-emerald-400 font-bold">
                      {p.progress}%
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-2.5 group-hover:text-indigo-300 transition">
                    {p.title}
                  </h3>
                  {p.description && (
                    <p className="text-xs text-surface-400 mt-1 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-2">
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400"
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-surface-400">
                    <span>{p.completedTasks}/{p.totalTasks} tugas selesai</span>
                    {p.targetDate && (
                      <span className="text-amber-400">
                        📅 {new Date(p.targetDate).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Seksi 3: Interactive Tasks Component */}
      <AreaDetailClient tasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      }))} />
    </div>
  );
}
