import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

describe("Phase 3 Schema Tests (Langkah 3.1: HabitBuildProfile & AutomaticitySurvey)", () => {
  const testUserId = "user_phase3_schema_test";
  let sampleBreakHabitId: string;
  let sampleBuildHabitId: string;

  beforeAll(async () => {
    // Siapkan user pengujian
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: "phase3_schema_tester@mylife.test",
        name: "Phase 3 Schema Tester",
        passwordHash: "secure_hash",
      },
    });

    // Buat kebiasaan Break (untuk pengujian replacesHabitId)
    const breakHabit = await prisma.trackedHabit.create({
      data: {
        userId: testUserId,
        name: "Berhenti Merokok",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "21:00",
        startedAt: new Date(),
        currentWindowStart: new Date(),
      },
    });
    sampleBreakHabitId = breakHabit.id;
  });

  afterAll(async () => {
    await prisma.trackedHabit.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
  });

  describe("1. TrackedHabit Mode/Kind Constraint untuk BUILD", () => {
    it("berhasil membuat TrackedHabit dengan kind='BUILD' dan mode=null", async () => {
      const buildHabit = await prisma.trackedHabit.create({
        data: {
          userId: testUserId,
          name: "Membaca Buku",
          kind: "BUILD",
          mode: null,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "07:00",
          startedAt: new Date(),
          currentWindowStart: new Date(),
        },
      });
      sampleBuildHabitId = buildHabit.id;
      expect(buildHabit.id).toBeDefined();
      expect(buildHabit.kind).toBe("BUILD");
      expect(buildHabit.mode).toBeNull();
    });

    it("menolak TrackedHabit kind='BUILD' jika mode tidak null (chk_th_kind_mode)", async () => {
      await expect(
        prisma.trackedHabit.create({
          data: {
            userId: testUserId,
            name: "Build Tidak Valid",
            kind: "BUILD",
            mode: "ABSTAIN", // Dilarang oleh constraint chk_th_kind_mode
            timezone: "Asia/Jakarta",
            checkinLocalTime: "08:00",
            startedAt: new Date(),
            currentWindowStart: new Date(),
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe("2. Model HabitBuildProfile (Tiny Habits & ABC Method)", () => {
    it("berhasil membuat HabitBuildProfile 1:1 dengan anchor, tiny behavior, dan celebration", async () => {
      const profile = await prisma.habitBuildProfile.create({
        data: {
          habitId: sampleBuildHabitId,
          anchorText: "Setelah saya menyeduh kopi pagi",
          tinyBehavior: "Buka buku dan baca 1 paragraf",
          celebrationText: "Tersenyum dan katakan 'Langkah bagus!'",
          versions: {
            tiny: "1 paragraf",
            standard: "1 bab atau 15 menit",
            stretch: "30 menit tanpa distraksi",
          },
          scheduleType: "DAILY",
          replacesHabitId: sampleBreakHabitId,
        },
        include: {
          habit: true,
          replacesHabit: true,
        },
      });

      expect(profile.habitId).toBe(sampleBuildHabitId);
      expect(profile.anchorText).toBe("Setelah saya menyeduh kopi pagi");
      expect(profile.tinyBehavior).toBe("Buka buku dan baca 1 paragraf");
      expect(profile.celebrationText).toBe("Tersenyum dan katakan 'Langkah bagus!'");
      expect(profile.scheduleType).toBe("DAILY");
      expect(profile.replacesHabitId).toBe(sampleBreakHabitId);
      expect(profile.replacesHabit?.name).toBe("Berhenti Merokok");
      expect(profile.versions).toEqual({
        tiny: "1 paragraf",
        standard: "1 bab atau 15 menit",
        stretch: "30 menit tanpa distraksi",
      });
    });

    it("mendukung jadwal DAYS_OF_WEEK dan TIMES_PER_WEEK", async () => {
      // Update ke DAYS_OF_WEEK
      const updatedWeekdays = await prisma.habitBuildProfile.update({
        where: { habitId: sampleBuildHabitId },
        data: {
          scheduleType: "DAYS_OF_WEEK",
          daysOfWeek: [1, 3, 5], // Senin, Rabu, Jumat
          restDays: [7], // Minggu
        },
      });

      expect(updatedWeekdays.scheduleType).toBe("DAYS_OF_WEEK");
      expect(updatedWeekdays.daysOfWeek).toEqual([1, 3, 5]);
      expect(updatedWeekdays.restDays).toEqual([7]);

      // Update ke TIMES_PER_WEEK
      const updatedTimesPerWeek = await prisma.habitBuildProfile.update({
        where: { habitId: sampleBuildHabitId },
        data: {
          scheduleType: "TIMES_PER_WEEK",
          timesPerWeek: 4,
        },
      });

      expect(updatedTimesPerWeek.scheduleType).toBe("TIMES_PER_WEEK");
      expect(updatedTimesPerWeek.timesPerWeek).toBe(4);
    });

    it("CHECK chk_hbp_times_per_week: menolak timesPerWeek di luar rentang 1..7", async () => {
      // timesPerWeek = 8 -> tolak
      await expect(
        prisma.habitBuildProfile.update({
          where: { habitId: sampleBuildHabitId },
          data: {
            timesPerWeek: 8,
          },
        }),
      ).rejects.toThrow();

      // timesPerWeek = 0 -> tolak
      await expect(
        prisma.habitBuildProfile.update({
          where: { habitId: sampleBuildHabitId },
          data: {
            timesPerWeek: 0,
          },
        }),
      ).rejects.toThrow();
    });

    it("menyetel replacesHabitId menjadi null saat kebiasaan pengganti dihapus (ON DELETE SET NULL)", async () => {
      // Buat habit sementara untuk digantikan
      const tempBreakHabit = await prisma.trackedHabit.create({
        data: {
          userId: testUserId,
          name: "Kebiasaan Sementara",
          kind: "BREAK",
          mode: "ABSTAIN",
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          startedAt: new Date(),
          currentWindowStart: new Date(),
        },
      });

      // Tautkan ke build profile
      await prisma.habitBuildProfile.update({
        where: { habitId: sampleBuildHabitId },
        data: { replacesHabitId: tempBreakHabit.id },
      });

      // Hapus habit sementara
      await prisma.trackedHabit.delete({
        where: { id: tempBreakHabit.id },
      });

      // Cek profile: replacesHabitId harus sudah null
      const profileAfterDelete = await prisma.habitBuildProfile.findUnique({
        where: { habitId: sampleBuildHabitId },
      });
      expect(profileAfterDelete?.replacesHabitId).toBeNull();
    });
  });

  describe("3. Model AutomaticitySurvey (Survei Otomatisitas 1–7)", () => {
    it("berhasil mencatat skor otomatisitas 1..7", async () => {
      const survey1 = await prisma.automaticitySurvey.create({
        data: {
          habitId: sampleBuildHabitId,
          score: 2, // Awal pembentukan
          answeredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 hari lalu
        },
      });

      const survey2 = await prisma.automaticitySurvey.create({
        data: {
          habitId: sampleBuildHabitId,
          score: 5, // Menguat
          answeredAt: new Date(),
        },
      });

      expect(survey1.score).toBe(2);
      expect(survey2.score).toBe(5);

      const allSurveys = await prisma.automaticitySurvey.findMany({
        where: { habitId: sampleBuildHabitId },
        orderBy: { answeredAt: "asc" },
      });

      expect(allSurveys).toHaveLength(2);
      expect(allSurveys[0].score).toBe(2);
      expect(allSurveys[1].score).toBe(5);
    });

    it("CHECK chk_as_score: menolak skor < 1 atau > 7", async () => {
      // score = 0 -> tolak
      await expect(
        prisma.automaticitySurvey.create({
          data: {
            habitId: sampleBuildHabitId,
            score: 0,
          },
        }),
      ).rejects.toThrow();

      // score = 8 -> tolak
      await expect(
        prisma.automaticitySurvey.create({
          data: {
            habitId: sampleBuildHabitId,
            score: 8,
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe("4. HabitStats untuk Phase 3 (Build & Reduce Metrics)", () => {
    it("dapat menyimpan metrik consistency30d, resilientStreak, moneySavedEst, dan minutesSavedEst", async () => {
      const stats = await prisma.habitStats.create({
        data: {
          habitId: sampleBuildHabitId,
          currentStreakDays: 10,
          longestStreakDays: 15,
          consistency30d: new Prisma.Decimal("85.50"),
          resilientStreak: 12,
          moneySavedEst: new Prisma.Decimal("150000.00"),
          minutesSavedEst: 180,
        },
      });

      expect(stats.habitId).toBe(sampleBuildHabitId);
      expect(Number(stats.consistency30d)).toBe(85.5);
      expect(stats.resilientStreak).toBe(12);
      expect(Number(stats.moneySavedEst)).toBe(150000);
      expect(stats.minutesSavedEst).toBe(180);
    });
  });

  describe("5. Cascade Deletion", () => {
    it("menghapus HabitBuildProfile dan AutomaticitySurvey saat TrackedHabit dihapus", async () => {
      await prisma.trackedHabit.delete({
        where: { id: sampleBuildHabitId },
      });

      const profile = await prisma.habitBuildProfile.findUnique({
        where: { habitId: sampleBuildHabitId },
      });
      const surveys = await prisma.automaticitySurvey.findMany({
        where: { habitId: sampleBuildHabitId },
      });
      const stats = await prisma.habitStats.findUnique({
        where: { habitId: sampleBuildHabitId },
      });

      expect(profile).toBeNull();
      expect(surveys).toHaveLength(0);
      expect(stats).toBeNull();
    });
  });
});
