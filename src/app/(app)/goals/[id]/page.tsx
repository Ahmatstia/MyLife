import { notFound } from "next/navigation";
import { getGoalDetail } from "@/services/goal.service";
import { getAreas } from "@/services/area.service";
import { requirePageUser } from "@/lib/auth";
import StageForm from "@/app/components/StageForm";
import GoalActionsMenu from "@/app/components/GoalActionsMenu";
import { GoalStagesAccordion } from "@/app/components/goals/GoalStagesAccordion";
import { BackButton } from "@/app/components/ui/BackButton";
import {
  calculateGoalProgress,
  calculateStageProgress,
} from "@/services/progress.service";
import { formatHours } from "@/lib/format";
import { ObjectivesSection } from "@/app/components/goals/ObjectivesSection";

export const dynamic = "force-dynamic";

type GoalPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: Date | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

export default async function GoalPage({ params }: GoalPageProps) {
  const { id } = await params;
  const user = await requirePageUser();

  const [goal, areas] = await Promise.all([
    getGoalDetail(user.id, id),
    getAreas(user.id, { isActive: true }),
  ]);

  if (!goal) notFound();

  const allTasks = goal.stages.flatMap((stage) => stage.tasks);
  const progress = calculateGoalProgress(goal.stages);
  const completedTasks = allTasks.filter(
    (task) => task.status === "COMPLETED",
  ).length;
  const completedStages = goal.stages.filter(
    (stage) =>
      stage.tasks.length > 0 && calculateStageProgress(stage.tasks) === 100,
  ).length;
  const allStagesDone = completedStages === goal.stages.length && goal.stages.length > 0;
  const totalEstimatedHours = allTasks.reduce(
    (s, t) => s + (t.estimatedHours || 0),
    0,
  );

  const currentStageIndex = goal.stages.findIndex((stage) =>
    stage.tasks.some((task) => task.status !== "COMPLETED"),
  );

  const now = new Date();
  const daysElapsed = Math.max(1, Math.floor((now.getTime() - new Date(goal.createdAt).getTime()) / 86400000));
  const goalStartDate = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(goal.createdAt);
  const circumference = 2 * Math.PI * 68;
  const strokeDashoffset = circumference - (circumference * progress) / 100;

  return (
    <div className="flex flex-col w-full pb-16 gap-8 text-gray-200">
      {/* 1. Top Navigation & Action Controls */}
      <header className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 min-w-0">
          <BackButton fallbackUrl="/goals" label="Kembali" />
          <div className="hidden md:flex items-center gap-2 font-mono text-xs text-gray-500">
            <span>/</span>
            <span className="uppercase text-gray-400">RUTE #{goal.id.slice(0, 6).toUpperCase()}</span>
            <span>/</span>
            <span className="text-purple-300 font-bold truncate max-w-xs">{goal.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <GoalActionsMenu
            goalId={goal.id}
            goalName={goal.title}
            areas={areas}
            initialData={{
              name: goal.title,
              description: goal.description,
              type: goal.type,
              status: goal.status,
              targetDate: goal.targetDate,
              areaId: (goal as unknown as { areaId?: string | null }).areaId ?? goal.area?.id ?? null,
            }}
          />
          <StageForm goalId={goal.id} nextOrder={goal.stages.length} />
        </div>
      </header>

      {/* Completion Banner if all stages are done */}
      {allStagesDone && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-[#131825] to-[#131825] p-5 shadow-lg transform-gpu">
          <div className="relative flex flex-wrap items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-2xl shadow-sm">
              🏆
            </span>
            <div>
              <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-400">TARGET UTAMA TERCAPAI</p>
              <p className="mt-0.5 text-lg font-bold text-white">
                Perjalanan {goal.title} telah selesai dengan gemilang!
              </p>
              <p className="mt-0.5 text-xs font-mono text-gray-400">
                {completedTasks} tugas · {goal.stages.length} tahapan · 100% tuntas terverifikasi.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Expedition Hero Header (Split Grid) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Strategic Brief & Telemetry */}
        <div className="lg:col-span-8 flex flex-col justify-between p-6 md:p-8 rounded-2xl bg-[#131825] border border-white/[0.08] shadow-xl relative overflow-hidden transform-gpu">
          {/* Subtle ambient glow via fast GPU radial gradient */}
          <div className="absolute -right-10 -top-10 w-96 h-96 bg-[radial-gradient(circle,rgba(168,85,247,0.12)_0%,transparent_70%)] pointer-events-none transform-gpu" />
          
          <div className="flex flex-col gap-4 relative z-10">
            {/* Badges Cluster */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-white/[0.06] text-purple-300 font-mono text-xs uppercase tracking-wider border border-white/[0.08]">
                {goal.type || "TARGET UTAMA"}
              </span>
              {goal.area && (
                <span
                  className="px-2.5 py-1 rounded font-mono text-xs flex items-center gap-1.5"
                  style={{
                    backgroundColor: `${goal.area.color}15`,
                    color: goal.area.color,
                    border: `1px solid ${goal.area.color}35`,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: goal.area.color }}
                  />
                  {goal.area.name}
                </span>
              )}
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {allStagesDone ? "SELESAI" : "SEDANG BERJALAN"}
              </span>
              <span className="font-mono text-[11px] text-gray-500 ml-auto">
                UID: GOAL-{goal.id.slice(0, 8).toUpperCase()}
              </span>
            </div>

            {/* Headline & Description */}
            <div className="flex flex-col gap-2 mt-1">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
                {goal.title}
              </h1>
              {goal.description && (
                <p className="text-sm md:text-base text-gray-400 leading-relaxed max-w-3xl">
                  {goal.description}
                </p>
              )}
            </div>
          </div>

          {/* Quantitative KPI Badges & Bar */}
          <div className="flex flex-col gap-4 mt-8 relative z-10">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-[#0B0D13]/80 border border-white/[0.05] flex flex-col">
                <span className="font-mono text-[10px] uppercase text-gray-400">KEMAJUAN TUGAS</span>
                <span className="font-mono text-sm font-bold text-emerald-400 mt-1">
                  ✓ {completedTasks}/{allTasks.length} Tugas
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#0B0D13]/80 border border-white/[0.05] flex flex-col">
                <span className="font-mono text-[10px] uppercase text-gray-400">TAHAPAN EKSPEDISI</span>
                <span className="font-mono text-sm font-bold text-purple-300 mt-1">
                  📂 {completedStages}/{goal.stages.length} Tahapan
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#0B0D13]/80 border border-white/[0.05] flex flex-col">
                <span className="font-mono text-[10px] uppercase text-gray-400">TOTAL INVESTASI</span>
                <span className="font-mono text-sm font-bold text-indigo-300 mt-1">
                  ⏱ ± {formatHours(totalEstimatedHours)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#0B0D13]/80 border border-white/[0.05] flex flex-col">
                <span className="font-mono text-[10px] uppercase text-gray-400">BATAS AKHIR</span>
                <span className="font-mono text-sm font-bold text-amber-400 mt-1 truncate">
                  🗓 {goal.targetDate ? formatDate(goal.targetDate) : "Fleksibel"}
                </span>
              </div>
            </div>

            {/* Sleek High Contrast Progress Track */}
            <div className="flex flex-col gap-1.5 pt-2">
              <div className="flex justify-between items-center font-mono text-xs">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="material-symbols-outlined text-[15px] text-emerald-400">trending_up</span>
                  AGREGASI INTEGRASI SISTEM
                </span>
                <span className="text-emerald-400 font-bold">{progress}% TUNTAS</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#0B0D13] overflow-hidden p-[1px] border border-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-700 via-purple-500 to-[#4edea3] transition-all duration-700 shadow-[0_0_12px_rgba(78,222,163,0.5)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Visual Orb & Telemetry Gauge */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 md:p-8 rounded-2xl bg-[#131825] border border-white/[0.08] shadow-[0_12px_40px_-15px_rgba(0,0,0,0.7)] relative overflow-hidden text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent pointer-events-none" />

          {/* Radial Progress Ring */}
          <div className="relative w-44 h-44 flex items-center justify-center my-2">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              <circle
                className="text-white/[0.06]"
                cx="80"
                cy="80"
                fill="transparent"
                r="68"
                stroke="currentColor"
                strokeWidth="10"
              />
              <circle
                className="text-emerald-400 transition-all duration-1000"
                cx="80"
                cy="80"
                fill="transparent"
                r="68"
                stroke="currentColor"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-white leading-none tracking-tighter">
                {progress}%
              </span>
              <span className="font-mono text-[10px] text-emerald-400 font-bold tracking-widest mt-1 uppercase">
                {allStagesDone ? "SELESAI" : "KEMAJUAN"}
              </span>
            </div>
          </div>

          {/* Operative Velocity Badge */}
          <div className="relative z-10 mt-2 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-mono font-bold">
              <span className="material-symbols-outlined text-[15px]">speed</span>
              <span>LAJU OPERASIONAL: OPTIMAL</span>
            </div>
            <p className="text-xs text-gray-400 max-w-xs mt-1">
              {progress >= 75
                ? "Target mendekati garis finish. Pertahankan sprint untuk finalisasi rute."
                : progress >= 40
                  ? "Irama eksekusi konsisten dan berada di jalur capaian waktu yang sehat."
                  : "Mulai tahapan awal secara bertahap untuk membangun momentum konsisten."}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Waypoint Horizontal Route Track */}
      <section className="flex flex-col gap-4 p-6 md:p-8 rounded-2xl bg-[#131825] border border-white/[0.08] shadow-sm relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-400 text-[20px]">timeline</span>
            <h2 className="text-lg font-bold text-white">Peta Jalan Ekspedisi</h2>
            <span className="font-mono text-xs text-gray-500">{"//"} LINTASAN WAYPOINT AKTIF</span>
          </div>
          <div className="flex items-center gap-2 text-purple-300 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            {currentStageIndex === -1
              ? "SEMUA TAHAP RAMPUNG"
              : `WAYPOINT 0${currentStageIndex + 1} DARI 0${goal.stages.length} AKTIF`}
          </div>
        </div>

        {/* 4 Stats Compact Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 py-1">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#0B0D13]/60 border border-white/[0.05] flex items-center gap-3">
            <span className="material-symbols-outlined text-gray-400 text-[18px]">event</span>
            <div className="flex flex-col">
              <span className="font-mono text-[10px] text-gray-400 uppercase">Dimulai</span>
              <span className="font-mono text-xs font-semibold text-white">{goalStartDate}</span>
            </div>
          </div>
          <div className="px-3.5 py-2.5 rounded-xl bg-[#0B0D13]/60 border border-white/[0.05] flex items-center gap-3">
            <span className="material-symbols-outlined text-gray-400 text-[18px]">timer</span>
            <div className="flex flex-col">
              <span className="font-mono text-[10px] text-gray-400 uppercase">Durasi Aktif</span>
              <span className="font-mono text-xs font-semibold text-white">{daysElapsed} Hari Berjalan</span>
            </div>
          </div>
          <div className="px-3.5 py-2.5 rounded-xl bg-[#0B0D13]/60 border border-white/[0.05] flex items-center gap-3">
            <span className="material-symbols-outlined text-gray-400 text-[18px]">flag</span>
            <div className="flex flex-col">
              <span className="font-mono text-[10px] text-gray-400 uppercase">Status Milestone</span>
              <span className="font-mono text-xs font-semibold text-emerald-400">{completedStages}/{goal.stages.length} Tahap Selesai</span>
            </div>
          </div>
          <div className="px-3.5 py-2.5 rounded-xl bg-[#0B0D13]/60 border border-white/[0.05] flex items-center gap-3">
            <span className="material-symbols-outlined text-gray-400 text-[18px]">task_alt</span>
            <div className="flex flex-col">
              <span className="font-mono text-[10px] text-gray-400 uppercase">Penyelesaian Tugas</span>
              <span className="font-mono text-xs font-semibold text-purple-300">{completedTasks}/{allTasks.length} Tuntas</span>
            </div>
          </div>
        </div>

        {/* Waypoint Horizontal Visual Track */}
        {goal.stages.length > 0 ? (
          <div className="py-6 overflow-x-auto">
            <div className="min-w-[640px] flex items-center justify-between relative px-6">
              {/* Connecting line */}
              <div className="absolute top-5 left-12 right-12 h-1 bg-white/[0.08] -z-0">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 via-purple-500 to-purple-400 transition-all duration-700"
                  style={{
                    width: `${
                      goal.stages.length > 1
                        ? Math.min(100, Math.max(0, (completedStages / (goal.stages.length - 1)) * 100))
                        : 100
                    }%`,
                  }}
                />
              </div>

              {goal.stages.map((stage, idx) => {
                const stageTasks = stage.tasks;
                const stageProgress = calculateStageProgress(stageTasks);
                const isCompleted = stageTasks.length > 0 && stageProgress === 100;
                const isCurrent = idx === currentStageIndex;

                return (
                  <div key={stage.id} className="flex flex-col items-center text-center relative z-10 px-2 group">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? "bg-emerald-400 text-[#0B0D13] font-bold shadow-[0_0_15px_rgba(78,222,163,0.5)]"
                          : isCurrent
                            ? "bg-purple-600 text-white font-bold ring-4 ring-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.6)]"
                            : "bg-[#0B0D13] border border-white/20 text-gray-400"
                      }`}
                    >
                      {isCompleted ? (
                        <span className="material-symbols-outlined text-[20px] font-bold">check</span>
                      ) : (
                        <span className="font-mono text-xs font-bold">{idx + 1}</span>
                      )}
                    </div>
                    <span className="font-mono text-xs font-bold text-white mt-2.5">
                      Tahap 0{idx + 1}
                    </span>
                    <span className="text-xs text-gray-400 font-medium line-clamp-1 max-w-[120px]">
                      {stage.name}
                    </span>
                    <span
                      className={`font-mono text-[10px] mt-1 px-1.5 py-0.5 rounded ${
                        isCompleted
                          ? "text-emerald-400 bg-emerald-500/10"
                          : isCurrent
                            ? "text-purple-300 bg-purple-500/10 font-bold"
                            : "text-gray-500 bg-white/[0.04]"
                      }`}
                    >
                      {isCompleted ? "✓ SELESAI" : isCurrent ? "TAHAP INI" : "MENDATANG"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center border border-dashed border-white/[0.1] rounded-xl bg-[#0B0D13]/40">
            <p className="text-xs font-mono text-gray-400">Belum ada tahapan dalam rute ini. Tambahkan tahapan pertama di tombol kanan atas.</p>
          </div>
        )}

        {/* Dynamic Callout Bar */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#0B0D13]/70 border border-white/[0.06] text-gray-300 text-xs">
          <span className="material-symbols-outlined text-purple-400 text-[18px] shrink-0">auto_awesome</span>
          <p className="leading-relaxed">
            <strong className="text-white font-semibold">Status Rute:</strong>{" "}
            {currentStageIndex === -1 ? (
              <span>Seluruh tahapan ekspedisi berhasil dituntaskan dengan sempurna. Selamat atas pencapaian Anda!</span>
            ) : (
              <span>
                Anda sedang berada di <span className="text-purple-300 font-bold font-mono">Tahap {currentStageIndex + 1} dari {goal.stages.length}</span>.{" "}
                Fokus aktif teralokasi pada penyelesaian tugas-tugas kritis di tahapan ini.
              </span>
            )}
          </p>
        </div>
      </section>

      {/* 4. Key Results / Sasaran Terukur (OKR Grid) */}
      <section>
        <ObjectivesSection goalId={goal.id} initialObjectives={goal.objectives} />
      </section>

      {/* 5. Vertical Timeline: Hexagon Nodes & Detailed Stages Accordion */}
      {goal.stages.length > 0 && (
        <GoalStagesAccordion
          stages={goal.stages}
          currentStageIndex={currentStageIndex}
        />
      )}
    </div>
  );
}
