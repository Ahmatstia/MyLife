import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { FakeClock } from "@/lib/habits/clock";
import { HabitKind, HabitMode } from "@/generated/prisma/client";
import {
  createTrackedHabitService,
  switchHabitModeService,
} from "@/services/habits/habit-v2.service";
import { logHabitEventService } from "@/services/habits/event.service";
import { respondCheckinService } from "@/services/habits/checkin.service";

describe("Habits v2 - Reduce Mode Integration Tests (PostgreSQL)", () => {
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `reduce-test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
        name: "Reduce Test User",
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  });

  describe("Pembuatan Habit BREAK dengan Mode REDUCE (T-14 & §8.4)", () => {
    it("berhasil membuat habit mode REDUCE dengan parameter kuota harian", async () => {
      const clock = new FakeClock(new Date("2026-10-10T08:00:00.000Z"));

      const habit = await createTrackedHabitService(
        userId,
        {
          name: "Mengurangi Kopi",
          kind: HabitKind.BREAK,
          mode: HabitMode.REDUCE,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "21:00",
          whyReasons: ["Ingin tidur lebih nyenyak"],
          reduceDailyLimit: 3,
          reduceStepPercent: 20,
          reduceStepEveryDays: 7,
          baselinePerDay: 5,
        },
        clock,
      );

      expect(habit.id).toBeDefined();
      expect(habit.kind).toBe("BREAK");
      expect(habit.mode).toBe("REDUCE");

      const saved = await prisma.trackedHabit.findUnique({
        where: { id: habit.id },
        include: { breakProfile: true, stats: true },
      });

      expect(saved?.breakProfile?.reduceDailyLimit).toBe(3);
      expect(saved?.breakProfile?.reduceStepPercent).toBe(20);
      expect(saved?.breakProfile?.reduceStepEveryDays).toBe(7);
      expect(saved?.stats?.currentStreakDays).toBe(0);
    });
  });

  describe("Logging OCCURRENCE & Evaluasi Batas Kuota Otomatis", () => {
    it("mencatat kejadian dan otomatis mengubah status menjadi OVER_LIMIT saat kuota terlampaui", async () => {
      const clock = new FakeClock(new Date("2026-10-10T10:00:00.000Z"));

      const habit = await createTrackedHabitService(
        userId,
        {
          name: "Vaping",
          kind: HabitKind.BREAK,
          mode: HabitMode.REDUCE,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "22:00",
          whyReasons: ["Kesehatan paru-paru"],
          reduceDailyLimit: 2,
        },
        clock,
      );

      // Buat pending checkin untuk hari ini
      const checkin = await prisma.habitCheckin.create({
        data: {
          habitId: habit.id,
          periodDate: new Date("2026-10-10T00:00:00.000Z"),
          windowStart: new Date("2026-10-10T00:00:00.000Z"),
          windowEnd: new Date("2026-10-10T23:59:59.000Z"),
          status: "PENDING",
        },
      });

      // Event 1: OCCURRENCE quantity 1 (Total = 1 <= 2)
      clock.advance(3600 * 1000);
      const ev1 = await logHabitEventService(
        userId,
        habit.id,
        {
          type: "OCCURRENCE",
          occurredAt: clock.now(),
          quantity: 1,
        },
        clock,
      );
      expect(ev1.type).toBe("OCCURRENCE");

      const checkinAfter1 = await prisma.habitCheckin.findUnique({
        where: { id: checkin.id },
      });
      // Masih PENDING karena <= limit
      expect(checkinAfter1?.status).toBe("PENDING");

      // Event 2: OCCURRENCE quantity 2 (Total = 3 > limit 2)
      clock.advance(3600 * 1000);
      await logHabitEventService(
        userId,
        habit.id,
        {
          type: "OCCURRENCE",
          occurredAt: clock.now(),
          quantity: 2,
        },
        clock,
      );

      const checkinAfter2 = await prisma.habitCheckin.findUnique({
        where: { id: checkin.id },
      });
      // T-14: Langsung otomatis OVER_LIMIT (bukan LAPSE)
      expect(checkinAfter2?.status).toBe("OVER_LIMIT");
    });
  });

  describe("Konfirmasi Checkin Manual Mode Reduce", () => {
    it("menyetujui WITHIN_LIMIT bila total kejadian <= batas harian", async () => {
      const clock = new FakeClock(new Date("2026-10-11T10:00:00.000Z"));

      const habit = await createTrackedHabitService(
        userId,
        {
          name: "Snacking",
          kind: HabitKind.BREAK,
          mode: HabitMode.REDUCE,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "22:00",
          whyReasons: ["Menurunkan berat badan"],
          reduceDailyLimit: 3,
        },
        clock,
      );

      const checkin = await prisma.habitCheckin.create({
        data: {
          habitId: habit.id,
          periodDate: new Date("2026-10-11T00:00:00.000Z"),
          windowStart: new Date("2026-10-11T00:00:00.000Z"),
          windowEnd: new Date("2026-10-11T23:59:59.000Z"),
          status: "PENDING",
        },
      });

      // Log 2 kejadian (<= 3) setelah habit dimulai
      clock.advance(3600 * 1000);
      await logHabitEventService(
        userId,
        habit.id,
        {
          type: "OCCURRENCE",
          occurredAt: clock.now(),
          quantity: 2,
        },
        clock,
      );

      // Majukan waktu melewati windowEnd agar jendela evaluasi selesai
      clock.advance(24 * 3600 * 1000);

      // Respon WITHIN_LIMIT
      const responded = await respondCheckinService(
        userId,
        habit.id,
        checkin.id,
        { answer: "WITHIN_LIMIT" },
        clock,
      );

      expect(responded.checkin.status).toBe("WITHIN_LIMIT");

      const stats = await prisma.habitStats.findUnique({
        where: { habitId: habit.id },
      });
      expect(stats?.currentStreakDays).toBe(1);
    });

    it("menolak WITHIN_LIMIT dan melempar konflik jika total kejadian > batas", async () => {
      const clock = new FakeClock(new Date("2026-10-12T10:00:00.000Z"));

      const habit = await createTrackedHabitService(
        userId,
        {
          name: "Soda",
          kind: HabitKind.BREAK,
          mode: HabitMode.REDUCE,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "22:00",
          whyReasons: ["Menghindari gula tinggi"],
          reduceDailyLimit: 1,
        },
        clock,
      );

      const checkin = await prisma.habitCheckin.create({
        data: {
          habitId: habit.id,
          periodDate: new Date("2026-10-12T00:00:00.000Z"),
          windowStart: new Date("2026-10-12T00:00:00.000Z"),
          windowEnd: new Date("2026-10-12T23:59:59.000Z"),
          status: "PENDING",
        },
      });

      // Log 2 kejadian (> 1)
      clock.advance(3600 * 1000);
      await logHabitEventService(
        userId,
        habit.id,
        {
          type: "OCCURRENCE",
          occurredAt: clock.now(),
          quantity: 2,
        },
        clock,
      );

      // Majukan waktu melewati windowEnd agar jendela evaluasi selesai
      clock.advance(24 * 3600 * 1000);

      await expect(
        respondCheckinService(
          userId,
          habit.id,
          checkin.id,
          { answer: "WITHIN_LIMIT" },
          clock,
        ),
      ).rejects.toThrow(/Total kejadian .* melebihi kuota/);

      // Responding with OVER_LIMIT should succeed
      const respondedOver = await respondCheckinService(
        userId,
        habit.id,
        checkin.id,
        { answer: "OVER_LIMIT" },
        clock,
      );
      expect(respondedOver.checkin.status).toBe("OVER_LIMIT");
    });
  });

  describe("Alur Beralih Mode (Abstain ↔ Reduce)", () => {
    it("berhasil beralih dari ABSTAIN ke REDUCE dengan kuota baru", async () => {
      const clock = new FakeClock(new Date("2026-10-13T10:00:00.000Z"));

      const habit = await createTrackedHabitService(
        userId,
        {
          name: "Rokok",
          kind: HabitKind.BREAK,
          mode: HabitMode.ABSTAIN,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "22:00",
          whyReasons: ["Kesehatan jantung"],
        },
        clock,
      );
      expect(habit.mode).toBe("ABSTAIN");

      const switched = await switchHabitModeService(
        userId,
        habit.id,
        {
          targetMode: HabitMode.REDUCE,
          reduceDailyLimit: 4,
          reduceStepPercent: 10,
          reduceStepEveryDays: 7,
        },
        clock,
      );

      expect(switched).toBeDefined();
      expect(switched!.mode).toBe("REDUCE");
      expect(switched!.breakProfile?.reduceDailyLimit).toBe(4);
      expect(switched!.breakProfile?.reduceStepPercent).toBe(10);
    });

    it("berhasil beralih dari REDUCE kembali ke ABSTAIN", async () => {
      const clock = new FakeClock(new Date("2026-10-14T10:00:00.000Z"));

      const habit = await createTrackedHabitService(
        userId,
        {
          name: "Judi Online",
          kind: HabitKind.BREAK,
          mode: HabitMode.REDUCE,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "22:00",
          whyReasons: ["Finansial stabil"],
          reduceDailyLimit: 2,
        },
        clock,
      );
      expect(habit.mode).toBe("REDUCE");

      const switched = await switchHabitModeService(
        userId,
        habit.id,
        {
          targetMode: HabitMode.ABSTAIN,
        },
        clock,
      );

      expect(switched).toBeDefined();
      expect(switched!.mode).toBe("ABSTAIN");
      expect(switched!.breakProfile?.reduceDailyLimit).toBeNull();
    });
  });
});
