import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "@/app/components/LoginForm";
import {
  getCompassSummary,
  getAllChapters,
  getReflections,
} from "@/services/direction.service";
import { getAreas } from "@/services/area.service";
import { getToday } from "@/services/today.service";
import { prisma } from "@/lib/prisma";
import { BerandaClient } from "./direction/BerandaClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
        {/* Mesh ambient background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 30% -10%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 75% 110%, rgba(139,92,246,0.07) 0%, transparent 60%)",
            backgroundColor: "hsl(38,28%,97%)",
          }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 dot-grid opacity-40" />

        <section className="relative z-10 w-full max-w-sm">
          {/* Card glass */}
          <div className="rounded-2xl border border-white/80 bg-white/90 p-7 shadow-pop backdrop-blur-sm">
            {/* Brand with Custom Logo */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-[0_0_12px_rgba(99,102,241,0.35)]">
                <Image
                  src="/logo.png"
                  alt="MyLife Logo"
                  width={40}
                  height={40}
                  priority
                  className="object-cover w-full h-full"
                />
              </div>
              <div>
                <p className="text-[15px] font-bold tracking-tight text-surface-900">
                  My<span className="gradient-text">Life</span>
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-400">
                  Personal Life Operating System
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h1 className="text-2xl font-bold tracking-tight text-surface-900">
                Selamat Datang di MyLife
              </h1>
              <p className="mt-1 text-[13px] text-surface-500">
                Masuk agar goals, progres, dan refleksi Anda tetap pribadi. Buat Goal Pertama Anda untuk mulai menyelaraskan arah hidup dan pekerjaan.
              </p>
            </div>

            <LoginForm />
          </div>

          <p className="mt-4 text-center text-[11px] text-surface-400">
            Personal system · Hanya untuk Anda
          </p>
        </section>
      </div>
    );
  }

  // Beranda / Home Dashboard (Primary root route)
  const [summary, allChapters, allReflections, areas, todayData, userGoals] = await Promise.all([
    getCompassSummary(user.id),
    getAllChapters(user.id),
    getReflections(user.id),
    getAreas(user.id),
    getToday(new Date(), user.id),
    prisma.goal.findMany({
      where: { userId: user.id },
      include: { area: true, tasks: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const rawTasks = [
    ...todayData.focusTasks.map((ft) => ({ id: ft.task.id, title: ft.task.title, status: ft.task.status })),
    ...todayData.availableTasks.slice(0, 4).map((t) => ({ id: t.id, title: t.title, status: t.status })),
    ...todayData.completedTasks.slice(0, 2).map((t) => ({ id: t.id, title: t.title, status: t.status })),
  ];

  const uniqueTasksMap = new Map<string, { id: string; title: string; status: string }>();
  for (const t of rawTasks) {
    if (!uniqueTasksMap.has(t.id)) {
      uniqueTasksMap.set(t.id, t);
    }
  }

  const activeGoalsList = userGoals.map((g) => {
    const total = g.tasks.length;
    const completed = g.tasks.filter((t) => t.status === "COMPLETED").length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : (g.status === "COMPLETED" ? 100 : 0);
    return {
      id: g.id,
      title: g.title,
      status: g.status,
      progress,
      areaName: g.area?.name || "Umum",
      areaColor: g.area?.color || "#8B5CF6",
    };
  });

  return (
    <BerandaClient
      user={user}
      identity={summary.identity}
      vision={summary.vision}
      activeChapter={summary.activeChapter}
      allChapters={allChapters}
      allReflections={allReflections}
      availableAreas={areas}
      todayTasks={Array.from(uniqueTasksMap.values())}
      activeGoals={activeGoalsList}
    />
  );
}
