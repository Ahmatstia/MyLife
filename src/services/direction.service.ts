import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/ownership";

export type CoreValueItem = {
  id: string;
  name: string;
  description?: string;
};

export type LifePrincipleItem = {
  id: string;
  statement: string;
  context?: string;
};

export type ImportantRoleItem = {
  id: string;
  role: string;
  context?: string;
};

export interface UpsertIdentityInput {
  bio?: string | null;
  currentSituation?: string | null;
  coreValues?: CoreValueItem[];
  principles?: LifePrincipleItem[];
  strengths?: string[];
  growthAreas?: string[];
  importantRoles?: ImportantRoleItem[];
  aspirations?: string | null;
}

export interface UpsertVisionInput {
  statement: string;
  desiredIdentity?: string | null;
  desiredLifestyle?: string | null;
  targetSkills?: string[];
  purposeReason?: string | null;
  timeHorizonYears?: number | null;
}

export interface CreateChapterInput {
  title: string;
  description?: string | null;
  themeColor?: string;
  icon?: string;
  startDate?: string | Date;
  targetEndDate?: string | Date | null;
  isActive?: boolean;
  mainIntent?: string | null;
  focusAreas?: Array<{
    title: string;
    intention?: string | null;
    areaId?: string | null;
  }>;
}

export interface UpdateChapterInput {
  title?: string;
  description?: string | null;
  themeColor?: string;
  icon?: string;
  startDate?: string | Date;
  targetEndDate?: string | Date | null;
  actualEndDate?: string | Date | null;
  isActive?: boolean;
  mainIntent?: string | null;
  reflectionNotes?: string | null;
}

export interface CreateReflectionInput {
  chapterId?: string | null;
  title?: string;
  recentFocusNotes?: string | null;
  meaningfulActivities?: string | null;
  progressNotes?: string | null;
  lifeChanges?: string | null;
  alignmentAssessment?: string | null;
  adjustmentsNeeded?: string | null;
  nextFocus?: string | null;
}

// ------------------------------------------------------------------------------
// IDENTITY
// ------------------------------------------------------------------------------

export async function getIdentity(userId?: string) {
  const owner = requireUserId(userId);
  return prisma.lifeIdentity.findUnique({
    where: { userId: owner },
  });
}

export async function upsertIdentity(input: UpsertIdentityInput, userId?: string) {
  const owner = requireUserId(userId);

  return prisma.lifeIdentity.upsert({
    where: { userId: owner },
    create: {
      userId: owner,
      bio: input.bio,
      currentSituation: input.currentSituation,
      coreValues: input.coreValues ? JSON.parse(JSON.stringify(input.coreValues)) : undefined,
      principles: input.principles ? JSON.parse(JSON.stringify(input.principles)) : undefined,
      strengths: input.strengths ?? [],
      growthAreas: input.growthAreas ?? [],
      importantRoles: input.importantRoles ? JSON.parse(JSON.stringify(input.importantRoles)) : undefined,
      aspirations: input.aspirations,
    },
    update: {
      bio: input.bio,
      currentSituation: input.currentSituation,
      coreValues: input.coreValues ? JSON.parse(JSON.stringify(input.coreValues)) : undefined,
      principles: input.principles ? JSON.parse(JSON.stringify(input.principles)) : undefined,
      strengths: input.strengths ?? [],
      growthAreas: input.growthAreas ?? [],
      importantRoles: input.importantRoles ? JSON.parse(JSON.stringify(input.importantRoles)) : undefined,
      aspirations: input.aspirations,
    },
  });
}

// ------------------------------------------------------------------------------
// VISION
// ------------------------------------------------------------------------------

export async function getVision(userId?: string) {
  const owner = requireUserId(userId);
  return prisma.lifeVision.findUnique({
    where: { userId: owner },
  });
}

export async function upsertVision(input: UpsertVisionInput, userId?: string) {
  const owner = requireUserId(userId);

  return prisma.lifeVision.upsert({
    where: { userId: owner },
    create: {
      userId: owner,
      statement: input.statement,
      desiredIdentity: input.desiredIdentity,
      desiredLifestyle: input.desiredLifestyle,
      targetSkills: input.targetSkills ?? [],
      purposeReason: input.purposeReason,
      timeHorizonYears: input.timeHorizonYears ?? 5,
    },
    update: {
      statement: input.statement,
      desiredIdentity: input.desiredIdentity,
      desiredLifestyle: input.desiredLifestyle,
      targetSkills: input.targetSkills ?? [],
      purposeReason: input.purposeReason,
      timeHorizonYears: input.timeHorizonYears ?? 5,
    },
  });
}

