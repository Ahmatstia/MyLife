import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { FakeClock } from "@/lib/habits/clock";
import {
  createTrackedHabitService,
  getTrackedHabitService,
  updateTrackedHabitService,
  getTrackedHabitDashboardService,
} from "@/services/habits/habit-v2.service";
import {
  logHabitEventService,
  deleteHabitEventService,
} from "@/services/habits/event.service";
import {
  respondCheckinService,
} from "@/services/habits/checkin.service";
import { recomputeHabitStats } from "@/services/habits/stats.service";
import { HabitKind, HabitMode } from "@/generated/prisma/client";

describe("Habits v2 Services Integration Tests (PostgreSQL)", () => {
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    const u1 = await prisma.user.create({
      data: {
        email: `svc-test-u1-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
        name: "Service Test User 1",
      },
    });
    const u2 = await prisma.user.create({
      data: {
        email: `svc-test-u2-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
        name: "Service Test User 2",
      },
    });
    user1Id = u1.id;
    user2Id = u2.id;
  });

  afterAll(async () => {
    if (user1Id) await prisma.user.delete({ where: { id: user1Id } }).catch(() => {});
    if (user2Id) await prisma.user.delete({ where: { id: user2Id } }).catch(() => {});
  });

  describe("T-07: createHabit (BREAK/ABSTAIN)", () => {
    it("membuat TrackedHabit, HabitBreakProfile, dan HabitStats awal dalam 1 transaksi", async () => {
      const clock = new FakeClock(new Date("2026-10-10T08:00:00.000Z"));

      const habit = await createTrackedHabitService(
        user1Id,
        {
          name: "Berhenti Merokok",
          kind: HabitKind.BREAK,
          mode: HabitMode.ABSTAIN,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          whyReasons: ["Kesehatan paru-paru", "Hemat uang"],
          startedAt: clock.now(),
        },
        clock,
      );

      expect(habit.id).toBeDefined();
      expect(habit.userId).toBe(user1Id);
      expect(habit.status).toBe("ACTIVE");
      expect(habit.breakProfile).toBeDefined();
      expect(habit.breakProfile?.whyReasons).toEqual(["Kesehatan paru-paru", "Hemat uang"]);
      expect(habit.stats).toBeDefined();
      expect(habit.stats?.currentStreakDays).toBe(0);
      expect(habit.nextCheckinAt).toBeDefined();
    });
  });

  describe("T-08: Validasi tipe kebiasaan (BUILD didukung di Fase 3, REDUCE di Langkah 3.4)", () => {
    it("mendukung mode=REDUCE pada Langkah 3.4 dengan batas harian", async () => {
      const habit = await createTrackedHabitService(user1Id, {
        name: "Kurangi Kopi",
        kind: HabitKind.BREAK,
        mode: HabitMode.REDUCE,
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        whyReasons: ["Asam lambung"],
        reduceDailyLimit: 2,
      });
      expect(habit.mode).toBe(HabitMode.REDUCE);
      expect(habit.breakProfile?.reduceDailyLimit).toBe(2);
    });
  });

  describe("T-09: logEvent (LAPSE) memperbarui check-in dan stats", () => {
    it("mencatat LAPSE, mengubah check-in jendela terkait ke LAPSED, mereset streak", async () => {
      const clock = new FakeClock(new Date("2026-10-10T12:00:00.000Z"));

      const habit = await createTrackedHabitService(
        user1Id,
        {
          name: "Berhenti Judi",
          kind: HabitKind.BREAK,
          mode: HabitMode.ABSTAIN,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          whyReasons: ["Keuangan keluarga"],
          startedAt: new Date("2026-10-09T13:00:00.000Z"),
        },
        clock,
      );

      // Buat check-in jendela terkait
      const checkin = await prisma.habitCheckin.create({
        data: {
          habitId: habit.id,
          windowStart: new Date("2026-10-09T13:00:00.000Z"),
          windowEnd: new Date("2026-10-10T13:00:00.000Z"),
          periodDate: new Date("2026-10-10"),
          status: "PENDING",
        },
      });

      // Catat event LAPSE pada jam 11:00 (di dalam jendela)
      const lapseTime = new Date("2026-10-10T11:00:00.000Z");
      const event = await logHabitEventService(
        user1Id,
        habit.id,
        {
          type: "LAPSE",
          occurredAt: lapseTime,
          severity: "SLIP",
          mood: 2,
        },
        null,
        clock,
      );

      expect(event.id).toBeDefined();

      // Periksa check-in jendela otomatis berubah ke LAPSED
      const updatedCheckin = await prisma.habitCheckin.findUnique({
        where: { id: checkin.id },
      });
      expect(updatedCheckin?.status).toBe("LAPSED");

      // Periksa stats ter-update
      const stats = await prisma.habitStats.findUnique({
        where: { habitId: habit.id },
      });
      expect(stats?.currentStreakDays).toBe(0);
      expect(stats?.totalLapses).toBe(1);
      expect(stats?.lastLapseAt?.getTime()).toBe(lapseTime.getTime());
    });
  });

  describe("T-10: Invarian 4 (Respon CLEAN ditolak bila ada LAPSE di jendela)", () => {
    it("menolak respon CLEAN jika terdapat LAPSE di dalam jendela dengan status 409 CONFLICT", async () => {
      const clock = new FakeClock(new Date("2026-10-10T14:00:00.000Z"));

      const habit = await createTrackedHabitService(
        user1Id,
        {
          name: "Berhenti Soda",
          kind: HabitKind.BREAK,
          mode: HabitMode.ABSTAIN,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          whyReasons: ["Gula darah"],
          startedAt: new Date("2026-10-08T13:00:00.000Z"),
        },
        clock,
      );

      const windowStart = new Date("2026-10-09T13:00:00.000Z");
      const windowEnd = new Date("2026-10-10T13:00:00.000Z");

      const checkin = await prisma.habitCheckin.create({
        data: {
          habitId: habit.id,
          windowStart,
          windowEnd,
          periodDate: new Date("2026-10-10"),
          status: "PENDING",
        },
      });

      // Buat event LAPSE di dalam rentang jendela
      await prisma.habitEvent.create({
        data: {
          habitId: habit.id,
          userId: user1Id,
          type: "LAPSE",
          occurredAt: new Date("2026-10-10T02:00:00.000Z"),
        },
      });

      // Percobaan respon CLEAN wajib ditolak!
      await expect(
        respondCheckinService(
          user1Id,
          habit.id,
          checkin.id,
          { response: "CLEAN" },
          clock,
        ),
      ).rejects.toMatchObject({ code: "CONFLICT", statusCode: 409 });

      // Respon LAPSED diperbolehkan
      const result = await respondCheckinService(
        user1Id,
        habit.id,
        checkin.id,
        { response: "LAPSED" },
        clock,
      );
      expect(result.checkin.status).toBe("LAPSED");
    });
  });

  describe("T-13: Idempotensi header/key", () => {
    it("mengembalikan event yang sama tanpa membuat duplikasi jika idempotencyKey sama", async () => {
      const clock = new FakeClock(new Date("2026-10-10T10:00:00.000Z"));

      const habit = await createTrackedHabitService(
        user1Id,
        {
          name: "Berhenti Ngemil Malam",
          kind: HabitKind.BREAK,
          mode: HabitMode.ABSTAIN,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          whyReasons: ["Berat badan"],
        },
        clock,
      );

      const key = `idemp-test-${Date.now()}`;

      const ev1 = await logHabitEventService(
        user1Id,
        habit.id,
        {
          type: "URGE",
          occurredAt: clock.now(),
          intensityBefore: 7,
          outcome: "RESISTED",
        },
        key,
        clock,
      );

      const ev2 = await logHabitEventService(
        user1Id,
        habit.id,
        {
          type: "URGE",
          occurredAt: clock.now(),
          intensityBefore: 7,
          outcome: "RESISTED",
        },
        key,
        clock,
      );

      expect(ev1.id).toBe(ev2.id);

      const count = await prisma.habitEvent.count({
        where: { habitId: habit.id, idempotencyKey: key },
      });
      expect(count).toBe(1);
    });
  });

  describe("T-18: Perlindungan IDOR (Cross-User Isolation)", () => {
    it("User 2 tidak dapat mengakses atau memanipulasi kebiasaan User 1", async () => {
      const clock = new FakeClock(new Date("2026-10-10T12:00:00.000Z"));

      const habit1 = await createTrackedHabitService(
        user1Id,
        {
          name: "Rahasia User 1",
          kind: HabitKind.BREAK,
          mode: HabitMode.ABSTAIN,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          whyReasons: ["Pribadi"],
        },
        clock,
      );

      // User 2 mencoba membaca
      await expect(getTrackedHabitService(user2Id, habit1.id)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });

      // User 2 mencoba mengubah
      await expect(
        updateTrackedHabitService(user2Id, habit1.id, { name: "Dibajak" }, clock),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      // User 2 mencoba mencatat event
      await expect(
        logHabitEventService(
          user2Id,
          habit1.id,
          { type: "LAPSE" },
          null,
          clock,
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("T-22: Validasi Masukan Zod dan Aturan Waktu §8.6", () => {
    it("menolak waktu di masa depan (> 5 menit), sebelum startedAt, atau > 7 hari lalu", async () => {
      const now = new Date("2026-10-10T12:00:00.000Z");
      const clock = new FakeClock(now);

      const habit = await createTrackedHabitService(
        user1Id,
        {
          name: "Uji Waktu",
          kind: HabitKind.BREAK,
          mode: HabitMode.ABSTAIN,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          whyReasons: ["Disiplin"],
          startedAt: now,
        },
        clock,
      );

      // 1. Masa depan > 5 menit -> tolak
      await expect(
        logHabitEventService(
          user1Id,
          habit.id,
          {
            type: "LAPSE",
            occurredAt: new Date(now.getTime() + 10 * 60 * 1000), // +10 menit
          },
          null,
          clock,
        ),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

      // 2. Sebelum startedAt -> tolak
      await expect(
        logHabitEventService(
          user1Id,
          habit.id,
          {
            type: "LAPSE",
            occurredAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // kemarin
          },
          null,
          clock,
        ),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

      // 3. Lebih dari 7 hari ke belakang -> tolak
      await expect(
        logHabitEventService(
          user1Id,
          habit.id,
          {
            type: "LAPSE",
            occurredAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), // -8 hari
          },
          null,
          clock,
        ),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });

  describe("Konkruensi & Advisory Lock", () => {
    it("dua logEvent paralel secara bersamaan tidak menghasilkan race condition atau error", async () => {
      const clock = new FakeClock(new Date("2026-10-10T10:00:00.000Z"));

      const habit = await createTrackedHabitService(
        user1Id,
        {
          name: "Uji Konkruensi",
          kind: HabitKind.BREAK,
          mode: HabitMode.ABSTAIN,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          whyReasons: ["Fokus"],
          startedAt: new Date("2026-10-09T00:00:00.000Z"),
        },
        clock,
      );

      // Jalankan 2 logging URGE secara paralel
      const [ev1, ev2] = await Promise.all([
        logHabitEventService(
          user1Id,
          habit.id,
          {
            type: "URGE",
            occurredAt: new Date("2026-10-10T08:00:00.000Z"),
            outcome: "RESISTED",
          },
          null,
          clock,
        ),
        logHabitEventService(
          user1Id,
          habit.id,
          {
            type: "URGE",
            occurredAt: new Date("2026-10-10T09:00:00.000Z"),
            outcome: "RESISTED",
          },
          null,
          clock,
        ),
      ]);

      expect(ev1.id).toBeDefined();
      expect(ev2.id).toBeDefined();
      expect(ev1.id).not.toBe(ev2.id);

      const stats = await prisma.habitStats.findUnique({
        where: { habitId: habit.id },
      });
      expect(stats?.urgesResisted).toBe(2);
    });
  });

  describe("Invarian: recompute dari nol = hasil inkremental", () => {
    it("recomputeHabitStats menghasilkan statistik yang identik dengan hasil inkremental", async () => {
      const clock = new FakeClock(new Date("2026-10-10T14:00:00.000Z"));

      const habit = await createTrackedHabitService(
        user1Id,
        {
          name: "Uji Invarian Recompute",
          kind: HabitKind.BREAK,
          mode: HabitMode.ABSTAIN,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          whyReasons: ["Konsistensi"],
          startedAt: new Date("2026-10-08T00:00:00.000Z"),
        },
        clock,
      );

      // Catat beberapa event dan check-in
      await prisma.habitCheckin.createMany({
        data: [
          {
            habitId: habit.id,
            windowStart: new Date("2026-10-08T13:00:00.000Z"),
            windowEnd: new Date("2026-10-09T13:00:00.000Z"),
            periodDate: new Date("2026-10-09"),
            status: "CLEAN",
          },
          {
            habitId: habit.id,
            windowStart: new Date("2026-10-09T13:00:00.000Z"),
            windowEnd: new Date("2026-10-10T13:00:00.000Z"),
            periodDate: new Date("2026-10-10"),
            status: "LAPSED",
          },
        ],
      });

      await prisma.habitEvent.create({
        data: {
          habitId: habit.id,
          userId: user1Id,
          type: "LAPSE",
          occurredAt: new Date("2026-10-10T05:00:00.000Z"),
        },
      });

      // Hitung ulang dari nol
      const recomputed = await recomputeHabitStats(habit.id, prisma, clock);

      expect(recomputed.totalLapses).toBe(1);
      expect(recomputed.currentStreakDays).toBe(0);
      expect(recomputed.longestStreakDays).toBe(1);
      expect(recomputed.confirmedCleanDays).toBe(1);
    });
  });

  describe("Soft Delete Event", () => {
    it("menghapus event dengan soft delete dan otomatis menghitung ulang statistik", async () => {
      const clock = new FakeClock(new Date("2026-10-10T12:00:00.000Z"));

      const habit = await createTrackedHabitService(
        user1Id,
        {
          name: "Uji Soft Delete",
          kind: HabitKind.BREAK,
          mode: HabitMode.ABSTAIN,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          whyReasons: ["Akurasi"],
          startedAt: new Date("2026-10-09T00:00:00.000Z"),
        },
        clock,
      );

      const event = await logHabitEventService(
        user1Id,
        habit.id,
        {
          type: "LAPSE",
          occurredAt: new Date("2026-10-09T10:00:00.000Z"),
        },
        null,
        clock,
      );

      let stats = await prisma.habitStats.findUnique({ where: { habitId: habit.id } });
      expect(stats?.totalLapses).toBe(1);

      // Hapus event
      await deleteHabitEventService(user1Id, habit.id, event.id, clock);

      const deletedEvent = await prisma.habitEvent.findUnique({ where: { id: event.id } });
      expect(deletedEvent?.deletedAt).not.toBeNull();

      // Statistik harus kembali 0 lapse
      stats = await prisma.habitStats.findUnique({ where: { habitId: habit.id } });
      expect(stats?.totalLapses).toBe(0);
    });
  });

  describe("Dashboard Data Aggregation", () => {
    it("getTrackedHabitDashboardService mengembalikan habit, stats, pending checkin, kalender, dan recent events", async () => {
      const clock = new FakeClock(new Date("2026-10-10T12:00:00.000Z"));

      const habit = await createTrackedHabitService(
        user1Id,
        {
          name: "Uji Dashboard",
          kind: HabitKind.BREAK,
          mode: HabitMode.ABSTAIN,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          whyReasons: ["Ringkasan"],
        },
        clock,
      );

      const dashboard = await getTrackedHabitDashboardService(user1Id, habit.id, clock);

      expect(dashboard.habit.id).toBe(habit.id);
      expect(dashboard.stats).toBeDefined();
      expect(Array.isArray(dashboard.pendingCheckins)).toBe(true);
      expect(Array.isArray(dashboard.calendar)).toBe(true);
      expect(Array.isArray(dashboard.recentEvents)).toBe(true);
    });
  });
});
