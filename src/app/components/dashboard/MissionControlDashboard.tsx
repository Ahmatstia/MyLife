"use client";

import type { MissionControlData } from "@/services/dashboard.service";
import { MissionControlHeader } from "./MissionControlHeader";
import { LiveVitalsTicker } from "./LiveVitalsTicker";
import { ActivePomodoroHero } from "./ActivePomodoroHero";
import { NextActionSpotlightCard } from "./NextActionSpotlightCard";
import { TodayFocusQueue } from "./TodayFocusQueue";
import { VitalsBentoGrid } from "./VitalsBentoGrid";
import { QuickCaptureInboxCard } from "./QuickCaptureInboxCard";
import { UpcomingRadarCard } from "./UpcomingRadarCard";
import { ActiveProjectsPulse } from "./ActiveProjectsPulse";
import { LifePillarsAllocationBar } from "./LifePillarsAllocationBar";
import { FocusHeatmapCard } from "./FocusHeatmapCard";
import { AIDiagnosticsCard } from "./AIDiagnosticsCard";

interface DashboardProps {
  data: MissionControlData;
}

export function MissionControlDashboard({ data }: DashboardProps) {
  const activeSessionPill = data.activeSession
    ? {
        minutesRemaining: `${Math.floor(
          Math.max(0, data.activeSession.targetSeconds - data.activeSession.elapsedSeconds) / 60
        )}:${String(
          Math.max(0, data.activeSession.targetSeconds - data.activeSession.elapsedSeconds) % 60
        ).padStart(2, "0")}`,
        taskTitle: data.activeSession.taskTitle,
      }
    : null;

  return (
    <div className="min-h-screen bg-[#0B0D13] text-[#e2e2eb] font-mono selection:bg-[#d0bcff]/30 selection:text-white w-full max-w-full overflow-x-hidden">
      {/* 1. Sticky Navigation & Header */}
      <MissionControlHeader
        userName={data.user.name}
        userRole={data.user.role}
        streakDays={data.user.streakDays}
        activeSessionPill={activeSessionPill}
      />

      {/* 2. Main Dashboard Content Container */}
      <main className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 overflow-x-hidden">
        {/* Sub-Bar / Live System Vitals Ticker */}
        <LiveVitalsTicker focusLoadPct={data.user.focusLoadPct} />

        {/* 3. Upper Bento Grid (12 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left 7 Columns: Active Focus Hero, Next Action, Today's Queue */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <ActivePomodoroHero session={data.activeSession} />
            <NextActionSpotlightCard action={data.nextAction} />
            <TodayFocusQueue
              tasks={data.todayQueue}
              completedCount={data.todayCompletedCount}
              totalCount={data.todayTotalCount}
              progressPct={data.todayProgressPct}
            />
          </div>

          {/* Right 5 Columns: Vitals 2x2 Bento, Quick Capture Inbox, 72h Radar */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <VitalsBentoGrid vitals={data.vitals} />
            <QuickCaptureInboxCard initialCaptures={data.quickCaptures} />
            <UpcomingRadarCard items={data.radar72h} />
          </div>
        </div>

        {/* 4. Lower Bento Grid: Strategic Portfolio & Intelligence Heatmap (12 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start mt-2">
          {/* Left 8 Columns: Active Projects & Life Pillars Allocation */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            <ActiveProjectsPulse projects={data.activeProjects} />
            <LifePillarsAllocationBar
              totalHoursLogged={data.pillarAllocation.totalHoursLogged}
              pillars={data.pillarAllocation.pillars}
            />
          </div>

          {/* Right 4 Columns: 90-Day Heatmap & AI Diagnostics */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <FocusHeatmapCard heatmap={data.heatmap} />
            <AIDiagnosticsCard items={data.aiDiagnostics} />
          </div>
        </div>
      </main>

      {/* 5. Minimalist Developer Terminal Footer */}
      <footer className="w-full bg-[#0c0e14] border-t border-white/[0.07] py-4 mt-10">
        <div className="w-full px-4 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px] text-[#958ea0]">
          <div className="flex items-center gap-2">
            <span>MyLife OS v2.4.1</span>
            <span>•</span>
            <span className="text-[#4edea3]">STATUS SISTEM: NORMAL</span>
          </div>
          <div>
            <span>PUSAT KENDALI PRODUKTIVITAS // SEMUA FITUR AKTIF</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
