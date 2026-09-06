import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/ownership";

export interface UserDataExport {
  version: string;
  exportedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  preference: unknown;
  areas: unknown[];
  goals: unknown[];
  objectives: unknown[];
  projects: unknown[];
  milestones: unknown[];
  stages: unknown[];
  tasks: unknown[];
  sessions: unknown[];
  dailyFocus: unknown[];
  reviews: unknown[];
  calendarEvents: unknown[];
  activities: unknown[];
  captures: unknown[];
  notifications: unknown[];
}

export async function exportUserData(userId?: string): Promise<UserDataExport> {
  const owner = requireUserId(userId);

  const [
    userRecord,
    preference,
    areas,
    goals,
    objectives,
    projects,
    milestones,
    stages,
    tasks,
    sessions,
    dailyFocus,
    reviews,
    calendarEvents,
    activities,
    captures,
    notifications,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: owner },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        // passwordHash is EXPLICITLY OMITTED for security
      },
    }),
    prisma.userPreference.findUnique({ where: { userId: owner } }),
    prisma.area.findMany({ where: { userId: owner } }),
    prisma.goal.findMany({ where: { userId: owner } }),
    prisma.objective.findMany({ where: { userId: owner } }),
    prisma.project.findMany({ where: { userId: owner } }),
    prisma.milestone.findMany({ where: { userId: owner } }),
    prisma.stage.findMany({ where: { goal: { userId: owner } } }),
    prisma.task.findMany({ where: { userId: owner } }),
    prisma.session.findMany({ where: { userId: owner } }),
    prisma.dailyFocus.findMany({ where: { userId: owner } }),
    prisma.review.findMany({ where: { userId: owner } }),
    prisma.calendarEvent.findMany({ where: { userId: owner } }),
    prisma.activity.findMany({ where: { userId: owner } }),
    prisma.capture.findMany({ where: { userId: owner } }),
    prisma.notification.findMany({ where: { userId: owner } }),
  ]);

  if (!userRecord) {
    throw new Error("User not found for data export.");
  }

  return {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    user: userRecord,
    preference: preference ?? null,
    areas,
    goals,
    objectives,
    projects,
    milestones,
    stages,
    tasks,
    sessions,
    dailyFocus,
    reviews,
    calendarEvents,
    activities,
    captures,
    notifications,
  };
}
