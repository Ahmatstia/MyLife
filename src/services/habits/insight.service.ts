import { prisma } from "@/lib/prisma";
import { SystemClock, type Clock } from "@/lib/habits/clock";
import { HabitsError } from "./habit-v2.service";
import {
  computeHabitInsights,
  HabitEventInsightInput,
  HabitCheckinInsightInput,
  HaltTag,
  InsightsResult,
} from "@/lib/habits/insights";

export interface HabitInsightsResponse extends InsightsResult {
  habit: {
    id: string;
    name: string;
    displayAlias: string | null;
    kind: "BREAK" | "BUILD";
    startedAt: Date;
    timezone: string;
  };
}

export async function getHabitInsightsService(
  userId: string,
  habitId: string,
  rangeDays: 30 | 60 | 90 = 60,
  client = prisma,
  clock: Clock = new SystemClock(),
): Promise<HabitInsightsResponse> {
  const habit = await client.trackedHabit.findFirst({
    where: { id: habitId, userId },
    select: {
      id: true,
      name: true,
      displayAlias: true,
      kind: true,
      startedAt: true,
      timezone: true,
    },
  });

  if (!habit) {
    throw new HabitsError("Kebiasaan tidak ditemukan", "NOT_FOUND", 404);
  }

  const now = clock.now();
  const cutoffDate = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);

  const [events, checkins, copingPlans] = await Promise.all([
    client.habitEvent.findMany({
      where: {
        habitId,
        occurredAt: { gte: cutoffDate },
        deletedAt: null,
      },
      include: {
        eventTriggers: {
          include: {
            habitTrigger: {
              include: {
                trigger: true,
              },
            },
          },
        },
      },
      orderBy: { occurredAt: "asc" },
    }),
    client.habitCheckin.findMany({
      where: {
        habitId,
        windowStart: { gte: cutoffDate },
      },
      orderBy: { periodDate: "asc" },
    }),
    client.copingPlan.findMany({
      where: { habitId },
      select: {
        id: true,
        ifCondition: true,
        thenAction: true,
      },
    }),
  ]);

  const planMap = new Map<string, string>();
  for (const p of copingPlans) {
    planMap.set(p.id, `Jika ${p.ifCondition}, maka ${p.thenAction}`);
  }

  const mappedEvents: HabitEventInsightInput[] = events.map((e) => {
    const meta = (e.meta ?? {}) as Record<string, unknown>;
    const cPlanId = (meta.copingPlanId as string | undefined) || undefined;
    const planTitle = cPlanId ? planMap.get(cPlanId) || (meta.copingPlanTitle as string | undefined) : undefined;

    return {
      id: e.id,
      kind: e.type as HabitEventInsightInput["kind"],
      occurredAt: e.occurredAt,
      mood: e.mood,
      intensity: e.intensityBefore,
      durationMinutes: typeof meta.durationMinutes === "number" ? meta.durationMinutes : undefined,
      haltState: (e.halt as HaltTag[]) || [],
      copingPlanId: cPlanId,
      copingPlanTitle: planTitle,
      copingPlanSuccess:
        e.outcome === "RESISTED"
          ? true
          : e.outcome === "GAVE_IN" || e.type === "LAPSE"
          ? false
          : undefined,
      triggers: e.eventTriggers.map((et) => ({
        id: et.habitTrigger.trigger.id,
        name: et.habitTrigger.trigger.name,
        category: et.habitTrigger.trigger.category,
      })),
    };
  });

  const mappedCheckins: HabitCheckinInsightInput[] = checkins.map((c) => ({
    id: c.id,
    periodDate: c.periodDate,
    mood: c.mood,
    quantity: c.quantity ? Number(c.quantity) : null,
    status: c.status as HabitCheckinInsightInput["status"],
  }));

  const insightsResult = computeHabitInsights({
    startedAt: habit.startedAt,
    now,
    timezone: habit.timezone,
    events: mappedEvents,
    checkins: mappedCheckins,
  });

  return {
    habit: {
      id: habit.id,
      name: habit.name,
      displayAlias: habit.displayAlias,
      kind: habit.kind as "BREAK" | "BUILD",
      startedAt: habit.startedAt,
      timezone: habit.timezone,
    },
    ...insightsResult,
  };
}
