import { getGoalsWithStages } from "@/services/goal.service";
import { getAreas } from "@/services/area.service";
import { requirePageUser } from "@/lib/auth";
import { calculateGoalProgress } from "@/services/progress.service";
import { GoalsBoard, type GoalCard } from "@/app/components/goals/GoalsBoard";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
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
  stages: {
    id: string;
    name: string;
    tasks: StageTask[];
  }[];
}

function buildGoalCard(goal: GoalWithRelations, index: number): GoalCard {
  const progress = calculateGoalProgress(goal.stages);
  const tasks = goal.stages.flatMap((stage) => stage.tasks);
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const currentStageIndex = goal.stages.findIndex((s) =>
    s.tasks.some((t) => t.status !== "COMPLETED"),
  );
  const currentStage =
    currentStageIndex === -1 ? null : goal.stages[currentStageIndex];
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

  // Days remaining
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
    nextTaskName: nextTask?.title ?? nextTask?.name ?? null,
    totalEstimatedHours,
    waypoints,
  };
}

export default async function GoalsPage() {
  const user = await requirePageUser();

  const [goals, areas] = await Promise.all([
    getGoalsWithStages(user.id),
    getAreas(user.id, { isActive: true }),
  ]);

  const activeGoals = goals
    .filter((g) => g.status !== "COMPLETED")
    .map((g, idx) => buildGoalCard(g as unknown as GoalWithRelations, idx));

  const completedGoals = goals
    .filter((g) => g.status === "COMPLETED")
    .map((g, idx) => buildGoalCard(g as unknown as GoalWithRelations, idx));

  return (
    <GoalsBoard
      activeGoals={activeGoals}
      completedGoals={completedGoals}
      areas={areas}
    />
  );
}
