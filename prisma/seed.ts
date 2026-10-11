import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🌱 Seeding database...");

  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
    },
  });

  // Seed Pustaka Pemicu Bawaan (Fase 2)
  console.log("📦 Menyemai pustaka pemicu bawaan (HALT+B & 8 Kategori)...");
  const { seedBuiltinTriggers } = await import("../src/lib/habits/triggers/library");
  const triggerCount = await seedBuiltinTriggers(prisma);
  console.log(`✓ ${triggerCount} pemicu bawaan berhasil disemai.`);

  // Seed Sumber Daya Bantuan Resmi (Fase 2)
  console.log("🏥 Menyemai sumber daya bantuan resmi terverifikasi...");
  const { VERIFIED_SUPPORT_RESOURCES } = await import("../src/lib/habits/safety/resources.seed");
  for (const r of VERIFIED_SUPPORT_RESOURCES) {
    const existing = await prisma.supportResource.findFirst({
      where: { country: r.country, name: r.name },
    });
    if (!existing) {
      await prisma.supportResource.create({
        data: {
          country: r.country,
          category: r.category,
          name: r.name,
          contact: r.contact,
          description: r.description,
          sourceUrl: r.sourceUrl,
          verifiedAt: r.verifiedAt,
          isVerified: true,
        },
      });
    }
  }
  console.log(`✓ ${VERIFIED_SUPPORT_RESOURCES.length} sumber daya bantuan disemai.`);

  // Demo Goal (hanya dibuat jika belum ada)
  let goal = await prisma.goal.findFirst({
    where: { userId: user.id, title: "Belajar AI / Machine Learning" },
  });

  if (!goal) {
    goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: "Belajar AI / Machine Learning",
        description:
          "Roadmap belajar AI dan Machine Learning dari fundamental sampai project.",
        type: "LEARNING",
        status: "ACTIVE",
      },
    });

    const stage = await prisma.stage.create({
      data: {
        userId: user.id,
        goalId: goal.id,
        name: "Phase 0 — Fundamental",
        description: "Membangun fondasi sebelum masuk ke Machine Learning.",
        order: 0,
      },
    });

    await prisma.task.createMany({
      data: [
        {
          userId: user.id,
          stageId: stage.id,
          goalId: goal.id,
          title: "Python Fundamental",
          description: "Memahami dasar-dasar Python.",
          type: "LEARNING",
          priority: "HIGH",
          estimatedHours: 5,
        },
        {
          userId: user.id,
          stageId: stage.id,
          goalId: goal.id,
          title: "Tipe Data & Variabel",
          description: "Memahami int, float, string, boolean, dan casting.",
          type: "LEARNING",
          priority: "HIGH",
          estimatedHours: 3,
        },
        {
          userId: user.id,
          stageId: stage.id,
          goalId: goal.id,
          title: "Struktur Data",
          description: "List, tuple, dictionary, dan set.",
          type: "LEARNING",
          priority: "MEDIUM",
          estimatedHours: 4,
        },
      ],
    });
  }

  console.log("✅ Seed selesai!");
  console.log(`Goal: ${goal.title}`);
}

main()
  .catch((error) => {
    console.error("❌ Seed gagal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