// ------------------------------------------------------------------------------
// CHAPTERS & FOCUS AREAS
// ------------------------------------------------------------------------------

export async function getActiveChapter(userId?: string) {
  const owner = requireUserId(userId);

  return prisma.lifeChapter.findFirst({
    where: {
      userId: owner,
      isActive: true,
    },
    include: {
      focusAreas: {
        orderBy: { order: "asc" },
        include: {
          area: {
            select: {
              id: true,
              name: true,
              color: true,
              icon: true,
            },
          },
        },
      },
      goals: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          targetDate: true,
        },
      },
    },
  });
}

export async function getAllChapters(userId?: string) {
  const owner = requireUserId(userId);

  return prisma.lifeChapter.findMany({
    where: { userId: owner },
    orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
    include: {
      focusAreas: {
        orderBy: { order: "asc" },
        include: {
          area: {
            select: {
              id: true,
              name: true,
              color: true,
              icon: true,
            },
          },
        },
      },
      goals: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  });
}

export async function createChapter(input: CreateChapterInput, userId?: string) {
  const owner = requireUserId(userId);
  const isActive = input.isActive ?? true;

  return prisma.$transaction(async (tx) => {
    // If activating this chapter, mark any currently active chapters as inactive
    if (isActive) {
      await tx.lifeChapter.updateMany({
        where: { userId: owner, isActive: true },
        data: { isActive: false },
      });
    }

    const chapter = await tx.lifeChapter.create({
      data: {
        userId: owner,
        title: input.title,
        description: input.description,
        themeColor: input.themeColor ?? "#8B5CF6",
        icon: input.icon ?? "compass",
        startDate: input.startDate ? new Date(input.startDate) : new Date(),
        targetEndDate: input.targetEndDate ? new Date(input.targetEndDate) : null,
        isActive,
        mainIntent: input.mainIntent,
        focusAreas: input.focusAreas?.length
          ? {
              create: input.focusAreas.map((f, idx) => ({
                title: f.title,
                intention: f.intention,
                areaId: f.areaId || null,
                order: idx,
              })),
            }
          : undefined,
      },
      include: {
        focusAreas: {
          include: {
            area: true,
          },
        },
      },
    });

    return chapter;
  });
}

export async function updateChapter(id: string, input: UpdateChapterInput, userId?: string) {
  const owner = requireUserId(userId);

  const existing = await prisma.lifeChapter.findFirst({
    where: { id, userId: owner },
  });

  if (!existing) {
    throw new Error("Babak kehidupan tidak ditemukan.");
  }

  return prisma.$transaction(async (tx) => {
    if (input.isActive) {
      await tx.lifeChapter.updateMany({
        where: { userId: owner, isActive: true, NOT: { id } },
        data: { isActive: false },
      });
    }

    return tx.lifeChapter.update({
      where: { id, userId: owner },
      data: {
        title: input.title,
        description: input.description,
        themeColor: input.themeColor,
        icon: input.icon,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        targetEndDate: input.targetEndDate !== undefined ? (input.targetEndDate ? new Date(input.targetEndDate) : null) : undefined,
        actualEndDate: input.actualEndDate !== undefined ? (input.actualEndDate ? new Date(input.actualEndDate) : null) : undefined,
        isActive: input.isActive,
        mainIntent: input.mainIntent,
        reflectionNotes: input.reflectionNotes,
      },
      include: {
        focusAreas: {
          include: { area: true },
        },
      },
    });
  });
}

export async function closeChapter(id: string, reflectionNotes?: string, userId?: string) {
  const owner = requireUserId(userId);

  const existing = await prisma.lifeChapter.findFirst({
    where: { id, userId: owner },
  });

  if (!existing) {
    throw new Error("Babak kehidupan tidak ditemukan.");
  }

  return prisma.lifeChapter.update({
    where: { id, userId: owner },
    data: {
      isActive: false,
      actualEndDate: new Date(),
      reflectionNotes: reflectionNotes ?? existing.reflectionNotes,
    },
  });
}

export async function deleteChapter(id: string, userId?: string) {
  const owner = requireUserId(userId);

  const existing = await prisma.lifeChapter.findFirst({
    where: { id, userId: owner },
  });

  if (!existing) {
    throw new Error("Babak kehidupan tidak ditemukan.");
  }

  return prisma.lifeChapter.delete({
    where: { id, userId: owner },
  });
}

export async function addFocusArea(
  chapterId: string,
  input: { title: string; intention?: string | null; areaId?: string | null },
  userId?: string
) {
  const owner = requireUserId(userId);

  const chapter = await prisma.lifeChapter.findFirst({
    where: { id: chapterId, userId: owner },
  });

  if (!chapter) {
    throw new Error("Babak kehidupan tidak ditemukan.");
  }

  const count = await prisma.chapterFocusArea.count({
    where: { chapterId },
  });

  return prisma.chapterFocusArea.create({
    data: {
      chapterId,
      title: input.title,
      intention: input.intention,
      areaId: input.areaId || null,
      order: count,
    },
    include: {
      area: true,
    },
  });
}

export async function deleteFocusArea(id: string, userId?: string) {
  const owner = requireUserId(userId);

  const focusArea = await prisma.chapterFocusArea.findUnique({
    where: { id },
    include: { chapter: true },
  });

  if (!focusArea || focusArea.chapter.userId !== owner) {
    throw new Error("Fokus babak tidak ditemukan.");
  }

  return prisma.chapterFocusArea.delete({
    where: { id },
  });
}

// ------------------------------------------------------------------------------
// DIRECTION REFLECTIONS
// ------------------------------------------------------------------------------

export async function getReflections(userId?: string) {
  const owner = requireUserId(userId);

  return prisma.lifeReflection.findMany({
    where: { userId: owner },
    orderBy: { date: "desc" },
    include: {
      chapter: {
        select: {
          id: true,
          title: true,
          themeColor: true,
        },
      },
    },
  });
}

export async function createReflection(input: CreateReflectionInput, userId?: string) {
  const owner = requireUserId(userId);

  return prisma.lifeReflection.create({
    data: {
      userId: owner,
      chapterId: input.chapterId || null,
      title: input.title ?? "Refleksi Arah Hidup",
      recentFocusNotes: input.recentFocusNotes,
      meaningfulActivities: input.meaningfulActivities,
      progressNotes: input.progressNotes,
      lifeChanges: input.lifeChanges,
      alignmentAssessment: input.alignmentAssessment,
      adjustmentsNeeded: input.adjustmentsNeeded,
      nextFocus: input.nextFocus,
    },
    include: {
      chapter: true,
    },
  });
}

export async function deleteReflection(id: string, userId?: string) {
  const owner = requireUserId(userId);

  const existing = await prisma.lifeReflection.findFirst({
    where: { id, userId: owner },
  });

  if (!existing) {
    throw new Error("Refleksi tidak ditemukan.");
  }

  return prisma.lifeReflection.delete({
    where: { id },
  });
}

// ------------------------------------------------------------------------------
// COMPASS SUMMARY (For Quick Integration in /today and Overview Cards)
// ------------------------------------------------------------------------------

export async function getCompassSummary(userId?: string) {
  const owner = requireUserId(userId);

  const [identity, vision, activeChapter, recentReflection] = await Promise.all([
    prisma.lifeIdentity.findUnique({ where: { userId: owner } }),
    prisma.lifeVision.findUnique({ where: { userId: owner } }),
    prisma.lifeChapter.findFirst({
      where: { userId: owner, isActive: true },
      include: {
        focusAreas: {
          orderBy: { order: "asc" },
          include: {
            area: {
              select: {
                id: true,
                name: true,
                color: true,
                icon: true,
              },
            },
          },
        },
        goals: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            targetDate: true,
          },
        },
      },
    }),
    prisma.lifeReflection.findFirst({
      where: { userId: owner },
      orderBy: { date: "desc" },
    }),
  ]);

  return {
    identity,
    vision,
    activeChapter,
    recentReflection,
    isConfigured: Boolean(identity || vision || activeChapter),
  };
}
