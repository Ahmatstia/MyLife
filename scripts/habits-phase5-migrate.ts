import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Applying Phase 5 DDL (goalId column & index)...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "TrackedHabit" ADD COLUMN IF NOT EXISTS "goalId" TEXT REFERENCES "Goal"("id") ON DELETE SET NULL;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "TrackedHabit_userId_goalId_idx" ON "TrackedHabit"("userId", "goalId");
  `);
  console.log("✅ Phase 5 DDL applied successfully.");
}

main()
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
