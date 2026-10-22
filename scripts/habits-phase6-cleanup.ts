import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("==========================================================");
  console.log("[Habits Phase 6] Menjalankan pembersihan destruktif skema lama...");
  console.log("==========================================================");

  const dropStatements = [
    `DROP TABLE IF EXISTS "HabitLog" CASCADE;`,
    `DROP TABLE IF EXISTS "HabitStreak" CASCADE;`,
    `DROP TABLE IF EXISTS "HabitPhase" CASCADE;`,
    `DROP TABLE IF EXISTS "HabitTask" CASCADE;`,
    `DROP TABLE IF EXISTS "Habit" CASCADE;`,
    `DROP TYPE IF EXISTS "HabitType" CASCADE;`,
    `DROP TYPE IF EXISTS "HabitDifficulty" CASCADE;`,
  ];

  for (const sql of dropStatements) {
    try {
      console.log(`Menjalankan: ${sql}`);
      await prisma.$executeRawUnsafe(sql);
      console.log(`✓ Berhasil: ${sql}`);
    } catch (err) {
      console.warn(`Peringatan saat menjalankan ${sql}:`, err);
    }
  }

  console.log("==========================================================");
  console.log("Pembersihan tabel & tipe data lama di PostgreSQL berhasil.");
  console.log("==========================================================");
}

main()
  .catch((e) => {
    console.error("Gagal menjalankan pembersihan:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
