"use client";

import { useState } from "react";
import TaskList from "@/app/components/TaskList";
import NewTaskButton from "@/app/components/NewTaskButton";
import StageActions from "@/app/components/StageActions";
import { calculateStageProgress } from "@/services/progress.service";

type StageTask = {
  id: string;
  title: string;
  name?: string;
  description: string | null;
  priority: string;
  status: string;
  estimatedHours: number;
  actualHours: number;
  notes: string | null;
  [key: string]: unknown;
};

type GoalStage = {
  id: string;
  name: string;
  description: string | null;
  order: number;
  tasks: StageTask[];
};

interface GoalStagesAccordionProps {
  stages: GoalStage[];
  currentStageIndex: number;
}

export function GoalStagesAccordion({
  stages,
  currentStageIndex,
}: GoalStagesAccordionProps) {
  // Smart default: open the current active stage, or stage 0 if none
  const [openStages, setOpenStages] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    const defaultOpenIndex = currentStageIndex >= 0 ? currentStageIndex : 0;

    stages.forEach((stage, index) => {
      initialState[stage.id] = index === defaultOpenIndex;
    });
    return initialState;
  });

  const allOpen = stages.every((s) => openStages[s.id]);

  function toggleStage(id: string) {
    setOpenStages((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function handleExpandAll() {
    const next: Record<string, boolean> = {};
    stages.forEach((s) => {
      next[s.id] = true;
    });
    setOpenStages(next);
  }

  function handleCollapseAll() {
    const next: Record<string, boolean> = {};
    stages.forEach((s) => {
      next[s.id] = false;
    });
    setOpenStages(next);
  }

  const completedStagesCount = stages.filter((s) => {
    const total = s.tasks.length;
    const completed = s.tasks.filter((t) => t.status === "COMPLETED").length;
    return total > 0 && completed === total;
  }).length;

  return (
    <section className="flex flex-col gap-5">
      {/* Section Header & Global Accordion Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <span className="material-symbols-outlined text-[18px]">account_tree</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Rincian Tahapan &amp; Tugas Eksekusi
            </h2>
            <p className="font-mono text-xs text-gray-400">
              {stages.length} Tahapan Strategis • {completedStagesCount} Selesai
            </p>
          </div>
        </div>

        {/* Global Expand / Collapse All Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={allOpen ? handleCollapseAll : handleExpandAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#131825] hover:bg-[#1A2133] text-gray-300 hover:text-white border border-white/[0.08] hover:border-white/[0.15] font-mono text-xs transition-colors duration-150 cursor-pointer shadow-sm"
            title={allOpen ? "Tutup Semua Tahapan" : "Buka Semua Tahapan"}
          >
            <span className="material-symbols-outlined text-[16px]">
              {allOpen ? "unfold_less" : "unfold_more"}
            </span>
            <span>{allOpen ? "Tutup Semua" : "Buka Semua"}</span>
          </button>
        </div>
      </div>

      {/* Vertical Timeline & Stages Accordion */}
      <div className="flex flex-col gap-4 relative">
        {/* Background connecting track line with GPU isolation */}
        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-white/[0.08] -z-0 pointer-events-none transform-gpu" />

        {stages.map((stage, index) => {
          const isOpen = Boolean(openStages[stage.id]);
          const stageProgress = calculateStageProgress(stage.tasks);
          const completed = stage.tasks.filter((t) => t.status === "COMPLETED").length;
          const total = stage.tasks.length;
          const isCompleted = total > 0 && completed === total;
          const isCurrent = index === currentStageIndex;

          return (
            <div key={stage.id} className="relative z-10 flex flex-col md:flex-row items-start gap-4">
              {/* Hexagon / Node Marker - GPU accelerated, lightweight transitions */}
              <button
                type="button"
                onClick={() => toggleStage(stage.id)}
                className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-mono font-bold transition-colors duration-150 cursor-pointer select-none transform-gpu ${
                  isCompleted
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
                    : isCurrent
                    ? "bg-purple-600 text-white border border-purple-400/50 hover:bg-purple-500 shadow-md"
                    : "bg-[#131825] text-gray-400 border border-white/[0.08] hover:border-white/[0.2] hover:text-white"
                }`}
                title={isOpen ? "Klik untuk meminimalkan" : "Klik untuk membuka rincian"}
              >
                {isCompleted ? (
                  <span className="material-symbols-outlined text-[20px]">check</span>
                ) : (
                  <span>0{index + 1}</span>
                )}
              </button>

              {/* Main Stage Card - Hardware accelerated, no transition-all layout thrashing */}
              <div
                className={`flex-1 w-full rounded-2xl bg-[#131825] border transition-colors duration-150 overflow-hidden transform-gpu ${
                  isCurrent
                    ? "border-purple-500/50 shadow-md shadow-purple-950/20"
                    : isCompleted
                    ? "border-emerald-500/20"
                    : "border-white/[0.08] hover:border-white/[0.14]"
                }`}
              >
                {/* Clickable Header Bar (Minimalist View) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleStage(stage.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleStage(stage.id);
                    }
                  }}
                  className={`w-full p-4 md:p-5 flex flex-wrap items-center justify-between gap-3 text-left cursor-pointer select-none transition-colors duration-150 ${
                    isOpen ? "bg-white/[0.02] border-b border-white/[0.06]" : "hover:bg-[#1A2133]/40"
                  }`}
                >
                  {/* Left: Stage Badges, Title & Summary */}
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-mono text-[11px] px-2.5 py-0.5 rounded font-bold ${
                          isCompleted
                            ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                            : isCurrent
                            ? "text-purple-300 bg-purple-500/15 border border-purple-500/30"
                            : "text-gray-400 bg-white/[0.05]"
                        }`}
                      >
                        {isCompleted ? "✓ SELESAI" : isCurrent ? "TAHAPAN SAAT INI" : "MENDATANG"}
                      </span>

                      {/* Micro Progress Pill when collapsed */}
                      {!isOpen && (
                        <span className="font-mono text-[11px] text-gray-400 flex items-center gap-1.5 ml-1">
                          <span>•</span>
                          <span className={isCompleted ? "text-emerald-400 font-semibold" : "text-gray-300 font-medium"}>
                            {completed}/{total} Tugas ({stageProgress}%)
                          </span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base md:text-lg font-bold text-white tracking-tight mt-0.5 truncate">
                      TAHAP 0{index + 1} {"//"} {stage.name.toUpperCase()}
                    </h3>

                    {/* Short preview when collapsed */}
                    {!isOpen && stage.description && (
                      <p className="text-xs text-gray-400 line-clamp-1 max-w-2xl mt-0.5">
                        {stage.description}
                      </p>
                    )}
                  </div>

                  {/* Right: Progress Mini Bar & Chevron Toggle */}
                  <div className="flex items-center gap-3 shrink-0 ml-auto">
                    {/* Mini visual progress indicator */}
                    <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#0B0D13]/70 border border-white/[0.05]">
                      <div className="w-16 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-[width] duration-300 ${
                            isCompleted ? "bg-emerald-400" : isCurrent ? "bg-purple-500" : "bg-gray-400"
                          }`}
                          style={{ width: `${stageProgress}%` }}
                        />
                      </div>
                      <span
                        className={`font-mono text-xs font-bold ${
                          isCompleted ? "text-emerald-400" : isCurrent ? "text-purple-300" : "text-gray-400"
                        }`}
                      >
                        {stageProgress}%
                      </span>
                    </div>

                    {/* Expand/Collapse Chevron Button */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-150 ${
                        isOpen
                          ? "bg-purple-500/20 text-purple-300 rotate-180"
                          : "bg-white/[0.05] text-gray-400 hover:text-white"
                      }`}
                      title={isOpen ? "Ciutkan tahapan" : "Buka rincian tahapan"}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        expand_more
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Content */}
                {isOpen && (
                  <div className="p-5 md:p-6 flex flex-col gap-5">
                    {/* Stage Description & Micro Metric */}
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      {stage.description ? (
                        <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
                          {stage.description}
                        </p>
                      ) : (
                        <p className="text-xs font-mono text-gray-500 italic">
                          Tidak ada deskripsi tambahan untuk tahapan ini.
                        </p>
                      )}

                      {/* Detailed Metric Card */}
                      <div className="p-3 rounded-xl bg-[#0B0D13]/80 border border-white/[0.06] flex items-center gap-3 shrink-0 ml-auto">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                            isCompleted
                              ? "bg-emerald-500/20 text-emerald-400"
                              : isCurrent
                              ? "bg-purple-500/20 text-purple-300"
                              : "bg-white/[0.05] text-gray-400"
                          }`}
                        >
                          {stageProgress}%
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] text-gray-400 uppercase">
                            PROGRES TAHAP
                          </span>
                          <span className="font-mono text-xs font-bold text-white">
                            {completed} / {total} Tugas
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Task Action Checklist */}
                    <div>
                      <TaskList tasks={stage.tasks} />
                    </div>

                    {/* Stage Card Footer Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
                      <NewTaskButton stageId={stage.id} />
                      <StageActions
                        id={stage.id}
                        name={stage.name}
                        description={stage.description}
                        canMoveUp={index > 0}
                        canMoveDown={index < stages.length - 1}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
