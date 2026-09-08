import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Applying custom PostgreSQL constraints and partial indexes...");

  // 1. Task structural parent CHECK constraint
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_task_parent') THEN
        ALTER TABLE "Task" ADD CONSTRAINT "chk_task_parent"
        CHECK (
          "stageId" IS NOT NULL OR
          "milestoneId" IS NOT NULL OR
          "projectId" IS NOT NULL OR
          "areaId" IS NOT NULL
        );
      END IF;
    END $$;
  `);
  console.log("✓ chk_task_parent applied");

  // 2. Single active session per user partial UNIQUE index
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_active_session_per_user"
    ON "Session" ("userId")
    WHERE "endedAt" IS NULL;
  `);
  console.log("✓ idx_unique_active_session_per_user applied");

  console.log("Database constraints and indexes setup complete.");
}

main()
  .catch((e) => {
    console.error("Failed to setup database constraints:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
