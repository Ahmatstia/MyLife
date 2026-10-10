import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Running Phase 4 DDL migrations safely...");

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "HabitReminderKind" AS ENUM ('CHECKIN', 'EVENING_REFLECTION', 'RISK_WINDOW', 'WEEKLY_REVIEW', 'ANCHOR');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HabitReminder" (
      "id" TEXT PRIMARY KEY,
      "habitId" TEXT NOT NULL REFERENCES "TrackedHabit"("id") ON DELETE CASCADE,
      "kind" "HabitReminderKind" NOT NULL,
      "localTime" TEXT NOT NULL,
      "daysOfWeek" INTEGER[] NOT NULL DEFAULT '{}',
      "nextFireAt" TIMESTAMPTZ(3),
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "HabitReminder_habitId_isActive_idx" ON "HabitReminder"("habitId", "isActive");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "HabitReminder_isActive_nextFireAt_idx" ON "HabitReminder"("isActive", "nextFireAt");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HabitReflection" (
      "id" TEXT PRIMARY KEY,
      "habitId" TEXT NOT NULL REFERENCES "TrackedHabit"("id") ON DELETE CASCADE,
      "weekStart" DATE NOT NULL,
      "summary" JSONB,
      "question" TEXT NOT NULL,
      "answer" TEXT,
      "submittedAt" TIMESTAMPTZ(3),
      "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "HabitReflection_habitId_weekStart_key" UNIQUE ("habitId", "weekStart")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "HabitReflection_habitId_weekStart_idx" ON "HabitReflection"("habitId", "weekStart" DESC);
  `);

  console.log("✅ Phase 4 DDL migrations completed successfully.");
}

main()
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
