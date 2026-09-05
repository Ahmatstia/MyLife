"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/app/components/ui/Badge";
import type { IconName } from "@/app/components/ui/Icon";
import { Icon } from "@/app/components/ui/Icon";
import { JourneyRoute } from "@/app/components/core/JourneyRoute";
import { FocusOrb } from "@/app/components/core/FocusOrb";
import { ProgressBar } from "@/app/components/ui/Progress";

export type GoalCard = {
  id: string;
  title: string;
  name?: string;
  type: string;
  status: string;
  area?: { id: string; name: string; color: string } | null;
  targetDateLabel: string | null;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  totalStages: number;
  currentStageIndex: number;
  currentStageName: string | null;
  nextTaskName: string | null;
  waypoints: {
    id: string;
    label: string;
    status: "COMPLETED" | "CURRENT" | "UPCOMING";
  }[];
};

const typeConfig: Record<string, { icon: IconName; bg: string; text: string; border: string }> = {
  LEARNING:    { icon: "sparkles", bg: "bg-ai-50", text: "text-ai-600", border: "border-ai-200" },
  ACHIEVEMENT: { icon: "target",   bg: "bg-primary-50", text: "text-primary-600", border: "border-primary-200" },
  HABIT:       { icon: "bolt",     bg: "bg-warning-50", text: "text-warning-600", border: "border-warning-200" },
  MAINTENANCE: { icon: "gauge",    bg: "bg-success-50", text: "text-success-600", border: "border-success-200" },
  PROJECT:     { icon: "layers",   bg: "bg-primary-50", text: "text-primary-600", border: "border-primary-200" },
  PERSONAL:    { icon: "sun",      bg: "bg-warning-50", text: "text-warning-600", border: "border-warning-200" },
  HEALTH:      { icon: "bolt",     bg: "bg-success-50", text: "text-success-600", border: "border-success-200" },
  CAREER:      { icon: "trendingUp", bg: "bg-info-50", text: "text-info-600", border: "border-info-200" },
  OTHER:       { icon: "target",   bg: "bg-surface-100", text: "text-surface-600", border: "border-surface-200" },
};

const accentGradient: Record<string, string> = {
  LEARNING:    "from-ai-500 to-primary-500",
  ACHIEVEMENT: "from-primary-500 to-primary-700",
  HABIT:       "from-warning-400 to-warning-600",
  MAINTENANCE: "from-success-500 to-success-700",
  PROJECT:     "from-primary-500 to-primary-700",
  PERSONAL:    "from-warning-400 to-warning-600",
  HEALTH:      "from-success-500 to-success-700",
  CAREER:      "from-info-400 to-info-600",
  OTHER:       "from-surface-400 to-surface-600",
};

