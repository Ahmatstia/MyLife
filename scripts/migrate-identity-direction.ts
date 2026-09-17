import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Starting Identity & Direction schema migration...");

  // 1. Create LifeIdentity table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LifeIdentity" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
      "bio" TEXT,
      "currentSituation" TEXT,
      "coreValues" JSONB,
      "principles" JSONB,
      "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "growthAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "importantRoles" JSONB,
      "aspirations" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✓ Table LifeIdentity ready");

  // 2. Create LifeVision table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LifeVision" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
      "statement" TEXT NOT NULL,
      "desiredIdentity" TEXT,
      "desiredLifestyle" TEXT,
      "targetSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "purposeReason" TEXT,
      "timeHorizonYears" INTEGER DEFAULT 5,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✓ Table LifeVision ready");

  // 3. Create LifeChapter table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LifeChapter" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "themeColor" TEXT NOT NULL DEFAULT '#8B5CF6',
      "icon" TEXT NOT NULL DEFAULT 'compass',
      "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "targetEndDate" TIMESTAMP(3),
      "actualEndDate" TIMESTAMP(3),
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "mainIntent" TEXT,
      "reflectionNotes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "LifeChapter_userId_isActive_idx" ON "LifeChapter"("userId", "isActive");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "LifeChapter_userId_startDate_idx" ON "LifeChapter"("userId", "startDate");
  `);
  console.log("✓ Table LifeChapter ready");

  // 4. Create ChapterFocusArea table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ChapterFocusArea" (
      "id" TEXT PRIMARY KEY,
      "chapterId" TEXT NOT NULL REFERENCES "LifeChapter"("id") ON DELETE CASCADE,
      "areaId" TEXT REFERENCES "Area"("id") ON DELETE SET NULL,
      "title" TEXT NOT NULL,
      "intention" TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ChapterFocusArea_chapterId_order_idx" ON "ChapterFocusArea"("chapterId", "order");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ChapterFocusArea_chapterId_areaId_idx" ON "ChapterFocusArea"("chapterId", "areaId");
  `);
  console.log("✓ Table ChapterFocusArea ready");

  // 5. Create LifeReflection table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LifeReflection" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "chapterId" TEXT REFERENCES "LifeChapter"("id") ON DELETE SET NULL,
      "title" TEXT NOT NULL DEFAULT 'Refleksi Arah Hidup',
      "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "recentFocusNotes" TEXT,
      "meaningfulActivities" TEXT,
      "progressNotes" TEXT,
      "lifeChanges" TEXT,
      "alignmentAssessment" TEXT,
      "adjustmentsNeeded" TEXT,
      "nextFocus" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "LifeReflection_userId_date_idx" ON "LifeReflection"("userId", "date");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "LifeReflection_userId_chapterId_idx" ON "LifeReflection"("userId", "chapterId");
  `);
  console.log("✓ Table LifeReflection ready");

  // 6. Add chapterId column to Goal table
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Goal" 
    ADD COLUMN IF NOT EXISTS "chapterId" TEXT REFERENCES "LifeChapter"("id") ON DELETE SET NULL;
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Goal_userId_chapterId_idx" ON "Goal"("userId", "chapterId");
  `);
  console.log("✓ Goal.chapterId reference and index ready");

  console.log("All Identity & Direction tables and indexes successfully applied!");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
