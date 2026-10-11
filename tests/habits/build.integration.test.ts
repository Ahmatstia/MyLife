import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { FakeClock } from "@/lib/habits/clock";
import { HabitKind, HabitScheduleType } from "@/generated/prisma/client";
import {
  createTrackedHabitService,
  getTrackedHabitDashboardService,
} from "@/services/habits/habit-v2.service";
import { logHabitEventService } from "@/services/habits/event.service";
import {
  submitAutomaticitySurveyService,
  getAutomaticitySurveysService,
} from "@/services/habits/automaticity-survey.service";
import { AUTOMATICITY_EDUCATION_TEXT } from "@/schemas/habits/automaticity-survey.schema";

describe("Habits v2 - Build Habits & Automaticity Survey Integration Tests (PostgreSQL)", () => {
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    const u1 = await prisma.user.create({
      data: {
        email: `build-test-u1-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
        name: "Build Test User 1",
      },
    });
    const u2 = await prisma.user.create({
      data: {
        email: `build-test-u2-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
        name: "Build Test User 2",
      },
    });
    user1Id = u1.id;
    user2Id = u2.id;
  });

  afterAll(async () => {
    if (user1Id) await prisma.user.delete({ where: { id: user1Id } }).catch(() => {});
    if (user2Id) await prisma.user.delete({ where: { id: user2Id } }).catch(() => {});
  });

  describe("T-14 & F-B9: Pembuatan Habit BUILD (Metode ABC & Jadwal)", () => {
    it("berhasil membuat habit BUILD dengan profile ABC, jadwal, dan stats awal", async () => {
      const clock = new FakeClock(new Date("2026-10-10T08:00:00.000Z"));

      const habit = await createTrackedHabitService(
        user1Id,
        {
          name: "Membaca Buku",
          kind: HabitKind.BUILD,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          identityStatement: "Saya adalah pembelajar sepanjang hayat",
          tinyBehavior: "Baca 1 halaman buku",
          anchorText: "Setelah menyeduh teh hangat malam",
          celebrationText: "Tersenyum dan berkata 'Yes!'",
          scheduleType: HabitScheduleType.DAYS_OF_WEEK,
          daysOfWeek: [1, 2, 3, 4, 5],
          restDays: [6, 7],
          versions: {
            tiny: "1 halaman",
            standard: "1 bab",
            stretch: "3 bab",
          },
        },
        clock,
      );

      expect(habit.id).toBeDefined();
      expect(habit.kind).toBe("BUILD");
      expect(habit.mode).toBeNull();
      expect(habit.buildProfile).toBeDefined();
      expect(habit.buildProfile?.tinyBehavior).toBe("Baca 1 halaman buku");
      expect(habit.buildProfile?.anchorText).toBe("Setelah menyeduh teh hangat malam");
      expect(habit.buildProfile?.celebrationText).toBe("Tersenyum dan berkata 'Yes!'");
      expect(habit.buildProfile?.scheduleType).toBe("DAYS_OF_WEEK");
      expect(habit.buildProfile?.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
      expect(habit.buildProfile?.restDays).toEqual([6, 7]);
      expect(habit.buildProfile?.versions).toEqual({
        tiny: "1 halaman",
        standard: "1 bab",
        stretch: "3 bab",
      });

      // Stats awal
      expect(habit.stats).toBeDefined();
      expect(habit.stats?.currentStreakDays).toBe(0);
      expect(habit.stats?.resilientStreak).toBe(0);
      expect(habit.stats?.consistency30d).toBeNull();
    });

    it("menolak pembuatan habit BUILD jika tinyBehavior kosong", async () => {
      const clock = new FakeClock(new Date("2026-10-10T08:00:00.000Z"));

      await expect(
        createTrackedHabitService(
          user1Id,
          {
            name: "Meditasi",
            kind: HabitKind.BUILD,
            timezone: "Asia/Jakarta",
            checkinLocalTime: "20:00",
            tinyBehavior: "",
          },
          clock,
        ),
      ).rejects.toThrow();
    });
  });

  describe("T-15: Event COMPLETION & SKIP untuk Habit BUILD", () => {
    it("mencatat COMPLETION event dan mengubah pending checkin menjadi DONE", async () => {
      const clock = new FakeClock(new Date("2026-10-10T08:00:00.000Z"));

      const habit = await createTrackedHabitService(
        user1Id,
        {
          name: "Push-up Pagi",
          kind: HabitKind.BUILD,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          tinyBehavior: "2 push-up",
          scheduleType: HabitScheduleType.DAILY,
        },
        clock,
      );

      // Simulasikan ada pending checkin untuk hari ini
      const periodDate = new Date("2026-10-10T00:00:00.000Z");
      await prisma.habitCheckin.create({
        data: {
          habitId: habit.id,
          periodDate,
          windowStart: new Date("2026-10-09T13:00:00.000Z"),
          windowEnd: new Date("2026-10-10T13:00:00.000Z"),
          status: "PENDING",
        },
      });

      // Catat event COMPLETION
      const event = await logHabitEventService(
        user1Id,
        habit.id,
        {
          type: "COMPLETION",
          occurredAt: clock.now(),
          note: "Berhasil menyelesaikan versi mini!",
        },
        null,
        clock,
      );

      expect(event.type).toBe("COMPLETION");

      // Verifikasi checkin di-update menjadi DONE
      const updatedCheckin = await prisma.habitCheckin.findFirst({
        where: { habitId: habit.id, periodDate },
      });
      expect(updatedCheckin?.status).toBe("DONE");
    });

    it("mencatat SKIP event dan mengubah pending checkin menjadi SKIPPED", async () => {
      const clock = new FakeClock(new Date("2026-10-10T08:00:00.000Z"));

      const habit = await createTrackedHabitService(
        user1Id,
        {
          name: "Lari Pagi",
          kind: HabitKind.BUILD,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          tinyBehavior: "Pakai sepatu lari & jalan 100m",
          scheduleType: HabitScheduleType.DAILY,
        },
        clock,
      );

      const periodDate = new Date("2026-10-10T00:00:00.000Z");
      await prisma.habitCheckin.create({
        data: {
          habitId: habit.id,
          periodDate,
          windowStart: new Date("2026-10-09T13:00:00.000Z"),
          windowEnd: new Date("2026-10-10T13:00:00.000Z"),
          status: "PENDING",
        },
      });

      // Catat event SKIP
      const event = await logHabitEventService(
        user1Id,
        habit.id,
        {
          type: "SKIP",
          occurredAt: clock.now(),
          note: "Rest day terjadwal",
        },
        null,
        clock,
      );

      expect(event.type).toBe("SKIP");

      const updatedCheckin = await prisma.habitCheckin.findFirst({
        where: { habitId: habit.id, periodDate },
      });
      expect(updatedCheckin?.status).toBe("SKIPPED");
    });
  });

  describe("T-16 & §12.6: Automaticity Survey (SRHI & Anti-Mitos 21 Hari)", () => {
    it("menyimpan survei otomatisitas dengan skor 1-7 dan menghitung prompt 14 hari", async () => {
      const clock = new FakeClock(new Date("2026-10-10T08:00:00.000Z"));

      const habit = await createTrackedHabitService(
        user1Id,
        {
          name: "Menulis Jurnal",
          kind: HabitKind.BUILD,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          tinyBehavior: "Tulis 1 kalimat jurnal",
          scheduleType: HabitScheduleType.DAILY,
        },
        clock,
      );

      // Cek sebelum 14 hari: isPromptDue harus false (baru hari pertama)
      const initialInfo = await getAutomaticitySurveysService(user1Id, habit.id, clock);
      expect(initialInfo.isPromptDue).toBe(false);
      expect(initialInfo.latestSurvey).toBeNull();
      expect(initialInfo.surveys.length).toBe(0);

      // Setelah 15 hari sejak habit dimulai: isPromptDue menjadi true
      const clockPlus15d = new FakeClock(new Date("2026-10-25T08:00:00.000Z"));
      const dueInfo = await getAutomaticitySurveysService(user1Id, habit.id, clockPlus15d);
      expect(dueInfo.isPromptDue).toBe(true);

      // Submit survei pertama skor 4
      const survey1 = await submitAutomaticitySurveyService(
        user1Id,
        habit.id,
        { score: 4 },
        clockPlus15d,
      );
      expect(survey1.score).toBe(4);
      expect(survey1.habitId).toBe(habit.id);

      // Segera setelah diisi: isPromptDue harus false lagi
      const afterSurvey1 = await getAutomaticitySurveysService(user1Id, habit.id, clockPlus15d);
      expect(afterSurvey1.isPromptDue).toBe(false);
      expect(afterSurvey1.latestSurvey?.score).toBe(4);
      expect(afterSurvey1.surveys.length).toBe(1);

      // 10 hari kemudian (hari ke-25): masih false (< 14 hari sejak survey1)
      const clockPlus25d = new FakeClock(new Date("2026-11-04T08:00:00.000Z"));
      const at25d = await getAutomaticitySurveysService(user1Id, habit.id, clockPlus25d);
      expect(at25d.isPromptDue).toBe(false);

      // 15 hari kemudian sejak survey1 (hari ke-30): harus true (>= 14 hari)
      const clockPlus30d = new FakeClock(new Date("2026-11-09T08:00:00.000Z"));
      const at30d = await getAutomaticitySurveysService(user1Id, habit.id, clockPlus30d);
      expect(at30d.isPromptDue).toBe(true);

      // Submit survei kedua skor 6
      const survey2 = await submitAutomaticitySurveyService(
        user1Id,
        habit.id,
        { score: 6 },
        clockPlus30d,
      );
      expect(survey2.score).toBe(6);

      const afterSurvey2 = await getAutomaticitySurveysService(user1Id, habit.id, clockPlus30d);
      expect(afterSurvey2.isPromptDue).toBe(false);
      expect(afterSurvey2.latestSurvey?.score).toBe(6);
      expect(afterSurvey2.surveys.length).toBe(2);
    });

    it("menolak skor survei di luar rentang 1 s.d. 7", async () => {
      const clock = new FakeClock(new Date("2026-10-10T08:00:00.000Z"));

      const habit = await createTrackedHabitService(
        user1Id,
        {
          name: "Belajar Bahasa",
          kind: HabitKind.BUILD,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          tinyBehavior: "Review 1 flashcard",
        },
        clock,
      );

      // Skor 0 ditolak
      await expect(
        submitAutomaticitySurveyService(user1Id, habit.id, { score: 0 }, clock),
      ).rejects.toThrow();

      // Skor 8 ditolak
      await expect(
        submitAutomaticitySurveyService(user1Id, habit.id, { score: 8 }, clock),
      ).rejects.toThrow();
    });

    it("memastikan edukasi otomatisitas menyangkal mitos 21 hari dan mengutip ~66 hari (Lally et al., 2010)", () => {
      expect(AUTOMATICITY_EDUCATION_TEXT).toContain("66");
      expect(AUTOMATICITY_EDUCATION_TEXT).toContain("18");
      expect(AUTOMATICITY_EDUCATION_TEXT).toContain("254");
      expect(AUTOMATICITY_EDUCATION_TEXT.toLowerCase()).toContain("bukan");
      expect(AUTOMATICITY_EDUCATION_TEXT.toLowerCase()).toContain("21");
    });
  });

  describe("Proteksi IDOR & Otorisasi Antar User", () => {
    it("mencegah User 2 mengakses survei otomatisitas User 1", async () => {
      const clock = new FakeClock(new Date("2026-10-10T08:00:00.000Z"));

      const habit = await createTrackedHabitService(
        user1Id,
        {
          name: "Minum Air 2L",
          kind: HabitKind.BUILD,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          tinyBehavior: "Minum 1 gelas air saat bangun",
        },
        clock,
      );

      // User 2 mencoba melihat survei User 1
      await expect(
        getAutomaticitySurveysService(user2Id, habit.id, clock),
      ).rejects.toThrow();

      // User 2 mencoba mengisi survei User 1
      await expect(
        submitAutomaticitySurveyService(user2Id, habit.id, { score: 5 }, clock),
      ).rejects.toThrow();
    });

    it("mencegah User 2 mencatat event pada habit milik User 1", async () => {
      const clock = new FakeClock(new Date("2026-10-10T08:00:00.000Z"));

      const habit = await createTrackedHabitService(
        user1Id,
        {
          name: "Berjalan Kaki",
          kind: HabitKind.BUILD,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          tinyBehavior: "Jalan 500 langkah",
        },
        clock,
      );

      await expect(
        logHabitEventService(
          user2Id,
          habit.id,
          { type: "COMPLETION", occurredAt: clock.now() },
          null,
          clock,
        ),
      ).rejects.toThrow();
    });
  });

  describe("Build Dashboard Retrieval", () => {
    it("menyediakan profil build lengkap dan kalender di dashboard service", async () => {
      const clock = new FakeClock(new Date("2026-10-10T08:00:00.000Z"));

      const habit = await createTrackedHabitService(
        user1Id,
        {
          name: "Stretching Ringan",
          kind: HabitKind.BUILD,
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          tinyBehavior: "Peregangan leher 15 detik",
          anchorText: "Setelah menutup laptop kerja",
          celebrationText: "Hela napas lega",
        },
        clock,
      );

      const dashboard = await getTrackedHabitDashboardService(user1Id, habit.id, clock);

      expect(dashboard.habit.id).toBe(habit.id);
      expect(dashboard.habit.kind).toBe("BUILD");
      expect(dashboard.habit.buildProfile?.tinyBehavior).toBe("Peregangan leher 15 detik");
      expect(dashboard.stats).toBeDefined();
      expect(dashboard.calendar).toBeDefined();
      expect(dashboard.recentEvents).toBeDefined();
    });
  });
});