function StatStrip({
  active,
  completed,
}: {
  active: GoalCard[];
  completed: GoalCard[];
}) {
  const all = [...active, ...completed];
  const avgProgress = active.length
    ? Math.round(active.reduce((sum, g) => sum + g.progress, 0) / active.length)
    : 0;
  const tasksDone = all.reduce((sum, g) => sum + g.completedTasks, 0);
  const tasksTotal = all.reduce((sum, g) => sum + g.totalTasks, 0);

  const stats: { label: string; value: string | number; icon: IconName; bg: string; text: string }[] = [
    { label: "Aktif", value: active.length, icon: "compass", bg: "stat-bg-primary", text: "text-primary-600" },
    { label: "Rata progres", value: `${avgProgress}%`, icon: "gauge", bg: "stat-bg-ai", text: "text-ai-600" },
    { label: "Task selesai", value: `${tasksDone}/${tasksTotal}`, icon: "check", bg: "stat-bg-success", text: "text-success-600" },
    { label: "Tuntas", value: completed.length, icon: "flag", bg: "stat-bg-warning", text: "text-warning-600" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className={`bento-tile ${stat.bg} p-4 flex items-center gap-3`}>
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70 ${stat.text}`}>
            <Icon name={stat.icon} size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold leading-none text-surface-900">{stat.value}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-surface-500">
              {stat.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function GoalCardRow({ goal }: { goal: GoalCard }) {
  const done = goal.progress === 100;
  const cfg = typeConfig[goal.type] ?? typeConfig.OTHER;
  const grad = accentGradient[goal.type] ?? accentGradient.OTHER;

  return (
    <Link
      href={`/goals/${goal.id}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-surface-150 bg-white shadow-soft transition-all hover:border-primary-300 hover:shadow-[var(--shadow-card-hover)] card-interactive"
    >
      {/* Top gradient accent line */}
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${grad}`}
      />

      <div className="p-5 flex flex-col justify-between h-full">
        {/* Header row */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${cfg.bg} ${cfg.text}`}>
                <Icon name={cfg.icon} size={12} />
              </span>
              <span className={`chip border text-[10px] ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                {goal.type}
              </span>
              {goal.area && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border"
                  style={{
                    backgroundColor: `${goal.area.color}15`,
                    color: goal.area.color,
                    borderColor: `${goal.area.color}35`,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: goal.area.color }}
                  />
                  {goal.area.name}
                </span>
              )}
              <StatusBadge status={goal.status} />
            </div>
            <FocusOrb
              value={goal.progress}
              size={44}
              stroke={4.5}
              tone={done ? "success" : "primary"}
              label={`Progres ${goal.title} ${goal.progress} persen`}
            >
              <span className="text-[11px] font-bold text-surface-900">{goal.progress}%</span>
            </FocusOrb>
          </div>

          {/* Goal name */}
          <h2 className="mt-3 text-[15px] font-bold tracking-tight text-surface-900 transition-colors group-hover:text-primary-700 line-clamp-2">
            {goal.title}
          </h2>

          {/* Target date if available */}
          {goal.targetDateLabel && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-surface-400">
              <Icon name="clock" size={11} /> Target: {goal.targetDateLabel}
            </p>
          )}

          {/* Progress bar */}
          <div className="mt-3.5">
            <ProgressBar value={goal.progress} size="sm" tone={done ? "success" : "primary"} />
          </div>

          {/* Journey waypoints preview */}
          {goal.waypoints.length > 0 && (
            <div className="mt-3">
              <JourneyRoute
                waypoints={goal.waypoints}
                size="sm"
                label={`Peta ${goal.title}`}
              />
            </div>
          )}

          {/* Current Stage & Next Task */}
          <div className="mt-3 rounded-xl bg-surface-50 p-2.5 space-y-1 text-[11.5px]">
            <div className="flex items-center justify-between text-surface-600">
              <span className="text-[10px] font-semibold uppercase text-surface-400">
                {done ? "Status" : `Stage ${goal.currentStageIndex + 1 || "—"}`}
              </span>
              <span className="font-semibold text-surface-800 truncate max-w-[160px]">
                {done ? "Selesai 🎉" : (goal.currentStageName ?? "Belum ada")}
              </span>
            </div>
            {goal.nextTaskName && !done && (
              <div className="flex items-center justify-between text-surface-500 pt-1 border-t border-surface-200/60">
                <span className="text-[10px] text-surface-400">Next:</span>
                <span className="truncate max-w-[180px] font-medium text-surface-700">
                  {goal.nextTaskName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer meta */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-surface-100 text-[11px] text-surface-400">
          <span>
            {goal.totalStages} stage · {goal.completedTasks}/{goal.totalTasks} task
          </span>
          <span className="flex items-center gap-1 font-semibold text-primary-600 transition-transform group-hover:translate-x-0.5">
            Buka <Icon name="arrowRight" size={11} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function CompletedGrid({ goals }: { goals: GoalCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {goals.map((goal) => {
        const cfg = typeConfig[goal.type] ?? typeConfig.OTHER;
        return (
          <Link
            key={goal.id}
            href={`/goals/${goal.id}`}
            className="group flex items-center gap-3 rounded-xl border border-success-200 bg-gradient-to-r from-success-50/60 to-white p-3.5 transition-all hover:border-success-300 hover:shadow-soft card-interactive"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-500 text-white">
              <Icon name="check" size={15} strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`chip ${cfg.bg} ${cfg.text}`}>{goal.type}</span>
                {goal.area && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.2 text-[9px] font-semibold"
                    style={{
                      backgroundColor: `${goal.area.color}15`,
                      color: goal.area.color,
                    }}
                  >
                    {goal.area.name}
                  </span>
                )}
              </div>
              <p className="truncate text-[13px] font-semibold text-surface-800 transition-colors group-hover:text-success-700">
                {goal.title}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function GoalsBoard({
  activeGoals,
  completedGoals,
}: {
  activeGoals: GoalCard[];
  completedGoals: GoalCard[];
}) {
  const [tab, setTab] = useState<"active" | "completed">("active");
  const [selectedAreaId, setSelectedAreaId] = useState<string>("ALL");
  const hasCompleted = completedGoals.length > 0;

  // Extract unique areas
  const areasMap = new Map<string, { id: string; name: string; color: string }>();
  [...activeGoals, ...completedGoals].forEach((g) => {
    if (g.area) areasMap.set(g.area.id, g.area);
  });
  const availableAreas = Array.from(areasMap.values());

  const displayedActiveGoals =
    selectedAreaId === "ALL"
      ? activeGoals
      : activeGoals.filter((g) => g.area?.id === selectedAreaId);

  const displayedCompletedGoals =
    selectedAreaId === "ALL"
      ? completedGoals
      : completedGoals.filter((g) => g.area?.id === selectedAreaId);

  return (
    <div className="space-y-5">
      <StatStrip active={activeGoals} completed={completedGoals} />

      {/* Filter toolbar: Status & Areas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-150 pb-3">
        {/* Tab nav */}
        <div className="flex items-center gap-1 rounded-xl border border-surface-150 bg-surface-50 p-1 w-fit">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={`relative flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-all ${
              tab === "active"
                ? "bg-white text-surface-900 shadow-soft border border-surface-150"
                : "text-surface-500 hover:text-surface-700"
            }`}
          >
            Aktif
            <span
              className={`chip ${
                tab === "active"
                  ? "bg-primary-100 text-primary-700"
                  : "bg-surface-100 text-surface-400"
              }`}
            >
              {displayedActiveGoals.length}
            </span>
          </button>
          {hasCompleted && (
            <button
              type="button"
              onClick={() => setTab("completed")}
              className={`relative flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-all ${
                tab === "completed"
                  ? "bg-white text-surface-900 shadow-soft border border-surface-150"
                  : "text-surface-500 hover:text-surface-700"
              }`}
            >
              Tuntas
              <span
                className={`chip ${
                  tab === "completed"
                    ? "bg-success-100 text-success-700"
                    : "bg-surface-100 text-surface-400"
                }`}
              >
                {displayedCompletedGoals.length}
              </span>
            </button>
          )}
        </div>

        {/* Area filter */}
        {availableAreas.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-surface-400 font-medium mr-1">Pilar:</span>
            <button
              type="button"
              onClick={() => setSelectedAreaId("ALL")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                selectedAreaId === "ALL"
                  ? "bg-surface-800 text-white shadow-xs"
                  : "bg-surface-100 text-surface-600 hover:bg-surface-200"
              }`}
            >
              Semua
            </button>
            {availableAreas.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => setSelectedAreaId(area.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  selectedAreaId === area.id
                    ? "bg-primary-600 text-white shadow-xs"
                    : "bg-surface-100 text-surface-600 hover:bg-surface-200"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full ring-1 ring-white"
                  style={{ backgroundColor: area.color }}
                />
                {area.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === "active" ? (
        displayedActiveGoals.length === 0 ? (
          <p className="py-4 text-[13px] text-surface-500">
            {selectedAreaId !== "ALL"
              ? "Belum ada goal aktif di pilar ini."
              : "Belum ada goal aktif. Buat satu untuk memulai."}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedActiveGoals.map((goal) => (
              <GoalCardRow key={goal.id} goal={goal} />
            ))}
          </div>
        )
      ) : (
        displayedCompletedGoals.length === 0 ? (
          <p className="py-4 text-[13px] text-surface-500">
            Belum ada goal tuntas di pilar ini.
          </p>
        ) : (
          <CompletedGrid goals={displayedCompletedGoals} />
        )
      )}
    </div>
  );
}
