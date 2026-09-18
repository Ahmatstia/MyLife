import Link from "next/link";
import { getGoalsWithStages } from "@/services/goal.service";
import { getAreas } from "@/services/area.service";
import { getProjects } from "@/services/project.service";
import { getGoals } from "@/services/goal.service";
import { requirePageUser } from "@/lib/auth";
import { calculateGoalProgress } from "@/services/progress.service";
import { GoalsBoard, type GoalCard } from "@/app/components/goals/GoalsBoard";
import { ProjectsManager } from "@/app/(app)/projects/ProjectsManager";
import { AreasManager } from "@/app/(app)/areas/AreasManager";
import { PageHeader } from "@/app/components/ui/PageHeader";

export const dynamic = "force-dynamic";

type Tab = "goals" | "projects" | "areas";
const VALID_TABS: Tab[] = ["goals", "projects", "areas"];

const TABS: { id: Tab; label: string; icon: string; verb: string }[] = [
  { id: "goals",    label: "Target (Goals)",      icon: "flag",   verb: "Sasaran" },
  { id: "projects", label: "Proyek (Projects)",   icon: "layers", verb: "Eksekusi" },
  { id: "areas",    label: "Pilar Hidup (Areas)", icon: "tree",   verb: "Fondasi" },
];

function formatDate(value: Date | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(value);
}

interface StageTask {
  id: string;
  status: string;
  title: string;
  name?: string;
  estimatedHours?: number | null;
}
interface GoalWithRelations {
  id: string;
  title: string;
  name?: string;
  type: string;
  status: string;
  priority?: string;
  targetDate: Date | null;
  area?: { id: string; name: string; color: string } | null;
  stages: { id: string; name: string; tasks: StageTask[] }[];
}

function buildGoalCard(goal: GoalWithRelations, index: number): GoalCard {
  const progress = calculateGoalProgress(goal.stages);
  const tasks = goal.stages.flatMap((stage) => stage.tasks);
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const currentStageIndex = goal.stages.findIndex((s) => s.tasks.some((t) => t.status !== "COMPLETED"));
  const currentStage = currentStageIndex === -1 ? null : goal.stages[currentStageIndex];
  const nextTask = currentStage?.tasks.find((t) => t.status !== "COMPLETED");
  const waypoints = goal.stages.map((stage, sIdx) => ({
    id: stage.id,
    label: stage.name,
    status:
      currentStageIndex === -1 || sIdx < currentStageIndex
        ? ("COMPLETED" as const)
        : sIdx === currentStageIndex
          ? ("CURRENT" as const)
          : ("UPCOMING" as const),
  }));
  let daysRemaining: number | null = null;
  if (goal.targetDate) {
    const diffTime = new Date(goal.targetDate).getTime() - Date.now();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  return {
    id: goal.id,
    title: goal.title,
    type: goal.type,
    status: goal.status,
    priority: goal.priority || "MEDIUM",
    routeCode: `#ROUTE-${String(index + 1).padStart(2, "0")}`,
    area: goal.area ?? null,
    targetDate: goal.targetDate ? goal.targetDate.toISOString() : null,
    targetDateLabel: formatDate(goal.targetDate),
    daysRemaining,
    progress,
    totalTasks: tasks.length,
    completedTasks,
    totalStages: goal.stages.length,
    currentStageIndex,
    currentStageName: currentStage?.name ?? null,
    currentStageTasksCount: currentStage?.tasks.length ?? 0,
    nextTaskId: nextTask?.id ?? null,
    nextTaskName: nextTask?.title ?? (nextTask as StageTask | undefined)?.name ?? null,
    totalEstimatedHours,
    waypoints,
  };
}

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requirePageUser();
  const { tab: rawTab } = await searchParams;
  const activeTab: Tab = (VALID_TABS.includes(rawTab as Tab) ? rawTab : "goals") as Tab;

  return (
    <div className="space-y-6 pb-16">
      {/* TAB NAVIGATOR */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#131825] border border-white/[0.08] w-fit font-mono text-xs">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/goals?tab=${t.id}`}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? "bg-purple-600/20 text-purple-300 font-semibold border border-purple-500/30 shadow-sm"
                : "text-[#94A3B8] hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
            <span>{t.label}</span>
          </Link>
        ))}
      </div>

      {/* TAB: GOALS */}
      {activeTab === "goals" && <GoalsTabContent userId={user.id} />}

      {/* TAB: PROJECTS */}
      {activeTab === "projects" && <ProjectsTabContent userId={user.id} />}

      {/* TAB: AREAS */}
      {activeTab === "areas" && <AreasTabContent userId={user.id} />}
    </div>
  );
}

async function GoalsTabContent({ userId }: { userId: string }) {
  const [goals, areas] = await Promise.all([
    getGoalsWithStages(userId),
    getAreas(userId, { isActive: true }),
  ]);
  const activeGoals = goals.filter((g) => g.status !== "COMPLETED").map((g, idx) => buildGoalCard(g as unknown as GoalWithRelations, idx));
  const completedGoals = goals.filter((g) => g.status === "COMPLETED").map((g, idx) => buildGoalCard(g as unknown as GoalWithRelations, idx));
  return <GoalsBoard activeGoals={activeGoals} completedGoals={completedGoals} areas={areas} />;
}

async function ProjectsTabContent({ userId }: { userId: string }) {
  const [projects, areas, goals] = await Promise.all([
    getProjects(userId),
    getAreas(userId),
    getGoals(userId),
  ]);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-purple-400">
          <span>INISIASI & EKSEKUSI // PORTOFOLIO KERJA</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Daftar Proyek</h1>
        <p className="text-sm text-gray-400 max-w-2xl">Kelola inisiatif kerja terstruktur melalui Tonggak Capaian dan rincian tugas terintegrasi.</p>
      </div>
      <ProjectsManager initialProjects={projects} goals={goals} areas={areas} />
    </div>
  );
}

async function AreasTabContent({ userId }: { userId: string }) {
  const areas = await getAreas(userId);
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Domain Kehidupan"
        title="Areas"
        description="Kelola pilar utama kehidupan Anda untuk menyelaraskan Goals, Projects, dan Tasks."
      />
      <AreasManager initialAreas={areas} />
    </div>
  );
}
