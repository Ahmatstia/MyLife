export type ProgressTaskLike = {
  status: string;
};

export type ProgressStageLike = {
  tasks: ProgressTaskLike[];
};

export type NextActionTaskLike = {
  id: string;
  goalId: string;
  stageId: string;
  name: string;
  status: string;
  priority: string;
  estimatedHours: number;
  goalName: string;
  stageName: string;
  createdAt: Date;
  startedAt: Date | null;
};

type RankedTask = NextActionTaskLike & {
  statusRank: number;
  priorityRank: number;
};

const priorityOrder: Record<string, number> = {
  URGENT: -1,
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

function normalizeStatus(status: string) {
  return status.toUpperCase();
}

export function calculateTaskProgress(status: string) {
  return normalizeStatus(status) === "COMPLETED" ? 100 : 0;
}

export function calculateStageProgress(tasks: ProgressTaskLike[]) {
  if (tasks.length === 0) {
    return 0;
  }

  const completedTasks = tasks.filter(
    (task) => normalizeStatus(task.status) === "COMPLETED",
  ).length;

  return Math.round((completedTasks / tasks.length) * 100);
}

export function calculateGoalProgress(stages: ProgressStageLike[]) {
  if (stages.length === 0) {
    return 0;
  }

  const totalProgress = stages.reduce(
    (sum, stage) => sum + calculateStageProgress(stage.tasks),
    0,
  );

  return Math.round(totalProgress / stages.length);
}

export function calculateSessionDurationMinutes(
  startedAt: Date,
  endedAt: Date = new Date(),
) {
  const duration = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);

  return Math.max(0, duration);
}

function getStatusRank(status: string) {
  switch (normalizeStatus(status)) {
    case "IN_PROGRESS":
      return 0;
    case "NOT_STARTED":
      return 1;
    default:
      return 2;
  }
}

function getPriorityRank(priority: string) {
  return priorityOrder[normalizeStatus(priority)] ?? 3;
}

export function selectNextAction(tasks: NextActionTaskLike[]) {
  const candidates: RankedTask[] = tasks
    .filter((task) => normalizeStatus(task.status) !== "COMPLETED")
    .map((task) => ({
      ...task,
      statusRank: getStatusRank(task.status),
      priorityRank: getPriorityRank(task.priority),
    }));

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((left, right) => {
    if (left.statusRank !== right.statusRank) {
      return left.statusRank - right.statusRank;
    }

    if (left.priorityRank !== right.priorityRank) {
      return left.priorityRank - right.priorityRank;
    }

    if (left.estimatedHours !== right.estimatedHours) {
      return left.estimatedHours - right.estimatedHours;
    }

    return left.createdAt.getTime() - right.createdAt.getTime();
  });

  const nextTask = candidates[0];

  return {
    taskId: nextTask.id,
    goalId: nextTask.goalId,
    stageId: nextTask.stageId,
    taskName: nextTask.name,
    goalName: nextTask.goalName,
    stageName: nextTask.stageName,
    priority: nextTask.priority,
    estimatedHours: nextTask.estimatedHours,
    estimatedMinutes: Math.round(nextTask.estimatedHours * 60),
    status: nextTask.status,
    startedAt: nextTask.startedAt,
  };
}
