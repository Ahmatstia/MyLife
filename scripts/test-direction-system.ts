import { prisma } from "../src/lib/prisma";
import {
  upsertIdentity,
  getIdentity,
  upsertVision,
  getVision,
  createChapter,
  getActiveChapter,
  getAllChapters,
  createReflection,
  getReflections,
  getCompassSummary,
} from "../src/services/direction.service";

async function runTests() {
  console.log("=== Testing Identity & Direction System ===");

  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error("No user found in database!");
  }
  const userId = user.id;
  console.log(`Testing with user: ${userId} (${user.email})`);

  // 1. Test Identity
  console.log("\n1. Testing Identity...");
  const identity = await upsertIdentity(
    {
      bio: "Software developer focused on building intuitive tools and personal growth.",
      currentSituation: "Building my foundation in life, career, and personal operating systems.",
      coreValues: [
        { id: "val-1", name: "Integritas", description: "Jujur pada diri sendiri" },
        { id: "val-2", name: "Pembelajaran", description: "Terus bertumbuh setiap hari" },
        { id: "val-3", name: "Kebebasan", description: "Otonomi waktu dan pikiran" },
      ],
      principles: [
        { id: "pr-1", statement: "Kualitas dan konsistensi mengalahkan kecepatan sesaat" },
        { id: "pr-2", statement: "Kendalikan apa yang bisa dikendalikan" },
      ],
      strengths: ["Problem Solving", "Tekun", "Reflektif"],
      growthAreas: ["Manajemen Energi", "Fokus Mendalam"],
      importantRoles: [
        { id: "r-1", role: "Software Engineer" },
        { id: "r-2", role: "Pembelajar" },
      ],
      aspirations: "Mencapai kemandirian finansial dan intelektual.",
    },
    userId
  );
  console.log("✓ Identity created/updated:", identity.id);

  const fetchedIdentity = await getIdentity(userId);
  if (!fetchedIdentity || fetchedIdentity.bio?.length === 0) {
    throw new Error("Failed to fetch identity!");
  }
  console.log("✓ Identity verified:", fetchedIdentity.bio);

  // 2. Test Vision
  console.log("\n2. Testing Vision...");
  const vision = await upsertVision(
    {
      statement: "Menjadi software architect yang kompeten, bijaksana, mandiri finansial, dan memberi dampak nyata.",
      desiredIdentity: "Technical Leader & Life Craftsman",
      desiredLifestyle: "Ritme harian yang seimbang, tenang, bebas stres, dan penuh intensi.",
      targetSkills: ["Arsitektur Web Modern", "Kepemimpinan", "Finansial"],
      purposeReason: "Menciptakan karya bermanfaat yang bertahan lama.",
      timeHorizonYears: 5,
    },
    userId
  );
  console.log("✓ Vision created/updated:", vision.id);

  const fetchedVision = await getVision(userId);
  if (!fetchedVision || !fetchedVision.statement.includes("architect")) {
    throw new Error("Failed to fetch vision!");
  }
  console.log("✓ Vision verified:", fetchedVision.statement);

  // 3. Test Life Chapter & Focus Areas
  console.log("\n3. Testing Life Chapter & Focus Areas...");
  const area = await prisma.area.findFirst({ where: { userId } });
  const chapter = await createChapter(
    {
      title: "Membangun Fondasi & Kemandirian",
      mainIntent: "Memperkuat kemampuan rekayasa perangkat lunak dan kebiasaan hidup sehat.",
      description: "Fase krusial untuk membangun fondasi karir, fisik, dan stabilitas.",
      themeColor: "#8B5CF6",
      icon: "compass",
      focusAreas: [
        {
          title: "Penguasaan Full-Stack & Arsitektur",
          intention: "Memahami sistem secara mendalam",
          areaId: area?.id || null,
        },
        {
          title: "Kesehatan Fisik & Rutinitas Tidur",
          intention: "Energi stabil sepanjang hari",
        },
      ],
    },
    userId
  );
  console.log("✓ Chapter created:", chapter.id, chapter.title);

  const activeChapter = await getActiveChapter(userId);
  if (!activeChapter || activeChapter.focusAreas.length !== 2) {
    throw new Error("Active chapter or focus areas not matching!");
  }
  console.log(`✓ Active chapter verified with ${activeChapter.focusAreas.length} focus areas:`);
  activeChapter.focusAreas.forEach((fa) => {
    console.log(`   - ${fa.title} (${fa.area?.name || "Mandiri"})`);
  });

  const allChapters = await getAllChapters(userId);
  console.log(`✓ Total chapters: ${allChapters.length}`);

  // 4. Test Reflection
  console.log("\n4. Testing Life Reflection...");
  const reflection = await createReflection(
    {
      chapterId: chapter.id,
      title: "Refleksi Arah — Musim Fondasi",
      meaningfulActivities: "Membangun fitur Identity & Direction System dan belajar konsep baru.",
      alignmentAssessment: "Sangat selaras dengan visi menjadi engineer yang kompeten.",
      adjustmentsNeeded: "Kurangi distraksi media sosial di malam hari.",
      nextFocus: "Menjaga ritme harian dan menyelesaikan proyek utama.",
    },
    userId
  );
  console.log("✓ Reflection created:", reflection.id, reflection.title);

  const reflections = await getReflections(userId);
  if (reflections.length === 0) {
    throw new Error("No reflections found!");
  }
  console.log(`✓ Total reflections verified: ${reflections.length}`);

  // 5. Test Compass Summary
  console.log("\n5. Testing Compass Summary...");
  const summary = await getCompassSummary(userId);
  if (!summary.isConfigured || !summary.activeChapter || !summary.identity || !summary.vision) {
    throw new Error("Compass summary is incomplete!");
  }
  console.log("✓ Compass Summary verified 100%!");
  console.log("   - Identity:", summary.identity.bio);
  console.log("   - North Star:", summary.vision.statement);
  console.log("   - Active Chapter:", summary.activeChapter.title);

  console.log("\n=== ALL TESTS PASSED SUCCESSFULLY! ===");
}

runTests()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
