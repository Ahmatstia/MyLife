import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import {
  parseArgs,
  runHabitsLegacyMigration,
} from "../../scripts/habits-legacy-migrate";

describe("Legacy Habits Migration Script Tests (Langkah 1.7)", () => {
  const testUserId = "user_legacy_migrate_test";

  beforeAll(async () => {
    // Bersihkan dan siapkan user pengujian
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: "legacy_migrate_tester@mylife.test",
        name: "Legacy Migrate Tester",
        passwordHash: "secure_hash",
      },
    });

    await prisma.userPreference.upsert({
      where: { userId: testUserId },
      update: { timezone: "Asia/Jakarta" },
      create: {
        userId: testUserId,
        timezone: "Asia/Jakarta",
      },
    });
  });

  afterAll(async () => {
    await prisma.trackedHabit.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.habit.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
  });

  describe("1. Argument Parsing", () => {
    it("defaults to mode A and dryRun = true", () => {
      expect(parseArgs([])).toEqual({ mode: "A", dryRun: true });
    });

    it("parses mode B correctly", () => {
      expect(parseArgs(["--mode=B"])).toEqual({ mode: "B", dryRun: true });
      expect(parseArgs(["-B"])).toEqual({ mode: "B", dryRun: true });
    });

    it("parses --execute flag correctly", () => {
      expect(parseArgs(["--execute"])).toEqual({ mode: "A", dryRun: false });
      expect(parseArgs(["--mode=B", "--execute"])).toEqual({ mode: "B", dryRun: false });
    });
  });

  describe("2. Jalur B: Ekspor Cadangan JSON", () => {
    it("mengekspor ke JSON saat dry-run dan execute", async () => {
      const outDir = path.resolve(process.cwd(), "tests/support");
      const reportDry = await runHabitsLegacyMigration(
        { mode: "B", dryRun: true, outDir },
        prisma,
      );

      expect(reportDry.mode).toBe("B");
      expect(reportDry.dryRun).toBe(true);
      expect(reportDry.exportFilePath).toBeDefined();

      // Jalankan ekspor riil ke outDir
      const reportReal = await runHabitsLegacyMigration(
        { mode: "B", dryRun: false, outDir },
        prisma,
      );

      expect(reportReal.dryRun).toBe(false);
      expect(fs.existsSync(reportReal.exportFilePath!)).toBe(true);

      // Bersihkan file ekspor sementara
      if (reportReal.exportFilePath && fs.existsSync(reportReal.exportFilePath)) {
        fs.unlinkSync(reportReal.exportFilePath);
      }
    });
  });

  describe("3. Jalur A: Migrasi BAD Habit & Pelaporan Selisih Streak", () => {
    let badHabitId: string;
    let goodHabitId: string;

    beforeAll(async () => {
      // 1. Buat Habit BAD lama
      const badHabit = await prisma.habit.create({
        data: {
          userId: testUserId,
          title: "Kecanduan Kopi Manis",
          description: "Ingin mengurangi konsumsi gula berlebih",
          type: "BAD",
          checkInTime: "21:00",
          whyQuit: "Mencegah diabetes dan meningkatkan energi stabil",
          triggerNotes: "Saat mengantuk jam 3 sore di kantor",
          startDate: new Date("2026-10-01T00:00:00.000Z"),
        },
      });
      badHabitId = badHabit.id;

      // Buat streak lama (misal tercatat 3 hari)
      await prisma.habitStreak.create({
        data: {
          userId: testUserId,
          habitId: badHabit.id,
          startDate: new Date("2026-10-01T00:00:00.000Z"),
          days: 3,
          isCurrent: true,
        },
      });

      // Buat logs lama:
      // Hari 1: Sukses
      // Hari 2: Sukses
      // Hari 3: Gagal (Lapse)
      await prisma.habitLog.createMany({
        data: [
          {
            userId: testUserId,
            habitId: badHabit.id,
            date: new Date("2026-10-01T00:00:00.000Z"),
            isSuccess: true,
            mood: 4,
            notes: "Berhasil menahan diri",
          },
          {
            userId: testUserId,
            habitId: badHabit.id,
            date: new Date("2026-10-02T00:00:00.000Z"),
            isSuccess: true,
            mood: 5,
            notes: "Minum air putih dingin",
          },
          {
            userId: testUserId,
            habitId: badHabit.id,
            date: new Date("2026-10-03T00:00:00.000Z"),
            isSuccess: false,
            mood: 2,
            relapseTrigger: "Ditawari teman kopi susu",
            notes: "Terpeleset 1 cangkir",
          },
        ],
      });

      // 2. Buat Habit GOOD lama (harus ditunda dan tidak dimigrasikan ke Break)
      const goodHabit = await prisma.habit.create({
        data: {
          userId: testUserId,
          title: "Olahraga Pagi 15 Menit",
          type: "GOOD",
          checkInTime: "07:00",
        },
      });
      goodHabitId = goodHabit.id;
    });

    it("menjalankan dry-run dan melaporkan selisih streak tanpa menulis ke DB baru", async () => {
      const initialCount = await prisma.trackedHabit.count({
        where: { userId: testUserId },
      });

      const report = await runHabitsLegacyMigration(
        { mode: "A", dryRun: true },
        prisma,
      );

      expect(report.mode).toBe("A");
      expect(report.dryRun).toBe(true);
      expect(report.badHabitsCount).toBeGreaterThanOrEqual(1);
      expect(report.goodHabitsDeferredCount).toBeGreaterThanOrEqual(1);

      // Cari perbandingan streak untuk kebiasaan uji
      const comparison = report.streakComparisons.find((s) => s.habitId === badHabitId);
      expect(comparison).toBeDefined();
      expect(comparison!.title).toBe("Kecanduan Kopi Manis");
      expect(comparison!.legacyStreakDays).toBe(3);
      // Di StreakEngine v2, karena hari ke-3 ada event LAPSE, streak dihitung ulang secara objektif
      expect(comparison!.newStreakDays).toBe(0);
      expect(comparison!.streakDiff).toBe(-3); // Selisih dilaporkan dengan akurat

      // DB TrackedHabit tidak bertambah saat dry-run
      const afterCount = await prisma.trackedHabit.count({
        where: { userId: testUserId },
      });
      expect(afterCount).toBe(initialCount);
    });

    it("menjalankan migrasi sesungguhnya saat execute mode aktif", async () => {
      const report = await runHabitsLegacyMigration(
        { mode: "A", dryRun: false },
        prisma,
      );

      expect(report.dryRun).toBe(false);

      // Verifikasi TrackedHabit telah dibuat untuk BAD habit
      const tracked = await prisma.trackedHabit.findFirst({
        where: {
          userId: testUserId,
          name: "Kecanduan Kopi Manis",
        },
        include: {
          breakProfile: true,
          checkins: true,
          events: true,
          stats: true,
        },
      });

      expect(tracked).toBeDefined();
      expect(tracked!.kind).toBe("BREAK");
      expect(tracked!.mode).toBe("ABSTAIN");
      expect(tracked!.checkinLocalTime).toBe("21:00");
      expect(tracked!.timezone).toBe("Asia/Jakarta");

      // Verifikasi whyReasons
      expect(tracked!.breakProfile?.whyReasons).toEqual(
        expect.arrayContaining([
          "Mencegah diabetes dan meningkatkan energi stabil",
          "Pemicu teridentifikasi: Saat mengantuk jam 3 sore di kantor",
        ]),
      );

      // Verifikasi checkin
      expect(tracked!.checkins.length).toBe(3);
      expect(tracked!.checkins.filter((c) => c.status === "CLEAN").length).toBe(2);
      expect(tracked!.checkins.filter((c) => c.status === "LAPSED").length).toBe(1);

      // Verifikasi event LAPSE
      expect(tracked!.events.length).toBe(1);
      expect(tracked!.events[0].type).toBe("LAPSE");
      expect(tracked!.events[0].source).toBe("BACKFILL");
      expect(tracked!.events[0].severity).toBe("SLIP");

      // Verifikasi stats
      expect(tracked!.stats).toBeDefined();
      expect(tracked!.stats!.currentStreakDays).toBe(0);
      expect(tracked!.stats!.longestStreakDays).toBe(2);
      expect(tracked!.stats!.confirmedCleanDays).toBe(2);
      expect(tracked!.stats!.totalLapses).toBe(1);

      // Verifikasi kebiasaan GOOD tidak dibuat di TrackedHabit
      const goodTracked = await prisma.trackedHabit.findFirst({
        where: {
          userId: testUserId,
          name: "Olahraga Pagi 15 Menit",
        },
      });
      expect(goodTracked).toBeNull();
      expect(goodHabitId).toBeDefined();
    });
  });
});
