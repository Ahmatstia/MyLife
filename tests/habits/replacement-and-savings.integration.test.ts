import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createTrackedHabitService,
  createCopingPlanService,
  getCopingPlansService,
  updateCopingPlanService,
  recomputeHabitStats,
} from "@/services/habits";
import { findTrackedHabitById } from "@/repositories/habits/tracked-habit.repository";
import { FakeClock } from "@/lib/habits/clock";

describe("Langkah 3.5 & 3.6: Replacement Habits & Savings Estimates", () => {
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    // Bersihkan data uji sebelumnya
    await prisma.habitEvent.deleteMany({
      where: { habit: { user: { email: { in: ["userA-repl@test.com", "userB-repl@test.com"] } } } },
    });
    await prisma.copingPlan.deleteMany({
      where: { habit: { user: { email: { in: ["userA-repl@test.com", "userB-repl@test.com"] } } } },
    });
    await prisma.habitBuildProfile.deleteMany({
      where: { habit: { user: { email: { in: ["userA-repl@test.com", "userB-repl@test.com"] } } } },
    });
    await prisma.habitBreakProfile.deleteMany({
      where: { habit: { user: { email: { in: ["userA-repl@test.com", "userB-repl@test.com"] } } } },
    });
    await prisma.trackedHabit.deleteMany({
      where: { user: { email: { in: ["userA-repl@test.com", "userB-repl@test.com"] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ["userA-repl@test.com", "userB-repl@test.com"] } },
    });

    const uA = await prisma.user.create({
      data: {
        email: "userA-repl@test.com",
        name: "User A Replacement",
        passwordHash: "hashA",
      },
    });
    userAId = uA.id;

    const uB = await prisma.user.create({
      data: {
        email: "userB-repl@test.com",
        name: "User B Replacement",
        passwordHash: "hashB",
      },
    });
    userBId = uB.id;
  });

  afterAll(async () => {
    await prisma.habitEvent.deleteMany({
      where: { habit: { user: { email: { in: ["userA-repl@test.com", "userB-repl@test.com"] } } } },
    });
    await prisma.copingPlan.deleteMany({
      where: { habit: { user: { email: { in: ["userA-repl@test.com", "userB-repl@test.com"] } } } },
    });
    await prisma.habitBuildProfile.deleteMany({
      where: { habit: { user: { email: { in: ["userA-repl@test.com", "userB-repl@test.com"] } } } },
    });
    await prisma.habitBreakProfile.deleteMany({
      where: { habit: { user: { email: { in: ["userA-repl@test.com", "userB-repl@test.com"] } } } },
    });
    await prisma.trackedHabit.deleteMany({
      where: { user: { email: { in: ["userA-repl@test.com", "userB-repl@test.com"] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ["userA-repl@test.com", "userB-repl@test.com"] } },
    });
  });

  describe("Langkah 3.5: Replacement Habits (replacesHabitId & CopingPlan)", () => {
    it("menghubungkan Build habit ke Break habit via replacesHabitId", async () => {
      // 1. Buat Break habit untuk User A
      const breakHabit = await createTrackedHabitService(userAId, {
        name: "Merokok",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        whyReasons: ["Lebih hemat", "Lebih sehat"],
        baselinePerDay: 10,
        costPerOccurrence: 2500,
        minutesPerOccurrence: 5,
      });

      // 2. Buat Build habit dengan replacesHabitId
      const buildHabit = await createTrackedHabitService(userAId, {
        name: "Minum Air Hangat & Permen Karet",
        kind: "BUILD",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        tinyBehavior: "Minum segelas air putih hangat",
        replacesHabitId: breakHabit.id,
      });

      expect(buildHabit.buildProfile?.replacesHabitId).toBe(breakHabit.id);

      // 3. Verifikasi findTrackedHabitById menyertakan replacedByProfiles
      const fetchedBreak = await findTrackedHabitById(breakHabit.id, userAId);
      expect(fetchedBreak).not.toBeNull();
      expect(fetchedBreak?.replacedByProfiles).toBeDefined();
      expect(fetchedBreak?.replacedByProfiles?.length).toBe(1);
      expect(fetchedBreak?.replacedByProfiles?.[0].habit.id).toBe(buildHabit.id);
      expect(fetchedBreak?.replacedByProfiles?.[0].habit.name).toBe("Minum Air Hangat & Permen Karet");
    });

    it("menolak replacesHabitId milik user lain", async () => {
      // Break habit User B
      const breakB = await createTrackedHabitService(userBId, {
        name: "Begadang B",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        whyReasons: ["Kesehatan"],
      });

      // User A mencoba merujuk breakB
      await expect(
        createTrackedHabitService(userAId, {
          name: "Tidur A",
          kind: "BUILD",
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          tinyBehavior: "Matikan lampu jam 10",
          replacesHabitId: breakB.id,
        }),
      ).rejects.toThrow("Kebiasaan yang digantikan tidak ditemukan atau bukan kebiasaan Break.");
    });

    it("memvalidasi dan mengembalikan replacementHabit pada CopingPlan", async () => {
      const breakHabit = await createTrackedHabitService(userAId, {
        name: "Ngemil Larut Malam",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        whyReasons: ["Berat badan ideal"],
      });

      const buildHabit = await createTrackedHabitService(userAId, {
        name: "Minum Teh Chamomile",
        kind: "BUILD",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        tinyBehavior: "Seduh 1 cangkir teh hangat",
      });

      // Buat coping plan dengan replacementHabitId
      const plan = await createCopingPlanService(userAId, breakHabit.id, {
        ifCondition: "Merasa ingin ngemil setelah jam 9 malam",
        thenAction: "Seduh teh chamomile hangat",
        replacementHabitId: buildHabit.id,
      });

      expect(plan.replacementHabitId).toBe(buildHabit.id);

      // Ambil list coping plans
      const list = await getCopingPlansService(userAId, breakHabit.id);
      expect(list.length).toBe(1);
      expect(list[0].replacementHabit).toBeDefined();
      expect(list[0].replacementHabit?.id).toBe(buildHabit.id);
      expect(list[0].replacementHabit?.name).toBe("Minum Teh Chamomile");

      // Menolak update dengan replacementHabitId tidak valid
      await expect(
        updateCopingPlanService(userAId, breakHabit.id, plan.id, {
          replacementHabitId: "cl00000000000000000000000",
        }),
      ).rejects.toThrow("Kebiasaan pengganti tidak valid atau tidak ditemukan.");
    });
  });

  describe("Langkah 3.6: Money & Time Savings Estimates", () => {
    it("menghitung estimasi uang dan waktu dihemat pada mode ABSTAIN", async () => {
      const clock = new FakeClock("2026-05-01T12:00:00Z");

      const habit = await createTrackedHabitService(
        userAId,
        {
          name: "Jajan Kopi Kekinian",
          kind: "BREAK",
          mode: "ABSTAIN",
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          whyReasons: ["Hemat uang"],
          baselinePerDay: 2,
          costPerOccurrence: 30000,
          minutesPerOccurrence: 20,
        },
        clock,
      );

      // Buat 5 checkin dengan status CLEAN
      await prisma.habitCheckin.createMany({
        data: [
          {
            habitId: habit.id,
            periodDate: new Date("2026-04-26T00:00:00Z"),
            status: "CLEAN",
            windowStart: new Date("2026-04-26T00:00:00Z"),
            windowEnd: new Date("2026-04-26T23:59:59Z"),
          },
          {
            habitId: habit.id,
            periodDate: new Date("2026-04-27T00:00:00Z"),
            status: "CLEAN",
            windowStart: new Date("2026-04-27T00:00:00Z"),
            windowEnd: new Date("2026-04-27T23:59:59Z"),
          },
          {
            habitId: habit.id,
            periodDate: new Date("2026-04-28T00:00:00Z"),
            status: "CLEAN",
            windowStart: new Date("2026-04-28T00:00:00Z"),
            windowEnd: new Date("2026-04-28T23:59:59Z"),
          },
          {
            habitId: habit.id,
            periodDate: new Date("2026-04-29T00:00:00Z"),
            status: "CLEAN",
            windowStart: new Date("2026-04-29T00:00:00Z"),
            windowEnd: new Date("2026-04-29T23:59:59Z"),
          },
          {
            habitId: habit.id,
            periodDate: new Date("2026-04-30T00:00:00Z"),
            status: "CLEAN",
            windowStart: new Date("2026-04-30T00:00:00Z"),
            windowEnd: new Date("2026-04-30T23:59:59Z"),
          },
        ],
      });

      // Hitung ulang stats
      const stats = await recomputeHabitStats(habit.id, prisma, clock);

      // 5 hari bersih * 2/hari * Rp 30.000 = Rp 300.000
      expect(stats.moneySavedEst).not.toBeNull();
      expect(Number(stats.moneySavedEst)).toBe(300000);

      // 5 hari bersih * 2/hari * 20 menit = 200 menit
      expect(stats.minutesSavedEst).toBe(200);
    });

    it("menghitung estimasi hemat pada mode REDUCE berdasarkan saved occurrences", async () => {
      const clock = new FakeClock("2026-05-01T12:00:00Z");

      const habit = await createTrackedHabitService(
        userAId,
        {
          name: "Vape / Rokok Elektrik",
          kind: "BREAK",
          mode: "REDUCE",
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          whyReasons: ["Kesehatan"],
          baselinePerDay: 10,
          reduceDailyLimit: 6,
          costPerOccurrence: 1000,
          minutesPerOccurrence: 5,
        },
        clock,
      );

      // Buat 4 checkin clean / within limit
      await prisma.habitCheckin.createMany({
        data: [
          {
            habitId: habit.id,
            periodDate: new Date("2026-04-26T00:00:00Z"),
            status: "WITHIN_LIMIT",
            windowStart: new Date("2026-04-26T00:00:00Z"),
            windowEnd: new Date("2026-04-26T23:59:59Z"),
          },
          {
            habitId: habit.id,
            periodDate: new Date("2026-04-27T00:00:00Z"),
            status: "WITHIN_LIMIT",
            windowStart: new Date("2026-04-27T00:00:00Z"),
            windowEnd: new Date("2026-04-27T23:59:59Z"),
          },
          {
            habitId: habit.id,
            periodDate: new Date("2026-04-28T00:00:00Z"),
            status: "WITHIN_LIMIT",
            windowStart: new Date("2026-04-28T00:00:00Z"),
            windowEnd: new Date("2026-04-28T23:59:59Z"),
          },
          {
            habitId: habit.id,
            periodDate: new Date("2026-04-29T00:00:00Z"),
            status: "WITHIN_LIMIT",
            windowStart: new Date("2026-04-29T00:00:00Z"),
            windowEnd: new Date("2026-04-29T23:59:59Z"),
          },
        ],
      });

      // Total kejadian aktual dicatat selama 4 hari tersebut: 16 kejadian (rata-rata 4/hari, di bawah baseline 10/hari)
      await prisma.habitEvent.createMany({
        data: [
          {
            habitId: habit.id,
            userId: userAId,
            type: "OCCURRENCE",
            occurredAt: new Date("2026-04-26T10:00:00Z"),
            quantity: 4,
          },
          {
            habitId: habit.id,
            userId: userAId,
            type: "OCCURRENCE",
            occurredAt: new Date("2026-04-27T10:00:00Z"),
            quantity: 4,
          },
          {
            habitId: habit.id,
            userId: userAId,
            type: "OCCURRENCE",
            occurredAt: new Date("2026-04-28T10:00:00Z"),
            quantity: 4,
          },
          {
            habitId: habit.id,
            userId: userAId,
            type: "OCCURRENCE",
            occurredAt: new Date("2026-04-29T10:00:00Z"),
            quantity: 4,
          },
        ],
      });

      const stats = await recomputeHabitStats(habit.id, prisma, clock);

      // Baseline: 4 hari * 10 = 40 kejadian.
      // Aktual: 16 kejadian.
      // Saved occurrences = 40 - 16 = 24 kejadian dihemat.
      // moneySavedEst = 24 * Rp 1.000 = Rp 24.000.
      expect(Number(stats.moneySavedEst)).toBe(24000);

      // minutesSavedEst = 24 * 5 menit = 120 menit.
      expect(stats.minutesSavedEst).toBe(120);
    });

    it("mengembalikan null jika baselinePerDay tidak diisi", async () => {
      const clock = new FakeClock("2026-05-01T12:00:00Z");

      const habit = await createTrackedHabitService(
        userAId,
        {
          name: "Habit Tanpa Baseline",
          kind: "BREAK",
          mode: "ABSTAIN",
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          whyReasons: ["Menghilangkan kebiasaan"],
          // baselinePerDay tidak diset
          costPerOccurrence: 20000,
        },
        clock,
      );

      await prisma.habitStats.update({
        where: { habitId: habit.id },
        data: { confirmedCleanDays: 7 },
      });

      const stats = await recomputeHabitStats(habit.id, prisma, clock);
      expect(stats.moneySavedEst).toBeNull();
      expect(stats.minutesSavedEst).toBeNull();
    });
  });
});
