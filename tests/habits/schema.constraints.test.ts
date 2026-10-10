import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  Prisma,
  HabitKind,
  HabitMode,
  HabitEventType,
  HabitCheckinStatus,
} from "../../src/generated/prisma/client";

describe("Database Schema Constraints & Integrity (Habits v2 Phase 1)", () => {
  let testUserId: string;

  beforeAll(async () => {
    // Buat satu user khusus untuk rangkaian pengujian constraint
    const user = await prisma.user.create({
      data: {
        email: `test-constraints-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
        name: "Test Constraints User",
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Bersihkan user pengujian beserta semua relasi (cascade)
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });

  async function createValidHabit(
    overrides: Partial<Prisma.TrackedHabitUncheckedCreateInput> = {},
  ) {
    return prisma.trackedHabit.create({
      data: {
        userId: testUserId,
        kind: HabitKind.BREAK,
        mode: HabitMode.ABSTAIN,
        name: `Habit ${Date.now()}-${Math.random().toString(36).substring(7)}`,
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        startedAt: new Date("2026-10-10T12:00:00.000Z"),
        currentWindowStart: new Date("2026-10-10T12:00:00.000Z"),
        ...overrides,
      },
    });
  }

  describe("1. TrackedHabit Constraints", () => {
    it("CHECK chk_th_kind_mode: menolak BREAK tanpa mode dan BUILD dengan mode", async () => {
      // BREAK tanpa mode -> wajib ditolak
      await expect(
        createValidHabit({
          kind: HabitKind.BREAK,
          mode: null,
        }),
      ).rejects.toThrow();

      // BUILD dengan mode -> wajib ditolak
      await expect(
        createValidHabit({
          kind: HabitKind.BUILD,
          mode: HabitMode.ABSTAIN,
        }),
      ).rejects.toThrow();

      // Kasus valid: BREAK dengan mode ABSTAIN
      const validBreak = await createValidHabit({
        kind: HabitKind.BREAK,
        mode: HabitMode.ABSTAIN,
      });
      expect(validBreak.id).toBeDefined();

      // Kasus valid: BUILD tanpa mode
      const validBuild = await createValidHabit({
        kind: HabitKind.BUILD,
        mode: null,
      });
      expect(validBuild.id).toBeDefined();
    });

    it("CHECK chk_th_checkin_time: menolak format waktu tidak valid", async () => {
      // Format salah: jam > 23
      await expect(createValidHabit({ checkinLocalTime: "24:00" })).rejects.toThrow();
      // Format salah: menit > 59
      await expect(createValidHabit({ checkinLocalTime: "12:60" })).rejects.toThrow();
      // Format salah: string acak
      await expect(createValidHabit({ checkinLocalTime: "invalid" })).rejects.toThrow();

      // Format valid: 00:00 s.d. 23:59
      const valid = await createValidHabit({ checkinLocalTime: "07:30" });
      expect(valid.checkinLocalTime).toBe("07:30");
    });

    it("CHECK chk_th_privacy: menolak nilai di luar rentang 0..2", async () => {
      await expect(createValidHabit({ privacyLevel: -1 })).rejects.toThrow();
      await expect(createValidHabit({ privacyLevel: 3 })).rejects.toThrow();

      const valid = await createValidHabit({ privacyLevel: 2 });
      expect(valid.privacyLevel).toBe(2);
    });
  });

  describe("2. HabitEvent Constraints", () => {
    it("CHECK chk_he_qty: menolak quantity <= 0", async () => {
      const habit = await createValidHabit();

      // Quantity = 0 -> tolak
      await expect(
        prisma.habitEvent.create({
          data: {
            habitId: habit.id,
            userId: testUserId,
            type: HabitEventType.OCCURRENCE,
            occurredAt: new Date(),
            quantity: 0,
          },
        }),
      ).rejects.toThrow();

      // Quantity = -1 -> tolak
      await expect(
        prisma.habitEvent.create({
          data: {
            habitId: habit.id,
            userId: testUserId,
            type: HabitEventType.OCCURRENCE,
            occurredAt: new Date(),
            quantity: -1,
          },
        }),
      ).rejects.toThrow();
    });

    it("CHECK chk_he_intensity: menolak intensity di luar 0..10", async () => {
      const habit = await createValidHabit();

      await expect(
        prisma.habitEvent.create({
          data: {
            habitId: habit.id,
            userId: testUserId,
            type: HabitEventType.URGE,
            occurredAt: new Date(),
            intensityBefore: 11,
          },
        }),
      ).rejects.toThrow();

      await expect(
        prisma.habitEvent.create({
          data: {
            habitId: habit.id,
            userId: testUserId,
            type: HabitEventType.URGE,
            occurredAt: new Date(),
            intensityAfter: -1,
          },
        }),
      ).rejects.toThrow();
    });

    it("CHECK chk_he_mood: menolak mood di luar 1..5", async () => {
      const habit = await createValidHabit();

      await expect(
        prisma.habitEvent.create({
          data: {
            habitId: habit.id,
            userId: testUserId,
            type: HabitEventType.LAPSE,
            occurredAt: new Date(),
            mood: 0,
          },
        }),
      ).rejects.toThrow();

      await expect(
        prisma.habitEvent.create({
          data: {
            habitId: habit.id,
            userId: testUserId,
            type: HabitEventType.LAPSE,
            occurredAt: new Date(),
            mood: 6,
          },
        }),
      ).rejects.toThrow();

      const valid = await prisma.habitEvent.create({
        data: {
          habitId: habit.id,
          userId: testUserId,
          type: HabitEventType.LAPSE,
          occurredAt: new Date(),
          mood: 4,
        },
      });
      expect(valid.mood).toBe(4);
    });

    it("CHECK chk_he_outcome & chk_he_severity: menolak nilai tidak dikenal", async () => {
      const habit = await createValidHabit();

      await expect(
        prisma.habitEvent.create({
          data: {
            habitId: habit.id,
            userId: testUserId,
            type: HabitEventType.URGE,
            occurredAt: new Date(),
            outcome: "INVALID_OUTCOME",
          },
        }),
      ).rejects.toThrow();

      await expect(
        prisma.habitEvent.create({
          data: {
            habitId: habit.id,
            userId: testUserId,
            type: HabitEventType.LAPSE,
            occurredAt: new Date(),
            severity: "INVALID_SEVERITY",
          },
        }),
      ).rejects.toThrow();
    });

    it("UNIQUE (userId, idempotencyKey): tolak duplikat non-null tapi izinkan banyak NULL", async () => {
      const habit = await createValidHabit();
      const key = `idemp-${Date.now()}`;

      // Insert pertama dengan idempotencyKey
      await prisma.habitEvent.create({
        data: {
          habitId: habit.id,
          userId: testUserId,
          type: HabitEventType.LAPSE,
          occurredAt: new Date(),
          idempotencyKey: key,
        },
      });

      // Insert kedua dengan key sama -> wajib ditolak
      await expect(
        prisma.habitEvent.create({
          data: {
            habitId: habit.id,
            userId: testUserId,
            type: HabitEventType.LAPSE,
            occurredAt: new Date(),
            idempotencyKey: key,
          },
        }),
      ).rejects.toThrow();

      // Banyak event dengan idempotencyKey = null -> wajib berhasil
      const ev1 = await prisma.habitEvent.create({
        data: {
          habitId: habit.id,
          userId: testUserId,
          type: HabitEventType.LAPSE,
          occurredAt: new Date(),
          idempotencyKey: null,
        },
      });
      const ev2 = await prisma.habitEvent.create({
        data: {
          habitId: habit.id,
          userId: testUserId,
          type: HabitEventType.LAPSE,
          occurredAt: new Date(),
          idempotencyKey: null,
        },
      });
      expect(ev1.id).toBeDefined();
      expect(ev2.id).toBeDefined();
    });
  });

  describe("3. HabitCheckin Constraints", () => {
    it("CHECK chk_hc_window: menolak windowEnd <= windowStart", async () => {
      const habit = await createValidHabit();
      const start = new Date("2026-10-10T12:00:00.000Z");

      // windowEnd sama dengan windowStart -> tolak
      await expect(
        prisma.habitCheckin.create({
          data: {
            habitId: habit.id,
            windowStart: start,
            windowEnd: start,
            periodDate: new Date("2026-10-10"),
          },
        }),
      ).rejects.toThrow();

      // windowEnd lebih awal dari windowStart -> tolak
      await expect(
        prisma.habitCheckin.create({
          data: {
            habitId: habit.id,
            windowStart: start,
            windowEnd: new Date("2026-10-10T11:00:00.000Z"),
            periodDate: new Date("2026-10-10"),
          },
        }),
      ).rejects.toThrow();
    });

    it("UNIQUE (habitId, periodDate): menolak duplikat checkin untuk habit dan periodDate sama", async () => {
      const habit = await createValidHabit();
      const period = new Date("2026-10-10");

      await prisma.habitCheckin.create({
        data: {
          habitId: habit.id,
          windowStart: new Date("2026-10-09T13:00:00.000Z"),
          windowEnd: new Date("2026-10-10T13:00:00.000Z"),
          periodDate: period,
          status: HabitCheckinStatus.PENDING,
        },
      });

      // Duplikat -> tolak
      await expect(
        prisma.habitCheckin.create({
          data: {
            habitId: habit.id,
            windowStart: new Date("2026-10-09T13:00:00.000Z"),
            windowEnd: new Date("2026-10-10T13:00:00.000Z"),
            periodDate: period,
            status: HabitCheckinStatus.PENDING,
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe("4. Cascade Deletion", () => {
    it("Hapus User menghapus kebiasaan beserta profil, event, check-in, stats, dan outbox", async () => {
      // Buat user terisolasi untuk tes cascade
      const cascadeUser = await prisma.user.create({
        data: {
          email: `cascade-test-${Date.now()}@example.com`,
          name: "Cascade User",
        },
      });

      const habit = await prisma.trackedHabit.create({
        data: {
          userId: cascadeUser.id,
          kind: HabitKind.BREAK,
          mode: HabitMode.ABSTAIN,
          name: "Cascade Habit",
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          startedAt: new Date(),
          currentWindowStart: new Date(),
        },
      });

      await prisma.habitBreakProfile.create({
        data: {
          habitId: habit.id,
          highRiskCategory: true,
        },
      });

      const event = await prisma.habitEvent.create({
        data: {
          habitId: habit.id,
          userId: cascadeUser.id,
          type: HabitEventType.OCCURRENCE,
          occurredAt: new Date(),
        },
      });

      const checkin = await prisma.habitCheckin.create({
        data: {
          habitId: habit.id,
          windowStart: new Date("2026-10-09T00:00:00.000Z"),
          windowEnd: new Date("2026-10-10T00:00:00.000Z"),
          periodDate: new Date("2026-10-10"),
        },
      });

      await prisma.habitStats.create({
        data: {
          habitId: habit.id,
          currentStreakDays: 5,
        },
      });

      const outbox = await prisma.habitNotificationOutbox.create({
        data: {
          userId: cascadeUser.id,
          habitId: habit.id,
          kind: "CHECKIN_REMINDER",
          payload: { text: "Halo" },
          scheduledAt: new Date(),
          dedupeKey: `outbox-dedupe-${Date.now()}`,
        },
      });

      // Hapus User
      await prisma.user.delete({ where: { id: cascadeUser.id } });

      // Verifikasi seluruh entitas anak terhapus
      expect(await prisma.trackedHabit.findUnique({ where: { id: habit.id } })).toBeNull();
      expect(await prisma.habitBreakProfile.findUnique({ where: { habitId: habit.id } })).toBeNull();
      expect(await prisma.habitEvent.findUnique({ where: { id: event.id } })).toBeNull();
      expect(await prisma.habitCheckin.findUnique({ where: { id: checkin.id } })).toBeNull();
      expect(await prisma.habitStats.findUnique({ where: { habitId: habit.id } })).toBeNull();
      expect(await prisma.habitNotificationOutbox.findUnique({ where: { id: outbox.id } })).toBeNull();
    });
  });

  describe("5. Smoke Test Tabel Lama", () => {
    it("Tabel-tabel lama tetap utuh dan dapat diakses", async () => {
      const habits = await prisma.habit.findMany({ take: 1 });
      const habitLogs = await prisma.habitLog.findMany({ take: 1 });
      const habitStreaks = await prisma.habitStreak.findMany({ take: 1 });
      const habitTasks = await prisma.habitTask.findMany({ take: 1 });

      expect(Array.isArray(habits)).toBe(true);
      expect(Array.isArray(habitLogs)).toBe(true);
      expect(Array.isArray(habitStreaks)).toBe(true);
      expect(Array.isArray(habitTasks)).toBe(true);
    });
  });
});
